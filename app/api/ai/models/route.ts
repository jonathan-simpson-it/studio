import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import type { AIModelKey } from '@/types';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { getActionModelMap, MODEL_REGISTRY } = await import('@/lib/ai');

  return NextResponse.json({
    models: MODEL_REGISTRY,
    actions: getActionModelMap(),
  });
}
