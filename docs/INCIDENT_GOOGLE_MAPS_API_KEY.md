# Incident: Google Maps API Key Crash

**Date:** 2026-06-28
**Severity:** Critical
**App:** Rider (za.co.easyryde.rider)
**Device:** Samsung Galaxy A02 (on-device build)

## Summary

The rider app crashed on startup due to a missing Google Maps API key in `AndroidManifest.xml`. The key was only configured as a comment placeholder (`<!-- Set via app.config.js + EXPO_PUBLIC_GOOGLE_MAPS_API_KEY at build time -->`) and never injected at build time.

## Root Cause

1. `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` was not set in the environment before building the APK
2. Expo's `app.config.js` plugin relies on this env var to inject the `<meta-data>` tag into `AndroidManifest.xml`
3. Without the key, the native Maps SDK throws a `RuntimeException` at initialization

## Cascading Failure Chain

```
Missing API key in AndroidManifest.xml
  → Native Maps module crashes (RuntimeException)
    → React Native bridge breaks
      → setState() calls from API responses never flush
        → LoginScreen stuck on "Signing In..." despite successful 200 from API
```

The bridge failure is the critical detail: the API call **succeeds** on the network side, but the native crash prevents React Native from processing the response. This makes debugging deceptive — logs show a successful login, but the UI never advances.

## Fix Applied

Added the API key directly to `apps/rider/android/app/src/main/AndroidManifest.xml`:

```xml
<meta-data
  android:name="com.google.android.geo.API_KEY"
  android:value="AIzaSyAAR1yu3tz38eStitYoUQt6TS4Rg2kGMM4"/>
```

## Prevention

1. **Add a pre-build validation step** (see `mobile/TROUBLESHOOTING.md`)
2. **Always set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`** in `.env` before running `eas build`
3. **Test on-device early** — the crash only manifests on real Android, not Expo Go

## Related Issues Found

- Admin app missing location permissions in manifest
- Maps initialization not wrapped in error boundary
- HomeScreen missing "Payment" tab vs HTML reference
- Hardcoded colors instead of theme tokens in LoginScreen and HomeScreen
