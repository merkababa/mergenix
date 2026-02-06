"""
Tortit - Subscription Management
Manage your Tortit subscription, view pricing plans, and upgrade your account.
"""

import os
from datetime import datetime
import streamlit as st
from Source.auth import get_current_user, require_auth, AuthManager
from Source.tier_config import (
    TierType,
    TIER_CONFIGS,
    get_tier_config,
    get_upgrade_message
)
from Source.payments.stripe_handler import StripeHandler, StripeHandlerError
from Source.payments.paypal_handler import PayPalHandler, PayPalError

# ---------------------------------------------------------------------------
# Page configuration
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="Tortit - Subscription",
    page_icon="💳",
    layout="wide",
)

# Custom sidebar navigation
st.sidebar.page_link("app.py", label="Offspring Analysis", icon="🧬")
st.sidebar.page_link("pages/2_Disease_Catalog.py", label="Disease Catalog", icon="📋")
st.sidebar.page_link("pages/3_Subscription.py", label="Subscription", icon="💳")

# ---------------------------------------------------------------------------
# Bioluminescent CSS (matching Disease Catalog)
# ---------------------------------------------------------------------------
st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&display=swap');

    :root {
        --bg-deep: #0a0e1a;
        --bg-surface: #111827;
        --bg-elevated: #1a2236;
        --accent-teal: #06d6a0;
        --accent-violet: #7c3aed;
        --accent-cyan: #22d3ee;
        --accent-amber: #f59e0b;
        --accent-rose: #ef4444;
        --text-primary: #e2e8f0;
        --text-muted: #94a3b8;
        --border-subtle: rgba(148, 163, 184, 0.12);
    }

    /* === Animations === */
    @keyframes helixFloat {
        0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.6; }
        50% { transform: translateY(-8px) rotate(180deg); opacity: 1; }
    }
    @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
    @keyframes pulseGlow {
        0%, 100% { box-shadow: 0 0 20px rgba(6, 214, 160, 0.1); }
        50% { box-shadow: 0 0 40px rgba(6, 214, 160, 0.25); }
    }
    @keyframes fadeSlideUp {
        from { opacity: 0; transform: translateY(16px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
    }
    @keyframes cardReveal {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes glowPulse {
        0%, 100% { box-shadow: 0 0 15px rgba(6,214,160,0.08), 0 4px 24px rgba(0,0,0,0.4); }
        50% { box-shadow: 0 0 25px rgba(6,214,160,0.18), 0 4px 24px rgba(0,0,0,0.4); }
    }
    @keyframes subtleScan {
        0% { background-position: 0% 0%; }
        100% { background-position: 0% 100%; }
    }

    /* === Global === */
    .block-container {
        padding-top: 1rem;
        max-width: 1200px;
        animation: fadeSlideUp 0.6s ease-out;
    }
    html, body, [data-testid="stAppViewContainer"], .main {
        font-family: 'DM Sans', sans-serif !important;
    }
    h1, h2, h3, h4, h5 {
        font-family: 'Outfit', sans-serif !important;
    }

    /* === Sidebar === */
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, #0a0e1a 0%, #111827 100%);
        border-right: 1px solid var(--border-subtle);
    }

    /* === Scrollbar === */
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: var(--bg-deep); }
    ::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, #06d6a0, #7c3aed);
        border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover { background: var(--accent-teal); }

    /* === Links === */
    a { color: var(--accent-teal) !important; transition: color 0.2s ease; }
    a:hover { color: var(--accent-cyan) !important; }

    /* === Dividers === */
    hr { border-color: var(--border-subtle) !important; }

    /* === Buttons === */
    .stButton > button {
        border-radius: 10px;
        font-family: 'Outfit', sans-serif;
        font-weight: 600;
        transition: all 0.25s ease;
    }

    /* === Tier Badge === */
    .tier-badge {
        display: inline-block;
        padding: 6px 16px;
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: 700;
        font-family: 'Outfit', sans-serif;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        vertical-align: middle;
        margin-left: 8px;
    }
    .tier-badge.free {
        background: rgba(148,163,184,0.15);
        color: #94a3b8;
        border: 1px solid rgba(148,163,184,0.4);
    }
    .tier-badge.premium {
        background: rgba(124,58,237,0.15);
        color: #7c3aed;
        border: 1px solid rgba(124,58,237,0.4);
    }
    .tier-badge.pro {
        background: rgba(6,214,160,0.15);
        color: #06d6a0;
        border: 1px solid rgba(6,214,160,0.4);
    }

    /* === Pricing Card === */
    .pricing-card {
        background: linear-gradient(135deg, #111827 0%, #1a2236 100%);
        border: 1px solid rgba(148,163,184,0.12);
        border-radius: 20px;
        padding: 32px 24px;
        text-align: center;
        box-shadow: 0 4px 24px rgba(0,0,0,0.4);
        transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
        animation: cardReveal 0.5s ease-out both;
        position: relative;
        overflow: hidden;
        height: 100%;
        display: flex;
        flex-direction: column;
    }
    .pricing-card::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 4px;
    }
    .pricing-card.free::before {
        background: linear-gradient(90deg, #94a3b8, #64748b);
    }
    .pricing-card.premium::before {
        background: linear-gradient(90deg, #7c3aed, #a78bfa);
    }
    .pricing-card.pro::before {
        background: linear-gradient(90deg, #06d6a0, #22d3ee);
    }
    .pricing-card.current {
        border-color: rgba(6,214,160,0.4);
        box-shadow: 0 4px 24px rgba(0,0,0,0.4), 0 0 30px rgba(6,214,160,0.15);
    }
    .pricing-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(6,214,160,0.12);
    }
    .pricing-card .tier-name {
        font-family: 'Outfit', sans-serif;
        font-weight: 800;
        font-size: 1.8rem;
        color: #e2e8f0;
        margin-bottom: 12px;
    }
    .pricing-card .tier-price {
        font-family: 'Outfit', sans-serif;
        font-weight: 700;
        font-size: 2.5rem;
        color: #06d6a0;
        margin-bottom: 8px;
    }
    .pricing-card .tier-price small {
        font-size: 1rem;
        color: #94a3b8;
        font-weight: 400;
    }
    .pricing-card .tier-description {
        font-family: 'DM Sans', sans-serif;
        font-size: 0.9rem;
        color: #94a3b8;
        margin-bottom: 24px;
        min-height: 40px;
    }
    .pricing-card .feature-list {
        text-align: left;
        margin-bottom: 24px;
        flex-grow: 1;
    }
    .pricing-card .feature-item {
        font-family: 'DM Sans', sans-serif;
        font-size: 0.9rem;
        color: #cbd5e1;
        margin-bottom: 12px;
        display: flex;
        align-items: flex-start;
        line-height: 1.5;
    }
    .pricing-card .feature-item .check {
        color: #06d6a0;
        margin-right: 10px;
        font-size: 1.1rem;
        flex-shrink: 0;
    }

    /* === Current Plan Card === */
    .current-plan-card {
        background: linear-gradient(135deg, #0d1321 0%, #111827 40%, #1a1040 100%);
        border: 1px solid rgba(148,163,184,0.12);
        border-radius: 20px;
        padding: 28px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.4);
        animation: glowPulse 4s ease-in-out infinite;
        margin-bottom: 2rem;
    }

    /* === Feature Comparison Table === */
    .comparison-table {
        background: var(--bg-elevated);
        border: 1px solid var(--border-subtle);
        border-radius: 16px;
        padding: 24px;
        margin: 2rem 0;
    }

    /* === FAQ Item === */
    .faq-item {
        background: var(--bg-elevated);
        border: 1px solid var(--border-subtle);
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 16px;
        transition: border-color 0.25s ease;
    }
    .faq-item:hover {
        border-color: rgba(6,214,160,0.3);
    }
    .faq-item .question {
        font-family: 'Outfit', sans-serif;
        font-weight: 600;
        font-size: 1.05rem;
        color: #e2e8f0;
        margin-bottom: 8px;
    }
    .faq-item .answer {
        font-family: 'DM Sans', sans-serif;
        font-size: 0.9rem;
        color: #94a3b8;
        line-height: 1.6;
    }

    /* === Section Header === */
    .section-header {
        text-align: center;
        margin: 2.5rem 0 2rem;
        animation: fadeSlideUp 0.5s ease-out;
    }
    .section-header h2 {
        margin: 0;
        font-family: 'Outfit', sans-serif;
        font-weight: 700;
        background: linear-gradient(135deg, #06d6a0, #22d3ee);
        background-size: 200% 200%;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: gradientShift 6s ease infinite;
    }
    .section-header p {
        font-family: 'DM Sans', sans-serif;
        color: #64748b;
        font-size: 0.9rem;
        margin: 6px 0 0;
    }

    /* === Save Badge === */
    .save-badge {
        display: inline-block;
        background: linear-gradient(135deg, #f59e0b, #ef4444);
        color: white;
        padding: 4px 12px;
        border-radius: 8px;
        font-size: 0.75rem;
        font-weight: 700;
        font-family: 'Outfit', sans-serif;
        letter-spacing: 0.03em;
        margin-left: 8px;
        vertical-align: middle;
    }

    /* === Current Plan Badge === */
    .current-badge {
        display: inline-block;
        background: linear-gradient(135deg, #06d6a0, #22d3ee);
        color: #0a0e1a;
        padding: 8px 20px;
        border-radius: 10px;
        font-size: 0.85rem;
        font-weight: 700;
        font-family: 'Outfit', sans-serif;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        margin-top: 16px;
        box-shadow: 0 4px 12px rgba(6,214,160,0.3);
    }
    </style>
    """,
    unsafe_allow_html=True,
)

# ---------------------------------------------------------------------------
# Require authentication
# ---------------------------------------------------------------------------
require_auth()

# Get current user
user = get_current_user()
if not user:
    st.stop()

current_tier = user.get("tier", "free")
subscription_id = user.get("subscription_id")
payment_provider = user.get("payment_provider")

# ---------------------------------------------------------------------------
# Hero section
# ---------------------------------------------------------------------------
st.markdown(
    """
    <div style="text-align:center;padding:2rem 2rem 1.8rem;
         background:linear-gradient(135deg, #0d1321 0%, #111827 40%, #1a1040 100%);
         border-radius:24px;margin-bottom:1.5rem;position:relative;overflow:hidden;
         border:1px solid rgba(148,163,184,0.12);animation:pulseGlow 4s ease-in-out infinite;">
        <div style="position:absolute;top:0;left:0;right:0;bottom:0;
             background:repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(6,214,160,0.015) 40px, rgba(6,214,160,0.015) 41px);
             animation:subtleScan 20s linear infinite;pointer-events:none;"></div>
        <div style="display:flex;justify-content:center;gap:6px;margin-bottom:0.8rem;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;
                background:linear-gradient(135deg,#06d6a0,#22d3ee);animation:helixFloat 2s ease-in-out infinite;"></span>
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;
                background:linear-gradient(135deg,#7c3aed,#a78bfa);animation:helixFloat 2s ease-in-out infinite 0.3s;"></span>
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;
                background:linear-gradient(135deg,#06d6a0,#22d3ee);animation:helixFloat 2s ease-in-out infinite 0.6s;"></span>
        </div>
        <h1 style="margin:0;font-size:2.4rem;font-family:'Outfit',sans-serif;font-weight:800;
            background:linear-gradient(135deg, #06d6a0, #22d3ee, #7c3aed);
            background-size:200% 200%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;
            animation:gradientShift 6s ease infinite;">Subscription Management</h1>
        <p style="font-family:'DM Sans',sans-serif;color:#94a3b8;font-size:1.05rem;margin:6px 0 0;">
            Unlock the full power of genetic analysis</p>
    </div>
    """,
    unsafe_allow_html=True,
)

# ---------------------------------------------------------------------------
# Handle URL parameters (success/cancel from payment)
# ---------------------------------------------------------------------------
query_params = st.query_params

if "success" in query_params:
    st.success("✅ Payment successful! Your subscription has been activated.")
    st.balloons()
elif "cancel" in query_params:
    st.warning("⚠️ Payment was cancelled. Your subscription remains unchanged.")

# ---------------------------------------------------------------------------
# Current Plan Section
# ---------------------------------------------------------------------------
st.markdown(
    """<div class="section-header">
        <h2>💳 Current Plan</h2>
        <p>Your active subscription and benefits</p>
    </div>""",
    unsafe_allow_html=True,
)

tier_config = get_tier_config(TierType(current_tier))

st.markdown(
    f"""
    <div class="current-plan-card">
        <h3 style="margin:0 0 16px;font-family:'Outfit',sans-serif;font-weight:700;color:#e2e8f0;">
            {tier_config.display_name} Tier
            <span class="tier-badge {current_tier}">{current_tier.upper()}</span>
        </h3>
        <p style="font-family:'DM Sans',sans-serif;color:#94a3b8;font-size:0.95rem;margin-bottom:20px;">
            {get_upgrade_message(TierType(current_tier))}
        </p>
    </div>
    """,
    unsafe_allow_html=True,
)

# Show features included in current tier
st.markdown("#### ✨ Features Included")
feature_cols = st.columns(2)
for idx, feature in enumerate(tier_config.features):
    col_idx = idx % 2
    with feature_cols[col_idx]:
        st.markdown(
            f'<div style="font-family:\'DM Sans\',sans-serif;color:#cbd5e1;margin-bottom:8px;">'
            f'<span style="color:#06d6a0;margin-right:8px;">✓</span>{feature}</div>',
            unsafe_allow_html=True,
        )

# Show subscription management for paid users
if current_tier != "free" and subscription_id:
    st.markdown("---")
    st.markdown("#### 🔧 Manage Subscription")

    col1, col2 = st.columns(2)

    with col1:
        if payment_provider == "stripe":
            st.info(f"**Provider:** Stripe")
            if st.button("🔗 Manage via Stripe Portal", use_container_width=True):
                try:
                    # Initialize Stripe handler
                    stripe_key = os.getenv("STRIPE_SECRET_KEY", "")
                    if stripe_key:
                        handler = StripeHandler(stripe_key)
                        portal_url = handler.create_customer_portal_session(
                            customer_id=subscription_id,
                            return_url=st.query_params.get("url", "http://localhost:8501/Subscription")
                        )
                        st.markdown(f'<a href="{portal_url}" target="_blank">Open Portal</a>', unsafe_allow_html=True)
                    else:
                        st.error("Stripe not configured")
                except StripeHandlerError as e:
                    st.error(f"Error: {str(e)}")

        elif payment_provider == "paypal":
            st.info(f"**Provider:** PayPal")
            if st.button("🔗 Manage via PayPal", use_container_width=True):
                st.markdown('[Manage on PayPal](https://www.paypal.com/myaccount/autopay)', unsafe_allow_html=True)

    with col2:
        st.info(f"**Subscription ID:** `{subscription_id[:20]}...`")

st.markdown("---")

# ---------------------------------------------------------------------------
# Pricing Table
# ---------------------------------------------------------------------------
st.markdown(
    """<div class="section-header">
        <h2>💰 Choose Your Plan</h2>
        <p>Select the perfect tier for your genetic analysis needs</p>
    </div>""",
    unsafe_allow_html=True,
)

# Billing period toggle
billing_period = st.radio(
    "Billing Period",
    ["Monthly", "Yearly"],
    horizontal=True,
    label_visibility="collapsed",
    key="billing_period"
)
is_yearly = billing_period == "Yearly"

# Show pricing cards
tier_cols = st.columns(3)

for idx, tier_type in enumerate([TierType.FREE, TierType.PREMIUM, TierType.PRO]):
    config = get_tier_config(tier_type)
    tier_name = tier_type.value
    is_current = tier_name == current_tier

    with tier_cols[idx]:
        # Calculate price and savings
        if is_yearly and config.price_yearly > 0:
            price = config.price_yearly
            period_text = "/year"
            monthly_equivalent = price / 12
            monthly_regular = config.price_monthly * 12
            savings_pct = int((1 - price / monthly_regular) * 100)
            save_badge = f'<span class="save-badge">Save {savings_pct}%</span>'
        else:
            price = config.price_monthly
            period_text = "/month"
            save_badge = ""

        # Render pricing card
        current_class = "current" if is_current else ""

        st.markdown(
            f"""
            <div class="pricing-card {tier_name} {current_class}">
                <div class="tier-name">{config.display_name}</div>
                <div class="tier-price">
                    {"Free" if price == 0 else f"${price:.0f}"}
                    {f'<small>{period_text}</small>' if price > 0 else ''}
                    {save_badge if is_yearly and price > 0 else ''}
                </div>
                <div class="tier-description">
                    {f'{monthly_equivalent:.2f}/mo when billed annually' if is_yearly and price > 0 else '&nbsp;'}
                </div>
                <div class="feature-list">
            """,
            unsafe_allow_html=True,
        )

        # Feature list
        for feature in config.features:
            st.markdown(
                f'<div class="feature-item"><span class="check">✓</span><span>{feature}</span></div>',
                unsafe_allow_html=True,
            )

        st.markdown("</div>", unsafe_allow_html=True)

        # Action button
        if is_current:
            st.markdown(
                '<div class="current-badge">Current Plan</div>',
                unsafe_allow_html=True,
            )
        elif tier_name == "free":
            st.markdown(
                '<div style="margin-top:16px;"><button disabled style="width:100%;padding:12px;border-radius:10px;'
                'background:rgba(148,163,184,0.2);color:#94a3b8;border:none;font-family:\'Outfit\',sans-serif;'
                'font-weight:600;">Always Free</button></div>',
                unsafe_allow_html=True,
            )
        else:
            # Upgrade button
            if st.button(
                f"🚀 Upgrade to {config.display_name}",
                key=f"upgrade_{tier_name}",
                use_container_width=True
            ):
                st.session_state["selected_tier"] = tier_name
                st.session_state["show_payment_selection"] = True
                st.rerun()

        st.markdown("</div>", unsafe_allow_html=True)

# ---------------------------------------------------------------------------
# Payment Selection Modal
# ---------------------------------------------------------------------------
if st.session_state.get("show_payment_selection", False):
    selected_tier = st.session_state.get("selected_tier", "premium")

    st.markdown("---")
    st.markdown(
        f"""<div class="section-header">
            <h2>💳 Select Payment Method</h2>
            <p>Choose how you'd like to pay for {selected_tier.title()} tier</p>
        </div>""",
        unsafe_allow_html=True,
    )

    payment_col1, payment_col2 = st.columns(2)

    with payment_col1:
        if st.button("💳 Pay with Stripe", use_container_width=True, type="primary"):
            st.session_state["payment_method"] = "stripe"

            # Create Stripe checkout session
            try:
                stripe_key = os.getenv("STRIPE_SECRET_KEY", "")
                if not stripe_key:
                    st.error("⚠️ Stripe is not configured. Contact support.")
                else:
                    handler = StripeHandler(stripe_key)
                    billing = "yearly" if is_yearly else "monthly"

                    # Get current URL for success/cancel redirects
                    base_url = os.getenv("BASE_URL", "http://localhost:8501")
                    success_url = f"{base_url}/Subscription?success=true"
                    cancel_url = f"{base_url}/Subscription?cancel=true"

                    session = handler.create_checkout_session(
                        customer_email=user["email"],
                        tier=selected_tier,
                        billing_period=billing,
                        success_url=success_url,
                        cancel_url=cancel_url
                    )

                    st.markdown(
                        f'<a href="{session["url"]}" target="_blank" style="display:inline-block;'
                        f'padding:12px 24px;background:#06d6a0;color:#0a0e1a;border-radius:10px;'
                        f'font-weight:700;text-decoration:none;margin-top:16px;">Proceed to Stripe Checkout →</a>',
                        unsafe_allow_html=True
                    )
            except StripeHandlerError as e:
                st.error(f"Error creating checkout session: {str(e)}")

    with payment_col2:
        if st.button("🅿️ Pay with PayPal", use_container_width=True):
            st.session_state["payment_method"] = "paypal"

            # Create PayPal subscription
            try:
                paypal_client_id = os.getenv("PAYPAL_CLIENT_ID", "")
                paypal_secret = os.getenv("PAYPAL_CLIENT_SECRET", "")

                if not paypal_client_id or not paypal_secret:
                    st.error("⚠️ PayPal is not configured. Contact support.")
                else:
                    handler = PayPalHandler(
                        client_id=paypal_client_id,
                        client_secret=paypal_secret,
                        sandbox=True  # Set to False in production
                    )

                    billing = "yearly" if is_yearly else "monthly"
                    base_url = os.getenv("BASE_URL", "http://localhost:8501")

                    result = handler.create_subscription(
                        tier=selected_tier,
                        billing_period=billing,
                        return_url=f"{base_url}/Subscription?success=true",
                        cancel_url=f"{base_url}/Subscription?cancel=true",
                        custom_id=user["email"]
                    )

                    st.markdown(
                        f'<a href="{result["approval_url"]}" target="_blank" style="display:inline-block;'
                        f'padding:12px 24px;background:#0070ba;color:white;border-radius:10px;'
                        f'font-weight:700;text-decoration:none;margin-top:16px;">Proceed to PayPal →</a>',
                        unsafe_allow_html=True
                    )
            except PayPalError as e:
                st.error(f"Error creating PayPal subscription: {str(e)}")

    if st.button("✕ Cancel", use_container_width=True):
        st.session_state["show_payment_selection"] = False
        st.rerun()

st.markdown("---")

# ---------------------------------------------------------------------------
# Feature Comparison Table
# ---------------------------------------------------------------------------
st.markdown(
    """<div class="section-header">
        <h2>📊 Feature Comparison</h2>
        <p>Compare features across all subscription tiers</p>
    </div>""",
    unsafe_allow_html=True,
)

comparison_data = {
    "Feature": [
        "Genetic Diseases",
        "Genetic Traits",
        "Offspring Analysis",
        "PDF Reports",
        "Genetic Counselor Access",
        "Priority Support",
        "OMIM Database Access",
        "Advanced Filtering"
    ],
    "Free": [
        "25", "10", "Limited", "✗", "✗", "✗", "✗", "✗"
    ],
    "Premium": [
        "500+", "79", "Full", "✓", "✗", "✗", "✓", "✓"
    ],
    "Pro": [
        "1,211+", "79", "Full", "✓", "1/month", "✓", "✓", "✓"
    ]
}

# Create styled table
st.markdown('<div class="comparison-table">', unsafe_allow_html=True)

import pandas as pd
df = pd.DataFrame(comparison_data)

st.dataframe(
    df,
    hide_index=True,
    use_container_width=True,
    column_config={
        "Feature": st.column_config.TextColumn("Feature", width="large"),
        "Free": st.column_config.TextColumn("Free", width="small"),
        "Premium": st.column_config.TextColumn("Premium", width="small"),
        "Pro": st.column_config.TextColumn("Pro", width="small"),
    }
)

st.markdown('</div>', unsafe_allow_html=True)

st.markdown("---")

# ---------------------------------------------------------------------------
# FAQ Section
# ---------------------------------------------------------------------------
st.markdown(
    """<div class="section-header">
        <h2>❓ Frequently Asked Questions</h2>
        <p>Common questions about subscriptions</p>
    </div>""",
    unsafe_allow_html=True,
)

faqs = [
    {
        "question": "Can I cancel my subscription anytime?",
        "answer": "Yes! You can cancel your subscription at any time through the Stripe or PayPal portal. You'll retain access until the end of your current billing period."
    },
    {
        "question": "Do I keep my data if I downgrade?",
        "answer": "Absolutely! All your uploaded genetic data and analysis history remain saved. If you downgrade, you'll simply have limited access to premium features until you upgrade again."
    },
    {
        "question": "What payment methods do you accept?",
        "answer": "We accept all major credit cards through Stripe, and PayPal. Both support automatic recurring billing for subscriptions."
    },
    {
        "question": "What's the difference between Premium and Pro?",
        "answer": "Premium gives you access to 500+ diseases and all traits. Pro unlocks the complete panel of 1,211+ diseases, includes monthly genetic counselor consultations, priority support, and API access."
    },
    {
        "question": "Is my genetic data secure?",
        "answer": "Yes! We use bank-level encryption (AES-256) for all data at rest and in transit. We never share your genetic information with third parties. Read our Privacy Policy for full details."
    },
    {
        "question": "Can I switch between monthly and yearly billing?",
        "answer": "Yes! You can change your billing frequency anytime through the customer portal. Annual billing saves you 33% compared to monthly."
    }
]

for faq in faqs:
    st.markdown(
        f"""
        <div class="faq-item">
            <div class="question">Q: {faq['question']}</div>
            <div class="answer">A: {faq['answer']}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

# ---------------------------------------------------------------------------
# Footer
# ---------------------------------------------------------------------------
st.markdown(
    """
    <div style="text-align:center;padding:1.5rem;margin-top:2rem;
         background:linear-gradient(135deg, #0d1321 0%, #111827 40%, #1a1040 100%);
         border-radius:20px;border:1px solid rgba(148,163,184,0.12);
         box-shadow:0 4px 30px rgba(0,0,0,0.3);animation:fadeSlideUp 0.5s ease-out;">
        <p style="color:#94a3b8;font-size:0.82rem;margin-bottom:10px;font-family:'DM Sans',sans-serif;">
            <b style="color:#06d6a0;">🔒 Secure Payments:</b> All transactions are encrypted and processed securely through Stripe and PayPal.
            We never store your payment information.</p>
        <div style="display:flex;justify-content:center;gap:4px;margin-bottom:8px;">
            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;
                background:#06d6a0;animation:helixFloat 2.5s ease-in-out infinite;"></span>
            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;
                background:#7c3aed;animation:helixFloat 2.5s ease-in-out infinite 0.3s;"></span>
            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;
                background:#22d3ee;animation:helixFloat 2.5s ease-in-out infinite 0.6s;"></span>
        </div>
        <p style="color:#64748B;font-size:0.78rem;margin:0;font-family:'DM Sans',sans-serif;">
            <span style="background:linear-gradient(135deg, #06d6a0, #22d3ee);
            -webkit-background-clip:text;-webkit-text-fill-color:transparent;
            font-weight:700;font-family:'Outfit',sans-serif;">Tortit v2.0</span>
            &bull; Subscription Management
        </p>
    </div>
    """,
    unsafe_allow_html=True,
)

# Sidebar branding
with st.sidebar:
    st.markdown("---")
    st.markdown(
        """
        <div style="text-align:center;padding:1.2rem 0;margin-bottom:0.8rem;">
            <div style="display:inline-flex;gap:4px;margin-bottom:8px;">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;
                    background:#06d6a0;animation:helixFloat 2s ease-in-out infinite;"></span>
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;
                    background:#7c3aed;animation:helixFloat 2s ease-in-out infinite 0.4s;"></span>
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;
                    background:#22d3ee;animation:helixFloat 2s ease-in-out infinite 0.8s;"></span>
            </div>
            <h3 style="margin:4px 0 0;font-family:'Outfit',sans-serif;font-weight:800;
                background:linear-gradient(135deg, #06d6a0, #22d3ee);
                -webkit-background-clip:text;-webkit-text-fill-color:transparent;">Tortit</h3>
            <p style="font-size:0.7rem;color:#94a3b8;margin:4px 0 0;font-family:'DM Sans',sans-serif;
                letter-spacing:0.15em;text-transform:uppercase;">Subscription</p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    st.markdown(
        '<p style="font-size:0.75rem;color:#64748B;font-family:\'DM Sans\',sans-serif;">'
        "Tortit v2.0 &mdash; Secure payments powered by Stripe & PayPal.</p>",
        unsafe_allow_html=True,
    )
