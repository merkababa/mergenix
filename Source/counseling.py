"""
Genetic Counseling Referral System for Mergenix.

Determines when genetic counseling is recommended based on analysis results,
generates tier-gated referral summaries, and provides a searchable counselor
directory filtered by specialty and location.
"""

from __future__ import annotations

import os
from datetime import date

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
NSGC_URL = "https://www.nsgc.org/findageneticcounselor"

COUNSELING_SPECIALTIES = [
    "prenatal",
    "carrier_screening",
    "cancer",
    "cardiovascular",
    "pediatric",
    "neurogenetics",
    "pharmacogenomics",
    "general",
]

_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
_PROVIDERS_PATH = os.path.join(_DATA_DIR, "counseling_providers.json")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_counseling_specialties() -> list[str]:
    """Return the list of recognized genetic counseling specialties."""
    return list(COUNSELING_SPECIALTIES)


def should_recommend_counseling(
    carrier_results: list[dict],
    prs_results: list[dict] | None = None,
    pgx_results: list[dict] | None = None,
) -> tuple[bool, list[str]]:
    """Decide whether genetic counseling should be recommended.

    Args:
        carrier_results: Output of ``analyze_carrier_risk`` — each dict has
            at minimum ``risk_level``, ``condition``, ``parent_a_status``,
            ``parent_b_status``.
        prs_results: Optional polygenic risk score results.  Each dict should
            contain ``percentile`` (float 0-100) and ``trait`` (str).
        pgx_results: Optional pharmacogenomics results.  Each dict should
            contain ``actionable`` (bool) and ``drug`` (str).

    Returns:
        A ``(recommend, reasons)`` tuple where *recommend* is ``True`` when
        counseling is advised and *reasons* lists human-readable explanations.
    """
    reasons: list[str] = []

    # 1. Both parents are carriers for the same disease
    for r in carrier_results:
        if r.get("parent_a_status") == "carrier" and r.get("parent_b_status") == "carrier":
            reasons.append(
                f"Both parents are carriers for {r['condition']} — "
                f"offspring have a 25% chance of being affected"
            )

    # 2. Any high-risk result
    for r in carrier_results:
        if r.get("risk_level") == "high_risk":
            msg = f"High-risk result detected for {r['condition']}"
            if msg not in reasons:
                reasons.append(msg)

    # 3. High PRS percentile (>90th)
    if prs_results:
        for p in prs_results:
            if p.get("percentile", 0) > 90:
                reasons.append(
                    f"Polygenic risk score for {p.get('trait', 'unknown trait')} "
                    f"is in the {p['percentile']:.0f}th percentile (elevated)"
                )

    # 4. Actionable PGx findings
    if pgx_results:
        for g in pgx_results:
            if g.get("actionable"):
                reasons.append(
                    f"Actionable pharmacogenomic finding for {g.get('drug', 'unknown drug')}"
                )

    return (len(reasons) > 0, reasons)


def generate_referral_summary(
    carrier_results: list[dict],
    user_name: str = "",
    tier: str = "free",
) -> dict:
    """Create a tier-gated referral summary from carrier analysis results.

    Args:
        carrier_results: Output of ``analyze_carrier_risk``.
        user_name: Optional display name for the referral letter.
        tier: One of ``"free"``, ``"premium"``, ``"pro"`` (case-insensitive).

    Returns:
        A dict with keys:
        - ``recommend`` (bool)
        - ``reasons`` (list[str])
        - ``nsgc_url`` (str) — always present
        - ``summary_text`` (str | None) — ``None`` for free tier
        - ``key_findings`` (list[dict] | None) — ``None`` for free tier
        - ``recommended_specialties`` (list[str] | None) — ``None`` for free tier
        - ``referral_letter`` (str | None) — only for pro tier
    """
    tier_lower = tier.lower()
    recommend, reasons = should_recommend_counseling(carrier_results)

    base: dict = {
        "recommend": recommend,
        "reasons": reasons,
        "nsgc_url": NSGC_URL,
        "summary_text": None,
        "key_findings": None,
        "recommended_specialties": None,
        "referral_letter": None,
    }

    if tier_lower == "free":
        return base

    # Premium & Pro: full summary ------------------------------------------------
    key_findings = _extract_key_findings(carrier_results)
    specialties = _infer_specialties(carrier_results)

    high_risk_count = sum(1 for r in carrier_results if r.get("risk_level") == "high_risk")
    carrier_count = sum(1 for r in carrier_results if r.get("risk_level") == "carrier_detected")

    summary_text = (
        f"Mergenix Genetic Counseling Summary\n"
        f"Generated: {date.today().isoformat()}\n\n"
        f"Diseases analyzed: {len(carrier_results)}\n"
        f"High-risk findings: {high_risk_count}\n"
        f"Carrier findings: {carrier_count}\n\n"
    )
    if recommend:
        summary_text += "Recommendation: Genetic counseling is advised.\n"
        for i, reason in enumerate(reasons, 1):
            summary_text += f"  {i}. {reason}\n"
    else:
        summary_text += "Recommendation: No urgent findings. Routine counseling optional.\n"

    base["summary_text"] = summary_text
    base["key_findings"] = key_findings
    base["recommended_specialties"] = specialties

    # Pro: referral letter -------------------------------------------------------
    if tier_lower == "pro":
        base["referral_letter"] = _format_referral_letter(
            user_name=user_name,
            key_findings=key_findings,
            specialties=specialties,
            reasons=reasons,
        )

    return base


