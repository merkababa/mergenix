# Tier 2 & Tier 3 Implementation Plan

**Date:** 2026-02-08
**Based on:** 4 parallel deep-research agents analyzing current codebase + original 10-report findings
**Scope:** T2 (Performance & Caching) + T3 (Frontend & UX) — 13 items, ~67 files affected

---

## Executive Summary

**Tier 2** has 5 items focused on performance — mostly quick wins. The biggest impact comes from adding `@st.cache_data` to 6 uncached JSON loaders (T2.1) and pre-computing disease catalog statistics (T2.2). Together these eliminate ~8 redundant JSON parses per page render, saving ~600ms.

**Tier 3** has 8 items focused on frontend & UX — these are larger and more design-heavy. The most impactful are accessibility fixes (T3.1), responsive CSS (T3.2), and emotional redesign of high-risk results (T3.3). The "See How It Works" button literally does nothing (`pass`), and zero media queries exist for mobile.

**Total estimated effort:** 8-12 days across both tiers.

---

## TIER 2: PERFORMANCE & CACHING

### T2.1 — Add @st.cache_data to All Data Loaders

**Priority:** HIGH | **Effort:** 1-2 hours | **Impact:** ~600ms savings per page render

#### Current State

| Function                        | File                         | Line | Cached?                    |
| ------------------------------- | ---------------------------- | ---- | -------------------------- |
| `load_diseases()`               | `pages/disease_catalog.py`   | 30   | YES (`@st.cache_data`)     |
| `get_auth_manager()`            | `pages/analysis.py`          | 54   | YES (`@st.cache_resource`) |
| `load_carrier_panel()`          | `Source/carrier_analysis.py` | 20   | **NO**                     |
| `load_carrier_panel_for_tier()` | `Source/carrier_analysis.py` | 44   | **NO**                     |
| `load_trait_database()`         | `Source/trait_prediction.py` | 11   | **NO**                     |
| `_count_panel()`                | `pages/analysis.py`          | 62   | **NO**                     |
| `_count_traits()`               | `pages/analysis.py`          | 70   | **NO**                     |
| `load_traits_corrected()`       | `pages/analysis.py`          | 153  | **NO**                     |
| `_count()`                      | `pages/home.py`              | 25   | **NO**                     |

**Worst case:** Analysis page loads `carrier_panel.json` (3.06 MB) **5 times** and `trait_snps.json` (121 KB) **3 times** per full render. Each JSON parse of the carrier panel takes ~150ms.

#### Implementation Plan

**Step 1: Create centralized data loader module** (`Source/data_loader.py`)

```python
import json
import streamlit as st

@st.cache_data
def load_carrier_panel(panel_path: str) -> list[dict]:
    with open(panel_path) as f:
        return json.load(f)

@st.cache_data
def load_trait_database(db_path: str) -> list[dict]:
    with open(db_path) as f:
        raw = json.load(f)
    return raw if isinstance(raw, list) else raw.get("snps", raw)

@st.cache_data
def count_entries(path: str, key: str | None = None) -> int:
    with open(path) as f:
        data = json.load(f)
    if key:
        data = data.get(key, data)
    return len(data) if isinstance(data, list) else len(data)
```

**Step 2: Update callers to use centralized loaders**

| File                         | Change                                                                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `Source/carrier_analysis.py` | Import from `data_loader`, remove local `load_carrier_panel()`                                                                    |
| `Source/trait_prediction.py` | Import from `data_loader`, remove local `load_trait_database()`                                                                   |
| `pages/analysis.py`          | Replace `_count_panel()`, `_count_traits()`, `load_traits_corrected()`, and inline `json.load()` calls with cached loader imports |
| `pages/home.py`              | Replace `_count()` with cached `count_entries()`                                                                                  |

**Step 3: Eliminate redundant inline json.load() calls in analysis.py**

- Line 359: `json.load(carrier_panel)` for `total_diseases` count → use `count_entries()`
- Line 566: `json.load(trait_snps)` for locked trait count → use cached loader

#### Files Modified

- `Source/data_loader.py` (NEW)
- `Source/carrier_analysis.py` (remove load function, import cached version)
- `Source/trait_prediction.py` (remove load function, import cached version)
- `pages/analysis.py` (replace 5 uncached load calls)
- `pages/home.py` (replace `_count()`)

#### Tests

- Verify existing 378 tests still pass (loaders are internal, API unchanged)
- Add 3-4 tests for `data_loader.py` (load caching, count accuracy)

#### Dependencies

- None. Can be done first.

---

### T2.2 — Pre-compute Disease Catalog Statistics

**Priority:** MEDIUM | **Effort:** 30 min | **Impact:** ~20-30ms per rerun + cleaner code

#### Current State

