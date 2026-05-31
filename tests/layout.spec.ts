import { test, expect } from '@playwright/test';

test.describe('App Layout (Sidebar + TopBar)', () => {

  test.beforeEach(async ({ page }) => {
    // Use storage state from global setup
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  const primaryNavItems = [
    'Dashboard', 'Leads', 'Clients', 'Projects', 'Tasks', 'Notes', 'Calendar',
  ];

  const secondaryNavItems = [
    'Proposals', 'Invoices', 'Finance', 'Inbox',
  ];

  for (const item of primaryNavItems) {
    test(`sidebar shows primary nav item: ${item}`, async ({ page }) => {
      await expect(page.locator('aside').locator(`text=${item}`).first()).toBeVisible();
    });
  }

  for (const item of secondaryNavItems) {
    test(`sidebar shows secondary nav item: ${item}`, async ({ page }) => {
      await expect(page.locator('aside').locator(`text=${item}`).first()).toBeVisible();
    });
  }

  test('sidebar shows Settings link', async ({ page }) => {
    await expect(page.locator('aside').locator('text=Settings').first()).toBeVisible();
  });

  test('sidebar shows Studio branding', async ({ page }) => {
    await expect(page.locator('aside').locator('text=Studio').first()).toBeVisible();
    await expect(page.locator('aside').locator('text=Jonathan Simpson & Co.').first()).toBeVisible();
  });

  test('sidebar shows Search button with ⌘K shortcut', async ({ page }) => {
    const searchBtn = page.locator('aside').locator('button, span').filter({ hasText: /Search/ }).first();
    await expect(searchBtn).toBeVisible();
    await expect(page.locator('aside').locator('text=⌘K').first()).toBeVisible();
  });

  test('clicking sidebar nav item navigates to correct route', async ({ page }) => {
    await page.locator('aside').locator('text=Leads').first().click();
    await page.waitForURL(/\/leads/);
    expect(page.url()).toContain('/leads');

    await page.locator('aside').locator('text=Tasks').first().click();
    await page.waitForURL(/\/tasks/);
    expect(page.url()).toContain('/tasks');
  });

  test('active nav item has highlighted state', async ({ page }) => {
    await page.locator('aside').locator('text=Leads').first().click();
    await page.waitForURL(/\/leads/);
    const leadsNav = page.locator('aside').locator('a[href="/leads"] span').first();
    const bgClass = await leadsNav.getAttribute('class');
    expect(bgClass).toContain('bg-accent');
  });

  test('TopBar shows correct page title', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('header h1')).toContainText('Dashboard');
  });

  test('Cmd+K opens command palette', async ({ page }) => {
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);
    // CommandMenu should open (it's a dialog)
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });
  });
});
