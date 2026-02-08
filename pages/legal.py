"""
Mergenix — Legal Page

Privacy policy, terms of service, HIPAA statement, data handling.
"""

import streamlit as st
from Source.ui.components import render_page_hero, render_section_header

render_page_hero(
    "Legal Information",
    "Privacy Policy, Terms of Service & Data Handling",
)

# ---------------------------------------------------------------------------
# Privacy Policy
# ---------------------------------------------------------------------------
render_section_header("\U0001f512 Privacy Policy")

st.markdown(
    """
    <div style="background:var(--card-bg);border:1px solid var(--card-border);
        border-radius:16px;padding:28px;margin-bottom:1.5rem;">
        <h4 style="font-family:'Sora',sans-serif;font-weight:700;color:var(--accent-teal);margin:0 0 16px;">Data Collection & Processing</h4>
        <ul style="font-family:'Lexend',sans-serif;color:var(--text-body);font-size:0.92rem;line-height:2;margin:0;padding-left:20px;">
            <li><b>Genetic data:</b> Processed entirely within your browser session. We never upload, store, or transmit your raw genetic files to any server.</li>
            <li><b>Account data:</b> Email, name, and subscription information are stored securely with AES-256 encryption.</li>
            <li><b>Usage data:</b> We collect anonymous analytics (page views, feature usage) to improve the platform. No genetic data is included.</li>
            <li><b>Payment data:</b> Handled exclusively by Stripe and PayPal. We never see or store your credit card information.</li>
        </ul>
    </div>
    """,
    unsafe_allow_html=True,
)

# ---------------------------------------------------------------------------
# Terms of Service
# ---------------------------------------------------------------------------
render_section_header("\U0001f4dc Terms of Service")

st.markdown(
    """
    <div style="background:var(--card-bg);border:1px solid var(--card-border);
        border-radius:16px;padding:28px;margin-bottom:1.5rem;">
        <h4 style="font-family:'Sora',sans-serif;font-weight:700;color:var(--accent-cyan);margin:0 0 16px;">Key Terms</h4>
        <ul style="font-family:'Lexend',sans-serif;color:var(--text-body);font-size:0.92rem;line-height:2;margin:0;padding-left:20px;">
            <li><b>Educational use:</b> Mergenix is an educational tool and does not provide medical advice, diagnosis, or treatment.</li>
            <li><b>Accuracy:</b> Genetic predictions are probabilistic. We do not guarantee the accuracy or completeness of results.</li>
            <li><b>User responsibility:</b> You are responsible for the genetic data you upload and for consulting qualified professionals for clinical decisions.</li>
            <li><b>Purchases:</b> Paid plans are one-time purchases granting lifetime access. No recurring charges apply.</li>
            <li><b>Intellectual property:</b> The Mergenix platform, algorithms, and content are protected by copyright.</li>
        </ul>
    </div>
    """,
    unsafe_allow_html=True,
)

# ---------------------------------------------------------------------------
# HIPAA & Compliance
# ---------------------------------------------------------------------------
render_section_header("\U0001f3e5 HIPAA & Compliance")

st.markdown(
    """
    <div style="background:var(--card-bg);border:1px solid var(--card-border);
        border-radius:16px;padding:28px;margin-bottom:1.5rem;">
        <h4 style="font-family:'Sora',sans-serif;font-weight:700;color:var(--accent-violet);margin:0 0 16px;">Our Compliance Approach</h4>
        <p style="font-family:'Lexend',sans-serif;color:var(--text-body);font-size:0.92rem;line-height:1.8;">
            While Mergenix is an educational tool and not a covered entity under HIPAA,
            we design our platform following HIPAA principles as a best practice:</p>
        <ul style="font-family:'Lexend',sans-serif;color:var(--text-body);font-size:0.92rem;line-height:2;margin:8px 0 0;padding-left:20px;">
            <li><b>Minimum necessary:</b> We only collect data essential to providing the service.</li>
            <li><b>Encryption:</b> All data encrypted with AES-256 at rest and TLS 1.3 in transit.</li>
            <li><b>Access controls:</b> Strict role-based access to any stored account data.</li>
            <li><b>No genetic data storage:</b> Raw genetic files are never stored on our servers.</li>
            <li><b>Audit logging:</b> All access to sensitive data is logged and monitored.</li>
        </ul>
    </div>
    """,
    unsafe_allow_html=True,
)

# ---------------------------------------------------------------------------
# Data Handling
# ---------------------------------------------------------------------------
render_section_header("\U0001f4be Data Handling Explained")

dh1, dh2 = st.columns(2)
with dh1:
    st.markdown(
        """
        <div style="background:rgba(6,214,160,0.06);border:1px solid rgba(6,214,160,0.2);
            border-radius:14px;padding:22px;">
            <h4 style="font-family:'Sora',sans-serif;color:var(--accent-teal);margin:0 0 12px;">What We DO</h4>
            <ul style="font-family:'Lexend',sans-serif;color:var(--text-body);font-size:0.88rem;line-height:2;margin:0;padding-left:16px;">
                <li>Process genetic files locally in your session</li>
                <li>Encrypt account data with AES-256</li>
                <li>Process payments through Stripe/PayPal</li>
                <li>Collect anonymous usage analytics</li>
                <li>Delete all data on account deletion</li>
            </ul>
        </div>
        """,
        unsafe_allow_html=True,
    )
with dh2:
    st.markdown(
        """
        <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);
            border-radius:14px;padding:22px;">
            <h4 style="font-family:'Sora',sans-serif;color:var(--accent-rose);margin:0 0 12px;">What We DON'T Do</h4>
            <ul style="font-family:'Lexend',sans-serif;color:var(--text-body);font-size:0.88rem;line-height:2;margin:0;padding-left:16px;">
                <li>Store or upload genetic files</li>
                <li>Share data with third parties</li>
                <li>Sell user information</li>
                <li>Store payment card details</li>
                <li>Track individual genetic data</li>
            </ul>
        </div>
        """,
        unsafe_allow_html=True,
    )

st.markdown("---")
st.markdown(
    '<p style="text-align:center;font-family:\'Lexend\',sans-serif;color:var(--text-dim);font-size:0.85rem;">'
    "Last updated: February 2026 &bull; Contact: support@mergenix.com</p>",
    unsafe_allow_html=True,
)
