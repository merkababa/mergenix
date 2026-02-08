"""
Mergenix — Analysis Dashboard

Core genetic analysis logic — file upload, carrier risk screening,
trait prediction.  Migrated from the old app.py (lines 730-1383).
CSS removed (injected globally by router).
"""

import json
import os
from io import BytesIO

import streamlit as st
from Source.auth import AuthManager, get_current_user, get_verified_tier
from Source.carrier_analysis import analyze_carrier_risk
from Source.clinvar_client import ClinVarClient
from Source.parser import (
    get_genotype_stats,
    parse_genetic_file,
)
from Source.tier_config import TierType, get_tier_config, get_upgrade_message
from Source.trait_prediction import predict_trait
from Source.ui.components import (
    render_page_hero,
    render_probability_bar,
    render_tier_badge,
    severity_badge,
    status_badge,
)

# ---------------------------------------------------------------------------
# Data paths
# ---------------------------------------------------------------------------
APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(APP_DIR, "data")
CARRIER_PANEL_PATH = os.path.join(DATA_DIR, "carrier_panel.json")
TRAIT_DB_PATH = os.path.join(DATA_DIR, "trait_snps.json")

# ---------------------------------------------------------------------------
# Auth guard
# ---------------------------------------------------------------------------
current_user = get_current_user()
if not current_user:
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
# Dynamic counts
# ---------------------------------------------------------------------------
def _count_panel(path):
    try:
        with open(path) as f:
            return len(json.load(f))
    except Exception:
        return "?"


def _count_traits(path):
    try:
        with open(path) as f:
            raw = json.load(f)
        return len(raw) if isinstance(raw, list) else len(raw.get("snps", []))
    except Exception:
        return "?"


