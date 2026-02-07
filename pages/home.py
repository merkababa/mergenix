"""
Mergenix — Homepage

Marketing landing page with hero, how-it-works, pricing preview,
disease showcase, trust signals, FAQ, and final CTA.
Full implementation in Phase 2.
"""

import json
import os

import streamlit as st
from Source.tier_config import TierType, get_tier_config
from Source.ui.components import render_section_header

# ---------------------------------------------------------------------------
# Dynamic counts
# ---------------------------------------------------------------------------
APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(APP_DIR, "data")
CARRIER_PANEL_PATH = os.path.join(DATA_DIR, "carrier_panel.json")
TRAIT_DB_PATH = os.path.join(DATA_DIR, "trait_snps.json")


def _count(path, key=None):
    try:
        with open(path) as f:
            data = json.load(f)
        if isinstance(data, list):
            return len(data)
        if key:
            return len(data.get(key, []))
        return len(data)
    except Exception:
        return "?"


NUM_DISEASES = _count(CARRIER_PANEL_PATH)
NUM_TRAITS = _count(TRAIT_DB_PATH, "snps")

# ---------------------------------------------------------------------------
# Hero section
# ---------------------------------------------------------------------------
st.markdown(
    f"""
    <div class="hero-section">
        <div style="display:flex;justify-content:center;gap:6px;margin-bottom:1.5rem;">
            <span style="display:inline-block;width:14px;height:14px;border-radius:50%;
                background:linear-gradient(135deg,#06d6a0,#22d3ee);animation:helixFloat 2s ease-in-out infinite;"></span>
            <span style="display:inline-block;width:14px;height:14px;border-radius:50%;
                background:linear-gradient(135deg,#7c3aed,#a78bfa);animation:helixFloat 2s ease-in-out infinite 0.3s;"></span>
            <span style="display:inline-block;width:14px;height:14px;border-radius:50%;
                background:linear-gradient(135deg,#06d6a0,#22d3ee);animation:helixFloat 2s ease-in-out infinite 0.6s;"></span>
            <span style="display:inline-block;width:14px;height:14px;border-radius:50%;
                background:linear-gradient(135deg,#7c3aed,#a78bfa);animation:helixFloat 2s ease-in-out infinite 0.9s;"></span>
            <span style="display:inline-block;width:14px;height:14px;border-radius:50%;
                background:linear-gradient(135deg,#06d6a0,#22d3ee);animation:helixFloat 2s ease-in-out infinite 1.2s;"></span>
        </div>
        <h1 style="margin:0;font-size:3.2rem;font-family:'Outfit',sans-serif;font-weight:800;
            background:linear-gradient(135deg, #06d6a0, #22d3ee, #7c3aed);
            background-size:200% 200%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;
            animation:gradientShift 6s ease infinite;line-height:1.15;">
            Unlock Your Offspring's<br>Genetic Blueprint</h1>
        <p style="font-family:'DM Sans',sans-serif;color:#94a3b8;font-size:1.15rem;margin:16px auto 0;max-width:600px;">
            Screen <b style="color:#06d6a0;">{NUM_DISEASES} genetic diseases</b> and predict
            <b style="color:#22d3ee;">{NUM_TRAITS} offspring traits</b> using Mendelian genetics.
            Upload raw data from 23andMe, AncestryDNA, MyHeritage, or VCF files.</p>
        <div style="display:flex;justify-content:center;gap:12px;margin-top:2rem;flex-wrap:wrap;">
            <span style="display:inline-block;"></span>
        </div>
        <div style="display:flex;justify-content:center;gap:16px;margin-top:1.5rem;flex-wrap:wrap;">
            <span class="trust-badge">\U0001f512 256-bit Encryption</span>
            <span class="trust-badge">\U0001f6e1\ufe0f No Data Stored</span>
            <span class="trust-badge">\u2705 HIPAA Principles</span>
        </div>
    </div>
    """,
    unsafe_allow_html=True,
)

# CTAs
cta1, cta2 = st.columns(2)
with cta1:
    if st.button("\U0001f680 Get Started Free", type="primary", use_container_width=True):
        st.switch_page("pages/auth.py")
