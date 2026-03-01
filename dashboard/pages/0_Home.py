"""
CB-MOPA Dashboard — Home Page (sidebar navigation entry).
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

import streamlit as st
import requests

st.set_page_config(
    page_title="CB-MOPA — Home",
    page_icon="⚗️",
    layout="wide",
)

# ──────────────────────────────────────────────────────────
# Custom CSS
# ──────────────────────────────────────────────────────────
st.markdown("""
<style>
    .module-card {
        background: linear-gradient(135deg, #152744 0%, #1a3a5c 100%);
        border: 1px solid #2E86C1;
        border-radius: 12px;
        padding: 24px;
        margin: 8px 0;
        min-height: 200px;
    }
    .module-card h3 { color: #2E86C1; margin-bottom: 12px; }
    .module-card p { color: #B0C4DE; font-size: 14px; line-height: 1.6; }
    .metric-card {
        background: #152744;
        border-radius: 8px;
        padding: 16px;
        text-align: center;
        border: 1px solid #1f4068;
    }
    .metric-card h2 { color: #2E86C1; margin: 0; }
    .metric-card p { color: #8B949E; margin: 4px 0 0 0; font-size: 13px; }
    .arch-box {
        background: #0D1117;
        border: 1px solid #30363d;
        border-radius: 8px;
        padding: 20px;
        font-family: 'Courier New', monospace;
        font-size: 13px;
        line-height: 1.8;
        color: #58A6FF;
    }
</style>
""", unsafe_allow_html=True)

# ──────────────────────────────────────────────────────────
# Header
# ──────────────────────────────────────────────────────────
st.title("⚗️ CB-MOPA: Causal-Bayesian Multi-Objective Process Analytics")
st.caption("Track B Optimization Engine — Pharmaceutical Tablet Manufacturing")

st.divider()

# ──────────────────────────────────────────────────────────
# Three Module Cards
# ──────────────────────────────────────────────────────────
col1, col2, col3 = st.columns(3)

with col1:
    st.markdown("""
    <div class="module-card">
        <h3>🌊 Module 1: Probabilistic DTW Envelope</h3>
        <p>Real-time temporal drift detection against golden batch signatures.
        Dynamic Time Warping Barycenter Averaging builds ±3σ probabilistic
        corridors for each phase × sensor combination.</p>
    </div>
    """, unsafe_allow_html=True)

with col2:
    st.markdown("""
    <div class="module-card">
        <h3>🧠 Module 2: Causal Counterfactual Engine</h3>
        <p>DoWhy Do-calculus interventions that prove causal safety before
        acting. Structural Causal Models generate dual-pathway recommendations
        (Yield Guard / Carbon Savior).</p>
    </div>
    """, unsafe_allow_html=True)

with col3:
    st.markdown("""
    <div class="module-card">
        <h3>🎯 Module 3: Bayesian HITL Preference</h3>
        <p>BoTorch PairwiseGP learns the operator's latent utility function
        from pairwise A/B choices. Recommendations adapt to each shift
        supervisor's operational style.</p>
    </div>
    """, unsafe_allow_html=True)

st.divider()

# ──────────────────────────────────────────────────────────
# System Status
# ──────────────────────────────────────────────────────────
st.subheader("🔧 System Status")

try:
    health = requests.get("http://localhost:8000/health", timeout=3).json()
    api_ok = health.get("status") == "ok"
    db_ok = health.get("db_connected", False)
except Exception:
    api_ok = False
    db_ok = False

c1, c2, c3, c4 = st.columns(4)
with c1:
    indicator = "🟢" if api_ok else "🔴"
    st.markdown(f'<div class="metric-card"><h2>{indicator}</h2><p>FastAPI Backend</p></div>', unsafe_allow_html=True)
with c2:
    indicator = "🟢" if db_ok else "🔴"
    st.markdown(f'<div class="metric-card"><h2>{indicator}</h2><p>SQLite Database</p></div>', unsafe_allow_html=True)
with c3:
    st.markdown('<div class="metric-card"><h2>60</h2><p>Batches Loaded</p></div>', unsafe_allow_html=True)
with c4:
    st.markdown('<div class="metric-card"><h2>3</h2><p>Golden Clusters</p></div>', unsafe_allow_html=True)

st.divider()
st.info("👈 **Use the sidebar** to navigate between dashboard pages.")
