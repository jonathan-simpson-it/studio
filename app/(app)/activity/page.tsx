'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listActivityLog } from '@/lib/db/actions/details';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { formatRelative } from '@/lib/utils';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

const entityTypes = [
  { label: 'All Types', value: '' },
  { label: 'Lead', value: 'lead' },
  { label: 'Client', value: 'client' },
  { label: 'Project', value: 'project' },
  { label: 'Task', value: 'task' },
  { label: 'Invoice', value: 'invoice' },
  { label: 'Proposal', value: 'proposal' },
  { label: 'Ticket', value: 'ticket' },
];

export default function ActivityPage() {
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(0);
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['activity-log', entityType, page],
    queryFn: () =>
      listActivityLog({
        entity_type: entityType || undefined,
        limit,
        offset: page * limit,
      }),
  });

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Activity Log</h2>
        <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(0); }}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            {entityTypes.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No activity found
            </div>
          ) : (
            <div className="space-y-0">
              {entries.map((entry: any, i: number) => (
                <div key={entry.id || i}>
                  {i > 0 && <Separator />}
                  <div className="flex items-start gap-3 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                      {entry.actor?.full_name?.slice(0, 2)?.toUpperCase() || '??'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{entry.actor?.full_name || 'Unknown'}</span>
                        {' '}{entry.action}{' '}
                        <span className="text-muted-foreground">{entry.entity_type}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatRelative(entry.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>{total} total entries</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>Page {page + 1} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
