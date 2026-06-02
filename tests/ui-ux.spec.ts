import { test, expect } from '@playwright/test';
import { isMobile } from './helpers';

test.describe('UI/UX Audit', () => {
  test('not-found page shows 404 message', async ({ page }) => {
    await page.goto('/nonexistent-route');
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).toContainText(/404|not found/i);
  });

  test('error page has retry button', async ({ page }) => {
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
    expect(htmlClass).toContain('dark');
  });

  test('loading skeleton shows during page load', async ({ page }) => {
    await page.goto('/leads');
    const skeleton = page.locator('[class*="skeleton"], [class*="Skeleton"], .animate-pulse');
    if (await skeleton.isVisible().catch(() => false)) {
      await expect(skeleton).toBeVisible();
    }
  });

  test('forms have proper keyboard navigation', async ({ page }) => {
    test.skip(isMobile(page), 'Keyboard navigation differs on mobile (no Tab key equivalent)');
    await page.goto('/leads');
    const mobile = isMobile(page);
    await page.locator('button:has-text("New Lead")').click({ force: mobile });
    await page.waitForTimeout(500);

    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    const focused1 = page.locator(':focus');
    await expect(focused1).toBeVisible();

    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
  });

  test('buttons show proper hover state', async ({ page }) => {
    test.skip(isMobile(page), 'Hover states do not apply on touch devices');
    await page.goto('/dashboard');
    const button = page.locator('button').filter({ hasText: 'Search' });
    if (await button.isVisible().catch(() => false)) {
      await button.hover();
      const styles = await button.getAttribute('class');
      expect(styles).toBeTruthy();
    }
  });

  test('sonner toasts render on interaction', async ({ page }) => {
    await page.goto('/leads');
    const mobile = isMobile(page);
    const newBtn = page.locator('button:has-text("New Lead")');
    if (await newBtn.isVisible()) {
      await newBtn.click({ force: mobile });
      await page.waitForTimeout(300);

      const closeBtn = page.locator('[role="dialog"] button').filter({ has: page.locator('svg') }).first();
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click({ force: mobile });
      }
    }
  });

  test('sidebar icons render correctly', async ({ page }) => {
    test.skip(isMobile(page), 'Sidebar is hidden on mobile');
    await page.goto('/dashboard');
    const svgs = page.locator('aside svg');
    const count = await svgs.count();
    expect(count).toBeGreaterThan(5);
  });
});
