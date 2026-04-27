import Foundation
import React

/// Forwards validated watch payloads to React Native as `WatchInboxEntry` events.
/// Wire contract: `docs/watch/watch.md` §1. Buffers events received before the JS
/// listener subscribes, so cold-launch background WC deliveries are not lost.
@objc(WatchInboxModule)
final class WatchInboxModule: RCTEventEmitter {
  private static let entryEvent = "WatchInboxEntry"

  private var pending: [[String: Any]] = []
  private var hasObservers = false
  private let lock = NSLock()

  override static func requiresMainQueueSetup() -> Bool { true }

  override func supportedEvents() -> [String]! {
    [Self.entryEvent]
  }

  override init() {
    super.init()
    WatchSessionBridge.shared.attachInbox(self)
  }

  override func startObserving() {
    lock.lock()
    hasObservers = true
    let drained = pending
    pending.removeAll()
    lock.unlock()
    for body in drained {
      sendEvent(withName: Self.entryEvent, body: body)
    }
  }

  override func stopObserving() {
    lock.lock()
    hasObservers = false
    lock.unlock()
  }

  /// Called by `WatchSessionBridge` once a watch payload is validated.
  func deliver(_ body: [String: Any]) {
    lock.lock()
    if hasObservers {
      lock.unlock()
      sendEvent(withName: Self.entryEvent, body: body)
    } else {
      pending.append(body)
      lock.unlock()
    }
  }
}
