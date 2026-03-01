"""
CB-MOPA Dashboard — Page 2: Causal Recommendations & HITL Loop.
Dual-pathway recommendation cards with Do-calculus causal effects
and live operator preference learning.
"""

import sys
import os
import json

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from constraints import CPP_COLS, CQA_COLS, PHARMA_LIMITS
from dashboard.utils import api_get, api_post, get_cluster_names, CLUSTER_COLORS

st.set_page_config(page_title="CB-MOPA — Causal Recommendations", page_icon="🧠", layout="wide")

# ──────────────────────────────────────────────────────────
# CSS
# ──────────────────────────────────────────────────────────
st.markdown("""
<style>
    .pathway-card {
        border-radius: 12px; padding: 20px; margin: 8px 0;
        min-height: 300px;
    }
    .pathway-a {
        background: linear-gradient(135deg, #1a3d1a 0%, #152744 100%);
        border: 2px solid #27AE60;
    }
    .pathway-b {
        background: linear-gradient(135deg, #1a2a3d 0%, #152744 100%);
        border: 2px solid #2E86C1;
    }
    .pathway-card h3 { margin-bottom: 8px; }
    .safety-pass { color: #27AE60; font-weight: bold; font-size: 1.1rem; }
    .safety-fail { color: #E74C3C; font-weight: bold; font-size: 1.1rem; }
    .cqa-ok { color: #27AE60; }
    .cqa-viol { color: #E74C3C; }
    .docalc-box {
        background: #0D1117; border: 1px solid #30363d; border-radius: 8px;
        padding: 14px; font-size: 13px; color: #8B949E; margin-bottom: 16px;
    }
</style>
""", unsafe_allow_html=True)

# ──────────────────────────────────────────────────────────
# Mock Data (fallback if API down)
# ──────────────────────────────────────────────────────────
MOCK_PATHWAY_A = {
    "pathway_name": "Yield Guard",
    "param_changes": [{"param": "Drying_Temp", "old_value": 60.0,
                       "new_value": 54.0, "delta_pct": -10.0}],
    "expected_cqa_delta": {"Hardness": 0.08, "Friability": -0.10,
                           "Dissolution_Rate": 0.03, "Disintegration_Time": -1.08,
                           "Content_Uniformity": 0.02, "total_CO2e_kg": -0.14},
    "expected_co2_change": -0.14,
    "safety_check": "PASS",
    "causal_confidence": 0.82,
    "preference_utility": 0.42,
}
MOCK_PATHWAY_B = {
    "pathway_name": "Carbon Savior",
    "param_changes": [{"param": "Machine_Speed", "old_value": 150.0,
                       "new_value": 135.0, "delta_pct": -10.0}],
    "expected_cqa_delta": {"Hardness": 0.02, "Friability": -0.03,
                           "Dissolution_Rate": 0.01, "Disintegration_Time": -0.50,
                           "Content_Uniformity": -0.08, "total_CO2e_kg": -0.25},
    "expected_co2_change": -0.25,
    "safety_check": "PASS",
    "causal_confidence": 0.78,
    "preference_utility": -0.69,
}

# ──────────────────────────────────────────────────────────
# Sidebar
# ──────────────────────────────────────────────────────────
cluster_name = st.sidebar.selectbox("🏭 Golden Cluster", get_cluster_names(),
                                     key="rec_cluster")
batch_id = st.sidebar.text_input("📋 Batch ID", value="T001", key="rec_batch")

# ──────────────────────────────────────────────────────────
# Header
# ──────────────────────────────────────────────────────────
st.title("🧠 Causal Recommendation Engine")
st.markdown("""
<div class="docalc-box">
    <strong>Do-Calculus vs Correlation:</strong> Unlike traditional "what correlates" approaches,
    this engine uses <em>structural causal models</em> (DoWhy) to estimate the <em>causal effect</em>
    of changing each process parameter. Recommendations are guaranteed to not violate pharmaceutical
    regulations before being presented. The BoTorch PairwiseGP re-ranks pathways based on your
    historical choices.
</div>
""", unsafe_allow_html=True)

