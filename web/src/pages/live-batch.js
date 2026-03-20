/**
 * Live Batch Page — CPP sliders, drift check, envelope chart, radar, energy.
 */
import { api } from '../api.js';
import { renderSidebar, state } from '../components/sidebar.js';
import { plotChart, DARK_LAYOUT, COLORS, CLUSTER_COLORS } from '../components/charts.js';
import { trackAction } from '../lib/tracker.js';

let cachedStats = null;
let cachedCentroids = null;
let cachedEnvelopes = null;
let cachedConstraints = null;
let cachedClusterBatchMap = null;
let batchPollInterval = null;
const loadedTrajectories = {};

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

export async function renderLiveBatch(main) {
    if (batchPollInterval) clearInterval(batchPollInterval);

    renderSidebar({ showEmissionFactor: true, onChange: () => renderLiveBatch(main) });
    trackAction('page_view', { page: 'live-batch', cluster: state.cluster, batchId: state.batchId });

    main.innerHTML = `
    <div class="page-header">
      <h1>I/P Batch vs Golden Envelope</h1>
      <p id="batch-caption">Loading...</p>
    </div>

    <h2 class="section-title">Process Parameter Controls</h2>
    <div class="form-grid" id="cpp-sliders"></div>
    <div class="grid-2" style="margin-top:1rem; gap:1rem;">
      <button class="btn btn-primary btn-full" id="btn-drift">Check Drift</button>
      <button class="btn btn-warn btn-full" id="btn-advance" style="background:#eab308;color:#000;">Advance Simulation Step</button>
    </div>

    <div id="drift-result" style="margin-top:1rem"></div>
    <div id="inline-hitl-container" style="display:none; margin-top:2rem; padding:1.5rem; border:2px dashed var(--accent-orange); border-radius:8px; background:var(--bg-secondary);"></div>

    <hr class="divider" />

    <h2 class="section-title">Golden Envelope Visualization</h2>
    <div class="grid-2" style="margin-bottom:1rem">
      <div class="form-group">
        <label for="env-phase">Phase</label>
        <select id="env-phase" style="width:100%;padding:8px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary)"></select>
      </div>
      <div class="form-group">
        <label for="env-sensor">Sensor</label>
        <select id="env-sensor" style="width:100%;padding:8px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary)"></select>
      </div>
    </div>
    <div id="envelope-charts-container" style="display: flex; flex-direction: column; gap: 1rem;"></div>

    <hr class="divider" />

    <h2 class="section-title">Parameter Deviation Radar</h2>
    <div class="grid-2">
      <div id="radar-chart" class="chart-container" style="height:400px"></div>
      <div id="cpp-table-container"></div>
    </div>

    <hr class="divider" />

    <h2 class="section-title">Phase Energy Breakdown</h2>
    <div id="energy-chart" class="chart-container" style="height:350px"></div>
    <div class="grid-3" id="co2-metrics"></div>
  `;

    // Load data
    try {
        [cachedStats, cachedCentroids, cachedEnvelopes, cachedConstraints, cachedClusterBatchMap] = await Promise.all([
            cachedStats || api.masterStats(),
            cachedCentroids || api.centroids(),
            cachedEnvelopes || api.envelopes(),
            cachedConstraints || api.constraints(),
            api.clusterBatchMap() // always fetch latest on load
        ]);
    } catch (e) {
        main.innerHTML = `<div class="alert alert-crit">Failed to load data: ${e.message}</div>`;
        return;
    }

    updateCaption();
    buildCPPSliders();
    buildPhaseSelectors();
    renderEnvelopes();
    renderRadar();
    loadTrajectory();

    document.getElementById('btn-drift').addEventListener('click', runDriftCheck);
    
    document.getElementById('btn-advance').addEventListener('click', async () => {
        const btn = document.getElementById('btn-advance');
        btn.disabled = true;
        btn.textContent = 'Advancing...';
        try {
            const res = await api.advanceSimulation();
            if (res.status === 'PAUSED' || res.status === 'ADVANCED_AND_PAUSED') {
                const alertHtml = `
                    <div class="alert alert-warn" style="display:flex; justify-content:space-between; align-items:center;">
                        <span><strong>Simulation Paused:</strong> Causal Recommendation Engine Operator Decision Required.</span>
                    </div>`;
                document.getElementById('drift-result').innerHTML = alertHtml;
                renderInlineHITL();
            } else {
                document.getElementById('drift-result').innerHTML = `<div class="alert alert-ok">${res.message}</div>`;
            }
        } catch (e) {
            document.getElementById('drift-result').innerHTML = `<div class="alert alert-crit">Advance failed: ${e.message}</div>`;
        } finally {
            btn.disabled = false;
            btn.textContent = 'Advance Simulation Step';
        }
    });

    document.getElementById('env-phase').addEventListener('change', () => {
        buildSensorOptions();
        renderEnvelopes();
    });
    document.getElementById('env-sensor').addEventListener('change', renderEnvelopes);

    // Polling for UI updates (new completed batches)
    batchPollInterval = setInterval(async () => {
        try {
            cachedClusterBatchMap = await api.clusterBatchMap();
            renderEnvelopes();
            renderRadar();
        } catch (e) { console.error('Polling error', e); }
    }, 5000);
}

