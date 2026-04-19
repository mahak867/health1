import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

/// Barcode-scan → food lookup screen.
///
/// Scans any EAN-13, UPC-A, or QR barcode then queries the free
/// Open Food Facts API (https://world.openfoodfacts.org/api/v2/product/{barcode})
/// to retrieve nutrition info without requiring an API key.
///
/// The caller receives a [FoodResult] via Navigator.pop so MealsScreen can
/// pre-fill the log-meal form.
class BarcodeScanScreen extends StatefulWidget {
  const BarcodeScanScreen({super.key});

  @override
  State<BarcodeScanScreen> createState() => _BarcodeScanScreenState();
}

class _BarcodeScanScreenState extends State<BarcodeScanScreen> {
  final MobileScannerController _ctrl = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    facing: CameraFacing.back,
    torchEnabled: false,
  );

  bool _scanning    = true;
  bool _loading     = false;
  String? _error;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (!_scanning || _loading) return;
    final code = capture.barcodes.firstOrNull?.rawValue;
    if (code == null) return;

    setState(() { _scanning = false; _loading = true; _error = null; });

    try {
      final uri = Uri.parse(
          'https://world.openfoodfacts.org/api/v2/product/$code.json?fields=product_name,nutriments,serving_size');
      final resp = await http.get(uri).timeout(const Duration(seconds: 10));
      if (resp.statusCode != 200) throw Exception('HTTP ${resp.statusCode}');

      final json    = jsonDecode(resp.body) as Map<String, dynamic>;
      final status  = json['status'] as int? ?? 0;
      if (status == 0) throw Exception('Product not found');

      final product    = json['product'] as Map<String, dynamic>;
      final nutriments = product['nutriments'] as Map<String, dynamic>? ?? {};

      final result = FoodResult(
        barcode:   code,
        name:      (product['product_name'] as String?)?.trim() ?? 'Unknown',
        kcalPer100g: (nutriments['energy-kcal_100g'] as num?)?.toDouble() ?? 0,
        proteinG:    (nutriments['proteins_100g']     as num?)?.toDouble() ?? 0,
        carbsG:      (nutriments['carbohydrates_100g'] as num?)?.toDouble() ?? 0,
        fatG:        (nutriments['fat_100g']           as num?)?.toDouble() ?? 0,
        servingSize: product['serving_size'] as String? ?? '100g',
      );

      if (mounted) Navigator.pop(context, result);
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; _scanning = true; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan Food Barcode'),
        actions: [
          IconButton(
            icon: const Icon(Icons.flash_on),
            tooltip: 'Toggle torch',
            onPressed: () => _ctrl.toggleTorch(),
          ),
        ],
      ),
      body: Stack(
        children: [
          MobileScanner(controller: _ctrl, onDetect: _onDetect),

          // Scanning overlay
          Positioned.fill(
            child: CustomPaint(painter: _ScanOverlayPainter()),
          ),

          // Status messages
          if (_loading)
            const Center(child: CircularProgressIndicator(color: Colors.white)),

          if (_error != null)
            Positioned(
              bottom: 100,
              left: 16,
              right: 16,
              child: Card(
                color: Colors.red[900],
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Colors.white),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(_error!, style: const TextStyle(color: Colors.white)),
                      ),
                      TextButton(
                        onPressed: () => setState(() { _error = null; _scanning = true; }),
                        child: const Text('Retry', style: TextStyle(color: Colors.white)),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          Positioned(
            bottom: 40,
            left: 0,
            right: 0,
            child: Center(
              child: Text(
                _scanning ? 'Point camera at barcode' : 'Looking up product…',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Scan window overlay ───────────────────────────────────────────────────────

class _ScanOverlayPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    const cornerLen = 32.0;
    const strokeW   = 4.0;
    final side = size.width * 0.7;
    final left  = (size.width  - side) / 2;
    final top   = (size.height - side) / 2;
    final rect  = Rect.fromLTWH(left, top, side, side);

    // Dim overlay
    canvas.drawPath(
      Path.combine(PathOperation.difference,
        Path()..addRect(Rect.fromLTWH(0, 0, size.width, size.height)),
        Path()..addRect(rect)),
      Paint()..color = Colors.black.withOpacity(0.55),
    );

    // Corner brackets
    final p = Paint()..color = Colors.white..strokeWidth = strokeW..style = PaintingStyle.stroke;
    // TL
    canvas.drawLine(Offset(rect.left, rect.top + cornerLen), Offset(rect.left, rect.top), p);
    canvas.drawLine(Offset(rect.left, rect.top), Offset(rect.left + cornerLen, rect.top), p);
    // TR
    canvas.drawLine(Offset(rect.right - cornerLen, rect.top), Offset(rect.right, rect.top), p);
    canvas.drawLine(Offset(rect.right, rect.top), Offset(rect.right, rect.top + cornerLen), p);
    // BL
    canvas.drawLine(Offset(rect.left, rect.bottom - cornerLen), Offset(rect.left, rect.bottom), p);
    canvas.drawLine(Offset(rect.left, rect.bottom), Offset(rect.left + cornerLen, rect.bottom), p);
    // BR
    canvas.drawLine(Offset(rect.right - cornerLen, rect.bottom), Offset(rect.right, rect.bottom), p);
    canvas.drawLine(Offset(rect.right, rect.bottom), Offset(rect.right, rect.bottom - cornerLen), p);
  }

  @override
  bool shouldRepaint(_ScanOverlayPainter old) => false;
}

// ── Result model ──────────────────────────────────────────────────────────────

class FoodResult {
  final String barcode;
  final String name;
  final double kcalPer100g;
  final double proteinG;
  final double carbsG;
  final double fatG;
  final String servingSize;

  const FoodResult({
    required this.barcode,
    required this.name,
    required this.kcalPer100g,
    required this.proteinG,
    required this.carbsG,
    required this.fatG,
    required this.servingSize,
  });
}
