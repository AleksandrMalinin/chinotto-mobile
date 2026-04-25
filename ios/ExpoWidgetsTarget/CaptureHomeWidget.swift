import WidgetKit
import SwiftUI

// Matches `ios/Chinotto/Images.xcassets/SplashScreenBackground.colorset` (#0A0A0E).
private let CHINOTTO_BRAND_DARK = Color(
  red: 0.0392156862745098,
  green: 0.0392156862745098,
  blue: 0.0549019607843137
)
private let CHINOTTO_BRAND_ELEVATED = Color(
  red: 0.0745098039215686,
  green: 0.0705882352941176,
  blue: 0.1098039215686274
)

struct CaptureHomeWidget: Widget {
  let name: String = "CaptureHomeWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: name, provider: TimelineProvider()) { _ in
      CaptureHomeWidgetView()
    }
    .configurationDisplayName("Chinotto")
    .description("Open capture to jot a thought.")
    .supportedFamilies([.systemSmall])
  }
}

private struct TimelineProvider: WidgetKit.TimelineProvider {
  func placeholder(in context: Context) -> Entry {
    Entry(date: Date())
  }

  func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
    completion(Entry(date: Date()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
    let now = Date()
    let next = Calendar.current.date(byAdding: .hour, value: 12, to: now) ?? now
    completion(Timeline(entries: [Entry(date: now)], policy: .after(next)))
  }
}

private struct Entry: TimelineEntry {
  let date: Date
}

private struct CaptureHomeWidgetView: View {
  var body: some View {
    let content = VStack(alignment: .leading, spacing: 8) {
      ChinottoLogoMark(size: 18)

      VStack(alignment: .leading, spacing: 5) {
        Text("Capture")
          .font(.system(size: 26, weight: .bold))
          .tracking(-0.35)
          .foregroundStyle(Color(red: 240 / 255, green: 240 / 255, blue: 245 / 255))
          .lineLimit(1)
          .minimumScaleFactor(0.85)

        Text("Before it fades")
          .font(.system(size: 12, weight: .regular))
          .foregroundStyle(Color(red: 150 / 255, green: 150 / 255, blue: 162 / 255).opacity(0.88))
          .lineLimit(1)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .padding(.horizontal, 16)
    .padding(.vertical, 14)
    .widgetURL(URL(string: "chinotto://capture"))

    if #available(iOSApplicationExtension 17.0, *) {
      content.containerBackground(for: .widget) {
        widgetBackground
      }
    } else {
      content.background(widgetBackground)
    }
  }

  @ViewBuilder
  private var widgetBackground: some View {
    ZStack {
      LinearGradient(
        colors: [CHINOTTO_BRAND_ELEVATED, CHINOTTO_BRAND_DARK],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      )
      LinearGradient(
        colors: [
          Color(red: 106 / 255, green: 124 / 255, blue: 194 / 255).opacity(0.25),
          Color.clear,
        ],
        startPoint: .topLeading,
        endPoint: UnitPoint(x: 0.75, y: 0.62)
      )
      RadialGradient(
        colors: [
          Color(red: 156 / 255, green: 172 / 255, blue: 1.0).opacity(0.12),
          Color.clear,
        ],
        center: UnitPoint(x: 0.2, y: 0.2),
        startRadius: 2,
        endRadius: 88
      )
    }
  }
}

private struct ChinottoLogoMark: View {
  let size: CGFloat

  var body: some View {
    ZStack {
      // Matches docs/engineering/logo.svg geometry (64x64 viewBox).
      Circle()
        .stroke(Color.white, lineWidth: max(1.2, size * 0.032))
        .frame(width: size * 0.875, height: size * 0.875)

      Circle()
        .fill(Color.white)
        .frame(width: size * 0.1875, height: size * 0.1875)
        .offset(y: -size * 0.1875)

      Circle()
        .fill(Color.white)
        .frame(width: size * 0.15625, height: size * 0.15625)
        .offset(x: -size * 0.15625, y: size * 0.03125)

      Circle()
        .fill(Color.white)
        .frame(width: size * 0.15625, height: size * 0.15625)
        .offset(x: size * 0.15625, y: size * 0.03125)

      Circle()
        .fill(Color.white)
        .frame(width: size * 0.125, height: size * 0.125)
        .offset(y: size * 0.1875)
    }
    .frame(width: size, height: size, alignment: .center)
  }
}