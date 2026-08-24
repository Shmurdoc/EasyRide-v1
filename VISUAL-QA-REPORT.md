# EasyRyde Visual QA Report

**Date:** 2026-07-19 17:00 SAST
**QA Lead:** opencode (automated)
**Devices:** 2x Android (Unisoc + Samsung Exynos)

---

## Executive Summary

| App | Device 1 (CTKS265) | Device 2 (R58R943) |
|-----|--------------------|--------------------|
| **Rider** | Login screen renders | CRASH — app not visible |
| **Driver** | Login screen renders | CRASH — app not visible |
| **Admin** | Login screen renders | CRASH — app not visible |

**Verdict: FAIL** — 2 critical blockers, 6 design deviations found.

---

## CRITICAL: Crash on Launch (Device 2)

All 3 apps crash immediately on **Device 2** (Samsung, `R58R943DYLK`). Screenshots show the Samsung One UI home screen — apps never become visible.

**Exception:**
```
FATAL EXCEPTION: mqt_native_modules
com.facebook.react.common.JavascriptException:
  TypeError: Cannot read property 'NativeModule' of undefined
  js engine: hermes
```

**Frequency:** 6+ crashes logged between 16:50–17:00, one per app launch attempt.

**Root cause hypothesis:** `expo-task-manager` native module not linked or incompatible with this device's Expo SDK version. The TurboModule registry fails to resolve `NativeModule`, crashing the JS engine before any component renders.

---

## CRITICAL: Background Crash on Device 1

All 3 apps on **Device 1** (Unisoc, `CTKS265A25040101103`) reach the login screen but throw a background fatal:

```
FATAL EXCEPTION: mqt_native_modules
com.facebook.react.common.JavascriptException:
  Error: Cannot find native module 'ExpoTaskManager'
  js engine: hermes
```

**Frequency:** 4 crashes logged. Apps survive to login screen because the crash fires on the `mqt_native_modules` thread (background), not the UI thread.

**Impact:** Login screen is visible and interactive, but any feature depending on Expo Task Manager (background location, ride tracking, etc.) will crash at runtime.

---

## Design Spec Comparison

**Reference:** `index.html` — PHBIMH super-app design system

### Color Theme

| Element | Spec | Rider App | Driver App | Admin App |
|---------|------|-----------|------------|-----------|
| Primary green | `#0A7C4E` | Pass (green button/bg) | Pass (green button/bg) | **FAIL** — uses dark red `#7A1518` |
| Brand accent | `#12A86B` | Partial (button gradient) | Partial | N/A |
| Background | `#F2F4F1` light gray | Pass | Pass | **FAIL** — deep maroon gradient |
| Sign In button | Green `#0A7C4E` | Pass | Pass | **FAIL** — blue `#3B6CF5` |

**Admin app does not follow the green theme at all.** It uses a standalone dark red/maroon design system. This may be intentional (separate admin identity), but it diverges from the unified brand spec.

### Typography

| Check | Result |
|-------|--------|
| Inter font family | Cannot verify from screenshots — appears sans-serif |
| Poppins headings | Cannot verify — "Welcome Back" / "EasyRyde" text appears to use a different weight |
| Font sizing hierarchy | Pass — headings are larger than body |

### Rounded Cards

| Check | Result |
|-------|--------|
| Border radius 18–28px on cards | Pass — input fields and buttons have large rounded corners |
| Card shadows | Pass — soft shadows visible on input containers |
| Button border-radius | Pass — Sign In button is pill-shaped (full round) |

### Bottom Navigation

| Check | Result |
|-------|--------|
| Bottom nav present | **Cannot verify** — all apps show login screen; nav appears after auth |
| Nav height ~72px | N/A |
| Center FAB button | N/A |

### Login Screen Specifics

| Element | Spec (forms section) | Actual |
|---------|---------------------|--------|
| Input border | `1.5px solid var(--line)` | Pass — light gray border |
| Input focus color | `--green` | Cannot test interactively |
| Rounded inputs | `border-radius: 14px` | Pass — inputs are rounded |
| Social login buttons | Spec shows Google/Apple | Pass — Rider & Driver have Google + Apple |
| Forgot Password link | Green text | Pass — green `#0A7C4E` |
| Divider text | "or continue with" | Pass |

### Admin App Deviations

| Element | Expected (green spec) | Actual (admin) |
|---------|----------------------|----------------|
| Background | `#F2F4F1` light | Dark red gradient `#7A1518` → `#3D0C0E` |
| Logo | Green "ER" square | White shield icon on dark card |
| Sign In button | Green `#0A7C4E` | Blue `#3B6CF5` |
| Card style | White on light bg | Translucent on dark bg |
| Footer | N/A | "EasyRyde Admin v4.0 — Phalaborwa, Limpopo" |

---

## Screenshots Captured

| File | Device | App | Status |
|------|--------|-----|--------|
| `rider_home.png` | D1 (Unisoc) | Rider | Login screen visible |
| `driver_home.png` | D1 (Unisoc) | Driver | Login screen visible |
| `admin_home.png` | D1 (Unisoc) | Admin | Login screen visible |
| `rider_home_d2.png` | D2 (Samsung) | Rider | Samsung home — app crashed |
| `driver_home_d2.png` | D2 (Samsung) | Driver | Samsung home — app crashed |
| `admin_home_d2.png` | D2 (Samsung) | Admin | Samsung home — app crashed |

---

## Bugs Found

### P0 — Blockers

1. **Apps crash on Device 2 (Samsung)** — All 3 apps fail to launch. `TypeError: Cannot read property 'NativeModule' of undefined`. Device unusable for testing. *(Crash log: `AndroidRuntime`)*

2. **ExpoTaskManager missing on Device 1** — Background crash in all 3 apps: `Cannot find native module 'ExpoTaskManager'`. App survives to login but background features (ride tracking, notifications) will fail. *(Crash log: `AndroidRuntime`)*

### P1 — High

3. **Admin app color scheme mismatch** — Uses dark red/maroon instead of brand green `#0A7C4E`. If unified branding is required, this is a significant deviation. If admin is intentionally distinct, this should be documented.

4. **Cannot test post-login UI** — All apps land on login screen. No test credentials provided, so bottom nav, home screen cards, ride flow, driver map, and admin dashboard cannot be visually verified.

### P2 — Medium

5. **Admin Sign In button is blue, not green** — Spec defines `.btn-p{background:var(--green)}`. Admin uses a blue button (`#3B6CF5`).

6. **Admin "Sign In" button has arrow icon** — Spec does not define an arrow on the primary CTA. Minor inconsistency.

---

## Recommendations

1. **Fix ExpoTaskManager linking** — Run `npx expo install expo-task-manager` and rebuild both APKs. Verify `app.json` includes `expo-task-manager` in plugins.

2. **Test on Samsung device** — The Samsung Exynos device may need a different build variant or architecture-specific native modules (arm64 vs armeabi-v7a).

3. **Provide test credentials** — QA cannot verify post-login screens (home, rides, admin dashboard) without login access.

4. **Align Admin branding** — Either adopt the green theme or document the red theme as an intentional admin-specific design decision.

5. **Re-run full visual QA** after crash fixes — Current screenshots only capture login screens. The spec defines home screens, bottom nav, ride cards, map views, restaurant lists, and more that remain unverified.

---

*Report generated: 2026-07-19T17:02+02:00*
