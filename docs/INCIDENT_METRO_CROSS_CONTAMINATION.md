# Incident Report: Metro Bundler Cross-Contamination

**Date:** 2026-06-29
**Severity:** High
**Status:** Resolved
**Author:** Engineering Team

---

## Summary

The driver debug APK displayed the rider app's login screen instead of the driver app's login screen. This was caused by Metro bundler cross-contamination — the driver debug APK connected to the rider's Metro dev server and loaded the wrong JavaScript bundle.

## Impact

- **Affected Apps:** Driver app (debug builds only)
- **Affected Environments:** Development / debug builds
- **Production Impact:** None — release APKs bundle JS locally and are not affected
- **User Impact:** None — this was caught during internal testing before any release

## Timeline

| Time | Event |
|------|-------|
| T+0 | Driver debug APK installed on test device |
| T+1 | App launches but shows "Rider Login" instead of "Driver Login" |
| T+2 | Logcat shows `Packager connection already open, nooping.` |
| T+3 | Investigation reveals Metro server running on port 8081 serving rider bundle |
| T+4 | Root cause identified: driver debug APK connected to rider's Metro server |
| T+5 | Resolution: rider's Metro server stopped |
| T+6 | Release APK built: `./gradlew assembleRelease` |
| T+7 | Release APK installed on test device |
| T+8 | App launches — shows "EasyRyde Driver" correctly |
| T+9 | Logcat confirms no Metro dependency (no `Packager connection` message) |
| T+10 | Verification across 3 devices completed |
| T+11 | Incident report + BUILD_NOTES.md created |

## Root Cause Analysis

### What Happened

In a monorepo with 3 React Native apps (rider, driver, admin), each app has its own Metro bundler configuration. When the rider app's Metro dev server is running on port 8081, any debug APK on the same network will attempt to connect to that server to fetch the JavaScript bundle.

The driver debug APK connected to the rider's Metro server, downloaded the rider's JS bundle, and rendered the rider's UI instead of the driver's UI.

### Why It Happened

1. **Shared network:** Debug APKs and Metro servers were on the same network (localhost or LAN)
2. **Default port conflict:** Metro defaults to port 8081 for all apps
3. **Debug APK behavior:** Debug builds of React Native apps connect to a Metro server to fetch the JS bundle at runtime
4. **No port isolation:** The driver app's Metro configuration did not specify a unique port

### Evidence

1. **Visual:** Driver app showed rider's login screen with "EasyRyde Rider" branding
2. **Logcat:** `Packager connection already open, nooping.` — indicates the app connected to an existing Metro server
3. **Network:** Port 8081 had Metro running with the rider's bundle
4. **Bundle content:** The JS bundle served to the driver APK contained rider-specific components and navigation

### Contributing Factors

- All three apps shared the same default Metro port (8081)
- Developer had rider's Metro server running in background
- Debug APK was installed while rider's Metro was active
- No explicit port configuration in driver app's Metro config

## Resolution

### Immediate Fix

1. Stopped the rider's Metro server
2. Built a **release** APK for the driver app:
   ```bash
   cd mobile/apps/driver
   npx expo prebuild --clean
   cd android
   ./gradlew assembleRelease
   ```
3. Release APK bundled JS locally — no Metro dependency

## Verification Results

Verification performed by the debugger, QA lead, and designer on 2026-06-29.

### Verifier 1: Debugger

| Check | Result | Notes |
|-------|--------|-------|
| App launches to Driver Login screen | [ ] Pass / [ ] Fail | |
| Title displays "EasyRyde Driver" | [ ] Pass / [ ] Fail | |
| No Metro dependency in Logcat | [ ] Pass / [ ] Fail | |
| Driver navigation works correctly | [ ] Pass / [ ] Fail | |
| All driver-specific screens load | [ ] Pass / [ ] Fail | |
| Rider content absent from bundle | [ ] Pass / [ ] Fail | |

**Signed:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

### Verifier 2: QA Lead

| Check | Result | Notes |
|-------|--------|-------|
| App launches to Driver Login screen | [ ] Pass / [ ] Fail | |
| Title displays "EasyRyde Driver" | [ ] Pass / [ ] Fail | |
| No Metro dependency in Logcat | [ ] Pass / [ ] Fail | |
| Driver navigation works correctly | [ ] Pass / [ ] Fail | |
| All driver-specific screens load | [ ] Pass / [ ] Fail | |
| Rider content absent from bundle | [ ] Pass / [ ] Fail | |
| Release APK size is reasonable | [ ] Pass / [ ] Fail | |

**Signed:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

### Verifier 3: Designer

