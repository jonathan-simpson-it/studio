'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
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
import { parseICS, type ParsedICSEvent } from '@/lib/calendar-engine/ics-parse';
import { createClient } from '@/lib/supabase/client';
import type { CalendarEvent, Calendar } from '@/types';
import { format } from 'date-fns';
import { AlertCircle, Sparkles, Upload, FileText, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface ImportableEvent {
  uid: string;
  summary: string;
  description: string | null;
  location: string | null;
  start: Date;
  end: Date;
  selected: boolean;
  editable: boolean;
}

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
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const [aiParsing, setAIParsing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [importedEvents, setImportedEvents] = useState<ImportableEvent[]>([]);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [dragging, setDragging] = useState(false);

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
      setImportedEvents([]);
      setUploadStatus('idle');
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
      if (!result.start) {
        setAIParsing(true);
        try {
          const res = await fetch('/api/ai/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'parse-event-nl',
              context: { input: nlInput },
            }),
          });
          const data = await res.json();
          if (res.ok && data.content) {
            const parsed = JSON.parse(data.content);
            if (parsed.title) setTitle(parsed.title);
            if (parsed.startDate) setStartDate(parsed.startDate);
            if (parsed.startTime) setStartTime(parsed.startTime);
            if (parsed.endDate) setEndDate(parsed.endDate);
            if (parsed.endTime) setEndTime(parsed.endTime);
            if (parsed.rrule) setRrule(parsed.rrule);
            if (parsed.location) setLocation(parsed.location);
            if (parsed.description) setDescription(parsed.description);
          }
        } catch {
          // AI parse failed, use whatever chrono gave us
        }
        setAIParsing(false);
      }
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

  function handleFileDrop(files: FileList | File[]) {
    const file = files[0];
    if (!file) return;
    setUploadStatus('processing');

    const reader = new FileReader();

    if (file.name.endsWith('.ics')) {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        try {
          const parsed = parseICS(text);
          setImportedEvents(
            parsed.map((ev) => ({
              ...ev,
              selected: true,
              editable: false,
            }))
          );
          setUploadStatus('done');
        } catch {
          toast.error('Failed to parse .ics file');
          setUploadStatus('error');
        }
      };
      reader.readAsText(file);
    } else if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      const formData = new FormData();
      formData.append('file', file);

      fetch('/api/ocr/extract', { method: 'POST', body: formData })
        .then((res) => res.json())
        .then((data) => {
          if (data.rawText) {
            return fetch('/api/ocr/parse', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ rawText: data.rawText, taskId: data.task?.id }),
            }).then((r) => r.json());
          }
          throw new Error(data.error || 'Extraction failed');
        })
        .then((data) => {
          if (data.events?.length) {
            setImportedEvents(
              (data.events as Array<{
                summary: string;
                location: string | null;
                startDate: string;
                endDate: string;
                startTime: string | null;
                endTime: string | null;
                description: string | null;
              }>).map((ev, i) => ({
                uid: `imported-${i}`,
                summary: ev.summary || 'Untitled',
                description: ev.description || null,
                location: ev.location || null,
                start: ev.startDate && ev.startTime
                  ? new Date(`${ev.startDate}T${ev.startTime}`)
                  : ev.startDate
                    ? new Date(ev.startDate)
                    : new Date(),
                end: ev.endDate && ev.endTime
                  ? new Date(`${ev.endDate}T${ev.endTime}`)
                  : ev.endDate
                    ? new Date(ev.endDate)
                    : new Date(),
                selected: true,
                editable: true,
              }))
            );
            setUploadStatus('done');
          } else {
            setUploadStatus('error');
            toast.error('No events found in file');
          }
        })
        .catch((err) => {
          toast.error(err.message || 'Processing failed');
          setUploadStatus('error');
        });
    } else {
      toast.error('Unsupported file type. Use .ics, .pdf, .png, or .jpg');
      setUploadStatus('error');
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFileDrop(e.dataTransfer.files);
  }

  function toggleEventImport(index: number) {
    setImportedEvents((prev) =>
      prev.map((ev, i) => (i === index ? { ...ev, selected: !ev.selected } : ev))
    );
  }

  function updateImportedEvent(index: number, field: keyof ImportableEvent, value: string | boolean) {
    setImportedEvents((prev) =>
      prev.map((ev, i) => {
        if (i !== index) return ev;
        const updated = { ...ev, [field]: value };
        if (field === 'summary') updated.summary = value as string;
        if (field === 'location') updated.location = value as string;
        return updated;
      })
    );
  }

  async function importSelectedEvents() {
    const selected = importedEvents.filter((ev) => ev.selected);
    if (selected.length === 0) {
      toast.error('No events selected');
      return;
    }

    setSaving(true);
    let imported = 0;
    for (const ev of selected) {
      const s = new Date(ev.start);
      const e = new Date(ev.end);
      const eventData: Partial<CalendarEvent> = {
        title: ev.summary,
        description: ev.description,
        location: ev.location,
        start_time: s.toISOString(),
        end_time: e.toISOString(),
        calendar_id: calendarId,
      };
      try {
        await onSave(eventData);
        imported++;
      } catch {
        // continue with next event
      }
    }
    setSaving(false);
    toast.success(`Imported ${imported} of ${selected.length} events`);
    setImportedEvents([]);
    setUploadStatus('idle');
    onOpenChange(false);
  }

  const selectedCount = importedEvents.filter((ev) => ev.selected).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={importedEvents.length > 0 ? 'max-w-2xl' : 'max-w-lg'} aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{event ? 'Edit Event' : 'New Event'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="nl" className="flex-1 gap-1">
                <Sparkles className="h-3 w-3" /> Natural Language
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex-1 gap-1">
                <Upload className="h-3 w-3" /> Upload File
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
              <p className="text-[10px] text-muted-foreground">
                Complex phrases automatically fall back to AI parsing
              </p>
            </TabsContent>

            <TabsContent value="upload" className="space-y-3 pt-3">
              {importedEvents.length === 0 ? (
                <>
                  <div
                    className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                      dragging
                        ? 'border-primary bg-primary/5'
                        : 'border-muted-foreground/30 hover:border-muted-foreground/50'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
                    <p className="mb-1 text-sm font-medium">
                      Drop a schedule file here
                    </p>
                    <p className="mb-3 text-xs text-muted-foreground">
                      .ics calendars, .pdf schedules, or images (.png, .jpg)
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadStatus === 'processing'}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      {uploadStatus === 'processing' ? 'Processing...' : 'Select File'}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".ics,.pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.length) handleFileDrop(e.target.files);
                      }}
                    />
                  </div>
                  {uploadStatus === 'processing' && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Processing file...
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {importedEvents.length} event{importedEvents.length > 1 ? 's' : ''} found
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setImportedEvents([]);
                        setUploadStatus('idle');
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {importedEvents.map((ev, i) => (
                      <div
                        key={i}
                        className="rounded-lg border p-3 space-y-2"
                      >
                        <div className="flex items-start gap-2">
                          <Checkbox
                            checked={ev.selected}
                            onCheckedChange={() => toggleEventImport(i)}
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-1">
                            <Input
                              value={ev.summary}
                              onChange={(e) => updateImportedEvent(i, 'summary', e.target.value)}
                              className="h-7 text-sm font-medium"
                              placeholder="Event title"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-[10px] text-muted-foreground">Start</p>
                                <Input
                                  type="datetime-local"
                                  value={format(new Date(ev.start), "yyyy-MM-dd'T'HH:mm")}
                                  onChange={(e) => {
                                    const d = new Date(e.target.value);
                                    updateImportedEvent(i, 'start', d.toISOString());
                                    // Store date back as Date in the array
                                    const updated = [...importedEvents];
                                    updated[i].start = d;
                                    setImportedEvents(updated);
                                  }}
                                  className="h-7 text-xs"
                                />
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground">End</p>
                                <Input
                                  type="datetime-local"
                                  value={format(new Date(ev.end), "yyyy-MM-dd'T'HH:mm")}
                                  onChange={(e) => {
                                    const d = new Date(e.target.value);
                                    const updated = [...importedEvents];
                                    updated[i].end = d;
                                    setImportedEvents(updated);
                                  }}
                                  className="h-7 text-xs"
                                />
                              </div>
                            </div>
                            <Input
                              value={ev.location || ''}
                              onChange={(e) => updateImportedEvent(i, 'location', e.target.value)}
                              className="h-7 text-xs"
                              placeholder="Location (optional)"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    onClick={importSelectedEvents}
                    className="w-full"
                    disabled={saving || selectedCount === 0}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    {saving ? 'Importing...' : `Import ${selectedCount} Event${selectedCount !== 1 ? 's' : ''}`}
                  </Button>
                </div>
              )}
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
            {tab !== 'upload' && (
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
