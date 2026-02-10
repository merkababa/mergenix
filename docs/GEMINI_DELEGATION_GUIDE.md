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

## Setup (Completed 2026-02-09)

### Subscriptions

| Subscription | Price | What It Gives |
|---|---|---|
| **Claude Max** | $100/mo | Claude Code CLI, all models, ~50-200 prompts/5hr window |
| **Google AI Pro** | $19.99/mo | Gemini CLI (120 RPM, 1,500 RPD), $10/mo Cloud credits, Gemini web app |

### MCP Server: Gemini CLI Bridge

Installed via `claude mcp add gemini-cli -s user -- npx -y gemini-mcp-tool`

This routes Claude Code requests through Gemini CLI, which uses your Google AI Pro subscription for **120 RPM / 1,500 RPD** -- completely free.

**WARNING: MCP tools are BROKEN on Windows.** The MCP server uses `spawn('gemini', args)` which fails on Windows because `gemini` is installed as `gemini.cmd` and `spawn()` can't find `.cmd` files without `shell: true`. This causes ENOENT errors.

**How to use from Claude Code (Bash only):**
```bash
# Always use --model gemini-3-pro-preview for best results
# Default without --model is gemini-2.0-flash (much weaker)
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

### Authentication

- Gemini CLI authenticated via `gemini auth login` (Google account with AI Pro)
- No API key needed for CLI-based access (CLI uses OAuth, not API key)
- API key available at Google AI Studio if needed for API-based MCP later

### Rate Limits

| Auth Method | RPM | RPD | Cost |
|---|---|---|---|
| Gemini CLI (your setup) | 120 | 1,500 | Free (AI Pro) |
| API key free tier | 10 | 100 | Free |
| API key paid tier | 150+ | 1,000+ | Pay-per-token |

### Activating $10/mo Google Cloud Credits

1. Go to https://developers.google.com/program/plans-and-pricing
2. Link your Google AI Pro subscription
3. Claim credits -- usable for Gemini API via Vertex AI if needed
