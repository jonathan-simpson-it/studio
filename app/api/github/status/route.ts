import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { verifyConnection, resetCache } from '@/lib/github';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const appId = process.env.GITHUB_APP_ID;
  const rawKey = process.env.GITHUB_APP_PRIVATE_KEY;
  const org = process.env.GITHUB_ORG || 'jonathan-simpson-it';

  const keyPreview = rawKey
    ? rawKey.substring(0, 50).replace(/[\s\S]/g, (c) => (c === '\n' ? '\\n' : c === '-' ? '-' : '*'))
    : null;

  let connection = await verifyConnection();

  return NextResponse.json({
    appId: appId ? `${appId.substring(0, 4)}...` : null,
    org,
    keyConfigured: !!rawKey,
    keyLength: rawKey?.length ?? 0,
    keyStartsWithHeader: rawKey?.trim().startsWith('-----BEGIN') ?? false,
    keyPreview,
    connection,
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  resetCache();

  const connection = await verifyConnection();

  return NextResponse.json({ message: 'Cache cleared', connection });
}
