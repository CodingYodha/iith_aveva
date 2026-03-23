"""
dag_definition.py — Pharmaceutical manufacturing causal DAG.
Encodes domain knowledge about physical causal mechanisms in tablet production.
"""

import io
import os
import sys

import matplotlib
matplotlib.use("Agg")  # non-interactive backend
import matplotlib.pyplot as plt
import networkx as nx

# Ensure project root is on sys.path
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from constraints import CPP_COLS, CQA_COLS


def build_dag() -> nx.DiGraph:
    """
    Build the causal DAG for pharmaceutical tablet manufacturing.

    Edges encode physical causal mechanisms, NOT correlations.

    Returns
    -------
    nx.DiGraph
        Directed acyclic graph with CPP, CQA, energy, and carbon nodes.
    """
    G = nx.DiGraph()

    # --- CPP → Energy edges (process parameters consume energy) ---
    G.add_edge("Machine_Speed", "total_energy_kWh")
    G.add_edge("Compression_Force", "total_energy_kWh")
    G.add_edge("Drying_Temp", "total_energy_kWh")
    G.add_edge("Drying_Time", "total_energy_kWh")
    G.add_edge("Granulation_Time", "total_energy_kWh")

    # --- CPP → CQA edges (physical causal mechanisms) ---
    G.add_edge("Granulation_Time", "Hardness")
    G.add_edge("Granulation_Time", "Dissolution_Rate")
    G.add_edge("Binder_Amount", "Hardness")
    G.add_edge("Binder_Amount", "Friability")
    G.add_edge("Drying_Temp", "Moisture_Content")
    G.add_edge("Drying_Time", "Moisture_Content")
    G.add_edge("Moisture_Content", "Friability")
    G.add_edge("Moisture_Content", "Disintegration_Time")
    G.add_edge("Compression_Force", "Hardness")
    G.add_edge("Compression_Force", "Dissolution_Rate")
    G.add_edge("Compression_Force", "Disintegration_Time")
    G.add_edge("Machine_Speed", "Content_Uniformity")
    G.add_edge("Lubricant_Conc", "Hardness")
    G.add_edge("Lubricant_Conc", "Dissolution_Rate")

    # --- Energy → Carbon edge ---
    G.add_edge("total_energy_kWh", "total_CO2e_kg")

    # Verify acyclicity
    assert nx.is_directed_acyclic_graph(G), "DAG has cycles!"

    return G


def get_dag_gml_string(G: nx.DiGraph) -> str:
    """
    Convert the networkx DAG to a GML-format string compatible with DoWhy.
    """
    buf = io.BytesIO()
    nx.write_gml(G, buf)
    return buf.getvalue().decode("utf-8")


# ---------------------------------------------------------------------------
# Valid node universe
# ---------------------------------------------------------------------------
_EXTRA_INTERMEDIATES = {"total_energy_kWh", "Moisture_Content", "total_CO2e_kg"}

def get_valid_nodes() -> set:
    """Return the full set of node names allowed in a custom DAG."""
    valid = set(CPP_COLS) | set(CQA_COLS) | _EXTRA_INTERMEDIATES
    # Also pull column names from master_dataset if it exists
    ds_path = os.path.join(_PROJECT_ROOT, "data", "processed", "master_dataset.csv")
    if os.path.exists(ds_path):
        import pandas as pd
        cols = set(pd.read_csv(ds_path, nrows=0).columns.tolist())
        valid |= cols
    return valid


# ---------------------------------------------------------------------------
# Custom DAG persistence path
# ---------------------------------------------------------------------------
_CUSTOM_DAG_PATH = os.path.join(_PROJECT_ROOT, "data", "golden", "custom_dag.json")


def load_custom_dag(source) -> nx.DiGraph:
    """
    Build a validated DAG from user-provided edges.

    Parameters
    ----------
    source : list[dict] | str
        Either a list of edge dicts [{"cause": "X", "effect": "Y"}, ...]
        or an absolute path to a CSV file with columns cause, effect.

    Returns
    -------
    nx.DiGraph

    Raises
    ------
    ValueError  on any validation failure (descriptive message).
    """
    import json

    # ---- 1. Parse source into list of edge dicts ----
    if isinstance(source, str):
        # Treat as file path (CSV)
        import pandas as pd
        if not os.path.exists(source):
            raise ValueError(f"File not found: {source}")
        df = pd.read_csv(source)
        if "cause" not in df.columns or "effect" not in df.columns:
            raise ValueError("CSV must have columns 'cause' and 'effect'.")
        edges = df[["cause", "effect"]].to_dict(orient="records")
    elif isinstance(source, list):
        edges = source
    else:
        raise ValueError("source must be a list of edge dicts or a CSV file path.")

    # ---- 2. Non-empty & minimum count ----
    if not edges:
        raise ValueError("Edge list is empty. Provide at least 3 edges.")
    if len(edges) < 3:
        raise ValueError(f"At least 3 edges required, only {len(edges)} provided.")

    # ---- 3. Validate structure ----
    for i, e in enumerate(edges):
        if not isinstance(e, dict) or "cause" not in e or "effect" not in e:
            raise ValueError(
                f"Edge #{i+1} is invalid. Each edge must be a dict with 'cause' and 'effect' keys. Got: {e}"
            )

    # ---- 4. Self-loop check ----
    for e in edges:
        if e["cause"] == e["effect"]:
            raise ValueError(f"Self-loop detected: '{e['cause']}' -> '{e['effect']}'. Edges must connect different nodes.")

    # ---- 5. Valid node names ----
    valid = get_valid_nodes()
    for e in edges:
        for field in ("cause", "effect"):
            if e[field] not in valid:
                raise ValueError(
                    f"Unknown node: '{e[field]}'. Valid nodes are: {sorted(valid)}"
                )

    # ---- 6. Build graph and check acyclicity ----
    G = nx.DiGraph()
    for e in edges:
        G.add_edge(e["cause"], e["effect"])

    if not nx.is_directed_acyclic_graph(G):
        cycle = nx.find_cycle(G, orientation="original")
        cycle_str = " -> ".join(f"{u}" for u, v, _ in cycle)
        raise ValueError(f"Cycle detected in DAG: {cycle_str}. A DAG must have no cycles.")

    return G


