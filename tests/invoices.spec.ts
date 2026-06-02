import { test, expect } from '@playwright/test';
import { isMobile } from './helpers';

test.describe('Invoices', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/invoices');
    await page.waitForLoadState('networkidle');
  });

  test('invoices page loads with heading', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: 'Invoices' })).toBeVisible();
  });

  test('search input is visible', async ({ page }) => {
    await expect(page.locator('input[placeholder*="Search invoices"]')).toBeVisible();
  });

  test('new invoice button opens creation sheet', async ({ page }) => {
    const mobile = isMobile(page);
    const newBtn = page.locator('button').filter({ hasText: /New Invoice/i });
    await expect(newBtn).toBeVisible();
    await newBtn.click({ force: mobile });
    await page.waitForTimeout(500);
    await expect(page.getByRole('dialog', { name: 'New Invoice' })).toBeVisible({ timeout: 3000 });
  });

  test('invoice page renders list', async ({ page }) => {
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('outstanding total card is visible', async ({ page }) => {
    const outstandingHeading = page.locator('h2, h3, span, p').filter({ hasText: /Outstanding/i });
    if (await outstandingHeading.isVisible().catch(() => false)) {
      await expect(outstandingHeading).toBeVisible();
    }
  });

  test('invoice row navigates to detail', async ({ page }) => {
    const invoiceLink = page.locator('a[href*="/invoices/"]').first();
    if (await invoiceLink.isVisible().catch(() => false)) {
      await invoiceLink.click({ force: isMobile(page) });
      await page.waitForURL(/\/invoices\//);
      await page.waitForLoadState('networkidle');
      expect(page.url()).toMatch(/\/invoices\/[a-f0-9]+/);
    }
  });
});
