# EasyRyde Production Deployment Checklist

## Pre-Deployment

### 1. Secrets & Environment
- [ ] Generate new APP_KEY: `php artisan key:generate --show`
- [ ] Fill in `backend/.env.production` with ALL real values:
  - [ ] `APP_KEY` (generated above)
  - [ ] `DB_PASSWORD` (PostgreSQL password)
  - [ ] `REDIS_PASSWORD` (Redis password)
  - [ ] `STRIPE_SECRET_KEY` (sk_live_...)
  - [ ] `STRIPE_PUBLISHABLE_KEY` (pk_live_...)
  - [ ] `STRIPE_WEBHOOK_SECRET` (whsec_...)
  - [ ] `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`
  - [ ] `OZOW_SITE_CODE`, `OZOW_API_KEY`, `OZOW_PRIVATE_KEY`
  - [ ] `TWILIO_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
  - [ ] `MAIL_PASSWORD` (SendGrid API key)
  - [ ] `SENTRY_DSN` (from sentry.io)
- [ ] Verify `backend/storage/firebase-service-account.json` is real (not placeholder)
- [ ] Verify `mobile/apps/*/android/app/google-services.json` are real Firebase configs

### 2. Domain & SSL
- [ ] DNS A record: `api.easyryde.co.za` → server IP
- [ ] DNS A record: `socket.easyryde.co.za` → server IP
- [ ] SSL certificates will auto-provision via certbot on first run
- [ ] Verify `nginx/api.conf` uses `api.easyryde.co.za`

### 3. Firebase / FCM
- [ ] Create Firebase project `easyryde-625a7` (or use existing)
- [ ] Add Android apps:
  - `za.co.easyryde.rider` → download `google-services.json`
  - `za.co.easyryde.driver` → download `google-services.json`
  - `za.co.easyryde.admin` → download `google-services.json`
- [ ] Place files in `mobile/apps/{app}/android/app/google-services.json`
- [ ] Generate service account key → place at `backend/storage/firebase-service-account.json`
- [ ] Update `backend/.env.production` with real `FCM_PROJECT_ID`

### 4. EAS Build
- [ ] Run `cd mobile && npx eas login`
- [ ] Link projects: `cd apps/rider && npx eas init`
- [ ] Link projects: `cd apps/driver && npx eas init`
- [ ] Link projects: `cd apps/admin && npx eas init`
- [ ] **Verify `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is set** in env before building — missing key crashes Maps and breaks the RN bridge (see `docs/INCIDENT_GOOGLE_MAPS_API_KEY.md`)
- [ ] **Verify AndroidManifest.xml has the API key** after prebuild: `grep "API_KEY" mobile/apps/rider/android/app/src/main/AndroidManifest.xml`
- [ ] **Verify correct app bundle before deployment** — prevent Metro cross-contamination (see `docs/INCIDENT_METRO_CROSS_CONTAMINATION.md`):
  - [ ] Confirm release APK was built (not debug) for production/testing
  - [ ] Use `npx expo run:android --variant release` (NOT `gradlew assembleRelease` — skips JS bundling)
  - [ ] On launch, verify the correct app title and branding appears
  - [ ] Check Logcat for `Packager connection already open` — indicates Metro dependency
  - [ ] For QA testing, use release APKs that bundle JS locally
  - [ ] Follow build commands in `mobile/apps/driver/BUILD_NOTES.md` for producing correct APK variants
- [ ] Build preview APKs: `.\scripts\eas-build.ps1 -App rider -Profile preview`
- [ ] Build preview APKs: `.\scripts\eas-build.ps1 -App driver -Profile preview`
- [ ] Test APKs on emulator/device — confirm Maps loads without crash

### 5. Database
- [ ] Ensure PostGIS extension is available: `CREATE EXTENSION IF NOT EXISTS postgis;`
- [ ] Run migrations: `php artisan migrate --force`
- [ ] Seed initial data: `php artisan db:seed`
- [ ] Create admin user: `php artisan tinker` → `User::create([...])`

### 6. Docker
- [ ] Copy `backend/.env.production` to server
- [ ] Build images: `docker compose -f docker-compose.prod.yml build`
- [ ] Start services: `docker compose -f docker-compose.prod.yml --env-file backend/.env.production up -d`
- [ ] Verify all services healthy: `docker compose ps`

### 7. Monitoring
- [ ] Access Grafana: `http://your-server:3000` (admin/admin)
- [ ] Import dashboards for PostgreSQL, Redis, PHP-FPM
- [ ] Configure alert rules for:
  - [ ] CPU > 80%
  - [ ] Memory > 85%
  - [ ] Disk > 90%
  - [ ] Error rate > 1%
  - [ ] Response time > 2s

### 8. Blue-Green Deployment
- [ ] Initial deploy uses blue: `docker compose -f docker-compose.prod.blue.yml up -d`
- [ ] Switch to green for updates: `docker compose -f docker-compose.prod.green.yml up -d`
- [ ] Test rollback: `.\scripts\deploy\rollback.sh`

### 9. Testing
- [ ] Run backend tests: `php -n vendor/bin/phpunit`
- [ ] Run Maestro E2E: `maestro test mobile/.maestro/`
- [ ] Test payment flows (Stripe test mode first)
- [ ] Test push notifications
- [ ] Test real-time socket connections

### 10. App Store Submission
- [ ] Build production APK/AAB: `.\scripts\eas-build.ps1 -App rider -Profile production`
- [ ] Create Play Store listing for rider app
- [ ] Create Play Store listing for driver app
- [ ] Upload privacy policy URL
- [ ] Submit for review

## Post-Deployment

- [ ] Monitor Sentry for errors (first 24 hours)
- [ ] Check Grafana dashboards
- [ ] Verify SSL auto-renewal (certbot)
- [ ] Test database backup: `.\scripts\backup\backup.ps1`
- [ ] Verify queue workers processing jobs
- [ ] Check Horizon dashboard: `https://api.easyryde.co.za/horizon`

## Rollback Procedure

If something goes wrong:
1. Switch nginx to old color: `.\scripts\deploy\rollback.sh`
2. Or manually: `docker compose -f docker-compose.prod.yml down`
3. Restore database from backup if needed
4. Check Sentry for error details

## Security Notes

- Never commit `.env` files to git
- Rotate API keys if any are suspected compromised
- Enable 2FA on all admin accounts
- Monitor `AdminAuditLog` for suspicious activity
- Run `php artisan security:audit` periodically
