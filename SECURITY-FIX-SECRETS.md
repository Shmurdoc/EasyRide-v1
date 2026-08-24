# EasyRyde Security Fix: Secrets Removal

**Date:** 2026-07-19
**Severity:** CRITICAL
**Status:** FIXED

---

## Vulnerability Summary

Real secrets (APP_KEY, JWT_SECRET, Google Maps API keys) were present in `.env` files
that could be committed to the repository. Anyone with repo access could:

1. **Decrypt all PII** — The `APP_KEY` encrypts Laravel's `Crypt` facade, which protects
   PII columns in the database (e.g., encrypted phone numbers, addresses, payment info).
2. **Forge authentication tokens** — The `JWT_SECRET` signs JWTs for the Socket.IO server,
   allowing impersonation of any driver or rider.
3. **Access Google Maps APIs** — Real Google Maps API keys were in mobile `.env` files.

## Files Remediated

| File | Secret Type | Action |
|------|------------|--------|
| `backend/.env` | `APP_KEY` (base64) | Removed — was: `base64:O7znfBpiV2WOhHpq88DR6joRpi6mHldHV4ZFq8wfp4k=` |
| `backend/.env.docker` | `APP_KEY` (base64) | Removed — same key as above |
| `backend/.env.testing` | `APP_KEY` (base64) | Removed — was: `base64:uxk0gPIJgCcAn07m/QdxMGuEWC+k2YFA55oWksI/fSc=` |
| `socket-server/.env` | `JWT_SECRET` | Removed — was: `2jljKVH/vjVGuOgz9i8WEV4IuHoZmSilfhxWnJ3vS5aG2uX7onEWFyojYCOaVvjg` |
| `socket/.env` | `JWT_SECRET` | Removed — was: `e4f80cb5e473f6572081ec9716a2abf57c7161c9ad77953b6786bf3b4a9898eeae63a94f4ef57cca6c738e2a1628991e18f26f3f0a4fe8cbfbdec95cbebbcb72` |
| `mobile/apps/driver/.env` | Google Maps API key | Removed — was: `AIzaSyDXcaUumZ7RJkaXpqUa2IYhSU3xxJSLvAw` |
| `mobile/apps/rider/.env` | Google Maps API key | Removed — same key |
| `mobile/apps/admin/.env` | Google Maps API key | Removed — same key |

## .gitignore Updates

Added protection against committing any `.env` variant files:

```
**/.env
**/.env.*
!**/.env.example
!**/.env.secure.example
!**/.env.*.example
```

This ensures `.env.production`, `.env.docker`, `.env.testing` etc. are all ignored,
while example files remain tracked.

## New Files Created

- **`backend/.env.secure.example`** — Reference template with `CHANGE_ME` placeholders
  and generation instructions for every secret.
- **`.githooks/pre-commit`** — Git hook that blocks commits containing real secrets.
- **`.github/workflows/secret-scanner.yml`** — CI workflow that scans PRs and pushes
  for hardcoded secrets.

## Secret Rotation Procedure

**IMMEDIATE ACTIONS (do these NOW):**

### 1. Rotate APP_KEY

```bash
cd backend
# Generate new key
php artisan key:generate --show
# Update .env with new value
# Update .env.docker with new value
# Clear cached config
php artisan config:clear
```

**IMPORTANT:** After rotating APP_KEY, any data encrypted with the old key will be
unreadable. If you have encrypted PII columns, you need to:
1. Decrypt with old key: `Crypt::decryptString($encrypted, $oldKey)`
2. Re-encrypt with new key: `Crypt::encryptString($decrypted, $newKey)`

### 2. Rotate JWT_SECRET (Socket.IO)

```bash
# Generate new secret
openssl rand -hex 32
# Update socket-server/.env
# Update socket/.env
# Restart the socket server
```

All existing JWTs will be invalidated. Connected clients will need to reconnect.

### 3. Rotate Google Maps API Key

1. Go to https://console.cloud.google.com/apis/credentials
2. Delete the compromised key: `AIzaSyDXcaUumZ7RJkaXpqUa2IYhSU3xxJSLvAw`
3. Create a new API key with proper restrictions:
   - Application restriction: HTTP referrers (for web) / IP addresses (for server)
   - API restriction: Enable only Maps SDK for Android/iOS
4. Update mobile `.env` files with new key
5. Update Expo config files if referenced there

### 4. Check for Unauthorized Usage

- Review Google Cloud audit logs for Maps API usage
- Review Sentry logs for unusual authentication patterns
- Check database for any unauthorized data access (if audit logging is enabled)

### 5. If This Was a Public Repository

If this repo was ever public or shared externally:

1. **Rotate ALL secrets immediately** (APP_KEY, JWT_SECRET, API keys)
2. **Assume PII was compromised** — notify affected users per POPIA requirements
3. **Review database** for unauthorized data exports
4. **Enable GitHub secret scanning** (Settings → Security → Secret scanning)
5. **Consider using git-filter-repo** to remove secrets from history:
   ```bash
   # Warning: this rewrites history and requires force push
   pip install git-filter-repo
   git filter-repo --replace-text <(echo 'base64:O7znfBpiV2WOhHpq88DR6joRpi6mHldHV4ZFq8wfp4k==>REDACTED_APP_KEY')
   ```

## Prevention Measures

1. **Pre-commit hook** — Installed at `.githooks/pre-commit`, blocks commits with secrets
2. **CI secret scanner** — `.github/workflows/secret-scanner.yml` scans every PR
3. **.gitignore** — All `.env` variants are now ignored except `.example` files
4. **`.env.secure.example`** — Reference template for new developers

## Git History Note

The repository at `/home/madoc-hp/Documents/EasyRyde` does not have a git repository
initialized (git is not installed in this environment). If this repo is later pushed
to a remote, ensure secrets are not included in the initial commit.

If the repo already exists remotely with secrets in history, follow the git-filter-repo
procedure in step 5 above.
