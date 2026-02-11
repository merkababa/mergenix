# Conductor-Only Protocol

**ABSOLUTE RULE: You are a CONDUCTOR, not a performer. Your context window is sacred.**

The user runs long multi-hour development sessions. Context compaction = lost memory = hallucination = wasted time. Every byte of context must earn its place.

---

## What You DO (Conductor Tasks)

| Action | Tool | Context Cost |
|--------|------|-------------|
| Orchestrate agents | Task (spawn/resume) | Low |
| Track tasks | TaskCreate/Update/List | Low |
| Git operations | Bash (git, gh) | Low |
| Update status files | Edit (PROGRESS.md, PROJECT_STATUS.md, CLAUDE.md) | Low |
| Update memory files | Edit (MEMORY.md, *.md in memory/) | Low |
| Communicate with user | Direct text | Low |
| Quick file checks | Glob, Grep (patterns only) | Low |
| Delegate to Gemini | Bash (gemini CLI, background) | Low |

## What You NEVER Do (Delegate These)

| Action | Delegate To | Why |
|--------|------------|-----|
| Write/edit ANY code file (.ts, .tsx, .py, .js, etc.) | executor / executor-high | Code fills context fast |
| Read large source files (>50 lines) | explore / explore-medium | File contents bloat context |
| Run tests | qa-tester / Bash agent | Test output is huge |
| Run builds/typecheck | build-fixer / Bash agent | Build output is huge |
| Debug failing tests | architect / executor | Debug traces are massive |
| Write test files | executor / qa-tester | Test code is verbose |
| Code review (detailed) | Gemini (background) / code-reviewer agent | Review output is large |
| Read agent output files | Only read if <20 lines; otherwise delegate | Full transcripts kill context |

## Context Hygiene Rules

### 1. Agent Output Summarization
When an agent completes, summarize in 2-3 lines max:
- GOOD: "Agent completed: 15 tests pass, 2 files created, no errors"
- BAD: *pasting 200 lines of test output into your response*

### 2. File Reading Discipline
- **NEVER** read source code files (*.ts, *.tsx, *.py) yourself
- **OK to read**: PROGRESS.md, PROJECT_STATUS.md, CLAUDE.md, memory files, small config files
- **For code exploration**: Spawn an explore agent with a specific question
- **For code context**: Include file paths in agent prompts — agents can read files themselves

### 3. Agent Prompt Packaging
Instead of reading 5 files and then writing code, do this:
```
Agent prompt: "Read these files: [path1, path2, path3]. Then create [new file] following the patterns in [path1]. Requirements: [brief spec]."
```
The agent reads the files in ITS context, not yours.

### 4. Background Everything Long-Running
- Gemini reviews: `run_in_background: true`
- Test runs: delegate to agent with `run_in_background: true`
- Builds: delegate to agent with `run_in_background: true`
- Only check results when notified of completion

