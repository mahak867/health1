/// LocalDb — SQLite-backed offline-first store for HealthSphere.
///
/// Tables
/// ──────
///   vitals    — heart rate, SpO2, sleep, stress
///   meals     — name, type, calories, macros
///   workouts  — title, type, duration, distance, calories
///   steps_log — daily step-count cache from pedometer / Health Connect
///
/// All rows carry a `synced` flag (0 = pending server sync, 1 = confirmed).
/// A background sync worker (see ApiSyncService) can query unsynced rows and
/// POST them to the backend, then flip the flag.
library;

import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

const _dbName    = 'healthsphere.db';
const _dbVersion = 1;

class LocalDb {
  LocalDb._();
  static Database? _db;

  static Future<Database> get db async {
    _db ??= await _open();
    return _db!;
  }

  // ── Schema ────────────────────────────────────────────────────────────────

  static Future<Database> _open() async {
    final dbPath = join(await getDatabasesPath(), _dbName);
    return openDatabase(
      dbPath,
      version: _dbVersion,
      onCreate: (db, _) async {
        await db.execute('''
          CREATE TABLE vitals (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            recorded_at  TEXT    NOT NULL,
            heart_rate   INTEGER,
            spo2         REAL,
            sleep_hours  REAL,
            stress_level INTEGER,
            synced       INTEGER NOT NULL DEFAULT 0
          )''');

        await db.execute('''
          CREATE TABLE meals (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            logged_at   TEXT    NOT NULL,
            name        TEXT    NOT NULL,
            meal_type   TEXT    NOT NULL DEFAULT 'snack',
            calories    INTEGER NOT NULL DEFAULT 0,
            protein_g   REAL    DEFAULT 0,
            carbs_g     REAL    DEFAULT 0,
            fat_g       REAL    DEFAULT 0,
            synced      INTEGER NOT NULL DEFAULT 0
          )''');

        await db.execute('''
          CREATE TABLE workouts (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at        TEXT    NOT NULL,
            title             TEXT    NOT NULL,
            workout_type      TEXT    NOT NULL DEFAULT 'other',
            duration_seconds  INTEGER DEFAULT 0,
            distance_m        REAL    DEFAULT 0,
            calories_burned   INTEGER DEFAULT 0,
            avg_heart_rate    INTEGER,
            route_json        TEXT,
            synced            INTEGER NOT NULL DEFAULT 0
          )''');

        await db.execute('''
          CREATE TABLE steps_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            date        TEXT    NOT NULL UNIQUE,
            step_count  INTEGER NOT NULL DEFAULT 0,
            synced      INTEGER NOT NULL DEFAULT 0
          )''');
      },
    );
  }

  // ── Vitals ────────────────────────────────────────────────────────────────

  static Future<int> insertVital(Map<String, dynamic> v) async {
    return (await db).insert('vitals', {
      'recorded_at':  v['recordedAt']  ?? DateTime.now().toIso8601String(),
      'heart_rate':   v['heartRate'],
      'spo2':         v['spo2'],
      'sleep_hours':  v['sleepHours'],
      'stress_level': v['stressLevel'],
      'synced': 0,
    });
  }

  static Future<List<Map<String, dynamic>>> getVitals({int limit = 100}) async {
    return (await db).query('vitals',
        orderBy: 'recorded_at DESC', limit: limit);
  }

  // ── Meals ─────────────────────────────────────────────────────────────────

  static Future<int> insertMeal(Map<String, dynamic> m) async {
    return (await db).insert('meals', {
      'logged_at':  m['loggedAt']  ?? DateTime.now().toIso8601String(),
      'name':       m['name'],
      'meal_type':  m['mealType']  ?? 'snack',
      'calories':   m['calories']  ?? 0,
      'protein_g':  m['proteinG']  ?? 0,
      'carbs_g':    m['carbsG']    ?? 0,
      'fat_g':      m['fatG']      ?? 0,
      'synced': 0,
    });
  }

  static Future<List<Map<String, dynamic>>> getMeals({int limit = 200}) async {
    return (await db).query('meals',
        orderBy: 'logged_at DESC', limit: limit);
  }

  static Future<int> todayCalories() async {
    final today = DateTime.now();
    final start = DateTime(today.year, today.month, today.day).toIso8601String();
    final end   = DateTime(today.year, today.month, today.day, 23, 59, 59).toIso8601String();
    final rows  = await (await db).query('meals',
        where: 'logged_at >= ? AND logged_at <= ?',
        whereArgs: [start, end]);
    return rows.fold<int>(0, (s, r) => s + ((r['calories'] as num?)?.toInt() ?? 0));
  }

  // ── Workouts ──────────────────────────────────────────────────────────────

  static Future<int> insertWorkout(Map<String, dynamic> w) async {
    return (await db).insert('workouts', {
      'created_at':       w['createdAt']       ?? DateTime.now().toIso8601String(),
      'title':            w['title'],
      'workout_type':     w['workoutType']     ?? 'other',
      'duration_seconds': w['durationSeconds'] ?? 0,
      'distance_m':       w['distanceM']       ?? 0,
      'calories_burned':  w['caloriesBurned']  ?? 0,
      'avg_heart_rate':   w['avgHeartRate'],
      'route_json':       w['routeJson'],
      'synced': 0,
    });
  }

  static Future<List<Map<String, dynamic>>> getWorkouts({int limit = 100}) async {
    return (await db).query('workouts',
        orderBy: 'created_at DESC', limit: limit);
  }

  // ── Steps ─────────────────────────────────────────────────────────────────

  static Future<void> upsertSteps(String date, int count) async {
    await (await db).insert('steps_log',
        {'date': date, 'step_count': count, 'synced': 0},
        conflictAlgorithm: ConflictAlgorithm.replace);
  }

  static Future<int> todaySteps() async {
    final today = DateTime.now();
    final key   = '${today.year}-${today.month.toString().padLeft(2,'0')}-${today.day.toString().padLeft(2,'0')}';
    final rows  = await (await db).query('steps_log',
        where: 'date = ?', whereArgs: [key]);
    if (rows.isEmpty) return 0;
    return (rows.first['step_count'] as num?)?.toInt() ?? 0;
  }

  // ── Unsynced rows (for background sync) ──────────────────────────────────

  static Future<List<Map<String, dynamic>>> unsyncedVitals()    async =>
    (await db).query('vitals',   where: 'synced = 0');
  static Future<List<Map<String, dynamic>>> unsyncedMeals()     async =>
    (await db).query('meals',    where: 'synced = 0');
  static Future<List<Map<String, dynamic>>> unsyncedWorkouts()  async =>
    (await db).query('workouts', where: 'synced = 0');

  static Future<void> markSynced(String table, int id) async {
    await (await db).update(table, {'synced': 1},
        where: 'id = ?', whereArgs: [id]);
  }

  // ── Misc ──────────────────────────────────────────────────────────────────

  static Future<void> close() async {
    await _db?.close();
    _db = null;
  }
}
