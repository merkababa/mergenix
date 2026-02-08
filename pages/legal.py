"""
Mergenix — Legal Page

Privacy policy, terms of service, regulatory status, data handling.
"""

import streamlit as st
from Source.ui.components import render_page_hero, render_section_header

render_page_hero(
    "Legal Information",
    "Privacy Policy, Terms of Service & Regulatory Status",
)

# ---------------------------------------------------------------------------
# Terms of Service
# ---------------------------------------------------------------------------
render_section_header("\U0001f4dc Terms of Service")

st.markdown(
    """
    <div style="background:var(--card-bg);border:1px solid var(--card-border);
        border-radius:16px;padding:28px;margin-bottom:1.5rem;">
        <h4 style="font-family:'Sora',sans-serif;font-weight:700;color:var(--accent-cyan);margin:0 0 16px;">Service Description</h4>
        <p style="font-family:'Lexend',sans-serif;color:var(--text-body);font-size:0.92rem;line-height:1.8;">
            Mergenix analyzes genetic data from consumer DNA testing services to predict potential carrier status for genetic conditions and offspring trait probabilities.
            This service is <b>for informational and educational purposes only</b>.</p>
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    """
    <div style="background:var(--card-bg);border:1px solid var(--card-border);
        border-radius:16px;padding:28px;margin-bottom:1.5rem;">
        <h4 style="font-family:'Sora',sans-serif;font-weight:700;color:var(--accent-rose);margin:0 0 16px;">Not a Medical Device</h4>
        <p style="font-family:'Lexend',sans-serif;color:var(--text-body);font-size:0.92rem;line-height:1.8;">
            <b>This product has not been cleared or approved by the U.S. Food and Drug Administration (FDA).</b>
            Mergenix is not a diagnostic tool and is not intended for clinical use.</p>
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    """
    <div style="background:var(--card-bg);border:1px solid var(--card-border);
        border-radius:16px;padding:28px;margin-bottom:1.5rem;">
        <h4 style="font-family:'Sora',sans-serif;font-weight:700;color:var(--accent-amber);margin:0 0 16px;">No Medical Advice</h4>
        <p style="font-family:'Lexend',sans-serif;color:var(--text-body);font-size:0.92rem;line-height:1.8;">
            Mergenix does not provide medical advice, diagnosis, or treatment. Results should <b>NOT</b> be used for clinical diagnosis
            or to make medical decisions without consulting qualified healthcare professionals.</p>
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    """
    <div style="background:var(--card-bg);border:1px solid var(--card-border);
        border-radius:16px;padding:28px;margin-bottom:1.5rem;">
        <h4 style="font-family:'Sora',sans-serif;font-weight:700;color:var(--accent-violet);margin:0 0 16px;">Limitations of Results</h4>
        <ul style="font-family:'Lexend',sans-serif;color:var(--text-body);font-size:0.92rem;line-height:1.8;margin:0;padding-left:20px;">
            <li><b>SNP Testing Limitations:</b> This analysis tests specific genetic variants (SNPs) and does not sequence entire genes.
                Many pathogenic variants cannot be detected by this method. A negative result does not guarantee the absence of carrier status.</li>
            <li><b>Ancestry Limitations:</b> Risk estimates are primarily derived from studies of European-descent populations and may be
                less accurate for other ancestries.</li>
            <li><b>Incomplete Penetrance:</b> Not all carriers will develop the associated condition. Severity can vary among affected individuals.</li>
            <li><b>Carrier Status Clarification:</b> Being a carrier does not mean you are affected by the condition. Carriers typically do not show symptoms.</li>
        </ul>
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    """
    <div style="background:var(--card-bg);border:1px solid var(--card-border);
        border-radius:16px;padding:28px;margin-bottom:1.5rem;">
        <h4 style="font-family:'Sora',sans-serif;font-weight:700;color:var(--accent-teal);margin:0 0 16px;">User Acknowledgment</h4>
        <p style="font-family:'Lexend',sans-serif;color:var(--text-body);font-size:0.92rem;line-height:1.8;">
            By using Mergenix, you acknowledge that:</p>
        <ul style="font-family:'Lexend',sans-serif;color:var(--text-body);font-size:0.92rem;line-height:1.8;margin:8px 0 0;padding-left:20px;">
            <li>You understand this is an educational tool, not a medical diagnostic service</li>
            <li>You will not use results for clinical decision-making without professional consultation</li>
            <li>Genetic predictions are probabilistic and not guaranteed to be accurate</li>
            <li>You are responsible for the genetic data you upload</li>
        </ul>
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    """
    <div style="background:var(--card-bg);border:1px solid var(--card-border);
        border-radius:16px;padding:28px;margin-bottom:1.5rem;">
        <h4 style="font-family:'Sora',sans-serif;font-weight:700;color:var(--accent-cyan);margin:0 0 16px;">Genetic Counseling Recommendation</h4>
        <p style="font-family:'Lexend',sans-serif;color:var(--text-body);font-size:0.92rem;line-height:1.8;">
            We strongly recommend consulting a certified genetic counselor for clinical interpretation of your results.
            Find a genetic counselor at <a href="https://www.nsgc.org" target="_blank" style="color:var(--accent-teal);">nsgc.org</a>.</p>
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    """
    <div style="background:var(--card-bg);border:1px solid var(--card-border);
        border-radius:16px;padding:28px;margin-bottom:1.5rem;">
        <h4 style="font-family:'Sora',sans-serif;font-weight:700;color:var(--accent-amber);margin:0 0 16px;">GINA Notice</h4>
        <p style="font-family:'Lexend',sans-serif;color:var(--text-body);font-size:0.92rem;line-height:1.8;">
            Under the Genetic Information Nondiscrimination Act (GINA), genetic information cannot be used by health insurers or employers
            to discriminate against you. However, GINA does not protect against discrimination by life, disability, or long-term care insurers.</p>
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    """
    <div style="background:var(--card-bg);border:1px solid var(--card-border);
        border-radius:16px;padding:28px;margin-bottom:1.5rem;">
        <h4 style="font-family:'Sora',sans-serif;font-weight:700;color:var(--text-dim);margin:0 0 16px;">Additional Terms</h4>
        <ul style="font-family:'Lexend',sans-serif;color:var(--text-body);font-size:0.92rem;line-height:1.8;margin:0;padding-left:20px;">
            <li><b>No Warranty:</b> Mergenix is provided "AS IS" without warranties of any kind, express or implied.</li>
            <li><b>Liability Limitation:</b> Mergenix and its developers are not liable for any damages arising from use of this service.</li>
            <li><b>Purchases:</b> Paid plans are one-time purchases granting lifetime access. No recurring charges apply.</li>
            <li><b>Intellectual Property:</b> The Mergenix platform, algorithms, and content are protected by copyright.</li>
        </ul>
    </div>
    """,
    unsafe_allow_html=True,
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
            <li><b>Account data:</b> Email, name, and subscription tier information are stored in our database.</li>
            <li><b>Usage data:</b> We collect anonymous analytics (page views, feature usage) to improve the platform. No genetic data is included.</li>
            <li><b>Payment data:</b> Handled exclusively by Stripe and PayPal. We never see or store your credit card information.</li>
        </ul>
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    """
    <div style="background:var(--card-bg);border:1px solid var(--card-border);
        border-radius:16px;padding:28px;margin-bottom:1.5rem;">
        <h4 style="font-family:'Sora',sans-serif;font-weight:700;color:var(--accent-cyan);margin:0 0 16px;">Data Sharing & Third Parties</h4>
        <p style="font-family:'Lexend',sans-serif;color:var(--text-body);font-size:0.92rem;line-height:1.8;">
            We do not sell, rent, or share your personal information or genetic data with third parties for marketing purposes.
            Your data is yours.</p>
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    """
    <div style="background:var(--card-bg);border:1px solid var(--card-border);
        border-radius:16px;padding:28px;margin-bottom:1.5rem;">
        <h4 style="font-family:'Sora',sans-serif;font-weight:700;color:var(--accent-violet);margin:0 0 16px;">Data Deletion</h4>
        <p style="font-family:'Lexend',sans-serif;color:var(--text-body);font-size:0.92rem;line-height:1.8;">
            You may request deletion of your account data at any time by contacting support@mergenix.com.
            Genetic data is never stored on our servers, so there is nothing to delete.</p>
    </div>
    """,
    unsafe_allow_html=True,
)

