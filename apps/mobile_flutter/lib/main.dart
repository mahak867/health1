import 'package:flutter/material.dart';
import 'screens/home_screen.dart';
import 'screens/vitals_screen.dart';
import 'screens/workouts_screen.dart';
import 'screens/meals_screen.dart';
import 'screens/profile_screen.dart';

void main() {
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
      home: const MainShell(),
    );
  }
}

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
          NavigationDestination(icon: Icon(Icons.dashboard_outlined), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.favorite_outline), label: 'Vitals'),
          NavigationDestination(icon: Icon(Icons.fitness_center_outlined), label: 'Workouts'),
          NavigationDestination(icon: Icon(Icons.restaurant_outlined), label: 'Meals'),
          NavigationDestination(icon: Icon(Icons.person_outline), label: 'Profile'),
        ],
      ),
    );
  }
}
