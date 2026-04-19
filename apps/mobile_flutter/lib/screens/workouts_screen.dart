import 'package:flutter/material.dart';

class WorkoutsScreen extends StatefulWidget {
  const WorkoutsScreen({super.key});

  @override
  State<WorkoutsScreen> createState() => _WorkoutsScreenState();
}

class _WorkoutsScreenState extends State<WorkoutsScreen> {
  final _titleController = TextEditingController();
  final List<Map<String, dynamic>> _workouts = [];

  void _createWorkout() {
    if (_titleController.text.isEmpty) return;
    setState(() {
      _workouts.insert(0, { 'title': _titleController.text, 'exercises': <String>[], 'createdAt': DateTime.now() });
      _titleController.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Workouts')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(child: TextField(controller: _titleController, decoration: const InputDecoration(labelText: 'Workout title', border: OutlineInputBorder()))),
                const SizedBox(width: 8),
                FilledButton(onPressed: _createWorkout, child: const Text('Add')),
              ],
            ),
            const SizedBox(height: 16),
            Expanded(
              child: _workouts.isEmpty
                ? const Center(child: Text('No workouts yet'))
                : ListView.builder(
                    itemCount: _workouts.length,
                    itemBuilder: (ctx, i) {
                      final w = _workouts[i];
                      return Card(
                        child: ListTile(
                          leading: const Icon(Icons.fitness_center),
                          title: Text(w['title'] as String),
                          subtitle: Text('${(w['exercises'] as List).length} exercises'),
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
