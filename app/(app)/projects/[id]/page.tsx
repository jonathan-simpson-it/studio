'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProject, getProjectBudgetProgress, createTask, createMilestone, updateProject, deleteProject, updateMilestone, deleteMilestone, updateTask, deleteTask, linkRepoToProject, unlinkRepoFromProject } from '@/lib/db/actions/projects';
import { createTicket, createTicketFromGithubIssue } from '@/lib/db/actions/tickets';
import { createNote } from '@/lib/db/actions/notes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SmartFillButton } from '@/components/shared/SmartFillButton';
import { MarkdownEditor } from '@/components/shared/MarkdownEditor';
import { MarkdownPreview } from '@/components/shared/MarkdownPreview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
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
import { KanbanBoard } from '@/components/shared/KanbanBoard';
import { BoardToolbar } from '@/components/shared/BoardToolbar';
import { ActivityTimeline } from '@/components/shared/ActivityTimeline';
import { FileUpload } from '@/components/shared/FileUpload';
import { AIGenerateButton } from '@/components/shared/AIGenerateButton';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  ArrowLeft,
  Plus,
  GitBranch,
  ExternalLink,
  CheckCircle2,
  Trash2,
  Pencil,
  RefreshCw,
  Link,
  Unlink,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Project, Client, Task, Milestone, SyncedGithubIssue, Note, FileRecord, Proposal, Invoice, ActivityLog, ProjectRepo, Ticket } from '@/types';

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = use(params);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [showNewIssue, setShowNewIssue] = useState(false);
  const [showNewMilestone, setShowNewMilestone] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showLinkRepo, setShowLinkRepo] = useState(false);
  const [syncingRepo, setSyncingRepo] = useState<string | null>(null);
  const [justSynced, setJustSynced] = useState<string | null>(null);
  const [confirmUnlink, setConfirmUnlink] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editMilestone, setEditMilestone] = useState<Milestone | null>(null);
  const [taskSearch, setTaskSearch] = useState('');
  const [taskView, setTaskView] = useState<'kanban' | 'table'>('kanban');
  const [taskFilterPriority, setTaskFilterPriority] = useState('');
  const [taskFilterStatus, setTaskFilterStatus] = useState('');

  const { data: project } = useQuery({
    queryKey: ['project', id],
    queryFn: () => getProject(id),
  });

  const { data: budgetProgress } = useQuery({
    queryKey: ['project-budget', id],
    queryFn: () => getProjectBudgetProgress(id),
    enabled: !!project?.budget,
  });

  const tasks = (project?.tasks ?? []) as Task[];
  const tickets = (project?.tickets ?? []) as Ticket[];
  const issues = (project?.syncedIssues ?? []) as SyncedGithubIssue[];
  const milestones = (project?.milestones ?? []) as Milestone[];
  const notes = (project?.notes ?? []) as Note[];
  const files = (project?.files ?? []) as FileRecord[];
  const proposals = (project?.proposals ?? []) as Proposal[];
  const invoices = (project?.invoices ?? []) as Invoice[];
  const repos = (project?.repos ?? []) as ProjectRepo[];
  const activities: ActivityLog[] = [];

  const syncedIssueCount = (repoId?: string) => {
    if (!repoId) return issues.filter((i) => i.state === 'open').length;
    return issues.filter((i) => i.repo_id === repoId && i.state === 'open').length;
  };

  useEffect(() => {
    if (repos.length > 0) {
      fetch('/api/github/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id }),
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['project', id] });
      }).catch(() => {});
    }
  }, [id]);

  function formatRelativeTime(date: string | Date): string {
    const now = Date.now();
    const then = new Date(date).getTime();
    const diff = now - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  function getSyncStatus(repoId: string): { label: string; color: string } {
    const repoIssues = issues.filter((i) => i.repo_id === repoId);
    if (repoIssues.length === 0) return { label: 'No synced issues', color: 'text-zinc-500' };
    const latest = repoIssues.reduce((a, b) =>
      new Date(a.synced_at) > new Date(b.synced_at) ? a : b
    );
    const elapsed = Date.now() - new Date(latest.synced_at).getTime();
    if (elapsed < 3600000) return { label: `Synced ${formatRelativeTime(latest.synced_at)}`, color: 'text-green-500' };
    if (elapsed < 86400000) return { label: `Synced ${formatRelativeTime(latest.synced_at)}`, color: 'text-amber-500' };
    return { label: `Synced ${formatRelativeTime(latest.synced_at)}`, color: 'text-red-500' };
  }

  async function handleSyncRepo(repoId: string) {
    setSyncingRepo(repoId);
    try {
      const res = await fetch('/api/github/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id }),
      });
      if (!res.ok) throw new Error('Sync failed');
      const data = await res.json();
      setJustSynced(repoId);
      setTimeout(() => setJustSynced(null), 1500);
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      toast.success(`Synced${data.ticketsCreated ? `, created ${data.ticketsCreated} ticket(s)` : ''}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncingRepo(null);
    }
  }

  async function handleUnlinkRepo(repoId: string) {
    try {
      await unlinkRepoFromProject(repoId);
      toast.success('Repository unlinked');
      queryClient.invalidateQueries({ queryKey: ['project', id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to unlink');
    }
  }

  async function handleSaveProject(field: string, value: unknown) {
    if (!project) return;
    try {
      await updateProject(project.id, { [field]: value });
      queryClient.setQueryData(['project', id], { ...project, [field]: value } as Project);
      toast.success('Project updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    }
  }

  async function handleDeleteProject() {
    if (!project) return;
    try {
      await deleteProject(project.id);
      toast.success('Project deleted');
      router.push('/projects');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  async function handleDeleteTask(taskId: string) {
    try {
      await deleteTask(taskId);
      toast.success('Task deleted');
      queryClient.invalidateQueries({ queryKey: ['project', id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete task');
    }
  }

  async function handleUpdateTask(taskId: string, data: Record<string, unknown>) {
    try {
      await updateTask(taskId, data);
      toast.success('Task updated');
      setEditTask(null);
      queryClient.invalidateQueries({ queryKey: ['project', id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update task');
    }
  }

  async function handleDeleteMilestone(milestoneId: string) {
    try {
      await deleteMilestone(milestoneId);
      toast.success('Milestone deleted');
      queryClient.invalidateQueries({ queryKey: ['project', id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete milestone');
    }
  }

  async function handleUpdateMilestone(milestoneId: string, data: Record<string, unknown>) {
    try {
      await updateMilestone(milestoneId, data);
      toast.success('Milestone updated');
      setEditMilestone(null);
      queryClient.invalidateQueries({ queryKey: ['project', id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update milestone');
    }
  }

  const taskColumnColors: Record<string, string> = {
    Todo: 'bg-zinc-500',
    'In Progress': 'bg-blue-500',
    Bottlenecked: 'bg-amber-500',
    Done: 'bg-emerald-500',
  };

  const filteredTasks = tasks.filter((t) => {
    if (taskFilterPriority && taskFilterPriority !== '_all' && t.priority !== taskFilterPriority) return false;
    if (taskFilterStatus && taskFilterStatus !== '_all' && t.status !== taskFilterStatus) return false;
    return t.title.toLowerCase().includes(taskSearch.toLowerCase());
  });

  const handleTaskStatusChange = useCallback(
    async (taskId: string, newStatus: string) => {
      queryClient.setQueryData(['project', id], (prev: Record<string, unknown> | undefined) => {
        if (!prev) return prev;
        const oldTasks = (prev.tasks as Task[]) ?? [];
        return {
          ...prev,
          tasks: oldTasks.map((t: Task) =>
            t.id === taskId ? { ...t, status: newStatus as Task['status'] } : t
          ),
        } as Record<string, unknown>;
      });
      try {
        await updateTask(taskId, { status: newStatus });
        toast.success(`Task moved to ${newStatus}`);
      } catch {
        queryClient.invalidateQueries({ queryKey: ['project', id] });
        toast.error('Failed to update task status');
      }
    },
    [queryClient, id]
  );

  if (!project) return null;

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
            Started {formatDate(project.start_date)}
          </p>
        </div>
        <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
          <div className="space-y-2">
            <Label>Project Name</Label>
            <Input
              value={project.name}
              onChange={(e) => handleSaveProject('name', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={project.status}
              onValueChange={(v) => handleSaveProject('status', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['Planning', 'In Progress', 'On Hold', 'Completed'].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Billing Type</Label>
            <Select
              value={project.billing_type || ''}
              onValueChange={(v) => handleSaveProject('billing_type', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['One-off', 'Retainer', 'Milestone', 'Support'].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Budget</Label>
            <Input
              type="number"
              value={project.budget || ''}
              onChange={(e) => handleSaveProject('budget', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input
              type="date"
              value={project.start_date?.split('T')[0] || ''}
              onChange={(e) => handleSaveProject('start_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
            />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select
              value={project.currency}
              onValueChange={(v) => handleSaveProject('currency', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['HKD', 'GBP', 'IDR'].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label>Description</Label>
        <textarea
          className="w-full rounded-md border bg-transparent p-3 text-sm"
          rows={3}
          value={project.description || ''}
          onChange={(e) => handleSaveProject('description', e.target.value)}
        />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="overflow-x-auto">
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
              <CardContent><MarkdownPreview value={project.description} /></CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total Tasks</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totalTasks}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Open Issues</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{issues.filter((i) => i.state === 'open').length}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Milestones</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{milestonesCompleted}/{totalMilestones} complete</p></CardContent></Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Budget</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{project.budget ? formatCurrency(project.budget, project.currency) : '—'}</p>
                {budgetProgress && project.budget > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          budgetProgress.percentUsed > 100
                            ? 'bg-destructive'
                            : budgetProgress.percentUsed > 80
                            ? 'bg-warning'
                            : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(100, budgetProgress.percentUsed)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{formatCurrency(budgetProgress.spent, project.currency)} spent</span>
                      <span className={budgetProgress.remaining <= 0 ? 'text-destructive font-medium' : ''}>
                        {budgetProgress.remaining > 0
                          ? `${formatCurrency(budgetProgress.remaining, project.currency)} left`
                          : 'Over budget'}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Days Since Start</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{daysSinceStart}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Status</CardTitle></CardHeader><CardContent><StatusBadge status={project.status} /></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-muted-foreground" />
                  GitHub Repositories
                  {repos.length > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                      {syncedIssueCount()} open issues
                    </Badge>
                  )}
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowLinkRepo(true)}>
                  <Link className="mr-1.5 h-3.5 w-3.5" /> Link Repo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {repos.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="rounded-full bg-muted p-3">
                    <GitBranch className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">No repositories linked</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Link a GitHub repo to sync issues and create tickets from this project.
                    </p>
                  </div>
                  <Button size="sm" variant="default" onClick={() => setShowLinkRepo(true)}>
                    <Link className="mr-1.5 h-3.5 w-3.5" /> Link a Repository
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {repos.map((r) => {
                    const status = getSyncStatus(r.id);
                    return (
                      <div
                        key={r.id}
                        className="group flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent/30"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-2 w-2 shrink-0 rounded-full ${status.color.replace('text-', 'bg-')}`} />
                          <div className="min-w-0">
                            {r.github_repo_url ? (
                              <a
                                href={r.github_repo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-primary hover:underline truncate block"
                              >
                                {r.full_name}
                              </a>
                            ) : (
                              <span className="font-medium truncate block">
                                {r.full_name}
                              </span>
                            )}
                            <p className={`text-[10px] mt-0.5 ${status.color}`}>{status.label}</p>
                          </div>
                        </div>
                        <div className="relative flex items-center gap-1 shrink-0 ml-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={syncingRepo === r.id}
                            onClick={() => handleSyncRepo(r.id)}
                            title="Sync issues"
                          >
                            {justSynced === r.id ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 transition-all duration-300" />
                            ) : (
                              <RefreshCw className={`h-3.5 w-3.5 ${syncingRepo === r.id ? 'animate-spin' : ''}`} />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Unlink repository"
                            onClick={() => setConfirmUnlink(r.id)}
                          >
                            <Unlink className="h-3.5 w-3.5" />
                          </Button>
                          {confirmUnlink === r.id && (
                            <div className="absolute right-0 top-8 z-50 flex items-center gap-2 rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                              <span className="text-muted-foreground">Unlink {r.full_name}?</span>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-7 text-[10px] px-2"
                                onClick={() => { handleUnlinkRepo(r.id); setConfirmUnlink(null); }}
                              >
                                Unlink
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[10px] px-2"
                                onClick={() => setConfirmUnlink(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <AIGenerateButton
              action="generate-project-summary"
              context={{ name: project.name, description: project.description, status: project.status, milestones: milestones.length, open_issues: issues.filter((i) => i.state === 'open').length }}
              onResult={(content) => toast.success('Summary generated')}
            />
          </div>

          <LinkRepoDialog
            open={showLinkRepo}
            onOpenChange={setShowLinkRepo}
            projectId={id}
            onLinked={() => {
              setShowLinkRepo(false);
              fetch('/api/github/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: id }),
              }).then(() => {
                queryClient.invalidateQueries({ queryKey: ['project', id] });
              }).catch(() => {});
            }}
          />
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div className="flex items-center gap-2">
            <Sheet open={showNewTask} onOpenChange={setShowNewTask}>
              <SheetTrigger asChild>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" /> New Task</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader><SheetTitle>New Task</SheetTitle><SheetDescription className="sr-only">Create a new task for this project</SheetDescription></SheetHeader>
                <TaskForm projectId={project.id} milestones={milestones} onSubmit={async (data) => {
                  try {
                    await createTask(data as Record<string, unknown>);
                    toast.success('Task created');
                    setShowNewTask(false);
                    queryClient.invalidateQueries({ queryKey: ['project', id] });
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Failed to create task');
                  }
                }} />
              </SheetContent>
            </Sheet>

            <Sheet open={showNewTicket} onOpenChange={setShowNewTicket}>
              <SheetTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="mr-2 h-4 w-4" /> New Ticket
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader><SheetTitle>New Ticket</SheetTitle><SheetDescription className="sr-only">Create a new issue/ticket for this project</SheetDescription></SheetHeader>
                <TicketForm projectId={project.id} onSubmit={async (data) => {
                  try {
                    await createTicket({
                      contact_email: 'admin@studio.internal',
                      contact_name: 'Admin',
                      title: data.title,
                      description: data.description,
                      source: 'inbound',
                      priority: data.priority,
                      project_id: project.id,
                    });
                    toast.success('Ticket created');
                    setShowNewTicket(false);
                    queryClient.invalidateQueries({ queryKey: ['project', id] });
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Failed to create ticket');
                  }
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
                <SheetHeader><SheetTitle>Create GitHub Issue</SheetTitle><SheetDescription className="sr-only">Create a new GitHub issue for this project</SheetDescription></SheetHeader>
                <GithubIssueForm repos={repos} projectName={project?.name} onSubmit={async (data) => {
                  try {
                    const res = await fetch('/api/github/issues', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ repo: data.repo, title: data.title, body: data.body }),
                    });
                    if (!res.ok) throw new Error('Failed to create GitHub issue');
                    const json = await res.json();
                    const ghIssue = json.issue;
                    toast.success('GitHub issue created');
                    if (project?.client_id && ghIssue?.number && ghIssue?.html_url) {
                      try {
                        await createTicketFromGithubIssue({
                          github_issue_id: ghIssue.number,
                          project_id: id,
                          client_id: project.client_id,
                          title: ghIssue.title || data.title,
                          description: data.body || '',
                          github_url: ghIssue.html_url,
                          author_login: 'studio',
                        });
                      } catch {
                        // ticket creation is best-effort
                      }
                    }
                    setShowNewIssue(false);
                    queryClient.invalidateQueries({ queryKey: ['project', id] });
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Failed');
                  }
                }} />
              </SheetContent>
            </Sheet>
          </div>

          <BoardToolbar
            search={taskSearch}
            onSearchChange={setTaskSearch}
            searchPlaceholder="Search project tasks..."
            view={taskView}
            onViewChange={setTaskView}
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
                value: taskFilterPriority,
                onChange: setTaskFilterPriority,
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
                value: taskFilterStatus,
                onChange: setTaskFilterStatus,
              },
            ]}
          />

          {taskView === 'kanban' ? (
            <KanbanBoard
              columns={['Todo', 'In Progress', 'Bottlenecked', 'Done']}
              items={filteredTasks}
              getItemId={(t: Task) => t.id}
              getItemStatus={(t: Task) => t.status}
              onStatusChange={handleTaskStatusChange}
              renderCard={(task: Task) => (
                <div className="group relative cursor-pointer" onClick={() => router.push(`/tasks/${task.id}`)}>
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-medium">{task.title}</p>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditTask(task); }}
                        className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-accent"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                        className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-destructive/10 text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                    <span>{task.priority}</span>
                    {task.due_date && <span>Due {formatDate(task.due_date)}</span>}
                  </div>
                </div>
              )}
              renderColumnExtra={(col) => {
                if (col !== 'In Progress') return null;
                return issues.filter((i) => i.state === 'open').map((i) => (
                  <div key={i.id} className="rounded-md border border-primary/20 p-2 text-sm space-y-1">
                    <div className="flex items-center gap-1">
                      <ExternalLink className="h-3 w-3 text-primary" />
                      <p className="font-medium">{i.title}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">GitHub · {i.state}</p>
                  </div>
                ));
              }}
              columnColors={taskColumnColors}
              emptyMessage="No tasks"
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Title</th>
                      <th className="px-4 py-3 font-medium">Priority</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Due Date</th>
                      <th className="px-4 py-3 font-medium">Milestone</th>
                      <th className="px-4 py-3 w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map((t) => (
                      <tr
                        key={t.id}
                        className="border-b text-sm transition-colors hover:bg-accent/50 cursor-pointer"
                        onClick={() => router.push(`/tasks/${t.id}`)}
                      >
                        <td className="px-4 py-3 font-medium">{t.title}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px]">{t.priority}</Badge>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                        <td className="px-4 py-3 text-muted-foreground">{t.due_date ? formatDate(t.due_date) : '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {t.milestone_id ? milestones.find((m) => m.id === t.milestone_id)?.title || '—' : '—'}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setEditTask(t)} className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-accent">
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button onClick={() => handleDeleteTask(t.id)} className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-destructive/10 text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {tickets.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Project Tickets / Issues ({tickets.length})</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={() => router.push('/issues')}
                >
                  View All Issues →
                </Button>
              </div>
              <Card>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="px-4 py-3 font-medium">Ticket</th>
                        <th className="px-4 py-3 font-medium">Title</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Priority</th>
                        <th className="px-4 py-3 font-medium">Source</th>
                        <th className="px-4 py-3 w-20"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.map((t) => (
                        <tr key={t.id} className="border-b text-sm hover:bg-accent/30 cursor-pointer" onClick={() => router.push(`/issues/${t.id}`)}>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{t.ticket_number}</td>
                          <td className="px-4 py-3 font-medium">{t.title}</td>
                          <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-[10px]">{t.priority}</Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{t.source}</td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            {t.created_issue_url && (
                              <a href={t.created_issue_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                GitHub <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="milestones" className="space-y-4">
          <Dialog open={showNewMilestone} onOpenChange={setShowNewMilestone}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" /> New Milestone</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Milestone</DialogTitle><DialogDescription>Create a new milestone for this project.</DialogDescription></DialogHeader>
              <MilestoneForm onSubmit={async (data) => {
                try {
                  await createMilestone({ ...data, project_id: project.id } as Record<string, unknown>);
                  toast.success('Milestone created');
                  setShowNewMilestone(false);
                  queryClient.invalidateQueries({ queryKey: ['project', id] });
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Failed to create milestone');
                }
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
                      <button onClick={() => setEditMilestone(m)} className="h-8 w-8 inline-flex items-center justify-center rounded hover:bg-accent">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeleteMilestone(m.id)} className="h-8 w-8 inline-flex items-center justify-center rounded hover:bg-destructive/10 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="notes">
          <NotesTab notes={notes} projectId={project.id} onRefresh={() => queryClient.invalidateQueries({ queryKey: ['project', id] })} />
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

      <Dialog open={!!editTask} onOpenChange={(o) => { if (!o) setEditTask(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Update task details.</DialogDescription>
          </DialogHeader>
          {editTask && (
            <EditTaskForm
              task={editTask}
              milestones={milestones}
              onSubmit={async (data) => {
                await handleUpdateTask(editTask.id, data);
              }}
              onCancel={() => setEditTask(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editMilestone} onOpenChange={(o) => { if (!o) setEditMilestone(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Milestone</DialogTitle>
            <DialogDescription>Update milestone details.</DialogDescription>
          </DialogHeader>
          {editMilestone && (
            <EditMilestoneForm
              milestone={editMilestone}
              onSubmit={async (data) => {
                await handleUpdateMilestone(editMilestone.id, data);
              }}
              onCancel={() => setEditMilestone(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        entityName={project.name}
        entityType="Project"
        onConfirm={handleDeleteProject}
      />
    </div>
  );
}

function LinkRepoDialog({
  open,
  onOpenChange,
  projectId,
  onLinked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onLinked: () => void;
}) {
  const [mode, setMode] = useState<'org' | 'manual'>('org');
  const [orgRepos, setOrgRepos] = useState<{ full_name: string; name: string; html_url: string }[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [manualOwner, setManualOwner] = useState('');
  const [manualRepo, setManualRepo] = useState('');
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && mode === 'org') {
      fetchRepos();
    }
  }, [open, mode]);

  async function fetchRepos() {
    setLoadingRepos(true);
    setError('');
    try {
      const res = await fetch('/api/github/repos');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch repos');
      }
      const data = await res.json();
      setOrgRepos(data.repos || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setOrgRepos([]);
    } finally {
      setLoadingRepos(false);
    }
  }

  async function handleLink() {
    setLinking(true);
    setError('');
    try {
      if (mode === 'org') {
        if (!selectedRepo) throw new Error('Select a repo');
        const [owner, name] = selectedRepo.split('/');
        await linkRepoToProject({ project_id: projectId, github_repo_owner: owner, github_repo_name: name });
      } else {
        if (!manualOwner.trim() || !manualRepo.trim()) throw new Error('Enter owner and repo name');
        await linkRepoToProject({
          project_id: projectId,
          github_repo_owner: manualOwner.trim(),
          github_repo_name: manualRepo.trim(),
        });
      }
      toast.success('Repository linked');
      onLinked();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link repo');
    } finally {
      setLinking(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link GitHub Repository</DialogTitle>
          <DialogDescription>Attach a GitHub repo to this project for issue syncing.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex gap-2">
            <Button variant={mode === 'org' ? 'default' : 'outline'} size="sm" onClick={() => setMode('org')}>
              Org Repos
            </Button>
            <Button variant={mode === 'manual' ? 'default' : 'outline'} size="sm" onClick={() => setMode('manual')}>
              Manual Entry
            </Button>
          </div>

          {mode === 'org' ? (
            <div className="space-y-2">
              <Label>Select Repository</Label>
              {loadingRepos ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading repos...
                </div>
              ) : orgRepos.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  {error || 'No repos found. Configure org name in Settings > Integrations.'}
                </p>
              ) : (
                <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a repo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {orgRepos.map((r) => (
                      <SelectItem key={r.full_name} value={r.full_name}>
                        {r.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {!loadingRepos && orgRepos.length > 0 && (
                <Button variant="ghost" size="sm" onClick={fetchRepos} className="text-xs">
                  <RefreshCw className="h-3 w-3 mr-1" /> Refresh
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Owner (user or org)</Label>
                <Input
                  value={manualOwner}
                  onChange={(e) => setManualOwner(e.target.value)}
                  placeholder="e.g. jonathansimpsons-co"
                />
              </div>
              <div className="space-y-2">
                <Label>Repository Name</Label>
                <Input
                  value={manualRepo}
                  onChange={(e) => setManualRepo(e.target.value)}
                  placeholder="e.g. client-website"
                />
              </div>
              {manualOwner && manualRepo && (
                <p className="text-xs text-muted-foreground">
                  Will link: <code className="bg-muted px-1 rounded">{manualOwner}/{manualRepo}</code>
                </p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              onClick={handleLink}
              disabled={linking || (mode === 'org' ? !selectedRepo : !manualOwner || !manualRepo)}
            >
              {linking ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Link className="h-4 w-4 mr-1" />}
              Link Repository
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TaskForm({ projectId, milestones, onSubmit }: { projectId: string; milestones: Milestone[]; onSubmit: (data: Partial<Task>) => Promise<void> }) {
  const [form, setForm] = useState({ title: '', priority: 'Medium', status: 'Todo', milestone_id: '_none' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); const milestoneId = form.milestone_id === '_none' ? null : form.milestone_id; onSubmit({ ...form, milestone_id: milestoneId, project_id: projectId } as Partial<Task>); }} className="space-y-4 pt-4">
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
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {['Todo', 'In Progress', 'Bottlenecked', 'Done'].map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      {milestones.length > 0 && (
        <div className="space-y-2">
          <Label>Milestone</Label>
          <Select value={form.milestone_id} onValueChange={(v) => setForm({ ...form, milestone_id: v })}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">None</SelectItem>
              {milestones.map((m) => (<SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      )}
      <Button type="submit" className="w-full">Create Task</Button>
    </form>
  );
}

function EditTaskForm({ task, milestones, onSubmit, onCancel }: { task: Task; milestones: Milestone[]; onSubmit: (data: Record<string, unknown>) => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState<{
    title: string;
    priority: string;
    status: string;
    milestone_id: string;
  }>({
    title: task.title,
    priority: task.priority || 'Medium',
    status: task.status || 'Todo',
    milestone_id: task.milestone_id || '_none',
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); const milestoneId = form.milestone_id === '_none' ? null : form.milestone_id; onSubmit({ ...form, milestone_id: milestoneId }); }} className="space-y-4 py-4">
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
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {['Todo', 'In Progress', 'Bottlenecked', 'Done'].map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      {milestones.length > 0 && (
        <div className="space-y-2">
          <Label>Milestone</Label>
          <Select value={form.milestone_id} onValueChange={(v) => setForm({ ...form, milestone_id: v })}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">None</SelectItem>
              {milestones.map((m) => (<SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Changes</Button>
      </DialogFooter>
    </form>
  );
}

function EditMilestoneForm({ milestone, onSubmit, onCancel }: { milestone: Milestone; onSubmit: (data: Record<string, unknown>) => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState<{
    title: string;
    due_date: string;
    status: string;
  }>({
    title: milestone.title,
    due_date: milestone.due_date?.split('T')[0] || '',
    status: milestone.status || 'Pending',
  });
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
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {['Pending', 'In Progress', 'Completed'].map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Changes</Button>
      </DialogFooter>
    </form>
  );
}

function TicketForm({ projectId, onSubmit }: { projectId: string; onSubmit: (data: { title: string; description: string; priority: string }) => Promise<void> }) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'Medium' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4 pt-4">
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
      <Button type="submit" className="w-full">Create Ticket</Button>
    </form>
  );
}

function GithubIssueForm({ repos, projectName, onSubmit }: { repos: ProjectRepo[]; projectName?: string; onSubmit: (data: { repo: string; title: string; body: string }) => Promise<void> }) {
  const [form, setForm] = useState({ repo: repos[0]?.full_name || '', title: '', body: '' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <Label>Smart Fill</Label>
        <SmartFillButton
          action="parse-github-issue"
          context={{ project_name: projectName }}
          onFill={(fields) => {
            if (fields.title) setForm((f) => ({ ...f, title: fields.title as string }));
            if (fields.body) setForm((f) => ({ ...f, body: fields.body as string }));
            if (fields.labels) {
              const labels = Array.isArray(fields.labels) ? fields.labels.join(', ') : fields.labels as string;
              if (labels) setForm((f) => ({ ...f, body: f.body ? `${f.body}\n\nLabels: ${labels}` : `Labels: ${labels}` }));
            }
          }}
          label="Smart Fill"
          entityLabel="issue"
        />
      </div>
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
  const { data: session } = useSession();
  const [newNote, setNewNote] = useState('');

  async function addNote() {
    if (!newNote.trim()) return;
    const userId = session?.user?.id;
    if (!userId) return;
    try {
      await createNote({ title: newNote.slice(0, 60), body: newNote, project_id: projectId, author_id: userId } as Record<string, unknown>);
      setNewNote('');
      toast.success('Note added');
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add note');
    }
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
            {n.body && <MarkdownPreview value={n.body} className="max-h-20 overflow-hidden text-xs text-muted-foreground mt-1" />}
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
