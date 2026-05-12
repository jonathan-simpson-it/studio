import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { listIssues } from '@/lib/github';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    const { data: repos } = await supabase
      .from('project_repos')
      .select('*, projects!inner(id)');

    if (!repos || repos.length === 0) {
      return NextResponse.json({ synced: 0 });
    }

    let totalSynced = 0;
    let totalFailed = 0;

    for (const repo of repos) {
      try {
        const issues = await listIssues(repo.full_name);
        for (const issue of issues) {
          const { error } = await supabase.from('synced_github_issues').upsert(
            {
              github_issue_id: issue.number,
              repo_id: repo.id,
              project_id: repo.project_id,
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
          if (error) {
            console.error(`Failed to sync issue #${issue.number} from ${repo.full_name}:`, error.message);
            totalFailed++;
          } else {
            totalSynced++;
          }
        }
      } catch (repoError) {
        console.error(`Sync failed for ${repo.full_name}:`, repoError);
      }
    }

    return NextResponse.json({ synced: totalSynced, failed: totalFailed });
  } catch (error) {
    console.error('GitHub sync cron error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
