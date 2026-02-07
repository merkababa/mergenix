"""
Mergenix - Genetic Offspring Analysis Platform

Entry-point router.  Defines pages via st.navigation(position="hidden")
and injects the global CSS + custom navbar/footer once.
"""

import os
import sys

# ---------------------------------------------------------------------------
# Path setup — make Source/ importable (must happen before Source imports)
# ---------------------------------------------------------------------------
APP_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, APP_DIR)

import streamlit as st  # noqa: E402
from Source.ui import inject_global_css, render_footer, render_navbar  # noqa: E402

# ---------------------------------------------------------------------------
# Page configuration (must be first Streamlit command)
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="Mergenix - Genetic Offspring Analysis",
    page_icon="\U0001f9ec",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ---------------------------------------------------------------------------
# Define all pages
# ---------------------------------------------------------------------------
pages = [
    st.Page("pages/home.py", title="Home", default=True),
    st.Page("pages/products.py", title="Products"),
    st.Page("pages/disease_catalog.py", title="Disease Catalog"),
    st.Page("pages/auth.py", title="Sign In"),
    st.Page("pages/analysis.py", title="Analysis"),
    st.Page("pages/subscription.py", title="Subscription"),
    st.Page("pages/about.py", title="About"),
    st.Page("pages/legal.py", title="Legal"),
    st.Page("pages/account.py", title="Account"),
]

pg = st.navigation(pages, position="hidden")

# ---------------------------------------------------------------------------
# Global UI shell — injected once, inherited by every page
# ---------------------------------------------------------------------------
inject_global_css()
render_navbar(current_page=pg)

# ---------------------------------------------------------------------------
# Run the selected page
# ---------------------------------------------------------------------------
pg.run()

# ---------------------------------------------------------------------------
# Shared footer
# ---------------------------------------------------------------------------
render_footer()
