# HealthSphere Home Screen Widget — Integration Guide

All the source code for the widgets is already written.  This document explains
the one-time native project wiring required to activate them.

---

## Prerequisites

```
flutter pub get
```

---

## Android

### 1  Generate the android/ directory (if not already present)
```bash
flutter create --platforms android .
```

### 2  Copy widget files into the generated project
The following files are already in this repository:

| Source (repo)                                                                  | Destination (generated project)                                               |
|--------------------------------------------------------------------------------|-------------------------------------------------------------------------------|
| `android/app/src/main/kotlin/com/healthsphere/mobile/HealthSphereWidgetProvider.kt` | same path                                                                 |
| `android/app/src/main/res/xml/healthsphere_widget_info.xml`                    | same path                                                                     |
| `android/app/src/main/res/layout/healthsphere_widget.xml`                      | same path                                                                     |
| `android/app/src/main/res/drawable/widget_background.xml`                      | same path                                                                     |
| `android/app/src/main/res/drawable/widget_tile_background.xml`                 | same path                                                                     |

### 3  Register the widget in AndroidManifest.xml
Inside `<application>` in `android/app/src/main/AndroidManifest.xml` add:

```xml
<receiver
  android:name=".HealthSphereWidgetProvider"
  android:exported="true">
  <intent-filter>
    <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
  </intent-filter>
  <meta-data
    android:name="android.appwidget.provider"
    android:resource="@xml/healthsphere_widget_info" />
</receiver>
```

### 4  Add the string resource
In `android/app/src/main/res/values/strings.xml` (create if missing):

```xml
<resources>
  <string name="app_name">HealthSphere</string>
  <string name="healthsphere_widget_description">At-a-glance health stats</string>
</resources>
```

### 5  MainActivity — register home_widget background channel
In `android/app/src/main/kotlin/com/healthsphere/mobile/MainActivity.kt`:

```kotlin
import es.antonborri.home_widget.HomeWidgetBackgroundIntent
import es.antonborri.home_widget.HomeWidgetLaunchIntent

class MainActivity : FlutterActivity() {
  // home_widget handles the rest automatically
}
```

### 6  Build & run
```bash
flutter run --release
```
Long-press the home screen → Widgets → HealthSphere to add it.

---

## iOS

### 1  Generate the ios/ directory (if not already present)
```bash
flutter create --platforms ios .
```

### 2  Open in Xcode
```bash
open ios/Runner.xcworkspace
```

### 3  Add a Widget Extension target
1. **File → New → Target → Widget Extension**
2. Product Name: `HealthSphereWidget`
3. Uncheck "Include Configuration Intent"
4. Click Finish, activate the scheme when prompted

### 4  Replace generated Swift files
Replace the generated `HealthSphereWidget.swift` and add the bundle file with
the files already in this repository:

| Repo file                                                              | Xcode target             |
|------------------------------------------------------------------------|--------------------------|
| `ios/HealthSphereWidget/HealthSphereWidget.swift`                      | HealthSphereWidget target |
| `ios/HealthSphereWidget/HealthSphereWidgetBundle.swift`                | HealthSphereWidget target |
| `ios/HealthSphereWidget/Info.plist`                                    | HealthSphereWidget target |
| `ios/HealthSphereWidget/HealthSphereWidget.entitlements`               | HealthSphereWidget target |

### 5  Configure App Groups (enables data sharing)
In Xcode:
1. Select the **Runner** target → Signing & Capabilities → **+ Capability** → **App Groups**
   - Add: `group.com.healthsphere.mobile`
2. Select the **HealthSphereWidget** target → same steps
   - Add: `group.com.healthsphere.mobile`

### 6  Add the entitlements file to the extension target
Select `HealthSphereWidget.entitlements`, ensure it is only in the
**HealthSphereWidget** target (not Runner).

### 7  Set minimum deployment target
Set the HealthSphereWidget extension target's deployment target to **iOS 16.0+**.

### 8  Build & run
```bash
flutter run --release
```
Long-press the home screen → tap the **+** button → search "HealthSphere".

---

## How the data flow works

```
Flutter app (Dart)
  └─ WidgetService.update(heartRate: 72, calBurned: 350, …)
       └─ home_widget package
            ├─ Android: writes SharedPreferences("HomeWidgetPreferences")
            │            → broadcasts APPWIDGET_UPDATE
            │            → HealthSphereWidgetProvider.onUpdate()
            │            → RemoteViews rebuilt and pushed
            │
            └─ iOS:     writes UserDefaults(suiteName: "group.com.healthsphere.mobile")
                         → WidgetCenter.shared.reloadAllTimelines()
                         → HealthSphereProvider.getTimeline()
                         → SwiftUI view re-rendered
```

The widget is updated:
- Every time the user logs a vital, meal, or workout (Flutter calls `WidgetService.update`)
- On every app foreground (HomeScreen calls `_loadAndPushWidget`)
- On iOS every 15 minutes via the WidgetKit timeline refresh policy
