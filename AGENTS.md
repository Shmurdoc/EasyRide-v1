# EasyRyde — Agent Configuration

## Backend (Laravel)

- **PHP CLI**: Use `php` (not `php -n` — the `-n` flag skips ini files that load pdo_pgsql)
  - `php vendor/bin/phpunit` — run tests (Docker)
  - `php artisan <command>` — run artisan commands (Docker)
- **Test DB**: PostgreSQL at `database:5432` (docker-compose)
- **Test commands** (inside Docker):
  - `docker compose exec backend php vendor/bin/phpunit --configuration phpunit.xml` — full suite
  - `docker compose exec backend php vendor/bin/phpunit --configuration phpunit.xml --filter <TestName>` — specific test
  - `docker compose exec backend php artisan db:seed --class=FoodDeliverySeeder` — food delivery seed data
- **Test state**: 796 tests, 1828 assertions, 0 failures (as of Aug 14 2026; run on host PHP + `easyryde_test` on 127.0.0.1:5433 via phpunit.xml)
- **Key middleware**: `DriverMiddleware` checks `hasRole('driver')`; tests must assign roles via `$user->assignRole('driver')`
- **Roles**: created via `Role::create(['name' => 'rider', 'guard_name' => 'web'])` in test setUp
- **Encrypted columns**: All must use `text` type (not `VARCHAR`) — Laravel encrypted casts produce 200+ char strings
- **Service bindings**: 5 services with required scalar constructor params are bound in `AppServiceProvider` (EmailService, SmsService, PayFastService, OzowService, PartnerApiService)

## Mobile (React Native / Expo)

- Two apps: `mobile/apps/rider` and `mobile/apps/driver`
- Shared package: `mobile/packages/shared`
- Shared API client: `mobile/packages/shared/src/api/`
- Design tokens: `mobile/packages/shared/src/constants/index.ts`
- Theme context: `mobile/packages/shared/src/theme/ThemeContext.tsx`
- Run from `mobile/` directory

## Docker Stack

- Nginx on host port `3082` (maps to container port 8080)
- PostgreSQL on host port `5433` (maps to container port 5432)
- Redis on host port `6380` (maps to container port 6379)
- Database: `easyryde` (prod), `easyryde_test` (tests) — both PostgreSQL
- Bind mount: `./backend:/var/www` (no named volumes for code)

## Phalaborwa, South Africa

- Default lat/lng for test data: -23.9468, 29.4726
- Currency: ZAR
- Payment methods available: cash, wallet, payfast, ozow, stripe
