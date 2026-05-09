import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseICS } from '@/lib/calendar-engine/ics-parse';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: sources, error } = await supabase
    .from('calendar_sources')
    .select('*');

  if (error || !sources?.length) {
    return NextResponse.json({ error: 'No sources', synced: 0 });
  }

  let synced = 0;

  for (const source of sources) {
    try {
      const headers: Record<string, string> = {};
      if (source.last_etag) {
        headers['If-None-Match'] = source.last_etag;
      }

      const res = await fetch(source.url, { headers });

      if (res.status === 304) {
        await supabase
          .from('calendar_sources')
          .update({ last_sync: new Date().toISOString() })
          .eq('id', source.id);
        continue;
      }

      const raw = await res.text();
      const parsedEvents = parseICS(raw);

      const etag = res.headers.get('etag');
      if (etag) {
        await supabase
          .from('calendar_sources')
          .update({ last_etag: etag })
          .eq('id', source.id);
      }

      for (const pev of parsedEvents) {
        const { data: existing } = await supabase
          .from('events')
          .select('id')
          .eq('external_event_id', pev.uid)
          .eq('calendar_id', source.calendar_id)
          .single();

        if (existing) {
          await supabase
            .from('events')
            .update({
              title: pev.summary,
              description: pev.description,
              location: pev.location,
              start_time: pev.start.toISOString(),
              end_time: pev.end.toISOString(),
              rrule: pev.rrule,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await supabase.from('events').insert({
            calendar_id: source.calendar_id,
            title: pev.summary,
            description: pev.description,
            location: pev.location,
            start_time: pev.start.toISOString(),
            end_time: pev.end.toISOString(),
            rrule: pev.rrule,
            external_source_id: source.id,
            external_event_id: pev.uid,
            created_by: '00000000-0000-0000-0000-000000000000',
          });
        }
        synced++;
      }

      await supabase
        .from('calendar_sources')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', source.id);
    } catch (err) {
      console.error(`Failed to sync source ${source.id}:`, err);
    }
  }

  return NextResponse.json({ synced, sources: sources.length });
}
