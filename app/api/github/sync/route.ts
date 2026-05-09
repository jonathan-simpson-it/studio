import { NextRequest, NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';
import { listIssues } from '@/lib/github';
import type { SyncedGithubIssue } from '@/types';

export async function POST(request: NextRequest) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

    let totalSynced = 0;

    for (const repo of repos) {
      const issues = await listIssues(repo.full_name);
      for (const issue of issues) {
        const { error } = await supabase.from('synced_github_issues').upsert(
          {
            github_issue_id: issue.number,
            repo_id: repo.id,
            project_id: projectId,
            title: issue.title,
            body: issue.body || '',
            state: issue.state,
            assignee_github_login: issue.assignee?.login || null,
            labels: issue.labels.map((l: any) => ({ name: l.name, color: l.color })),
            milestone_title: issue.milestone?.title || null,
            github_url: issue.html_url,
            created_at_github: issue.created_at,
            updated_at_github: issue.updated_at,
            synced_at: new Date().toISOString(),
          },
          { onConflict: 'github_issue_id' }
        );

        if (!error) totalSynced++;
      }
    }

    return NextResponse.json({ synced: totalSynced });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
