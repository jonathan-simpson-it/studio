'use client';

import { use, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTicket, updateTicket, deleteTicket, getAllTicketTags } from '@/lib/db/actions/tickets';
import { listFounders } from '@/lib/db/actions/settings';
import { FounderMultiSelect } from '@/components/shared/FounderMultiSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDateTime } from '@/lib/utils';
import {
  ArrowLeft,
  ExternalLink,
  Link as LinkIcon,
  Tag,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Ticket } from '@/types';

const statuses = ['Open', 'In Progress', 'Resolved', 'Closed'] as const;
const priorities = ['Low', 'Medium', 'High', 'Urgent'] as const;

export default function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = use(params);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const [tagInput, setTagInput] = useState('');
  const [showDelete, setShowDelete] = useState(false);

  const { data: ticket } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => getTicket(id),
  });

  const { data: allTags = [] } = useQuery({
    queryKey: ['issue-tags'],
    queryFn: getAllTicketTags,
  });

  const { data: founders = [] } = useQuery({
    queryKey: ['founders'],
    queryFn: listFounders,
  });

  const availableTags = useMemo(
    () => allTags.filter((t: string) => !ticket?.tags?.includes(t)),
    [allTags, ticket?.tags]
  );

  async function handleSave(field: string, value: unknown) {
    if (!ticket) return;
    try {
      await updateTicket(ticket.id, { [field]: value });
      queryClient.setQueryData(['ticket', id], { ...ticket, [field]: value } as Ticket);
      toast.success('Ticket updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    }
  }

  async function handleAddTag(tag: string) {
    if (!ticket || ticket.tags.includes(tag)) return;
    await handleSave('tags', [...ticket.tags, tag]);
  }

  async function handleRemoveTag(tag: string) {
    if (!ticket) return;
    await handleSave('tags', ticket.tags.filter((t: string) => t !== tag));
  }

  async function handleDelete() {
    if (!ticket) return;
    try {
      await deleteTicket(ticket.id);
      toast.success('Issue deleted');
      router.push('/issues');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete ticket');
    }
  }

  if (!ticket) return null;

  return (
    <div className="max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/issues')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">{ticket.ticket_number}</h2>
            <StatusBadge status={ticket.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{ticket.title}</p>
        </div>
        <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={ticket.status}
                onValueChange={(v) => handleSave('status', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={ticket.priority}
                onValueChange={(v) => handleSave('priority', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assignees</Label>
              <FounderMultiSelect
                value={ticket.assignee_ids || []}
                onChange={(ids) => handleSave('assignee_ids', ids)}
              />
            </div>
            <div className="space-y-2">
              <Label>Client Name</Label>
              <Input value={ticket.contact_name} readOnly className="text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <Label>Client Email</Label>
              <Input value={ticket.contact_email} readOnly className="text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Input value={ticket.source} readOnly className="text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <Label>Created</Label>
              <Input value={formatDateTime(ticket.created_at)} readOnly className="text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {(ticket.tags || []).map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-xs gap-1">
                  {tag}
                  <button
                    className="text-muted-foreground hover:text-foreground leading-none"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    &times;
                  </button>
                </Badge>
              ))}
              <div className="relative">
                <input
                  ref={tagInputRef}
                  className="h-6 w-20 rounded-md border border-input bg-transparent px-1 text-xs outline-none focus:ring-1 focus:ring-ring"
                  placeholder="+tag"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (tagInput.trim()) {
                        handleAddTag(tagInput.trim());
                        setTagInput('');
                      }
                    }
                  }}
                  onBlur={() => {
                    if (tagInput.trim()) {
                      handleAddTag(tagInput.trim());
                      setTagInput('');
                    }
                  }}
                />
                {tagInput && availableTags.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-40 rounded-md border bg-popover p-1 shadow-md z-10 max-h-32 overflow-y-auto">
                    {availableTags
                      .filter((t) => t.toLowerCase().includes(tagInput.toLowerCase()))
                      .map((t) => (
                        <button
                          key={t}
                          className="block w-full text-left px-2 py-1 text-xs rounded hover:bg-accent"
                          onMouseDown={(e) => { e.preventDefault(); handleAddTag(t); setTagInput(''); }}
                        >
                          {t}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              className="w-full rounded-md border bg-transparent p-3 text-sm min-h-[120px]"
              value={ticket.description || ''}
              onChange={(e) => handleSave('description', e.target.value)}
            />
          </div>

          {ticket.original_message && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Original Message</Label>
              <div className="w-full rounded-md border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground whitespace-pre-wrap">
                {ticket.original_message}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-medium mb-4">Links</h3>
          <div className="space-y-3">
            {ticket.created_task_id && (
              <a
                href={`/tasks/${ticket.created_task_id}`}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <LinkIcon className="h-4 w-4" />
                View attached Task (id: {ticket.created_task_id.slice(0, 8)})
              </a>
            )}
            {ticket.created_issue_url && (
              <a
                href={ticket.created_issue_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                View GitHub Issue
              </a>
            )}
            {ticket.client_id && (
              <a
                href={`/clients/${ticket.client_id}`}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <LinkIcon className="h-4 w-4" />
                View Client
              </a>
            )}
            {ticket.project_id && (
              <a
                href={`/projects/${ticket.project_id}`}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <LinkIcon className="h-4 w-4" />
                View Project
              </a>
            )}
            {!ticket.created_task_id && !ticket.created_issue_url && !ticket.client_id && !ticket.project_id && (
              <p className="text-sm text-muted-foreground">No linked resources</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-medium mb-4">Timeline</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Created: {formatDateTime(ticket.created_at)}</p>
            <p>Updated: {formatDateTime(ticket.updated_at)}</p>
          </div>
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        entityName={ticket.ticket_number}
        entityType="Ticket"
        onConfirm={handleDelete}
      />
    </div>
  );
}
