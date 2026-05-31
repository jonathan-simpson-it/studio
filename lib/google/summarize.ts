/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateWithFallback } from '@/lib/ai';

export interface EmailSummaryResult {
  importance: 'high' | 'medium' | 'low';
  summary: string;
  action_needed: boolean;
  action_description: string | null;
}

function stripMarkdownFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();
}

function safeParseJSON(raw: string): EmailSummaryResult[] | null {
  const trimRaw = stripMarkdownFences(raw);
  try {
    const parsed = JSON.parse(trimRaw);
    if (Array.isArray(parsed)) return parsed as EmailSummaryResult[];
    if (typeof parsed === 'object' && parsed !== null) return [parsed as EmailSummaryResult];
  } catch {}

  let depth = 0;
  let start = -1;
  const results: EmailSummaryResult[] = [];
  for (let i = 0; i < trimRaw.length; i++) {
    if (trimRaw[i] === '{') {
      if (start === -1) start = i;
      depth++;
    } else if (trimRaw[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        try {
          const candidate = JSON.parse(trimRaw.slice(start, i + 1));
          if (Array.isArray(candidate)) {
            return candidate as EmailSummaryResult[];
          }
          results.push(candidate as EmailSummaryResult);
        } catch {}
        start = -1;
      }
    }
  }
  return results.length > 0 ? results : null;
}

function logRawResponse(context: string, raw: string): void {
  console.log(`[AI Summarize] ${context}: ${raw.slice(0, 200)}`);
}

function defaultResult(): EmailSummaryResult {
  return { importance: 'medium', summary: '', action_needed: false, action_description: null };
}

interface EmailItem {
  from: string;
  subject: string;
  body: string;
}

export async function summarizeBatch(emails: EmailItem[]): Promise<EmailSummaryResult[]> {
  if (emails.length === 0) return [];

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return emails.map(() => defaultResult());
  }

  const chunkSize = 8;
  const allResults: EmailSummaryResult[] = [];

  for (let i = 0; i < emails.length; i += chunkSize) {
    const chunk = emails.slice(i, i + chunkSize);
    const results = await summarizeChunk(chunk);
    allResults.push(...results);
  }

  return allResults;
}

async function summarizeChunk(emails: EmailItem[]): Promise<EmailSummaryResult[]> {
  const single = emails.length === 1;
  const inputPayload = single
    ? { from: emails[0].from, subject: emails[0].subject, body: emails[0].body.slice(0, 3000) }
    : emails.map((e) => ({ from: e.from, subject: e.subject, body: e.body.slice(0, 2000) }));

  try {
    const result = await generateWithFallback('summarize-inbox' as any, {
      task: 'classify_inbox_emails',
      emails: inputPayload,
      instruction: single
        ? 'Return a JSON array with a single element for this one email.'
        : 'Return a JSON array of results, one per email, in the same order as input.',
    });

    const parsed = safeParseJSON(result.content);
    if (parsed && parsed.length === emails.length) return parsed;

    if (parsed && parsed.length === 1 && emails.length === 1) return parsed;

    logRawResponse('unexpected length', result.content);

    if (parsed && parsed.length < emails.length) {
      const padded = [...parsed];
      while (padded.length < emails.length) padded.push(defaultResult());
      return padded;
    }

    return fallbackIndividual(emails);
  } catch (err) {
    console.error('Batch summarization error:', err);
    return fallbackIndividual(emails);
  }
}

async function fallbackIndividual(emails: EmailItem[]): Promise<EmailSummaryResult[]> {
  const results: EmailSummaryResult[] = [];
  for (const email of emails) {
    results.push(await summarizeSingle(email));
  }
  return results;
}

async function summarizeSingle(email: EmailItem): Promise<EmailSummaryResult> {
  try {
    const result = await generateWithFallback('summarize-inbox' as any, {
      task: 'classify_inbox_emails',
      emails: [{ from: email.from, subject: email.subject, body: email.body.slice(0, 3000) }],
      instruction: 'Return a JSON array with a single element for this one email.',
    });

    const parsed = safeParseJSON(result.content);
    if (parsed && parsed.length === 1) return parsed[0];
    if (parsed && parsed.length > 0) return parsed[0];

    logRawResponse('single parse fail', result.content);
    return defaultResult();
  } catch (err) {
    console.error('Single email summarization error:', err);
    return defaultResult();
  }
}