# ---------------------------------------------------------------------------
# Regulatory Status
# ---------------------------------------------------------------------------
render_section_header("\U0001f3e5 Regulatory Status")

st.markdown(
    """
    <div style="background:var(--card-bg);border:1px solid var(--card-border);
        border-radius:16px;padding:28px;margin-bottom:1.5rem;">
        <h4 style="font-family:'Sora',sans-serif;font-weight:700;color:var(--accent-amber);margin:0 0 16px;">Not a HIPAA-Covered Entity</h4>
        <p style="font-family:'Lexend',sans-serif;color:var(--text-body);font-size:0.92rem;line-height:1.8;">
            Mergenix is an educational tool and is <b>not a HIPAA-covered entity</b>. We are not a healthcare provider, health plan,
            or healthcare clearinghouse. We do not create, receive, or transmit protected health information (PHI) in the course of
            providing healthcare services.</p>
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    """
    <div style="background:var(--card-bg);border:1px solid var(--card-border);
        border-radius:16px;padding:28px;margin-bottom:1.5rem;">
        <h4 style="font-family:'Sora',sans-serif;font-weight:700;color:var(--accent-teal);margin:0 0 16px;">Data Security Practices</h4>
        <p style="font-family:'Lexend',sans-serif;color:var(--text-body);font-size:0.92rem;line-height:1.8;">
            While not subject to HIPAA requirements, we follow security best practices:</p>
        <ul style="font-family:'Lexend',sans-serif;color:var(--text-body);font-size:0.92rem;line-height:1.8;margin:8px 0 0;padding-left:20px;">
            <li><b>No genetic data storage:</b> Raw genetic files are processed locally in your browser and never uploaded to our servers.</li>
            <li><b>Minimum necessary:</b> We only collect account data essential to providing the service.</li>
            <li><b>Secure transmission:</b> All data transmitted over HTTPS (TLS encryption).</li>
            <li><b>Account deletion:</b> Users can request complete account data deletion at any time.</li>
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
                <li>Process genetic files locally in your browser session</li>
                <li>Store account information (email, name, tier)</li>
                <li>Process payments through Stripe/PayPal</li>
                <li>Collect anonymous usage analytics</li>
                <li>Delete all account data on request</li>
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
                <li>Store or upload genetic files to servers</li>
                <li>Share data with third parties for marketing</li>
                <li>Sell user information</li>
                <li>Store payment card details</li>
                <li>Provide medical advice or diagnosis</li>
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
