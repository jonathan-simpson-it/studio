import { generateWithFallback } from '@/lib/ai';
import type { AIActionType } from '@/types';

export interface EmailSummaryResult {
  importance: 'high' | 'medium' | 'low';
  summary: string;
  action_needed: boolean;
  action_description: string | null;
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

    const raw = result.content;

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { importance: 'medium', summary: raw, action_needed: false, action_description: null };
    }

    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('AI summarization error:', err);
    return { importance: 'medium', summary: '', action_needed: false, action_description: null };
  }
}
