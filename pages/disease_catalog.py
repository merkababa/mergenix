"""
Mergenix — Disease Catalog

Comprehensive genetic disease reference with interactive filtering,
statistics, and detailed condition profiles.

This is a refactored version of pages/2_Disease_Catalog.py with CSS removed
(injected globally by app.py) and sidebar filters moved to inline.
"""

import json
import math
import os
from collections import Counter

import pandas as pd
import plotly.graph_objects as go
import streamlit as st
from Source.ui.components import render_page_hero, render_section_header

# ---------------------------------------------------------------------------
# Data paths
# ---------------------------------------------------------------------------
APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(APP_DIR, "data")
CARRIER_PANEL_PATH = os.path.join(DATA_DIR, "carrier_panel.json")


@st.cache_data
def load_diseases():
    with open(CARRIER_PANEL_PATH) as f:
        return json.load(f)


def parse_carrier_freq(freq_str):
    try:
        return int(freq_str.split("in")[1].strip().replace(",", ""))
    except Exception:
        return 999999


def format_inheritance(raw):
    mapping = {
        "autosomal_recessive": "Autosomal Recessive",
        "autosomal_dominant": "Autosomal Dominant",
        "X-linked": "X-Linked",
        "x-linked": "X-Linked",
    }
    return mapping.get(raw, raw.replace("_", " ").title())


def severity_indicator(sev):
    return {"high": "\U0001f534 High", "moderate": "\U0001f7e1 Moderate", "low": "\U0001f7e2 Low"}.get(sev, sev)


# ---------------------------------------------------------------------------
# Load data
# ---------------------------------------------------------------------------
diseases = load_diseases()
total_count = len(diseases)
unique_genes = len(set(d["gene"] for d in diseases))
high_sev_count = sum(1 for d in diseases if d.get("severity") == "high")
inheritance_counts = Counter(d["inheritance"] for d in diseases)
most_common_inheritance = inheritance_counts.most_common(1)[0]
most_common_inh_label = format_inheritance(most_common_inheritance[0])
most_common_inh_pct = round(most_common_inheritance[1] / total_count * 100)

# ---------------------------------------------------------------------------
# Hero
# ---------------------------------------------------------------------------
render_page_hero(
    "Disease Catalog",
    "Comprehensive Genetic Disease Reference",
    f"\U0001f9ec {total_count} Conditions Screened",
)

# ---------------------------------------------------------------------------
# Summary metrics
# ---------------------------------------------------------------------------
mc1, mc2, mc3, mc4 = st.columns(4)
with mc1:
    st.markdown(
        f'<div class="catalog-metric"><span class="metric-icon">\U0001f9ec</span>'
        f'<div class="metric-value">{total_count}</div><div class="metric-label">Total Diseases</div></div>',
        unsafe_allow_html=True,
    )
with mc2:
    st.markdown(
        f'<div class="catalog-metric"><span class="metric-icon">\U0001f52c</span>'
        f'<div class="metric-value">{unique_genes}</div><div class="metric-label">Unique Genes</div></div>',
        unsafe_allow_html=True,
    )
with mc3:
    st.markdown(
        f'<div class="catalog-metric"><span class="metric-icon">\u26a0\ufe0f</span>'
        f'<div class="metric-value">{high_sev_count}</div><div class="metric-label">High Severity</div></div>',
        unsafe_allow_html=True,
    )
with mc4:
    st.markdown(
        f'<div class="catalog-metric"><span class="metric-icon">\U0001f4ca</span>'
        f'<div class="metric-value">{most_common_inh_pct}%</div>'
        f'<div class="metric-label">{most_common_inh_label}</div></div>',
        unsafe_allow_html=True,
    )

