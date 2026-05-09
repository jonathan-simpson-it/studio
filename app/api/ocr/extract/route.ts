import { NextRequest, NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const storagePath = `ocr-uploads/${user.id}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from('files')
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrl } = supabase.storage
    .from('files')
    .getPublicUrl(storagePath);

  const { data: task, error: taskError } = await supabase
    .from('ocr_tasks')
    .insert({
      user_id: user.id,
      file_path: storagePath,
      status: 'processing',
    })
    .select()
    .single();

  if (taskError) {
    return NextResponse.json({ error: taskError.message }, { status: 500 });
  }

  let rawText = '';

  if (file.type.includes('pdf')) {
    rawText = `PDF uploaded: ${file.name}\nURL: ${publicUrl.publicUrl}\nPlease use the parse endpoint to extract events.`;
  } else if (file.type.includes('image')) {
    rawText = `Image uploaded: ${file.name}\nURL: ${publicUrl.publicUrl}\nPlease use the parse endpoint to extract events with DeepSeek vision.`;
  } else {
    rawText = `File uploaded: ${file.name} (${file.type})\nURL: ${publicUrl.publicUrl}`;
  }

  await supabase
    .from('ocr_tasks')
    .update({ raw_text: rawText, status: 'done' })
    .eq('id', task.id);

  return NextResponse.json({
    task,
    rawText,
    fileUrl: publicUrl.publicUrl,
  });
}
