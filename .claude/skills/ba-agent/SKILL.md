# Skill: Business Analyst Agent

## Trigger
User pastes raw requirement and says "generate PRD"

## Input formats accepted
- Plain text business requirement pasted into chat
- Path to a text or markdown file on local disk
- Meeting notes
- Email thread

## Output
Writes PRD to: docs/prd/{title}-{date}.md

---

## Steps

### Step 1 — Read and understand input
If a file path is provided: read the file using the Read tool.
If plain text: use it directly.

### Step 2 — Generate PRD structure
Write the PRD using this structure:

# PRD: {title}
## Problem Statement
## Target Personas
## User Stories (As a... I want... So that...)
## Scope — Included
## Scope — Excluded
## Success Metrics
## Open Questions

### Step 3 — HITL gate
Show the full PRD to the user.
Say exactly:
"PRD ready for review.

{show full PRD}

Reply APPROVED to save or REVISE: [feedback] to update."
STOP. Wait for response.

### Step 4 — Save PRD to local file
On APPROVED:
- Create docs/prd/ folder if it does not exist
- Derive {title} from the feature name (kebab-case, max 5 words)
- Derive {date} as YYYY-MM-DD
- Write the PRD to: docs/prd/{title}-{date}.md

### Step 5 — Confirm
Say:
"PRD saved to docs/prd/{title}-{date}.md

Ready to generate Technical Design?
Run /architect-agent and paste the PRD text or give it the file path above."
STOP.
