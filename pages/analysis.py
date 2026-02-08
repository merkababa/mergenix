"""
Mergenix — Analysis Dashboard

Core genetic analysis logic — file upload, carrier risk screening,
trait prediction.  Migrated from the old app.py (lines 730-1383).
CSS removed (injected globally by router).
"""

import os
from collections import Counter
from io import BytesIO

import plotly.graph_objects as go
import streamlit as st
from Source.auth import AuthManager, get_current_user, get_verified_tier
from Source.carrier_analysis import analyze_carrier_risk
from Source.clinvar_client import ClinVarClient
from Source.data_loader import count_entries, load_traits_corrected
from Source.parser import (
    get_genotype_stats,
    parse_genetic_file,
)
from Source.tier_config import TierType, get_tier_config, get_upgrade_message
from Source.trait_prediction import predict_trait
from Source.ui.components import (
    _TOOLTIP_CSS,
    render_confidence_indicator,
    render_page_hero,
    render_probability_bar,
    render_progress_stepper,
    render_punnett_square,
    render_skeleton_card,
    render_tier_badge,
    severity_badge,
    status_badge,
    tooltip_term,
)
from Source.ui.theme import get_plotly_theme

# ---------------------------------------------------------------------------
# Data paths
# ---------------------------------------------------------------------------
APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(APP_DIR, "data")
CARRIER_PANEL_PATH = os.path.join(DATA_DIR, "carrier_panel.json")
TRAIT_DB_PATH = os.path.join(DATA_DIR, "trait_snps.json")

# ---------------------------------------------------------------------------
# Demo mode check (skip auth if demo)
# ---------------------------------------------------------------------------
_demo_mode = st.session_state.get("demo_mode", False)

# ---------------------------------------------------------------------------
# Auth guard (skipped in demo mode)
# ---------------------------------------------------------------------------
current_user = get_current_user()
if not current_user and not _demo_mode:
    st.warning("Please sign in to access the analysis dashboard.")
    if st.button("\U0001f512 Sign In to Continue", type="primary", use_container_width=True):
        st.session_state["auth_redirect"] = "pages/analysis.py"
        st.switch_page("pages/auth.py")
    st.stop()


# ---------------------------------------------------------------------------
# Cached auth manager
# ---------------------------------------------------------------------------
@st.cache_resource
def get_auth_manager():
    return AuthManager()


# ---------------------------------------------------------------------------
# Dynamic counts (cached via data_loader)
# ---------------------------------------------------------------------------
NUM_DISEASES = count_entries(CARRIER_PANEL_PATH)
NUM_TRAITS = count_entries(TRAIT_DB_PATH, key="snps")

# ---------------------------------------------------------------------------
# Trait category mapping
# ---------------------------------------------------------------------------
TRAIT_CATEGORIES = {
    "Eye Color": "Appearance", "Hair Color - Red Hair": "Appearance",
    "Hair Color - Blond Hair": "Appearance", "Hair/Skin Pigmentation": "Appearance",
    "Hair Thickness/Straightness": "Appearance", "Skin Pigmentation": "Appearance",
    "Skin/Eye Pigmentation": "Appearance", "Freckling Tendency": "Appearance",
    "Male Pattern Baldness": "Appearance", "Dimples": "Appearance",
    "Cleft Chin": "Appearance", "Widow's Peak Hairline": "Appearance",
    "Unibrow Tendency": "Appearance", "Eyebrow Thickness": "Appearance",
    "Head Circumference": "Physical", "Height": "Physical",
    "Tongue Rolling Ability": "Physical", "Handedness Tendency": "Physical",
    "Obesity Risk": "Health & Metabolism", "Caffeine Metabolism": "Health & Metabolism",
    "Lactose Tolerance": "Health & Metabolism", "Alcohol Flush Reaction": "Health & Metabolism",
    "Sun Sensitivity": "Health & Metabolism", "Deep Sleep Quality": "Health & Metabolism",
    "Chronotype (Morning/Night Person)": "Health & Metabolism",
    "Snoring Tendency": "Health & Metabolism",
    "Bitter Taste Perception": "Taste & Senses", "Pain Sensitivity": "Taste & Senses",
    "Sweet Taste Preference": "Taste & Senses", "Cilantro Taste Aversion": "Taste & Senses",
    "Asparagus Smell Detection": "Taste & Senses",
    "Ice Cream Headache (Brain Freeze)": "Taste & Senses",
    "Fear of Pain Sensitivity": "Taste & Senses",
    "Earwax Type": "Physical",
    "COMT Activity - Warrior vs Worrier": "Behavior & Cognition",
    "Empathy/Social Behavior": "Behavior & Cognition",
    "Novelty Seeking": "Behavior & Cognition", "Misophonia Tendency": "Behavior & Cognition",
    "Musical Pitch Perception": "Behavior & Cognition",
    "Photic Sneeze Reflex (ACHOO Syndrome)": "Quirky & Fun",
    "Motion Sickness Susceptibility": "Quirky & Fun",
    "Mosquito Bite Attraction": "Quirky & Fun",
    "Vitamin D Levels": "Health & Metabolism", "Type 2 Diabetes Risk": "Health & Metabolism",
    "Longevity / Aging": "Health & Metabolism", "Body Odor Intensity": "Quirky & Fun",
    "Freckle Density": "Appearance", "Wisdom Tooth Development": "Physical",
    "Achilles Tendon Injury Risk": "Physical",
    "Sensitivity to Umami Taste": "Taste & Senses",
    "Nicotine Dependence Risk": "Behavior & Cognition",
    "Hair Curliness": "Appearance", "Resistance to Norovirus": "Health & Metabolism",
    "Cortisol Stress Response": "Behavior & Cognition",
    "Detached vs Attached Earlobes": "Appearance",
    "Photophobia Tendency": "Taste & Senses",
    "Migraine with Aura Risk": "Health & Metabolism",
    "Seasonal Affective Disorder Risk": "Behavior & Cognition",
    "Jaw Clenching/Bruxism Tendency": "Quirky & Fun",
    "Perfect Pitch (Absolute Pitch)": "Behavior & Cognition",
    "Marathon Runner Endurance": "Physical", "Blood Clotting Speed": "Health & Metabolism",
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
    "Appearance": "\U0001f3a8", "Physical": "\U0001f4cf",
    "Health & Metabolism": "\U0001f489", "Taste & Senses": "\U0001f445",
    "Behavior & Cognition": "\U0001f9e0", "Quirky & Fun": "\U0001f3b2",
    "Other": "\U0001f52c",
}

