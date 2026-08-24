# EasyRyde Release APK Fix Plan

## Root Cause Analysis

### Why Release APKs Crash on Launch

1. **`./gradlew assembleRelease` does NOT bundle JS** — The React Native Gradle Plugin uses a `createBundleReleaseJsAndAssets` task that is only invoked through `npx expo run:android --variant release`. Running Gradle directly skips the Expo CLI bundling step, producing an APK with no embedded JS bundle. The app crashes immediately because the native shell has nothing to render.

2. **Debug APKs depend on Metro server** — When running `expo run:android` or `expo start`, debug APKs connect to the Metro bundler on `localhost:8081`. If the Metro server is stopped, the debug APK shows a red error screen. This is by design but creates confusion during QA.

3. **Metro cache EPERM on Windows** — The Metro file cache at `%TEMP%\metro-cache` suffers from file locking when multiple builds run or when Windows Defender scans mid-write. This causes `createBundleReleaseJsAndAssets` to fail silently.

4. **expo-task-manager compilation failure (Driver)** — The driver app depends on `expo-task-manager` which has a build-time error (`TaskServiceProviderInterface` not found) when built against a stale `node_modules`. This prevents the native code from compiling.

5. **Gradle daemon contention** — Multiple Gradle daemons (up to 6 seen in logs) hold file locks, causing `Unable to delete directory` errors during Kotlin compilation.

6. **Google Maps API key is env-dependent** — All three apps read `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` from `.env` at build time. If the `.env` file is missing or the key is wrong, Maps crashes on launch.

### Build Log Evidence

| Log File | Error | Root Cause |
|----------|-------|------------|
| `admin_build.log` | `expo-modules-core:compileReleaseKotlin` — Unable to delete directory | Gradle daemon file locking |
| `driver_build.log` | `createBundleReleaseJsAndAssets` — EPERM lstat metro-cache | Windows file permissions / Metro cache corruption |
| `driver-build2.log` | `expo-task-manager:compileDebugJavaWithJavac` — TaskServiceProviderInterface not found | Stale node_modules / version mismatch |
| `driver_build_final.log` | Build succeeded (UP-TO-DATE tasks) | Cache was warm, but previous run failed |

---

## Fix Plan

### Phase 1: Fix Build Environment (Immediate)

#### 1.1 Kill all Gradle daemons before each build
```bash
./gradlew --stop
# or
gradlew.bat --stop
```

#### 1.2 Clear Metro cache before release builds
```bash
# Windows
rmdir /s /q "%TEMP%\metro-cache"
# Linux/Mac
rm -rf /tmp/metro-cache
```

#### 1.3 Set NODE_ENV for release builds
All builds warn: `The NODE_ENV environment variable is required but was not specified`
Fix: Set `NODE_ENV=production` before running release builds.

### Phase 2: Fix Driver App Build

#### 2.1 Fix expo-task-manager dependency
The driver `package.json` is missing `expo-task-manager` as a direct dependency but it's in the root `package.json`. It needs to be in the driver's own `package.json` OR the hoisted version must match.

Check: `expo-task-manager@12.0.6` is in the driver's expo module list, but the driver `package.json` doesn't list it. It's likely resolved from the root workspace. The compilation error suggests version mismatch.

**Fix**: Add `expo-task-manager` to driver's `package.json` dependencies.

#### 2.2 Fix the `debuggableVariants` configuration
Driver has `debuggableVariants = ['debug']` (line 55 of driver's `build.gradle`). This is correct but should be documented. Admin and Rider don't have this line, defaulting to `["debug"]` which is also correct.

### Phase 3: Fix Google Maps API Key

#### 3.1 Hardcode the key into `app.config.js` as fallback
Currently, if `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is undefined, the Android manifest gets `null` for the API key, causing Maps to crash.

**Fix**: Add a fallback in `app.config.js`:
```js
apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyDXcaUumZ7RJkaXpqUa2IYhSU3xxJSLvAw'
```

### Phase 4: Create Proper Build Script

Create `mobile/scripts/build-release.sh` that:
1. Kills all Gradle daemons
2. Clears Metro and Gradle caches
3. Sets `NODE_ENV=production`
4. Runs `npx expo prebuild --clean` for each app
5. Runs the correct build command: `npx expo run:android --variant release`
6. Verifies the APK contains the JS bundle
7. Copies APKs to a central output directory

### Phase 5: Verify APK Self-Containment

After building, verify each APK:
```bash
# Check APK contains index.android.bundle
unzip -l app-release.apk | grep index.android.bundle
# Should show: app/src/main/assets/index.android.bundle

# Check APK does NOT reference Metro
unzip -p app-release.apk | grep -c "localhost:8081"
# Should show: 0
```

---

## Correct Build Commands

### Per-App Release Build (RECOMMENDED)
```bash
cd mobile/apps/rider
npx expo prebuild --clean
npx expo run:android --variant release
# APK: android/app/build/outputs/apk/release/app-release.apk

cd mobile/apps/driver
npx expo prebuild --clean
npx expo run:android --variant release
# APK: android/app/build/outputs/apk/release/app-release.apk

cd mobile/apps/admin
npx expo prebuild --clean
npx expo run:android --variant release
# APK: android/app/build/outputs/apk/release/app-release.apk
```

### Build All Apps
```bash
cd mobile
./scripts/build-release.sh rider driver admin
```

---

## Signing Configuration

All three apps currently use the debug keystore for release signing (acceptable for development/QA):

| App | Release Signing | Keystore |
|-----|----------------|----------|
| Rider | `signingConfigs.debug` | `debug.keystore` (password: `android`) |
| Admin | `signingConfigs.debug` | `debug.keystore` (password: `android`) |
| Driver | `signingConfigs.release` | Reads from env vars, falls back to `debug.keystore` |

**For production**: Generate a proper keystore and set `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` environment variables.

---

## Test Plan

### Build Verification (per APK)
1. APK file exists at expected output path
2. APK size is > 10MB (confirms JS bundle is embedded)
3. `index.android.bundle` is inside `app/src/main/assets/`
4. No references to `localhost:8081` in the APK
5. `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is baked into the APK constants

### Launch Verification (on device/emulator)
1. App launches without crash
2. Splash screen appears
3. Main screen loads (no red error screen)
4. Maps component renders (if applicable)
5. Navigation works

### Regression Checks
1. Debug APK still works with Metro server running
2. Release APK works with Metro server stopped ( airplane mode test)
3. Each app's API URL points to the correct backend
4. Socket URL is correct for driver app
