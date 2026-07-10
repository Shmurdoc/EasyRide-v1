# EasyRyde Mobile Troubleshooting

## Common Issues

### App crashes on startup — Maps module

**Symptom:** App opens briefly then crashes. Logcat shows `RuntimeException: API key not found` or Maps-related error.

**Cause:** `com.google.android.geo.API_KEY` is missing or empty in `AndroidManifest.xml`.

**Fix:**
1. Set the env var before building:
   ```bash
   set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...your-key
   ```
2. Rebuild: `npx eas build --platform android --profile preview`
3. If using a preview/dev build, verify the manifest:
   ```bash
   adb shell cat /data/data/za.co.easyryde.rider/files/AndroidManifest.xml | grep API_KEY
   ```

### App stuck on "Signing In..." after successful login

**Symptom:** API logs show 200 OK response, but the UI never advances. No error on screen.

**Cause:** Native crash broke the React Native bridge. setState calls never flush.

**Debug:**
```bash
adb logcat -s "ReactNativeJS" "AndroidRuntime" "Maps"
```
Look for `RuntimeException` or `FATAL EXCEPTION` before the login attempt.

**Fix:** Resolve the native crash first (usually Maps API key or permissions). Restart the app.

### Admin app — location permission denied

**Symptom:** Admin app can't access driver locations or map features.

**Cause:** Missing `<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>` in admin's `AndroidManifest.xml`.

**Fix:** Add the permission tag to `apps/admin/android/app/src/main/AndroidManifest.xml`.

### Build fails with "google-services.json not found"

**Cause:** Firebase config file missing or not in the right path.

**Fix:**
1. Download from Firebase Console → Project Settings → Android app
2. Place at `mobile/apps/{rider|driver|admin}/android/app/google-services.json`
3. Verify the package name matches `build.gradle` (e.g., `za.co.easyryde.rider`)

### Expo environment variables not picked up

**Symptom:** `EXPO_PUBLIC_*` vars are `undefined` at runtime.

**Fix:**
1. Variables must be in a `.env` file in the **app root** (e.g., `mobile/apps/rider/.env`)
2. Restart the dev server after changing `.env` — Expo doesn't hot-reload env vars
3. For EAS builds, set them via `eas.json` env or `eas secret`

## Verifying AndroidManifest.xml

Before building, check that critical meta-data exists:

```bash
# After prebuild (or in the built APK)
find mobile/apps/rider/android -name "AndroidManifest.xml" -exec grep -l "API_KEY" {} \;
```