# ---------------------------------------------------------------------------
# Inline filters (replaces sidebar)
# ---------------------------------------------------------------------------
with st.expander("\U0001f50d Filters & Search", expanded=False):
    fc1, fc2 = st.columns(2)
    with fc1:
        search_query = st.text_input(
            "Search diseases",
            placeholder="Type disease name or gene...",
            key="disease_search",
        )
        severity_filter = st.multiselect(
            "Severity",
            options=["high", "moderate", "low"],
            format_func=lambda x: {"high": "\U0001f534 High", "moderate": "\U0001f7e1 Moderate", "low": "\U0001f7e2 Low"}[x],
            default=[],
            key="severity_filter",
        )
    with fc2:
        inheritance_options = sorted(set(d["inheritance"] for d in diseases))
        inheritance_filter = st.multiselect(
            "Inheritance Pattern",
            options=inheritance_options,
            format_func=format_inheritance,
            default=[],
            key="inheritance_filter",
        )
        category_options = sorted(set(d.get("category", "Other") for d in diseases))
        category_filter = st.multiselect(
            "Category",
            options=category_options,
            default=[],
            key="category_filter",
        )

    all_freqs = [parse_carrier_freq(d["carrier_frequency"]) for d in diseases]
    freq_range = st.slider(
        "Carrier Frequency (1 in X)",
        min_value=min(all_freqs),
        max_value=max(all_freqs),
        value=(min(all_freqs), max(all_freqs)),
        help="Lower numbers = more common carriers.",
        key="freq_range",
    )

    if st.button("\U0001f504 Reset Filters", use_container_width=True):
        for key in ["disease_search", "severity_filter", "inheritance_filter", "category_filter", "freq_range"]:
            if key in st.session_state:
                del st.session_state[key]
        st.rerun()

# ---------------------------------------------------------------------------
# Apply filters
# ---------------------------------------------------------------------------
filtered = diseases.copy()

if search_query:
    q = search_query.lower()
    filtered = [
        d for d in filtered
        if q in d["condition"].lower() or q in d["gene"].lower() or q in d.get("description", "").lower()
    ]
if severity_filter:
    filtered = [d for d in filtered if d.get("severity") in severity_filter]
if inheritance_filter:
    filtered = [d for d in filtered if d["inheritance"] in inheritance_filter]
if category_filter:
    filtered = [d for d in filtered if d.get("category", "Other") in category_filter]
filtered = [
    d for d in filtered
    if freq_range[0] <= parse_carrier_freq(d["carrier_frequency"]) <= freq_range[1]
]

# ---------------------------------------------------------------------------
# Interactive table
# ---------------------------------------------------------------------------
render_section_header("\U0001f4cb Disease Directory", "Browse, search, and sort all screened conditions")

st.markdown(
    f'<p style="font-family:\'Lexend\',sans-serif;color:#94a3b8;font-size:0.9rem;margin-bottom:8px;">'
    f'Showing <b style="color:#06d6a0;">{len(filtered)}</b> of <b style="color:#06b6d4;">{total_count}</b> conditions</p>',
    unsafe_allow_html=True,
)

df_data = []
for d in filtered:
    freq_num = parse_carrier_freq(d["carrier_frequency"])
    df_data.append({
        "Disease": d["condition"],
        "Gene": d["gene"],
        "Carrier Frequency": d["carrier_frequency"],
        "Severity": severity_indicator(d.get("severity", "unknown")),
        "Prevalence": d.get("prevalence", "---"),
        "Inheritance": format_inheritance(d["inheritance"]),
        "Category": d.get("category", "Other"),
        "_freq_sort": freq_num,
    })

df = pd.DataFrame(df_data)
if not df.empty:
    df_display = df.drop(columns=["_freq_sort"])
    st.dataframe(
        df_display,
        hide_index=True,
        use_container_width=True,
        height=min(600, 40 + len(df_display) * 36),
        column_config={
            "Disease": st.column_config.TextColumn("Disease", width="large"),
            "Gene": st.column_config.TextColumn("Gene", width="small"),
            "Carrier Frequency": st.column_config.TextColumn("Carrier Freq.", width="small"),
            "Severity": st.column_config.TextColumn("Severity", width="small"),
            "Prevalence": st.column_config.TextColumn("Prevalence", width="small"),
            "Inheritance": st.column_config.TextColumn("Inheritance", width="medium"),
            "Category": st.column_config.TextColumn("Category", width="medium"),
        },
    )
else:
    st.info("No conditions match your current filters. Try adjusting the filters above.")

