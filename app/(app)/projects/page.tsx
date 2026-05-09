'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Plus,
  GitBranch,
} from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import type { Project, Client } from '@/types';

export default function ProjectsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [projects, setProjects] = useState<(Project & { client_name?: string; repo_count?: number; issue_count?: number })[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterOwner, setFilterOwner] = useState('');
  const [showNewSheet, setShowNewSheet] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: projs } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    const { data: clts } = await supabase.from('clients').select('*');
    if (clts) setClients(clts);

    if (!projs) return;

    const enriched = await Promise.all(
      projs.map(async (p) => {
        const client = clts?.find((c) => c.id === p.client_id);
        const { count: repos } = await supabase.from('project_repos').select('*', { count: 'exact', head: true }).eq('project_id', p.id);
        const { count: issues } = await supabase.from('synced_github_issues').select('*', { count: 'exact', head: true }).eq('project_id', p.id).eq('state', 'open');
        return {
          ...p,
          client_name: client?.is_internal ? 'Internal — JSCo' : client?.company_name || 'Unknown',
          repo_count: repos || 0,
          issue_count: issues || 0,
        };
      })
    );

    setProjects(enriched);
  }

  const filtered = projects.filter((p) => {
    if (filterStatus && filterStatus !== '_all' && p.status !== filterStatus) return false;
    if (filterClient && filterClient !== '_all' && p.client_id !== filterClient) return false;
    return p.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64 pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All</SelectItem>
              {['Planning', 'In Progress', 'Waiting on Client', 'Review', 'Completed'].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Client" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Sheet open={showNewSheet} onOpenChange={setShowNewSheet}>
          <SheetTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Project</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader><SheetTitle>New Project</SheetTitle></SheetHeader>
            <ProjectForm clients={clients} onSubmit={async (data) => {
              const { error } = await supabase.from('projects').insert(data);
              if (error) { toast.error(error.message); return; }
              toast.success('Project created');
              setShowNewSheet(false);
              load();
            }} />
          </SheetContent>
        </Sheet>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Billing</th>
                <th className="px-4 py-3 font-medium">Repos</th>
                <th className="px-4 py-3 font-medium">Issues</th>
                <th className="px-4 py-3 font-medium">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b text-sm transition-colors hover:bg-accent/50 cursor-pointer" onClick={() => router.push(`/projects/${p.id}`)}>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.client_name}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{p.billing_type || '—'}</td>
                  <td className="px-4 py-3">{p.repo_count}</td>
                  <td className="px-4 py-3">{p.issue_count}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.end_date ? formatDate(p.end_date) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function ProjectForm({ clients, onSubmit }: { clients: Client[]; onSubmit: (data: Partial<Project>) => Promise<void> }) {
  const [form, setForm] = useState({
    name: '',
    client_id: '',
    billing_type: 'One-off',
    status: 'Planning',
    currency: 'HKD',
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form } as Partial<Project>); }} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Project Name</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label>Client</Label>
        <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
          <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Billing Type</Label>
          <Select value={form.billing_type} onValueChange={(v) => setForm({ ...form, billing_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['One-off', 'Retainer', 'Milestone', 'Support'].map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Currency</Label>
          <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['HKD', 'GBP', 'IDR'].map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" className="w-full">Create Project</Button>
    </form>
  );
}
