"""
Mergenix — Centralized CSS theme.

ALL CSS for the entire application lives here.  Called once from the
entry-point router (app.py) so that every page inherits a consistent
dark-premium bioluminescent look without duplicating a single line.

Design tokens are exposed as Python constants so other UI modules can
reference them when building inline styles.
"""

import streamlit as st

# ---------------------------------------------------------------------------
# Design tokens
# ---------------------------------------------------------------------------
BG_DEEP = "#0a0e1a"
BG_SURFACE = "#111827"
BG_ELEVATED = "#1a2236"
ACCENT_TEAL = "#06d6a0"
ACCENT_VIOLET = "#7c3aed"
ACCENT_CYAN = "#22d3ee"
ACCENT_AMBER = "#f59e0b"
ACCENT_ROSE = "#ef4444"
TEXT_PRIMARY = "#e2e8f0"
TEXT_MUTED = "#94a3b8"
TEXT_DIM = "#64748b"
BORDER_SUBTLE = "rgba(148, 163, 184, 0.12)"

FONT_HEADING = "'Outfit', sans-serif"
FONT_BODY = "'DM Sans', sans-serif"

# Severity / status colour maps (reusable by Python helpers)
SEVERITY_COLORS = {
    "high": (ACCENT_ROSE, "rgba(239,68,68,0.15)", "rgba(239,68,68,0.4)"),
    "moderate": (ACCENT_AMBER, "rgba(245,158,11,0.15)", "rgba(245,158,11,0.4)"),
    "low": (ACCENT_TEAL, "rgba(6,214,160,0.15)", "rgba(6,214,160,0.4)"),
}

CONFIDENCE_COLORS = {
    "high": ACCENT_TEAL,
    "medium": ACCENT_AMBER,
    "low": ACCENT_ROSE,
}

