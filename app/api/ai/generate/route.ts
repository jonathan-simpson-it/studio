import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import type { AIActionType } from '@/types';

const AI_ACTIONS: AIActionType[] = [
  'generate-proposal',
  'generate-invoice',
  'generate-project-summary',
  'generate-monthly-report',
  'generate-audit',
  'generate-tool-documentation',
  'create-github-issue',
  'draft-email',
  'generate-follow-up-email',
  'generate-multilingual-email',
  'autofill-note',
  'autofill-task-description',
];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { action, context } = body;

  if (!AI_ACTIONS.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  try {
    const { generateWithFallback } = await import('@/lib/ai');
    const result = await generateWithFallback(action as AIActionType, context || {});

    return NextResponse.json({
      content: result.content,
      modelUsed: result.modelUsed,
      latencyMs: result.latencyMs,
      fallbackUsed: result.fallbackUsed,
    });
  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
