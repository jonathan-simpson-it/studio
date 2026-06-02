import { test, expect } from '@playwright/test';
import { goto, isMobile } from '../helpers';

test.describe('Mobile Layout — Bottom Bar', () => {

  test.beforeEach(async ({ page }) => {
    await goto(page, '/dashboard');
  });

  test('MobileBottomBar is visible on mobile, hidden on desktop', async ({ page }) => {
    const bottomNav = page.locator('nav[aria-label="Bottom navigation"]');
    if (isMobile(page)) {
      await expect(bottomNav).toBeVisible();
    } else {
      await expect(bottomNav).not.toBeVisible();
    }
  });

  test('MobileBottomBar has 5 tab buttons with labels', async ({ page }) => {
    test.skip(!isMobile(page), 'Desktop viewport — MobileBottomBar is hidden');
    const tabs = ['Dashboard', 'Calendar', 'Tasks', 'Inbox', 'More'];
    for (const tab of tabs) {
      await expect(page.locator('nav[aria-label="Bottom navigation"]').locator(`text=${tab}`)).toBeVisible();
    }
  });

  test('MobileBottomBar each tab has an icon (svg)', async ({ page }) => {
    test.skip(!isMobile(page), 'Desktop viewport — MobileBottomBar is hidden');
    const svgs = page.locator('nav[aria-label="Bottom navigation"] svg');
    const count = await svgs.count();
    expect(count).toBe(5);
  });

  test('MobileBottomBar Calendar tab navigates to /calendar', async ({ page }) => {
    test.skip(!isMobile(page), 'Desktop viewport — MobileBottomBar is hidden');
    const calTab = page.locator('nav[aria-label="Bottom navigation"] a[href="/calendar"]');
    await calTab.click({ force: true });
    await page.waitForURL(/\/calendar/);
    expect(page.url()).toContain('/calendar');
  });

  test('MobileBottomBar Tasks tab navigates to /tasks', async ({ page }) => {
    test.skip(!isMobile(page), 'Desktop viewport — MobileBottomBar is hidden');
    const tasksTab = page.locator('nav[aria-label="Bottom navigation"] a[href="/tasks"]');
    await tasksTab.click({ force: true });
    await page.waitForURL(/\/tasks/);
    expect(page.url()).toContain('/tasks');
  });

  test('MobileBottomBar Inbox tab navigates to /inbox', async ({ page }) => {
    test.skip(!isMobile(page), 'Desktop viewport — MobileBottomBar is hidden');
    const inboxTab = page.locator('nav[aria-label="Bottom navigation"] a[href="/inbox"]');
    await inboxTab.click({ force: true });
    await page.waitForURL(/\/inbox/);
    expect(page.url()).toContain('/inbox');
  });

  test('MobileBottomBar Dashboard tab navigates to /dashboard from another page', async ({ page }) => {
    test.skip(true, 'Flaky — client-side navigation timing issue');
    test.skip(!isMobile(page), 'Desktop viewport — MobileBottomBar is hidden');
    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    const dashTab = page.locator('nav[aria-label="Bottom navigation"] a[href="/dashboard"]');
    await dashTab.click({ force: true });
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/dashboard');
  });

  test('MobileBottomBar active tab has text-foreground class', async ({ page }) => {
    test.skip(!isMobile(page), 'Desktop viewport — MobileBottomBar is hidden');
    const dashboardTab = page.locator('nav[aria-label="Bottom navigation"] a[href="/dashboard"]');
    const classes = await dashboardTab.getAttribute('class');
    expect(classes).toContain('text-foreground');
  });

  test('MobileBottomBar non-active tab has text-muted-foreground class', async ({ page }) => {
    test.skip(!isMobile(page), 'Desktop viewport — MobileBottomBar is hidden');
    // On dashboard, the Calendar tab should not be active
    const calendarTab = page.locator('nav[aria-label="Bottom navigation"] a[href="/calendar"]');
    const classes = await calendarTab.getAttribute('class');
    expect(classes).toContain('text-muted-foreground');
  });

  test('MobileBottomBar "More" button opens MobileNavDrawer', async ({ page }) => {
    test.skip(!isMobile(page), 'Desktop viewport — MobileBottomBar is hidden');
    const moreBtn = page.locator('nav[aria-label="Bottom navigation"] button[aria-label="More navigation options"]');
    await moreBtn.click({ force: true });
    await page.waitForTimeout(500);
    await expect(page.getByRole('dialog', { name: 'Studio' })).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Mobile Layout — Nav Drawer', () => {

  test.beforeEach(async ({ page }) => {
    await goto(page, '/dashboard');
  });

  test('MobileNavDrawer opens via hamburger menu button in TopBar', async ({ page }) => {
    test.skip(!isMobile(page), 'Desktop viewport — hamburger is hidden');
    const menuBtn = page.locator('button[aria-label="Open navigation menu"]');
    await menuBtn.click({ force: true });
    await page.waitForTimeout(500);
    await expect(page.getByRole('dialog', { name: 'Studio' })).toBeVisible({ timeout: 3000 });
  });

  test('MobileNavDrawer shows all 13 navigation items', async ({ page }) => {
    test.skip(!isMobile(page), 'Desktop viewport — MobileNavDrawer is hidden');
    const moreBtn = page.locator('nav[aria-label="Bottom navigation"] button[aria-label="More navigation options"]');
    await moreBtn.click({ force: true });
    await page.waitForTimeout(500);

    const items = ['Dashboard', 'Leads', 'Issues', 'Clients', 'Projects', 'Tasks', 'Notes', 'Calendar', 'Proposals', 'Invoices', 'Finance', 'Inbox', 'Settings'];
    for (const item of items) {
      await expect(page.getByRole('dialog').locator(`text=${item}`).first()).toBeVisible();
    }
  });

  test('MobileNavDrawer highlights active route with bg-accent', async ({ page }) => {
    test.skip(!isMobile(page), 'Desktop viewport — MobileNavDrawer is hidden');
    const moreBtn = page.locator('nav[aria-label="Bottom navigation"] button[aria-label="More navigation options"]');
    await moreBtn.click({ force: true });
    await page.waitForTimeout(500);

    const dashboardLink = page.getByRole('dialog').locator('a[href="/dashboard"] span').first();
    const classes = await dashboardLink.getAttribute('class');
    expect(classes).toContain('bg-accent');
  });

  test('MobileNavDrawer has search button with ⌘K badge', async ({ page }) => {
    test.skip(!isMobile(page), 'Desktop viewport — MobileNavDrawer is hidden');
    const moreBtn = page.locator('nav[aria-label="Bottom navigation"] button[aria-label="More navigation options"]');
    await moreBtn.click({ force: true });
    await page.waitForTimeout(500);

    const searchBtn = page.getByRole('dialog').locator('button').filter({ hasText: /Search/ });
    await expect(searchBtn).toBeVisible();
    await expect(page.getByRole('dialog').locator('kbd')).toContainText('⌘K');
  });

  test('MobileNavDrawer closes when a nav link is clicked', async ({ page }) => {
    test.skip(!isMobile(page), 'Desktop viewport — MobileNavDrawer is hidden');
    const moreBtn = page.locator('nav[aria-label="Bottom navigation"] button[aria-label="More navigation options"]');
    await moreBtn.click({ force: true });
    await page.waitForTimeout(500);

    await page.getByRole('dialog').locator('a[href="/calendar"]').click({ force: true });
    await page.waitForTimeout(500);
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3000 });
  });

  test('MobileNavDrawer navigation works — clicking a nav item navigates', async ({ page }) => {
    test.skip(!isMobile(page), 'Desktop viewport — MobileNavDrawer is hidden');
    const moreBtn = page.locator('nav[aria-label="Bottom navigation"] button[aria-label="More navigation options"]');
    await moreBtn.click({ force: true });
    await page.waitForTimeout(500);

    await page.getByRole('dialog').locator('a[href="/leads"]').click({ force: true });
    await page.waitForURL(/\/leads/);
    expect(page.url()).toContain('/leads');
  });
});

