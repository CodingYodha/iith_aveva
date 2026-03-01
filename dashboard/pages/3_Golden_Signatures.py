"""
CB-MOPA Dashboard — Page 3: Golden Signature Explorer.
3D Pareto front, cluster cards, version history, continuous learning demo.
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

from constraints import CPP_COLS, CQA_COLS, GOLDEN_CLUSTER_NAMES
from dashboard.utils import api_get, get_cluster_names, CLUSTER_COLORS

st.set_page_config(page_title="CB-MOPA — Golden Signatures", page_icon="🏆", layout="wide")

# ──────────────────────────────────────────────────────────
# CSS
# ──────────────────────────────────────────────────────────
st.markdown("""
<style>
    .cluster-card {
        border-radius: 12px; padding: 20px; margin: 8px 0;
        background: linear-gradient(135deg, #152744, #1a3a5c);
        min-height: 250px;
    }
    .cluster-card h4 { margin-bottom: 8px; }
    .version-badge {
        background: #2E86C1; color: white; border-radius: 20px;
        padding: 4px 12px; font-size: 12px; font-weight: bold;
        display: inline-block;
    }
    .timeline-entry {
        border-left: 3px solid #2E86C1; padding: 8px 16px;
        margin: 8px 0; background: #152744; border-radius: 0 8px 8px 0;
    }
    .dominate-yes { background:#1a3d1a; border:1px solid #27AE60; border-radius:8px;
                    padding:16px; text-align:center; }
    .dominate-no { background:#1a1a2e; border:1px solid #8B949E; border-radius:8px;
                   padding:16px; text-align:center; }
</style>
""", unsafe_allow_html=True)

# ──────────────────────────────────────────────────────────
# Data Loading
# ──────────────────────────────────────────────────────────
@st.cache_data
def load_pareto_front():
    path = os.path.join(_PROJECT_ROOT, "data", "golden", "pareto_front.csv")
    if os.path.exists(path):
        return pd.read_csv(path)
    return None

@st.cache_data
def load_centroids():
    path = os.path.join(_PROJECT_ROOT, "data", "golden", "cluster_centroids.json")
    with open(path) as f:
        return json.load(f)

@st.cache_data
def load_master():
    return pd.read_csv(os.path.join(_PROJECT_ROOT, "data", "processed", "master_dataset.csv"))

# ──────────────────────────────────────────────────────────
# Header
# ──────────────────────────────────────────────────────────
st.title("🏆 Golden Signature Explorer")
st.caption("Pareto-optimal trade-off space • 3 golden clusters • Continuous learning")
st.divider()

# ──────────────────────────────────────────────────────────
# 3D Pareto Front
# ──────────────────────────────────────────────────────────
st.subheader("🎯 Multi-Objective Pareto Front — Trade-off Space")

try:
    pareto_df = load_pareto_front()

    if pareto_df is not None and len(pareto_df) > 0:
        color_map = {
            "Max Quality Golden": "#27AE60",
            "Deep Decarbonization Golden": "#2E86C1",
            "Balanced Operational Golden": "#E67E22",
        }

        fig_3d = go.Figure()

        for cname, color in color_map.items():
            mask = pareto_df["cluster_name"] == cname
            subset = pareto_df[mask]
            if len(subset) == 0:
                continue

            hover_text = []
            for _, row in subset.iterrows():
                text = (f"Cluster: {cname}<br>"
                        f"Hardness: {row.get('Hardness', 0):.2f}<br>"
                        f"Dissolution: {row.get('Dissolution_Rate', 0):.2f}<br>"
                        f"Friability: {row.get('Friability', 0):.3f}<br>"
                        f"Disintegration: {row.get('Disintegration_Time', 0):.2f}<br>"
                        f"CO₂e: {row.get('total_CO2e_kg', 0):.2f}")
                hover_text.append(text)

            fig_3d.add_trace(go.Scatter3d(
                x=subset.get("Dissolution_Rate", subset.iloc[:, 0]),
                y=subset.get("Hardness", subset.iloc[:, 1]),
                z=subset.get("total_CO2e_kg", subset.get("total_energy_kWh", subset.iloc[:, 2])),
                mode="markers",
                marker=dict(size=6, color=color, opacity=0.8),
                name=cname,
                hovertext=hover_text,
                hoverinfo="text",
            ))

        fig_3d.update_layout(
            scene=dict(
                xaxis_title="Dissolution Rate",
                yaxis_title="Hardness",
                zaxis_title="CO₂e (kg)",
                bgcolor="#0D1117",
            ),
            template="plotly_dark",
            paper_bgcolor="#0D1117",
            height=550,
            margin=dict(l=0, r=0, t=30, b=0),
            legend=dict(
                orientation="h", y=-0.05,
                font=dict(size=12),
            ),
        )
        st.plotly_chart(fig_3d, use_container_width=True)
    else:
        st.info("No Pareto front data found. Run `python -m src.optimization.pareto` first.")
except Exception as e:
    st.error(f"Pareto front error: {e}")

st.divider()

# ──────────────────────────────────────────────────────────
# 3 Golden Cluster Cards
# ──────────────────────────────────────────────────────────
st.subheader("🔑 Golden Cluster Profiles")

try:
    centroids = load_centroids()
    cluster_names = get_cluster_names()
    card_cols = st.columns(3)

    for i, cname in enumerate(cluster_names):
        with card_cols[i]:
            color = CLUSTER_COLORS.get(cname, "#2E86C1")
            st.markdown(f"#### <span style='color:{color}'>●</span> {cname}",
                        unsafe_allow_html=True)

            # Get signature info from API
            try:
                sig = api_get(f"signatures/{cname}")
                version = sig.get("version", "?")
                source = sig.get("source", "unknown")
                created = str(sig.get("created_at", ""))[:19]
                st.caption(f"v{version} • {source} • Active since {created}")
            except Exception:
                st.caption("Signature info unavailable")

            # CPP recipe
            cpps = centroids.get(cname, {})
            if cpps:
                cpp_df = pd.DataFrame([
                    {"Parameter": k.replace("_", " "), "Value": f"{v:.2f}"}
                    for k, v in cpps.items()
                ])
                st.dataframe(cpp_df, use_container_width=True, hide_index=True, height=310)
except Exception as e:
    st.error(f"Cluster cards error: {e}")

st.divider()

# ──────────────────────────────────────────────────────────
# Signature Version History
# ──────────────────────────────────────────────────────────
st.subheader("📜 Signature Version History")

selected_for_history = st.selectbox("View Signature History", get_cluster_names(),
                                     key="hist_cluster")

try:
    history = api_get(f"signatures/{selected_for_history}/history")

    if history and isinstance(history, list):
        for entry in history:
            ver = entry.get("version", "?")
            source = entry.get("source", "unknown")
            created = str(entry.get("created_at", ""))[:19]
            trigger = entry.get("trigger_batch_id", None)
            is_active = entry.get("is_active", False)

            source_emoji = "🔬" if source == "pareto" else "📊" if source == "empirical" else "🔄"
            active_badge = " ✅ **ACTIVE**" if is_active else ""

            st.markdown(f"""
            <div class="timeline-entry">
                <span class="version-badge">v{ver}</span>
                {source_emoji} <strong>{source.upper()}</strong>{active_badge}<br>
                <span style="color:#8B949E">📅 {created}</span>
                {f'<br><span style="color:#27AE60">🔄 Triggered by batch: <strong>{trigger}</strong></span>' if trigger else ''}
            </div>
            """, unsafe_allow_html=True)

        # Self-update log
        with st.expander("📊 Signature Update Log"):
            update_entries = [e for e in history if e.get("source") == "updated"]
            if update_entries:
                log_data = []
                for e in update_entries:
                    log_data.append({
                        "Version": f"v{e['version']}",
                        "Trigger Batch": e.get("trigger_batch_id", ""),
                        "Date": str(e.get("created_at", ""))[:19],
                        "Source": e.get("source", ""),
                    })
                st.dataframe(pd.DataFrame(log_data), use_container_width=True,
                             hide_index=True)
            else:
                st.info("No self-updates yet. The system will auto-update when a batch dominates the current golden.")
    else:
        st.info("No history available. Ensure API is running.")
except Exception as e:
    st.warning(f"Could not load history: {e}")

st.divider()

# ──────────────────────────────────────────────────────────
# Simulate New Batch
# ──────────────────────────────────────────────────────────
st.subheader("🧪 Simulate New Batch — Would It Update the Signature?")

with st.expander("Open Simulation Panel", expanded=False):
    try:
        master_df = load_master()
        centroids = load_centroids()

        sim_cluster = st.selectbox("Target Cluster", get_cluster_names(), key="sim_cluster")
        centroid_vals = centroids.get(sim_cluster, {})

        sim_cols = st.columns(4)
        sim_cpp = {}
        for i, cpp in enumerate(CPP_COLS):
            col_min = float(master_df[cpp].min())
            col_max = float(master_df[cpp].max())
            default = float(centroid_vals.get(cpp, master_df[cpp].mean()))
            default = max(col_min, min(col_max, default))
            with sim_cols[i % 4]:
                sim_cpp[cpp] = st.slider(
                    cpp.replace("_", " "),
                    min_value=col_min, max_value=col_max, value=default,
                    step=(col_max - col_min) / 50,
                    key=f"sim_{cpp}",
                )

        if st.button("🔮 Check Dominance", use_container_width=True):
            with st.spinner("Running surrogate prediction & dominance check..."):
                try:
                    from src.signatures.signature_manager import (
                        dominates, get_active_signature,
                    )
                    import joblib

                    # Load surrogate
                    surrogate_path = os.path.join(_PROJECT_ROOT, "models", "causal_Hardness.pkl")
                    if os.path.exists(surrogate_path):
                        # Use a simpler prediction: approximate from master_dataset
                        # Find nearest neighbor in CPP space
                        cpp_vals = np.array([sim_cpp[c] for c in CPP_COLS])
                        master_cpps = master_df[CPP_COLS].values
                        dists = np.linalg.norm(master_cpps - cpp_vals, axis=1)
                        nearest_idx = np.argmin(dists)
                        nearest_row = master_df.iloc[nearest_idx]

                        predicted_cqas = {
                            cqa: float(nearest_row[cqa]) for cqa in CQA_COLS
                            if cqa in nearest_row
                        }
                        if "total_CO2e_kg" in nearest_row:
                            predicted_cqas["total_CO2e_kg"] = float(nearest_row["total_CO2e_kg"])
                    else:
                        predicted_cqas = {}

                    # Get current signature
                    active = get_active_signature(sim_cluster)
                    if active:
                        current_cqas = active.get("actual_cqa", active.get("predicted_cqa", {}))

                        # Show comparison
                        comp_col1, comp_col2 = st.columns(2)
                        with comp_col1:
                            st.markdown("**🆕 Predicted (New Batch)**")
                            for k, v in predicted_cqas.items():
                                st.write(f"  {k}: **{v:.2f}**")
                        with comp_col2:
                            st.markdown("**🏆 Current Golden**")
                            for k, v in current_cqas.items():
                                st.write(f"  {k}: **{v:.2f}**" if isinstance(v, (int, float)) else f"  {k}: —")

                        if current_cqas and predicted_cqas:
                            would_dom = dominates(predicted_cqas, current_cqas)
                            if would_dom:
                                st.markdown(
                                    '<div class="dominate-yes">'
                                    '<h3 style="color:#27AE60">✅ This batch WOULD trigger a signature update!</h3>'
                                    '<p style="color:#B0C4DE">New batch dominates the current golden on all objectives.</p>'
                                    '</div>',
                                    unsafe_allow_html=True,
                                )
                            else:
                                st.markdown(
                                    '<div class="dominate-no">'
                                    '<h3 style="color:#8B949E">⬜ This batch would NOT trigger an update</h3>'
                                    '<p style="color:#8B949E">Current golden is still superior on one or more objectives.</p>'
                                    '</div>',
                                    unsafe_allow_html=True,
                                )
                        else:
                            st.info("Insufficient CQA data for dominance check.")
                    else:
                        st.warning("No active signature found for this cluster.")
                except Exception as e:
                    st.error(f"Simulation error: {e}")
    except Exception as e:
        st.error(f"Simulation panel error: {e}")

st.divider()

# ──────────────────────────────────────────────────────────
# Export
# ──────────────────────────────────────────────────────────
st.subheader("📤 Export Golden Signatures")

try:
    centroids = load_centroids()
    export_data = {
        "clusters": {},
        "export_info": "CB-MOPA Golden Signature Export",
    }
    for cname in get_cluster_names():
        try:
            sig = api_get(f"signatures/{cname}")
            export_data["clusters"][cname] = {
                "cpp_params": centroids.get(cname, {}),
                "version": sig.get("version", 1),
                "source": sig.get("source", "pareto"),
                "created_at": sig.get("created_at", ""),
            }
        except Exception:
            export_data["clusters"][cname] = {
                "cpp_params": centroids.get(cname, {}),
            }

    st.download_button(
        label="⬇️ Download Golden Signatures (JSON)",
        data=json.dumps(export_data, indent=2),
        file_name="golden_signatures_export.json",
        mime="application/json",
        use_container_width=True,
    )
except Exception as e:
    st.error(f"Export error: {e}")
