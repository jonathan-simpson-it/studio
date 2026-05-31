'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listTasks, createTask, updateTask } from '@/lib/db/actions/projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { KanbanBoard } from '@/components/shared/KanbanBoard';
import { BoardToolbar } from '@/components/shared/BoardToolbar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import { MarkdownEditor } from '@/components/shared/MarkdownEditor';
import { AIGenerateButton } from '@/components/shared/AIGenerateButton';
import { SmartFillButton } from '@/components/shared/SmartFillButton';
import { formatDate } from '@/lib/utils';
import {
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Task } from '@/types';

const columns = ['Todo', 'In Progress', 'Bottlenecked', 'Done'];

const columnColors: Record<string, string> = {
  Todo: 'bg-zinc-500',
  'In Progress': 'bg-blue-500',
  Bottlenecked: 'bg-amber-500',
  Done: 'bg-emerald-500',
};

const priorityStyles: Record<string, string> = {
  Low: 'border-zinc-400 text-zinc-400',
  Medium: 'border-amber-500 text-amber-500',
  High: 'border-orange-500 text-orange-500',
  Urgent: 'border-red-500 text-red-500',
};

function TaskCardContent({ task }: { task: Task }) {
  const router = useRouter();

  return (
    <Card
      className="transition-colors hover:bg-accent/50 cursor-pointer"
      onClick={() => router.push(`/tasks/${task.id}`)}
    >
      <CardContent className="p-3 space-y-2">
        <p className="text-sm font-medium">{task.title}</p>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Badge variant="outline" className={`text-[10px] ${priorityStyles[task.priority] || ''}`}>
            {task.priority}
          </Badge>
          {task.due_date && <span>Due {formatDate(task.due_date)}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function TaskTable({ tasks }: { tasks: Task[] }) {
  const router = useRouter();

  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Due Date</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr
                key={t.id}
                className="border-b text-sm transition-colors hover:bg-accent/50 cursor-pointer"
                onClick={() => router.push(`/tasks/${t.id}`)}
              >
                <td className="px-4 py-3 font-medium">{t.title}</td>
                <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={`text-[10px] ${priorityStyles[t.priority] || ''}`}>
                    {t.priority}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{t.due_date ? formatDate(t.due_date) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default function TasksPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: listTasks,
  });
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'kanban' | 'table' | 'board'>('board');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showNewSheet, setShowNewSheet] = useState(false);

  const filtered = tasks.filter((t) => {
    if (filterPriority && filterPriority !== '_all' && t.priority !== filterPriority) return false;
    if (filterStatus && filterStatus !== '_all' && t.status !== filterStatus) return false;
    return t.title.toLowerCase().includes(search.toLowerCase());
  });

  const handleStatusChange = useCallback(
    async (taskId: string, newStatus: string) => {
      queryClient.setQueryData<Task[]>(['tasks'], (prev) =>
        (prev ?? []).map((t) =>
          t.id === taskId ? { ...t, status: newStatus as Task['status'] } : t
        )
      );
      try {
        await updateTask(taskId, { status: newStatus });
        toast.success(`Task moved to ${newStatus}`);
      } catch {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        toast.error('Failed to update task status');
      }
    },
    [queryClient]
  );

  return (
    <div className="space-y-6">
      <BoardToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search tasks..."
        view={view === 'board' ? 'kanban' : 'table'}
        onViewChange={(v) => setView(v === 'kanban' ? 'board' : 'table')}
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
            key: 'status',
            label: 'Status',
            placeholder: 'Status',
            options: [
              { label: 'All', value: '_all' },
              { label: 'Todo', value: 'Todo' },
              { label: 'In Progress', value: 'In Progress' },
              { label: 'Bottlenecked', value: 'Bottlenecked' },
              { label: 'Done', value: 'Done' },
            ],
            value: filterStatus,
            onChange: setFilterStatus,
          },
        ]}
        createButton={
          <Sheet open={showNewSheet} onOpenChange={setShowNewSheet}>
            <SheetTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> New Task</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader><SheetTitle>New Task</SheetTitle><SheetDescription>Fill in the details for a new task</SheetDescription></SheetHeader>
              <TaskForm onSubmit={async (data) => {
                const userId = session?.user?.id;
                try {
                  await createTask({ ...data, created_by: userId } as Record<string, unknown>);
                  toast.success('Task created');
                  setShowNewSheet(false);
                  queryClient.invalidateQueries({ queryKey: ['tasks'] });
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Failed to create task');
                }
              }} />
            </SheetContent>
          </Sheet>
        }
      />

      {view === 'board' ? (
        <KanbanBoard
          columns={columns}
          items={filtered}
          getItemId={(t) => t.id}
          getItemStatus={(t) => t.status}
          onStatusChange={handleStatusChange}
          renderCard={(task) => <TaskCardContent task={task} />}
          columnColors={columnColors}
          emptyMessage="No tasks"
        />
      ) : (
        <TaskTable tasks={filtered} />
      )}
    </div>
  );
}

function TaskForm({ onSubmit }: { onSubmit: (data: Partial<Task>) => Promise<void> }) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'Medium', status: 'Todo' });
  const [dueDate, setDueDate] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, due_date: dueDate || null } as Partial<Task>); }} className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <Label>Smart Fill</Label>
        <SmartFillButton
          action="parse-task"
          onFill={(fields) => {
            if (fields.title) setForm((f) => ({ ...f, title: fields.title as string }));
            if (fields.description) setForm((f) => ({ ...f, description: fields.description as string }));
            if (fields.priority && ['Low', 'Medium', 'High', 'Urgent'].includes(fields.priority as string)) {
              setForm((f) => ({ ...f, priority: fields.priority as string }));
            }
            if (fields.due_date) setDueDate(fields.due_date as string);
          }}
          label="Smart Fill"
          entityLabel="task"
        />
      </div>
      <div className="space-y-2">
        <Label>Title</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Description</Label>
          <AIGenerateButton
            action="autofill-task-description"
            context={{ title: form.title }}
            onResult={(content) => setForm({ ...form, description: content })}
            label="AI"
          />
        </div>
        <MarkdownEditor
          value={form.description}
          onChange={(v) => setForm({ ...form, description: v })}
          minHeight={150}
          placeholder="Task description..."
        />
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
      <div className="space-y-2">
        <Label>Due Date</Label>
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      <Button type="submit" className="w-full">Create Task</Button>
    </form>
  );
}
