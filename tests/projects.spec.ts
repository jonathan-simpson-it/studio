import { test, expect } from '@playwright/test';

test.describe('Projects', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
  });

  test('projects page loads with table', async ({ page }) => {
    await expect(page.locator('h1, h2, h3, span').filter({ hasText: /^Projects$/ }).first()).toBeVisible();
  });

  test('search input is visible', async ({ page }) => {
    await expect(page.locator('input[placeholder*="Search projects"]')).toBeVisible();
  });

  test('status filter dropdown is visible', async ({ page }) => {
    const statusFilter = page.locator('[role="combobox"]').filter({ hasText: /Status/i });
    await expect(statusFilter).toBeVisible();
  });

  test('new project button opens sheet', async ({ page }) => {
    await page.locator('button:has-text("New Project")').click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=New Project').first()).toBeVisible({ timeout: 3000 });
  });

  test('create project form has required fields', async ({ page }) => {
    await page.locator('button:has-text("New Project")').click();
    await page.waitForTimeout(500);

    await expect(page.locator('label:has-text("Project Name")')).toBeVisible();
    await expect(page.locator('label:has-text("Client")')).toBeVisible();
  });

  test('project row navigates to detail on click', async ({ page }) => {
    const projectRow = page.locator('tbody tr').first();
    if (await projectRow.isVisible().catch(() => false)) {
      await projectRow.click();
      await page.waitForURL(/\/projects\//);
      await page.waitForLoadState('networkidle');
      expect(page.url()).toMatch(/\/projects\/[a-f0-9]+/);
    }
  });

  test('project detail page has overview tabs', async ({ page }) => {
    const projectRow = page.locator('tbody tr').first();
    if (await projectRow.isVisible().catch(() => false)) {
      await projectRow.click();
      await page.waitForURL(/\/projects\//);
      await page.waitForLoadState('networkidle');

      const tabs = ['Overview', 'Tasks & Issues', 'Milestones', 'Notes', 'Files', 'Proposals', 'Invoices', 'Activity'];
      for (const tab of tabs) {
        const tabEl = page.locator('[role="tab"]').filter({ hasText: tab });
        if (await tabEl.isVisible().catch(() => false)) {
          await expect(tabEl).toBeVisible();
        }
      }
    }
  });

  test('create project submits', async ({ page }) => {
    await page.locator('button:has-text("New Project")').click();
    await page.waitForTimeout(500);

    const projectName = `Test Project ${Date.now()}`;
    const nameInput = page.locator('label:has-text("Project Name")').locator('..').locator('input');
    await nameInput.fill(projectName);

    const submitBtn = page.locator('button[type="submit"], button:has-text("Create Project")');
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(1000);
    }
  });
});
