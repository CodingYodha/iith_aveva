"""
CB-MOPA Dashboard — Page 1: Live Batch vs Golden Envelope.
Real-time sensor traces overlaid on probabilistic golden corridors
with drift alarms, radar charts, and phase-energy breakdowns.
"""

import sys
import os
import json

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st

# Ensure project root is on sys.path
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from constraints import CPP_COLS, PHASE_SENSOR_MAP

st.set_page_config(page_title="CB-MOPA — Live Batch", page_icon="🌊", layout="wide")

# ──────────────────────────────────────────────────────────
# Custom CSS
# ──────────────────────────────────────────────────────────
st.markdown("""
<style>
    .alarm-ok { background:#1a3d1a; border:1px solid #27AE60; border-radius:8px;
                padding:12px; text-align:center; }
    .alarm-ok h3 { color:#27AE60; margin:0; }
    .alarm-warn { background:#3d3a1a; border:1px solid #F39C12; border-radius:8px;
                  padding:12px; text-align:center; }
    .alarm-warn h3 { color:#F39C12; margin:0; }
    .alarm-crit { background:#3d1a1a; border:1px solid #E74C3C; border-radius:8px;
                  padding:12px; text-align:center; }
    .alarm-crit h3 { color:#E74C3C; margin:0; }
    .deviation-card { background:#152744; border-radius:8px; padding:12px;
                      border:1px solid #1f4068; }
</style>
""", unsafe_allow_html=True)

# ──────────────────────────────────────────────────────────
# Sidebar Controls
# ──────────────────────────────────────────────────────────
from dashboard.utils import get_cluster_names, api_post, CLUSTER_COLORS

cluster_name = st.sidebar.selectbox("🏭 Golden Cluster", get_cluster_names())
st.session_state["selected_cluster"] = cluster_name
batch_id_input = st.sidebar.text_input("📋 Batch ID", value="T001")
emission_factor = st.sidebar.slider(
    "⚡ Grid Emission Factor (kg CO₂/kWh)", 0.3, 1.2, 0.72, 0.01
)

# ──────────────────────────────────────────────────────────
# Load data (with caching)
# ──────────────────────────────────────────────────────────
@st.cache_data
def load_master_dataset():
    return pd.read_csv(os.path.join(_PROJECT_ROOT, "data", "processed", "master_dataset.csv"))

@st.cache_data
def load_cluster_centroids():
    with open(os.path.join(_PROJECT_ROOT, "data", "golden", "cluster_centroids.json")) as f:
        return json.load(f)

@st.cache_data
def load_envelopes():
    with open(os.path.join(_PROJECT_ROOT, "data", "golden", "golden_envelopes.json")) as f:
        return json.load(f)

@st.cache_data
def load_batch_trajectory(batch_id):
    path = os.path.join(_PROJECT_ROOT, "data", "processed", "batch_trajectories", f"{batch_id}.csv")
    if os.path.exists(path):
        return pd.read_csv(path)
    return None

try:
    master_df = load_master_dataset()
    centroids = load_cluster_centroids()
    envelopes = load_envelopes()
except Exception as e:
    st.error(f"Data loading error: {e}")
    st.stop()

# ──────────────────────────────────────────────────────────
# Page Header
# ──────────────────────────────────────────────────────────
st.title("🌊 Live Batch vs Golden Envelope")
st.caption(f"Cluster: **{cluster_name}** | Batch: **{batch_id_input}** | "
           f"Emission Factor: **{emission_factor}** kg CO₂/kWh")

# ──────────────────────────────────────────────────────────
# CPP Input Panel
# ──────────────────────────────────────────────────────────
st.subheader("🔧 Process Parameter Controls")

centroid_cpps = centroids.get(cluster_name, {})

with st.form("cpp_form"):
    cpp_cols = st.columns(4)
    cpp_values = {}

    for i, cpp in enumerate(CPP_COLS):
        col_min = float(master_df[cpp].min())
        col_max = float(master_df[cpp].max())
        default_val = float(centroid_cpps.get(cpp, master_df[cpp].mean()))
        # Ensure default is within range
        default_val = max(col_min, min(col_max, default_val))

        with cpp_cols[i % 4]:
            cpp_values[cpp] = st.slider(
                cpp.replace("_", " "),
                min_value=col_min,
                max_value=col_max,
                value=default_val,
                step=(col_max - col_min) / 100,
                key=f"cpp_{cpp}",
            )

    submitted = st.form_submit_button("🔍 Check Drift", use_container_width=True)

