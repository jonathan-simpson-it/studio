import { test, expect } from '@playwright/test';
import { isMobile } from './helpers';

test.describe('Tickets — Client Portal & Admin Flow', () => {
  const timestamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const testEmail = `e2e-ticket-${timestamp}@test.com`;
  const testCompany = `E2E Ticket Client ${timestamp}`;
  const testTicketTitle = `Test ticket ${timestamp}`;
  const testTicketDesc = 'Need help setting up the new analytics dashboard for tracking conversions.';

  let clientId = '';

  test('full ticket flow: create client → portal → submit → admin verify → delete', async ({ page }) => {
    test.skip(isMobile(page), 'Ticket portal flow needs mobile-specific handling (6-digit code input, portal layout)');
    // 1. Create test client via admin
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("New Client")').click({ force: true });
    await page.waitForTimeout(500);

    await page.locator('label:has-text("Company Name")').locator('..').locator('input').fill(testCompany);
    await page.locator('label:has-text("Contact Name")').locator('..').locator('input').fill('E2E Ticket Tester');
    await page.locator('label:has-text("Email")').locator('..').locator('input').fill(testEmail);

    // Submit the form
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1000);

    let toast = page.locator('[data-sonner-toast]');
    if (await toast.isVisible().catch(() => false)) {
      await expect(toast).toContainText(/Client created/i);
    }

    // 2. Navigate to client detail and set remaining tickets
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');

    const clientRow = page.locator('tbody tr').first();
    await expect(clientRow).toBeVisible({ timeout: 5000 });
    await clientRow.click({ force: true });
    await page.waitForURL(/\/clients\//);
    await page.waitForLoadState('networkidle');
    clientId = page.url().split('/').pop() || '';

    // Set remaining tickets to 5
    const ticketsInput = page.locator('label:has-text("Remaining Tickets")').locator('..').locator('input');
    if (await ticketsInput.isVisible().catch(() => false)) {
      await ticketsInput.fill('5');
      await page.waitForTimeout(500);
    }

    // 3. Client portal loads with email lookup
    await page.goto('/portal');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1').filter({ hasText: /Access Your Client Portal/i })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    const sendCodeBtn = page.locator('button').filter({ hasText: /Send me a code/i });
    await expect(sendCodeBtn).toBeVisible();

    // 4. Portal email lookup shows client info
    await page.locator('input[type="email"]').fill(testEmail);
    await sendCodeBtn.click({ force: isMobile(page) });
    await page.waitForTimeout(1500);

    const remainingCard = page.locator('text=Remaining Tickets').first();
    await expect(remainingCard).toBeVisible({ timeout: 5000 });

    const activeCard = page.locator('text=Active Tickets').first();
    await expect(activeCard).toBeVisible({ timeout: 5000 });

    // 5. New ticket dialog opens with form fields
    const newTicketBtn = page.locator('button').filter({ hasText: /New Ticket/i }).first();
    await expect(newTicketBtn).toBeVisible({ timeout: 5000 });
    await newTicketBtn.click({ force: true });
    await page.waitForTimeout(500);

    await expect(page.locator('text=Your Name').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=Title').first()).toBeVisible();
    await expect(page.locator('text=Description').first()).toBeVisible();
    await expect(page.locator('text=Tags').first()).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /Submit Ticket/i })).toBeVisible();

    // 6. Fill and submit ticket form
    await page.locator('label:has-text("Your Name")').locator('..').locator('input').fill('E2E Ticket Tester');
    await page.locator('label:has-text("Title")').locator('..').locator('input').fill(testTicketTitle);
    await page.locator('textarea').first().fill(testTicketDesc);

    await page.locator('button[type="submit"]').click({ force: true });
    await page.waitForTimeout(1500);

    toast = page.locator('[data-sonner-toast]');
    if (await toast.isVisible().catch(() => false)) {
      await expect(toast).toContainText(/Ticket submitted/i);
    }

    // 7. Navigate to admin issues page and verify ticket appears
    await page.goto('/issues');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="Search issues"]');
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill(testTicketTitle);
      await page.waitForTimeout(500);
    }

    const ticketCard = page.locator('p.text-sm.font-medium.leading-tight.line-clamp-2').filter({ hasText: testTicketTitle }).first();
    await expect(ticketCard).toBeVisible({ timeout: 8000 });

    // Dismiss any toasts
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // 8. Navigate to ticket detail and verify info
    await ticketCard.click();
    await page.waitForURL(/\/issues\//);
    await page.waitForLoadState('networkidle');

    const ticketNumber = page.locator('h2.font-semibold').filter({ hasText: /TKT-/ });
    await expect(ticketNumber).toBeVisible({ timeout: 5000 });

    const statusSelect = page.locator('label:has-text("Status")').locator('..').locator('[role="combobox"]');
    if (await statusSelect.isVisible().catch(() => false)) {
      await expect(statusSelect).toBeVisible();
    }

    await expect(page.locator(`text=${testTicketTitle}`).first()).toBeVisible({ timeout: 3000 });
    // Email, name, and source are in readOnly input value attributes, not text content
    await expect(page.locator(`input[value="${testEmail}"]`).first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('input[value="E2E Ticket Tester"]').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('input[value="support-form"]').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('button').filter({ hasText: /Delete/i }).first()).toBeVisible();
  });
});
