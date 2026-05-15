'use server';

import { connect } from '@/lib/db/connect';
import { Project, Milestone, Task, ProjectRepo, SyncedGithubIssue } from '@/lib/db/models/projects';
import { Proposal, Invoice, Note, Cost } from '@/lib/db/models/docs';
import { Client, ActivityLog, IContact, Contact } from '@/lib/db/models/crm';
import { toPlain } from '@/lib/db/to-plain';

export async function listProjects() {
  await connect();
  return Project.find().sort({ created_at: -1 }).lean({ virtuals: true });
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
  return Project.findByIdAndUpdate(id, { ...data, updated_at: new Date() }, { returnDocument: 'after' }).lean({ virtuals: true });
}

export async function deleteProject(id: string) {
  await connect();
  await Promise.all([
    Milestone.deleteMany({ project_id: id }),
    Task.deleteMany({ project_id: id }),
    Note.deleteMany({ project_id: id }),
    ProjectRepo.deleteMany({ project_id: id }),
    SyncedGithubIssue.deleteMany({ project_id: id }),
  ]);
  return Project.findByIdAndDelete(id);
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
  return Project.find({ status: { $ne: 'Completed' } }).sort({ created_at: -1 }).lean({ virtuals: true });
}

export async function getProjectsForClient(clientId: string) {
  await connect();
  return Project.find({ client_id: clientId }).sort({ created_at: -1 }).lean({ virtuals: true });
}

export async function getProjectRepos() {
  await connect();
  return ProjectRepo.find().lean({ virtuals: true });
}

export async function getProjectReposByProject(projectId: string) {
  await connect();
  return ProjectRepo.find({ project_id: projectId }).lean({ virtuals: true });
}

export async function getSyncedIssuesByProject(projectId: string) {
  await connect();
  return SyncedGithubIssue.find({ project_id: projectId }).sort({ updated_at_github: -1 }).lean({ virtuals: true });
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
  return Milestone.find({ project_id: projectId }).sort({ due_date: 1 }).lean({ virtuals: true });
}

export async function createMilestone(data: Record<string, unknown>) {
  await connect();
  const milestone = await Milestone.create({ ...data, created_at: new Date(), updated_at: new Date() });
  return milestone.toObject({ virtuals: true });
}

export async function updateMilestone(id: string, data: Record<string, unknown>) {
  await connect();
  return Milestone.findByIdAndUpdate(id, { ...data, updated_at: new Date() }, { returnDocument: 'after' }).lean({ virtuals: true });
}

export async function deleteMilestone(id: string) {
  await connect();
  return Milestone.findByIdAndDelete(id);
}

export async function getUpcomingMilestones() {
  await connect();
  const now = new Date();
  return Milestone.find({ due_date: { $gte: now }, status: { $ne: 'Completed' } })
    .sort({ due_date: 1 }).lean({ virtuals: true });
}

export async function getMilestoneStats() {
  await connect();
  const now = new Date();
  return Milestone.find({ due_date: { $gte: now }, status: { $ne: 'Completed' } })
    .sort({ due_date: 1 }).limit(10).lean({ virtuals: true });
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
  return Task.find({ assignee_id: userId, status: { $ne: 'Done' } }).sort({ created_at: -1 }).lean({ virtuals: true });
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
  return Task.find({ project_id: projectId }).sort({ created_at: -1 }).lean({ virtuals: true });
}

export async function updateTask(id: string, data: Record<string, unknown>) {
  await connect();
  return Task.findByIdAndUpdate(id, { ...data, updated_at: new Date() }, { returnDocument: 'after' }).lean({ virtuals: true });
}

export async function deleteTask(id: string) {
  await connect();
  return Task.findByIdAndDelete(id);
}

export async function getAllTasksWithDueDates() {
  await connect();
  return toPlain(await Task.find({ due_date: { $ne: null } }).select('id title due_date project_id assignee_id').lean({ virtuals: true }));
}

export async function getAllMilestonesWithDueDates() {
  await connect();
  return toPlain(await Milestone.find({ due_date: { $ne: null } }).select('id title due_date project_id').lean({ virtuals: true }));
}

export async function syncAllGithubIssues() {
  await connect();
  const repos = await ProjectRepo.find().lean({ virtuals: true });

  if (!repos || repos.length === 0) return { synced: 0, failed: 0 };

  let totalSynced = 0;
  let totalFailed = 0;

  for (const repo of repos) {
    try {
      const { listIssues } = await import('@/lib/github');
      const issues = await listIssues((repo as any).full_name);
      for (const issue of issues) {
        try {
          await SyncedGithubIssue.findOneAndUpdate(
            { github_issue_id: issue.number },
            {
              github_issue_id: issue.number,
              repo_id: (repo as any)._id.toString(),
              project_id: (repo as any).project_id,
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
        } catch (err) {
          console.error(`Failed to sync issue #${issue.number} from ${(repo as any).full_name}:`, (err as Error).message);
          totalFailed++;
        }
      }
    } catch (repoError) {
      console.error(`Sync failed for ${(repo as any).full_name}:`, repoError);
    }
  }

  return { synced: totalSynced, failed: totalFailed };
}

export async function getAllSyncedIssuesWithDueDates() {
  await connect();
  return toPlain(await SyncedGithubIssue.find({ milestone_due_on: { $ne: null } }).select('id title github_url project_id milestone_due_on').lean({ virtuals: true }));
}
