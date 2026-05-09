'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { formatRelative } from '@/lib/utils';
import type { ActivityLog } from '@/types';

interface TimelineEntry extends ActivityLog {
  actor?: { full_name?: string };
}

interface ActivityTimelineProps {
  activities: TimelineEntry[];
  emptyMessage?: string;
}

export function ActivityTimeline({ activities, emptyMessage = 'No activity yet' }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ScrollArea className="max-h-96">
      <div className="space-y-0">
        {activities.map((entry, i) => (
          <div key={entry.id}>
            <div className="flex items-start gap-3 py-3">
              <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                {entry.actor?.full_name?.slice(0, 2).toUpperCase() || '??'}
              </div>
              <div className="flex-1 space-y-0.5">
                <p className="text-sm">
                  <span className="font-medium">{entry.actor?.full_name || 'Someone'}</span>{' '}
                  <span className="text-muted-foreground">{entry.action.replace(/_/g, ' ')}</span>
                </p>
                <p className="text-xs text-muted-foreground">{formatRelative(entry.created_at)}</p>
                {entry.meta && Object.keys(entry.meta).length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {JSON.stringify(entry.meta).slice(0, 100)}
                  </p>
                )}
              </div>
            </div>
            {i < activities.length - 1 && <Separator />}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