function updateCaption() {
    const el = document.getElementById('batch-caption');
    if (el) el.textContent = `Cluster: ${state.cluster} | Batch: ${state.batchId} | EF: ${state.emissionFactor} kg CO₂/kWh`;
}

async function renderInlineHITL() {
    const container = document.getElementById('inline-hitl-container');
    container.style.display = 'block';
    container.innerHTML = '<div class="alert alert-info">Loading causal recommendations...</div>';

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

    container.innerHTML = `
        <h3 class="section-title" style="margin-top:0;">Operator Decision Required</h3>
        ${fallback ? '<div class="alert alert-warn">API unavailable — showing demo recommendations</div>' : ''}
        <div class="grid-2" style="margin-bottom:1.5rem; gap:1.5rem;">
          <div class="pathway-card pathway-a" id="inline-card-a" style="padding:1rem;"></div>
          <div class="pathway-card pathway-b" id="inline-card-b" style="padding:1rem;"></div>
        </div>
        <div class="grid-2" style="margin-bottom:0; gap:1rem;">
          <button class="btn btn-success btn-full" id="inline-btn-exec-a">Execute ${pathwayA.pathway_name}</button>
          <button class="btn btn-primary btn-full" id="inline-btn-exec-b">Execute ${pathwayB?.pathway_name || 'B'}</button>
        </div>
    `;

    renderPathwayCardInline('inline-card-a', pathwayA, 'inline-impact-a');
    renderPathwayCardInline('inline-card-b', pathwayB, 'inline-impact-b');

    document.getElementById('inline-btn-exec-a').addEventListener('click', () => executeInlineDecision(pathwayA, pathwayB, 'A'));
    if (document.getElementById('inline-btn-exec-b')) {
        document.getElementById('inline-btn-exec-b').addEventListener('click', () => executeInlineDecision(pathwayA, pathwayB, 'B'));
    }
}

function renderPathwayCardInline(containerId, pw, chartId) {
    const el = document.getElementById(containerId);
    if(!el || !pw) return;
    const changes = pw.param_changes || [];
    const safety = pw.safety_check || 'UNKNOWN';
    const confidence = pw.causal_confidence || 0.8;
    const utility = pw.preference_utility ?? 0;

    const changeRows = changes.map(c =>
        `<tr><td>${c.param}</td><td>${c.old_value}</td><td>${c.new_value}</td><td>${c.delta_pct > 0 ? '+' : ''}${c.delta_pct.toFixed(1)}%</td></tr>`
    ).join('');

    el.innerHTML = `
        <h4 style="margin-bottom: 0.5rem">${pw.pathway_name}</h4>
        <div class="subtitle" style="margin-bottom: 0.8rem">GP Utility Score: ${utility.toFixed(3)}</div>
        ${changes.length ? `<table class="data-table" style="font-size: 0.85em; margin-bottom:1rem">
          <thead><tr><th>Param</th><th>Old</th><th>New</th><th>%</th></tr></thead>
          <tbody>${changeRows}</tbody>
        </table>` : ''}
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
          <div class="metric-card" style="padding:0.5rem;flex:1;"><div class="metric-value" style="font-size:1rem">${pw.expected_co2_change > 0 ? '+' : ''}${pw.expected_co2_change.toFixed(3)} kg</div><p class="metric-label" style="font-size:0.7em">CO₂e Delta</p></div>
          <div class="metric-card" style="padding:0.5rem;flex:1;"><div class="metric-value" style="font-size:1rem">${(confidence * 100).toFixed(0)}%</div><p class="metric-label" style="font-size:0.7em">Confidence</p></div>
          <div class="metric-card" style="padding:0.5rem;flex:1;"><div class="metric-value" style="font-size:1rem;color:${safety === 'PASS' ? 'var(--accent-green)' : 'var(--accent-red)'}">${safety}</div><p class="metric-label" style="font-size:0.7em">Safety</p></div>
        </div>
    `;
}

