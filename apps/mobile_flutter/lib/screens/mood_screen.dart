import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Mood entry model
class MoodLog {
  final int score;
  final String? notes;
  final DateTime loggedAt;
  MoodLog({required this.score, this.notes, required this.loggedAt});
  factory MoodLog.fromJson(Map<String, dynamic> j) => MoodLog(
        score: j['score'] as int,
        notes: j['notes'] as String?,
        loggedAt: DateTime.parse(j['logged_at'] as String),
      );
}

/// 5-emoji mood scale + journal notes — matches web BreathworkPage mood tracker
class MoodScreen extends StatefulWidget {
  const MoodScreen({super.key});
  @override
  State<MoodScreen> createState() => _MoodScreenState();
}

class _MoodScreenState extends State<MoodScreen> {
  static const _emojis = ['😞', '😕', '😐', '🙂', '😄'];
  static const _labels = ['Bad', 'Low', 'Okay', 'Good', 'Great'];
  static const _colors = [
    Color(0xFFEF4444),
    Color(0xFFF97316),
    Color(0xFFF59E0B),
    Color(0xFF22C55E),
    Color(0xFF10B981),
  ];

  int? _selected;
  final _notesCtrl = TextEditingController();
  bool _saving = false;
  String? _savedMsg;
  List<MoodLog> _logs = [];
  double? _avg;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchLogs();
  }

  @override
  void dispose() {
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }

  Future<String> _baseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('api_base') ?? 'http://10.0.2.2:4000/api/v1';
  }

  Future<void> _fetchLogs() async {
    try {
      final token = await _getToken();
      if (token == null) return;
      final base = await _baseUrl();
      final res = await http.get(
        Uri.parse('$base/health/mood?days=14'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        final logs = (data['logs'] as List)
            .map((e) => MoodLog.fromJson(e as Map<String, dynamic>))
            .toList();
        setState(() {
          _logs = logs;
          _avg = (data['average'] as num?)?.toDouble();
          _loading = false;
        });
      }
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _logMood() async {
    if (_selected == null) return;
    setState(() => _saving = true);
    try {
      final token = await _getToken();
      final base = await _baseUrl();
      final body = jsonEncode({
        'score': _selected,
        if (_notesCtrl.text.isNotEmpty) 'notes': _notesCtrl.text.trim(),
      });
      final res = await http.post(
        Uri.parse('$base/health/mood'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: body,
      );
      if (res.statusCode == 201) {
        setState(() {
          _savedMsg = 'Mood logged ✅';
          _selected = null;
          _saving = false;
        });
        _notesCtrl.clear();
        await _fetchLogs();
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) setState(() => _savedMsg = null);
        });
      } else {
        setState(() => _saving = false);
      }
    } catch (_) {
      setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('Mood Check-In 🧠', style: TextStyle(color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Average badge
            if (_avg != null) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: _colors[_avg!.round() - 1].withOpacity(0.15),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: _colors[_avg!.round() - 1].withOpacity(0.4)),
                ),
                child: Text(
                  '14-day avg: ${_emojis[_avg!.round() - 1]} ${_avg!.toStringAsFixed(1)}/5',
                  style: TextStyle(color: _colors[_avg!.round() - 1], fontWeight: FontWeight.bold, fontSize: 13),
                ),
              ),
              const SizedBox(height: 20),
            ],

            // Emoji scale
            const Text('How are you feeling?', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: List.generate(5, (i) {
                final selected = _selected == i + 1;
                return GestureDetector(
                  onTap: () => setState(() => _selected = i + 1),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: selected ? _colors[i].withOpacity(0.2) : Colors.transparent,
                      borderRadius: BorderRadius.circular(14),
                      border: selected ? Border.all(color: _colors[i], width: 2) : null,
                    ),
                    child: Column(
                      children: [
                        Text(_emojis[i], style: TextStyle(fontSize: selected ? 40 : 32)),
                        const SizedBox(height: 4),
                        Text(_labels[i],
                            style: TextStyle(color: selected ? _colors[i] : Colors.grey, fontSize: 10, fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                );
              }),
            ),

            const SizedBox(height: 20),

            // Notes field
            TextField(
              controller: _notesCtrl,
              maxLines: 3,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Optional: How are you feeling? What happened today?',
                hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
                filled: true,
                fillColor: Colors.white.withOpacity(0.05),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFF8B5CF6)),
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Log button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: (_selected == null || _saving) ? null : _logMood,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF8B5CF6),
                  disabledBackgroundColor: const Color(0xFF8B5CF6).withOpacity(0.4),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: Text(
                  _savedMsg ?? (_saving ? 'Saving…' : '+ Log Mood'),
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                ),
              ),
            ),

            const SizedBox(height: 28),

            // Recent moods
            if (_loading)
              const Center(child: CircularProgressIndicator(color: Color(0xFF8B5CF6)))
            else if (_logs.isNotEmpty) ...[
              const Text('RECENT MOODS', style: TextStyle(color: Color(0xFF64748B), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.5)),
              const SizedBox(height: 10),
              ..._logs.take(10).map((log) {
                final idx = log.score - 1;
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.04),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withOpacity(0.08)),
                  ),
                  child: Row(
                    children: [
                      Text(_emojis[idx], style: const TextStyle(fontSize: 24)),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(_labels[idx],
                                style: TextStyle(color: _colors[idx], fontWeight: FontWeight.bold, fontSize: 13)),
                            if (log.notes != null && log.notes!.isNotEmpty)
                              Text(log.notes!, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                                  overflow: TextOverflow.ellipsis),
                          ],
                        ),
                      ),
                      Text(
                        '${log.loggedAt.month}/${log.loggedAt.day}',
                        style: const TextStyle(color: Color(0xFF475569), fontSize: 11),
                      ),
                    ],
                  ),
                );
              }),

              // 14-day sparkline
              if (_logs.length >= 3) ...[
                const SizedBox(height: 12),
                const Text('14-DAY TREND', style: TextStyle(color: Color(0xFF64748B), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.5)),
                const SizedBox(height: 8),
                SizedBox(
                  height: 60,
                  child: CustomPaint(
                    painter: _MoodSparklinePainter(_logs.reversed.toList()),
                    size: const Size(double.infinity, 60),
                  ),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }
}

class _MoodSparklinePainter extends CustomPainter {
  final List<MoodLog> logs;
  _MoodSparklinePainter(this.logs);

  static const _colors = [
    Color(0xFFEF4444), Color(0xFFF97316),
    Color(0xFFF59E0B), Color(0xFF22C55E), Color(0xFF10B981),
  ];

  @override
  void paint(Canvas canvas, Size size) {
    if (logs.length < 2) return;
    final paint = Paint()
      ..color = const Color(0xFF8B5CF6)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final path = Path();
    for (var i = 0; i < logs.length; i++) {
      final x = (i / (logs.length - 1)) * size.width;
      final y = size.height - ((logs[i].score - 1) / 4) * size.height;
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    canvas.drawPath(path, paint);

    // Dots
    for (var i = 0; i < logs.length; i++) {
      final x = (i / (logs.length - 1)) * size.width;
      final y = size.height - ((logs[i].score - 1) / 4) * size.height;
      canvas.drawCircle(Offset(x, y), 4, Paint()..color = _colors[logs[i].score - 1]);
    }
  }

  @override
  bool shouldRepaint(_MoodSparklinePainter old) => old.logs != logs;
}
