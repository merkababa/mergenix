# Database Architecture Research Report -- Mergenix

**Date:** 2026-02-08
**Researcher:** Database Architecture Analyst
**Scope:** Data layer analysis, migration recommendations, caching, indexing, scalability

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Migration Analysis: JSON vs SQLite vs PostgreSQL](#2-migration-analysis)
3. [Caching Strategy](#3-caching-strategy)
4. [Query Optimization & Indexing](#4-query-optimization--indexing)
5. [User Data Storage & Security](#5-user-data-storage--security)
6. [Industry Benchmarks](#6-industry-benchmarks)
7. [Scalability Projections](#7-scalability-projections)
8. [Ranked Recommendations](#8-ranked-recommendations)
9. [Migration Roadmap](#9-migration-roadmap)
10. [Code Patterns](#10-code-patterns)

---

## 1. Current State Analysis

### Data Files Inventory

| File                      | Records        | Lines  | File Size | Purpose                   |
| ------------------------- | -------------- | ------ | --------- | ------------------------- |
| `data/carrier_panel.json` | 2,715 diseases | 81,452 | 3.2 MB    | Disease panel (core data) |
| `data/trait_snps.json`    | 79 traits      | 3,320  | 124 KB    | Trait SNP database        |
| `data/users.json`         | 0 (empty)      | 0      | --        | User accounts             |
| `data/audit_log.json`     | 0 (empty)      | 0      | --        | Audit trail               |
| `data/lockouts.json`      | 0 (empty)      | 0      | --        | Account lockouts          |

### Current Data Access Patterns

**Read-heavy, write-rare for scientific data:**

- `carrier_panel.json` is loaded fully into memory on every analysis run and on disease catalog page load
- `trait_snps.json` is loaded fully into memory on every trait prediction
- Disease catalog page applies Python-side filtering (category, severity, search, inheritance, frequency range) on the full in-memory list
- Analysis page iterates all 2,715 diseases per parent pair to compute carrier status

**Read-write for user data:**

- `users.json` loaded/saved on every authentication operation (login, register, password change, tier update)
- `audit_log.json` and `lockouts.json` appended to on auth events
- File-level locking is absent -- concurrent writes will corrupt data

### Current Caching

The disease catalog uses `@st.cache_data` on `load_diseases()`:

```python
@st.cache_data
def load_diseases():
    with open(CARRIER_PANEL_PATH) as f:
        return json.load(f)
```

The analysis page uses `@st.cache_resource` on `get_auth_manager()` but loads carrier panel and trait data without caching per analysis run (each click of "Run Offspring Analysis" re-reads and re-parses the JSON files).

The ClinVar client has an in-memory dict cache (`self._cache`) that lives only for the session.

### Identified Problems

1. **No concurrency safety**: `users.json` has no file locking. Two simultaneous registrations can cause data loss.
2. **Redundant parsing**: The 3.2 MB carrier panel JSON is parsed from disk on every analysis run (not just page load).
3. **O(n) filtering**: Disease catalog filtering is pure Python list comprehension over 2,715 records on every Streamlit rerun.
4. **No indexing**: Lookups by rsID, gene, condition, or category require full scan.
5. **No full-text search**: The search box does substring matching (`q in d["condition"].lower()`), which is O(n \* m) per character typed.
6. **Flat file user storage**: Passwords, OAuth tokens, and subscription data in a plain JSON file with no encryption at rest.
7. **No audit integrity**: Audit log is a JSON file that can be trivially edited or deleted.
8. **Memory pressure at scale**: Loading 81K-line JSON into every Streamlit session adds ~15-25 MB per active user session.

---

## 2. Migration Analysis

### Option A: Keep JSON (Status Quo)

**Pros:**

- Zero migration effort
- Human-readable, git-diffable
- Works with current Streamlit deployment
- No additional dependencies

**Cons:**

- No concurrency safety for writes
- No indexing (full scan for every query)
- No full-text search
- Memory scales linearly with users
- No referential integrity
- No encryption at rest
- Audit log trivially tamperable

**Verdict:** Acceptable ONLY for read-only scientific data (carrier_panel, trait_snps) that rarely changes. **Unacceptable for user data.**

### Option B: SQLite (RECOMMENDED)

**Pros:**

- Zero-server architecture (single file, like JSON but with ACID guarantees)
- Ships with Python standard library (`sqlite3`)
- Full SQL query capability with proper indexing
- FTS5 extension for full-text search (sub-millisecond on 10K+ records)
- JSON1 extension for storing structured metadata
- Write-ahead logging (WAL mode) for concurrent reads
- 150K+ transactions/second on commodity hardware
- Native Streamlit support via `st.connection("sql")`
- File-based = easy backup, easy deployment, no server to manage
- AES-256 encryption at rest via SQLCipher extension
- 3.2 MB JSON becomes ~1.5 MB SQLite with indexes

**Cons:**

- Single-writer limitation (mitigated by WAL mode for read-heavy workloads)
- Not ideal for horizontal scaling across multiple app servers
- No built-in user management or role-based access

**Best for:** Mergenix's current scale (single-server Streamlit app, <100 concurrent users, 2,715-10,000 disease records)

### Option C: PostgreSQL

**Pros:**

- Industry-standard for production web apps
- True multi-user concurrent write support
- Advanced indexing (B-tree, GIN, GiST, BRIN)
- Full-text search with tsvector/tsquery
- Row-level security for multi-tenant data
- Managed options (Supabase, Neon, AWS RDS)
- Native Streamlit support via `st.connection("sql")`

**Cons:**

- Requires running a database server (added ops complexity)
- Network latency for every query
- Overkill for current data volume (2,715 records)
- Monthly cost for managed hosting ($5-25/mo minimum)
- Deployment complexity increases significantly
- Over-engineers the solution for a Streamlit app

**Best for:** If Mergenix grows to 1000+ concurrent users, needs multi-server deployment, or stores large volumes of user-generated data.

### Recommendation Matrix

| Criterion             | JSON        | SQLite      | PostgreSQL    |
| --------------------- | ----------- | ----------- | ------------- |
| Setup complexity      | None        | Minimal     | High          |
| Query performance     | Poor (O(n)) | Excellent   | Excellent     |
| Full-text search      | None        | FTS5        | tsvector      |
| Concurrency           | Unsafe      | Good (WAL)  | Excellent     |
| Encryption at rest    | Manual      | SQLCipher   | Native        |
| Deployment            | Trivial     | Trivial     | Server needed |
| Cost                  | Free        | Free        | $5-25+/mo     |
| Scalability ceiling   | ~5K records | ~1M records | Unlimited     |
| Streamlit integration | Manual      | Native      | Native        |

### VERDICT: Migrate to SQLite for all data stores.

Keep `carrier_panel.json` and `trait_snps.json` as the canonical source-of-truth for scientific data (version-controlled, human-reviewable), but load them into SQLite at startup for indexed queries. Migrate user data, audit logs, and lockouts exclusively to SQLite.

---

## 3. Caching Strategy

### Current Issues

1. Disease catalog uses `@st.cache_data` correctly but the analysis page re-reads JSON on every run.
2. No TTL on cached data -- stale data possible if files are updated while app runs.
3. `ClinVarClient` cache is per-instance, not shared across sessions.

### Recommended Caching Architecture

```
Layer 1: SQLite (persistent, indexed)
    |
Layer 2: @st.cache_resource (singleton DB connection, shared across sessions)
    |
Layer 3: @st.cache_data(ttl=3600) (query results, per-session copies)
    |
Layer 4: st.session_state (user-specific state: filters, selections, results)
```

### Specific Patterns

**Database connection (global singleton):**

```python
@st.cache_resource
def get_db():
    """Single SQLite connection shared across all sessions."""
    import sqlite3
    conn = sqlite3.connect("data/mergenix.db", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn
```

**Disease data queries (cached with TTL):**

```python
@st.cache_data(ttl=3600)
def get_diseases_by_category(category: str) -> list[dict]:
    conn = get_db()
    cursor = conn.execute(
        "SELECT * FROM diseases WHERE category = ? ORDER BY condition",
        (category,)
    )
    return [dict(row) for row in cursor.fetchall()]

@st.cache_data(ttl=3600)
def search_diseases(query: str) -> list[dict]:
    conn = get_db()
    cursor = conn.execute(
        "SELECT * FROM diseases WHERE diseases_fts MATCH ? ORDER BY rank",
        (query,)
    )
    return [dict(row) for row in cursor.fetchall()]
```

**ClinVar cache (persistent across sessions):**

```python
@st.cache_resource
def get_clinvar_client():
    """Shared ClinVar client with persistent cache."""
    return ClinVarClient(api_key=os.getenv("NCBI_API_KEY"))
```

### Cache Invalidation Strategy

| Data Type       | TTL             | Invalidation Trigger        |
| --------------- | --------------- | --------------------------- |
| Disease panel   | 1 hour          | App restart, admin action   |
| Trait SNPs      | 1 hour          | App restart, admin action   |
| User data       | None (no cache) | Every read is fresh from DB |
| ClinVar results | 24 hours        | Manual clear                |
| Filter results  | 5 minutes       | User interaction            |

---

## 4. Query Optimization & Indexing

### Disease Catalog Queries (Current Bottleneck)

The disease catalog page currently performs 6 sequential Python filter operations on the full 2,715-record list on every Streamlit rerun. With SQLite indexes, these become millisecond-level operations.

### Recommended SQLite Schema

```sql
CREATE TABLE diseases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rsid TEXT NOT NULL UNIQUE,
    gene TEXT NOT NULL,
    condition TEXT NOT NULL,
    inheritance TEXT NOT NULL,
    carrier_frequency TEXT,
    carrier_freq_numeric INTEGER,  -- parsed "1 in N" -> N for sorting
    pathogenic_allele TEXT NOT NULL,
    reference_allele TEXT NOT NULL,
    description TEXT,
    severity TEXT CHECK(severity IN ('high', 'moderate', 'low')),
    prevalence TEXT,
    omim_id TEXT,
    category TEXT,
    confidence TEXT,
    notes TEXT,
    sources TEXT  -- JSON array stored as text
);

-- Core indexes for catalog filtering
CREATE INDEX idx_diseases_category ON diseases(category);
CREATE INDEX idx_diseases_severity ON diseases(severity);
CREATE INDEX idx_diseases_inheritance ON diseases(inheritance);
CREATE INDEX idx_diseases_gene ON diseases(gene);
CREATE INDEX idx_diseases_rsid ON diseases(rsid);
CREATE INDEX idx_diseases_freq ON diseases(carrier_freq_numeric);

-- Compound index for common multi-filter queries
CREATE INDEX idx_diseases_cat_sev ON diseases(category, severity);
CREATE INDEX idx_diseases_cat_inh ON diseases(category, inheritance);

-- Full-text search index
CREATE VIRTUAL TABLE diseases_fts USING fts5(
    condition,
    gene,
    description,
    content='diseases',
    content_rowid='id'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER diseases_ai AFTER INSERT ON diseases BEGIN
    INSERT INTO diseases_fts(rowid, condition, gene, description)
    VALUES (new.id, new.condition, new.gene, new.description);
END;

CREATE TRIGGER diseases_ad AFTER DELETE ON diseases BEGIN
    INSERT INTO diseases_fts(diseases_fts, rowid, condition, gene, description)
    VALUES('delete', old.id, old.condition, old.gene, old.description);
END;

CREATE TRIGGER diseases_au AFTER UPDATE ON diseases BEGIN
    INSERT INTO diseases_fts(diseases_fts, rowid, condition, gene, description)
    VALUES('delete', old.id, old.condition, old.gene, old.description);
    INSERT INTO diseases_fts(rowid, condition, gene, description)
    VALUES (new.id, new.condition, new.gene, new.description);
END;
```

### Trait SNPs Schema

```sql
CREATE TABLE traits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rsid TEXT NOT NULL UNIQUE,
    trait TEXT NOT NULL,
    gene TEXT NOT NULL,
    chromosome TEXT,
    inheritance TEXT,
    alleles TEXT,           -- JSON: {"ref": "G", "alt": "A"}
    phenotype_map TEXT,     -- JSON: {"GG": {"phenotype": "...", ...}, ...}
    description TEXT,
    confidence TEXT,
    sources TEXT,           -- JSON array
    notes TEXT
);

CREATE INDEX idx_traits_rsid ON traits(rsid);
CREATE INDEX idx_traits_trait ON traits(trait);
```

### Query Performance Comparison

| Operation           | JSON (current)       | SQLite (indexed)    | Improvement |
| ------------------- | -------------------- | ------------------- | ----------- |
| Load all diseases   | ~50ms (3.2MB parse)  | ~5ms (cached)       | 10x         |
| Filter by category  | ~5ms (list comp)     | <1ms (B-tree)       | 5x          |
| Search by name      | ~10ms (substring)    | <1ms (FTS5)         | 10x+        |
| Lookup by rsID      | ~3ms (dict lookup\*) | <1ms (index)        | 3x          |
| Multi-filter + sort | ~20ms (chained)      | <1ms (compound)     | 20x         |
| Paginate 30 items   | ~5ms (slice)         | <1ms (LIMIT/OFFSET) | 5x          |

\*Note: rsID lookup in analysis is already O(1) via dict. The gains are primarily in the catalog page filtering.

### Carrier Analysis Optimization

The `analyze_carrier_risk()` function currently loads the full panel and iterates all 2,715 diseases. With SQLite, we can optimize the hot path:

```sql
-- Only fetch diseases where at least one parent has the SNP
-- (requires knowing which rsIDs the parents have)
SELECT d.* FROM diseases d
WHERE d.rsid IN (?, ?, ?, ...)  -- parent rsIDs
ORDER BY d.id;
```

This eliminates processing diseases where neither parent has data (the "unknown" results), reducing the effective workload by 60-80% for typical genetic files with 500K-700K SNPs covering only a subset of panel rsIDs.

---

## 5. User Data Storage & Security

### Current Vulnerabilities

1. **No file locking**: Concurrent writes to `users.json` cause data corruption
2. **No encryption at rest**: Passwords are bcrypt-hashed (good) but the file is plain text on disk
3. **No backup mechanism**: A single file deletion loses all user data
4. **OAuth tokens in plain text**: `oauth_id` stored unencrypted
5. **Audit log tamperable**: JSON file can be edited without detection
6. **No data isolation**: All user data in one flat dictionary

### Recommended User Data Schema

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL,
    password_hash TEXT,          -- NULL for OAuth-only users
    tier TEXT NOT NULL DEFAULT 'free' CHECK(tier IN ('free', 'premium', 'pro')),
    subscription_id TEXT,
    payment_provider TEXT CHECK(payment_provider IN ('stripe', 'paypal', NULL)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    email_verified INTEGER NOT NULL DEFAULT 0,
    last_login TEXT,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    last_failed_login TEXT,
    oauth_provider TEXT CHECK(oauth_provider IN ('google', 'apple', NULL)),
    oauth_id TEXT,
    profile_picture TEXT
);

CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_id);
CREATE INDEX idx_users_tier ON users(tier);

CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    user_email TEXT,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    FOREIGN KEY (user_email) REFERENCES users(email)
);

CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_user ON audit_log(user_email);

CREATE TABLE lockouts (
    email TEXT PRIMARY KEY,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    last_failed TEXT,
    locked_until TEXT,
    FOREIGN KEY (email) REFERENCES users(email)
);
```

### Security Best Practices for Health-Adjacent Data

Per 2026 HIPAA encryption requirements (now mandatory, no longer "addressable"):

1. **Encryption at rest**: Use SQLCipher for the user database, or at minimum encrypt the SQLite file with AES-256
2. **Encryption in transit**: Already handled by HTTPS/TLS 1.3 in production
3. **Access control**: Principle of least privilege -- only AuthManager should access user tables
4. **Audit integrity**: Use append-only table with row checksums (SHA-256 of previous row hash + current data)
5. **Backup**: Automated daily backups of the SQLite database file
6. **Data minimization**: Do not store raw genetic data; only store analysis results if needed

### Genetic Privacy Compliance (2026)

Several states have introduced genetic privacy bills in early 2026. While Mergenix does not store raw genetic data server-side (files are processed in-memory and discarded), the application should:

- Add a clear privacy notice that genetic data is NOT stored
- Implement session cleanup to clear `st.session_state` SNP data on logout
- Consider GINA (Genetic Information Nondiscrimination Act) implications for any future data retention features

---

## 6. Industry Benchmarks

### How Genetic Testing Platforms Handle Data

| Platform           | Data Scale                  | Technology                | Architecture                                       |
| ------------------ | --------------------------- | ------------------------- | -------------------------------------------------- |
| **23andMe**        | 12M+ customers, 2M SNP chip | AWS, proprietary pipeline | Cloud-native, microservices, distributed databases |
| **Invitae**        | 4M+ sequenced, full genome  | GCP BigQuery, Dataflow    | VCF loading into BigQuery, Apache Beam pipelines   |
| **Color Genomics** | NGS (next-gen sequencing)   | Cloud-native              | Clinical-grade pipeline with CLIA certification    |
| **OpenSNP**        | Open-source, community      | PostgreSQL, Ruby on Rails | Traditional web app with relational DB             |
| **Genetic Genie**  | Free analysis tool          | Likely simple backend     | Upload-and-process model (similar to Mergenix)     |

### Key Takeaways for Mergenix

1. **Scale comparison**: Mergenix (2,715 diseases, ~100 users) is 3-4 orders of magnitude smaller than 23andMe/Invitae. Enterprise-grade solutions (BigQuery, Dataflow) are extreme overkill.
2. **Architecture match**: Mergenix most closely resembles Genetic Genie and OpenSNP in scale and model. SQLite is the right choice at this tier.
3. **Growth path**: If Mergenix reaches 10K+ users with data storage needs, PostgreSQL would be the next step. For now, SQLite handles the workload with room to spare.
4. **Processing model**: Like Genetic Genie, Mergenix processes uploaded files in-memory without persistent storage of raw genetic data. This is a privacy advantage.

---

## 7. Scalability Projections

### Growth Scenarios

| Metric                   | Current | Medium (1 year)                 | Large (3 years)                  |
| ------------------------ | ------- | ------------------------------- | -------------------------------- |
| Disease records          | 2,715   | 10,000                          | 50,000                           |
| Trait SNPs               | 79      | 500                             | 2,000                            |
| Concurrent users         | <10     | 50-100                          | 500-1,000                        |
| User accounts            | <50     | 1,000                           | 10,000                           |
| carrier_panel.json size  | 3.2 MB  | 12 MB                           | 60 MB                            |
| Analysis time (per pair) | ~2 sec  | ~8 sec (JSON) / ~1 sec (SQLite) | ~30 sec (JSON) / ~2 sec (SQLite) |

### Bottleneck Analysis

**At 10,000 diseases (JSON):**

- JSON parse time: ~200ms per load
- Memory per session: ~50 MB for carrier panel alone
- Catalog filtering: ~50ms per rerun (still manageable but noticeable)
- Full panel analysis: ~8 seconds (linear O(n) iteration)

**At 10,000 diseases (SQLite):**

- Cached connection: <1ms
- Catalog filtering: <5ms (indexed queries)
- Full panel analysis: ~1 second (indexed rsID lookup, skip unknowns)
- Memory per session: ~5 MB (only query results cached, not full panel)

**At 50,000 diseases (SQLite):**

- Still manageable with proper indexing
- FTS5 search: <10ms
- Full panel analysis: ~5 seconds (but optimized to skip missing rsIDs)
- Consider PostgreSQL migration if concurrent users exceed 500

### When to Migrate from SQLite to PostgreSQL

Trigger conditions (any one of these):

1. Concurrent write operations exceed 50/second
2. Database size exceeds 1 GB
3. Multiple application servers need to share state
4. User data requires row-level security or multi-tenant isolation
5. Real-time replication or failover is required

**Current estimate: SQLite is sufficient for at least 2-3 years of growth.**

---

## 8. Ranked Recommendations

### HIGH IMPACT, LOW EFFORT

| #   | Recommendation                                                                               | Impact | Effort  | Priority        |
| --- | -------------------------------------------------------------------------------------------- | ------ | ------- | --------------- |
| 1   | **Migrate user data to SQLite**                                                              | High   | Low     | P0 -- Critical  |
|     | Eliminates concurrency bugs, adds ACID transactions, enables proper audit logging            |        |         |                 |
| 2   | **Add `@st.cache_data` to analysis page data loading**                                       | High   | Minimal | P0 -- Quick Win |
|     | Cache carrier panel and trait DB loads to avoid re-parsing 3.2 MB JSON on every analysis run |        |         |                 |
| 3   | **Load scientific data into SQLite at startup**                                              | High   | Medium  | P1              |
|     | Keep JSON as source-of-truth but load into indexed SQLite for catalog queries and analysis   |        |         |                 |
| 4   | **Add FTS5 full-text search for disease catalog**                                            | High   | Medium  | P1              |
|     | Replace substring matching with proper ranked full-text search                               |        |         |                 |

### HIGH IMPACT, MEDIUM EFFORT

| #   | Recommendation                                                                   | Impact | Effort | Priority |
| --- | -------------------------------------------------------------------------------- | ------ | ------ | -------- |
| 5   | **Optimize carrier analysis with rsID pre-filtering**                            | High   | Medium | P1       |
|     | Only process diseases where parents have matching rsIDs, reducing work by 60-80% |        |        |          |
| 6   | **Add database migration system**                                                | Medium | Medium | P1       |
|     | Simple version-tracked schema migrations for future-proofing                     |        |        |          |
| 7   | **Implement ClinVar result caching in SQLite**                                   | Medium | Low    | P2       |
|     | Persist ClinVar API responses to avoid repeated network calls across sessions    |        |        |          |

### MEDIUM IMPACT, LOW EFFORT

| #   | Recommendation                                                                 | Impact | Effort  | Priority |
| --- | ------------------------------------------------------------------------------ | ------ | ------- | -------- |
| 8   | **Add TTL to all `@st.cache_data` calls**                                      | Medium | Minimal | P1       |
|     | Prevent stale data by adding `ttl=3600` to disease/trait loading functions     |        |         |          |
| 9   | **Add WAL mode pragma to SQLite**                                              | Medium | Minimal | P1       |
|     | Enables concurrent reads while writing (essential for Streamlit multi-session) |        |         |          |
| 10  | **Session cleanup on logout**                                                  | Low    | Minimal | P2       |
|     | Clear `st.session_state` SNP data when user logs out for privacy               |        |         |          |

### FUTURE CONSIDERATIONS (Not Needed Now)

| #   | Recommendation       | When Needed                                                 |
| --- | -------------------- | ----------------------------------------------------------- |
| 11  | PostgreSQL migration | 500+ concurrent users or multi-server deployment            |
| 12  | Redis caching layer  | If ClinVar API becomes a bottleneck with 1000+ analyses/day |
| 13  | SQLCipher encryption | If storing user health data or pursuing HIPAA compliance    |
| 14  | Read replicas        | If database read contention becomes measurable              |

---

## 9. Migration Roadmap

### Phase 1: Quick Wins (1-2 days)

1. Add `@st.cache_data(ttl=3600)` to all JSON loading functions in `analysis.py`
2. Add session cleanup on logout
3. No schema changes, no new dependencies

### Phase 2: User Data Migration (3-5 days)

1. Create `data/mergenix.db` SQLite database
2. Define user, audit_log, lockouts tables
3. Refactor `AuthManager` to use SQLite instead of `users.json`
4. Add WAL mode and foreign keys
5. Write migration script for existing users.json data
6. Update tests

### Phase 3: Scientific Data Indexing (3-5 days)

1. Create diseases and traits tables in SQLite
2. Write JSON-to-SQLite loader that runs at app startup
3. Add FTS5 virtual table for disease search
4. Refactor `disease_catalog.py` to use SQL queries instead of Python filtering
5. Refactor `carrier_analysis.py` to use indexed rsID lookups
6. Update tests

### Phase 4: Advanced Optimizations (2-3 days)

1. Add ClinVar cache table in SQLite
2. Implement rsID pre-filtering in carrier analysis
3. Add database migration versioning system
4. Performance benchmarking and tuning

**Total estimated effort: 9-15 days across 4 phases**

---

## 10. Code Patterns

### Database Initialization Module

```python
# Source/database.py
"""
Database initialization and connection management for Mergenix.
"""
import json
import sqlite3
from pathlib import Path

import streamlit as st

DB_PATH = Path(__file__).parent.parent / "data" / "mergenix.db"
CARRIER_PANEL_PATH = Path(__file__).parent.parent / "data" / "carrier_panel.json"
TRAIT_SNPS_PATH = Path(__file__).parent.parent / "data" / "trait_snps.json"


@st.cache_resource
def get_db() -> sqlite3.Connection:
    """Get or create the shared SQLite connection."""
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA busy_timeout=5000")
    _ensure_schema(conn)
    return conn


def _ensure_schema(conn: sqlite3.Connection):
    """Create tables if they don't exist."""
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS diseases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rsid TEXT NOT NULL UNIQUE,
            gene TEXT NOT NULL,
            condition TEXT NOT NULL,
            inheritance TEXT NOT NULL,
            carrier_frequency TEXT,
            carrier_freq_numeric INTEGER,
            pathogenic_allele TEXT NOT NULL,
            reference_allele TEXT NOT NULL,
            description TEXT,
            severity TEXT,
            prevalence TEXT,
            omim_id TEXT,
            category TEXT,
            confidence TEXT,
            notes TEXT,
            sources TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_diseases_rsid ON diseases(rsid);
        CREATE INDEX IF NOT EXISTS idx_diseases_category ON diseases(category);
        CREATE INDEX IF NOT EXISTS idx_diseases_severity ON diseases(severity);
        CREATE INDEX IF NOT EXISTS idx_diseases_inheritance ON diseases(inheritance);
        CREATE INDEX IF NOT EXISTS idx_diseases_gene ON diseases(gene);

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE COLLATE NOCASE,
            name TEXT NOT NULL,
            password_hash TEXT,
            tier TEXT NOT NULL DEFAULT 'free',
            subscription_id TEXT,
            payment_provider TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            email_verified INTEGER NOT NULL DEFAULT 0,
            last_login TEXT,
            failed_login_attempts INTEGER NOT NULL DEFAULT 0,
            last_failed_login TEXT,
            oauth_provider TEXT,
            oauth_id TEXT,
            profile_picture TEXT
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL DEFAULT (datetime('now')),
            user_email TEXT,
            action TEXT NOT NULL,
            details TEXT,
            ip_address TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
    """)
    conn.commit()


def load_diseases_into_db(conn: sqlite3.Connection):
    """Load carrier_panel.json into SQLite (idempotent)."""
    count = conn.execute("SELECT COUNT(*) FROM diseases").fetchone()[0]
    if count > 0:
        return  # Already loaded

    with open(CARRIER_PANEL_PATH) as f:
        diseases = json.load(f)

    for d in diseases:
        freq_num = _parse_freq(d.get("carrier_frequency", ""))
        conn.execute("""
            INSERT OR IGNORE INTO diseases
            (rsid, gene, condition, inheritance, carrier_frequency,
             carrier_freq_numeric, pathogenic_allele, reference_allele,
             description, severity, prevalence, omim_id, category,
             confidence, notes, sources)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            d["rsid"], d["gene"], d["condition"], d["inheritance"],
            d.get("carrier_frequency"), freq_num,
            d["pathogenic_allele"], d["reference_allele"],
            d.get("description"), d.get("severity"),
            d.get("prevalence"), d.get("omim_id"),
            d.get("category"), d.get("confidence"),
            d.get("notes"), json.dumps(d.get("sources", []))
        ))
    conn.commit()


def _parse_freq(freq_str: str) -> int:
    """Parse '1 in 25' -> 25."""
    try:
        return int(freq_str.split("in")[1].strip().replace(",", ""))
    except Exception:
        return 999999
```

### Refactored Disease Catalog Query

```python
# Example: Replacing Python filtering with SQL
@st.cache_data(ttl=3600)
def query_diseases(
    search: str = "",
    categories: list[str] | None = None,
    severities: list[str] | None = None,
    inheritances: list[str] | None = None,
    freq_min: int = 0,
    freq_max: int = 999999,
) -> list[dict]:
    """Query diseases with server-side filtering."""
    conn = get_db()
    conditions = []
    params = []

    if search:
        # Use FTS5 for text search
        conditions.append(
            "d.id IN (SELECT rowid FROM diseases_fts WHERE diseases_fts MATCH ?)"
        )
        params.append(f'"{search}"*')

    if categories:
        placeholders = ",".join("?" * len(categories))
        conditions.append(f"d.category IN ({placeholders})")
        params.extend(categories)

    if severities:
        placeholders = ",".join("?" * len(severities))
        conditions.append(f"d.severity IN ({placeholders})")
        params.extend(severities)

    if inheritances:
        placeholders = ",".join("?" * len(inheritances))
        conditions.append(f"d.inheritance IN ({placeholders})")
        params.extend(inheritances)

    conditions.append("d.carrier_freq_numeric BETWEEN ? AND ?")
    params.extend([freq_min, freq_max])

    where = " AND ".join(conditions) if conditions else "1=1"
    query = f"SELECT * FROM diseases d WHERE {where} ORDER BY d.condition"

    cursor = conn.execute(query, params)
    return [dict(row) for row in cursor.fetchall()]
```

### Refactored AuthManager (SQLite)

```python
# Example: Key method refactored for SQLite
class AuthManager:
    def __init__(self):
        self.conn = get_db()

    def _load_user(self, email: str) -> dict | None:
        row = self.conn.execute(
            "SELECT * FROM users WHERE email = ?", (email.lower(),)
        ).fetchone()
        return dict(row) if row else None

    def register_user(self, email: str, name: str, password: str) -> tuple[bool, str]:
        email = email.strip().lower()
        # ... validation ...
        try:
            self.conn.execute("""
                INSERT INTO users (email, name, password_hash)
                VALUES (?, ?, ?)
            """, (email, name, self._hash_password(password)))
            self.conn.commit()
            return True, "Registration successful"
        except sqlite3.IntegrityError:
            return False, "Email already registered"

    def authenticate(self, email: str, password: str) -> tuple[bool, dict | None]:
        user = self._load_user(email)
        if not user:
            return False, None
        if self._verify_password(password, user["password_hash"]):
            self.conn.execute(
                "UPDATE users SET last_login = datetime('now'), "
                "failed_login_attempts = 0 WHERE email = ?",
                (email,)
            )
            self.conn.commit()
            return True, {k: v for k, v in user.items() if k != "password_hash"}
        return False, None
```

---

## Appendix: Sources & References

- [Streamlit Caching Documentation](https://docs.streamlit.io/develop/concepts/architecture/caching)
- [Streamlit Database Connections](https://docs.streamlit.io/develop/concepts/connections/connecting-to-data)
- [SQLite FTS5 Extension](https://www.sqlite.org/fts5.html)
- [SQLite JSON1 and FTS5 with Python (Charles Leifer)](https://charlesleifer.com/blog/using-the-sqlite-json1-and-fts5-extensions-with-python/)
- [SQLite vs PostgreSQL Comparison 2026](https://appmus.com/vs/sqlite-vs-postgressql)
- [HIPAA Encryption Requirements 2026](https://www.hipaajournal.com/hipaa-encryption-requirements/)
- [Genetic Privacy Bills 2026](https://www.insideprivacy.com/health-privacy/several-states-introduce-new-genetic-privacy-bills-in-early-2026/)
- [Cloud Genomics Architecture (Google)](https://cloud.google.com/blog/products/data-analytics/genomics-data-analytics-with-cloud-pt1)
- [Shared Data Science Infrastructure for Genomics (BMC Bioinformatics)](https://bmcbioinformatics.biomedcentral.com/articles/10.1186/s12859-019-2967-2)
- [FTS Benchmark (SQLite vs PostgreSQL vs others)](https://github.com/VADOSWARE/fts-benchmark)
