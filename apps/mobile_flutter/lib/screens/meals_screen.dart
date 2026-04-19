import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/local_db.dart';
import '../services/widget_service.dart';
import '../screens/barcode_scan_screen.dart';

class MealsScreen extends StatefulWidget {
  const MealsScreen({super.key});

  @override
  State<MealsScreen> createState() => _MealsScreenState();
}

class _MealsScreenState extends State<MealsScreen> {
  final _nameController   = TextEditingController();
  final _calController    = TextEditingController();
  final _proteinController = TextEditingController();
  final _carbsController  = TextEditingController();
  final _fatController    = TextEditingController();
  String _mealType = 'breakfast';

  List<Map<String, dynamic>> _meals = [];
  bool _loading = true;
  int  _todayKcal = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _calController.dispose();
    _proteinController.dispose();
    _carbsController.dispose();
    _fatController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final meals = await LocalDb.getMeals();
    final kcal  = await LocalDb.todayCalories();
    if (mounted) setState(() { _meals = meals; _todayKcal = kcal; _loading = false; });
  }

  Future<void> _logMeal() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) return;

    final calories = int.tryParse(_calController.text)    ?? 0;
    final protein  = double.tryParse(_proteinController.text) ?? 0;
    final carbs    = double.tryParse(_carbsController.text)   ?? 0;
    final fat      = double.tryParse(_fatController.text)     ?? 0;
    final now      = DateTime.now();

    await LocalDb.insertMeal({
      'loggedAt':  now.toIso8601String(),
      'name':      name,
      'mealType':  _mealType,
      'calories':  calories,
      'proteinG':  protein,
      'carbsG':    carbs,
      'fatG':      fat,
    });

    // Update SharedPreferences so HomeScreen shows it
    final prefs = await SharedPreferences.getInstance();
    final newTotal = _todayKcal + calories;
    await prefs.setInt('pref_cal_eaten', newTotal);
    await WidgetService.update(calEaten: newTotal);

    _nameController.clear();
    _calController.clear();
    _proteinController.clear();
    _carbsController.clear();
    _fatController.clear();

    await _load();
  }

  Future<void> _scanBarcode() async {
    final result = await Navigator.push<FoodResult>(
      context,
      MaterialPageRoute(builder: (_) => const BarcodeScanScreen()),
    );
    if (result == null) return;
    // Pre-fill form with scanned food data (per 100g)
    _nameController.text    = result.name;
    _calController.text     = result.kcalPer100g.round().toString();
    _proteinController.text = result.proteinG.toStringAsFixed(1);
    _carbsController.text   = result.carbsG.toStringAsFixed(1);
    _fatController.text     = result.fatG.toStringAsFixed(1);
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Meals & Nutrition'),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            tooltip: 'Scan barcode',
            onPressed: _scanBarcode,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  // Today's calorie banner
                  Card(
                    color: cs.primaryContainer,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          const Icon(Icons.local_fire_department),
                          const SizedBox(width: 8),
                          Text('Today: $_todayKcal kcal',
                              style: Theme.of(context).textTheme.titleMedium),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Log form
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          DropdownButtonFormField<String>(
                            value: _mealType,
                            items: ['breakfast', 'lunch', 'dinner', 'snack']
                                .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                                .toList(),
                            onChanged: (v) => setState(() => _mealType = v!),
                            decoration: const InputDecoration(labelText: 'Meal Type'),
                          ),
                          TextField(
                            controller: _nameController,
                            decoration: InputDecoration(
                              labelText: 'Meal Name',
                              suffixIcon: IconButton(
                                icon: const Icon(Icons.qr_code_scanner),
                                tooltip: 'Scan',
                                onPressed: _scanBarcode,
                              ),
                            ),
                          ),
                          TextField(
                            controller: _calController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(labelText: 'Calories (kcal)'),
                          ),
                          Row(children: [
                            Expanded(child: TextField(
                              controller: _proteinController,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(labelText: 'Protein (g)'),
                            )),
                            const SizedBox(width: 8),
                            Expanded(child: TextField(
                              controller: _carbsController,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(labelText: 'Carbs (g)'),
                            )),
                            const SizedBox(width: 8),
                            Expanded(child: TextField(
                              controller: _fatController,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(labelText: 'Fat (g)'),
                            )),
                          ]),
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton(
                              onPressed: _logMeal,
                              child: const Text('Log Meal'),
                            ),
                          ),
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
                              final protein = (m['protein_g'] as num?)?.toDouble() ?? 0;
                              final carbs   = (m['carbs_g']   as num?)?.toDouble() ?? 0;
                              final fat     = (m['fat_g']     as num?)?.toDouble() ?? 0;
                              final synced  = (m['synced'] as int?) == 1;
                              return ListTile(
                                leading: Icon(Icons.restaurant,
                                    color: synced ? Colors.green : Colors.orange),
                                title: Text(m['name'] as String),
                                subtitle: Text(
                                  '${m['meal_type']} · ${m['calories']} kcal'
                                  '${protein > 0 ? '  P:${protein.toStringAsFixed(0)}g' : ''}'
                                  '${carbs > 0   ? '  C:${carbs.toStringAsFixed(0)}g' : ''}'
                                  '${fat > 0     ? '  F:${fat.toStringAsFixed(0)}g' : ''}',
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
