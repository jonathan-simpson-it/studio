'use server';

import { connect } from '@/lib/db/connect';
import { Ticket } from '@/lib/db/models/tickets';
import { Client } from '@/lib/db/models/crm';
import { Project, ProjectRepo, Task } from '@/lib/db/models/projects';
import { Invoice } from '@/lib/db/models/docs';
import { DocNumberSequence } from '@/lib/db/models/meta';
import { User } from '@/lib/db/models/core';
import { generateAIContent } from '@/lib/ai';
import { createIssue, updateIssue } from '@/lib/github';
import { toPlain } from '@/lib/db/to-plain';

export async function getTicketNumber(): Promise<string> {
  await connect();
  const now = new Date();
  const year = now.getFullYear();
  const seq = await DocNumberSequence.findOneAndUpdate(
    { entity_type: 'ticket', year },
    { $inc: { sequence: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  return `TKT-${year}-${String(seq.sequence).padStart(4, '0')}`;
}

export interface CreateTicketInput {
  contact_email: string;
  contact_name: string;
  title: string;
  description?: string;
  original_message?: string;
  source?: string;
  priority?: string;
  project_id?: string | null;
}

export async function createTicket(data: CreateTicketInput) {
  await connect();

  const ticketNumber = await getTicketNumber();

  const client = await Client.findOne({
    email: data.contact_email,
  }).lean({ virtuals: true });

  const clientId = client ? (client as any)._id.toString() : null;
  let projectId: string | null = data.project_id || null;
  let projectRepo: any = null;

  if (clientId && !projectId) {
    const activeProject = await Project.findOne({
      client_id: clientId,
      status: { $ne: 'Completed' },
    }).sort({ created_at: -1 }).lean({ virtuals: true });

    if (activeProject) {
      projectId = (activeProject as any)._id.toString();
    }
  }

  if (projectId) {
    projectRepo = await ProjectRepo.findOne({
      project_id: projectId,
    }).lean({ virtuals: true });
  }

  let aiTitle = data.title;
  let aiDescription = data.description || null;
  let aiTags: string[] = [];
  let aiPriority = data.priority || 'Medium';
  const rawMessage = data.original_message || data.description || '';

  try {
    const aiJson = await generateAIContent('restructure-ticket', {
      title: data.title,
      original_message: rawMessage,
      contact_name: data.contact_name,
      contact_email: data.contact_email,
    });
    const parsed = JSON.parse(aiJson);
    if (parsed.restructured_description) {
      aiDescription = parsed.restructured_description;
    }
    if (parsed.suggested_title && parsed.suggested_title !== data.title) {
      aiTitle = parsed.suggested_title;
    }
    if (Array.isArray(parsed.tags) && parsed.tags.length > 0) {
      aiTags = parsed.tags.slice(0, 3);
    }
    if (parsed.suggested_priority && ['Low', 'Medium', 'High', 'Urgent'].includes(parsed.suggested_priority)) {
      aiPriority = parsed.suggested_priority;
    }
  } catch {
    // AI restructuring failed — use original values
  }

  const ticket = await Ticket.create({
    ticket_number: ticketNumber,
    client_id: clientId,
    project_id: projectId,
    contact_email: data.contact_email,
    contact_name: data.contact_name,
    title: aiTitle,
    description: aiDescription,
    original_message: data.original_message || null,
    tags: aiTags,
    source: data.source || 'support-form',
    priority: aiPriority,
    status: 'Open',
    created_at: new Date(),
    updated_at: new Date(),
  });

  const ticketPlain = toPlain(ticket.toObject({ virtuals: true }));

  let createdTaskId: string | null = null;
  let createdIssueUrl: string | null = null;

  if (clientId) {
    const taskDesc = [
      `**Ticket: ${ticketNumber}**`,
      `**From:** ${data.contact_name} (${data.contact_email})`,
      ``,
      `**Title:** ${aiTitle}`,
      ``,
      aiDescription || '',
    ].join('\n');

    const task = await Task.create({
      title: `[Ticket] ${aiTitle}`,
      description: taskDesc,
      project_id: projectId,
      client_id: clientId,
      priority: aiPriority,
      status: 'Todo',
      source_ticket_id: (ticket as any)._id.toString(),
      created_by: 'system',
      created_at: new Date(),
      updated_at: new Date(),
    });

    createdTaskId = (task as any)._id.toString();

    await Ticket.findByIdAndUpdate((ticket as any)._id, {
      created_task_id: createdTaskId,
      updated_at: new Date(),
    });
  }

  if (projectRepo && (projectRepo as any).full_name) {
    try {
      const ghBody = await generateAIContent('create-github-issue', {
        title: aiTitle,
        description: aiDescription || rawMessage,
        client_name: data.contact_name,
        client_email: data.contact_email,
        ticket_number: ticketNumber,
        original_message: rawMessage,
      });

      const issueBody = [
        `## Ticket: ${ticketNumber}`,
        ``,
        ghBody || '',
        ``,
        `---`,
        `*Original message from ${data.contact_name} (${data.contact_email}):*`,
        ``,
        rawMessage,
      ].join('\n');

      const issue = await createIssue((projectRepo as any).full_name, {
        title: aiTitle,
        body: issueBody,
        labels: ['ticket', aiPriority.toLowerCase()],
      });

      createdIssueUrl = issue.html_url;

      await Ticket.findByIdAndUpdate((ticket as any)._id, {
        created_issue_url: createdIssueUrl,
        updated_at: new Date(),
      });
    } catch (err) {
      console.error(`Failed to create GitHub issue for ticket ${ticketNumber}:`, err);
    }
  }

  if (client && (client as any).remaining_tickets !== null && (client as any).remaining_tickets !== undefined) {
    const current = (client as any).remaining_tickets;
    if (current > 0) {
      await Client.findByIdAndUpdate((client as any)._id, {
        remaining_tickets: current - 1,
        updated_at: new Date(),
      });
    }
  }

  return toPlain({
    ...ticketPlain,
    created_task_id: createdTaskId,
    created_issue_url: createdIssueUrl,
  });
}

export async function getTicketsByClient(clientId: string) {
  await connect();
  const tickets = await Ticket.find({ client_id: clientId })
    .sort({ created_at: -1 })
    .lean({ virtuals: true });

  const projectIds = [...new Set(tickets.map((t: any) => t.project_id).filter(Boolean))];
  const projects = projectIds.length > 0
    ? await Project.find({ _id: { $in: projectIds } }).select('name status').lean({ virtuals: true })
    : [];
  const projectRepos = projectIds.length > 0
    ? await ProjectRepo.find({ project_id: { $in: projectIds } }).lean({ virtuals: true })
    : [];

  return toPlain({
    tickets,
    projects,
    projectRepos,
  });
}

export async function getTicketsByEmail(email: string) {
  await connect();

  const tickets = await Ticket.find({ contact_email: email })
    .sort({ created_at: -1 })
    .lean({ virtuals: true });

  const client = await Client.findOne({ email })
    .select('company_name contact_name ticket_package remaining_tickets')
    .lean({ virtuals: true });

  let projects: any[] = [];
  let invoices: any[] = [];
  if (client) {
    const clientId = (client as any)._id.toString();
    projects = await Project.find({ client_id: clientId, status: { $ne: 'Completed' } })
      .select('name status')
      .sort({ created_at: -1 })
      .lean({ virtuals: true });
    invoices = await Invoice.find({ client_id: clientId, status: { $in: ['Sent', 'Overdue', 'Paid'] } })
      .select('invoice_number status total currency due_date')
      .sort({ created_at: -1 })
      .lean({ virtuals: true });
  }

  return {
    tickets: toPlain(tickets),
    client: client
      ? toPlain({
          company_name: (client as any).company_name,
          contact_name: (client as any).contact_name,
          ticket_package: (client as any).ticket_package,
          remaining_tickets: (client as any).remaining_tickets,
        })
      : null,
    projects: toPlain(projects),
    invoices: toPlain(invoices),
  };
}

export async function getTicket(id: string) {
  await connect();
  return toPlain(await Ticket.findById(id).lean({ virtuals: true }));
}

export async function listTickets() {
  await connect();
  return toPlain(await Ticket.find().sort({ created_at: -1 }).lean({ virtuals: true }));
}

function parseGithubIssueUrl(url: string): { owner: string; repo: string; issueNumber: number } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2], issueNumber: parseInt(match[3], 10) };
}

