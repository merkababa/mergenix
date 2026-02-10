# Gemini 3 Pro Preview Delegation Guide for Mergenix

> **Purpose:** Save Claude tokens by routing appropriate tasks to Gemini 3 Pro Preview.
> **Model ID:** `gemini-3-pro-preview` (always pass `--model gemini-3-pro-preview` — default without flag is gemini-2.0-flash)
> **Last updated:** 2026-02-10

---

## Raw Capability Comparison

| Metric | Claude Opus 4.6 | Claude Sonnet 4.5 | Gemini 3 Pro Preview |
|---|---|---|---|
| Context window | 200K | 200K | **1M (5x)** |
| Max output | ~32K | ~32K | **64K (2x)** |
| Speed (tok/s) | ~50 | ~75 | **~130-156 (2x)** |
| Input cost / 1M tokens | $15.00 | $3.00 | **$2.00** |
| Output cost / 1M tokens | $75.00 | $15.00 | **$12.00** |
| SWE-bench Verified | -- | **77.2%** | 76.2% |
| GPQA Diamond (science) | ~85% | ~80% | **91.9%** |
| AIME 2025 (math) | ~85% | ~80% | **95%** |
| Hallucination risk | Low | Low | **Higher** (esp. multi-turn) |
| Instruction adherence | Excellent | Excellent | Good (tends to "overreach") |
| Multimodal | Text + images | Text + images | **Text + images + audio + video** |

---

## 8 Rules for Delegating to Gemini

### Core Safety Rules

1. **SINGLE-SHOT** -- Give everything in one prompt. No multi-turn conversations. Gemini's context degrades across turns but excels at large single prompts.

2. **VERIFY FACTS** -- Spot-check any API names, database IDs, library methods, or scientific references Gemini claims. It hallucinates these more than Claude.

3. **CONSTRAIN EXPLICITLY** -- Gemini "overreaches" (ask for a button, get a design system). Always say: "Change ONLY X. Do NOT touch Y. Return ONLY Z."

### Quality Rules

4. **FEED GROUND TRUTH** -- Attach actual data (ClinVar entries, OMIM references, existing JSON) into the prompt. Do NOT trust Gemini's training for genetics domain knowledge -- its 1M context exists for you to feed it truth.

5. **SPECIFY OUTPUT FORMAT** -- Gemini rambles without structure. Always say: "Return as JSON/table/checklist with columns: ..." or "Return a markdown table with columns X, Y, Z."

6. **SHOW EXISTING CODE** -- For CSS, UI, and refactoring tasks, paste the CURRENT implementation. Gemini cannot match the bioluminescent theme if it hasn't seen `theme.py` and the relevant CSS.

7. **DEFINE DONE** -- Give checklistable success criteria, not vague requests. Bad: "Review this JSON." Good: "Flag every entry where `confidence` is 'High' but `sources` array is empty."

### Integration Rule

8. **CLAUDE MERGES** -- Gemini proposes, Claude integrates. Gemini generates artifacts (CSS, JSON fixes, review notes). Claude edits files, runs tests, and commits. Never let Gemini output go directly into production without Claude verification.

---

## Graded Task Matrix

### Grading Scale

| Grade | Meaning |
|---|---|
| **A+** | Gemini clearly better -- delegate always |
| **A** | Gemini better -- delegate when possible |
| **B+** | Gemini comparable -- delegate to save tokens |
| **B** | Both similar -- delegate for cost savings only |
| **C** | Claude meaningfully better -- only delegate if token-starved |
| **D** | Claude much better -- avoid delegating |

---

### A-Tier: Delegate to Gemini

| Task | Grade | Why | Mergenix Example | Key Rules |
|---|---|---|---|---|
| Full-codebase analysis | **A+** | 1M context fits ALL .py + JSON in one shot | "Review entire codebase for inconsistencies" | 1, 5, 7 |
| Large JSON data validation | **A+** | carrier_panel.json (2,715 entries) + trait_snps.json in one prompt | "Verify all diseases have valid OMIM IDs" | 1, 4, 5, 7 |
| Bulk data research | **A+** | Faster, cheaper, can process entire datasets | "Cross-reference carrier panel against ClinVar naming" | 1, 2, 4, 5 |
| PR summaries / quick code review | **A** | Gemini Code Assist has dedicated PR integration; sees entire codebase | "Summarize PR changes and flag issues" | 1, 3, 5 |
| CSS / visual theming | **A** | #1 on WebDev Arena; strong at mockup-to-CSS | "Design glassmorphism card variants" | 1, 3, 6 |
| UI prototyping | **A** | Praised for "vibe coding" and full-project scaffolding | "Prototype a user onboarding flow" | 1, 3, 6 |
| Scientific accuracy checking | **A** | 91.9% GPQA Diamond (surpasses human experts) | "Are Punnett square calcs genetically sound?" | 1, 2, 4, 7 |
| Screenshot / visual review | **A** | Native multimodal vision, battle-tested | "What's wrong with this page layout?" | 1, 5, 7 |

### B-Tier: Gemini viable, saves tokens

