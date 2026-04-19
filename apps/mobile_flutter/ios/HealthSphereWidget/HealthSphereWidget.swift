import WidgetKit
import SwiftUI

// ─── App Group ID ──────────────────────────────────────────────────────────────
// Must match the value in WidgetService.dart and the entitlements file.
private let appGroupId = "group.com.healthsphere.mobile"
// Must match the iOSName passed to HomeWidget.updateWidget() in Dart.
private let widgetKind  = "HealthSphereWidget"

// ─── Shared Preferences keys (must match Dart / Android) ──────────────────────
private enum Keys {
    static let heartRate   = "heartRate"
    static let calBurned   = "calBurned"
    static let calEaten    = "calEaten"
    static let waterMl     = "waterMl"
    static let steps       = "steps"
    static let sleepHrs    = "sleepHrs"
    static let lastUpdated = "lastUpdated"
}

// ─── Data model ───────────────────────────────────────────────────────────────
struct HealthEntry: TimelineEntry {
    let date:        Date
    let heartRate:   Int
    let calBurned:   Int
    let calEaten:    Int
    let waterL:      Double
    let steps:       Int
    let sleepHrs:    Double
    let lastUpdated: String
}

// ─── Data reader ─────────────────────────────────────────────────────────────
private func readEntry() -> HealthEntry {
    let defaults = UserDefaults(suiteName: appGroupId)
    return HealthEntry(
        date:        Date(),
        heartRate:   defaults?.integer(forKey: Keys.heartRate)  ?? 0,
        calBurned:   defaults?.integer(forKey: Keys.calBurned)  ?? 0,
        calEaten:    defaults?.integer(forKey: Keys.calEaten)   ?? 0,
        waterL:      Double(defaults?.integer(forKey: Keys.waterMl) ?? 0) / 1000.0,
        steps:       defaults?.integer(forKey: Keys.steps)      ?? 0,
        sleepHrs:    defaults?.double(forKey: Keys.sleepHrs)    ?? 0,
        lastUpdated: defaults?.string(forKey: Keys.lastUpdated) ?? "--:--"
    )
}

// ─── Timeline Provider ────────────────────────────────────────────────────────
struct HealthSphereProvider: TimelineProvider {
    func placeholder(in context: Context) -> HealthEntry {
        HealthEntry(date: Date(), heartRate: 72, calBurned: 450,
                    calEaten: 1800, waterL: 1.5, steps: 8000,
                    sleepHrs: 7.5, lastUpdated: "--:--")
    }

    func getSnapshot(in context: Context, completion: @escaping (HealthEntry) -> Void) {
        completion(readEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<HealthEntry>) -> Void) {
        let entry    = readEntry()
        // Expire after 15 min so even if the app isn't open the widget shows
        // fresh-ish data (Flutter will push an update sooner when the user acts).
        let refresh  = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
        let timeline = Timeline(entries: [entry], policy: .after(refresh))
        completion(timeline)
    }
}

// ─── Views ────────────────────────────────────────────────────────────────────
struct TileView: View {
    let emoji:   String
    let value:   String
    let label:   String
    let color:   Color

    var body: some View {
        VStack(spacing: 2) {
            Text(emoji).font(.system(size: 18))
            Text(value)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(color)
                .minimumScaleFactor(0.7)
                .lineLimit(1)
            Text(label)
                .font(.system(size: 9))
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.white.opacity(0.07))
        .cornerRadius(10)
    }
}

struct HealthSphereWidgetView: View {
    let entry: HealthEntry

    private func fmt(_ n: Int, unit: String) -> String {
        n > 0 ? "\(n) \(unit)" : "— \(unit)"
    }
    private func fmtWater() -> String {
        entry.waterL > 0 ? String(format: "%.1f L", entry.waterL) : "— L"
    }
    private func fmtSleep() -> String {
        entry.sleepHrs > 0 ? String(format: "%.1f h", entry.sleepHrs) : "— h"
    }

    var body: some View {
        VStack(spacing: 6) {
            // Header
            HStack {
                Text("🌿 HealthSphere")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.white)
                Spacer()
                Text("Updated \(entry.lastUpdated)")
                    .font(.system(size: 9))
                    .foregroundColor(.secondary)
            }
            // Row 1
            HStack(spacing: 6) {
                TileView(emoji: "💓", value: fmt(entry.heartRate, unit: "bpm"), label: "Heart Rate", color: Color(red: 0.96, green: 0.56, blue: 0.69))
                TileView(emoji: "🔥", value: fmt(entry.calBurned, unit: "kcal"), label: "Cal Burned", color: Color(red: 1.0, green: 0.67, blue: 0.25))
            }
            // Row 2
            HStack(spacing: 6) {
                TileView(emoji: "🥗", value: fmt(entry.calEaten, unit: "kcal"), label: "Cal Eaten", color: Color(red: 0.65, green: 0.84, blue: 0.65))
                TileView(emoji: "💧", value: fmtWater(), label: "Water", color: Color(red: 0.50, green: 0.87, blue: 0.91))
            }
            // Row 3
            HStack(spacing: 6) {
                TileView(emoji: "🏃", value: entry.steps > 0 ? "\(entry.steps)" : "—", label: "Steps", color: Color(red: 0.81, green: 0.58, blue: 0.85))
                TileView(emoji: "🌙", value: fmtSleep(), label: "Sleep", color: Color(red: 0.70, green: 0.62, blue: 0.86))
            }
        }
        .padding(12)
        .background(Color(red: 0.043, green: 0.043, blue: 0.071).opacity(0.92))
        .cornerRadius(20)
    }
}

// ─── Widget declaration ───────────────────────────────────────────────────────
struct HealthSphereWidget: Widget {
    let kind: String = widgetKind

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: HealthSphereProvider()) { entry in
            if #available(iOS 17.0, *) {
                HealthSphereWidgetView(entry: entry)
                    .containerBackground(for: .widget) {
                        Color(red: 0.043, green: 0.043, blue: 0.071)
                    }
            } else {
                HealthSphereWidgetView(entry: entry)
            }
        }
        .configurationDisplayName("HealthSphere")
        .description("At-a-glance health stats: heart rate, calories, water, steps, and sleep.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// ─── Previews ────────────────────────────────────────────────────────────────
#Preview(as: .systemMedium) {
    HealthSphereWidget()
} timeline: {
    HealthEntry(date: .now, heartRate: 68, calBurned: 320,
                calEaten: 1450, waterL: 1.2, steps: 6500,
                sleepHrs: 7.2, lastUpdated: "09:41")
}
