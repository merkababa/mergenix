"""
Mergenix — Genetic Glossary

Plain-language definitions for genetic terms used throughout the app.
Searchable and filterable by category.
"""

import json
import os
import re

import streamlit as st
from Source.ui.components import render_page_hero, render_section_header

# ---------------------------------------------------------------------------
# Data paths
# ---------------------------------------------------------------------------
APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GLOSSARY_PATH = os.path.join(APP_DIR, "data", "glossary.json")


@st.cache_data
def load_glossary():
    with open(GLOSSARY_PATH) as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Category metadata
# ---------------------------------------------------------------------------
CATEGORY_META = {
    "basics": {
        "label": "Basics",
        "color": "var(--accent-teal)",
        "bg": "rgba(6,214,160,0.10)",
        "border": "rgba(6,214,160,0.3)",
    },
    "inheritance": {
        "label": "Inheritance",
        "color": "var(--accent-violet)",
        "bg": "rgba(139,92,246,0.10)",
        "border": "rgba(139,92,246,0.3)",
    },
    "testing": {
        "label": "Testing",
        "color": "var(--accent-cyan)",
        "bg": "rgba(6,182,212,0.10)",
        "border": "rgba(6,182,212,0.3)",
    },
    "clinical": {
        "label": "Clinical",
        "color": "var(--accent-amber)",
        "bg": "rgba(245,158,11,0.10)",
        "border": "rgba(245,158,11,0.3)",
    },
}

# ---------------------------------------------------------------------------
# Glossary-specific CSS
# ---------------------------------------------------------------------------
GLOSSARY_CSS = """
<style>
.glossary-card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 16px;
    padding: 24px 28px;
    margin-bottom: 16px;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
    animation: cardReveal 0.4s ease-out both;
}
.glossary-card:hover {
    border-color: var(--accent-teal);
    box-shadow: 0 4px 24px rgba(6,214,160,0.08);
}
.glossary-term {
    font-family: 'Sora', sans-serif;
    font-weight: 700;
    font-size: 1.25rem;
    color: var(--text-primary);
    margin: 0 0 8px;
}
.glossary-definition {
    font-family: 'Lexend', sans-serif;
    color: var(--text-body);
    font-size: 0.93rem;
    line-height: 1.7;
    margin: 0 0 14px;
}
.glossary-category-badge {
    display: inline-block;
    padding: 3px 12px;
    border-radius: 10px;
    font-size: 0.75rem;
    font-weight: 600;
    font-family: 'Sora', sans-serif;
    letter-spacing: 0.03em;
    margin-right: 8px;
}
.glossary-related {
    font-family: 'Lexend', sans-serif;
    font-size: 0.82rem;
    color: var(--text-muted);
    margin-top: 10px;
}
.glossary-related a {
    color: var(--accent-teal);
    text-decoration: none;
    border-bottom: 1px dotted rgba(6,214,160,0.3);
    transition: color 0.2s;
}
.glossary-related a:hover {
    color: var(--accent-cyan);
}
.glossary-learn-more {
    display: inline-block;
    margin-top: 12px;
    padding: 5px 14px;
    background: rgba(6,214,160,0.08);
    border: 1px solid rgba(6,214,160,0.2);
    border-radius: 8px;
    font-size: 0.8rem;
    font-family: 'Lexend', sans-serif;
    color: var(--accent-teal) !important;
    text-decoration: none;
    transition: all 0.2s ease;
}
.glossary-learn-more:hover {
    background: rgba(6,214,160,0.15);
    border-color: rgba(6,214,160,0.4);
}
.glossary-stats {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 24px;
}
.glossary-stat {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 12px;
    padding: 14px 20px;
    text-align: center;
    flex: 1;
    min-width: 120px;
}
.glossary-stat .stat-value {
    font-family: 'Sora', sans-serif;
    font-weight: 700;
    font-size: 1.6rem;
    color: var(--accent-teal);
}
.glossary-stat .stat-label {
    font-family: 'Lexend', sans-serif;
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-top: 2px;
}
</style>
"""


def _make_anchor(term: str) -> str:
    """Create a URL-safe anchor from a term name."""
    return re.sub(r"[^a-z0-9]+", "-", term.lower()).strip("-")


