"""
Tortit - Disease Catalog
Comprehensive genetic disease reference with interactive filtering,
statistics, and detailed condition profiles.
"""

import os
import json
import math
import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

# ---------------------------------------------------------------------------
# Page configuration
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="Tortit - Disease Catalog",
    page_icon="\U0001f9ec",
    layout="wide",
)

# Custom sidebar navigation
st.sidebar.page_link("app.py", label="Offspring Analysis", icon="🧬")
st.sidebar.page_link("pages/2_Disease_Catalog.py", label="Disease Catalog", icon="📋")

# ---------------------------------------------------------------------------
# Data paths
# ---------------------------------------------------------------------------
APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(APP_DIR, "data")
CARRIER_PANEL_PATH = os.path.join(DATA_DIR, "carrier_panel.json")


@st.cache_data
def load_diseases():
    with open(CARRIER_PANEL_PATH, "r") as f:
        return json.load(f)


def parse_carrier_freq(freq_str):
    """Parse '1 in X' to integer X. Returns 999999 on failure."""
    try:
        return int(freq_str.split("in")[1].strip().replace(",", ""))
    except Exception:
        return 999999


def format_inheritance(raw):
    """Convert 'autosomal_recessive' to 'Autosomal Recessive'."""
    mapping = {
        "autosomal_recessive": "Autosomal Recessive",
        "autosomal_dominant": "Autosomal Dominant",
        "X-linked": "X-Linked",
        "x-linked": "X-Linked",
    }
    return mapping.get(raw, raw.replace("_", " ").title())


def severity_indicator(sev):
    """Return colored emoji for severity."""
    return {"high": "\U0001f534 High", "moderate": "\U0001f7e1 Moderate", "low": "\U0001f7e2 Low"}.get(
        sev, sev
    )


