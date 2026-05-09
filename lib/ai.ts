import type { AIActionType, AIActionContext } from '@/types';

const DEEPSEEK_MODEL = 'deepseek-chat';

const SYSTEM_PROMPTS: Record<string, string> = {
  'generate-proposal': `You are a proposal writer for Jonathon Simpson & Co., a Hong Kong-based software and automation agency. 
Services: website development, mobile apps, database management, analytics dashboards, CRM, SEO, copywriting, automation, AI chatbots, voice agents, RAG systems, workflow automation, predictive models, computer vision, internal productivity tools, backend architecture, API development, DevOps, cloud setup, cybersecurity hardening, QA/testing, performance optimisation, data warehousing.
Tone: professional, direct, modern.
Generate a complete proposal with: cover note, scope of work, timeline, line items (service, description, quantity, unit_price), payment terms.`,

  'generate-invoice': `You are an invoice creator for Jonathon Simpson & Co., a Hong Kong-based software and automation agency.
Generate invoice line items (service, description, quantity, unit_price, total) and payment terms based on the project context provided.
Tone: professional, direct, modern.`,

  'generate-project-summary': `You are a project manager for Jonathon Simpson & Co.
Generate a concise markdown project summary covering: status, key accomplishments, next steps, and any blockers.
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
};

const SYSTEM_CONTEXT = `Agency: Jonathon Simpson & Co.
Location: Hong Kong
Services: website development, mobile apps, database management, analytics dashboards, CRM, SEO, copywriting, automation, AI chatbots, voice agents, RAG systems, workflow automation, predictive models, computer vision, internal productivity tools, backend architecture, API development, DevOps, cloud setup, cybersecurity hardening, QA/testing, performance optimisation, data warehousing.`;

async function generateDeepSeek(
  action: AIActionType,
  context: Record<string, unknown>
): Promise<string> {
  const systemPrompt = SYSTEM_PROMPTS[action] || SYSTEM_PROMPTS['generate-tool-documentation'];
  const contextStr = JSON.stringify(context, null, 2);

  const response = await fetch(`${process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: `${systemPrompt}\n\n${SYSTEM_CONTEXT}` },
        { role: 'user', content: `Generate content based on this context:\n\n${contextStr}` },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function generateAIContent(
  action: AIActionType,
  context: Record<string, unknown>
): Promise<string> {
  const provider = process.env.AI_PROVIDER || 'deepseek';

  switch (provider) {
    case 'deepseek':
      return generateDeepSeek(action, context);
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

export type { AIActionType };