def save_custom_dag(edges: list):
    """Persist a list of edge dicts to custom_dag.json."""
    import json
    os.makedirs(os.path.dirname(_CUSTOM_DAG_PATH), exist_ok=True)
    with open(_CUSTOM_DAG_PATH, "w", encoding="utf-8") as f:
        json.dump(edges, f, indent=2)


def get_active_dag() -> tuple:
    """
    Return (dag: nx.DiGraph, source: str).
    Loads custom_dag.json if it exists, otherwise falls back to build_dag().
    """
    import json
    if os.path.exists(_CUSTOM_DAG_PATH):
        with open(_CUSTOM_DAG_PATH, "r", encoding="utf-8") as f:
            edges = json.load(f)
        try:
            dag = load_custom_dag(edges)
            return dag, "custom"
        except ValueError:
            pass  # fall back to default if custom is somehow invalid
    return build_dag(), "default"


def reset_to_default_dag() -> nx.DiGraph:
    """Delete custom_dag.json and return the hardcoded DAG."""
    if os.path.exists(_CUSTOM_DAG_PATH):
        os.remove(_CUSTOM_DAG_PATH)
    return build_dag()


def visualize_dag(output_path: str = "data/golden/causal_dag.png"):
    """
    Draw the causal DAG with hierarchical layout and save as PNG.

    CPP nodes = blue, CQA nodes = green, Energy/Carbon nodes = orange.
    """
    G = build_dag()

    # Node classification for coloring
    cpp_nodes = [n for n in G.nodes if n in CPP_COLS]
    cqa_nodes = [n for n in G.nodes if n in CQA_COLS]
    energy_nodes = [n for n in G.nodes if n not in CPP_COLS and n not in CQA_COLS]

    # Color map
    color_map = []
    for node in G.nodes:
        if node in cpp_nodes:
            color_map.append("#4A90D9")   # blue
        elif node in cqa_nodes:
            color_map.append("#5CB85C")   # green
        else:
            color_map.append("#F0AD4E")   # orange

    # Hierarchical layout using topological generations
    for layer, nodes in enumerate(nx.topological_generations(G)):
        for node in nodes:
            G.nodes[node]["subset"] = layer

    pos = nx.multipartite_layout(G, subset_key="subset", align="horizontal")

    # Draw
    fig, ax = plt.subplots(1, 1, figsize=(16, 10))
    ax.set_title("CB-MOPA Causal DAG — Pharmaceutical Tablet Manufacturing",
                 fontsize=14, fontweight="bold", pad=20)

    nx.draw_networkx(
        G,
        pos,
        ax=ax,
        node_color=color_map,
        node_size=2000,
        font_size=7,
        font_weight="bold",
        arrows=True,
        arrowsize=15,
        edge_color="#666666",
        width=1.5,
        connectionstyle="arc3,rad=0.1",
    )

    # Legend
    from matplotlib.patches import Patch
    legend_elements = [
        Patch(facecolor="#4A90D9", label="CPP (Process Parameters)"),
        Patch(facecolor="#5CB85C", label="CQA (Quality Attributes)"),
        Patch(facecolor="#F0AD4E", label="Energy / Carbon"),
    ]
    ax.legend(handles=legend_elements, loc="lower right", fontsize=10)

    plt.tight_layout()
    out = os.path.join(_PROJECT_ROOT, output_path)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    fig.savefig(out, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  DAG visualization saved → {out}")


# Module-level DAG instance — available at import time
DAG = build_dag()


if __name__ == "__main__":
    print(f"{'='*60}")
    print(f"  Causal DAG Definition")
    print(f"{'='*60}")

    G = build_dag()
    print(f"  Nodes : {G.number_of_nodes()}")
    print(f"  Edges : {G.number_of_edges()}")
    print(f"  Acyclic: {nx.is_directed_acyclic_graph(G)}")

    print(f"\n  Nodes: {sorted(G.nodes)}")
    print(f"\n  Edges:")
    for u, v in sorted(G.edges):
        print(f"    {u} → {v}")

    print(f"\n  GML string (first 200 chars):")
    gml = get_dag_gml_string(G)
    print(f"    {gml[:200]}...")

    visualize_dag()
    print(f"\n{'='*60}")
