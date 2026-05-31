#!/usr/bin/env node

import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

// ─── Config ───────────────────────────────────────────────────────
const CONFIG_PATH = join(homedir(), ".studio-mcp.json");

function loadConfig() {
  if (existsSync(CONFIG_PATH)) {
    try {
      return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
    } catch {}
  }
  return {};
}

const config = loadConfig();
const BASE_URL = config.studioBaseUrl || process.env.STUDIO_BASE_URL || "http://localhost:3000";
const API_KEY = config.studioApiKey || process.env.STUDIO_API_KEY;

function authHeaders() {
  if (!API_KEY) {
    console.error("Error: STUDIO_API_KEY not set.");
    console.error("Create ~/.studio-mcp.json with:");
    console.error('  { "studioBaseUrl": "https://studio.jonathansimpson.co", "studioApiKey": "st_..." }');
    process.exit(1);
  }
  return { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" };
}

// ─── Helpers ──────────────────────────────────────────────────────
async function apiGet(path) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: authHeaders() });
  if (!res.ok) { const err = await res.json().catch(() => ({ error: res.statusText })); throw new Error(err.error || `API error: ${res.status}`); }
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
  if (!res.ok) { const err = await res.json().catch(() => ({ error: res.statusText })); throw new Error(err.error || `API error: ${res.status}`); }
  return res.json();
}

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0];
  const flags = {};
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : true;
      flags[key] = val;
      if (val !== true) i++;
    }
  }
  return { command, flags };
}

function idOf(obj) {
  return obj.id || (obj._id ? obj._id.toString() : "—");
}

function projectSummary(p) {
  console.log(`  ${p.name} (id: ${idOf(p)})  status: ${p.status}  client: ${p.client_id ? p.client_id.slice(-6) : "—"}`);
}

function taskSummary(t) {
  console.log(`  ${t.title} (id: ${idOf(t)})  status: ${t.status}  priority: ${t.priority}`);
}

function clientSummary(c) {
  console.log(`  ${c.company_name} (id: ${idOf(c)})  ${c.contact_name}  ${c.email || "—"}`);
}

function ticketSummary(t) {
  console.log(`  #${t.ticket_number} ${t.title} (id: ${idOf(t)})  status: ${t.status}  priority: ${t.priority}`);
}