# ---------------------------------------------------------------------------
# Paginated disease detail cards
# ---------------------------------------------------------------------------
render_section_header("\U0001f4c4 Disease Profiles", "Expandable detail cards for each condition")

if len(filtered) > 0:
    ITEMS_PER_PAGE = 30
    total_pages = max(1, math.ceil(len(filtered) / ITEMS_PER_PAGE))

    page_cols = st.columns([1, 3, 1])
    with page_cols[0]:
        if st.button("\u25c0 Previous", disabled=(st.session_state.get("catalog_page", 1) <= 1), key="prev_page"):
            st.session_state["catalog_page"] = max(1, st.session_state.get("catalog_page", 1) - 1)
            st.rerun()
    with page_cols[1]:
        new_page = st.number_input("Page", min_value=1, max_value=total_pages, value=st.session_state.get("catalog_page", 1), key="page_jump")
        if new_page != st.session_state.get("catalog_page", 1):
            st.session_state["catalog_page"] = new_page
            st.rerun()
    with page_cols[2]:
        if st.button("Next \u25b6", disabled=(st.session_state.get("catalog_page", 1) >= total_pages), key="next_page"):
            st.session_state["catalog_page"] = min(total_pages, st.session_state.get("catalog_page", 1) + 1)
            st.rerun()

    current_page = st.session_state.get("catalog_page", 1)
    if current_page > total_pages:
        current_page = total_pages
        st.session_state["catalog_page"] = current_page

    start_idx = (current_page - 1) * ITEMS_PER_PAGE
    end_idx = min(start_idx + ITEMS_PER_PAGE, len(filtered))
    page_items = filtered[start_idx:end_idx]

    st.markdown(
        f'<p class="pagination-info">Page {current_page} of {total_pages} '
        f'&mdash; Showing {start_idx + 1}-{end_idx} of {len(filtered)}</p>',
        unsafe_allow_html=True,
    )

    for idx, d in enumerate(page_items):
        sev = d.get("severity", "unknown")
        sev_class = sev if sev in ("high", "moderate", "low") else ""
        omim_id = d.get("omim_id", "")
        prevalence = d.get("prevalence", "")
        omim_link = f"https://omim.org/entry/{omim_id}" if omim_id else ""

        with st.expander(f"{d['condition']}  ({d['gene']})", expanded=False):
            category = d.get("category", "Other")
            meta_tags = (
                f'<span class="meta-tag"><b>Gene:</b> {d["gene"]}</span>'
                f'<span class="meta-tag"><b>Inheritance:</b> {format_inheritance(d["inheritance"])}</span>'
                f'<span class="meta-tag"><b>Carrier Freq:</b> {d["carrier_frequency"]}</span>'
                f'<span class="meta-tag"><b>rsID:</b> {d["rsid"]}</span>'
                f'<span class="meta-tag"><b>Category:</b> {category}</span>'
            )
            if prevalence:
                meta_tags += f'<span class="meta-tag"><b>Prevalence:</b> {prevalence}</span>'

            sev_badge_html = f'<span class="sev-badge {sev}">{sev.upper()}</span>'
            omim_html = ""
            if omim_link:
                omim_html = (
                    f'<a href="{omim_link}" target="_blank" style="display:inline-block;margin-top:12px;'
                    f"padding:5px 14px;background:rgba(6,214,160,0.08);border:1px solid rgba(6,214,160,0.2);"
                    f"border-radius:8px;font-size:0.8rem;font-family:'Lexend',sans-serif;color:#06d6a0 !important;"
                    f'text-decoration:none;transition:all 0.2s ease;">'
                    f'\U0001f517 View on OMIM</a>'
                )

            st.markdown(
                f"""<div class="disease-card sev-{sev_class}" style="animation-delay:{idx * 0.03}s;">
                    <h4>{d["condition"]} {sev_badge_html}</h4>
                    <p class="desc">{d.get("description", "No description available.")}</p>
                    <div class="meta">{meta_tags}</div>
                    {omim_html}
                </div>""",
                unsafe_allow_html=True,
            )

# ---------------------------------------------------------------------------
# Statistics & Charts
# ---------------------------------------------------------------------------
st.markdown("---")
render_section_header("\U0001f4ca Analytics", "Distribution and frequency insights across the full panel")

