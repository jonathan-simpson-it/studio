import { test, expect } from '@playwright/test';
import { goto, clickButton, fillByLabel, expectToast } from './helpers';

test.describe('Auth Flow', () => {

  test('login page renders all elements', async ({ page }) => {
    await page.context().clearCookies();
    await goto(page, '/login');
    await expect(page.locator('input[id="email"]')).toBeVisible();
    await expect(page.locator('input[id="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /log in with github/i })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /log in with google/i })).toBeVisible();
    await expect(page.locator('a').filter({ hasText: /register/i })).toBeVisible();
  });

  test('login with wrong credentials shows error toast', async ({ page }) => {
    // Must clear auth state to access login page for unauthenticated flow
    await page.context().clearCookies();
    await goto(page, '/login');
    await fillByLabel(page, 'Email', 'wrong@email.com');
    await fillByLabel(page, 'Password', 'wrongpassword');
    await clickButton(page, 'Sign in');
    await expectToast(page, 'Invalid email or password');
  });

  test('login with valid credentials redirects to dashboard', async ({ page }) => {
    await page.context().clearCookies();
    await goto(page, '/login');

    const email = process.env.TEST_USER_EMAIL || 'test@studio.test';

    await fillByLabel(page, 'Email', email);
    await fillByLabel(page, 'Password', 'TestPassword123!');
    await clickButton(page, 'Sign in');

    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('register page renders all fields', async ({ page }) => {
    await page.context().clearCookies();
    await goto(page, '/register');
    await expect(page.locator('input[id="full_name"]')).toBeVisible();
    await expect(page.locator('input[id="email"]')).toBeVisible();
    await expect(page.locator('input[id="password"]')).toBeVisible();
    await expect(page.locator('input[id="invite_code"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('a').filter({ hasText: /sign in/i })).toBeVisible();
  });

  test('unauthenticated access redirects to login', async ({ page }) => {
    await page.context().clearCookies();
    await goto(page, '/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('authenticated user on login page gets redirected to dashboard', async ({ page }) => {
    // With storageState from global setup, user is already logged in
    await goto(page, '/login');
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
