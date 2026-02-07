"""
Mergenix — Purchase & Upgrade

Manage your Mergenix plan, view pricing, and upgrade.
All paid tiers are one-time purchases — pay once, use forever.
"""

import os

import pandas as pd
import streamlit as st
from Source.auth import get_current_user, require_auth
from Source.payments.paypal_handler import PayPalError, PayPalHandler
from Source.payments.stripe_handler import StripeHandler, StripeHandlerError
from Source.tier_config import TierType, get_tier_config, get_upgrade_message
from Source.ui.components import render_page_hero, render_section_header

# Require authentication
require_auth()

user = get_current_user()
if not user:
    st.stop()

current_tier = user.get("tier", "free")

# Hero
render_page_hero(
    "Upgrade Your Plan",
    "Pay once, use forever — no subscriptions",
)

# Handle URL parameters (success/cancel)
query_params = st.query_params
if "success" in query_params:
    st.success("Payment successful! Your plan has been activated.")
    st.balloons()
elif "cancel" in query_params:
    st.warning("Payment was cancelled. Your plan remains unchanged.")

# Current Plan Section
render_section_header("\U0001f4b3 Current Plan", "Your active plan and benefits")

tier_config = get_tier_config(TierType(current_tier))
st.markdown(
    f"""<div class="current-plan-card">
        <h3 style="margin:0 0 16px;font-family:'Sora',sans-serif;font-weight:700;color:#e2e8f0;">
            {tier_config.display_name} Tier
            <span class="tier-badge {current_tier}">{current_tier.upper()}</span>
        </h3>
        <p style="font-family:'Lexend',sans-serif;color:#94a3b8;font-size:0.95rem;margin-bottom:20px;">
            {get_upgrade_message(TierType(current_tier))}</p>
    </div>""",
    unsafe_allow_html=True,
)

st.markdown("#### Features Included")
feature_cols = st.columns(2)
for idx, feature in enumerate(tier_config.features):
    with feature_cols[idx % 2]:
        st.markdown(
            f'<div style="font-family:\'Lexend\',sans-serif;color:#cbd5e1;margin-bottom:8px;">'
            f'<span style="color:#06d6a0;margin-right:8px;">\u2713</span>{feature}</div>',
            unsafe_allow_html=True,
        )

st.markdown("---")

# Pricing Table
render_section_header("\U0001f4b0 Choose Your Plan", "One-time purchase — no recurring fees")

tier_cols = st.columns(3)
for idx, tier_type in enumerate([TierType.FREE, TierType.PREMIUM, TierType.PRO]):
    config = get_tier_config(tier_type)
    tier_name = tier_type.value
    is_current = tier_name == current_tier

    with tier_cols[idx]:
        current_class = "current" if is_current else ""
        popular_html = '<div class="popular-badge">Most Popular</div>' if tier_type == TierType.PRO and not is_current else ""
        popular_class = "popular" if tier_type == TierType.PRO and not is_current else ""

        features_html = ""
        for feat in config.features:
            features_html += f'<div class="feature-item"><span class="check">\u2713</span><span>{feat}</span></div>'

        price_display = "Free" if config.price == 0 else f"${config.price:.2f}"
        period_html = '<small>one-time</small>' if config.price > 0 else ""

        st.markdown(
            f"""<div class="pricing-card {tier_name} {current_class} {popular_class}" style="position:relative;">
                {popular_html}
                <div class="tier-name">{config.display_name}</div>
                <div class="tier-price">{price_display} {period_html}</div>
                <div class="feature-list">{features_html}</div>
            </div>""",
            unsafe_allow_html=True,
        )

        if is_current:
            st.markdown('<div class="current-badge">Current Plan</div>', unsafe_allow_html=True)
        elif tier_name == "free":
            st.markdown(
                '<div style="margin-top:16px;"><button disabled style="width:100%;padding:12px;border-radius:10px;'
                "background:rgba(148,163,184,0.2);color:#94a3b8;border:none;font-family:'Sora',sans-serif;"
                'font-weight:600;">Always Free</button></div>',
                unsafe_allow_html=True,
            )
        else:
            if st.button(f"\U0001f680 Buy {config.display_name}", key=f"upgrade_{tier_name}", use_container_width=True):
                st.session_state["selected_tier"] = tier_name
                st.session_state["show_payment_selection"] = True
                st.rerun()

        st.markdown("</div>", unsafe_allow_html=True)

