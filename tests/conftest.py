"""Shared test fixtures."""
import json
import os
import pytest


@pytest.fixture
def carrier_panel_path():
    """Return absolute path to carrier panel JSON file."""
    return os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "carrier_panel.json")


@pytest.fixture
def carrier_panel(carrier_panel_path):
    """Load and return carrier panel data."""
    with open(carrier_panel_path, "r") as f:
        return json.load(f)