with cta2:
    if st.button("\U0001f4cb See How It Works", use_container_width=True):
        pass  # scroll anchor — handled below

# ---------------------------------------------------------------------------
# How It Works
# ---------------------------------------------------------------------------
render_section_header("\U0001f52c How It Works", "Three simple steps to genetic insights")

h1, h2, h3 = st.columns(3)
steps = [
    (h1, "1", "\U0001f4c2", "Upload Your Data", "Upload raw genetic data files from 23andMe, AncestryDNA, MyHeritage/FTDNA, or VCF format."),
    (h2, "2", "\U0001f9ec", "AI-Powered Analysis", f"Our engine screens {NUM_DISEASES} diseases and predicts {NUM_TRAITS} traits using Mendelian genetics and Punnett squares."),
    (h3, "3", "\U0001f4ca", "Get Your Report", "Receive detailed carrier risk assessment, trait predictions with probabilities, and actionable insights."),
]
for col, num, icon, title, desc in steps:
    with col:
        st.markdown(
            f"""
            <div class="how-it-works-card">
                <div class="step-number">{num}</div>
                <div style="font-size:2rem;margin-bottom:0.5rem;">{icon}</div>
                <h3 style="font-family:'Outfit',sans-serif;font-weight:700;color:#e2e8f0;margin:0 0 8px;font-size:1.15rem;">{title}</h3>
                <p style="font-family:'DM Sans',sans-serif;color:#94a3b8;font-size:0.9rem;line-height:1.6;margin:0;">{desc}</p>
            </div>
            """,
            unsafe_allow_html=True,
        )

# ---------------------------------------------------------------------------
# Disease Catalog Showcase
# ---------------------------------------------------------------------------
st.markdown("---")
render_section_header(f"\U0001f9ec {NUM_DISEASES} Genetic Diseases Screened",
                      "Comprehensive carrier risk analysis across major disease categories")

mc1, mc2, mc3, mc4 = st.columns(4)
mc1.metric("Total Diseases", NUM_DISEASES)
mc2.metric("Trait Predictions", NUM_TRAITS)
mc3.metric("File Formats", "4")
mc4.metric("Inheritance Models", "3")

if st.button("\U0001f4cb Explore Full Disease Catalog", use_container_width=True):
    st.switch_page("pages/disease_catalog.py")

# ---------------------------------------------------------------------------
# Pricing Preview
# ---------------------------------------------------------------------------
st.markdown("---")
render_section_header("\U0001f4b0 Simple, Transparent Pricing", "Pay once, use forever — no subscriptions")

pc1, pc2, pc3 = st.columns(3)
for col, tier_type, popular in [(pc1, TierType.FREE, False), (pc2, TierType.PREMIUM, False), (pc3, TierType.PRO, True)]:
    config = get_tier_config(tier_type)
    with col:
        popular_html = '<div class="popular-badge">Most Popular</div>' if popular else ""
        popular_class = "popular" if popular else ""
        price_display = "Free" if config.price == 0 else f"${config.price:.2f}"
        period = '<small>one-time</small>' if config.price > 0 else ""

        features_html = ""
        for feat in config.features[:5]:
            features_html += f'<div class="feature-item"><span class="check">\u2713</span><span>{feat}</span></div>'

        card_html = (
            f'<div class="pricing-card {tier_type.value} {popular_class}" style="position:relative;">'
            f'{popular_html}'
            f'<div class="tier-name">{config.display_name}</div>'
            f'<div class="tier-price">{price_display} {period}</div>'
            f'<div class="feature-list">{features_html}</div>'
            f'</div>'
        )
        st.markdown(card_html, unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)
col_pricing_cta = st.columns([1, 2, 1])[1]
with col_pricing_cta:
    if st.button("\U0001f4b3 View Full Pricing Comparison", use_container_width=True):
        st.switch_page("pages/products.py")

# ---------------------------------------------------------------------------
# Trust & Security
# ---------------------------------------------------------------------------
st.markdown("---")
render_section_header("\U0001f512 Trust & Security", "Your privacy is our top priority")