async function executeInlineDecision(pwA, pwB, chosen) {
    try {
        await api.logDecision({
            batch_id: state.batchId,
            pathway_a: pwA, pathway_b: pwB,
            chosen, modified_params: null, reason: '', target_config: state.cluster,
        });
        
        document.getElementById('inline-hitl-container').style.display = 'none';
        
        // Auto-advance batch number to simulate proceeding
        const prefix = state.batchId.match(/^[A-Za-z]+/)?.[0] || 'T';
        const num = parseInt(state.batchId.replace(prefix, '')) || 1;
        state.batchId = prefix + String(num + 1).padStart(3, '0');
        
        const sbBatch = document.getElementById('sb-batch');
        if(sbBatch) sbBatch.value = state.batchId;
        
        updateCaption();
        renderEnvelopes();
        renderRadar();
        loadTrajectory();
        
        document.getElementById('drift-result').innerHTML = `<div class="alert alert-ok">Decision recorded! Simulation seamlessly advanced to Batch ${state.batchId}.</div>`;
    } catch (e) {
        document.getElementById('drift-result').innerHTML = `<div class="alert alert-crit">Failed to execute decision: ${e.message}</div>`;
    }
}

function getCPPValues() {
    const vals = {};
    cachedConstraints.CPP_COLS.forEach(cpp => {
        const el = document.getElementById(`cpp-${cpp}`);
        vals[cpp] = el ? parseFloat(el.value) : 0;
    });
    return vals;
}

function buildCPPSliders() {
    const container = document.getElementById('cpp-sliders');
    const centroid = cachedCentroids[state.cluster] || {};
    const ranges = cachedStats.cpp_ranges;

    container.innerHTML = cachedConstraints.CPP_COLS.map(cpp => {
        const r = ranges[cpp] || { min: 0, max: 100, mean: 50 };
        const def = centroid[cpp] !== undefined ? centroid[cpp] : r.mean;
        const clamped = Math.max(r.min, Math.min(r.max, def));
        const step = ((r.max - r.min) / 100).toFixed(4);
        return `
      <div class="form-group">
        <label>${cpp.replace(/_/g, ' ')}</label>
        <input type="range" id="cpp-${cpp}" min="${r.min}" max="${r.max}" step="${step}" value="${clamped}" />
        <div class="range-value" id="rv-${cpp}">${clamped.toFixed(2)}</div>
      </div>
    `;
    }).join('');

    // Bind value display
    cachedConstraints.CPP_COLS.forEach(cpp => {
        const slider = document.getElementById(`cpp-${cpp}`);
        const valueEl = document.getElementById(`rv-${cpp}`);
        slider.addEventListener('input', () => {
            valueEl.textContent = parseFloat(slider.value).toFixed(2);
        });
    });
}

