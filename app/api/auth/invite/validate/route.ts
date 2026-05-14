import { NextRequest, NextResponse } from 'next/server';
import { validateInviteCode } from '@/lib/auth/invite';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { code } = body;

  return NextResponse.json({ valid: validateInviteCode(code) });
}
