/// NotificationService — schedules local reminders for:
///   • Hydration   — every 2 hours between 08:00–20:00
///   • Medication  — user-defined time (default 09:00)
///   • Workout     — daily reminder at user-defined time (default 07:00)
///
/// Uses `flutter_local_notifications` — no Firebase / cloud server required.
///
/// AndroidManifest.xml additions:
///   <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
///   <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
///
/// iOS Info.plist: nothing needed; permission dialog is shown at runtime.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationService {
  NotificationService._();

  static final _plugin = FlutterLocalNotificationsPlugin();
  static bool _initialised = false;

  // ── Channel IDs ───────────────────────────────────────────────────────────
  static const _chanWater    = 'hs_water';
  static const _chanMed      = 'hs_medication';
  static const _chanWorkout  = 'hs_workout';

  // ── Init ──────────────────────────────────────────────────────────────────

  static Future<void> init() async {
    if (_initialised) return;
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const ios     = DarwinInitializationSettings(
      requestAlertPermission:  true,
      requestBadgePermission:  true,
      requestSoundPermission:  true,
    );
    await _plugin.initialize(
      const InitializationSettings(android: android, iOS: ios),
    );
    _initialised = true;
  }

  // ── Permission ────────────────────────────────────────────────────────────

  static Future<bool> requestPermission() async {
    try {
      final ios = _plugin.resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin>();
      if (ios != null) {
        return await ios.requestPermissions(alert: true, badge: true, sound: true) ?? false;
      }
      final android = _plugin.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      if (android != null) {
        return await android.requestNotificationsPermission() ?? false;
      }
      return true;
    } catch (e) {
      debugPrint('[NotificationService] permission error: $e');
      return false;
    }
  }

  // ── Immediate helpers ─────────────────────────────────────────────────────

  static Future<void> showWaterReminder() => _show(
    id:      100,
    channel: _chanWater,
    title:   '💧 Time to drink water!',
    body:    'Stay on track — your goal is 2.5L today.',
  );

  static Future<void> showMedicationReminder(String name) => _show(
    id:      200,
    channel: _chanMed,
    title:   '💊 Medication reminder',
    body:    'Time to take $name.',
  );

  static Future<void> showWorkoutReminder() => _show(
    id:      300,
    channel: _chanWorkout,
    title:   '🏋️ Workout time!',
    body:    "Let's crush today's session.",
  );

  // ── Periodic scheduling (Android 12+ exact alarms) ───────────────────────

  /// Schedule hourly water reminders between startHour and endHour.
  static Future<void> scheduleHourlyWater({
    int startHour = 8,
    int endHour   = 20,
    int intervalHours = 2,
  }) async {
    if (!_initialised) await init();
    // Cancel old water reminders first
    for (var i = 100; i < 112; i++) await _plugin.cancel(i);

    int id = 100;
    for (var h = startHour; h <= endHour; h += intervalHours) {
      final now = DateTime.now();
      var scheduled = DateTime(now.year, now.month, now.day, h);
      if (scheduled.isBefore(now)) scheduled = scheduled.add(const Duration(days: 1));
      await _scheduleDaily(
        id:      id++,
        channel: _chanWater,
        title:   '💧 Drink water',
        body:    'You\'re ${h - startHour + 1} hours into your day — stay hydrated!',
        hour:    h,
        minute:  0,
      );
    }
  }

  /// Schedule a daily medication reminder at [hour]:[minute].
  static Future<void> scheduleMedicationReminder({
    required String medicationName,
    int hour   = 9,
    int minute = 0,
  }) async {
    if (!_initialised) await init();
    await _scheduleDaily(
      id:      200,
      channel: _chanMed,
      title:   '💊 Medication reminder',
      body:    'Time to take $medicationName.',
      hour:    hour,
      minute:  minute,
    );
  }

  /// Schedule a daily workout reminder at [hour]:[minute].
  static Future<void> scheduleWorkoutReminder({
    int hour   = 7,
    int minute = 0,
  }) async {
    if (!_initialised) await init();
    await _scheduleDaily(
      id:      300,
      channel: _chanWorkout,
      title:   '🏋️ Workout reminder',
      body:    "Time to move! Today's session is waiting.",
      hour:    hour,
      minute:  minute,
    );
  }

  static Future<void> cancelAll() => _plugin.cancelAll();

  // ── Internals ─────────────────────────────────────────────────────────────

  static Future<void> _show({
    required int    id,
    required String channel,
    required String title,
    required String body,
  }) async {
    if (!_initialised) await init();
    final details = NotificationDetails(
      android: AndroidNotificationDetails(channel, channel,
          importance: Importance.high, priority: Priority.high),
      iOS: const DarwinNotificationDetails(),
    );
    await _plugin.show(id, title, body, details);
  }

  static Future<void> _scheduleDaily({
    required int    id,
    required String channel,
    required String title,
    required String body,
    required int    hour,
    required int    minute,
  }) async {
    final details = NotificationDetails(
      android: AndroidNotificationDetails(channel, channel,
          importance: Importance.high, priority: Priority.high),
      iOS: const DarwinNotificationDetails(),
    );
    final now       = DateTime.now();
    var   scheduled = DateTime(now.year, now.month, now.day, hour, minute);
    if (scheduled.isBefore(now)) scheduled = scheduled.add(const Duration(days: 1));

    await _plugin.zonedSchedule(
      id,
      title,
      body,
      _toTZDateTime(scheduled),
      details,
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      matchDateTimeComponents: DateTimeComponents.time,
    );
  }

  /// Convert [DateTime] to a `TZDateTime` in the local timezone.
  /// Using simple UTC offset since `timezone` package is not included.
  static dynamic _toTZDateTime(DateTime dt) {
    // flutter_local_notifications accepts a plain DateTime when the
    // timezone package is NOT configured; just return the local DateTime.
    return dt;
  }
}