async function runDriftCheck() {
    const btn = document.getElementById('btn-drift');
    const resultEl = document.getElementById('drift-result');
    btn.disabled = true;
    btn.textContent = 'Running drift detection...';

    try {
        const result = await api.driftCheck({
            batch_id: state.batchId,
            cpp_params: getCPPValues(),
            cluster_name: state.cluster,
        });

        const alarm = result.overall_alarm || 'UNKNOWN';
        let cls = 'alert-info', label = alarm;
        if (alarm === 'OK') { cls = 'alert-ok'; label = 'OK — Batch within golden envelope'; }
        else if (alarm === 'WARNING') { cls = 'alert-warn'; label = 'WARNING — Partial drift detected'; }
        else { cls = 'alert-crit'; label = 'CRITICAL — Significant deviation'; }

        let detailsHtml = '';
        if (result.drift_details && result.drift_details.length) {
            detailsHtml = `
        <table class="data-table" style="margin-top:1rem">
          <thead><tr><th>Phase</th><th>Sensor</th><th>Alarm</th><th>Drift Score</th><th>% Outside</th></tr></thead>
          <tbody>${result.drift_details.map(d => `
            <tr>
              <td>${d.phase}</td>
              <td>${d.sensor}</td>
              <td><span class="badge badge-${d.alarm_level === 'OK' ? 'pass' : d.alarm_level === 'WARNING' ? 'warn' : 'fail'}">${d.alarm_level}</span></td>
              <td>${d.drift_score.toFixed(4)}</td>
              <td>${d.percent_outside.toFixed(1)}%</td>
            </tr>
          `).join('')}</tbody>
        </table>
      `;
        }

        resultEl.innerHTML = `<div class="alert ${cls}">OVERALL: ${label}</div>${detailsHtml}`;
        trackAction('drift_check', { 
            batchId: state.batchId, 
            cluster: state.cluster, 
            alarm, 
            avgDrift: result.drift_details?.length ? (result.drift_details.reduce((s, d) => s + d.drift_score, 0) / result.drift_details.length).toFixed(4) : 0,
            full_result: result 
        });
    } catch (e) {
        resultEl.innerHTML = `<div class="alert alert-crit">Drift check failed: ${e.message}</div>`;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Check Drift';
    }
}

function buildPhaseSelectors() {
    const phaseSelect = document.getElementById('env-phase');
    const phases = Object.keys(cachedConstraints.PHASE_SENSOR_MAP);
    phaseSelect.innerHTML = phases.map(p => `<option value="${p}">${p}</option>`).join('');
    buildSensorOptions();
}

function buildSensorOptions() {
    const phase = document.getElementById('env-phase').value;
    const sensorSelect = document.getElementById('env-sensor');
    const sensors = cachedConstraints.PHASE_SENSOR_MAP[phase] || [];
    sensorSelect.innerHTML = sensors.map(s => `<option value="${s}">${s}</option>`).join('');
}

