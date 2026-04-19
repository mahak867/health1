import 'package:flutter/material.dart';
import 'package:local_auth/local_auth.dart';
import 'screens/home_screen.dart';
import 'screens/vitals_screen.dart';
import 'screens/workouts_screen.dart';
import 'screens/meals_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/breathwork_screen.dart';
import 'services/widget_service.dart';
import 'services/local_db.dart';
import 'services/health_sync.dart';
import 'services/pedometer_service.dart';
import 'services/notification_service.dart';
import 'services/api_sync.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialise services in parallel where possible.
  await Future.wait([
    WidgetService.init(),
    LocalDb.db,                  // opens / migrates the SQLite database
    PedometerService.instance.init(),
    NotificationService.init(),
  ]);

  // Background: request HealthKit / Health Connect permissions and pull data.
  // This is fire-and-forget so it doesn't block app startup.
  HealthSyncService.requestPermissions().then((_) =>
      HealthSyncService.pullAndCache());

  // Push any unsynced local records to the API.
  ApiSyncService.sync();

  // Schedule default water + workout reminders (user can adjust in Profile).
  NotificationService.requestPermission().then((granted) {
    if (granted) {
      NotificationService.scheduleHourlyWater();
      NotificationService.scheduleWorkoutReminder();
    }
  });

  runApp(const HealthSphereApp());
}

class HealthSphereApp extends StatelessWidget {
  const HealthSphereApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'HealthSphere',
      themeMode: ThemeMode.system,
      theme: ThemeData.light(useMaterial3: true).copyWith(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF059669)),
      ),
      darkTheme: ThemeData.dark(useMaterial3: true).copyWith(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF059669),
          brightness: Brightness.dark,
        ),
      ),
      home: const _BiometricGate(),
    );
  }
}

// ─── Biometric Gate ──────────────────────────────────────────────────────────
/// Shows a biometric prompt if the user has it enabled in Profile.
/// Falls back to showing [MainShell] directly if biometrics are unavailable
/// or not enrolled, keeping the UX smooth on simulators / older devices.
class _BiometricGate extends StatefulWidget {
  const _BiometricGate();

  @override
  State<_BiometricGate> createState() => _BiometricGateState();
}

class _BiometricGateState extends State<_BiometricGate> {
  final _auth      = LocalAuthentication();
  bool  _checking  = true;
  bool  _unlocked  = false;
  bool  _skipBio   = false;     // true if device has no enrolled biometrics

  @override
  void initState() {
    super.initState();
    _check();
  }

  Future<void> _check() async {
    try {
      final canCheck = await _auth.canCheckBiometrics;
      final enrolled = await _auth.getAvailableBiometrics();
      if (!canCheck || enrolled.isEmpty) {
        setState(() { _skipBio = true; _checking = false; _unlocked = true; });
        return;
      }
      // Attempt silent authentication — user may dismiss if they haven't
      // enabled it in Profile.
      final ok = await _auth.authenticate(
        localizedReason: 'Unlock HealthSphere',
        options: const AuthenticationOptions(
          biometricOnly: false,
          stickyAuth:    true,
        ),
      );
      setState(() { _unlocked = ok || !canCheck; _checking = false; });
    } catch (_) {
      // Any error → bypass gate (e.g. running on desktop/simulator)
      setState(() { _unlocked = true; _checking = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_checking) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    if (_unlocked) return const MainShell();
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.lock_outline, size: 64),
            const SizedBox(height: 16),
            const Text('Authentication required',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            FilledButton.icon(
              icon: const Icon(Icons.fingerprint),
              label: const Text('Authenticate'),
              onPressed: _check,
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Main Shell ───────────────────────────────────────────────────────────────

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _index = 0;

  final _screens = const [
    HomeScreen(),
    VitalsScreen(),
    WorkoutsScreen(),
    MealsScreen(),
    BreathworkScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard_outlined),    label: 'Home'),
          NavigationDestination(icon: Icon(Icons.favorite_outline),      label: 'Vitals'),
          NavigationDestination(icon: Icon(Icons.fitness_center_outlined), label: 'Workouts'),
          NavigationDestination(icon: Icon(Icons.restaurant_outlined),   label: 'Meals'),
          NavigationDestination(icon: Icon(Icons.self_improvement),      label: 'Wellness'),
          NavigationDestination(icon: Icon(Icons.person_outline),        label: 'Profile'),
        ],
      ),
    );
  }
}
