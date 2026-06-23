# Skill: Backlog Ticket Reader

## When to use
When user says "run JIRA tasks", "implement next story",
"pick up next ticket", or "start ADLC".

## How to load a ticket

### Step 1 — Find the backlog file
List all .md files in docs/backlog/ using Glob.

If one file exists: use it automatically.
If multiple files exist: show numbered list and ask user to pick.
If no files exist: say "No backlog found. Run /pm-agent first to generate one."
STOP if no files found.

### Step 2 — Read the backlog file
Read the selected backlog file.
Extract all tickets where Status = "To Do".
Show as a simple numbered list:

"Tickets available (To Do):
1. {ticket-id} — {title} ({points}pts) [{type}]
2. {ticket-id} — {title} ({points}pts) [{type}]
...

Reply with the ticket number to proceed."
STOP. Wait for selection.

Ticket IDs are derived from the EPIC and ticket numbering
in the backlog file (e.g., 1.1, 1.2, 2.3).
If the backlog uses numeric IDs, format them as T-{n}
(e.g., T-1, T-2) for use as the ticketId.

### Step 3 — Load selected ticket into memory
Read the full description and acceptance criteria for the
selected ticket from the backlog file.

Store in memory immediately using memory_store:
  key: "jira:task:{ticketId}"
  value: {
    ticketId: "{ticketId}",
    title: "{ticket title}",
    labels: ["{type}"],  // backend, frontend, integration, infrastructure
    acSummary: "{first 3 acceptance criteria concatenated}"
  }

Confirm stored:
"Ticket {ticketId} — {title} loaded.

Type: {type}
Points: {n}
Depends on: {dependency or none}

Reply GO to write the spec."
STOP.
