"""
Mergenix — Centralized CSS theme.

ALL CSS for the entire application lives here.  Called once from the
entry-point router (app.py) so that every page inherits a consistent
aesthetic without duplicating a single line.

Design tokens are exposed as Python constants so other UI modules can
reference them when building inline styles.

Supports dark ("Bioluminescent Laboratory") and light ("Daylight Laboratory")
modes via CSS class toggle on <html>.
"""

import streamlit as st

# ---------------------------------------------------------------------------
# Design tokens (dark mode defaults — also used as Python-side references)
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
TEXT_DIM = "#7c8db5"
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
# Theme helpers
# ---------------------------------------------------------------------------
def get_theme() -> str:
    """Return current theme name: 'dark' or 'light'."""
    return st.session_state.get("theme", "light")


def get_plotly_theme() -> dict:
    """Return a dict of Plotly layout overrides matching the current theme."""
    if get_theme() == "light":
        return {
            "paper_bgcolor": "rgba(0,0,0,0)",
            "plot_bgcolor": "rgba(0,0,0,0)",
            "font_color": "#0f172a",
            "title_font_color": "#0f172a",
            "legend_font_color": "#475569",
            "gridcolor": "rgba(15,23,42,0.06)",
            "tick_font_color": "#475569",
            "axis_title_color": "#64748b",
            "annotation_color": "#059669",
            "line_color": "#0f172a",
        }
    return {
        "paper_bgcolor": "rgba(0,0,0,0)",
        "plot_bgcolor": "rgba(0,0,0,0)",
        "font_color": "#e2e8f0",
        "title_font_color": "#e2e8f0",
        "legend_font_color": "#94a3b8",
        "gridcolor": "rgba(148,163,184,0.06)",
        "tick_font_color": "#94a3b8",
        "axis_title_color": "#64748b",
        "annotation_color": "#06d6a0",
        "line_color": "#050810",
    }


# ---------------------------------------------------------------------------
# Font preload (injected before CSS to avoid render-blocking @import)
# ---------------------------------------------------------------------------
_FONT_PRELOAD = """
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Lexend:wght@400;500&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
"""

