import Foundation
import React
import WidgetKit

@objc(WidgetThoughtsBridge)
final class WidgetThoughtsBridge: NSObject {
  private static let appGroupId = "group.com.chinotto.mobile"
  private static let thoughtsKey = "chinotto_widget_recent_thoughts_v1"

  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc(setRecentThoughts:resolver:rejecter:)
  func setRecentThoughts(
    _ json: String,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    guard let defaults = UserDefaults(suiteName: Self.appGroupId) else {
      reject("no_app_group", "Unable to open app group user defaults", nil)
      return
    }
    defaults.set(json, forKey: Self.thoughtsKey)
    WidgetCenter.shared.reloadAllTimelines()
    resolve(nil)
  }
}