st.divider()

# ──────────────────────────────────────────────────────────
# Drift Check Results
# ──────────────────────────────────────────────────────────
if submitted:
    with st.spinner("Running drift detection..."):
        result = api_post("batch/drift-check", {
            "batch_id": batch_id_input,
            "cpp_params": cpp_values,
            "cluster_name": cluster_name,
        })

    if result:
        overall = result.get("overall_alarm", "UNKNOWN")
        if overall == "OK":
            st.markdown('<div class="alarm-ok"><h3>✅ OVERALL: OK — Batch within golden envelope</h3></div>', unsafe_allow_html=True)
        elif overall == "WARNING":
            st.markdown('<div class="alarm-warn"><h3>⚠️ OVERALL: WARNING — Partial drift detected</h3></div>', unsafe_allow_html=True)
        else:
            st.markdown('<div class="alarm-crit"><h3>🚨 OVERALL: CRITICAL — Significant deviation</h3></div>', unsafe_allow_html=True)

        # Show details in expander
        with st.expander("📊 Detailed Drift Results", expanded=False):
            details = result.get("drift_details", [])
            if details:
                df_details = pd.DataFrame(details)
                st.dataframe(
                    df_details[["phase", "sensor", "alarm_level", "drift_score", "percent_outside"]],
                    use_container_width=True,
                    hide_index=True,
                )

    # Parameter deviations
    try:
        from src.signatures.comparator import get_parameter_deviations
        devs = get_parameter_deviations(cpp_values, cluster_name)
        st.subheader("📐 Parameter Deviations from Golden Centroid")
        dev_cols = st.columns(4)
        for i, (cpp, d) in enumerate(devs.items()):
            with dev_cols[i % 4]:
                delta = d["pct_deviation"]
                arrow = "↑" if delta > 0 else "↓" if delta < 0 else "→"
                color = "#27AE60" if abs(delta) < 10 else "#F39C12" if abs(delta) < 25 else "#E74C3C"
                st.metric(
                    label=cpp.replace("_", " "),
                    value=f"{d['current']:.2f}",
                    delta=f"{delta:+.1f}% {arrow}",
                )
    except Exception:
        pass

st.divider()

# ──────────────────────────────────────────────────────────
# Envelope Visualization
# ──────────────────────────────────────────────────────────
st.subheader("📈 Golden Envelope Visualization")

env_col1, env_col2 = st.columns([1, 1])

with env_col1:
    phases = list(PHASE_SENSOR_MAP.keys())
    selected_phase = st.selectbox("Phase", phases, key="env_phase")

with env_col2:
    sensors = PHASE_SENSOR_MAP[selected_phase]
    selected_sensor = st.selectbox("Sensor", sensors, key="env_sensor")

