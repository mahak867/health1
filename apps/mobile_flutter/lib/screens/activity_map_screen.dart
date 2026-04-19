import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../services/location_service.dart';
import '../services/local_db.dart';
import '../services/widget_service.dart';

/// Real-time GPS activity tracking screen.
///
/// Shows:
///   • Live distance, pace, duration
///   • Animated route drawn on a normalised canvas (no map tile dependency)
///   • Start / Stop button
///   • On stop → saves workout to SQLite and updates home-screen widget
class ActivityMapScreen extends StatefulWidget {
  const ActivityMapScreen({super.key, this.workoutTitle = 'GPS Run'});
  final String workoutTitle;

  @override
  State<ActivityMapScreen> createState() => _ActivityMapScreenState();
}

class _ActivityMapScreenState extends State<ActivityMapScreen>
    with SingleTickerProviderStateMixin {
  final _loc  = LocationService.instance;
  Timer? _timer;
  int   _elapsed = 0;   // seconds
  bool  _saved   = false;

  @override
  void initState() {
    super.initState();
    _loc.addListener(_onLocUpdate);
  }

  @override
  void dispose() {
    _loc.removeListener(_onLocUpdate);
    _timer?.cancel();
    super.dispose();
  }

  void _onLocUpdate() {
    if (mounted) setState(() {});
  }

  Future<void> _start() async {
    final ok = await _loc.startTracking();
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Location permission denied. Please enable in Settings.')),
      );
      return;
    }
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _elapsed = _loc.durationSeconds);
    });
  }

  Future<void> _stop() async {
    _loc.stopTracking();
    _timer?.cancel();
    if (_saved) return;

    final dist = _loc.distanceM;
    final dur  = _loc.durationSeconds;

    await LocalDb.insertWorkout({
      'title':           widget.workoutTitle,
      'workoutType':     'run',
      'durationSeconds': dur,
      'distanceM':       dist,
      'routeJson':       _loc.encodeRouteJson(),
    });
    await WidgetService.update(calBurned: (dist / 1000 * 60).round());
    _saved = true;
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Workout saved — ${(dist / 1000).toStringAsFixed(2)} km')),
      );
    }
  }

  String _fmtTime(int s) {
    final h = s ~/ 3600;
    final m = (s % 3600) ~/ 60;
    final sec = s % 60;
    if (h > 0) return '${h.toString().padLeft(2,'0')}:${m.toString().padLeft(2,'0')}:${sec.toString().padLeft(2,'0')}';
    return '${m.toString().padLeft(2,'0')}:${sec.toString().padLeft(2,'0')}';
  }

  String _pace(double distM, int durSec) {
    if (distM < 10 || durSec < 1) return '--:--/km';
    final minPerKm = (durSec / 60) / (distM / 1000);
    final m = minPerKm.floor();
    final s = ((minPerKm - m) * 60).round();
    return "$m:${s.toString().padLeft(2,'0')}/km";
  }

  String _speed(double distM, int durSec) {
    if (distM < 10 || durSec < 1) return '0.0 km/h';
    final kmh = (distM / 1000) / (durSec / 3600);
    return '${kmh.toStringAsFixed(1)} km/h';
  }

  /// MET-based calorie estimate (running ~8 MET, walking ~3.5 MET, default 70 kg)
  String _calories(double distM, int durSec) {
    if (distM < 10 || durSec < 1) return '0 kcal';
    final kmh = (distM / 1000) / (durSec / 3600);
    final met = kmh >= 8 ? 8.0 : kmh >= 5 ? 6.0 : 3.5;
    final kcal = (met * 70 * (durSec / 3600)).round();
    return '$kcal kcal';
  }

  @override
  Widget build(BuildContext context) {
    final cs        = Theme.of(context).colorScheme;
    final tracking  = _loc.isTracking;
    final route     = _loc.route;
    final dist      = _loc.distanceM;

    return Scaffold(
      appBar: AppBar(title: Text(widget.workoutTitle)),
      body: Column(
        children: [
          // Stats row
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: cs.primaryContainer,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _Stat(label: 'Distance',
                    value: dist >= 1000
                        ? '${(dist/1000).toStringAsFixed(2)} km'
                        : '${dist.round()} m'),
                _Stat(label: 'Duration', value: _fmtTime(_elapsed)),
                _Stat(label: 'Pace', value: _pace(dist, _elapsed)),
                _Stat(label: 'Speed', value: _speed(dist, _elapsed)),
                _Stat(label: 'Calories', value: _calories(dist, _elapsed)),
              ],
            ),
          ),

          // Route canvas
          Expanded(
            child: Container(
              margin: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: cs.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(20),
              ),
              child: route.length < 2
                  ? Center(
                      child: Text(
                        tracking ? '📍 Waiting for GPS signal…' : 'Tap ▶ to start',
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                    )
                  : CustomPaint(
                      painter: _RoutePainter(route, cs.primary),
                      child: const SizedBox.expand(),
                    ),
            ),
          ),

          // Controls
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
            child: Row(
              children: [
                if (!tracking && !_saved)
                  Expanded(
                    child: FilledButton.icon(
                      icon: const Icon(Icons.play_arrow),
                      label: const Text('Start'),
                      onPressed: _start,
                      style: FilledButton.styleFrom(
                          backgroundColor: Colors.green,
                          padding: const EdgeInsets.all(16)),
                    ),
                  ),
                if (tracking)
                  Expanded(
                    child: FilledButton.icon(
                      icon: const Icon(Icons.stop),
                      label: const Text('Stop & Save'),
                      onPressed: _stop,
                      style: FilledButton.styleFrom(
                          backgroundColor: Colors.red,
                          padding: const EdgeInsets.all(16)),
                    ),
                  ),
                if (_saved) ...[
                  const Icon(Icons.check_circle, color: Colors.green, size: 28),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text('Saved!',
                        style: Theme.of(context)
                            .textTheme
                            .titleMedium
                            ?.copyWith(color: Colors.green)),
                  ),
                ],
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  icon: const Icon(Icons.refresh),
                  label: const Text('Reset'),
                  onPressed: () {
                    _loc.reset();
                    setState(() { _elapsed = 0; _saved = false; });
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Route Painter ─────────────────────────────────────────────────────────────

class _RoutePainter extends CustomPainter {
  final List<LatLon> route;
  final Color        color;
  _RoutePainter(this.route, this.color);

  @override
  void paint(Canvas canvas, Size size) {
    if (route.length < 2) return;

    final minLat = route.map((p) => p.lat).reduce(math.min);
    final maxLat = route.map((p) => p.lat).reduce(math.max);
    final minLon = route.map((p) => p.lon).reduce(math.min);
    final maxLon = route.map((p) => p.lon).reduce(math.max);

    final latRange = (maxLat - minLat).abs();
    final lonRange = (maxLon - minLon).abs();
    final padding  = 24.0;

    Offset toOffset(LatLon p) {
      final x = latRange < 1e-9 ? size.width / 2
          : padding + (p.lon - minLon) / lonRange * (size.width  - padding * 2);
      final y = latRange < 1e-9 ? size.height / 2
          : size.height - padding - (p.lat - minLat) / latRange * (size.height - padding * 2);
      return Offset(x, y);
    }

    // Shadow
    final shadowPaint = Paint()
      ..color   = color.withOpacity(0.2)
      ..strokeWidth = 7
      ..strokeCap   = StrokeCap.round
      ..strokeJoin  = StrokeJoin.round
      ..style = PaintingStyle.stroke;
    final path = Path()..moveTo(toOffset(route.first).dx, toOffset(route.first).dy);
    for (final p in route.skip(1)) {
      path.lineTo(toOffset(p).dx, toOffset(p).dy);
    }
    canvas.drawPath(path, shadowPaint);

    // Route line
    final paint = Paint()
      ..color   = color
      ..strokeWidth = 3.5
      ..strokeCap   = StrokeCap.round
      ..strokeJoin  = StrokeJoin.round
      ..style = PaintingStyle.stroke;
    canvas.drawPath(path, paint);

    // Start dot (green)
    canvas.drawCircle(toOffset(route.first), 7,
        Paint()..color = Colors.green..style = PaintingStyle.fill);
    // End dot (red)
    canvas.drawCircle(toOffset(route.last), 7,
        Paint()..color = Colors.red..style = PaintingStyle.fill);
  }

  @override
  bool shouldRepaint(_RoutePainter old) => old.route.length != route.length;
}

class _Stat extends StatelessWidget {
  final String label;
  final String value;
  const _Stat({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
        Text(label, style: Theme.of(context).textTheme.labelSmall),
      ],
    );
  }
}
