import type { AIActionType, AIModelKey } from '@/types';

// ============================================================
// MODEL REGISTRY
// ============================================================

export const MODEL_REGISTRY: Record<AIModelKey, string> = {
  default: 'openai/gpt-oss-120b:free',
  longform: 'google/gemini-2.0-flash-exp:free',
  structured: 'mistralai/mistral-7b-instruct:free',
  multilingual: 'google/gemma-4-31b:free',
  fast: 'google/gemini-2.0-flash-exp:free',
};

const ACTION_MODEL_MAP: Record<string, AIModelKey> = {
  'draft-email': 'default',
  'generate-proposal': 'longform',
  'generate-invoice': 'structured',
  'generate-monthly-report': 'longform',
  'generate-audit': 'longform',
  'generate-follow-up-email': 'fast',
  'generate-multilingual-email': 'multilingual',
  'autofill-note': 'fast',
  'autofill-task-description': 'fast',
  'generate-project-summary': 'default',
  'generate-tool-documentation': 'structured',
  'create-github-issue': 'fast',
  'parse-event-nl': 'fast',
  'summarize-calendar': 'default',
  'parse-task': 'structured',
  'parse-github-issue': 'structured',
  'parse-email': 'structured',
  'parse-proposal': 'structured',
  'parse-invoice': 'structured',
};

function resolveModel(action: AIActionType): string {
  const key = ACTION_MODEL_MAP[action] || 'default';
  return MODEL_REGISTRY[key];
}

function resolveModelKey(action: AIActionType): AIModelKey {
  return ACTION_MODEL_MAP[action] || 'default';
}

export { resolveModelKey };

// ============================================================
// SYSTEM PROMPTS
// ============================================================

