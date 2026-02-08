"""
Mergenix UI package — centralized theme, navigation, and reusable components.
"""

from .footer import render_footer
from .navbar import render_navbar
from .theme import get_plotly_theme, get_theme, inject_global_css

__all__ = [
    "get_plotly_theme",
    "get_theme",
    "inject_global_css",
    "render_navbar",
    "render_footer",
]
