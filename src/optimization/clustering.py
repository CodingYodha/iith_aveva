"""
clustering.py — K-Means clustering of Pareto front into 3 golden scenarios.
Maps historical batches to nearest cluster centroid.
"""

import json
import os
import sys

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import MinMaxScaler

# Ensure project root is on sys.path
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from constraints import CPP_COLS, GOLDEN_CLUSTER_NAMES

_OBJ_COLS = [
    "Hardness",
    "Friability",
    "Disintegration_Time",
    "Dissolution_Rate",
    "total_CO2e_kg",
]


def cluster_pareto_front(pareto_df: pd.DataFrame) -> pd.DataFrame:
    """
    Cluster Pareto front solutions into 3 golden scenarios via K-Means.

    Parameters
    ----------
    pareto_df : pd.DataFrame
        Pareto front from pareto.py (with CPP + CQA + CO2e columns).

    Returns
    -------
    pd.DataFrame
        Pareto front with cluster_id and cluster_name columns added.
    """
    # Normalize objective space
    scaler = MinMaxScaler()
    obj_norm = scaler.fit_transform(pareto_df[_OBJ_COLS].values)

    # K-Means clustering
    kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
    labels = kmeans.fit_predict(obj_norm)
    pareto_df = pareto_df.copy()
    pareto_df["cluster_id"] = labels

    # Label clusters by dominant characteristic
    cluster_stats = pareto_df.groupby("cluster_id")[_OBJ_COLS].mean()

    # Cluster with lowest mean CO2e → Deep Decarbonization Golden
    decarb_id = cluster_stats["total_CO2e_kg"].idxmin()

    # Cluster with highest mean Hardness + Dissolution → Max Quality Golden
    remaining = cluster_stats.drop(decarb_id)
    quality_score = remaining["Hardness"] + remaining["Dissolution_Rate"]
    quality_id = quality_score.idxmax()

    # Remaining → Balanced Operational Golden
    balanced_id = [i for i in range(3) if i not in (decarb_id, quality_id)][0]

    label_map = {
        quality_id: "Max Quality Golden",
        decarb_id: "Deep Decarbonization Golden",
        balanced_id: "Balanced Operational Golden",
    }
    pareto_df["cluster_name"] = pareto_df["cluster_id"].map(label_map)

    # Compute centroids in ORIGINAL CPP space
    centroids = {}
    for cid, cname in label_map.items():
        cluster_mask = pareto_df["cluster_id"] == cid
        centroid = pareto_df.loc[cluster_mask, CPP_COLS].mean().to_dict()
        centroids[cname] = {k: round(v, 4) for k, v in centroid.items()}

    # Save centroids
    out_dir = os.path.join(_PROJECT_ROOT, "data", "golden")
    os.makedirs(out_dir, exist_ok=True)
    centroids_path = os.path.join(out_dir, "cluster_centroids.json")
    with open(centroids_path, "w") as f:
        json.dump(centroids, f, indent=2)

    # Overwrite pareto_front.csv with cluster columns
    pareto_path = os.path.join(out_dir, "pareto_front.csv")
    pareto_df.to_csv(pareto_path, index=False)

    # Print summary
    print(f"{'='*60}")
    print(f"  K-Means Clustering Summary (3 Golden Scenarios)")
    print(f"{'='*60}")
    for cid, cname in sorted(label_map.items()):
        subset = pareto_df[pareto_df["cluster_id"] == cid]
        print(f"\n  [{cid}] {cname} — {len(subset)} solutions")
        for col in _OBJ_COLS:
            print(f"      {col:25s}: {subset[col].mean():.2f}")
    print(f"\n  Saved centroids → {centroids_path}")
    print(f"  Updated pareto  → {pareto_path}")
    print(f"{'='*60}")

    return pareto_df


def find_cluster_batches(
    master_dataset_path: str, cluster_centroids: dict, top_n: int = 5
) -> dict:
    """
    Find the top_n historical batches closest to each cluster centroid.

    Parameters
    ----------
    master_dataset_path : str
        Path to data/processed/master_dataset.csv.
    cluster_centroids : dict
        {cluster_name: {cpp_col: value, ...}}.
    top_n : int
        Number of closest batches per cluster.

    Returns
    -------
    dict
        {cluster_name: [batch_id1, ..., batch_id_top_n]}.
    """
    master = pd.read_csv(master_dataset_path)

    # Filter to passing batches only
    passing = master[master["Reg_Pass"] == True].copy()

    # Normalize CPP space for distance calculation
    scaler = MinMaxScaler()
    cpp_norm = scaler.fit_transform(passing[CPP_COLS].values)

    cluster_batch_map = {}

    print(f"\n{'='*60}")
    print(f"  Historical Batch → Cluster Mapping")
    print(f"{'='*60}")

    for cname, centroid_dict in cluster_centroids.items():
        centroid_vals = np.array([centroid_dict[c] for c in CPP_COLS]).reshape(1, -1)
        centroid_norm = scaler.transform(centroid_vals)

        # Euclidean distance from each batch to centroid
        distances = np.sqrt(((cpp_norm - centroid_norm) ** 2).sum(axis=1))
        passing = passing.copy()
        passing["_dist"] = distances

        top_batches = passing.nsmallest(top_n, "_dist")
        batch_ids = top_batches["Batch_ID"].tolist()
        cluster_batch_map[cname] = batch_ids

        print(f"\n  {cname}:")
        for _, row in top_batches.iterrows():
            print(
                f"    {row['Batch_ID']}  dist={row['_dist']:.4f}  "
                f"Hard={row['Hardness']:.0f}  Fria={row['Friability']:.2f}  "
                f"Diss={row['Dissolution_Rate']:.1f}  CO2e={row.get('total_CO2e_kg', 0):.1f}"
            )

    # Save mapping
    map_path = os.path.join(_PROJECT_ROOT, "data", "golden", "cluster_batch_map.json")
    with open(map_path, "w") as f:
        json.dump(cluster_batch_map, f, indent=2)

    print(f"\n  Saved → {map_path}")
    print(f"{'='*60}")

    return cluster_batch_map


if __name__ == "__main__":
    # Step 1: Cluster the Pareto front
    pareto = pd.read_csv(
        os.path.join(_PROJECT_ROOT, "data", "golden", "pareto_front.csv")
    )
    pareto = cluster_pareto_front(pareto)

    # Step 2: Map historical batches to clusters
    centroids_path = os.path.join(
        _PROJECT_ROOT, "data", "golden", "cluster_centroids.json"
    )
    with open(centroids_path) as f:
        centroids = json.load(f)

    find_cluster_batches(
        os.path.join(_PROJECT_ROOT, "data", "processed", "master_dataset.csv"),
        centroids,
    )
