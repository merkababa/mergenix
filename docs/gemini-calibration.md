# Gemini Calibration Log

> **Purpose:** Track issues that Claude reviewers caught but Gemini missed.
> Include findings from this file in future Gemini review prompts to improve accuracy.

---

## Format

| Date | Phase | Reviewer Role | Issue Gemini Missed | Severity | Notes |
| ---- | ----- | ------------- | ------------------- | -------- | ----- |
|      |       |               |                     |          |       |

---

## How to Use

After each Claude review cycle (Stage 2), compare Claude findings against Gemini findings:

1. Any issue Claude caught that Gemini missed → add a row above
2. Before the next Gemini review, include relevant past misses in the Gemini prompt as "watch for these patterns"
3. Over time, this builds a calibration dataset for Gemini's blind spots
