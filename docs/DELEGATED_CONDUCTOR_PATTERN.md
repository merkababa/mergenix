# Delegated Conductor Pattern

> Reusable orchestration pattern for multi-task sprints with clean context isolation.
> Import into any project's CLAUDE.md or agent prompts.

---

## Problem

When a conductor (main Claude session) executes multiple sequential tasks in one conversation:

- Context fills up with file contents, agent outputs, and review results
- Later tasks suffer from compacted/lost context
- Review quality degrades as conversation grows
- Conductor violates its own rules by reading/writing code directly

## Solution: Task Conductor Delegation

Spawn a **general-purpose teammate** per task that acts as a **sub-conductor** — it never writes code itself, only orchestrates subagents. When it finishes, its context is discarded, keeping the main conductor's context clean.

---

## Architecture

```
Main Conductor (you)
  │
  ├── Task Conductor A (general-purpose teammate, background)
  │     ├── Executor Agent 1 (writes code, file ownership)
  │     ├── Executor Agent 2 (parallel, different files)
  │     ├── Static Analysis Agent (lint/typecheck/test)
  │     └── [commits when green]
  │
  ├── Task Conductor B (fresh context, next task)
  │     ├── Executor Agent 3
  │     ├── Static Analysis Agent
  │     └── [commits when green]
  │
  ├── ... (one conductor per task)
  │
  └── Review Pipeline (after all tasks)
        ├── Reviewer Agent 1 (Architect, Opus)
        ├── Reviewer Agent 2 (Designer, Opus)
        ├── Reviewer Agent 3 (Code Reviewer, Opus)
        └── Fix Executor Agent (if BLOCKs found)
```

---

## Roles & Rules

### Main Conductor (your session)

- Creates the feature branch
- Creates task list with dependencies
- Spawns one Task Conductor per task (sequential, background)
- Collects 2-3 line summaries from each
- Runs the review pipeline after all tasks complete
- Creates PR and merges

### Task Conductor (general-purpose teammate)

**MUST follow the same conductor rules as the main session:**

- NEVER read large source files directly — delegate to Explore agents
- NEVER write/edit code files — delegate to executor agents
- NEVER run tests/builds directly — delegate to agents
- Spawn executor agents with explicit file ownership
- Spawn static analysis agent after executors complete
- Commit when static analysis passes
- Return concise summary (files changed, what was done, pass/fail)

### Executor Agents (spawned by Task Conductor)

- Own specific files — never touch files outside ownership
- Read checklist and gotchas docs before writing code
- Run lint + typecheck on their files before reporting done
- Model: Sonnet (well-specified tasks)

### Review Agents (spawned by Main Conductor)

- Run after ALL tasks are committed to the branch
- One agent per reviewer role (never combine)
- Model: Opus (deep reasoning)
- Return: grade + max 5-line evidence summary

---

## Task Conductor Prompt Template

```
You are a Task Conductor for [TASK_ID]: [TASK_TITLE].

## YOUR ROLE
You are a CONDUCTOR — you orchestrate, you do NOT write code.

### NEVER do directly:
- Write/edit code files — delegate to executor agents
- Read large source files (>50 lines) — delegate to Explore agents
- Run tests/builds — delegate to agents

### ALWAYS do:
- Spawn executor agents with explicit file ownership
- Spawn static analysis agent when executors complete
- Commit when all checks pass
- Return a 3-5 line summary of what was done

## CONTEXT
- Branch: [BRANCH_NAME]
- Working directory: [WORKING_DIR]
- Plan file: [PLAN_PATH] — read section [SECTION] for full specs

## YOUR TASK
[TASK_DESCRIPTION]

## FILE OWNERSHIP
Only these files may be created/modified:
- [FILE_1] — [purpose]
- [FILE_2] — [purpose]

## EXECUTION FLOW
1. Spawn an Explore agent to read the plan + relevant existing files
2. Based on findings, spawn executor agent(s) with file ownership
   - If multiple independent files: spawn in parallel
   - Include in every executor prompt: "Read docs/EXECUTOR_CHECKLIST.md
     and docs/DEVELOPMENT_GOTCHAS.md before writing any code"
3. When executors complete, spawn a static analysis agent:
   - `pnpm lint --filter=[PACKAGE]`
   - `pnpm typecheck --filter=[PACKAGE]`
4. If static analysis fails: spawn a fix agent targeting only the failing files
5. When green: stage changed files and commit with message:
   `feat([TASK_ID]): [SHORT_DESCRIPTION]`
6. Return summary to main conductor

## IMPORTANT
- Maximum parallelism: if executors own different files, run them simultaneously
- Model selection: Sonnet for executors, Haiku for mechanical fixes
- Every executor prompt MUST include file ownership boundaries
- Do NOT run the full test suite — only lint + typecheck per task
  (full test suite runs once during the review pipeline)
```

---

## Main Conductor Execution Flow

### Phase 1: Setup

```
1. Create feature branch
2. Create task list with sequential dependencies
3. Read the plan file for task breakdown
```

### Phase 2: Sequential Task Execution

```
For each task (D2.1, D2.2, ... D2.N):
  1. Spawn Task Conductor (general-purpose, background)
  2. Wait for completion
  3. Extract 2-3 line summary
  4. Mark task complete
  5. Move to next task
```

### Phase 3: Review Pipeline

```
1. Run full static analysis gate (lint + typecheck + test + build)
2. Spawn 2-4 reviewer agents in PARALLEL (Opus model)
   - Select reviewers by trigger rules (see CLAUDE.md)
3. Collect grades — if any BLOCK:
   a. Spawn fix executor (Sonnet)
   b. Re-review only the reviewer(s) that had BLOCKs
   c. Max 3 rounds
4. When all reviewers reach A: done
```

### Phase 4: Ship

```
1. Create PR with summary of all tasks
2. Merge (squash)
3. Update PROGRESS.md
```

---

## Benefits

| Benefit                      | How                                                            |
| ---------------------------- | -------------------------------------------------------------- |
| **Context isolation**        | Each task conductor has fresh context, no bleed-over           |
| **Main context stays clean** | Only receives 2-3 line summaries, never full file contents     |
| **Parallel within tasks**    | Task conductors spawn parallel executors for independent files |
| **Sequential between tasks** | Later tasks see committed changes from earlier tasks           |
| **Reusable**                 | Same pattern works for any multi-task sprint in any project    |
| **Review efficiency**        | One review pipeline for the whole sprint, not per-task         |

---

## Anti-Patterns (Never Do These)

| Anti-Pattern                                   | Why It Fails                                               |
| ---------------------------------------------- | ---------------------------------------------------------- |
| Main conductor reads/writes code directly      | Context pollution, violates conductor rules                |
| Teammate acts as executor (writes code itself) | No file ownership boundaries, no parallelism               |
| Review pipeline per task                       | 6x the review cost for sequential tasks on the same branch |
| Combining multiple reviewers into one agent    | Each reviewer needs focused expertise                      |
| Skipping static analysis between tasks         | Broken lint/types compound across tasks                    |
| Running full test suite per task               | Slow; save for the review pipeline gate                    |

---

## Adapting for Your Project

1. Copy this file to your project's `docs/` directory
2. Update the prompt template with your:
   - Package manager commands (pnpm/npm/yarn)
   - Lint/typecheck/test commands
   - Checklist and gotchas doc paths
   - Reviewer trigger rules
3. Reference from your CLAUDE.md: `See docs/DELEGATED_CONDUCTOR_PATTERN.md`