chart_col1, chart_col2 = st.columns(2)

# Chart 1: Inheritance Distribution (Donut)
with chart_col1:
    inh_labels = [format_inheritance(k) for k in inheritance_counts.keys()]
    inh_values = list(inheritance_counts.values())
    inh_colors = {"Autosomal Recessive": "#06d6a0", "Autosomal Dominant": "#8b5cf6", "X-Linked": "#06b6d4"}
    colors_mapped = [inh_colors.get(lbl, "#94a3b8") for lbl in inh_labels]

    fig_inh = go.Figure(data=[go.Pie(
        labels=inh_labels, values=inh_values, hole=0.55,
        marker=dict(colors=colors_mapped, line=dict(color="#050810", width=2)),
        textfont=dict(family="Sora", size=13, color="#e2e8f0"),
        hovertemplate="<b>%{label}</b><br>%{value} conditions<br>%{percent}<extra></extra>",
    )])
    fig_inh.update_layout(
        title=dict(text="Inheritance Distribution", font=dict(family="Sora", size=18, color="#e2e8f0"), x=0.5),
        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
        legend=dict(font=dict(family="Lexend", size=12, color="#94a3b8"), bgcolor="rgba(0,0,0,0)"),
        margin=dict(l=20, r=20, t=60, b=20), height=380,
        annotations=[dict(text=f"<b>{total_count}</b><br><span style='font-size:11px;color:#94a3b8;'>Total</span>",
                          x=0.5, y=0.5, font=dict(family="Sora", size=24, color="#06d6a0"), showarrow=False)],
    )
    st.plotly_chart(fig_inh, use_container_width=True)

# Chart 2: Severity Distribution (Horizontal Bar)
with chart_col2:
    sev_counts = Counter(d.get("severity", "unknown") for d in diseases)
    sev_order = ["high", "moderate", "low"]
    sev_labels = [s.title() for s in sev_order if s in sev_counts]
    sev_values = [sev_counts[s] for s in sev_order if s in sev_counts]
    sev_colors_map = {"High": "#ef4444", "Moderate": "#f59e0b", "Low": "#06d6a0"}
    sev_colors = [sev_colors_map.get(lbl, "#94a3b8") for lbl in sev_labels]

    fig_sev = go.Figure(data=[go.Bar(
        y=sev_labels, x=sev_values, orientation="h",
        marker=dict(color=sev_colors, line=dict(color="#050810", width=1), cornerradius=6),
        text=[f"  {v}" for v in sev_values], textposition="outside",
        textfont=dict(family="Sora", size=14, color="#e2e8f0"),
        hovertemplate="<b>%{y}</b>: %{x} conditions<extra></extra>",
    )])
    fig_sev.update_layout(
        title=dict(text="Severity Distribution", font=dict(family="Sora", size=18, color="#e2e8f0"), x=0.5),
        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
        xaxis=dict(showgrid=True, gridcolor="rgba(148,163,184,0.06)", tickfont=dict(family="Lexend", color="#94a3b8"),
                   title=dict(text="Number of Conditions", font=dict(family="Lexend", size=12, color="#64748b"))),
        yaxis=dict(tickfont=dict(family="Sora", size=14, color="#e2e8f0")),
        margin=dict(l=20, r=60, t=60, b=40), height=380,
    )
    st.plotly_chart(fig_sev, use_container_width=True)

# Chart 3: Category Distribution
render_section_header("\U0001f4ca Category Distribution", "Diseases grouped by medical category")

category_counts = Counter(d.get("category", "Other") for d in diseases)
sorted_cats = category_counts.most_common()
cat_labels = [c[0] for c in sorted_cats]
cat_values = [c[1] for c in sorted_cats]
color_palette = ["#06d6a0", "#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316", "#6366f1", "#84cc16", "#06b6d4"]
cat_colors = [color_palette[i % len(color_palette)] for i in range(len(cat_labels))]

