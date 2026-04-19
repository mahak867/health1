/// PedometerService — wraps the `pedometer` package to expose:
///   • a live step-count stream (steps since device boot)
///   • today's step count (calibrated to midnight reset)
///   • pedestrian activity status (walking / stopped)
///
/// The service persists today's step count to [LocalDb] every minute and
/// notifies [ChangeNotifier] listeners so widgets / home screen widget can
/// react in real time.
///
/// AndroidManifest.xml addition:
///   <uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
///
/// iOS Info.plist addition:
///   NSMotionUsageDescription
library;

import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:pedometer/pedometer.dart';
import 'local_db.dart';
import 'widget_service.dart';

class PedometerService extends ChangeNotifier {
  PedometerService._();
  static final PedometerService instance = PedometerService._();

  int _totalSteps      = 0;  // raw steps since device boot
  int _baselineSteps   = 0;  // steps at midnight (loaded from SQLite)
  int _todaySteps      = 0;
  String _status       = 'unknown';
  Timer? _saveTimer;

  int    get todaySteps => _todaySteps;
  String get status     => _status;

  // ── Init ──────────────────────────────────────────────────────────────────

  Future<void> init() async {
    // Warm up the baseline from SQLite so today's count survives app restarts.
    _todaySteps = await LocalDb.todaySteps();
    notifyListeners();

    _listenPedometer();
    _saveTimer = Timer.periodic(const Duration(minutes: 1), (_) => _persist());
  }

  void _listenPedometer() {
    Pedometer.stepCountStream.listen(
      _onStep,
      onError: (e) => debugPrint('[Pedometer] step error: $e'),
      cancelOnError: false,
    );
    Pedometer.pedestrianStatusStream.listen(
      (evt) {
        _status = evt.status;
        notifyListeners();
      },
      onError: (e) => debugPrint('[Pedometer] status error: $e'),
      cancelOnError: false,
    );
  }

  void _onStep(StepCount evt) {
    if (_totalSteps == 0) {
      // First reading: back-calculate the baseline.
      _baselineSteps = evt.steps - _todaySteps;
    }
    _totalSteps = evt.steps;
    _todaySteps = (_totalSteps - _baselineSteps).clamp(0, 999999);
    notifyListeners();
  }

  Future<void> _persist() async {
    await LocalDb.upsertSteps(_todayKey(), _todaySteps);
    await WidgetService.update(steps: _todaySteps);
  }

  static String _todayKey() {
    final d = DateTime.now();
    return '${d.year}-${d.month.toString().padLeft(2,'0')}-${d.day.toString().padLeft(2,'0')}';
  }

  void dispose() {
    _saveTimer?.cancel();
    super.dispose();
  }
}
