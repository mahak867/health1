import 'package:flutter/material.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: const Text('HealthSphere'),
        backgroundColor: colorScheme.primaryContainer,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Welcome back 👋', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 16),
            Row(
              children: [
                _StatCard(label: 'Heart Rate', value: '— bpm', color: colorScheme.errorContainer),
                const SizedBox(width: 12),
                _StatCard(label: 'Sleep', value: '— hrs', color: colorScheme.secondaryContainer),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _StatCard(label: 'Calories', value: '— kcal', color: colorScheme.tertiaryContainer),
                const SizedBox(width: 12),
                _StatCard(label: 'Steps', value: '—', color: colorScheme.primaryContainer),
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
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

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
