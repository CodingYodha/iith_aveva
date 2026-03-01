"""
CB-MOPA Dashboard — Main Entry Point & Home Page.
⚗️ Causal-Bayesian Multi-Objective Process Analytics
"""

import sys
import os

# Ensure project root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import streamlit as st
import requests

st.set_page_config(
    page_title="CB-MOPA Dashboard",
    page_icon="⚗️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ──────────────────────────────────────────────────────────
# Custom CSS for dark industrial theme polish
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
    .status-ok { color: #27AE60; font-weight: bold; }
    .status-fail { color: #E74C3C; font-weight: bold; }
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
    .hero-title {
        font-size: 2.2rem;
        font-weight: 700;
        background: linear-gradient(90deg, #2E86C1, #27AE60, #E67E22);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 4px;
    }
    .hero-subtitle {
        color: #8B949E;
        font-size: 1.1rem;
        margin-bottom: 24px;
    }
    .metric-card {
        background: #152744;
        border-radius: 8px;
        padding: 16px;
        text-align: center;
        border: 1px solid #1f4068;
    }
    .metric-card h2 { color: #2E86C1; margin: 0; }
    .metric-card p { color: #8B949E; margin: 4px 0 0 0; font-size: 13px; }
</style>
""", unsafe_allow_html=True)

# ──────────────────────────────────────────────────────────
# Header
# ──────────────────────────────────────────────────────────
st.markdown('<div class="hero-title">⚗️ CB-MOPA: Causal-Bayesian Multi-Objective Process Analytics</div>', unsafe_allow_html=True)
st.markdown('<div class="hero-subtitle">Track B Optimization Engine — Pharmaceutical Tablet Manufacturing</div>', unsafe_allow_html=True)

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
        corridors for each phase × sensor combination. Soft-DTW distance
        quantifies deviation severity.</p>
    </div>
    """, unsafe_allow_html=True)

with col2:
    st.markdown("""
    <div class="module-card">
        <h3>🧠 Module 2: Causal Counterfactual Engine</h3>
        <p>DoWhy Do-calculus interventions that prove causal safety before
        acting. Structural Causal Models fitted on the manufacturing DAG
        estimate treatment effects and generate dual-pathway recommendations
        (Yield Guard / Carbon Savior).</p>
    </div>
    """, unsafe_allow_html=True)

with col3:
    st.markdown("""
    <div class="module-card">
        <h3>🎯 Module 3: Bayesian HITL Preference</h3>
        <p>BoTorch PairwiseGP learns the operator's latent utility function
        from pairwise A/B choices. Recommendations are re-ranked by learned
        preference, adapting to each shift supervisor's operational style
        over time.</p>
    </div>
    """, unsafe_allow_html=True)

st.divider()

# ──────────────────────────────────────────────────────────
# System Status
# ──────────────────────────────────────────────────────────
st.subheader("🔧 System Status")

status_col1, status_col2, status_col3, status_col4 = st.columns(4)

try:
    health = requests.get("http://localhost:8000/health", timeout=3).json()
    api_ok = health.get("status") == "ok"
    db_ok = health.get("db_connected", False)
except Exception:
    api_ok = False
    db_ok = False

with status_col1:
    if api_ok:
        st.markdown('<div class="metric-card"><h2>🟢</h2><p>FastAPI Backend</p></div>', unsafe_allow_html=True)
    else:
        st.markdown('<div class="metric-card"><h2>🔴</h2><p>FastAPI Backend</p></div>', unsafe_allow_html=True)

with status_col2:
    if db_ok:
        st.markdown('<div class="metric-card"><h2>🟢</h2><p>SQLite Database</p></div>', unsafe_allow_html=True)
    else:
        st.markdown('<div class="metric-card"><h2>🔴</h2><p>SQLite Database</p></div>', unsafe_allow_html=True)

with status_col3:
    st.markdown('<div class="metric-card"><h2>60</h2><p>Batches Loaded</p></div>', unsafe_allow_html=True)

with status_col4:
    st.markdown('<div class="metric-card"><h2>3</h2><p>Golden Clusters</p></div>', unsafe_allow_html=True)

st.divider()

# ──────────────────────────────────────────────────────────
# Architecture Flow
# ──────────────────────────────────────────────────────────
st.subheader("🏗️ System Architecture")

st.markdown("""
<div class="arch-box">
<pre>
 ┌─────────────────────────────────────────────────────────────────────────────────┐
 │                        CB-MOPA PIPELINE ARCHITECTURE                           │
 ├─────────────────────────────────────────────────────────────────────────────────┤
 │                                                                                 │
 │   📊 DATA LAYER                                                                │
 │   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                     │
 │   │  Production   │    │   Process    │    │   Feature    │                     │
 │   │   60×15 CSV   │───▶│  60 Batches  │───▶│  Engineer    │                     │
 │   │  (CPP + CQA)  │    │ (Trajectory) │    │  (67 cols)   │                     │
 │   └──────────────┘    └──────────────┘    └──────┬───────┘                     │
 │                                                   │                             │
 │   🔬 OPTIMIZATION LAYER                          ▼                             │
 │   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                     │
 │   │  NSGA-II     │    │  K-Means     │    │   DTW        │                     │
 │   │  Pareto      │───▶│  3 Golden    │───▶│  Envelopes   │                     │
 │   │  (100 sols)  │    │  Clusters    │    │  (±3σ bands) │                     │
 │   └──────────────┘    └──────────────┘    └──────────────┘                     │
 │                                                                                 │
 │   🧠 CAUSAL LAYER                          🎯 HITL LAYER                      │
 │   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                     │
 │   │  DoWhy DAG   │    │  Counterfact │    │  BoTorch     │                     │
 │   │  (15 nodes,  │───▶│  Intervent.  │───▶│  PairwiseGP  │                     │
 │   │   20 edges)  │    │  (Do-calc)   │    │  (Utility)   │                     │
 │   └──────────────┘    └──────────────┘    └──────┬───────┘                     │
 │                                                   │                             │
 │   🌐 API + DASHBOARD                             ▼                             │
 │   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                     │
 │   │  FastAPI     │    │  Streamlit   │    │  Carbon      │                     │
 │   │  (11 endpts) │◀──▶│  Dashboard   │    │  Tracker     │                     │
 │   │  Port 8000   │    │  Port 8501   │    │  (Dynamic)   │                     │
 │   └──────────────┘    └──────────────┘    └──────────────┘                     │
 │                                                                                 │
 └─────────────────────────────────────────────────────────────────────────────────┘
</pre>
</div>
""", unsafe_allow_html=True)

st.divider()

# ──────────────────────────────────────────────────────────
# Navigation
# ──────────────────────────────────────────────────────────
st.info("👈 **Use the sidebar** to navigate between dashboard pages: "
        "DTW Golden Envelope, Causal What-If, Pareto Explorer, and Carbon Monitor.")
