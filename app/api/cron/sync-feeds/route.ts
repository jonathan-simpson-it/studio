import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@/lib/db/connect';
import { CalendarSource, Event } from '@/lib/db/models/calendar';
import { parseICS } from '@/lib/calendar-engine/ics-parse';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connect();
  const sources = await CalendarSource.find().lean({ virtuals: true });

  if (!sources?.length) {
    return NextResponse.json({ error: 'No sources', synced: 0 });
  }

  let synced = 0;

  for (const source of sources) {
    try {
      const s = source as any;
      const headers: Record<string, string> = {};
      if (s.last_etag) {
        headers['If-None-Match'] = s.last_etag;
      }

      const res = await fetch(s.url, { headers });

      if (res.status === 304) {
        await CalendarSource.findByIdAndUpdate(s._id, { last_sync: new Date() });
        continue;
      }

      const raw = await res.text();
      const parsedEvents = parseICS(raw);

      const etag = res.headers.get('etag');
      if (etag) {
        await CalendarSource.findByIdAndUpdate(s._id, { last_etag: etag });
      }

      for (const pev of parsedEvents) {
        const existing = await Event.findOne({
          external_event_id: pev.uid,
          calendar_id: s.calendar_id,
        }).lean({ virtuals: true });

        if (existing) {
          await Event.findByIdAndUpdate(existing._id, {
            title: pev.summary,
            description: pev.description,
            location: pev.location,
            start_time: pev.start,
            end_time: pev.end,
            rrule: pev.rrule,
            updated_at: new Date(),
          });
        } else {
          await Event.create({
            calendar_id: s.calendar_id,
            title: pev.summary,
            description: pev.description,
            location: pev.location,
            start_time: pev.start,
            end_time: pev.end,
            rrule: pev.rrule,
            external_source_id: s._id.toString(),
            external_event_id: pev.uid,
            created_by: '00000000-0000-0000-0000-000000000000',
          });
        }
        synced++;
      }

      await CalendarSource.findByIdAndUpdate(s._id, { last_sync: new Date() });
    } catch (err) {
      console.error(`Failed to sync source ${(source as any)._id}:`, err);
    }
  }

  return NextResponse.json({ synced, sources: sources.length });
}
