import type { Page } from '@playwright/test';
import path from 'path';

/**
 * Navigate to a page and wait for it to be fully loaded.
 */
export async function goto(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}

/**
 * Fill a text input by its label text.
 * Finds the nearest input/textarea sibling or descendant of the label.
 */
export async function fillByLabel(page: Page, labelText: string, value: string) {
  const label = page.locator(`label:has-text("${labelText}")`).first();
  // Try finding input inside the label's parent container
  const input = label.locator('..').locator('input, textarea, [contenteditable="true"]').first();
  if (await input.isVisible().catch(() => false)) {
    await input.fill(value);
    return;
  }
  // Fallback: find by id via htmlFor
  const forId = await label.getAttribute('for');
  if (forId) {
    const byId = page.locator(`#${forId}`);
    if (await byId.isVisible().catch(() => false)) {
      await byId.fill(value);
      return;
    }
  }
  // Last resort: find by type
  const inputById = page.locator(`input[id$="${labelText.toLowerCase().replace(/\s+/g, '_')}"]`);
  if (await inputById.isVisible().catch(() => false)) {
    await inputById.fill(value);
  }
}

/**
 * Click a button by its visible text.
 */
export async function clickButton(page: Page, text: string) {
  await page.locator('button, [role="button"]').filter({ hasText: text }).first().click();
}

/**
 * Wait for a sonner toast to appear and check its text.
 */
export async function expectToast(page: Page, text: string) {
  await page.waitForTimeout(500);
  const toast = page.locator('[data-sonner-toast]').filter({ hasText: text });
  await toast.waitFor({ state: 'visible', timeout: 8000 });
}

/**
 * Open a Sheet/dialog (find trigger by button/span text).
 */
export async function openSheet(page: Page, buttonText: string) {
  await page.locator('button').filter({ hasText: buttonText }).first().click();
  await page.waitForTimeout(500);
}

/**
 * Select an option in a shadcn Select component.
 */
export async function selectOption(page: Page, labelText: string, optionText: string) {
  const label = page.locator(`label:has-text("${labelText}")`).first();
  const trigger = label.locator('..').locator('[role="combobox"]').first();
  if (await trigger.isVisible().catch(() => false)) {
    await trigger.click();
    await page.waitForTimeout(200);
    const option = page.locator('[role="option"]').filter({ hasText: optionText });
    if (await option.isVisible().catch(() => false)) {
      await option.click();
      return;
    }
  }
  // Try finding combobox by placeholder
  const combo = page.locator('[role="combobox"]').filter({ hasText: labelText }).first();
  if (await combo.isVisible().catch(() => false)) {
    await combo.click();
    await page.waitForTimeout(200);
    const option = page.locator('[role="option"]').filter({ hasText: optionText });
    if (await option.isVisible().catch(() => false)) {
      await option.click();
    }
  }
}
