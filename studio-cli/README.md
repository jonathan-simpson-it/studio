# Studio CLI

Command-line tool for [Studio](https://studio.jonathansimpson.co) — the Jonathan Simpson & Co. agency OS.

Create and inspect projects, tasks, clients, tickets, and GitHub issues from your terminal.

## Prerequisites

- Node.js 20+
- A Studio API key with `write` or `full` scope

## Setup

### 1. Generate an API key

```bash
cd studio-cli
node gen-key.js
```

It will ask for your email, a key name, and scope. The raw key is printed once — copy it.

### 2. Save your config

Create `~/.studio-mcp.json`:

```json
{
  "studioBaseUrl": "https://studio.jonathansimpson.co",
  "studioApiKey": "jsc_studio_your_key_here"
}
```

Or set env vars: `STUDIO_BASE_URL` and `STUDIO_API_KEY`.

### 3. Add the alias (optional)

```bash
echo 'alias studio-cli="node /path/to/studio/studio-cli/studio-cli.js"' >> ~/.zshrc
source ~/.zshrc
```

## Usage

### Read commands

```bash
studio-cli list-clients                            # all clients
studio-cli list-clients --search Acme              # search by company name
studio-cli list-projects                           # all projects
studio-cli list-projects --status "In Progress"    # filter by status
studio-cli list-projects --client 6a080e71...      # filter by client
studio-cli get-project --id 6a080f99...            # full project detail
studio-cli list-tasks                              # all tasks
studio-cli list-tasks --project 6a080f99...        # tasks for a project
studio-cli list-tasks --status "Todo"              # filter by status
```

### Write commands

```bash
studio-cli create-project --name "Website Redesign" --client 6a080e71...
studio-cli create-task --title "Deploy staging" --project 6a080f99... --priority High
studio-cli create-ticket --email client@example.com --name "Client Name" --title "Bug report"
studio-cli create-github-issue --repo "owner/repo" --title "Fix login bug" --body "Steps..."
```

Run `studio-cli help` for the full reference.
