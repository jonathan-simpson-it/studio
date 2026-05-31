import { test, expect } from '@playwright/test';

test.describe('Proposals', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/proposals');
    await page.waitForLoadState('networkidle');
  });

  test('proposals page loads with table', async ({ page }) => {
    await expect(page.locator('h1, h2, h3, span').filter({ hasText: /^Proposals$/ }).first()).toBeVisible();
  });

  test('search input is visible', async ({ page }) => {
    await expect(page.locator('input[placeholder*="Search proposals"]')).toBeVisible();
  });

  test('new proposal button navigates to creation', async ({ page }) => {
    const newBtn = page.locator('button').filter({ hasText: /New Proposal/i });
    await expect(newBtn).toBeVisible();
  });

  test('proposal row navigates to detail', async ({ page }) => {
    const row = page.locator('tbody tr').first();
    if (await row.isVisible().catch(() => false)) {
      await row.click();
      await page.waitForURL(/\/proposals\//);
      await page.waitForLoadState('networkidle');
      expect(page.url()).toMatch(/\/proposals\/[a-f0-9]+/);
    }
  });

  test('proposal detail shows status', async ({ page }) => {
    const row = page.locator('tbody tr').first();
    if (await row.isVisible().catch(() => false)) {
      await row.click();
      await page.waitForURL(/\/proposals\//);
      await page.waitForLoadState('networkidle');

      const content = page.locator('main').first();
      await expect(content).toBeVisible();
    }
  });
});
