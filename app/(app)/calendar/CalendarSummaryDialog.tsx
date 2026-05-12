'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Sparkles, Copy, RefreshCw, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { CalendarEvent } from '@/types';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

interface CalendarSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDate: Date;
  events: CalendarEvent[];
}

type Timeframe = 'today' | 'day' | 'week' | 'month';

export function CalendarSummaryDialog({
  open,
  onOpenChange,
  currentDate,
  events,
}: CalendarSummaryDialogProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('week');
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  function getDateRange() {
    switch (timeframe) {
      case 'today': {
        const d = new Date();
        return { start: startOfDay(d), end: endOfDay(d), label: format(d, 'MMM d, yyyy') };
      }
      case 'day':
        return { start: startOfDay(currentDate), end: endOfDay(currentDate), label: format(currentDate, 'MMM d, yyyy') };
      case 'week':
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 }),
          label: `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')} – ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`,
        };
      case 'month':
        return { start: startOfMonth(currentDate), end: endOfMonth(currentDate), label: format(currentDate, 'MMMM yyyy') };
    }
  }

  async function handleGenerate() {
    const range = getDateRange();
    setLoading(true);
    setSummary(null);

    const timeframeEvents = events.filter((ev) => {
      const start = new Date(ev.start_time);
      const end = new Date(ev.end_time);
      return start < range.end && end > range.start;
    });

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'summarize-calendar',
          context: {
            timeframe: timeframe,
            dateRange: { start: range.start.toISOString(), end: range.end.toISOString() },
            events: timeframeEvents.map((ev) => ({
              title: ev.title,
              start: ev.start_time,
              end: ev.end_time,
              isAllDay: ev.is_all_day,
              location: ev.location,
              sourceType: ev.source_type,
            })),
            stats: {
              total: timeframeEvents.length,
              deadlines: timeframeEvents.filter((ev) => ev.source_type).length,
            },
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      setSummary(data.content);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!summary) return;
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  }

  const range = getDateRange();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" aria-describedby="calendar-summary-description">
        <DialogHeader>
          <DialogTitle>Calendar Summary</DialogTitle>
          <DialogDescription id="calendar-summary-description">
            AI-generated digest of your schedule
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>Timeframe</Label>
              <Select value={timeframe} onValueChange={(v: Timeframe) => { setTimeframe(v); setSummary(null); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="day">Current Day</SelectItem>
                  <SelectItem value="week">Current Week</SelectItem>
                  <SelectItem value="month">Current Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} disabled={loading}>
              <Sparkles className="mr-2 h-4 w-4" />
              {loading ? 'Generating...' : 'Generate'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            {range.label} &middot; {events.filter((ev) => {
              const s = new Date(ev.start_time);
              const e = new Date(ev.end_time);
              return s < range.end && e > range.start;
            }).length} events
          </p>

          {summary && (
            <div className="relative rounded-lg border bg-muted/30 p-4">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-7 w-7"
                onClick={handleCopy}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
                {summary}
              </div>
            </div>
          )}

          {!summary && !loading && (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Click <strong>Generate</strong> to get an AI summary of your schedule
            </div>
          )}

          {summary && (
            <Button variant="outline" size="sm" onClick={handleGenerate} className="w-full">
              <RefreshCw className="mr-2 h-3 w-3" /> Regenerate
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
