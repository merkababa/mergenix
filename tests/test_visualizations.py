"""Tests for T3.6 interactive visualizations and T3.5b tooltip components."""

from Source.ui.components import (
    render_confidence_indicator,
    render_punnett_square,
    tooltip_term,
)


# ---------------------------------------------------------------------------
# Punnett square tests
# ---------------------------------------------------------------------------
def test_punnett_square_function_exists():
    assert callable(render_punnett_square)


def test_punnett_square_basic():
    html = render_punnett_square(("A", "a"), ("A", "a"))
    assert "punnett" in html.lower()


def test_punnett_square_contains_genotypes():
    html = render_punnett_square(("A", "a"), ("A", "a"))
    assert "AA" in html
    assert "Aa" in html
    assert "aa" in html


def test_punnett_square_homozygous_parents():
    html = render_punnett_square(("A", "A"), ("A", "A"))
    assert "AA" in html
    assert "Unaffected" in html


def test_punnett_square_trait_risk_type():
    html = render_punnett_square(("G", "A"), ("G", "A"), risk_type="trait")
    assert "punnett" in html.lower()
    # Should show Heterozygous for mixed alleles in trait mode
    assert "Heterozygous" in html


def test_punnett_square_has_probabilities():
    html = render_punnett_square(("A", "a"), ("A", "a"))
    assert "25%" in html or "50%" in html


def test_punnett_square_has_aria_label():
    html = render_punnett_square(("A", "a"), ("A", "a"))
    assert "aria-label" in html


# ---------------------------------------------------------------------------
# Confidence indicator tests
# ---------------------------------------------------------------------------
def test_confidence_indicator_function_exists():
    assert callable(render_confidence_indicator)


def test_confidence_indicator_high():
    html = render_confidence_indicator("high")
    assert "confidence-indicator" in html
    assert "Confidence: high" in html


def test_confidence_indicator_medium():
    html = render_confidence_indicator("medium")
    assert "confidence-indicator" in html


def test_confidence_indicator_low():
    html = render_confidence_indicator("low")
    assert "confidence-indicator" in html


def test_confidence_indicator_has_three_bars():
    html = render_confidence_indicator("high")
    assert html.count('class="bar"') == 3


def test_confidence_indicator_case_insensitive():
    html = render_confidence_indicator("HIGH")
    assert "confidence-indicator" in html


# ---------------------------------------------------------------------------
# Tooltip tests
# ---------------------------------------------------------------------------
def test_tooltip_term_function_exists():
    assert callable(tooltip_term)


def test_tooltip_term_returns_html():
    result = tooltip_term("carrier", "A person who has one copy of a variant")
    assert "genetic-tooltip" in result
    assert "carrier" in result


def test_tooltip_term_with_explicit_definition():
    result = tooltip_term("SNP", "Single Nucleotide Polymorphism")
    assert "genetic-tooltip" in result
    assert "SNP" in result
    assert "Single Nucleotide Polymorphism" in result


def test_tooltip_term_with_glossary_lookup():
    # "Carrier" is in glossary.json
    result = tooltip_term("Carrier")
    assert "genetic-tooltip" in result
    assert "Carrier" in result


def test_tooltip_term_unknown_returns_plain():
    # Unknown term with no definition should return plain text
    result = tooltip_term("xyznonexistent123")
    assert result == "xyznonexistent123"
    assert "genetic-tooltip" not in result


def test_tooltip_term_escapes_quotes():
    result = tooltip_term("test", 'Has "quotes" and \'apostrophes\'')
    assert "&quot;" in result
    assert "&#39;" in result


def test_tooltip_term_has_tooltip_icon():
    result = tooltip_term("carrier", "definition text")
    assert "tooltip-icon" in result
    assert "(?)" in result
