import { generateWithFallback } from '@/lib/ai';
import type { AIActionType } from '@/types';

export interface EmailSummaryResult {
  importance: 'high' | 'medium' | 'low';
  summary: string;
  action_needed: boolean;
  action_description: string | null;
}

function safeParseJSON(raw: string): EmailSummaryResult | null {
  const trimRaw = raw.trim();
  try { return JSON.parse(trimRaw); } catch {}

  let depth = 0;
  let start = -1;
  for (let i = 0; i < trimRaw.length; i++) {
    if (trimRaw[i] === '{') {
      if (start === -1) start = i;
      depth++;
    } else if (trimRaw[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        try { return JSON.parse(trimRaw.slice(start, i + 1)); } catch { start = -1; }
      }
    }
  }
  return null;
}

export async function summarizeEmail(from: string, subject: string, body: string): Promise<EmailSummaryResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { importance: 'medium', summary: '', action_needed: false, action_description: null };
  }

  try {
    const result = await generateWithFallback('parse-email' as AIActionType, {
      task: 'summarize_and_prioritize',
      from,
      subject,
      body: body.slice(0, 3000),
      output_schema: {
        importance: '"high", "medium", or "low"',
        summary: 'one-sentence summary of the email',
        action_needed: 'true or false',
        action_description: 'brief description of what action is needed, or null',
      },
    });

    const parsed = safeParseJSON(result.content);
    if (!parsed) {
      return { importance: 'medium', summary: result.content, action_needed: false, action_description: null };
    }

    return parsed;
  } catch (err) {
    console.error('AI summarization error:', err);
    return { importance: 'medium', summary: '', action_needed: false, action_description: null };
  }
}