`pages/disease_catalog.py` lines 60-67 compute 8 statistics at **module scope** on every Streamlit rerun:

```python
total_count = len(diseases)                                    # O(n)
unique_genes = len(set(d["gene"] for d in diseases))          # O(n)
high_sev_count = sum(1 for d in diseases if ...)              # O(n)
inheritance_counts = Counter(d["inheritance"] for d in ...)    # O(n)
```

**Additionally**, lines 127-143 compute filter option lists (inheritance types, categories, carrier frequencies) — all static, all re-computed every rerun.

Lines 312-418 compute 4 chart datasets from the full unfiltered list — also static.

`parse_carrier_freq()` is called ~8,000-11,000 times per page load (string parsing on every disease for slider, filter, DataFrame, and chart).

#### Implementation Plan

**Step 1: Create `@st.cache_data` function returning all pre-computed stats**

```python
@st.cache_data
def compute_catalog_stats(diseases: list[dict]) -> dict:
    total_count = len(diseases)
    unique_genes = len(set(d["gene"] for d in diseases))
    high_sev_count = sum(1 for d in diseases if d.get("severity") == "high")
    inheritance_counts = Counter(d["inheritance"] for d in diseases)
    category_counts = Counter(d.get("category", "Other") for d in diseases)

    # Pre-parse all carrier frequencies ONCE
    freq_map = {i: parse_carrier_freq(d["carrier_frequency"])
                for i, d in enumerate(diseases)}
    all_freqs = list(freq_map.values())
    sorted_by_freq = sorted(diseases,
        key=lambda d: parse_carrier_freq(d["carrier_frequency"]))

    # Filter options (static)
    inheritance_options = sorted(set(d["inheritance"] for d in diseases))
    category_options = sorted(set(d.get("category", "Other") for d in diseases))

    return {
        "total_count": total_count,
        "unique_genes": unique_genes,
        "high_sev_count": high_sev_count,
        "inheritance_counts": inheritance_counts,
        "category_counts": category_counts,
        "all_freqs": all_freqs,
        "min_freq": min(all_freqs) if all_freqs else 0,
        "max_freq": max(all_freqs) if all_freqs else 1,
        "sorted_by_freq": sorted_by_freq,
        "inheritance_options": inheritance_options,
        "category_options": category_options,
    }
```

**Step 2: Replace module-scope computations** with single `stats = compute_catalog_stats(diseases)` call.

**Step 3: Refactor chart sections** to use `stats["inheritance_counts"]`, `stats["category_counts"]`, `stats["sorted_by_freq"]` instead of re-computing.

#### Files Modified

- `pages/disease_catalog.py` (refactor ~60 lines)

#### Tests

- Existing disease catalog tests should still pass
- Add 2-3 tests for `compute_catalog_stats()` output correctness

#### Dependencies

- Benefits from T2.1 (cached `load_diseases()` already exists, but this caches derived stats)

---

### T2.3 — Load Scientific Data into Indexed SQLite

**Priority:** LOW (for now) | **Effort:** 2-3 days | **Impact:** 10-20x faster catalog filtering at scale

#### Current State

- `Source/database.py` exists with users, audit_log, and auth_tokens tables — **no scientific data tables**
- Disease catalog filtering: Python list comprehensions over 2,715 in-memory records
- `parse_carrier_freq()` called thousands of times per page (string parsing "1 in 25" → 25)
- Current performance is adequate at 2,715 records (~20ms for multi-filter)
- At 10,000 diseases (future): JSON filtering becomes ~50ms, SQLite stays <5ms

#### Implementation Plan

**Step 1: Add `diseases` and `traits` tables to `Source/database.py`**

```sql
CREATE TABLE IF NOT EXISTS diseases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rsid TEXT NOT NULL UNIQUE,
    gene TEXT NOT NULL,
    condition TEXT NOT NULL,
    inheritance TEXT NOT NULL,
    carrier_frequency TEXT,
    carrier_freq_numeric INTEGER,  -- pre-parsed "1 in N" → N
    pathogenic_allele TEXT NOT NULL,
    reference_allele TEXT NOT NULL,
    description TEXT,
    severity TEXT,
    category TEXT,
    confidence TEXT,
    notes TEXT,
    sources TEXT  -- JSON array as text
);

-- Indexes for catalog filtering
CREATE INDEX IF NOT EXISTS idx_diseases_category ON diseases(category);
CREATE INDEX IF NOT EXISTS idx_diseases_severity ON diseases(severity);
CREATE INDEX IF NOT EXISTS idx_diseases_inheritance ON diseases(inheritance);
CREATE INDEX IF NOT EXISTS idx_diseases_gene ON diseases(gene);
CREATE INDEX IF NOT EXISTS idx_diseases_freq ON diseases(carrier_freq_numeric);

-- FTS5 for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS diseases_fts USING fts5(
    condition, gene, description,
    content='diseases', content_rowid='id'
);
```