async function renderEnvelopes() {
    const phase = document.getElementById('env-phase')?.value;
    const sensor = document.getElementById('env-sensor')?.value;
    if (!phase || !sensor) return;

    const clusters = cachedConstraints?.GOLDEN_CLUSTER_NAMES || Object.keys(cachedEnvelopes);
    const container = document.getElementById('envelope-charts-container');
    
    // Ensure chart divs exist
    if (!container.innerHTML.includes('envelope-chart-' + clusters[0])) {
        container.innerHTML = clusters.map(c => 
            `<div id="envelope-chart-${c}" class="chart-container" style="height:350px;"></div>`
        ).join('');
    }

    for (const cluster of clusters) {
        const envData = cachedEnvelopes?.[cluster]?.[phase]?.[sensor];
        if (!envData) {
            document.getElementById(`envelope-chart-${cluster}`).innerHTML = `<div class="alert alert-info">No envelope data for ${cluster}</div>`;
            continue;
        }

        const mean = envData.mean;
        const upper = envData.upper;
        const lower = envData.lower;
        const x = Array.from({ length: mean.length }, (_, i) => i);

        const traces = [
            { x: [...x, ...x.slice().reverse()], y: [...upper, ...lower.slice().reverse()], fill: 'toself', fillcolor: 'rgba(46,134,193,0.15)', line: { color: 'rgba(0,0,0,0)' }, name: '±3σ Envelope', hoverinfo: 'skip' },
            { x, y: mean, mode: 'lines', line: { color: COLORS.blue, width: 2, dash: 'dot' }, name: 'Golden Mean' },
            { x, y: upper, mode: 'lines', line: { color: COLORS.blue, width: 1, dash: 'dash' }, name: 'Upper +3σ', opacity: 0.6 },
            { x, y: lower, mode: 'lines', line: { color: COLORS.blue, width: 1, dash: 'dash' }, name: 'Lower -3σ', opacity: 0.6 },
        ];

        // Fetch and show actual trajectory for latest batch in this cluster
        const batches = cachedClusterBatchMap[cluster] || [];
        const latestBatchId = batches.length > 0 ? batches[batches.length - 1] : state.batchId;

        if (latestBatchId) {
            if (!loadedTrajectories[latestBatchId]) {
                try {
                    loadedTrajectories[latestBatchId] = await api.trajectory(latestBatchId);
                } catch (e) {
                    console.error('Failed to load traj for', latestBatchId);
                    loadedTrajectories[latestBatchId] = [];
                }
            }
            const traj = loadedTrajectories[latestBatchId];
            const phaseTraj = traj.filter(r => r.Phase === phase);
            const actualY = phaseTraj.map(r => r[sensor] || 0);

            if (actualY.length > 0) {
                // If the batch goes outside the envelope, we can highlight
                const outsideX = [], outsideY = [];
                actualY.forEach((v, i) => {
                    if (v < lower[i] || v > upper[i]) { outsideX.push(i); outsideY.push(v); }
                });

                traces.push({ x: Array.from({length: actualY.length}, (_, i) => i), y: actualY, mode: 'lines', line: { color: COLORS.orange, width: 2.5 }, name: `Actual Data (Batch: ${latestBatchId})` });
                
                if (outsideX.length) {
                    traces.push({ x: outsideX, y: outsideY, mode: 'markers', marker: { color: COLORS.red, size: 8, symbol: 'x' }, name: 'Drift Detected' });
                }
            } else if (cluster === state.cluster) {
                // Fallback to simulated signal for the active but uncompleted batch
                const cppVals = getCPPValues();
                const centroid = cachedCentroids[state.cluster] || {};
                let totalDev = 0;
                cachedConstraints.CPP_COLS.forEach(c => {
                    const curr = cppVals[c] || 0;
                    const gold = centroid[c] || 0.01;
                    totalDev += Math.abs(curr - gold) / Math.max(Math.abs(gold), 0.01) * 100;
                });
                totalDev /= cachedConstraints.CPP_COLS.length;
                const std = Math.sqrt(mean.reduce((a, v) => a + Math.pow(v - mean.reduce((s, y) => s + y, 0) / mean.length, 2), 0) / mean.length) || 1;
                const noise = Math.max(0.02, totalDev / 100) * std;
                let seed = state.batchId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
                const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed / 2147483647 - 0.5) * 2; };
                const simulated = mean.map(v => v + rand() * noise);

                traces.push({ x, y: simulated, mode: 'lines', line: { color: COLORS.orange, width: 2.5 }, name: `Simulated Live (Batch ${state.batchId})` });
            }
        }

        plotChart(`envelope-chart-${cluster}`, traces, {
            title: `${cluster.replace(/_/g, ' ')} — ${phase} / ${sensor}`,
            xaxis: { title: 'Time Step' },
            yaxis: { title: sensor.replace(/_/g, ' ') },
            height: 350,
            showlegend: true,
            legend: { orientation: 'h', y: -0.18 },
            margin: { l: 50, r: 20, t: 40, b: 40 }
        });
    }
}

