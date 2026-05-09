import { NextRequest, NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';

const AI_ACTIONS = [
  'generate-proposal',
  'generate-invoice',
  'generate-project-summary',
  'generate-monthly-report',
  'generate-audit',
  'generate-tool-documentation',
  'create-github-issue',
] as const;

export async function POST(request: NextRequest) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { action, context } = body;

  if (!AI_ACTIONS.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  try {
    const { generateAIContent } = await import('@/lib/ai');
    const content = await generateAIContent(action as any, context);
    return NextResponse.json({ content });
  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
