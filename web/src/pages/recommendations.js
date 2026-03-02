/**
 * Causal Recommendations Page — dual pathway cards, HITL decision loop.
 */
import { api } from '../api.js';
import { renderSidebar, state } from '../components/sidebar.js';
import { plotChart, COLORS } from '../components/charts.js';

const MOCK_A = {
    pathway_name: 'Yield Guard', param_changes: [{ param: 'Drying_Temp', old_value: 60, new_value: 54, delta_pct: -10 }],
    expected_cqa_delta: { Hardness: 0.08, Friability: -0.10, Dissolution_Rate: 0.03, Disintegration_Time: -1.08, Content_Uniformity: 0.02, total_CO2e_kg: -0.14 },
    expected_co2_change: -0.14, safety_check: 'PASS', causal_confidence: 0.82, preference_utility: 0.42,
};
const MOCK_B = {
    pathway_name: 'Carbon Savior', param_changes: [{ param: 'Machine_Speed', old_value: 150, new_value: 135, delta_pct: -10 }],
    expected_cqa_delta: { Hardness: 0.02, Friability: -0.03, Dissolution_Rate: 0.01, Disintegration_Time: -0.50, Content_Uniformity: -0.08, total_CO2e_kg: -0.25 },
    expected_co2_change: -0.25, safety_check: 'PASS', causal_confidence: 0.78, preference_utility: -0.69,
};

export async function renderRecommendations(main) {
    renderSidebar({ showEmissionFactor: false, onChange: () => renderRecommendations(main) });

    // Load batch data for CQA summary
    let batchData = {};
    let constraints = {};
    try {
        const stats = await api.masterStats();
        batchData = stats.batch_data?.[state.batchId] || stats.batch_data?.[stats.batch_ids[0]] || {};
        constraints = await api.constraints();
    } catch { /* use empty */ }

    const cqaCols = constraints.CQA_COLS || ['Hardness', 'Friability', 'Dissolution_Rate', 'Disintegration_Time', 'Content_Uniformity', 'Tablet_Weight'];
    const limits = constraints.PHARMA_LIMITS || {};

    // CQA metric cards
    const cqaCards = cqaCols.map(cqa => {
        const val = batchData[cqa] ?? 0;
        const lim = limits[cqa] || {};
        let ok = true, targetStr = '';
        if (lim.min !== undefined && lim.max !== undefined) { ok = val >= lim.min && val <= lim.max; targetStr = `[${lim.min}, ${lim.max}]`; }
        else if (lim.min !== undefined) { ok = val >= lim.min; targetStr = `≥ ${lim.min}`; }
        else if (lim.max !== undefined) { ok = val <= lim.max; targetStr = `≤ ${lim.max}`; }
        return `<div class="metric-card">
      <div class="metric-value" style="font-size:1.4rem;color:${ok ? 'var(--accent-green)' : 'var(--accent-red)'}">${val.toFixed(2)}</div>
      <p class="metric-label">${cqa.replace(/_/g, ' ')}</p>
      <div class="metric-delta neutral">Target: ${targetStr}</div>
    </div>`;
    }).join('');

    // Fetch recommendations
    let pathwayA = null, pathwayB = null;
    let fallback = false;
    try {
        const rec = await api.recommendations(state.batchId, state.cluster);
        pathwayA = rec.pathway_a;
        pathwayB = rec.pathway_b;
    } catch { /* api down */ }
    if (!pathwayA) {
        fallback = true;
        pathwayA = MOCK_A;
        pathwayB = MOCK_B;
    }

    main.innerHTML = `
    <div class="page-header">
      <h1>Causal Recommendation Engine</h1>
      <p>Do-calculus structural causal models estimate the causal effect of each process parameter change.
      The BoTorch PairwiseGP re-ranks recommendations by your historical preferences.</p>
    </div>

    <h2 class="section-title">Current Batch: ${state.batchId}</h2>
    <div class="grid-3" style="margin-bottom:1.5rem">${cqaCards}</div>

    <hr class="divider" />

    <h2 class="section-title">Dual-Pathway Recommendations</h2>
    ${fallback ? '<div class="alert alert-warn">API unavailable — showing demo recommendations</div>' : ''}
    <div class="grid-2" style="margin-bottom:1.5rem">
      <div class="pathway-card pathway-a" id="card-a"></div>
      <div class="pathway-card pathway-b" id="card-b"></div>
    </div>

    <hr class="divider" />

    <h2 class="section-title">Operator Decision</h2>
    <div class="grid-3" style="margin-bottom:1rem">
      <button class="btn btn-success btn-full" id="btn-exec-a">Execute Pathway A (${pathwayA.pathway_name})</button>
      <button class="btn btn-primary btn-full" id="btn-exec-b">Execute Pathway B (${pathwayB?.pathway_name || 'B'})</button>
      <button class="btn btn-outline btn-full" id="btn-modify">Modify & Execute</button>
    </div>
    <div id="decision-result"></div>
    <div id="modify-form" style="display:none"></div>

    <hr class="divider" />

    <h2 class="section-title">Operator Preference History</h2>
    <div class="grid-2">
      <div id="pref-chart" class="chart-container" style="height:300px"></div>
      <div id="pref-stats"></div>
    </div>
    <div id="decision-history"></div>
  `;

    renderPathwayCard('card-a', pathwayA, 'impact-a');
    if (pathwayB) renderPathwayCard('card-b', pathwayB, 'impact-b');

    // Buttons
    document.getElementById('btn-exec-a').addEventListener('click', () => logDecision(pathwayA, pathwayB, 'A'));
    document.getElementById('btn-exec-b').addEventListener('click', () => logDecision(pathwayA, pathwayB, 'B'));
    document.getElementById('btn-modify').addEventListener('click', () => showModifyForm(pathwayA, pathwayB, constraints.CPP_COLS || []));

    loadPreferences();
}

