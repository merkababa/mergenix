"""
Mergenix — Homepage

Marketing landing page with hero, how-it-works, pricing preview,
disease showcase, trust signals, FAQ, and final CTA.
Full implementation in Phase 2.
"""

import os
from pathlib import Path

import streamlit as st
from Source.data_loader import count_entries
from Source.tier_config import TierType, get_tier_config
from Source.ui.components import render_section_header

# ---------------------------------------------------------------------------
# Dynamic counts (cached via data_loader)
# ---------------------------------------------------------------------------
APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(APP_DIR, "data")
CARRIER_PANEL_PATH = os.path.join(DATA_DIR, "carrier_panel.json")
TRAIT_DB_PATH = os.path.join(DATA_DIR, "trait_snps.json")

NUM_DISEASES = count_entries(CARRIER_PANEL_PATH)
NUM_TRAITS = count_entries(TRAIT_DB_PATH, key="snps")

# ---------------------------------------------------------------------------
# Hero section
# ---------------------------------------------------------------------------
st.markdown(
    f"""
    <div class="hero-section">
        <div style="display:flex;justify-content:center;gap:6px;margin-bottom:1.5rem;">
            <span style="display:inline-block;width:14px;height:14px;border-radius:50%;
                background:linear-gradient(135deg,#06d6a0,#06b6d4);animation:helixFloat 2s ease-in-out infinite;"></span>
            <span style="display:inline-block;width:14px;height:14px;border-radius:50%;
                background:linear-gradient(135deg,#8b5cf6,#a78bfa);animation:helixFloat 2s ease-in-out infinite 0.3s;"></span>
            <span style="display:inline-block;width:14px;height:14px;border-radius:50%;
                background:linear-gradient(135deg,#06d6a0,#06b6d4);animation:helixFloat 2s ease-in-out infinite 0.6s;"></span>
            <span style="display:inline-block;width:14px;height:14px;border-radius:50%;
                background:linear-gradient(135deg,#8b5cf6,#a78bfa);animation:helixFloat 2s ease-in-out infinite 0.9s;"></span>
            <span style="display:inline-block;width:14px;height:14px;border-radius:50%;
                background:linear-gradient(135deg,#06d6a0,#06b6d4);animation:helixFloat 2s ease-in-out infinite 1.2s;"></span>
        </div>
        <h1 style="margin:0;font-size:3.2rem;font-family:'Sora',sans-serif;font-weight:800;
            background:linear-gradient(135deg, #06d6a0, #06b6d4, #8b5cf6);
            background-size:200% 200%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;
            animation:gradientShift 6s ease infinite;line-height:1.15;">
            Unlock Your Offspring's<br>Genetic Blueprint</h1>
        <p style="font-family:'Lexend',sans-serif;color:var(--text-muted);font-size:1.15rem;margin:16px auto 0;max-width:600px;">
            Screen <b style="color:var(--accent-teal);">{NUM_DISEASES} genetic diseases</b> and predict
            <b style="color:var(--accent-cyan);">{NUM_TRAITS} offspring traits</b> using Mendelian genetics.
            Upload raw data from 23andMe, AncestryDNA, MyHeritage, or VCF files.</p>
        <div style="display:flex;justify-content:center;gap:12px;margin-top:2rem;flex-wrap:wrap;">
            <span style="display:inline-block;"></span>
        </div>
        <div style="display:flex;justify-content:center;gap:16px;margin-top:1.5rem;flex-wrap:wrap;">
            <span class="trust-badge">\U0001f512 256-bit Encryption</span>
            <span class="trust-badge">\U0001f6e1\ufe0f No Data Stored</span>
            <span class="trust-badge">\u2705 Privacy First</span>
        </div>
    </div>
    """,
    unsafe_allow_html=True,
)

# CTAs
cta1, cta2, cta3 = st.columns(3)
with cta1:
    if st.button("\U0001f680 Get Started Free", type="primary", use_container_width=True):
        st.switch_page("pages/auth.py")
with cta2:
    if st.button("\U0001f52c Try with Sample Data", use_container_width=True):
        # Set demo mode flags so analysis page can pre-load sample data
        sample_dir = Path(APP_DIR) / "sample_data" / "23andme"
        sample_files = sorted(sample_dir.glob("*.txt"))
        if len(sample_files) >= 2:
            st.session_state["demo_mode"] = True
            st.session_state["demo_parent_a"] = str(sample_files[0])
            st.session_state["demo_parent_b"] = str(sample_files[1])
            st.switch_page("pages/analysis.py")
        else:
            st.error("Sample data files not found.")
with cta3:
    if st.button("\U0001f4cb See How It Works", use_container_width=True):
        # Scroll to the How It Works section via JS
        st.markdown(
            """
            <script>
            const target = document.getElementById('how-it-works-anchor');
            if (target) { target.scrollIntoView({behavior: 'smooth'}); }
            </script>
            """,
            unsafe_allow_html=True,
        )