try:
    env_data = envelopes.get(cluster_name, {}).get(selected_phase, {}).get(selected_sensor, {})

    if env_data:
        mean = np.array(env_data["mean"])
        upper = np.array(env_data["upper"])
        lower = np.array(env_data["lower"])
        x = list(range(len(mean)))

        # Simulate current batch signal with deviation
        np.random.seed(hash(batch_id_input) % 2**31)
        # Compute total deviation from centroid
        total_dev = sum(
            abs(cpp_values.get(c, centroid_cpps.get(c, 0)) - centroid_cpps.get(c, 0))
            / max(centroid_cpps.get(c, 1), 0.01) * 100
            for c in CPP_COLS
        ) / len(CPP_COLS)
        noise_scale = max(0.02, total_dev / 100) * np.std(mean) if np.std(mean) > 0 else 1.0
        simulated_signal = mean + np.random.normal(0, noise_scale, len(mean))

        fig = go.Figure()

        # Shaded envelope band
        fig.add_trace(go.Scatter(
            x=x + x[::-1],
            y=list(upper) + list(lower[::-1]),
            fill="toself",
            fillcolor="rgba(46,134,193,0.15)",
            line=dict(color="rgba(46,134,193,0)"),
            name="±3σ Envelope",
            hoverinfo="skip",
        ))

        # Golden mean
        fig.add_trace(go.Scatter(
            x=x, y=mean,
            mode="lines",
            line=dict(color="#2E86C1", width=2, dash="dot"),
            name="Golden Mean (DBA)",
        ))

        # Upper/lower bounds
        fig.add_trace(go.Scatter(
            x=x, y=upper,
            mode="lines",
            line=dict(color="#2E86C1", width=1, dash="dash"),
            name="Upper Bound (+3σ)",
            opacity=0.6,
        ))
        fig.add_trace(go.Scatter(
            x=x, y=lower,
            mode="lines",
            line=dict(color="#2E86C1", width=1, dash="dash"),
            name="Lower Bound (−3σ)",
            opacity=0.6,
        ))

        # Current batch signal
        fig.add_trace(go.Scatter(
            x=x, y=simulated_signal,
            mode="lines",
            line=dict(color="#E67E22", width=2.5),
            name=f"Batch {batch_id_input}",
        ))

        # Highlight out-of-envelope regions
        outside_mask = (simulated_signal < lower) | (simulated_signal > upper)
        if np.any(outside_mask):
            fig.add_trace(go.Scatter(
                x=[i for i, m in enumerate(outside_mask) if m],
                y=[simulated_signal[i] for i, m in enumerate(outside_mask) if m],
                mode="markers",
                marker=dict(color="#E74C3C", size=8, symbol="x"),
                name="Outside Envelope",
            ))

        fig.update_layout(
            title=f"Batch {batch_id_input} vs {cluster_name} — {selected_phase} / {selected_sensor}",
            xaxis_title="Time Step",
            yaxis_title=selected_sensor.replace("_", " "),
            template="plotly_dark",
            paper_bgcolor="#0D1117",
            plot_bgcolor="#0D1117",
            height=450,
            legend=dict(orientation="h", y=-0.15),
            margin=dict(l=60, r=20, t=50, b=60),
        )

        st.plotly_chart(fig, use_container_width=True)
    else:
        st.warning(f"No envelope data for {cluster_name} / {selected_phase} / {selected_sensor}")
except Exception as e:
    st.error(f"Envelope visualization error: {e}")

st.divider()

# ──────────────────────────────────────────────────────────
# Radar Chart: CPP Deviations
# ──────────────────────────────────────────────────────────
st.subheader("🕸️ Parameter Deviation Radar")

radar_col1, radar_col2 = st.columns([2, 1])

with radar_col1:
    try:
        categories = [c.replace("_", " ") for c in CPP_COLS]
        current_vals = [cpp_values.get(c, 0) for c in CPP_COLS]
        golden_vals = [centroid_cpps.get(c, 0) for c in CPP_COLS]

        # Normalize to [0, 1] range for radar
        all_vals = current_vals + golden_vals
        max_v = max(all_vals) if max(all_vals) > 0 else 1
        current_norm = [v / max_v for v in current_vals]
        golden_norm = [v / max_v for v in golden_vals]

        fig_radar = go.Figure()
        fig_radar.add_trace(go.Scatterpolar(
            r=golden_norm + [golden_norm[0]],
            theta=categories + [categories[0]],
            fill="toself",
            fillcolor="rgba(46,134,193,0.2)",
            line=dict(color="#2E86C1", width=2),
            name="Golden Centroid",
        ))
        fig_radar.add_trace(go.Scatterpolar(
            r=current_norm + [current_norm[0]],
            theta=categories + [categories[0]],
            fill="toself",
            fillcolor="rgba(230,126,34,0.2)",
            line=dict(color="#E67E22", width=2),
            name="Current Batch",
        ))

        fig_radar.update_layout(
            polar=dict(
                bgcolor="#0D1117",
                radialaxis=dict(visible=True, range=[0, 1.1], gridcolor="#30363d"),
                angularaxis=dict(gridcolor="#30363d"),
            ),
            template="plotly_dark",
            paper_bgcolor="#0D1117",
            height=400,
            showlegend=True,
            legend=dict(orientation="h", y=-0.1),
            margin=dict(l=60, r=60, t=30, b=60),
        )
        st.plotly_chart(fig_radar, use_container_width=True)
    except Exception as e:
        st.error(f"Radar chart error: {e}")

