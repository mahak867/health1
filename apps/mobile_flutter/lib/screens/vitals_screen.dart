import 'package:flutter/material.dart';

class VitalsScreen extends StatefulWidget {
  const VitalsScreen({super.key});

  @override
  State<VitalsScreen> createState() => _VitalsScreenState();
}

class _VitalsScreenState extends State<VitalsScreen> {
  final _hrController = TextEditingController();
  final _spo2Controller = TextEditingController();
  final _sleepController = TextEditingController();
  final _stressController = TextEditingController();

  final List<Map<String, dynamic>> _vitals = [];

  void _logVital() {
    if (_hrController.text.isEmpty) return;
    setState(() {
      _vitals.insert(0, {
        'recordedAt': DateTime.now().toIso8601String(),
        'heartRate': int.tryParse(_hrController.text),
        'spo2': double.tryParse(_spo2Controller.text),
        'sleepHours': double.tryParse(_sleepController.text),
        'stressLevel': int.tryParse(_stressController.text),
      });
      _hrController.clear(); _spo2Controller.clear();
      _sleepController.clear(); _stressController.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Vital Signs')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    TextField(controller: _hrController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Heart Rate (bpm)')),
                    TextField(controller: _spo2Controller, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'SpO2 (%)')),
                    TextField(controller: _sleepController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Sleep (hours)')),
                    TextField(controller: _stressController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Stress (0-10)')),
                    const SizedBox(height: 12),
                    SizedBox(width: double.infinity, child: FilledButton(onPressed: _logVital, child: const Text('Log Vital'))),
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
                      return ListTile(
                        leading: const Icon(Icons.favorite),
                        title: Text('HR: ${v['heartRate'] ?? '—'} bpm  SpO2: ${v['spo2'] ?? '—'}%'),
                        subtitle: Text('Sleep: ${v['sleepHours'] ?? '—'}h  Stress: ${v['stressLevel'] ?? '—'}/10'),
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
