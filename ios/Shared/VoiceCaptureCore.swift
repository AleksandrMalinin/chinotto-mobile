import AVFoundation
import Foundation
import Speech

/// On-device short speech capture: `AVAudioEngine` buffers + `SFSpeechRecognizer`.
/// Max ~10s, auto-stop ~1.25s silence after speech (RMS on mic tap). No audio file / playback.
/// Platform-agnostic — extracted so iPhone (`VoiceCaptureModule`) and the future watch target
/// share the exact same RMS thresholds, silence cutoff, and recognition pipeline.
final class VoiceCaptureCore {
  enum State {
    case idle
    case listening
  }

  enum FinalReason: String {
    case manual
    case silence
    case maxDuration = "max_duration"
    case background
    case interruption
    case recognitionError = "recognition_error"
  }

  /// All start-time error metadata bundled so the caller can fire reject + error event in
  /// a single dispatch — preserves the dispatch ordering of the pre-refactor module.
  struct StartError: Error {
    let rejectCode: String
    let rejectMessage: String
    let underlying: NSError?
    let eventCode: String
    let eventMessage: String
  }

  struct Callbacks {
    var stateChanged: (State) -> Void = { _ in }
    var partialTranscript: (String) -> Void = { _ in }
    var finalTranscript: (_ text: String, _ reason: FinalReason) -> Void = { _, _ in }
    var error: (_ code: String, _ message: String) -> Void = { _, _ in }
  }

  /// Serializes taps, recognition callbacks, and timers.
  let workQueue = DispatchQueue(label: "com.chinotto.mobile.voicecapture")

  var callbacks = Callbacks()

  private var engine: AVAudioEngine?
  private var request: SFSpeechAudioBufferRecognitionRequest?
  private var task: SFSpeechRecognitionTask?
  private var recognizer: SFSpeechRecognizer?

  private var maxTimer: DispatchSourceTimer?
  private var didEmitFinal = false

  private var lastTranscript = ""
  private var heardSpeech = false
  private var silenceSeconds: Double = 0
  private var isListening = false
  private var isFinalizing = false

  private let maxDurationSeconds: TimeInterval = 10
  private let silenceStopSeconds: TimeInterval = 1.25
  private let speechRmsThreshold: Float = 0.022
  private let silenceRmsThreshold: Float = 0.012

  func start(
    localeIdentifier: String?,
    completion: @escaping (Result<Void, StartError>) -> Void
  ) {
    workQueue.async { [weak self] in
      guard let self else { return }
      if self.isListening {
        completion(.success(()))
        return
      }

      self.requestPermissions { permissionError in
        if let permissionError {
          let message = permissionError.localizedDescription
          completion(.failure(StartError(
            rejectCode: "E_VOICE_PERMISSION",
            rejectMessage: message,
            underlying: permissionError as NSError,
            eventCode: "permission_denied",
            eventMessage: message
          )))
          return
        }

        self.startSession(localeIdentifier: localeIdentifier, completion: completion)
      }
    }
  }

  func stop(reason: FinalReason = .manual) {
    workQueue.async { [weak self] in
      self?.finalizeCapture(reason: reason, errorToEmit: nil)
    }
  }

  // MARK: - Permissions

