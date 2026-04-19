/// WidgetService — keeps Android and iOS home-screen widgets up to date.
///
/// The [home_widget] package acts as a bridge:
///   • On Android it writes data into SharedPreferences and triggers an
///     AppWidget update broadcast (received by [HealthSphereWidgetProvider]).
///   • On iOS it writes data into an App Group UserDefaults suite and calls
///     `WidgetCenter.shared.reloadAllTimelines()` so WidgetKit re-renders.
///
/// Call [WidgetService.update] whenever the user logs new data so the widget
/// refreshes immediately, and call it once on app start to seed fresh values.
library;

import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:home_widget/home_widget.dart';

/// Keys must match exactly what the native side reads.
const _kHeartRate    = 'heartRate';
const _kCalBurned    = 'calBurned';
const _kCalEaten     = 'calEaten';
const _kWaterMl      = 'waterMl';
const _kSteps        = 'steps';
const _kSleepHrs     = 'sleepHrs';
const _kLastUpdated  = 'lastUpdated';

/// App Group ID — must match the entitlements and iOS extension config.
const _kAppGroupId   = 'group.com.healthsphere.mobile';

/// Android widget class name (as registered in AndroidManifest.xml).
const _kAndroidClass = 'HealthSphereWidgetProvider';
/// iOS widget kind (as declared in the Swift WidgetKit extension).
const _kIOSWidgetKind = 'HealthSphereWidget';

class WidgetService {
  WidgetService._();

  /// Call once at app start (before [runApp]).
  static Future<void> init() async {
    await HomeWidget.setAppGroupId(_kAppGroupId);
    HomeWidget.registerBackgroundCallback(_backgroundCallback);
  }

  /// Push [data] to the native widget and request a redraw.
  ///
  /// Any null value is skipped so partial updates are safe.
  static Future<void> update({
    int?    heartRate,
    int?    calBurned,
    int?    calEaten,
    int?    waterMl,
    int?    steps,
    double? sleepHrs,
  }) async {
    try {
      final futures = <Future<bool?>>[
        if (heartRate != null) HomeWidget.saveWidgetData<int>(_kHeartRate, heartRate),
        if (calBurned != null) HomeWidget.saveWidgetData<int>(_kCalBurned, calBurned),
        if (calEaten  != null) HomeWidget.saveWidgetData<int>(_kCalEaten,  calEaten),
        if (waterMl   != null) HomeWidget.saveWidgetData<int>(_kWaterMl,   waterMl),
        if (steps     != null) HomeWidget.saveWidgetData<int>(_kSteps,     steps),
        if (sleepHrs  != null) HomeWidget.saveWidgetData<double>(_kSleepHrs, sleepHrs),
        HomeWidget.saveWidgetData<String>(
          _kLastUpdated,
          _formatTime(DateTime.now()),
        ),
      ];
      await Future.wait(futures);
      await HomeWidget.updateWidget(
        androidName: _kAndroidClass,
        iOSName:     _kIOSWidgetKind,
      );
    } catch (e) {
      // Widget updates are best-effort — never crash the app.
      debugPrint('[WidgetService] update failed: $e');
    }
  }

  static String _formatTime(DateTime dt) {
    final h   = dt.hour.toString().padLeft(2, '0');
    final min = dt.minute.toString().padLeft(2, '0');
    return '$h:$min';
  }
}

/// Background isolate callback — called by the widget when tapped
/// (allows deep-linking into the app from the widget).
@pragma('vm:entry-point')
Future<void> _backgroundCallback(Uri? uri) async {
  // The widget sends a URI like healthsphere://widget/vitals
  // when the user taps a tile.  The main isolate can react to this by
  // navigating to the relevant page.  No-op if not applicable.
  debugPrint('[WidgetService] background callback: $uri');
}
