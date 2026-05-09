import { NextRequest, NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';

const DEEPSEEK_MODEL = 'deepseek-chat';

async function callDeepSeek(prompt: string, rawText: string): Promise<string> {
  const response = await fetch(
    `${process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a schedule parser. Extract ALL events from the provided text. Return ONLY a valid JSON array of event objects. Each object must have:
- summary (string): event title/name
- location (string or null): room, building, or address
- startDate (string): YYYY-MM-DD format
- endDate (string): YYYY-MM-DD format
- startTime (string or null): HH:MM in 24-hour format
- endTime (string or null): HH:MM in 24-hour format
- recurrence (string or null): description of recurring pattern if applicable (e.g. "every Monday and Wednesday", "weekly on Tuesdays")
- description (string or null): any additional info

If a field is not found, use null. Do not include any explanation or other text. Return ONLY the JSON array.`,
          },
          {
            role: 'user',
            content: `Extract all events from this text:\n\n${rawText}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function POST(request: NextRequest) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { rawText, taskId } = body;

  if (!rawText) {
    return NextResponse.json({ error: 'rawText required' }, { status: 400 });
  }

  try {
    const aiResponse = await callDeepSeek('', rawText);

    let parsedJson;
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      parsedJson = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      parsedJson = [];
    }

    if (taskId) {
      await supabase
        .from('ocr_tasks')
        .update({
          parsed_json: parsedJson,
          status: 'done',
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);
    }

    return NextResponse.json({
      events: parsedJson,
      rawResponse: aiResponse,
    });
  } catch (error) {
    if (taskId) {
      await supabase
        .from('ocr_tasks')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Parsing failed' },
      { status: 500 }
    );
  }
}
