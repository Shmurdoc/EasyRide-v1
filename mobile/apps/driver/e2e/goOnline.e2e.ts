import { by, device, element, expect, waitFor } from 'detox';

describe('Driver App — Go Online Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
    await element(by.id('login-email-input')).typeText('driver@test.com');
    await element(by.id('login-password-input')).typeText('Password1!');
    await element(by.id('login-button')).tap();
    await waitFor(element(by.id('driver-home-screen')))
      .toBeVisible()
      .withTimeout(10000);
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show dashboard with earnings cards', async () => {
    await expect(element(by.id('driver-home-screen'))).toBeVisible();
    await expect(element(by.id('earnings-today'))).toBeVisible();
    await expect(element(by.id('earnings-total'))).toBeVisible();
    await expect(element(by.id('trips-total'))).toBeVisible();
  });

  it('should show go online button', async () => {
    await expect(element(by.id('online-toggle'))).toBeVisible();
  });

  it('should toggle online status', async () => {
    await element(by.id('online-toggle')).tap();
    await waitFor(element(by.id('online-status')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should toggle back to offline', async () => {
    await element(by.id('online-toggle')).tap();
    await waitFor(element(by.id('online-status')))
      .toBeVisible()
      .withTimeout(5000);

    await element(by.id('online-toggle')).tap();
    await waitFor(element(by.id('offline-status')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should show location permission prompt', async () => {
    await expect(element(by.id('location-permission-check'))).toBeVisible();
  });
});
