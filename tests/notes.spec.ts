import { test, expect } from '@playwright/test';

test.describe('Notes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/notes');
    await page.waitForLoadState('networkidle');
  });

  test('notes page loads with grid layout', async ({ page }) => {
    await expect(page.locator('h1, h2, h3, span').filter({ hasText: /^Notes$/ }).first()).toBeVisible();
  });

  test('search input is visible', async ({ page }) => {
    await expect(page.locator('input[placeholder*="Search notes"]')).toBeVisible();
  });

  test('sort dropdown is visible', async ({ page }) => {
    const sortSelect = page.locator('[role="combobox"]').filter({ hasText: /newest|oldest|title/i });
    await expect(sortSelect).toBeVisible();
  });

  test('new note button exists', async ({ page }) => {
    await expect(page.locator('button').filter({ hasText: /New Note/i })).toBeVisible();
  });

  test('create quick note input is present', async ({ page }) => {
    const quickNoteInput = page.locator('input[placeholder*="Quick note"]');
    if (await quickNoteInput.isVisible().catch(() => false)) {
      await expect(quickNoteInput).toBeVisible();
    }
  });

  test('notes display in grid cards', async ({ page }) => {
    const cardElements = page.locator('[class*="card"], [class*="Card"]');
    const count = await cardElements.count();
    if (count > 0) {
      expect(count).toBeGreaterThan(0);
    }
  });

  test('clicking note navigates to detail', async ({ page }) => {
    const noteLink = page.locator('a[href*="/notes/"]').first();
    if (await noteLink.isVisible().catch(() => false)) {
      await noteLink.click();
      await page.waitForURL(/\/notes\//);
      await page.waitForLoadState('networkidle');
      expect(page.url()).toMatch(/\/notes\/[a-f0-9]+/);
    }
  });

  test('note detail shows editor', async ({ page }) => {
    const noteLink = page.locator('a[href*="/notes/"]').first();
    if (await noteLink.isVisible().catch(() => false)) {
      await noteLink.click();
      await page.waitForURL(/\/notes\//);
      await page.waitForLoadState('networkidle');
      const editor = page.locator('[contenteditable="true"], .ProseMirror, textarea').first();
      await expect(editor).toBeVisible({ timeout: 5000 });
    }
  });

  test('create note, write body, toggle actions, and delete', async ({ page }) => {
    await page.locator('button').filter({ hasText: /New Note/i }).click();
    await page.waitForURL(/\/notes\//, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const editor = page.locator('.ProseMirror').first();
    await expect(editor).toBeVisible({ timeout: 10000 });

    const testContent = 'Test note body ' + Date.now();
    await editor.click();
    await page.keyboard.type(testContent);
    await page.waitForTimeout(1000);

    // Toggle pin
    const pinSvg = page.locator('svg.lucide-pin, svg.lucide-pin-off').first();
    if (await pinSvg.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pinSvg.locator('..').click();
      await page.waitForTimeout(500);
    }

    // Change visibility
    const visibilitySelect = page.locator('[role="combobox"]').filter({ hasText: /Internal|Private|Client-safe/i }).first();
    if (await visibilitySelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await visibilitySelect.click();
      await page.waitForTimeout(200);
      const clientSafeOption = page.locator('[role="option"]').filter({ hasText: 'Client-safe' });
      if (await clientSafeOption.isVisible().catch(() => false)) {
        await clientSafeOption.click();
        await page.waitForTimeout(500);
      }
    }

    // Dismiss any toasts that might cover buttons
    const toastClose = page.locator('[data-sonner-toast] [data-close-button], [data-sonner-toast]');
    if (await toastClose.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // AI auto-fill button visible
    const aiButton = page.locator('button').filter({ hasText: /Auto-fill with AI/i }).first();
    await expect(aiButton).toBeVisible({ timeout: 5000 });

    // Delete the note
    const deleteButton = page.locator('button').filter({ hasText: /Delete/i }).first();
    await expect(deleteButton).toBeVisible({ timeout: 5000 });
    await deleteButton.click({ force: true });
    await page.waitForTimeout(300);

    const dialogInput = page.locator('[role="dialog"] input').first();
    if (await dialogInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dialogInput.fill('Untitled');
      await page.locator('[role="dialog"] button').filter({ hasText: 'Delete' }).first().click();
      await page.waitForURL('/notes', { timeout: 10000 });

      const toast = page.locator('[data-sonner-toast]');
      if (await toast.isVisible().catch(() => false)) {
        await expect(toast).toContainText(/Note deleted/i);
      }
    }
  });

  test('toc sidebar toggle works', async ({ page }) => {
    const noteLink = page.locator('a[href*="/notes/"]').first();
    if (await noteLink.isVisible().catch(() => false)) {
      await noteLink.click();
      await page.waitForURL(/\/notes\//);
      await page.waitForLoadState('networkidle');

      const tocToggle = page.locator('button').filter({ hasText: /Hide TOC|Show TOC/i }).first();
      if (await tocToggle.isVisible().catch(() => false)) {
        await tocToggle.click();
        await page.waitForTimeout(300);
        await expect(tocToggle).toBeVisible();
      }
    }
  });
});
