# Skill: Architect Agent

## Trigger
User says "generate technical design", "start architecture",
"architect this PRD", or "kickstart architect agent"

## Output
Writes Technical Design to: docs/architecture/{feature}-design-{date}.md

---

## Steps

### Step 1 — Identify which PRD to work from
Say exactly:
"Which PRD should I use for the technical design?

Options:
A) List available PRDs from docs/prd/ folder
B) Paste the PRD text directly into chat
C) Give me the file path to a PRD file

Reply A, B, or C."
STOP. Wait for response.

### Step 2A — If user replies A
List all .md files in docs/prd/ using Glob or Bash.
Show as numbered list:
"PRDs available:
1. docs/prd/{filename}
2. docs/prd/{filename}
...

Reply with the number to proceed."
STOP. Wait for selection.
Then read the selected file.

### Step 2B — If user pastes text
Use the pasted text directly as the PRD.

### Step 2C — If user gives a file path
Read that file.

### Step 3 — Read the PRD fully
Extract:
- Feature name
- Target personas
- User stories
- Scope included and excluded
- POC vs production distinction

### Step 4 — Search for existing context
Search docs/architecture/ for any related prior designs.
Read any matching files to avoid duplication.
Max 2 files.

### Step 5 — Generate Technical Design
Write structured technical design covering:

# Technical Design: {feature name}
## System Context
  Where does this fit in the existing architecture?
  What existing components does it touch?

## New Components Required
  List each new service, module, or layer needed.
  One paragraph per component — what it does and why.

## API Contracts
  For each new endpoint:
  METHOD /path
  Request: {key fields}
  Response: {key fields}
  Error codes: {list}

## Data Models
  TypeScript interfaces for all new domain objects.
  Note which go in types/domain.ts

## Module Dependencies
  Which existing modules are affected?
  What must be built before what?

## Implementation Order
  Numbered sequence. Backend before frontend.
  Infrastructure before application logic.

## POC Simplifications
  What is mocked or simulated vs real?
  Be explicit — this informs the PM Agent ticket scope.

## Risks and Mitigations
  Top 3 technical risks and how to address them.

## Architecture Diagrams

Generate all four diagrams derived from the components and
actors identified above. Never hardcode component names —
derive everything from the PRD and existing architecture.

### Diagram 1 — C1 System Context
Show the system in context of external actors.

Rules:
- Max 6 nodes total
- Label arrows with protocol or data exchanged
- Never show internal components — black box only

```mermaid
graph TB
  subgraph "External Actors"
    [derive from PRD personas and integrations]
  end
  subgraph "[System Name from PRD]"
    SYS[{feature name} Service]
  end
  [draw arrows between actors and system]
  [label each arrow with message type or protocol]
```

### Diagram 2 — C3 Component Diagram
Show internal components of the system.

Rules:
- One box per component from New Components section
- Show data flow direction with arrows
- Mark new components [NEW] and existing ones [EXISTING]

```mermaid
graph TB
  subgraph "[System Name]"
    [one node per component]
    [arrows showing data flow]
    [add [NEW] or [EXISTING] label]
  end
```

### Diagram 3 — Happy Path Sequence Diagram
Show the primary success flow end to end.

Rules:
- Participants = actors and components in happy path
- Messages = API calls or events from API Contracts section
- Show state transitions as notes
- End with the successful outcome state

```mermaid
sequenceDiagram
  [derive participants from user journey and components]
  [derive messages from API contracts]
  [show state transitions as notes]
  [end on successful outcome]
```

### Diagram 4 — Failure / Decline Path Sequence Diagram
Show the primary failure or decline flow.

Rules:
- Same participants as Diagram 3
- Show where flow diverges from happy path
- End on the failure outcome state
- Include error response back to initiator

```mermaid
sequenceDiagram
  [same participants as Diagram 3]
  [show divergence point]
  [show failure handling]
  [end on failure outcome]
```

### Step 6 — HITL gate
Show the technical design to the user.
Say:
"Technical design ready for review.
Based on PRD: {prd file path or 'pasted text'}

{show full technical design}

Reply APPROVED to save or REVISE: [feedback] to update."
STOP. Wait for response.

### Step 7 — Save to local file on APPROVED
- Create docs/architecture/ folder if it does not exist
- Derive {feature} from the feature name (kebab-case, max 5 words)
- Derive {date} as YYYY-MM-DD
- Write the technical design to: docs/architecture/{feature}-design-{date}.md

Say:
"Technical design saved to docs/architecture/{feature}-design-{date}.md

Ready to create the backlog?
Run /pm-agent and give it the file path above."
STOP.

## Rules
- Never start architecture without reading a specific PRD first
- Always ask which PRD — never assume
- Always check docs/architecture/ for existing patterns before designing new ones
- Keep API contracts concise — full detail goes in specs later
- Always include POC Simplifications section
- Always generate all four diagrams
