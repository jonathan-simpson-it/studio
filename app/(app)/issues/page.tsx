'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listTickets, updateTicket, createTicket } from '@/lib/db/actions/tickets';
import { listFounders } from '@/lib/db/actions/settings';
import { getProjectsWithRepos } from '@/lib/db/actions/projects';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { KanbanBoard } from '@/components/shared/KanbanBoard';
import { BoardToolbar } from '@/components/shared/BoardToolbar';
import { MobileStageList } from '@/components/mobile/MobileStageList';
import { MobileCardList } from '@/components/mobile/MobileCardList';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDate } from '@/lib/utils';
import { Plus } from 'lucide-react';
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

function IssueForm({ projectsWithRepos, onSubmit }: { projectsWithRepos: { project_id: string; project_name: string; repo_full_name: string }[]; onSubmit: (data: { title: string; description: string; priority: string; project_id: string | null }) => Promise<void> }) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'Medium', project_id: '_none' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, project_id: form.project_id === '_none' ? null : form.project_id }); }} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <textarea className="w-full rounded-md border bg-transparent p-3 text-sm" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Priority</Label>
        <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {['Low', 'Medium', 'High', 'Urgent'].map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      {projectsWithRepos.length > 0 && (
        <div className="space-y-2">
          <Label>Project</Label>
          <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
            <SelectTrigger><SelectValue placeholder="No project" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">No project</SelectItem>
              {projectsWithRepos.map((p) => (
                <SelectItem key={p.project_id} value={p.project_id}>
                  {p.project_name} ({p.repo_full_name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Selecting a project links this issue to its GitHub repository.</p>
        </div>
      )}
      <Button type="submit" className="w-full">Create Issue</Button>
    </form>
  );
}

function IssueCardContent({ ticket, founders }: { ticket: Ticket; founders: { id: string; name: string; avatar_url: string | null }[] }) {
  const router = useRouter();
  const assignees = founders.filter((f) => ticket.assignee_ids?.includes(f.id));

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
        {assignees.length > 0 && (
          <div className="flex -space-x-1.5">
            {assignees.map((f) => (
              <Avatar key={f.id} className="h-5 w-5 border border-background">
                <AvatarImage src={f.avatar_url || undefined} alt={f.name} />
                <AvatarFallback className="text-[8px]">{f.name?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        )}
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

function IssueTable({ tickets, founders }: { tickets: Ticket[]; founders: { id: string; name: string; avatar_url: string | null }[] }) {
  const router = useRouter();

  return (
    <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Ticket #</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Assignee</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Tags</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => {
              const assignees = founders.filter((f) => ticket.assignee_ids?.includes(f.id));
              return (
                <tr
                  key={ticket.id}
                  className="border-b text-sm transition-colors hover:bg-accent/50 cursor-pointer"
                  onClick={() => router.push(`/issues/${ticket.id}`)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{ticket.ticket_number}</td>
                  <td className="px-4 py-3 font-medium max-w-[200px] truncate">{ticket.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{ticket.contact_name}</td>
                  <td className="px-4 py-3">
                    <div className="flex -space-x-1.5">
                      {assignees.map((f) => (
                        <Avatar key={f.id} className="h-6 w-6 border border-background">
                          <AvatarImage src={f.avatar_url || undefined} alt={f.name} />
                          <AvatarFallback className="text-[9px]">{f.name?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  </td>
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
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default function IssuesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [showNewIssue, setShowNewIssue] = useState(false);
  const isMobile = useIsMobile();

  const { data: tickets = [] } = useQuery({
    queryKey: ['issues'],
    queryFn: listTickets,
  });

  const { data: founders = [] } = useQuery({
    queryKey: ['founders'],
    queryFn: listFounders,
  });

  const { data: projectsWithRepos = [] } = useQuery({
    queryKey: ['projects-with-repos'],
    queryFn: getProjectsWithRepos,
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
      <div className="flex items-center gap-2">
        <Sheet open={showNewIssue} onOpenChange={setShowNewIssue}>
          <SheetTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" /> New Issue</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader><SheetTitle>New Issue</SheetTitle><SheetDescription className="sr-only">Create a new issue/ticket</SheetDescription></SheetHeader>
            <IssueForm projectsWithRepos={projectsWithRepos} onSubmit={async (data) => {
              try {
                const result = await createTicket({
                  contact_email: 'admin@studio.internal',
                  contact_name: 'Admin',
                  title: data.title,
                  description: data.description || undefined,
                  source: 'inbound',
                  priority: data.priority,
                  project_id: data.project_id || null,
                }) as { github_sync_error?: string | null };
                toast.success('Issue created');
                if (result.github_sync_error) {
                  toast.warning(`GitHub sync note: ${result.github_sync_error}`);
                }
                setShowNewIssue(false);
                queryClient.invalidateQueries({ queryKey: ['issues'] });
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Failed to create issue');
              }
            }} />
          </SheetContent>
        </Sheet>
      </div>

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

      {isMobile ? (
        view === 'kanban' ? (
          <MobileStageList
            stages={COLUMNS}
            items={filtered}
            getItemStage={(t) => t.status}
            renderCard={(ticket) => <IssueCardContent ticket={ticket} founders={founders} />}
            stageColors={columnColors}
            emptyMessage="No issues"
            stageEmptyMessage="No issues in this stage"
          />
        ) : (
          <MobileCardList
            items={filtered}
            keyExtractor={(t) => t.id}
            onItemClick={(t) => router.push(`/issues/${t.id}`)}
            renderCard={(ticket) => (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-muted-foreground">{ticket.ticket_number}</span>
                  <Badge variant="outline" className={`text-[9px] px-1 py-0 ${priorityColors[ticket.priority] || ''}`}>
                    {ticket.priority}
                  </Badge>
                </div>
                <p className="text-sm font-medium truncate">{ticket.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusBadge status={ticket.status} />
                  <span className="text-xs text-muted-foreground">{ticket.contact_name}</span>
                </div>
              </div>
            )}
            emptyMessage="No issues found"
          />
        )
      ) : view === 'kanban' ? (
        <KanbanBoard
          columns={COLUMNS}
          items={filtered}
          getItemId={(t) => t.id}
          getItemStatus={(t) => t.status}
          onStatusChange={handleStatusChange}
          renderCard={(ticket) => <IssueCardContent ticket={ticket} founders={founders} />}
          columnColors={columnColors}
          emptyMessage="No issues"
        />
      ) : (
        <IssueTable tickets={filtered} founders={founders} />
      )}
    </div>
  );
}
