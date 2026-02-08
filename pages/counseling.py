"""
Mergenix — Genetic Counseling Directory

Search and filter genetic counselors by specialty and state.
Tier-gated: Free users see NSGC link, Premium/Pro see the full directory.
"""

import html
import os

import streamlit as st
from Source.counseling import (
    NSGC_URL,
    find_providers_by_specialty,
    get_counseling_specialties,
)
from Source.data_loader import load_counseling_providers
from Source.ui.components import render_page_hero, render_section_header

# ---------------------------------------------------------------------------
# Data paths
# ---------------------------------------------------------------------------
APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROVIDERS_PATH = os.path.join(APP_DIR, "data", "counseling_providers.json")

# ---------------------------------------------------------------------------
# Specialty display labels
# ---------------------------------------------------------------------------
SPECIALTY_LABELS = {
    "prenatal": "Prenatal",
    "carrier_screening": "Carrier Screening",
    "cancer": "Cancer",
    "cardiovascular": "Cardiovascular",
    "pediatric": "Pediatric",
    "neurogenetics": "Neurogenetics",
    "pharmacogenomics": "Pharmacogenomics",
    "general": "General",
}

# ---------------------------------------------------------------------------
# US state list for filter
# ---------------------------------------------------------------------------
US_STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
]

# ---------------------------------------------------------------------------
# Page-specific CSS
# ---------------------------------------------------------------------------
COUNSELING_CSS = """
<style>
.counselor-card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 16px;
    padding: 24px 28px;
    margin-bottom: 16px;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
}
.counselor-card:hover {
    border-color: var(--accent-teal);
    box-shadow: 0 4px 24px rgba(6,214,160,0.08);
}
.counselor-name {
    font-family: 'Sora', sans-serif;
    font-weight: 700;
    font-size: 1.15rem;
    color: var(--text-primary);
    margin: 0 0 4px;
}
.counselor-credentials {
    font-family: 'Lexend', sans-serif;
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-bottom: 10px;
}
.counselor-org {
    font-family: 'Lexend', sans-serif;
    font-size: 0.9rem;
    color: var(--text-body);
    margin-bottom: 8px;
}
.counselor-location {
    font-family: 'Lexend', sans-serif;
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-bottom: 10px;
}
.specialty-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 10px;
    font-size: 0.72rem;
    font-weight: 600;
    font-family: 'Sora', sans-serif;
    letter-spacing: 0.03em;
    margin-right: 6px;
    margin-bottom: 6px;
    background: rgba(6,214,160,0.10);
    color: var(--accent-teal);
    border: 1px solid rgba(6,214,160,0.3);
}
.telehealth-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 10px;
    font-size: 0.72rem;
    font-weight: 600;
    font-family: 'Sora', sans-serif;
    background: rgba(6,182,212,0.10);
    color: var(--accent-cyan);
    border: 1px solid rgba(6,182,212,0.3);
}
.counselor-notes {
    font-family: 'Lexend', sans-serif;
    font-size: 0.82rem;
    color: var(--text-muted);
    margin-top: 10px;
    font-style: italic;
}
.why-section {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 16px;
    padding: 28px;
    margin: 24px 0;
}
.why-section h3 {
    font-family: 'Sora', sans-serif;
    color: var(--text-primary);
    margin-top: 0;
}
.why-section p, .why-section li {
    font-family: 'Lexend', sans-serif;
    color: var(--text-body);
    font-size: 0.9rem;
    line-height: 1.7;
}
</style>
"""


def _get_user_tier() -> str:
    """Retrieve the current user's tier from session state or database."""
    # Use get_verified_tier if available (database-backed), fall back to session
    if "verified_tier" in st.session_state:
        return st.session_state["verified_tier"]
    return st.session_state.get("user_tier", "free")


