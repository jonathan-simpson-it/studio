'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTask, updateTask, deleteTask } from '@/lib/db/actions/projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, ExternalLink, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Task } from '@/types';

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = use(params);
  const [showDelete, setShowDelete] = useState(false);

  const { data: task } = useQuery({
    queryKey: ['task', id],
    queryFn: () => getTask(id),
  });

  if (!task) return null;

  async function handleSave(field: string, value: unknown) {
    if (!task) return;
    try {
      await updateTask(task.id, { [field]: value });
      queryClient.setQueryData(['task', id], { ...task, [field]: value } as Task);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    }
  }

  async function handleDelete() {
    if (!task) return;
    try {
      await deleteTask(task.id);
      toast.success('Task deleted');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      router.push('/tasks');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/tasks')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">{task.title}</h2>
          <div className="flex items-center gap-2">
            <StatusBadge status={task.status} />
            <Badge variant="outline" className="text-[10px]">{task.priority}</Badge>
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={task.status}
                onValueChange={(v) => handleSave('status', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['Todo', 'In Progress', 'Bottlenecked', 'Done'].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={task.priority}
                onValueChange={(v) => handleSave('priority', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['Low', 'Medium', 'High', 'Urgent'].map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                key={task.id + '-title'}
                defaultValue={task.title}
                onBlur={(e) => handleSave('title', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                key={task.id + '-due'}
                type="date"
                defaultValue={task.due_date?.split('T')[0] || ''}
                onBlur={(e) =>
                  handleSave('due_date', e.target.value ? new Date(e.target.value).toISOString() : null)
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              key={task.id + '-desc'}
              className="w-full rounded-md border bg-transparent p-3 text-sm min-h-[120px]"
              defaultValue={task.description || ''}
              onBlur={(e) => handleSave('description', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-medium mb-3">Linked Resources</h3>
          <div className="space-y-2">
            {task.project_id ? (
              <a
                href={`/projects/${task.project_id}`}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View Project
              </a>
            ) : null}
            {task.source_ticket_id ? (
              <a
                href={`/issues/${task.source_ticket_id}`}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View Source Ticket
              </a>
            ) : null}
            {task.created_at ? (
              <p className="text-xs text-muted-foreground">
                Created {formatDate(task.created_at)}
              </p>
            ) : null}
            {!task.project_id && !task.source_ticket_id && (
              <p className="text-sm text-muted-foreground">No linked resources</p>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        entityName={task.title}
        entityType="Task"
        onConfirm={handleDelete}
      />
    </div>
  );
}
