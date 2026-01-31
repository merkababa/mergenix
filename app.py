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
    parse_23andme,
    validate_23andme_format,
    get_genotype_stats,
)
from Source.carrier_analysis import analyze_carrier_risk
from Source.trait_prediction import (
    predict_offspring_genotypes,
    predict_trait,
    normalize_genotype,
)
from Source.clinvar_client import ClinVarClient
from Source.snpedia_client import SNPediaClient

# ---------------------------------------------------------------------------
# Data paths
# ---------------------------------------------------------------------------
DATA_DIR = os.path.join(APP_DIR, "data")
CARRIER_PANEL_PATH = os.path.join(DATA_DIR, "carrier_panel.json")
TRAIT_DB_PATH = os.path.join(DATA_DIR, "trait_snps.json")

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
    "Head Circumference": "Physical",
    "Height": "Physical",
    "Obesity Risk": "Health & Metabolism",
    "Caffeine Metabolism": "Health & Metabolism",
    "Lactose Tolerance": "Health & Metabolism",
    "Alcohol Flush Reaction": "Health & Metabolism",
    "Bitter Taste Perception": "Taste & Senses",
    "Pain Sensitivity": "Taste & Senses",
    "Sun Sensitivity": "Health & Metabolism",
    "Earwax Type": "Physical",
    "COMT Activity - Warrior vs Worrier": "Behavior & Cognition",
    "Empathy/Social Behavior": "Behavior & Cognition",
    "Novelty Seeking": "Behavior & Cognition",
}

CATEGORY_ICONS = {
    "Appearance": "\U0001f3a8",
    "Physical": "\U0001f4cf",
    "Health & Metabolism": "\U0001f489",
    "Taste & Senses": "\U0001f445",
    "Behavior & Cognition": "\U0001f9e0",
    "Other": "\U0001f52c",
}

CONFIDENCE_COLORS = {
    "high": "#22c55e",
    "medium": "#eab308",
    "low": "#ef4444",
}


# ===================================================================
# Helper: load trait database with the correct wrapper handling
# ===================================================================
def load_traits_corrected(db_path: str):
    """Load trait_snps.json, unwrap the 'snps' key, and flatten phenotype_map
    values so that each genotype maps to a *string* (the phenotype name)
    instead of the nested dict that the JSON file stores.

    Returns a list of trait entry dicts ready for predict_trait().
    """
    with open(db_path, "r") as f:
        raw = json.load(f)

    # Unwrap: the file has {"snps": [...], "metadata": {...}}
    traits = raw["snps"]

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
    colors = {"high": "#dc2626", "moderate": "#d97706", "low": "#16a34a"}
    color = colors.get(severity, "#6b7280")
    return (
        f'<span style="background:{color};color:white;padding:2px 8px;'
        f'border-radius:10px;font-size:0.75rem;font-weight:600;">'
        f"{severity.upper()}</span>"
    )


def status_badge(status: str) -> str:
    colors = {
        "carrier": "#d97706",
        "affected": "#dc2626",
        "normal": "#16a34a",
        "unknown": "#6b7280",
    }
    icons = {
        "carrier": "\u26a0\ufe0f",
        "affected": "\u274c",
        "normal": "\u2705",
        "unknown": "\u2753",
    }
    color = colors.get(status, "#6b7280")
    icon = icons.get(status, "")
    return (
        f'<span style="color:{color};font-weight:600;">'
        f"{icon} {status.replace('_', ' ').title()}</span>"
    )