def find_providers_by_specialty(
    providers: list[dict],
    specialty: str | None = None,
    state: str | None = None,
) -> list[dict]:
    """Filter a provider list by specialty and/or US state.

    Args:
        providers: List of provider dicts (see ``counseling_providers.json``).
        specialty: If given, only return providers whose ``specialty`` list
            contains this value (case-insensitive).
        state: If given, only return providers in this US state (2-letter code,
            case-insensitive).

    Returns:
        Filtered list of provider dicts.
    """
    results = providers

    if specialty:
        spec_lower = specialty.lower()
        results = [
            p for p in results
            if spec_lower in [s.lower() for s in p.get("specialty", [])]
        ]

    if state:
        state_upper = state.upper()
        results = [
            p for p in results
            if p.get("state", "").upper() == state_upper
        ]

    return results


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _extract_key_findings(carrier_results: list[dict]) -> list[dict]:
    """Pull out the most clinically relevant findings for the summary."""
    findings: list[dict] = []
    for r in carrier_results:
        risk = r.get("risk_level", "low_risk")
        if risk in ("high_risk", "carrier_detected"):
            findings.append({
                "condition": r["condition"],
                "gene": r.get("gene", ""),
                "risk_level": risk,
                "parent_a_status": r.get("parent_a_status", "unknown"),
                "parent_b_status": r.get("parent_b_status", "unknown"),
                "inheritance": r.get("inheritance", "autosomal_recessive"),
            })
    return findings


def _infer_specialties(carrier_results: list[dict]) -> list[str]:
    """Suggest counseling specialties based on the disease categories found."""
    specs: set[str] = set()

    for r in carrier_results:
        risk = r.get("risk_level", "low_risk")
        if risk not in ("high_risk", "carrier_detected"):
            continue

        category = r.get("category", "").lower()

        # Map disease categories to counseling specialties
        if "cancer" in category or "oncolog" in category:
            specs.add("cancer")
        if "cardio" in category or "heart" in category:
            specs.add("cardiovascular")
        if "neuro" in category or "brain" in category:
            specs.add("neurogenetics")
        if "pediatr" in category:
            specs.add("pediatric")

        # Carrier screening is always relevant for carrier results
        if risk == "carrier_detected" or (
            r.get("parent_a_status") == "carrier"
            and r.get("parent_b_status") == "carrier"
        ):
            specs.add("carrier_screening")

        # Prenatal is recommended for any high-risk finding
        if risk == "high_risk":
            specs.add("prenatal")

    # Always include general if we have any findings
    if specs:
        specs.add("general")

    return sorted(specs)


def _format_referral_letter(
    user_name: str,
    key_findings: list[dict],
    specialties: list[str],
    reasons: list[str],
) -> str:
    """Generate a formatted referral letter for pro-tier users."""
    name_line = f"Patient: {user_name}\n" if user_name else ""
    today = date.today().isoformat()

    lines = [
        "GENETIC COUNSELING REFERRAL",
        "=" * 40,
        f"Date: {today}",
        name_line.rstrip(),
        "",
        "Dear Genetic Counselor,",
        "",
        "This referral is generated by the Mergenix genetic analysis platform.",
        "The following findings warrant professional genetic counseling:",
        "",
    ]

    if reasons:
        for i, reason in enumerate(reasons, 1):
            lines.append(f"  {i}. {reason}")
        lines.append("")

    if key_findings:
        lines.append("Key Findings:")
        for f in key_findings:
            lines.append(
                f"  - {f['condition']} ({f['gene']}): "
                f"Parent A={f['parent_a_status']}, Parent B={f['parent_b_status']} "
                f"[{f['inheritance']}]"
            )
        lines.append("")

    if specialties:
        lines.append(f"Recommended specialties: {', '.join(specialties)}")
        lines.append("")

    lines.extend([
        "This report is for informational purposes only and does not constitute",
        "a medical diagnosis. Please review the raw data and clinical context.",
        "",
        "Sincerely,",
        "Mergenix Genetic Analysis Platform",
        f"NSGC Directory: {NSGC_URL}",
    ])

    return "\n".join(lines)
