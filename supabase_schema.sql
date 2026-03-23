-- =============================================================
-- CB-MOPA Track B — Supabase Schema
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- =============================================================

-- 1. Agent Runs — every time agents are executed on a batch
CREATE TABLE IF NOT EXISTS agent_runs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id TEXT NOT NULL,
    cluster_name TEXT NOT NULL,
    all_clear BOOLEAN DEFAULT true,
    pending_count INTEGER DEFAULT 0,
    agent_count INTEGER DEFAULT 0,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Agent Results — individual agent output per run
CREATE TABLE IF NOT EXISTS agent_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    run_id UUID REFERENCES agent_runs(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,  -- 'prediction', 'golden_signature', 'carbon'
    explanation TEXT,
    analysis JSONB,
    requires_action BOOLEAN DEFAULT false,
    action_type TEXT,
    confidence REAL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Operator Decisions — Accept/Modify/Reject/Acknowledge
CREATE TABLE IF NOT EXISTS operator_decisions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    action TEXT NOT NULL,  -- 'accepted', 'modified', 'rejected', 'acknowledged', 'promoted'
    reason TEXT,
    modified_params JSONB,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Signature Proposals — golden signature lifecycle
CREATE TABLE IF NOT EXISTS signature_proposals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id TEXT NOT NULL,
    cluster_name TEXT NOT NULL,
    current_version INTEGER,
    dominates BOOLEAN DEFAULT false,
    projected_impact JSONB,  -- {energy_pct, yield_pct, carbon_pct}
    confidence_score REAL,
    explanation TEXT,
    deltas JSONB,
    status TEXT DEFAULT 'pending',  -- 'pending', 'accepted', 'modified', 'rejected'
    operator_response TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- 5. Carbon Reports — batch-level emissions tracking
CREATE TABLE IF NOT EXISTS carbon_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id TEXT NOT NULL,
    batch_co2e_kg REAL,
    phase_breakdown JSONB,
    regulatory_compliance JSONB,
    rolling_avg_5 REAL,
    trend TEXT,  -- 'improving', 'worsening', 'stable'
    any_over BOOLEAN DEFAULT false,
    any_at_risk BOOLEAN DEFAULT false,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Prediction Reports — SHAP-based batch predictions
CREATE TABLE IF NOT EXISTS prediction_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id TEXT NOT NULL,
    predictions JSONB,  -- {Hardness: 95.0, Friability: 0.6, ...}
    violations JSONB,   -- [{cqa, predicted, limit, severity}]
    has_violations BOOLEAN DEFAULT false,
    shap_summary JSONB, -- top drivers per CQA
    explanation TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Simulation Runs — simulation session tracking
CREATE TABLE IF NOT EXISTS simulation_runs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    total_batches INTEGER,
    batches_processed INTEGER DEFAULT 0,
    speed_seconds INTEGER DEFAULT 3,
    status TEXT DEFAULT 'running',  -- 'running', 'paused', 'completed'
    user_id UUID REFERENCES auth.users(id),
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- 8. HITL Pathway Decisions — simulation causal pathway choices
CREATE TABLE IF NOT EXISTS pathway_decisions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id TEXT NOT NULL,
    cluster_name TEXT NOT NULL,
    chosen_pathway TEXT,  -- 'A', 'B'
    pathway_a JSONB,
    pathway_b JSONB,
    simulation_run_id UUID REFERENCES simulation_runs(id),
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbon_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pathway_decisions ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users can insert and read all rows
CREATE POLICY "Users can insert" ON agent_runs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can read" ON agent_runs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert" ON agent_results FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can read" ON agent_results FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert" ON operator_decisions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can read" ON operator_decisions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert" ON signature_proposals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can read" ON signature_proposals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update" ON signature_proposals FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can insert" ON carbon_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can read" ON carbon_reports FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert" ON prediction_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can read" ON prediction_reports FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert" ON simulation_runs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can read" ON simulation_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update" ON simulation_runs FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can insert" ON pathway_decisions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can read" ON pathway_decisions FOR SELECT TO authenticated USING (true);

-- Also allow anon access for demo (remove in production)
CREATE POLICY "Anon can insert" ON agent_runs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can read" ON agent_runs FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert" ON agent_results FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can read" ON agent_results FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert" ON operator_decisions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can read" ON operator_decisions FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert" ON signature_proposals FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can read" ON signature_proposals FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can update" ON signature_proposals FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can insert" ON carbon_reports FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can read" ON carbon_reports FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert" ON prediction_reports FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can read" ON prediction_reports FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert" ON simulation_runs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can read" ON simulation_runs FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can update" ON simulation_runs FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can insert" ON pathway_decisions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can read" ON pathway_decisions FOR SELECT TO anon USING (true);