def render_probability_bar(label: str, pct: float, color: str = "#6366f1"):
    """Render a horizontal bar for a probability percentage."""
    st.markdown(
        f"""
        <div style="margin-bottom:4px;">
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;">
                <span>{label}</span><span style="font-weight:600;">{pct:.1f}%</span>
            </div>
            <div style="background:#e5e7eb;border-radius:6px;height:14px;overflow:hidden;">
                <div style="background:{color};width:{min(pct, 100):.1f}%;height:100%;border-radius:6px;"></div>
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

# Minimal global style tweaks
st.markdown(
    """
    <style>
    .block-container { padding-top: 2rem; }
    div[data-testid="stMetric"] {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 16px;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

# ===================================================================
# Sidebar
# ===================================================================
with st.sidebar:
    st.markdown("## \u2699\ufe0f Settings")

    ncbi_api_key = st.text_input(
        "NCBI API Key (optional)",
        type="password",
        help="Providing an NCBI API key increases ClinVar query rate from 3/s to 10/s. "
        "Get one free at https://www.ncbi.nlm.nih.gov/account/",
    )

    st.markdown("---")
    st.markdown("### \U0001f512 Privacy Notice")
    st.markdown(
        "Your genetic data is processed **entirely in your browser session**. "
        "No files are uploaded to any server. Data is discarded when you close the tab."
    )
    st.markdown("---")
    st.markdown(
        '<p style="font-size:0.75rem;color:#94a3b8;">Tortit v1.0 &mdash; '
        "For educational and informational purposes only.</p>",
        unsafe_allow_html=True,
    )

# ===================================================================
# Header
# ===================================================================
st.markdown(
    """
    <div style="text-align:center;padding:1rem 0 0.5rem;">
        <h1 style="margin-bottom:0;">\U0001f9ec Tortit</h1>
        <p style="font-size:1.15rem;color:#64748b;margin-top:4px;">
            Genetic Offspring Analysis Platform
        </p>
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    "Upload 23andMe raw-data files for both parents to screen for **carrier risk** "
    "of 50 recessive diseases and predict **30 offspring traits** using Mendelian genetics."
)

st.markdown("---")

# ===================================================================
# File upload area
# ===================================================================
st.markdown("### \U0001f4c2 Upload Genetic Data")

col_a, col_b = st.columns(2)

with col_a:
    st.markdown("**Parent A**")
    file_a = st.file_uploader(
        "Upload Parent A 23andMe file",
        type=["txt"],
        key="file_a",
        label_visibility="collapsed",
    )

with col_b:
    st.markdown("**Parent B**")
    file_b = st.file_uploader(
        "Upload Parent B 23andMe file",
        type=["txt"],
        key="file_b",
        label_visibility="collapsed",
    )

# ---------------------------------------------------------------------------
# Validate & parse uploads, cache in session_state
# ---------------------------------------------------------------------------
for label, file_obj, snp_key, valid_key, stats_key in [
    ("Parent A", file_a, "snps_a", "valid_a", "stats_a"),
    ("Parent B", file_b, "snps_b", "valid_b", "stats_b"),
]:
    if file_obj is not None:
        # Only re-parse when the file changes
        file_id = f"{file_obj.name}_{file_obj.size}"
        if st.session_state.get(f"_fid_{snp_key}") != file_id:
            try:
                buf = BytesIO(file_obj.getvalue())
                is_valid, err = validate_23andme_format(buf)
                buf.seek(0)
                if is_valid:
                    snps = parse_23andme(buf)
                    stats = get_genotype_stats(snps)
                    st.session_state[snp_key] = snps
                    st.session_state[valid_key] = True
                    st.session_state[stats_key] = stats
                else:
                    st.session_state[valid_key] = False
                    st.session_state[snp_key] = None
                    st.session_state[stats_key] = None
                    st.session_state[f"_err_{snp_key}"] = err
            except Exception as exc:
                st.session_state[valid_key] = False
                st.session_state[snp_key] = None
                st.session_state[stats_key] = None
                st.session_state[f"_err_{snp_key}"] = str(exc)
            st.session_state[f"_fid_{snp_key}"] = file_id
    else:
        # File removed
        for k in [snp_key, valid_key, stats_key, f"_fid_{snp_key}", f"_err_{snp_key}"]:
            st.session_state.pop(k, None)

# Display validation status
col_sa, col_sb = st.columns(2)

for col, label, file_obj, valid_key, stats_key, snp_key in [
    (col_sa, "Parent A", file_a, "valid_a", "stats_a", "snps_a"),
    (col_sb, "Parent B", file_b, "valid_b", "stats_b", "snps_b"),
]:
    with col:
        if file_obj is not None:
            if st.session_state.get(valid_key):
                stats = st.session_state.get(stats_key, {})
                total = stats.get("total_snps", 0)
                homo = stats.get("homozygous_count", 0)
                hetero = stats.get("heterozygous_count", 0)
                st.success(f"\u2705 {label}: **{total:,}** SNPs loaded  (homo: {homo:,} | hetero: {hetero:,})")
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
    st.markdown(f"### \U0001f9ea Individual Carrier Screening -- {parent_label}")
    st.info(
        "Upload the second parent's file to unlock **offspring risk analysis** and **trait predictions**. "
        f"Showing individual carrier status for {parent_label} below."
    )

    with st.spinner(f"Screening {parent_label} against 50-disease panel..."):
        single_results = single_parent_carrier_screen(snps, CARRIER_PANEL_PATH)

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

        # -- progress UI --
        progress = st.progress(0, text="Starting analysis...")

        # Step 1: Carrier risk
        progress.progress(10, text="\U0001f9ec Screening carrier risk (50 diseases)...")
        clinvar_client = ClinVarClient(api_key=ncbi_api_key if ncbi_api_key else None)
        try:
            carrier_results = analyze_carrier_risk(
                snps_a, snps_b, CARRIER_PANEL_PATH, clinvar_client=clinvar_client
            )
        except Exception as exc:
            st.error(f"Carrier analysis failed: {exc}")
            carrier_results = []

        progress.progress(50, text="\U0001f3a8 Predicting offspring traits (30 traits)...")

        # Step 2: Trait prediction (using our corrected loader)
        try:
            trait_results = run_trait_analysis(snps_a, snps_b, TRAIT_DB_PATH)
        except Exception as exc:
            st.error(f"Trait prediction failed: {exc}")
            trait_results = []

        progress.progress(100, text="\u2705 Analysis complete!")

        # Cache results
        st.session_state["carrier_results"] = carrier_results
        st.session_state["trait_results"] = trait_results
        st.session_state["analysis_done"] = True

    # ---------------------------------------------------------------
    # Display results (persisted in session_state)
    # ---------------------------------------------------------------
    if st.session_state.get("analysis_done"):
        carrier_results = st.session_state["carrier_results"]
        trait_results = st.session_state["trait_results"]

        # Classify carrier results
        high_risk = [r for r in carrier_results if r["risk_level"] == "high_risk"]
        carrier_detected = [r for r in carrier_results if r["risk_level"] == "carrier_detected"]
        low_risk = [r for r in carrier_results if r["risk_level"] == "low_risk"]
        unknown_risk = [r for r in carrier_results if r["risk_level"] == "unknown"]

        successful_traits = [t for t in trait_results if t.get("status") == "success"]
        missing_traits = [t for t in trait_results if t.get("status") == "missing"]

        # ===== Summary metrics =====
        st.markdown("---")
        st.markdown("## \U0001f4ca Results Dashboard")

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
                    "across the 50-disease panel."
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
                            <div style="border-left:4px solid #dc2626;background:#fef2f2;
                            padding:16px;border-radius:8px;margin-bottom:12px;">
                                <h4 style="margin:0 0 4px;">{r['condition']}
                                    &nbsp;{severity_badge(r['severity'])}</h4>
                                <p style="margin:0 0 8px;color:#64748b;font-size:0.9rem;">
                                    Gene: <b>{r['gene']}</b> &nbsp;|&nbsp; rsID: <code>{r['rsid']}</code>
                                </p>
                                <p style="margin:0 0 8px;">{r['description']}</p>
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
                    "do not contain the specific SNPs in our 30-trait panel."
                )
            else:
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
                                        "#6366f1",
                                        "#8b5cf6",
                                        "#a78bfa",
                                        "#c4b5fd",
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
            st.markdown("Individual carrier screening for each parent against the full 50-disease panel.")

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
st.markdown("---")
st.markdown(
    """
    <div style="text-align:center;padding:1rem;color:#94a3b8;font-size:0.8rem;">
        <p><b>\u26a0\ufe0f Disclaimer:</b> Tortit is an educational tool and does <b>not</b>
        provide medical advice, diagnosis, or treatment. Genetic predictions are
        probabilistic and based on simplified Mendelian models. Many traits are
        polygenic and influenced by environment. <b>Always consult a certified
        genetic counselor or healthcare professional</b> for clinical interpretation
        of genetic data.</p>
        <p>\U0001f512 <b>Privacy:</b> All processing occurs locally in your session.
        No genetic data is stored, transmitted, or shared. Files are discarded
        when you close this page.</p>
        <p>Built with Streamlit &bull; Powered by open-source genetics research</p>
    </div>
    """,
    unsafe_allow_html=True,
)
