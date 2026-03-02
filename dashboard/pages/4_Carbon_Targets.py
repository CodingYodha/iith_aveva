"""
CB-MOPA Dashboard — Page 4: Carbon & Sustainability Targets.
Real-time CO2e tracking, phase attribution, adaptive targets,
shift emission factors, and regulatory compliance.
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

from constraints import CQA_COLS, PHARMA_LIMITS, CARBON_CONFIG
from dashboard.utils import api_get, get_cluster_names, CLUSTER_COLORS

st.set_page_config(page_title="CB-MOPA — Carbon Targets", layout="wide")

# ──────────────────────────────────────────────────────────
# CSS
# ──────────────────────────────────────────────────────────
st.markdown("""
<style>
    .carbon-kpi {
        background: #152744; border-radius: 10px; padding: 16px;
        text-align: center; border: 1px solid #1f4068;
    }
    .carbon-kpi h2 { color: #2E86C1; margin: 0 0 4px 0; }
    .carbon-kpi p { color: #8B949E; margin: 0; font-size: 13px; }
    .shift-card {
        background: #152744; border-radius: 8px; padding: 12px;
        border: 1px solid #1f4068; text-align: center;
    }
</style>
""", unsafe_allow_html=True)

# ──────────────────────────────────────────────────────────
# Data Loading
# ──────────────────────────────────────────────────────────
@st.cache_data
def load_master():
    return pd.read_csv(os.path.join(_PROJECT_ROOT, "data", "processed", "master_dataset.csv"))

@st.cache_data
def load_batch_trajectory(batch_id):
    path = os.path.join(_PROJECT_ROOT, "data", "processed", "batch_trajectories", f"{batch_id}.csv")
    if os.path.exists(path):
        return pd.read_csv(path)
    return None

try:
    master_df = load_master()
except Exception:
    master_df = pd.DataFrame()

# Sidebar
cluster_name = st.sidebar.selectbox("Golden Cluster", get_cluster_names(), key="carbon_cluster")
batch_id = st.sidebar.text_input("Batch ID", value="T001", key="carbon_batch")
emission_factor = st.sidebar.slider("Emission Factor (kg CO₂/kWh)", 0.3, 1.2, 0.72, 0.01,
                                     key="carbon_ef")

# ──────────────────────────────────────────────────────────
# Header
# ──────────────────────────────────────────────────────────
st.title("Carbon & Sustainability Targets")
st.caption("Real-time CO₂e tracking • Phase attribution • Adaptive target setting")
st.divider()

# ──────────────────────────────────────────────────────────
# Compute values
# ──────────────────────────────────────────────────────────
regulatory_limit = CARBON_CONFIG["regulatory_limit_kg"]

# Get carbon targets from API or fallback
try:
    carbon_data = api_get("carbon/targets")
    target_co2e = carbon_data.get("current_target_kg", regulatory_limit)
    rolling_avg = carbon_data.get("rolling_avg_20", 0)
    recent_values = carbon_data.get("recent_co2e_values", [])
except Exception:
    target_co2e = regulatory_limit
    rolling_avg = 0
    recent_values = []

# Current batch CO2e
if "total_CO2e_kg" in master_df.columns:
    batch_row = master_df[master_df["Batch_ID"] == batch_id]
    if len(batch_row) > 0:
        current_co2e = float(batch_row.iloc[0]["total_CO2e_kg"])
    else:
        current_co2e = float(master_df["total_CO2e_kg"].iloc[-1])
    prev_co2e = float(master_df["total_CO2e_kg"].iloc[-2]) if len(master_df) > 1 else current_co2e
    all_co2e = master_df["total_CO2e_kg"].tolist()
else:
    current_co2e = 45.0
    prev_co2e = 48.0
    all_co2e = [45.0]

# 5-batch rolling avg
last_5 = all_co2e[-5:] if len(all_co2e) >= 5 else all_co2e
rolling_5 = np.mean(last_5)
prev_5 = np.mean(all_co2e[-6:-1]) if len(all_co2e) >= 6 else rolling_5

pct_of_target = (current_co2e / regulatory_limit * 100) if regulatory_limit > 0 else 0

# ──────────────────────────────────────────────────────────
# Top KPI Row
# ──────────────────────────────────────────────────────────
kpi1, kpi2, kpi3 = st.columns(3)

with kpi1:
    delta_batch = current_co2e - prev_co2e
    st.metric(
        "Current Batch CO₂e",
        f"{current_co2e:.2f} kg",
        delta=f"{delta_batch:+.2f} kg vs prev",
        delta_color="inverse",
    )

with kpi2:
    delta_roll = rolling_5 - prev_5
    arrow = "📉" if delta_roll < 0 else "📈"
    st.metric(
        f"5-Batch Rolling Average",
        f"{rolling_5:.2f} kg",
        delta=f"{delta_roll:+.2f} kg {arrow}",
        delta_color="inverse",
    )

with kpi3:
    status_color = "normal" if pct_of_target <= 100 else "inverse"
    st.metric(
        "% vs Regulatory Target",
        f"{pct_of_target:.1f}%",
        delta=f"Target: {regulatory_limit} kg",
        delta_color="off",
    )

st.divider()

# ──────────────────────────────────────────────────────────
# Carbon Gauge
# ──────────────────────────────────────────────────────────
gauge_col, trend_col = st.columns([1, 2])

with gauge_col:
    st.subheader("CO₂e Gauge")

    fig_gauge = go.Figure(go.Indicator(
        mode="gauge+number+delta",
        value=current_co2e,
        delta={"reference": target_co2e, "increasing": {"color": "#E74C3C"},
               "decreasing": {"color": "#27AE60"}},
        gauge={
            "axis": {"range": [0, regulatory_limit * 1.5], "tickcolor": "#8B949E"},
            "bar": {"color": "#2E86C1"},
            "bgcolor": "#152744",
            "steps": [
                {"range": [0, target_co2e * 0.9], "color": "#1a3d1a"},
                {"range": [target_co2e * 0.9, target_co2e], "color": "#3d3a1a"},
                {"range": [target_co2e, regulatory_limit * 1.5], "color": "#3d1a1a"},
            ],
            "threshold": {
                "line": {"color": "#E74C3C", "width": 4},
                "value": regulatory_limit,
            },
        },
        title={"text": "Batch CO₂e (kg)", "font": {"color": "#FFFFFF"}},
        number={"font": {"color": "#FFFFFF"}},
    ))
    fig_gauge.update_layout(
        paper_bgcolor="#0D1117",
        height=300,
        margin=dict(l=30, r=30, t=60, b=20),
        font={"color": "#FFFFFF"},
    )
    st.plotly_chart(fig_gauge, use_container_width=True, key="co2_gauge")

# ──────────────────────────────────────────────────────────
# Rolling Trend Chart
# ──────────────────────────────────────────────────────────
with trend_col:
    st.subheader("CO₂e Trend — Last 20 Batches")

    if recent_values or len(all_co2e) > 0:
        trend_data = recent_values if recent_values else all_co2e[-20:]
        x_labels = [f"B{i+1}" for i in range(len(trend_data))]

        fig_trend = go.Figure()

        # Shaded danger zone (target → reg limit)
        fig_trend.add_hrect(
            y0=target_co2e, y1=regulatory_limit * 1.3,
            fillcolor="rgba(231,76,60,0.1)", line_width=0,
        )

        # CO2e line
        fig_trend.add_trace(go.Scatter(
            x=x_labels, y=trend_data,
            mode="lines+markers",
            line=dict(color="#2E86C1", width=2.5),
            marker=dict(size=6, color="#2E86C1"),
            name="CO₂e per batch",
            fill="tozeroy",
            fillcolor="rgba(46,134,193,0.1)",
        ))

        # Target line
        fig_trend.add_hline(
            y=target_co2e, line_dash="dash", line_color="#F39C12", line_width=2,
            annotation_text=f"Target: {target_co2e} kg",
            annotation_position="top right",
            annotation_font_color="#F39C12",
        )

        # Regulatory limit
        fig_trend.add_hline(
            y=regulatory_limit, line_dash="dash", line_color="#E74C3C", line_width=2,
            annotation_text=f"Reg. Limit: {regulatory_limit} kg",
            annotation_position="bottom right",
            annotation_font_color="#E74C3C",
        )

        fig_trend.update_layout(
            template="plotly_dark",
            paper_bgcolor="#0D1117",
            plot_bgcolor="#0D1117",
            height=300,
            margin=dict(l=50, r=20, t=30, b=40),
            xaxis_title="Batch",
            yaxis_title="CO₂e (kg)",
            showlegend=False,
        )
        st.plotly_chart(fig_trend, use_container_width=True, key="co2_trend")
    else:
        st.info("No trend data available.")

st.divider()

# ──────────────────────────────────────────────────────────
# Phase Attribution Donut Chart
# ──────────────────────────────────────────────────────────
st.subheader("Phase CO₂e Attribution")

donut_col, detail_col = st.columns([2, 1])

with donut_col:
    try:
        traj_df = load_batch_trajectory(batch_id)

        if traj_df is not None and "Energy_kWh" in traj_df.columns:
            phase_energy = traj_df.groupby("Phase")["Energy_kWh"].sum()
            phase_co2e = phase_energy * emission_factor
            total_phase_co2e = phase_co2e.sum()

            fig_donut = go.Figure(go.Pie(
                labels=phase_co2e.index.tolist(),
                values=phase_co2e.values.tolist(),
                hole=0.5,
                marker=dict(colors=[
                    "#2E86C1", "#27AE60", "#E67E22", "#9B59B6",
                    "#E74C3C", "#1ABC9C", "#F39C12", "#3498DB",
                ]),
                textinfo="label+percent",
                hovertemplate="<b>%{label}</b><br>CO₂e: %{value:.2f} kg<br>Share: %{percent}<extra></extra>",
            ))
            fig_donut.update_layout(
                template="plotly_dark",
                paper_bgcolor="#0D1117",
                height=350,
                margin=dict(l=20, r=20, t=30, b=20),
                annotations=[dict(
                    text=f"<b>{total_phase_co2e:.1f}<br>kg CO₂e</b>",
                    x=0.5, y=0.5, font_size=16, font_color="#FFFFFF",
                    showarrow=False,
                )],
                showlegend=True,
                legend=dict(orientation="h", y=-0.1, font=dict(size=11)),
            )
            st.plotly_chart(fig_donut, use_container_width=True, key="phase_donut")
        else:
            st.info(f"No trajectory data for batch {batch_id}.")
    except Exception as e:
        st.error(f"Phase attribution error: {e}")

with detail_col:
    try:
        if traj_df is not None and "Energy_kWh" in traj_df.columns:
            phase_energy = traj_df.groupby("Phase")["Energy_kWh"].sum()
            phase_co2e = phase_energy * emission_factor
            total_phase_co2e = phase_co2e.sum()

            detail_df = pd.DataFrame({
                "Phase": phase_co2e.index,
                "Energy (kWh)": [f"{v:.2f}" for v in phase_energy.values],
                "CO₂e (kg)": [f"{v:.2f}" for v in phase_co2e.values],
                "Share %": [f"{v/total_phase_co2e*100:.1f}" for v in phase_co2e.values],
            })
            detail_df = detail_df.sort_values("CO₂e (kg)", ascending=False)
            st.dataframe(detail_df, use_container_width=True, hide_index=True)

            dominant = detail_df.iloc[0]["Phase"]
            dominant_pct = detail_df.iloc[0]["Share %"]
            st.info(f"🏭 Dominant phase: **{dominant}** ({dominant_pct}% of total)")
    except Exception:
        pass

st.divider()

# ──────────────────────────────────────────────────────────
# Dynamic Target Adjustment
# ──────────────────────────────────────────────────────────
st.subheader("Dynamic Target Adjustment")

adj_col1, adj_col2 = st.columns([2, 1])

with adj_col1:
    reduction_pct = st.slider(
        "Target Reduction %", 0, 30, 10, 1, key="target_reduction"
    )
    adjusted_target = regulatory_limit * (1 - reduction_pct / 100)
    max_energy = adjusted_target / emission_factor

    st.info(f"At **{reduction_pct}%** reduction target, batches must stay under "
            f"**{adjusted_target:.1f} kg CO₂e** "
            f"(max energy: **{max_energy:.1f} kWh** at EF={emission_factor})")

    # Impact visualization
    fig_target = go.Figure()
    fig_target.add_trace(go.Bar(
        x=["Baseline", "Current Target", "Adjusted Target"],
        y=[regulatory_limit, target_co2e, adjusted_target],
        marker_color=["#E74C3C", "#F39C12", "#27AE60"],
        text=[f"{regulatory_limit:.1f}", f"{target_co2e:.1f}", f"{adjusted_target:.1f}"],
        textposition="outside",
    ))
    fig_target.update_layout(
        template="plotly_dark",
        paper_bgcolor="#0D1117",
        plot_bgcolor="#0D1117",
        height=250,
        yaxis_title="CO₂e (kg)",
        margin=dict(l=50, r=20, t=20, b=40),
    )
    st.plotly_chart(fig_target, use_container_width=True, key="target_bar")

with adj_col2:
    st.markdown("**Impact Summary**")
    st.metric("Regulatory Limit", f"{regulatory_limit:.1f} kg")
    st.metric("Current Target", f"{target_co2e:.1f} kg")
    st.metric("Adjusted Target", f"{adjusted_target:.1f} kg",
              delta=f"-{reduction_pct}%", delta_color="inverse")
    st.metric("Max Energy Allowed", f"{max_energy:.1f} kWh")

st.divider()

# ──────────────────────────────────────────────────────────
# Shift Emission Factors
# ──────────────────────────────────────────────────────────
st.subheader("Shift Emission Factors")

shift_data = {
    "Shift": ["☀️ Morning (6-14)", "🌆 Evening (14-22)", "🌙 Night (22-6)"],
    "Factor (kg CO₂/kWh)": [0.72, 0.65, 0.45],
    "Source Mix": ["Grid dominant", "Partial renewable", "Renewable heavy"],
    "CO₂e at 80 kWh": [57.6, 52.0, 36.0],
}
shift_df = pd.DataFrame(shift_data)

shift_col1, shift_col2 = st.columns([1, 1])

with shift_col1:
    st.dataframe(shift_df, use_container_width=True, hide_index=True)
    st.caption(f"Current factor: **{emission_factor}** kg CO₂/kWh")

with shift_col2:
    fig_shift = go.Figure(go.Bar(
        x=["Morning", "Evening", "Night"],
        y=[0.72, 0.65, 0.45],
        marker_color=["#E67E22", "#2E86C1", "#27AE60"],
        text=["0.72", "0.65", "0.45"],
        textposition="outside",
    ))
    fig_shift.update_layout(
        title="Emission Factor by Shift",
        yaxis_title="kg CO₂/kWh",
        template="plotly_dark",
        paper_bgcolor="#0D1117",
        plot_bgcolor="#0D1117",
        height=250,
        margin=dict(l=50, r=20, t=40, b=40),
    )
    st.plotly_chart(fig_shift, use_container_width=True, key="shift_bar")

st.divider()

# ──────────────────────────────────────────────────────────
# Regulatory Compliance Table
# ──────────────────────────────────────────────────────────
st.subheader("Regulatory Compliance Status")

try:
    batch_row = master_df[master_df["Batch_ID"] == batch_id]
    if len(batch_row) == 0:
        batch_row = master_df.iloc[[-1]]

    batch_vals = batch_row.iloc[0]

    compliance_data = []
    for cqa in CQA_COLS:
        val = float(batch_vals.get(cqa, 0))
        limits = PHARMA_LIMITS.get(cqa, {})

        ok = True
        limit_str = ""
        if "min" in limits and "max" in limits:
            ok = limits["min"] <= val <= limits["max"]
            limit_str = f"[{limits['min']}, {limits['max']}]"
        elif "min" in limits:
            ok = val >= limits["min"]
            limit_str = f"≥ {limits['min']}"
        elif "max" in limits:
            ok = val <= limits["max"]
            limit_str = f"≤ {limits['max']}"

        compliance_data.append({
            "CQA": cqa.replace("_", " "),
            "Current Value": f"{val:.2f}",
            "Regulatory Limit": limit_str,
            "Status": "✅ PASS" if ok else "❌ FAIL",
            "RAG": "🟢" if ok else "🔴",
        })

    # Add carbon compliance
    compliance_data.append({
        "CQA": "Total CO₂e",
        "Current Value": f"{current_co2e:.2f} kg",
        "Regulatory Limit": f"≤ {regulatory_limit} kg",
        "Status": "✅ PASS" if current_co2e <= regulatory_limit else "❌ FAIL",
        "RAG": "🟢" if current_co2e <= regulatory_limit else "🔴",
    })

    comp_df = pd.DataFrame(compliance_data)
    st.dataframe(comp_df, use_container_width=True, hide_index=True)

    # Summary
    passes = sum(1 for d in compliance_data if "PASS" in d["Status"])
    total = len(compliance_data)
    if passes == total:
        st.success(f"✅ Full compliance: {passes}/{total} parameters within limits")
    else:
        fails = total - passes
        st.error(f"⚠️ {fails} parameter(s) out of compliance — corrective action needed")
except Exception as e:
    st.error(f"Compliance table error: {e}")
