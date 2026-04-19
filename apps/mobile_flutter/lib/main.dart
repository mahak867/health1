import 'package:flutter/material.dart';

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
      theme: ThemeData.light(useMaterial3: true),
      darkTheme: ThemeData.dark(useMaterial3: true),
      home: const Scaffold(
        body: Center(
          child: Text('HealthSphere mobile scaffold'),
        ),
      ),
    );
  }
}
