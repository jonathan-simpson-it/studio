const GOOGLE_SCOPES = [
  'openid',
  'profile',
  'email',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
];

export function getGoogleAuthUrl(redirectUri: string, state?: string): string {
  const params = new URLSearchParams({
    client_id: process.env.AUTH_GOOGLE_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    ...(state ? { state } : {}),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string, redirectUri: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.AUTH_GOOGLE_ID!,
      client_secret: process.env.AUTH_GOOGLE_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google token exchange failed: ${err}`);
  }

  return res.json();
}

export async function refreshGoogleToken(refreshToken: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID!,
      client_secret: process.env.AUTH_GOOGLE_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google token refresh failed: ${err}`);
  }

  return res.json();
}

export function googleApiFetch(
  accessToken: string,
  url: string,
  options?: RequestInit
) {
  return fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
