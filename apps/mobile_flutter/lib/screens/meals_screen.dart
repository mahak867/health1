import 'package:flutter/material.dart';

class MealsScreen extends StatefulWidget {
  const MealsScreen({super.key});

  @override
  State<MealsScreen> createState() => _MealsScreenState();
}

class _MealsScreenState extends State<MealsScreen> {
  final _nameController = TextEditingController();
  final _calController = TextEditingController();
  String _mealType = 'breakfast';
  final List<Map<String, dynamic>> _meals = [];

  void _logMeal() {
    if (_nameController.text.isEmpty) return;
    setState(() {
      _meals.insert(0, {
        'name': _nameController.text, 'type': _mealType,
        'calories': int.tryParse(_calController.text) ?? 0,
        'loggedAt': DateTime.now()
      });
      _nameController.clear(); _calController.clear();
    });
  }

  int get _todayCalories => _meals
    .where((m) => (m['loggedAt'] as DateTime).day == DateTime.now().day)
    .fold(0, (s, m) => s + (m['calories'] as int));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Meals & Nutrition')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Card(
              color: Theme.of(context).colorScheme.primaryContainer,
              child: Padding(padding: const EdgeInsets.all(16), child: Row(
                children: [
                  const Icon(Icons.local_fire_department),
                  const SizedBox(width: 8),
                  Text('Today: $_todayCalories kcal', style: Theme.of(context).textTheme.titleMedium),
                ],
              )),
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    DropdownButtonFormField<String>(
                      value: _mealType,
                      items: ['breakfast', 'lunch', 'dinner', 'snack'].map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                      onChanged: (v) => setState(() => _mealType = v!),
                      decoration: const InputDecoration(labelText: 'Meal Type'),
                    ),
                    TextField(controller: _nameController, decoration: const InputDecoration(labelText: 'Meal Name')),
                    TextField(controller: _calController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Calories (kcal)')),
                    const SizedBox(height: 12),
                    SizedBox(width: double.infinity, child: FilledButton(onPressed: _logMeal, child: const Text('Log Meal'))),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: _meals.isEmpty
                ? const Center(child: Text('No meals logged'))
                : ListView.builder(
                    itemCount: _meals.length,
                    itemBuilder: (ctx, i) {
                      final m = _meals[i];
                      return ListTile(
                        leading: const Icon(Icons.restaurant),
                        title: Text(m['name'] as String),
                        subtitle: Text('${m['type']} · ${m['calories']} kcal'),
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
