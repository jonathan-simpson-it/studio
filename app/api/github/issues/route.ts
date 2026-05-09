import { NextRequest, NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';
import { listIssues, createIssue, updateIssue } from '@/lib/github';

export async function GET(request: NextRequest) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const owner = searchParams.get('owner');
  const repo = searchParams.get('repo');

  if (!owner || !repo) {
    return NextResponse.json({ error: 'owner and repo required' }, { status: 400 });
  }

  try {
    const issues = await listIssues(`${owner}/${repo}`);
    return NextResponse.json({ issues });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch issues' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { repo, title, body: issueBody, labels, assignees } = body;

  if (!repo || !title) {
    return NextResponse.json({ error: 'repo and title required' }, { status: 400 });
  }

  try {
    const issue = await createIssue(repo, { title, body: issueBody, labels, assignees });
    return NextResponse.json({ issue });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create issue' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { repo, issueNumber, ...data } = body;

  if (!repo || !issueNumber) {
    return NextResponse.json({ error: 'repo and issueNumber required' }, { status: 400 });
  }

  try {
    const issue = await updateIssue(repo, issueNumber, data);
    return NextResponse.json({ issue });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update issue' },
      { status: 500 }
    );
  }
}