| Task | Grade | Why | Mergenix Example | Key Rules |
|---|---|---|---|---|
| Simple feature implementation | **B+** | SWE-bench nearly tied (76.2 vs 77.2%) | "Add a search filter to disease catalog" | 3, 6, 8 |
| Documentation writing | **B+** | Factual and thorough, less polished prose | "Write docstrings for parser.py" | 3, 5 |
| Code refactoring (simple) | **B** | Large context sees cross-file patterns | "Rename deprecated params across pages/" | 3, 6, 8 |
| Test coverage gap analysis | **B** | Can ingest all tests + source to find gaps | "What code paths have no test coverage?" | 1, 5, 7 |
| CI/CD pipeline work | **B** | Both fine for YAML workflows | "Add deployment workflow to GitHub Actions" | 3 |

### C-Tier: Keep on Claude

| Task | Grade | Why | Mergenix Example |
|---|---|---|---|
| Complex backend logic | **C+** | Claude writes fewer bugs, cleaner structure | "Handle X-linked recessive inheritance" |
| Writing pytest tests | **C+** | Claude's test scaffolding is superior | "Write edge case tests for trait_prediction.py" |
| API integration code | **C** | Gemini hallucinate field names; Claude adds defensive coding | "Integrate ClinVar REST API" |
| CSS-to-Streamlit integration | **C** | Claude handles Streamlit-specific patterns better | "Wire dark/light mode CSS into Streamlit theming" |
| Debugging complex issues | **C** | Claude better at systematic root-cause analysis | "VCF parser crashes on multi-allelic sites" |
| Architecture / planning | **C** | Claude weighs tradeoffs more carefully | "Design payment flow with Stripe webhooks" |

### D-Tier: Never delegate

| Task | Grade | Why | Mergenix Example |
|---|---|---|---|
| OAuth / auth code | **D** | Security-sensitive; Gemini not reliable for financial-grade precision | "Implement Google OAuth with sessions" |
| Payment code (Stripe/PayPal) | **D** | Hallucinated API fields = real money bugs | "Build Stripe checkout with webhooks" |
| Multi-step agentic workflows | **D** | Claude follows complex instruction chains more reliably | "Branch, implement, test, fix, PR" |
| Long debugging sessions | **D** | Gemini's context degrades across multi-turn conversations | Extended back-and-forth debugging |
| Git workflow orchestration | **D** | Claude's CLI tool-use is more battle-tested; strict branch conventions | "Rebase, resolve conflicts, push" |

---

## Optimal Split Strategy

```
GEMINI [--model gemini-3-pro-preview]     CLAUDE (~60% of work)
(~40% of work)
================================          ================================
Full codebase / dataset analysis          Complex backend logic (genetics)
JSON data validation (2,715 diseases)     Auth & payment code (OAuth, Stripe)
PR summaries & quick code reviews         Writing tests (pytest)
CSS/UI visual design & prototyping        Debugging sessions
Scientific accuracy verification          Architecture decisions
Documentation writing                     Git workflow & agentic tasks
Simple, well-scoped features              Streamlit-specific integration
Test coverage gap analysis                Security-sensitive code
```

### Estimated Savings

With a 60/40 Claude/Gemini split: **~40-45% token cost reduction** (Gemini is 1.5-7.5x cheaper per token AND 2x faster on output).

---

## Quick Reference: When to Use Which

```
Ask yourself:
  "Is this a BIG, SINGLE analysis of existing code/data?"
     YES -> Gemini (A-tier)
     NO  -> Continue...

  "Is this visual/CSS/UI work?"
     YES -> Gemini for design, Claude for Streamlit integration
     NO  -> Continue...

  "Is this security-sensitive (auth, payments, secrets)?"
     YES -> Claude, always
     NO  -> Continue...

  "Is this a multi-turn debugging session?"
     YES -> Claude, always
     NO  -> Continue...

  "Is this a simple, well-defined feature?"
     YES -> Gemini (B-tier, saves tokens)
     NO  -> Claude (default)
```

---

## Setup

### Authentication

- **API key** (`GEMINI_API_KEY` env var) set in `~/.bashrc` — Gemini CLI auto-detects it
- Paid tier limits: **150+ RPM, 1,000+ RPD**
- Run `source ~/.bashrc` if key not found in session
- **NEVER hardcode the API key in any git-tracked file**

### How to Call Gemini from Claude Code

**ONLY use Bash** — MCP tools are broken on Windows (ENOENT from `spawn()` not finding `.cmd` files).

```bash
# ALWAYS pass --model gemini-3-pro-preview (default without flag is gemini-2.0-flash)
gemini -p "Your prompt here" --model gemini-3-pro-preview 2>&1

# Long prompt (via file)
cat <<'EOF' > /tmp/gemini-prompt.txt
Your long prompt here...
EOF
gemini -p "" --model gemini-3-pro-preview < /tmp/gemini-prompt.txt 2>&1
```
- Use `run_in_background: true` on Bash tool — responses take 10-30s
- Always append `2>&1` — CLI prints status to stderr
- Do NOT use any MCP Gemini tools — they will fail on Windows
- **NEVER fall back to weaker models** when rate-limited — wait and retry (60s, 120s, 300s)

### Rate Limits

| Auth Method | RPM | RPD | Cost |
|---|---|---|---|
| API key paid tier (your setup) | 150+ | 1,000+ | Pay-per-token |
| API key free tier | 10 | 100 | Free |
