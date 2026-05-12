'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  SheetTrigger,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
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
  const supabase = createClient();
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<'board' | 'table'>('board');
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showNewSheet, setShowNewSheet] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    if (data) setTasks(data);
  }

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
            <SheetHeader><SheetTitle>New Task</SheetTitle></SheetHeader>
            <TaskForm onSubmit={async (data) => {
              const userId = session?.user?.id
              const { error } = await supabase.from('tasks').insert({ ...data, created_by: userId });
              if (error) { toast.error(error.message); return; }
              toast.success('Task created');
              setShowNewSheet(false);
              load();
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
  const [form, setForm] = useState({ title: '', priority: 'Medium', status: 'Todo' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form as Partial<Task>); }} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
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
      <Button type="submit" className="w-full">Create Task</Button>
    </form>
  );
}
