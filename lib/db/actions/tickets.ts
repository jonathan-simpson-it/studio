'use server';

import { connect } from '@/lib/db/connect';
import { Ticket } from '@/lib/db/models/tickets';
import { Client } from '@/lib/db/models/crm';
import { Task, Project, ProjectRepo } from '@/lib/db/models/projects';
import { DocNumberSequence } from '@/lib/db/models/meta';
import { createIssue } from '@/lib/github';
import { generateAIContent } from '@/lib/ai';
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
}

export async function createTicket(data: CreateTicketInput) {
  await connect();

  const ticketNumber = await getTicketNumber();

  const client = await Client.findOne({
    email: data.contact_email,
  }).lean({ virtuals: true });

  const clientId = client ? (client as any)._id.toString() : null;
  let projectId: string | null = null;
  let projectRepo: any = null;

  if (clientId) {
    const activeProject = await Project.findOne({
      client_id: clientId,
      status: { $ne: 'Completed' },
    }).sort({ created_at: -1 }).lean({ virtuals: true });

    if (activeProject) {
      projectId = (activeProject as any)._id.toString();
      projectRepo = await ProjectRepo.findOne({
        project_id: projectId,
      }).lean({ virtuals: true });
    }
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

export async function getTicketsByEmail(email: string) {
  await connect();

  const tickets = await Ticket.find({ contact_email: email })
    .sort({ created_at: -1 })
    .lean({ virtuals: true });

  const client = await Client.findOne({ email })
    .select('company_name contact_name ticket_package remaining_tickets')
    .lean({ virtuals: true });

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

export async function updateTicket(id: string, data: Record<string, unknown>) {
  await connect();
  return toPlain(
    await Ticket.findByIdAndUpdate(id, { ...data, updated_at: new Date() }, { returnDocument: 'after' }).lean({ virtuals: true })
  );
}

export async function deleteTicket(id: string) {
  await connect();
  return Ticket.findByIdAndDelete(id);
}

export async function getAllTicketTags() {
  await connect();
  const result = await Ticket.distinct('tags');
  return result as string[];
}
