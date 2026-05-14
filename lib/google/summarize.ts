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

  const systemPrompt = `You are an email prioritizer. Given an email, return ONLY valid JSON (no markdown, no code fences) with:
{
  "importance": "high" | "medium" | "low",
  "summary": "one-sentence summary of the email",
  "action_needed": true/false,
  "action_description": "brief description of what action is needed, or null"
}`;

  const userContent = `From: ${from}\nSubject: ${subject}\n\n${body.slice(0, 3000)}`;

  try {
    const res = await fetch(
      `${process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.AI_SUMMARIZE_MODEL || 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          temperature: 0.2,
          max_tokens: 512,
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error('AI summarization error:', errText);
      return { importance: 'medium', summary: '', action_needed: false, action_description: null };
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || '';

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
