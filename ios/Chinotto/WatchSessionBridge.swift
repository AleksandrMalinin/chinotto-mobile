import Foundation
import WatchConnectivity

/// Receives entry payloads from the paired Apple Watch via `WCSession.transferUserInfo`.
final class WatchSessionBridge: NSObject, WCSessionDelegate {
  static let shared = WatchSessionBridge()

  private weak var inbox: WatchInboxModule?
  private var pendingPayloads: [[String: Any]] = []
  private let lock = NSLock()

  private override init() {
    super.init()
  }

  /// Called by `WatchInboxModule.init` once React Native instantiates the module.
  /// Drains any payloads received before the module existed (e.g. cold-launch background WC delivery).
  func attachInbox(_ module: WatchInboxModule) {
    lock.lock()
    inbox = module
    let drained = pendingPayloads
    pendingPayloads.removeAll()
    lock.unlock()
    if !drained.isEmpty {
      log("Draining \(drained.count) buffered payload(s) to WatchInboxModule")
    }
    for body in drained {
      module.deliver(body)
    }
  }

  /// Activates the default `WCSession` once iOS finishes launching. Safe to call multiple times.
  func activate() {
    guard WCSession.isSupported() else {
      log("Skipping activation — WatchConnectivity unsupported on this device")
      return
    }
    let session = WCSession.default
    if session.delegate !== self {
      session.delegate = self
    }
    session.activate()
  }

  // MARK: - WCSessionDelegate

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    if let error {
      log("Activation failed: \(error.localizedDescription)")
      return
    }
    log(
      "Activated — state=\(activationState.rawValue) paired=\(session.isPaired) "
        + "watchAppInstalled=\(session.isWatchAppInstalled)"
    )
  }

  func sessionDidBecomeInactive(_ session: WCSession) {
    log("Session became inactive")
  }

  func sessionDidDeactivate(_ session: WCSession) {
    log("Session deactivated — re-activating for next watch")
    WCSession.default.activate()
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
    guard let payload = ValidatedWatchPayload(userInfo: userInfo) else {
      log("Dropping invalid userInfo payload (keys=\(userInfo.keys.sorted()))")
      return
    }
    log(
      "Received payload op=\(payload.op) id=\(payload.id) "
        + "createdAt=\(payload.createdAt) text.length=\(payload.text.count)"
    )
    forward(payload)
  }

  private func forward(_ payload: ValidatedWatchPayload) {
    let body: [String: Any] = [
      "op": payload.op,
      "id": payload.id,
      "text": payload.text,
      "createdAt": payload.createdAt,
    ]
    lock.lock()
    if let inbox {
      lock.unlock()
      inbox.deliver(body)
    } else {
      pendingPayloads.append(body)
      lock.unlock()
      log("Buffered payload — WatchInboxModule not yet attached")
    }
  }

  // MARK: - Logging

  private func log(_ message: String) {
    NSLog("[WatchSession] %@", message)
  }
}

/// Validated representation of the Watch → iPhone WC envelope (`docs/watch/watch.md` §1).
private struct ValidatedWatchPayload {
  let op: String
  let id: String
  let text: String
  let createdAt: String

  init?(userInfo: [String: Any]) {
    guard
      let v = userInfo["v"] as? Int, v == 1,
      let op = userInfo["op"] as? String, op == "saveEntry",
      let id = userInfo["id"] as? String, UUID(uuidString: id) != nil,
      let rawText = userInfo["text"] as? String,
      let createdAt = userInfo["createdAt"] as? String,
      Self.isValidIso8601(createdAt)
    else { return nil }
    let trimmed = rawText.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return nil }
    self.op = op
    self.id = id
    self.text = trimmed
    self.createdAt = createdAt
  }

  /// Accepts ISO 8601 strings with or without fractional seconds — `new Date().toISOString()`
  /// always emits fractional seconds, but other encoders may not.
  private static func isValidIso8601(_ value: String) -> Bool {
    fractionalFormatter.date(from: value) != nil
      || plainFormatter.date(from: value) != nil
  }

  private static let fractionalFormatter: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f
  }()

  private static let plainFormatter: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime]
    return f
  }()
}
