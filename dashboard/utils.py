"""Shared utilities for the Streamlit dashboard."""

import requests
import streamlit as st

API_BASE = "http://localhost:8000/api"


def api_get(endpoint: str) -> dict:
    """GET request to CB-MOPA FastAPI backend."""
    try:
        r = requests.get(f"{API_BASE}/{endpoint}", timeout=30)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        st.error(f"API error: {e}")
        return {}


def api_post(endpoint: str, data: dict) -> dict:
    """POST request to CB-MOPA FastAPI backend."""
    try:
        r = requests.post(f"{API_BASE}/{endpoint}", json=data, timeout=30)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        st.error(f"API error: {e}")
        return {}


def get_cluster_names():
    """Return the 3 golden cluster names."""
    return [
        "Max Quality Golden",
        "Deep Decarbonization Golden",
        "Balanced Operational Golden",
    ]


CLUSTER_COLORS = {
    "Max Quality Golden": "#27AE60",
    "Deep Decarbonization Golden": "#2E86C1",
    "Balanced Operational Golden": "#E67E22",
}
