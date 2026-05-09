import { Octokit } from '@octokit/rest';

let octokit: Octokit | null = null;

function getClient(): Octokit {
  if (!octokit) {
    octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
  }
  return octokit;
}

function parseRepo(fullName: string): { owner: string; repo: string } {
  const [owner, repo] = fullName.split('/');
  return { owner, repo };
}

export async function listIssues(repoFullName: string) {
  const { owner, repo } = parseRepo(repoFullName);
  const { data } = await getClient().issues.listForRepo({ owner, repo, state: 'open' });
  return data;
}

export async function createIssue(
  repoFullName: string,
  data: { title: string; body?: string; labels?: string[]; assignees?: string[] }
) {
  const { owner, repo } = parseRepo(repoFullName);
  const { data: issue } = await getClient().issues.create({
    owner,
    repo,
    title: data.title,
    body: data.body,
    labels: data.labels,
    assignees: data.assignees,
  });
  return issue;
}

export async function updateIssue(
  repoFullName: string,
  issueNumber: number,
  data: {
    title?: string;
    body?: string;
    state?: 'open' | 'closed';
    labels?: string[];
    assignees?: string[];
  }
) {
  const { owner, repo } = parseRepo(repoFullName);
  const { data: issue } = await getClient().issues.update({
    owner,
    repo,
    issue_number: issueNumber,
    title: data.title,
    body: data.body,
    state: data.state,
    labels: data.labels,
    assignees: data.assignees,
  });
  return issue;
}

export async function listMilestones(repoFullName: string) {
  const { owner, repo } = parseRepo(repoFullName);
  const { data } = await getClient().issues.listMilestones({ owner, repo });
  return data;
}

export async function listOrgRepos(org: string) {
  const { data } = await getClient().repos.listForOrg({ org, type: 'all', per_page: 100 });
  return data;
}

export async function verifyConnection(): Promise<{ ok: boolean; org?: string; error?: string }> {
  try {
    const { data } = await getClient().users.getAuthenticated();
    return { ok: true, org: data.login };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'GitHub connection failed' };
  }
}
