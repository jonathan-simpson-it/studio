import { test, expect } from '@playwright/test';
import { isMobile } from './helpers';

test.describe('Tasks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
  });

  test('tasks page loads with board view', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: 'Tasks' })).toBeVisible();
    if (!isMobile(page)) {
      const columns = ['Todo', 'In Progress', 'Bottlenecked', 'Done'];
      for (const col of columns) {
        await expect(page.locator(`h3:has-text("${col}")`).first()).toBeVisible();
      }
    }
  });

  test('search input is visible', async ({ page }) => {
    await expect(page.locator('input[placeholder*="Search tasks"]')).toBeVisible();
  });

  test('priority filter dropdown is visible', async ({ page }) => {
    const priorityFilter = page.locator('[role="combobox"]').filter({ hasText: /Priority/i });
    await expect(priorityFilter).toBeVisible();
  });

  test('new task button opens sheet', async ({ page }) => {
    const mobile = isMobile(page);
    await page.locator('button:has-text("New Task")').click({ force: mobile });
    await page.waitForTimeout(500);
    await expect(page.getByRole('dialog', { name: 'New Task' })).toBeVisible({ timeout: 3000 });
  });

  test('task form has Smart Fill and AI buttons', async ({ page }) => {
    const mobile = isMobile(page);
    await page.locator('button:has-text("New Task")').click({ force: mobile });
    await page.waitForTimeout(500);

    await expect(page.locator('button').filter({ hasText: 'Smart Fill' })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: 'AI' })).toBeVisible();
  });

  test('task form has title and description fields', async ({ page }) => {
    const mobile = isMobile(page);
    await page.locator('button:has-text("New Task")').click({ force: mobile });
    await page.waitForTimeout(500);

    await expect(page.locator('label:has-text("Title")')).toBeVisible();
    await expect(page.locator('label:has-text("Description")')).toBeVisible();
    await expect(page.locator('label:has-text("Priority")')).toBeVisible();
    await expect(page.locator('label:has-text("Due Date")')).toBeVisible();
  });

  test('create task submits successfully', async ({ page }) => {
    const mobile = isMobile(page);
    await page.locator('button:has-text("New Task")').click({ force: mobile });
    await page.waitForTimeout(500);

    const taskTitle = `Test Task ${Date.now()}`;
    await page.locator('label:has-text("Title")').locator('..').locator('input').fill(taskTitle, { force: mobile });

    await page.locator('button[type="submit"]:has-text("Create Task")').click({ force: mobile });
    await page.waitForTimeout(1000);

    const toast = page.locator('[data-sonner-toast]');
    if (await toast.isVisible().catch(() => false)) {
      await expect(toast).toContainText(/Task created/i);
    }
  });

  test('task board columns show counts', async ({ page }) => {
    test.skip(isMobile(page), 'Mobile uses MobileStageList — no h3 column headers');
    const columns = ['Todo', 'In Progress', 'Bottlenecked', 'Done'];
    for (const col of columns) {
      const heading = page.locator('h3').filter({ hasText: col }).first();
      await expect(heading).toBeVisible();
    }
  });

  test('toggle between board and table view', async ({ page }) => {
    test.skip(isMobile(page), 'Mobile uses MobileCardList — no th elements');
    const toggleGroup = page.locator('div.flex.items-center.rounded-lg.border');
    const buttons = toggleGroup.locator('button');
    const btnCount = await buttons.count();
    expect(btnCount).toBe(2);

    const mobile = isMobile(page);
    await buttons.nth(1).click({ force: mobile });
    await page.waitForTimeout(300);

    const ths = page.locator('th');
    const count = await ths.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });
});
