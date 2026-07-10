/** @type {import('detox').DetoxConfig} */
module.exports = {
  testRunner: {
    $0: 'jest',
    args: {
      config: 'jest.config.e2e.js',
    },
  },
  apps: {
    'rider.debug': {
      type: 'android.apk',
      binaryPath: 'apps/rider/android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd apps/rider && npx expo run:android --variant debug',
    },
    'driver.debug': {
      type: 'android.apk',
      binaryPath: 'apps/driver/android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd apps/driver && npx expo run:android --variant debug',
    },
    'admin.debug': {
      type: 'android.apk',
      binaryPath: 'apps/admin/android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd apps/admin && npx expo run:android --variant debug',
    },
  },
  devices: {
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_4_API_34',
      },
    },
  },
  configurations: {
    'rider': {
      device: 'emulator',
      app: 'rider.debug',
    },
    'rider.debug': {
      device: 'emulator',
      app: 'rider.debug',
    },
    'driver': {
      device: 'emulator',
      app: 'driver.debug',
    },
    'driver.debug': {
      device: 'emulator',
      app: 'driver.debug',
    },
    'admin': {
      device: 'emulator',
      app: 'admin.debug',
    },
    'admin.debug': {
      device: 'emulator',
      app: 'admin.debug',
    },
  },
};
