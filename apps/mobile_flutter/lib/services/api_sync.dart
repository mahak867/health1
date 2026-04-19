/// ApiSyncService — pushes unsynced SQLite rows to the HealthSphere backend
/// when the device is online.
///
/// Call [ApiSyncService.sync()] at app startup and after each local write.
/// It reads rows with `synced = 0` from [LocalDb], POSTs them in batches
/// to the respective API endpoints, then marks them as synced.
///
/// The service is intentionally simple: no retry queue, no exponential
/// back-off — it fires once and swallows errors so offline mode is
/// completely transparent to the user.
library;

import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'local_db.dart';

const _kTokenKey = 'accessToken';
const _kBaseUrl  = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://localhost:4000/api/v1',
);

class ApiSyncService {
  ApiSyncService._();

  /// Returns the stored JWT access token, or null if not logged in.
  static Future<String?> _token() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_kTokenKey);
  }

  static Map<String, String> _headers(String token) => {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer $token',
  };

  // ── Main sync ─────────────────────────────────────────────────────────────

  /// Sync all unsynced local records to the API.
  /// Safe to call at any time; returns silently if offline or not logged in.
  static Future<void> sync() async {
    final token = await _token();
    if (token == null) return;

    await Future.wait([
      _syncVitals(token),
      _syncMeals(token),
      _syncWorkouts(token),
    ]);
  }

  // ── Vitals ────────────────────────────────────────────────────────────────

  static Future<void> _syncVitals(String token) async {
    final rows = await LocalDb.unsyncedVitals();
    for (final row in rows) {
      try {
        final body = jsonEncode({
          'recordedAt':    row['recorded_at'],
          if (row['heart_rate']   != null) 'heartRate':   row['heart_rate'],
          if (row['spo2']         != null) 'spo2':        row['spo2'],
          if (row['sleep_hours']  != null) 'sleepHours':  row['sleep_hours'],
          if (row['stress_level'] != null) 'stressLevel': row['stress_level'],
        });
        final res = await http
            .post(Uri.parse('$_kBaseUrl/health/vitals'),
                headers: _headers(token), body: body)
            .timeout(const Duration(seconds: 10));
        if (res.statusCode == 201 || res.statusCode == 200) {
          await LocalDb.markSynced('vitals', row['id'] as int);
        }
      } catch (e) {
        debugPrint('[ApiSync] vitals error: $e');
      }
    }
  }

  // ── Meals ─────────────────────────────────────────────────────────────────

  static Future<void> _syncMeals(String token) async {
    final rows = await LocalDb.unsyncedMeals();
    for (final row in rows) {
      try {
        final body = jsonEncode({
          'mealType':   row['meal_type'],
          'mealName':   row['name'],
          'consumedAt': row['logged_at'],
          'calories':   row['calories'],
          if ((row['protein_g'] as num? ?? 0) > 0) 'proteinG': row['protein_g'],
          if ((row['carbs_g']   as num? ?? 0) > 0) 'carbsG':   row['carbs_g'],
          if ((row['fat_g']     as num? ?? 0) > 0) 'fatG':     row['fat_g'],
        });
        final res = await http
            .post(Uri.parse('$_kBaseUrl/nutrition/meals'),
                headers: _headers(token), body: body)
            .timeout(const Duration(seconds: 10));
        if (res.statusCode == 201 || res.statusCode == 200) {
          await LocalDb.markSynced('meals', row['id'] as int);
        }
      } catch (e) {
        debugPrint('[ApiSync] meals error: $e');
      }
    }
  }

  // ── Workouts ──────────────────────────────────────────────────────────────

  static Future<void> _syncWorkouts(String token) async {
    final rows = await LocalDb.unsyncedWorkouts();
    for (final row in rows) {
      try {
        // Convert our [{lat,lon}] route JSON to GeoJSON LineString for the API
        final routeJson = row['route_json'] as String?;
        Map<String, dynamic>? routeGeoJson;
        if (routeJson != null && routeJson.isNotEmpty) {
          try {
            final pts = jsonDecode(routeJson) as List<dynamic>;
            final coords = pts.map((p) => [
              (p['lon'] as num).toDouble(),
              (p['lat'] as num).toDouble(),
            ]).toList();
            routeGeoJson = {'type': 'LineString', 'coordinates': coords};
          } catch (_) {}
        }

        final body = jsonEncode({
          'activityType':    row['workout_type'] ?? 'other',
          'title':           row['title'],
          'completedAt':     row['created_at'],
          if ((row['duration_seconds'] as num? ?? 0) > 0)
            'durationSeconds': row['duration_seconds'],
          if ((row['distance_m'] as num? ?? 0) > 0)
            'distanceM': row['distance_m'],
          if ((row['calories_burned'] as num? ?? 0) > 0)
            'caloriesBurned': row['calories_burned'],
          if (row['avg_heart_rate'] != null)
            'avgHeartRate': row['avg_heart_rate'],
          if (routeGeoJson != null)
            'routeGeojson': routeGeoJson,
        });
        final res = await http
            .post(Uri.parse('$_kBaseUrl/activities'),
                headers: _headers(token), body: body)
            .timeout(const Duration(seconds: 10));
        if (res.statusCode == 201 || res.statusCode == 200) {
          await LocalDb.markSynced('workouts', row['id'] as int);
        }
      } catch (e) {
        debugPrint('[ApiSync] workouts error: $e');
      }
    }
  }
}
