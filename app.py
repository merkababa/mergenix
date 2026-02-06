"""
Tortit - Genetic Offspring Analysis Platform

Streamlit web application for analyzing 23andMe genetic data from two parents
to predict offspring traits and carrier risk for recessive diseases.
"""

import os
import sys
import json
import streamlit as st
from io import BytesIO

# ---------------------------------------------------------------------------
# Path setup -- make Source/ importable
# ---------------------------------------------------------------------------
APP_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, APP_DIR)

from Source.parser import (
    get_genotype_stats,
    parse_genetic_file,
    validate_genetic_file,
    detect_format,
)
from Source.carrier_analysis import analyze_carrier_risk
from Source.trait_prediction import (
    predict_offspring_genotypes,
    predict_trait,
    normalize_genotype,
)
from Source.clinvar_client import ClinVarClient
from Source.snpedia_client import SNPediaClient
from Source.auth import AuthManager, render_login_form, render_register_form, get_current_user, render_user_menu
from Source.tier_config import TierType, get_tier_config, get_diseases_for_tier, get_traits_for_tier, get_upgrade_message

# ---------------------------------------------------------------------------
# Data paths
# ---------------------------------------------------------------------------
DATA_DIR = os.path.join(APP_DIR, "data")
CARRIER_PANEL_PATH = os.path.join(DATA_DIR, "carrier_panel.json")
TRAIT_DB_PATH = os.path.join(DATA_DIR, "trait_snps.json")

# ---------------------------------------------------------------------------
# Authentication Manager (cached)
# ---------------------------------------------------------------------------
@st.cache_resource
def get_auth_manager():
    return AuthManager()

# ---------------------------------------------------------------------------
# Dynamic counts (avoid hardcoding "50 diseases" / "30 traits")
# ---------------------------------------------------------------------------
def _count_panel(path):
    try:
        with open(path, "r") as f:
            return len(json.load(f))
    except Exception:
        return "?"

def _count_traits(path):
    try:
        with open(path, "r") as f:
            raw = json.load(f)
        if isinstance(raw, list):
            return len(raw)
        return len(raw.get("snps", []))
    except Exception:
        return "?"

NUM_DISEASES = _count_panel(CARRIER_PANEL_PATH)
NUM_TRAITS = _count_traits(TRAIT_DB_PATH)

# ---------------------------------------------------------------------------
# Trait category mapping (for grouping in the UI)
# ---------------------------------------------------------------------------
TRAIT_CATEGORIES = {
    "Eye Color": "Appearance",
    "Hair Color - Red Hair": "Appearance",
    "Hair Color - Blond Hair": "Appearance",
    "Hair/Skin Pigmentation": "Appearance",
    "Hair Thickness/Straightness": "Appearance",
    "Skin Pigmentation": "Appearance",
    "Skin/Eye Pigmentation": "Appearance",
    "Freckling Tendency": "Appearance",
    "Male Pattern Baldness": "Appearance",
    "Dimples": "Appearance",
    "Cleft Chin": "Appearance",
    "Widow's Peak Hairline": "Appearance",
    "Unibrow Tendency": "Appearance",
    "Eyebrow Thickness": "Appearance",
    "Head Circumference": "Physical",
    "Height": "Physical",
    "Tongue Rolling Ability": "Physical",
    "Handedness Tendency": "Physical",
    "Obesity Risk": "Health & Metabolism",
    "Caffeine Metabolism": "Health & Metabolism",
    "Lactose Tolerance": "Health & Metabolism",
    "Alcohol Flush Reaction": "Health & Metabolism",
    "Sun Sensitivity": "Health & Metabolism",
    "Deep Sleep Quality": "Health & Metabolism",
    "Chronotype (Morning/Night Person)": "Health & Metabolism",
    "Snoring Tendency": "Health & Metabolism",
    "Bitter Taste Perception": "Taste & Senses",
    "Pain Sensitivity": "Taste & Senses",
    "Sweet Taste Preference": "Taste & Senses",
    "Cilantro Taste Aversion": "Taste & Senses",
    "Asparagus Smell Detection": "Taste & Senses",
    "Ice Cream Headache (Brain Freeze)": "Taste & Senses",
    "Fear of Pain Sensitivity": "Taste & Senses",
    "Earwax Type": "Physical",
    "COMT Activity - Warrior vs Worrier": "Behavior & Cognition",
    "Empathy/Social Behavior": "Behavior & Cognition",
    "Novelty Seeking": "Behavior & Cognition",
    "Misophonia Tendency": "Behavior & Cognition",
    "Musical Pitch Perception": "Behavior & Cognition",
    "Photic Sneeze Reflex (ACHOO Syndrome)": "Quirky & Fun",
    "Motion Sickness Susceptibility": "Quirky & Fun",
    "Mosquito Bite Attraction": "Quirky & Fun",
    "Vitamin D Levels": "Health & Metabolism",
    "Type 2 Diabetes Risk": "Health & Metabolism",
    "Longevity / Aging": "Health & Metabolism",
    "Body Odor Intensity": "Quirky & Fun",
    "Freckle Density": "Appearance",
    "Wisdom Tooth Development": "Physical",
    "Achilles Tendon Injury Risk": "Physical",
    "Sensitivity to Umami Taste": "Taste & Senses",
    "Nicotine Dependence Risk": "Behavior & Cognition",
    "Hair Curliness": "Appearance",
    "Resistance to Norovirus": "Health & Metabolism",
    "Cortisol Stress Response": "Behavior & Cognition",
    "Detached vs Attached Earlobes": "Appearance",
    "Photophobia Tendency": "Taste & Senses",
    "Migraine with Aura Risk": "Health & Metabolism",
    "Seasonal Affective Disorder Risk": "Behavior & Cognition",
    "Jaw Clenching/Bruxism Tendency": "Quirky & Fun",
    "Perfect Pitch (Absolute Pitch)": "Behavior & Cognition",
    "Marathon Runner Endurance": "Physical",
    "Blood Clotting Speed": "Health & Metabolism",
    "Introversion/Extraversion Tendency": "Behavior & Cognition",
    "Response to Exercise (VO2 Max)": "Physical",
    "Gluten Sensitivity Risk": "Health & Metabolism",
    "Fear Response Intensity": "Behavior & Cognition",
    "Sunburn Recovery Speed": "Health & Metabolism",
    "Coffee Consumption Tendency": "Behavior & Cognition",
    "Male Pattern Baldness (Androgenetic)": "Appearance",
    "Facial Flushing from Alcohol": "Health & Metabolism",
    "Night Vision Quality": "Taste & Senses",
    "Stretch Mark Susceptibility": "Physical",
}

