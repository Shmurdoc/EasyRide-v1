import { by, device, element, expect, waitFor } from 'detox';

describe('Driver App — Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should login successfully with valid credentials', async () => {
    await element(by.id('login-email-input')).typeText('driver@test.com');
    await element(by.id('login-password-input')).typeText('Password1!');
    await element(by.id('login-button')).tap();
    await waitFor(element(by.id('driver-home-screen')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should show error for invalid credentials', async () => {
    await element(by.id('login-email-input')).typeText('wrong@email.com');
    await element(by.id('login-password-input')).typeText('wrongpassword');
    await element(by.id('login-button')).tap();
    await waitFor(element(by.text('Invalid credentials')))
      .toBeVisible()
      .withTimeout(5000);
  });
});