# ---------------------------------------------------------------------------
# Global CSS (single <style> block, injected once)
# ---------------------------------------------------------------------------
_GLOBAL_CSS = """
<style>
/* ========== CSS Variables — Dark (default) ========== */
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
    --text-heading: #f1f5f9;
    --text-body: #cbd5e1;
    --text-muted: #94a3b8;
    --text-dim: #7c8db5;
    --border-subtle: rgba(148, 163, 184, 0.10);
    --glow-teal: rgba(6, 214, 160, 0.25);
    --glow-violet: rgba(139, 92, 246, 0.20);
    --glass-blur: 16px;
    --glass-border: rgba(148, 163, 184, 0.08);
    --card-bg: linear-gradient(135deg, #0c1220, #1a2236);
    --card-border: rgba(148, 163, 184, 0.12);
    --shadow-ambient: rgba(0, 0, 0, 0.4);
    --shadow-elevated: rgba(0, 0, 0, 0.5);
    --inset-highlight: rgba(255, 255, 255, 0.03);
    --noise-opacity: 0.6;
    --navbar-bg: rgba(5, 8, 16, 0.85);
    --app-gradient: linear-gradient(160deg, #050810 0%, #0c1220 40%, #0f0a24 70%, #050810 100%);
    --expander-content-bg: rgba(5, 8, 16, 0.6);
    --sidebar-gradient: linear-gradient(180deg, #050810 0%, #0c1220 100%);
    --cta-gradient: linear-gradient(135deg, #080c18 0%, #0c1220 40%, #0f0a24 100%);
}

/* ========== CSS Variables — Light (Daylight Laboratory) ========== */
html.light-mode {
    --bg-deep: #f8fafc;
    --bg-surface: #ffffff;
    --bg-elevated: #f1f5f9;
    --bg-glass: rgba(255, 255, 255, 0.72);
    --accent-teal: #059669;
    --accent-violet: #7c3aed;
    --accent-cyan: #0891b2;
    --accent-amber: #d97706;
    --accent-rose: #e11d48;
    --text-primary: #0f172a;
    --text-heading: #0f172a;
    --text-body: #334155;
    --text-muted: #475569;
    --text-dim: #6b7280;
    --border-subtle: rgba(15, 23, 42, 0.08);
    --glow-teal: rgba(5, 150, 105, 0.15);
    --glow-violet: rgba(124, 58, 237, 0.12);
    --glass-blur: 16px;
    --glass-border: rgba(15, 23, 42, 0.06);
    --card-bg: linear-gradient(135deg, #ffffff, #f8fafc);
    --card-border: rgba(15, 23, 42, 0.08);
    --shadow-ambient: rgba(15, 23, 42, 0.08);
    --shadow-elevated: rgba(15, 23, 42, 0.12);
    --inset-highlight: rgba(255, 255, 255, 0.6);
    --noise-opacity: 0;
    --navbar-bg: rgba(255, 255, 255, 0.85);
    --app-gradient: linear-gradient(160deg, #f8fafc 0%, #ffffff 40%, #f1f5f9 70%, #f8fafc 100%);
    --expander-content-bg: rgba(241, 245, 249, 0.6);
    --sidebar-gradient: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
    --cta-gradient: linear-gradient(135deg, #f1f5f9 0%, #ffffff 40%, #f8fafc 100%);
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
    0%, 100% { box-shadow: 0 0 20px var(--glow-teal), 0 4px 30px var(--shadow-ambient); }
    50% { box-shadow: 0 0 40px var(--glow-teal), 0 4px 30px var(--shadow-ambient); }
}
@keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}
@keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
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
    0%, 100% { box-shadow: 0 0 20px var(--glow-teal), 0 4px 30px var(--shadow-ambient); }
    50% { box-shadow: 0 0 35px var(--glow-teal), 0 4px 30px var(--shadow-ambient); }
}
@keyframes subtleScan {
    0% { background-position: 0% 0%; }
    100% { background-position: 0% 100%; }
}
@keyframes glassFadeIn {
    from { opacity: 0; backdrop-filter: blur(0px); transform: translateY(16px); }
    to { opacity: 1; backdrop-filter: blur(var(--glass-blur)); transform: translateY(0); }
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
/* ========== Global ========== */
.stApp {
    background: var(--app-gradient);
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
    opacity: var(--noise-opacity);
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
    box-shadow: 0 4px 30px var(--shadow-ambient), inset 0 1px 0 var(--inset-highlight);
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
    box-shadow: 0 8px 40px var(--shadow-elevated), 0 0 30px var(--glow-teal);
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
    background: var(--expander-content-bg);
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
    background: var(--sidebar-gradient);
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
    border: 1px solid var(--glass-border);
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
    box-shadow: 0 4px 30px var(--shadow-ambient), inset 0 1px 0 var(--inset-highlight);
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
    box-shadow: 0 12px 40px var(--shadow-elevated), 0 0 30px var(--glow-teal);
    border-color: rgba(6,214,160,0.25);
}
.catalog-metric .metric-icon { font-size: 1.6rem; margin-bottom: 8px; display: block; }
.catalog-metric .metric-value {
    font-family: 'Sora', sans-serif; font-weight: 800; font-size: 2rem; color: var(--accent-teal); line-height: 1.1;
}
.catalog-metric .metric-label {
    font-family: 'Sora', sans-serif; font-weight: 500; font-size: 0.78rem;
    color: var(--accent-cyan); text-transform: uppercase; letter-spacing: 0.1em; margin-top: 6px;
}

/* ========== Disease card ========== */
.disease-card {
    background: var(--bg-glass);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--border-subtle);
    border-radius: 18px; padding: 24px; margin-bottom: 12px;
    box-shadow: 0 4px 24px var(--shadow-ambient), inset 0 1px 0 var(--inset-highlight);
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
    box-shadow: 0 12px 40px var(--shadow-elevated), 0 0 20px var(--glow-teal);
    border-color: rgba(6,214,160,0.2);
    animation: borderRainbow 3s ease infinite;
}
.disease-card h4 { margin: 0 0 8px; font-family: 'Sora', sans-serif; font-weight: 700; color: var(--text-heading); font-size: 1.1rem; }
.disease-card .desc { color: var(--text-muted); font-size: 0.9rem; line-height: 1.6; margin: 10px 0; font-family: 'Lexend', sans-serif; }
.disease-card .meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
.disease-card .meta-tag {
    background: rgba(148,163,184,0.06); border: 1px solid var(--glass-border);
    border-radius: 10px; padding: 5px 12px; font-size: 0.8rem; color: var(--text-body); font-family: 'Lexend', sans-serif;
    backdrop-filter: blur(4px);
}
.disease-card .meta-tag b { color: var(--accent-cyan); font-weight: 600; }

/* ========== Severity badge ========== */
.sev-badge {
    display: inline-block; padding: 3px 12px; border-radius: 10px; font-size: 0.75rem;
    font-weight: 600; font-family: 'Sora', sans-serif; letter-spacing: 0.03em; vertical-align: middle; margin-left: 8px;
}
.sev-badge.high { background: rgba(244,63,94,0.15); color: #f43f5e; border: 1px solid rgba(244,63,94,0.4); }
.sev-badge.high::before { content: "\25B2 "; /* triangle */ }
.sev-badge.moderate { background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.4); }
.sev-badge.moderate::before { content: "\25C6 "; /* diamond */ }
.sev-badge.low { background: rgba(6,214,160,0.15); color: #06d6a0; border: 1px solid rgba(6,214,160,0.4); }
.sev-badge.low::before { content: "\25CF "; /* circle */ }

/* ========== Insight card ========== */
.insight-card {
    background: var(--bg-glass);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid var(--border-subtle); border-radius: 18px; padding: 22px; text-align: center;
    box-shadow: 0 4px 30px var(--shadow-ambient), inset 0 1px 0 var(--inset-highlight);
    animation: glowPulse 5s ease-in-out infinite;
    transition: transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s ease;
}
.insight-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px var(--shadow-elevated), 0 0 25px var(--glow-teal);
}
.insight-card .insight-icon { font-size: 1.8rem; margin-bottom: 8px; display: block; }
.insight-card .insight-title {
    font-family: 'Sora', sans-serif; font-weight: 300; font-size: 0.78rem;
    color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 6px;
}
.insight-card .insight-value { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 1rem; color: var(--text-primary); line-height: 1.4; }
.insight-card .insight-sub { font-family: 'Lexend', sans-serif; font-size: 0.82rem; color: var(--text-muted); margin-top: 6px; }

/* ========== Section headers ========== */
.section-header { text-align: center; margin: 2.5rem 0 1.5rem; animation: fadeSlideUp 0.5s ease-out; }
.section-header h2 {
    margin: 0; font-family: 'Sora', sans-serif; font-weight: 700;
    background: linear-gradient(135deg, #06d6a0, #06b6d4);
    background-size: 200% 200%; -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    animation: gradientShift 6s ease infinite;
}
.section-header p { font-family: 'Lexend', sans-serif; color: var(--text-dim); font-size: 0.9rem; margin: 6px 0 0; }

/* ========== Pagination ========== */
.pagination-info { text-align: center; font-family: 'Lexend', sans-serif; color: var(--text-muted); font-size: 0.85rem; margin: 12px 0; }

/* ========== Pricing card ========== */
.pricing-card {
    background: var(--bg-glass);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid var(--border-subtle); border-radius: 22px; padding: 32px 24px;
    text-align: center; box-shadow: 0 4px 30px var(--shadow-ambient), inset 0 1px 0 var(--inset-highlight);
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
    box-shadow: 0 4px 30px var(--shadow-ambient), 0 0 50px var(--glow-violet);
}
.pricing-card.current {
    border-color: rgba(6,214,160,0.35);
    box-shadow: 0 4px 30px var(--shadow-ambient), 0 0 40px var(--glow-teal);
}
.pricing-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 16px 50px var(--shadow-elevated), 0 0 30px var(--glow-teal);
    border-color: rgba(6,214,160,0.2);
}
.pricing-card .tier-name { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 1.8rem; color: var(--text-primary); margin-bottom: 12px; }
.pricing-card .tier-price { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 2.5rem; color: var(--accent-teal); margin-bottom: 8px; }
.pricing-card .tier-price small { font-size: 1rem; color: var(--text-muted); font-weight: 400; }
.pricing-card .tier-description { font-family: 'Lexend', sans-serif; font-size: 0.9rem; color: var(--text-muted); margin-bottom: 24px; min-height: 40px; }
.pricing-card .feature-list { text-align: left; margin-bottom: 24px; flex-grow: 1; }
.pricing-card .feature-item {
    font-family: 'Lexend', sans-serif; font-size: 0.9rem; color: var(--text-body);
    margin-bottom: 12px; display: flex; align-items: flex-start; line-height: 1.5;
}
.pricing-card .feature-item .check { color: var(--accent-teal); margin-right: 10px; font-size: 1.1rem; flex-shrink: 0; }

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
.faq-item .question { font-family: 'Sora', sans-serif; font-weight: 600; font-size: 1.05rem; color: var(--text-primary); margin-bottom: 8px; }
.faq-item .answer { font-family: 'Lexend', sans-serif; font-size: 0.9rem; color: var(--text-muted); line-height: 1.65; }

/* ========== Auth page ========== */
.login-card {
    background: var(--bg-glass);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--border-subtle);
    border-radius: 28px; padding: 3rem 2.5rem;
    animation: biolumPulse 5s ease-in-out infinite, glassFadeIn 0.6s ease-out;
    margin-bottom: 2rem;
    box-shadow: 0 8px 40px var(--shadow-ambient), inset 0 1px 0 var(--inset-highlight);
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
.login-subtitle { font-family: 'Lexend', sans-serif; color: var(--text-muted); font-size: 1rem; margin: 0 0 2rem; text-align: center; }
.login-divider { display: flex; align-items: center; text-align: center; margin: 1.5rem 0; color: var(--text-dim); font-family: 'Lexend', sans-serif; font-size: 0.85rem; }
.login-divider::before, .login-divider::after { content: ''; flex: 1; border-bottom: 1px solid var(--border-subtle); }
.login-divider span { padding: 0 1rem; }
.trust-footer {
    text-align: center; padding: 1.5rem 2rem;
    background: var(--bg-glass); backdrop-filter: blur(10px);
    border: 1px solid var(--border-subtle); border-radius: 20px;
    animation: fadeSlideUp 0.6s ease-out 0.2s both;
}
.trust-footer p { color: var(--text-muted); font-size: 0.85rem; margin: 0.5rem 0; font-family: 'Lexend', sans-serif; }
.trust-footer .lock-icon { color: var(--accent-teal); font-size: 1.2rem; margin-right: 0.5rem; }
.password-strength { height: 4px; border-radius: 2px; margin-top: 8px; transition: all 0.3s ease; }
.strength-weak { background: linear-gradient(90deg, #f43f5e, #e11d48); width: 33%; }
.strength-medium { background: linear-gradient(90deg, #f59e0b, #d97706); width: 66%; }
.strength-strong { background: linear-gradient(90deg, #06d6a0, #059669); width: 100%; }
.center-text { text-align: center; margin-top: 1.5rem; color: var(--text-muted); font-family: 'Lexend', sans-serif; font-size: 0.9rem; }

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
    box-shadow: 0 4px 30px var(--shadow-ambient), inset 0 1px 0 var(--inset-highlight);
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
    background: var(--navbar-bg);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border-subtle);
    padding: 12px 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: -1rem -1rem 1.5rem -1rem;
    border-radius: 0 0 18px 18px;
    box-shadow: 0 4px 30px var(--shadow-ambient);
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
    font-weight: 500; font-size: 0.88rem; color: var(--text-muted) !important;
    text-decoration: none !important; transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
}
.mergenix-navbar .nav-link:hover {
    color: var(--accent-teal) !important; background: rgba(6,214,160,0.06);
}
.mergenix-navbar .nav-link.active {
    color: var(--accent-teal) !important; background: rgba(6,214,160,0.1);
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
    color: var(--accent-teal) !important; background: rgba(6,214,160,0.08); border: 1px solid rgba(6,214,160,0.2);
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
    font-family: 'Lexend', sans-serif; font-weight: 500; font-size: 0.85rem; color: var(--text-primary);
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
    box-shadow: 0 8px 50px var(--shadow-ambient), inset 0 1px 0 var(--inset-highlight);
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
    text-align: center; box-shadow: 0 4px 30px var(--shadow-ambient), inset 0 1px 0 var(--inset-highlight);
    transition: transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s ease, border-color 0.3s ease;
    animation: cardReveal 0.5s ease-out both;
}
.how-it-works-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 40px var(--shadow-elevated), 0 0 25px var(--glow-teal);
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
    font-family: 'Lexend', sans-serif; font-size: 0.82rem; color: var(--text-muted);
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

/* ========== Theme Toggle ========== */
.theme-toggle {
    display: flex; align-items: center; cursor: pointer; user-select: none;
    padding: 4px; background: var(--bg-elevated);
    border: 1px solid var(--border-subtle); border-radius: 20px;
    transition: all 0.3s ease; position: relative;
    width: 56px; height: 28px;
}
.theme-toggle:hover {
    border-color: rgba(6,214,160,0.3);
    box-shadow: 0 0 12px var(--glow-teal);
}
.theme-toggle .toggle-track {
    width: 100%; height: 100%; position: relative; border-radius: 16px;
}
.theme-toggle .toggle-thumb {
    position: absolute; top: 1px; left: 1px;
    width: 18px; height: 18px; border-radius: 50%;
    background: linear-gradient(135deg, #06d6a0, #059669);
    box-shadow: 0 2px 8px rgba(6,214,160,0.4);
    transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; line-height: 1;
}
html.light-mode .theme-toggle .toggle-thumb {
    transform: translateX(28px);
    background: linear-gradient(135deg, #f59e0b, #d97706);
    box-shadow: 0 2px 8px rgba(245,158,11,0.4);
}
.theme-toggle .icon-moon,
.theme-toggle .icon-sun { position: absolute; top: 50%; transform: translateY(-50%); font-size: 12px; line-height: 1; }
.theme-toggle .icon-moon { left: 6px; }
.theme-toggle .icon-sun { right: 6px; }

/* ========== Focus Visible (Accessibility) ========== */
*:focus-visible {
    outline: 2px solid var(--accent-teal);
    outline-offset: 2px;
    border-radius: 4px;
}
*:focus:not(:focus-visible) {
    outline: none;
}

/* ========== Responsive — Tablet (1024px) ========== */
@media (max-width: 1024px) {
    .block-container { max-width: 95% !important; padding: 0 0.5rem !important; }
    .hero-section { padding: 2.5rem 1.5rem 2rem; }
    .hero-section h1 { font-size: 2.4rem; }
    .hero-section::after { display: none; }
}

/* ========== Responsive — Mobile (768px) ========== */
@media (max-width: 768px) {
    .mergenix-navbar {
        flex-direction: column;
        padding: 10px 1rem;
        gap: 6px;
    }
    .mergenix-navbar .nav-links {
        order: 3;
        width: 100%;
        justify-content: center;
        overflow-x: auto;
        flex-wrap: nowrap;
        -webkit-overflow-scrolling: touch;
        gap: 4px;
    }
    .nav-link {
        padding: 8px 12px;
        font-size: 0.85rem;
        white-space: nowrap;
    }
    .hero-section { padding: 2rem 1rem; border-radius: 16px; }
    .hero-section h1 { font-size: 1.8rem; }
    .hero-section p { font-size: 0.95rem; max-width: 100%; }
    [data-testid="stHorizontalBlock"] {
        flex-direction: column !important;
    }
    [data-testid="stColumn"] {
        width: 100% !important;
        flex: 1 1 100% !important;
    }
    .disease-card { padding: 16px; border-radius: 14px; }
    .pricing-card { padding: 24px 16px; border-radius: 18px; }
    .catalog-metric { padding: 16px 12px; border-radius: 14px; }
    .catalog-metric .metric-value { font-size: 1.5rem; }
    .insight-card { padding: 16px; }
    .step-card { padding: 20px 16px; }
}

/* ========== Responsive — Small Mobile (480px) ========== */
@media (max-width: 480px) {
    .hero-section h1 { font-size: 1.5rem; }
    .mergenix-navbar .brand-text { font-size: 1.2rem; }
    .nav-link { padding: 6px 10px; font-size: 0.8rem; }
    div[data-testid="stMetric"] { padding: 14px !important; }
    div[data-testid="stMetric"] [data-testid="stMetricValue"] { font-size: 1.5rem !important; }
    .disease-card h4 { font-size: 1rem; }
    .meta-tag { font-size: 0.72rem; padding: 3px 8px; }
}

/* ========== Reduced Motion (Accessibility) ========== */
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
    }
}
</style>
"""