const SYSTEM_PROMPTS: Record<string, string> = {
  'draft-email': `You are a client communications specialist for Jonathon Simpson & Co., a Hong Kong-based software and automation agency.
Draft a professional email. Include a subject line, greeting, body, and professional signature.
Tone: professional, direct, modern.
Output plain text only. Do not use markdown formatting.`,

  'generate-proposal': `You are a proposal writer for Jonathon Simpson & Co., a Hong Kong-based software and automation agency.
Services: website development, mobile apps, database management, analytics dashboards, CRM, SEO, copywriting, automation, AI chatbots, voice agents, RAG systems, workflow automation, predictive models, computer vision, internal productivity tools, backend architecture, API development, DevOps, cloud setup, cybersecurity hardening, QA/testing, performance optimisation, data warehousing.
Tone: professional, direct, modern.
Generate a complete proposal with: cover note, scope of work, timeline, line items (service, description, quantity, unit_price), payment terms.`,

  'generate-invoice': `You are an invoice creator for Jonathon Simpson & Co., a Hong Kong-based software and automation agency.
Generate invoice line items (service, description, quantity, unit_price, total) and payment terms based on the project context provided.
Tone: professional, direct, modern.`,

  'generate-project-summary': `You are a project manager for Jonathon Simpson & Co.
Generate a concise project summary covering: status, key accomplishments, next steps, and any blockers.
Tone: professional, direct, modern.`,

  'generate-monthly-report': `You are a reporting analyst for Jonathon Simpson & Co.
Generate a markdown narrative monthly report covering: revenue, costs, completed milestones, closed issues, tasks done.
Tone: professional, direct, modern.`,

  'generate-audit': `You are a delivery auditor for Jonathon Simpson & Co.
Generate a markdown project delivery audit covering: what was scoped vs what was delivered, open vs closed issues, overdue milestones, incomplete tasks, budget status, client communications summary.
Tone: professional, direct, modern.`,

  'generate-tool-documentation': `You are a technical writer for Jonathon Simpson & Co.
Generate a markdown usage guide for the described module. Include: purpose, setup steps, usage instructions, and examples.
Tone: professional, direct, modern.`,

  'create-github-issue': `You are a developer for Jonathon Simpson & Co.
Generate a GitHub issue body with: problem description, acceptance criteria, technical notes, and suggested labels.
Tone: professional, direct, modern.`,

  'generate-follow-up-email': `You are a client communications specialist for Jonathon Simpson & Co.
Write a short follow-up email referencing the previous conversation or proposal. Keep to 3–5 sentences. Professional and friendly.
Tone: professional, direct, modern.
Output plain text only. Do not use markdown formatting.`,

  'generate-multilingual-email': `You are a multilingual communications specialist for Jonathon Simpson & Co.
Translate the given email content into the requested language with cultural appropriateness. Maintain the professional tone of the original.
Tone: professional, direct, modern.
Output plain text only. Do not use markdown formatting.`,

  'autofill-note': `You are an assistant for Jonathon Simpson & Co.
Summarise the given context into concise markdown notes with bullet points. Capture key facts, decisions, and action items.
Tone: professional, direct, modern.`,

  'autofill-task-description': `You are a project manager for Jonathon Simpson & Co.
Write a clear task description with acceptance criteria based on the given context. Use markdown.
Tone: professional, direct, modern.`,

  'parse-event-nl': `You are a calendar assistant for Jonathon Simpson & Co.
Extract calendar event details from natural language.
Return ONLY valid JSON with these fields:
- title (string, required): event name
- startDate (string, YYYY-MM-DD): start date
- startTime (string, HH:mm): start time
- endDate (string, YYYY-MM-DD): end date
- endTime (string, HH:mm): end time
- rrule (string or null): RRULE string for recurrence, e.g. "FREQ=WEEKLY;BYDAY=MO,WE"
- location (string or null): venue or address
- description (string or null): any extra notes (plain text, no markdown)
If the input mentions "every day/week/month" include an rrule.
Timezone is Asia/Hong_Kong. Default meeting duration is 1 hour if not specified.`,

  'summarize-calendar': `You are a virtual executive assistant for Jonathon Simpson & Co., a Hong Kong agency.
Summarize the provided calendar events as a concise digest.
Structure by day. For each day list key events with times.
Highlight: high-priority items, deadlines from tasks/invoices, time conflicts, free blocks.
Use markdown with bullet points. Keep it scannable — 3-5 lines per day max.
If no events, say "Nothing scheduled — clear focus time."`,

  'parse-task': `You are a project manager assistant for Jonathon Simpson & Co.
Extract structured task details from natural language.
Return ONLY valid JSON with these fields:
- title (string, required): task name
- description (string or null): detailed description
- priority (string or null): one of Low, Medium, High, Urgent
- due_date (string or null): YYYY-MM-DD format
- acceptance_criteria (string or null): list of criteria in markdown
If the input mentions urgency, map to priority: urgent/high → Urgent/High.`,

  'parse-github-issue': `You are a developer for Jonathon Simpson & Co.
Extract structured GitHub issue details from natural language.
Return ONLY valid JSON with these fields:
- title (string, required): issue title
- body (string or null): detailed issue body with problem description and acceptance criteria
- labels (string or null): comma-separated labels e.g. "bug, frontend"
If the input mentions a label, bug, feature, enhancement etc, include it in labels.`,

  'parse-email': `You are a communications specialist for Jonathon Simpson & Co.
Extract structured email details from natural language.
Return ONLY valid JSON with these fields:
- subject (string, required): email subject line
- greeting (string or null): opening greeting e.g. "Hi John"
- body (string or null): email body content
- cta (string or null): call to action or next steps
Tone: professional, direct, modern.
Return plain text only. Do not use markdown formatting in any field.`,

  'parse-proposal': `You are a proposal writer for Jonathon Simpson & Co., a Hong Kong-based software and automation agency.
Services: website development, mobile apps, database management, analytics dashboards, CRM, SEO, copywriting, automation, AI chatbots, voice agents, RAG systems, workflow automation, predictive models, computer vision, internal productivity tools, backend architecture, API development, DevOps, cloud setup, cybersecurity hardening, QA/testing, performance optimisation, data warehousing.
Extract structured proposal details from natural language.
Return ONLY valid JSON with these fields:
- scope_of_work (string or null): scope description in markdown
- timeline (string or null): timeline description in markdown
- line_items (array or null): array of objects with service (string), description (string), quantity (number), unit_price (number)
- payment_terms (string or null): payment terms description
If quantities or prices are mentioned, include them in line_items.`,

  'parse-invoice': `You are an invoice creator for Jonathon Simpson & Co., a Hong Kong-based software and automation agency.
Extract structured invoice details from natural language.
Return ONLY valid JSON with these fields:
- line_items (array or null): array of objects with service (string), description (string), quantity (number), unit_price (number), total (number)
- payment_terms (string or null): payment terms text
- payment_notes (string or null): additional notes about payment
If quantities or prices are mentioned, include them in line_items.`,
};

