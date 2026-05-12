import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import type { AIModelKey } from '@/types';

const VALID_MODEL_KEYS: AIModelKey[] = ['default', 'longform', 'structured', 'multilingual', 'fast'];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { modelKey } = body;

  if (!VALID_MODEL_KEYS.includes(modelKey)) {
    return NextResponse.json({ error: 'Invalid modelKey' }, { status: 400 });
  }

  try {
    const { testModel } = await import('@/lib/ai');
    const result = await testModel(modelKey as AIModelKey);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Test failed' },
      { status: 500 }
    );
  }
}
