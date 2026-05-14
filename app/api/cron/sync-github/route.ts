import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@/lib/db/connect';
import { ProjectRepo, SyncedGithubIssue } from '@/lib/db/models/projects';
import { listIssues } from '@/lib/github';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connect();
    const repos = await ProjectRepo.find().lean({ virtuals: true });

    if (!repos || repos.length === 0) {
      return NextResponse.json({ synced: 0 });
    }

    let totalSynced = 0;
    let totalFailed = 0;

    for (const repo of repos) {
      try {
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
                assignee_avatar_url: issue.assignee?.avatar_url || null,
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

    return NextResponse.json({ synced: totalSynced, failed: totalFailed });
  } catch (error) {
    console.error('GitHub sync cron error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