function renderPathwayCard(containerId, pw, chartId) {
    const el = document.getElementById(containerId);
    const changes = pw.param_changes || [];
    const cqaDelta = pw.expected_cqa_delta || {};
    const safety = pw.safety_check || 'UNKNOWN';
    const confidence = pw.causal_confidence || 0.8;
    const utility = pw.preference_utility ?? 0;

    const changeRows = changes.map(c =>
        `<tr><td>${c.param}</td><td>${c.old_value}</td><td>${c.new_value}</td><td>${c.delta_pct > 0 ? '+' : ''}${c.delta_pct.toFixed(1)}%</td></tr>`
    ).join('');

    el.innerHTML = `
    <h3>${pw.pathway_name}</h3>
    <div class="subtitle">GP Utility Score: ${utility.toFixed(3)}</div>
    ${changes.length ? `<table class="data-table" style="margin-bottom:1rem">
      <thead><tr><th>Param</th><th>Old</th><th>New</th><th>Change</th></tr></thead>
      <tbody>${changeRows}</tbody>
    </table>` : ''}
    <div id="${chartId}" style="height:200px;margin-bottom:1rem"></div>
    <div style="display:flex;gap:1rem;flex-wrap:wrap">
      <div class="metric-card" style="flex:1;min-width:80px"><div class="metric-value" style="font-size:1.1rem">${pw.expected_co2_change > 0 ? '+' : ''}${pw.expected_co2_change.toFixed(4)} kg</div><p class="metric-label">CO₂e Change</p></div>
      <div class="metric-card" style="flex:1;min-width:80px"><div class="metric-value" style="font-size:1.1rem">${(confidence * 100).toFixed(0)}%</div><p class="metric-label">Confidence</p></div>
      <div class="metric-card" style="flex:1;min-width:80px"><div class="metric-value" style="font-size:1.1rem;color:${safety === 'PASS' ? 'var(--accent-green)' : 'var(--accent-red)'}">${safety}</div><p class="metric-label">Safety</p></div>
    </div>
  `;

    // CQA impact chart
    const outcomes = Object.keys(cqaDelta);
    const deltas = Object.values(cqaDelta);
    const colors = deltas.map(d => d > 0 ? COLORS.green : d < 0 ? COLORS.red : COLORS.muted);
    plotChart(chartId, [{
        x: deltas, y: outcomes.map(o => o.replace(/_/g, ' ')), type: 'bar', orientation: 'h',
        marker: { color: colors }, text: deltas.map(d => `${d > 0 ? '+' : ''}${d.toFixed(4)}`), textposition: 'outside',
    }], {
        title: 'Expected CQA Impact', height: 200, margin: { l: 120, r: 60, t: 35, b: 20 }, xaxis: { title: 'Delta' }, font: { size: 11 },
    });
}

