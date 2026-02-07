"""
Mergenix — Products & Pricing Page

Feature showcase + detailed pricing comparison.
Full implementation in Phase 2.
"""

import pandas as pd
import streamlit as st
from Source.tier_config import TierType, get_tier_config
from Source.ui.components import render_page_hero, render_section_header

render_page_hero(
    "Products & Pricing",
    "Unlock the full power of genetic analysis",
)

# ---------------------------------------------------------------------------
# Pricing toggle
# ---------------------------------------------------------------------------
render_section_header("\U0001f4b0 Choose Your Plan",
                      "Pay once, use forever — no subscriptions, no recurring fees")

# ---------------------------------------------------------------------------
# Pricing cards
# ---------------------------------------------------------------------------
tier_cols = st.columns(3)

for idx, tier_type in enumerate([TierType.FREE, TierType.PREMIUM, TierType.PRO]):
    config = get_tier_config(tier_type)
    tier_name = tier_type.value

    with tier_cols[idx]:
        popular_html = '<div class="popular-badge">Most Popular</div>' if tier_type == TierType.PRO else ""
        popular_class = "popular" if tier_type == TierType.PRO else ""

        features_html = ""
        for feat in config.features:
            features_html += f'<div class="feature-item"><span class="check">\u2713</span><span>{feat}</span></div>'

        price_display = "Free" if config.price == 0 else f"${config.price:.2f}"
        period_html = '<small>one-time</small>' if config.price > 0 else ""

        card_html = (
            f'<div class="pricing-card {tier_name} {popular_class}" style="position:relative;">'
            f'{popular_html}'
            f'<div class="tier-name">{config.display_name}</div>'
            f'<div class="tier-price">{price_display} {period_html}</div>'
            f'<div class="feature-list">{features_html}</div>'
            f'</div>'
        )
        st.markdown(card_html, unsafe_allow_html=True)

        if tier_type == TierType.FREE:
            if st.button("\U0001f9ec Get Started Free", key=f"prod_cta_{tier_name}", use_container_width=True):
                st.switch_page("pages/auth.py")
        else:
            if st.button(f"\U0001f680 Buy {config.display_name}", key=f"prod_cta_{tier_name}", use_container_width=True):
                st.switch_page("pages/subscription.py")

# ---------------------------------------------------------------------------
# Feature comparison table
# ---------------------------------------------------------------------------
st.markdown("---")
render_section_header("\U0001f4ca Feature Comparison",
                      "Compare features across all tiers")

comparison_data = {
    "Feature": [
        "Genetic Diseases", "Genetic Traits", "Offspring Analysis",
        "PDF Reports", "Future Disease Updates", "Priority Support",
        "OMIM Database Access", "Advanced Filtering",
    ],
    "Free": ["25", "10", "Limited", "\u2717", "\u2717", "\u2717", "\u2717", "\u2717"],
    "Premium": ["500+", "79", "Full", "\u2713", "\u2717", "\u2717", "\u2713", "\u2713"],
    "Pro": ["2,700+", "79", "Full", "\u2713", "\u2713", "\u2713", "\u2713", "\u2713"],
}
st.markdown('<div class="comparison-table">', unsafe_allow_html=True)
st.dataframe(
    pd.DataFrame(comparison_data),
    hide_index=True,
    use_container_width=True,
    column_config={
        "Feature": st.column_config.TextColumn("Feature", width="large"),
        "Free": st.column_config.TextColumn("Free", width="small"),
        "Premium": st.column_config.TextColumn("Premium", width="small"),
        "Pro": st.column_config.TextColumn("Pro", width="small"),
    },
)
st.markdown('</div>', unsafe_allow_html=True)
