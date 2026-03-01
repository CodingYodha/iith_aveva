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

    Returns
    -------
    str
        GML string representation of the graph.
    """
    buf = io.BytesIO()
    nx.write_gml(G, buf)
    return buf.getvalue().decode("utf-8")


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
