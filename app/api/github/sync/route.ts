import { NextRequest, NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';
import { auth } from '@/auth';
import { listIssues } from '@/lib/github';
import type { SyncedGithubIssue } from '@/types';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServer();

  const body = await request.json();
  const { projectId } = body;

  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }

  try {
    const { data: repos } = await supabase
      .from('project_repos')
      .select('*')
      .eq('project_id', projectId);

    if (!repos || repos.length === 0) {
      return NextResponse.json({ error: 'No repos linked to this project' }, { status: 400 });
    }

    let totalSynced = 0
    let totalFailed = 0
    const failures: { repo: string; issue: number; error: string }[] = []

    for (const repo of repos) {
      const issues = await listIssues(repo.full_name)
      for (const issue of issues) {
        const { error } = await supabase.from("synced_github_issues").upsert(
          {
            github_issue_id: issue.number,
            repo_id: repo.id,
            project_id: projectId,
            title: issue.title,
            body: issue.body || "",
            state: issue.state,
            assignee_github_login: issue.assignee?.login || null,
            labels: issue.labels.map((l: any) => ({ name: l.name, color: l.color })),
            milestone_title: issue.milestone?.title || null,
            github_url: issue.html_url,
            created_at_github: issue.created_at,
            updated_at_github: issue.updated_at,
            synced_at: new Date().toISOString(),
          },
          { onConflict: "github_issue_id" }
        )

        if (error) {
          totalFailed++
          failures.push({ repo: repo.full_name, issue: issue.number, error: error.message })
        } else {
          totalSynced++
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
