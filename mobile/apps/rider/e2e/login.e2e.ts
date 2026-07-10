import { by, device, element, expect, waitFor } from 'detox';

describe('Rider App — Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should login successfully with valid credentials', async () => {
    await element(by.id('login-email-input')).typeText('rider@test.com');
    await element(by.id('login-password-input')).typeText('Password1!');
    await element(by.id('login-button')).tap();
    await waitFor(element(by.id('home-screen')))
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

  it('should register a new rider account', async () => {
    await element(by.id('register-link')).tap();
    await waitFor(element(by.id('register-name-input')))
      .toBeVisible()
      .withTimeout(3000);

    await element(by.id('register-name-input')).typeText('Test Rider');
    await element(by.id('register-email-input')).typeText('testrider@test.com');
    await element(by.id('register-phone-input')).typeText('+27123456789');
    await element(by.id('register-password-input')).typeText('Password1!');
    await element(by.id('register-button')).tap();

    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should show validation error for password mismatch', async () => {
    await element(by.id('register-link')).tap();
    await waitFor(element(by.id('register-name-input')))
      .toBeVisible()
      .withTimeout(3000);

    await element(by.id('register-name-input')).typeText('Test User');
    await element(by.id('register-email-input')).typeText('user@test.com');
    await element(by.id('register-phone-input')).typeText('+27123456789');
    await element(by.id('register-password-input')).typeText('Password1!');
    await element(by.id('register-confirm-password-input')).typeText('Different1!');
    await element(by.id('register-button')).tap();

    await expect(element(by.text('Passwords do not match'))).toBeVisible();
  });
});