function renderRadar() {
    const cppVals = getCPPValues();
    const centroid = cachedCentroids[state.cluster] || {};
    const labels = cachedConstraints.CPP_COLS.map(c => c.replace(/_/g, ' '));
    const currVals = cachedConstraints.CPP_COLS.map(c => cppVals[c] || 0);
    const goldVals = cachedConstraints.CPP_COLS.map(c => centroid[c] || 0);
    const maxV = Math.max(...currVals, ...goldVals, 1);
    const currNorm = currVals.map(v => v / maxV);
    const goldNorm = goldVals.map(v => v / maxV);

    plotChart('radar-chart', [
        { type: 'scatterpolar', r: [...goldNorm, goldNorm[0]], theta: [...labels, labels[0]], fill: 'toself', fillcolor: 'rgba(79,70,229,0.25)', line: { color: COLORS.blue, width: 3 }, marker: { size: 7, color: COLORS.blue }, name: 'Golden Centroid' },
        { type: 'scatterpolar', r: [...currNorm, currNorm[0]], theta: [...labels, labels[0]], fill: 'toself', fillcolor: 'rgba(234,88,12,0.25)', line: { color: COLORS.orange, width: 3 }, marker: { size: 7, color: COLORS.orange }, name: 'Current Batch' },
    ], {
        polar: { bgcolor: '#FAFAFA', radialaxis: { visible: true, range: [0, 1.1], gridcolor: '#E5E7EB' }, angularaxis: { gridcolor: '#E5E7EB' } },
        height: 400, showlegend: true, legend: { orientation: 'h', y: -0.1 },
    });

    // Comparison table
    const tableContainer = document.getElementById('cpp-table-container');
    const rows = cachedConstraints.CPP_COLS.map(cpp => {
        const curr = (cppVals[cpp] || 0).toFixed(2);
        const gold = (centroid[cpp] || 0).toFixed(2);
        const dev = centroid[cpp] ? (((cppVals[cpp] - centroid[cpp]) / centroid[cpp]) * 100).toFixed(1) : '0.0';
        return `<tr><td>${cpp.replace(/_/g, ' ')}</td><td>${curr}</td><td>${gold}</td><td>${dev}%</td></tr>`;
    }).join('');

    tableContainer.innerHTML = `
    <h3 style="margin-bottom:0.5rem">CPP Comparison</h3>
    <table class="data-table">
      <thead><tr><th>Parameter</th><th>Current</th><th>Golden</th><th>Dev %</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

async function loadTrajectory() {
    try {
        const traj = await api.trajectory(state.batchId);
        if (!traj || !traj.length) {
            document.getElementById('energy-chart').innerHTML = '<div class="alert alert-info">No trajectory data for this batch</div>';
            return;
        }

        // Group by phase
        const phaseEnergy = {};
        traj.forEach(r => {
            const p = r.Phase || 'Unknown';
            phaseEnergy[p] = (phaseEnergy[p] || 0) + (r.Energy_kWh || 0);
        });

        const phases = Object.keys(phaseEnergy).sort((a, b) => phaseEnergy[a] - phaseEnergy[b]);
        const energies = phases.map(p => phaseEnergy[p]);

        plotChart('energy-chart', [{
            y: phases, x: energies, type: 'bar', orientation: 'h',
            marker: { color: energies, colorscale: 'Viridis' },
            text: energies.map(v => `${v.toFixed(2)} kWh`), textposition: 'outside',
            name: `Batch ${state.batchId}`,
        }], {
            title: `Energy Consumption by Phase — Batch ${state.batchId}`,
            xaxis: { title: 'Energy (kWh)' }, yaxis: { title: 'Phase' },
            height: 350, margin: { l: 120, r: 60, t: 50, b: 40 },
        });

        // CO2 metrics
        const totalEnergy = traj.reduce((s, r) => s + (r.Energy_kWh || 0), 0);
        const co2e = totalEnergy * state.emissionFactor;
        const target = 50;
        const headroom = target - co2e;
        document.getElementById('co2-metrics').innerHTML = `
      <div class="metric-card"><div class="metric-value">${totalEnergy.toFixed(2)}</div><p class="metric-label">Total Energy (kWh)</p></div>
      <div class="metric-card"><div class="metric-value">${co2e.toFixed(2)}</div><p class="metric-label">CO₂e (kg)</p></div>
      <div class="metric-card"><div class="metric-value" style="color:${headroom > 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${headroom > 0 ? '+' : ''}${headroom.toFixed(2)}</div><p class="metric-label">Target Headroom (kg)</p></div>
    `;
    } catch (e) {
        document.getElementById('energy-chart').innerHTML = `<div class="alert alert-info">No trajectory data for batch ${state.batchId}</div>`;
    }
}
