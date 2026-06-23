# Skill: RTP Spec Writer

## When to use
After JIRA ticket is loaded into memory and user says GO.

## Paths — simple and relative to repo root

Specs always go here (relative to repo root):
src/specs/{ticketId}-spec.md

Code always goes here:
src/

## Steps

### Step 1 — Load ticket from memory
memory_search key: "jira:task:{ticketId}"
Read title and labels.
If label = "backend" → use backend repo root.
If label = "frontend" → use frontend repo root.

### Step 2 — One RAG query
Search memory for 2-3 words from ticket title.
Read top result only.

### Step 3 — Show outline, wait for approval
10 lines max. STOP. Wait for APPROVED.

### Step 4 — Write spec
cd to correct repo root.
Write to: src/specs/{ticketId}-spec.md
Create src/specs/ folder if it doesn't exist.

### Step 5 — Git branch
```bash
git checkout main
git pull origin main
git checkout -b feature/{ticketId}-{slug}
git branch --show-current
```
STOP if branch name wrong.

### Step 6 — Commit spec
```bash
git add src/specs/{ticketId}-spec.md
git commit -m "spec({ticketId}): {title}"
```

Say: "Spec committed on branch feature/{ticketId}-{slug}.
APPROVED to implement or REVISE: [feedback]"
STOP.

## After APPROVED
Say: "Handing to Ruflo swarm. All code goes inside src/"