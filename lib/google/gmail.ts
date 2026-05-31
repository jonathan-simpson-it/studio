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
    parts?: Array<{
      mimeType: string;
      body: { data?: string; attachmentId?: string; size?: number };
      parts?: Array<{
        mimeType: string;
        body: { data?: string; attachmentId?: string; size?: number };
      }>;
    }>;
    body?: { data?: string; attachmentId?: string; size?: number };
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
  maxResults = 50,
  query?: string
): Promise<{ id: string; threadId: string }[]> {
  const allMessages: { id: string; threadId: string }[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      labelIds: labelId,
      maxResults: String(Math.min(maxResults - allMessages.length, 500)),
    });
    if (query) params.set('q', query);
    if (pageToken) params.set('pageToken', pageToken);

    const res = await googleApiFetch(
      accessToken,
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`
    );
    if (!res.ok) throw new Error(`Failed to list messages: ${await res.text()}`);
    const data = await res.json();
    if (data.messages) {
      allMessages.push(...data.messages);
    }
    pageToken = data.nextPageToken;
  } while (pageToken && allMessages.length < maxResults);

  return allMessages.slice(0, maxResults);
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

export async function fetchAttachmentBody(
  accessToken: string,
  messageId: string,
  attachmentId: string
): Promise<string> {
  const res = await googleApiFetch(
    accessToken,
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`
  );
  if (!res.ok) throw new Error(`Failed to fetch attachment: ${await res.text()}`);
  const data = await res.json();
  if (data.data) {
    return Buffer.from(data.data, 'base64').toString('utf-8');
  }
  return '';
}

export async function getPlainBody(accessToken: string, messageId: string, message: GoogleMessage): Promise<string> {
  if (message.payload.mimeType?.startsWith('text/plain')) {
    if (message.payload.body?.data) {
      return Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    }
    if (message.payload.body?.attachmentId) {
      return fetchAttachmentBody(accessToken, messageId, message.payload.body.attachmentId);
    }
  }
  if (message.payload.parts) {
    for (const part of message.payload.parts) {
      if (part.mimeType?.startsWith('text/plain')) {
        if (part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
        if (part.body?.attachmentId) {
          return fetchAttachmentBody(accessToken, messageId, part.body.attachmentId);
        }
      }
    }
  }
  return message.snippet || '';
}

function findHtmlPart(
  parts: Array<{ mimeType: string; body: { data?: string; attachmentId?: string; size?: number }; parts?: any }>
): { content: string | null; attachmentId: string | null } {
  for (const part of parts) {
    if (part.mimeType?.startsWith('text/html')) {
      if (part.body?.data) {
        return { content: Buffer.from(part.body.data, 'base64').toString('utf-8'), attachmentId: null };
      }
      if (part.body?.attachmentId) {
        return { content: null, attachmentId: part.body.attachmentId };
      }
    }
    if (part.parts) {
      const nested = findHtmlPart(part.parts);
      if (nested.content || nested.attachmentId) return nested;
    }
  }
  return { content: null, attachmentId: null };
}

export async function getHtmlBody(accessToken: string, messageId: string, message: GoogleMessage): Promise<string | null> {
  if (message.payload.mimeType?.startsWith('text/html')) {
    if (message.payload.body?.data) {
      return Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    }
    if (message.payload.body?.attachmentId) {
      return fetchAttachmentBody(accessToken, messageId, message.payload.body.attachmentId);
    }
  }
  if (message.payload.parts) {
    const result = findHtmlPart(message.payload.parts);
    if (result.content) return result.content;
    if (result.attachmentId) {
      return fetchAttachmentBody(accessToken, messageId, result.attachmentId);
    }
  }
  return null;
}
