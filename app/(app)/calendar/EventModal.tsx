'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { parseNaturalLanguage } from '@/lib/parser/nlp';
import { detectConflicts, type EventLike } from '@/lib/calendar-engine/conflicts';
import type { CalendarEvent, Calendar } from '@/types';
import { format } from 'date-fns';
import { AlertCircle, Sparkles } from 'lucide-react';

interface EventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  calendars: Calendar[];
  events: CalendarEvent[];
  defaultDate: Date | null;
  onSave: (data: Partial<CalendarEvent>) => Promise<void>;
  onDelete?: () => void;
}

export function EventModal({
  open,
  onOpenChange,
  event,
  calendars,
  events,
  defaultDate,
  onSave,
  onDelete,
}: EventModalProps) {
  const [tab, setTab] = useState('nl');
  const [nlInput, setNlInput] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [rrule, setRrule] = useState('');
  const [calendarId, setCalendarId] = useState('');
  const [conflicts, setConflicts] = useState<EventLike[]>([]);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (event) {
        setTitle(event.title);
        setDescription(event.description || '');
        setLocation(event.location || '');
        const s = new Date(event.start_time);
        setStartDate(format(s, 'yyyy-MM-dd'));
        setStartTime(format(s, 'HH:mm'));
        const e = new Date(event.end_time);
        setEndDate(format(e, 'yyyy-MM-dd'));
        setEndTime(format(e, 'HH:mm'));
        setIsAllDay(event.is_all_day);
        setRrule(event.rrule || '');
        setCalendarId(event.calendar_id);
        setNlInput('');
      } else {
        setTitle('');
        setDescription('');
        setLocation('');
        setIsAllDay(false);
        setRrule('');
        setCalendarId(calendars[0]?.id || '');
        setNlInput('');
        if (defaultDate) {
          setStartDate(format(defaultDate, 'yyyy-MM-dd'));
          setEndDate(format(defaultDate, 'yyyy-MM-dd'));
          const h = defaultDate.getHours();
          setStartTime(format(defaultDate, 'HH:mm'));
          setEndTime(format(new Date(defaultDate).setHours(h + 1), 'HH:mm'));
        } else {
          const now = new Date();
          setStartDate(format(now, 'yyyy-MM-dd'));
          setEndDate(format(now, 'yyyy-MM-dd'));
          setStartTime(format(now, 'HH:00'));
          const next = new Date(now);
          next.setHours(next.getHours() + 1);
          setEndTime(format(next, 'HH:00'));
        }
      }
      setConflicts([]);
      setTab('nl');
    }
  }, [open, event, calendars, defaultDate]);

  function buildEventData(): Partial<CalendarEvent> {
    const s = new Date(`${startDate}T${startTime}:00`);
    const e = new Date(`${endDate || startDate}T${endTime}:00`);
    return {
      title,
      description: description || null,
      location: location || null,
      start_time: s.toISOString(),
      end_time: e.toISOString(),
      is_all_day: isAllDay,
      rrule: rrule || null,
      calendar_id: calendarId,
    };
  }

  async function handleNLParsing() {
    if (!nlInput.trim()) return;
    setParsing(true);
    try {
      const result = parseNaturalLanguage(nlInput);
      if (result.title) setTitle(result.title);
      if (result.start) {
        setStartDate(format(result.start, 'yyyy-MM-dd'));
        setStartTime(format(result.start, 'HH:mm'));
      }
      if (result.end) {
        setEndDate(format(result.end, 'yyyy-MM-dd'));
        setEndTime(format(result.end, 'HH:mm'));
      }
      if (result.rrule) setRrule(result.rrule);
      if (result.location) setLocation(result.location);
      if (result.description) setDescription(result.description);
      setTab('form');
    } catch {
      setTab('form');
    }
    setParsing(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = buildEventData();
    if (!data.title?.trim()) return;

    const conflicts = detectConflicts(
      events.filter((ev) => ev.id !== event?.id),
      data as CalendarEvent
    );

    if (conflicts.length > 0) {
      setConflicts(conflicts.map((c) => c.event));
    }

    setSaving(true);
    await onSave(data);
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{event ? 'Edit Event' : 'New Event'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="nl" className="flex-1 gap-1">
                <Sparkles className="h-3 w-3" /> Natural Language
              </TabsTrigger>
              <TabsTrigger value="form" className="flex-1">
                Form
              </TabsTrigger>
            </TabsList>

            <TabsContent value="nl" className="space-y-3 pt-3">
              <div className="space-y-2">
                <Label>Describe your event</Label>
                <Textarea
                  placeholder="Math lecture every Mon &amp; Wed 10-11 AM from Mar 3 to May 12 in Room 301"
                  value={nlInput}
                  onChange={(e) => setNlInput(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleNLParsing}
                disabled={parsing || !nlInput.trim()}
                className="w-full"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {parsing ? 'Parsing...' : 'Parse & Fill Form'}
              </Button>
              <p className="text-[10px] text-muted-foreground">
                Supports: &quot;Meeting every Monday 2-3pm&quot;, &quot;Lunch tomorrow at noon for 1 hour&quot;,
                &quot;Conference May 3-5 all day&quot;
              </p>
            </TabsContent>

            <TabsContent value="form" className="space-y-3 pt-3">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Event title" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={isAllDay} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={isAllDay} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={isAllDay} onCheckedChange={setIsAllDay} />
                <Label>All day</Label>
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Room, address, or link" />
              </div>

              <div className="space-y-2">
                <Label>Recurrence (RRULE)</Label>
                <Input value={rrule} onChange={(e) => setRrule(e.target.value)} placeholder="e.g. FREQ=WEEKLY;BYDAY=MO,WE" />
              </div>

              <div className="space-y-2">
                <Label>Calendar</Label>
                <Select value={calendarId} onValueChange={setCalendarId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select calendar" />
                  </SelectTrigger>
                  <SelectContent>
                    {calendars.map((cal) => (
                      <SelectItem key={cal.id} value={cal.id}>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cal.color }} />
                          {cal.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              </div>
            </TabsContent>
          </Tabs>

          {conflicts.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-400">
                <AlertCircle className="h-4 w-4" />
                Time conflict with {conflicts.length} event{conflicts.length > 1 ? 's' : ''}
              </div>
              <ul className="mt-1 space-y-0.5">
                {conflicts.map((c) => (
                  <li key={c.id} className="text-xs text-muted-foreground">
                    {c.title} ({format(new Date(c.start_time), 'MMM d HH:mm')})
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            {onDelete && (
              <Button type="button" variant="destructive" onClick={onDelete}>
                Delete
              </Button>
            )}
            <div className="flex-1" />
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
