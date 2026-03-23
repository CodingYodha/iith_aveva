/**
 * db.js — Supabase data layer for CB-MOPA Track B.
 * Pushes all agent results, decisions, carbon reports,
 * signature proposals, and simulation data to Supabase.
 *
 * All methods are fire-and-forget (non-blocking).
 * If Supabase is unavailable, errors are logged but never block the UI.
 */
import { supabase } from './supabase.js';
import { getCurrentUser } from './auth.js';

function uid() {
    const user = getCurrentUser();
    return user?.id || null;
}

/** Log errors but never throw — DB writes are non-critical */
function handleError(table, error) {
    if (error) console.warn(`[DB] ${table} insert failed:`, error.message);
}

// ─── Agent Runs ─────────────────────────────────────────────

/**
 * Save a full agent orchestration run.
 * Returns the run ID for linking child records.
 */
export async function saveAgentRun(data) {
    if (!supabase) return null;
    try {
        const { data: run, error } = await supabase
            .from('agent_runs')
            .insert({
                batch_id: data.batch_id,
                cluster_name: data.cluster_name || 'Balanced Operational Golden',
                all_clear: data.all_clear,
                pending_count: data.pending_count,
                agent_count: data.agent_results?.length || 0,
                user_id: uid(),
            })
            .select('id')
            .single();
        handleError('agent_runs', error);

        // Save individual agent results
        if (run?.id && data.agent_results) {
            const rows = data.agent_results.map(r => ({
                run_id: run.id,
                agent_name: r.agent_name,
                explanation: r.explanation,
                analysis: r.analysis,
                requires_action: r.requires_action,
                action_type: r.action_type,
                confidence: r.confidence,
            }));
            const { error: e2 } = await supabase.from('agent_results').insert(rows);
            handleError('agent_results', e2);

            // Also save specialized tables
            for (const r of data.agent_results) {
                if (r.agent_name === 'prediction') {
                    await savePredictionReport(data.batch_id, r);
                } else if (r.agent_name === 'carbon') {
                    await saveCarbonReport(data.batch_id, r);
                } else if (r.agent_name === 'golden_signature') {
                    await saveSignatureProposal(data.batch_id, r);
                }
            }
        }
        return run?.id || null;
    } catch (e) {
        console.warn('[DB] saveAgentRun error:', e.message);
        return null;
    }
}

// ─── Prediction Reports ─────────────────────────────────────

async function savePredictionReport(batchId, result) {
    if (!supabase) return;
    const a = result.analysis || {};
    const { error } = await supabase.from('prediction_reports').insert({
        batch_id: batchId,
        predictions: a.predictions || {},
        violations: a.violations || [],
        has_violations: a.has_violations || false,
        shap_summary: (a.shap_results || []).map(s => ({
            target: s.target,
            top_positive: s.top_positive,
            top_negative: s.top_negative,
            prediction: s.prediction,
        })),
        explanation: result.explanation,
        user_id: uid(),
    });
    handleError('prediction_reports', error);
}

// ─── Carbon Reports ─────────────────────────────────────────

async function saveCarbonReport(batchId, result) {
    if (!supabase) return;
    const a = result.analysis || {};
    const { error } = await supabase.from('carbon_reports').insert({
        batch_id: batchId,
        batch_co2e_kg: a.batch_co2e_kg || 0,
        phase_breakdown: a.phase_breakdown || {},
        regulatory_compliance: a.regulatory_compliance || {},
        rolling_avg_5: a.rolling_avg_5 || 0,
        trend: a.trend || 'stable',
        any_over: a.any_over || false,
        any_at_risk: a.any_at_risk || false,
        user_id: uid(),
    });
    handleError('carbon_reports', error);
}

// ─── Signature Proposals ────────────────────────────────────

async function saveSignatureProposal(batchId, result) {
    if (!supabase) return;
    const a = result.analysis || {};
    if (!a.dominates && !a.cluster_name) return; // skip empty
    const { error } = await supabase.from('signature_proposals').insert({
        batch_id: batchId,
        cluster_name: a.cluster_name || '',
        current_version: a.current_version || 0,
        dominates: a.dominates || false,
        projected_impact: a.projected_impact || {},
        confidence_score: a.confidence_score || result.confidence || 0,
        explanation: result.explanation,
        deltas: a.deltas || {},
        status: a.dominates ? 'pending' : 'no_update',
        user_id: uid(),
    });
    handleError('signature_proposals', error);
}

// ─── Operator Decisions ─────────────────────────────────────

/**
 * Save any operator decision: Accept, Modify, Reject, Acknowledge, Promote.
 */
export async function saveOperatorDecision(batchId, agentName, action, reason = '', modifiedParams = null) {
    if (!supabase) return;
    const { error } = await supabase.from('operator_decisions').insert({
        batch_id: batchId,
        agent_name: agentName,
        action,
        reason,
        modified_params: modifiedParams,
        user_id: uid(),
    });
    handleError('operator_decisions', error);
}

// ─── Simulation Runs ────────────────────────────────────────

/**
 * Start a simulation run. Returns the run ID.
 */
export async function startSimulationRun(totalBatches, speed) {
    if (!supabase) return null;
    try {
        const { data, error } = await supabase
            .from('simulation_runs')
            .insert({
                total_batches: totalBatches,
                speed_seconds: speed,
                status: 'running',
                user_id: uid(),
            })
            .select('id')
            .single();
        handleError('simulation_runs', error);
        return data?.id || null;
    } catch (e) {
        console.warn('[DB] startSimulationRun error:', e.message);
        return null;
    }
}

/**
 * Update simulation run status.
 */
export async function updateSimulationRun(runId, updates) {
    if (!supabase || !runId) return;
    const { error } = await supabase
        .from('simulation_runs')
        .update(updates)
        .eq('id', runId);
    handleError('simulation_runs', error);
}

// ─── Pathway Decisions (Simulation HITL) ────────────────────

/**
 * Save a causal pathway decision from simulation.
 */
export async function savePathwayDecision(batchId, cluster, chosen, pwA, pwB, simulationRunId = null) {
    if (!supabase) return;
    const { error } = await supabase.from('pathway_decisions').insert({
        batch_id: batchId,
        cluster_name: cluster,
        chosen_pathway: chosen,
        pathway_a: pwA,
        pathway_b: pwB,
        simulation_run_id: simulationRunId,
        user_id: uid(),
    });
    handleError('pathway_decisions', error);
}
