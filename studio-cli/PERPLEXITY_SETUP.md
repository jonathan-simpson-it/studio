# Studio CLI — Perplexity Setup Guide

## Prerequisites

- **Perplexity Pro** account
- **Node.js 20+** installed on your Mac
- A Studio API key (generated in Step 1)

---

## Step 1: Install dependencies (one-time)

```bash
cd /path/to/studio/studio-cli
npm install
```

(This only creates a minimal `package.json` with `"type": "module"` — no external packages.)

## Step 2: Generate a Studio API Key

```bash
node gen-key.js
```

Enter your email, a name like `mcp-perplexity`, and scope `write` (or `full`). Copy the key that's printed.

## Step 3: Save your config

Create `~/.studio-mcp.json` in your home directory:

```json
{
  "studioBaseUrl": "https://studio.jonathansimpson.co",
  "studioApiKey": "jsc_studio_your_key_here"
}
```

## Step 4: Test the CLI

```bash
node studio-cli.js list-clients
```

You should see your Studio clients printed. If you see `Error: Invalid API key`, you may need to generate a new key using the production MongoDB — or create one via Studio's web UI (Settings → Integrations → API Keys).

## Step 5: Add to Perplexity

1. Open **Perplexity Mac App**
2. Go to **Settings → Custom Instructions**
3. Paste the operating rule below

## Perplexity Custom Instructions (paste this)

```
When the user asks to create, list, or inspect Studio records (projects, tasks,
clients, tickets, GitHub issues), ask the user to run the appropriate studio-cli
command. Show the exact command to run based on what they want to do.

Studio CLI commands available:
-  studio-cli list-clients [--search <query>]
-  studio-cli list-projects [--status <s>] [--client <id>]
-  studio-cli get-project --id <projectId>
-  studio-cli list-tasks [--project <id>] [--status <s>] [--assignee <id>]
-  studio-cli create-project --name <n> --client <id> [--desc <d>] [--status <s>]
-  studio-cli create-task --title <t> --project <id> [--desc <d>] [--priority <p>]
-  studio-cli create-ticket --email <e> --name <n> --title <t> [--desc <d>]
-  studio-cli create-github-issue --repo <owner/repo> --title <t> [--body <b>]

Always tell the user what the command will do before they run it. Explain the output.
If a required field is missing (like client_id for create-project), suggest running a
list command first to find the ID. Prefer using the CLI over generic advice for any
operational Studio task.
```

## How it works

When you ask Perplexity "create a project called Website Redesign for Acme Corp":

1. Perplexity tells you: *"First, I'll find Acme Corp's client ID. Run this:*"
   `studio-cli list-clients --search "Acme"`
2. You run it, paste the output
3. Perplexity says: *"Their ID is 6a080e71... Now run:*"
   `studio-cli create-project --name "Website Redesign" --client 6a080e71...`
4. You run it, it's done

No extension needed. No MCP connector. Just you, Perplexity, and your terminal.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Error: STUDIO_API_KEY not set` | Create `~/.studio-mcp.json` with your API key |
| `Error: Invalid API key` | Generate a new key against the correct MongoDB (production ≠ local) |
| Client IDs seem wrong | Use `list-clients --search <name>` to find the right ID |
| `Error: name and client_id are required` | You're missing a required flag — run with the flag or check help |