# ---------------------------------------------------------------------------
# Global CSS (single <style> block, injected once)
# ---------------------------------------------------------------------------
_GLOBAL_CSS = """
<style>
/* ========== Google Fonts ========== */
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&display=swap');

/* ========== CSS Variables ========== */
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

/* ========== Animations ========== */
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

/* ========== Global ========== */
.stApp {
    background: linear-gradient(135deg, #0a0e1a 0%, #111827 50%, #1a1040 100%);
}
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

/* ========== Equal-height columns ========== */
[data-testid="stHorizontalBlock"] { align-items: stretch !important; }
[data-testid="stColumn"] > div { height: 100%; }
[data-testid="stColumn"] > div > div[data-testid="stVerticalBlockBorderWrapper"] { height: 100%; }
[data-testid="stColumn"] > div > div > div[data-testid="stVerticalBlock"] { height: 100%; }
[data-testid="stColumn"] [data-testid="stMarkdownContainer"] > div { height: 100%; }

/* ========== Hide default Streamlit nav (we use custom navbar) ========== */
[data-testid="stSidebarNav"] { display: none !important; }
header[data-testid="stHeader"] { display: none !important; }
#MainMenu { visibility: hidden; }

/* ========== Metrics Cards ========== */
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

/* ========== Tabs ========== */
.stTabs [data-baseweb="tab-list"] {
    gap: 8px;
    background: var(--bg-surface);
    border-radius: 14px;
    padding: 5px;
    border: 1px solid var(--border-subtle);
}
.stTabs [data-baseweb="tab"] {
    border-radius: 10px;
    padding: 10px 20px;
    color: var(--text-muted);
    font-weight: 500;
    font-family: 'Outfit', sans-serif;
    transition: all 0.2s ease;
}
.stTabs [data-baseweb="tab"]:hover {
    color: var(--accent-teal);
    background: rgba(6,214,160,0.05);
}
.stTabs [aria-selected="true"] {
    background: linear-gradient(135deg, #06d6a0, #059669) !important;
    color: #0a0e1a !important;
    font-weight: 700 !important;
}

/* ========== Expanders ========== */
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

/* ========== Buttons ========== */
.stButton > button[kind="primary"] {
    background: linear-gradient(135deg, #06d6a0 0%, #059669 50%, #047857 100%);
    border: none;
    border-radius: 14px;
    padding: 14px 28px;
    font-weight: 700;
    font-size: 1.1rem;
    font-family: 'Outfit', sans-serif;
    letter-spacing: 0.02em;
    color: #0a0e1a !important;
    box-shadow: 0 4px 20px rgba(6, 214, 160, 0.3);
    transition: all 0.3s ease;
}
.stButton > button[kind="primary"]:hover {
    box-shadow: 0 6px 30px rgba(6, 214, 160, 0.5);
    transform: translateY(-2px);
}
.stButton > button {
    border-radius: 10px;
    font-family: 'Outfit', sans-serif;
    font-weight: 600;
    transition: all 0.25s ease;
}

/* ========== File Uploader ========== */
[data-testid="stFileUploader"] {
    background: var(--bg-elevated);
    border: 2px dashed rgba(6, 214, 160, 0.2);
    border-radius: 16px;
    padding: 20px;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
}
[data-testid="stFileUploader"]:hover {
    border-color: rgba(6, 214, 160, 0.5);
    box-shadow: 0 0 20px rgba(6, 214, 160, 0.08);
}

/* ========== Progress Bar ========== */
.stProgress > div > div {
    background: linear-gradient(90deg, #06d6a0, #7c3aed, #22d3ee);
    background-size: 200% 100%;
    animation: gradientShift 3s ease infinite;
    border-radius: 10px;
}

/* ========== Sidebar ========== */
[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #0a0e1a 0%, #111827 100%);
    border-right: 1px solid var(--border-subtle);
}

/* ========== Scrollbar ========== */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: var(--bg-deep); }
::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #06d6a0, #7c3aed);
    border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover { background: var(--accent-teal); }

/* ========== Alerts ========== */
.stAlert { border-radius: 12px; }

/* ========== Links ========== */
a { color: var(--accent-teal) !important; transition: color 0.2s ease; }
a:hover { color: var(--accent-cyan) !important; }

/* ========== Dividers ========== */
hr { border-color: var(--border-subtle) !important; }

/* ========== Select / Input ========== */
.stSelectbox > div > div, .stTextInput > div > div > input,
.stMultiSelect > div > div {
    background: var(--bg-elevated) !important;
    border-color: var(--border-subtle) !important;
    border-radius: 10px !important;
    font-family: 'DM Sans', sans-serif !important;
}

/* ========== Dataframe ========== */
[data-testid="stDataFrame"] {
    border-radius: 14px;
    overflow: hidden;
    border: 1px solid rgba(148,163,184,0.1);
}

/* ========== Catalog-specific: metric row ========== */
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
.catalog-metric .metric-icon { font-size: 1.6rem; margin-bottom: 8px; display: block; }
.catalog-metric .metric-value {
    font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 2rem; color: #06d6a0; line-height: 1.1;
}
.catalog-metric .metric-label {
    font-family: 'Outfit', sans-serif; font-weight: 500; font-size: 0.78rem;
    color: #22d3ee; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 6px;
}

/* ========== Disease card ========== */
.disease-card {
    background: linear-gradient(135deg, #111827 0%, #1a2236 60%, #111827 100%);
    border: 1px solid rgba(148,163,184,0.1);
    border-radius: 16px; padding: 24px; margin-bottom: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.35);
    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
    animation: cardReveal 0.4s ease-out both;
    position: relative; overflow: hidden;
}
.disease-card::after {
    content: ''; position: absolute; top: 0; right: 0; bottom: 0; width: 3px; border-radius: 0 16px 16px 0;
}
.disease-card.sev-high::after { background: #ef4444; }
.disease-card.sev-moderate::after { background: #f59e0b; }
.disease-card.sev-low::after { background: #06d6a0; }
.disease-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(0,0,0,0.45), 0 0 15px rgba(6,214,160,0.08);
    border-color: rgba(6,214,160,0.2);
}
.disease-card h4 { margin: 0 0 8px; font-family: 'Outfit', sans-serif; font-weight: 700; color: #f1f5f9; font-size: 1.1rem; }
.disease-card .desc { color: #94a3b8; font-size: 0.9rem; line-height: 1.55; margin: 10px 0; font-family: 'DM Sans', sans-serif; }
.disease-card .meta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; }
.disease-card .meta-tag {
    background: rgba(148,163,184,0.08); border: 1px solid rgba(148,163,184,0.1);
    border-radius: 8px; padding: 5px 12px; font-size: 0.8rem; color: #cbd5e1; font-family: 'DM Sans', sans-serif;
}
.disease-card .meta-tag b { color: #22d3ee; font-weight: 600; }

/* ========== Severity badge ========== */
.sev-badge {
    display: inline-block; padding: 3px 12px; border-radius: 10px; font-size: 0.75rem;
    font-weight: 600; font-family: 'Outfit', sans-serif; letter-spacing: 0.03em; vertical-align: middle; margin-left: 8px;
}
.sev-badge.high { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.4); }
.sev-badge.moderate { background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.4); }
.sev-badge.low { background: rgba(6,214,160,0.15); color: #06d6a0; border: 1px solid rgba(6,214,160,0.4); }

/* ========== Insight card ========== */
.insight-card {
    background: linear-gradient(135deg, #0d1321 0%, #111827 40%, #1a1040 100%);
    border: 1px solid rgba(148,163,184,0.12); border-radius: 16px; padding: 22px; text-align: center;
    box-shadow: 0 4px 24px rgba(0,0,0,0.4); animation: glowPulse 4s ease-in-out infinite;
    transition: transform 0.25s ease;
}
.insight-card:hover { transform: translateY(-3px); }
.insight-card .insight-icon { font-size: 1.8rem; margin-bottom: 8px; display: block; }
.insight-card .insight-title {
    font-family: 'Outfit', sans-serif; font-weight: 300; font-size: 0.78rem;
    color: #64748b; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 6px;
}
.insight-card .insight-value { font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 1rem; color: #e2e8f0; line-height: 1.4; }
.insight-card .insight-sub { font-family: 'DM Sans', sans-serif; font-size: 0.82rem; color: #94a3b8; margin-top: 6px; }

/* ========== Section headers ========== */
.section-header { text-align: center; margin: 2rem 0 1.5rem; animation: fadeSlideUp 0.5s ease-out; }
.section-header h2 {
    margin: 0; font-family: 'Outfit', sans-serif; font-weight: 700;
    background: linear-gradient(135deg, #06d6a0, #22d3ee);
    background-size: 200% 200%; -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    animation: gradientShift 6s ease infinite;
}
.section-header p { font-family: 'DM Sans', sans-serif; color: #64748b; font-size: 0.9rem; margin: 6px 0 0; }

/* ========== Pagination ========== */
.pagination-info { text-align: center; font-family: 'DM Sans', sans-serif; color: #94a3b8; font-size: 0.85rem; margin: 12px 0; }

/* ========== Pricing card ========== */
.pricing-card {
    background: linear-gradient(135deg, #111827 0%, #1a2236 100%);
    border: 1px solid rgba(148,163,184,0.12); border-radius: 20px; padding: 32px 24px;
    text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.4);
    transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
    animation: cardReveal 0.5s ease-out both; position: relative; overflow: hidden;
    height: 100%; display: flex; flex-direction: column;
}
.pricing-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; }
.pricing-card.free::before { background: linear-gradient(90deg, #94a3b8, #64748b); }
.pricing-card.premium::before { background: linear-gradient(90deg, #7c3aed, #a78bfa); }
.pricing-card.pro::before { background: linear-gradient(90deg, #06d6a0, #22d3ee); }
.pricing-card.popular {
    border-color: rgba(124,58,237,0.5);
    box-shadow: 0 4px 24px rgba(0,0,0,0.4), 0 0 40px rgba(124,58,237,0.15);
}
.pricing-card.current {
    border-color: rgba(6,214,160,0.4);
    box-shadow: 0 4px 24px rgba(0,0,0,0.4), 0 0 30px rgba(6,214,160,0.15);
}
.pricing-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(6,214,160,0.12);
}
.pricing-card .tier-name { font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 1.8rem; color: #e2e8f0; margin-bottom: 12px; }
.pricing-card .tier-price { font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 2.5rem; color: #06d6a0; margin-bottom: 8px; }
.pricing-card .tier-price small { font-size: 1rem; color: #94a3b8; font-weight: 400; }
.pricing-card .tier-description { font-family: 'DM Sans', sans-serif; font-size: 0.9rem; color: #94a3b8; margin-bottom: 24px; min-height: 40px; }
.pricing-card .feature-list { text-align: left; margin-bottom: 24px; flex-grow: 1; }
.pricing-card .feature-item {
    font-family: 'DM Sans', sans-serif; font-size: 0.9rem; color: #cbd5e1;
    margin-bottom: 12px; display: flex; align-items: flex-start; line-height: 1.5;
}
.pricing-card .feature-item .check { color: #06d6a0; margin-right: 10px; font-size: 1.1rem; flex-shrink: 0; }

/* ========== Tier badge ========== */
.tier-badge {
    display: inline-block; padding: 6px 16px; border-radius: 12px; font-size: 0.85rem;
    font-weight: 700; font-family: 'Outfit', sans-serif; letter-spacing: 0.05em;
    text-transform: uppercase; vertical-align: middle; margin-left: 8px;
}
.tier-badge.free { background: rgba(148,163,184,0.15); color: #94a3b8; border: 1px solid rgba(148,163,184,0.4); }
.tier-badge.premium { background: rgba(124,58,237,0.15); color: #7c3aed; border: 1px solid rgba(124,58,237,0.4); }
.tier-badge.pro { background: rgba(6,214,160,0.15); color: #06d6a0; border: 1px solid rgba(6,214,160,0.4); }

/* ========== FAQ item ========== */
.faq-item {
    background: var(--bg-elevated); border: 1px solid var(--border-subtle);
    border-radius: 12px; padding: 20px; margin-bottom: 16px; transition: border-color 0.25s ease;
}
.faq-item:hover { border-color: rgba(6,214,160,0.3); }
.faq-item .question { font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 1.05rem; color: #e2e8f0; margin-bottom: 8px; }
.faq-item .answer { font-family: 'DM Sans', sans-serif; font-size: 0.9rem; color: #94a3b8; line-height: 1.6; }

/* ========== Auth page ========== */
.login-card {
    background: linear-gradient(135deg, #111827 0%, #1a2236 100%);
    border: 1px solid rgba(148, 163, 184, 0.12);
    border-radius: 28px; padding: 3rem 2.5rem;
    animation: pulseGlow 4s ease-in-out infinite, fadeSlideUp 0.6s ease-out;
    margin-bottom: 2rem;
}
.dna-logo { display: flex; justify-content: center; gap: 6px; margin-bottom: 1.5rem; }
.dna-dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; }
.dna-dot:nth-child(1) { background: linear-gradient(135deg, #06d6a0, #22d3ee); animation: helixFloat 2s ease-in-out infinite; }
.dna-dot:nth-child(2) { background: linear-gradient(135deg, #7c3aed, #a78bfa); animation: helixFloat 2s ease-in-out infinite 0.3s; }
.dna-dot:nth-child(3) { background: linear-gradient(135deg, #06d6a0, #22d3ee); animation: helixFloat 2s ease-in-out infinite 0.6s; }
.dna-dot:nth-child(4) { background: linear-gradient(135deg, #7c3aed, #a78bfa); animation: helixFloat 2s ease-in-out infinite 0.9s; }
.dna-dot:nth-child(5) { background: linear-gradient(135deg, #06d6a0, #22d3ee); animation: helixFloat 2s ease-in-out infinite 1.2s; }
.login-title {
    margin: 0 0 0.5rem; font-size: 2.5rem; font-family: 'Outfit', sans-serif; font-weight: 800;
    background: linear-gradient(135deg, #06d6a0, #22d3ee, #7c3aed); background-size: 200% 200%;
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: gradientShift 6s ease infinite; text-align: center;
}
.login-subtitle { font-family: 'DM Sans', sans-serif; color: #94a3b8; font-size: 1rem; margin: 0 0 2rem; text-align: center; }
.login-divider { display: flex; align-items: center; text-align: center; margin: 1.5rem 0; color: #64748b; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; }
.login-divider::before, .login-divider::after { content: ''; flex: 1; border-bottom: 1px solid rgba(148, 163, 184, 0.15); }
.login-divider span { padding: 0 1rem; }
.trust-footer {
    text-align: center; padding: 1.5rem 2rem; background: rgba(17, 24, 39, 0.4);
    border: 1px solid rgba(148, 163, 184, 0.08); border-radius: 20px; animation: fadeSlideUp 0.6s ease-out 0.2s both;
}
.trust-footer p { color: #94a3b8; font-size: 0.85rem; margin: 0.5rem 0; font-family: 'DM Sans', sans-serif; }
.trust-footer .lock-icon { color: #06d6a0; font-size: 1.2rem; margin-right: 0.5rem; }
.password-strength { height: 4px; border-radius: 2px; margin-top: 8px; transition: all 0.3s ease; }
.strength-weak { background: #ef4444; width: 33%; }
.strength-medium { background: #f59e0b; width: 66%; }
.strength-strong { background: #06d6a0; width: 100%; }
.center-text { text-align: center; margin-top: 1.5rem; color: #94a3b8; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; }

/* ========== Save badge ========== */
.save-badge {
    display: inline-block; background: linear-gradient(135deg, #f59e0b, #ef4444);
    color: white; padding: 4px 12px; border-radius: 8px; font-size: 0.75rem;
    font-weight: 700; font-family: 'Outfit', sans-serif; letter-spacing: 0.03em; margin-left: 8px; vertical-align: middle;
}
.current-badge {
    display: inline-block; background: linear-gradient(135deg, #06d6a0, #22d3ee);
    color: #0a0e1a; padding: 8px 20px; border-radius: 10px; font-size: 0.85rem;
    font-weight: 700; font-family: 'Outfit', sans-serif; letter-spacing: 0.05em;
    text-transform: uppercase; margin-top: 16px; box-shadow: 0 4px 12px rgba(6,214,160,0.3);
}

/* ========== Current Plan Card ========== */
.current-plan-card {
    background: linear-gradient(135deg, #0d1321 0%, #111827 40%, #1a1040 100%);
    border: 1px solid rgba(148,163,184,0.12); border-radius: 20px; padding: 28px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.4); animation: glowPulse 4s ease-in-out infinite; margin-bottom: 2rem;
}

/* ========== Comparison table ========== */
.comparison-table {
    background: var(--bg-elevated); border: 1px solid var(--border-subtle);
    border-radius: 16px; padding: 24px; margin: 2rem 0;
}

/* ========== Custom top navbar ========== */
.mergenix-navbar {
    background: linear-gradient(135deg, rgba(10,14,26,0.97) 0%, rgba(17,24,39,0.97) 100%);
    border-bottom: 1px solid rgba(148,163,184,0.12);
    padding: 12px 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: -1rem -1rem 1.5rem -1rem;
    border-radius: 0 0 16px 16px;
    backdrop-filter: blur(12px);
    box-shadow: 0 4px 24px rgba(0,0,0,0.3);
    animation: fadeSlideUp 0.4s ease-out;
    flex-wrap: wrap;
    gap: 8px;
}
.mergenix-navbar .nav-brand {
    display: flex; align-items: center; gap: 10px; text-decoration: none !important;
}
.mergenix-navbar .nav-brand .brand-text {
    font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 1.4rem;
    background: linear-gradient(135deg, #06d6a0, #22d3ee);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.mergenix-navbar .nav-links {
    display: flex; align-items: center; gap: 4px; flex-wrap: wrap;
}
.mergenix-navbar .nav-link {
    padding: 8px 16px; border-radius: 10px; font-family: 'Outfit', sans-serif;
    font-weight: 500; font-size: 0.9rem; color: #94a3b8 !important;
    text-decoration: none !important; transition: all 0.2s ease;
}
.mergenix-navbar .nav-link:hover {
    color: #06d6a0 !important; background: rgba(6,214,160,0.06);
}
.mergenix-navbar .nav-link.active {
    color: #06d6a0 !important; background: rgba(6,214,160,0.1);
    border: 1px solid rgba(6,214,160,0.2);
}
.mergenix-navbar .nav-actions {
    display: flex; align-items: center; gap: 8px;
}
.mergenix-navbar .nav-btn {
    padding: 8px 18px; border-radius: 10px; font-family: 'Outfit', sans-serif;
    font-weight: 600; font-size: 0.85rem; text-decoration: none !important; transition: all 0.2s ease;
    border: none; cursor: pointer;
}
.mergenix-navbar .nav-btn.signin {
    color: #06d6a0 !important; background: rgba(6,214,160,0.08); border: 1px solid rgba(6,214,160,0.2);
}
.mergenix-navbar .nav-btn.signin:hover {
    background: rgba(6,214,160,0.15); border-color: rgba(6,214,160,0.4);
}
.mergenix-navbar .nav-btn.cta {
    color: #0a0e1a !important; background: linear-gradient(135deg, #06d6a0, #059669);
    box-shadow: 0 2px 12px rgba(6,214,160,0.3);
}
.mergenix-navbar .nav-btn.cta:hover {
    box-shadow: 0 4px 20px rgba(6,214,160,0.5); transform: translateY(-1px);
}
.mergenix-navbar .nav-user {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 14px; border-radius: 10px; background: rgba(6,214,160,0.08);
    border: 1px solid rgba(6,214,160,0.15);
}
.mergenix-navbar .nav-user-name {
    font-family: 'DM Sans', sans-serif; font-weight: 500; font-size: 0.85rem; color: #e2e8f0;
}
.mergenix-navbar .nav-user-tier {
    font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 0.7rem;
    text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 8px;
    border-radius: 6px;
}
.nav-user-tier.free { background: rgba(148,163,184,0.15); color: #94a3b8; }
.nav-user-tier.premium { background: rgba(124,58,237,0.15); color: #a78bfa; }
.nav-user-tier.pro { background: rgba(6,214,160,0.15); color: #06d6a0; }

/* ========== Homepage-specific ========== */
.hero-section {
    text-align: center; padding: 4rem 2rem 3rem;
    background: linear-gradient(135deg, #0d1321 0%, #111827 40%, #1a1040 100%);
    border-radius: 28px; margin-bottom: 2rem; position: relative; overflow: hidden;
    border: 1px solid rgba(148,163,184,0.12); animation: pulseGlow 4s ease-in-out infinite;
}
.hero-section::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    background: repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(6,214,160,0.01) 50px, rgba(6,214,160,0.01) 51px);
    animation: subtleScan 25s linear infinite; pointer-events: none;
}
.how-it-works-card {
    background: linear-gradient(135deg, #111827 0%, #1a2236 100%);
    border: 1px solid rgba(148,163,184,0.12); border-radius: 20px; padding: 2rem 1.5rem;
    text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.4);
    transition: transform 0.3s ease, box-shadow 0.3s ease; animation: cardReveal 0.5s ease-out both;
}
.how-it-works-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(6,214,160,0.12);
}
.how-it-works-card .step-number {
    display: inline-flex; align-items: center; justify-content: center;
    width: 40px; height: 40px; border-radius: 50%;
    background: linear-gradient(135deg, #06d6a0, #059669);
    color: #0a0e1a; font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 1.1rem;
    margin-bottom: 1rem;
}
.trust-badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 16px; border-radius: 10px;
    background: rgba(6,214,160,0.06); border: 1px solid rgba(6,214,160,0.15);
    font-family: 'DM Sans', sans-serif; font-size: 0.82rem; color: #94a3b8;
}
.popular-badge {
    position: absolute; top: -1px; left: 50%; transform: translateX(-50%);
    background: linear-gradient(135deg, #7c3aed, #a78bfa);
    color: white; padding: 4px 16px; border-radius: 0 0 10px 10px;
    font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 0.75rem;
    letter-spacing: 0.05em; text-transform: uppercase;
}
</style>
"""


def inject_global_css() -> None:
    """Inject the single, canonical CSS block for the entire app."""
    st.markdown(_GLOBAL_CSS, unsafe_allow_html=True)