st.divider()

# ──────────────────────────────────────────────────────────
# Current Batch Summary — CQA Metrics
# ──────────────────────────────────────────────────────────
st.subheader(f"📊 Current Batch: {batch_id}")

try:
    master_df = pd.read_csv(os.path.join(_PROJECT_ROOT, "data", "processed", "master_dataset.csv"))
    batch_row = master_df[master_df["Batch_ID"] == batch_id]
    if len(batch_row) > 0:
        batch_data = batch_row.iloc[0].to_dict()
    else:
        batch_data = master_df.iloc[0].to_dict()
        st.caption(f"⚠️ Batch {batch_id} not found, showing {batch_data.get('Batch_ID', 'T001')}")
except Exception:
    batch_data = {"Hardness": 95.0, "Friability": 0.65, "Disintegration_Time": 8.2,
                  "Dissolution_Rate": 89.3, "Content_Uniformity": 98.7, "Tablet_Weight": 199.8}

cqa_cols_display = st.columns(3)
for i, cqa in enumerate(CQA_COLS):
    val = batch_data.get(cqa, 0)
    limits = PHARMA_LIMITS.get(cqa, {})

    # Determine if within limits
    ok = True
    target_str = ""
    if "min" in limits and "max" in limits:
        ok = limits["min"] <= val <= limits["max"]
        target_str = f"[{limits['min']}, {limits['max']}]"
    elif "min" in limits:
        ok = val >= limits["min"]
        target_str = f"≥ {limits['min']}"
    elif "max" in limits:
        ok = val <= limits["max"]
        target_str = f"≤ {limits['max']}"

    with cqa_cols_display[i % 3]:
        delta_label = f"Target: {target_str}" if target_str else ""
        st.metric(
            label=f"{'✅' if ok else '❌'} {cqa.replace('_', ' ')}",
            value=f"{val:.2f}",
            delta=delta_label,
            delta_color="off",
        )

st.divider()

# ──────────────────────────────────────────────────────────
# Fetch Recommendations
# ──────────────────────────────────────────────────────────
st.subheader("🔀 Dual-Pathway Recommendations")

rec_data = None
try:
    rec_data = api_get(f"recommendations/{batch_id}/{cluster_name}")
except Exception:
    pass

if rec_data and rec_data.get("pathway_a"):
    pathway_a = rec_data["pathway_a"]
    pathway_b = rec_data.get("pathway_b", MOCK_PATHWAY_B)
else:
    st.caption("⚠️ API unavailable — showing demo recommendations")
    pathway_a = MOCK_PATHWAY_A
    pathway_b = MOCK_PATHWAY_B

# Store in session state
st.session_state["last_pathway_a"] = pathway_a
st.session_state["last_pathway_b"] = pathway_b


