import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Guided breathwork / mental-health screen.
///
/// Supports three evidence-based techniques:
///   • Box Breathing       — 4-4-4-4  (Navy SEAL stress reset)
///   • 4-7-8 Technique     — 4-7-8    (Dr. Weil relaxation)
///   • Physiological Sigh  — 2-0-4-0  (Stanford rapid calm)
///
/// An animated circle expands / contracts in sync with the phase.
/// Session length: 4 full cycles (configurable via [totalCycles]).
class BreathworkScreen extends StatefulWidget {
  const BreathworkScreen({super.key});

  @override
  State<BreathworkScreen> createState() => _BreathworkScreenState();
}

class _BreathworkScreenState extends State<BreathworkScreen>
    with SingleTickerProviderStateMixin {
  int _techniqueIdx = 0;
  bool _running     = false;
  int  _cycle       = 0;
  int  _phase       = 0;    // index into current technique's phases
  int  _secondsLeft = 0;
  static const int totalCycles = 4;

  late AnimationController _animCtrl;
  late Animation<double>   _scaleAnim;

  static const _techniques = [
    _Technique(
      name: 'Box Breathing',
      subtitle: '4-4-4-4 — Focus & calm',
      emoji: '🟦',
      color: Color(0xFF3B82F6),
      phases: [
        _Phase('Inhale',       4),
        _Phase('Hold',         4),
        _Phase('Exhale',       4),
        _Phase('Hold',         4),
      ],
    ),
    _Technique(
      name: '4-7-8 Breathing',
      subtitle: '4-7-8 — Deep relaxation',
      emoji: '💜',
      color: Color(0xFF8B5CF6),
      phases: [
        _Phase('Inhale',       4),
        _Phase('Hold',         7),
        _Phase('Exhale',       8),
        _Phase('Rest',         0),
      ],
    ),
    _Technique(
      name: 'Physiological Sigh',
      subtitle: '2-0-4-0 — Rapid calm',
      emoji: '🌊',
      color: Color(0xFF06B6D4),
      phases: [
        _Phase('Inhale',       2),
        _Phase('Double-Inhale', 1),
        _Phase('Exhale slowly', 6),
        _Phase('Rest',         0),
      ],
    ),
  ];

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(vsync: this, duration: const Duration(seconds: 4));
    _scaleAnim = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(parent: _animCtrl, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _animCtrl.dispose();
    _stop();
    super.dispose();
  }

  _Technique get _t => _techniques[_techniqueIdx];

  void _start() {
    setState(() {
      _running = true;
      _cycle   = 0;
      _phase   = 0;
    });
    _runPhase();
  }

  void _stop() {
    _animCtrl.stop();
    setState(() { _running = false; _cycle = 0; _phase = 0; _secondsLeft = 0; });
  }

  Future<void> _runPhase() async {
    while (mounted && _running) {
      final p = _t.phases[_phase];
      if (p.seconds == 0) {
        // Instant transition
        _nextPhase();
        continue;
      }

      setState(() => _secondsLeft = p.seconds);

      // Animate circle
      if (_phase == 0) {
        _animCtrl.duration = Duration(seconds: p.seconds);
        _animCtrl.forward(from: 0);
      } else if (_phase == 2) {
        _animCtrl.duration = Duration(seconds: p.seconds);
        _animCtrl.reverse(from: 1);
      }

      for (var i = p.seconds; i >= 1; i--) {
        if (!mounted || !_running) return;
        setState(() => _secondsLeft = i);
        await Future.delayed(const Duration(seconds: 1));
      }
      if (!mounted || !_running) return;
      _nextPhase();
    }
  }

  void _nextPhase() {
    _phase++;
    if (_phase >= _t.phases.length) {
      _phase = 0;
      _cycle++;
      if (_cycle >= totalCycles) {
        setState(() { _running = false; _cycle = 0; });
        _animCtrl.animateTo(0.7, duration: const Duration(milliseconds: 500));
        return;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final t  = _t;
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Breathwork & Mindfulness')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Technique selector
          if (!_running) ...[
            Text('Choose a technique', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            ...List.generate(_techniques.length, (i) {
              final tech = _techniques[i];
              final selected = i == _techniqueIdx;
              return GestureDetector(
                onTap: () => setState(() => _techniqueIdx = i),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: selected ? tech.color.withOpacity(0.15) : cs.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                        color: selected ? tech.color : Colors.transparent, width: 2),
                  ),
                  child: Row(children: [
                    Text(tech.emoji, style: const TextStyle(fontSize: 28)),
                    const SizedBox(width: 12),
                    Expanded(child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(tech.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                        Text(tech.subtitle, style: Theme.of(context).textTheme.bodySmall),
                      ],
                    )),
                    if (selected) Icon(Icons.check_circle, color: tech.color),
                  ]),
                ),
              );
            }),
            const SizedBox(height: 24),
          ],

          // Animated breathing circle
          SizedBox(
            height: 260,
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Outer glow
                AnimatedBuilder(
                  animation: _scaleAnim,
                  builder: (_, __) => Container(
                    width:  200 * _scaleAnim.value,
                    height: 200 * _scaleAnim.value,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: t.color.withOpacity(0.08 + 0.07 * _scaleAnim.value),
                    ),
                  ),
                ),
                // Inner circle
                AnimatedBuilder(
                  animation: _scaleAnim,
                  builder: (_, __) => Container(
                    width:  130 * _scaleAnim.value,
                    height: 130 * _scaleAnim.value,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(colors: [
                        t.color.withOpacity(0.7),
                        t.color.withOpacity(0.3),
                      ]),
                    ),
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (_running) ...[
                            Text(
                              _t.phases[_phase].label,
                              style: const TextStyle(
                                  color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                              textAlign: TextAlign.center,
                            ),
                            Text(
                              _secondsLeft.toString(),
                              style: const TextStyle(
                                  color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold),
                            ),
                          ] else
                            Text(t.emoji, style: const TextStyle(fontSize: 36)),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Cycle progress
          if (_running) ...[
            Center(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: List.generate(totalCycles, (i) => Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Icon(
                    i < _cycle ? Icons.circle : Icons.circle_outlined,
                    size: 10,
                    color: i < _cycle ? t.color : cs.onSurface.withOpacity(0.3),
                  ),
                )),
              ),
            ),
            const SizedBox(height: 8),
            Center(child: Text('Cycle ${math.min(_cycle + 1, totalCycles)} of $totalCycles',
                style: Theme.of(context).textTheme.bodySmall)),
          ],

          const SizedBox(height: 24),

          // Control buttons
          if (!_running)
            FilledButton.icon(
              icon: const Icon(Icons.play_arrow),
              label: const Text('Start Session'),
              onPressed: _start,
              style: FilledButton.styleFrom(
                  backgroundColor: t.color,
                  padding: const EdgeInsets.all(16)),
            )
          else
            OutlinedButton.icon(
              icon: const Icon(Icons.stop),
              label: const Text('End Session'),
              onPressed: _stop,
            ),

          if (!_running && _cycle > 0) ...[
            const SizedBox(height: 16),
            Card(
              color: t.color.withOpacity(0.1),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    const Icon(Icons.self_improvement, size: 28),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Session complete 🎉\n$totalCycles cycles of ${t.name}',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ── Data classes ──────────────────────────────────────────────────────────────

class _Technique {
  final String name;
  final String subtitle;
  final String emoji;
  final Color  color;
  final List<_Phase> phases;
  const _Technique({
    required this.name, required this.subtitle, required this.emoji,
    required this.color, required this.phases});
}

class _Phase {
  final String label;
  final int    seconds;
  const _Phase(this.label, this.seconds);
}