CATEGORY_ICONS = {
    "Appearance": "\U0001f3a8",
    "Physical": "\U0001f4cf",
    "Health & Metabolism": "\U0001f489",
    "Taste & Senses": "\U0001f445",
    "Behavior & Cognition": "\U0001f9e0",
    "Quirky & Fun": "\U0001f3b2",
    "Other": "\U0001f52c",
}

CONFIDENCE_COLORS = {
    "high": "#06d6a0",
    "medium": "#f59e0b",
    "low": "#ef4444",
}

# ---------------------------------------------------------------------------
# Tier badge helper
# ---------------------------------------------------------------------------
def render_tier_badge(tier: str):
    """Render a tier badge with appropriate color."""
    colors = {"free": "#6b7280", "premium": "#3b82f6", "pro": "#fbbf24"}
    color = colors.get(tier.lower(), "#6b7280")
    return f'<span style="background:{color};padding:4px 12px;border-radius:12px;color:white;font-weight:600;font-size:0.75rem;text-transform:uppercase;font-family:\'Outfit\',sans-serif;letter-spacing:0.05em;">{tier.upper()}</span>'


# ===================================================================
# Helper: load trait database with the correct wrapper handling
# ===================================================================
def load_traits_corrected(db_path: str):
    """Load trait_snps.json, unwrap the 'snps' key if present, and flatten
    phenotype_map values so that each genotype maps to a *string* (the
    phenotype name) instead of the nested dict that the JSON file stores.

    Handles both formats: plain JSON array or wrapped {"snps": [...]}.

    Returns a list of trait entry dicts ready for predict_trait().
    """
    with open(db_path, "r") as f:
        raw = json.load(f)

    # Handle both formats: plain array or wrapped {"snps": [...]}
    if isinstance(raw, list):
        traits = raw
    else:
        traits = raw.get("snps", raw)

    # Flatten phenotype_map values: {"GG": {"phenotype": "Brown Eyes", ...}} -> {"GG": "Brown Eyes"}
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


def run_trait_analysis(parent_a_snps, parent_b_snps, db_path):
    """Wrapper around trait prediction that handles the data-format mismatch."""
    traits = load_traits_corrected(db_path)
    results = []
    for trait_entry in traits:
        prediction = predict_trait(parent_a_snps, parent_b_snps, trait_entry)
        if prediction:
            results.append(prediction)
    return results


# ===================================================================
# Helper: single-parent carrier screen
# ===================================================================
def single_parent_carrier_screen(snps, panel_path):
    """Run carrier analysis for a single parent against the panel."""
    from Source.carrier_analysis import load_carrier_panel, determine_carrier_status

    panel = load_carrier_panel(panel_path)
    results = []
    for disease in panel:
        genotype = snps.get(disease["rsid"], "")
        status = determine_carrier_status(
            genotype, disease["pathogenic_allele"], disease["reference_allele"]
        )
        results.append(
            {
                "condition": disease["condition"],
                "gene": disease["gene"],
                "severity": disease["severity"],
                "description": disease["description"],
                "status": status,
                "rsid": disease["rsid"],
            }
        )
    return results


# ===================================================================
# UI helpers
# ===================================================================
def severity_badge(severity: str) -> str:
    badge_styles = {
        "high": ("rgba(239,68,68,0.15)", "#ef4444", "rgba(239,68,68,0.4)"),
        "moderate": ("rgba(245,158,11,0.15)", "#f59e0b", "rgba(245,158,11,0.4)"),
        "low": ("rgba(6,214,160,0.15)", "#06d6a0", "rgba(6,214,160,0.4)"),
    }
    bg, text_color, border = badge_styles.get(severity, ("rgba(107,114,128,0.15)", "#6b7280", "rgba(107,114,128,0.4)"))
    return (
        f'<span style="background:{bg};color:{text_color};padding:3px 10px;'
        f'border:1px solid {border};'
        f'border-radius:10px;font-size:0.75rem;font-weight:600;'
        f"font-family:'Outfit',sans-serif;letter-spacing:0.03em;\">"
        f"{severity.upper()}</span>"
    )


def status_badge(status: str) -> str:
    badge_styles = {
        "carrier": ("rgba(245,158,11,0.12)", "#f59e0b", "rgba(245,158,11,0.35)", "\u26a0\ufe0f"),
        "affected": ("rgba(239,68,68,0.12)", "#ef4444", "rgba(239,68,68,0.35)", "\u274c"),
        "normal": ("rgba(6,214,160,0.12)", "#06d6a0", "rgba(6,214,160,0.35)", "\u2705"),
        "unknown": ("rgba(148,163,184,0.12)", "#94a3b8", "rgba(148,163,184,0.35)", "\u2753"),
    }
    bg, text_color, border, icon = badge_styles.get(status, ("rgba(107,114,128,0.12)", "#6b7280", "rgba(107,114,128,0.35)", ""))
    return (
        f'<span style="background:{bg};color:{text_color};padding:3px 12px;'
        f'border:1px solid {border};border-radius:20px;font-size:0.8rem;font-weight:600;'
        f"font-family:'DM Sans',sans-serif;display:inline-flex;align-items:center;gap:4px;\">"
        f"{icon} {status.replace('_', ' ').title()}</span>"
    )


