import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listOrgRepos } from '@/lib/github';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const org = process.env.GITHUB_ORG || 'jonathan-simpson-it';

  try {
    const repos = await listOrgRepos(org);
    return NextResponse.json({
      repos: repos.map((r: any) => ({
        name: r.name,
        full_name: r.full_name,
        description: r.description,
        html_url: r.html_url,
        private: r.private,
        default_branch: r.default_branch,
      })),
    });
  } catch (error) {
    console.error('Failed to list org repos:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch repos' },
      { status: 500 }
    );
  }
}
