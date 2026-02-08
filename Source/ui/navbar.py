"""
Mergenix — Custom top navigation bar.

Renders a responsive navbar with brand, navigation links, and auth state.
Uses st.markdown(unsafe_allow_html=True) + st.page_link() for navigation.
"""

import streamlit as st
from Source.auth import get_current_user


def render_navbar(current_page=None) -> None:
    """Render the custom top navigation bar.

    Args:
        current_page: The StreamlitPage object returned by st.navigation().
    """
    user = get_current_user()
    current_title = getattr(current_page, "title", "") if current_page else ""
    is_dark = st.session_state.get("theme", "dark") == "dark"

    # Build nav links based on auth state
    if user:
        nav_items = [
            ("Products", "pages/products.py", "Products"),
            ("Disease Catalog", "pages/disease_catalog.py", "Disease Catalog"),
            ("Analysis", "pages/analysis.py", "Analysis"),
            ("About", "pages/about.py", "About"),
        ]
    else:
        nav_items = [
            ("Products", "pages/products.py", "Products"),
            ("Disease Catalog", "pages/disease_catalog.py", "Disease Catalog"),
            ("About", "pages/about.py", "About"),
        ]

    # DNA dots for brand
    dots_html = "".join(
        f'<span style="display:inline-block;width:8px;height:8px;border-radius:50%;'
        f'background:linear-gradient(135deg,{c1},{c2});'
        f'animation:helixFloat 2s ease-in-out infinite {delay}s;"></span>'
        for c1, c2, delay in [
            ("#06d6a0", "#22d3ee", 0),
            ("#7c3aed", "#a78bfa", 0.3),
            ("#06d6a0", "#22d3ee", 0.6),
        ]
    )

    # Build link HTML
    links_html = ""
    for label, _page_path, match_title in nav_items:
        active_class = "active" if current_title == match_title else ""
        aria_current = ' aria-current="page"' if active_class else ""
        links_html += (
            f'<span class="nav-link {active_class}" '
            f'style="cursor:pointer;" tabindex="0" role="link"'
            f'{aria_current} '
            f'data-page="{match_title}">{label}</span>'
        )

    # Right side: auth state
    if user:
        tier = user.get("tier", "free")
        name = user.get("name", "User")
        actions_html = (
            f'<div class="nav-user">'
            f'<span class="nav-user-name">{name}</span>'
            f'<span class="nav-user-tier {tier}">{tier.upper()}</span>'
            f'</div>'
        )
    else:
        actions_html = (
            '<span class="nav-btn signin" data-page="Sign In" style="cursor:pointer;">Sign In</span>'
            '<span class="nav-btn cta" data-page="Home" style="cursor:pointer;">Get Started</span>'
        )

    # Render the navbar HTML
    toggle_checked = "false" if is_dark else "true"
    st.markdown(
        f"""
        <nav role="navigation" aria-label="Main navigation">
        <div class="mergenix-navbar">
            <div class="nav-brand" style="cursor:pointer;" tabindex="0" role="link" data-page="Home">
                <div style="display:flex;gap:4px;align-items:center;" aria-hidden="true">{dots_html}</div>
                <span class="brand-text">Mergenix</span>
            </div>
            <div class="nav-links">{links_html}</div>
            <div class="theme-toggle" title="Toggle light/dark mode"
                 role="switch" aria-checked="{toggle_checked}"
                 aria-label="Toggle dark/light mode" tabindex="0">
                <div class="toggle-track">
                    <span class="icon-moon" aria-hidden="true">🌙</span>
                    <span class="icon-sun" aria-hidden="true">☀️</span>
                    <div class="toggle-thumb"></div>
                </div>
            </div>
            <div class="nav-actions">{actions_html}</div>
        </div>
        </nav>
        """,
        unsafe_allow_html=True,
    )

    # Use Streamlit page_link for actual navigation (placed in a hidden row)
    # We render small st.page_link buttons that the navbar's visual HTML links to
    _render_page_links(nav_items, user, current_title)


def _render_page_links(nav_items, user, current_title):
    """Render real Streamlit page_link elements for navigation.

    These are displayed as small pill-style links below the custom navbar
    so Streamlit handles the actual page routing.
    """
    # Create a compact row of actual page links
    all_links = []

    # Home link
    all_links.append(("Home", "pages/home.py"))

    # Nav items
    for label, page_path, _match in nav_items:
        all_links.append((label, page_path))

    # Auth links
    if not user:
        all_links.append(("Sign In", "pages/auth.py"))

    # Render in columns for compact layout, hidden with minimal styling
    cols = st.columns(len(all_links))
    for i, (label, path) in enumerate(all_links):
        with cols[i]:
            try:
                st.page_link(path, label=label, icon=None)
            except Exception:  # noqa: S110
                pass  # page may not exist yet during development
