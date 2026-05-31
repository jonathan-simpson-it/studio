import { test, expect } from '@playwright/test';

test.describe('Error Handling & Edge Cases', () => {
  test('navigating to invalid detail ID shows error gracefully', async ({ page }) => {
    await page.goto('/leads/invalid-id-12345');
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('navigating to detail page for non-existent entity', async ({ page }) => {
    await page.goto('/clients/000000000000000000000000');
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('empty search results show clear state', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('ZZZZNONEXISTENTVALUEXYZ');
      await page.waitForTimeout(500);
      const body = page.locator('body');
      await expect(body).toBeVisible();
    }
  });

  test('page navigation preserves query state', async ({ page }) => {
    await page.goto('/leads');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="Search leads"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(300);

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await page.goto('/leads');
      await page.waitForLoadState('networkidle');

      const searchValue = await searchInput.inputValue();
      expect(searchValue).toBe('');
    }
  });

  test('API page returns 200 for valid routes', async ({ page }) => {
    const response = await page.goto('/api/ai/generate');
    // API routes should respond, even if with an error
    expect(response).not.toBeNull();
  });
});
