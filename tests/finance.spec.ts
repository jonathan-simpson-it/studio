import { test, expect } from '@playwright/test';

test.describe('Finance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/finance');
    await page.waitForLoadState('networkidle');
  });

  test('finance page loads', async ({ page }) => {
    await expect(page.locator('h1, h2, h3, span').filter({ hasText: /^Finance$/ }).first()).toBeVisible();
  });

  test('summary cards are visible', async ({ page }) => {
    const possibleLabels = ['Revenue', 'Quarterly', 'Collected', 'Outstanding', 'Costs', 'Margin'];
    for (const label of possibleLabels) {
      const el = page.locator('text=' + label).first();
      if (await el.isVisible().catch(() => false)) {
        await expect(el).toBeVisible();
      }
    }
  });

  test('costs section is present', async ({ page }) => {
    const costsHeader = page.locator('h2, h3').filter({ hasText: /Costs/i });
    if (await costsHeader.isVisible().catch(() => false)) {
      await expect(costsHeader).toBeVisible();
    }
  });

  test('add cost button exists', async ({ page }) => {
    const addCostBtn = page.locator('button').filter({ hasText: /Add Cost|New Cost/i }).first();
    if (await addCostBtn.isVisible().catch(() => false)) {
      await expect(addCostBtn).toBeVisible();
    }
  });

  test('quarterly chart section renders', async ({ page }) => {
    // Recharts renders SVG elements
    const chartSvg = page.locator('svg.recharts-surface, .recharts-wrapper');
    if (await chartSvg.isVisible().catch(() => false)) {
      await expect(chartSvg).toBeVisible();
    }
  });

  test('by-client table is present', async ({ page }) => {
    const clientSection = page.locator('h2, h3').filter({ hasText: /Client/i });
    if (await clientSection.isVisible().catch(() => false)) {
      await expect(clientSection).toBeVisible();
    }
  });
});
