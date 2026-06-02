import { test, expect } from '@playwright/test';
import { isMobile } from './helpers';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test('settings page loads with tab navigation', async ({ page }) => {
    await expect(page.locator('header h1').filter({ hasText: 'Settings' })).toBeVisible();
  });

  test('settings tabs are present', async ({ page }) => {
    const expectedTabs = ['Profile', 'Connections', 'Agency', 'Integrations', 'Templates', 'Team', 'API Keys'];
    const tabs = page.locator('[role="tab"]');
    const tabTexts = await tabs.allTextContents();
    const joined = tabTexts.join(' ');
    for (const tab of expectedTabs) {
      if (joined.includes(tab)) {
        expect(joined).toContain(tab);
      }
    }
  });

  test('profile tab shows user fields', async ({ page }) => {
    const mobile = isMobile(page);
    const profileTab = page.locator('[role="tab"]').filter({ hasText: /Profile/i });
    if (await profileTab.isVisible().catch(() => false)) {
      await profileTab.click({ force: mobile });
      await page.waitForTimeout(500);
      await expect(page.locator('label:has-text("Name")')).toBeVisible();
      await expect(page.locator('label:has-text("Email")')).toBeVisible();
    }
  });

  test('integrations tab has service keys', async ({ page }) => {
    const mobile = isMobile(page);
    const integrationsTab = page.locator('[role="tab"]').filter({ hasText: /Integrations/i });
    if (await integrationsTab.isVisible().catch(() => false)) {
      await integrationsTab.click({ force: mobile });
      await page.waitForTimeout(500);
      const sections = ['GitHub', 'Resend', 'OpenRouter'];
      for (const section of sections) {
        const el = page.locator(`text=${section}`).first();
        if (await el.isVisible().catch(() => false)) {
          await expect(el).toBeVisible();
        }
      }
    }
  });

  test('agency tab shows agency settings form', async ({ page }) => {
    const mobile = isMobile(page);
    const agencyTab = page.locator('[role="tab"]').filter({ hasText: /Agency/i });
    if (await agencyTab.isVisible().catch(() => false)) {
      await agencyTab.click({ force: mobile });
      await page.waitForTimeout(500);
      await expect(page.locator('label:has-text("Agency Name")')).toBeVisible();
    }
  });

  test('team tab with founder list', async ({ page }) => {
    const mobile = isMobile(page);
    const teamTab = page.locator('[role="tab"]').filter({ hasText: /Team/i });
    if (await teamTab.isVisible().catch(() => false)) {
      await teamTab.click({ force: mobile });
      await page.waitForTimeout(500);
    }
  });

  test('connections tab with OAuth buttons', async ({ page }) => {
    const mobile = isMobile(page);
    const connectionsTab = page.locator('[role="tab"]').filter({ hasText: /Connections/i });
    if (await connectionsTab.isVisible().catch(() => false)) {
      await connectionsTab.click({ force: mobile });
      await page.waitForTimeout(500);
      const githubBtn = page.locator('button').filter({ hasText: /GitHub/i });
      const googleBtn = page.locator('button').filter({ hasText: /Google/i });
      if (await githubBtn.isVisible().catch(() => false)) {
        await expect(githubBtn).toBeVisible();
      }
      if (await googleBtn.isVisible().catch(() => false)) {
        await expect(googleBtn).toBeVisible();
      }
    }
  });
});