**Step 2: JSON-to-SQLite loader** (idempotent, runs at startup)

- Read `carrier_panel.json`, insert into `diseases` table with pre-parsed `carrier_freq_numeric`
- Keep JSON as canonical source-of-truth (version-controlled), SQLite as runtime cache

**Step 3: Refactor `disease_catalog.py`** to use SQL queries instead of list comprehensions

- Text search → FTS5 MATCH
- Severity/inheritance/category → WHERE IN
- Frequency range → BETWEEN on `carrier_freq_numeric`

**Step 4: Refactor `carrier_analysis.py`** to optionally accept pre-loaded panel or query from SQLite

- Pre-filter: only fetch diseases where parent rsIDs match (eliminates ~60-80% of "unknown" processing)

#### Files Modified

- `Source/database.py` (add diseases/traits schema + loader)
- `pages/disease_catalog.py` (SQL queries instead of list comprehensions)
- `Source/carrier_analysis.py` (optional SQLite-backed analysis)

#### Tests

- Unit tests for schema creation and data loading
- Integration tests for SQL queries matching JSON filtering results
- Performance benchmarks (optional)

#### Dependencies

- Should be done AFTER T2.1 and T2.2 (which provide immediate wins)
- Builds on existing `Source/database.py` infrastructure from T1

#### Risk Assessment

- **Low urgency**: 2,715 records filter fast enough in Python for now
- **High value at scale**: Essential when panel grows to 10K+ diseases
- **Recommended**: Implement when Tier 5 (genetic science improvements) expands the panel

---

### T2.4 — Font Loading Optimization

**Priority:** MEDIUM | **Effort:** 30 min | **Impact:** ~200ms faster initial render + ~200KB less data

#### Current State

`Source/ui/theme.py` line 97:

```css
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Lexend:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
```

**Problems:**

1. `@import` inside `<style>` is render-blocking (slowest loading method)
2. 14 font weight files loaded, but only 9 are actually used in CSS

**Unused font weights (5 total, ~200KB wasted):**

| Font           | Unused Weights | Evidence                                       |
| -------------- | -------------- | ---------------------------------------------- |
| Lexend         | 300, 600, 700  | No CSS rules use these weights with Lexend     |
| JetBrains Mono | 500, 600       | Only weight 400 used (default for `code, pre`) |

**Used font weights (9 total):**

- Sora: 300, 400, 500, 600, 700, 800 (all 6 used)
- Lexend: 400, 500 (2 of 5 used)
- JetBrains Mono: 400 (1 of 3 used)

#### Implementation Plan

**Step 1: Replace `@import` with `<link>` tags**

```python
_FONT_PRELOAD = """
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Lexend:wght@400;500&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
"""
```

**Step 2: Trim unused weights from URL**

- Lexend: `wght@300;400;500;600;700` → `wght@400;500`
- JetBrains Mono: `wght@400;500;600` → `wght@400`
- Sora: Keep all 6 (all used)

