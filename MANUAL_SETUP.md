# Studio — Manual Setup Guide

This document covers everything that cannot be done by the build process and must be completed manually.

---

## 1. Supabase Setup

### 1.1 Create Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a strong database password and save it
3. Note your project URL and anon key from **Project Settings → API**
4. Note your `service_role` key from the same page

### 1.2 Run Migration
1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Open `supabase/migrations/001_initial.sql` from this project
4. Paste and execute the entire file
5. Verify all tables were created (you should see 22 tables)

### 1.3 Create Storage Bucket
1. Go to **Storage** in the Supabase dashboard
2. Create a new bucket called `studio-files`
3. Set it to **private** (not public)
4. Add an RLS policy using the SQL Editor:

```sql
CREATE POLICY "founders_all_studio_files" ON storage.objects
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'founder')
  );
```

### 1.4 Create Auth Users
1. Go to **Authentication → Users**
2. Click **Add User**
3. Create a user for Lewis Simpson: `lewis@jonathansimpson.co`
4. Create a user for Devano Jonathan: `devano@jonathansimpson.co`
5. Note their UUIDs from the user list

### 1.5 Seed Users Table
Run the following in SQL Editor (replace UUIDs with actual values):

```sql
INSERT INTO users (id, email, full_name, role)
VALUES
  ('ACTUAL-AUTH-UUID-LEWIS', 'lewis@jonathansimpson.co', 'Lewis Simpson', 'founder'),
  ('ACTUAL-AUTH-UUID-DEVANO', 'devano@jonathansimpson.co', 'Devano Jonathan', 'founder');
```

### 1.6 Set Up Row-Level Security
The migration already enables RLS on all tables and creates founder policies.
Verify by checking **Authentication → Policies** in the dashboard.

### 1.7 Enable Point-in-Time Recovery (PITR)
Go to **Project Settings → Database** and enable PITR for daily automated backups.

---

## 2. Vercel Deployment

### 2.1 Create Project
1. Push the code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Set the **Framework Preset** to Next.js
4. Set the **Root Directory** to `studio/` (if this project is in a subdirectory)

### 2.2 Environment Variables
Add ALL variables from `.env.local` to Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GITHUB_TOKEN`
- `GITHUB_ORG`
- `OPENROUTER_API_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM` (default: `studio@jonathansimpson.co`)
- `ENCRYPTION_KEY` (generate a 32-byte hex string)
- `NEXT_PUBLIC_APP_URL` (default: `https://studio.jonathansimpson.co`)
- `CRON_SECRET` (generate a random string)

### 2.3 Custom Domain
1. Go to **Project Settings → Domains**
2. Add `studio.jonathansimpson.co`
3. Configure DNS as instructed by Vercel

### 2.4 Verify Cron Jobs
1. Go to **Deployments** and trigger a manual deploy
2. After deployment, check **Project Settings → Cron Jobs**
3. Verify two jobs exist:
   - `/api/cron/sync-github` — every 30 minutes
   - `/api/cron/check-overdue` — daily at 1 AM UTC

---

## 3. External Service Setup

### 3.1 Resend
1. Create an account at [resend.com](https://resend.com)
2. Add and verify the domain `studio.jonathansimpson.co`
3. Create an API key and add it to Vercel as `RESEND_API_KEY`
4. Add the API key in the app: Settings → Integrations → Resend

### 3.2 OpenRouter
1. Create an account at [openrouter.ai](https://openrouter.ai)
2. Generate an API key from the dashboard
3. Add it to Vercel as `OPENROUTER_API_KEY`
4. Add the API key in the app: Settings → Integrations → OpenRouter
5. Use the per-model **Ping** buttons in Settings → Integrations → AI Models to verify each model responds

### 3.3 GitHub
1. Create a GitHub Personal Access Token (classic) with `repo` scope
2. Add it to Vercel as `GITHUB_TOKEN`
3. Add `GITHUB_ORG` to Vercel
4. Add the token in the app: Settings → Integrations → GitHub
5. Enter the GitHub org name
6. Click "Test Connection" to verify

### 3.4 Encryption Key
Generate a 32-byte hex string for the `ENCRYPTION_KEY`:
```bash
openssl rand -hex 32
```
This encrypts API keys stored in the `integrations` table.

### 3.5 Cron Secret
Generate a random string for `CRON_SECRET`:
```bash
openssl rand -hex 16
```
This protects cron endpoints from unauthorized access.

---

## 4. Post-Launch Configuration

### 4.1 Agency Settings
1. Log in to Studio
2. Go to **Settings → Agency**
3. Set the agency address (for invoices/proposals)
4. Set default currency
5. Upload agency logo (appears on PDF documents)

### 4.2 Profile Settings
1. Each founder should go to **Settings → Profile**
2. Set their timezone (Lewis in HKT, Devano in his timezone)
3. Set default hourly rate if using time tracking

### 4.3 Templates
1. Go to **Settings → Templates**
2. Set default invoice payment terms
3. Set default proposal payment terms
4. Set default proposal scope template

### 4.4 Project Templates (Optional)
1. Go to **Settings → Templates**
2. Create project templates with default task lists
3. Use these when creating new projects

### 4.5 API Keys (For Agent Integrations)
1. Go to **Settings → Integrations → API Keys**
2. Click "Generate Key"
3. Name it (e.g., "Agent Bot")
4. Select scope (read/write/full)
5. Copy the key immediately — it is shown only once
6. The raw key is never stored, only its hash

---

## 5. Things the Build Cannot Do

| Task | Reason |
|------|--------|
| Create Supabase project | Requires your Supabase account and billing |
| Run SQL migrations | Requires Supabase dashboard access |
| Create Auth users | Manual step in Supabase Auth dashboard |
| Configure DNS | Requires your domain registrar |
| Create Vercel project | Requires your Vercel account |
| Set environment variables | API keys are secrets, not committed |
| Create Resend account | Requires your email and verification |
| Create DeepSeek API key | Requires your DeepSeek account |
| Create GitHub token | Requires your GitHub account |
| Upload agency logo | Manual file upload via Settings UI |
| Add API keys in Settings UI | Done after login, not during build |
| Verify external connections | Manual "Test Connection" button clicks |

---

## 6. First Login

1. Navigate to `https://studio.jonathansimpson.co` (or `http://localhost:3000` locally)
2. Log in with the email/password created in Supabase Auth
3. You'll land on the Dashboard
4. Start by configuring Settings → Agency and Settings → Integrations
5. Create your first lead or project
