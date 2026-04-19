import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/widget_service.dart';

/// Keys shared with VitalsScreen / MealsScreen via SharedPreferences so the
/// HomeScreen can display and forward the latest values to the widget.
const _kPrefHr      = 'pref_heart_rate';
const _kPrefSleep   = 'pref_sleep_hrs';
const _kPrefCalBurn = 'pref_cal_burned';
const _kPrefCalEat  = 'pref_cal_eaten';
const _kPrefWater   = 'pref_water_ml';
const _kPrefSteps   = 'pref_steps';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int    _heartRate  = 0;
  double _sleepHrs   = 0;
  int    _calBurned  = 0;
  int    _calEaten   = 0;
  int    _waterMl    = 0;
  int    _steps      = 0;

  @override
  void initState() {
    super.initState();
    _loadAndPushWidget();
  }

  Future<void> _loadAndPushWidget() async {
    final prefs = await SharedPreferences.getInstance();
    final hr    = prefs.getInt(_kPrefHr)      ?? 0;
    final sleep = prefs.getDouble(_kPrefSleep) ?? 0;
    final cb    = prefs.getInt(_kPrefCalBurn)  ?? 0;
    final ce    = prefs.getInt(_kPrefCalEat)   ?? 0;
    final wml   = prefs.getInt(_kPrefWater)    ?? 0;
    final st    = prefs.getInt(_kPrefSteps)    ?? 0;

    if (!mounted) return;
    setState(() {
      _heartRate = hr;
      _sleepHrs  = sleep;
      _calBurned = cb;
      _calEaten  = ce;
      _waterMl   = wml;
      _steps     = st;
    });

    // Push fresh data to the home-screen widget.
    await WidgetService.update(
      heartRate: hr > 0 ? hr   : null,
      calBurned: cb > 0 ? cb   : null,
      calEaten:  ce > 0 ? ce   : null,
      waterMl:   wml > 0 ? wml : null,
      steps:     st > 0 ? st   : null,
      sleepHrs:  sleep > 0 ? sleep : null,
    );
  }

  String _fmtHr(int v)     => v > 0 ? '$v bpm' : '— bpm';
  String _fmtSleep(double v) => v > 0 ? '${v.toStringAsFixed(1)} hrs' : '— hrs';
  String _fmtCal(int v)    => v > 0 ? '$v kcal' : '— kcal';
  String _fmtSteps(int v)  => v > 0 ? v.toString() : '—';

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: const Text('HealthSphere'),
        backgroundColor: cs.primaryContainer,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh widget',
            onPressed: _loadAndPushWidget,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadAndPushWidget,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text('Welcome back 👋', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 16),
            Row(
              children: [
                _StatCard(label: 'Heart Rate', value: _fmtHr(_heartRate),       color: cs.errorContainer),
                const SizedBox(width: 12),
                _StatCard(label: 'Sleep',      value: _fmtSleep(_sleepHrs),     color: cs.secondaryContainer),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _StatCard(label: 'Cal Burned', value: _fmtCal(_calBurned),      color: cs.tertiaryContainer),
                const SizedBox(width: 12),
                _StatCard(label: 'Cal Eaten',  value: _fmtCal(_calEaten),       color: cs.primaryContainer),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _StatCard(label: 'Steps',  value: _fmtSteps(_steps),            color: cs.secondaryContainer),
                const SizedBox(width: 12),
                _StatCard(label: 'Water',  value: _waterMl > 0 ? '${(_waterMl/1000).toStringAsFixed(2)} L' : '— L', color: cs.primaryContainer),
              ],
            ),
            const SizedBox(height: 24),
            Text('Quick Actions', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: const [
                Chip(label: Text('Log Vitals')),
                Chip(label: Text('Start Workout')),
                Chip(label: Text('Log Meal')),
                Chip(label: Text('Book Appointment')),
              ],
            ),
            const SizedBox(height: 24),
            // Widget hint card
            Card(
              color: cs.primaryContainer.withOpacity(0.4),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    const Icon(Icons.widgets_outlined, size: 32),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Home Screen Widget', style: Theme.of(context).textTheme.titleSmall),
                          const SizedBox(height: 4),
                          Text(
                            'Long-press your home screen → Widgets → HealthSphere to add the at-a-glance widget.',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final Color  color;

  const _StatCard({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: Theme.of(context).textTheme.labelMedium),
            const SizedBox(height: 4),
            Text(value, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }
}