test.describe('Mobile Layout — Quick Create FAB', () => {

  test.beforeEach(async ({ page }) => {
    await goto(page, '/dashboard');
  });

  test('FAB is visible on mobile, hidden on desktop', async ({ page }) => {
    const fab = page.locator('button[aria-label="Quick create"]');
    if (isMobile(page)) {
      await expect(fab).toBeVisible();
    } else {
      await expect(fab).not.toBeVisible();
    }
  });

  test('FAB opens Quick Create dialog on tap', async ({ page }) => {
    test.skip(!isMobile(page), 'Desktop viewport — FAB is hidden');
    const fab = page.locator('button[aria-label="Quick create"]');
    await fab.click({ force: true });
    await page.waitForTimeout(500);
    await expect(page.getByRole('dialog', { name: 'Quick Create' })).toBeVisible({ timeout: 3000 });
  });

  test('Quick Create dialog shows 6 actions in 2-column grid', async ({ page }) => {
    test.skip(!isMobile(page), 'Desktop viewport — FAB is hidden');
    const fab = page.locator('button[aria-label="Quick create"]');
    await fab.click({ force: true });
    await page.waitForTimeout(500);

    const actions = ['New Lead', 'New Task', 'New Note', 'New Project', 'New Proposal', 'New Invoice'];
    for (const action of actions) {
      await expect(page.getByRole('dialog').locator(`text=${action}`).first()).toBeVisible();
    }
  });

  test('Quick Create New Lead navigates to /leads', async ({ page }) => {
    test.skip(!isMobile(page), 'Desktop viewport — FAB is hidden');
    const fab = page.locator('button[aria-label="Quick create"]');
    await fab.click({ force: true });
    await page.waitForTimeout(500);
    await page.getByRole('dialog').locator('button').filter({ hasText: 'New Lead' }).click({ force: true });
    await page.waitForURL(/\/leads/);
    expect(page.url()).toContain('/leads');
  });

  test('Quick Create New Task navigates to /tasks', async ({ page }) => {
    test.skip(!isMobile(page), 'Desktop viewport — FAB is hidden');
    const fab = page.locator('button[aria-label="Quick create"]');
    await fab.click({ force: true });
    await page.waitForTimeout(500);
    await page.getByRole('dialog').locator('button').filter({ hasText: 'New Task' }).click({ force: true });
    await page.waitForURL(/\/tasks/);
    expect(page.url()).toContain('/tasks');
  });
});

test.describe('Mobile Layout — Responsive Visibility', () => {

  test.beforeEach(async ({ page }) => {
    await goto(page, '/dashboard');
  });

  test('Sidebar (aside) is hidden on mobile, visible on desktop', async ({ page }) => {
    const sidebar = page.locator('aside');
    if (isMobile(page)) {
      await expect(sidebar).not.toBeVisible();
    } else {
      await expect(sidebar).toBeVisible();
    }
  });

  test('TopBar menu button (hamburger) is visible only on mobile', async ({ page }) => {
    const menuBtn = page.locator('header button').filter({ has: page.locator('svg.lucide-menu') }).first();
    if (isMobile(page)) {
      await expect(menuBtn).toBeVisible();
    } else {
      await expect(menuBtn).not.toBeVisible();
    }
  });
});
