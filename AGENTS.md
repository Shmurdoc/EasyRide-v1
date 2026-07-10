# EasyRyde — Agent Configuration

## Backend (Laravel)

- **PHP CLI**: Use `php -n` flag to bypass Herd Lite php.ini hang on Windows
  - `php -n vendor/bin/phpunit` — run tests
  - `php -n artisan <command>` — run artisan commands
- **Test DB**: SQLite at `backend/database/database.sqlite` (auto-managed by RefreshDatabase trait)
- **Test commands**:
  - `php -n vendor/bin/phpunit --configuration phpunit.xml` — full suite
  - `php -n vendor/bin/phpunit --configuration phpunit.xml --filter <TestName>` — specific test
  - `php -n artisan db:seed --class=FoodDeliverySeeder` — food delivery seed data
- **Test state**: 358 tests, 719 assertions, 0 failures (as of June 2026)
- **Key middleware**: `DriverMiddleware` checks `hasRole('driver')`; tests must assign roles via `$user->assignRole('driver')`
- **Roles**: created via `Role::create(['name' => 'rider', 'guard_name' => 'web'])` in test setUp

## Mobile (React Native / Expo)

- Two apps: `mobile/apps/rider` and `mobile/apps/driver`
- Shared package: `mobile/packages/shared`
- Shared API client: `mobile/packages/shared/src/api/`
- Design tokens: `mobile/packages/shared/src/constants/index.ts`
- Theme context: `mobile/packages/shared/src/theme/ThemeContext.tsx`
- Run from `mobile/` directory

## Phalaborwa, South Africa

- Default lat/lng for test data: -23.9468, 29.4726
- Currency: ZAR
- Payment methods available: cash, wallet, payfast, ozow, stripe
