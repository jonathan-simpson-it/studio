# Studio — Manual Setup Guide

This document covers everything that cannot be done by the build process and must be completed manually.

---

## 1. MongoDB Atlas Setup

### 1.1 Create Cluster
1. Go to [mongodb.com/atlas](https://mongodb.com/atlas) and sign up or log in
2. Click **Build a Cluster** and choose the M0 free tier (or higher for production)
3. Select a cloud provider and region (choose one close to your users)
4. Name your cluster (e.g. `studio-prod`)

### 1.2 Configure Network Access
1. Go to **Network Access** in the left sidebar
2. Click **Add IP Address**
3. For development: add your current IP
4. For production (Vercel): add `0.0.0.0/0` (allow from anywhere — MongoDB Atlas handles auth via connection string credentials)
5. Click **Confirm**

### 1.3 Create Database User
1. Go to **Database Access** in the left sidebar
2. Click **Add New Database User**
3. Choose **Password** authentication method
4. Set username and password (save these securely)
5. Under **Built-in Role**, select **Read and write to any database**
6. Click **Add User**

### 1.4 Get Connection String
1. Go to **Database → Connect**
2. Choose **Drivers**
3. Select **Node.js** and version **6.0 or later**
4. Copy the connection string
5. Replace `<password>` with your database user's password
6. Replace `<dbname>` with your database name (e.g. `prod`)

Your connection string should look like:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/prod?appName=Cluster0
```

### 1.5 Enable Backup (Production Only)
1. Go to your cluster
2. Click the **...** menu and select **Edit Configuration**
3. Enable **Cloud Backups** and choose a schedule
4. For M0 clusters, backups must be taken manually — upgrade to M2+ for automated snapshots

**No manual migration step is needed.** Mongoose auto-creates collections and indexes on first write. Keep your Mongoose models in `lib/db/models/` as the source of truth.

---

## 2. OAuth App Configuration

### 2.1 GitHub OAuth
1. Go to GitHub **Settings → Developer Settings → OAuth Apps → New OAuth App**
2. **Application name:** `Studio (Production)`
3. **Homepage URL:** `https://studio.jonathansimpson.co`
4. **Authorization callback URL:** `https://studio.jonathansimpson.co/api/auth/callback/github`
5. Click **Register application**
6. Copy the **Client ID**
7. Click **Generate a new client secret** and copy the secret
8. Set `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` in Vercel

For local development, create a separate OAuth app with callback URL `http://localhost:3000/api/auth/callback/github`.

### 2.2 Google OAuth (Calendar + Gmail)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Go to **APIs & Services → Library**
4. Enable **Google Calendar API** and **Gmail API**
5. Go to **APIs & Services → Credentials**
6. Click **Create Credentials → OAuth 2.0 Client ID**
7. If not configured, set the **OAuth consent screen** (External, add your email as test user)
8. **Application type:** Web application
9. **Name:** `Studio (Production)`
10. **Authorized redirect URIs:** `https://studio.jonathansimpson.co/api/auth/callback/google`
11. Click **Create**
12. Copy the **Client ID** and **Client Secret**
13. Set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` in Vercel

For local development, create a separate OAuth client with redirect URI `http://localhost:3000/api/auth/callback/google`.

---

## 3. Vercel Deployment

### 3.1 Create Project
1. Push the code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and import the repo
3. The **Framework Preset** will auto-detect Next.js
4. If this project is in a subdirectory, set the **Root Directory**

### 3.2 Environment Variables
Add ALL variables from the template to Vercel:
- `MONGODB_URI`
- `AUTH_SECRET` (generate: `openssl rand -hex 32`)
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `FOUNDER_INVITE_CODE` (choose a secret value)
- `GITHUB_TOKEN`
- `GITHUB_ORG`
- `OPENROUTER_API_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM` (default: `studio@jonathansimpson.co`)
- `ENCRYPTION_KEY` (generate: `openssl rand -hex 32`)
- `NEXT_PUBLIC_APP_URL` (default: `https://studio.jonathansimpson.co`)
- `CRON_SECRET` (generate: `openssl rand -hex 16`)

### 3.3 Custom Domain
1. Go to **Project Settings → Domains**
2. Add `studio.jonathansimpson.co`
3. Configure DNS as instructed by Vercel

### 3.4 Verify Cron Jobs
1. Go to **Deployments** and trigger a manual deploy
2. After deployment, check **Project Settings → Cron Jobs**
3. Verify jobs exist for:
   - `/api/cron/sync-github` — every 30 minutes
   - `/api/cron/check-overdue` — daily at 1 AM UTC
   - `/api/cron/send-reminders` — daily
   - `/api/cron/sync-google-calendars` — periodic
   - `/api/cron/sync-gmail` — periodic
   - `/api/cron/sync-feeds` — periodic

---

## 4. External Service Setup

### 4.1 Resend
1. Create an account at [resend.com](https://resend.com)
2. Add and verify the domain `studio.jonathansimpson.co`
3. Create an API key and add it to Vercel as `RESEND_API_KEY`
4. Add the API key in the app: Settings → Integrations → Resend

### 4.2 OpenRouter
1. Create an account at [openrouter.ai](https://openrouter.ai)
2. Generate an API key from the dashboard
3. Add it to Vercel as `OPENROUTER_API_KEY`
4. Add the API key in the app: Settings → Integrations → OpenRouter
5. Use the per-model **Ping** buttons in Settings → Integrations → AI Models to verify each model responds

### 4.3 GitHub
1. Create a GitHub Personal Access Token (classic) with `repo` scope
2. Add it to Vercel as `GITHUB_TOKEN`
3. Add `GITHUB_ORG` to Vercel
4. Add the token in the app: Settings → Integrations → GitHub
5. Enter the GitHub org name
6. Click "Test Connection" to verify

### 4.4 Google
1. After configuring OAuth (section 2.2), sign in to Studio
2. Go to **Settings → Integrations → Google**
3. Click "Connect Google Account"
4. Grant Calendar and Gmail permissions
5. Verify the connection appears in Settings

### 4.5 Encryption Key
Generate a 32-byte hex string for the `ENCRYPTION_KEY`:
```bash
openssl rand -hex 32
```
This encrypts API keys stored in the `integrations` table.

### 4.6 Cron Secret
Generate a random string for `CRON_SECRET`:
```bash
openssl rand -hex 16
```
This protects cron endpoints from unauthorized access.

---

## 5. Post-Launch Configuration

### 5.1 Register Founders
1. Navigate to `https://studio.jonathansimpson.co/register`
2. Enter the invite code set as `FOUNDER_INVITE_CODE`
3. Register each founder with their email and a strong password
4. Founders can also link their GitHub and Google accounts from Settings

### 5.2 Agency Settings
1. Go to **Settings → Agency**
2. Set the agency address (appears on invoices/proposals)
3. Set default currency
4. Upload agency logo (appears on PDF documents)

### 5.3 Profile Settings
1. Each founder should go to **Settings → Profile**
2. Set their timezone (Lewis in HKT, Devano in his timezone)
3. Set default hourly rate if using time tracking

### 5.4 Templates
1. Go to **Settings → Templates**
2. Set default invoice payment terms
3. Set default proposal payment terms
4. Set default proposal scope template

### 5.5 Project Templates (Optional)
1. Go to **Settings → Templates**
2. Create project templates with default task lists
3. Use these when creating new projects

### 5.6 API Keys (For Agent Integrations)
1. Go to **Settings → Integrations → API Keys**
2. Click "Generate Key"
3. Name it (e.g., "Agent Bot" or "CRM Integration")
4. Select scope (read/write/full)
5. Copy the key immediately — it is shown only once
6. The raw key is never stored, only its hash

### 5.7 CRM API Key (Portfolio Site)
If your portfolio site sends leads to Studio:
1. Generate an API key with `write` scope (section 5.6)
2. Add it as `CRM_API_KEY` on the portfolio site
3. Test: `curl -X POST https://studio.jonathansimpson.co/api/leads -H "Authorization: Bearer <key>" -H "Content-Type: application/json" -d '{"contact_name":"Test","email":"test@example.com"}'`

---

## 6. Things the Build Cannot Do

| Task | Reason |
|------|--------|
| Create MongoDB Atlas cluster | Requires your MongoDB account and billing |
| Configure network access | Manual step in MongoDB Atlas dashboard |
| Create database user | Manual step in MongoDB Atlas dashboard |
| Set environment variables | API keys are secrets, not committed |
| Configure DNS | Requires your domain registrar |
| Create Vercel project | Requires your Vercel account |
| Create OAuth apps (GitHub/Google) | Requires your GitHub and Google Cloud accounts |
| Create Resend account | Requires your email and domain verification |
| Create OpenRouter API key | Requires your OpenRouter account |
| Create GitHub token | Requires your GitHub account |
| Register founders | Must be done post-deployment via `/register` |
| Upload agency logo | Manual file upload via Settings UI |
| Add API keys in Settings UI | Done after login, not during build |
| Verify external connections | Manual "Test Connection" button clicks |

---

## 7. First Login

1. Navigate to `https://studio.jonathansimpson.co` (or `http://localhost:3000` locally)
2. Click **Register** and enter your invite code
3. Create your account with email and password
4. You'll land on the Dashboard
5. Start by configuring Settings → Agency and Settings → Integrations
6. Connect your Google account for Calendar + Gmail sync
7. Create your first lead or project
