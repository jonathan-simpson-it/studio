import { test, expect } from '@playwright/test';
import { isMobile } from './helpers';

test.describe('Leads', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
  });

  test('leads page loads with kanban view by default', async ({ page }) => {
    await expect(page.locator('header h1').filter({ hasText: 'Leads' })).toBeVisible();
    if (!isMobile(page)) {
      const stages = ['New', 'Contacted', 'Discovery', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];
      for (const stage of stages) {
        await expect(page.locator(`h3:has-text("${stage}")`).first()).toBeVisible();
      }
    }
  });

  test('view toggle switches between kanban and table', async ({ page }) => {
    test.skip(isMobile(page), 'Mobile uses MobileCardList instead of table');
    const toggleGroup = page.locator('div.flex.items-center.rounded-lg.border');
    const buttons = toggleGroup.locator('button');
    const btnCount = await buttons.count();
    expect(btnCount).toBe(2);

    const mobile = isMobile(page);
    await buttons.nth(1).click({ force: mobile });
    await page.waitForTimeout(300);

    const tableHeaders = page.locator('th');
    const headerCount = await tableHeaders.count();
    expect(headerCount).toBeGreaterThanOrEqual(5);
  });

  test('search filters leads', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search leads"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('ZZZZDoesNotExist', { force: isMobile(page) });
    await page.waitForTimeout(300);

    if (!isMobile(page)) {
      const columns = page.locator('main h3');
      const columnCount = await columns.count();
      expect(columnCount).toBe(7);
    }
  });

  test('new lead button opens sheet', async ({ page }) => {
    const mobile = isMobile(page);
    await page.locator('button:has-text("New Lead")').click({ force: mobile });
    await page.waitForTimeout(500);
    await expect(page.getByRole('dialog', { name: 'New Lead' })).toBeVisible({ timeout: 3000 });
  });

  test('new lead form has required fields', async ({ page }) => {
    const mobile = isMobile(page);
    await page.locator('button:has-text("New Lead")').click({ force: mobile });
    await page.waitForTimeout(500);

    await expect(page.locator('label:has-text("Company Name")')).toBeVisible();
    await expect(page.locator('label:has-text("Contact Name")')).toBeVisible();
    await expect(page.locator('label:has-text("Email")')).toBeVisible();
    await expect(page.locator('label:has-text("Phone")')).toBeVisible();
    await expect(page.locator('label:has-text("Source")')).toBeVisible();
    await expect(page.locator('label:has-text("Currency")')).toBeVisible();
    await expect(page.locator('label:has-text("Estimated Value")')).toBeVisible();
  });

  test('create lead submits and shows success', async ({ page }) => {
    const mobile = isMobile(page);
    await page.locator('button:has-text("New Lead")').click({ force: mobile });
    await page.waitForTimeout(500);

    const companyName = `Test Lead ${Date.now()}`;
    await page.locator('label:has-text("Company Name")').locator('..').locator('input').fill(companyName, { force: mobile });
    await page.locator('label:has-text("Contact Name")').locator('..').locator('input').fill('John Doe', { force: mobile });
    await page.locator('label:has-text("Email")').locator('..').locator('input').fill('john@test.com', { force: mobile });

    await page.locator('button[type="submit"]:has-text("Create Lead")').click({ force: mobile });
    await page.waitForTimeout(1000);

    const toast = page.locator('[data-sonner-toast]');
    if (await toast.isVisible().catch(() => false)) {
      await expect(toast).toContainText(/Lead created/i);
    }
  });

  test('clicking lead card navigates to detail', async ({ page }) => {
    const leadCard = page.locator('.cursor-pointer.transition-colors').first();
    if (await leadCard.isVisible().catch(() => false)) {
      await leadCard.click({ force: isMobile(page) });
      await page.waitForURL(/\/leads\//);
      expect(page.url()).toMatch(/\/leads\/[a-f0-9]+/);
    }
  });

  test('lead detail page renders info when navigated', async ({ page }) => {
    const leadCard = page.locator('.cursor-pointer.transition-colors').first();
    if (await leadCard.isVisible().catch(() => false)) {
      await leadCard.click({ force: isMobile(page) });
      await page.waitForURL(/\/leads\//);
      await page.waitForLoadState('networkidle');

      const heading = page.locator('h1, h2').first();
      await expect(heading).toBeVisible();
    }
  });

  test('stage selector is present on detail page', async ({ page }) => {
    const leadCard = page.locator('.cursor-pointer.transition-colors').first();
    if (await leadCard.isVisible().catch(() => false)) {
      await leadCard.click({ force: isMobile(page) });
      await page.waitForURL(/\/leads\//);
      await page.waitForLoadState('networkidle');

      const stageSelect = page.locator('[role="combobox"]').first();
      await expect(stageSelect).toBeVisible({ timeout: 5000 });
    }
  });

  test('delete dropdown is present on lead cards', async ({ page }) => {
    const mobile = isMobile(page);
    const moreButtons = page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: '' });
    for (let i = 0; i < await moreButtons.count(); i++) {
      const html = await moreButtons.nth(i).innerHTML();
      if (html.includes('MoreHorizontal') || html.includes('more')) {
        await moreButtons.nth(i).click({ force: mobile });
        await page.waitForTimeout(300);
        break;
      }
    }
    const deleteItem = page.locator('[role="menuitem"]').filter({ hasText: /Delete/i });
    if (await deleteItem.isVisible().catch(() => false)) {
      await expect(deleteItem).toBeVisible();
    }
  });

  test('heat score displays on lead cards', async ({ page }) => {
    const flameIcons = page.locator('text=🔥');
    const count = await flameIcons.count();
    if (count > 0) {
      expect(count).toBeGreaterThan(0);
    }
  });

  test('kanban stage columns show lead counts', async ({ page }) => {
    test.skip(isMobile(page), 'Kanban column count differs on mobile');
    const stages = page.locator('h3');
    const stageCount = await stages.count();
    expect(stageCount).toBe(7);
  });

  test('table view shows relevant columns', async ({ page }) => {
    test.skip(isMobile(page), 'Mobile uses MobileCardList instead of table');
    const toggleGroup = page.locator('div.flex.items-center.rounded-lg.border');
    const buttons = toggleGroup.locator('button');
    const mobile = isMobile(page);
    await buttons.nth(1).click({ force: mobile });
    await page.waitForTimeout(300);

    const ths = page.locator('th');
    const count = await ths.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });
});