**Step 3: Inject via `st.markdown()` before CSS block** (Streamlit limitation — can't add to `<head>` directly)

#### Files Modified

- `Source/ui/theme.py` (replace `@import` with `<link>` tags, trim weights)

#### Complication

- Streamlit injects everything via `st.markdown(..., unsafe_allow_html=True)`. The `<link>` tags must go in a separate `st.markdown()` call before the `<style>` block. This works in practice — Streamlit renders HTML tags in the body, and the browser still fetches fonts.

#### Tests

- Visual verification only (no automated test for font loading)

#### Dependencies

- None. Independent of other T2 items.

---

### T2.5 — Remove Unused CSS Animations

**Priority:** LOW | **Effort:** 5 min | **Impact:** Cleaner code, ~16 lines removed

#### Current State

4 dead `@keyframes` animations in `Source/ui/theme.py`:

| Animation       | Line    | Description        | Referenced Anywhere? |
| --------------- | ------- | ------------------ | -------------------- |
| `borderGlow`    | 189-192 | Border color pulse | **NO** — dead code   |
| `breathe`       | 213-216 | Opacity pulse      | **NO** — dead code   |
| `dnaStrandSpin` | 217-220 | 3D rotation        | **NO** — dead code   |
| `pulseGlow`     | 240-243 | Box-shadow pulse   | **NO** — dead code   |

**Note:** `pulseGlow` (dead, line 240) is confusingly similar to `glowPulse` (USED, line 201). Verified: `glowPulse` is referenced at lines 576 and 727. `pulseGlow` is referenced nowhere.

**Note:** `shimmer` (line 185) is NOT used in theme.py but IS used in `Source/ui/components.py:102`. Must NOT be removed.

#### Implementation Plan

Delete these 4 `@keyframes` blocks from `Source/ui/theme.py`:

- Lines 189-192: `borderGlow`
- Lines 213-216: `breathe`
- Lines 217-220: `dnaStrandSpin`
- Lines 240-243: `pulseGlow`

#### Files Modified

- `Source/ui/theme.py` (remove ~16 lines)

#### Tests

- Visual verification (no animation tests exist)
- Run ruff + existing tests to confirm no breakage

#### Dependencies

- None. Can be done any time.

---

## TIER 3: FRONTEND & UX

### T3.1 — Accessibility (WCAG 2.1 AA)

**Priority:** CRITICAL | **Effort:** 1-2 days | **Impact:** Legal compliance, usability for 15% of users

#### Current State — Complete Audit

**Contrast failures:**

| Element        | Dark Mode                                        | Light Mode                                 |
| -------------- | ------------------------------------------------ | ------------------------------------------ |
| `--text-dim`   | `#64748b` on `#050810` = **~4.2:1** (borderline) | `#94a3b8` on `#f8fafc` = **~2.5:1** (FAIL) |
| `--text-muted` | `#94a3b8` on `#0c1220` = ~5.8:1 (pass)           | `#475569` on `#ffffff` = ~6.5:1 (pass)     |
| All other text | Pass                                             | Pass                                       |

**Missing features:**

- **Zero** `:focus-visible` styles (keyboard users have no visual focus indicator)
- **Zero** `prefers-reduced-motion` support (16 animations run continuously)
- **Zero** ARIA attributes in custom HTML (navbar, cards, badges, toggle)
- **Zero** skip navigation links
- No `role="switch"` on theme toggle
- No `aria-hidden="true"` on decorative elements (DNA dots, noise texture)

#### Implementation Plan

**Step 1: Fix contrast ratios**

- Dark mode `--text-dim`: `#64748b` → `#7c8db5` (achieves ~4.7:1)
- Light mode `--text-dim`: `#94a3b8` → `#6b7280` (achieves ~4.8:1)
- Update Python constant `TEXT_DIM` (line 31) to match dark mode value

**Step 2: Add focus-visible styles** (theme.py)

```css
*:focus-visible {
  outline: 2px solid var(--accent-teal);
  outline-offset: 2px;
  border-radius: 4px;
}
```

**Step 3: Add prefers-reduced-motion** (theme.py)

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Step 4: Add ARIA attributes to custom HTML**

- Navbar links: `role="navigation"`, `aria-label="Main navigation"`
- Theme toggle: `role="switch"`, `aria-checked`, `aria-label="Toggle dark/light mode"`
- DNA dot decorations: `aria-hidden="true"`
- Severity badges: `role="status"`
- Chart containers: `aria-label` descriptions

**Step 5: Add color-blind safe shape indicators alongside color for severity**

- High: triangle icon + red
- Moderate: diamond icon + amber
- Low: circle icon + green

#### Files Modified

- `Source/ui/theme.py` (contrast vars, focus-visible, reduced-motion, shapes)
- `Source/ui/navbar.py` (ARIA on nav, toggle)
- `Source/ui/components.py` (ARIA on badges, severity shapes)
- `Source/ui/footer.py` (ARIA on decorative elements)
- `pages/analysis.py` (ARIA on chart containers)
- `pages/disease_catalog.py` (ARIA on chart containers)

#### Tests

- Contrast ratio validation (programmatic check of hex values)
- Verify `prefers-reduced-motion` media query exists
- Verify ARIA attributes present in rendered HTML

#### Dependencies

- Should be done FIRST — forms foundation for all other T3 visual work.

---

### T3.2 — Responsive/Mobile CSS

**Priority:** CRITICAL | **Effort:** 3-5 days | **Impact:** Entire mobile user base

#### Current State

- **Zero** `@media` queries in 974 lines of production CSS
- **Zero** hamburger menu or mobile drawer for navbar
- `st.columns(4)` used on 5 pages — Streamlit provides basic stacking but custom HTML cards overflow
- Navbar uses `flex-wrap: wrap` with no deliberate mobile layout
- Hero section has fixed sizing that overflows on narrow screens
- DNA decoration element (`width: 200px; height: 140%`) can overflow

#### Implementation Plan

**Step 1: Add 3 breakpoints to theme.py**

Tablet (1024px):

```css
@media (max-width: 1024px) {
  .block-container {
    max-width: 95%;
    padding: 0.5rem;
  }
  .hero-section {
    padding: 2.5rem 1.5rem 2rem;
  }
  .hero-section h1 {
    font-size: 2.4rem;
  }
}
```

Mobile (768px):

```css
@media (max-width: 768px) {
  .mergenix-navbar {
    flex-direction: column;
    padding: 10px 1rem;
  }
  .mergenix-navbar .nav-links {
    width: 100%;
    justify-content: center;
    overflow-x: auto;
    flex-wrap: nowrap;
    -webkit-overflow-scrolling: touch;
  }
  .hero-section {
    padding: 2rem 1rem;
  }
  .hero-section h1 {
    font-size: 1.8rem;
  }
  .disease-card {
    padding: 16px;
  }
  .pricing-card {
    padding: 24px 16px;
  }
  .catalog-metric {
    padding: 16px 12px;
  }
  [data-testid='stHorizontalBlock'] {
    flex-direction: column !important;
  }
  [data-testid='stColumn'] {
    width: 100% !important;
    flex: 1 1 100% !important;
  }
}
```

Small mobile (480px):

```css
@media (max-width: 480px) {
  .hero-section h1 {
    font-size: 1.5rem;
  }
  .mergenix-navbar .brand-text {
    font-size: 1.2rem;
  }
  .nav-link {
    padding: 6px 10px;
    font-size: 0.8rem;
  }
  .disease-card h4 {
    font-size: 1rem;
  }
  .meta-tag {
    font-size: 0.72rem;
    padding: 3px 8px;
  }
}
```

**Step 2: Navbar mobile pattern**

- At 768px: Stack brand + toggle on first row, horizontally scrollable nav links below
- Touch target minimum: 44x44px for all interactive elements

**Step 3: Fix Streamlit column stacking**

- Override `stHorizontalBlock` to `flex-direction: column` on mobile
- Ensure custom cards inside columns have min-width instead of fixed width

**Step 4: Handle hero overflow**

- DNA decoration: `display: none` on mobile
- Hero text: responsive font sizes
- CTA buttons: full-width on mobile

#### Files Modified

- `Source/ui/theme.py` (add ~100 lines of media queries)
- `Source/ui/navbar.py` (responsive nav structure)
- `pages/home.py` (hero section adjustments)

#### Tests

- Visual verification at 1024px, 768px, 480px widths
- Verify no horizontal scrollbar on mobile

#### Dependencies

- Should follow T3.1 (accessibility) since breakpoints interact with contrast and focus styles

---

### T3.3 — Emotional Design for High-Risk Results

**Priority:** HIGH | **Effort:** 2-3 days | **Impact:** User trust, anxiety reduction, clinical appropriateness

#### Current State

- High-risk heading: `"### 🚨 High Risk -- Both Parents Carry Variant"` — alarming siren emoji
- Cards have `border-left: 4px solid #ef4444` (bright red) + red-tinted background
- Single-parent mode uses `"#### ❌ Affected (homozygous pathogenic)"` — red X + clinical jargon
- Probabilities shown only as percentages (e.g., "25.0%") with red/amber/green bars
- **No counseling links on results page** (only on legal page)
- **No pre-result context card** explaining what results mean
- **No reassurance language** for carriers

#### Implementation Plan

**Step 1: Add pre-results context card** (analysis.py, before results display)

```
Before You View Your Results

Genetic carrier screening often identifies variants — this is normal.
About 1 in 4 people carry at least one pathogenic variant.

• Being a carrier does NOT mean your children will develop the condition
• Most findings require BOTH parents to carry the same variant for offspring risk
• These results inform, they don't diagnose
• We recommend discussing results with a genetic counselor
```

**Step 2: Replace alarming language**

| Current                               | New                          |
| ------------------------------------- | ---------------------------- |
| "🚨 High Risk"                        | "Important Finding"          |
| "❌ Affected (homozygous pathogenic)" | "Both Copies Present"        |
| "⚠️ Carrier Detected"                 | "One Copy Found"             |
| "Normal"                              | "No Variant Detected"        |
| "pathogenic allele"                   | "disease-associated variant" |

**Step 3: Soften visual treatment for high-risk cards**

- Replace red borders (`#ef4444`) with amber/warm tone for "needs attention"
- Reserve red only for severity badge, not entire card
- Add "information" icon instead of alarm/siren
- Add breathing room (margin) between high-risk cards

**Step 4: Add genetic counseling links to results page**

```
Next Steps for Your Family
• Find a genetic counselor: [NSGC.org](https://www.nsgc.org/page/find-a-gc)
• These results are probability estimates, not certainties
• Download results to share with your healthcare provider
```

**Step 5: Add context to probability display**

- Show both percentage and fraction: "25% (1 in 4)"
- Add brief plain-language explanation: "This means approximately 1 in 4 children may be affected"

#### Files Modified

- `pages/analysis.py` (language, context card, counseling links, probability framing)
- `Source/ui/components.py` (update `render_probability_bar` label defaults)
- `Source/ui/theme.py` (softer card styles for findings)

#### Tests

- Verify new language strings render correctly
- Test that counseling links are present in results output
- Verify no regression in risk calculation logic

#### Dependencies

- Should follow T3.1 (contrast fixes affect the new card colors)

---

### T3.4 — User Onboarding and Sample Data Demo

**Priority:** HIGH | **Effort:** 3-5 days | **Impact:** User activation, reduced bounce rate

#### Current State

- "See How It Works" button at `pages/home.py:88` literally does `pass` — zero effect
- No demo mode, no guided tour, no welcome flow
- After registration, user is dumped directly to analysis page
- Analysis page shows two bare file uploaders with no guidance
- 24 sample data files exist in `sample_data/` but are never surfaced to users
- No explanation of where users can download their DNA data

#### Implementation Plan

**Step 1: Fix "See How It Works" button** → scroll to How It Works section or navigate to demo

**Step 2: Add "Try Demo" feature**

- New button on home page: "Try with Sample Data"
- Pre-loads two sample parent files (23andMe format) into session state
- Navigates to analysis page with demo data pre-filled
- Works without authentication (or minimal demo auth)
- Banner: "You're viewing a demo with sample data. Upload your own files for real results."

**Step 3: Welcome flow after registration**

- Redirect to welcome interstitial instead of directly to analysis
- Show 3-step guide: Upload → Analyze → Review
- Offer "Try Demo First" or "Upload My Files"

**Step 4: "How to Get Your DNA Data" guide**

- Expandable section on analysis page
- Per-provider instructions (23andMe, AncestryDNA, MyHeritage, VCF)
- Screenshots or step descriptions

**Step 5: File upload helper text**

- Add format examples under each uploader
- Show expected file size range
- Link to supported formats page

#### Files Modified

- `pages/home.py` (fix "See How It Works", add "Try Demo")
- `pages/analysis.py` (demo mode, file upload guidance, DNA download guide)
- `pages/auth.py` (welcome flow redirect after registration)
- `Source/ui/components.py` (optional: demo banner component)

#### Tests

- Test demo mode loads sample data correctly
- Test welcome flow redirect works
- Test "How to Get Your DNA Data" section renders

#### Dependencies

- Independent. Can run in parallel with T3.1-T3.3.

---

### T3.5 — Genetic Glossary and Tooltips

**Priority:** MEDIUM | **Effort:** 2 days | **Impact:** Comprehension for non-scientists

#### Current State

- **Zero** custom tooltips (only 3 native Streamlit `help=` params in entire app)
- **Zero** glossary page
- 12+ genetic terms used without definition: autosomal recessive, autosomal dominant, X-linked, carrier frequency, penetrance, pathogenic allele, homozygous, SNP, rsID, genotype, phenotype, Punnett square

#### Implementation Plan

**Step 1: Create glossary data** (`data/glossary.json`)

- 15-20 genetic terms with plain-language definitions
- Example: `"carrier": "Someone who has one copy of a gene variant. They're healthy but can pass it to children."`

**Step 2: Create glossary page** (`pages/glossary.py`)

- Searchable/filterable list of terms
- Alphabetical organization
- Links to relevant analysis page sections

**Step 3: Add contextual tooltips via CSS**

- Custom CSS tooltip class in theme.py
- Python helper function: `tooltip_term("autosomal recessive")` → returns HTML with hover tooltip
- Apply to key terms in analysis.py, disease_catalog.py, about.py

**Step 4: Add inline explanations on analysis results**

- Brief "(what does this mean?)" links on key results
- Uses `st.expander()` for detailed explanations without cluttering UI

#### Files Modified

- `data/glossary.json` (NEW)
- `pages/glossary.py` (NEW)
- `Source/ui/theme.py` (tooltip CSS)
- `Source/ui/components.py` (tooltip helper function)
- `pages/analysis.py` (apply tooltips to technical terms)
- `pages/disease_catalog.py` (apply tooltips)
- `app.py` (register glossary page)

#### Tests

- Test glossary page renders all terms
- Test tooltip HTML generation
- Test glossary data completeness

#### Dependencies

- Should be done alongside T3.3 (emotional design) — both improve result comprehension

---

### T3.6 — Interactive Data Visualizations

**Priority:** MEDIUM | **Effort:** 5-7 days | **Impact:** Engagement, comprehension

#### Current State

- Only `plotly.graph_objects` used, only in `disease_catalog.py` (4 charts)
- Analysis results page has **zero charts** — only static HTML probability bars
- **No visual Punnett square** — `punnett_square()` in `trait_prediction.py` returns dict, never rendered as grid
- Probability bars (`render_probability_bar`) are static HTML with CSS gradient fill, not interactive

#### Implementation Plan

**Step 1: Interactive Punnett square visualization** (highest-impact item)

- Visual 2x2 grid showing Parent A × Parent B crosses
- Color-coded cells: green (normal), amber (carrier), red/rose (affected)
- Each cell shows genotype, probability percentage, and phenotype label
- Implement as Plotly heatmap or pure HTML/CSS grid with hover tooltips
- Display for both carrier risk and trait predictions

**Step 2: Risk summary radar chart** (analysis results page)

- Plotly Scatterpolar showing risk by disease category
- Axes: Metabolic, Neurological, Cardiovascular, Cancer, Immunodeficiency, etc.
- Point size proportional to number of high-risk matches
- Gives at-a-glance category risk overview

**Step 3: Combined probability spectrum** (replace 3 separate bars)

- Single stacked bar showing Affected/Carrier/Normal proportions
- Interactive hover showing exact percentages
- Replace current `render_probability_bar()` trio

**Step 4: Category treemap** (disease catalog)

- Replace horizontal bar chart for categories with Plotly treemap
- More visually engaging for hierarchical category data

**Step 5: Confidence signal-strength indicator**

- Wi-Fi-style bars for High/Medium/Low confidence
- Replace current color dots
- 3 ascending bars, filled to level

#### Files Modified

- `pages/analysis.py` (add Punnett square, radar chart, stacked bar)
- `pages/disease_catalog.py` (treemap chart)
- `Source/ui/components.py` (Punnett square renderer, confidence indicator, stacked probability bar)
- `Source/ui/theme.py` (CSS for new visualization components)

#### Tests

- Test Punnett square renders correct genotypes for known inputs
- Test radar chart handles zero high-risk results gracefully
- Test confidence indicator renders correct bar counts

#### Dependencies

- T3.3 (emotional design) should be done first — affects how results are framed around visualizations

---

### T3.7 — Multi-Step Analysis Progress Indicator

**Priority:** LOW | **Effort:** 1-2 days | **Impact:** User experience during analysis

#### Current State

`pages/analysis.py` uses `st.progress()` with 3 discrete jumps:

- 0% → "Starting analysis..."
- 10% → "Screening carrier risk (X diseases)..."
- 50% → "Predicting offspring traits..."
- 100% → "Analysis complete!"

No visual step indicator, no estimated time, no sub-progress within carrier analysis.

#### Implementation Plan

**Step 1: Create multi-step progress component** (components.py)

- Visual stepper: Upload → Parse → Screen → Predict → Complete
- Each step has icon, label, and status (completed/active/pending)
- Active step shows pulsing animation

**Step 2: Add granular progress** within carrier analysis

- Update progress during disease iteration: "Analyzing disease 500 of 2,715..."
- Show estimated time remaining based on throughput

**Step 3: Add skeleton loading** for results area

- While analysis runs, show skeleton cards where results will appear
- Smooth transition from skeleton to actual results

#### Files Modified

- `Source/ui/components.py` (stepper component, skeleton loading)
- `Source/ui/theme.py` (stepper CSS, skeleton CSS)
- `pages/analysis.py` (replace st.progress with multi-step indicator)

#### Tests

- Test stepper component renders correct number of steps
- Test skeleton loading HTML structure

#### Dependencies

- Can be done in parallel with other T3 items

---

### T3.8 — Light Mode as Default

**Priority:** MEDIUM | **Effort:** 30 min code + thorough testing | **Impact:** Clinical credibility

#### Current State

- Dark mode is default: `app.py:34` sets `st.session_state["theme"] = "dark"`
- `theme.py:59` returns `"dark"` as fallback
- CSS `:root` contains dark mode variables; `html.light-mode` class overrides for light
- Python constants (lines 20-34) are hardcoded to dark mode colors
- Some inline styles in pages hardcode dark-mode colors (e.g., `analysis.py:464`)

#### Implementation Plan

**Step 1: Change defaults**

- `app.py:34`: `"dark"` → `"light"`
- `theme.py:59`: fallback `"dark"` → `"light"`

**Step 2: Audit and fix hardcoded dark-mode colors in inline styles**

- Search all `pages/*.py` for hardcoded hex colors that assume dark background
- Replace with CSS variable references where possible

**Step 3: Verify both themes still work correctly**

- Full visual review of every page in both light and dark mode
- Ensure toggle still works after default change

#### Files Modified

- `app.py` (change default)
- `Source/ui/theme.py` (change fallback)
- `pages/analysis.py` (fix hardcoded dark-mode colors)
- Any other pages with hardcoded colors

#### Tests

- Visual verification of all pages in both themes
- Test that toggle persists user preference
- Test that new users see light mode

#### Dependencies

- Should be done LAST — after all other visual changes are finalized and tested

---

## Implementation Roadmap

### Dependency Graph

```
T2.1 (cache loaders) ─────────────────────────────────────┐
T2.2 (pre-compute stats) ─── depends on T2.1 ─────────────┤
T2.4 (font optimization) ─── independent ──────────────────┤
T2.5 (remove dead CSS) ─── independent ────────────────────┤
                                                           │
T3.1 (accessibility) ──────── FIRST ───────────────────────┤
T3.2 (responsive CSS) ─────── after T3.1 ──────────────────┤
T3.3 (emotional design) ──── after T3.1 ───────────────────┤
T3.4 (onboarding) ──────────── independent ────────────────┤
T3.5 (glossary) ─────────────── alongside T3.3 ────────────┤
T3.6 (visualizations) ──────── after T3.3 ─────────────────┤
T3.7 (progress indicator) ─── independent ─────────────────┤
T3.8 (light mode default) ─── LAST ────────────────────────┘
                                                           │
T2.3 (SQLite scientific data) ── deferred to Tier 5 ───────┘
```

### Recommended Execution Phases

#### Phase A: Quick Wins (Day 1) — ~4 hours

| Task                            | Agent Type | Effort | Parallel? |
| ------------------------------- | ---------- | ------ | --------- |
| T2.1 Cache all data loaders     | executor   | 1-2 hr | YES       |
| T2.2 Pre-compute catalog stats  | executor   | 30 min | YES       |
| T2.4 Font loading optimization  | executor   | 30 min | YES       |
| T2.5 Remove dead CSS animations | executor   | 5 min  | YES       |

All 4 are independent — execute in parallel.

#### Phase B: Accessibility Foundation (Days 2-3) — ~2 days

| Task                         | Agent Type    | Effort   | Parallel? |
| ---------------------------- | ------------- | -------- | --------- |
| T3.1 WCAG 2.1 AA compliance  | executor-high | 1-2 days | Primary   |
| T3.4 User onboarding (start) | executor      | 1 day    | Parallel  |

T3.1 is foundation for all visual work. T3.4 touches different files, can start in parallel.

#### Phase C: Responsive + Emotional Design (Days 4-7) — ~4 days

| Task                              | Agent Type    | Effort   | Parallel?                       |
| --------------------------------- | ------------- | -------- | ------------------------------- |
| T3.2 Responsive/mobile CSS        | executor-high | 3-5 days | YES (different files from T3.3) |
| T3.3 Emotional design for results | executor      | 2-3 days | YES (primarily analysis.py)     |
| T3.5 Glossary and tooltips        | executor      | 2 days   | YES (new files + components.py) |
| T3.4 User onboarding (finish)     | executor      | 2 days   | Continue                        |

T3.2 (theme.py), T3.3 (analysis.py), T3.5 (new files) touch mostly different files.

#### Phase D: Visualizations + Polish (Days 8-12) — ~5 days

| Task                            | Agent Type    | Effort   | Parallel?                  |
| ------------------------------- | ------------- | -------- | -------------------------- |
| T3.6 Interactive visualizations | executor-high | 5-7 days | Primary                    |
| T3.7 Multi-step progress        | executor      | 1-2 days | Parallel                   |
| T3.8 Light mode default         | executor-low  | 30 min   | After all visual work done |

#### Deferred

| Task                        | When                               | Why                                                                             |
| --------------------------- | ---------------------------------- | ------------------------------------------------------------------------------- |
| T2.3 SQLite scientific data | Tier 5 (genetic science expansion) | Current 2,715-record Python filtering is fast enough; becomes essential at 10K+ |

### Summary Table

| Task                            | Priority | Effort   | Phase    | Files   |
| ------------------------------- | -------- | -------- | -------- | ------- |
| **T2.1** Cache data loaders     | HIGH     | 1-2 hr   | A        | 5 files |
| **T2.2** Pre-compute stats      | MED      | 30 min   | A        | 1 file  |
| **T2.3** SQLite scientific data | LOW      | 2-3 days | Deferred | 3 files |
| **T2.4** Font optimization      | MED      | 30 min   | A        | 1 file  |
| **T2.5** Dead CSS removal       | LOW      | 5 min    | A        | 1 file  |
| **T3.1** Accessibility          | CRIT     | 1-2 days | B        | 6 files |
| **T3.2** Responsive CSS         | CRIT     | 3-5 days | C        | 3 files |
| **T3.3** Emotional design       | HIGH     | 2-3 days | C        | 3 files |
| **T3.4** User onboarding        | HIGH     | 3-5 days | B+C      | 4 files |
| **T3.5** Glossary/tooltips      | MED      | 2 days   | C        | 7 files |
| **T3.6** Visualizations         | MED      | 5-7 days | D        | 4 files |
| **T3.7** Progress indicator     | LOW      | 1-2 days | D        | 3 files |
| **T3.8** Light mode default     | MED      | 30 min   | D (last) | 3 files |

**Total: ~8-12 days** (with parallelization across phases)