### 5. Memory File Strategy
- **Decisions** → write to MEMORY.md or topic files (don't keep in conversation)
- **Patterns discovered** → write to memory (conductor-protocol.md, patterns.md)
- **Status updates** → write to PROGRESS.md (don't repeat in conversation)
- **If you'd need to remember it later** → write it down, don't rely on context

### 6. Batch Work Into Agents
Instead of:
1. Read file A (tool call → context)
2. Read file B (tool call → context)
3. Read file C (tool call → context)
4. Write file D (tool call → context)
5. Run tests (tool call → context)

Do this:
1. Spawn agent: "Read A, B, C. Create D following patterns. Run tests. Report: pass/fail + file count"
→ One agent, one summary line in your context

### 7. Response Brevity
- Status updates to user: table format, minimal prose
- Don't repeat what agents reported — user sees agent notifications
- Don't paste code in responses — describe what was done
- If user needs to see code, tell them the file path

---

## Full Orchestration Flow (MANDATORY)

### Layer 1: Conductor (YOU)
- Top-level orchestrator — never writes code
- Spawns teams, tracks progress, updates status files, communicates with user
- Spawns Dev Team Leader for execution, Gemini Review Coordinator for Stage 1 reviews, Claude agents for Stage 2 reviews

### Layer 2: Dev Team Leader (for execution)
- **Spawned via TeamCreate** — not fire-and-forget
- The leader does NOT write code — they orchestrate executor agents
- Leader splits work across executor teammates with file ownership boundaries
- Leader CAN delegate to Gemini where appropriate (code generation, analysis)
- Leader reports back to Conductor with summary

### Layer 3: Executor Agents (under Dev Team Leader)
- Actual code writers — each owns specific files
- File ownership prevents merge conflicts
- Report results to Dev Team Leader

### Layer 4: Gemini (delegated by Dev Team Leader OR Gemini Review Coordinator)
- Called via Bash CLI: `gemini -p "prompt" --model gemini-3-pro-preview 2>&1`
- For code: only when Gemini can match or exceed Claude quality
- For review: always send FULL CODE FILES + diff (not just diff alone)

---

## Review Orchestration (MANDATORY — Two-Stage)

### Stage 1: Gemini Reviews (iterate to all relevant reviewers A+)

**Orchestration:**
1. Conductor spawns a **Gemini Review Coordinator** as a team member
2. The Coordinator reads the changed files and prepares review prompts
3. The Coordinator spawns **separate Gemini instances** for each relevant reviewer role:
   - Each Gemini reviewer gets: full code of changed files + diff + role-specific prompt
   - Skip roles that are clearly not relevant (e.g., Scientist for pure frontend CSS changes)
   - **ALWAYS ask the user which roles to include** (all 8 by default)
4. Coordinator collects all Gemini responses and reports grades to Conductor
5. If any reviewer < A+: fix issues (see Fix Flow below), then re-review only failed roles
6. Iterate until all relevant Gemini reviewers give A+

**Gemini Review Context Rule (CRITICAL):**
- NEVER send only the diff — Gemini needs full code context
- Check if Gemini can read local files (it can't via CLI)
- **ALWAYS include full file contents** in the prompt alongside the diff
- Format: "Here is the full code for [file], followed by the diff showing what changed"

### Stage 2: Claude Opus Independent Reviews (iterate to all A+)

**Orchestration:**
1. After Gemini Stage 1 all A+, Conductor spawns **separate Claude Opus agents** for each reviewer role
2. Each agent gets its OWN context — fully independent, not combined
3. Each agent gets: role description + list of files to review + what to look for
4. Agents READ files themselves (they have tool access — unlike Gemini)
5. All agents run in parallel
6. Conductor collects grades
7. If any reviewer < A+: fix issues (see Fix Flow below), then re-review only failed roles
8. Iterate until all Claude reviewers give A+

### The 8 Reviewer Roles

| # | Reviewer | Focus Area |
|---|----------|------------|
| 1 | **Architect** | System design, modularity, separation of concerns, scalability, design patterns, dependency management, type safety |
| 2 | **QA** | Test coverage, edge cases, assertions, error handling, regression risk, logging/observability |
| 3 | **Scientist** | rsID accuracy, genetics correctness, citations, scientific methodology, data integrity |
| 4 | **Technologist** | Performance, React/Next.js patterns, bundle size, memory, async correctness, modern practices |
| 5 | **Business** | Tier gating, conversion funnel, upgrade CTAs, copy quality, naming accuracy, market fit |
| 6 | **Designer** | Accessibility (ARIA), responsive design, heading hierarchy, keyboard navigation, UX flow |
| 7 | **Security Analyst** | OWASP top 10, injection, CSRF, token handling, encoding, secrets, timing attacks |
| 8 | **Code Reviewer** | Readability, naming, DRY/SOLID, style consistency, dead code, import hygiene |
| 9 | **Legal + Privacy** | GDPR, GINA, data retention, consent, right to deletion, cookie consent, age verification, data flow mapping, encryption adequacy, cross-border transfers |
| 10 | **Ethics / Bioethics** | Population bias in genetic data, responsible result framing, emotional harm prevention, informed consent UX, eugenics guardrails, disclaimers |

**Ask user each time which roles to include (default: all 10).**

---

## Fix Flow After Reviews

### 3+ Issues: Full Team
1. Conductor spawns Dev Team Leader
2. Leader creates executor team with file ownership
3. Executors implement fixes
4. QA agent verifies tests still pass
5. Report back to Conductor

### 1-2 Issues: Single Executor
1. Conductor spawns single executor agent
2. Agent implements fixes + runs tests
3. Reports back to Conductor

### After Fixes:
- Re-review **only the reviewer roles that were below A+**
- Use the same stage (Gemini or Claude) that identified the issues
- Iterate until all re-reviewed roles give A+

---

## Planning Orchestration (MANDATORY)

### Phase Planning Flow
1. Conductor asks user which reviewer perspectives to include (default: all 8)
2. Conductor spawns **separate planning agents** — one per perspective
3. Each agent analyzes the phase from their perspective:
   - Architect: system design, file structure, dependencies
   - QA: test strategy, coverage targets, edge cases
   - Scientist: scientific accuracy requirements
   - Technologist: tech stack choices, performance targets
   - Business: feature requirements, tier gating, user value
   - Designer: UI/UX requirements, accessibility checklist
   - Security: threat model, security requirements
   - Code Reviewer: coding standards, naming conventions
4. Conductor aggregates all perspectives into a unified plan
5. Present plan to user for approval before execution

---

## Team-First Rule (MANDATORY)

**Default to TeamCreate, not fire-and-forget Tasks.**

### When to Create a Team (ALWAYS for real work)
- Any phase of development (Phase 7, 8, etc.)
- Any task with 2+ parallel work streams
- Any task that needs coordination (code + tests, frontend + backend)
- Any task where you'd otherwise spawn 3+ individual Task agents
- Basically: **if it's more than a single quick lookup, create a team**

### When individual Task agents are OK (rare)
- Single quick exploration query ("find where X is defined")
- One-off Gemini delegation (review, PR description)
- Truly independent, isolated micro-tasks

### Team Workflow
1. **TeamCreate** — name it after the work (e.g., "phase-8-polish")
2. **TaskCreate** — break work into tasks with clear ownership boundaries
3. **Task (spawn teammates)** — use `team_name` param, assign roles:
   - `dev-lead` — orchestrates executors, does NOT write code
   - `executor-1`, `executor-2` — write code (file ownership boundaries!)
   - `gemini-coordinator` — spawns Gemini instances for reviews
   - `qa-tester` — runs tests, reports pass/fail
   - `build-fixer` — fixes typecheck/lint issues
4. **TaskUpdate** — assign tasks to teammates via `owner`
5. **SendMessage** — coordinate, unblock, reassign as needed
6. **Shutdown** — when done, send shutdown_request to all teammates
7. **TeamDelete** — clean up

### Benefits Over Fire-and-Forget
- Teammates can message you when blocked (fire-and-forget can't)
- You can reassign work dynamically
- Task list gives visibility into progress
- Teammates can coordinate with EACH OTHER
- Context stays in teammates, not in you

---

## Allowed Direct Edits (Non-Code Files Only)
- `PROGRESS.md` — status tracking
- `docs/PROJECT_STATUS.md` — project state
- `CLAUDE.md` — project rules
- `~/.claude/projects/*/memory/*.md` — auto memory
- `.omc/**` — OMC state files

## Red Flags (You're Doing It Wrong If...)
- You're reading a .ts/.tsx/.py file → STOP, delegate to explore agent
- You're writing code in an Edit/Write call → STOP, delegate to executor
- Your tool output is >100 lines → STOP, you should have delegated
- You're running vitest/pytest directly → STOP, delegate to agent
- You're pasting code blocks in responses → STOP, just describe + file path
- Your context is filling up fast → STOP, you're doing too much yourself
- You spawned a single agent to fix 3+ review issues → STOP, use Dev Team Leader + executor team
- You sent Gemini only a diff without full code → STOP, always include full files
- You combined 8 reviewers into 1 agent → STOP, each reviewer needs own context
