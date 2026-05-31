'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listTickets, updateTicket } from '@/lib/db/actions/tickets';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { KanbanBoard } from '@/components/shared/KanbanBoard';
import { BoardToolbar } from '@/components/shared/BoardToolbar';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import type { Ticket } from '@/types';

const COLUMNS = ['Open', 'In Progress', 'Resolved', 'Closed'] as const;

const columnColors: Record<string, string> = {
  Open: 'bg-zinc-500',
  'In Progress': 'bg-blue-500',
  Resolved: 'bg-emerald-500',
  Closed: 'bg-zinc-400',
};

const priorityColors: Record<string, string> = {
  Low: 'border-zinc-400 text-zinc-400',
  Medium: 'border-amber-500 text-amber-500',
  High: 'border-orange-500 text-orange-500',
  Urgent: 'border-red-500 text-red-500',
};

function IssueCardContent({ ticket }: { ticket: Ticket }) {
  const router = useRouter();

  return (
    <Card
      className="transition-colors hover:bg-accent/50 cursor-pointer"
      onClick={() => router.push(`/issues/${ticket.id}`)}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-1">
          <p className="text-[11px] font-mono text-muted-foreground">{ticket.ticket_number}</p>
          <Badge variant="outline" className={`text-[9px] px-1 py-0 ${priorityColors[ticket.priority] || ''}`}>
            {ticket.priority}
          </Badge>
        </div>
        <p className="text-sm font-medium leading-tight line-clamp-2">{ticket.title}</p>
        <p className="text-xs text-muted-foreground truncate">{ticket.contact_name}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted-foreground">{ticket.source}</span>
          {ticket.created_issue_url && (
            <span className="text-[10px] text-muted-foreground">· GH</span>
          )}
        </div>
        {ticket.tags && ticket.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {ticket.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[9px] px-1 py-0">
                {tag}
              </Badge>
            ))}
            {ticket.tags.length > 2 && (
              <span className="text-[9px] text-muted-foreground">+{ticket.tags.length - 2}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IssueTable({ tickets }: { tickets: Ticket[] }) {
  const router = useRouter();

  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Ticket #</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Tags</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr
                key={ticket.id}
                className="border-b text-sm transition-colors hover:bg-accent/50 cursor-pointer"
                onClick={() => router.push(`/issues/${ticket.id}`)}
              >
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{ticket.ticket_number}</td>
                <td className="px-4 py-3 font-medium max-w-[200px] truncate">{ticket.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{ticket.contact_name}</td>
                <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={`text-[10px] ${priorityColors[ticket.priority] || ''}`}>
                    {ticket.priority}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{ticket.source}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 flex-wrap">
                    {ticket.tags?.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[9px] px-1 py-0">{tag}</Badge>
                    ))}
                    {(ticket.tags?.length || 0) > 2 && (
                      <span className="text-[9px] text-muted-foreground">+{ticket.tags!.length - 2}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(ticket.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default function IssuesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterSource, setFilterSource] = useState('');

  const { data: tickets = [] } = useQuery({
    queryKey: ['issues'],
    queryFn: listTickets,
  });

  const filtered = tickets.filter((t) => {
    if (filterPriority && filterPriority !== '_all' && t.priority !== filterPriority) return false;
    if (filterSource && filterSource !== '_all' && t.source !== filterSource) return false;
    return (
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.contact_name.toLowerCase().includes(search.toLowerCase()) ||
      t.ticket_number.toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleStatusChange = useCallback(
    async (itemId: string, newStatus: string) => {
      queryClient.setQueryData<Ticket[]>(['issues'], (prev) =>
        (prev ?? []).map((t) =>
          t.id === itemId ? { ...t, status: newStatus as Ticket['status'] } : t
        )
      );
      try {
        await updateTicket(itemId, { status: newStatus });
        toast.success(`Issue moved to ${newStatus}`);
      } catch {
        queryClient.invalidateQueries({ queryKey: ['issues'] });
        toast.error('Failed to update status');
      }
    },
    [queryClient]
  );

  return (
    <div className="space-y-6">
      <BoardToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search issues..."
        view={view}
        onViewChange={setView}
        filters={[
          {
            key: 'priority',
            label: 'Priority',
            placeholder: 'Priority',
            options: [
              { label: 'All', value: '_all' },
              { label: 'Low', value: 'Low' },
              { label: 'Medium', value: 'Medium' },
              { label: 'High', value: 'High' },
              { label: 'Urgent', value: 'Urgent' },
            ],
            value: filterPriority,
            onChange: setFilterPriority,
          },
          {
            key: 'source',
            label: 'Source',
            placeholder: 'Source',
            options: [
              { label: 'All', value: '_all' },
              { label: 'Support Form', value: 'support-form' },
              { label: 'Email', value: 'email' },
              { label: 'Contact Form', value: 'contact-form' },
              { label: 'Inbound', value: 'inbound' },
            ],
            value: filterSource,
            onChange: setFilterSource,
          },
        ]}
      />

      {view === 'kanban' ? (
        <KanbanBoard
          columns={COLUMNS}
          items={filtered}
          getItemId={(t) => t.id}
          getItemStatus={(t) => t.status}
          onStatusChange={handleStatusChange}
          renderCard={(ticket) => <IssueCardContent ticket={ticket} />}
          columnColors={columnColors}
          emptyMessage="No issues"
        />
      ) : (
        <IssueTable tickets={filtered} />
      )}
    </div>
  );
}