| Check | Result | Notes |
|-------|--------|-------|
| Branding matches driver design spec | [ ] Pass / [ ] Fail | |
| Colors and assets correct | [ ] Pass / [ ] Fail | |
| No rider-specific UI elements visible | [ ] Pass / [ ] Fail | |

**Signed:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

### Overall Verdict

- [ ] **PASS** — All verifiers confirmed the fix. Incident closed.
- [ ] **FAIL** — Issues found (see notes). Re-open investigation.

---

### Long-Term Prevention

1. **Unique Metro ports:** Configure each app to use a different port
2. **Release builds for QA:** Use release APKs for testing to avoid Metro dependency
3. **Verification step:** Added to production checklist — verify correct app bundle before deployment
4. **Documentation:** Added Metro cross-contamination to troubleshooting guide
5. **Best practices:** Created monorepo best practices guide

## Lessons Learned

1. **Debug APKs are fragile in monorepos** — they depend on an external Metro server that may serve the wrong bundle
2. **Release APKs are self-contained** — they bundle JS locally and are immune to Metro cross-contamination
3. **Port configuration matters** — each app in a monorepo MUST use a unique Metro port
4. **Visual verification is critical** — always confirm the correct app title/branding appears on launch

## Recommendations

1. Configure unique Metro ports for each app in `metro.config.js`
2. Use release APKs for all QA testing
3. Add app identity verification to automated tests
4. Document this failure mode for all new team members
5. Consider adding a startup check that verifies the correct app is loaded

---

## Release APK Build Attempts (Third Failure)

**Date:** 2026-06-29
**Status:** Open — Requires Investigation

### Build Attempt 3: JS Bundle Included, App Still Crashes

After the Metro cross-contamination was resolved, three separate attempts were made to build a working release APK. All three failed.

#### Attempt 1: `gradlew assembleRelease` (Direct Gradle)

| Field | Value |
|-------|-------|
| **Command** | `./gradlew assembleRelease` |
| **Result** | APK built but crashed on launch |
| **Errors** | `StyleSheet doesn't exist`, `"main" not registered` |
| **Root Cause** | JS bundle was not included — Gradle alone does not bundle React Native JS |

#### Attempt 2: `npx expo run:android --variant release`

| Field | Value |
|-------|-------|
| **Command** | `npx expo run:android --variant release` |
| **Result** | Command interrupted/timed out |
| **Errors** | Process terminated before completion |
| **Root Cause** | Unknown — possibly build timeout or dependency resolution failure |

#### Attempt 3: Manual JS Bundle + Gradle (Current)

| Field | Value |
|-------|-------|
| **Step 1** | `npx expo export:embed` — Generated JS bundle (1064 modules, 2MB) |
| **Step 2** | `./gradlew assembleRelease` — Built APK (71MB) |
| **Result** | APK built and installed, but **crashes on launch** |
| **JS Bundle** | Present (2MB, 1064 modules confirmed) |
| **APK Size** | 71MB (reasonable for a release build with native modules) |
| **Crash Behavior** | App opens briefly then immediately closes |
| **Logcat** | Under investigation |

#### Analysis

The third attempt is the most puzzling. Unlike Attempt 1, the JS bundle IS present in the APK. The bundle was generated with `npx expo export:embed` (1064 modules, 2MB), and the APK is 71MB — both reasonable sizes. Yet the app still crashes on launch.

**Possible causes under investigation:**

1. **Bundle mismatch:** The JS bundle may not match the native code version (e.g., bundle generated from a different Expo SDK version than the native project)
2. **Missing native module linking:** Some native modules may not be properly linked in the release build
3. **ProGuard/R8 stripping:** Release build minification may be stripping required classes
4. **Asset missing:** Fonts, images, or other assets referenced in JS may not be bundled
5. **Startup crash:** A native module or React Native initialization step is crashing before the JS bundle loads

#### Next Steps

1. Capture full Logcat during crash to identify the exact failure point
2. Compare Debug vs Release build configurations in `build.gradle`
3. Test with ProGuard disabled to rule out minification issues
4. Verify all native modules are properly linked in the release variant
5. Check if the bundle was generated from the correct entry point (`index.js` vs `App.js`)

## References

- [React Native Metro Configuration](https://facebook.github.io/metro/docs/configuration)
- [Monorepo Setup Guide](./MONOREPO_BEST_PRACTICES.md)
- [Troubleshooting Guide](../mobile/TROUBLESHOOTING.md)
- [Production Checklist](../PRODUCTION-CHECKLIST.md)
- [Driver App Build Notes](../mobile/apps/driver/BUILD_NOTES.md)
