# CB-MOPA Final Pre-Demo Checklist

## ✅ Data Files (7 files)

- [ ] `data/processed/master_dataset.csv` — 60 batches × 67 features
- [ ] `data/processed/batch_outcomes.csv` — 60 batches with Reg_Pass column
- [ ] `data/processed/batch_trajectories/` — 60 CSV trajectory files
- [ ] `data/golden/pareto_front.csv` — Pareto solutions with cluster_name
- [ ] `data/golden/golden_envelopes.json` — 45 DTW envelopes (3×5×3)
- [ ] `data/golden/cluster_centroids.json` — 3 cluster CPP centroids
- [ ] `data/golden/signatures.db` — SQLite with golden signatures

## ✅ Models (7 artifacts)

- [ ] `models/causal_Hardness.pkl`
- [ ] `models/causal_Friability.pkl`
- [ ] `models/causal_Dissolution_Rate.pkl`
- [ ] `models/causal_Disintegration_Time.pkl`
- [ ] `models/causal_Content_Uniformity.pkl`
- [ ] `models/causal_total_CO2e_kg.pkl`
- [ ] `models/botorch_gp_state.pt` — PairwiseGP preference state

## ✅ API (11 endpoints)

Start: `uvicorn api.main:app --reload --port 8000`

- [ ] `GET /health` → `{"status": "ok", "db_connected": true}`
- [ ] `GET /` → root message
- [ ] `POST /api/batch/drift-check`
- [ ] `POST /api/batch/complete`
- [ ] `GET /api/recommendations/{batch_id}/{cluster_name}`
- [ ] `POST /api/decisions/`
- [ ] `GET /api/decisions/history`
- [ ] `GET /api/signatures/{cluster_name}`
- [ ] `GET /api/signatures/{cluster_name}/history`
- [ ] `GET /api/carbon/targets`
- [ ] `GET /api/preferences/summary`

## ✅ Dashboard (5 pages)

Start: `streamlit run dashboard/app.py`

- [ ] **Home** — 3 module cards, system status, architecture diagram
- [ ] **Live Batch** — CPP sliders, DTW envelope chart, radar, phase energy
- [ ] **Causal Recommendations** — Pathway A/B cards, HITL buttons, preference history
- [ ] **Golden Signatures** — 3D Pareto, cluster cards, version timeline, simulate
- [ ] **Carbon Targets** — Gauge, trend, phase donut, shift factors, compliance table

## ✅ Tests

```bash
cd cb_mopa
python -m pytest tests/test_pipeline.py -v
```

- [ ] test_1_data_foundation — 60 batches, 60 trajectories
- [ ] test_2_pareto_front — Pareto solutions, 3 clusters
- [ ] test_3_dtw_envelopes — 45 envelopes
- [ ] test_4_causal_models — 6 causal models load
- [ ] test_5_hitl_loop — PairwiseGP fits on 4 comparisons
- [ ] test_6_api_endpoints — 4 endpoints return 200
- [ ] test_7_full_demo_flow — drift → recs → decision → signature

## ✅ Demo Rehearsal

- [ ] Rehearsed demo flow 3× (7 min each)
- [ ] Memorized Q&A answers (5 questions)
- [ ] Both servers running before demo starts

### Startup Commands

```bash
# Terminal 1 — API
cd cb_mopa && uvicorn api.main:app --reload --port 8000

# Terminal 2 — Dashboard  
cd cb_mopa && streamlit run dashboard/app.py

# Terminal 3 — Pre-demo check
cd cb_mopa && python demo_script.py
```
