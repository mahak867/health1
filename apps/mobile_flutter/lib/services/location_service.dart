/// LocationService — GPS route recording for activities.
///
/// • Requests foreground location permission on first use.
/// • Records a stream of [LatLon] waypoints while tracking is active.
/// • Calculates total distance (Haversine formula).
/// • Encodes route as JSON list of {lat, lon} objects for storage in SQLite.
///
/// AndroidManifest.xml additions needed:
///   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
///   <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
///
/// iOS Info.plist additions needed:
///   NSLocationWhenInUseUsageDescription
library;

import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

class LatLon {
  final double lat;
  final double lon;
  const LatLon(this.lat, this.lon);
  Map<String, double> toJson() => {'lat': lat, 'lon': lon};
}

class LocationService extends ChangeNotifier {
  LocationService._();
  static final LocationService instance = LocationService._();

  bool _tracking = false;
  final List<LatLon> _route = [];
  double _distanceM = 0;
  StreamSubscription<Position>? _sub;

  bool get isTracking => _tracking;
  List<LatLon> get route => List.unmodifiable(_route);
  double get distanceM => _distanceM;
  int get durationSeconds => _startedAt != null
      ? DateTime.now().difference(_startedAt!).inSeconds
      : 0;
  DateTime? _startedAt;

  // ── Permissions ───────────────────────────────────────────────────────────

  static Future<bool> requestPermission() async {
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return false;

      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      return perm == LocationPermission.whileInUse ||
          perm == LocationPermission.always;
    } catch (e) {
      debugPrint('[LocationService] permission error: $e');
      return false;
    }
  }

  // ── Tracking ──────────────────────────────────────────────────────────────

  Future<bool> startTracking() async {
    if (_tracking) return true;
    if (!await requestPermission()) return false;

    _route.clear();
    _distanceM  = 0;
    _startedAt  = DateTime.now();
    _tracking   = true;
    notifyListeners();

    const settings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 5,
    );

    _sub = Geolocator.getPositionStream(locationSettings: settings).listen(
      (pos) {
        final wp = LatLon(pos.latitude, pos.longitude);
        if (_route.isNotEmpty) {
          _distanceM += _haversine(_route.last, wp);
        }
        _route.add(wp);
        notifyListeners();
      },
      onError: (e) => debugPrint('[LocationService] stream error: $e'),
    );
    return true;
  }

  void stopTracking() {
    _sub?.cancel();
    _sub      = null;
    _tracking = false;
    notifyListeners();
  }

  void reset() {
    stopTracking();
    _route.clear();
    _distanceM = 0;
    _startedAt = null;
    notifyListeners();
  }

  String encodeRouteJson() =>
      jsonEncode(_route.map((p) => p.toJson()).toList());

  // ── Haversine distance (metres) ───────────────────────────────────────────

  static double _haversine(LatLon a, LatLon b) {
    const r = 6371000.0;
    final dLat = _deg2rad(b.lat - a.lat);
    final dLon = _deg2rad(b.lon - a.lon);
    final sinDLat = math.sin(dLat / 2);
    final sinDLon = math.sin(dLon / 2);
    final h = sinDLat * sinDLat +
        math.cos(_deg2rad(a.lat)) * math.cos(_deg2rad(b.lat)) * sinDLon * sinDLon;
    return 2 * r * math.asin(math.sqrt(h));
  }

  static double _deg2rad(double d) => d * math.pi / 180;
}
