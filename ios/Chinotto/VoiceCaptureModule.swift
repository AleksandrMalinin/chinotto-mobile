import AVFoundation
import Foundation
import React
import UIKit

/// React Native bridge for `VoiceCaptureCore` — translates the shared engine's callbacks
/// into RN events and wires iOS-specific lifecycle notifications.
@objc(VoiceCaptureModule)
final class VoiceCaptureModule: RCTEventEmitter {
  private static let stateEvent = "VoiceCaptureState"
  private static let partialEvent = "VoiceCapturePartial"
  private static let finalEvent = "VoiceCaptureFinal"
  private static let errorEvent = "VoiceCaptureError"

  private let core = VoiceCaptureCore()

  override static func requiresMainQueueSetup() -> Bool { true }

  override func supportedEvents() -> [String]! {
    [Self.stateEvent, Self.partialEvent, Self.finalEvent, Self.errorEvent]
  }

  override init() {
    super.init()

    core.callbacks = VoiceCaptureCore.Callbacks(
      stateChanged: { [weak self] state in
        guard let self else { return }
        let value = state == .listening ? "listening" : "idle"
        DispatchQueue.main.async {
          self.sendEvent(withName: Self.stateEvent, body: ["state": value])
        }
      },
      partialTranscript: { [weak self] text in
        guard let self else { return }
        DispatchQueue.main.async {
          self.sendEvent(withName: Self.partialEvent, body: ["text": text])
        }
      },
      finalTranscript: { [weak self] text, reason in
        guard let self else { return }
        let payload: [String: String] = ["text": text, "reason": reason.rawValue]
        DispatchQueue.main.async {
          self.sendEvent(withName: Self.finalEvent, body: payload)
        }
      },
      error: { [weak self] code, message in
        guard let self else { return }
        DispatchQueue.main.async {
          self.sendEvent(withName: Self.errorEvent, body: ["code": code, "message": message])
        }
      }
    )

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
    core.stop(reason: .background)
  }

  @objc private func handleInterruption(_ notification: Notification) {
    guard
      let value = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
      let type = AVAudioSession.InterruptionType(rawValue: value),
      type == .began
    else { return }
    core.stop(reason: .interruption)
  }

  // MARK: - React API

  @objc(start:resolver:rejecter:)
  func start(
    _ options: NSDictionary?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let localeIdentifier = options?["locale"] as? String
    core.start(localeIdentifier: localeIdentifier) { [weak self] result in
      switch result {
      case .success:
        DispatchQueue.main.async { resolve(nil) }
      case .failure(let startError):
        guard let self else { return }
        DispatchQueue.main.async {
          reject(startError.rejectCode, startError.rejectMessage, startError.underlying)
          self.sendEvent(
            withName: Self.errorEvent,
            body: ["code": startError.eventCode, "message": startError.eventMessage]
          )
        }
      }
    }
  }

  @objc func stop() {
    core.stop()
  }
}
