# Maestro E2E Testing - EasyRyde

## Setup

1. Install Maestro CLI:
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```

2. Add Maestro to PATH:
   ```bash
   export PATH="$PATH:$HOME/.maestro/bin"
   ```

3. Verify installation:
   ```bash
   maestro --version
   ```

## Running Tests

### Run all rider tests
```bash
maestro test mobile/.maestro/rider/
```

### Run all driver tests
```bash
maestro test mobile/.maestro/driver/
```

### Run a specific test
```bash
maestro test mobile/.maestro/rider/login-flow.yml
maestro test mobile/.maestro/rider/ride-booking.yml
maestro test mobile/.maestro/driver/login-flow.yml
```

### Run shared flows (assertions only)
```bash
maestro test mobile/.maestro/shared/
```

## Directory Structure

```
mobile/.maestro/
├── maestro.yml           # Global Maestro configuration
├── rider/
│   ├── login-flow.yml    # Rider login test
│   └── ride-booking.yml  # Rider ride booking test
├── driver/
│   └── login-flow.yml    # Driver login test
└── shared/
    └── auth-assertions.yml  # Reusable auth assertions
```

## Test Accounts

| Role   | Email              | Password    |
|--------|-------------------|-------------|
| Rider  | rider@test.com    | password123 |
| Driver | driver@test.com   | password123 |

## Notes

- Tests assume the apps are installed on a connected device/emulator
- Run `maestro devices` to list connected devices
- Use `maestro studio` for interactive test recording
- Shared flows can be included in other tests using `- runFlow:`
