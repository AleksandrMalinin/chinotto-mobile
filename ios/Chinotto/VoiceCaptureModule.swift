import AVFoundation
import Foundation
import React
import Speech
import UIKit

/// On-device short speech capture: `AVAudioEngine` buffers + `SFSpeechRecognizer`.
/// Max ~10s, auto-stop ~1.25s silence after speech (RMS on mic tap). No audio file / playback.
@objc(VoiceCaptureModule)
final class VoiceCaptureModule: RCTEventEmitter {
  private static let stateEvent = "VoiceCaptureState"
  private static let partialEvent = "VoiceCapturePartial"
  private static let finalEvent = "VoiceCaptureFinal"
  private static let errorEvent = "VoiceCaptureError"

  /// Serializes taps, recognition callbacks, and timers.
  private let workQueue = DispatchQueue(label: "com.chinotto.mobile.voicecapture")

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

  override static func requiresMainQueueSetup() -> Bool { true }

  override func supportedEvents() -> [String]! {
    [Self.stateEvent, Self.partialEvent, Self.finalEvent, Self.errorEvent]
  }

  override init() {
    super.init()
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleResignActive),
      name: UIApplication.willResignActiveNotification,
      object: nil
    )
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleInterruption),
      name: AVAudioSession.interruptionNotification,
      object: nil
    )
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  @objc private func handleResignActive() {
    workQueue.async { [weak self] in
      self?.finalizeCapture(reason: "background", errorToEmit: nil)
    }
  }

  @objc private func handleInterruption(_ notification: Notification) {
    guard
      let value = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
      let type = AVAudioSession.InterruptionType(rawValue: value),
      type == .began
    else { return }
    workQueue.async { [weak self] in
      self?.finalizeCapture(reason: "interruption", errorToEmit: nil)
    }
  }

  // MARK: - React API

  @objc(start:resolver:rejecter:)
  func start(
    _ options: NSDictionary?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    workQueue.async { [weak self] in
      guard let self else { return }
      if self.isListening {
        DispatchQueue.main.async { resolve(nil) }
        return
      }

      self.requestPermissions { permissionError in
        if let permissionError {
          let message = permissionError.localizedDescription
          DispatchQueue.main.async {
            reject("E_VOICE_PERMISSION", message, permissionError)
            self.emitError(code: "permission_denied", message: message)
          }
          return
        }

        self.startSession(options: options, resolve: resolve, reject: reject)
      }
    }
  }

  @objc func stop() {
    workQueue.async { [weak self] in
      self?.finalizeCapture(reason: "manual", errorToEmit: nil)
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
    options: NSDictionary?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    lastTranscript = ""
    heardSpeech = false
    silenceSeconds = 0
    isFinalizing = false
    didEmitFinal = false

    let localeIdentifier = options?["locale"] as? String
    let locale = localeIdentifier.map { Locale(identifier: $0) } ?? Locale.current
    let rec = SFSpeechRecognizer(locale: locale)
    guard let speechRec = rec else {
      DispatchQueue.main.async {
        reject("E_VOICE_CAPTURE", "Speech recognizer unavailable for locale.", nil)
        self.emitError(code: "recognizer_unavailable", message: "Recognizer could not be created.")
      }
      return
    }
    guard speechRec.isAvailable else {
      DispatchQueue.main.async {
        reject("E_VOICE_CAPTURE", "Speech recognizer is not available.", nil)
        self.emitError(code: "recognizer_unavailable", message: "Recognizer is not available.")
      }
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
      DispatchQueue.main.async {
        reject("E_VOICE_CAPTURE", error.localizedDescription, error)
        self.emitError(code: "audio_session", message: error.localizedDescription)
      }
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
      DispatchQueue.main.async {
        reject("E_VOICE_CAPTURE", error.localizedDescription, error)
        self.emitError(code: "start_failed", message: error.localizedDescription)
      }
      return
    }

    isListening = true
    startMaxDurationTimer()

    DispatchQueue.main.async {
      self.sendEvent(withName: Self.stateEvent, body: ["state": "listening"])
      resolve(nil)
    }
  }

  private func startMaxDurationTimer() {
    maxTimer?.cancel()
    let timer = DispatchSource.makeTimerSource(queue: workQueue)
    timer.schedule(deadline: .now() + maxDurationSeconds)
    timer.setEventHandler { [weak self] in
      self?.finalizeCapture(reason: "max_duration", errorToEmit: nil)
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
        finalizeCapture(reason: "silence", errorToEmit: nil)
      }
    }
  }

  private func processRecognition(result: SFSpeechRecognitionResult?, error: Error?) {
    if let result {
      guard isListening else { return }
      let text = result.bestTranscription.formattedString
      lastTranscript = text
      DispatchQueue.main.async {
        self.sendEvent(withName: Self.partialEvent, body: ["text": text])
      }
    }

    if let error {
      if !isListening { return }
      let ns = error as NSError
      if ns.domain == "kAFAssistantErrorDomain", ns.code == 216 { return }
      finalizeCapture(reason: "recognition_error", errorToEmit: error)
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

  private func finalizeCapture(reason: String, errorToEmit: Error?) {
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

    DispatchQueue.main.async {
      if let errorToEmit {
        self.emitError(code: "recognition_error", message: errorToEmit.localizedDescription)
      }
      self.sendEvent(withName: Self.stateEvent, body: ["state": "idle"])
    }

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

  private func emitFinalIfNeeded(text: String, reason: String) {
    guard !didEmitFinal else { return }
    didEmitFinal = true
    let payload: [String: String] = ["text": text, "reason": reason]
    DispatchQueue.main.async {
      self.sendEvent(withName: Self.finalEvent, body: payload)
    }
  }

  private func emitError(code: String, message: String) {
    sendEvent(withName: Self.errorEvent, body: ["code": code, "message": message])
  }
}