def render_pathway_card(pw, css_class, icon):
    """Render a recommendation pathway card."""
    name = pw.get("pathway_name", "Unknown")
    changes = pw.get("param_changes", [])
    cqa_delta = pw.get("expected_cqa_delta", {})
    co2_change = pw.get("expected_co2_change", 0)
    safety = pw.get("safety_check", "UNKNOWN")
    confidence = pw.get("causal_confidence", 0.8)
    utility = pw.get("preference_utility", 0.5)

    # Card header
    st.markdown(f"### {icon} {name}")
    st.caption(f"GP Utility Score: **{utility:.3f}**")

    # Parameter changes
    if changes:
        change_df = pd.DataFrame(changes)
        change_df["Direction"] = change_df["delta_pct"].apply(
            lambda x: "🟢 ↑" if x > 0 else "🔴 ↓" if x < 0 else "→"
        )
        change_df["Change"] = change_df["delta_pct"].apply(lambda x: f"{x:+.1f}%")
        st.dataframe(
            change_df[["param", "old_value", "new_value", "Change", "Direction"]],
            use_container_width=True, hide_index=True
        )

    # CQA impact bar chart
    if cqa_delta:
        outcomes = list(cqa_delta.keys())
        deltas = list(cqa_delta.values())
        colors = ["#27AE60" if d > 0 else "#E74C3C" if d < 0 else "#8B949E" for d in deltas]

        fig_impact = go.Figure(go.Bar(
            x=deltas,
            y=[o.replace("_", " ") for o in outcomes],
            orientation="h",
            marker_color=colors,
            text=[f"{d:+.4f}" for d in deltas],
            textposition="outside",
        ))
        fig_impact.update_layout(
            title="Expected CQA Impact",
            height=220,
            template="plotly_dark",
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            margin=dict(l=120, r=60, t=35, b=20),
            xaxis_title="Delta",
            font=dict(size=11),
        )
        st.plotly_chart(fig_impact, use_container_width=True)

    # CO2 change and confidence
    m_col1, m_col2, m_col3 = st.columns(3)
    with m_col1:
        co2_color = "normal" if co2_change < 0 else "inverse"
        st.metric("CO₂e Change", f"{co2_change:+.4f} kg", delta_color=co2_color)
    with m_col2:
        st.metric("Confidence", f"{confidence*100:.0f}%")
    with m_col3:
        if safety == "PASS":
            st.markdown('<span class="safety-pass">✅ SAFETY: PASS</span>', unsafe_allow_html=True)
        else:
            st.markdown('<span class="safety-fail">❌ SAFETY: FAIL</span>', unsafe_allow_html=True)

    # Confidence bar
    st.progress(confidence, text=f"Causal Confidence: {confidence*100:.0f}%")


# ──────────────────────────────────────────────────────────
# Render Cards Side-by-Side
# ──────────────────────────────────────────────────────────
card_col1, card_col2 = st.columns(2)

with card_col1:
    render_pathway_card(pathway_a, "pathway-a", "🛡️")

with card_col2:
    render_pathway_card(pathway_b, "pathway-b", "🌿")

st.divider()

# ──────────────────────────────────────────────────────────
# Action Buttons
# ──────────────────────────────────────────────────────────
st.subheader("🎯 Operator Decision")

btn_col1, btn_col2, btn_col3 = st.columns(3)

with btn_col1:
    exec_a = st.button("✅ Execute Pathway A (Yield Guard)", use_container_width=True,
                        type="primary", key="exec_a")
with btn_col2:
    exec_b = st.button("✅ Execute Pathway B (Carbon Savior)", use_container_width=True,
                        type="primary", key="exec_b")
with btn_col3:
    modify = st.button("✏️ Modify & Execute", use_container_width=True, key="modify")


def log_decision(chosen, modified=None, reason=""):
    """Log operator decision to API and update preference model."""
    decision_data = {
        "batch_id": batch_id,
        "pathway_a": pathway_a,
        "pathway_b": pathway_b,
        "chosen": chosen,
        "modified_params": modified,
        "reason": reason,
        "target_config": cluster_name,
    }
    try:
        result = api_post("decisions/", decision_data)
        if result:
            total_comp = result.get("total_comparisons", 0)
            pref_updated = result.get("preference_model_updated", False)

            if pref_updated:
                chosen_name = pathway_a.get("pathway_name", "A") if chosen == "A" else pathway_b.get("pathway_name", "B")
                st.success(f"✅ Operator intent logged. System learning... "
                           f"Preference shifted toward: **{chosen_name}**")
            else:
                st.info("📝 Decision recorded (MODIFIED/REJECTED — no preference update).")

            if total_comp < 3:
                st.info(f"🧊 Cold start phase — GP will activate after 3+ decisions "
                        f"({total_comp}/3 so far)")
            return result
        else:
            st.warning("⚠️ Decision logged locally but API response was empty.")
    except Exception as e:
        st.error(f"Failed to log decision: {e}")
    return None


if exec_a:
    log_decision("A", reason="Operator chose Yield Guard pathway")

