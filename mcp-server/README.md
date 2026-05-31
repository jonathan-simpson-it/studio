# Studio MCP Server

MCP (Model Context Protocol) server for [Studio](https://studio.jonathansimpson.co) — the Jonathan Simpson & Co. agency OS.

Allows AI assistants (Perplexity, Claude, etc.) to interact with Studio: create projects, tasks, tickets, GitHub issues, and more.

## Prerequisites

- **Perplexity Pro** account (MCP connectors require the paid tier)
- **Perplexity Mac App** (App Store version) — browser/web version does not support MCP
- **PerplexityXPC helper** installed (required by the Mac app for sandbox security)
- **Node.js 20+** installed on your Mac
- A **Studio API key** with `write` or `full` scope (create one in Studio → Settings → Integrations)

## Setup

### 1. Install MCP server dependencies

```bash
cd mcp-server
npm install
```

### 2. Configure your API key

Create `~/.studio-mcp.json`:

```json
{
  "studioBaseUrl": "https://studio.jonathansimpson.co",
  "studioApiKey": "st_your_api_key_here"
}
```

Or set environment variables when running the server:
- `STUDIO_BASE_URL` (default: `http://localhost:3000`)
- `STUDIO_API_KEY`

### 3. Add to Perplexity

1. Open Perplexity Mac App
2. Go to **Settings → Connectors → Add Connector**
3. Choose **Command** type (stdio)
4. Set the command:
   ```
   node /absolute/path/to/studio/mcp-server/index.js
   ```
5. Add environment variables if not using `~/.studio-mcp.json`:
   - `STUDIO_BASE_URL` = `https://studio.jonathansimpson.co`
   - `STUDIO_API_KEY` = `st_...`
6. Save and toggle the connector **ON** under **Sources** before querying

### 4. Verify it works

Ask Perplexity: *"List my clients in Studio"*

If the connector is working, Perplexity will call the `list_clients` tool and show your client data.

## Available Tools

### Read-only (data lookup)

| Tool | What it does |
|---|---|
| `list_clients` | List all clients, optionally search by company name |
| `list_projects` | List all projects, filter by status or client |
| `get_project` | Full project detail with milestones, tasks, repos, invoices |
| `list_tasks` | List tasks, filter by project, status, or assignee |

### Mutations (create/update)

| Tool | What it does |
|---|---|
| `create_project` | Create a new project (requires name + client_id) |
| `create_task` | Create a new task (requires title + project_id or client_id) |
| `create_ticket` | Create a support ticket |
| `create_github_issue` | Create a GitHub issue in a linked repo |
| `generate_ai_content` | Generate AI content (project summaries, emails, etc.) |

## Development

To test the MCP server locally:

```bash
cd mcp-server
echo '{"studioBaseUrl":"http://localhost:3000","studioApiKey":"st_test_key"}' > ~/.studio-mcp.json
npm start
```

The server listens on stdio and accepts JSON-RPC messages per the MCP specification.