async function logDecision(pwA, pwB, chosen, modified = null, reason = '') {
    const resultEl = document.getElementById('decision-result');
    try {
        const res = await api.logDecision({
            batch_id: state.batchId,
            pathway_a: pwA, pathway_b: pwB,
            chosen, modified_params: modified, reason, target_config: state.cluster,
        });
        if (res) {
            const total = res.total_comparisons || 0;
            resultEl.innerHTML = `<div class="alert alert-ok">Decision logged. ${res.preference_model_updated ? 'Preference model updated.' : 'Recorded.'} (${total}/3 comparisons)</div>`;
        }
    } catch (e) {
        resultEl.innerHTML = `<div class="alert alert-crit">Failed: ${e.message}</div>`;
    }
}

function showModifyForm(pwA, pwB, cppCols) {
    const form = document.getElementById('modify-form');
    form.style.display = 'block';
    form.innerHTML = `
    <h3 style="margin-bottom:1rem">Custom Parameter Adjustments</h3>
    <div class="form-grid">${cppCols.map(cpp =>
        `<div class="form-group">
        <label>${cpp.replace(/_/g, ' ')} Δ%</label>
        <input type="number" id="mod-${cpp}" value="0" min="-20" max="20" step="1"
               style="width:100%;padding:6px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary)" />
      </div>`
    ).join('')}</div>
    <div class="form-group" style="margin-bottom:1rem">
      <label>Reason</label>
      <input type="text" id="mod-reason" placeholder="Reason for modification"
             style="width:100%;padding:8px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary)" />
    </div>
    <button class="btn btn-primary" id="btn-submit-mod">Submit Modified Decision</button>
  `;
    document.getElementById('btn-submit-mod').addEventListener('click', () => {
        const mods = {};
        cppCols.forEach(cpp => {
            const v = parseFloat(document.getElementById(`mod-${cpp}`).value) || 0;
            if (v !== 0) mods[cpp] = v;
        });
        const reason = document.getElementById('mod-reason').value;
        logDecision(pwA, pwB, 'MODIFIED', mods, reason);
        form.style.display = 'none';
    });
}

async function loadPreferences() {
    try {
        const pref = await api.preferenceSummary();
        if (!pref) return;

        const qualityCnt = pref.quality_preferred_count || 0;
        const carbonCnt = pref.carbon_preferred_count || 0;

        plotChart('pref-chart', [
            { x: ['Yield Guard\n(Quality)'], y: [qualityCnt], type: 'bar', marker: { color: COLORS.green }, text: [String(qualityCnt)], textposition: 'outside', name: 'Quality' },
            { x: ['Carbon Savior\n(Decarb)'], y: [carbonCnt], type: 'bar', marker: { color: COLORS.blue }, text: [String(carbonCnt)], textposition: 'outside', name: 'Carbon' },
        ], {
            title: 'Pathway Preference Distribution', yaxis: { title: 'Times Chosen' }, height: 300, showlegend: false,
        });

        const status = pref.status === 'active' ? '<span class="badge badge-pass">PairwiseGP Active</span>' : '<span class="badge badge-warn">Cold Start</span>';
        document.getElementById('pref-stats').innerHTML = `
      <h3 style="margin-bottom:1rem">Model Status</h3>
      <div style="margin-bottom:1rem">${status}</div>
      <div class="metric-card" style="margin-bottom:0.8rem"><div class="metric-value">${pref.total_decisions}</div><p class="metric-label">Total Decisions</p></div>
      <div class="metric-card" style="margin-bottom:0.8rem"><div class="metric-value">${pref.comparisons_count}</div><p class="metric-label">Comparisons</p></div>
      <div class="metric-card"><div class="metric-value">${(pref.quality_preference_pct || 0).toFixed(0)}%</div><p class="metric-label">Quality Preference</p></div>
    `;
    } catch { /* ignore */ }

    // Decision history
    try {
        const history = await api.decisionHistory(10);
        if (history && history.length) {
            const rows = history.map(h => `<tr><td>${h.batch_id || ''}</td><td>${h.chosen_pathway || ''}</td><td>${h.target_config || ''}</td><td>${(h.timestamp || '').slice(0, 19)}</td></tr>`).join('');
            document.getElementById('decision-history').innerHTML = `
        <h3 style="margin:1rem 0 0.5rem">Recent Decision Log</h3>
        <table class="data-table"><thead><tr><th>Batch</th><th>Chosen</th><th>Config</th><th>Time</th></tr></thead><tbody>${rows}</tbody></table>
      `;
        }
    } catch { /* ignore */ }
}
