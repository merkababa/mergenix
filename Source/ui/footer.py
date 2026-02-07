"""
Mergenix — Shared footer component.

Renders the disclaimer, privacy note, and branding footer used on every page.
"""

import streamlit as st


def render_footer() -> None:
    """Render the shared footer with disclaimer, privacy, and branding."""
    st.markdown(
        """
        <div style="text-align:center;padding:2rem 1.5rem;margin-top:2rem;
             background:linear-gradient(135deg, #0d1321 0%, #111827 40%, #1a1040 100%);
             border-radius:24px;border:1px solid rgba(148,163,184,0.12);
             box-shadow:0 4px 30px rgba(0,0,0,0.3);
             animation:fadeSlideUp 0.5s ease-out;">
            <p style="color:#94a3b8;font-size:0.85rem;margin-bottom:12px;font-family:'DM Sans',sans-serif;">
                <b style="color:#f59e0b;">\u26a0\ufe0f Disclaimer:</b> Mergenix is an educational tool and does <b>not</b>
                provide medical advice, diagnosis, or treatment. Genetic predictions are
                probabilistic and based on simplified Mendelian models. Many traits are
                polygenic and influenced by environment. <b style="color:#e2e8f0;">Always consult a certified
                genetic counselor or healthcare professional</b> for clinical interpretation.</p>
            <p style="color:#94a3b8;font-size:0.85rem;margin-bottom:12px;font-family:'DM Sans',sans-serif;">
                \U0001f512 <b>Privacy:</b> All processing occurs locally in your session.
                No genetic data is stored, transmitted, or shared.</p>
            <div style="margin-top:16px;padding-top:16px;
                border-top:1px solid rgba(148,163,184,0.08);">
                <div style="display:flex;justify-content:center;gap:4px;margin-bottom:10px;">
                    <span style="display:inline-block;width:6px;height:6px;border-radius:50%;
                        background:#06d6a0;animation:helixFloat 2.5s ease-in-out infinite;"></span>
                    <span style="display:inline-block;width:6px;height:6px;border-radius:50%;
                        background:#7c3aed;animation:helixFloat 2.5s ease-in-out infinite 0.3s;"></span>
                    <span style="display:inline-block;width:6px;height:6px;border-radius:50%;
                        background:#22d3ee;animation:helixFloat 2.5s ease-in-out infinite 0.6s;"></span>
                </div>
                <p style="color:#64748B;font-size:0.8rem;margin:0;font-family:'DM Sans',sans-serif;">
                    Built with Streamlit &bull; Powered by open-source genetics research &bull;
                    <span style="background:linear-gradient(135deg, #06d6a0, #22d3ee);
                    -webkit-background-clip:text;-webkit-text-fill-color:transparent;
                    font-weight:700;font-family:'Outfit',sans-serif;">Mergenix v2.0</span>
                </p>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )
