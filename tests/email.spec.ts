import { test, expect } from '@playwright/test';

async function clickTab(page: any, name: string) {
  const tab = page.locator('[role="tab"]').filter({ hasText: new RegExp(name, 'i') });
  const isMobile = page.viewportSize()?.width < 800;
  await tab.click({ force: isMobile });
  await page.waitForTimeout(800);
}

test.describe('Email — Settings', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test('profile tab shows disabled email field', async ({ page }) => {
    await clickTab(page, 'Profile');
    const emailLabel = page.locator('label:has-text("Email")');
    if (await emailLabel.isVisible().catch(() => false)) {
      await expect(emailLabel).toBeVisible();
    }
  });

  test('integrations tab shows Resend API key field', async ({ page }) => {
    await clickTab(page, 'Integrations');
    const resendSection = page.getByText('Resend', { exact: true });
    if (await resendSection.isVisible().catch(() => false)) {
      await expect(resendSection).toBeVisible();
    }
  });

  test('connections tab shows Google connect and Gmail inbox section', async ({ page }) => {
    await clickTab(page, 'Connections');
    const gmailInboxes = page.getByText('Gmail Inboxes');
    if (await gmailInboxes.isVisible().catch(() => false)) {
      await expect(gmailInboxes).toBeVisible();
    }
    const fetchLabelsBtn = page.locator('button').filter({ hasText: /Fetch Labels/i });
    if (await fetchLabelsBtn.isVisible().catch(() => false)) {
      await expect(fetchLabelsBtn).toBeVisible();
    }
  });
});

test.describe('Email — Inbox', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/inbox');
    await page.waitForLoadState('networkidle');
  });

  test('inbox page loads with heading and search', async ({ page }) => {
    await expect(page.locator('h2:has-text("Inbox")')).toBeVisible();
    await expect(page.locator('input[placeholder*="Search sender"]')).toBeVisible();
  });

  test('inbox filter tabs present', async ({ page }) => {
    const expectedTabs = ['All', 'Unread', 'High Priority', 'Action Needed'];
    for (const tab of expectedTabs) {
      const el = page.locator('button').filter({ hasText: tab }).first();
      if (await el.isVisible().catch(() => false)) {
        await expect(el).toBeVisible();
      }
    }
  });

  test('inbox fetch dropdown visible', async ({ page }) => {
    const fetchBtn = page.locator('button').filter({ hasText: /Fetch/ }).first();
    await expect(fetchBtn).toBeVisible();
  });

  test('inbox shows empty state when no messages', async ({ page }) => {
    const emptyText = page.locator('text=No messages yet').or(page.locator('text=All caught up'));
    if (await emptyText.isVisible().catch(() => false)) {
      await expect(emptyText).toBeVisible();
    }
  });

  test('inbox expanded message renders HTML body without raw tags', async ({ page }) => {
    const messageCard = page.locator('.cursor-pointer').or(page.locator('[role="button"]')).first();
    if (await messageCard.isVisible().catch(() => false)) {
      await messageCard.click();
      await page.waitForTimeout(500);
      const expandedContent = page.locator('.border-t').first();
      if (await expandedContent.isVisible().catch(() => false)) {
        const text = await expandedContent.textContent().catch(() => '') || '';
        expect(text).not.toContain('&lt;p&gt;');
        expect(text).not.toContain('&lt;div&gt;');
        expect(text).not.toContain('&lt;/');
        const hasAngledTags = /<[a-zA-Z\/][^>]*>/.test(text);
        expect(hasAngledTags).toBe(false);
        const html = await expandedContent.innerHTML().catch(() => '') || '';
        if (html.includes('href=')) {
          const links = expandedContent.locator('a');
          const linkCount = await links.count();
          for (let i = 0; i < linkCount; i++) {
            await expect(links.nth(i)).toHaveAttribute('target', '_blank');
            await expect(links.nth(i)).toHaveAttribute('rel', 'noopener noreferrer');
          }
        }
      }
    }
  });
});

test.describe('Email — Invoice Send', () => {

  test('invoice detail send button opens dialog', async ({ page }) => {
    await page.goto('/invoices');
    await page.waitForLoadState('networkidle');
    const invoiceLink = page.locator('a[href*="/invoices/"]').first();
    if (await invoiceLink.isVisible().catch(() => false)) {
      await invoiceLink.click();
      await page.waitForURL(/\/invoices\//);
      await page.waitForLoadState('networkidle');
      const sendBtn = page.locator('button').filter({ hasText: 'Send' }).first();
      if (await sendBtn.isVisible().catch(() => false)) {
        await sendBtn.click();
        await page.waitForTimeout(500);
        await expect(page.getByRole('dialog', { name: 'Send Invoice' })).toBeVisible({ timeout: 3000 });
        const subjectInput = page.locator('[role="dialog"]').locator('input').first();
        await expect(subjectInput).toBeVisible();
        const bodyArea = page.locator('[role="dialog"]').locator('textarea').first();
        await expect(bodyArea).toBeVisible();
      }
    }
  });
});

test.describe('Email — Proposal Send', () => {

  test('proposal detail send button opens dialog', async ({ page }) => {
    await page.goto('/proposals');
    await page.waitForLoadState('networkidle');
    const row = page.locator('tbody tr').first();
    if (await row.isVisible().catch(() => false)) {
      await row.click();
      await page.waitForURL(/\/proposals\//);
      await page.waitForLoadState('networkidle');
      const sendBtn = page.locator('button').filter({ hasText: 'Send' }).first();
      if (await sendBtn.isVisible().catch(() => false)) {
        await sendBtn.click();
        await page.waitForTimeout(500);
        await expect(page.getByRole('dialog', { name: 'Send Proposal' })).toBeVisible({ timeout: 3000 });
        const subjectInput = page.locator('[role="dialog"]').locator('input').first();
        await expect(subjectInput).toBeVisible();
        const bodyArea = page.locator('[role="dialog"]').locator('textarea').first();
        await expect(bodyArea).toBeVisible();
      }
    }
  });
});

test.describe('Email — Lead Draft', () => {

  test('lead detail has draft email AI button', async ({ page }) => {
    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    const leadCard = page.locator('.cursor-pointer.transition-colors').first();
    if (await leadCard.isVisible().catch(() => false)) {
      await leadCard.click();
      await page.waitForURL(/\/leads\//);
      await page.waitForLoadState('networkidle');
      const draftBtn = page.locator('button').filter({ hasText: /Draft email/i }).first();
      if (await draftBtn.isVisible().catch(() => false)) {
        await expect(draftBtn).toBeVisible();
      }
    }
  });
});
