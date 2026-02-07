"""
Mergenix — Centralized CSS theme.

ALL CSS for the entire application lives here.  Called once from the
entry-point router (app.py) so that every page inherits a consistent
bioluminescent-laboratory aesthetic without duplicating a single line.

Design tokens are exposed as Python constants so other UI modules can
reference them when building inline styles.

Design direction: "Bioluminescent Laboratory"
Deep-sea bioluminescence meets precision lab equipment.
"""

import streamlit as st

# ---------------------------------------------------------------------------
# Design tokens
# ---------------------------------------------------------------------------
BG_DEEP = "#050810"
BG_SURFACE = "#0c1220"
BG_ELEVATED = "#141e33"
BG_GLASS = "rgba(12, 18, 32, 0.65)"
ACCENT_TEAL = "#06d6a0"
ACCENT_VIOLET = "#8b5cf6"
ACCENT_CYAN = "#06b6d4"
ACCENT_AMBER = "#f59e0b"
ACCENT_ROSE = "#f43f5e"
TEXT_PRIMARY = "#e2e8f0"
TEXT_MUTED = "#94a3b8"
TEXT_DIM = "#64748b"
BORDER_SUBTLE = "rgba(148, 163, 184, 0.10)"
GLOW_TEAL = "rgba(6, 214, 160, 0.25)"
GLOW_VIOLET = "rgba(139, 92, 246, 0.20)"

FONT_HEADING = "'Sora', sans-serif"
FONT_BODY = "'Lexend', sans-serif"
FONT_MONO = "'JetBrains Mono', monospace"

# Severity / status colour maps (reusable by Python helpers)
SEVERITY_COLORS = {
    "high": (ACCENT_ROSE, "rgba(244,63,94,0.15)", "rgba(244,63,94,0.4)"),
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
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Lexend:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

/* ========== CSS Variables ========== */
:root {
    --bg-deep: #050810;
    --bg-surface: #0c1220;
    --bg-elevated: #141e33;
    --bg-glass: rgba(12, 18, 32, 0.65);
    --accent-teal: #06d6a0;
    --accent-violet: #8b5cf6;
    --accent-cyan: #06b6d4;
    --accent-amber: #f59e0b;
    --accent-rose: #f43f5e;
    --text-primary: #e2e8f0;
    --text-muted: #94a3b8;
    --text-dim: #64748b;
    --border-subtle: rgba(148, 163, 184, 0.10);
    --glow-teal: rgba(6, 214, 160, 0.25);
    --glow-violet: rgba(139, 92, 246, 0.20);
    --glass-blur: 16px;
    --glass-border: rgba(148, 163, 184, 0.08);
}

/* ========== Animations ========== */
@keyframes helixFloat {
    0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.7; }
    50% { transform: translateY(-10px) rotate(180deg); opacity: 1; }
}
@keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}
@keyframes biolumPulse {
    0%, 100% { box-shadow: 0 0 20px rgba(6, 214, 160, 0.08), 0 4px 30px rgba(0,0,0,0.5); }
    50% { box-shadow: 0 0 40px rgba(6, 214, 160, 0.20), 0 4px 30px rgba(0,0,0,0.5); }
}
@keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}
@keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
}
@keyframes borderGlow {
    0%, 100% { border-color: rgba(6, 214, 160, 0.10); }
    50% { border-color: rgba(6, 214, 160, 0.35); }
}
@keyframes countUp {
    from { opacity: 0; transform: translateY(12px) scale(0.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes cardReveal {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
}
@keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 20px rgba(6,214,160,0.06), 0 4px 30px rgba(0,0,0,0.5); }
    50% { box-shadow: 0 0 35px rgba(6,214,160,0.18), 0 4px 30px rgba(0,0,0,0.5); }
}
@keyframes subtleScan {
    0% { background-position: 0% 0%; }
    100% { background-position: 0% 100%; }
}
@keyframes glassFadeIn {
    from { opacity: 0; backdrop-filter: blur(0px); transform: translateY(16px); }
    to { opacity: 1; backdrop-filter: blur(var(--glass-blur)); transform: translateY(0); }
}
@keyframes breathe {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
}
@keyframes dnaStrandSpin {
    0% { transform: rotateY(0deg); }
    100% { transform: rotateY(360deg); }
}
@keyframes borderRainbow {
    0% { border-color: rgba(6,214,160,0.3); }
    33% { border-color: rgba(139,92,246,0.3); }
    66% { border-color: rgba(6,182,212,0.3); }
    100% { border-color: rgba(6,214,160,0.3); }
}
@keyframes noiseShift {
    0% { transform: translate(0, 0); }
    10% { transform: translate(-5%, -5%); }
    20% { transform: translate(-10%, 5%); }
    30% { transform: translate(5%, -10%); }
    40% { transform: translate(-5%, 15%); }
    50% { transform: translate(-10%, 5%); }
    60% { transform: translate(15%, 0); }
    70% { transform: translate(0, 10%); }
    80% { transform: translate(-15%, 0); }
    90% { transform: translate(10%, 5%); }
    100% { transform: translate(5%, 0); }
}
@keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 20px rgba(6, 214, 160, 0.08); }
    50% { box-shadow: 0 0 50px rgba(6, 214, 160, 0.22); }
}