export async function updateTicket(id: string, data: Record<string, unknown>) {
  await connect();
  const ticket = await Ticket.findByIdAndUpdate(id, { ...data, updated_at: new Date() }, { returnDocument: 'after' }).lean({ virtuals: true });
  if (!ticket) return null;

  if ('assignee_ids' in data && Array.isArray(data.assignee_ids) && data.assignee_ids.length > 0 && (ticket as any).created_issue_url) {
    try {
      const parsed = parseGithubIssueUrl((ticket as any).created_issue_url as string);
      if (parsed) {
        const assigneeIds = data.assignee_ids as string[];
        const users = await User.find({ _id: { $in: assigneeIds } })
          .select('github_username')
          .lean({ virtuals: true });
        const githubUsernames = users
          .map((u: any) => u.github_username)
          .filter(Boolean) as string[];
        await updateIssue(`${parsed.owner}/${parsed.repo}`, parsed.issueNumber, { assignees: githubUsernames });
      }
    } catch (err) {
      console.error('Failed to sync GitHub issue assignees:', err);
    }
  }

  if ((data.status === 'Closed' || data.status === 'Resolved') && (ticket as any).created_issue_url) {
    const parsed = parseGithubIssueUrl((ticket as any).created_issue_url as string);
    if (parsed) {
      try {
        await updateIssue(`${parsed.owner}/${parsed.repo}`, parsed.issueNumber, { state: 'closed' });
      } catch (err) {
        console.error(`Failed to close GitHub issue for ticket ${(ticket as any).ticket_number}:`, err);
      }
    }
  }

  return toPlain(ticket);
}