NUM_DISEASES = _count_panel(CARRIER_PANEL_PATH)
NUM_TRAITS = _count_traits(TRAIT_DB_PATH)

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
user_tier = get_verified_tier(current_user.get("email"))
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

        with open(CARRIER_PANEL_PATH) as f:
            full_panel = json.load(f)
        total_diseases = len(full_panel)
        analyzing_count = tier_config.disease_limit

        progress = st.progress(0, text="Starting analysis...")
        st.info(f"Analyzing {analyzing_count} of {total_diseases} diseases ({user_tier.upper()} plan)")

        progress.progress(10, text=f"\U0001f9ec Screening carrier risk ({analyzing_count} diseases)...")
        clinvar_client = ClinVarClient(api_key=ncbi_api_key) if ncbi_api_key else None
        try:
            carrier_results = analyze_carrier_risk(
                snps_a, snps_b, CARRIER_PANEL_PATH,
                clinvar_client=clinvar_client, tier=TierType(user_tier),
            )
        except Exception as exc:
            st.error(f"Carrier analysis failed: {exc}")
            carrier_results = []

        progress.progress(50, text="\U0001f3a8 Predicting offspring traits...")
        try:
            all_trait_results = run_trait_analysis(snps_a, snps_b, TRAIT_DB_PATH)
            trait_results = all_trait_results[:tier_config.trait_limit]
        except Exception as exc:
            st.error(f"Trait prediction failed: {exc}")
            trait_results = []

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
                st.markdown("### \U0001f6a8 High Risk -- Both Parents Carry Variant")
                st.markdown("Both parents carry at least one copy of the pathogenic allele.")
                for r in high_risk:
                    with st.container():
                        st.markdown(
                            f"""<div style="border-left:4px solid #ef4444;
                            background:linear-gradient(135deg, #0c1220 0%, #1a2236 60%, rgba(239,68,68,0.06) 100%);
                            padding:20px;border-radius:0 16px 16px 0;margin-bottom:12px;
                            border-top:1px solid rgba(239,68,68,0.15);border-right:1px solid rgba(239,68,68,0.15);
                            border-bottom:1px solid rgba(239,68,68,0.15);box-shadow:0 4px 24px rgba(0,0,0,0.3);
                            animation:fadeSlideUp 0.4s ease-out;">
                                <h4 style="margin:0 0 6px;color:var(--text-heading);font-family:'Sora',sans-serif;font-weight:700;">
                                    {r['condition']} &nbsp;{severity_badge(r['severity'])}</h4>
                                <p style="margin:0 0 8px;color:var(--text-muted);font-size:0.9rem;font-family:'Lexend',sans-serif;">
                                    Gene: <b style="color:var(--accent-teal);">{r['gene']}</b> | rsID: <code>{r['rsid']}</code></p>
                                <p style="margin:0 0 8px;color:var(--text-body);font-family:'Lexend',sans-serif;">{r['description']}</p>
                            </div>""",
                            unsafe_allow_html=True,
                        )
                        pcol1, pcol2 = st.columns(2)
                        with pcol1:
                            st.markdown(f"**Parent A:** {status_badge(r['parent_a_status'])} &nbsp; **Parent B:** {status_badge(r['parent_b_status'])}", unsafe_allow_html=True)
                        with pcol2:
                            risk = r["offspring_risk"]
                            render_probability_bar("Affected", risk["affected"], "#dc2626")
                            render_probability_bar("Carrier", risk["carrier"], "#d97706")
                            render_probability_bar("Normal", risk["normal"], "#16a34a")

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
                st.markdown("### \u26a0\ufe0f Carrier Detected -- One Parent Carries Variant")
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
                with st.expander(f"\u2705 Low Risk ({len(low_risk)} conditions)", expanded=False):
                    for r in low_risk:
                        st.markdown(f"- **{r['condition']}** ({r['gene']}) -- A: {r['parent_a_status']}, B: {r['parent_b_status']}")

            if unknown_risk:
                with st.expander(f"\u2753 Unknown / Insufficient Data ({len(unknown_risk)})", expanded=False):
                    st.caption("These conditions could not be assessed because one or both parents lack data for the relevant SNP.")
                    for r in unknown_risk:
                        st.markdown(f"- **{r['condition']}** ({r['gene']}) -- `{r['rsid']}`")

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
                    with open(TRAIT_DB_PATH) as f:
                        all_traits_data = json.load(f)
                        all_traits = all_traits_data if isinstance(all_traits_data, list) else all_traits_data.get("snps", [])
                    locked_count = len(all_traits) - len(successful_traits)
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
                        conf_color = CONFIDENCE_COLORS.get(confidence, "#6b7280")
                        conf_dot = f'<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:{conf_color};margin-right:4px;"></span>'
                        with st.expander(f"{t['trait']}  --  {t['gene']}  (confidence: {confidence})", expanded=True):
                            st.markdown(f"<p style='color:var(--text-dim);font-size:0.88rem;'>{t.get('description', '')}</p>", unsafe_allow_html=True)
                            st.markdown(
                                f"**Chromosome:** {t.get('chromosome', '?')} | **Inheritance:** {t.get('inheritance', '?')} | "
                                f"**Confidence:** {conf_dot}{confidence.title()} | **rsID:** `{t['rsid']}`",
                                unsafe_allow_html=True,
                            )
                            gc1, gc2 = st.columns(2)
                            with gc1:
                                st.markdown(f"\U0001f9ec **Parent A genotype:** `{t.get('parent_a_genotype', '?')}`  \n\U0001f9ec **Parent B genotype:** `{t.get('parent_b_genotype', '?')}`")
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
                        st.markdown("##### \u274c Affected")
                        for r in affecteds:
                            st.markdown(f"- **{r['condition']}** ({r['gene']}) -- {severity_badge(r['severity'])}  `{r['rsid']}`", unsafe_allow_html=True)
                    if carriers:
                        st.markdown("##### \u26a0\ufe0f Carrier")
                        for r in carriers:
                            st.markdown(f"- **{r['condition']}** ({r['gene']}) -- {severity_badge(r['severity'])}  `{r['rsid']}`", unsafe_allow_html=True)
                    with st.expander(f"\u2705 Normal ({len(normals)})", expanded=False):
                        for r in normals:
                            st.markdown(f"- {r['condition']} ({r['gene']})")
                    if unknowns:
                        with st.expander(f"\u2753 Unknown ({len(unknowns)})", expanded=False):
                            for r in unknowns:
                                st.markdown(f"- {r['condition']} ({r['gene']}) -- `{r['rsid']}`")