const SYSTEM_CONTEXT = `Agency: Jonathon Simpson & Co.
Location: Hong Kong
Services: website development, mobile apps, database management, analytics dashboards, CRM, SEO, copywriting, automation, AI chatbots, voice agents, RAG systems, workflow automation, predictive models, computer vision, internal productivity tools, backend architecture, API development, DevOps, cloud setup, cybersecurity hardening, QA/testing, performance optimisation, data warehousing.`;

// ============================================================
// OPENROUTER FETCH
// ============================================================

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface OpenRouterResponse {
  choices: Array<{ message: { content: string } }>;
}

async function callOpenRouter(
  action: AIActionType,
  context: Record<string, unknown>,
  modelOverride?: string
): Promise<{ content: string; modelUsed: string; latencyMs: number }> {
  const model = modelOverride || resolveModel(action);
  const systemPrompt = SYSTEM_PROMPTS[action] || SYSTEM_PROMPTS['autofill-note'];
  const contextStr = JSON.stringify(context, null, 2);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://studio.jonathansimpson.co';

  const start = performance.now();

  const response = await fetch(OPENROUTER_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': appUrl,
      'X-Title': 'Studio - JSCo',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: `${systemPrompt}\n\n${SYSTEM_CONTEXT}` },
        { role: 'user', content: `Generate content based on this context:\n\n${contextStr}` },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  const latencyMs = Math.round(performance.now() - start);

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`OpenRouter error (${response.status}): ${errBody || response.statusText}`);
  }

  const data: OpenRouterResponse = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('OpenRouter returned empty response');
  }

  return { content, modelUsed: model, latencyMs };
}

// ============================================================
// PUBLIC API
// ============================================================

export async function generateAIContent(
  action: AIActionType,
  context: Record<string, unknown>
): Promise<string> {
  const { content } = await callOpenRouter(action, context);
  return content;
}

export async function generateWithFallback(
  action: AIActionType,
  context: Record<string, unknown>
): Promise<{ content: string; modelUsed: string; latencyMs: number; fallbackUsed: boolean }> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await callOpenRouter(action, context);
      return { ...result, fallbackUsed: false };
    } catch (primaryError) {
      const isRateLimit = String(primaryError).includes('429');
      if (isRateLimit && attempt < 2) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      console.warn(`Primary model failed for action "${action}", falling back to fast:`, primaryError);
    }
  }

  const result = await callOpenRouter(action, context, MODEL_REGISTRY.fast);
  return { ...result, fallbackUsed: true };
}

export async function testModel(modelKey: AIModelKey): Promise<{ ok: boolean; modelUsed: string; latencyMs: number }> {
  const modelName = MODEL_REGISTRY[modelKey];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://studio.jonathansimpson.co';

  const start = performance.now();

  const response = await fetch(OPENROUTER_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': appUrl,
      'X-Title': 'Studio - JSCo',
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'user', content: 'Reply with exactly one word: OK' },
      ],
      temperature: 0,
      max_tokens: 10,
    }),
  });

  const latencyMs = Math.round(performance.now() - start);

  if (!response.ok) {
    return { ok: false, modelUsed: modelName, latencyMs };
  }

  return { ok: true, modelUsed: modelName, latencyMs };
}

export function getActionModelMap(): Record<string, { modelKey: AIModelKey; modelName: string }> {
  const map: Record<string, { modelKey: AIModelKey; modelName: string }> = {};
  for (const [action, key] of Object.entries(ACTION_MODEL_MAP)) {
    map[action] = { modelKey: key, modelName: MODEL_REGISTRY[key] };
  }
  return map;
}