tc1, tc2, tc3 = st.columns(3)
trust_items = [
    (tc1, "\U0001f512", "Bank-Level Encryption", "All data encrypted with AES-256 in transit and at rest."),
    (tc2, "\U0001f4bb", "Local Processing", "Genetic files are processed entirely in your browser session. Nothing is uploaded to our servers."),
    (tc3, "\U0001f6e1\ufe0f", "No Data Stored", "We never store, share, or sell your genetic data. Period."),
]
for col, icon, title, desc in trust_items:
    with col:
        st.markdown(
            f"""
            <div style="background:linear-gradient(135deg,#111827,#1a2236);border:1px solid rgba(148,163,184,0.12);
                border-radius:16px;padding:24px;text-align:center;animation:cardReveal 0.5s ease-out both;">
                <div style="font-size:2rem;margin-bottom:0.8rem;">{icon}</div>
                <h4 style="font-family:'Outfit',sans-serif;font-weight:700;color:#e2e8f0;margin:0 0 8px;">{title}</h4>
                <p style="font-family:'DM Sans',sans-serif;color:#94a3b8;font-size:0.88rem;line-height:1.6;margin:0;">{desc}</p>
            </div>
            """,
            unsafe_allow_html=True,
        )

# ---------------------------------------------------------------------------
# FAQ
# ---------------------------------------------------------------------------
st.markdown("---")
render_section_header("\u2753 Frequently Asked Questions")

faqs = [
    ("Is my genetic data safe?",
     "Absolutely. All processing happens locally in your browser session. We never upload, store, or share your genetic data."),
    ("What file formats are supported?",
     "We support 23andMe, AncestryDNA, MyHeritage/FTDNA raw data files (.txt, .csv), and VCF files from whole genome sequencing."),
    ("How accurate are the predictions?",
     "Our predictions use well-established Mendelian genetics and Punnett square models. For single-gene traits, accuracy is high. Multi-gene (polygenic) traits are shown as probabilities."),
    ("Do I need both parents' data?",
     "For offspring predictions, yes. However, you can also run individual carrier screening with just one parent's data."),
    ("What's the difference between Free and paid plans?",
     "The Free plan screens 25 diseases and 10 traits. Premium unlocks 500+ diseases and all traits. Pro gives you the complete 2,700+ disease panel with priority support and all future disease updates included."),
    ("Is this a one-time purchase or subscription?",
     "One-time purchase! Pay once, use forever. No recurring charges, no hidden fees. Pro users also get all future disease panel updates at no extra cost."),
]
for q, a in faqs:
    with st.expander(q):
        st.markdown(f'<p style="color:#94a3b8;font-family:\'DM Sans\',sans-serif;line-height:1.7;">{a}</p>', unsafe_allow_html=True)

# ---------------------------------------------------------------------------
# Final CTA
# ---------------------------------------------------------------------------
st.markdown("---")
st.markdown(
    """
    <div style="text-align:center;padding:3rem 2rem;margin:1rem 0;
         background:linear-gradient(135deg, #0d1321 0%, #111827 40%, #1a1040 100%);
         border-radius:24px;border:1px solid rgba(148,163,184,0.12);">
        <h2 style="margin:0 0 12px;font-family:'Outfit',sans-serif;font-weight:800;font-size:2rem;
            background:linear-gradient(135deg, #06d6a0, #22d3ee);
            -webkit-background-clip:text;-webkit-text-fill-color:transparent;">
            Ready to Discover Your Offspring's Genetic Blueprint?</h2>
        <p style="font-family:'DM Sans',sans-serif;color:#94a3b8;font-size:1rem;margin:0 0 1.5rem;">
            Join thousands of parents making informed decisions with genetic insights.</p>
    </div>
    """,
    unsafe_allow_html=True,
)
cta_col = st.columns([1, 2, 1])[1]
with cta_col:
    if st.button("\U0001f9ec Start Your Free Analysis", type="primary", use_container_width=True):
        st.switch_page("pages/auth.py")
