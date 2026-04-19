/// HealthSyncService — bridges Flutter with HealthKit (iOS) and Health Connect (Android).
///
/// Reads: steps, heart rate, active calories, sleep duration.
/// Writes: can optionally write back logged vitals/workouts so they appear
///         in the native Health app (useful for third-party watch integrations).
///
/// Prerequisites
/// ─────────────
/// Android  → `uses-permission` for Health Connect in AndroidManifest.xml
///            Health Connect app must be installed (ships on Android 14+).
/// iOS      → `NSHealthShareUsageDescription` + `NSHealthUpdateUsageDescription`
///            in Info.plist, HealthKit capability in Xcode.
///
/// Both are handled by the `health` pub package automatically via
/// platform channel; you only need to add the manifest entries.
library;

import 'package:flutter/foundation.dart';
import 'package:health/health.dart';
import 'local_db.dart';

/// Metric types we request read access for.
const _readTypes = [
  HealthDataType.STEPS,
  HealthDataType.HEART_RATE,
  HealthDataType.ACTIVE_ENERGY_BURNED,
  HealthDataType.SLEEP_ASLEEP,
  HealthDataType.BLOOD_OXYGEN,
  HealthDataType.BLOOD_PRESSURE_SYSTOLIC,
  HealthDataType.BLOOD_PRESSURE_DIASTOLIC,
  HealthDataType.BODY_MASS_INDEX,
  HealthDataType.WEIGHT,
  HealthDataType.WATER,
];

/// Metric types we also request write access for.
const _writeTypes = [
  HealthDataType.STEPS,
  HealthDataType.HEART_RATE,
  HealthDataType.ACTIVE_ENERGY_BURNED,
];

class HealthSyncService {
  HealthSyncService._();

  static final _health = Health();
  static bool _authorised = false;

  // ── Authorisation ─────────────────────────────────────────────────────────

  /// Call once at startup (or when the user taps "Connect Health").
  /// Returns true if all requested permissions were granted.
  static Future<bool> requestPermissions() async {
    try {
      final permissions = [
        ..._readTypes.map((_) => HealthDataAccess.READ),
        ..._writeTypes.map((_) => HealthDataAccess.READ_WRITE),
      ];
      final types = [..._readTypes, ..._writeTypes];
      _authorised = await _health.requestAuthorization(types, permissions: permissions);
      return _authorised;
    } catch (e) {
      debugPrint('[HealthSync] requestPermissions error: $e');
      return false;
    }
  }

  static Future<bool> get isAuthorised async {
    if (_authorised) return true;
    _authorised = await _health.hasPermissions(_readTypes) ?? false;
    return _authorised;
  }

  // ── Read helpers ──────────────────────────────────────────────────────────

  /// Fetch today's total step count from HealthKit / Health Connect.
  static Future<int> todaySteps() async {
    if (!await isAuthorised) return 0;
    try {
      final now   = DateTime.now();
      final start = DateTime(now.year, now.month, now.day);
      final steps = await _health.getTotalStepsInInterval(start, now);
      return steps ?? 0;
    } catch (e) {
      debugPrint('[HealthSync] todaySteps error: $e');
      return 0;
    }
  }

  /// Fetch latest heart rate sample (within last hour).
  static Future<int?> latestHeartRate() async {
    if (!await isAuthorised) return null;
    try {
      final now  = DateTime.now();
      final from = now.subtract(const Duration(hours: 1));
      final data = await _health.getHealthDataFromTypes(
        startTime: from, endTime: now,
        types: [HealthDataType.HEART_RATE],
      );
      if (data.isEmpty) return null;
      final latest = data.last;
      final val    = (latest.value as NumericHealthValue).numericValue;
      return val.round();
    } catch (e) {
      debugPrint('[HealthSync] latestHeartRate error: $e');
      return null;
    }
  }

  /// Fetch last night's sleep hours.
  static Future<double?> lastNightSleep() async {
    if (!await isAuthorised) return null;
    try {
      final now   = DateTime.now();
      final from  = now.subtract(const Duration(hours: 24));
      final data  = await _health.getHealthDataFromTypes(
        startTime: from, endTime: now,
        types: [HealthDataType.SLEEP_ASLEEP],
      );
      if (data.isEmpty) return null;
      // Sum all sleep segments (minutes → hours).
      final totalMin = data.fold<double>(0.0, (acc, d) {
        final v = (d.value as NumericHealthValue).numericValue;
        return acc + v;
      });
      return double.parse((totalMin / 60.0).toStringAsFixed(1));
    } catch (e) {
      debugPrint('[HealthSync] lastNightSleep error: $e');
      return null;
    }
  }

  /// Fetch today's active calories burned.
  static Future<int?> todayActiveCalories() async {
    if (!await isAuthorised) return null;
    try {
      final now   = DateTime.now();
      final start = DateTime(now.year, now.month, now.day);
      final data  = await _health.getHealthDataFromTypes(
        startTime: start, endTime: now,
        types: [HealthDataType.ACTIVE_ENERGY_BURNED],
      );
      if (data.isEmpty) return null;
      final total = data.fold<double>(0.0, (acc, d) {
        return acc + (d.value as NumericHealthValue).numericValue;
      });
      return total.round();
    } catch (e) {
      debugPrint('[HealthSync] todayActiveCalories error: $e');
      return null;
    }
  }

  /// Pull the latest values, save them to [LocalDb], and return a summary map.
  static Future<Map<String, dynamic>> pullAndCache() async {
    if (!await isAuthorised) return {};
    final steps     = await todaySteps();
    final hr        = await latestHeartRate();
    final sleep     = await lastNightSleep();
    final calBurned = await todayActiveCalories();

    // Cache in SQLite
    final today = DateTime.now();
    final dateKey = '${today.year}-'
        '${today.month.toString().padLeft(2,'0')}-'
        '${today.day.toString().padLeft(2,'0')}';
    if (steps > 0) await LocalDb.upsertSteps(dateKey, steps);

    return {
      'steps':     steps,
      'heartRate': hr,
      'sleepHrs':  sleep,
      'calBurned': calBurned,
    };
  }

  // ── Write helpers ─────────────────────────────────────────────────────────

  /// Write a workout's calorie burn back to HealthKit / Health Connect.
  static Future<bool> writeCaloriesBurned(int kcal, DateTime at) async {
    if (!await isAuthorised) return false;
    try {
      return _health.writeHealthData(
        value:     kcal.toDouble(),
        type:      HealthDataType.ACTIVE_ENERGY_BURNED,
        startTime: at,
        endTime:   at,
      );
    } catch (e) {
      debugPrint('[HealthSync] writeCaloriesBurned error: $e');
      return false;
    }
  }
}
