'use server';

import { connect } from '@/lib/db/connect';
import { Project, Milestone, Task, ProjectRepo, SyncedGithubIssue } from '@/lib/db/models/projects';
import { Proposal, Invoice, Note, Cost, FileRecord } from '@/lib/db/models/docs';
import { Client, ActivityLog, IContact, Contact } from '@/lib/db/models/crm';
import { Ticket } from '@/lib/db/models/tickets';
import { DocNumberSequence, TimeEntry } from '@/lib/db/models/meta';
import { toPlain } from '@/lib/db/to-plain';
import { deleteFromGridFS } from '@/lib/storage/gridfs';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function listProjects() {
  await connect();
  return toPlain(await Project.find().sort({ created_at: -1 }).lean({ virtuals: true }));
}

export async function getProject(id: string) {
  await connect();
  const project = await Project.findById(id).lean({ virtuals: true });
  if (!project) return null;

  const [milestones, tasks, notes, files, repos, syncedIssues, proposals, invoices] = await Promise.all([
    Milestone.find({ project_id: id }).sort({ due_date: 1 }).lean({ virtuals: true }),
    Task.find({ project_id: id }).sort({ created_at: -1 }).lean({ virtuals: true }),
    Note.find({ project_id: id }).sort({ created_at: -1 }).lean({ virtuals: true }),
    (await import('@/lib/db/models/docs')).FileRecord.find({ project_id: id }).sort({ created_at: -1 }).lean({ virtuals: true }),
    ProjectRepo.find({ project_id: id }).lean({ virtuals: true }),
    SyncedGithubIssue.find({ project_id: id }).sort({ updated_at_github: -1 }).lean({ virtuals: true }),
    Proposal.find({ project_id: id }).sort({ created_at: -1 }).lean({ virtuals: true }),
    Invoice.find({ project_id: id }).sort({ created_at: -1 }).lean({ virtuals: true }),
  ]);

  return toPlain({ ...project, milestones, tasks, notes, files, repos, syncedIssues, proposals, invoices });
}

export async function createProject(data: Record<string, unknown>) {
  await connect();
  const project = await Project.create({ ...data, created_at: new Date(), updated_at: new Date() });
  return toPlain(project.toObject({ virtuals: true }));
}

export async function updateProject(id: string, data: Record<string, unknown>) {
  await connect();
  return toPlain(await Project.findByIdAndUpdate(id, { ...data, updated_at: new Date() }, { returnDocument: 'after' }).lean({ virtuals: true }));
}

export async function deleteProject(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    await connect();

    const files = await FileRecord.find({ project_id: id }).lean();
    await Promise.all(files.map(async (file: any) => {
      try {
        await deleteFromGridFS(file.storage_path);
      } catch {
        // GridFS file may already be deleted
      }
    }));

    await ActivityLog.deleteMany({ entity_id: id });

    await Promise.all([
      Milestone.deleteMany({ project_id: id }),
      Task.deleteMany({ project_id: id }),
      Note.deleteMany({ project_id: id }),
      ProjectRepo.deleteMany({ project_id: id }),
      SyncedGithubIssue.deleteMany({ project_id: id }),
      Proposal.deleteMany({ project_id: id }),
      Invoice.deleteMany({ project_id: id }),
      Cost.deleteMany({ project_id: id }),
      FileRecord.deleteMany({ project_id: id }),
      Ticket.deleteMany({ project_id: id }),
      TimeEntry.deleteMany({ project_id: id }),
    ]);

    const deleted = await Project.findByIdAndDelete(id).lean({ virtuals: true });
    if (!deleted) throw new Error('Project not found');

    revalidatePath('/projects');
    return toPlain(deleted);
  } catch (err) {
    console.error('Failed to delete project:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to delete project');
  }
}

