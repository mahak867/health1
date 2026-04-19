import 'package:flutter/material.dart';
import 'package:local_auth/local_auth.dart';
import '../services/health_sync.dart';
import '../services/widget_service.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _nameController   = TextEditingController(text: 'Demo User');
  final _heightController = TextEditingController();
  final _weightController = TextEditingController();
  String _mode  = 'maintenance';
  bool   _saved = false;

  // Biometric auth
  final _localAuth    = LocalAuthentication();
  bool _biometricEnabled = false;
  bool _biometricAvailable = false;

  // Health sync
  bool _healthAuthorised = false;
  bool _healthSyncing    = false;
  Map<String, dynamic> _healthData = {};

  @override
  void initState() {
    super.initState();
    _initBiometric();
    _checkHealthAuth();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _heightController.dispose();
    _weightController.dispose();
    super.dispose();
  }

  // ── Biometric ─────────────────────────────────────────────────────────────

  Future<void> _initBiometric() async {
    try {
      final available = await _localAuth.canCheckBiometrics;
      final enrolled  = await _localAuth.getAvailableBiometrics();
      if (mounted) {
        setState(() {
          _biometricAvailable = available && enrolled.isNotEmpty;
        });
      }
    } catch (_) {}
  }

  Future<void> _toggleBiometric(bool enable) async {
    if (!_biometricAvailable) return;
    if (enable) {
      final ok = await _localAuth.authenticate(
        localizedReason: 'Enable biometric login for HealthSphere',
        options: const AuthenticationOptions(stickyAuth: true),
      );
      if (ok && mounted) setState(() => _biometricEnabled = true);
    } else {
      setState(() => _biometricEnabled = false);
    }
  }

  // ── Health Sync ───────────────────────────────────────────────────────────

  Future<void> _checkHealthAuth() async {
    final ok = await HealthSyncService.isAuthorised;
    if (mounted) setState(() => _healthAuthorised = ok);
  }

  Future<void> _connectHealth() async {
    final ok = await HealthSyncService.requestPermissions();
    if (mounted) setState(() => _healthAuthorised = ok);
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Health permission denied. Enable in Settings.')),
      );
    }
  }

  Future<void> _syncHealth() async {
    if (!_healthAuthorised) { await _connectHealth(); return; }
    setState(() => _healthSyncing = true);
    final data = await HealthSyncService.pullAndCache();
    await WidgetService.update(
      steps:     data['steps'] as int?,
      heartRate: data['heartRate'] as int?,
      sleepHrs:  data['sleepHrs'] as double?,
      calBurned: data['calBurned'] as int?,
    );
    if (mounted) setState(() { _healthData = data; _healthSyncing = false; });
  }

  void _save() {
    setState(() => _saved = true);
    Future.delayed(const Duration(seconds: 2),
        () { if (mounted) setState(() => _saved = false); });
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: [
            const CircleAvatar(radius: 40, child: Icon(Icons.person, size: 40)),
            const SizedBox(height: 16),

            TextField(controller: _nameController,
                decoration: const InputDecoration(labelText: 'Full Name', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(controller: _heightController, keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Height (cm)', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(controller: _weightController, keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Weight (kg)', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _mode,
              decoration: const InputDecoration(labelText: 'Training Mode', border: OutlineInputBorder()),
              items: ['cut', 'bulk', 'maintenance', 'recomposition']
                  .map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
              onChanged: (v) => setState(() => _mode = v!),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              icon: _saved ? const Icon(Icons.check) : const Icon(Icons.save),
              label: Text(_saved ? 'Saved!' : 'Save Profile'),
              onPressed: _save,
            ),
            const SizedBox(height: 24),

            // ── Biometric auth card ──────────────────────────────────────────
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      const Icon(Icons.fingerprint, size: 28),
                      const SizedBox(width: 12),
                      Text('Biometric Login',
                          style: Theme.of(context).textTheme.titleMedium),
                    ]),
                    const SizedBox(height: 8),
                    if (!_biometricAvailable)
                      Text('No biometrics enrolled on this device.',
                          style: Theme.of(context).textTheme.bodySmall)
                    else
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(_biometricEnabled
                            ? 'Enabled (Face ID / Fingerprint)'
                            : 'Disabled'),
                        value:   _biometricEnabled,
                        onChanged: _toggleBiometric,
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // ── Health platform sync card ────────────────────────────────────
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      const Icon(Icons.favorite_border, size: 28),
                      const SizedBox(width: 12),
                      Text('Health Platform Sync',
                          style: Theme.of(context).textTheme.titleMedium),
                      const Spacer(),
                      Icon(
                        _healthAuthorised ? Icons.link : Icons.link_off,
                        color: _healthAuthorised ? Colors.green : Colors.grey,
                      ),
                    ]),
                    const SizedBox(height: 4),
                    Text(
                      _healthAuthorised
                          ? 'Connected to HealthKit / Health Connect'
                          : 'Sync steps, HR, sleep from your Health app',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 12),
                    if (_healthData.isNotEmpty) ...[
                      _HealthRow('Steps',     '${_healthData['steps'] ?? '—'}'),
                      _HealthRow('Heart Rate','${_healthData['heartRate'] ?? '—'} bpm'),
                      _HealthRow('Sleep',     '${_healthData['sleepHrs'] ?? '—'} hrs'),
                      _HealthRow('Cal Burned','${_healthData['calBurned'] ?? '—'} kcal'),
                      const SizedBox(height: 8),
                    ],
                    SizedBox(
                      width: double.infinity,
                      child: _healthSyncing
                          ? const LinearProgressIndicator()
                          : OutlinedButton.icon(
                              icon: Icon(_healthAuthorised
                                  ? Icons.sync : Icons.link),
                              label: Text(_healthAuthorised
                                  ? 'Sync Now' : 'Connect Health'),
                              onPressed: _syncHealth,
                            ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            OutlinedButton(onPressed: () {}, child: const Text('Request Data Export')),
          ],
        ),
      ),
    );
  }
}

class _HealthRow extends StatelessWidget {
  final String label;
  final String value;
  const _HealthRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Text('$label: ', style: Theme.of(context).textTheme.bodySmall
              ?.copyWith(color: Theme.of(context).colorScheme.primary)),
          Text(value, style: Theme.of(context).textTheme.bodySmall
              ?.copyWith(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