def render_glossary():
    """Render the full glossary page."""
    glossary = load_glossary()

    st.markdown(GLOSSARY_CSS, unsafe_allow_html=True)

    # Hero
    render_page_hero(
        "Genetic Glossary",
        "Plain-language definitions for the genetics terms used in Mergenix",
        f"\U0001f4d6 {len(glossary)} Terms Defined",
    )

    # Stats bar
    categories = {e["category"] for e in glossary}
    cat_counts = {}
    for cat in categories:
        cat_counts[cat] = sum(1 for e in glossary if e["category"] == cat)

    stats_html = ""
    for cat in sorted(cat_counts.keys()):
        meta = CATEGORY_META.get(cat, CATEGORY_META["basics"])
        stats_html += (
            f'<div class="glossary-stat">'
            f'<div class="stat-value" style="color:{meta["color"]};">{cat_counts[cat]}</div>'
            f'<div class="stat-label">{meta["label"]}</div>'
            f"</div>"
        )
    st.markdown(f'<div class="glossary-stats">{stats_html}</div>', unsafe_allow_html=True)

    # Search and filter controls
    render_section_header("\U0001f50d Search & Filter")

    fc1, fc2 = st.columns([2, 1])
    with fc1:
        search_query = st.text_input(
            "Search terms",
            placeholder="Type a term or keyword...",
            key="glossary_search",
        )
    with fc2:
        cat_options = sorted(categories)
        cat_labels = {c: CATEGORY_META.get(c, {}).get("label", c.title()) for c in cat_options}
        category_filter = st.multiselect(
            "Category",
            options=cat_options,
            format_func=lambda x: cat_labels[x],
            default=[],
            key="glossary_category",
        )

    # Filter glossary
    filtered = glossary.copy()
    if search_query:
        q = search_query.lower()
        filtered = [
            e for e in filtered
            if q in e["term"].lower()
            or q in e["definition"].lower()
            or any(q in rt.lower() for rt in e.get("related_terms", []))
        ]
    if category_filter:
        filtered = [e for e in filtered if e["category"] in category_filter]

    # Sort alphabetically
    filtered.sort(key=lambda e: e["term"].lower())

    # Build lookup of all term anchors for related-term linking
    all_anchors = {e["term"].lower(): _make_anchor(e["term"]) for e in glossary}

    # Results count
    st.markdown(
        f'<p style="font-family:\'Lexend\',sans-serif;color:var(--text-muted);font-size:0.9rem;margin-bottom:8px;">'
        f'Showing <b style="color:var(--accent-teal);">{len(filtered)}</b> of '
        f'<b style="color:var(--accent-cyan);">{len(glossary)}</b> terms</p>',
        unsafe_allow_html=True,
    )

    if not filtered:
        st.info("No terms match your search. Try a different keyword or clear your filters.")
        return

    # Render term cards
    render_section_header("\U0001f4da Terms")

    for entry in filtered:
        term = entry["term"]
        definition = entry["definition"]
        category = entry["category"]
        related = entry.get("related_terms", [])
        learn_url = entry.get("learn_more_url", "")
        anchor = _make_anchor(term)

        meta = CATEGORY_META.get(category, CATEGORY_META["basics"])

        # Category badge
        badge_html = (
            f'<span class="glossary-category-badge" style="'
            f"background:{meta['bg']};color:{meta['color']};"
            f"border:1px solid {meta['border']};"
            f'">{meta["label"].upper()}</span>'
        )

        # Related terms as links
        related_html = ""
        if related:
            links = []
            for rt in related:
                rt_anchor = all_anchors.get(rt.lower())
                if rt_anchor:
                    links.append(f'<a href="#{rt_anchor}">{rt}</a>')
                else:
                    links.append(f"<span>{rt}</span>")
            related_html = (
                f'<div class="glossary-related">'
                f'<b>Related:</b> {", ".join(links)}'
                f"</div>"
            )

        # Learn more link
        learn_html = ""
        if learn_url:
            learn_html = (
                f'<a href="{learn_url}" target="_blank" '
                f'class="glossary-learn-more">'
                f"\U0001f517 Learn more</a>"
            )

        st.markdown(
            f"""<div class="glossary-card" id="{anchor}">
                <h3 class="glossary-term">{term} {badge_html}</h3>
                <p class="glossary-definition">{definition}</p>
                {related_html}
                {learn_html}
            </div>""",
            unsafe_allow_html=True,
        )


# ---------------------------------------------------------------------------
# Page entry point
# ---------------------------------------------------------------------------
render_glossary()
