'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listTasks, createTask } from '@/lib/db/actions/projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils';
import {
  Search,
  Plus,
  LayoutGrid,
  Table2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Task } from '@/types';

export default function TasksPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: listTasks,
  });
  const [view, setView] = useState<'board' | 'table'>('board');
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showNewSheet, setShowNewSheet] = useState(false);

  const filtered = tasks.filter((t) => {
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    return t.title.toLowerCase().includes(search.toLowerCase());
  });

  const columns = ['Todo', 'In Progress', 'Bottlenecked', 'Done'];

  const getStatusColor = (s: string) => {
    const colors: Record<string, string> = { Todo: 'bg-zinc-500', 'In Progress': 'bg-blue-500', Bottlenecked: 'bg-amber-500', Done: 'bg-emerald-500' };
    return colors[s] || 'bg-zinc-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64 pl-9" />
          </div>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All</SelectItem>
              {['Low', 'Medium', 'High', 'Urgent'].map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
            </SelectContent>
          </Select>
          <div className="flex items-center rounded-lg border p-0.5">
            <Button variant={view === 'board' ? 'default' : 'ghost'} size="sm" onClick={() => setView('board')}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={view === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setView('table')}>
              <Table2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Sheet open={showNewSheet} onOpenChange={setShowNewSheet}>
          <SheetTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Task</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader><SheetTitle>New Task</SheetTitle><SheetDescription className="sr-only">Fill in the details for a new task</SheetDescription></SheetHeader>
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
      </div>

      {view === 'board' ? (
        <div className="grid grid-cols-4 gap-4">
          {columns.map((col) => (
            <div key={col}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${getStatusColor(col)}`} />
                  <h3 className="text-sm font-medium">{col}</h3>
                </div>
                <Badge variant="secondary" className="text-[10px]">{filtered.filter((t) => t.status === col).length}</Badge>
              </div>
              <div className="space-y-2">
                {filtered.filter((t) => t.status === col).map((t) => (
                  <Card key={t.id} className="cursor-pointer transition-colors hover:bg-accent/50">
                    <CardContent className="p-3 space-y-2">
                      <p className="text-sm font-medium">{t.title}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Badge variant="outline" className="text-[10px]">{t.priority}</Badge>
                        {t.due_date && <span>Due {formatDate(t.due_date)}</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
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
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b text-sm">
                    <td className="px-4 py-3 font-medium">{t.title}</td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{t.priority}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground">{t.due_date ? formatDate(t.due_date) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
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