/* ========== Global ========== */
.stApp {
    background: linear-gradient(160deg, #050810 0%, #0c1220 40%, #0f0a24 70%, #050810 100%);
}
/* Noise texture overlay */
.stApp::before {
    content: '';
    position: fixed;
    top: -50%;
    left: -50%;
    right: -50%;
    bottom: -50%;
    width: 200%;
    height: 200%;
    background: repeating-conic-gradient(rgba(148,163,184,0.015) 0% 25%, transparent 0% 50%) 0 0 / 3px 3px;
    animation: noiseShift 8s steps(10) infinite;
    pointer-events: none;
    z-index: 0;
    opacity: 0.6;
}
.block-container {
    padding-top: 1rem;
    max-width: 1200px;
    animation: fadeSlideUp 0.6s ease-out;
    position: relative;
    z-index: 1;
}
html, body, [data-testid="stAppViewContainer"], .main {
    font-family: 'Lexend', sans-serif !important;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}
h1, h2, h3, h4, h5 {
    font-family: 'Sora', sans-serif !important;
    letter-spacing: -0.01em;
}
code, pre, .stCode {
    font-family: 'JetBrains Mono', monospace !important;
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

/* ========== Glass card mixin (applied via class) ========== */
.glass-card {
    background: var(--bg-glass);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    border-radius: 20px;
}

/* ========== Metrics Cards ========== */
div[data-testid="stMetric"] {
    background: var(--bg-glass);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--border-subtle);
    border-radius: 18px;
    padding: 22px;
    box-shadow: 0 4px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03);
    transition: transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s ease, border-color 0.3s ease;
    animation: countUp 0.5s ease-out both;
    position: relative;
    overflow: hidden;
}
div[data-testid="stMetric"]::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--accent-teal), var(--accent-violet), var(--accent-cyan));
    background-size: 200% 100%;
    animation: gradientShift 4s ease infinite;
    opacity: 0.7;
}
div[data-testid="stMetric"]:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 40px rgba(0,0,0,0.5), 0 0 30px var(--glow-teal);
    border-color: rgba(6,214,160,0.25);
}
div[data-testid="stMetric"] label {
    color: var(--accent-cyan) !important;
    font-size: 0.78rem !important;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-family: 'Sora', sans-serif !important;
    font-weight: 500 !important;
}
div[data-testid="stMetric"] [data-testid="stMetricValue"] {
    color: var(--accent-teal) !important;
    font-family: 'Sora', sans-serif !important;
    font-weight: 800 !important;
    font-size: 2rem !important;
}

