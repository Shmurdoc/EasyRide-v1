# EasyRyde Final Visual QA Report

**Date:** 2026-07-20  
**QA Engineer:** opencode QA Lead  
**Build:** Release APKs (dist/)  
**Status:** FAIL — BLOCKING CRITICAL

---

## Executive Summary

All 3 EasyRyde apps (Rider, Driver, Admin) **crash immediately on launch** on both test devices. No app UI renders. The build is **not deployable**.

---

## Test Environment

| Device | Model | Android | SDK |
|--------|-------|---------|-----|
| D1 | Hisense E71 (CTKS265A25040101103) | 14 | 34 |
| D2 | Samsung SM-A022F (R58R943DYLK) | 11 | 30 |

| APK | Package Name | Size |
|-----|-------------|------|
| Rider | za.co.easyryde.rider | 82 MB |
| Driver | za.co.easyryde.driver | 85 MB |
| Admin | za.co.easyryde.admin | 81 MB |

---

## Installation Results

| Step | Device 1 (Hisense) | Device 2 (Samsung) |
|------|-------------------|-------------------|
| Uninstall old | OK (not previously installed) | OK (not previously installed) |
| Install Rider | SUCCESS | SUCCESS |
| Install Driver | SUCCESS | SUCCESS |
| Install Admin | SUCCESS | SUCCESS |

**Installation: PASS** — All 6 APKs installed cleanly.

---

## Crash Test Results

| App | Device 1 | Device 2 | Verdict |
|-----|----------|----------|---------|
| Rider | CRASH | CRASH | FAIL |
| Driver | CRASH | CRASH | FAIL |
| Admin | CRASH | CRASH | FAIL |

**Crash Rate: 6/6 (100%)**

---

## Critical Bug: `Unexpected token '?'`

### Error (identical on all 6 test runs)

```
E AndroidRuntime: FATAL EXCEPTION: mqt_js
E AndroidRuntime: Process: za.co.easyryde.{app}, PID: {pid}
E AndroidRuntime: com.facebook.react.common.JavascriptException: Unexpected token '?', stack:
E AndroidRuntime: no stack
E AndroidRuntime:   at com.facebook.jni.NativeRunnable.run(Native Method)
```

### Root Cause

The React Native JavaScript bundle contains ES2020+ syntax (likely optional chaining `?.` or nullish coalescing `??`) that the **Hermes JS engine** bundled in these APKs cannot parse. This is a **build configuration issue**, not a runtime bug.

**Likely causes (check in order):**
1. **Hermes version too old** — the bundled Hermes doesn't support `?.` or `??` syntax
2. **JS bundle not compiled for Hermes** — Metro bundler targeting wrong JS engine
3. **Third-party library** ships unminified ES2020+ code that bypasses Babel/Metro transformation
4. **`react-native.config.js`** or `metro.config.js` has an incorrect transform/serializer config

### Fix

1. Check `node_modules/react-native/` for bundled Hermes version
2. Ensure `metro.config.js` has the correct `transformer.babelTransformerPath` for Hermes
3. Verify `babel.config.js` includes `@babel/preset-env` targeting the correct browserslist
4. Run `npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle` and inspect the output for `?.` or `??`
5. Consider upgrading Hermes: `npm install react-native@latest` or update `hermes-engine` in `android/gradle.properties`

---

## Visual Verification

**No UI was rendered on any device** — all screenshots show the device home screen/app drawer because every app crashed before the React Native bridge could initialize.

### Screenshots Captured

| File | Device | Shows |
|------|--------|-------|
| `rider_final_d1.png` | Hisense | App drawer (crash before UI) |
| `driver_final_d1.png` | Hisense | App drawer (crash before UI) |
| `admin_final_d1.png` | Hisense | App drawer (crash before UI) |
| `rider_final_d2.png` | Samsung | Home screen (crash before UI) |
| `driver_final_d2.png` | Samsung | Home screen (crash before UI) |
| `admin_final_d2.png` | Samsung | Home screen (crash before UI) |

### Design Spec Comparison

Cannot perform visual verification against design spec (`/home/madoc-hp/Documents/index.html`):

| Spec Element | Status |
|-------------|--------|
| Green #0A7C4E theme | UNABLE TO VERIFY — no UI rendered |
| Inter/Poppins fonts | UNABLE TO VERIFY — no UI rendered |
| Rounded cards | UNABLE TO VERIFY — no UI rendered |
| Bottom navigation | UNABLE TO VERIFY — no UI rendered |
| App icons (app drawer) | DEFAULT Android icons — no custom branding visible |

---

## Summary

| Category | Result |
|----------|--------|
| Installation | PASS |
| App Launch | FAIL (100% crash rate) |
| Visual Verification | BLOCKED by crash |
| Design Spec Compliance | BLOCKED by crash |
| **Overall** | **FAIL — NOT SHIPPABLE** |

---

## Recommended Actions

1. **IMMEDIATE:** Fix Hermes/JS bundle compatibility (see root cause above)
2. **HIGH:** Add custom app icons (currently showing default Android robot icons)
3. **HIGH:** Verify package names — APKs use `za.co.easyryde.*` not `com.easyryde.*`
4. **MEDIUM:** Re-run full visual QA after crash fix
5. **LOW:** Consider reducing APK size (81-85 MB is large for utility apps)