st.markdown(
    '<p style="text-align:center;color:var(--text-dim);font-size:0.85rem;'
    "font-family:'Lexend',sans-serif;margin-top:0.5rem;\">"
    "No account needed to try the demo -- explore with sample genetic data.</p>",
    unsafe_allow_html=True,
)

# ---------------------------------------------------------------------------
# How It Works
# ---------------------------------------------------------------------------
st.markdown('<div id="how-it-works-anchor"></div>', unsafe_allow_html=True)
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
                <h3 style="font-family:'Sora',sans-serif;font-weight:700;color:var(--text-primary);margin:0 0 8px;font-size:1.15rem;">{title}</h3>
                <p style="font-family:'Lexend',sans-serif;color:var(--text-muted);font-size:0.9rem;line-height:1.6;margin:0;">{desc}</p>
            </div>
            """,
            unsafe_allow_html=True,
        )

# ---------------------------------------------------------------------------
# How to Get Your DNA Data (expandable guide)
# ---------------------------------------------------------------------------
with st.expander("\U0001f4e5 How to Download Your Raw DNA Data"):
    st.markdown(
        """
        <div style="font-family:'Lexend',sans-serif;color:var(--text-muted);line-height:1.8;">
            <p style="margin-bottom:1rem;">To use Mergenix, you need your raw DNA data file from a
            genetic testing provider. Here's how to download it:</p>
            <table style="width:100%;border-collapse:collapse;">
                <tr style="border-bottom:1px solid var(--card-border);">
                    <td style="padding:10px 12px;font-weight:600;color:var(--text-primary);white-space:nowrap;">23andMe</td>
                    <td style="padding:10px 12px;">Settings &rarr; Raw Data &rarr; Download (.txt)</td>
                </tr>
                <tr style="border-bottom:1px solid var(--card-border);">
                    <td style="padding:10px 12px;font-weight:600;color:var(--text-primary);white-space:nowrap;">AncestryDNA</td>
                    <td style="padding:10px 12px;">Settings &rarr; DNA Settings &rarr; Download Raw DNA Data (.txt)</td>
                </tr>
                <tr style="border-bottom:1px solid var(--card-border);">
                    <td style="padding:10px 12px;font-weight:600;color:var(--text-primary);white-space:nowrap;">MyHeritage</td>
                    <td style="padding:10px 12px;">DNA &rarr; DNA Kit &rarr; Download Raw Data (.csv)</td>
                </tr>
                <tr>
                    <td style="padding:10px 12px;font-weight:600;color:var(--text-primary);white-space:nowrap;">VCF</td>
                    <td style="padding:10px 12px;">From your sequencing provider (Nebula Genomics, Dante Labs, etc.)</td>
                </tr>
            </table>
            <p style="margin-top:1rem;font-size:0.85rem;color:var(--text-dim);">
                Don't have DNA data yet? Use the <b>"Try with Sample Data"</b> button above to explore with demo files.</p>
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
            <div style="background:var(--card-bg);border:1px solid var(--card-border);
                border-radius:16px;padding:24px;text-align:center;animation:cardReveal 0.5s ease-out both;">
                <div style="font-size:2rem;margin-bottom:0.8rem;">{icon}</div>
                <h4 style="font-family:'Sora',sans-serif;font-weight:700;color:var(--text-primary);margin:0 0 8px;">{title}</h4>
                <p style="font-family:'Lexend',sans-serif;color:var(--text-muted);font-size:0.88rem;line-height:1.6;margin:0;">{desc}</p>
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
        st.markdown(f'<p style="color:var(--text-muted);font-family:\'Lexend\',sans-serif;line-height:1.7;">{a}</p>', unsafe_allow_html=True)

# ---------------------------------------------------------------------------
# Final CTA
# ---------------------------------------------------------------------------
st.markdown("---")
st.markdown(
    """
    <div style="text-align:center;padding:3rem 2rem;margin:1rem 0;
         background:var(--cta-gradient);
         border-radius:24px;border:1px solid var(--card-border);">
        <h2 style="margin:0 0 12px;font-family:'Sora',sans-serif;font-weight:800;font-size:2rem;
            background:linear-gradient(135deg, #06d6a0, #06b6d4);
            -webkit-background-clip:text;-webkit-text-fill-color:transparent;">
            Ready to Discover Your Offspring's Genetic Blueprint?</h2>
        <p style="font-family:'Lexend',sans-serif;color:var(--text-muted);font-size:1rem;margin:0 0 1.5rem;">
            Join thousands of parents making informed decisions with genetic insights.</p>
    </div>
    """,
    unsafe_allow_html=True,
)
cta_col = st.columns([1, 2, 1])[1]
with cta_col:
    if st.button("\U0001f9ec Start Your Free Analysis", type="primary", use_container_width=True):
        st.switch_page("pages/auth.py")
