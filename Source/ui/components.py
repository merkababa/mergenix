"""
Mergenix — Reusable UI components.

Shared HTML/Streamlit helpers used across multiple pages.
"""

import streamlit as st

from .theme import (
    ACCENT_AMBER,
    ACCENT_ROSE,
    ACCENT_TEAL,
    SEVERITY_COLORS,
)


# ---------------------------------------------------------------------------
# Badge helpers
# ---------------------------------------------------------------------------
def severity_badge(severity: str) -> str:
    """Return an HTML <span> badge for a severity level."""
    colors = SEVERITY_COLORS.get(severity)
    if colors:
        text_color, bg, border = colors
    else:
        text_color, bg, border = ("#6b7280", "rgba(107,114,128,0.15)", "rgba(107,114,128,0.4)")
    return (
        f'<span style="background:{bg};color:{text_color};padding:3px 10px;'
        f'border:1px solid {border};'
        f'border-radius:10px;font-size:0.75rem;font-weight:600;'
        f"font-family:'Sora',sans-serif;letter-spacing:0.03em;\">"
        f"{severity.upper()}</span>"
    )


def status_badge(status: str) -> str:
    """Return an HTML <span> badge for a carrier status."""
    badge_styles = {
        "carrier": ("rgba(245,158,11,0.12)", ACCENT_AMBER, "rgba(245,158,11,0.35)", "\u26a0\ufe0f"),
        "affected": ("rgba(239,68,68,0.12)", ACCENT_ROSE, "rgba(239,68,68,0.35)", "\u274c"),
        "normal": ("rgba(6,214,160,0.12)", ACCENT_TEAL, "rgba(6,214,160,0.35)", "\u2705"),
        "unknown": ("rgba(148,163,184,0.12)", "#94a3b8", "rgba(148,163,184,0.35)", "\u2753"),
    }
    bg, text_color, border, icon = badge_styles.get(
        status, ("rgba(107,114,128,0.12)", "#6b7280", "rgba(107,114,128,0.35)", "")
    )
    return (
        f'<span style="background:{bg};color:{text_color};padding:3px 12px;'
        f'border:1px solid {border};border-radius:20px;font-size:0.8rem;font-weight:600;'
        f"font-family:'Lexend',sans-serif;display:inline-flex;align-items:center;gap:4px;\">"
        f"{icon} {status.replace('_', ' ').title()}</span>"
    )


def render_tier_badge(tier: str) -> str:
    """Return an HTML <span> tier badge."""
    colors = {"free": "#6b7280", "premium": "#3b82f6", "pro": "#fbbf24"}
    color = colors.get(tier.lower(), "#6b7280")
    return (
        f'<span style="background:{color};padding:4px 12px;border-radius:12px;'
        f"color:white;font-weight:600;font-size:0.75rem;text-transform:uppercase;"
        f"font-family:'Sora',sans-serif;letter-spacing:0.05em;\">"
        f"{tier.upper()}</span>"
    )


# ---------------------------------------------------------------------------
# Probability bar
# ---------------------------------------------------------------------------
def render_probability_bar(label: str, pct: float, color: str = "#6366f1"):
    """Render a horizontal probability bar with label and percentage."""
    st.markdown(
        f"""
        <div style="margin-bottom:6px;">
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;
                font-family:'Lexend',sans-serif;margin-bottom:3px;">
                <span style="color:#e2e8f0;">{label}</span>
                <span style="font-weight:700;color:{color};font-family:'Sora',sans-serif;">{pct:.1f}%</span>
            </div>
            <div style="background:rgba(148,163,184,0.1);border-radius:8px;height:12px;
                overflow:hidden;border:1px solid rgba(148,163,184,0.08);">
                <div style="background:linear-gradient(90deg,{color},
                    {color}cc);width:{min(pct, 100):.1f}%;height:100%;border-radius:8px;
                    transition:width 0.6s ease;"></div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


# ---------------------------------------------------------------------------
# Hero section builder
# ---------------------------------------------------------------------------
def render_page_hero(title: str, subtitle: str, badge_text: str = ""):
    """Render a consistent hero/header banner used on catalog, subscription, etc."""
    badge_html = ""
    if badge_text:
        badge_html = (
            f'<div style="display:inline-block;margin-top:0.8rem;padding:7px 18px;'
            f'background:linear-gradient(90deg,transparent,rgba(6,214,160,0.1),transparent);'
            f'background-size:200% 100%;animation:shimmer 3s linear infinite;'
            f'border:1px solid rgba(6,214,160,0.2);border-radius:20px;">'
            f'<span style="color:#06d6a0;font-family:\'Lexend\',sans-serif;font-size:0.85rem;">'
            f'{badge_text}</span></div>'
        )

    st.markdown(
        f"""
        <div style="text-align:center;padding:2.5rem 2rem 2rem;
             background:rgba(12,18,32,0.65);backdrop-filter:blur(16px);
             -webkit-backdrop-filter:blur(16px);
             border-radius:24px;margin-bottom:1.5rem;position:relative;overflow:hidden;
             border:1px solid rgba(148,163,184,0.08);
             animation:biolumPulse 5s ease-in-out infinite;
             box-shadow:0 8px 40px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.03);">
            <div style="position:absolute;top:0;left:0;right:0;bottom:0;
                 background:repeating-linear-gradient(0deg, transparent, transparent 50px,
                 rgba(6,214,160,0.012) 50px, rgba(6,214,160,0.012) 51px);
                 animation:subtleScan 25s linear infinite;pointer-events:none;"></div>
            <div style="display:flex;justify-content:center;gap:8px;margin-bottom:1rem;">
                <span style="display:inline-block;width:12px;height:12px;border-radius:50%;
                    background:linear-gradient(135deg,#06d6a0,#06b6d4);
                    animation:helixFloat 2.2s ease-in-out infinite;
                    box-shadow:0 0 10px rgba(6,214,160,0.4);"></span>
                <span style="display:inline-block;width:12px;height:12px;border-radius:50%;
                    background:linear-gradient(135deg,#8b5cf6,#a78bfa);
                    animation:helixFloat 2.2s ease-in-out infinite 0.3s;
                    box-shadow:0 0 10px rgba(139,92,246,0.4);"></span>
                <span style="display:inline-block;width:12px;height:12px;border-radius:50%;
                    background:linear-gradient(135deg,#06d6a0,#06b6d4);
                    animation:helixFloat 2.2s ease-in-out infinite 0.6s;
                    box-shadow:0 0 10px rgba(6,214,160,0.4);"></span>
            </div>
            <h1 style="margin:0;font-size:2.4rem;font-family:'Sora',sans-serif;font-weight:800;
                background:linear-gradient(135deg, #06d6a0, #06b6d4, #8b5cf6);
                background-size:200% 200%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;
                animation:gradientShift 6s ease infinite;">{title}</h1>
            <p style="font-family:'Lexend',sans-serif;color:#94a3b8;font-size:1.05rem;margin:8px 0 0;">
                {subtitle}</p>
            {badge_html}
        </div>
        """,
        unsafe_allow_html=True,
    )


# ---------------------------------------------------------------------------
# Section header
# ---------------------------------------------------------------------------
def render_section_header(title: str, subtitle: str = ""):
    """Render a centered gradient section header."""
    sub_html = f"<p>{subtitle}</p>" if subtitle else ""
    st.markdown(
        f'<div class="section-header"><h2>{title}</h2>{sub_html}</div>',
        unsafe_allow_html=True,
    )