# Payment Selection
if st.session_state.get("show_payment_selection", False):
    selected_tier = st.session_state.get("selected_tier", "premium")
    st.markdown("---")
    render_section_header("\U0001f4b3 Select Payment Method", f"Complete your {selected_tier.title()} purchase")

    payment_col1, payment_col2 = st.columns(2)
    with payment_col1:
        if st.button("Pay with Stripe", use_container_width=True, type="primary"):
            try:
                stripe_key = os.getenv("STRIPE_SECRET_KEY", "")
                if not stripe_key:
                    st.error("Stripe is not configured. Contact support.")
                else:
                    handler = StripeHandler(stripe_key)
                    base_url = os.getenv("BASE_URL", "http://localhost:8501")
                    session = handler.create_checkout_session(
                        customer_email=user["email"], tier=selected_tier,
                        billing_period="onetime",
                        success_url=f"{base_url}/Subscription?success=true",
                        cancel_url=f"{base_url}/Subscription?cancel=true",
                    )
                    st.markdown(
                        f'<a href="{session["url"]}" target="_blank" style="display:inline-block;padding:12px 24px;'
                        f'background:#06d6a0;color:#050810;border-radius:10px;font-weight:700;text-decoration:none;margin-top:16px;">'
                        f'Proceed to Stripe Checkout</a>',
                        unsafe_allow_html=True,
                    )
            except StripeHandlerError as e:
                st.error(f"Error creating checkout session: {e}")

    with payment_col2:
        if st.button("Pay with PayPal", use_container_width=True):
            try:
                paypal_client_id = os.getenv("PAYPAL_CLIENT_ID", "")
                paypal_secret = os.getenv("PAYPAL_CLIENT_SECRET", "")
                if not paypal_client_id or not paypal_secret:
                    st.error("PayPal is not configured. Contact support.")
                else:
                    handler = PayPalHandler(client_id=paypal_client_id, client_secret=paypal_secret, sandbox=True)
                    base_url = os.getenv("BASE_URL", "http://localhost:8501")
                    result = handler.create_subscription(
                        tier=selected_tier, billing_period="onetime",
                        return_url=f"{base_url}/Subscription?success=true",
                        cancel_url=f"{base_url}/Subscription?cancel=true",
                        custom_id=user["email"],
                    )
                    st.markdown(
                        f'<a href="{result["approval_url"]}" target="_blank" style="display:inline-block;padding:12px 24px;'
                        f'background:#0070ba;color:white;border-radius:10px;font-weight:700;text-decoration:none;margin-top:16px;">'
                        f'Proceed to PayPal</a>',
                        unsafe_allow_html=True,
                    )
            except PayPalError as e:
                st.error(f"Error creating PayPal payment: {e}")

    if st.button("Cancel", use_container_width=True):
        st.session_state["show_payment_selection"] = False
        st.rerun()

st.markdown("---")

# Feature Comparison Table
render_section_header("\U0001f4ca Feature Comparison", "Compare features across all tiers")

comparison_data = {
    "Feature": ["Genetic Diseases", "Genetic Traits", "Offspring Analysis", "PDF Reports",
                 "Future Disease Updates", "Priority Support", "OMIM Database Access", "Advanced Filtering"],
    "Free": ["25", "10", "Limited", "\u2717", "\u2717", "\u2717", "\u2717", "\u2717"],
    "Premium": ["500+", "79", "Full", "\u2713", "\u2717", "\u2717", "\u2713", "\u2713"],
    "Pro": ["2,700+", "79", "Full", "\u2713", "\u2713", "\u2713", "\u2713", "\u2713"],
}
st.markdown('<div class="comparison-table">', unsafe_allow_html=True)
st.dataframe(
    pd.DataFrame(comparison_data), hide_index=True, use_container_width=True,
    column_config={
        "Feature": st.column_config.TextColumn("Feature", width="large"),
        "Free": st.column_config.TextColumn("Free", width="small"),
        "Premium": st.column_config.TextColumn("Premium", width="small"),
        "Pro": st.column_config.TextColumn("Pro", width="small"),
    },
)
st.markdown('</div>', unsafe_allow_html=True)

# FAQ
st.markdown("---")
render_section_header("\u2753 Frequently Asked Questions", "Common questions about pricing")

faqs = [
    ("Is this a one-time purchase or subscription?",
     "One-time purchase! Pay once, use forever. No recurring charges, no hidden fees."),
    ("Do I keep access forever?",
     "Yes! Once you purchase a plan, it's yours permanently. No expiration, no renewal."),
    ("What payment methods do you accept?",
     "We accept all major credit cards through Stripe, and PayPal."),
    ("What's the difference between Premium and Pro?",
     "Premium gives 500+ diseases and all traits. Pro unlocks 2,700+ diseases, priority support, API access, and all future disease panel updates at no extra cost."),
    ("Is my genetic data secure?",
     "Yes! We use bank-level encryption (AES-256) for all data. We never share your genetic information with third parties."),
    ("What does 'future disease updates included' mean for Pro?",
     "As we expand our disease panel with new conditions and research, Pro users automatically get access to all new diseases — no additional payment required."),
]
for faq_q, faq_a in faqs:
    st.markdown(
        f"""<div class="faq-item">
            <div class="question">Q: {faq_q}</div>
            <div class="answer">A: {faq_a}</div>
        </div>""",
        unsafe_allow_html=True,
    )
