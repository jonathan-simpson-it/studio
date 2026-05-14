import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connect } from '@/lib/db/connect';
import { uploadToGridFS } from '@/lib/storage/gridfs';
import { OcrTask } from '@/lib/db/models/calendar';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const fileId = await uploadToGridFS(buffer, file.name, file.type);

    await connect();
    const task = await OcrTask.create({
      user_id: session.user.id,
      file_path: fileId,
      status: 'processing',
    });

    let rawText = '';
    if (file.type.includes('pdf')) {
      rawText = `PDF uploaded: ${file.name}\nFile ID: ${fileId}\nPlease use the parse endpoint to extract events.`;
    } else if (file.type.includes('image')) {
      rawText = `Image uploaded: ${file.name}\nFile ID: ${fileId}\nPlease use the parse endpoint to extract events with DeepSeek vision.`;
    } else {
      rawText = `File uploaded: ${file.name} (${file.type})\nFile ID: ${fileId}`;
    }

    await OcrTask.findByIdAndUpdate(task._id, { raw_text: rawText, status: 'done' });

    return NextResponse.json({
      task: task.toObject({ virtuals: true }),
      rawText,
      fileUrl: `/api/files/serve?id=${fileId}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
