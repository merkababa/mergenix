"""
Mergenix — Shared footer component.

Renders the disclaimer, privacy note, and branding footer used on every page.
"""

import streamlit as st


def render_footer() -> None:
    """Render the shared footer with disclaimer, privacy, and branding."""
    st.markdown(
        """
        <footer role="contentinfo">
        <div style="text-align:center;padding:2rem 1.5rem;margin-top:2rem;
             background:var(--bg-glass);backdrop-filter:blur(14px);
             -webkit-backdrop-filter:blur(14px);
             border-radius:24px;border:1px solid var(--glass-border);
             box-shadow:0 4px 30px var(--shadow-ambient),inset 0 1px 0 var(--inset-highlight);
             animation:fadeSlideUp 0.5s ease-out;">
            <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:12px;font-family:'Lexend',sans-serif;">
                <b style="color:var(--accent-amber);">\u26a0\ufe0f Disclaimer:</b> Mergenix is an educational tool and does <b>not</b>
                provide medical advice, diagnosis, or treatment. Genetic predictions are
                probabilistic and based on simplified Mendelian models. Many traits are
                polygenic and influenced by environment. <b style="color:var(--text-primary);">Always consult a certified
                genetic counselor or healthcare professional</b> for clinical interpretation.</p>
            <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:12px;font-family:'Lexend',sans-serif;">
                \U0001f512 <b>Privacy:</b> All processing occurs locally in your session.
                No genetic data is stored, transmitted, or shared.</p>
            <div style="margin-top:16px;padding-top:16px;
                border-top:1px solid var(--glass-border);">
                <div style="display:flex;justify-content:center;gap:4px;margin-bottom:10px;" aria-hidden="true">
                    <span style="display:inline-block;width:6px;height:6px;border-radius:50%;
                        background:#06d6a0;animation:helixFloat 2.5s ease-in-out infinite;box-shadow:0 0 6px rgba(6,214,160,0.4);"></span>
                    <span style="display:inline-block;width:6px;height:6px;border-radius:50%;
                        background:#8b5cf6;animation:helixFloat 2.5s ease-in-out infinite 0.3s;box-shadow:0 0 6px rgba(139,92,246,0.4);"></span>
                    <span style="display:inline-block;width:6px;height:6px;border-radius:50%;
                        background:#06b6d4;animation:helixFloat 2.5s ease-in-out infinite 0.6s;box-shadow:0 0 6px rgba(6,182,212,0.4);"></span>
                </div>
                <p style="color:var(--text-dim);font-size:0.8rem;margin:0;font-family:'Lexend',sans-serif;">
                    Built with Streamlit &bull; Powered by open-source genetics research &bull;
                    <span style="background:linear-gradient(135deg, #06d6a0, #06b6d4);
                    -webkit-background-clip:text;-webkit-text-fill-color:transparent;
                    font-weight:700;font-family:'Sora',sans-serif;">Mergenix v2.0</span>
                </p>
            </div>
        </div>
        </footer>
        """,
        unsafe_allow_html=True,
    )
