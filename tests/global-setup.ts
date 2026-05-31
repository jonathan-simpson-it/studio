import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(__dirname, '..', '.env.local') });

import { MongoClient } from 'mongodb';
import { chromium } from '@playwright/test';

const TEST_USER = {
  email: 'e2e-test@studio.test',
  password: 'TestPassword123!',
  full_name: 'E2E Test Founder',
  role: 'founder',
  timezone: 'Asia/Hong_Kong',
  default_hourly_rate: 150,
};

async function getOrCreateTestUser() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI env var not set');

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const users = db.collection('users');

  let user = await users.findOne({ email: TEST_USER.email });

  if (!user) {
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(TEST_USER.password, 12);

    const result = await users.insertOne({
      email: TEST_USER.email,
      passwordHash,
      full_name: TEST_USER.full_name,
      role: TEST_USER.role,
      timezone: TEST_USER.timezone,
      default_hourly_rate: TEST_USER.default_hourly_rate,
      avatar_url: null,
      avatar_provider: null,
      github_id: null,
      github_username: null,
      google_id: null,
      google_email: null,
      created_at: new Date(),
    });
    user = await users.findOne({ _id: result.insertedId });
  }

  await client.close();
  return user!;
}

export default async function globalSetup() {
  const user = await getOrCreateTestUser();
  const userId = user._id.toString();

  // Use real browser login to get proper session cookies
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');

  // Fill login form
  await page.fill('input[id="email"]', TEST_USER.email);
  await page.fill('input[id="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  const url = page.url();
  if (url.includes('/login')) {
    throw new Error('Login failed in global setup — still on login page');
  }

  // Store session state for reuse across tests
  await page.context().storageState({ path: path.resolve(__dirname, '.auth.json') });

  await browser.close();

  process.env.TEST_USER_ID = userId;
  process.env.TEST_USER_EMAIL = TEST_USER.email;
}
