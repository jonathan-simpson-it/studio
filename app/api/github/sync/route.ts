import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connect } from '@/lib/db/connect';
import { ProjectRepo, SyncedGithubIssue } from '@/lib/db/models/projects';
import { listIssues } from '@/lib/github';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { projectId } = body;

  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }

  try {
    await connect();

    const repos = await ProjectRepo.find({ project_id: projectId }).lean({ virtuals: true });

    if (!repos || repos.length === 0) {
      return NextResponse.json({ error: 'No repos linked to this project' }, { status: 400 });
    }

    let totalSynced = 0
    let totalFailed = 0
    const failures: { repo: string; issue: number; error: string }[] = []

    for (const repo of repos) {
      const issues = await listIssues((repo as any).full_name)
      for (const issue of issues) {
        try {
          await SyncedGithubIssue.findOneAndUpdate(
            { github_issue_id: issue.number },
            {
              github_issue_id: issue.number,
              repo_id: (repo as any)._id.toString(),
              project_id: projectId,
              title: issue.title,
              body: issue.body || "",
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
          )
          totalSynced++
        } catch (err) {
          totalFailed++
          failures.push({ repo: (repo as any).full_name, issue: issue.number, error: (err as Error).message })
        }
      }
    }

    if (totalFailed > 0) {
      console.error("GitHub sync partial failure:", failures)
    }

    return NextResponse.json({ synced: totalSynced, failed: totalFailed, failures })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
