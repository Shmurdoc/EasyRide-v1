# EasyRyde Monorepo Best Practices

## Overview

EasyRyde uses a monorepo structure with 3 React Native apps sharing a single repository:

```
mobile/
├── apps/
│   ├── rider/     (za.co.easyryde.rider)
│   ├── driver/    (za.co.easyryde.driver)
│   └── admin/     (za.co.easyryde.admin)
├── shared/        (shared code between apps)
├── scripts/       (build and deploy scripts)
└── package.json   (workspace root)
```

This guide documents best practices for developing, building, and testing in this monorepo.

---

## Critical: Metro Port Isolation

### The Problem

Each React Native app has its own Metro bundler. When multiple apps share a monorepo, Metro servers can conflict:

- Debug APKs connect to a running Metro server to fetch the JS bundle
- If the wrong Metro server is running, the app loads the wrong bundle
- This causes cross-contamination (e.g., driver app shows rider's UI)

**Reference:** [INCIDENT_METRO_CROSS_CONTAMINATION.md](../docs/INCIDENT_METRO_CROSS_CONTAMINATION.md)

### The Solution

Configure **unique Metro ports** for each app:

```javascript
// mobile/apps/rider/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.server = { port: 8081 };
module.exports = config;

// mobile/apps/driver/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.server = { port: 8082 };
module.exports = config;

// mobile/apps/admin/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.server = { port: 8083 };
module.exports = config;
```

### Port Assignment Table

| App   | Port |
|-------|------|
| Rider | 8081 |
| Driver | 8082 |
| Admin | 8083 |

---

## Development Workflow

### Starting a Dev Server

Always start the Metro server for the **specific app** you're working on:

```bash
# Rider app
cd mobile/apps/rider
npx expo start --port 8081

# Driver app
cd mobile/apps/driver
npx expo start --port 8082

# Admin app
cd mobile/apps/admin
npx expo start --port 8083
```

**Never** start a Metro server from the monorepo root — this can cause unpredictable bundle resolution.

### Kill Stale Metro Servers

Before starting a new dev server, kill any existing Metro processes:

```bash
# Windows
taskkill /F /IM node.exe /FI "WINDOWTITLE eq *metro*"

# Or find by port
netstat -ano | findstr :8081
taskkill /F /PID <PID>

# macOS/Linux
pkill -f "metro"
```

### Debug vs Release Builds

| Build Type | JS Bundle | Metro Dependency | Use Case |
|------------|-----------|------------------|----------|
| **Debug** | Fetched from Metro at runtime | Yes | Active development |
| **Release** | Bundled inside APK | No | QA testing, production |

**Recommendation:** Use **release builds** for QA testing to avoid Metro cross-contamination.

```bash
# Build release APK
cd mobile/apps/driver
npx expo run:android --variant release
```

---

## Shared Code

### Location

Shared code lives in `mobile/shared/` and is imported by apps as needed:

```javascript
// In an app
import { API_BASE_URL } from '@easyryde/shared/config';
import { Button } from '@easyryde/shared/components';
```

### Guidelines

1. **Keep shared code generic** — no app-specific logic in `shared/`
2. **Document shared modules** — add README for each shared package
3. **Version shared changes** — if shared code breaks one app, all apps are affected
4. **Test shared code independently** — don't rely on app-level testing alone

---

## Build Configuration

### app.config.js Per App

Each app has its own `app.config.js` with app-specific configuration:

```javascript
// mobile/apps/driver/app.config.js
module.exports = {
  name: 'EasyRyde Driver',
  slug: 'easyryde-driver',
  android: {
    package: 'za.co.easyryde.driver',
    // ...
  },
};
```

### Environment Variables

Each app has its own `.env` file:

```
mobile/apps/rider/.env
mobile/apps/driver/.env
mobile/apps/admin/.env
```

**Never** share `.env` files between apps — each app may need different API endpoints, keys, or configuration.

### Firebase Configuration

Each app has its own `google-services.json`:

```
mobile/apps/rider/android/app/google-services.json
mobile/apps/driver/android/app/google-services.json
mobile/apps/admin/android/app/google-services.json
```

**Critical:** The package name in `google-services.json` must match the `android.package` in `app.config.js`.

---

## Testing

### Unit Tests

Run tests from the app directory:

```bash
cd mobile/apps/rider
npx jest
```

### E2E Tests (Maestro)

```bash
cd mobile
maestro test .maestro/rider-flow.yaml
maestro test .maestro/driver-flow.yaml
```

### Manual Testing Checklist

For each app, verify:

- [ ] App launches with correct title/branding
- [ ] Login flow works
- [ ] Core features function
- [ ] Maps loads (if applicable)
- [ ] Push notifications work
- [ ] No cross-contamination (wrong app's UI)

---

## Common Pitfalls

### 1. Wrong Bundle Loaded

**Symptom:** App shows wrong UI
**Cause:** Debug APK connected to wrong Metro server
**Fix:** Kill other Metro servers, use release build, or configure unique ports

### 2. Shared Code Breaks One App

**Symptom:** One app crashes after shared code update
**Cause:** Shared change introduced app-specific logic or broke compatibility
**Fix:** Revert shared change, test across all apps before merging

### 3. Environment Variable Leaks

**Symptom:** App uses wrong API endpoint or key
**Cause:** `.env` file shared between apps or wrong `.env` loaded
**Fix:** Ensure each app has its own `.env`, never commit `.env` files

### 4. Firebase Config Mismatch

**Symptom:** Push notifications fail or crash on startup
**Cause:** `google-services.json` package name doesn't match `app.config.js`
**Fix:** Download fresh config from Firebase Console, verify package name matches

---

## Build Scripts

Use the provided build scripts for consistent builds:

```bash
# Build specific app
.\scripts\eas-build.ps1 -App rider -Profile preview
.\scripts\eas-build.ps1 -App driver -Profile production

# Build all apps
.\scripts\eas-build.ps1 -App all -Profile preview
```

---

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed troubleshooting guides, including:

- Metro cross-contamination
- Maps API key issues
- Build failures
- Environment variable problems

---

## References

- [Incident Report: Metro Cross-Contamination](../docs/INCIDENT_METRO_CROSS_CONTAMINATION.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [Production Checklist](../PRODUCTION-CHECKLIST.md)
- [React Native Metro Configuration](https://facebook.github.io/metro/docs/configuration)
