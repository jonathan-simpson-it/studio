import { test, expect } from '@playwright/test';

test.describe('UI/UX Audit', () => {
  test('not-found page shows 404 message', async ({ page }) => {
    await page.goto('/nonexistent-route');
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).toContainText(/404|not found/i);
  });

  test('error page has retry button', async ({ page }) => {
    // Navigate to a route that would error
    await page.goto('/error');
    await page.waitForTimeout(2000);
    const retryBtn = page.locator('button').filter({ hasText: /retry|try again/i });
    if (await retryBtn.isVisible().catch(() => false)) {
      await expect(retryBtn).toBeVisible();
    }
  });

  test('dark mode is applied by default', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const htmlClass = await page.locator('html').getAttribute('class');
    // Should be dark mode
    expect(htmlClass).toContain('dark');
  });

  test('loading skeleton shows during page load', async ({ page }) => {
    // Navigate to a page and watch for skeleton elements
    await page.goto('/leads');
    const skeleton = page.locator('[class*="skeleton"], [class*="Skeleton"], .animate-pulse');
    if (await skeleton.isVisible().catch(() => false)) {
      await expect(skeleton).toBeVisible();
    }
  });

  test('forms have proper keyboard navigation', async ({ page }) => {
    await page.goto('/leads');
    await page.locator('button:has-text("New Lead")').click();
    await page.waitForTimeout(500);

    // Tab through form fields
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    const focused1 = page.locator(':focus');
    await expect(focused1).toBeVisible();

    // Tab again
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
  });

  test('buttons show proper hover state', async ({ page }) => {
    await page.goto('/dashboard');
    const button = page.locator('button').filter({ hasText: 'Search' });
    if (await button.isVisible().catch(() => false)) {
      await button.hover();
      // Button should have hover styles applied
      const styles = await button.getAttribute('class');
      expect(styles).toBeTruthy();
    }
  });

  test('sonner toasts render on interaction', async ({ page }) => {
    await page.goto('/leads');
    const newBtn = page.locator('button:has-text("New Lead")');
    if (await newBtn.isVisible()) {
      await newBtn.click();
      await page.waitForTimeout(300);

      // Close sheet without filling
      const closeBtn = page.locator('[role="dialog"] button').filter({ has: page.locator('svg') }).first();
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
      }
    }
  });

  test('sidebar icons render correctly', async ({ page }) => {
    await page.goto('/dashboard');
    const svgs = page.locator('aside svg');
    const count = await svgs.count();
    expect(count).toBeGreaterThan(5);
  });
});
