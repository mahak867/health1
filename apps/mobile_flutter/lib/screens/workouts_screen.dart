import 'package:flutter/material.dart';
import '../services/local_db.dart';
import '../services/widget_service.dart';
import '../screens/activity_map_screen.dart';

class WorkoutsScreen extends StatefulWidget {
  const WorkoutsScreen({super.key});

  @override
  State<WorkoutsScreen> createState() => _WorkoutsScreenState();
}

class _WorkoutsScreenState extends State<WorkoutsScreen> {
  final _titleController = TextEditingController();
  List<Map<String, dynamic>> _workouts = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final rows = await LocalDb.getWorkouts();
    if (mounted) setState(() { _workouts = rows; _loading = false; });
  }

  Future<void> _createWorkout() async {
    final title = _titleController.text.trim();
    if (title.isEmpty) return;
    await LocalDb.insertWorkout({'title': title, 'workoutType': 'other'});
    _titleController.clear();
    await _load();
  }

  Future<void> _startGpsActivity() async {
    final title = _titleController.text.trim().isNotEmpty
        ? _titleController.text.trim()
        : 'GPS Run';
    await Navigator.push(
      context,
      MaterialPageRoute(
          builder: (_) => ActivityMapScreen(workoutTitle: title)),
    );
    // Reload after returning — the GPS screen saves the workout on stop
    await _load();
    // Also push widget with total burned cal estimate
    final totalCal = _workouts.fold<int>(
        0, (s, w) => s + ((w['calories_burned'] as num?)?.toInt() ?? 0));
    await WidgetService.update(calBurned: totalCal);
  }

  String _fmtDuration(int? seconds) {
    if (seconds == null || seconds == 0) return '—';
    final m = seconds ~/ 60;
    final s = seconds % 60;
    return m > 0 ? '${m}m ${s}s' : '${s}s';
  }

  String _fmtDist(double? m) {
    if (m == null || m == 0) return '';
    return m >= 1000 ? '  ${(m / 1000).toStringAsFixed(2)} km' : '  ${m.round()} m';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Workouts')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _titleController,
                          decoration: const InputDecoration(
                            labelText: 'Workout title',
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      FilledButton(
                        onPressed: _createWorkout,
                        child: const Text('Add'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  // GPS tracking button
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.map_outlined),
                      label: const Text('Start GPS Activity'),
                      onPressed: _startGpsActivity,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Expanded(
                    child: _workouts.isEmpty
                        ? const Center(child: Text('No workouts yet'))
                        : ListView.builder(
                            itemCount: _workouts.length,
                            itemBuilder: (ctx, i) {
                              final w = _workouts[i];
                              final hasRoute = (w['route_json'] as String?)?.isNotEmpty ?? false;
                              final synced   = (w['synced'] as int?) == 1;
                              return Card(
                                child: ListTile(
                                  leading: Icon(
                                    hasRoute ? Icons.route : Icons.fitness_center,
                                    color: synced ? Colors.green : Colors.orange,
                                  ),
                                  title: Text(w['title'] as String),
                                  subtitle: Text(
                                    '${w['workout_type'] ?? 'other'}'
                                    '  ${_fmtDuration(w['duration_seconds'] as int?)}'
                                    '${_fmtDist(w['distance_m'] as double?)}'
                                    '${(w['calories_burned'] as num? ?? 0) > 0 ? '  ${w['calories_burned']} kcal' : ''}',
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
            ),
    );
  }
}
