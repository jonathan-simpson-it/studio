import { test, expect } from '@playwright/test';

test.describe('AI Flow — Tickets & Notes', () => {

  async function testAIAction(page: any, action: string, context: Record<string, unknown>) {
    const response = await page.request.post('/api/ai/generate', {
      data: { action, context },
    });

    // Accept either 200 (success) or 500 (AI unavailable, e.g. no API key)
    expect([200, 500]).toContain(response.status());

    const body = await response.json();

    if (response.status() === 200) {
      expect(body).toHaveProperty('content');
      expect(body).toHaveProperty('modelUsed');
      expect(body).toHaveProperty('latencyMs');
      expect(body).toHaveProperty('fallbackUsed');
      expect(typeof body.content).toBe('string');
      expect(body.content.length).toBeGreaterThan(0);
    } else {
      // On 500, the endpoint should return an error message
      expect(body).toHaveProperty('error');
      expect(typeof body.error).toBe('string');
    }
  }

  test('POST /api/ai/generate with restructure-ticket action', async ({ page }) => {
    await testAIAction(page, 'restructure-ticket', {
      title: 'Login page is broken',
      original_message: 'The login page on our dashboard is not working. When I enter my credentials and click submit, nothing happens.',
      contact_name: 'John Doe',
      contact_email: 'john@example.com',
    });
  });

  test('POST /api/ai/generate with tag-ticket action', async ({ page }) => {
    await testAIAction(page, 'tag-ticket', {
      title: 'Cannot access admin panel',
      description: 'Getting 403 forbidden error when trying to access /admin route.',
    });
  });

  test('POST /api/ai/generate with review-ticket-tags action', async ({ page }) => {
    await testAIAction(page, 'review-ticket-tags', {
      title: 'Database connection timeout',
      description: 'Production database keeps disconnecting after 30 seconds of inactivity.',
      client_tags: ['Database', 'Bug Fix'],
    });
  });

  test('POST /api/ai/generate with autofill-note action', async ({ page }) => {
    await testAIAction(page, 'autofill-note', {
      title: 'Client meeting notes',
      existing_body: '',
    });
  });

  test('POST /api/ai/generate with invalid action returns 400', async ({ page }) => {
    const response = await page.request.post('/api/ai/generate', {
      data: {
        action: 'nonexistent-action',
        context: { test: true },
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('POST /api/ai/generate without auth returns 401', async ({ page }) => {
    await page.context().clearCookies();

    const response = await page.request.post('/api/ai/generate', {
      data: {
        action: 'tag-ticket',
        context: { title: 'Test' },
      },
    });

    expect(response.status()).toBe(401);

    // Restore auth
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });
});