  private func requestPermissions(completion: @escaping (Error?) -> Void) {
    SFSpeechRecognizer.requestAuthorization { status in
      guard status == .authorized else {
        completion(
          NSError(
            domain: "VoiceCapture",
            code: 1,
            userInfo: [NSLocalizedDescriptionKey: "Speech recognition is not authorized."]
          )
        )
        return
      }

      if #available(iOS 17.0, *) {
        AVAudioApplication.requestRecordPermission { granted in
          completion(
            granted
              ? nil
              : NSError(
                  domain: "VoiceCapture",
                  code: 2,
                  userInfo: [NSLocalizedDescriptionKey: "Microphone access is not authorized."]
                )
          )
        }
      } else {
        AVAudioSession.sharedInstance().requestRecordPermission { granted in
          completion(
            granted
              ? nil
              : NSError(
                  domain: "VoiceCapture",
                  code: 2,
                  userInfo: [NSLocalizedDescriptionKey: "Microphone access is not authorized."]
                )
          )
        }
      }
    }
  }

  // MARK: - Session

  private func startSession(
    localeIdentifier: String?,
    completion: @escaping (Result<Void, StartError>) -> Void
  ) {
    lastTranscript = ""
    heardSpeech = false
    silenceSeconds = 0
    isFinalizing = false
    didEmitFinal = false

    let locale = localeIdentifier.map { Locale(identifier: $0) } ?? Locale.current
    let rec = SFSpeechRecognizer(locale: locale)
    guard let speechRec = rec else {
      completion(.failure(StartError(
        rejectCode: "E_VOICE_CAPTURE",
        rejectMessage: "Speech recognizer unavailable for locale.",
        underlying: nil,
        eventCode: "recognizer_unavailable",
        eventMessage: "Recognizer could not be created."
      )))
      return
    }
    guard speechRec.isAvailable else {
      completion(.failure(StartError(
        rejectCode: "E_VOICE_CAPTURE",
        rejectMessage: "Speech recognizer is not available.",
        underlying: nil,
        eventCode: "recognizer_unavailable",
        eventMessage: "Recognizer is not available."
      )))
      return
    }

    recognizer = speechRec

    do {
      let session = AVAudioSession.sharedInstance()
      try session.setCategory(
        .playAndRecord,
        mode: .measurement,
        options: [.duckOthers, .interruptSpokenAudioAndMixWithOthers]
      )
      try session.setActive(true, options: .notifyOthersOnDeactivation)
    } catch {
      completion(.failure(StartError(
        rejectCode: "E_VOICE_CAPTURE",
        rejectMessage: error.localizedDescription,
        underlying: error as NSError,
        eventCode: "audio_session",
        eventMessage: error.localizedDescription
      )))
      return
    }

    let audioEngine = AVAudioEngine()
    engine = audioEngine
    let input = audioEngine.inputNode
    let format = input.outputFormat(forBus: 0)

    let speechRequest = SFSpeechAudioBufferRecognitionRequest()
    request = speechRequest
    speechRequest.shouldReportPartialResults = true
    if speechRec.supportsOnDeviceRecognition {
      speechRequest.requiresOnDeviceRecognition = true
    }

    input.removeTap(onBus: 0)
    input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
      self?.workQueue.async {
        self?.processAudioBuffer(buffer)
      }
    }

    task = speechRec.recognitionTask(with: speechRequest) { [weak self] result, error in
      self?.workQueue.async {
        self?.processRecognition(result: result, error: error)
      }
    }

    do {
      try audioEngine.start()
    } catch {
      tearDownAudioSilently()
      completion(.failure(StartError(
        rejectCode: "E_VOICE_CAPTURE",
        rejectMessage: error.localizedDescription,
        underlying: error as NSError,
        eventCode: "start_failed",
        eventMessage: error.localizedDescription
      )))
      return
    }

    isListening = true
    startMaxDurationTimer()

    callbacks.stateChanged(.listening)
    completion(.success(()))
  }

  private func startMaxDurationTimer() {
    maxTimer?.cancel()
    let timer = DispatchSource.makeTimerSource(queue: workQueue)
    timer.schedule(deadline: .now() + maxDurationSeconds)
    timer.setEventHandler { [weak self] in
      self?.finalizeCapture(reason: .maxDuration, errorToEmit: nil)
    }
    timer.resume()
    maxTimer = timer
  }

  // MARK: - Audio + recognition

  private func processAudioBuffer(_ buffer: AVAudioPCMBuffer) {
    guard isListening, !isFinalizing, let request else { return }
    request.append(buffer)

    let rms = rmsFloat(buffer)
    let sampleRate = buffer.format.sampleRate
    guard sampleRate > 0 else { return }
    let dt = Double(buffer.frameLength) / sampleRate

    if rms >= speechRmsThreshold {
      heardSpeech = true
      silenceSeconds = 0
    } else if heardSpeech, rms < silenceRmsThreshold {
      silenceSeconds += dt
      if silenceSeconds >= silenceStopSeconds {
        finalizeCapture(reason: .silence, errorToEmit: nil)
      }
    }
  }

  private func processRecognition(result: SFSpeechRecognitionResult?, error: Error?) {
    if let result {
      guard isListening else { return }
      let text = result.bestTranscription.formattedString
      lastTranscript = text
      callbacks.partialTranscript(text)
    }

    if let error {
      if !isListening { return }
      let ns = error as NSError
      if ns.domain == "kAFAssistantErrorDomain", ns.code == 216 { return }
      finalizeCapture(reason: .recognitionError, errorToEmit: error)
    }
  }

  private func rmsFloat(_ buffer: AVAudioPCMBuffer) -> Float {
    guard let data = buffer.floatChannelData else { return 0 }
    let n = Int(buffer.frameLength)
    if n == 0 { return 0 }
    var sum: Float = 0
    let channel = data[0]
    for i in 0..<n {
      let s = channel[i]
      sum += s * s
    }
    return sqrt(sum / Float(n))
  }

  // MARK: - Teardown

  private func finalizeCapture(reason: FinalReason, errorToEmit: Error?) {
    guard isListening, !isFinalizing else { return }
    isFinalizing = true
    isListening = false

    maxTimer?.cancel()
    maxTimer = nil

    if let input = engine?.inputNode { input.removeTap(onBus: 0) }
    engine?.stop()
    engine = nil

    request?.endAudio()
    request = nil

    task?.cancel()
    task = nil
    recognizer = nil

    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)

    let text = lastTranscript
    lastTranscript = ""
    heardSpeech = false
    silenceSeconds = 0

    emitFinalIfNeeded(text: text, reason: reason)

    if let errorToEmit {
      callbacks.error("recognition_error", errorToEmit.localizedDescription)
    }
    callbacks.stateChanged(.idle)

    isFinalizing = false
  }

  private func tearDownAudioSilently() {
    maxTimer?.cancel()
    maxTimer = nil
    if let input = engine?.inputNode { input.removeTap(onBus: 0) }
    engine?.stop()
    engine = nil
    request?.endAudio()
    request = nil
    task?.cancel()
    task = nil
    recognizer = nil
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    isListening = false
    isFinalizing = false
  }

  private func emitFinalIfNeeded(text: String, reason: FinalReason) {
    guard !didEmitFinal else { return }
    didEmitFinal = true
    callbacks.finalTranscript(text, reason)
  }
}
