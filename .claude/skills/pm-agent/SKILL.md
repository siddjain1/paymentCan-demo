# Skill: PM Agent — Business to Backlog

## Trigger
User says "create backlog", "generate tickets",
"break down PRD into tickets", or "plan the sprint"

## Inputs accepted
- Path to a Technical Design file (docs/architecture/*.md)
- Path to a PRD file (docs/prd/*.md)
- Plain text requirement or design summary pasted into chat

## Output
Writes backlog to: docs/backlog/{feature}-backlog-{date}.md
Uploads EPICs and tasks to Jira (if env vars are set).

---

## Rules — Always Follow These

### EPIC Structure Rule
Always create EPICs before tickets.
Every ticket must belong to an EPIC.
Never create orphan tickets.

EPIC structure follows TWO dimensions simultaneously:

Dimension 1 — User Journey:
Each EPIC maps to one user journey.
Examples:
- Payee Journey — Mike creates and tracks payment requests
- Payer Journey — Sarah receives and acts on payment requests
- Admin Journey — operator manages rules and monitors flows
- System Journey — infrastructure, integrations, background jobs

Dimension 2 — Capability breakdown inside each EPIC:
Each EPIC contains tickets split by capability type:
- Backend API — Express endpoints, business logic, data layer
- Frontend UI — React components, user interactions
- Integration — third party connections, webhooks, events
- Infrastructure — config, migrations, environment setup

### Ticket Sizing Rule
Max 5 story points per ticket.
If a capability requires more than 5 points — split it.
Backend and frontend are always separate tickets.
Never combine backend and frontend in one ticket.

### UI Ticket Rule
Every frontend ticket must include this line in description:
"UI must be built using shadcn/ui components exclusively.
No raw HTML controls. No custom CSS components."
Agent decides layout and component selection.
This rule is non-negotiable — never omit it.

### Dependency Rule
Always identify and set dependencies between tickets.
Backend API ticket must be DONE before its
corresponding Frontend UI ticket starts.
Integration tickets depend on their Backend API ticket.
Infrastructure tickets have no dependencies — they go first.

### Ticket Size Rule
Keep ticket descriptions concise — max 15 lines.
Acceptance criteria: max 5 bullet points per ticket.
No TypeScript interfaces in tickets —
those belong in the spec written by spec-writer agent.

---

## Steps

### Step 1 — Read input
If a file path is provided: read the file using the Read tool.
If plain text: use it directly.
Extract: feature name, user personas, core capabilities needed.

### Step 2 — Check for existing backlog
List files in docs/backlog/ if the folder exists.
If any related files found, read them briefly to avoid duplicating work.

### Step 3 — Draft EPIC and ticket plan
Structure output as follows:

EPIC 1: {User Journey Name}
  Capability: Backend API
    Ticket 1.1 — {title} ({points}pts)
    Ticket 1.2 — {title} ({points}pts)
  Capability: Frontend UI
    Ticket 1.3 — {title} ({points}pts) — depends on 1.1
  Capability: Integration
    Ticket 1.4 — {title} ({points}pts) — depends on 1.1

EPIC 2: {User Journey Name}
  Capability: Backend API
    Ticket 2.1 — {title} ({points}pts)
  Capability: Frontend UI
    Ticket 2.2 — {title} ({points}pts) — depends on 2.1

Summary:
  Total EPICs: {n}
  Total tickets: {n}
  Total points: {n}
  Estimated sprints: {n} (assuming 20pts per sprint)

### Step 4 — HITL gate — PO review
Present the full EPIC and ticket plan to the PO.

Say exactly:
"Backlog plan ready for PO review.

{show the full structured plan above}

Total: {n} EPICs, {n} tickets, {n} points,
~{n} sprints to complete.

Reply APPROVED to save backlog file.
Reply REVISE: [feedback] to adjust the plan.
Reply REPLAN: [specific change] to restructure EPICs."

STOP. Do not save anything until APPROVED.

### Step 5 — Write backlog to local file
On APPROVED:
- Create docs/backlog/ folder if it does not exist
- Derive {feature} from the feature name (kebab-case, max 5 words)
- Derive {date} as YYYY-MM-DD
- Write the full backlog to: docs/backlog/{feature}-backlog-{date}.md

Format the file as follows:

---
feature: {feature name}
date: {date}
status: backlog
---

# Backlog: {feature name}

## EPICs

### EPIC 1: {journey name}
**Summary:** {one paragraph}

#### Ticket 1.1 — {title}
**Type:** Backend API | Frontend UI | Integration | Infrastructure
**Points:** {n}
**Priority:** High | Medium | Low
**Depends on:** {ticket id or none}
**Status:** To Do

**Description:**
{concise description — max 15 lines}

**Acceptance Criteria:**
- [ ] {criterion}
- [ ] {criterion}
- [ ] {criterion}

[repeat for all tickets]

## Summary
- Total EPICs: {n}
- Total tickets: {n}
- Total points: {n}
- Estimated sprints: {n}

## Execution Order
1. Infrastructure tickets — no dependencies, start immediately
2. Backend API tickets — in dependency order
3. Frontend UI tickets — after their backend tickets
4. Integration tickets — after their backend tickets

### Step 6 — Upload to Jira

Required environment variables (skip this step gracefully if any are missing):
- `JIRA_BASE_URL`     — e.g. https://your-org.atlassian.net
- `JIRA_EMAIL`        — Atlassian account email
- `JIRA_API_TOKEN`    — Atlassian API token
- `JIRA_PROJECT_KEY`  — Jira project key (e.g. PC); also accept as inline parameter

If any env var is missing, say:
"Skipping Jira upload — set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, and
JIRA_PROJECT_KEY to enable automatic upload."
Then proceed to Step 7.

If all vars are present, run the following PowerShell to upload:

1. Parse the saved markdown file. For each EPIC block extract:
   - epicTitle (the ### EPIC N: ... heading)
   - epicSummary (the **Summary:** paragraph)
   - tickets[] — each ticket's title, type (label), priority, description paragraphs, and AC bullet points

2. Create all EPICs first via POST /rest/api/3/issue (issuetype id lookup below).
   Collect the returned Jira key for each EPIC.

3. Create all tasks via POST /rest/api/3/issue, setting `parent` to the EPIC key.

Use this PowerShell pattern (same approach proven to work for this project):

```powershell
$base    = $env:JIRA_BASE_URL
$email   = $env:JIRA_EMAIL
$token   = $env:JIRA_API_TOKEN
$projKey = $env:JIRA_PROJECT_KEY
$creds   = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${email}:${token}"))
$headers = @{ Authorization="Basic $creds"; "Content-Type"="application/json"; Accept="application/json" }

# Resolve issue type IDs for this project
$meta      = Invoke-RestMethod "$base/rest/api/3/issue/createmeta?projectKeys=$projKey&expand=projects.issuetypes" -Headers $headers
$epicId    = ($meta.projects[0].issuetypes | Where-Object name -eq "Epic").id
$taskId    = ($meta.projects[0].issuetypes | Where-Object name -eq "Task").id

function Make-ADF($paragraphs, $acList) {
    $content = @()
    foreach ($p in $paragraphs) {
        $content += @{ type="paragraph"; content=@(@{ type="text"; text=$p }) }
    }
    if ($acList.Count -gt 0) {
        $content += @{ type="paragraph"; content=@(@{ type="text"; text="Acceptance Criteria:"; marks=@(@{type="strong"}) }) }
        $items = $acList | ForEach-Object { @{ type="listItem"; content=@(@{ type="paragraph"; content=@(@{ type="text"; text=$_ }) }) } }
        $content += @{ type="bulletList"; content=@($items) }
    }
    return @{ type="doc"; version=1; content=$content }
}

function Create-Issue($summary, $typeId, $desc, $parentKey, $labels, $priority) {
    $fields = @{ project=@{key=$projKey}; summary=$summary; issuetype=@{id=$typeId}; description=$desc }
    if ($parentKey) { $fields["parent"] = @{ key=$parentKey } }
    if ($labels.Count -gt 0) { $fields["labels"] = $labels }
    if ($priority) { $fields["priority"] = @{ name=$priority } }
    $r = Invoke-RestMethod "$base/rest/api/3/issue" -Headers $headers -Method Post `
         -Body (@{fields=$fields} | ConvertTo-Json -Depth 20)
    Write-Host "  CREATED $($r.key) — $summary"
    return $r.key
}
```

Call `Create-Issue` for each EPIC, store returned keys, then call it for each task
with `parentKey` set to its EPIC's returned key.

After all issues are created, print a summary table:
```
| Jira Key | Ticket | Type |
|---|---|---|
| PC-1 | EPIC 1: ... | Epic |
| PC-7 | 1.1 — ... | Task |
...
```

### Step 7 — Confirm and handoff
Say:
"Backlog saved to docs/backlog/{feature}-backlog-{date}.md
{if Jira upload ran}: {n} EPICs and {n} tasks created in Jira project {JIRA_PROJECT_KEY}.

To start implementation:
Say 'start ADLC' or 'implement next story'
and give the backlog file path: docs/backlog/{feature}-backlog-{date}.md"

---

## Ticket Description Templates

### Backend API ticket
{What this endpoint or service does — 2 sentences}

Endpoint: {METHOD /path}
Input: {key fields}
Output: {key fields}
Depends on: {ticket id or none}

Acceptance Criteria:
- [ ] Endpoint returns correct response for happy path
- [ ] Invalid input returns 400 with error code
- [ ] All unit tests pass

### Frontend UI ticket
{What this screen or component does — 2 sentences}

UI must be built using shadcn/ui components exclusively.
No raw HTML controls. No custom CSS components.

Consumes: {API endpoint from backend ticket}
Depends on: {backend ticket id}

Acceptance Criteria:
- [ ] Component renders correctly with real API data
- [ ] Error state handled gracefully
- [ ] Mobile responsive
- [ ] All component tests pass

### Integration ticket
{What this integration does — 2 sentences}

Service: {third party service name}
Trigger: {what triggers this integration}
Depends on: {backend ticket id}

Acceptance Criteria:
- [ ] Integration connects successfully
- [ ] Failure handled with retry or fallback
- [ ] All tests pass

### Infrastructure ticket
{What this sets up — 1 sentence}

No dependencies — execute first.

Acceptance Criteria:
- [ ] Setup verified in local environment
- [ ] No impact on existing functionality
