# Mergenix Performance Optimization Report

**Date:** 2026-02-08
**Analyst:** Performance Agent
**Scope:** Full-stack profiling of the Mergenix genetic analysis platform

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture Analysis](#2-current-architecture-analysis)
3. [File Parsing Performance](#3-file-parsing-performance)
4. [JSON Data Loading & Caching](#4-json-data-loading--caching)
5. [Streamlit Caching Strategy](#5-streamlit-caching-strategy)
6. [Disease Catalog Page Performance](#6-disease-catalog-page-performance)
7. [Analysis Pipeline Optimization](#7-analysis-pipeline-optimization)
8. [Memory Profiling & Data Structures](#8-memory-profiling--data-structures)
9. [Startup Time & Cold Boot](#9-startup-time--cold-boot)
10. [CDN & Asset Optimization](#10-cdn--asset-optimization)
11. [Async & Parallelization Opportunities](#11-async--parallelization-opportunities)
12. [Profiling Toolkit Recommendations](#12-profiling-toolkit-recommendations)
13. [Benchmark Targets](#13-benchmark-targets)
14. [Prioritized Optimization Roadmap](#14-prioritized-optimization-roadmap)

---

## 1. Executive Summary

Mergenix currently has several performance bottlenecks that affect user experience:

| Issue | Impact | Estimated Savings | Priority |
|-------|--------|-------------------|----------|
| Redundant JSON loading in analysis.py | ~200-400ms per page load | ~300ms | CRITICAL |
| No caching on carrier_panel.json in analysis pipeline | ~150ms per analysis run | ~150ms | CRITICAL |
| Full-file-to-string parsing for large VCF files | >10s for 1GB files, memory blowup | ~80% memory, ~60% time | HIGH |
| 973-line CSS injected as raw string per page | ~50-100ms render | ~50ms | MEDIUM |
| Google Fonts loaded via @import (render-blocking) | 100-500ms FOUT | ~200ms | MEDIUM |
| Disease catalog renders all 2,715 items for filtering | Wasted compute per rerun | ~100ms | MEDIUM |
| No precomputed lookup index for rsID matching | O(n) per disease | ~40% time on analysis | MEDIUM |
| Repeated parse_carrier_freq calls per filter interaction | ~50ms | ~50ms | LOW |

**Top-line estimate:** Addressing CRITICAL and HIGH items would reduce analysis latency by ~500-700ms and make VCF parsing feasible for clinical-grade whole-genome files (which can be 3-10GB).

---

## 2. Current Architecture Analysis

### Data Flow

```
File Upload (BytesIO)
    |
    v
parser.py: _read_file_content() -- reads ENTIRE file into one string
    |
    v
parser.py: _detect_format_from_content() -- scans first 50 lines
    |
    v
parser.py: validate_*_format_from_content() -- scans first 50 lines again
    |
    v
parser.py: _parse_*_from_content() -- iterates ALL lines, builds dict
    |
    v
carrier_analysis.py: load_carrier_panel() -- json.load() 3MB file
    |
    v
carrier_analysis.py: analyze_carrier_risk() -- O(n_diseases) loop
    |
    v
trait_prediction.py: analyze_traits() -- O(n_traits) loop
```

### Key Files & Sizes

| File | Size | Lines | Description |
|------|------|-------|-------------|
| `data/carrier_panel.json` | **3.06 MB** | 81,452 | Disease panel (2,715 entries) |
| `data/trait_snps.json` | 121 KB | ~2,000 | Trait definitions (79 entries) |
| `Source/parser.py` | ~50 KB | 1,263 | Multi-format parser |
| `Source/carrier_analysis.py` | ~14 KB | 349 | Carrier risk engine |
| `Source/trait_prediction.py` | ~13 KB | 324 | Trait predictor |
| `Source/ui/theme.py` | ~40 KB | 973 | Full CSS theme |
| `pages/disease_catalog.py` | ~18 KB | 447 | Catalog page |
| `pages/analysis.py` | ~26 KB | 638 | Analysis dashboard |

---

## 3. File Parsing Performance

### Current Issue: Entire File Read Into Memory

All parsers use `_read_file_content()` which reads the **entire file as a single string** (line 412-436 of parser.py):

```python
def _read_file_content(file: str | Path | BinaryIO) -> str:
    if isinstance(file, (str, Path)):
        with open(file_path, encoding='utf-8') as f:
            return f.read()  # <-- entire file in memory
    elif isinstance(file, BytesIO):
        content = file.getvalue().decode('utf-8')  # <-- full decode
```

Then `content.strip().split('\n')` creates a **second copy** as a list of strings.

**For a typical 23andMe file (~700K SNPs, ~30MB):** 30MB string + 30MB split list = ~60MB per parent.

**For a whole-genome VCF file (~5M variants, ~1-3GB):** Would use 2-6GB just to hold the text + split list. This will crash most browsers and Streamlit deployments.

### Optimization 1: Line-by-Line Streaming Parser (HIGH priority)

Instead of reading the entire file into a string, parse line by line:

```python
def _parse_23andme_streaming(file: str | Path | BinaryIO) -> dict[str, str]:
    """Stream-parse 23andMe file without loading entire content into memory."""
    snps: dict[str, str] = {}

    if isinstance(file, (str, Path)):
        handle = open(Path(file), encoding='utf-8')
    elif isinstance(file, BytesIO):
        import io
        file.seek(0)
        handle = io.TextIOWrapper(file, encoding='utf-8')
    else:
        handle = file

    try:
        for line in handle:
            stripped = line.rstrip('\n\r')
            if not stripped or stripped[0] == '#':
                continue
            parts = stripped.split('\t')
            if len(parts) < 4:
                continue
            rsid = parts[0]
            genotype = parts[3]
            if genotype == '--' or not genotype:
                continue
            if rsid[0:2] == 'rs' or rsid[0] == 'i':
                snps[rsid] = genotype
            elif rsid.lower() in ('rsid', 'id', 'snp'):
                continue
            else:
                snps[rsid] = genotype
    finally:
        if isinstance(file, (str, Path)):
            handle.close()

    if not snps:
        raise ValueError("No valid SNP data found.")
    return snps
```

**Impact:**
- Memory: ~50% reduction (no duplicate string copy)
- Speed: ~15-25% faster for typical files (avoids `.split('\n')` on entire content)
- VCF files: Makes multi-GB files feasible (constant memory regardless of file size)

### Optimization 2: Separate Detection from Parsing

Currently, `parse_genetic_file()` (line 682-735) calls:
1. `_read_file_content()` -- reads entire file
2. `_detect_format_from_content()` -- scans first 50 lines
3. `validate_*_from_content()` -- scans first 50 lines again
4. `_parse_*_from_content()` -- scans ALL lines

Steps 2 and 3 duplicate work (both scan the first 50 lines for format signatures). This can be unified into a single-pass detector+validator that also begins parsing immediately.

**Recommended approach:**
```python
def parse_genetic_file_streaming(file):
    """Detect format from header, then stream-parse the rest."""
    # Read first 50 lines for detection
    header_lines = []
    for i, line in enumerate(_line_iterator(file)):
        header_lines.append(line)
        if i >= 49:
            break

    fmt = _detect_format_from_lines(header_lines)
    is_valid, err = _validate_format_from_lines(header_lines, fmt)
    if not is_valid:
        raise ValueError(err)

    # Reset and stream-parse
    file.seek(0)
    return _stream_parsers[fmt](file), fmt
```

**Impact:** Eliminates 1 redundant scan pass. Saves ~5-10ms for typical files, but much more for large VCFs.

### Optimization 3: VCF-Specific Chunked Parser

VCF files are the critical path because they can be gigabytes. A purpose-built VCF parser should:

1. **Skip meta-lines (`##`) immediately** -- don't even store them
2. **Parse only rsID-bearing SNP rows** -- skip indels and non-rs variants in O(1) per line
3. **Use `mmap` for on-disk VCF files** for zero-copy access
4. **Consider `cyvcf2` or `pysam` libraries** for truly large VCFs (C-backed, handles bgzip)

```python
import mmap

def _parse_vcf_mmap(file_path: str) -> dict[str, str]:
    """Memory-mapped VCF parser for on-disk files."""
    snps = {}
    with open(file_path, 'rb') as f:
        mm = mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ)
        for line in iter(mm.readline, b''):
            if line[:1] == b'#':
                continue
            parts = line.split(b'\t')
            if len(parts) < 10:
                continue
            variant_id = parts[2]
            if not variant_id.startswith(b'rs'):
                continue
            ref = parts[3]
            alt = parts[4]
            if len(ref) != 1 or b',' in alt:
                continue
            # ... GT extraction ...
            snps[variant_id.decode()] = genotype
        mm.close()
    return snps
```

**Impact:** Enables parsing of multi-GB VCF files with <100MB memory.

---

## 4. JSON Data Loading & Caching

### Current Issue: carrier_panel.json Loaded Multiple Times

The 3.06 MB `carrier_panel.json` is loaded via `json.load()` in multiple locations:

| Location | When | Cached? |
|----------|------|---------|
| `disease_catalog.py:31` | Every catalog page view | YES (`@st.cache_data`) |
| `carrier_analysis.py:38` | Every `load_carrier_panel()` call | NO |
| `analysis.py:63-67` | `_count_panel()` on every analysis page load | NO |
| `analysis.py:353-355` | `with open(CARRIER_PANEL_PATH)` inside analyze button | NO |
| `analysis.py:549-551` | Traits tab re-loads trait_snps.json | NO |

**`analysis.py` opens carrier_panel.json at least 3 times per page render** -- once in `_count_panel()`, once explicitly in the analyze button handler, and once inside `analyze_carrier_risk()` which calls `load_carrier_panel()`.

### Optimization 4: Centralized Cached Loader (CRITICAL)

```python
# Source/data_loader.py
import json
import streamlit as st

@st.cache_data
def load_carrier_panel_cached(panel_path: str) -> list[dict]:
    """Load and cache the carrier panel. Called once, reused everywhere."""
    with open(panel_path) as f:
        return json.load(f)

@st.cache_data
def load_trait_database_cached(db_path: str) -> list[dict]:
    """Load and cache the trait database."""
    with open(db_path) as f:
        return json.load(f)
```

Then update `carrier_analysis.py` to accept pre-loaded data:

```python
def analyze_carrier_risk(
    parent_a_snps: dict,
    parent_b_snps: dict,
    panel: list[dict],  # <-- accept pre-loaded panel instead of path
    tier: TierType | None = None,
) -> list[dict]:
    if tier is not None:
        panel = get_diseases_for_tier(tier, panel)
    # ... rest of analysis ...
```

**Impact:** Eliminates 3-4 redundant `json.load()` calls per analysis run. Saves ~150-400ms.

### Optimization 5: Pre-built rsID Lookup Index

Currently, `analyze_carrier_risk()` loops through all diseases and does `parent_a_snps.get(rsid, "")` -- this is O(1) per lookup (dict), but the loop iterates ALL 2,715 diseases. The real waste is that most SNPs won't even be present in the parents' data.

Pre-build a set of available rsIDs for intersection:

```python
@st.cache_data
def build_panel_rsid_index(panel: list[dict]) -> dict[str, int]:
    """Build rsID -> panel index mapping for O(1) lookup."""
    return {disease["rsid"]: i for i, disease in enumerate(panel)}

def analyze_carrier_risk_optimized(parent_a_snps, parent_b_snps, panel, tier=None):
    if tier is not None:
        panel = get_diseases_for_tier(tier, panel)

    # Pre-filter: only analyze diseases where at least one parent has the SNP
    panel_rsids = {d["rsid"] for d in panel}
    relevant_rsids = panel_rsids & (parent_a_snps.keys() | parent_b_snps.keys())

    # Build index for O(1) disease lookup by rsID
    rsid_to_disease = {d["rsid"]: d for d in panel}

    results = []
    for rsid in panel_rsids:
        disease = rsid_to_disease[rsid]
        # ... same analysis logic ...
```

**Impact:** Reduces unnecessary iterations. For a typical 23andMe file with ~700K SNPs, the intersection with 2,715 panel RSIDs is nearly instant. Main benefit is cleaner code and preparation for larger panels.

### Optimization 6: Binary Format for carrier_panel.json

For cold-start optimization, convert JSON to a faster format:

| Format | Load Time (3MB) | Compression | Implementation |
|--------|-----------------|-------------|----------------|
| JSON (current) | ~150ms | None | `json.load()` |
| MessagePack | ~30ms | ~40% smaller | `msgpack.unpackb()` |
| Pickle | ~10ms | Similar | `pickle.load()` |
| orjson | ~40ms | None (faster parser) | `orjson.loads()` |
| Parquet (columnar) | ~20ms | ~70% smaller | `pd.read_parquet()` |

**Recommended: `orjson`** -- Drop-in replacement for `json`, 3-10x faster parsing, no format migration needed.

```python
import orjson

@st.cache_data
def load_carrier_panel_fast(panel_path: str) -> list[dict]:
    with open(panel_path, 'rb') as f:
        return orjson.loads(f.read())
```

**Impact:** Reduces JSON parse time from ~150ms to ~30-50ms. Zero migration cost.

---

## 5. Streamlit Caching Strategy

### Current Caching Audit

| Decorator | Location | What's Cached | Correct? |
|-----------|----------|---------------|----------|
| `@st.cache_data` | `disease_catalog.py:30` | `load_diseases()` | YES |
| `@st.cache_resource` | `analysis.py:55` | `AuthManager()` | YES |
| None | `carrier_analysis.py:19` | `load_carrier_panel()` | **NO -- should be cached** |
| None | `trait_prediction.py:11` | `load_trait_database()` | **NO -- should be cached** |
| None | `analysis.py:153-166` | `load_traits_corrected()` | **NO -- should be cached** |
| None | `analysis.py:62-76` | `_count_panel()` / `_count_traits()` | **NO -- should be cached** |

### Recommended Caching Additions

**Rule of thumb from Streamlit docs:**
- `@st.cache_data` -- for serializable data (JSON, DataFrames, dicts, lists). Returns a copy.
- `@st.cache_resource` -- for singletons (DB connections, ML models, auth managers). Returns same object. Use carefully to avoid mutation issues.

```python
# analysis.py -- cache the counts
@st.cache_data
def _count_panel(path):
    with open(path) as f:
        return len(json.load(f))

@st.cache_data
def _count_traits(path):
    with open(path) as f:
        raw = json.load(f)
    return len(raw) if isinstance(raw, list) else len(raw.get("snps", []))

# analysis.py -- cache corrected traits
@st.cache_data
def load_traits_corrected(db_path: str):
    with open(db_path) as f:
        raw = json.load(f)
    traits = raw if isinstance(raw, list) else raw.get("snps", raw)
    for trait in traits:
        original_map = trait.get("phenotype_map", {})
        flat_map = {}
        for genotype_key, value in original_map.items():
            if isinstance(value, dict):
                flat_map[genotype_key] = value.get("phenotype", str(value))
            else:
                flat_map[genotype_key] = value
        trait["phenotype_map"] = flat_map
    return traits
```

**Impact:** Each uncached `json.load()` of carrier_panel.json takes ~150ms. Adding `@st.cache_data` to the 4 uncached locations saves ~600ms total across page loads and analysis runs.

---

## 6. Disease Catalog Page Performance

### Current Issue: Redundant Computation on Every Streamlit Rerun

`disease_catalog.py` computes these on **every page rerun** (which happens on every user interaction):

```python
# Lines 60-67 -- runs every rerun
diseases = load_diseases()  # cached, fast
total_count = len(diseases)  # fast
unique_genes = len(set(d["gene"] for d in diseases))  # O(n)
high_sev_count = sum(1 for d in diseases if d.get("severity") == "high")  # O(n)
inheritance_counts = Counter(d["inheritance"] for d in diseases)  # O(n)
```

These 4 computations iterate all 2,715 entries every time the user changes a filter, clicks pagination, or interacts with any widget.

### Optimization 7: Cache Derived Statistics

```python
@st.cache_data
def compute_catalog_stats(diseases: list[dict]) -> dict:
    """Pre-compute all catalog statistics once."""
    total_count = len(diseases)
    unique_genes = len(set(d["gene"] for d in diseases))
    high_sev_count = sum(1 for d in diseases if d.get("severity") == "high")
    inheritance_counts = Counter(d["inheritance"] for d in diseases)
    category_counts = Counter(d.get("category", "Other") for d in diseases)
    all_freqs = [parse_carrier_freq(d["carrier_frequency"]) for d in diseases]
    sorted_by_freq = sorted(diseases, key=lambda d: parse_carrier_freq(d["carrier_frequency"]))

    return {
        "total_count": total_count,
        "unique_genes": unique_genes,
        "high_sev_count": high_sev_count,
        "inheritance_counts": inheritance_counts,
        "category_counts": category_counts,
        "all_freqs": all_freqs,
        "min_freq": min(all_freqs),
        "max_freq": max(all_freqs),
        "sorted_by_freq": sorted_by_freq,
    }
```

**Impact:** Saves ~20-30ms per page rerun by computing stats once.

### Optimization 8: parse_carrier_freq Called Repeatedly

`parse_carrier_freq()` (line 36-40) does string parsing (`split("in")[1].strip().replace(",", "")`) and is called:

1. In the filter slider computation (line 143): `[parse_carrier_freq(d["carrier_frequency"]) for d in diseases]` -- 2,715 calls
2. In the frequency filter application (line 176-179): Another 2,715 calls
3. In the DataFrame builder (line 194): Another len(filtered) calls
4. In chart 4 (line 395-398): More calls

**Total: ~8,000-11,000 calls per page load.** Each call does string ops.

**Fix:** Pre-compute and cache the parsed frequencies:

```python
@st.cache_data
def precompute_frequencies(diseases: list[dict]) -> dict[str, int]:
    """Parse carrier frequencies once, return rsid -> freq_number mapping."""
    return {d["rsid"]: parse_carrier_freq(d["carrier_frequency"]) for d in diseases}
```

Or add a `_freq_cache` field to each disease dict at load time.

**Impact:** Reduces ~10,000 string operations to ~2,715 (once).

---

## 7. Analysis Pipeline Optimization

### Current Pipeline Timing Breakdown (estimated for 2,715 diseases)

| Step | Estimated Time | Notes |
|------|---------------|-------|
| File parse (23andMe, ~700K SNPs) | ~500ms | String split + dict build |
| File parse (VCF, ~5M variants) | ~5-10s | Massive string operations |
| `json.load(carrier_panel.json)` | ~150ms | If uncached |
| `analyze_carrier_risk()` loop | ~50-100ms | 2,715 iterations, dict lookups |
| Sorting results | ~5ms | Timsort on 2,715 items |
| `load_traits_corrected()` | ~20ms | 79 entries |
| `run_trait_analysis()` | ~5ms | 79 iterations |
| **Total (23andMe, uncached)** | **~750-900ms** | |
| **Total (VCF, uncached)** | **~5-10s** | Dominated by parsing |

### Optimization 9: Avoid Re-loading Panel Inside analyze_carrier_risk

`analyze_carrier_risk()` calls `load_carrier_panel(panel_path)` which does `json.load()`. In `analysis.py`, the panel is ALSO loaded explicitly on line 353-355 to get `total_diseases`. This means the same 3MB file is parsed twice.

**Fix:** Load once, pass around:

```python
# analysis.py
panel = load_carrier_panel_cached(CARRIER_PANEL_PATH)  # from centralized loader
total_diseases = len(panel)

# Pass panel directly instead of path
carrier_results = analyze_carrier_risk_from_panel(
    snps_a, snps_b, panel, tier=TierType(user_tier)
)
```

### Optimization 10: Single-Parent Screening Redundancy

`single_parent_carrier_screen()` in analysis.py (line 179-191) is called:
- Once in single-parent mode (line 305)
- Twice more in the "Individual Reports" tab (line 611 for each parent)

Each call does `load_carrier_panel(panel_path)` which is another uncached JSON load.

**Fix:** Cache the panel, pass it to all screening calls.

### Optimization 11: ClinVar Client Creation

In the results display, multiple `ClinVarClient()` instances are created per button click (lines 477, 512). Each should be cached:

```python
@st.cache_resource
def get_clinvar_client(api_key: str = ""):
    return ClinVarClient(api_key=api_key) if api_key else ClinVarClient()
```

---

## 8. Memory Profiling & Data Structures

### Current Memory Usage Estimates

| Data Structure | Estimated Size | Notes |
|---------------|---------------|-------|
| Parent A SNPs dict (~700K entries) | ~56 MB | Keys avg 10 chars + values avg 2 chars + dict overhead |
| Parent B SNPs dict (~700K entries) | ~56 MB | Same |
| carrier_panel (2,715 dicts) | ~8 MB in memory | JSON overhead on Python dicts |
| Carrier results (2,715 dicts) | ~5 MB | Each has ~10 keys |
| Trait results (79 dicts) | ~100 KB | Small |
| Disease catalog DataFrame | ~1 MB | 2,715 rows x 7 columns |
| **Total per session** | **~126 MB** | |

### Optimization 12: Compact SNP Storage

Currently, SNPs are stored as `dict[str, str]` where keys are rsIDs like `"rs4477212"` and values are genotypes like `"AG"`.

Python dict overhead per entry: ~100 bytes (key str + value str + hash + pointer).
For 700K entries: 700K * 100 = **70 MB per parent**.

**Alternative: Use a compact representation:**

```python
import array

class CompactSNPStore:
    """Memory-efficient SNP storage using sorted arrays for O(log n) lookup."""

    def __init__(self, snps: dict[str, str]):
        # Convert rsIDs to integers (strip 'rs' prefix)
        rs_items = [(int(k[2:]), v) for k, v in snps.items() if k.startswith('rs')]
        rs_items.sort(key=lambda x: x[0])

        self._rs_ids = array.array('L', [item[0] for item in rs_items])
        self._genotypes = [item[1] for item in rs_items]

        # Keep non-rs entries in a small dict
        self._other = {k: v for k, v in snps.items() if not k.startswith('rs')}

    def get(self, rsid: str, default: str = "") -> str:
        if rsid.startswith('rs'):
            import bisect
            rs_num = int(rsid[2:])
            idx = bisect.bisect_left(self._rs_ids, rs_num)
            if idx < len(self._rs_ids) and self._rs_ids[idx] == rs_num:
                return self._genotypes[idx]
            return default
        return self._other.get(rsid, default)
```

**Impact:** Reduces memory from ~70MB to ~25MB per parent (array.array uses 8 bytes/int vs ~100 bytes/dict entry). Lookup becomes O(log n) via bisect instead of O(1), but for 700K entries, log2(700K) = ~20 comparisons, still <1us.

**Recommendation:** This is a LOW priority optimization. The current dict approach is fine for 700K entries. Only implement if targeting mobile deployments or very large VCF files.

### Optimization 13: Avoid Copying Filtered Lists

`disease_catalog.py` line 162: `filtered = diseases.copy()` creates a shallow copy of the 2,715-element list on every rerun. Then each filter step creates a new list comprehension.

```python
# Current: 4-5 list copies per filter chain
filtered = diseases.copy()  # copy 1
filtered = [d for d in filtered if q in d["condition"].lower() ...]  # copy 2
filtered = [d for d in filtered if d.get("severity") in severity_filter]  # copy 3
filtered = [d for d in filtered if d["inheritance"] in inheritance_filter]  # copy 4
filtered = [d for d in filtered if freq_range[0] <= ...]  # copy 5
```

**Fix: Use generator chaining or a single-pass filter:**

```python
def apply_filters(diseases, search_query, severity_filter, inheritance_filter,
                  category_filter, freq_range, freq_cache):
    """Apply all filters in a single pass."""
    q = search_query.lower() if search_query else None
    sev_set = set(severity_filter) if severity_filter else None
    inh_set = set(inheritance_filter) if inheritance_filter else None
    cat_set = set(category_filter) if category_filter else None

    results = []
    for d in diseases:
        if q and not (q in d["condition"].lower() or q in d["gene"].lower()
                     or q in d.get("description", "").lower()):
            continue
        if sev_set and d.get("severity") not in sev_set:
            continue
        if inh_set and d["inheritance"] not in inh_set:
            continue
        if cat_set and d.get("category", "Other") not in cat_set:
            continue
        freq = freq_cache.get(d["rsid"], 999999)
        if not (freq_range[0] <= freq <= freq_range[1]):
            continue
        results.append(d)
    return results
```

**Impact:** Reduces 4-5 list allocations to 1. Saves ~5-10ms per filter interaction.

---

## 9. Startup Time & Cold Boot

### Current Cold Start Sequence

1. **Python process start:** ~500ms (Streamlit overhead)
2. **Import chain:**
   - `app.py` imports `Source.ui` (theme.py = 973 LOC CSS string)
   - `Source.ui.navbar` imports `Source.auth`
   - Each page imports its dependencies
3. **`st.set_page_config()`:** ~10ms
4. **`inject_global_css()`:** Renders 926-line CSS string via `st.markdown()` ~30ms
5. **Theme JS injection:** Another `st.markdown()` call ~10ms
6. **`render_navbar()`:** Calls `get_current_user()` + builds HTML ~20ms
7. **Page render begins**

**Total estimated cold start:** ~800ms-1.2s

### Optimization 14: Lazy Imports

```python
# Instead of importing everything at module level:
from Source.carrier_analysis import analyze_carrier_risk  # loaded immediately
from Source.clinvar_client import ClinVarClient  # loaded immediately

# Use lazy imports:
def _get_clinvar_client(api_key=""):
    from Source.clinvar_client import ClinVarClient
    return ClinVarClient(api_key=api_key)
```

**Impact:** Saves ~50-100ms on pages that don't use all imports (e.g., disease_catalog.py doesn't need ClinVarClient).

### Optimization 15: CSS Minification

The 973-line CSS in `theme.py` contains extensive whitespace, comments, and could be minified. Current estimated size: ~20KB of CSS text.

Options:
1. **Minify at build time:** Use `cssmin` or `rcssmin` to strip whitespace/comments. Reduces to ~12KB.
2. **Serve as static file:** Instead of injecting via `st.markdown()`, serve from `.streamlit/static/` directory.

```python
import rcssmin

_GLOBAL_CSS_MINIFIED = None

def inject_global_css():
    global _GLOBAL_CSS_MINIFIED
    if _GLOBAL_CSS_MINIFIED is None:
        _GLOBAL_CSS_MINIFIED = f"<style>{rcssmin.cssmin(_GLOBAL_CSS_RAW)}</style>"
    st.markdown(_GLOBAL_CSS_MINIFIED, unsafe_allow_html=True)
```

**Impact:** ~30% smaller CSS string, marginal rendering improvement (~5-10ms).

---

## 10. CDN & Asset Optimization

### Current External Resource Loading

From `theme.py` line 97:
```css
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Lexend:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
```

**Problem:** `@import` inside `<style>` blocks is **render-blocking**. The browser must download the Google Fonts CSS before rendering any styled content. This adds **100-500ms** of FOUT (Flash of Unstyled Text) depending on connection speed.

**Also:** Loading 3 font families (Sora 6 weights + Lexend 5 weights + JetBrains Mono 3 weights) = **14 font weight files**, potentially 500KB+ of font data.

### Optimization 16: Preload Fonts with `<link>` Tags

Replace `@import` with preloaded `<link>` tags:

```python
_FONT_PRELOAD = """
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Lexend:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap">
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Lexend:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
"""
```

**Also trim font weights:**
- Sora: Remove 300, 500 (only using 400, 600, 700, 800) -- saves ~100KB
- Lexend: Remove 300, 700 (only using 400, 500, 600) -- saves ~50KB
- JetBrains Mono: Remove 500, 600 (only using 400 for code) -- saves ~50KB

**Impact:** ~200ms faster initial render + ~200KB less font data transferred.

### Optimization 17: Reduce Animation Count

The CSS contains **17 named keyframe animations**. Many are used on elements that are off-screen or in collapsed expanders:

| Animation | Used On | Can Defer? |
|-----------|---------|------------|
| `helixFloat` | DNA dots, navbar, hero | No (visible above fold) |
| `gradientShift` | Metric bars, hero, headers | No |
| `biolumPulse` | Hero section, login card | No |
| `fadeSlideUp` | Block container, cards | No |
| `shimmer` | Badge hover | Yes -- only on interaction |
| `borderGlow` | Unused? | **YES -- remove** |
| `countUp` | Metric cards | Yes -- intersection observer |
| `cardReveal` | Disease cards | Yes -- intersection observer |
| `glowPulse` | Insight cards | Yes -- only when visible |
| `subtleScan` | Hero background | Low priority |
| `glassFadeIn` | Login card | Yes -- only on auth page |
| `breathe` | **Unused** | **Remove** |
| `dnaStrandSpin` | **Unused** | **Remove** |
| `borderRainbow` | Card hover | Yes -- only on interaction |
| `noiseShift` | Background noise | Yes -- degrade gracefully |
| `pulseGlow` | **Unused** | **Remove** |

**3 animations are unused** (`breathe`, `dnaStrandSpin`, `pulseGlow`). Removing them saves ~200 bytes of CSS and eliminates unnecessary browser compositor work.

**Impact:** Removing unused animations + using `prefers-reduced-motion` media query for accessibility:

```css
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}
```

---

## 11. Async & Parallelization Opportunities

### Current: Everything is Sequential

The analysis pipeline in `analysis.py` runs sequentially:
1. Parse Parent A -- waits for completion
2. Parse Parent B -- waits for completion
3. Run carrier analysis -- waits for completion
4. Run trait analysis -- waits for completion

### Optimization 18: Parallel File Parsing

Parent A and Parent B files are completely independent. They can be parsed in parallel:

```python
import concurrent.futures

def parse_both_parents(file_a, file_b):
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        future_a = executor.submit(parse_genetic_file, file_a)
        future_b = executor.submit(parse_genetic_file, file_b)
        snps_a, fmt_a = future_a.result()
        snps_b, fmt_b = future_b.result()
    return snps_a, fmt_a, snps_b, fmt_b
```

**Impact:** Reduces parsing time by ~40-50% (limited by GIL for CPU-bound work, but I/O benefits from threading). For two 23andMe files: ~500ms -> ~300ms.

**Note:** Streamlit's execution model (top-to-bottom rerun on every interaction) means files are parsed per-upload, not per-analysis-run. The current code caches parsed results in session state, which is correct. Parallel parsing would benefit the initial upload.

### Optimization 19: Carrier + Trait Analysis in Parallel

After parsing, carrier analysis and trait analysis are independent:

```python
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
    carrier_future = executor.submit(
        analyze_carrier_risk, snps_a, snps_b, panel, tier=tier
    )
    trait_future = executor.submit(
        run_trait_analysis, snps_a, snps_b, TRAIT_DB_PATH
    )
    carrier_results = carrier_future.result()
    trait_results = trait_future.result()
```

**Impact:** Saves ~30-50ms (trait analysis is fast, so overlap is modest).

### Optimization 20: Batch ClinVar Queries

Currently, each "Learn More" button creates a new `ClinVarClient` and makes one HTTP request. For users clicking multiple buttons, this is N sequential HTTP calls.

**Fix:** Pre-fetch ClinVar data for all high-risk variants at analysis time:

```python
@st.cache_data(ttl=3600)  # cache for 1 hour
def batch_clinvar_lookup(rsids: list[str], api_key: str = "") -> dict:
    """Batch lookup ClinVar data for multiple rsIDs."""
    client = ClinVarClient(api_key=api_key)
    results = {}
    for rsid in rsids:
        try:
            results[rsid] = client.query_variant(rsid)
        except Exception:
            results[rsid] = None
    return results
```

**Impact:** Eliminates per-click latency. ClinVar data ready instantly when user clicks "Learn More".

---

## 12. Profiling Toolkit Recommendations

### Recommended Setup

```python
# requirements-dev.txt additions
line-profiler>=4.0     # Line-by-line timing
memory-profiler>=0.61  # Memory usage tracking
py-spy>=0.3            # Sampling profiler (no code changes needed)
pyinstrument>=4.6      # Call tree profiler
snakeviz>=2.2          # cProfile visualizer
```

### Quick Profiling Scripts

**1. Profile the full analysis pipeline:**

```python
# scripts/profile_analysis.py
import cProfile
import pstats
from Source.parser import parse_genetic_file
from Source.carrier_analysis import analyze_carrier_risk

def profile_analysis():
    # Use sample files
    snps_a, _ = parse_genetic_file("tests/data/sample_23andme.txt")
    snps_b, _ = parse_genetic_file("tests/data/sample_ancestry.txt")

    profiler = cProfile.Profile()
    profiler.enable()

    results = analyze_carrier_risk(snps_a, snps_b, "data/carrier_panel.json")

    profiler.disable()
    stats = pstats.Stats(profiler)
    stats.sort_stats('cumulative')
    stats.print_stats(20)

if __name__ == "__main__":
    profile_analysis()
```

**2. Memory profiling:**

```python
# scripts/profile_memory.py
from memory_profiler import profile

@profile
def parse_and_analyze():
    from Source.parser import parse_genetic_file
    snps_a, _ = parse_genetic_file("tests/data/sample_23andme.txt")
    snps_b, _ = parse_genetic_file("tests/data/sample_ancestry.txt")

    from Source.carrier_analysis import analyze_carrier_risk
    results = analyze_carrier_risk(snps_a, snps_b, "data/carrier_panel.json")
    return results

parse_and_analyze()
```

**3. Streamlit-specific profiling (using py-spy):**

```bash
# Attach to running Streamlit process
py-spy record -o profile.svg -- streamlit run app.py
```

**4. Line-by-line timing for parser:**

```python
# Add @profile decorator to critical functions
from line_profiler import profile

@profile
def _parse_23andme_from_content(content: str) -> dict[str, str]:
    # ... existing code ...
```

### Monitoring in Production

Add timing instrumentation to key functions:

```python
import time
import streamlit as st

def timed_analysis(func):
    """Decorator to track analysis timing in session state."""
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed = time.perf_counter() - start
        timings = st.session_state.setdefault("_perf_timings", {})
        timings[func.__name__] = elapsed
        return result
    return wrapper
```

---

## 13. Benchmark Targets

### Industry Comparisons

| Tool | Upload + Parse | Analysis | Total UX Time |
|------|---------------|----------|---------------|
| 23andMe (in-app analysis) | N/A (internal) | <2s | <2s |
| Promethease | ~10s | ~30s | ~40s (700K SNPs, 100K+ publications) |
| Nebula Genomics | ~5s | ~10s | ~15s |
| **Mergenix (current, 23andMe)** | **~500ms** | **~400ms** | **~900ms** |
| **Mergenix (current, VCF)** | **~5-10s** | **~400ms** | **~5-10s** |
| **Mergenix (target, 23andMe)** | **~300ms** | **~200ms** | **~500ms** |
| **Mergenix (target, VCF)** | **~2s** | **~200ms** | **~2.2s** |

### Target KPIs

| Metric | Current | Target | Method |
|--------|---------|--------|--------|
| Cold start (first page load) | ~1.2s | <800ms | Lazy imports, font preload |
| Disease catalog load | ~200ms | <100ms | Cached stats, precomputed freqs |
| 23andMe parse time | ~500ms | ~300ms | Streaming parser |
| VCF parse time (1GB) | ~10s+ | ~2s | Streaming + mmap |
| Carrier analysis | ~300ms | ~150ms | Cached panel, avoid re-load |
| Total analysis (23andMe) | ~900ms | ~500ms | All optimizations |
| Memory per session | ~126MB | ~80MB | Compact storage |
| CSS/font render | ~300ms | ~100ms | Preload, minify, trim weights |

---

## 14. Prioritized Optimization Roadmap

### Phase 1: Quick Wins (1-2 hours, ~500ms savings)

| # | Optimization | Impact | Effort |
|---|-------------|--------|--------|
| 1 | Add `@st.cache_data` to `load_carrier_panel()`, `load_trait_database()`, `_count_panel()`, `_count_traits()`, `load_traits_corrected()` | ~400ms | 15 min |
| 2 | Eliminate redundant `json.load()` in `analysis.py` (lines 353, 549) by reusing cached data | ~150ms | 15 min |
| 3 | Pre-compute catalog stats with `compute_catalog_stats()` | ~30ms/rerun | 20 min |
| 4 | Remove 3 unused CSS animations (`breathe`, `dnaStrandSpin`, `pulseGlow`) | Cleaner code | 5 min |

### Phase 2: Medium Effort (4-8 hours, ~300ms savings)

| # | Optimization | Impact | Effort |
|---|-------------|--------|--------|
| 5 | Centralized `data_loader.py` module with all cached loaders | Architecture | 1 hour |
| 6 | Replace `@import` with `<link rel="preload">` for Google Fonts | ~200ms render | 30 min |
| 7 | Trim font weights (14 -> 8) | ~200KB transfer | 30 min |
| 8 | Single-pass filter function for disease catalog | ~50ms/rerun | 1 hour |
| 9 | Pre-compute `parse_carrier_freq` at load time | ~50ms/rerun | 30 min |
| 10 | Switch to `orjson` for JSON parsing | ~100ms cold start | 30 min |

### Phase 3: Significant Refactoring (1-2 days, enables large VCF support)

| # | Optimization | Impact | Effort |
|---|-------------|--------|--------|
| 11 | Streaming line-by-line parser for all formats | ~40% memory, VCF support | 4 hours |
| 12 | VCF-specific mmap parser | Multi-GB VCF support | 4 hours |
| 13 | Parallel file parsing (ThreadPoolExecutor) | ~200ms on dual upload | 2 hours |
| 14 | Batch ClinVar pre-fetch for high-risk results | Instant "Learn More" | 2 hours |
| 15 | `prefers-reduced-motion` CSS support | Accessibility | 30 min |

### Phase 4: Advanced (Future, if needed)

| # | Optimization | Impact | Effort |
|---|-------------|--------|--------|
| 16 | Compact SNP storage (array.array) | ~45MB memory savings | 4 hours |
| 17 | MessagePack/Parquet for carrier_panel | ~70% smaller, ~3x faster load | 4 hours |
| 18 | WebAssembly parser (Rust/wasm-pack) | 10x parse speed | 2-3 days |
| 19 | Server-side pagination for disease catalog | Handles 100K+ diseases | 1 day |
| 20 | Service worker for offline font caching | Instant repeat loads | 4 hours |

---

## Appendix A: File-by-File Optimization Checklist

### Source/parser.py
- [ ] Implement streaming parsers for all 4 formats
- [ ] Add mmap support for on-disk VCF files
- [ ] Unify format detection + validation into single pass
- [ ] Consider `cyvcf2` library for production VCF parsing

### Source/carrier_analysis.py
- [ ] Add `@st.cache_data` to `load_carrier_panel()`
- [ ] Accept pre-loaded panel instead of file path
- [ ] Pre-build rsID set for intersection optimization

### Source/trait_prediction.py
- [ ] Add `@st.cache_data` to `load_trait_database()`
- [ ] Accept pre-loaded trait data instead of file path

### pages/analysis.py
- [ ] Cache `_count_panel()` and `_count_traits()`
- [ ] Cache `load_traits_corrected()`
- [ ] Remove redundant `json.load()` calls (lines 353, 549)
- [ ] Cache `ClinVarClient` as resource
- [ ] Consider batch ClinVar pre-fetch

### pages/disease_catalog.py
- [ ] Pre-compute and cache catalog statistics
- [ ] Pre-compute carrier frequencies
- [ ] Single-pass filter function
- [ ] Avoid `.copy()` on disease list

### Source/ui/theme.py
- [ ] Replace `@import` with `<link>` preload
- [ ] Trim unused font weights
- [ ] Remove unused keyframe animations
- [ ] Add `prefers-reduced-motion` support
- [ ] Consider CSS minification

### data/carrier_panel.json
- [ ] Consider `orjson` for faster parsing
- [ ] Consider binary format (MessagePack) for cold start
- [ ] Pre-compute derived fields (parsed frequency) at build time

---

## Appendix B: Testing Performance Changes

When implementing any optimization, measure before and after:

```python
import time

# Before
start = time.perf_counter()
result = original_function()
baseline = time.perf_counter() - start

# After
start = time.perf_counter()
result = optimized_function()
optimized = time.perf_counter() - start

improvement_pct = (1 - optimized / baseline) * 100
print(f"Improvement: {improvement_pct:.1f}% ({baseline*1000:.0f}ms -> {optimized*1000:.0f}ms)")
```

Always test with:
1. **Small file:** `tests/data/sample_23andme.txt` (~1K SNPs)
2. **Realistic file:** A real 23andMe export (~700K SNPs)
3. **Large VCF:** A whole-genome VCF (~5M variants)
4. **Cold start:** Kill and restart Streamlit between tests
5. **Warm cache:** Measure second load after cache is populated
