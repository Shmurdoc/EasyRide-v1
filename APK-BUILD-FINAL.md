# EasyRyde Final APK Build Report

**Date:** July 20, 2026
**Status:** ALL 3 APKs BUILT SUCCESSFULLY

## Build Results

| APK | Size | Status |
|-----|------|--------|
| `easyryde-rider-release.apk` | 85.0 MB | ✅ BUILD SUCCESS |
| `easyryde-driver-release.apk` | 88.5 MB | ✅ BUILD SUCCESS |
| `easyryde-admin-release.apk` | 84.8 MB | ✅ BUILD SUCCESS |

**Output location:** `/home/madoc-hp/Documents/EasyRyde/mobile/dist/`

## Build Environment

- **Node.js:** v20.20.2
- **npm:** 10.8.2
- **AGP:** 8.6.1
- **compileSdkVersion:** 35
- **Hermes:** DISABLED (JSC runtime)
- **React Native (root):** 0.74.0
- **React Native (shared package):** 0.86.0
- **Expo SDK:** 51
- **@react-native/babel-preset:** 0.86.0

## Issues Fixed During Build

### 1. Missing `ANDROID_HOME` environment variable
- **Error:** `SDK location not found. Define a valid SDK location with an ANDROID_HOME environment variable`
- **Fix:** Set `export ANDROID_HOME=/home/madoc-hp/Android/Sdk` and created missing `local.properties` for rider app

### 2. React Native version mismatch causing Babel parse failure
- **Error:** `SyntaxError: Missing semicolon. (397:1)` in `react-native/index.js`
- **Root cause:** `packages/shared` ships `react-native@0.86.0` with Flow `as` type cast syntax, but `@react-native/babel-preset@0.74.87` (nested inside `babel-preset-expo`) couldn't parse it
- **Fix:**
  - Installed `@react-native/babel-preset@0.86.0` at root level
  - Removed the nohoisted nested `babel-preset-expo/node_modules/@react-native/babel-preset/` (0.74.87) so the 0.86.0 version resolves correctly
  - Patched `packages/shared/node_modules/react-native/index.js` line 397: removed `as ReactNativePublicAPI` Flow type cast

### 3. Hermes compiler too old for private class fields
- **Error:** `private properties are not supported` from `hermesc`
- **Root cause:** `hermesc` (v0.12.0 from root RN 0.74.0) doesn't support JavaScript private class fields (`#x`, `#y`). The `@react-native/babel-preset@0.86.0` uses `babel-plugin-syntax-hermes-parser` which correctly parses them, but the output still contains private fields that the old Hermes compiler can't compile to bytecode.
- **Fix:** Disabled Hermes compilation (`hermesEnabled=false` in all 3 apps' `gradle.properties`). Apps now use JavaScriptCore (JSC) runtime. This was necessary because RN 0.86.0 npm package doesn't ship a prebuilt `hermesc` binary, and the monorepo workspace resolution picks up the old one from root RN 0.74.0.

### 4. `expo-file-system` build cache corruption (admin)
- **Error:** `Could not create empty folder .../expo-file-system/android/build/intermediates/incremental/release/packageReleaseResources/merged.dir`
- **Fix:** Ran `:expo-file-system:clean` task before retrying the admin build

## Files Modified

- `apps/rider/android/local.properties` — created (added `sdk.dir`)
- `apps/rider/android/gradle.properties` — `hermesEnabled=true` → `hermesEnabled=false`
- `apps/driver/android/gradle.properties` — `hermesEnabled=true` → `hermesEnabled=false`
- `apps/admin/android/gradle.properties` — `hermesEnabled=true` → `hermesEnabled=false`
- `packages/shared/node_modules/react-native/index.js` — removed `as ReactNativePublicAPI` type cast on line 397
- `node_modules/@react-native/babel-preset` — upgraded 0.74.87 → 0.86.0
- `node_modules/babel-preset-expo/node_modules/@react-native/babel-preset/` — removed (was 0.74.87, now resolves to root 0.86.0)

## Known Limitations

1. **Hermes disabled:** Apps use JSC instead of Hermes. Hermes provides ~2x faster startup and lower memory usage. To re-enable Hermes, align the root `react-native` version with `packages/shared` (both 0.86.0) and ensure a compatible `hermesc` binary is available.
2. **Version mismatch:** Root `react-native@0.74.0` vs `packages/shared/react-native@0.86.0` — this mismatch caused all build issues. Recommend aligning to a single version in the monorepo.
3. **node_modules patch:** The `as` type cast removal in `packages/shared/node_modules/react-native/index.js` will be overwritten on next `npm install`. The proper fix is to align babel preset versions.

## Build Timing

| App | Duration |
|-----|----------|
| Rider | 8m 31s |
| Driver | 11m 19s |
| Admin | 6m 05s |
