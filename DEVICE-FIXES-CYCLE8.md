# Device Fixes — Cycle 8

**Date:** 2026-07-19
**QA Devices:**
- Device 1: Hisense E71 (Unisoc) — Apps launch but crash with ExpoTaskManager
- Device 2: Samsung SM-A022F (arm32/armv7) — All 3 apps crash on launch

---

## Root Causes Found

### Issue 1: expo-task-manager missing (Device 1 crash)

**Symptom:** `ExpoTaskManager` missing module crash on Device 1 across all 3 apps.

**Root cause:** `expo-task-manager` was NOT listed in any app's `package.json`. The driver app directly imports and uses it (`DashboardScreen.tsx:6`) with a top-level `defineTask()` call at module load time. When the module isn't installed, the import crashes immediately.

Additionally, even though rider and admin don't import TaskManager in source code, the jest transform config references it, and having it as a peer/transitive dependency ensures native module linking works correctly.

### Issue 2: arm64-only builds (Device 2 crash)

**Symptom:** `TypeError: Cannot read property 'NativeModule' of undefined` on all 3 apps.

**Root cause:** `gradle.properties` in driver and admin had:
```
reactNativeArchitectures=arm64-v8a
```
This builds APKs with ONLY arm64 native libraries. Device 2 (Samsung SM-A022F) is armeabi-v7a (arm32). When the APK lacks arm32 .so files, the JNI bridge fails to load, making `NativeModules` undefined.

Rider already had all architectures: `armeabi-v7a,arm64-v8a,x86,x86_64`

**Note:** `adb` is not available on this machine, so Device 2's CPU ABI could not be confirmed directly. The fix assumes it's arm32 based on the crash pattern.

---

## Fixes Applied

### Fix 1: Install expo-task-manager in all 3 apps

| App | package.json | app.json plugins |
|-----|-------------|------------------|
| driver | Added `"expo-task-manager": "~11.8.2"` | Added `"expo-task-manager"` to plugins |
| rider | Added `"expo-task-manager": "~11.8.2"` | Added `"expo-task-manager"` to plugins |
| admin | Added `"expo-task-manager": "~11.8.2"` | Added `"expo-task-manager"` to plugins |

Installed via `npm install --legacy-peer-deps` (peer dep conflicts with react@18.2.0 vs react-dom@18.3.1).

### Fix 2: Driver DashboardScreen defensive import

Changed `apps/driver/screens/DashboardScreen.tsx`:

- Replaced `import * as TaskManager from 'expo-task-manager'` with a try-catch `require()` fallback
- Wrapped `TaskManager.defineTask()` in `if (TaskManager)` guard
- Added null guards in `startBackgroundLocation()` and `stopBackgroundLocation()`

This ensures the driver app doesn't crash if TaskManager native module is unavailable (e.g., on arm32 where native binary might be missing).

### Fix 3: Architecture support for arm32

| App | File | Before | After |
|-----|------|--------|-------|
| driver | `android/gradle.properties:35` | `arm64-v8a` | `armeabi-v7a,arm64-v8a,x86,x86_64` |
| admin | `android/gradle.properties:63` | `arm64-v8a` | `armeabi-v7a,arm64-v8a,x86,x86_64` |
| rider | `android/gradle.properties:34` | Already had all archs | No change needed |

---

## Files Changed

1. `mobile/apps/driver/package.json` — added expo-task-manager dep
2. `mobile/apps/driver/app.json` — added expo-task-manager plugin
3. `mobile/apps/driver/screens/DashboardScreen.tsx` — defensive import + null guards
4. `mobile/apps/driver/android/gradle.properties` — arm32 architecture support
5. `mobile/apps/rider/package.json` — added expo-task-manager dep
6. `mobile/apps/rider/app.json` — added expo-task-manager plugin
7. `mobile/apps/admin/package.json` — added expo-task-manager dep
8. `mobile/apps/admin/app.json` — added expo-task-manager plugin
9. `mobile/apps/admin/android/gradle.properties` — arm32 architecture support

---

## Build Required

After these changes, all 3 apps must be rebuilt for the fixes to take effect:

```bash
# Driver
cd mobile/apps/driver/android && ./gradlew assembleRelease

# Rider
cd mobile/apps/rider/android && ./gradlew assembleRelease

# Admin
cd mobile/apps/admin/android && ./gradlew assembleRelease
```

Or rebuild via EAS:
```bash
cd mobile/apps/driver && eas build --platform android --profile preview
cd mobile/apps/rider && eas build --platform android --profile preview
cd mobile/apps/admin && eas build --platform android --profile preview
```

---

## Remaining Notes

- TypeScript errors in rider and driver are pre-existing (test file type issues, ChatScreen animationDelay)
- `adb` was not available to verify Device 2's CPU ABI — fix is based on crash pattern analysis
- The `NativeModules` undefined error on Device 2 should resolve once arm32 binaries are included in the APK
