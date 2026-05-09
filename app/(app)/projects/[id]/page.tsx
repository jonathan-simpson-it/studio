'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ActivityTimeline } from '@/components/shared/ActivityTimeline';
import { FileUpload } from '@/components/shared/FileUpload';
import { AIGenerateButton } from '@/components/shared/AIGenerateButton';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  ArrowLeft,
  Plus,
  GitBranch,
  ExternalLink,
  Clock,
  CheckCircle2,
  ListTodo,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Project, Client, Task, Milestone, SyncedGithubIssue, Note, FileRecord, Proposal, Invoice, ActivityLog, ProjectRepo } from '@/types';

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [issues, setIssues] = useState<SyncedGithubIssue[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [repos, setRepos] = useState<ProjectRepo[]>([]);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showNewIssue, setShowNewIssue] = useState(false);
  const [showNewMilestone, setShowNewMilestone] = useState(false);

  useEffect(() => { load(); }, [params]);

  async function load() {
    const { id } = await params;

    const { data: proj } = await supabase.from('projects').select('*').eq('id', id).single();
    if (!proj) return;
    setProject(proj);

    const { data: cl } = await supabase.from('clients').select('*').eq('id', proj.client_id).single();
    if (cl) setClient(cl);

    const [
      { data: tsks },
      { data: iss },
      { data: mls },
      { data: nts },
      { data: fls },
      { data: prps },
      { data: invs },
      { data: acts },
      { data: rps },
    ] = await Promise.all([
      supabase.from('tasks').select('*').eq('project_id', id).order('created_at', { ascending: false }),
      supabase.from('synced_github_issues').select('*').eq('project_id', id).order('updated_at_github', { ascending: false }),
      supabase.from('milestones').select('*').eq('project_id', id).order('due_date', { ascending: true }),
      supabase.from('notes').select('*').eq('project_id', id).order('created_at', { ascending: false }),
      supabase.from('files').select('*').eq('project_id', id).order('created_at', { ascending: false }),
      supabase.from('proposals').select('*').eq('project_id', id).order('created_at', { ascending: false }),
      supabase.from('invoices').select('*').eq('project_id', id).order('created_at', { ascending: false }),
      supabase.from('activity_log').select('*, actor:users(full_name)').eq('entity_id', id).order('created_at', { ascending: false }).limit(50),
      supabase.from('project_repos').select('*').eq('project_id', id),
    ]);

    if (tsks) setTasks(tsks);
    if (iss) setIssues(iss);
    if (mls) setMilestones(mls);
    if (nts) setNotes(nts);
    if (fls) setFiles(fls);
    if (prps) setProposals(prps);
    if (invs) setInvoices(invs);
    if (acts) setActivities(acts);
    if (rps) setRepos(rps);
  }

  if (!project || !client) return null;

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === 'Done').length;
  const milestonesCompleted = milestones.filter((m) => m.status === 'Completed').length;
  const totalMilestones = milestones.length;
  const daysSinceStart = Math.floor((Date.now() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="max-w-5xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/projects')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">{project.name}</h2>
            <StatusBadge status={project.status} />
            <Badge variant="secondary" className="text-[10px]">{project.billing_type}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {client?.is_internal ? 'Internal — JSCo' : client?.company_name} · Started {formatDate(project.start_date)}
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks & Issues</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {project.description && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Description</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.description}</p></CardContent>
            </Card>
          )}

          <div className="grid grid-cols-3 gap-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total Tasks</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totalTasks}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Open Issues</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{issues.filter((i) => i.state === 'open').length}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Milestones</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{milestonesCompleted}/{totalMilestones} complete</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Budget</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{project.budget ? formatCurrency(project.budget, project.currency) : '—'}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Days Since Start</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{daysSinceStart}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Status</CardTitle></CardHeader><CardContent><StatusBadge status={project.status} /></CardContent></Card>
          </div>

          {repos.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Linked Repositories</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {repos.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 text-sm">
                      <GitBranch className="h-4 w-4 text-muted-foreground" />
                      <a href={r.github_repo_url || '#'} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {r.full_name}
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <AIGenerateButton
              action="generate-project-summary"
              context={{ name: project.name, description: project.description, status: project.status, milestones: milestones.length, open_issues: issues.filter((i) => i.state === 'open').length }}
              onResult={(content) => toast.success('Summary generated')}
            />
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div className="flex items-center gap-2">
            <Sheet open={showNewTask} onOpenChange={setShowNewTask}>
              <SheetTrigger asChild>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" /> New Task</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader><SheetTitle>New Task</SheetTitle></SheetHeader>
                <TaskForm projectId={project.id} milestones={milestones} onSubmit={async (data) => {
                  const { error } = await supabase.from('tasks').insert(data);
                  if (error) { toast.error(error.message); return; }
                  toast.success('Task created');
                  setShowNewTask(false);
                  load();
                }} />
              </SheetContent>
            </Sheet>

            <Sheet open={showNewIssue} onOpenChange={setShowNewIssue}>
              <SheetTrigger asChild>
                <Button size="sm" variant="outline">
                  <ExternalLink className="mr-2 h-4 w-4" /> New GitHub Issue
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader><SheetTitle>Create GitHub Issue</SheetTitle></SheetHeader>
                <GithubIssueForm repos={repos} onSubmit={async (data) => {
                  try {
                    const res = await fetch('/api/github/issues', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ repo: data.repo, title: data.title, body: data.body }),
                    });
                    if (!res.ok) throw new Error('Failed to create issue');
                    toast.success('GitHub issue created');
                    setShowNewIssue(false);
                    load();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Failed');
                  }
                }} />
              </SheetContent>
            </Sheet>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {[['Todo', 'bg-zinc-500'], ['In Progress', 'bg-blue-500'], ['Bottlenecked', 'bg-amber-500'], ['Done', 'bg-emerald-500']].map(([status, color]) => (
              <Card key={status as string}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-medium">{status as string}</CardTitle>
                    <Badge variant="secondary" className="text-[10px]">{tasks.filter((t) => t.status === status).length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {tasks.filter((t) => t.status === status).map((t) => (
                    <div key={t.id} className="rounded-md border p-2 text-sm space-y-1">
                      <p className="font-medium">{t.title}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{t.priority}</span>
                        {t.due_date && <span>Due {formatDate(t.due_date)}</span>}
                      </div>
                    </div>
                  ))}
                  {issues.filter((i) => status === 'In Progress' ? i.state === 'open' : false).map((i) => (
                    <div key={i.id} className="rounded-md border border-primary/20 p-2 text-sm space-y-1">
                      <div className="flex items-center gap-1">
                        <ExternalLink className="h-3 w-3 text-primary" />
                        <p className="font-medium">{i.title}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">GitHub · {i.state}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="milestones" className="space-y-4">
          <Dialog open={showNewMilestone} onOpenChange={setShowNewMilestone}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" /> New Milestone</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Milestone</DialogTitle></DialogHeader>
              <MilestoneForm onSubmit={async (data) => {
                const { error } = await supabase.from('milestones').insert({ ...data, project_id: project.id });
                if (error) { toast.error(error.message); return; }
                toast.success('Milestone created');
                setShowNewMilestone(false);
                load();
              }} />
            </DialogContent>
          </Dialog>

          <div className="space-y-3">
            {milestones.map((m) => {
              const mTasks = tasks.filter((t) => t.milestone_id === m.id);
              const complete = mTasks.filter((t) => t.status === 'Done').length;
              const pct = mTasks.length > 0 ? Math.round((complete / mTasks.length) * 100) : 0;
              return (
                <Card key={m.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{m.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Due {m.due_date ? formatDate(m.due_date) : '—'}</span>
                        <span>· {complete}/{mTasks.length} tasks</span>
                        <StatusBadge status={m.status} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="notes">
          <NotesTab notes={notes} projectId={project.id} onRefresh={load} />
        </TabsContent>

        <TabsContent value="files">
          <Card>
            <CardContent className="p-6 space-y-4">
              <FileUpload projectId={project.id} />
              {files.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>{f.name}</span>
                  <Badge variant="outline" className="text-[10px]">{f.visibility}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proposals">
          <ProposalsTab proposals={proposals} />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoicesTab invoices={invoices} />
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardContent className="p-6">
              <ActivityTimeline activities={activities} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TaskForm({ projectId, milestones, onSubmit }: { projectId: string; milestones: Milestone[]; onSubmit: (data: Partial<Task>) => Promise<void> }) {
  const [form, setForm] = useState({ title: '', priority: 'Medium', status: 'Todo', milestone_id: '' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, project_id: projectId } as Partial<Task>); }} className="space-y-4 pt-4">
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
      {milestones.length > 0 && (
        <div className="space-y-2">
          <Label>Milestone</Label>
          <Select value={form.milestone_id} onValueChange={(v) => setForm({ ...form, milestone_id: v })}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {milestones.map((m) => (<SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      )}
      <Button type="submit" className="w-full">Create Task</Button>
    </form>
  );
}

function GithubIssueForm({ repos, onSubmit }: { repos: ProjectRepo[]; onSubmit: (data: { repo: string; title: string; body: string }) => Promise<void> }) {
  const [form, setForm] = useState({ repo: repos[0]?.full_name || '', title: '', body: '' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Repository</Label>
        <Select value={form.repo} onValueChange={(v) => setForm({ ...form, repo: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {repos.map((r) => (<SelectItem key={r.id} value={r.full_name}>{r.full_name}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Title</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label>Body</Label>
        <textarea className="w-full rounded-md border bg-transparent p-3 text-sm" rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
      </div>
      <Button type="submit" className="w-full">Create Issue</Button>
    </form>
  );
}

function MilestoneForm({ onSubmit }: { onSubmit: (data: Partial<Milestone>) => Promise<void> }) {
  const [form, setForm] = useState({ title: '', due_date: '' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label>Due Date</Label>
        <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
      </div>
      <Button type="submit" className="w-full">Create Milestone</Button>
    </form>
  );
}

function NotesTab({ notes, projectId, onRefresh }: { notes: Note[]; projectId: string; onRefresh: () => void }) {
  const supabase = createClient();
  const [newNote, setNewNote] = useState('');

  async function addNote() {
    if (!newNote.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('notes').insert({ title: newNote.slice(0, 60), body: newNote, project_id: projectId, author_id: user.id });
    if (error) { toast.error(error.message); return; }
    setNewNote('');
    toast.success('Note added');
    onRefresh();
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="space-y-2">
          <textarea className="w-full rounded-md border bg-transparent p-3 text-sm" rows={3} placeholder="Quick note…" value={newNote} onChange={(e) => setNewNote(e.target.value)} />
          <Button size="sm" onClick={addNote}>Add Note</Button>
        </div>
        {notes.map((n) => (
          <div key={n.id} className="rounded-md border p-3">
            <p className="text-sm font-medium">{n.title}</p>
            {n.body && <p className="text-xs text-muted-foreground mt-1">{n.body.slice(0, 200)}</p>}
            <p className="text-[10px] text-muted-foreground mt-1">{formatDate(n.created_at)}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ProposalsTab({ proposals }: { proposals: Proposal[] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Number</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {proposals.map((p) => (
              <tr key={p.id} className="border-b text-sm">
                <td className="px-4 py-3 font-medium">{p.proposal_number}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3">{formatCurrency(p.total, p.currency)}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(p.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function InvoicesTab({ invoices }: { invoices: Invoice[] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Number</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Due</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b text-sm">
                <td className="px-4 py-3 font-medium">{inv.invoice_number}</td>
                <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                <td className="px-4 py-3">{formatCurrency(inv.total, inv.currency)}</td>
                <td className="px-4 py-3 text-muted-foreground">{inv.due_date || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
