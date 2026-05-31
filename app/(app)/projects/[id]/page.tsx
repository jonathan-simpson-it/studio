'use client';

import { use, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProject, createTask, createMilestone, updateProject, deleteProject, updateMilestone, deleteMilestone, updateTask, deleteTask } from '@/lib/db/actions/projects';
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
  Clock,
  CheckCircle2,
  ListTodo,
  Trash2,
  Pencil,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Project, Client, Task, Milestone, SyncedGithubIssue, Note, FileRecord, Proposal, Invoice, ActivityLog, ProjectRepo } from '@/types';

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = use(params);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showNewIssue, setShowNewIssue] = useState(false);
  const [showNewMilestone, setShowNewMilestone] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
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

  const tasks = (project?.tasks ?? []) as Task[];
  const issues = (project?.syncedIssues ?? []) as SyncedGithubIssue[];
  const milestones = (project?.milestones ?? []) as Milestone[];
  const notes = (project?.notes ?? []) as Note[];
  const files = (project?.files ?? []) as FileRecord[];
  const proposals = (project?.proposals ?? []) as Proposal[];
  const invoices = (project?.invoices ?? []) as Invoice[];
  const repos = (project?.repos ?? []) as ProjectRepo[];
  const activities: ActivityLog[] = [];

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
        <CardContent className="p-6 grid grid-cols-2 gap-6 text-sm">
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
              <CardContent><MarkdownPreview value={project.description} /></CardContent>
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
                    if (!res.ok) throw new Error('Failed to create issue');
                    toast.success('GitHub issue created');
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