/* ========== Tabs ========== */
.stTabs [data-baseweb="tab-list"] {
    gap: 8px;
    background: var(--bg-glass);
    backdrop-filter: blur(12px);
    border-radius: 16px;
    padding: 6px;
    border: 1px solid var(--border-subtle);
}
.stTabs [data-baseweb="tab"] {
    border-radius: 12px;
    padding: 10px 22px;
    color: var(--text-muted);
    font-weight: 500;
    font-family: 'Sora', sans-serif;
    transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
}
.stTabs [data-baseweb="tab"]:hover {
    color: var(--accent-teal);
    background: rgba(6,214,160,0.06);
}
.stTabs [aria-selected="true"] {
    background: linear-gradient(135deg, #06d6a0, #059669) !important;
    color: #050810 !important;
    font-weight: 700 !important;
    box-shadow: 0 2px 12px rgba(6,214,160,0.3);
}

/* ========== Expanders ========== */
.streamlit-expanderHeader {
    background: var(--bg-glass);
    backdrop-filter: blur(10px);
    border-radius: 14px;
    border: 1px solid var(--border-subtle);
    font-weight: 500;
    font-family: 'Lexend', sans-serif;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
}
.streamlit-expanderHeader:hover {
    border-color: rgba(6,214,160,0.25);
    box-shadow: 0 0 15px rgba(6,214,160,0.06);
}
.streamlit-expanderContent {
    background: rgba(5,8,16,0.6);
    backdrop-filter: blur(8px);
    border: 1px solid var(--border-subtle);
    border-top: none;
    border-radius: 0 0 14px 14px;
}

/* ========== Buttons ========== */
.stButton > button[kind="primary"] {
    background: linear-gradient(135deg, #06d6a0 0%, #059669 50%, #047857 100%);
    border: none;
    border-radius: 14px;
    padding: 14px 28px;
    font-weight: 700;
    font-size: 1.05rem;
    font-family: 'Sora', sans-serif;
    letter-spacing: 0.02em;
    color: #050810 !important;
    box-shadow: 0 4px 24px rgba(6, 214, 160, 0.3), inset 0 1px 0 rgba(255,255,255,0.15);
    transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
}
.stButton > button[kind="primary"]:hover {
    box-shadow: 0 8px 40px rgba(6, 214, 160, 0.5), inset 0 1px 0 rgba(255,255,255,0.15);
    transform: translateY(-2px);
}
.stButton > button {
    border-radius: 12px;
    font-family: 'Sora', sans-serif;
    font-weight: 600;
    transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
}

/* ========== File Uploader ========== */
[data-testid="stFileUploader"] {
    background: var(--bg-glass);
    backdrop-filter: blur(12px);
    border: 2px dashed rgba(6, 214, 160, 0.18);
    border-radius: 18px;
    padding: 22px;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
}
[data-testid="stFileUploader"]:hover {
    border-color: rgba(6, 214, 160, 0.45);
    box-shadow: 0 0 30px rgba(6, 214, 160, 0.08);
}

/* ========== Progress Bar ========== */
.stProgress > div > div {
    background: linear-gradient(90deg, #06d6a0, #8b5cf6, #06b6d4);
    background-size: 200% 100%;
    animation: gradientShift 3s ease infinite;
    border-radius: 10px;
}

/* ========== Sidebar ========== */
[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #050810 0%, #0c1220 100%);
    border-right: 1px solid var(--border-subtle);
}

/* ========== Scrollbar ========== */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--bg-deep); }
::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #06d6a0, #8b5cf6);
    border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover { background: var(--accent-teal); }

/* ========== Alerts ========== */
.stAlert { border-radius: 14px; }

/* ========== Links ========== */
a { color: var(--accent-teal) !important; transition: color 0.2s ease, text-shadow 0.2s ease; }
a:hover { color: var(--accent-cyan) !important; text-shadow: 0 0 8px rgba(6,182,212,0.3); }

/* ========== Dividers ========== */
hr { border-color: var(--border-subtle) !important; }

/* ========== Select / Input ========== */
.stSelectbox > div > div, .stTextInput > div > div > input,
.stMultiSelect > div > div {
    background: var(--bg-elevated) !important;
    border-color: var(--border-subtle) !important;
    border-radius: 12px !important;
    font-family: 'Lexend', sans-serif !important;
}

/* ========== Dataframe ========== */
[data-testid="stDataFrame"] {
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid rgba(148,163,184,0.08);
}

/* ========== Catalog-specific: metric row ========== */
.catalog-metric {
    background: var(--bg-glass);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid var(--border-subtle);
    border-radius: 18px;
    padding: 24px 20px;
    text-align: center;
    box-shadow: 0 4px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03);
    transition: transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s ease, border-color 0.3s ease;
    animation: countUp 0.5s ease-out both;
    position: relative;
    overflow: hidden;
}
.catalog-metric::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--accent-teal), var(--accent-violet), var(--accent-cyan));
    background-size: 200% 100%;
    animation: gradientShift 4s ease infinite;
}
.catalog-metric:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.5), 0 0 30px var(--glow-teal);
    border-color: rgba(6,214,160,0.25);
}
.catalog-metric .metric-icon { font-size: 1.6rem; margin-bottom: 8px; display: block; }
.catalog-metric .metric-value {
    font-family: 'Sora', sans-serif; font-weight: 800; font-size: 2rem; color: #06d6a0; line-height: 1.1;
}
.catalog-metric .metric-label {
    font-family: 'Sora', sans-serif; font-weight: 500; font-size: 0.78rem;
    color: #06b6d4; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 6px;
}

