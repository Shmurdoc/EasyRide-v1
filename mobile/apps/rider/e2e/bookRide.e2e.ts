import { by, device, element, expect, waitFor } from 'detox';

describe('Rider App — Book Ride Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
    await element(by.id('login-email-input')).typeText('rider@test.com');
    await element(by.id('login-password-input')).typeText('Password1!');
    await element(by.id('login-button')).tap();
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(10000);
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show home screen with map and inputs', async () => {
    await expect(element(by.id('home-screen'))).toBeVisible();
    await expect(element(by.id('map-view'))).toBeVisible();
    await expect(element(by.id('pickup-input'))).toBeVisible();
    await expect(element(by.id('dropoff-input'))).toBeVisible();
  });

  it('should search and select pickup location', async () => {
    await element(by.id('pickup-input')).tap();
    await element(by.id('pickup-input')).typeText('Phalaborwa Mall');
    await waitFor(element(by.text('Phalaborwa Mall')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.text('Phalaborwa Mall')).tap();
  });

  it('should search and select dropoff location', async () => {
    await element(by.id('dropoff-input')).tap();
    await element(by.id('dropoff-input')).typeText('Phalaborwa Airport');
    await waitFor(element(by.text('Phalaborwa Airport')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.text('Phalaborwa Airport')).tap();
  });

  it('should display ride options after selecting locations', async () => {
    await element(by.id('pickup-input')).tap();
    await element(by.id('pickup-input')).typeText('Phalaborwa Mall');
    await element(by.text('Phalaborwa Mall')).tap();

    await element(by.id('dropoff-input')).tap();
    await element(by.id('dropoff-input')).typeText('Phalaborwa Airport');
    await element(by.text('Phalaborwa Airport')).tap();

    await waitFor(element(by.id('ride-options')))
      .toBeVisible()
      .withTimeout(5000);
    await expect(element(by.id('economy-option'))).toBeVisible();
    await expect(element(by.id('standard-option'))).toBeVisible();
    await expect(element(by.id('premium-option'))).toBeVisible();
  });

  it('should book a standard ride', async () => {
    await element(by.id('pickup-input')).tap();
    await element(by.id('pickup-input')).typeText('Phalaborwa Mall');
    await element(by.text('Phalaborwa Mall')).tap();

    await element(by.id('dropoff-input')).tap();
    await element(by.id('dropoff-input')).typeText('Phalaborwa Airport');
    await element(by.text('Phalaborwa Airport')).tap();

    await waitFor(element(by.id('ride-options')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id('standard-option')).tap();
    await element(by.id('book-ride-button')).tap();

    await waitFor(element(by.id('ride-tracking-screen')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should show driver info during active ride', async () => {
    await element(by.id('pickup-input')).tap();
    await element(by.id('pickup-input')).typeText('Phalaborwa Mall');
    await element(by.text('Phalaborwa Mall')).tap();

    await element(by.id('dropoff-input')).tap();
    await element(by.id('dropoff-input')).typeText('Phalaborwa Airport');
    await element(by.text('Phalaborwa Airport')).tap();

    await waitFor(element(by.id('ride-options')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id('standard-option')).tap();
    await element(by.id('book-ride-button')).tap();

    await waitFor(element(by.id('ride-tracking-screen')))
      .toBeVisible()
      .withTimeout(10000);
    await expect(element(by.id('ride-status'))).toBeVisible();
  });

  it('should cancel an active ride', async () => {
    await element(by.id('pickup-input')).tap();
    await element(by.id('pickup-input')).typeText('Phalaborwa Mall');
    await element(by.text('Phalaborwa Mall')).tap();

    await element(by.id('dropoff-input')).tap();
    await element(by.id('dropoff-input')).typeText('Phalaborwa Airport');
    await element(by.text('Phalaborwa Airport')).tap();

    await waitFor(element(by.id('ride-options')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id('standard-option')).tap();
    await element(by.id('book-ride-button')).tap();

    await waitFor(element(by.id('ride-tracking-screen')))
      .toBeVisible()
      .withTimeout(10000);

    await element(by.id('cancel-ride-button')).tap();
    await element(by.id('confirm-cancel-button')).tap();

    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should navigate to wallet screen', async () => {
    await element(by.id('wallet-tab')).tap();
    await waitFor(element(by.id('wallet-balance')))
      .toBeVisible()
      .withTimeout(5000);
  });
});
