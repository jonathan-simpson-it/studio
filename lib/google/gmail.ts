import { googleApiFetch } from './client';

export interface GoogleLabel {
  id: string;
  name: string;
  type: string;
  messagesTotal: number;
  messagesUnread: number;
}

export interface GoogleMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    parts?: Array<{ mimeType: string; body: { data?: string } }>;
    body?: { data?: string };
    mimeType: string;
  };
  internalDate: string;
}

export async function listLabels(accessToken: string): Promise<GoogleLabel[]> {
  const res = await googleApiFetch(
    accessToken,
    'https://gmail.googleapis.com/gmail/v1/users/me/labels'
  );
  if (!res.ok) throw new Error(`Failed to list labels: ${await res.text()}`);
  const data = await res.json();
  return (data.labels || []).filter(
    (l: GoogleLabel) => l.type === 'user' || l.id === 'INBOX'
  );
}

export async function listMessages(
  accessToken: string,
  labelId: string,
  maxResults = 50
): Promise<{ id: string; threadId: string }[]> {
  const params = new URLSearchParams({
    labelIds: labelId,
    maxResults: String(maxResults),
    q: 'newer_than:30d',
  });
  const res = await googleApiFetch(
    accessToken,
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`
  );
  if (!res.ok) throw new Error(`Failed to list messages: ${await res.text()}`);
  const data = await res.json();
  return data.messages || [];
}

export async function getMessage(accessToken: string, messageId: string): Promise<GoogleMessage> {
  const res = await googleApiFetch(
    accessToken,
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`
  );
  if (!res.ok) throw new Error(`Failed to get message: ${await res.text()}`);
  return res.json();
}

export function getHeader(message: GoogleMessage, name: string): string | null {
  return message.payload.headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || null;
}

export function getPlainBody(message: GoogleMessage): string {
  if (message.payload.body?.data) {
    return Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
  }
  if (message.payload.parts) {
    const textPart = message.payload.parts.find((p) => p.mimeType === 'text/plain');
    if (textPart?.body?.data) {
      return Buffer.from(textPart.body.data, 'base64').toString('utf-8');
    }
  }
  return message.snippet || '';
}