# ---------------------------------------------------------------------------
# JavaScript for theme toggling
# ---------------------------------------------------------------------------
def _get_theme_js(theme: str) -> str:
    """Return JS that applies the correct class to <html> and handles toggle clicks."""
    return f"""
<script>
(function() {{
    // Apply theme class on load
    var html = document.documentElement;
    var theme = "{theme}";
    if (theme === "light") {{
        html.classList.add("light-mode");
    }} else {{
        html.classList.remove("light-mode");
    }}

    // Handle toggle clicks — find the hidden Streamlit button and click it
    document.addEventListener("click", function(e) {{
        var toggle = e.target.closest(".theme-toggle");
        if (toggle) {{
            // Find the hidden theme toggle button by its key
            var buttons = parent.document.querySelectorAll('button[kind="secondary"]');
            for (var i = 0; i < buttons.length; i++) {{
                if (buttons[i].textContent.trim() === "theme_toggle_btn") {{
                    buttons[i].click();
                    break;
                }}
            }}
        }}
    }});
}})();
</script>
"""


# ---------------------------------------------------------------------------
# Public injection function
# ---------------------------------------------------------------------------
def inject_global_css() -> None:
    """Inject the single, canonical CSS block for the entire app."""
    theme = get_theme()
    st.markdown(_FONT_PRELOAD, unsafe_allow_html=True)
    st.markdown(_GLOBAL_CSS, unsafe_allow_html=True)
    st.markdown(_get_theme_js(theme), unsafe_allow_html=True)