If the grep returns nothing, the key was never injected. Check:
1. `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is set in your environment
2. `app.config.js` has the Maps plugin configured
3. You ran `npx expo prebuild --clean` before building

## ADB Debugging Commands

### View crash logs
```bash
adb logcat -s "AndroidRuntime:E" "ReactNativeJS:E"
```

### Filter for Maps issues
```bash
adb logcat -s "Maps" "OpenGLRenderer" "AndroidRuntime"
```

### Check installed app version
```bash
adb shell dumpsys package za.co.easyryde.rider | grep -E "versionCode|versionName"
```

### Clear app data and restart
```bash
adb shell pm clear za.co.easyryde.rider
```

### Install a debug APK
```bash
adb install -r path/to/app.apk
```

### View app's SharedPreferences (check if onboarding completed)
```bash
adb shell run-as za.co.easyryde.rider cat /data/data/za.co.easyryde.rider/shared_prefs/*.xml
```

### Kill and restart the app
```bash
adb shell am force-stop za.co.easyryde.rider
adb shell am start -n za.co.easyryde.rider/.MainActivity
```

## Metro Bundler Cross-Contamination

### Symptom

Debug APK shows the **wrong app's UI**. For example, the driver app displays the rider's login screen.

### Cause

In a monorepo with multiple React Native apps, a debug APK connects to a running Metro dev server to fetch the JS bundle. If a different app's Metro server is running on the default port (8081), the debug APK will load the wrong bundle.

### How to Verify

1. **Check which Metro server is running:**
   ```bash
   # Windows
   netstat -ano | findstr :8081

   # macOS/Linux
   lsof -i :8081
   ```

2. **Check Metro's bundle source:**
   ```bash
   # Open the Metro terminal — it will show which app it's serving
   # Look for the project root path (e.g., "mobile/apps/rider" vs "mobile/apps/driver")
   ```

3. **Check Logcat for cross-contamination:**
   ```bash
   adb logcat -s "ReactNativeJS" | grep -i "packager"
   # Look for: "Packager connection already open, nooping."
   ```

4. **Visual verification:**
   - Check the app title/branding on the login screen
   - Verify the app icon matches the expected app
   - Check the package name in Logcat output

### Fix: Build Release APK

Release APKs bundle the JavaScript locally and do not depend on Metro:

```bash
cd mobile/apps/driver
npx expo run:android --variant release
```

The release APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

### Fix: Use Unique Metro Ports

Configure each app to use a different port in its `metro.config.js`:

```javascript
// mobile/apps/driver/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Use a unique port for the driver app
config.server = {
  port: 8082,  // Rider: 8081, Driver: 8082, Admin: 8083
};

module.exports = config;
```

Then start Metro with the correct port:
```bash
# Driver app
cd mobile/apps/driver
npx expo start --port 8082

# Or use the app-specific script
npm run dev  # if configured in package.json
```

### Prevention

1. **Always use release APKs for QA testing** — they are self-contained
2. **Configure unique ports** for each app in the monorepo
3. **Kill other Metro servers** before starting a new one
4. **Verify app identity** on every test run (check title, branding, package name)

## Release APK Shows Blank Screen or Crashes Immediately

### Symptom

Release APK installs successfully but shows a blank/white screen or crashes immediately on launch. No JavaScript errors in Logcat — the app simply doesn't render.

### Cause

Using `./gradlew assembleRelease` directly skips the JS bundling step. The APK is built but contains no JavaScript bundle, so React Native has nothing to render.

### How to Verify

1. **Check if the JS bundle exists:**
   ```bash
   # Decompile the APK and check for assets
   unzip -l android/app/build/outputs/apk/release/app-release.apk | grep "index.android.bundle"
   # If missing, the bundle was never created
   ```

2. **Check Logcat for bundle errors:**
   ```bash
   adb logcat -s "ReactNativeJS" | grep -i "bundle"
   # Look for: "Unable to load script" or "bundle not found"
   ```

### Fix: Use the Correct Build Command

```bash
cd mobile/apps/driver
npx expo run:android --variant release
```

**Why this works:** `expo run:android --variant release` orchestrates the full build pipeline:
1. Runs `expo prebuild` to generate the `android/` folder from `app.config.js`
2. Bundles the JavaScript code into `index.android.bundle`
3. Compiles the release APK with the bundle included

**Why `gradlew assembleRelease` fails:** The Gradle command only compiles the Android native code. In a bare React Native project, the JS bundling is normally handled by Metro during development or by `expo run:android` during release builds. Running `gradlew` directly skips this step entirely.

## Rebuilding After Manifest Changes

Always run a clean prebuild to ensure manifest changes take effect, then build the release APK:

```bash
cd mobile/apps/rider
npx expo run:android --variant release
```

This command handles both the prebuild (regenerating the `android/` folder from `app.config.js`) and the JS bundling, which is necessary when adding or removing `<meta-data>` or `<uses-permission>` tags.

## Release APK Crashes on Launch (JS Bundle Present)

### Symptom

Release APK installs successfully, JS bundle is confirmed present (e.g., 2MB, 1000+ modules), APK size is reasonable (e.g., 71MB), but the app **crashes immediately on launch**. The app opens briefly then closes. No obvious error message on screen.

### Common Build Attempts That Hit This Issue

| Attempt | Command | Result |
|---------|---------|--------|
| 1 | `./gradlew assembleRelease` | Crashes — `StyleSheet doesn't exist`, `"main" not registered` |
| 2 | `npx expo run:android --variant release` | Command timed out / interrupted |
| 3 | `npx expo export:embed` + `./gradlew assembleRelease` | APK has bundle but still crashes on launch |

### How to Verify

1. **Confirm JS bundle exists in APK:**
   ```bash
   unzip -l android/app/build/outputs/apk/release/app-release.apk | grep "index.android.bundle"
   # Should show a file > 1MB
   ```

2. **Check bundle module count:**
   ```bash
   # If you have the bundle file extracted:
   cat index.android.bundle | grep "__d(function" | wc -l
   # Should show 1000+ modules for a typical app
   ```

3. **Capture the crash in Logcat:**
   ```bash
   adb logcat -s "AndroidRuntime:E" "ReactNativeJS:E" "ReactNativeJS:W"
   # Look for the first FATAL EXCEPTION — that's the root cause
   ```

4. **Check for specific crash patterns:**
   ```bash
   adb logcat | grep -A 20 "FATAL EXCEPTION"
   # Common patterns:
   # - "StyleSheet doesn't exist" → Bundle is wrong or corrupted
   # - "main" not registered → Entry point mismatch
   # - "Unable to load script" → Bundle missing or wrong path
   # - "SoLoader" → Native library loading failure
   ```

### Causes and Fixes

#### Cause 1: Bundle/Native Version Mismatch

**Symptoms:** `StyleSheet doesn't exist`, `"main" not registered`, random module errors

**Explanation:** The JS bundle was generated from a different Expo SDK version or project state than the native code. This happens when:
- You run `npx expo export:embed` after changing JS but before running `npx expo prebuild`
- The `android/` folder was generated with one Expo version, but the bundle was exported with another
- You modified `app.config.js` without re-running prebuild

**Fix:**
```bash
cd mobile/apps/driver
npx expo prebuild --clean    # Regenerate android/ folder
npx expo run:android --variant release  # Bundle JS + build APK together
```

**Why this works:** `expo run:android --variant release` runs prebuild, bundles JS, and compiles the APK in one atomic step. This guarantees the JS bundle and native code are from the same project state.

#### Cause 2: ProGuard/R8 Stripping Required Classes

**Symptoms:** Crash with `ClassNotFoundException` or `NoSuchMethodError` in Logcat

**Explanation:** Release builds enable ProGuard/R8 minification, which strips unused classes. Some React Native libraries or native modules need keep rules.

**Fix:** Add ProGuard keep rules to `android/app/proguard-rules.pro`:
```proguard
# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Your app's native modules
-keep class za.co.easyryde.** { *; }
```

Or disable minification temporarily to test:
```gradle
// android/app/build.gradle
android {
    buildTypes {
        release {
            minifyEnabled false  // Temporarily disable
        }
    }
}
```

#### Cause 3: Missing Native Module Linking

**Symptoms:** Crash on startup with `UnsatisfiedLinkError` or native library not found

**Explanation:** A native module (e.g., Maps, camera, location) is referenced in JS but not properly linked in the release build.

**Fix:**
```bash
cd mobile/apps/driver
npx expo prebuild --clean
cd android
./gradlew clean
npx expo run:android --variant release
```

#### Cause 4: Incorrect Entry Point

**Symptoms:** `"main" not registered` or bundle loads but nothing renders

**Explanation:** The bundle was generated with a different entry point than the native app expects.

**Fix:** Verify `index.js` exists and registers the app:
```bash
# Check entry point
cat mobile/apps/driver/index.js
# Should contain: import 'expo-router/entry'; or AppRegistry.registerComponent(...)
```

Then rebuild with the correct entry point:
```bash
npx expo export:embed --entry-file index.js --platform android
```

### Recommended Build Command

**Always use this command for release builds:**

```bash
cd mobile/apps/driver
npx expo prebuild --clean
npx expo run:android --variant release
```

**Why:** This is the only command that guarantees:
1. Native code is generated from current `app.config.js`
2. JS bundle is generated from the same project state
3. Bundle is included in the APK
4. Native modules are properly linked

**Avoid these shortcuts:**
- `./gradlew assembleRelease` alone — skips JS bundling
- `npx expo export:embed` + `./gradlew assembleRelease` — two-step process risks version mismatch
- `npx eas build` — requires EAS account and cloud build (use for production, not local testing)

### Debug Build vs Release Build Comparison

| Aspect | Debug Build | Release Build |
|--------|-------------|---------------|
| JS Source | Fetched from Metro server | Bundled in APK |
| Metro Dependency | Yes (must be running) | No |
| Minification | Disabled | Enabled (ProGuard/R8) |
| Debugging | Chrome DevTools enabled | Disabled |
| APK Size | Smaller (no bundle) | Larger (includes bundle) |
| Startup Speed | Slower (fetches bundle) | Faster (local bundle) |
| Crash Risk | Metro cross-contamination | Bundle/native mismatch |