# ---------------------------------------------------------------------------
# Full bioluminescent CSS (matching app.py + catalog additions)
# ---------------------------------------------------------------------------
st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&display=swap');

    :root {
        --bg-deep: #0a0e1a;
        --bg-surface: #111827;
        --bg-elevated: #1a2236;
        --accent-teal: #06d6a0;
        --accent-violet: #7c3aed;
        --accent-cyan: #22d3ee;
        --accent-amber: #f59e0b;
        --accent-rose: #ef4444;
        --text-primary: #e2e8f0;
        --text-muted: #94a3b8;
        --border-subtle: rgba(148, 163, 184, 0.12);
    }

    /* === Animations === */
    @keyframes helixFloat {
        0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.6; }
        50% { transform: translateY(-8px) rotate(180deg); opacity: 1; }
    }
    @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
    @keyframes pulseGlow {
        0%, 100% { box-shadow: 0 0 20px rgba(6, 214, 160, 0.1); }
        50% { box-shadow: 0 0 40px rgba(6, 214, 160, 0.25); }
    }
    @keyframes fadeSlideUp {
        from { opacity: 0; transform: translateY(16px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
    }
    @keyframes borderGlow {
        0%, 100% { border-color: rgba(6, 214, 160, 0.15); }
        50% { border-color: rgba(6, 214, 160, 0.4); }
    }
    @keyframes countUp {
        from { opacity: 0; transform: translateY(10px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes cardReveal {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes glowPulse {
        0%, 100% { box-shadow: 0 0 15px rgba(6,214,160,0.08), 0 4px 24px rgba(0,0,0,0.4); }
        50% { box-shadow: 0 0 25px rgba(6,214,160,0.18), 0 4px 24px rgba(0,0,0,0.4); }
    }
    @keyframes subtleScan {
        0% { background-position: 0% 0%; }
        100% { background-position: 0% 100%; }
    }

    /* === Global === */
    .block-container {
        padding-top: 1rem;
        max-width: 1200px;
        animation: fadeSlideUp 0.6s ease-out;
    }
    html, body, [data-testid="stAppViewContainer"], .main {
        font-family: 'DM Sans', sans-serif !important;
    }
    h1, h2, h3, h4, h5 {
        font-family: 'Outfit', sans-serif !important;
    }

    /* === Metrics Cards === */
    div[data-testid="stMetric"] {
        background: linear-gradient(135deg, #111827 0%, #1a2236 100%);
        border: 1px solid var(--border-subtle);
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.4);
        transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        animation: countUp 0.5s ease-out both;
    }
    div[data-testid="stMetric"]:hover {
        transform: translateY(-3px);
        box-shadow: 0 4px 24px rgba(0,0,0,0.4), 0 0 20px rgba(6,214,160,0.15);
        border-color: rgba(6,214,160,0.25);
    }
    div[data-testid="stMetric"] label {
        color: var(--accent-cyan) !important;
        font-size: 0.8rem !important;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-family: 'Outfit', sans-serif !important;
        font-weight: 500 !important;
    }
    div[data-testid="stMetric"] [data-testid="stMetricValue"] {
        color: var(--accent-teal) !important;
        font-family: 'Outfit', sans-serif !important;
        font-weight: 800 !important;
        font-size: 2rem !important;
    }

    /* === Expanders === */
    .streamlit-expanderHeader {
        background: var(--bg-elevated);
        border-radius: 12px;
        border: 1px solid var(--border-subtle);
        font-weight: 500;
        font-family: 'DM Sans', sans-serif;
        transition: border-color 0.25s ease;
    }
    .streamlit-expanderHeader:hover {
        border-color: rgba(6,214,160,0.3);
    }
    .streamlit-expanderContent {
        background: rgba(17,24,39,0.7);
        border: 1px solid var(--border-subtle);
        border-top: none;
        border-radius: 0 0 12px 12px;
    }

    /* === Sidebar === */
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, #0a0e1a 0%, #111827 100%);
        border-right: 1px solid var(--border-subtle);
    }

    /* === Scrollbar === */
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: var(--bg-deep); }
    ::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, #06d6a0, #7c3aed);
        border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover { background: var(--accent-teal); }

    /* === Links === */
    a { color: var(--accent-teal) !important; transition: color 0.2s ease; }
    a:hover { color: var(--accent-cyan) !important; }

    /* === Dividers === */
    hr { border-color: var(--border-subtle) !important; }

    /* === Select boxes / Inputs === */
    .stSelectbox > div > div, .stTextInput > div > div > input,
    .stMultiSelect > div > div {
        background: var(--bg-elevated) !important;
        border-color: var(--border-subtle) !important;
        border-radius: 10px !important;
        font-family: 'DM Sans', sans-serif !important;
    }

    /* === Buttons === */
    .stButton > button {
        border-radius: 10px;
        font-family: 'Outfit', sans-serif;
        font-weight: 600;
        transition: all 0.25s ease;
    }

    /* === Catalog-specific: metric row === */
    .catalog-metric {
        background: linear-gradient(135deg, #111827 0%, #1a2236 100%);
        border: 1px solid rgba(148,163,184,0.12);
        border-radius: 16px;
        padding: 24px 20px;
        text-align: center;
        box-shadow: 0 4px 24px rgba(0,0,0,0.4);
        transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        animation: countUp 0.5s ease-out both;
        position: relative;
        overflow: hidden;
    }
    .catalog-metric::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 3px;
        background: linear-gradient(90deg, var(--accent-teal), var(--accent-violet), var(--accent-cyan));
        background-size: 200% 100%;
        animation: gradientShift 4s ease infinite;
    }
    .catalog-metric:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(6,214,160,0.12);
        border-color: rgba(6,214,160,0.25);
    }
    .catalog-metric .metric-icon {
        font-size: 1.6rem;
        margin-bottom: 8px;
        display: block;
    }
    .catalog-metric .metric-value {
        font-family: 'Outfit', sans-serif;
        font-weight: 800;
        font-size: 2rem;
        color: #06d6a0;
        line-height: 1.1;
    }
    .catalog-metric .metric-label {
        font-family: 'Outfit', sans-serif;
        font-weight: 500;
        font-size: 0.78rem;
        color: #22d3ee;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-top: 6px;
    }

    /* === Disease detail card === */
    .disease-card {
        background: linear-gradient(135deg, #111827 0%, #1a2236 60%, #111827 100%);
        border: 1px solid rgba(148,163,184,0.1);
        border-radius: 16px;
        padding: 24px;
        margin-bottom: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.35);
        transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        animation: cardReveal 0.4s ease-out both;
        position: relative;
        overflow: hidden;
    }
    .disease-card::after {
        content: '';
        position: absolute;
        top: 0; right: 0; bottom: 0;
        width: 3px;
        border-radius: 0 16px 16px 0;
    }
    .disease-card.sev-high::after { background: #ef4444; }
    .disease-card.sev-moderate::after { background: #f59e0b; }
    .disease-card.sev-low::after { background: #06d6a0; }
    .disease-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 30px rgba(0,0,0,0.45), 0 0 15px rgba(6,214,160,0.08);
        border-color: rgba(6,214,160,0.2);
    }
    .disease-card h4 {
        margin: 0 0 8px;
        font-family: 'Outfit', sans-serif;
        font-weight: 700;
        color: #f1f5f9;
        font-size: 1.1rem;
    }
    .disease-card .desc {
        color: #94a3b8;
        font-size: 0.9rem;
        line-height: 1.55;
        margin: 10px 0;
        font-family: 'DM Sans', sans-serif;
    }
    .disease-card .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 12px;
    }
    .disease-card .meta-tag {
        background: rgba(148,163,184,0.08);
        border: 1px solid rgba(148,163,184,0.1);
        border-radius: 8px;
        padding: 5px 12px;
        font-size: 0.8rem;
        color: #cbd5e1;
        font-family: 'DM Sans', sans-serif;
    }
    .disease-card .meta-tag b {
        color: #22d3ee;
        font-weight: 600;
    }

    /* === Severity badge === */
    .sev-badge {
        display: inline-block;
        padding: 3px 12px;
        border-radius: 10px;
        font-size: 0.75rem;
        font-weight: 600;
        font-family: 'Outfit', sans-serif;
        letter-spacing: 0.03em;
        vertical-align: middle;
        margin-left: 8px;
    }
    .sev-badge.high { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.4); }
    .sev-badge.moderate { background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.4); }
    .sev-badge.low { background: rgba(6,214,160,0.15); color: #06d6a0; border: 1px solid rgba(6,214,160,0.4); }

    /* === Insight card === */
    .insight-card {
        background: linear-gradient(135deg, #0d1321 0%, #111827 40%, #1a1040 100%);
        border: 1px solid rgba(148,163,184,0.12);
        border-radius: 16px;
        padding: 22px;
        text-align: center;
        box-shadow: 0 4px 24px rgba(0,0,0,0.4);
        animation: glowPulse 4s ease-in-out infinite;
        transition: transform 0.25s ease;
    }
    .insight-card:hover { transform: translateY(-3px); }
    .insight-card .insight-icon { font-size: 1.8rem; margin-bottom: 8px; display: block; }
    .insight-card .insight-title {
        font-family: 'Outfit', sans-serif;
        font-weight: 300;
        font-size: 0.78rem;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        margin-bottom: 6px;
    }
    .insight-card .insight-value {
        font-family: 'Outfit', sans-serif;
        font-weight: 700;
        font-size: 1rem;
        color: #e2e8f0;
        line-height: 1.4;
    }
    .insight-card .insight-sub {
        font-family: 'DM Sans', sans-serif;
        font-size: 0.82rem;
        color: #94a3b8;
        margin-top: 6px;
    }

    /* === Pagination === */
    .pagination-info {
        text-align: center;
        font-family: 'DM Sans', sans-serif;
        color: #94a3b8;
        font-size: 0.85rem;
        margin: 12px 0;
    }

    /* === Dataframe styling === */
    [data-testid="stDataFrame"] {
        border-radius: 14px;
        overflow: hidden;
        border: 1px solid rgba(148,163,184,0.1);
    }

    /* === Section headers === */
    .section-header {
        text-align: center;
        margin: 2rem 0 1.5rem;
        animation: fadeSlideUp 0.5s ease-out;
    }
    .section-header h2 {
        margin: 0;
        font-family: 'Outfit', sans-serif;
        font-weight: 700;
        background: linear-gradient(135deg, #06d6a0, #22d3ee);
        background-size: 200% 200%;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: gradientShift 6s ease infinite;
    }
    .section-header p {
        font-family: 'DM Sans', sans-serif;
        color: #64748b;
        font-size: 0.9rem;
        margin: 6px 0 0;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

# ---------------------------------------------------------------------------
# Load data
# ---------------------------------------------------------------------------
diseases = load_diseases()
total_count = len(diseases)
unique_genes = len(set(d["gene"] for d in diseases))
high_sev_count = sum(1 for d in diseases if d.get("severity") == "high")

# Inheritance stats
from collections import Counter

inheritance_counts = Counter(d["inheritance"] for d in diseases)
most_common_inheritance = inheritance_counts.most_common(1)[0]
most_common_inh_label = format_inheritance(most_common_inheritance[0])
most_common_inh_pct = round(most_common_inheritance[1] / total_count * 100)

# ---------------------------------------------------------------------------
# Hero section
# ---------------------------------------------------------------------------
st.markdown(
    f"""
    <div style="text-align:center;padding:2rem 2rem 1.8rem;
         background:linear-gradient(135deg, #0d1321 0%, #111827 40%, #1a1040 100%);
         border-radius:24px;margin-bottom:1.5rem;position:relative;overflow:hidden;
         border:1px solid rgba(148,163,184,0.12);animation:pulseGlow 4s ease-in-out infinite;">
        <div style="position:absolute;top:0;left:0;right:0;bottom:0;
             background:repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(6,214,160,0.015) 40px, rgba(6,214,160,0.015) 41px);
             animation:subtleScan 20s linear infinite;pointer-events:none;"></div>
        <div style="display:flex;justify-content:center;gap:6px;margin-bottom:0.8rem;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;
                background:linear-gradient(135deg,#06d6a0,#22d3ee);animation:helixFloat 2s ease-in-out infinite;"></span>
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;
                background:linear-gradient(135deg,#7c3aed,#a78bfa);animation:helixFloat 2s ease-in-out infinite 0.3s;"></span>
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;
                background:linear-gradient(135deg,#06d6a0,#22d3ee);animation:helixFloat 2s ease-in-out infinite 0.6s;"></span>
        </div>
        <h1 style="margin:0;font-size:2.4rem;font-family:'Outfit',sans-serif;font-weight:800;
            background:linear-gradient(135deg, #06d6a0, #22d3ee, #7c3aed);
            background-size:200% 200%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;
            animation:gradientShift 6s ease infinite;">Disease Catalog</h1>
        <p style="font-family:'DM Sans',sans-serif;color:#94a3b8;font-size:1.05rem;margin:6px 0 0;">
            Comprehensive Genetic Disease Reference</p>
        <div style="display:inline-block;margin-top:0.8rem;padding:7px 18px;
             background:linear-gradient(90deg,transparent,rgba(6,214,160,0.1),transparent);
             background-size:200% 100%;animation:shimmer 3s linear infinite;
             border:1px solid rgba(6,214,160,0.2);border-radius:20px;">
            <span style="color:#06d6a0;font-family:'DM Sans',sans-serif;font-size:0.85rem;">
                \U0001f9ec {total_count} Conditions Screened</span>
        </div>
    </div>
    """,
    unsafe_allow_html=True,
)

# ---------------------------------------------------------------------------
# Summary metrics (4 cards)
# ---------------------------------------------------------------------------
mc1, mc2, mc3, mc4 = st.columns(4)

with mc1:
    st.markdown(
        f"""<div class="catalog-metric" style="animation-delay:0s;">
            <span class="metric-icon">\U0001f9ec</span>
            <div class="metric-value">{total_count}</div>
            <div class="metric-label">Total Diseases</div>
        </div>""",
        unsafe_allow_html=True,
    )

with mc2:
    st.markdown(
        f"""<div class="catalog-metric" style="animation-delay:0.1s;">
            <span class="metric-icon">\U0001f52c</span>
            <div class="metric-value">{unique_genes}</div>
            <div class="metric-label">Unique Genes</div>
        </div>""",
        unsafe_allow_html=True,
    )

with mc3:
    st.markdown(
        f"""<div class="catalog-metric" style="animation-delay:0.2s;">
            <span class="metric-icon">\u26a0\ufe0f</span>
            <div class="metric-value">{high_sev_count}</div>
            <div class="metric-label">High Severity</div>
        </div>""",
        unsafe_allow_html=True,
    )

with mc4:
    st.markdown(
        f"""<div class="catalog-metric" style="animation-delay:0.3s;">
            <span class="metric-icon">\U0001f4ca</span>
            <div class="metric-value">{most_common_inh_pct}%</div>
            <div class="metric-label">{most_common_inh_label}</div>
        </div>""",
        unsafe_allow_html=True,
    )

# ---------------------------------------------------------------------------
# Sidebar filters
# ---------------------------------------------------------------------------
with st.sidebar:
    st.markdown(
        """
        <div style="text-align:center;padding:1.2rem 0;margin-bottom:0.8rem;">
            <div style="display:inline-flex;gap:4px;margin-bottom:8px;">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;
                    background:#06d6a0;animation:helixFloat 2s ease-in-out infinite;"></span>
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;
                    background:#7c3aed;animation:helixFloat 2s ease-in-out infinite 0.4s;"></span>
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;
                    background:#22d3ee;animation:helixFloat 2s ease-in-out infinite 0.8s;"></span>
            </div>
            <h3 style="margin:4px 0 0;font-family:'Outfit',sans-serif;font-weight:800;
                background:linear-gradient(135deg, #06d6a0, #22d3ee);
                -webkit-background-clip:text;-webkit-text-fill-color:transparent;">Tortit</h3>
            <p style="font-size:0.7rem;color:#94a3b8;margin:4px 0 0;font-family:'DM Sans',sans-serif;
                letter-spacing:0.15em;text-transform:uppercase;">Disease Catalog</p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    st.markdown("### \U0001f50d Filters")

    search_query = st.text_input(
        "Search diseases",
        placeholder="Type disease name or gene...",
        key="disease_search",
    )

    severity_filter = st.multiselect(
        "Severity",
        options=["high", "moderate", "low"],
        format_func=lambda x: {"high": "\U0001f534 High", "moderate": "\U0001f7e1 Moderate", "low": "\U0001f7e2 Low"}[x],
        default=[],
        key="severity_filter",
    )

    inheritance_options = sorted(set(d["inheritance"] for d in diseases))
    inheritance_filter = st.multiselect(
        "Inheritance Pattern",
        options=inheritance_options,
        format_func=format_inheritance,
        default=[],
        key="inheritance_filter",
    )

    category_options = sorted(set(d.get("category", "Other") for d in diseases))
    category_filter = st.multiselect(
        "Category",
        options=category_options,
        default=[],
        key="category_filter",
    )

    # Carrier frequency range
    all_freqs = [parse_carrier_freq(d["carrier_frequency"]) for d in diseases]
    min_freq = min(all_freqs)
    max_freq = max(all_freqs)
    freq_range = st.slider(
        "Carrier Frequency (1 in X)",
        min_value=min_freq,
        max_value=max_freq,
        value=(min_freq, max_freq),
        help="Lower numbers = more common carriers. E.g., '1 in 5' is very common, '1 in 40000' is very rare.",
        key="freq_range",
    )

    st.markdown("---")
    if st.button("\U0001f504 Reset Filters", use_container_width=True):
        for key in ["disease_search", "severity_filter", "inheritance_filter", "category_filter", "freq_range"]:
            if key in st.session_state:
                del st.session_state[key]
        st.rerun()

    st.markdown("---")
    st.markdown(
        '<p style="font-size:0.75rem;color:#64748B;font-family:\'DM Sans\',sans-serif;">'
        "Tortit v2.0 &mdash; For educational purposes only.</p>",
        unsafe_allow_html=True,
    )

# ---------------------------------------------------------------------------
# Apply filters
# ---------------------------------------------------------------------------
filtered = diseases.copy()

if search_query:
    q = search_query.lower()
    filtered = [
        d for d in filtered
        if q in d["condition"].lower() or q in d["gene"].lower() or q in d.get("description", "").lower()
    ]

if severity_filter:
    filtered = [d for d in filtered if d.get("severity") in severity_filter]

if inheritance_filter:
    filtered = [d for d in filtered if d["inheritance"] in inheritance_filter]

if category_filter:
    filtered = [d for d in filtered if d.get("category", "Other") in category_filter]

filtered = [
    d for d in filtered
    if freq_range[0] <= parse_carrier_freq(d["carrier_frequency"]) <= freq_range[1]
]

# ---------------------------------------------------------------------------
# Interactive table
# ---------------------------------------------------------------------------
st.markdown(
    """<div class="section-header">
        <h2>\U0001f4cb Disease Directory</h2>
        <p>Browse, search, and sort all screened conditions</p>
    </div>""",
    unsafe_allow_html=True,
)

st.markdown(
    f'<p style="font-family:\'DM Sans\',sans-serif;color:#94a3b8;font-size:0.9rem;margin-bottom:8px;">'
    f'Showing <b style="color:#06d6a0;">{len(filtered)}</b> of <b style="color:#22d3ee;">{total_count}</b> conditions</p>',
    unsafe_allow_html=True,
)

# Build DataFrame for display
df_data = []
for d in filtered:
    freq_num = parse_carrier_freq(d["carrier_frequency"])
    df_data.append(
        {
            "Disease": d["condition"],
            "Gene": d["gene"],
            "Carrier Frequency": d["carrier_frequency"],
            "Severity": severity_indicator(d.get("severity", "unknown")),
            "Prevalence": d.get("prevalence", "---"),
            "Inheritance": format_inheritance(d["inheritance"]),
            "Category": d.get("category", "Other"),
            "_freq_sort": freq_num,
        }
    )

df = pd.DataFrame(df_data)
if not df.empty:
    df_display = df.drop(columns=["_freq_sort"])
    st.dataframe(
        df_display,
        hide_index=True,
        use_container_width=True,
        height=min(600, 40 + len(df_display) * 36),
        column_config={
            "Disease": st.column_config.TextColumn("Disease", width="large"),
            "Gene": st.column_config.TextColumn("Gene", width="small"),
            "Carrier Frequency": st.column_config.TextColumn("Carrier Freq.", width="small"),
            "Severity": st.column_config.TextColumn("Severity", width="small"),
            "Prevalence": st.column_config.TextColumn("Prevalence", width="small"),
            "Inheritance": st.column_config.TextColumn("Inheritance", width="medium"),
            "Category": st.column_config.TextColumn("Category", width="medium"),
        },
    )
else:
    st.info("No conditions match your current filters. Try adjusting the sidebar filters.")

# ---------------------------------------------------------------------------
# Paginated disease detail cards
# ---------------------------------------------------------------------------
st.markdown(
    """<div class="section-header">
        <h2>\U0001f4c4 Disease Profiles</h2>
        <p>Expandable detail cards for each condition</p>
    </div>""",
    unsafe_allow_html=True,
)

if len(filtered) > 0:
    ITEMS_PER_PAGE = 30
    total_pages = max(1, math.ceil(len(filtered) / ITEMS_PER_PAGE))

    # Pagination controls
    page_cols = st.columns([1, 3, 1])
    with page_cols[0]:
        if st.button("\u25c0 Previous", disabled=(st.session_state.get("catalog_page", 1) <= 1), key="prev_page"):
            st.session_state["catalog_page"] = max(1, st.session_state.get("catalog_page", 1) - 1)
            st.rerun()
    with page_cols[1]:
        new_page = st.number_input("Page", min_value=1, max_value=total_pages, value=st.session_state.get("catalog_page", 1), key="page_jump")
        if new_page != st.session_state.get("catalog_page", 1):
            st.session_state["catalog_page"] = new_page
            st.rerun()
    with page_cols[2]:
        if st.button("Next \u25b6", disabled=(st.session_state.get("catalog_page", 1) >= total_pages), key="next_page"):
            st.session_state["catalog_page"] = min(total_pages, st.session_state.get("catalog_page", 1) + 1)
            st.rerun()

    current_page = st.session_state.get("catalog_page", 1)
    # Clamp page
    if current_page > total_pages:
        current_page = total_pages
        st.session_state["catalog_page"] = current_page

    start_idx = (current_page - 1) * ITEMS_PER_PAGE
    end_idx = min(start_idx + ITEMS_PER_PAGE, len(filtered))
    page_items = filtered[start_idx:end_idx]

    st.markdown(
        f'<p class="pagination-info">Page {current_page} of {total_pages} '
        f'&mdash; Showing {start_idx + 1}-{end_idx} of {len(filtered)}</p>',
        unsafe_allow_html=True,
    )

    for idx, d in enumerate(page_items):
        sev = d.get("severity", "unknown")
        sev_class = sev if sev in ("high", "moderate", "low") else ""
        omim_id = d.get("omim_id", "")
        prevalence = d.get("prevalence", "")
        omim_link = f"https://omim.org/entry/{omim_id}" if omim_id else ""

        with st.expander(f"{d['condition']}  ({d['gene']})", expanded=False):
            # Build card HTML
            category = d.get("category", "Other")
            meta_tags = f"""
                <span class="meta-tag"><b>Gene:</b> {d['gene']}</span>
                <span class="meta-tag"><b>Inheritance:</b> {format_inheritance(d['inheritance'])}</span>
                <span class="meta-tag"><b>Carrier Freq:</b> {d['carrier_frequency']}</span>
                <span class="meta-tag"><b>rsID:</b> {d['rsid']}</span>
                <span class="meta-tag"><b>Category:</b> {category}</span>
            """
            if prevalence:
                meta_tags += f'<span class="meta-tag"><b>Prevalence:</b> {prevalence}</span>'

            sev_badge_html = f'<span class="sev-badge {sev}">{sev.upper()}</span>'

            omim_html = ""
            if omim_link:
                omim_html = (
                    f'<a href="{omim_link}" target="_blank" style="display:inline-block;margin-top:12px;'
                    f'padding:5px 14px;background:rgba(6,214,160,0.08);border:1px solid rgba(6,214,160,0.2);'
                    f'border-radius:8px;font-size:0.8rem;font-family:\'DM Sans\',sans-serif;color:#06d6a0 !important;'
                    f'text-decoration:none;transition:all 0.2s ease;">'
                    f'\U0001f517 View on OMIM</a>'
                )

            st.markdown(
                f"""<div class="disease-card sev-{sev_class}" style="animation-delay:{idx * 0.03}s;">
                    <h4>{d['condition']} {sev_badge_html}</h4>
                    <p class="desc">{d.get('description', 'No description available.')}</p>
                    <div class="meta">{meta_tags}</div>
                    {omim_html}
                </div>""",
                unsafe_allow_html=True,
            )

# ---------------------------------------------------------------------------
# Statistics & Charts
# ---------------------------------------------------------------------------
st.markdown("---")
st.markdown(
    """<div class="section-header">
        <h2>\U0001f4ca Analytics</h2>
        <p>Distribution and frequency insights across the full panel</p>
    </div>""",
    unsafe_allow_html=True,
)

chart_col1, chart_col2 = st.columns(2)

# Chart 1: Inheritance Distribution (Donut)
with chart_col1:
    inh_labels = [format_inheritance(k) for k in inheritance_counts.keys()]
    inh_values = list(inheritance_counts.values())
    inh_colors = {
        "Autosomal Recessive": "#06d6a0",
        "Autosomal Dominant": "#7c3aed",
        "X-Linked": "#22d3ee",
    }
    colors_mapped = [inh_colors.get(l, "#94a3b8") for l in inh_labels]

    fig_inh = go.Figure(
        data=[
            go.Pie(
                labels=inh_labels,
                values=inh_values,
                hole=0.55,
                marker=dict(colors=colors_mapped, line=dict(color="#0a0e1a", width=2)),
                textfont=dict(family="Outfit", size=13, color="#e2e8f0"),
                hovertemplate="<b>%{label}</b><br>%{value} conditions<br>%{percent}<extra></extra>",
            )
        ]
    )
    fig_inh.update_layout(
        title=dict(text="Inheritance Distribution", font=dict(family="Outfit", size=18, color="#e2e8f0"), x=0.5),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        legend=dict(font=dict(family="DM Sans", size=12, color="#94a3b8"), bgcolor="rgba(0,0,0,0)"),
        margin=dict(l=20, r=20, t=60, b=20),
        height=380,
        annotations=[
            dict(
                text=f"<b>{total_count}</b><br><span style='font-size:11px;color:#94a3b8;'>Total</span>",
                x=0.5, y=0.5, font=dict(family="Outfit", size=24, color="#06d6a0"),
                showarrow=False,
            )
        ],
    )
    st.plotly_chart(fig_inh, use_container_width=True)

# Chart 2: Severity Distribution (Horizontal Bar)
with chart_col2:
    sev_counts = Counter(d.get("severity", "unknown") for d in diseases)
    sev_order = ["high", "moderate", "low"]
    sev_labels = [s.title() for s in sev_order if s in sev_counts]
    sev_values = [sev_counts[s] for s in sev_order if s in sev_counts]
    sev_colors_map = {"High": "#ef4444", "Moderate": "#f59e0b", "Low": "#06d6a0"}
    sev_colors = [sev_colors_map.get(l, "#94a3b8") for l in sev_labels]

    fig_sev = go.Figure(
        data=[
            go.Bar(
                y=sev_labels,
                x=sev_values,
                orientation="h",
                marker=dict(
                    color=sev_colors,
                    line=dict(color="#0a0e1a", width=1),
                    cornerradius=6,
                ),
                text=[f"  {v}" for v in sev_values],
                textposition="outside",
                textfont=dict(family="Outfit", size=14, color="#e2e8f0"),
                hovertemplate="<b>%{y}</b>: %{x} conditions<extra></extra>",
            )
        ]
    )
    fig_sev.update_layout(
        title=dict(text="Severity Distribution", font=dict(family="Outfit", size=18, color="#e2e8f0"), x=0.5),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        xaxis=dict(
            showgrid=True, gridcolor="rgba(148,163,184,0.06)",
            tickfont=dict(family="DM Sans", color="#94a3b8"),
            title=dict(text="Number of Conditions", font=dict(family="DM Sans", size=12, color="#64748b")),
        ),
        yaxis=dict(tickfont=dict(family="Outfit", size=14, color="#e2e8f0")),
        margin=dict(l=20, r=60, t=60, b=40),
        height=380,
    )
    st.plotly_chart(fig_sev, use_container_width=True)

# Chart 3: Category Distribution (Horizontal Bar)
st.markdown(
    """<div class="section-header" style="margin-top:0.5rem;">
        <h2>\U0001f4ca Category Distribution</h2>
        <p>Diseases grouped by medical category</p>
    </div>""",
    unsafe_allow_html=True,
)

category_counts = Counter(d.get("category", "Other") for d in diseases)
sorted_cats = category_counts.most_common()
cat_labels = [c[0] for c in sorted_cats]
cat_values = [c[1] for c in sorted_cats]

# Cycle through colors
color_palette = ["#06d6a0", "#7c3aed", "#22d3ee", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316", "#6366f1", "#84cc16", "#06b6d4"]
cat_colors = [color_palette[i % len(color_palette)] for i in range(len(cat_labels))]

fig_cat = go.Figure(
    data=[
        go.Bar(
            y=list(reversed(cat_labels)),
            x=list(reversed(cat_values)),
            orientation="h",
            marker=dict(
                color=list(reversed(cat_colors)),
                line=dict(color="#0a0e1a", width=1),
                cornerradius=6,
            ),
            text=[f"  {v}" for v in reversed(cat_values)],
            textposition="outside",
            textfont=dict(family="Outfit", size=13, color="#e2e8f0"),
            hovertemplate="<b>%{y}</b>: %{x} conditions<extra></extra>",
        )
    ]
)
fig_cat.update_layout(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(0,0,0,0)",
    xaxis=dict(
        showgrid=True, gridcolor="rgba(148,163,184,0.06)",
        tickfont=dict(family="DM Sans", color="#94a3b8"),
        title=dict(text="Number of Conditions", font=dict(family="DM Sans", size=12, color="#64748b")),
    ),
    yaxis=dict(tickfont=dict(family="DM Sans", size=11, color="#e2e8f0")),
    margin=dict(l=10, r=80, t=20, b=40),
    height=max(400, len(cat_labels) * 25),
)
st.plotly_chart(fig_cat, use_container_width=True)

# Chart 4: Top 15 Most Common Diseases (by carrier frequency)
st.markdown(
    """<div class="section-header" style="margin-top:0.5rem;">
        <h2>\U0001f3af Most Common Carrier Conditions</h2>
        <p>Ranked by carrier frequency (lower denominator = more common)</p>
    </div>""",
    unsafe_allow_html=True,
)

sorted_by_freq = sorted(diseases, key=lambda d: parse_carrier_freq(d["carrier_frequency"]))
top_15 = sorted_by_freq[:15]

top_labels = [f"{d['condition']}" for d in top_15]
top_freqs = [parse_carrier_freq(d["carrier_frequency"]) for d in top_15]
# Invert for visual: higher bar = more common. Use 1/X scaled.
top_display_values = [round(1 / f * 1000, 2) for f in top_freqs]
top_hover_text = [f"1 in {f:,}" for f in top_freqs]
# Color by severity
top_colors = []
for d in top_15:
    sev = d.get("severity", "low")
    top_colors.append({"high": "#ef4444", "moderate": "#f59e0b", "low": "#06d6a0"}.get(sev, "#94a3b8"))

fig_top = go.Figure(
    data=[
        go.Bar(
            y=list(reversed(top_labels)),
            x=list(reversed(top_display_values)),
            orientation="h",
            marker=dict(
                color=list(reversed(top_colors)),
                line=dict(color="#0a0e1a", width=1),
                cornerradius=6,
            ),
            text=[f"  {t}" for t in reversed(top_hover_text)],
            textposition="outside",
            textfont=dict(family="DM Sans", size=11, color="#94a3b8"),
            hovertemplate="<b>%{y}</b><br>Carrier frequency: %{text}<extra></extra>",
        )
    ]
)
fig_top.update_layout(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(0,0,0,0)",
    xaxis=dict(
        showgrid=True, gridcolor="rgba(148,163,184,0.06)",
        tickfont=dict(family="DM Sans", color="#94a3b8"),
        title=dict(text="Relative Commonness (higher = more common)", font=dict(family="DM Sans", size=12, color="#64748b")),
    ),
    yaxis=dict(tickfont=dict(family="DM Sans", size=11, color="#e2e8f0")),
    margin=dict(l=10, r=80, t=20, b=40),
    height=520,
)
st.plotly_chart(fig_top, use_container_width=True)

# ---------------------------------------------------------------------------
# Insights / Fun Facts
# ---------------------------------------------------------------------------
st.markdown("---")
st.markdown(
    """<div class="section-header">
        <h2>\U0001f4a1 Insights</h2>
        <p>Interesting facts from the disease panel</p>
    </div>""",
    unsafe_allow_html=True,
)

most_common = sorted_by_freq[0]
rarest = sorted_by_freq[-1]
ar_pct = round(inheritance_counts.get("autosomal_recessive", 0) / total_count * 100)

ins1, ins2, ins3, ins4 = st.columns(4)

with ins1:
    st.markdown(
        f"""<div class="insight-card">
            <span class="insight-icon">\U0001f451</span>
            <div class="insight-title">Most Common Carrier</div>
            <div class="insight-value">{most_common['condition']}</div>
            <div class="insight-sub">{most_common['carrier_frequency']} carriers</div>
        </div>""",
        unsafe_allow_html=True,
    )

with ins2:
    st.markdown(
        f"""<div class="insight-card">
            <span class="insight-icon">\U0001f48e</span>
            <div class="insight-title">Rarest Condition</div>
            <div class="insight-value">{rarest['condition']}</div>
            <div class="insight-sub">{rarest['carrier_frequency']} carriers</div>
        </div>""",
        unsafe_allow_html=True,
    )

with ins3:
    st.markdown(
        f"""<div class="insight-card">
            <span class="insight-icon">\U0001f9ec</span>
            <div class="insight-title">Autosomal Recessive</div>
            <div class="insight-value">{ar_pct}% of panel</div>
            <div class="insight-sub">{inheritance_counts.get('autosomal_recessive', 0)} of {total_count} conditions</div>
        </div>""",
        unsafe_allow_html=True,
    )

with ins4:
    st.markdown(
        """<div class="insight-card">
            <span class="insight-icon">\U0001f465</span>
            <div class="insight-title">Population Fact</div>
            <div class="insight-value">~24% of all humans</div>
            <div class="insight-sub">carry at least 1 pathogenic variant</div>
        </div>""",
        unsafe_allow_html=True,
    )

# ---------------------------------------------------------------------------
# Footer
# ---------------------------------------------------------------------------
st.markdown(
    """
    <div style="text-align:center;padding:1.5rem;margin-top:2rem;
         background:linear-gradient(135deg, #0d1321 0%, #111827 40%, #1a1040 100%);
         border-radius:20px;border:1px solid rgba(148,163,184,0.12);
         box-shadow:0 4px 30px rgba(0,0,0,0.3);animation:fadeSlideUp 0.5s ease-out;">
        <p style="color:#94a3b8;font-size:0.82rem;margin-bottom:10px;font-family:'DM Sans',sans-serif;">
            <b style="color:#f59e0b;">\u26a0\ufe0f Disclaimer:</b> This catalog is for <b>educational purposes only</b>.
            It does not constitute medical advice. Always consult a certified genetic counselor for clinical interpretation.</p>
        <div style="display:flex;justify-content:center;gap:4px;margin-bottom:8px;">
            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;
                background:#06d6a0;animation:helixFloat 2.5s ease-in-out infinite;"></span>
            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;
                background:#7c3aed;animation:helixFloat 2.5s ease-in-out infinite 0.3s;"></span>
            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;
                background:#22d3ee;animation:helixFloat 2.5s ease-in-out infinite 0.6s;"></span>
        </div>
        <p style="color:#64748B;font-size:0.78rem;margin:0;font-family:'DM Sans',sans-serif;">
            <span style="background:linear-gradient(135deg, #06d6a0, #22d3ee);
            -webkit-background-clip:text;-webkit-text-fill-color:transparent;
            font-weight:700;font-family:'Outfit',sans-serif;">Tortit v2.0</span>
            &bull; Disease Catalog
        </p>
    </div>
    """,
    unsafe_allow_html=True,
)