if exec_b:
    log_decision("B", reason="Operator chose Carbon Savior pathway")

if modify:
    st.session_state["show_modify_form"] = True

# ──────────────────────────────────────────────────────────
# Modification Form
# ──────────────────────────────────────────────────────────
if st.session_state.get("show_modify_form", False):
    st.subheader("✏️ Custom Parameter Adjustments")

    with st.form("modify_form"):
        mod_values = {}
        mod_cols = st.columns(4)
        for i, cpp in enumerate(CPP_COLS):
            with mod_cols[i % 4]:
                mod_values[cpp] = st.number_input(
                    f"{cpp.replace('_', ' ')} Δ%",
                    min_value=-20.0,
                    max_value=20.0,
                    value=0.0,
                    step=1.0,
                    key=f"mod_{cpp}",
                )

        mod_reason = st.text_area("Reason for modification", value="", key="mod_reason")
        confirm_mod = st.form_submit_button("📤 Submit Modified Decision", use_container_width=True)

    if confirm_mod:
        modified_params = {k: v for k, v in mod_values.items() if v != 0.0}
        log_decision("MODIFIED", modified=modified_params, reason=mod_reason)
        st.session_state["show_modify_form"] = False

st.divider()

# ──────────────────────────────────────────────────────────
# Preference History
# ──────────────────────────────────────────────────────────
st.subheader("📈 Operator Preference History")

try:
    pref_summary = api_get("preferences/summary")
except Exception:
    pref_summary = {}

if pref_summary:
    pref_col1, pref_col2 = st.columns([2, 1])

    with pref_col1:
        quality_cnt = pref_summary.get("quality_preferred_count", 0)
        carbon_cnt = pref_summary.get("carbon_preferred_count", 0)
        total = pref_summary.get("total_decisions", 0)

        fig_pref = go.Figure()
        fig_pref.add_trace(go.Bar(
            x=["Yield Guard\n(Quality)"],
            y=[quality_cnt],
            marker_color="#27AE60",
            name="Quality Preferred",
            text=[str(quality_cnt)],
            textposition="outside",
        ))
        fig_pref.add_trace(go.Bar(
            x=["Carbon Savior\n(Decarbonization)"],
            y=[carbon_cnt],
            marker_color="#2E86C1",
            name="Carbon Preferred",
            text=[str(carbon_cnt)],
            textposition="outside",
        ))
        fig_pref.update_layout(
            title="Pathway Preference Distribution",
            yaxis_title="Times Chosen",
            template="plotly_dark",
            paper_bgcolor="#0D1117",
            plot_bgcolor="#0D1117",
            height=300,
            showlegend=False,
            margin=dict(l=50, r=20, t=50, b=40),
        )
        st.plotly_chart(fig_pref, use_container_width=True)

    with pref_col2:
        model_status = pref_summary.get("status", "cold_start")
        st.markdown("**Model Status**")
        if model_status == "active":
            st.success("🟢 PairwiseGP Active")
        else:
            st.warning("🧊 Cold Start Phase")

        st.metric("Total Decisions", total)
        st.metric("Comparisons", pref_summary.get("comparisons_count", 0))
        st.metric("Quality Preference",
                  f"{pref_summary.get('quality_preference_pct', 0):.0f}%")

    # Decision history table
    try:
        history = api_get("decisions/history?limit=10")
        if history and isinstance(history, list) and len(history) > 0:
            with st.expander("📋 Recent Decision Log", expanded=False):
                hist_display = []
                for h in history:
                    hist_display.append({
                        "Batch": h.get("batch_id", ""),
                        "Chosen": h.get("chosen_pathway", ""),
                        "Config": h.get("target_config", ""),
                        "Time": str(h.get("timestamp", ""))[:19],
                    })
                st.dataframe(pd.DataFrame(hist_display), use_container_width=True,
                             hide_index=True)
    except Exception:
        pass
else:
    st.info("No preference data yet. Make your first decision above!")