export async function getProjectBudgetProgress(projectId: string) {
  await connect();
  const costs = await Cost.find({ project_id: projectId }).lean({ virtuals: true });
  const timeEntries = await TimeEntry.find({ project_id: projectId, end_time: { $ne: null } }).lean({ virtuals: true });
  const project = await Project.findById(projectId).lean({ virtuals: true });
  if (!project) return { budget: 0, spent: 0, remaining: 0, percentUsed: 0 };

  const totalCosts = costs.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
  const totalTimeCost = timeEntries.reduce((sum: number, t: any) => {
    if (!t.end_time || !t.start_time) return sum;
    const hours = (new Date(t.end_time).getTime() - new Date(t.start_time).getTime()) / 3600000;
    return sum + hours * (t.hourly_rate || 0);
  }, 0);
  const spent = totalCosts + totalTimeCost;
  const budget = project.budget || 0;

  return {
    budget,
    spent,
    remaining: Math.max(0, budget - spent),
    percentUsed: budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0,
  };
}

export async function getProjectStats() {
  await connect();
  const [activeCount, inProgressCount] = await Promise.all([
    Project.countDocuments({ status: { $ne: 'Completed' } }),
    Project.countDocuments({ status: 'In Progress' }),
  ]);
  return { activeCount, inProgressCount };
}

export async function getActiveProjects() {
  await connect();
  return toPlain(await Project.find({ status: { $ne: 'Completed' } }).sort({ created_at: -1 }).lean({ virtuals: true }));
}

export async function getProjectsForClient(clientId: string) {
  await connect();
  return toPlain(await Project.find({ client_id: clientId }).sort({ created_at: -1 }).lean({ virtuals: true }));
}

export async function getProjectRepos() {
  await connect();
  return toPlain(await ProjectRepo.find().lean({ virtuals: true }));
}

export async function getProjectReposByProject(projectId: string) {
  await connect();
  return toPlain(await ProjectRepo.find({ project_id: projectId }).lean({ virtuals: true }));
}

export async function linkRepoToProject(data: {
  project_id: string;
  github_repo_owner: string;
  github_repo_name: string;
  github_repo_url?: string;
}) {
  await connect();
  const full_name = `${data.github_repo_owner}/${data.github_repo_name}`;
  const existing = await ProjectRepo.findOne({ project_id: data.project_id, full_name }).lean({ virtuals: true });
  if (existing) {
    throw new Error('This repo is already linked to this project');
  }
  const repo = await ProjectRepo.create({
    project_id: data.project_id,
    github_repo_owner: data.github_repo_owner,
    github_repo_name: data.github_repo_name,
    github_repo_url: data.github_repo_url || `https://github.com/${full_name}`,
    full_name,
    created_at: new Date(),
  });
  return toPlain(repo.toObject({ virtuals: true }));
}

export async function unlinkRepoFromProject(repoId: string) {
  await connect();
  return toPlain(await ProjectRepo.findByIdAndDelete(repoId).lean({ virtuals: true }));
}

export async function getSyncedIssuesByProject(projectId: string) {
  await connect();
  return toPlain(await SyncedGithubIssue.find({ project_id: projectId }).sort({ updated_at_github: -1 }).lean({ virtuals: true }));
}

export async function getSyncedIssueCounts(projectId: string) {
  await connect();
  const [total, open] = await Promise.all([
    SyncedGithubIssue.countDocuments({ project_id: projectId }),
    SyncedGithubIssue.countDocuments({ project_id: projectId, state: 'open' }),
  ]);
  return { total, open };
}

// Milestones
export async function getMilestonesForProject(projectId: string) {
  await connect();
  return toPlain(await Milestone.find({ project_id: projectId }).sort({ due_date: 1 }).lean({ virtuals: true }));
}

export async function createMilestone(data: Record<string, unknown>) {
  await connect();
  const milestone = await Milestone.create({ ...data, created_at: new Date(), updated_at: new Date() });
  return toPlain(milestone.toObject({ virtuals: true }));
}

