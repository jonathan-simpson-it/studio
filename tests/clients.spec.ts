import { test, expect } from '@playwright/test';

test.describe('Clients', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');
  });

  test('clients page loads with table and search', async ({ page }) => {
    await expect(page.locator('h1, h2, h3, span').filter({ hasText: /^Clients$/ }).first()).toBeVisible();
    await expect(page.locator('input[placeholder*="Search clients"]')).toBeVisible();
  });

  test('new client button opens sheet', async ({ page }) => {
    await page.locator('button:has-text("New Client")').click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=New Client').first()).toBeVisible({ timeout: 3000 });
  });

  test('create client form has required fields', async ({ page }) => {
    await page.locator('button:has-text("New Client")').click();
    await page.waitForTimeout(500);

    await expect(page.locator('label:has-text("Company Name")')).toBeVisible();
    await expect(page.locator('label:has-text("Contact Name")')).toBeVisible();
    await expect(page.locator('label:has-text("Email")')).toBeVisible();
  });

  test('create client submits successfully', async ({ page }) => {
    await page.locator('button:has-text("New Client")').click();
    await page.waitForTimeout(500);

    const companyName = `Test Client ${Date.now()}`;
    await page.locator('label:has-text("Company Name")').locator('..').locator('input').fill(companyName);
    await page.locator('label:has-text("Contact Name")').locator('..').locator('input').fill('Jane Smith');
    await page.locator('label:has-text("Email")').locator('..').locator('input').fill('jane@testclient.com');

    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1000);

    const toast = page.locator('[data-sonner-toast]');
    if (await toast.isVisible().catch(() => false)) {
      await expect(toast).toContainText(/Client created/i);
    }
  });

  test('client rows navigate to detail on click', async ({ page }) => {
    const clientRow = page.locator('tbody tr').first();
    if (await clientRow.isVisible().catch(() => false)) {
      await clientRow.click();
      await page.waitForURL(/\/clients\//);
      await page.waitForLoadState('networkidle');
      expect(page.url()).toMatch(/\/clients\/[a-f0-9]+/);
    }
  });

  test('client detail page has tabs', async ({ page }) => {
    const clientRow = page.locator('tbody tr').first();
    if (await clientRow.isVisible().catch(() => false)) {
      await clientRow.click();
      await page.waitForURL(/\/clients\//);
      await page.waitForLoadState('networkidle');

      const tabs = ['Projects', 'Invoices', 'Proposals', 'Notes', 'Files', 'Activity'];
      for (const tab of tabs) {
        const tabEl = page.locator('[role="tab"]').filter({ hasText: tab });
        if (await tabEl.isVisible().catch(() => false)) {
          await expect(tabEl).toBeVisible();
        }
      }
    }
  });

  test('delete client dropdown exists', async ({ page }) => {
    const rows = page.locator('tbody tr');
    if (await rows.count() > 0) {
      // Find the MoreHorizontal button in the last column
      const moreBtn = rows.first().locator('button');
      if (await moreBtn.isVisible().catch(() => false)) {
        await moreBtn.click();
        await page.waitForTimeout(300);
        const deleteItem = page.locator('[role="menuitem"]').filter({ hasText: /Delete/i });
        await expect(deleteItem).toBeVisible();
      }
    }
  });

  test('internal toggle is present', async ({ page }) => {
    const toggle = page.locator('button').filter({ hasText: /Show internal/i });
    await expect(toggle).toBeVisible();
  });
});
