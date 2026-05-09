# Studio AI Architecture — Agent Reference

This document describes the AI layer of Studio for use by autonomous agents, LLM tool-calling systems, and developers integrating with the platform.

---

## Base URL

`https://studio.jonathansimpson.co` (or `http://localhost:3000` in development)

---

## Endpoints

### `POST /api/ai/generate`

Generate content for any registered AI action.

**Request:**
```json
{
  "action": "generate-proposal",
  "context": { "...": "..." },
  "useFallback": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | string | yes | One of the 12 AI action types (see below) |
| `context` | object | yes | Action-specific data payload |
| `useFallback` | boolean | no | If `true`, retries with `fast` model on primary failure |

**Response:**
```json
{
  "content": "generated text…",
  "modelUsed": "nvidia/nemotron-3-super:free",
  "latencyMs": 2341,
  "fallbackUsed": false
}
```

**Authentication:** Supabase session cookie (for humans) or `Authorization: Bearer <api_key>` (for agents with `write` or `full` scope).

**cURL example:**
```bash
curl -X POST https://studio.jonathansimpson.co/api/ai/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer st_abc123..." \
  -d '{
    "action": "generate-project-summary",
    "context": { "name": "Website Redesign", "status": "In Progress" }
  }'
```

---

### `GET /api/ai/models`

List all registered models and the action-to-model mapping.

**Response:**
```json
{
  "models": {
    "default": "openai/gpt-oss-120b:free",
    "longform": "nvidia/nemotron-3-super:free",
    "structured": "minimax/minimax-m2.5:free",
    "multilingual": "google/gemma-4-31b:free",
    "fast": "z-ai/glm-4.5-air:free"
  },
  "actions": {
    "generate-proposal": { "modelKey": "longform", "modelName": "nvidia/nemotron-3-super:free" },
    "draft-email": { "modelKey": "default", "modelName": "openai/gpt-oss-120b:free" }
  }
}
```

**Authentication:** Supabase session or API key with `read` scope.

---

### `POST /api/ai/test-model`

Ping a model to verify it responds and measure latency.

**Request:**
```json
{ "modelKey": "longform" }
```

**Response:**
```json
{ "ok": true, "modelUsed": "nvidia/nemotron-3-super:free", "latencyMs": 1200 }
```

---

## Model Registry

| Key | Model Name | Best For |
|-----|------------|----------|
| `default` | `openai/gpt-oss-120b:free` | General purpose, summaries, emails |
| `longform` | `nvidia/nemotron-3-super:free` | Proposals, reports, audits |
| `structured` | `minimax/minimax-m2.5:free` | Invoices, tool docs, structured output |
| `multilingual` | `google/gemma-4-31b:free` | Multi-language client emails |
| `fast` | `z-ai/glm-4.5-air:free` | Quick tasks, autofill, GitHub issues, fallback |

Models are NOT user-editable in v1. To change a model assignment, edit `ACTION_MODEL_MAP` in `lib/ai.ts`.

---

## Action Types (12)

| Action | Model | Input Context | Output |
|--------|-------|---------------|--------|
| `generate-proposal` | longform | Client, project description, services, deal value, currency | Full proposal with cover note, scope, timeline, line items, payment terms |
| `generate-invoice` | structured | Project, milestones, billing type, line items | Invoice line items + payment terms |
| `generate-project-summary` | default | Name, description, status, milestones, issues | Markdown summary |
| `generate-monthly-report` | longform | Revenue, costs, milestones, issues, tasks | Markdown narrative |
| `generate-audit` | longform | All project data | Markdown delivery audit |
| `generate-tool-documentation` | structured | Module description | Markdown usage guide |
| `create-github-issue` | fast | Title, description, project context, repo | Issue body + labels |
| `draft-email` | default | Recipient, purpose, context | Professional email with subject line |
| `generate-follow-up-email` | fast | Previous conversation, proposal reference | Short 3–5 sentence follow-up |
| `generate-multilingual-email` | multilingual | Email content, target language | Translated email |
| `autofill-note` | fast | Context, related entities | Concise markdown bullet points |
| `autofill-task-description` | fast | Task title, project context | Description with acceptance criteria |

---

## System Prompts

Every request includes:
- An **action-specific system prompt** defining the role (proposal writer, project manager, etc.)
- A **shared agency context** block:
  ```
  Agency: Jonathon Simpson & Co.
  Location: Hong Kong
  Services: website development, mobile apps, database management, analytics dashboards, CRM, SEO, copywriting, automation, AI chatbots, voice agents, RAG systems, workflow automation, predictive models, computer vision, internal productivity tools, backend architecture, API development, DevOps, cloud setup, cybersecurity hardening, QA/testing, performance optimisation, data warehousing.
  ```

All prompts are in `lib/ai.ts`.

---

## Fallback Behaviour

`generateWithFallback(action, context)` wraps the primary call:
1. Attempt the model assigned to the action (e.g. `longform` for a proposal)
2. If the call throws an error, retry with the `fast` model (`z-ai/glm-4.5-air:free`)
3. Return both the content and a `fallbackUsed` boolean

The Route Handler accepts a `useFallback: true` flag to enable this automatically.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key (replaces DEEPSEEK_API_KEY) |
| `NEXT_PUBLIC_APP_URL` | Yes | Sent as `HTTP-Referer` header on every OpenRouter request |

---

## Internal Architecture (`lib/ai.ts`)

```
MODEL_REGISTRY        → { default, longform, structured, multilingual, fast }
ACTION_MODEL_MAP      → action → modelKey
resolveModel(action)  → modelName string
callOpenRouter()      → raw OpenRouter API call with headers
generateAIContent()   → public: returns content string only
generateWithFallback() → public: retries with fast on failure, returns metadata
testModel()           → public: minimal ping for latency check
getActionModelMap()   → public: returns action→model mapping for Settings UI
```
