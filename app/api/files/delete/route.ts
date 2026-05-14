import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { deleteFromGridFS, deleteFileRecord } from '@/lib/storage/gridfs';

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing file id' }, { status: 400 });
  }

  try {
    await deleteFromGridFS(id);
    await deleteFileRecord(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    );
  }
}
