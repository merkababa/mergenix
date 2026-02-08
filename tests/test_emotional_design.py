"""Tests for emotional design and compassionate language."""

from pathlib import Path


def test_no_alarming_language_in_analysis():
    """Analysis page should not use alarming language for results."""
    content = Path("pages/analysis.py").read_text()
    alarming_phrases = [
        "\U0001f6a8 High Risk",
        "\u274c Affected (homozygous pathogenic)",
        "pathogenic allele",
    ]
    for phrase in alarming_phrases:
        assert phrase not in content, f"Found alarming phrase: {phrase}"


def test_counseling_link_in_analysis():
    """Analysis page should include genetic counseling link."""
    content = Path("pages/analysis.py").read_text()
    assert "nsgc.org" in content.lower()


def test_pre_results_context_exists():
    """Analysis page should have a pre-results context card."""
    content = Path("pages/analysis.py").read_text()
    assert "Before You View" in content or "before you view" in content.lower()


def test_render_probability_bar_has_fraction():
    """render_probability_bar should show fraction alongside percentage."""
    content = Path("Source/ui/components.py").read_text()
    assert "1 in" in content


def test_progress_stepper_exists():
    """components.py should have a progress stepper function."""
    content = Path("Source/ui/components.py").read_text()
    assert "render_progress_stepper" in content


def test_skeleton_card_exists():
    """components.py should have a skeleton card function."""
    content = Path("Source/ui/components.py").read_text()
    assert "render_skeleton_card" in content


def test_compassionate_labels_used():
    """Analysis should use compassionate labels."""
    content = Path("pages/analysis.py").read_text()
    assert "Important Finding" in content
    assert "One Copy Found" in content


def test_next_steps_card_exists():
    """Analysis page should have a Next Steps card with counseling info."""
    content = Path("pages/analysis.py").read_text()
    assert "Next Steps for Your Family" in content


def test_no_red_border_on_high_risk_cards():
    """High-risk cards should use amber border, not red."""
    content = Path("pages/analysis.py").read_text()
    assert "border-left:4px solid #ef4444" not in content
    assert "border-left:4px solid #f59e0b" in content


def test_progress_stepper_aria():
    """Progress stepper should have ARIA attributes."""
    content = Path("Source/ui/components.py").read_text()
    assert 'role="img"' in content
    assert 'aria-label="Analysis progress' in content
    assert 'aria-live="polite"' in content


def test_severity_badge_aria():
    """Severity badges should have role=status."""
    content = Path("Source/ui/components.py").read_text()
    assert 'role="status"' in content