CONFIDENCE_COLORS = {"high": "#06d6a0", "medium": "#f59e0b", "low": "#ef4444"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def run_trait_analysis(parent_a_snps, parent_b_snps, db_path):
    traits = load_traits_corrected(db_path)
    results = []
    for trait_entry in traits:
        prediction = predict_trait(parent_a_snps, parent_b_snps, trait_entry)
        if prediction:
            results.append(prediction)
    return results


def single_parent_carrier_screen(snps, panel_path):
    from Source.carrier_analysis import determine_carrier_status, load_carrier_panel
    panel = load_carrier_panel(panel_path)
    results = []
    for disease in panel:
        genotype = snps.get(disease["rsid"], "")
        status = determine_carrier_status(genotype, disease["pathogenic_allele"], disease["reference_allele"])
        results.append({
            "condition": disease["condition"], "gene": disease["gene"],
            "severity": disease["severity"], "description": disease["description"],
            "status": status, "rsid": disease["rsid"],
        })
    return results


_FORMAT_DISPLAY_NAMES = {
    "23andme": "23andMe", "ancestry": "AncestryDNA",
    "myheritage": "MyHeritage/FTDNA", "vcf": "VCF (Whole Genome)",
    "unknown": "Unknown",
}

# ---------------------------------------------------------------------------
# Page header
# ---------------------------------------------------------------------------
render_page_hero(
    "Offspring Analysis",
    "Genetic Carrier Risk & Trait Prediction",
    f"\U0001f9ec {NUM_DISEASES} Diseases \u2022 {NUM_TRAITS} Traits \u2022 Mendelian Genetics",
)

# Inject tooltip CSS
st.markdown(_TOOLTIP_CSS, unsafe_allow_html=True)

# Demo mode banner
if _demo_mode:
    st.markdown(
        """<div style="background: linear-gradient(90deg, rgba(6,214,160,0.08), rgba(6,182,212,0.08));
             border: 1px solid var(--accent-teal); border-radius: 12px;
             padding: 16px 20px; margin-bottom: 16px; display: flex;
             align-items: center; gap: 12px;">
            <span style="font-size: 1.3rem;">&#128300;</span>
            <div style="flex: 1;">
                <strong style="color: var(--text-heading); font-family: 'Sora', sans-serif;">
                    Demo Mode</strong>
                <span style="color: var(--text-body); font-family: 'Lexend', sans-serif;">
                    &mdash; You are viewing results from sample genetic data.
                    Upload your own files for personalized results.</span>
            </div>
        </div>""",
        unsafe_allow_html=True,
    )
    if st.button("\U0001f4c2 Upload My Files Instead", use_container_width=True):
        st.session_state.pop("demo_mode", None)
        st.session_state.pop("demo_parent_a", None)
        st.session_state.pop("demo_parent_b", None)
        st.rerun()

# ---------------------------------------------------------------------------
# Settings (inline, replaces sidebar)
# ---------------------------------------------------------------------------
with st.expander("\u2699\ufe0f Analysis Settings", expanded=False):
    ncbi_api_key = st.text_input(
        "NCBI API Key (optional)", type="password",
        help="Enables ClinVar cross-reference. Without a key, analysis uses local data only.",
    )

# ---------------------------------------------------------------------------
# File upload
# ---------------------------------------------------------------------------
st.markdown(
    """<div style="display:flex;align-items:center;gap:10px;margin-bottom:1rem;animation:fadeSlideUp 0.4s ease-out 0.2s both;">
        <span style="font-size:1.5rem;">\U0001f4c2</span>
        <h3 style="margin:0;color:var(--text-primary);font-family:'Sora',sans-serif;font-weight:700;">
            Upload Genetic Data (23andMe, AncestryDNA, MyHeritage/FTDNA, or VCF)</h3>
    </div>""",
    unsafe_allow_html=True,
)

st.info(
    "**Important:** This analysis is for informational and educational purposes only. "
    "It has not been cleared by the FDA and should not be used for clinical decisions. "
    "Always consult a certified genetic counselor for medical guidance."
)

# Demo mode: pre-load sample files if not already parsed
if _demo_mode and not st.session_state.get("valid_a"):
    demo_a = st.session_state.get("demo_parent_a")
    demo_b = st.session_state.get("demo_parent_b")
    if demo_a and demo_b:
        for path, snp_key, valid_key, stats_key, fmt_key in [
            (demo_a, "snps_a", "valid_a", "stats_a", "fmt_a"),
            (demo_b, "snps_b", "valid_b", "stats_b", "fmt_b"),
        ]:
            try:
                with open(path, "rb") as f:
                    buf = BytesIO(f.read())
                snps, fmt_name = parse_genetic_file(buf)
                stats = get_genotype_stats(snps)
                st.session_state[snp_key] = snps
                st.session_state[valid_key] = True
                st.session_state[stats_key] = stats
                st.session_state[fmt_key] = fmt_name
            except Exception:  # noqa: S110
                pass  # Silently skip failed demo file parsing

col_a, col_b = st.columns(2)
with col_a:
    st.markdown("**Parent A**")
    file_a = st.file_uploader("Upload Parent A", type=["txt", "csv", "vcf"], key="file_a", label_visibility="collapsed")
with col_b:
    st.markdown("**Parent B**")
    file_b = st.file_uploader("Upload Parent B", type=["txt", "csv", "vcf"], key="file_b", label_visibility="collapsed")

# Validate & parse
for _label, file_obj, snp_key, valid_key, stats_key, fmt_key in [
    ("Parent A", file_a, "snps_a", "valid_a", "stats_a", "fmt_a"),
    ("Parent B", file_b, "snps_b", "valid_b", "stats_b", "fmt_b"),
]:
    if file_obj is not None:
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
            except Exception as exc:
                st.session_state[valid_key] = False
                st.session_state[snp_key] = None
                st.session_state[stats_key] = None
                st.session_state[fmt_key] = None
                st.session_state[f"_err_{snp_key}"] = str(exc)
            st.session_state[f"_fid_{snp_key}"] = file_id
    else:
        for k in [snp_key, valid_key, stats_key, fmt_key, f"_fid_{snp_key}", f"_err_{snp_key}"]:
            st.session_state.pop(k, None)

# Validation status
col_sa, col_sb = st.columns(2)
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
                fmt_display = _FORMAT_DISPLAY_NAMES.get(st.session_state.get(fmt_key, "unknown"), "Unknown")
                st.success(f"\u2705 {label} ({fmt_display}): **{total:,}** SNPs loaded (homo: {homo:,} | hetero: {hetero:,})")
            else:
                err = st.session_state.get(f"_err_{snp_key}", "Unknown error")
                st.error(f"\u274c {label}: Invalid file -- {err}")

# ---------------------------------------------------------------------------
# Get user tier (verified from database, not stale session)
# ---------------------------------------------------------------------------
if current_user:
    user_tier = get_verified_tier(current_user.get("email"))
else:
    user_tier = TierType.FREE.value  # Demo mode defaults to free tier
tier_config = get_tier_config(TierType(user_tier))

# ---------------------------------------------------------------------------
# Single-parent mode
# ---------------------------------------------------------------------------
only_a = st.session_state.get("valid_a") and not st.session_state.get("valid_b")
only_b = st.session_state.get("valid_b") and not st.session_state.get("valid_a")

if only_a or only_b:
    st.markdown("---")
    parent_label = "Parent A" if only_a else "Parent B"
    snps = st.session_state.get("snps_a" if only_a else "snps_b")

    st.markdown(f"### \U0001f9ea Individual Carrier Screening -- {parent_label}")
    st.info("Upload the second parent's file to unlock **offspring risk analysis** and **trait predictions**.")

    with st.spinner(f"Screening {parent_label} against {tier_config.disease_limit}-disease panel ({user_tier.upper()} plan)..."):
        single_results = single_parent_carrier_screen(snps, CARRIER_PANEL_PATH)
        single_results = single_results[:tier_config.disease_limit]

    carriers = [r for r in single_results if r["status"] == "carrier"]
    affected = [r for r in single_results if r["status"] == "affected"]
    normals = [r for r in single_results if r["status"] == "normal"]

    m1, m2, m3 = st.columns(3)
    m1.metric("Diseases Screened", len(single_results))
    m2.metric("Carrier Variants", len(carriers))
    m3.metric("Affected Variants", len(affected))

    if affected:
        st.markdown("#### \u2139\ufe0f Both Copies Present")
        for r in affected:
            with st.expander(f"{r['condition']}  ({r['gene']})  {severity_badge(r['severity'])}", expanded=True):
                st.markdown(r["description"])
                st.markdown(f"**rsID:** `{r['rsid']}`")

    if carriers:
        st.markdown("#### \u2139\ufe0f One Copy Found -- Carrier Variants")
        for r in carriers:
            with st.expander(f"{r['condition']}  ({r['gene']})"):
                st.markdown(r["description"])
                st.markdown(f"**Severity:** {severity_badge(r['severity'])}  |  **rsID:** `{r['rsid']}`", unsafe_allow_html=True)

    with st.expander(f"\u2705 No Variant Detected ({len(normals)} conditions)", expanded=False):
        for r in normals:
            st.markdown(f"- **{r['condition']}** ({r['gene']})")

    if user_tier != TierType.PRO.value:
        st.markdown("---")
        st.info(f"\U0001f48e {get_upgrade_message(TierType(user_tier))}")

# ---------------------------------------------------------------------------
# Both parents — Analyze button
# ---------------------------------------------------------------------------
both_valid = st.session_state.get("valid_a") and st.session_state.get("valid_b")

if both_valid:
    st.markdown("---")

    analyze_clicked = st.button("\U0001f52c  Run Offspring Analysis", type="primary", use_container_width=True)

    if analyze_clicked:
        snps_a = st.session_state["snps_a"]
        snps_b = st.session_state["snps_b"]

        total_diseases = count_entries(CARRIER_PANEL_PATH)
        analyzing_count = tier_config.disease_limit

        # Multi-step progress indicator (T3.7)
        stepper_slot = st.empty()
        progress = st.progress(0, text="Starting analysis...")
        skeleton_slot = st.empty()
        st.info(f"Analyzing {analyzing_count} of {total_diseases} diseases ({user_tier.upper()} plan)")

        # Step 1: Validate
        stepper_slot.empty()
        with stepper_slot.container():
            render_progress_stepper(current_step=1)
        progress.progress(5, text="\U0001f4e4 Validating input files...")
        with skeleton_slot.container():
            render_skeleton_card(count=3)

        # Step 2: Screen carrier risk
        stepper_slot.empty()
        with stepper_slot.container():
            render_progress_stepper(current_step=2)
        progress.progress(10, text=f"\U0001f52c Screening carrier risk ({analyzing_count} diseases)...")
        clinvar_client = ClinVarClient(api_key=ncbi_api_key) if ncbi_api_key else None
        try:
            carrier_results = analyze_carrier_risk(
                snps_a, snps_b, CARRIER_PANEL_PATH,
                clinvar_client=clinvar_client, tier=TierType(user_tier),
            )
        except Exception as exc:
            st.error(f"Carrier analysis failed: {exc}")
            carrier_results = []

        # Step 3: Predict traits
        stepper_slot.empty()
        with stepper_slot.container():
            render_progress_stepper(current_step=3)
        progress.progress(50, text="\U0001f9ec Predicting offspring traits...")
        try:
            all_trait_results = run_trait_analysis(snps_a, snps_b, TRAIT_DB_PATH)
            trait_results = all_trait_results[:tier_config.trait_limit]
        except Exception as exc:
            st.error(f"Trait prediction failed: {exc}")
            trait_results = []

        # Step 4: Complete
        stepper_slot.empty()
        with stepper_slot.container():
            render_progress_stepper(current_step=4)
        skeleton_slot.empty()
        progress.progress(100, text="\u2705 Analysis complete!")
        st.session_state["carrier_results"] = carrier_results
        st.session_state["trait_results"] = trait_results
        st.session_state["analysis_done"] = True
        st.session_state["user_tier"] = user_tier

        if user_tier == TierType.FREE.value:
            st.session_state.setdefault("analysis_count", 0)
            st.session_state["analysis_count"] += 1

    # ---------------------------------------------------------------
    # Display results
    # ---------------------------------------------------------------
    if st.session_state.get("analysis_done"):
        st.warning(
            "**Disclaimer:** These results are for educational purposes only. "
            "Carrier status does not equal diagnosis. Risk estimates may vary by ancestry. "
            "Consult a genetic counselor for clinical interpretation."
        )

        # Pre-results context card (T3.3 — Emotional Design)
        st.markdown(
            """<div style="background: var(--bg-elevated); border: 1px solid var(--border-subtle);
                 border-radius: 16px; padding: 24px; margin-bottom: 24px;">
                <h4 style="color: var(--text-heading); margin-bottom: 12px;">
                    Before You View Your Results
                </h4>
                <p style="color: var(--text-body); line-height: 1.7;">
                    Genetic carrier screening often identifies variants — this is completely normal.
                    About <strong>1 in 4 people</strong> carry at least one disease-associated variant.
                </p>
                <ul style="color: var(--text-body); line-height: 1.8;">
                    <li>Being a carrier does <strong>NOT</strong> mean your children will develop the condition</li>
                    <li>Most findings require <strong>both parents</strong> to carry the same variant for offspring risk</li>
                    <li>These results are meant to <strong>inform</strong>, not diagnose</li>
                    <li>We recommend discussing results with a
                        <a href="https://www.nsgc.org/page/find-a-gc" target="_blank"
                           style="color: var(--accent-teal);">certified genetic counselor</a></li>
                </ul>
            </div>""",
            unsafe_allow_html=True,
        )

        carrier_results = st.session_state["carrier_results"]
        trait_results = st.session_state["trait_results"]
        user_tier = st.session_state.get("user_tier", TierType.FREE.value)

        high_risk = [r for r in carrier_results if r["risk_level"] == "high_risk"]
        carrier_detected = [r for r in carrier_results if r["risk_level"] == "carrier_detected"]
        low_risk = [r for r in carrier_results if r["risk_level"] == "low_risk"]
        unknown_risk = [r for r in carrier_results if r["risk_level"] == "unknown"]
        successful_traits = [t for t in trait_results if t.get("status") == "success"]
        missing_traits = [t for t in trait_results if t.get("status") == "missing"]

        # Summary metrics
        st.markdown("---")
        st.markdown(
            """<div style="text-align:center;margin:1rem 0;animation:fadeSlideUp 0.5s ease-out;">
                <h2 style="margin:0;font-family:'Sora',sans-serif;
                    background:linear-gradient(135deg, #06d6a0, #06b6d4);
                    -webkit-background-clip:text;-webkit-text-fill-color:transparent;
                    font-weight:700;">\U0001f4ca Results Dashboard</h2>
            </div>""",
            unsafe_allow_html=True,
        )

        mc1, mc2, mc3, mc4 = st.columns(4)
        mc1.metric("Diseases Screened", len(carrier_results))
        mc2.metric("High-Risk Matches", len(high_risk), delta=f"{len(high_risk)} conditions" if high_risk else None, delta_color="inverse")
        mc3.metric("Carrier Matches", len(carrier_detected))
        mc4.metric("Traits Predicted", len(successful_traits))

        tier_col1, tier_col2 = st.columns([2, 1])
        with tier_col1:
            st.markdown(f"**Your Plan:** {render_tier_badge(user_tier)}", unsafe_allow_html=True)
        with tier_col2:
            if user_tier == TierType.FREE.value:
                st.caption(f"Analyses this month: {st.session_state.get('analysis_count', 0)}/5")

        if user_tier != TierType.PRO.value:
            st.info(f"\U0001f48e {get_upgrade_message(TierType(user_tier))}")

        # Radar chart — Risk by category (T3.6b)
        if high_risk:
            category_risks = Counter(r.get("category", "Other") for r in high_risk if r.get("category"))
            if len(category_risks) >= 2:
                pt = get_plotly_theme()
                fig_radar = go.Figure(data=go.Scatterpolar(
                    r=list(category_risks.values()),
                    theta=list(category_risks.keys()),
                    fill="toself",
                    fillcolor="rgba(6, 214, 160, 0.15)",
                    line=dict(color="#06d6a0", width=2),
                    marker=dict(size=[v * 3 + 6 for v in category_risks.values()]),
                ))
                fig_radar.update_layout(
                    polar=dict(
                        radialaxis=dict(visible=True, range=[0, max(category_risks.values()) + 1],
                                        tickfont=dict(color=pt["tick_font_color"])),
                        angularaxis=dict(tickfont=dict(family="Lexend", color=pt["font_color"])),
                        bgcolor="rgba(0,0,0,0)",
                    ),
                    showlegend=False,
                    paper_bgcolor=pt["paper_bgcolor"],
                    plot_bgcolor=pt["plot_bgcolor"],
                    font=dict(color=pt["font_color"], family="Lexend"),
                    margin=dict(l=60, r=60, t=40, b=40),
                    height=350,
                    title=dict(text="Risk by Category", font=dict(family="Sora", size=16, color=pt["title_font_color"]), x=0.5),
                )
                st.plotly_chart(fig_radar, use_container_width=True)

        # Tabs
        tab_risk, tab_traits, tab_individual = st.tabs([
            f"\u26a0\ufe0f Risk Factors ({len(high_risk) + len(carrier_detected)})",
            f"\U0001f3a8 Predicted Traits ({len(successful_traits)})",
            "\U0001f464 Individual Reports",
        ])

        # TAB: Risk Factors
        with tab_risk:
            if not high_risk and not carrier_detected:
                st.success(f"\U0001f389 No high-risk or carrier matches across the {NUM_DISEASES}-disease panel.")

            if high_risk:
                st.markdown("### \u2139\ufe0f Important Finding -- Both Parents Carry a Disease-Associated Variant")
                _carrier_tt = tooltip_term("carrier")
                _variant_tt = tooltip_term("variant", "A change in the DNA sequence compared to the reference genome.")
                st.markdown(
                    f"Both parents are a {_carrier_tt} of at least one disease-associated {_variant_tt}.",
                    unsafe_allow_html=True,
                )
                for r in high_risk:
                    with st.container():
                        st.markdown(
                            f"""<div style="border-left:4px solid #f59e0b;
                            background:linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 60%, rgba(245,158,11,0.06) 100%);
                            padding:20px;border-radius:0 16px 16px 0;margin-bottom:12px;
                            border-top:1px solid rgba(245,158,11,0.15);border-right:1px solid rgba(245,158,11,0.15);
                            border-bottom:1px solid rgba(245,158,11,0.15);box-shadow:0 4px 24px var(--shadow-ambient);
                            animation:fadeSlideUp 0.4s ease-out;">
                                <h4 style="margin:0 0 6px;color:var(--text-heading);font-family:'Sora',sans-serif;font-weight:700;">
                                    {r['condition']} &nbsp;{severity_badge(r['severity'])}</h4>
                                <p style="margin:0 0 8px;color:var(--text-muted);font-size:0.9rem;font-family:'Lexend',sans-serif;">
                                    Gene: <b style="color:var(--accent-teal);">{r['gene']}</b> | rsID: <code>{r['rsid']}</code></p>
                                <p style="margin:0 0 8px;color:var(--text-body);font-family:'Lexend',sans-serif;">{r['description']}</p>
                            </div>""",
                            unsafe_allow_html=True,
                        )
                        pcol1, pcol2, pcol3 = st.columns([2, 2, 2])
                        with pcol1:
                            st.markdown(f"**Parent A:** {status_badge(r['parent_a_status'])} &nbsp; **Parent B:** {status_badge(r['parent_b_status'])}", unsafe_allow_html=True)
                        with pcol2:
                            risk = r["offspring_risk"]
                            render_probability_bar("Affected", risk["affected"], "#dc2626")
                            render_probability_bar("Carrier", risk["carrier"], "#d97706")
                            render_probability_bar("Normal", risk["normal"], "#16a34a")
                        with pcol3:
                            # Punnett square for this disease
                            path_allele = r.get("pathogenic_allele", "a")
                            ref_allele = r.get("reference_allele", "A")
                            pa_status = r.get("parent_a_status", "")
                            pb_status = r.get("parent_b_status", "")
                            # Derive parent alleles from carrier status
                            if pa_status == "carrier":
                                pa_alleles = (ref_allele, path_allele)
                            elif pa_status == "affected":
                                pa_alleles = (path_allele, path_allele)
                            else:
                                pa_alleles = (ref_allele, ref_allele)
                            if pb_status == "carrier":
                                pb_alleles = (ref_allele, path_allele)
                            elif pb_status == "affected":
                                pb_alleles = (path_allele, path_allele)
                            else:
                                pb_alleles = (ref_allele, ref_allele)
                            render_punnett_square(pa_alleles, pb_alleles, risk_type="carrier")

                        btn_key = f"clinvar_risk_{r['rsid']}"
                        if st.button(f"\U0001f50d Learn More about {r['rsid']}", key=btn_key):
                            with st.spinner("Querying ClinVar..."):
                                cv_client = ClinVarClient(api_key=ncbi_api_key) if ncbi_api_key else ClinVarClient()
                                cv_details = cv_client.query_variant(r["rsid"])
                            if cv_details:
                                sig = cv_details.get("clinical_significance", "Unknown")
                                cond = cv_details.get("condition", "Unknown")
                                gene = cv_details.get("gene", "Unknown")
                                review = cv_details.get("review_status", "Unknown")
                                rsid_clean = r["rsid"].lower()
                                ncbi_url = f"https://www.ncbi.nlm.nih.gov/clinvar/?term={rsid_clean}"
                                st.info(
                                    f"**ClinVar** \u2014 `{r['rsid']}`\n\n"
                                    f"- **Clinical significance:** {sig}\n"
                                    f"- **Condition:** {cond}\n"
                                    f"- **Gene:** {gene}\n"
                                    f"- **Review status:** {review}\n\n"
                                    f"[View on NCBI ClinVar]({ncbi_url})"
                                )
                            else:
                                st.warning("No ClinVar entry found for this variant.")
                        st.markdown("---")

            if carrier_detected:
                _carrier_label = tooltip_term("Carrier")
                st.markdown(f"### \u2139\ufe0f One Copy Found -- One Parent Is a {_carrier_label}", unsafe_allow_html=True)
                for r in carrier_detected:
                    with st.expander(f"{r['condition']}  ({r['gene']})  --  A: {r['parent_a_status']} | B: {r['parent_b_status']}"):
                        st.markdown(r["description"])
                        st.markdown(f"**Severity:** {severity_badge(r['severity'])}  |  **rsID:** `{r['rsid']}`", unsafe_allow_html=True)
                        st.markdown(f"**Parent A:** {status_badge(r['parent_a_status'])} &nbsp; **Parent B:** {status_badge(r['parent_b_status'])}", unsafe_allow_html=True)
                        risk = r["offspring_risk"]
                        render_probability_bar("Carrier", risk["carrier"], "#d97706")
                        render_probability_bar("Normal", risk["normal"], "#16a34a")

                        btn_key = f"clinvar_carrier_{r['rsid']}"
                        if st.button(f"\U0001f50d Learn More about {r['rsid']}", key=btn_key):
                            with st.spinner("Querying ClinVar..."):
                                cv_client = ClinVarClient(api_key=ncbi_api_key) if ncbi_api_key else ClinVarClient()
                                cv_details = cv_client.query_variant(r["rsid"])
                            if cv_details:
                                sig = cv_details.get("clinical_significance", "Unknown")
                                cond = cv_details.get("condition", "Unknown")
                                gene = cv_details.get("gene", "Unknown")
                                review = cv_details.get("review_status", "Unknown")
                                rsid_clean = r["rsid"].lower()
                                ncbi_url = f"https://www.ncbi.nlm.nih.gov/clinvar/?term={rsid_clean}"
                                st.info(
                                    f"**ClinVar** \u2014 `{r['rsid']}`\n\n"
                                    f"- **Clinical significance:** {sig}\n"
                                    f"- **Condition:** {cond}\n"
                                    f"- **Gene:** {gene}\n"
                                    f"- **Review status:** {review}\n\n"
                                    f"[View on NCBI ClinVar]({ncbi_url})"
                                )
                            else:
                                st.warning("No ClinVar entry found for this variant.")

            if low_risk:
                with st.expander(f"\u2705 No Significant Findings ({len(low_risk)} conditions)", expanded=False):
                    for r in low_risk:
                        st.markdown(f"- **{r['condition']}** ({r['gene']}) -- A: {r['parent_a_status']}, B: {r['parent_b_status']}")

            if unknown_risk:
                with st.expander(f"\u2753 Unknown / Insufficient Data ({len(unknown_risk)})", expanded=False):
                    st.caption("These conditions could not be assessed because one or both parents lack data for the relevant SNP.")
                    for r in unknown_risk:
                        st.markdown(f"- **{r['condition']}** ({r['gene']}) -- `{r['rsid']}`")

            # Next Steps card (T3.3 — Emotional Design)
            st.markdown(
                """<div style="background: linear-gradient(135deg, var(--bg-elevated), var(--card-bg));
                     border: 1px solid var(--accent-teal); border-radius: 16px; padding: 24px; margin: 24px 0;">
                    <h4 style="color: var(--accent-teal); margin-bottom: 16px;">
                        Next Steps for Your Family
                    </h4>
                    <div style="color: var(--text-body); line-height: 1.8;">
                        <p><strong>1. Review with a professional</strong><br>
                        We recommend discussing these results with a certified genetic counselor.<br>
                        <a href="https://www.nsgc.org/page/find-a-gc" target="_blank"
                           style="color: var(--accent-teal);">Find a genetic counselor near you</a></p>
                        <p><strong>2. Understand the context</strong><br>
                        Carrier screening provides probability estimates, not certainties.
                        Many factors influence genetic expression.</p>
                        <p><strong>3. Ask questions</strong><br>
                        Our results pages include detailed explanations for each finding.
                        Click "Learn More" on any result to see clinical details.</p>
                    </div>
                </div>""",
                unsafe_allow_html=True,
            )

        # TAB: Predicted Traits
        with tab_traits:
            st.info(
                "**Trait Prediction Disclaimer:** Trait predictions are based on known genetic associations and simplified models. "
                "Many traits are influenced by multiple genes and environmental factors."
            )

            if not successful_traits:
                st.warning("No traits could be predicted.")
            else:
                if user_tier != TierType.PRO.value:
                    total_trait_count = count_entries(TRAIT_DB_PATH, key="snps")
                    locked_count = total_trait_count - len(successful_traits)
                    if locked_count > 0:
                        st.warning(f"\U0001f512 {locked_count} additional traits locked. Upgrade to unlock all traits!")

                grouped = {}
                for t in successful_traits:
                    cat = TRAIT_CATEGORIES.get(t["trait"], "Other")
                    grouped.setdefault(cat, []).append(t)

                for category in ["Appearance", "Physical", "Health & Metabolism", "Taste & Senses", "Behavior & Cognition", "Quirky & Fun", "Other"]:
                    traits_in_cat = grouped.get(category)
                    if not traits_in_cat:
                        continue
                    icon = CATEGORY_ICONS.get(category, "\U0001f52c")
                    st.markdown(f"### {icon} {category}")
                    for t in traits_in_cat:
                        confidence = t.get("confidence", "medium")
                        conf_indicator = render_confidence_indicator(confidence)
                        inheritance_val = t.get("inheritance", "?")
                        # Wrap inheritance with tooltip if it's a known term
                        inh_display = tooltip_term(inheritance_val) if inheritance_val != "?" else "?"
                        with st.expander(f"{t['trait']}  --  {t['gene']}  (confidence: {confidence})", expanded=True):
                            st.markdown(f"<p style='color:var(--text-dim);font-size:0.88rem;'>{t.get('description', '')}</p>", unsafe_allow_html=True)
                            genotype_tt = tooltip_term("genotype")
                            st.markdown(
                                f"**Chromosome:** {t.get('chromosome', '?')} | **Inheritance:** {inh_display} | "
                                f"**Confidence:** {conf_indicator} {confidence.title()} | **rsID:** `{t['rsid']}`",
                                unsafe_allow_html=True,
                            )
                            gc1, gc2, gc3 = st.columns([2, 2, 2])
                            with gc1:
                                st.markdown(
                                    f"\U0001f9ec **Parent A {genotype_tt}:** `{t.get('parent_a_genotype', '?')}`  \n"
                                    f"\U0001f9ec **Parent B {genotype_tt}:** `{t.get('parent_b_genotype', '?')}`",
                                    unsafe_allow_html=True,
                                )
                            with gc2:
                                probs = t.get("offspring_probabilities", {})
                                if probs:
                                    st.markdown("**Offspring probabilities:**")
                                    sorted_probs = sorted(probs.items(), key=lambda x: x[1], reverse=True)
                                    palette = ["#06d6a0", "#06b6d4", "#8b5cf6", "#f59e0b"]
                                    for idx, (pheno, pct) in enumerate(sorted_probs):
                                        color = palette[idx % len(palette)]
                                        if isinstance(pheno, dict):
                                            pheno = pheno.get("phenotype", str(pheno))
                                        render_probability_bar(str(pheno), pct, color)
                            with gc3:
                                # Punnett square for trait
                                pa_geno = t.get("parent_a_genotype", "")
                                pb_geno = t.get("parent_b_genotype", "")
                                if len(pa_geno) == 2 and len(pb_geno) == 2:
                                    render_punnett_square(
                                        (pa_geno[0], pa_geno[1]),
                                        (pb_geno[0], pb_geno[1]),
                                        risk_type="trait",
                                    )
                            if t.get("note"):
                                st.caption(f"Note: {t['note']}")

                if missing_traits:
                    with st.expander(f"\U0001f50d Missing Data ({len(missing_traits)} traits)", expanded=False):
                        st.caption("These traits could not be predicted because one or both parents lack the required SNP.")
                        for t in missing_traits:
                            st.markdown(f"- **{t['trait']}** ({t['gene']}) -- {t.get('note', 'data missing')}")

        # TAB: Individual Reports
        with tab_individual:
            st.markdown(f"Individual carrier screening for each parent against {tier_config.disease_limit} diseases ({user_tier.upper()} plan).")
            ind_a, ind_b = st.tabs(["\U0001f464 Parent A", "\U0001f464 Parent B"])
            for ind_tab, parent_label, snp_key in [(ind_a, "Parent A", "snps_a"), (ind_b, "Parent B", "snps_b")]:
                with ind_tab:
                    snps = st.session_state.get(snp_key)
                    if snps is None:
                        st.warning(f"No data for {parent_label}.")
                        continue
                    single = single_parent_carrier_screen(snps, CARRIER_PANEL_PATH)
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
                        st.markdown("##### \u2139\ufe0f Both Copies Present")
                        for r in affecteds:
                            st.markdown(f"- **{r['condition']}** ({r['gene']}) -- {severity_badge(r['severity'])}  `{r['rsid']}`", unsafe_allow_html=True)
                    if carriers:
                        st.markdown("##### \u2139\ufe0f One Copy Found")
                        for r in carriers:
                            st.markdown(f"- **{r['condition']}** ({r['gene']}) -- {severity_badge(r['severity'])}  `{r['rsid']}`", unsafe_allow_html=True)
                    with st.expander(f"\u2705 No Variant Detected ({len(normals)})", expanded=False):
                        for r in normals:
                            st.markdown(f"- {r['condition']} ({r['gene']})")
                    if unknowns:
                        with st.expander(f"\u2753 Unknown ({len(unknowns)})", expanded=False):
                            for r in unknowns:
                                st.markdown(f"- {r['condition']} ({r['gene']}) -- `{r['rsid']}`")