def render_probability_bar(label: str, pct: float, color: str = "#6366f1"):
    """Render a horizontal bar for a probability percentage."""
    st.markdown(
        f"""
        <div style="margin-bottom:6px;">
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;
                font-family:'DM Sans',sans-serif;margin-bottom:3px;">
                <span style="color:#e2e8f0;">{label}</span>
                <span style="font-weight:700;color:{color};font-family:'Outfit',sans-serif;">{pct:.1f}%</span>
            </div>
            <div style="background:rgba(148,163,184,0.1);border-radius:8px;height:12px;
                overflow:hidden;border:1px solid rgba(148,163,184,0.08);">
                <div style="background:linear-gradient(90deg,{color},
                    {color}cc);width:{min(pct, 100):.1f}%;height:100%;border-radius:8px;
                    transition:width 0.6s ease;"></div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


# ===================================================================
# Page configuration
# ===================================================================
st.set_page_config(
    page_title="Tortit - Genetic Offspring Analysis",
    page_icon="\U0001f9ec",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom sidebar navigation
st.sidebar.page_link("app.py", label="Offspring Analysis", icon="🧬")
st.sidebar.page_link("pages/2_Disease_Catalog.py", label="Disease Catalog", icon="📋")

# Comprehensive bioluminescent dark-theme CSS
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
    @keyframes dnaStrand {
        0% { transform: rotateX(0deg); }
        100% { transform: rotateX(360deg); }
    }
    @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
    }
    @keyframes borderGlow {
        0%, 100% { border-color: rgba(6, 214, 160, 0.15); }
        50% { border-color: rgba(6, 214, 160, 0.4); }
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

    /* === Tabs === */
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

    /* === Buttons === */
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

    /* === File Uploader === */
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

    /* === Progress Bar === */
    .stProgress > div > div {
        background: linear-gradient(90deg, #06d6a0, #7c3aed, #22d3ee);
        background-size: 200% 100%;
        animation: gradientShift 3s ease infinite;
        border-radius: 10px;
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

    /* === Success/Warning/Error boxes === */
    .stAlert { border-radius: 12px; }

    /* === Links === */
    a { color: var(--accent-teal) !important; transition: color 0.2s ease; }
    a:hover { color: var(--accent-cyan) !important; }

    /* === Dividers === */
    hr { border-color: var(--border-subtle) !important; }

    /* === Select boxes / Inputs === */
    .stSelectbox > div > div, .stTextInput > div > div > input {
        background: var(--bg-elevated) !important;
        border-color: var(--border-subtle) !important;
        border-radius: 10px !important;
        font-family: 'DM Sans', sans-serif !important;
    }
    div[data-testid="stMetric"]:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(124, 58, 237, 0.2);
    }
    div[data-testid="stMetric"] label {
        color: #A78BFA !important;
        font-size: 0.85rem !important;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    div[data-testid="stMetric"] [data-testid="stMetricValue"] {
        color: #F8FAFC !important;
        font-size: 2rem !important;
        font-weight: 700 !important;
    }

    /* === Tabs === */
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
        background: #1A1A2E;
        border-radius: 12px;
        padding: 4px;
    }
    .stTabs [data-baseweb="tab"] {
        border-radius: 8px;
        padding: 10px 20px;
        color: #A78BFA;
        font-weight: 500;
    }
    .stTabs [aria-selected="true"] {
        background: linear-gradient(135deg, #7C3AED, #6D28D9) !important;
        color: white !important;
    }

    /* === Expanders === */
    .streamlit-expanderHeader {
        background: #1E1E3A;
        border-radius: 10px;
        border: 1px solid rgba(124, 58, 237, 0.2);
        font-weight: 500;
    }
    .streamlit-expanderContent {
        background: #16162A;
        border: 1px solid rgba(124, 58, 237, 0.1);
        border-top: none;
        border-radius: 0 0 10px 10px;
    }

    /* === Buttons === */
    .stButton > button[kind="primary"] {
        background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 50%, #5B21B6 100%);
        border: none;
        border-radius: 12px;
        padding: 12px 24px;
        font-weight: 600;
        font-size: 1.1rem;
        letter-spacing: 0.02em;
        box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
        transition: all 0.3s ease;
    }
    .stButton > button[kind="primary"]:hover {
        box-shadow: 0 6px 25px rgba(124, 58, 237, 0.5);
        transform: translateY(-1px);
    }

    /* === File Uploader === */
    [data-testid="stFileUploader"] {
        background: #1E1E3A;
        border: 2px dashed rgba(124, 58, 237, 0.3);
        border-radius: 16px;
        padding: 20px;
        transition: border-color 0.3s ease;
    }
    [data-testid="stFileUploader"]:hover {
        border-color: rgba(124, 58, 237, 0.6);
    }

    /* === Progress Bar === */
    .stProgress > div > div {
        background: linear-gradient(90deg, #7C3AED, #A78BFA);
        border-radius: 10px;
    }

    /* === Sidebar === */
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, #0F0F1A 0%, #1A1A2E 100%);
        border-right: 1px solid rgba(124, 58, 237, 0.2);
    }

    /* === Scrollbar === */
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: #0F0F1A; }
    ::-webkit-scrollbar-thumb { background: #7C3AED; border-radius: 4px; }

    /* === Success/Warning/Error boxes === */
    .stAlert {
        border-radius: 12px;
    }

    /* === Links === */
    a { color: #A78BFA !important; }
    a:hover { color: #C4B5FD !important; }

    /* === Dividers === */
    hr { border-color: rgba(124, 58, 237, 0.2) !important; }
    </style>
    """,
    unsafe_allow_html=True,
)