export async function deleteTicket(id: string) {
  await connect();
  return Ticket.findByIdAndDelete(id);
}

export async function createTicketFromGithubIssue(data: {
  github_issue_id: number;
  project_id: string;
  client_id: string;
  title: string;
  description: string;
  github_url: string;
  author_login: string;
}) {
  await connect();

  const existingTicket = await Ticket.findOne({ created_issue_url: data.github_url }).lean({ virtuals: true });
  if (existingTicket) {
    return null;
  }

  const ticketNumber = await getTicketNumber();

  const ticket = await Ticket.create({
    ticket_number: ticketNumber,
    client_id: data.client_id,
    project_id: data.project_id,
    contact_email: `gh-${data.author_login}@github.com`,
    contact_name: `@${data.author_login} (GitHub)`,
    title: data.title,
    description: data.description,
    source: 'github',
    priority: 'Medium',
    status: 'Open',
    created_issue_url: data.github_url,
    created_at: new Date(),
    updated_at: new Date(),
  });

  return toPlain(ticket.toObject({ virtuals: true }));
}

export async function syncTicketStatusWithGithub() {
  await connect();
  const tickets = await Ticket.find({
    created_issue_url: { $ne: null },
    status: { $ne: 'Closed' },
  }).lean({ virtuals: true });

  let closed = 0;
  for (const ticket of tickets) {
    const url = (ticket as any).created_issue_url as string;
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
    if (!match) continue;

    try {
      const { getIssue } = await import('@/lib/github');
      const repoFull = `${match[1]}/${match[2]}`;
      const ghIssue = await getIssue(repoFull, parseInt(match[3], 10));
      if (ghIssue && ghIssue.state === 'closed') {
        await Ticket.findByIdAndUpdate((ticket as any)._id, {
          status: 'Closed',
          updated_at: new Date(),
        });
        closed++;
      }
    } catch (err) {
      console.error(`Failed to check GH issue status for ticket ${(ticket as any).ticket_number}:`, err);
    }
  }

  return { synced: closed };
}

export async function getAllTicketTags() {
  await connect();
  const result = await Ticket.distinct('tags');
  return result as string[];
}
