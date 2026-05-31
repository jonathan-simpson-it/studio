import { Octokit } from '@octokit/rest';

let cachedToken: { token: string; expiresAt: number } | null = null;
let cachedInstallationId: number | null = null;

function getAppAuth() {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

  if (!appId || !privateKey) {
    throw new Error('GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY must be set');
  }

  return { appId, privateKey };
}

async function getInstallationId(): Promise<number> {
  if (cachedInstallationId) return cachedInstallationId;

  const { appId, privateKey } = getAppAuth();
  const appOctokit = new Octokit({
    auth: {
      appId,
      privateKey,
    },
  });

  const { data: installations } = await appOctokit.request('GET /app/installations');
  const org = process.env.GITHUB_ORG || 'jonathan-simpson-it';
  const installation = installations.find(
    (i: any) => i.account?.login === org
  ) || installations[0];

  if (!installation) {
    throw new Error(`No GitHub App installation found for ${org}`);
  }

  cachedInstallationId = installation.id;
  return installation.id;
}

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 5 * 60 * 1000) {
    return cachedToken.token;
  }

  const { appId, privateKey } = getAppAuth();
  const installationId = await getInstallationId();

  const { data } = await new Octokit({
    auth: {
      appId,
      privateKey,
    },
  }).request('POST /app/installations/{installation_id}/access_tokens', {
    installation_id: installationId,
  });

  cachedToken = {
    token: data.token,
    expiresAt: new Date(data.expires_at).getTime(),
  };

  return cachedToken.token;
}

async function getClient(): Promise<Octokit> {
  const token = await getToken();
  return new Octokit({ auth: token });
}

function parseRepo(fullName: string): { owner: string; repo: string } {
  const [owner, repo] = fullName.split('/');
  return { owner, repo };
}

export async function listIssues(repoFullName: string) {
  const { owner, repo } = parseRepo(repoFullName);
  const client = await getClient();
  const { data } = await client.issues.listForRepo({ owner, repo, state: 'all', per_page: 100 });
  return data;
}

export async function getIssue(repoFullName: string, issueNumber: number) {
  const { owner, repo } = parseRepo(repoFullName);
  const client = await getClient();
  const { data } = await client.issues.get({ owner, repo, issue_number: issueNumber });
  return data;
}

export async function createIssue(
  repoFullName: string,
  data: { title: string; body?: string; labels?: string[]; assignees?: string[] }
) {
  const { owner, repo } = parseRepo(repoFullName);
  const client = await getClient();
  const { data: issue } = await client.issues.create({
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
  const client = await getClient();
  const { data: issue } = await client.issues.update({
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
  const client = await getClient();
  const { data } = await client.issues.listMilestones({ owner, repo, per_page: 100 });
  return data;
}

export async function listOrgRepos(org: string) {
  const client = await getClient();
  const { data } = await client.repos.listForOrg({ org, type: 'all', per_page: 100 });
  return data;
}

export async function createRepo(
  org: string,
  name: string,
  opts?: { private?: boolean; description?: string }
) {
  const client = await getClient();
  const { data } = await client.repos.createInOrg({
    org,
    name,
    private: opts?.private ?? false,
    description: opts?.description,
  });
  return data;
}

export async function verifyConnection(): Promise<{ ok: boolean; org?: string; error?: string }> {
  try {
    const client = await getClient();
    const { data } = await client.users.getAuthenticated();
    return { ok: true, org: data.login };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'GitHub connection failed' };
  }
}

export async function getAppInfo(): Promise<{
  appId: string;
  org: string;
  installationId: number;
  tokenExpiresIn: number;
  repos: number;
} | { error: string }> {
  try {
    const { appId } = getAppAuth();
    const installationId = await getInstallationId();
    const token = await getToken();

    const client = new Octokit({ auth: token });
    const { data: repos } = await client.request('GET /installation/repositories');

    const org = process.env.GITHUB_ORG || 'jonathan-simpson-it';

    return {
      appId,
      org,
      installationId,
      tokenExpiresIn: cachedToken ? cachedToken.expiresAt - Date.now() : 0,
      repos: repos.repositories.length,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to get app info' };
  }
}

export function resetCache() {
  cachedToken = null;
  cachedInstallationId = null;
}