# ===================================================================
# Sidebar
# ===================================================================
with st.sidebar:
    st.markdown(
        """
        <div style="text-align:center;padding:1.5rem 0;margin-bottom:1rem;">
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
                letter-spacing:0.15em;text-transform:uppercase;">Genetic Platform</p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # Authentication UI
    auth_manager = get_auth_manager()
    current_user = get_current_user(auth_manager)

    if current_user:
        # Logged in - show user menu
        render_user_menu(current_user, auth_manager)
        st.markdown("---")
    else:
        # Not logged in - show login/register
        st.markdown("### 🔐 Account")
        auth_tab1, auth_tab2 = st.tabs(["Login", "Register"])

        with auth_tab1:
            render_login_form(auth_manager)

        with auth_tab2:
            render_register_form(auth_manager)

        st.markdown("---")

    st.markdown("### ⚙️ Settings")

    ncbi_api_key = st.text_input(
        "NCBI API Key (optional)",
        type="password",
        help="Optional. Enables ClinVar cross-reference for enhanced variant annotation. "
        "Without a key, analysis uses local data only (faster). "
        "With a key, query rate is 10/s. Get one free at https://www.ncbi.nlm.nih.gov/account/",
    )

    st.markdown("---")
    st.markdown("### \U0001f512 Privacy")
    st.markdown(
        "Your genetic data is processed **entirely in your browser session**. "
        "No files are uploaded to any server."
    )
    st.markdown("---")
    st.markdown(
        '<p style="font-size:0.75rem;color:#64748B;font-family:\'DM Sans\',sans-serif;">Tortit v2.0 &mdash; '
        "For educational purposes only.</p>",
        unsafe_allow_html=True,
    )

# ===================================================================
# Header
# ===================================================================
st.markdown(
    f"""<div class="tortit-hero" style="text-align:center;padding:2.5rem 2rem;background:linear-gradient(135deg, #0d1321 0%, #111827 40%, #1a1040 100%);border-radius:28px;margin-bottom:1.5rem;position:relative;overflow:hidden;border:1px solid rgba(148,163,184,0.12);animation: pulseGlow 4s ease-in-out infinite;">
<div style="display:flex;justify-content:center;gap:6px;margin-bottom:1rem;">
<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:linear-gradient(135deg,#06d6a0,#22d3ee);animation:helixFloat 2s ease-in-out infinite;"></span>
<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#a78bfa);animation:helixFloat 2s ease-in-out infinite 0.3s;"></span>
<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:linear-gradient(135deg,#06d6a0,#22d3ee);animation:helixFloat 2s ease-in-out infinite 0.6s;"></span>
<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#a78bfa);animation:helixFloat 2s ease-in-out infinite 0.9s;"></span>
<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:linear-gradient(135deg,#06d6a0,#22d3ee);animation:helixFloat 2s ease-in-out infinite 1.2s;"></span>
</div>
<h1 style="margin:0;font-size:2.8rem;font-family:'Outfit',sans-serif;font-weight:800;background:linear-gradient(135deg, #06d6a0, #22d3ee, #7c3aed);background-size:200% 200%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:gradientShift 6s ease infinite;">Tortit</h1>
<p style="font-family:'DM Sans',sans-serif;color:#94a3b8;font-size:1.1rem;margin:8px 0 0;">Genetic Offspring Analysis Platform</p>
<div style="display:inline-block;margin-top:1rem;padding:8px 20px;background:linear-gradient(90deg,transparent,rgba(6,214,160,0.1),transparent);background-size:200% 100%;animation:shimmer 3s linear infinite;border:1px solid rgba(6,214,160,0.2);border-radius:20px;">
<span style="color:#06d6a0;font-family:'DM Sans',sans-serif;font-size:0.85rem;">\U0001f9ec Carrier Risk &bull; Trait Prediction &bull; Mendelian Genetics</span>
</div>
<p style="font-size:0.92rem;color:#64748B;max-width:600px;margin:1rem auto 0;font-family:'DM Sans',sans-serif;">Upload 23andMe, AncestryDNA, MyHeritage/FTDNA, or VCF (Whole Genome Sequencing) raw-data files for both parents to screen for <b style="color:#06d6a0;">carrier risk</b> of {NUM_DISEASES} genetic diseases and predict <b style="color:#22d3ee;">{NUM_TRAITS} offspring traits</b> using Mendelian genetics.</p>
</div>""",
    unsafe_allow_html=True,
)

# ===================================================================
# File upload area
# ===================================================================
st.markdown(
    """
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:1rem;
        animation:fadeSlideUp 0.4s ease-out 0.2s both;">
        <span style="font-size:1.5rem;">\U0001f4c2</span>
        <h3 style="margin:0;color:#e2e8f0;font-family:'Outfit',sans-serif;font-weight:700;">Upload Genetic Data (23andMe, AncestryDNA, MyHeritage/FTDNA, or VCF)</h3>
    </div>
    """,
    unsafe_allow_html=True,
)

col_a, col_b = st.columns(2)

with col_a:
    st.markdown("**Parent A**")
    file_a = st.file_uploader(
        "Upload Parent A genetic data (23andMe, AncestryDNA, MyHeritage/FTDNA, or VCF)",
        type=["txt", "csv", "vcf"],
        key="file_a",
        label_visibility="collapsed",
    )

with col_b:
    st.markdown("**Parent B**")
    file_b = st.file_uploader(
        "Upload Parent B genetic data (23andMe, AncestryDNA, MyHeritage/FTDNA, or VCF)",
        type=["txt", "csv", "vcf"],
        key="file_b",
        label_visibility="collapsed",
    )

# ---------------------------------------------------------------------------
# Validate & parse uploads, cache in session_state
# ---------------------------------------------------------------------------
for label, file_obj, snp_key, valid_key, stats_key, fmt_key in [
    ("Parent A", file_a, "snps_a", "valid_a", "stats_a", "fmt_a"),
    ("Parent B", file_b, "snps_b", "valid_b", "stats_b", "fmt_b"),
]:
    if file_obj is not None:
        # Only re-parse when the file changes
        file_id = f"{file_obj.name}_{file_obj.size}"
        if st.session_state.get(f"_fid_{snp_key}") != file_id:
            try:
                buf = BytesIO(file_obj.getvalue())
                snps, fmt_name = parse_genetic_file(buf)
                stats = get_genotype_stats(snps)
                st.session_state[snp_key] = snps
                st.session_state[valid_key] = True
                st.session_state[stats_key] = stats
                st.session_state[fmt_key] = fmt_name
            except (ValueError, FileNotFoundError) as exc:
                st.session_state[valid_key] = False
                st.session_state[snp_key] = None
                st.session_state[stats_key] = None
                st.session_state[fmt_key] = None
                st.session_state[f"_err_{snp_key}"] = str(exc)
            except Exception as exc:
                st.session_state[valid_key] = False
                st.session_state[snp_key] = None
                st.session_state[stats_key] = None
                st.session_state[fmt_key] = None
                st.session_state[f"_err_{snp_key}"] = str(exc)
            st.session_state[f"_fid_{snp_key}"] = file_id
    else:
        # File removed
        for k in [snp_key, valid_key, stats_key, fmt_key, f"_fid_{snp_key}", f"_err_{snp_key}"]:
            st.session_state.pop(k, None)

# Display validation status
col_sa, col_sb = st.columns(2)

_FORMAT_DISPLAY_NAMES = {"23andme": "23andMe", "ancestry": "AncestryDNA", "myheritage": "MyHeritage/FTDNA", "vcf": "VCF (Whole Genome)", "unknown": "Unknown"}

for col, label, file_obj, valid_key, stats_key, snp_key, fmt_key in [
    (col_sa, "Parent A", file_a, "valid_a", "stats_a", "snps_a", "fmt_a"),
    (col_sb, "Parent B", file_b, "valid_b", "stats_b", "snps_b", "fmt_b"),
]:
    with col:
        if file_obj is not None:
            if st.session_state.get(valid_key):
                stats = st.session_state.get(stats_key, {})
                total = stats.get("total_snps", 0)
                homo = stats.get("homozygous_count", 0)
                hetero = stats.get("heterozygous_count", 0)
                fmt_display = _FORMAT_DISPLAY_NAMES.get(
                    st.session_state.get(fmt_key, "unknown"), "Unknown"
                )
                st.success(
                    f"\u2705 {label} ({fmt_display}): **{total:,}** SNPs loaded"
                    f"  (homo: {homo:,} | hetero: {hetero:,})"
                )
            else:
                err = st.session_state.get(f"_err_{snp_key}", "Unknown error")
                st.error(f"\u274c {label}: Invalid file -- {err}")

# ===================================================================
# Single-parent mode
# ===================================================================
only_a = st.session_state.get("valid_a") and not st.session_state.get("valid_b")
only_b = st.session_state.get("valid_b") and not st.session_state.get("valid_a")

if only_a or only_b:
    st.markdown("---")
    parent_label = "Parent A" if only_a else "Parent B"
    snps = st.session_state.get("snps_a" if only_a else "snps_b")

    # Get user tier for filtering
    auth_manager = get_auth_manager()
    current_user = get_current_user(auth_manager)
    user_tier = current_user.get("tier", TierType.FREE.value) if current_user else TierType.FREE.value
    tier_config = get_tier_config(TierType(user_tier))

    st.markdown(f"### \U0001f9ea Individual Carrier Screening -- {parent_label}")
    st.info(
        "Upload the second parent's file to unlock **offspring risk analysis** and **trait predictions**. "
        f"Showing individual carrier status for {parent_label} below."
    )

    with st.spinner(f"Screening {parent_label} against {tier_config.disease_limit}-disease panel ({user_tier.upper()} plan)..."):
        single_results = single_parent_carrier_screen(snps, CARRIER_PANEL_PATH)
        # Filter by tier limit
        single_results = single_results[:tier_config.disease_limit]

    carriers = [r for r in single_results if r["status"] == "carrier"]
    affected = [r for r in single_results if r["status"] == "affected"]
    normals = [r for r in single_results if r["status"] == "normal"]

    m1, m2, m3 = st.columns(3)
    m1.metric("Diseases Screened", len(single_results))
    m2.metric("Carrier Variants", len(carriers), delta=None)
    m3.metric("Affected Variants", len(affected), delta=None)

    if affected:
        st.markdown("#### \u274c Affected (homozygous pathogenic)")
        for r in affected:
            with st.expander(f"{r['condition']}  ({r['gene']})  {severity_badge(r['severity'])}", expanded=True):
                st.markdown(r["description"])
                st.markdown(f"**rsID:** `{r['rsid']}`")

    if carriers:
        st.markdown("#### \u26a0\ufe0f Carrier Variants")
        for r in carriers:
            with st.expander(f"{r['condition']}  ({r['gene']})"):
                st.markdown(r["description"])
                st.markdown(f"**Severity:** {severity_badge(r['severity'])}  |  **rsID:** `{r['rsid']}`", unsafe_allow_html=True)

    with st.expander(f"\u2705 Normal ({len(normals)} conditions)", expanded=False):
        for r in normals:
            st.markdown(f"- **{r['condition']}** ({r['gene']})")

    # Show upgrade prompt for single-parent mode
    if user_tier != TierType.PRO.value:
        st.markdown("---")
        upgrade_msg = get_upgrade_message(TierType(user_tier))
        st.info(f"💎 {upgrade_msg}")

# ===================================================================
# Both parents uploaded -- Analyze button
# ===================================================================
both_valid = st.session_state.get("valid_a") and st.session_state.get("valid_b")

if both_valid:
    st.markdown("---")

    analyze_clicked = st.button(
        "\U0001f52c  Run Offspring Analysis",
        type="primary",
        use_container_width=True,
    )

    if analyze_clicked:
        snps_a = st.session_state["snps_a"]
        snps_b = st.session_state["snps_b"]

        # Get current user's tier
        auth_manager = get_auth_manager()
        current_user = get_current_user(auth_manager)
        user_tier = current_user.get("tier", TierType.FREE.value) if current_user else TierType.FREE.value

        # Get tier configuration
        tier_config = get_tier_config(user_tier)

        # Load full panel and get tier configuration
        with open(CARRIER_PANEL_PATH, "r") as f:
            full_panel = json.load(f)

        tier_config = get_tier_config(TierType(user_tier))
        total_diseases = len(full_panel)
        analyzing_count = tier_config.disease_limit

        # -- progress UI --
        progress = st.progress(0, text="Starting analysis...")

        # Show tier-based analysis info
        st.info(f"Analyzing {analyzing_count} of {total_diseases} diseases (based on your {user_tier.upper()} plan)")

        # Step 1: Carrier risk
        progress.progress(10, text=f"\U0001f9ec Screening carrier risk ({analyzing_count} diseases)...")
        # Only use ClinVar if API key is provided (otherwise too slow due to rate limiting)
        clinvar_client = ClinVarClient(api_key=ncbi_api_key) if ncbi_api_key else None
        try:
            # Pass tier parameter to analyze_carrier_risk for built-in filtering
            carrier_results = analyze_carrier_risk(
                snps_a, snps_b, CARRIER_PANEL_PATH,
                clinvar_client=clinvar_client,
                tier=TierType(user_tier)
            )
        except Exception as exc:
            st.error(f"Carrier analysis failed: {exc}")
            carrier_results = []

        progress.progress(50, text=f"\U0001f3a8 Predicting offspring traits...")

        # Step 2: Trait prediction (using our corrected loader)
        try:
            all_trait_results = run_trait_analysis(snps_a, snps_b, TRAIT_DB_PATH)
            # Filter traits based on tier limit
            trait_results = all_trait_results[:tier_config.trait_limit]
        except Exception as exc:
            st.error(f"Trait prediction failed: {exc}")
            trait_results = []

        progress.progress(100, text="\u2705 Analysis complete!")

        # Cache results
        st.session_state["carrier_results"] = carrier_results
        st.session_state["trait_results"] = trait_results
        st.session_state["analysis_done"] = True
        st.session_state["user_tier"] = user_tier

        # Track analysis count for free users
        if user_tier == TierType.FREE.value:
            if "analysis_count" not in st.session_state:
                st.session_state["analysis_count"] = 0
            st.session_state["analysis_count"] += 1

    # ---------------------------------------------------------------
    # Display results (persisted in session_state)
    # ---------------------------------------------------------------
    if st.session_state.get("analysis_done"):
        carrier_results = st.session_state["carrier_results"]
        trait_results = st.session_state["trait_results"]
        user_tier = st.session_state.get("user_tier", TierType.FREE.value)

        # Classify carrier results
        high_risk = [r for r in carrier_results if r["risk_level"] == "high_risk"]
        carrier_detected = [r for r in carrier_results if r["risk_level"] == "carrier_detected"]
        low_risk = [r for r in carrier_results if r["risk_level"] == "low_risk"]
        unknown_risk = [r for r in carrier_results if r["risk_level"] == "unknown"]

        successful_traits = [t for t in trait_results if t.get("status") == "success"]
        missing_traits = [t for t in trait_results if t.get("status") == "missing"]

        # ===== Summary metrics =====
        st.markdown("---")
        st.markdown(
            """
            <div style="text-align:center;margin:1rem 0;animation:fadeSlideUp 0.5s ease-out;">
                <h2 style="margin:0;font-family:'Outfit',sans-serif;
                    background:linear-gradient(135deg, #06d6a0, #22d3ee);
                    background-size:200% 200%;animation:gradientShift 6s ease infinite;
                    -webkit-background-clip:text;-webkit-text-fill-color:transparent;
                    font-weight:700;">\U0001f4ca Results Dashboard</h2>
            </div>
            """,
            unsafe_allow_html=True,
        )

        mc1, mc2, mc3, mc4 = st.columns(4)
        mc1.metric("Diseases Screened", len(carrier_results))
        mc2.metric(
            "High-Risk Matches",
            len(high_risk),
            delta=f"{len(high_risk)} conditions" if high_risk else None,
            delta_color="inverse",
        )
        mc3.metric("Carrier Matches", len(carrier_detected))
        mc4.metric("Traits Predicted", len(successful_traits))

        # Show tier badge and upgrade prompt
        tier_col1, tier_col2 = st.columns([2, 1])
        with tier_col1:
            st.markdown(f"**Your Plan:** {render_tier_badge(user_tier)}", unsafe_allow_html=True)
        with tier_col2:
            if user_tier == TierType.FREE.value:
                analysis_count = st.session_state.get("analysis_count", 0)
                st.caption(f"📊 Analyses this month: {analysis_count}/5")

        # Show upgrade message if not on highest tier
        if user_tier != TierType.PRO.value:
            upgrade_msg = get_upgrade_message(TierType(user_tier))
            st.info(f"💎 {upgrade_msg}")

        # ===== Tabs =====
        tab_risk, tab_traits, tab_individual = st.tabs(
            [
                f"\u26a0\ufe0f Risk Factors ({len(high_risk) + len(carrier_detected)})",
                f"\U0001f3a8 Predicted Traits ({len(successful_traits)})",
                "\U0001f464 Individual Reports",
            ]
        )

        # -------------------------------------------------------
        # TAB: Risk Factors
        # -------------------------------------------------------
        with tab_risk:
            if not high_risk and not carrier_detected:
                st.success(
                    "\U0001f389 Great news! No high-risk or carrier matches detected "
                    f"across the {NUM_DISEASES}-disease panel."
                )

            # -- HIGH RISK --
            if high_risk:
                st.markdown("### \U0001f6a8 High Risk -- Both Parents Carry Variant")
                st.markdown(
                    "Both parents carry at least one copy of the pathogenic allele. "
                    "Offspring may be affected."
                )
                for r in high_risk:
                    with st.container():
                        st.markdown(
                            f"""
                            <div style="border-left:4px solid #ef4444;
                            background:linear-gradient(135deg, #111827 0%, #1a2236 60%, rgba(239,68,68,0.06) 100%);
                            padding:20px;border-radius:0 16px 16px 0;margin-bottom:12px;
                            border-top:1px solid rgba(239,68,68,0.15);
                            border-right:1px solid rgba(239,68,68,0.15);
                            border-bottom:1px solid rgba(239,68,68,0.15);
                            box-shadow:0 4px 24px rgba(0,0,0,0.3), inset 0 0 30px rgba(239,68,68,0.03);
                            animation:fadeSlideUp 0.4s ease-out;">
                                <h4 style="margin:0 0 6px;color:#f8fafc;font-family:'Outfit',sans-serif;
                                    font-weight:700;">{r['condition']}
                                    &nbsp;{severity_badge(r['severity'])}</h4>
                                <p style="margin:0 0 8px;color:#94a3b8;font-size:0.9rem;font-family:'DM Sans',sans-serif;">
                                    Gene: <b style="color:#06d6a0;">{r['gene']}</b> &nbsp;|&nbsp; rsID: <code style="background:rgba(148,163,184,0.1);padding:2px 6px;border-radius:4px;">{r['rsid']}</code>
                                </p>
                                <p style="margin:0 0 8px;color:#cbd5e1;font-family:'DM Sans',sans-serif;">{r['description']}</p>
                            </div>
                            """,
                            unsafe_allow_html=True,
                        )
                        pcol1, pcol2 = st.columns(2)
                        with pcol1:
                            st.markdown(
                                f"**Parent A:** {status_badge(r['parent_a_status'])} &nbsp;&nbsp; "
                                f"**Parent B:** {status_badge(r['parent_b_status'])}",
                                unsafe_allow_html=True,
                            )
                        with pcol2:
                            risk = r["offspring_risk"]
                            render_probability_bar("Affected", risk["affected"], "#dc2626")
                            render_probability_bar("Carrier", risk["carrier"], "#d97706")
                            render_probability_bar("Normal", risk["normal"], "#16a34a")

                        # Learn-more button
                        btn_key = f"snpedia_risk_{r['rsid']}"
                        if st.button(f"\U0001f50d Learn More about {r['rsid']}", key=btn_key):
                            with st.spinner("Querying SNPedia..."):
                                client = SNPediaClient()
                                details = client.get_snp_details(r["rsid"])
                            if details:
                                st.info(f"**SNPedia:** {details['summary']}\n\n[View on SNPedia]({details['url']})")
                            else:
                                st.warning("No additional information found on SNPedia for this variant.")
                        st.markdown("---")

            # -- CARRIER DETECTED --
            if carrier_detected:
                st.markdown("### \u26a0\ufe0f Carrier Detected -- One Parent Carries Variant")
                for r in carrier_detected:
                    with st.expander(
                        f"{r['condition']}  ({r['gene']})  --  "
                        f"A: {r['parent_a_status']} | B: {r['parent_b_status']}"
                    ):
                        st.markdown(r["description"])
                        st.markdown(
                            f"**Severity:** {severity_badge(r['severity'])}  |  **rsID:** `{r['rsid']}`",
                            unsafe_allow_html=True,
                        )
                        st.markdown(
                            f"**Parent A:** {status_badge(r['parent_a_status'])} &nbsp;&nbsp; "
                            f"**Parent B:** {status_badge(r['parent_b_status'])}",
                            unsafe_allow_html=True,
                        )
                        risk = r["offspring_risk"]
                        render_probability_bar("Carrier", risk["carrier"], "#d97706")
                        render_probability_bar("Normal", risk["normal"], "#16a34a")

                        btn_key = f"snpedia_carrier_{r['rsid']}"
                        if st.button(f"\U0001f50d Learn More about {r['rsid']}", key=btn_key):
                            with st.spinner("Querying SNPedia..."):
                                client = SNPediaClient()
                                details = client.get_snp_details(r["rsid"])
                            if details:
                                st.info(f"**SNPedia:** {details['summary']}\n\n[View on SNPedia]({details['url']})")
                            else:
                                st.warning("No additional information found on SNPedia for this variant.")

            # -- LOW RISK --
            if low_risk:
                with st.expander(f"\u2705 Low Risk ({len(low_risk)} conditions)", expanded=False):
                    for r in low_risk:
                        st.markdown(
                            f"- **{r['condition']}** ({r['gene']}) -- "
                            f"A: {r['parent_a_status']}, B: {r['parent_b_status']}"
                        )

            # -- UNKNOWN --
            if unknown_risk:
                with st.expander(f"\u2753 Unknown / Insufficient Data ({len(unknown_risk)})", expanded=False):
                    st.caption("These conditions could not be assessed because one or both parents lack data for the relevant SNP.")
                    for r in unknown_risk:
                        st.markdown(f"- **{r['condition']}** ({r['gene']}) -- `{r['rsid']}`")

        # -------------------------------------------------------
        # TAB: Predicted Traits
        # -------------------------------------------------------
        with tab_traits:
            if not successful_traits:
                st.warning(
                    "No traits could be predicted. This usually means the uploaded files "
                    "do not contain the specific SNPs in our trait panel, or your plan limits have been reached."
                )
            else:
                # Show locked traits preview for non-PRO users
                if user_tier != TierType.PRO.value:
                    with open(TRAIT_DB_PATH, "r") as f:
                        all_traits_data = json.load(f)
                        if isinstance(all_traits_data, list):
                            all_traits = all_traits_data
                        else:
                            all_traits = all_traits_data.get("snps", [])

                    total_traits = len(all_traits)
                    analyzed_traits = len(successful_traits)
                    locked_count = total_traits - analyzed_traits

                    if locked_count > 0:
                        st.warning(
                            f"🔒 {locked_count} additional traits are locked. "
                            f"Upgrade to {'Premium' if user_tier == TierType.FREE.value else 'Pro'} to unlock all traits!"
                        )

                # Group by category
                grouped = {}
                for t in successful_traits:
                    cat = TRAIT_CATEGORIES.get(t["trait"], "Other")
                    grouped.setdefault(cat, []).append(t)

                for category in [
                    "Appearance",
                    "Physical",
                    "Health & Metabolism",
                    "Taste & Senses",
                    "Behavior & Cognition",
                    "Quirky & Fun",
                    "Other",
                ]:
                    traits_in_cat = grouped.get(category)
                    if not traits_in_cat:
                        continue

                    icon = CATEGORY_ICONS.get(category, "\U0001f52c")
                    st.markdown(f"### {icon} {category}")

                    for t in traits_in_cat:
                        confidence = t.get("confidence", "medium")
                        conf_color = CONFIDENCE_COLORS.get(confidence, "#6b7280")
                        conf_dot = (
                            f'<span style="display:inline-block;width:10px;height:10px;'
                            f'border-radius:50%;background:{conf_color};margin-right:4px;"></span>'
                        )

                        with st.expander(
                            f"{t['trait']}  --  {t['gene']}  "
                            f"(confidence: {confidence})",
                            expanded=True,
                        ):
                            st.markdown(
                                f"<p style='color:#64748b;font-size:0.88rem;'>{t.get('description', '')}</p>",
                                unsafe_allow_html=True,
                            )
                            st.markdown(
                                f"**Chromosome:** {t.get('chromosome', '?')} &nbsp;|&nbsp; "
                                f"**Inheritance:** {t.get('inheritance', '?')} &nbsp;|&nbsp; "
                                f"**Confidence:** {conf_dot}{confidence.title()} &nbsp;|&nbsp; "
                                f"**rsID:** `{t['rsid']}`",
                                unsafe_allow_html=True,
                            )

                            gc1, gc2 = st.columns(2)
                            with gc1:
                                st.markdown(
                                    f"\U0001f9ec **Parent A genotype:** `{t.get('parent_a_genotype', '?')}`  \n"
                                    f"\U0001f9ec **Parent B genotype:** `{t.get('parent_b_genotype', '?')}`"
                                )
                            with gc2:
                                probs = t.get("offspring_probabilities", {})
                                if probs:
                                    st.markdown("**Offspring probabilities:**")
                                    # Sort descending by probability
                                    sorted_probs = sorted(
                                        probs.items(), key=lambda x: x[1], reverse=True
                                    )
                                    palette = [
                                        "#06d6a0",
                                        "#22d3ee",
                                        "#7c3aed",
                                        "#f59e0b",
                                    ]
                                    for idx, (pheno, pct) in enumerate(sorted_probs):
                                        color = palette[idx % len(palette)]
                                        # pheno might be a dict if something slipped through
                                        if isinstance(pheno, dict):
                                            pheno = pheno.get("phenotype", str(pheno))
                                        render_probability_bar(str(pheno), pct, color)

                            if t.get("note"):
                                st.caption(f"Note: {t['note']}")

                # Missing traits
                if missing_traits:
                    with st.expander(
                        f"\U0001f50d Missing Data ({len(missing_traits)} traits)", expanded=False
                    ):
                        st.caption(
                            "These traits could not be predicted because one or both "
                            "parents lack the required SNP."
                        )
                        for t in missing_traits:
                            st.markdown(
                                f"- **{t['trait']}** ({t['gene']}) -- {t.get('note', 'data missing')}"
                            )

        # -------------------------------------------------------
        # TAB: Individual Reports
        # -------------------------------------------------------
        with tab_individual:
            # Get tier config for disease limit
            tier_config = get_tier_config(TierType(user_tier))
            st.markdown(
                f"Individual carrier screening for each parent against {tier_config.disease_limit} diseases "
                f"(based on your {user_tier.upper()} plan)."
            )

            ind_a, ind_b = st.tabs(["\U0001f464 Parent A", "\U0001f464 Parent B"])

            for ind_tab, parent_label, snp_key in [
                (ind_a, "Parent A", "snps_a"),
                (ind_b, "Parent B", "snps_b"),
            ]:
                with ind_tab:
                    snps = st.session_state.get(snp_key)
                    if snps is None:
                        st.warning(f"No data for {parent_label}.")
                        continue

                    single = single_parent_carrier_screen(snps, CARRIER_PANEL_PATH)
                    # Filter by tier limit
                    tier_config = get_tier_config(TierType(user_tier))
                    single = single[:tier_config.disease_limit]

                    carriers = [r for r in single if r["status"] == "carrier"]
                    affecteds = [r for r in single if r["status"] == "affected"]
                    normals = [r for r in single if r["status"] == "normal"]
                    unknowns = [r for r in single if r["status"] == "unknown"]

                    im1, im2, im3 = st.columns(3)
                    im1.metric("Screened", len(single))
                    im2.metric("Carrier", len(carriers))
                    im3.metric("Affected", len(affecteds))

                    if affecteds:
                        st.markdown("##### \u274c Affected")
                        for r in affecteds:
                            st.markdown(
                                f"- **{r['condition']}** ({r['gene']}) -- "
                                f"{severity_badge(r['severity'])}  `{r['rsid']}`",
                                unsafe_allow_html=True,
                            )

                    if carriers:
                        st.markdown("##### \u26a0\ufe0f Carrier")
                        for r in carriers:
                            st.markdown(
                                f"- **{r['condition']}** ({r['gene']}) -- "
                                f"{severity_badge(r['severity'])}  `{r['rsid']}`",
                                unsafe_allow_html=True,
                            )

                    with st.expander(f"\u2705 Normal ({len(normals)})", expanded=False):
                        for r in normals:
                            st.markdown(f"- {r['condition']} ({r['gene']})")

                    if unknowns:
                        with st.expander(f"\u2753 Unknown ({len(unknowns)})", expanded=False):
                            for r in unknowns:
                                st.markdown(f"- {r['condition']} ({r['gene']}) -- `{r['rsid']}`")


# ===================================================================
# Footer
# ===================================================================
st.markdown(
    """
    <div style="text-align:center;padding:2rem 1.5rem;margin-top:2rem;
         background:linear-gradient(135deg, #0d1321 0%, #111827 40%, #1a1040 100%);
         border-radius:24px;border:1px solid rgba(148,163,184,0.12);
         box-shadow:0 4px 30px rgba(0,0,0,0.3);
         animation:fadeSlideUp 0.5s ease-out;">
        <p style="color:#94a3b8;font-size:0.85rem;margin-bottom:12px;font-family:'DM Sans',sans-serif;">
            <b style="color:#f59e0b;">\u26a0\ufe0f Disclaimer:</b> Tortit is an educational tool and does <b>not</b>
            provide medical advice, diagnosis, or treatment. Genetic predictions are
            probabilistic and based on simplified Mendelian models. Many traits are
            polygenic and influenced by environment. <b style="color:#e2e8f0;">Always consult a certified
            genetic counselor or healthcare professional</b> for clinical interpretation.</p>
        <p style="color:#94a3b8;font-size:0.85rem;margin-bottom:12px;font-family:'DM Sans',sans-serif;">
            \U0001f512 <b>Privacy:</b> All processing occurs locally in your session.
            No genetic data is stored, transmitted, or shared.</p>
        <div style="margin-top:16px;padding-top:16px;
            border-top:1px solid transparent;
            background-image:linear-gradient(#111827,#111827),linear-gradient(90deg,transparent,#06d6a0,#7c3aed,#22d3ee,transparent);
            background-origin:border-box;background-clip:padding-box,border-box;
            border-top:1px solid;">
            <div style="display:flex;justify-content:center;gap:4px;margin-bottom:10px;">
                <span style="display:inline-block;width:6px;height:6px;border-radius:50%;
                    background:#06d6a0;animation:helixFloat 2.5s ease-in-out infinite;"></span>
                <span style="display:inline-block;width:6px;height:6px;border-radius:50%;
                    background:#7c3aed;animation:helixFloat 2.5s ease-in-out infinite 0.3s;"></span>
                <span style="display:inline-block;width:6px;height:6px;border-radius:50%;
                    background:#22d3ee;animation:helixFloat 2.5s ease-in-out infinite 0.6s;"></span>
            </div>
            <p style="color:#64748B;font-size:0.8rem;margin:0;font-family:'DM Sans',sans-serif;">
                Built with Streamlit &bull; Powered by open-source genetics research &bull;
                <span style="background:linear-gradient(135deg, #06d6a0, #22d3ee);
                -webkit-background-clip:text;-webkit-text-fill-color:transparent;
                font-weight:700;font-family:'Outfit',sans-serif;">Tortit v2.0</span>
            </p>
        </div>
    </div>
    """,
    unsafe_allow_html=True,
)
