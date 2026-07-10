import { by, device, element, expect, waitFor } from 'detox';

describe('Rider App — Smoke Test', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should launch and show login screen', async () => {
    await expect(element(by.id('login-email-input'))).toBeVisible();
    await expect(element(by.id('login-password-input'))).toBeVisible();
    await expect(element(by.id('login-button'))).toBeVisible();
  });

  it('should show validation error on empty submit', async () => {
    await element(by.id('login-button')).tap();
    await expect(element(by.text('Please fill in all fields'))).toBeVisible();
  });

  it('should show error for invalid email format', async () => {
    await element(by.id('login-email-input')).typeText('notanemail');
    await element(by.id('login-password-input')).typeText('Password1!');
    await element(by.id('login-button')).tap();
    await expect(element(by.text('Please enter a valid email address'))).toBeVisible();
  });

  it('should navigate to register screen', async () => {
    await element(by.id('register-link')).tap();
    await expect(element(by.id('register-name-input'))).toBeVisible();
  });
});