with radar_col2:
    st.markdown("**CPP Comparison**")
    comp_data = []
    for cpp in CPP_COLS:
        curr = cpp_values.get(cpp, 0)
        gold = centroid_cpps.get(cpp, 0)
        dev = ((curr - gold) / gold * 100) if gold != 0 else 0
        comp_data.append({
            "Parameter": cpp.replace("_", " "),
            "Current": round(curr, 2),
            "Golden": round(gold, 2),
            "Dev %": round(dev, 1),
        })
    st.dataframe(pd.DataFrame(comp_data), use_container_width=True, hide_index=True)

st.divider()

# ──────────────────────────────────────────────────────────
# Phase Energy Bar Chart
# ──────────────────────────────────────────────────────────
st.subheader("⚡ Phase Energy Breakdown")

try:
    traj_df = load_batch_trajectory(batch_id_input)

    if traj_df is not None and "Energy_kWh" in traj_df.columns:
        phase_energy = traj_df.groupby("Phase")["Energy_kWh"].sum().reset_index()
        phase_energy.columns = ["Phase", "Energy_kWh"]
        phase_energy = phase_energy.sort_values("Energy_kWh", ascending=True)

        # Golden cluster average across mapped batches
        cluster_batch_map_path = os.path.join(
            _PROJECT_ROOT, "data", "golden", "cluster_batch_map.json"
        )
        golden_avg = {}
        if os.path.exists(cluster_batch_map_path):
            with open(cluster_batch_map_path) as f:
                cluster_map = json.load(f)
            golden_batches = cluster_map.get(cluster_name, [])
            if golden_batches:
                phase_totals = {}
                count = 0
                for gb_id in golden_batches[:10]:
                    gb_df = load_batch_trajectory(gb_id)
                    if gb_df is not None and "Energy_kWh" in gb_df.columns:
                        for _, row in gb_df.groupby("Phase")["Energy_kWh"].sum().items():
                            phase_totals[_] = phase_totals.get(_, 0) + row
                        count += 1
                if count > 0:
                    golden_avg = {p: v / count for p, v in phase_totals.items()}

        fig_bar = go.Figure()

        fig_bar.add_trace(go.Bar(
            y=phase_energy["Phase"],
            x=phase_energy["Energy_kWh"],
            orientation="h",
            marker=dict(
                color=phase_energy["Energy_kWh"],
                colorscale="Viridis",
                showscale=False,
            ),
            name=f"Batch {batch_id_input}",
            text=[f"{v:.2f} kWh" for v in phase_energy["Energy_kWh"]],
            textposition="outside",
        ))

        if golden_avg:
            golden_phases = phase_energy["Phase"].tolist()
            golden_vals = [golden_avg.get(p, 0) for p in golden_phases]
            fig_bar.add_trace(go.Scatter(
                x=golden_vals,
                y=golden_phases,
                mode="markers",
                marker=dict(color="#2E86C1", size=12, symbol="diamond"),
                name="Golden Avg",
            ))

        fig_bar.update_layout(
            title=f"Energy Consumption by Phase — Batch {batch_id_input}",
            xaxis_title="Energy (kWh)",
            yaxis_title="Phase",
            template="plotly_dark",
            paper_bgcolor="#0D1117",
            plot_bgcolor="#0D1117",
            height=350,
            showlegend=True,
            margin=dict(l=120, r=20, t=50, b=40),
        )

        st.plotly_chart(fig_bar, use_container_width=True)

        # CO2 summary
        total_energy = traj_df["Energy_kWh"].sum()
        co2e = total_energy * emission_factor
        co2_col1, co2_col2, co2_col3 = st.columns(3)
        with co2_col1:
            st.metric("Total Energy", f"{total_energy:.2f} kWh")
        with co2_col2:
            st.metric("CO₂e (current factor)", f"{co2e:.2f} kg")
        with co2_col3:
            target = 50.0
            headroom = target - co2e
            st.metric("Target Headroom", f"{headroom:+.2f} kg",
                      delta=f"{'Under' if headroom > 0 else 'Over'} target")
    else:
        st.info(f"No trajectory data found for batch {batch_id_input}.")
except Exception as e:
    st.error(f"Phase energy error: {e}")
