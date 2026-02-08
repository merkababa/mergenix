"""Tests for onboarding and demo mode."""

from pathlib import Path


def test_sample_data_files_exist():
    """Sample data directory should have files for demo mode."""
    sample_dir = Path(__file__).parent.parent / "sample_data" / "23andme"
    assert sample_dir.exists(), "sample_data/23andme directory must exist"
    files = list(sample_dir.glob("*.txt"))
    assert len(files) >= 2, "Need at least 2 sample files for demo"


def test_home_page_has_no_bare_pass():
    """The 'See How It Works' button should not just `pass`."""
    home_path = Path(__file__).parent.parent / "pages" / "home.py"
    content = home_path.read_text(encoding="utf-8")
    lines = content.split("\n")
    for i, line in enumerate(lines):
        if "See How It Works" in line:
            # Check next few lines don't just have a bare `pass`
            remaining = lines[i : i + 5]
            for rline in remaining[1:]:
                stripped = rline.strip()
                if stripped == "pass" or stripped == "pass  # scroll anchor":
                    raise AssertionError(
                        "'See How It Works' button handler must not be a bare pass"
                    )


def test_home_page_has_demo_button():
    """Home page should have a 'Try with Sample Data' button."""
    home_path = Path(__file__).parent.parent / "pages" / "home.py"
    content = home_path.read_text(encoding="utf-8")
    assert "Try with Sample Data" in content, "Home page must have demo button"


def test_home_page_has_dna_download_guide():
    """Home page should have DNA download instructions."""
    home_path = Path(__file__).parent.parent / "pages" / "home.py"
    content = home_path.read_text(encoding="utf-8")
    assert "How to Download Your Raw DNA Data" in content
    assert "23andMe" in content
    assert "AncestryDNA" in content
    assert "MyHeritage" in content
    assert "VCF" in content


def test_home_page_sets_demo_session_state():
    """Home page should set demo_mode session state flags."""
    home_path = Path(__file__).parent.parent / "pages" / "home.py"
    content = home_path.read_text(encoding="utf-8")
    assert 'st.session_state["demo_mode"]' in content
    assert 'st.session_state["demo_parent_a"]' in content
    assert 'st.session_state["demo_parent_b"]' in content


def test_auth_page_has_welcome_flow():
    """Auth page should have a welcome flow after registration."""
    auth_path = Path(__file__).parent.parent / "pages" / "auth.py"
    content = auth_path.read_text(encoding="utf-8")
    assert "show_welcome" in content, "Auth page must have welcome flow flag"
    assert "Welcome to Mergenix" in content, "Auth page must show welcome message"
    assert "Try Demo First" in content, "Welcome flow must offer demo option"
    assert "Upload My Files" in content, "Welcome flow must offer upload option"
    assert "Learn More" in content, "Welcome flow must offer learn more option"


def test_home_page_has_scroll_anchor():
    """Home page should have a scroll anchor for 'How It Works' section."""
    home_path = Path(__file__).parent.parent / "pages" / "home.py"
    content = home_path.read_text(encoding="utf-8")
    assert "how-it-works-anchor" in content, "Must have scroll anchor for How It Works"