export async function updateMilestone(id: string, data: Record<string, unknown>) {
  await connect();
  return toPlain(await Milestone.findByIdAndUpdate(id, { ...data, updated_at: new Date() }, { returnDocument: 'after' }).lean({ virtuals: true }));
}

export async function deleteMilestone(id: string) {
  await connect();
  return Milestone.findByIdAndDelete(id);
}

export async function getUpcomingMilestones() {
  await connect();
  const now = new Date();
  return toPlain(await Milestone.find({ due_date: { $gte: now }, status: { $ne: 'Completed' } })
    .sort({ due_date: 1 }).lean({ virtuals: true }));
}

export async function getMilestoneStats() {
  await connect();
  const now = new Date();
  return toPlain(await Milestone.find({ due_date: { $gte: now }, status: { $ne: 'Completed' } })
    .sort({ due_date: 1 }).limit(10).lean({ virtuals: true }));
}

// Tasks
export async function listTasks() {
  await connect();
  return toPlain(await Task.find().sort({ created_at: -1 }).lean({ virtuals: true }));
}

export async function createTask(data: Record<string, unknown>) {
  await connect();
  const task = await Task.create({ ...data, created_at: new Date(), updated_at: new Date() });
  return toPlain(task.toObject({ virtuals: true }));
}

export async function getUserTasks(userId: string) {
  await connect();
  return toPlain(await Task.find({ assignee_ids: userId, status: { $ne: 'Done' } }).sort({ created_at: -1 }).lean({ virtuals: true }));
}

export async function getTask(id: string) {
  await connect();
  return toPlain(await Task.findById(id).lean({ virtuals: true }));
}

export async function getTaskStats() {
  await connect();
  const total = await Task.countDocuments({ status: { $ne: 'Done' } });
  const overdue = await Task.countDocuments({
    status: { $ne: 'Done' },
    due_date: { $lt: new Date() },
  });
  return { total, overdue };
}

export async function getTasksForProject(projectId: string) {
  await connect();
  return toPlain(await Task.find({ project_id: projectId }).sort({ created_at: -1 }).lean({ virtuals: true }));
}

export async function updateTask(id: string, data: Record<string, unknown>) {
  await connect();
  const task = await Task.findByIdAndUpdate(id, { ...data, updated_at: new Date() }, { returnDocument: 'after' }).lean({ virtuals: true });
  if (task && data.status === 'Done' && (task as any).is_recurring) {
    const t = task as any;
    const now = new Date();
    let nextDue: Date | null = null;
    if (t.next_due) {
      nextDue = new Date(t.next_due);
      switch (t.recurring_frequency) {
        case 'daily': nextDue.setDate(nextDue.getDate() + 1); break;
        case 'weekly': nextDue.setDate(nextDue.getDate() + 7); break;
        case 'monthly': nextDue.setMonth(nextDue.getMonth() + 1); break;
      }
    } else if (t.due_date) {
      nextDue = new Date(t.due_date);
      switch (t.recurring_frequency) {
        case 'daily': nextDue.setDate(nextDue.getDate() + 1); break;
        case 'weekly': nextDue.setDate(nextDue.getDate() + 7); break;
        case 'monthly': nextDue.setMonth(nextDue.getMonth() + 1); break;
      }
    }
    await Task.create({
      title: t.title,
      description: t.description,
      project_id: t.project_id,
      client_id: t.client_id,
      milestone_id: t.milestone_id,
      assignee_ids: t.assignee_ids,
      priority: t.priority,
      status: 'Todo',
      due_date: nextDue,
      est_hours: t.est_hours,
      is_recurring: true,
      recurring_frequency: t.recurring_frequency,
      next_due: nextDue,
      created_by: t.created_by,
      created_at: now,
      updated_at: now,
    });
  }
  return toPlain(task);
}

export async function deleteTask(id: string) {
  await connect();
  return Task.findByIdAndDelete(id);
}