/* ========== Disease card ========== */
.disease-card {
    background: var(--bg-glass);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--border-subtle);
    border-radius: 18px; padding: 24px; margin-bottom: 12px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.02);
    transition: transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s ease, border-color 0.4s ease;
    animation: cardReveal 0.4s ease-out both;
    position: relative; overflow: hidden;
}
.disease-card::after {
    content: ''; position: absolute; top: 0; right: 0; bottom: 0; width: 3px; border-radius: 0 18px 18px 0;
}
.disease-card.sev-high::after { background: linear-gradient(180deg, #f43f5e, #e11d48); }
.disease-card.sev-moderate::after { background: linear-gradient(180deg, #f59e0b, #d97706); }
.disease-card.sev-low::after { background: linear-gradient(180deg, #06d6a0, #059669); }
.disease-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.5), 0 0 20px var(--glow-teal);
    border-color: rgba(6,214,160,0.2);
    animation: borderRainbow 3s ease infinite;
}
.disease-card h4 { margin: 0 0 8px; font-family: 'Sora', sans-serif; font-weight: 700; color: #f1f5f9; font-size: 1.1rem; }
.disease-card .desc { color: #94a3b8; font-size: 0.9rem; line-height: 1.6; margin: 10px 0; font-family: 'Lexend', sans-serif; }
.disease-card .meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
.disease-card .meta-tag {
    background: rgba(148,163,184,0.06); border: 1px solid rgba(148,163,184,0.08);
    border-radius: 10px; padding: 5px 12px; font-size: 0.8rem; color: #cbd5e1; font-family: 'Lexend', sans-serif;
    backdrop-filter: blur(4px);
}
.disease-card .meta-tag b { color: #06b6d4; font-weight: 600; }

/* ========== Severity badge ========== */
.sev-badge {
    display: inline-block; padding: 3px 12px; border-radius: 10px; font-size: 0.75rem;
    font-weight: 600; font-family: 'Sora', sans-serif; letter-spacing: 0.03em; vertical-align: middle; margin-left: 8px;
}
.sev-badge.high { background: rgba(244,63,94,0.15); color: #f43f5e; border: 1px solid rgba(244,63,94,0.4); }
.sev-badge.moderate { background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.4); }
.sev-badge.low { background: rgba(6,214,160,0.15); color: #06d6a0; border: 1px solid rgba(6,214,160,0.4); }

/* ========== Insight card ========== */
.insight-card {
    background: var(--bg-glass);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid var(--border-subtle); border-radius: 18px; padding: 22px; text-align: center;
    box-shadow: 0 4px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03);
    animation: glowPulse 5s ease-in-out infinite;
    transition: transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s ease;
}
.insight-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.5), 0 0 25px var(--glow-teal);
}
.insight-card .insight-icon { font-size: 1.8rem; margin-bottom: 8px; display: block; }
.insight-card .insight-title {
    font-family: 'Sora', sans-serif; font-weight: 300; font-size: 0.78rem;
    color: #64748b; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 6px;
}
.insight-card .insight-value { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 1rem; color: #e2e8f0; line-height: 1.4; }
.insight-card .insight-sub { font-family: 'Lexend', sans-serif; font-size: 0.82rem; color: #94a3b8; margin-top: 6px; }

/* ========== Section headers ========== */
.section-header { text-align: center; margin: 2.5rem 0 1.5rem; animation: fadeSlideUp 0.5s ease-out; }
.section-header h2 {
    margin: 0; font-family: 'Sora', sans-serif; font-weight: 700;
    background: linear-gradient(135deg, #06d6a0, #06b6d4);
    background-size: 200% 200%; -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    animation: gradientShift 6s ease infinite;
}
.section-header p { font-family: 'Lexend', sans-serif; color: #64748b; font-size: 0.9rem; margin: 6px 0 0; }

/* ========== Pagination ========== */
.pagination-info { text-align: center; font-family: 'Lexend', sans-serif; color: #94a3b8; font-size: 0.85rem; margin: 12px 0; }

/* ========== Pricing card ========== */
.pricing-card {
    background: var(--bg-glass);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid var(--border-subtle); border-radius: 22px; padding: 32px 24px;
    text-align: center; box-shadow: 0 4px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03);
    transition: transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s ease, border-color 0.4s ease;
    animation: cardReveal 0.5s ease-out both; position: relative; overflow: hidden;
    height: 100%; display: flex; flex-direction: column;
}
.pricing-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; }
.pricing-card.free::before { background: linear-gradient(90deg, #94a3b8, #64748b); }
.pricing-card.premium::before { background: linear-gradient(90deg, #8b5cf6, #a78bfa); }
.pricing-card.pro::before { background: linear-gradient(90deg, #06d6a0, #06b6d4); }
.pricing-card.popular {
    border-color: rgba(139,92,246,0.4);
    box-shadow: 0 4px 30px rgba(0,0,0,0.4), 0 0 50px rgba(139,92,246,0.12);
}
.pricing-card.current {
    border-color: rgba(6,214,160,0.35);
    box-shadow: 0 4px 30px rgba(0,0,0,0.4), 0 0 40px rgba(6,214,160,0.12);
}
.pricing-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 16px 50px rgba(0,0,0,0.5), 0 0 30px var(--glow-teal);
    border-color: rgba(6,214,160,0.2);
}
.pricing-card .tier-name { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 1.8rem; color: #e2e8f0; margin-bottom: 12px; }
.pricing-card .tier-price { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 2.5rem; color: #06d6a0; margin-bottom: 8px; }
.pricing-card .tier-price small { font-size: 1rem; color: #94a3b8; font-weight: 400; }
.pricing-card .tier-description { font-family: 'Lexend', sans-serif; font-size: 0.9rem; color: #94a3b8; margin-bottom: 24px; min-height: 40px; }
.pricing-card .feature-list { text-align: left; margin-bottom: 24px; flex-grow: 1; }
.pricing-card .feature-item {
    font-family: 'Lexend', sans-serif; font-size: 0.9rem; color: #cbd5e1;
    margin-bottom: 12px; display: flex; align-items: flex-start; line-height: 1.5;
}
.pricing-card .feature-item .check { color: #06d6a0; margin-right: 10px; font-size: 1.1rem; flex-shrink: 0; }

/* ========== Tier badge ========== */
.tier-badge {
    display: inline-block; padding: 6px 16px; border-radius: 12px; font-size: 0.85rem;
    font-weight: 700; font-family: 'Sora', sans-serif; letter-spacing: 0.05em;
    text-transform: uppercase; vertical-align: middle; margin-left: 8px;
}
.tier-badge.free { background: rgba(148,163,184,0.12); color: #94a3b8; border: 1px solid rgba(148,163,184,0.3); }
.tier-badge.premium { background: rgba(139,92,246,0.12); color: #8b5cf6; border: 1px solid rgba(139,92,246,0.3); }
.tier-badge.pro { background: rgba(6,214,160,0.12); color: #06d6a0; border: 1px solid rgba(6,214,160,0.3); }

/* ========== FAQ item ========== */
.faq-item {
    background: var(--bg-glass); backdrop-filter: blur(10px);
    border: 1px solid var(--border-subtle);
    border-radius: 14px; padding: 22px; margin-bottom: 16px;
    transition: border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease;
}
.faq-item:hover {
    border-color: rgba(6,214,160,0.25);
    box-shadow: 0 0 20px rgba(6,214,160,0.06);
    transform: translateY(-2px);
}
.faq-item .question { font-family: 'Sora', sans-serif; font-weight: 600; font-size: 1.05rem; color: #e2e8f0; margin-bottom: 8px; }
.faq-item .answer { font-family: 'Lexend', sans-serif; font-size: 0.9rem; color: #94a3b8; line-height: 1.65; }

/* ========== Auth page ========== */
.login-card {
    background: var(--bg-glass);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--border-subtle);
    border-radius: 28px; padding: 3rem 2.5rem;
    animation: biolumPulse 5s ease-in-out infinite, glassFadeIn 0.6s ease-out;
    margin-bottom: 2rem;
    box-shadow: 0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03);
}
.dna-logo { display: flex; justify-content: center; gap: 8px; margin-bottom: 1.5rem; }
.dna-dot { display: inline-block; width: 14px; height: 14px; border-radius: 50%; }
.dna-dot:nth-child(1) { background: linear-gradient(135deg, #06d6a0, #06b6d4); animation: helixFloat 2.2s ease-in-out infinite; box-shadow: 0 0 12px rgba(6,214,160,0.4); }
.dna-dot:nth-child(2) { background: linear-gradient(135deg, #8b5cf6, #a78bfa); animation: helixFloat 2.2s ease-in-out infinite 0.3s; box-shadow: 0 0 12px rgba(139,92,246,0.4); }
.dna-dot:nth-child(3) { background: linear-gradient(135deg, #06d6a0, #06b6d4); animation: helixFloat 2.2s ease-in-out infinite 0.6s; box-shadow: 0 0 12px rgba(6,214,160,0.4); }
.dna-dot:nth-child(4) { background: linear-gradient(135deg, #8b5cf6, #a78bfa); animation: helixFloat 2.2s ease-in-out infinite 0.9s; box-shadow: 0 0 12px rgba(139,92,246,0.4); }
.dna-dot:nth-child(5) { background: linear-gradient(135deg, #06d6a0, #06b6d4); animation: helixFloat 2.2s ease-in-out infinite 1.2s; box-shadow: 0 0 12px rgba(6,214,160,0.4); }
.login-title {
    margin: 0 0 0.5rem; font-size: 2.5rem; font-family: 'Sora', sans-serif; font-weight: 800;
    background: linear-gradient(135deg, #06d6a0, #06b6d4, #8b5cf6); background-size: 200% 200%;
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: gradientShift 6s ease infinite; text-align: center;
}
.login-subtitle { font-family: 'Lexend', sans-serif; color: #94a3b8; font-size: 1rem; margin: 0 0 2rem; text-align: center; }
.login-divider { display: flex; align-items: center; text-align: center; margin: 1.5rem 0; color: #64748b; font-family: 'Lexend', sans-serif; font-size: 0.85rem; }
.login-divider::before, .login-divider::after { content: ''; flex: 1; border-bottom: 1px solid rgba(148, 163, 184, 0.1); }
.login-divider span { padding: 0 1rem; }
.trust-footer {
    text-align: center; padding: 1.5rem 2rem;
    background: var(--bg-glass); backdrop-filter: blur(10px);
    border: 1px solid var(--border-subtle); border-radius: 20px;
    animation: fadeSlideUp 0.6s ease-out 0.2s both;
}
.trust-footer p { color: #94a3b8; font-size: 0.85rem; margin: 0.5rem 0; font-family: 'Lexend', sans-serif; }
.trust-footer .lock-icon { color: #06d6a0; font-size: 1.2rem; margin-right: 0.5rem; }
.password-strength { height: 4px; border-radius: 2px; margin-top: 8px; transition: all 0.3s ease; }
.strength-weak { background: linear-gradient(90deg, #f43f5e, #e11d48); width: 33%; }
.strength-medium { background: linear-gradient(90deg, #f59e0b, #d97706); width: 66%; }
.strength-strong { background: linear-gradient(90deg, #06d6a0, #059669); width: 100%; }
.center-text { text-align: center; margin-top: 1.5rem; color: #94a3b8; font-family: 'Lexend', sans-serif; font-size: 0.9rem; }

/* ========== Save badge ========== */
.save-badge {
    display: inline-block; background: linear-gradient(135deg, #f59e0b, #f43f5e);
    color: white; padding: 4px 12px; border-radius: 8px; font-size: 0.75rem;
    font-weight: 700; font-family: 'Sora', sans-serif; letter-spacing: 0.03em; margin-left: 8px; vertical-align: middle;
}
.current-badge {
    display: inline-block; background: linear-gradient(135deg, #06d6a0, #06b6d4);
    color: #050810; padding: 8px 20px; border-radius: 12px; font-size: 0.85rem;
    font-weight: 700; font-family: 'Sora', sans-serif; letter-spacing: 0.05em;
    text-transform: uppercase; margin-top: 16px; box-shadow: 0 4px 16px rgba(6,214,160,0.3);
}

/* ========== Current Plan Card ========== */
.current-plan-card {
    background: var(--bg-glass); backdrop-filter: blur(14px);
    border: 1px solid var(--border-subtle); border-radius: 22px; padding: 28px;
    box-shadow: 0 4px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03);
    animation: glowPulse 5s ease-in-out infinite; margin-bottom: 2rem;
}

/* ========== Comparison table ========== */
.comparison-table {
    background: var(--bg-glass); backdrop-filter: blur(10px);
    border: 1px solid var(--border-subtle);
    border-radius: 18px; padding: 24px; margin: 2rem 0;
}

/* ========== Custom top navbar ========== */
.mergenix-navbar {
    background: rgba(5,8,16,0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border-subtle);
    padding: 12px 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: -1rem -1rem 1.5rem -1rem;
    border-radius: 0 0 18px 18px;
    box-shadow: 0 4px 30px rgba(0,0,0,0.4);
    animation: fadeSlideUp 0.4s ease-out;
    flex-wrap: wrap;
    gap: 8px;
}
.mergenix-navbar .nav-brand {
    display: flex; align-items: center; gap: 10px; text-decoration: none !important;
}
.mergenix-navbar .nav-brand .brand-text {
    font-family: 'Sora', sans-serif; font-weight: 800; font-size: 1.5rem;
    background: linear-gradient(135deg, #06d6a0, #06b6d4);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    letter-spacing: -0.02em;
}
.mergenix-navbar .nav-links {
    display: flex; align-items: center; gap: 4px; flex-wrap: wrap;
}
.mergenix-navbar .nav-link {
    padding: 8px 16px; border-radius: 12px; font-family: 'Sora', sans-serif;
    font-weight: 500; font-size: 0.88rem; color: #94a3b8 !important;
    text-decoration: none !important; transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
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
    padding: 8px 18px; border-radius: 12px; font-family: 'Sora', sans-serif;
    font-weight: 600; font-size: 0.85rem; text-decoration: none !important;
    transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
    border: none; cursor: pointer;
}
.mergenix-navbar .nav-btn.signin {
    color: #06d6a0 !important; background: rgba(6,214,160,0.08); border: 1px solid rgba(6,214,160,0.2);
}
.mergenix-navbar .nav-btn.signin:hover {
    background: rgba(6,214,160,0.15); border-color: rgba(6,214,160,0.4);
    box-shadow: 0 0 15px rgba(6,214,160,0.1);
}
.mergenix-navbar .nav-btn.cta {
    color: #050810 !important; background: linear-gradient(135deg, #06d6a0, #059669);
    box-shadow: 0 2px 16px rgba(6,214,160,0.3);
}
.mergenix-navbar .nav-btn.cta:hover {
    box-shadow: 0 4px 24px rgba(6,214,160,0.5); transform: translateY(-1px);
}
.mergenix-navbar .nav-user {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 14px; border-radius: 12px;
    background: rgba(6,214,160,0.06); border: 1px solid rgba(6,214,160,0.12);
    backdrop-filter: blur(8px);
}
.mergenix-navbar .nav-user-name {
    font-family: 'Lexend', sans-serif; font-weight: 500; font-size: 0.85rem; color: #e2e8f0;
}
.mergenix-navbar .nav-user-tier {
    font-family: 'Sora', sans-serif; font-weight: 600; font-size: 0.7rem;
    text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 8px;
    border-radius: 6px;
}
.nav-user-tier.free { background: rgba(148,163,184,0.12); color: #94a3b8; }
.nav-user-tier.premium { background: rgba(139,92,246,0.12); color: #a78bfa; }
.nav-user-tier.pro { background: rgba(6,214,160,0.12); color: #06d6a0; }

/* ========== Homepage-specific ========== */
.hero-section {
    text-align: center; padding: 4rem 2rem 3rem;
    background: var(--bg-glass);
    backdrop-filter: blur(16px);
    border-radius: 28px; margin-bottom: 2rem; position: relative; overflow: hidden;
    border: 1px solid var(--border-subtle);
    animation: biolumPulse 5s ease-in-out infinite;
    box-shadow: 0 8px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03);
}
.hero-section::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    background: repeating-linear-gradient(0deg, transparent, transparent 60px, rgba(6,214,160,0.012) 60px, rgba(6,214,160,0.012) 61px);
    animation: subtleScan 30s linear infinite; pointer-events: none;
}
/* DNA Helix decoration in hero */
.hero-section::after {
    content: '';
    position: absolute;
    top: -20%; right: -5%;
    width: 200px; height: 140%;
    background:
        radial-gradient(circle 3px, rgba(6,214,160,0.4) 100%, transparent 100%) 0px 0px / 20px 40px,
        radial-gradient(circle 3px, rgba(139,92,246,0.35) 100%, transparent 100%) 10px 20px / 20px 40px,
        radial-gradient(circle 1.5px, rgba(6,182,212,0.2) 100%, transparent 100%) 5px 10px / 20px 40px;
    animation: subtleScan 20s linear infinite;
    pointer-events: none;
    opacity: 0.5;
    mask-image: linear-gradient(to bottom, transparent 0%, white 20%, white 80%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, transparent 0%, white 20%, white 80%, transparent 100%);
}
.how-it-works-card {
    background: var(--bg-glass);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--border-subtle); border-radius: 22px; padding: 2rem 1.5rem;
    text-align: center; box-shadow: 0 4px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03);
    transition: transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s ease, border-color 0.3s ease;
    animation: cardReveal 0.5s ease-out both;
}
.how-it-works-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.5), 0 0 25px var(--glow-teal);
    border-color: rgba(6,214,160,0.2);
}
.how-it-works-card .step-number {
    display: inline-flex; align-items: center; justify-content: center;
    width: 44px; height: 44px; border-radius: 50%;
    background: linear-gradient(135deg, #06d6a0, #059669);
    color: #050810; font-family: 'Sora', sans-serif; font-weight: 800; font-size: 1.1rem;
    margin-bottom: 1rem;
    box-shadow: 0 4px 16px rgba(6,214,160,0.3);
}
.trust-badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 16px; border-radius: 12px;
    background: rgba(6,214,160,0.05); border: 1px solid rgba(6,214,160,0.12);
    font-family: 'Lexend', sans-serif; font-size: 0.82rem; color: #94a3b8;
    backdrop-filter: blur(6px);
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
}
.trust-badge:hover {
    border-color: rgba(6,214,160,0.25);
    box-shadow: 0 0 12px rgba(6,214,160,0.08);
}
.popular-badge {
    position: absolute; top: -1px; left: 50%; transform: translateX(-50%);
    background: linear-gradient(135deg, #8b5cf6, #a78bfa);
    color: white; padding: 5px 18px; border-radius: 0 0 12px 12px;
    font-family: 'Sora', sans-serif; font-weight: 700; font-size: 0.75rem;
    letter-spacing: 0.05em; text-transform: uppercase;
    box-shadow: 0 4px 12px rgba(139,92,246,0.3);
}
</style>
"""


def inject_global_css() -> None:
    """Inject the single, canonical CSS block for the entire app."""
    st.markdown(_GLOBAL_CSS, unsafe_allow_html=True)