fig_cat = go.Figure(data=[go.Bar(
    y=list(reversed(cat_labels)), x=list(reversed(cat_values)), orientation="h",
    marker=dict(color=list(reversed(cat_colors)), line=dict(color="#050810", width=1), cornerradius=6),
    text=[f"  {v}" for v in reversed(cat_values)], textposition="outside",
    textfont=dict(family="Sora", size=13, color="#e2e8f0"),
    hovertemplate="<b>%{y}</b>: %{x} conditions<extra></extra>",
)])
fig_cat.update_layout(
    paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
    xaxis=dict(showgrid=True, gridcolor="rgba(148,163,184,0.06)", tickfont=dict(family="Lexend", color="#94a3b8"),
               title=dict(text="Number of Conditions", font=dict(family="Lexend", size=12, color="#64748b"))),
    yaxis=dict(tickfont=dict(family="Lexend", size=11, color="#e2e8f0")),
    margin=dict(l=10, r=80, t=20, b=40), height=max(400, len(cat_labels) * 25),
)
st.plotly_chart(fig_cat, use_container_width=True)

# Chart 4: Top 15 Most Common
render_section_header("\U0001f3af Most Common Carrier Conditions", "Ranked by carrier frequency")

sorted_by_freq = sorted(diseases, key=lambda d: parse_carrier_freq(d["carrier_frequency"]))
top_15 = sorted_by_freq[:15]
top_labels = [d["condition"] for d in top_15]
top_freqs = [parse_carrier_freq(d["carrier_frequency"]) for d in top_15]
top_display_values = [round(1 / f * 1000, 2) for f in top_freqs]
top_hover_text = [f"1 in {f:,}" for f in top_freqs]
top_colors = [{"high": "#ef4444", "moderate": "#f59e0b", "low": "#06d6a0"}.get(d.get("severity", "low"), "#94a3b8") for d in top_15]

fig_top = go.Figure(data=[go.Bar(
    y=list(reversed(top_labels)), x=list(reversed(top_display_values)), orientation="h",
    marker=dict(color=list(reversed(top_colors)), line=dict(color="#050810", width=1), cornerradius=6),
    text=[f"  {t}" for t in reversed(top_hover_text)], textposition="outside",
    textfont=dict(family="Lexend", size=11, color="#94a3b8"),
    hovertemplate="<b>%{y}</b><br>Carrier frequency: %{text}<extra></extra>",
)])
fig_top.update_layout(
    paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
    xaxis=dict(showgrid=True, gridcolor="rgba(148,163,184,0.06)", tickfont=dict(family="Lexend", color="#94a3b8"),
               title=dict(text="Relative Commonness (higher = more common)", font=dict(family="Lexend", size=12, color="#64748b"))),
    yaxis=dict(tickfont=dict(family="Lexend", size=11, color="#e2e8f0")),
    margin=dict(l=10, r=80, t=20, b=40), height=520,
)
st.plotly_chart(fig_top, use_container_width=True)

# ---------------------------------------------------------------------------
# Insights
# ---------------------------------------------------------------------------
st.markdown("---")
render_section_header("\U0001f4a1 Insights", "Interesting facts from the disease panel")

most_common = sorted_by_freq[0]
rarest = sorted_by_freq[-1]
ar_pct = round(inheritance_counts.get("autosomal_recessive", 0) / total_count * 100)

ins1, ins2, ins3, ins4 = st.columns(4)
for col, icon, title, value, sub in [
    (ins1, "\U0001f451", "Most Common Carrier", most_common["condition"], f"{most_common['carrier_frequency']} carriers"),
    (ins2, "\U0001f48e", "Rarest Condition", rarest["condition"], f"{rarest['carrier_frequency']} carriers"),
    (ins3, "\U0001f9ec", "Autosomal Recessive", f"{ar_pct}% of panel", f"{inheritance_counts.get('autosomal_recessive', 0)} of {total_count} conditions"),
    (ins4, "\U0001f465", "Population Fact", "~24% of all humans", "carry at least 1 pathogenic variant"),
]:
    with col:
        st.markdown(
            f"""<div class="insight-card">
                <span class="insight-icon">{icon}</span>
                <div class="insight-title">{title}</div>
                <div class="insight-value">{value}</div>
                <div class="insight-sub">{sub}</div>
            </div>""",
            unsafe_allow_html=True,
        )
