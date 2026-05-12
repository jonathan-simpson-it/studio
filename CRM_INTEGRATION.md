# Studio CRM Integration — Portfolio Site

## Overview

When a visitor submits the contact/quote form on the portfolio site, send the data to Studio's internal CRM (`studio.jonathansimpson.co`) to create a lead. This happens **after** the form submission success response is sent to the user — never block the user on CRM latency.

---

## Endpoint

```
POST https://studio.jonathansimpson.co/api/leads
Content-Type: application/json
Authorization: Bearer <CRM_API_KEY>
```

---

## Auth

The API key must be generated inside Studio and stored as an environment variable on the portfolio site:

```
CRM_API_KEY=<key-from-studio>
```

Include it in the `Authorization` header as a Bearer token on every request.

### How to Generate an API Key

1. Log into Studio
2. Go to Settings → Team/Api Keys (once the key generation UI is built, otherwise insert via Supabase dashboard SQL)
3. Scope required: `write`

---

## Request Body

| Field | Type | Required | Description | Portfolio Form Mapping |
|-------|------|----------|-------------|----------------------|
| `contact_name` | string | if no email | Person's full name | `name` from form |
| `email` | string | if no name | Email address | `email` from form |
| `company_name` | string | no | Company or organisation name | — (omit if not collected) |
| `phone` | string | no | Phone number | `phone` from form |
| `persona` | string | no | Role / category / who they are | `persona` from form |
| `interest` | string | no | Service they're enquiring about | `interest` from form |
| `message` | string | no | Free-text message | `message` from form |

**Minimal valid body:**
```json
{ "contact_name": "Jane Smith", "email": "jane@example.com" }
```

**Full example:**
```json
{
  "contact_name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+852 1234 5678",
  "company_name": "Acme Corp",
  "persona": "CTO",
  "interest": "Custom CRM development",
  "message": "We need a custom internal system for managing client onboarding."
}
```

---

## Responses

### Success (201)
```json
{
  "success": true,
  "id": "uuid-of-new-lead",
  "lead": { ... }
}
```

### Duplicate email (409)
```json
{ "error": "Lead with this email already exists" }
```
Leads are deduplicated by email — resubmitting the same email updates the existing lead rather than creating a duplicate.

### Auth failure (401)
```json
{ "error": "Invalid API key" }
```

### Validation error (400)
```json
{ "error": "contact_name or email required" }
```

---

## Field Mapping Details

| Portfolio field | Studio CRM field | Notes |
|----------------|-----------------|-------|
| `name` | `contact_name` | Maps directly |
| `email` | `email` | Used as dedup key |
| `phone` | `phone` | Maps directly |
| `persona` | `services_interested[]` | Stored in an array field (e.g. "CTO" → `["CTO"]`) |
| `interest` | `services_interested[]` | Appended to the same array as persona |
| `message` | `notes` | Full free-text message |
| — | `source` | Hardcoded to `"Inbound"` |
| — | `stage` | Hardcoded to `"New"` |

---

## Implementation Notes for the Portfolio Agent

### Flow
```
User submits form → Your backend sends success response → Fire-and-forget POST to Studio CRM
```

### Resilience
- **Timeout**: Set a 5-second timeout on the fetch. If it hangs, abort.
- **Failure handling**: Log the error. Never show a CRM error to the user.
- **Idempotency**: The same email can be re-sent safely — the 409 response is harmless.
- **Don't await CRM**: The final user-facing success response should be sent **before** the CRM call, not after.

### Required Environment Variable
Add `CRM_API_KEY` to the portfolio site's environment variables. See "How to Generate an API Key" above.

---

## Testing

To verify the integration works, make a test curl from your dev machine:

```bash
curl -X POST https://studio.jonathansimpson.co/api/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-api-key>" \
  -d '{
    "contact_name": "Test Lead",
    "email": "test@example.com",
    "message": "Test submission from portfolio"
  }'
```

You should get a `201` response. The lead will appear in Studio under **Leads**.
