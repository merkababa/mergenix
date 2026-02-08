"""
Mergenix — Reusable UI components.

Shared HTML/Streamlit helpers used across multiple pages.
"""

import json
import os

import streamlit as st

from .theme import (
    ACCENT_AMBER,
    ACCENT_ROSE,
    ACCENT_TEAL,
    SEVERITY_COLORS,
)

# ---------------------------------------------------------------------------
# Glossary data (loaded once for tooltip lookups)
# ---------------------------------------------------------------------------
_GLOSSARY_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data", "glossary.json",
)
_GLOSSARY: dict[str, str] = {}


def _load_glossary() -> dict[str, str]:
    """Load glossary terms into a case-insensitive lookup dict."""
    global _GLOSSARY  # noqa: PLW0603
    if _GLOSSARY:
        return _GLOSSARY
    try:
        with open(_GLOSSARY_PATH) as f:
            entries = json.load(f)
        _GLOSSARY = {e["term"].lower(): e["definition"] for e in entries}
    except Exception:
        _GLOSSARY = {}
    return _GLOSSARY


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
        f'<span role="status" aria-label="Severity: {severity}" '
        f'style="background:{bg};color:{text_color};padding:3px 10px;'
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
    """Render a horizontal probability bar with label, percentage, and fraction."""
    fraction = f" (1 in {round(100 / pct)})" if pct > 0 else ""
    note_html = ""
    if pct > 0 and label.lower() in ("affected", "both copies present"):
        approx = round(100 / pct)
        note_html = (
            f'<div style="font-size:0.78rem;color:var(--text-muted);'
            f"font-family:'Lexend',sans-serif;margin-top:2px;margin-bottom:4px;\">"
            f"This means approximately 1 in {approx} children may be affected</div>"
        )
    st.markdown(
        f"""
        <div style="margin-bottom:6px;">
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;
                font-family:'Lexend',sans-serif;margin-bottom:3px;">
                <span style="color:var(--text-primary);">{label}</span>
                <span style="font-weight:700;color:{color};font-family:'Sora',sans-serif;">{pct:.1f}%{fraction}</span>
            </div>
            <div style="background:var(--border-subtle);border-radius:8px;height:12px;
                overflow:hidden;border:1px solid var(--glass-border);">
                <div style="background:linear-gradient(90deg,{color},
                    {color}cc);width:{min(pct, 100):.1f}%;height:100%;border-radius:8px;
                    transition:width 0.6s ease;"></div>
            </div>
            {note_html}
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
            f'<span style="color:var(--accent-teal);font-family:\'Lexend\',sans-serif;font-size:0.85rem;">'
            f'{badge_text}</span></div>'
        )

    st.markdown(
        f"""
        <div style="text-align:center;padding:2.5rem 2rem 2rem;
             background:var(--bg-glass);backdrop-filter:blur(16px);
             -webkit-backdrop-filter:blur(16px);
             border-radius:24px;margin-bottom:1.5rem;position:relative;overflow:hidden;
             border:1px solid var(--glass-border);
             animation:biolumPulse 5s ease-in-out infinite;
             box-shadow:0 8px 40px var(--shadow-ambient),inset 0 1px 0 var(--inset-highlight);">
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
            <p style="font-family:'Lexend',sans-serif;color:var(--text-muted);font-size:1.05rem;margin:8px 0 0;">
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


# ---------------------------------------------------------------------------
# Progress stepper (T3.7)
# ---------------------------------------------------------------------------
def render_progress_stepper(current_step: int, total_steps: int = 4):
    """Render a multi-step progress indicator.

    Steps: 1=Validating, 2=Screening, 3=Predicting, 4=Complete
    """
    steps = [
        ("\U0001f4e4", "Validate", "Validating files..."),
        ("\U0001f52c", "Screen", "Screening carrier risk..."),
        ("\U0001f9ec", "Predict", "Predicting traits..."),
        ("\u2705", "Complete", "Analysis complete!"),
    ]

    step_items_html = ""
    for i, (icon, label, _desc) in enumerate(steps):
        step_num = i + 1
        if step_num < current_step:
            # Completed
            dot_style = (
                "background:linear-gradient(135deg, #06d6a0, #059669);"
                "color:#050810;border:2px solid #06d6a0;"
            )
            line_style = "background:#06d6a0;"
            label_style = "color:var(--accent-teal);font-weight:600;"
            anim = ""
        elif step_num == current_step:
            # Active
            dot_style = (
                "background:transparent;"
                "color:var(--accent-teal);border:2px solid var(--accent-teal);"
            )
            line_style = "background:var(--border-subtle);"
            label_style = "color:var(--accent-teal);font-weight:700;"
            anim = "animation:glowPulse 2s ease-in-out infinite;"
        else:
            # Pending
            dot_style = (
                "background:var(--bg-elevated);"
                "color:var(--text-dim);border:2px solid var(--border-subtle);"
            )
            line_style = "background:var(--border-subtle);"
            label_style = "color:var(--text-dim);"
            anim = ""

        connector = ""
        if step_num < total_steps:
            connector = (
                f'<div style="flex:1;height:2px;{line_style}'
                f'margin:0 4px;border-radius:1px;"></div>'
            )

        step_items_html += (
            f'<div style="display:flex;flex-direction:column;align-items:center;'
            f'min-width:60px;">'
            f'<div style="width:36px;height:36px;border-radius:50%;{dot_style}'
            f'display:flex;align-items:center;justify-content:center;'
            f'font-size:1rem;{anim}">{icon}</div>'
            f'<span style="font-size:0.75rem;margin-top:4px;'
            f"font-family:'Sora',sans-serif;{label_style}\">{label}</span>"
            f"</div>{connector}"
        )

    active_desc = steps[min(current_step, total_steps) - 1][2]

    st.markdown(
        f"""<div role="img" aria-label="Analysis progress: step {current_step} of {total_steps}"
             style="background:var(--bg-glass);backdrop-filter:blur(12px);
             border:1px solid var(--border-subtle);border-radius:16px;
             padding:20px 24px;margin-bottom:16px;">
            <div style="display:flex;align-items:center;justify-content:center;
                 gap:4px;margin-bottom:8px;">
                {step_items_html}
            </div>
            <div aria-live="polite" style="text-align:center;font-size:0.85rem;
                 color:var(--text-muted);font-family:'Lexend',sans-serif;">
                {active_desc}
            </div>
        </div>""",
        unsafe_allow_html=True,
    )


# ---------------------------------------------------------------------------
# Skeleton loading card (T3.7)
# ---------------------------------------------------------------------------
def render_skeleton_card(count: int = 3):
    """Render skeleton loading placeholders."""
    cards_html = ""
    for _ in range(count):
        cards_html += """
        <div style="background:var(--bg-glass);border:1px solid var(--border-subtle);
             border-radius:16px;padding:20px;margin-bottom:12px;overflow:hidden;">
            <div style="height:16px;width:60%;border-radius:8px;margin-bottom:12px;
                 background:linear-gradient(90deg, var(--bg-elevated) 25%,
                 var(--border-subtle) 50%, var(--bg-elevated) 75%);
                 background-size:200% 100%;
                 animation:shimmer 1.5s linear infinite;"></div>
            <div style="height:12px;width:90%;border-radius:6px;margin-bottom:8px;
                 background:linear-gradient(90deg, var(--bg-elevated) 25%,
                 var(--border-subtle) 50%, var(--bg-elevated) 75%);
                 background-size:200% 100%;
                 animation:shimmer 1.5s linear infinite 0.2s;"></div>
            <div style="height:12px;width:40%;border-radius:6px;
                 background:linear-gradient(90deg, var(--bg-elevated) 25%,
                 var(--border-subtle) 50%, var(--bg-elevated) 75%);
                 background-size:200% 100%;
                 animation:shimmer 1.5s linear infinite 0.4s;"></div>
        </div>
        """
    st.markdown(cards_html, unsafe_allow_html=True)


# ---------------------------------------------------------------------------
# Punnett square visualization (T3.6a)
# ---------------------------------------------------------------------------
def render_punnett_square(
    parent_a_alleles: tuple[str, str],
    parent_b_alleles: tuple[str, str],
    risk_type: str = "carrier",
) -> str:
    """Render a visual 2x2 Punnett square showing offspring genotype probabilities.

    Returns the HTML string (also renders via st.markdown).

    Args:
        parent_a_alleles: (allele1, allele2) from Parent A (rows)
        parent_b_alleles: (allele1, allele2) from Parent B (columns)
        risk_type: "carrier" for disease risk, "trait" for trait prediction
    """
    # Determine which allele is the risk/variant allele
    all_alleles = set(parent_a_alleles + parent_b_alleles)

    # For carrier risk: lowercase = pathogenic, uppercase = reference (convention)
    # We detect risk by checking if alleles differ; the less common one is the variant
    def _cell_class(a1: str, a2: str) -> str:
        """Determine CSS class for a Punnett cell based on genotype."""
        # Both same as reference → normal
        if a1 == a2 and len(all_alleles) == 1:
            return "punnett-normal"
        if a1 == a2:
            # Homozygous — check if it's the variant allele
            # If risk_type is carrier: homozygous variant = affected
            return "punnett-affected" if risk_type == "carrier" else "punnett-normal"
        # Heterozygous = carrier
        return "punnett-carrier"

    def _cell_label(a1: str, a2: str) -> str:
        all_same = len(all_alleles) == 1
        if all_same:
            return "Unaffected"
        if a1 == a2:
            return "Affected" if risk_type == "carrier" else "Homozygous"
        return "Carrier" if risk_type == "carrier" else "Heterozygous"

    # Build 2x2 grid
    cells = []
    for a_allele in parent_a_alleles:
        for b_allele in parent_b_alleles:
            geno = "".join(sorted([a_allele, b_allele]))
            cls = _cell_class(a_allele, b_allele)
            label = _cell_label(a_allele, b_allele)
            cells.append((geno, cls, label))

    # Count probabilities
    from collections import Counter
    geno_counts = Counter(c[0] for c in cells)
    geno_prob = {g: count / 4 * 100 for g, count in geno_counts.items()}

    css = """
    <style>
    .punnett-grid {
        display: grid; grid-template-columns: auto 1fr 1fr;
        grid-template-rows: auto 1fr 1fr;
        gap: 3px; max-width: 320px; margin: 8px auto;
        border-radius: 12px; overflow: hidden;
        border: 1px solid var(--border-subtle);
        background: var(--bg-elevated);
    }
    .punnett-header {
        background: var(--bg-glass); padding: 8px 12px;
        font-family: 'Sora', sans-serif; font-weight: 700;
        font-size: 0.85rem; color: var(--text-heading);
        display: flex; align-items: center; justify-content: center;
    }
    .punnett-corner { background: transparent; }
    .punnett-cell {
        padding: 10px 8px; text-align: center;
        font-family: 'Lexend', sans-serif; font-size: 0.82rem;
        border-radius: 4px; transition: transform 0.2s;
    }
    .punnett-cell:hover { transform: scale(1.04); }
    .punnett-cell .geno { font-weight: 700; font-size: 1rem;
        font-family: 'JetBrains Mono', monospace; }
    .punnett-cell .prob { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
    .punnett-cell .pheno { font-size: 0.7rem; margin-top: 2px; opacity: 0.85; }
    .punnett-normal {
        background: rgba(6, 214, 160, 0.1); color: var(--accent-teal);
    }
    .punnett-carrier {
        background: rgba(245, 158, 11, 0.1); color: var(--accent-amber);
    }
    .punnett-affected {
        background: rgba(244, 63, 94, 0.1); color: var(--accent-rose);
    }
    </style>
    """

    a1, a2 = parent_a_alleles
    b1, b2 = parent_b_alleles

    html = f"""{css}
    <div class="punnett-grid" aria-label="Punnett square showing offspring genotype probabilities">
        <div class="punnett-header punnett-corner"></div>
        <div class="punnett-header">{b1}</div>
        <div class="punnett-header">{b2}</div>

        <div class="punnett-header">{a1}</div>
        <div class="punnett-cell {cells[0][1]}">
            <div class="geno">{cells[0][0]}</div>
            <div class="prob">{geno_prob[cells[0][0]]:.0f}%</div>
            <div class="pheno">{cells[0][2]}</div>
        </div>
        <div class="punnett-cell {cells[1][1]}">
            <div class="geno">{cells[1][0]}</div>
            <div class="prob">{geno_prob[cells[1][0]]:.0f}%</div>
            <div class="pheno">{cells[1][2]}</div>
        </div>

        <div class="punnett-header">{a2}</div>
        <div class="punnett-cell {cells[2][1]}">
            <div class="geno">{cells[2][0]}</div>
            <div class="prob">{geno_prob[cells[2][0]]:.0f}%</div>
            <div class="pheno">{cells[2][2]}</div>
        </div>
        <div class="punnett-cell {cells[3][1]}">
            <div class="geno">{cells[3][0]}</div>
            <div class="prob">{geno_prob[cells[3][0]]:.0f}%</div>
            <div class="pheno">{cells[3][2]}</div>
        </div>
    </div>
    """

    st.markdown(html, unsafe_allow_html=True)
    return html


# ---------------------------------------------------------------------------
# Confidence signal-strength indicator (T3.6d)
# ---------------------------------------------------------------------------
def render_confidence_indicator(level: str) -> str:
    """Return HTML for a Wi-Fi-style signal strength indicator.

    Args:
        level: "high", "medium", or "low"

    Returns:
        HTML string with the confidence indicator markup.
    """
    bar_colors = {
        "high": (ACCENT_TEAL, ACCENT_TEAL, ACCENT_TEAL),
        "medium": (ACCENT_AMBER, ACCENT_AMBER, "var(--border-subtle)"),
        "low": (ACCENT_ROSE, "var(--border-subtle)", "var(--border-subtle)"),
    }
    colors = bar_colors.get(level.lower(), bar_colors["low"])

    html = (
        f'<span class="confidence-indicator" aria-label="Confidence: {level}" '
        f'title="Confidence: {level.title()}">'
        f'<span class="bar" style="height:6px;background:{colors[0]};"></span>'
        f'<span class="bar" style="height:10px;background:{colors[1]};"></span>'
        f'<span class="bar" style="height:14px;background:{colors[2]};"></span>'
        f"</span>"
    )

    css = """
    <style>
    .confidence-indicator {
        display: inline-flex; align-items: flex-end; gap: 2px;
        vertical-align: middle; margin: 0 4px;
    }
    .confidence-indicator .bar {
        width: 4px; border-radius: 2px; transition: background 0.3s;
    }
    </style>
    """

    return css + html


# ---------------------------------------------------------------------------
# Glossary tooltip helper (T3.5b)
# ---------------------------------------------------------------------------
def tooltip_term(term: str, definition: str | None = None) -> str:
    """Wrap a genetic term with a CSS tooltip showing its definition.

    If definition is None, looks up from glossary data.

    Args:
        term: The term to wrap.
        definition: Optional explicit definition. Falls back to glossary.json.

    Returns:
        HTML string with tooltip markup.
    """
    if definition is None:
        glossary = _load_glossary()
        definition = glossary.get(term.lower(), "")
    if not definition:
        return term

    # Escape quotes in definition for safe HTML attribute
    safe_def = definition.replace('"', "&quot;").replace("'", "&#39;")

    return (
        f'<span class="genetic-tooltip" data-tooltip="{safe_def}">{term}'
        f'<span class="tooltip-icon">(?)</span></span>'
    )


# Inject the tooltip CSS once (called from pages that use tooltips)
_TOOLTIP_CSS = """
<style>
.genetic-tooltip {
    position: relative; cursor: help;
    border-bottom: 1px dotted var(--text-dim);
    display: inline;
}
.genetic-tooltip .tooltip-icon {
    font-size: 0.65rem; color: var(--text-dim);
    margin-left: 2px; vertical-align: super;
}
.genetic-tooltip::after {
    content: attr(data-tooltip);
    position: absolute; bottom: 100%; left: 50%;
    transform: translateX(-50%);
    background: var(--bg-elevated); color: var(--text-body);
    padding: 8px 12px; border-radius: 8px; font-size: 0.8rem;
    white-space: normal; width: 250px; opacity: 0;
    pointer-events: none; transition: opacity 0.2s; z-index: 100;
    border: 1px solid var(--border-subtle);
    font-family: 'Lexend', sans-serif; line-height: 1.5;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
}
.genetic-tooltip:hover::after { opacity: 1; }
</style>
"""
