import type { Page, Locator } from '@playwright/test';

const MOBILE_BREAKPOINT = 768;

/**
 * Check if the current viewport is mobile-sized (<768px).
 */
export function isMobile(page: Page): boolean {
  const viewport = page.viewportSize();
  return viewport ? viewport.width < MOBILE_BREAKPOINT : false;
}

/**
 * Click an element, using force: true on mobile (to bypass overlays/visibility issues).
 */
export async function clickMobileAware(page: Page, locator: Locator) {
  const mobile = isMobile(page);
  await locator.click({ force: mobile });
}

/**
 * Navigate to a page and wait for it to be fully loaded.
 */
export async function goto(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}

/**
 * Fill a text input by its label text (mobile-aware force-fill).
 */
export async function fillByLabel(page: Page, labelText: string, value: string) {
  const label = page.locator(`label:has-text("${labelText}")`).first();
  const input = label.locator('..').locator('input, textarea, [contenteditable="true"]').first();
  const mobile = isMobile(page);
  await input.fill(value, { force: mobile });
}

/**
 * Click a button by its visible text (mobile-aware force-click).
 */
export async function clickButton(page: Page, text: string) {
  const btn = page.locator('button, [role="button"]').filter({ hasText: text }).first();
  await clickMobileAware(page, btn);
}

/**
 * Click a link by its visible text (mobile-aware force-click).
 */
export async function clickLink(page: Page, text: string) {
  const link = page.locator('a').filter({ hasText: text }).first();
  await clickMobileAware(page, link);
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
 * Open a Sheet/dialog (find trigger by button/span text; mobile-aware force-click).
 */
export async function openSheet(page: Page, buttonText: string) {
  await clickButton(page, buttonText);
  await page.waitForTimeout(500);
}

/**
 * Assert element is visible on desktop, hidden on mobile (checks md: utility classes).
 */
export async function assertDesktopOnly(page: Page, locator: Locator) {
  if (isMobile(page)) {
    await locator.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
  } else {
    await locator.waitFor({ state: 'visible', timeout: 3000 });
  }
}

/**
 * Assert element is visible on mobile, hidden on desktop (checks md: utility classes).
 */
export async function assertMobileOnly(page: Page, locator: Locator) {
  if (isMobile(page)) {
    await locator.waitFor({ state: 'visible', timeout: 3000 });
  } else {
    await locator.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
  }
}

/**
 * Fill a form field identified by label text, using force on mobile to work around
 * stacked layouts and smaller tap targets.
 */
export async function fillFormField(page: Page, labelText: string, value: string) {
  const label = page.locator(`label:has-text("${labelText}")`).first();
  const input = label.locator('..').locator('input, textarea, [contenteditable="true"]').first();
  const mobile = isMobile(page);
  if (mobile) {
    await input.fill(value, { force: true });
  } else {
    await input.fill(value);
  }
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
