# Driver App — Build Notes

## Prerequisites

- Node.js, npm, Expo CLI installed
- Android SDK at `C:\Android\sdk` (or set `ANDROID_HOME`)
- Java 17 (set `JAVA_HOME`)
- Run `npx expo install --check` to verify dependencies

## Build Commands

### 1. Clean Build Environment

Run this before ANY build to ensure a fresh state:

```bash
npx expo prebuild --clean
```

### 2. Debug APK

Installs faster, but depends on a Metro bundler running on port 8081.
**Do NOT use for QA/production testing** — vulnerable to Metro cross-contamination.

```bash
cd android
./gradlew assembleDebug
```

APK output:
`android/app/build/outputs/apk/debug/app-debug.apk`

### 3. Release APK

Self-contained — JS is bundled inside the APK. **Use for all QA testing and production.**

**IMPORTANT:** Do NOT use `./gradlew assembleRelease` directly — it skips the JS bundling step, producing a broken APK that crashes on launch.

**Correct command:**
```bash
npx expo run:android --variant release
```

This command:
1. Runs `expo prebuild` to regenerate the `android/` folder
2. Bundles the JavaScript code into the APK
3. Compiles the release build

APK output:
`android/app/build/outputs/apk/release/app-release.apk`

## Install on Device

### Via ADB (USB)

```bash
# Debug APK
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Release APK
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

The `-r` flag re-installs over an existing version.

### Via File Transfer

1. Copy the APK from the output path above
2. Transfer to device (email, Google Drive, USB)
3. Open the APK on the device and allow install from unknown sources

## Verification After Install

```bash
# Check for Metro dependency (should NOT appear for release APKs)
adb logcat | findstr "Packager connection"
# Expected output: (no results)

# Verify correct app identity
adb shell dumpsys package za.co.easyryde.driver | findstr "versionName"
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Could not find tools.jar` | Set `JAVA_HOME` to JDK 17 path |
| `SDK location not found` | Create `android/local.properties` with `sdk.dir=C\:\\Android\\sdk` |
| Metro port conflict | Use unique port per app in `metro.config.js` |
| App shows wrong branding | You built/installed a debug APK connected to the wrong Metro server. Build a **release** APK instead. |
