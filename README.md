# CB-MOPA
## Causal-Bayesian Multi-Objective Process Analytics

> **AVEVA × IIT Hyderabad Hackathon 2025**
> Intelligent pharmaceutical tablet manufacturing optimization — from raw sensor data to self-improving, causally-aware, operator-adaptive batch control.

---

## Table of Contents

1. [What Is CB-MOPA?](#1-what-is-cb-mopa)
2. [The Problem Being Solved](#2-the-problem-being-solved)
3. [System Architecture](#3-system-architecture)
4. [Data Sources](#4-data-sources)
5. [Data Pipeline](#5-data-pipeline)
6. [Pareto Optimization](#6-pareto-optimization)
7. [Module 1 — DTW Golden Envelope](#7-module-1--dtw-golden-envelope)
8. [Module 2 — Causal Counterfactual Engine](#8-module-2--causal-counterfactual-engine)
9. [Module 3 — Bayesian HITL Preference Learning](#9-module-3--bayesian-hitl-preference-learning)
10. [Golden Signature System](#10-golden-signature-system)
11. [Carbon Tracker](#11-carbon-tracker)
12. [FastAPI Backend](#12-fastapi-backend)
13. [Streamlit Dashboard](#13-streamlit-dashboard)
14. [Project Structure](#14-project-structure)
15. [Setup & Installation](#15-setup--installation)
16. [Running the System](#16-running-the-system)
17. [Running Tests](#17-running-tests)
18. [Key Configuration](#18-key-configuration)
19. [Tech Stack](#19-tech-stack)

---

## 1. What Is CB-MOPA?

CB-MOPA is an end-to-end intelligent manufacturing system built on 60 batches of real pharmaceutical tablet production data. It takes two raw Excel files as input and produces a fully operational platform for:

- **Real-time batch monitoring** — every minute of a running batch compared against a statistical safety band
- **Causal intervention recommendations** — mathematically proven safe parameter adjustments, not guesses
- **Operator preference learning** — the system learns which type of recommendation each operator prefers and adapts automatically
- **Self-updating golden benchmarks** — best-known recipes improve themselves when production improves
- **Adaptive carbon tracking** — CO2e targets that automatically tighten as the factory gets more efficient

**The headline result:** Batch violation rate reduced from 16/60 (26.7%) to a projected <5%, with full causal justification for every recommendation.

---

## 2. The Problem Being Solved

### The Factory Setup
A pharmaceutical tablet factory runs batches one at a time. Each batch takes ~3.5 hours and goes through 8 phases: Preparation → Granulation → Drying → Milling → Blending → Compression → Coating → Quality Testing.

Each batch has:
- **8 CPPs** (Critical Process Parameters — machine settings): `Granulation_Time`, `Binder_Amount`, `Drying_Temp`, `Drying_Time`, `Compression_Force`, `Machine_Speed`, `Lubricant_Conc`, `Moisture_Content`
- **6 CQAs** (Critical Quality Attributes — regulatory outcomes): `Hardness`, `Friability`, `Disintegration_Time`, `Dissolution_Rate`, `Content_Uniformity`, `Tablet_Weight`

### The Failure Story
16 out of 60 batches violated at least one pharmaceutical regulatory limit:

| Quality Limit | Requirement | Example Violation |
|---|---|---|
| Hardness | ≥ 60 N | T056: 40 N — tablet too soft |
| Friability | ≤ 1.0% | T056: 1.92% — tablet crumbles |
| Dissolution Rate | ≥ 80% | Drug does not dissolve properly |
| Content Uniformity | 95–105% | T008: 94.2% — inconsistent dosing |
| Disintegration Time | ≤ 15 min | T020: 16.2 min — too slow |
| Tablet Weight | 197–215 mg | Outside acceptable range |

### The Old Way and Why It Failed
The factory used fixed machine settings, waited for the full batch to finish, then discovered whether quality limits were met. There was no real-time monitoring, no systematic way to know which parameter to change or by how much, and no causal understanding of why failures occurred. It was entirely reactive — trial and error.

### What CB-MOPA Provides
Three capabilities the factory never had:
1. **Real-time comparison** — problems caught during the batch, not after
2. **Causal recommendations** — exact parameter changes with predicted outcomes, safety-checked before suggesting
3. **Learning memory** — system improves its suggestions based on what operators accept and what actually works

---

## 3. System Architecture

```
RAW EXCEL DATA
      │
      ▼
DATA PIPELINE (src/data/)
loader.py → trajectory_parser.py → feature_engineer.py
      │
      ▼
master_dataset.csv  (60 rows × ~55 columns — single source of truth)
      │
      ▼
PARETO OPTIMIZATION (src/optimization/)
NSGA-II → K-Means (k=3) → DTW Envelopes
      │
      ├─────────────────────────────────────────┐
      ▼                                         ▼
MODULE 1                                   MODULE 2
DTW Golden Envelope                        Causal Engine
(src/signatures/)                          (src/causal/)
Real-time drift detection                  DoWhy SCM × 6
±3σ statistical band                       Counterfactual ATE
OK / WARNING / CRITICAL                    Pathway A + B
      │                                         │
      └─────────────────┬───────────────────────┘
                        ▼
                   MODULE 3
                   Bayesian HITL
                   (src/hitl/)
                   BoTorch PairwiseGP
                   Operator preference learning
                        │
                        ▼
              CARBON TRACKER (src/carbon/)
              + GOLDEN SIGNATURES (src/signatures/)
                        │
                        ▼
              FASTAPI BACKEND (api/)   ←→   SQLite (signatures.db)
                        │
                        ▼
              STREAMLIT DASHBOARD (dashboard/)
              4 pages: Live Batch | Recommendations | Signatures | Carbon
```

**Self-improvement feedback loop:** Every completed batch → dominance check → possible signature update → carbon target adjustment → GP preference update → system is smarter next batch.

---

## 4. Data Sources

### File 1: `_h_batch_production_data.xlsx` — Batch Summary Sheet
- **60 rows** (one per batch, T001–T060)
- **15 columns**: Batch_ID + 8 CPP machine settings + 6 CQA quality outcomes
- Used to: label pass/fail batches, train causal models, seed Pareto optimization

### File 2: `_h_batch_process_data.xlsx` — Minute-by-Minute Sensor Logs
- **61 sheets**: one summary sheet + one sheet per batch
- **~211 rows per batch** (one row = one minute of sensor readings)
- **9 sensor columns**: `Time_Minutes`, `Phase`, `Power_Consumption_kW`, `Temperature_C`, `Pressure_Bar`, `Humidity_Percent`, `Motor_Speed_RPM`, `Compression_Force_kN`, `Flow_Rate_LPM`, `Vibration_mm_s`
- Used to: build DTW envelopes, compute energy features, calculate CO2 emissions

### The 8 Manufacturing Phases

| Phase | What Happens | Typical Duration |
|---|---|---|
| Preparation | Raw materials weighed and set up | ~25 min |
| Granulation | Powder mixed with binder liquid | ~15 min |
| Drying | Wet granules dried in heated dryer | ~25 min |
| Milling | Dried granules ground to correct size | ~15 min |
| Blending | Granules mixed with lubricant | ~22 min |
| Compression | Powder pressed into tablet shape | ~52 min (~50% of total energy) |
| Coating | Tablet gets its film coating | ~20 min |
| Quality Testing | Tablets tested for all CQA parameters | ~37 min |

> **Note:** Both Excel files must be placed in `data/raw/` before running the data pipeline.

---

## 5. Data Pipeline

Located in `src/data/`. Run scripts in order.

### Step 1 — `loader.py`
- Reads `_h_batch_production_data.xlsx`
- Validates 60 rows, zero missing values
- Applies `PHARMA_LIMITS` from `constraints.py` to every batch
- Adds `Reg_Pass` column: `True` (44 batches) or `False` (16 batches)
- **Output:** `data/processed/batch_outcomes.csv`

### Step 2 — `trajectory_parser.py`
- Reads all 60 batch sheets from `_h_batch_process_data.xlsx`
- Computes `Energy_kWh = Power_Consumption_kW ÷ 60` per row (power at each minute → energy that minute)
- Saves one CSV per batch with sensor readings + energy column
- **Output:** `data/processed/batch_trajectories/T001.csv` through `T060.csv` + `trajectory_summary.json`

### Step 3 — `feature_engineer.py`
- For every batch × every phase, computes:
  - `{Phase}_energy_kWh` — total energy consumed during that phase
  - `{Phase}_peak_power` — maximum kW during that phase
  - `{Phase}_power_variance` — stability of power (high variance = unstable process)
  - `{Phase}_vibration_mean` and `{Phase}_vibration_max`
  - `{Phase}_duration_minutes`
- Batch-level totals: `total_energy_kWh`, `total_CO2e_kg = total_energy_kWh × 0.72`
- Merges with `batch_outcomes.csv`
- **Output:** `data/processed/master_dataset.csv` — 60 rows × ~55 columns. This single file feeds all downstream modules.

---

## 6. Pareto Optimization

Located in `src/optimization/`.

### Why Multi-Objective Optimization?
Quality and carbon efficiency are in conflict. Higher `Compression_Force` makes harder tablets (good) but uses more electricity (bad for CO2). NSGA-II finds the entire trade-off surface — the set of all points where you cannot improve one objective without degrading another.

### NSGA-II (`pareto.py`)
- **Population:** 100 candidate batch recipes
- **Generations:** 200 evolutionary iterations
- **Surrogate model:** XGBoost trained on `master_dataset.csv` to evaluate candidates fast
- **5 objectives** (all converted to minimization):
  - Maximize Hardness (`-Hardness`)
  - Minimize Friability
  - Minimize Disintegration Time
  - Maximize Dissolution Rate (`-Dissolution_Rate`)
  - Minimize `total_CO2e_kg`
- **Output:** `data/golden/pareto_front.csv` — all non-dominated optimal solutions

### K-Means Clustering (`clustering.py`)
- Clusters the Pareto front into **k=3** groups — one for each operator scenario
- Computes the centroid (average CPP settings) of each cluster as the "Golden Recipe"
- Identifies the top-5 historical batches closest to each centroid (used by DTW module)
- **Output:** `data/golden/cluster_centroids.json`, `data/golden/cluster_batch_map.json`

### Three Golden Scenarios

| Cluster | Name | Prioritizes |
|---|---|---|
| 0 | Max Quality Golden | Best Hardness + Dissolution Rate |
| 1 | Deep Decarbonization Golden | Lowest CO2 emissions |
| 2 | Balanced Operational Golden | Quality + energy balanced |

---

## 7. Module 1 — DTW Golden Envelope

Located in `src/optimization/dtw_envelope.py` and `src/signatures/comparator.py`.

### The Problem with Flat Thresholds
Traditional systems check one number: "golden batch used 13 kN, yours used 10.5 kN — that's different." This misses the entire temporal shape of the process. A batch that peaks 5 minutes late but within normal range would falsely alarm under a flat comparison.

### Dynamic Time Warping (DTW)
DTW compares two time-series signals by allowing time-shifts when finding the best alignment. It recognizes that the same process running slightly faster or slower is still the same process. This makes the comparison robust to natural timing variation between batches.

### Building the Envelope (`dtw_envelope.py`)
For each **cluster × phase × sensor** combination:
1. Take the top-5 historical batches for that cluster (from `cluster_batch_map.json`)
2. Use **DBA (DTW Barycentric Averaging)** to compute a single mean trajectory aligned across all 5 batches
3. Compute standard deviation at each time point across the 5 batch signals
4. Build bounds: `upper = mean + 3×std`, `lower = mean − 3×std`

This produces **45 envelopes** (3 clusters × 5 phases × 3 sensors per phase). The ±3σ band covers 99.7% of normal process variation.

**Output:** `data/golden/golden_envelopes.json`

### Real-Time Drift Detection (`comparator.py`)
Every minute during a live batch:
1. Read latest sensor value and look up the golden envelope for that cluster/phase/sensor at that time point
2. Compute **Soft-DTW distance** — how different is the current signal shape from the golden mean overall?
3. Compute **`percent_outside`** — what percentage of time points so far are outside the ±3σ band?
4. Set alarm level:

| Alarm | Trigger | System Response |
|---|---|---|
| ✅ OK | ≤20% of readings outside band | Monitor only |
| ⚠️ WARNING | 20–50% outside | Generate causal recommendations |
| 🔴 CRITICAL | >50% outside | Immediate intervention recommended |

---

## 8. Module 2 — Causal Counterfactual Engine

Located in `src/causal/`.

### Why Causation, Not Correlation?
Correlation says "batches with high Compression Force tend to have high Hardness." Causation says "if we physically increase Compression Force in this batch by 5%, Hardness will increase by X and CO2 will increase by Y." Only causal reasoning is safe to act on in manufacturing — acting on a spurious correlation can make things worse.

### Component 1 — The Causal DAG (`dag_definition.py`)
Encodes pharmaceutical manufacturing physics as a directed acyclic graph using NetworkX. Key causal pathways:

```
Compression_Force ──► Hardness (↑)
Compression_Force ──► Dissolution_Rate (↓)
Compression_Force ──► total_energy_kWh (↑)
Drying_Temp       ──► Moisture_Content (↓)
Moisture_Content  ──► Friability (↑)
Moisture_Content  ──► Disintegration_Time (↑)
Binder_Amount     ──► Hardness (↑)
Machine_Speed     ──► Content_Uniformity
total_energy_kWh  ──► total_CO2e_kg
```

The system asserts acyclicity before every use — no circular logic is ever allowed in the causal structure.

### Component 2 — SCM Training (`causal_model.py`)
- Fits **6 independent DoWhy Structural Causal Models** — one for each CQA target
- Uses `backdoor.linear_regression` identification strategy, controlling for confounders via the DAG structure
- Learns quantified causal coefficients from the 60-batch dataset (e.g., "1 kN increase in Compression Force causally produces +8.3 N Hardness")
- **Output:** 6 `.pkl` model files in `models/` — loaded at API startup

### Component 3 — Intervention Engine (`interventions.py`)
Triggered at WARNING alarm:

1. **Generate 32 candidates** — nudge each of 8 CPPs by ±5% and ±10%
2. **Estimate ATE (Average Treatment Effect)** for each candidate across all 6 causal models
3. **Safety filter** — apply resulting predicted values to PHARMA_LIMITS; any violation → `safety_check = FAIL`, candidate discarded
4. **Score and rank** remaining safe candidates by the selected cluster scenario
5. **Return top-2** as:
   - **Pathway A — "Yield Guard"**: maximizes quality metrics
   - **Pathway B — "Carbon Savior"**: maximizes energy reduction while maintaining quality

Every recommendation includes: which parameter, by how much, predicted causal effect on all 6 CQAs, expected CO2 change, and safety check status.

---

## 9. Module 3 — Bayesian HITL Preference Learning

Located in `src/hitl/`.

### The Core Idea
Different operators have different priorities. One operator always picks quality. Another always picks sustainability. A static system treats them identically. CB-MOPA watches which type of recommendation each operator accepts and gradually learns their implicit preference — without any configuration or dropdown menus.

### How It Works (`preference_model.py`)

**Step 1 — Encode each pathway as a feature vector:**
Every recommendation is converted into a 12-number vector:
- 8 numbers: the delta% change for each CPP
- 4 numbers: expected change in Hardness, Dissolution Rate, Friability, CO2

**Step 2 — Record pairwise comparisons:**
When an operator chooses Pathway A over B, the system records: "feature_vector_A was preferred over feature_vector_B."

**Step 3 — Fit the Gaussian Process:**
BoTorch's `PairwiseGP` with `PairwiseLaplaceMarginalLogLikelihood` learns a latent utility function — a mathematical score for how much this specific operator would like any given pathway.

**Step 4 — Re-rank future recommendations:**
`predict_utility()` scores both pathways before presenting them. The one with higher utility becomes Pathway A (the primary recommendation).

**Cold Start Phase:**
The GP needs at least 3 operator decisions to activate. During the first 2 decisions, `predict_utility()` returns 0.5 (equal) for all pathways — the system is honest about not having learned anything yet.

### Persistence (`decision_store.py`)
Every decision is saved to the `OperatorDecision` table in SQLite:
- `batch_id`, `pathway_a`, `pathway_b`, `chosen` (A / B / MODIFIED / REJECTED)
- `modified_params` — if operator customized the recommendation
- `operator_id`, `timestamp`

When the batch completes, actual CQA outcomes are saved to `OperatorOutcome` — closing the feedback loop and enabling the system to verify whether accepted interventions actually improved the batch.

**GP state** is saved to `models/botorch_gp_state.pt` and restored on restart.

---

## 10. Golden Signature System

Located in `src/signatures/signature_manager.py` and `src/signatures/database.py`.

### What Is a Golden Signature?
A golden signature is the best-known recipe for a specific operational scenario. It contains:
- Optimal CPP settings (how to run the batch)
- Predicted CQA outcomes (what quality to expect)
- Version number and source (Pareto-derived or batch-updated)

There are **3 golden signatures** — one per cluster — stored in the `GoldenSignature` table in `signatures.db`.

### Auto-Update Logic — `dominates()`
Every time a batch completes and final CQA values are submitted, the system runs `dominates()`:

A new batch **dominates** the current golden signature if:
- Its Hardness ≥ current golden's Hardness
- Its Friability ≤ current golden's Friability
- Its Dissolution Rate ≥ current golden's Dissolution Rate
- Its Disintegration Time ≤ current golden's Disintegration Time
- Its CO2e ≤ current golden's CO2e
- **AND at least one of the above is strictly better** (not just equal)

If the new batch dominates:
- Old signature → `is_active = False` (archived, never deleted)
- New signature created: `version = old_version + 1`, `parent_id = old_id`, `trigger_batch_id` recorded
- `SignatureUpdate` audit record created with before/after CQA values

### Full Audit Trail
Every version of every signature is kept permanently. The history is visible in the dashboard as a timeline: Version 1 (from Pareto) → Version 2 (batch T039 improved Hardness) → Version 3 (batch T051 improved CO2e and Dissolution Rate).

---

## 11. Carbon Tracker

Located in `src/carbon/carbon_tracker.py`.

### CO2e Calculation
```
total_CO2e_kg = total_energy_kWh × grid_emission_factor
```

The `grid_emission_factor` is **time-of-day aware**:
- Day shift: `0.72 kg CO2/kWh` (grid draws more from fossil fuels)
- Night shift: `0.45 kg CO2/kWh` (more renewables online)

Operators can set the current shift's emission factor dynamically for accurate accounting.

### Phase Attribution
Carbon is attributed to each manufacturing phase based on that phase's energy consumption. For T001:
- Compression: ~38.69 kWh → ~50% of total batch CO2e
- Drying, Milling, Coating follow in descending order
- Compression is the primary target for energy reduction efforts

### Adaptive Targets
The CO2e target per batch adjusts automatically based on recent performance:

| Condition | Action |
|---|---|
| Last 5 batches all beat target by >15% | Tighten target by 5% |
| Any of last 5 batches exceeded target | Loosen target by 2% |

Every target change is logged to `data/golden/targets.json` with timestamp and reason — full audit trail for regulatory reporting.

The regulatory hard limit is `50.0 kg CO2e per batch` (defined in `CARBON_CONFIG` in `constraints.py`).

---

## 12. FastAPI Backend

Located in `api/`. Entry point: `api/main.py`. Runs on port `8000`.

### Endpoints

| Method | Endpoint | Does |
|---|---|---|
| `GET` | `/health` | API + database connectivity check |
| `POST` | `/api/batch/drift-check` | Takes live CPP values + cluster, runs Soft-DTW, returns alarm level |
| `POST` | `/api/batch/complete` | Submits final CQA outcomes, triggers signature update check + carbon log |
| `GET` | `/api/recommendations/{batch_id}/{cluster}` | Returns Pathway A + B ranked by GP preference model |
| `POST` | `/api/decisions` | Logs operator choice, updates BoTorch GP, returns re-ranked recommendations |
| `GET` | `/api/signatures/{cluster}` | Returns current active golden signature |
| `GET` | `/api/signatures/{cluster}/history` | Returns all versions of a golden signature |
| `GET` | `/api/carbon/targets` | Returns current targets, rolling averages |
| `GET` | `/api/preferences/summary` | Returns operator preference stats (A vs B count, GP state) |

All request/response shapes are defined with Pydantic v2 in `api/schemas.py`.

Interactive API docs available at `http://localhost:8000/docs` (Swagger UI) after starting the server.

---

## 13. Streamlit Dashboard

Located in `dashboard/`. Entry point: `dashboard/app.py`. Runs on port `8501`.

### Page 1 — Live Batch vs Golden Envelope (`1_Live_Batch.py`)
- **Shaded blue band**: the ±3σ safe zone (DTW envelope bounds)
- **Solid blue line**: DBA mean golden trajectory
- **Orange line**: current batch's actual sensor readings
- **Alarm banner**: green (OK) / orange (WARNING) / red (CRITICAL)
- **Radar chart**: parameter deviations from golden centroid
- **Phase energy bar chart**: current vs golden batch energy per phase

### Page 2 — Causal Recommendations & HITL (`2_Causal_Recommendations.py`)
- **Left card — Pathway A "Yield Guard"**: best quality intervention
- **Right card — Pathway B "Carbon Savior"**: best energy-saving intervention
- Each card shows: which parameter, by how much, causal effect on all CQAs, CO2 impact, safety check badge
- **Three buttons**: Execute Pathway A / Execute Pathway B / Modify & Execute
- On click: decision logged → GP updated → message shows preference shift → updated recommendations appear

### Page 3 — Golden Signatures Explorer (`3_Golden_Signatures.py`)
- **3D Pareto front scatter**: trade-off surface, colored by cluster
- **3 Golden Cluster cards**: current CPP recipe + predicted outcomes per scenario
- **Signature version history timeline**: full evolution of each golden signature
- **Self-update log table**: all automatic updates with before/after values
- **Simulate new batch**: input CPP values, see instantly whether it would update the signature

### Page 4 — Carbon Targets (`4_Carbon_Targets.py`)
- **3 KPI metric cards**: Current Batch CO2e, 5-Batch Rolling Average, % vs Target
- **Carbon gauge**: speedometer-style (green = under target, amber = approaching, red = exceeded)
- **Rolling trend chart**: last 20 batches with target line and regulatory limit line
- **Phase attribution donut chart**: which phases consume which share of total CO2
- **Dynamic target slider**: adjust reduction target % and see updated CO2 ceiling
- **Regulatory compliance table**: all CQA values color-coded (green/red pass/fail)

---

## 14. Project Structure

```
cb_mopa/
│
├── constraints.py              # Central config: PHARMA_LIMITS, CARBON_CONFIG,
│                               # CPP_COLS, CQA_COLS, PHASE_ORDER, validate_batch()
├── demo_script.py              # Pre-demo validation + click-by-click demo flow
├── requirements.txt            # All Python dependencies with pinned versions
├── start.bat                   # Windows: start API + dashboard together
├── start.sh                    # Linux/Mac: start API + dashboard together
│
├── data/
│   ├── raw/                    # Place Excel source files here
│   │   ├── _h_batch_production_data.xlsx
│   │   └── _h_batch_process_data.xlsx
│   ├── processed/
│   │   ├── batch_outcomes.csv          # 60 rows with Reg_Pass column
│   │   ├── master_dataset.csv          # 60 × ~55 cols — single source of truth
│   │   ├── trajectory_summary.json     # Per-batch: total minutes, phases, energy
│   │   └── batch_trajectories/
│   │       ├── T001.csv                # Minute-by-minute sensor + Energy_kWh
│   │       └── ... T060.csv
│   └── golden/
│       ├── pareto_front.csv            # NSGA-II non-dominated solutions
│       ├── cluster_centroids.json      # 3 golden recipes (CPP settings)
│       ├── cluster_batch_map.json      # Top-5 batch IDs per cluster
│       ├── golden_envelopes.json       # 45 DTW ±3σ envelopes
│       ├── signatures.db               # SQLite: signatures, decisions, outcomes
│       ├── targets.json                # Carbon target history
│       └── causal_dag.png              # DAG visualization
│
├── models/
│   ├── causal_*.pkl                    # 6 DoWhy SCM model files (one per CQA)
│   └── botorch_gp_state.pt             # BoTorch GP operator preference state
│
├── src/
│   ├── data/
│   │   ├── loader.py                   # Loads summary sheet, tags Reg_Pass
│   │   ├── trajectory_parser.py        # Parses sensor sheets, adds Energy_kWh
│   │   └── feature_engineer.py         # Phase energy features → master_dataset.csv
│   ├── optimization/
│   │   ├── pareto.py                   # NSGA-II with XGBoost surrogate
│   │   ├── clustering.py               # K-Means (k=3) on Pareto front
│   │   └── dtw_envelope.py             # DBA mean trajectories + ±3σ envelopes
│   ├── signatures/
│   │   ├── database.py                 # SQLAlchemy models + init_db() + seed_signatures()
│   │   ├── comparator.py               # Real-time Soft-DTW drift detection
│   │   └── signature_manager.py        # dominates() check + auto-update + version history
│   ├── causal/
│   │   ├── dag_definition.py           # NetworkX DAG encoding pharma causality
│   │   ├── causal_model.py             # DoWhy SCM training × 6
│   │   └── interventions.py            # ATE estimation + safety filter + Pathway A/B
│   ├── carbon/
│   │   └── carbon_tracker.py           # CO2e calculation + adaptive target logic
│   └── hitl/
│       ├── decision_store.py           # OperatorDecision + OperatorOutcome tables
│       ├── preference_model.py         # BoTorch PairwiseGP encode/fit/predict
│       └── feedback_handler.py         # Orchestrates: log → GP update → save → return
│
├── api/
│   ├── main.py                         # FastAPI app + CORS + router registration
│   ├── schemas.py                      # Pydantic v2 request/response models
│   └── routers/
│       ├── batch.py                    # POST /drift-check, POST /complete
│       ├── recommendations.py          # GET /{batch_id}/{cluster}
│       ├── decisions.py                # POST / (log operator choice)
│       ├── signatures.py               # GET /{cluster}, GET /{cluster}/history
│       ├── carbon.py                   # GET /targets
│       ├── preferences.py              # GET /summary
│       └── data.py                     # Data access utilities
│
├── dashboard/
│   ├── app.py                          # Streamlit home page + system status
│   ├── utils.py                        # api_get() / api_post() helpers
│   └── pages/
│       ├── 1_Live_Batch.py             # DTW envelope chart, drift alarm, radar
│       ├── 2_Causal_Recommendations.py # Pathway A/B cards + HITL buttons
│       ├── 3_Golden_Signatures.py      # 3D Pareto scatter + version history
│       └── 4_Carbon_Targets.py         # CO2 gauge + trend + adaptive slider
│
├── tests/
│   └── test_pipeline.py                # 7 integration tests covering full pipeline
│
└── web/                                # Optional Vite/JS frontend (served by FastAPI)
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── api.js
        ├── main.js
        ├── router.js
        └── components/ / pages/
```

---

## 15. Setup & Installation

### Prerequisites
- Python 3.10 or higher
- pip
- The two source Excel files (`_h_batch_production_data.xlsx` and `_h_batch_process_data.xlsx`) placed in `data/raw/`

### Install Dependencies

```bash
pip install -r requirements.txt
```

> **Note on PyTorch:** `requirements.txt` installs CPU-only PyTorch. For GPU support, replace `torch==2.1.0` with your CUDA-specific build from [pytorch.org](https://pytorch.org/get-started/locally/).

### Build the Data Pipeline

Run each step in order from the project root:

```bash
# Step 1: Load and validate batch production data
python -m src.data.loader

# Step 2: Parse minute-by-minute sensor trajectories
python -m src.data.trajectory_parser

# Step 3: Engineer features and build master dataset
python -m src.data.feature_engineer
```

### Run Pareto Optimization and Build Golden Artifacts

```bash
# NSGA-II Pareto optimization
python -m src.optimization.pareto

# K-Means clustering of Pareto front
python -m src.optimization.clustering

# Build DTW ±3σ golden envelopes
python -m src.optimization.dtw_envelope
```

### Train Causal Models

```bash
python -m src.causal.causal_model
```

This trains 6 DoWhy SCMs and saves them as `.pkl` files in `models/`.

### Initialize the Database

```bash
python -m src.signatures.database
```

Seeds the SQLite database with initial golden signatures derived from the Pareto optimization results.

---

## 16. Running the System

### Option A — Start Script (Recommended)

**Windows:**
```bat
start.bat
```

**Linux / Mac:**
```bash
chmod +x start.sh
./start.sh
```

This starts both the API and dashboard in parallel.

### Option B — Start Manually (Two Terminals)

**Terminal 1 — FastAPI Backend:**
```bash
uvicorn api.main:app --port 8000 --reload
```

**Terminal 2 — Streamlit Dashboard:**
```bash
streamlit run dashboard/app.py --server.port 8501
```

### Access Points

| Service | URL |
|---|---|
| Dashboard | http://localhost:8501 |
| API (Swagger docs) | http://localhost:8000/docs |
| API (health check) | http://localhost:8000/health |

---

## 17. Running Tests

```bash
pytest tests/test_pipeline.py -v
```

The test suite covers 7 integration tests across the full pipeline:
- Data loading and validation
- Trajectory parsing and energy calculation
- Pareto optimization output format
- DTW envelope shape and bounds
- Causal model ATE estimation
- Intervention safety filtering
- Signature dominance logic

### Pre-Demo Validation

Before any demo or presentation, run:

```bash
python demo_script.py
```

This performs a full system health check: verifies all data files exist, checks all 6 causal PKL models are present, validates the BoTorch GP state file, and runs a quick smoke test of the API endpoints.

---

## 18. Key Configuration

All system-wide constants are defined in `constraints.py`. Do not hardcode values anywhere else.

### Pharmaceutical Regulatory Limits (`PHARMA_LIMITS`)

| Quality Attribute | Limit |
|---|---|
| Friability | ≤ 1.0% |
| Dissolution Rate | ≥ 80% |
| Content Uniformity | 95–105% |
| Hardness | ≥ 60 N |
| Disintegration Time | ≤ 15 min |
| Tablet Weight | 197–215 mg |

### Carbon Configuration (`CARBON_CONFIG`)

| Setting | Value |
|---|---|
| Grid emission factor (day) | 0.72 kg CO2/kWh |
| Regulatory hard limit | 50.0 kg CO2e per batch |
| Default reduction target | 10% |

### Night Shift Emission Factor
The night shift factor (`0.45 kg CO2/kWh`) is set dynamically via the Dashboard or API — it is not hardcoded, since actual shift schedules vary.

### CPP and CQA Column Lists
`CPP_COLS` and `CQA_COLS` in `constraints.py` are the authoritative lists used across the data pipeline, causal models, and API schemas. Any new parameter must be added here first.

---

## 19. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Data processing | `pandas 2.1.4`, `numpy 1.24.4`, `openpyxl 3.1.2` | Load, clean, engineer features from Excel |
| Optimization | `pymoo 0.6.0` | NSGA-II multi-objective genetic algorithm |
| Machine learning | `xgboost 2.0.0`, `scikit-learn 1.3.2` | Surrogate model for Pareto optimization |
| Time-series | `tslearn 0.6.2` | DTW Barycentric Averaging (DBA) for golden envelopes |
| Causal inference | `dowhy 0.11.1`, `networkx 3.1` | DAG definition, SCM training, ATE estimation |
| Bayesian learning | `torch 2.1.0`, `gpytorch 1.11`, `botorch 0.9.4` | PairwiseGP operator preference model |
| API backend | `fastapi 0.104.1`, `uvicorn 0.24.0`, `pydantic 2.4.2` | REST API with async support |
| Database | `sqlalchemy 2.0.23` + SQLite | Signatures, decisions, outcomes persistence |
| Dashboard | `streamlit 1.28.2`, `plotly 5.17.0` | 4-page interactive visualization |
| HTTP client | `httpx 0.25.2` | Async HTTP calls (dashboard ↔ API) |
| Testing | `pytest 7.4.3` | Integration test suite |

---

## The System in One Paragraph

CB-MOPA takes two Excel files — 60 batches of pharmaceutical tablet manufacturing data — and builds a complete intelligent manufacturing system. The data pipeline cleans and enriches the raw data into a master dataset. NSGA-II finds the mathematically optimal trade-off recipes between quality and carbon emissions, clustered into 3 operational scenarios. Module 1 builds probabilistic DTW sensor envelopes from golden batches and detects drift in real-time. Module 2 uses a pharmaceutical-domain causal DAG and DoWhy's Do-calculus to generate safe, causally-justified process interventions. Module 3 uses BoTorch's PairwiseGP to learn operator preferences from accept/reject choices and re-ranks future recommendations accordingly. Golden signatures self-update when new batches outperform the current benchmarks, and carbon targets adapt dynamically based on rolling performance. Everything is exposed through a FastAPI backend and a 4-page Streamlit dashboard. The system moves the factory from reactive batch failure — 16 out of 60 batches (26.7%) failing — to proactive, causal, learning-enabled batch optimization.