export async function getAllTasksWithDueDates() {
  await connect();
  return toPlain(await Task.find({ due_date: { $ne: null } }).select('id title due_date project_id assignee_ids').lean({ virtuals: true }));
}

export async function getAllMilestonesWithDueDates() {
  await connect();
  return toPlain(await Milestone.find({ due_date: { $ne: null } }).select('id title due_date project_id').lean({ virtuals: true }));
}

export async function syncProjectIssues(projectId: string): Promise<{ synced: number; failed: number; ticketsCreated: number }> {
  await connect();

  const repos = await ProjectRepo.find({ project_id: projectId }).lean({ virtuals: true });
  if (!repos || repos.length === 0) return { synced: 0, failed: 0, ticketsCreated: 0 };

  const project = await Project.findById(projectId).lean({ virtuals: true });

  let totalSynced = 0;
  let totalFailed = 0;
  let ticketsCreated = 0;

  for (const repo of repos) {
    try {
      const { listIssues } = await import('@/lib/github');
      const issues = await listIssues((repo as any).full_name);

      for (const issue of issues) {
        try {
          const existing = await SyncedGithubIssue.findOne({ github_issue_id: issue.number }).lean({ virtuals: true });
          const isNew = !existing;

          await SyncedGithubIssue.findOneAndUpdate(
            { github_issue_id: issue.number },
            {
              github_issue_id: issue.number,
              repo_id: (repo as any)._id.toString(),
              project_id: projectId,
              title: issue.title,
              body: issue.body || '',
              state: issue.state,
              assignee_github_login: issue.assignee?.login || null,
              labels: issue.labels.map((l: any) => ({ name: l.name, color: l.color })),
              milestone_title: issue.milestone?.title || null,
              milestone_due_on: issue.milestone?.due_on || null,
              github_url: issue.html_url,
              created_at_github: issue.created_at,
              updated_at_github: issue.updated_at,
              synced_at: new Date().toISOString(),
            },
            { upsert: true }
          );
          totalSynced++;

          if (isNew && project && (project as any).client_id) {
            try {
              const { createTicketFromGithubIssue } = await import('@/lib/db/actions/tickets');
              const ticket = await createTicketFromGithubIssue({
                github_issue_id: issue.number,
                project_id: projectId,
                client_id: (project as any).client_id,
                title: issue.title,
                description: issue.body || '',
                github_url: issue.html_url,
                author_login: issue.user?.login || 'unknown',
              });
              if (ticket) ticketsCreated++;
            } catch (ticketErr) {
              console.error(`Failed to create ticket from GH issue #${issue.number}:`, ticketErr);
            }
          }
        } catch (err) {
          console.error(`Failed to sync issue #${issue.number} from ${(repo as any).full_name}:`, (err as Error).message);
          totalFailed++;
        }
      }
    } catch (repoError) {
      console.error(`Sync failed for ${(repo as any).full_name}:`, repoError);
    }
  }

  return { synced: totalSynced, failed: totalFailed, ticketsCreated };
}

export async function syncAllGithubIssues() {
  await connect();
  const repos = await ProjectRepo.find().lean({ virtuals: true });
  if (!repos || repos.length === 0) return { synced: 0, failed: 0, ticketsCreated: 0 };

  const projectIds = [...new Set(repos.map((r: any) => r.project_id as string))];
  let totalSynced = 0;
  let totalFailed = 0;
  let ticketsCreated = 0;

  for (const projectId of projectIds) {
    const result = await syncProjectIssues(projectId);
    totalSynced += result.synced;
    totalFailed += result.failed;
    ticketsCreated += result.ticketsCreated;
  }

  return { synced: totalSynced, failed: totalFailed, ticketsCreated };
}

export async function getAllSyncedIssuesWithDueDates() {
  await connect();
  return toPlain(await SyncedGithubIssue.find({ milestone_due_on: { $ne: null } }).select('id title github_url project_id milestone_due_on').lean({ virtuals: true }));
}
