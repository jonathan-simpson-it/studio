import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const CONFIG_PATH = join(homedir(), ".studio-mcp.json");

function loadConfig() {
  if (existsSync(CONFIG_PATH)) {
    try {
      const raw = readFileSync(CONFIG_PATH, "utf-8");
      return JSON.parse(raw);
    } catch {
      console.error(`Warning: failed to parse ${CONFIG_PATH}, falling back to env`);
    }
  }
  return {};
}

const config = loadConfig();
const BASE_URL = config.studioBaseUrl || process.env.STUDIO_BASE_URL || "http://localhost:3000";
const API_KEY = config.studioApiKey || process.env.STUDIO_API_KEY;

if (!API_KEY) {
  console.error("Error: STUDIO_API_KEY not set. Set it in ~/.studio-mcp.json or as an environment variable.");
  process.exit(1);
}

const authHeader = `Bearer ${API_KEY}`;

async function apiGet(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: authHeader },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error: ${res.status}`);
  }
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error: ${res.status}`);
  }
  return res.json();
}

const TOOLS = [
  // ─── READ-ONLY TOOLS ───────────────────────────────────────
  {
    name: "list_clients",
    description: `List all clients in Studio. Optionally filter by company name search.
Returns an array of clients with id, company_name, contact_name, email, services, currency_preference.
Use this to find a client's id before creating a project or task for them.`,
    inputSchema: {
      type: "object",
      properties: {
        search: {
          type: "string",
          description: "Optional company name search (case-insensitive partial match)",
        },
      },
    },
    handler: async (args) => {
      const params = args.search ? `?search=${encodeURIComponent(args.search)}` : "";
      const data = await apiGet(`/api/clients${params}`);
      return { content: [{ type: "text", text: JSON.stringify(data.clients, null, 2) }] };
    },
  },
  {
    name: "list_projects",
    description: `List all projects in Studio. Optionally filter by status or client_id.
Status values: "Planning", "In Progress", "Waiting on Client", "Review", "Completed".
Returns an array of projects with id, name, status, client_id, description, billing_type, currency, budget.`,
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: 'Filter by status: "Planning", "In Progress", "Waiting on Client", "Review", "Completed"',
        },
        client_id: {
          type: "string",
          description: "Filter by client ID (use list_clients first to find this)",
        },
      },
    },
    handler: async (args) => {
      const params = new URLSearchParams();
      if (args.status) params.set("status", args.status);
      if (args.client_id) params.set("client_id", args.client_id);
      const qs = params.toString();
      const data = await apiGet(`/api/projects${qs ? `?${qs}` : ""}`);
      return { content: [{ type: "text", text: JSON.stringify(data.projects, null, 2) }] };
    },
  },
  {
    name: "get_project",
    description: `Get detailed information about a specific project by its ID.
Returns the project along with its milestones, tasks, linked GitHub repos, synced issues, proposals, invoices, files, and costs.
Use this when you need full context about a project including financial and task data.`,
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The project ID (use list_projects first to find this)",
        },
      },
      required: ["id"],
    },
    handler: async (args) => {
      const data = await apiGet(`/api/projects/${args.id}`);
      return { content: [{ type: "text", text: JSON.stringify(data.project, null, 2) }] };
    },
  },
  {
    name: "list_tasks",
    description: `List tasks in Studio. Optionally filter by project_id, status, or assignee_id.
Status values: "Todo", "In Progress", "Bottlenecked", "Done".
Assignee_id is a user ID — tasks where that user is in the assignee_ids array.
Returns an array of tasks with id, title, description, status, priority, project_id, assignee_ids, due_date, est_hours.`,
    inputSchema: {
      type: "object",
      properties: {
        project_id: {
          type: "string",
          description: "Filter by project ID",
        },
        status: {
          type: "string",
          description: 'Filter by status: "Todo", "In Progress", "Bottlenecked", "Done"',
        },
        assignee_id: {
          type: "string",
          description: "Filter by assignee user ID",
        },
      },
    },
    handler: async (args) => {
      const params = new URLSearchParams();
      if (args.project_id) params.set("project_id", args.project_id);
      if (args.status) params.set("status", args.status);
      if (args.assignee_id) params.set("assignee_id", args.assignee_id);
      const qs = params.toString();
      const data = await apiGet(`/api/tasks${qs ? `?${qs}` : ""}`);
      return { content: [{ type: "text", text: JSON.stringify(data.tasks, null, 2) }] };
    },
  },

  // ─── MUTATION TOOLS ────────────────────────────────────────
  {
    name: "create_project",
    description: `Create a new project in Studio.
Requires name and client_id. Client_id can be found using list_clients.
Optional fields: status (default "Planning"), description, billing_type ("One-off", "Retainer", "Milestone", "Support"), currency ("HKD", "GBP", "IDR"), budget (number).
Returns the created project with its id.`,
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Project name (required)" },
        client_id: { type: "string", description: "Client ID — use list_clients first (required)" },
        status: {
          type: "string",
          description: 'Project status. Default: "Planning". Options: "Planning", "In Progress", "Waiting on Client", "Review", "Completed"',
        },
        description: { type: "string", description: "Project description" },
        billing_type: {
          type: "string",
          description: 'Billing type: "One-off", "Retainer", "Milestone", or "Support"',
        },
        currency: {
          type: "string",
          description: 'Currency: "HKD" (default), "GBP", or "IDR"',
        },
        budget: { type: "number", description: "Project budget in the specified currency" },
      },
      required: ["name", "client_id"],
    },
    handler: async (args) => {
      const data = await apiPost("/api/projects", args);
      return { content: [{ type: "text", text: JSON.stringify(data.project, null, 2) }] };
    },
  },
  {
    name: "create_task",
    description: `Create a new task in Studio.
Requires title and at least one of project_id or client_id.
Optional fields: description, priority ("Low", "Medium" default, "High", "Urgent"), status ("Todo" default, "In Progress", "Bottlenecked", "Done"), assignee_ids (array of user IDs), due_date (ISO date string), est_hours (number).
Returns the created task with its id.`,
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Task title (required)" },
        project_id: { type: "string", description: "Project ID — use list_projects or get_project first" },
        client_id: { type: "string", description: "Client ID — use list_clients first" },
        description: { type: "string", description: "Task description" },
        priority: {
          type: "string",
          description: 'Priority: "Low", "Medium" (default), "High", "Urgent"',
        },
        status: {
          type: "string",
          description: 'Status: "Todo" (default), "In Progress", "Bottlenecked", "Done"',
        },
        assignee_ids: {
          type: "array",
          items: { type: "string" },
          description: "Array of user IDs to assign this task to",
        },
        due_date: { type: "string", description: "Due date as ISO string (e.g. 2026-06-15T00:00:00Z)" },
        est_hours: { type: "number", description: "Estimated hours to complete" },
      },
      required: ["title"],
    },
    handler: async (args) => {
      const data = await apiPost("/api/tasks", args);
      return { content: [{ type: "text", text: JSON.stringify(data.task, null, 2) }] };
    },
  },
  {
    name: "create_ticket",
    description: `Create a support ticket in Studio.
Requires contact_email, contact_name, and title.
Optional: description, priority ("Low", "Medium" default, "High", "Urgent"), source (default "support-form").
Returns the created ticket with its ticket_number and id.`,
    inputSchema: {
      type: "object",
      properties: {
        contact_email: { type: "string", description: "Email of the person submitting the ticket (required)" },
        contact_name: { type: "string", description: "Name of the person submitting the ticket (required)" },
        title: { type: "string", description: "Ticket title/summary (required)" },
        description: { type: "string", description: "Detailed description of the issue" },
        priority: {
          type: "string",
          description: 'Priority: "Low", "Medium" (default), "High", "Urgent"',
        },
        source: {
          type: "string",
          description: 'Source: "support-form" (default), "email", "contact-form", "inbound", "github"',
        },
      },
      required: ["contact_email", "contact_name", "title"],
    },
    handler: async (args) => {
      const data = await apiPost("/api/tickets", args);
      return { content: [{ type: "text", text: JSON.stringify(data.ticket, null, 2) }] };
    },
  },
  {
    name: "create_github_issue",
    description: `Create a GitHub issue in one of Studio's linked repositories.
Requires repo (full name like "owner/repo") and title.
Optional: issueBody (markdown body), labels (array of strings), assignees (array of GitHub usernames).
Returns the created GitHub issue with its number, url, and state.`,
    inputSchema: {
      type: "object",
      properties: {
        repo: {
          type: "string",
          description: 'Repository full name, e.g. "jonathan-simpson-it/studio" (required)',
        },
        title: { type: "string", description: "Issue title (required)" },
        issueBody: { type: "string", description: "Issue body in markdown" },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "Array of label names to apply",
        },
        assignees: {
          type: "array",
          items: { type: "string" },
          description: "Array of GitHub usernames to assign",
        },
      },
      required: ["repo", "title"],
    },
    handler: async (args) => {
      const data = await apiPost("/api/github/create-issue", args);
      return { content: [{ type: "text", text: JSON.stringify(data.issue, null, 2) }] };
    },
  },
  {
    name: "generate_ai_content",
    description: `Generate AI-powered content using Studio's AI engine.
Available actions:
- "generate-project-summary": { name, status, description, milestones[], issueCount } → markdown summary
- "draft-email": { recipient, purpose, context } → { subject, body }
- "autofill-task-description": { title, projectContext } → description with acceptance criteria
- "generate-proposal": { name, client, services[], dealValue, currency } → full proposal text
- "generate-invoice": { project, milestones[], billingType, lineItems[] } → invoice line items
Returns { content, modelUsed, latencyMs }.`,
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: [
            "generate-project-summary",
            "draft-email",
            "autofill-task-description",
            "generate-proposal",
            "generate-invoice",
          ],
          description: "AI action type (required)",
        },
        context: {
          type: "object",
          description: "Action-specific data payload. See action descriptions for expected fields.",
        },
      },
      required: ["action", "context"],
    },
    handler: async (args) => {
      const data = await apiPost("/api/ai/generate", args);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  },
];

const server = new Server(
  { name: "studio-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = TOOLS.find((t) => t.name === request.params.name);
  if (!tool) {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }
  try {
    return await tool.handler(request.params.arguments || {});
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Studio MCP server running (base: ${BASE_URL})`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
