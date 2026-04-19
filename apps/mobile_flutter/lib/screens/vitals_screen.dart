import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/local_db.dart';
import '../services/widget_service.dart';
import '../screens/home_screen.dart' show _kPrefHr, _kPrefSleep;

class VitalsScreen extends StatefulWidget {
  const VitalsScreen({super.key});

  @override
  State<VitalsScreen> createState() => _VitalsScreenState();
}

class _VitalsScreenState extends State<VitalsScreen> {
  final _hrController    = TextEditingController();
  final _spo2Controller  = TextEditingController();
  final _sleepController = TextEditingController();
  final _stressController = TextEditingController();

  List<Map<String, dynamic>> _vitals = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _hrController.dispose();
    _spo2Controller.dispose();
    _sleepController.dispose();
    _stressController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final rows = await LocalDb.getVitals();
    if (mounted) setState(() { _vitals = rows; _loading = false; });
  }

  Future<void> _logVital() async {
    final hrStr = _hrController.text.trim();
    if (hrStr.isEmpty) return;

    final now      = DateTime.now();
    final hr       = int.tryParse(hrStr);
    final spo2     = double.tryParse(_spo2Controller.text);
    final sleep    = double.tryParse(_sleepController.text);
    final stress   = int.tryParse(_stressController.text);

    await LocalDb.insertVital({
      'recordedAt':  now.toIso8601String(),
      'heartRate':   hr,
      'spo2':        spo2,
      'sleepHours':  sleep,
      'stressLevel': stress,
    });

    // Persist latest values for HomeScreen / widget
    final prefs = await SharedPreferences.getInstance();
    if (hr    != null) await prefs.setInt('pref_heart_rate', hr);
    if (sleep != null) await prefs.setDouble('pref_sleep_hrs', sleep);

    await WidgetService.update(
      heartRate: hr,
      sleepHrs:  sleep,
    );

    _hrController.clear();
    _spo2Controller.clear();
    _sleepController.clear();
    _stressController.clear();

    await _load();
  }

  /// Estimate RMSSD proxy from successive HR differences (not true RR intervals,
  /// but useful as a qualitative HRV indicator from manual readings).
  double? _estimateHrv(List<Map<String, dynamic>> vitals) {
    if (vitals.length < 4) return null;
    final hrs = vitals
        .take(8)
        .map((v) => (v['heart_rate'] as num?)?.toDouble())
        .whereType<double>()
        .toList();
    if (hrs.length < 3) return null;
    final diffs = <double>[];
    for (var i = 0; i < hrs.length - 1; i++) {
      diffs.add((hrs[i] - hrs[i + 1]).abs());
    }
    final mean   = diffs.reduce((a, b) => a + b) / diffs.length;
    final sq     = diffs.map((d) => (d - mean) * (d - mean)).reduce((a, b) => a + b);
    return math.sqrt(sq / diffs.length);
  }

  @override
  Widget build(BuildContext context) {
    final hrv = _estimateHrv(_vitals);
    return Scaffold(
      appBar: AppBar(title: const Text('Vital Signs')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  // HRV estimate banner
                  if (hrv != null)
                    Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(
                        color: _hrvColor(hrv).withOpacity(0.15),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: _hrvColor(hrv).withOpacity(0.4)),
                      ),
                      child: Row(children: [
                        Icon(Icons.monitor_heart, color: _hrvColor(hrv)),
                        const SizedBox(width: 8),
                        Expanded(child: Text(
                          'HRV proxy: ${hrv.toStringAsFixed(1)} ms  (${_hrvLabel(hrv)})',
                          style: TextStyle(color: _hrvColor(hrv), fontWeight: FontWeight.bold),
                        )),
                      ]),
                    ),

                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          TextField(
                            controller: _hrController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(labelText: 'Heart Rate (bpm)'),
                          ),
                          TextField(
                            controller: _spo2Controller,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(labelText: 'SpO2 (%)'),
                          ),
                          TextField(
                            controller: _sleepController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(labelText: 'Sleep (hours)'),
                          ),
                          TextField(
                            controller: _stressController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(labelText: 'Stress (0-10)'),
                          ),
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton(
                              onPressed: _logVital,
                              child: const Text('Log Vital'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  Expanded(
                    child: _vitals.isEmpty
                        ? const Center(child: Text('No vitals logged yet'))
                        : ListView.builder(
                            itemCount: _vitals.length,
                            itemBuilder: (ctx, i) {
                              final v = _vitals[i];
                              final hr    = v['heart_rate'];
                              final spo2  = v['spo2'];
                              final sleep = v['sleep_hours'];
                              final stress = v['stress_level'];
                              final synced = (v['synced'] as int?) == 1;
                              return ListTile(
                                leading: Icon(Icons.favorite,
                                    color: synced ? Colors.green : Colors.orange),
                                title: Text('HR: ${hr ?? '—'} bpm  SpO2: ${spo2 ?? '—'}%'),
                                subtitle: Text(
                                    'Sleep: ${sleep ?? '—'}h  Stress: ${stress ?? '—'}/10\n'
                                    '${v['recorded_at']?.toString().substring(0, 16) ?? ''}'),
                                isThreeLine: true,
                              );
                            },
                          ),
                  ),
                ],
              ),
            ),
    );
  }

  Color _hrvColor(double hrv) {
    if (hrv < 5) return Colors.green;
    if (hrv < 15) return Colors.orange;
    return Colors.red;
  }

  String _hrvLabel(double hrv) {
    if (hrv < 5) return 'stable';
    if (hrv < 15) return 'moderate variability';
    return 'high variability';
  }
}