def render_counseling():
    """Render the genetic counseling directory page."""
    st.markdown(COUNSELING_CSS, unsafe_allow_html=True)

    render_page_hero(
        "Genetic Counseling",
        "Connect with board-certified genetic counselors for professional guidance",
        "Find a Counselor",
    )

    # --- "Why Genetic Counseling?" educational section ----------------------
    render_section_header("Why Genetic Counseling?")

    st.markdown(
        f"""<div class="why-section">
        <h3>Understanding Your Genetic Results</h3>
        <p>Genetic counselors are healthcare professionals with specialized
        training in medical genetics and counseling. They can help you:</p>
        <ul>
            <li>Interpret your carrier screening and disease risk results</li>
            <li>Understand inheritance patterns and what they mean for your family</li>
            <li>Make informed decisions about family planning</li>
            <li>Navigate the emotional aspects of genetic information</li>
            <li>Connect with specialists and support resources</li>
        </ul>
        <p>The National Society of Genetic Counselors (NSGC) maintains a
        directory of certified counselors:
        <a href="{NSGC_URL}" target="_blank" style="color:var(--accent-teal);">
        Find a Genetic Counselor</a></p>
        </div>""",
        unsafe_allow_html=True,
    )

    # --- Tier gating --------------------------------------------------------
    tier = _get_user_tier()

    if tier == "free":
        st.info(
            "Upgrade to Premium or Pro to access the full genetic counselor "
            "directory with search and filtering.\n\n"
            f"In the meantime, visit the [NSGC directory]({NSGC_URL}) "
            "to find a counselor near you."
        )
        return

    # --- Full directory (Premium / Pro) -------------------------------------
    render_section_header("Counselor Directory")

    providers = load_counseling_providers(PROVIDERS_PATH)
    specialties = get_counseling_specialties()

    # Filters
    col1, col2 = st.columns(2)
    with col1:
        selected_specialty = st.selectbox(
            "Filter by specialty",
            options=["All"] + specialties,
            format_func=lambda x: SPECIALTY_LABELS.get(x, x.title()) if x != "All" else "All Specialties",
            key="counseling_specialty_filter",
        )
    with col2:
        # Only show states that have providers
        provider_states = sorted({p["state"] for p in providers})
        selected_state = st.selectbox(
            "Filter by state",
            options=["All"] + provider_states,
            key="counseling_state_filter",
        )

    # Apply filters
    spec_filter = selected_specialty if selected_specialty != "All" else None
    state_filter = selected_state if selected_state != "All" else None
    filtered = find_providers_by_specialty(providers, specialty=spec_filter, state=state_filter)

    # Results count
    st.markdown(
        f'<p style="font-family:\'Lexend\',sans-serif;color:var(--text-muted);'
        f'font-size:0.9rem;margin-bottom:8px;">'
        f'Showing <b style="color:var(--accent-teal);">{len(filtered)}</b> of '
        f'<b style="color:var(--accent-cyan);">{len(providers)}</b> counselors</p>',
        unsafe_allow_html=True,
    )

    if not filtered:
        st.info("No counselors match your filters. Try broadening your search.")
        return

    # Render provider cards
    for provider in filtered:
        # HTML-escape all provider fields to prevent XSS
        name = html.escape(provider.get("name", ""))
        credentials = html.escape(provider.get("credentials", ""))
        organization = html.escape(provider.get("organization", ""))
        city = html.escape(provider.get("city", ""))
        state = html.escape(provider.get("state", ""))
        notes_text = html.escape(provider.get("notes", ""))

        # Specialty badges
        badges = "".join(
            f'<span class="specialty-badge">{html.escape(SPECIALTY_LABELS.get(s, s.title()).upper())}</span>'
            for s in provider.get("specialty", [])
        )

        # Telehealth badge
        telehealth_html = ""
        if provider.get("accepts_telehealth"):
            telehealth_html = '<span class="telehealth-badge">TELEHEALTH</span>'

        # Notes
        notes_html = ""
        if notes_text:
            notes_html = f'<p class="counselor-notes">{notes_text}</p>'

        st.markdown(
            f"""<div class="counselor-card">
                <h4 class="counselor-name">{name}</h4>
                <p class="counselor-credentials">{credentials}</p>
                <p class="counselor-org">{organization}</p>
                <p class="counselor-location">
                    {city}, {state}
                    &nbsp; {telehealth_html}
                </p>
                <div>{badges}</div>
                {notes_html}
            </div>""",
            unsafe_allow_html=True,
        )


# ---------------------------------------------------------------------------
# Page entry point
# ---------------------------------------------------------------------------
render_counseling()
