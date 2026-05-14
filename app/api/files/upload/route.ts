import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { uploadToGridFS, createFileRecord } from '@/lib/storage/gridfs';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const clientId = formData.get('clientId') as string | null;
  const projectId = formData.get('projectId') as string | null;
  const visibility = (formData.get('visibility') as string) || 'internal';

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const fileId = await uploadToGridFS(buffer, file.name, file.type);

    await createFileRecord({
      name: file.name,
      storage_path: fileId,
      mime_type: file.type,
      size_bytes: file.size,
      visibility,
      client_id: clientId || undefined,
      project_id: projectId || undefined,
      uploaded_by: session.user.id,
    });

    const url = `/api/files/serve?id=${fileId}`;

    return NextResponse.json({
      id: fileId,
      name: file.name,
      storagePath: fileId,
      url,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
