import { NextRequest, NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';
import type { AIModelKey } from '@/types';

export async function GET() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { getActionModelMap, MODEL_REGISTRY } = await import('@/lib/ai');

  return NextResponse.json({
    models: MODEL_REGISTRY,
    actions: getActionModelMap(),
  });
}
