import 'package:flutter/material.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _nameController = TextEditingController(text: 'Demo User');
  final _heightController = TextEditingController();
  final _weightController = TextEditingController();
  String _mode = 'maintenance';
  bool _saved = false;

  void _save() {
    setState(() => _saved = true);
    Future.delayed(const Duration(seconds: 2), () { if (mounted) setState(() => _saved = false); });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: [
            const CircleAvatar(radius: 40, child: Icon(Icons.person, size: 40)),
            const SizedBox(height: 16),
            TextField(controller: _nameController, decoration: const InputDecoration(labelText: 'Full Name', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(controller: _heightController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Height (cm)', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(controller: _weightController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Weight (kg)', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _mode,
              decoration: const InputDecoration(labelText: 'Training Mode', border: OutlineInputBorder()),
              items: ['cut', 'bulk', 'maintenance', 'recomposition'].map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
              onChanged: (v) => setState(() => _mode = v!),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              icon: _saved ? const Icon(Icons.check) : const Icon(Icons.save),
              label: Text(_saved ? 'Saved!' : 'Save Profile'),
              onPressed: _save,
            ),
            const SizedBox(height: 24),
            OutlinedButton(
              onPressed: () {},
              child: const Text('Sync with Wearables'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: () {},
              child: const Text('Request Data Export'),
            ),
          ],
        ),
      ),
    );
  }
}