// ─── Commands ─────────────────────────────────────────────────────
const COMMANDS = {
  "list-clients": async (flags) => {
    const qs = flags.search ? `?search=${encodeURIComponent(flags.search)}` : "";
    const data = await apiGet(`/api/clients${qs}`);
    if (!data.clients.length) return console.log("No clients found.");
    console.log(`Found ${data.clients.length} client${data.clients.length > 1 ? "s" : ""}:`);
    data.clients.forEach(clientSummary);
  },

  "list-projects": async (flags) => {
    const params = new URLSearchParams();
    if (flags.status) params.set("status", flags.status);
    if (flags.client) params.set("client_id", flags.client);
    const qs = params.toString();
    const data = await apiGet(`/api/projects${qs ? `?${qs}` : ""}`);
    if (!data.projects.length) return console.log("No projects found.");
    console.log(`Found ${data.projects.length} project${data.projects.length > 1 ? "s" : ""}:`);
    data.projects.forEach(projectSummary);
  },

  "get-project": async (flags) => {
    if (!flags.id) throw new Error("Usage: studio-cli get-project --id <projectId>");
    const data = await apiGet(`/api/projects/${flags.id}`);
    const p = data.project;
    console.log(`Project: ${p.name}`);
    console.log(`  ID: ${idOf(p)}  Status: ${p.status}`);
    console.log(`  Client: ${p.client_id}  Currency: ${p.currency}`);
    console.log(`  Budget: ${p.budget || "—"}  Billing: ${p.billing_type || "—"}`);
    if (p.description) console.log(`  Description: ${p.description}`);
    if (p.milestones?.length) console.log(`  Milestones: ${p.milestones.length}`);
    if (p.tasks?.length) console.log(`  Tasks: ${p.tasks.length}`);
    if (p.repos?.length) console.log(`  GitHub repos: ${p.repos.map((r) => r.full_name).join(", ")}`);
    if (p.syncedIssues?.length) console.log(`  GitHub issues: ${p.syncedIssues.length}`);
    if (p.invoices?.length) console.log(`  Invoices: ${p.invoices.length}`);
    if (p.proposals?.length) console.log(`  Proposals: ${p.proposals.length}`);
  },

  "list-tasks": async (flags) => {
    const params = new URLSearchParams();
    if (flags.project) params.set("project_id", flags.project);
    if (flags.status) params.set("status", flags.status);
    if (flags.assignee) params.set("assignee_id", flags.assignee);
    const qs = params.toString();
    const data = await apiGet(`/api/tasks${qs ? `?${qs}` : ""}`);
    if (!data.tasks.length) return console.log("No tasks found.");
    console.log(`Found ${data.tasks.length} task${data.tasks.length > 1 ? "s" : ""}:`);
    data.tasks.forEach(taskSummary);
  },

  "create-project": async (flags) => {
    if (!flags.name) throw new Error("Usage: studio-cli create-project --name <name> --client <clientId> [--desc <desc>] [--status <status>] [--billing <type>]");
    if (!flags.client) throw new Error("--client (client_id) is required");
    const body = {
      name: flags.name, client_id: flags.client,
      description: flags.desc || null,
      status: flags.status || "Planning",
      billing_type: flags.billing || null,
      currency: flags.currency || "HKD",
      budget: flags.budget ? Number(flags.budget) : null,
    };
    const data = await apiPost("/api/projects", body);
    console.log(`✅ Created project "${data.project.name}" (id: ${idOf(data.project)})`);
    console.log(`   Status: ${data.project.status}  Client: ${data.project.client_id}`);
  },

  "create-task": async (flags) => {
    if (!flags.title) throw new Error("Usage: studio-cli create-task --title <title> --project <projectId> [--desc <desc>] [--priority <p>] [--status <s>]");
    const body = {
      title: flags.title,
      project_id: flags.project || null,
      client_id: flags.client || null,
      description: flags.desc || null,
      priority: flags.priority || "Medium",
      status: flags.status || "Todo",
      assignee_ids: flags.assignees ? flags.assignees.split(",").map((s) => s.trim()) : [],
      due_date: flags.due ? new Date(flags.due).toISOString() : null,
      est_hours: flags.hours ? Number(flags.hours) : null,
    };
    const data = await apiPost("/api/tasks", body);
    console.log(`✅ Created task "${data.task.title}" (id: ${idOf(data.task)})`);
    console.log(`   Status: ${data.task.status}  Priority: ${data.task.priority}`);
  },

  "create-ticket": async (flags) => {
    if (!flags.email || !flags.name || !flags.title) throw new Error("Usage: studio-cli create-ticket --email <email> --name <name> --title <title> [--desc <desc>] [--priority <p>]");
    const body = {
      contact_email: flags.email, contact_name: flags.name, title: flags.title,
      description: flags.desc || null,
      priority: flags.priority || "Medium",
      source: flags.source || "support-form",
    };
    const data = await apiPost("/api/tickets", body);
    console.log(`✅ Created ticket #${data.ticket.ticket_number} "${data.ticket.title}" (id: ${idOf(data.ticket)})`);
    console.log(`   Status: ${data.ticket.status}  Priority: ${data.ticket.priority}`);
  },

  "create-github-issue": async (flags) => {
    if (!flags.repo || !flags.title) throw new Error("Usage: studio-cli create-github-issue --repo <owner/repo> --title <title> [--body <body>]");
    const body = { repo: flags.repo, title: flags.title, issueBody: flags.body || null };
    if (flags.labels) body.labels = flags.labels.split(",").map((s) => s.trim());
    if (flags.assignees) body.assignees = flags.assignees.split(",").map((s) => s.trim());
    const data = await apiPost("/api/github/create-issue", body);
    console.log(`✅ Created GitHub issue #${data.issue.number} "${data.issue.title}"`);
    console.log(`   URL: ${data.issue.html_url}  State: ${data.issue.state}`);
  },

  help: async () => {
    console.log(`
Studio CLI — manage Studio by JS&C from the terminal.

Usage:
  studio-cli <command> [--key <value> ...]

Commands — Reads:
  list-clients               [--search <query>]
  list-projects              [--status <s>] [--client <id>]
  get-project                --id <projectId>
  list-tasks                 [--project <id>] [--status <s>] [--assignee <id>]

Commands — Writes:
  create-project             --name <n> --client <id> [--desc <d>] [--status <s>] [--billing <t>] [--currency <c>] [--budget <n>]
  create-task                --title <t> --project <id> [--desc <d>] [--priority <p>] [--status <s>] [--assignees <a,b>] [--due <iso>] [--hours <n>]
  create-ticket              --email <e> --name <n> --title <t> [--desc <d>] [--priority <p>] [--source <s>]
  create-github-issue        --repo <owner/name> --title <t> [--body <b>] [--labels <a,b>] [--assignees <a,b>]

Other:
  help                       Show this message

Config:
  Create ~/.studio-mcp.json:
    { "studioBaseUrl": "https://studio.jonathansimpson.co", "studioApiKey": "st_..." }
  Or set env vars STUDIO_BASE_URL and STUDIO_API_KEY.
`);
  },
};

// ─── Main ─────────────────────────────────────────────────────────
const { command, flags } = parseArgs();

if (!command || command === "help") {
  COMMANDS.help();
  process.exit(0);
}

const handler = COMMANDS[command];
if (!handler) {
  console.error(`Unknown command: ${command}`);
  console.error("Run 'studio-cli help' for usage.");
  process.exit(1);
}

handler(flags).catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
