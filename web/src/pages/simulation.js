/**
 * Real-Time Simulation Page
 * Replays batches from the dataset one-by-one at configurable speed,
 * running drift detection + recommendations for each — demonstrating
 * how CB-MOPA works in a real-time production environment.
 *
 * Track B: Always pauses on drift for operator HITL decision.
 *          Optional "Run Agent Analysis" button per batch (token-conscious).
 */
import { api } from '../api.js';
import { hideSidebar } from '../components/sidebar.js';
import { plotChart, COLORS, DARK_LAYOUT } from '../components/charts.js';
import { trackAction } from '../lib/tracker.js';
import { getCurrentUser } from '../lib/auth.js';
import { showToast } from '../components/toast.js';
import { saveAgentRun, saveOperatorDecision, savePathwayDecision, startSimulationRun, updateSimulationRun } from '../lib/db.js';

let simState = null;

/* ── Simple Markdown → HTML (same as agent-dashboard) ──── */
function md(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/^### (.+)$/gm, '<h4 style="font-size:0.88rem;font-weight:700;margin:0.6rem 0 0.2rem;color:var(--text-dark)">$1</h4>')
        .replace(/^## (.+)$/gm, '<h3 style="font-size:0.95rem;font-weight:700;margin:0.8rem 0 0.3rem;color:var(--text-dark)">$1</h3>')
        .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-dark)">$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^(\s*)[-•] (.+)$/gm, (_, sp, c) => `<div style="padding:0.1rem 0 0.1rem ${sp.length >= 4 ? '2rem' : '1rem'};font-size:0.82rem;position:relative"><span style="position:absolute;left:${sp.length >= 4 ? '1rem' : '0'};top:0.55rem;width:5px;height:5px;border-radius:50%;background:var(--accent-blue)"></span>${c}</div>`)
        .replace(/^\d+\.\s+(.+)$/gm, '<div style="padding:0.1rem 0 0.1rem 1rem;font-size:0.82rem">$1</div>')
        .replace(/\n\n/g, '<br/>')
        .replace(/(?<!\>)\n(?!\<)/g, '<br/>');
}

export async function renderSimulation(main) {
    hideSidebar();

    main.innerHTML = `
    <div class="page-header">
      <h1>Real-Time Simulation</h1>
      <p>Watch CB-MOPA process batches in real-time — drift detection, causal recommendations, and adaptive learning in action.</p>
    </div>

    <div class="sim-controls">
      <div class="sim-controls-row">
        <div class="sim-speed">
          <label for="sim-speed">Batch Interval</label>
          <input type="range" id="sim-speed" min="1" max="10" step="1" value="3" style="accent-color:var(--accent-blue);width:160px" />
          <span id="sim-speed-val" style="font-weight:700;color:var(--accent-blue)">3s</span>
        </div>
        <div class="sim-toggles" style="display:flex; flex-direction:column; gap:0.5rem; justify-content:center; font-size: 0.85rem;">
          <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;" title="Send an email summary after every single batch completes.">
            <input type="checkbox" id="sim-email-batch" style="accent-color:var(--accent-blue); cursor:pointer;" />
            Batchwise Status Emails
          </label>
        </div>
        <div class="sim-buttons">
          <button class="btn btn-primary" id="btn-play">Start</button>
          <button class="btn btn-outline" id="btn-pause" disabled>Pause</button>
          <button class="btn btn-outline" id="btn-reset">Reset</button>
        </div>
        <div class="sim-progress-info">
          <span id="sim-batch-counter" style="font-weight:700;font-size:1.1rem">0 / 0</span>
          <span style="color:var(--text-muted);font-size:0.85rem">batches processed</span>
        </div>
      </div>
      <div class="sim-progress-bar" style="margin-top:1rem;background:var(--bg-input);border-radius:8px;height:8px;overflow:hidden">
        <div id="sim-progress" style="height:100%;width:0%;background:var(--accent-blue);border-radius:8px;transition:width 0.3s ease"></div>
      </div>
    </div>

    <div class="grid-2" style="margin-top:1.5rem;gap:2rem">
      <div>
        <h2 class="section-title">Live Metrics</h2>
        <div class="grid-2" id="sim-metrics" style="margin-bottom:1.5rem">
          <div class="metric-card"><div class="metric-value" id="m-batch">—</div><p class="metric-label">Current Batch</p></div>
          <div class="metric-card"><div class="metric-value" id="m-cluster">—</div><p class="metric-label">Cluster</p></div>
          <div class="metric-card"><div class="metric-value" id="m-alarm" style="color:var(--accent-green)">—</div><p class="metric-label">Drift Alarm</p></div>
          <div class="metric-card"><div class="metric-value" id="m-co2e">—</div><p class="metric-label">CO₂e (kg)</p></div>
        </div>

        <div id="sim-hitl-container" style="display:none; margin-bottom:1.5rem; padding:1.5rem; border:2px dashed var(--accent-orange); border-radius:8px; background:var(--bg-secondary);"></div>

        <div id="sim-agent-container" style="display:none; margin-bottom:1.5rem;"></div>

        <h2 class="section-title">CO₂e Trend (Live)</h2>
        <div id="sim-trend" class="chart-container" style="height:280px"></div>

        <h2 class="section-title" style="margin-top:1.5rem">Phase Energy Breakdown</h2>
        <div id="sim-energy-chart" class="chart-container" style="height:240px"></div>

        <h2 class="section-title" style="margin-top:1.5rem">Drift Score History</h2>
        <div id="sim-drift-chart" class="chart-container" style="height:240px"></div>
      </div>

      <div>
        <h2 class="section-title">Event Log</h2>
        <div id="sim-log" style="max-height:640px;overflow-y:auto;border:1px solid var(--border-color);border-radius:var(--radius-md);background:var(--bg-white);padding:0.5rem"></div>
      </div>
    </div>

    <hr class="divider" />

    <h2 class="section-title">Batch Quality Heatmap</h2>
    <div id="sim-heatmap" class="chart-container" style="height:200px"></div>
  `;

    // Load required data
    let stats, centroids, clusterMap, constraints;
    try {
        [stats, centroids, clusterMap, constraints] = await Promise.all([
            api.masterStats(),
            api.centroids(),
            api.clusterBatchMap().catch(() => null),
            api.constraints(),
        ]);
    } catch (e) {
        main.innerHTML = `<div class="alert alert-crit">Failed to load data: ${e.message}</div>`;
        return;
    }

    const batchCluster = {};
    if (clusterMap) {
        for (const [cluster, bids] of Object.entries(clusterMap)) {
            (bids || []).forEach(bid => { batchCluster[bid] = cluster; });
        }
    }

    simState = {
        batchIds: stats.batch_ids || [],
        batchData: stats.batch_data || {},
        centroids,
        constraints,
        batchCluster,
        currentIndex: 0,
        running: false,
        timer: null,
        speed: 3000,
        history: { labels: [], co2e: [], driftScores: [], alarms: [], hardness: [], dissolution: [] },
    };

    const speedSlider = document.getElementById('sim-speed');
    const speedVal = document.getElementById('sim-speed-val');
    speedSlider.addEventListener('input', () => {
        simState.speed = parseInt(speedSlider.value) * 1000;
        speedVal.textContent = speedSlider.value + 's';
        if (simState.running) {
            clearInterval(simState.timer);
            simState.timer = setInterval(processNextBatch, simState.speed);
        }
    });

    document.getElementById('btn-play').addEventListener('click', startSim);
    document.getElementById('btn-pause').addEventListener('click', pauseSim);
    document.getElementById('btn-reset').addEventListener('click', resetSim);

    document.getElementById('sim-batch-counter').textContent = `0 / ${simState.batchIds.length}`;
    addLogEntry('system', 'Simulation ready', `${simState.batchIds.length} batches loaded. Press Start to begin.`);
}

function startSim() {
    if (!simState || simState.currentIndex >= simState.batchIds.length) return;
    simState.running = true;
    document.getElementById('btn-play').disabled = true;
    document.getElementById('btn-pause').disabled = false;
    document.getElementById('sim-hitl-container').style.display = 'none';
    document.getElementById('sim-agent-container').style.display = 'none';
    addLogEntry('system', 'Simulation started', `Speed: ${simState.speed / 1000}s per batch`);
    trackAction('simulation_start', { totalBatches: simState.batchIds.length, speed: simState.speed / 1000 });
    // Save simulation run to Supabase
    if (!simState.dbRunId) {
        startSimulationRun(simState.batchIds.length, simState.speed / 1000).then(id => { simState.dbRunId = id; }).catch(() => {});
    }
    processNextBatch();
    simState.timer = setInterval(processNextBatch, simState.speed);
}

function pauseSim() {
    if (!simState) return;
    simState.running = false;
    clearInterval(simState.timer);
    document.getElementById('btn-play').disabled = false;
    document.getElementById('btn-pause').disabled = true;
    document.getElementById('btn-play').textContent = 'Resume';
    addLogEntry('system', 'Simulation paused', `Processed ${simState.currentIndex} / ${simState.batchIds.length}`);
}

function resetSim() {
    if (!simState) return;
    simState.running = false;
    clearInterval(simState.timer);
    simState.currentIndex = 0;
    simState.history = { labels: [], co2e: [], driftScores: [], alarms: [], hardness: [], dissolution: [] };
    document.getElementById('btn-play').disabled = false;
    document.getElementById('btn-play').textContent = 'Start';
    document.getElementById('btn-pause').disabled = true;
    document.getElementById('sim-batch-counter').textContent = `0 / ${simState.batchIds.length}`;
    document.getElementById('sim-progress').style.width = '0%';
    document.getElementById('m-batch').textContent = '—';
    document.getElementById('m-cluster').textContent = '—';
    document.getElementById('m-alarm').textContent = '—';
    document.getElementById('m-alarm').style.color = 'var(--text-muted)';
    document.getElementById('m-co2e').textContent = '—';
    document.getElementById('sim-log').innerHTML = '';
    document.getElementById('sim-trend').innerHTML = '';
    document.getElementById('sim-drift-chart').innerHTML = '';
    document.getElementById('sim-heatmap').innerHTML = '';
    document.getElementById('sim-hitl-container').style.display = 'none';
    document.getElementById('sim-agent-container').style.display = 'none';
    addLogEntry('system', 'Simulation reset', 'Ready to start again.');
}

async function processNextBatch() {
    if (!simState || simState.currentIndex >= simState.batchIds.length) {
        pauseSim();
        addLogEntry('complete', 'Simulation complete', `All ${simState.batchIds.length} batches processed.`);
        trackAction('simulation_complete', { totalBatches: simState.batchIds.length });
        updateSimulationRun(simState.dbRunId, { status: 'completed', batches_processed: simState.batchIds.length, completed_at: new Date().toISOString() }).catch(() => {});
        document.getElementById('btn-play').disabled = true;

        try {
            const user = getCurrentUser();
            await api.post('batch/simulation-complete', {
                total_batches: simState.batchIds.length,
                alarms: simState.history.alarms,
                recipient_email: user ? user.email : null
            });
            addLogEntry('system', 'Final Report Sent', 'Simulation Summary email dispatched successfully.');
        } catch (e) {
            console.error("Failed to send simulation summary email", e);
        }
        return;
    }

    const batchId = simState.batchIds[simState.currentIndex];
    const bd = simState.batchData[batchId] || {};
    const cluster = simState.batchCluster[batchId] || 'Balanced Operational Golden';
    const centroid = simState.centroids[cluster] || {};
    const co2e = bd.total_CO2e_kg || 0;
    const hardness = bd.Hardness || 0;
    const dissolution = bd.Dissolution_Rate || 0;

    document.getElementById('m-batch').textContent = batchId;
    document.getElementById('m-cluster').textContent = cluster.split(' ')[0];
    document.getElementById('m-co2e').textContent = co2e.toFixed(1);

    simState.currentIndex++;
    const pct = (simState.currentIndex / simState.batchIds.length * 100).toFixed(0);
    document.getElementById('sim-batch-counter').textContent = `${simState.currentIndex} / ${simState.batchIds.length}`;
    document.getElementById('sim-progress').style.width = pct + '%';

    addLogEntry('data', `Batch ${batchId} received`, `Cluster: ${cluster} | CO₂e: ${co2e.toFixed(2)} kg`);
    trackAction('simulation_batch', { batchId, cluster, co2e: parseFloat(co2e.toFixed(2)) });

    // Run drift check
    let alarm = 'OK';
    let avgDrift = 0;
    try {
        const cppParams = {};
        (simState.constraints.CPP_COLS || []).forEach(cpp => {
            cppParams[cpp] = bd[cpp] || centroid[cpp] || 0;
        });

        const result = await api.driftCheck({
            batch_id: batchId,
            cpp_params: cppParams,
            cluster_name: cluster,
        });
        alarm = result.overall_alarm || 'OK';

        if (result.drift_details && result.drift_details.length) {
            avgDrift = result.drift_details.reduce((s, d) => s + (d.drift_score || 0), 0) / result.drift_details.length;
        }

        const alarmEl = document.getElementById('m-alarm');
        if (alarm === 'OK') {
            alarmEl.textContent = 'OK'; alarmEl.style.color = 'var(--accent-green)';
            addLogEntry('ok', `Drift: OK`, `Batch ${batchId} within golden envelope (avg drift: ${avgDrift.toFixed(4)})`);
        } else if (alarm === 'WARNING') {
            alarmEl.textContent = 'WARNING'; alarmEl.style.color = 'var(--accent-amber)';
            addLogEntry('warning', `Drift: WARNING`, `Batch ${batchId} shows partial deviation (avg drift: ${avgDrift.toFixed(4)})`);
        } else {
            alarmEl.textContent = 'CRITICAL'; alarmEl.style.color = 'var(--accent-red)';
            addLogEntry('critical', `Drift: CRITICAL`, `Batch ${batchId} significant deviation detected!`);
        }

        // If drift detected → always pause and ask operator
        if (alarm !== 'OK') {
            try {
                const recs = await api.recommendations(batchId, cluster);
                if (recs && recs.pathway_a) {
                    addLogEntry('rec', `Recommendation generated`, `Pathways ready for operator decision.`);
                    addLogEntry('warning', `Simulation Paused`, `Operator decision required for Batch ${batchId}.`);
                    pauseSim();
                    renderInlineSimHITL(batchId, cluster, recs);
                }
            } catch { /* recommendation unavailable */ }
        }

        trackAction('simulation_drift_check', { batchId, cluster, alarm, avgDrift });
    } catch (e) {
        addLogEntry('warning', `Drift check skipped`, `${batchId}: ${e.message}`);
    }

    // Update history
    simState.history.labels.push(batchId);
    simState.history.co2e.push(co2e);
    simState.history.driftScores.push(avgDrift);
    simState.history.alarms.push(alarm);
    simState.history.hardness.push(hardness);
    simState.history.dissolution.push(dissolution);

    updateTrendChart();
    updateDriftChart();
    updateHeatmap();
    updateEnergyChart(batchId);

    if (document.getElementById('sim-email-batch')?.checked) {
        const user = getCurrentUser();
        api.post('batch/simulation-batch-email', {
            batch_id: batchId, cluster_name: cluster,
            alarm, co2e, drift_score: avgDrift,
            recipient_email: user ? user.email : null
        }).catch(e => console.error("Batchwise email failed", e));
    }
}

/* ── Charts ──────────────────────────────────────────────── */
function updateTrendChart() {
    const h = simState.history;
    const barColors = h.alarms.map(a => a === 'OK' ? COLORS.green : a === 'WARNING' ? COLORS.amber : COLORS.red);
    plotChart('sim-trend', [
        { x: h.labels, y: h.co2e, type: 'bar', marker: { color: barColors }, name: 'CO₂e' },
        { x: h.labels, y: h.labels.map(() => 50), mode: 'lines', line: { color: COLORS.green, dash: 'dash', width: 1.5 }, name: 'Target' },
        { x: h.labels, y: h.labels.map(() => 85), mode: 'lines', line: { color: COLORS.red, dash: 'dot', width: 1.5 }, name: 'Regulatory' },
    ], { height: 280, xaxis: { title: 'Batch' }, yaxis: { title: 'CO₂e (kg)' }, showlegend: false, margin: { ...DARK_LAYOUT.margin, b: 60 } });
}

function updateDriftChart() {
    const h = simState.history;
    const dotColors = h.alarms.map(a => a === 'OK' ? COLORS.green : a === 'WARNING' ? COLORS.amber : COLORS.red);
    plotChart('sim-drift-chart', [
        { x: h.labels, y: h.driftScores, type: 'scatter', mode: 'lines+markers', line: { color: COLORS.blue, width: 2 }, marker: { color: dotColors, size: 8 }, name: 'Avg Drift Score' },
    ], { height: 240, xaxis: { title: 'Batch' }, yaxis: { title: 'Drift Score' }, margin: { ...DARK_LAYOUT.margin, b: 60 } });
}

function updateHeatmap() {
    const h = simState.history;
    plotChart('sim-heatmap', [{
        z: [h.hardness, h.dissolution, h.co2e], x: h.labels,
        y: ['Hardness', 'Dissolution', 'CO₂e'], type: 'heatmap',
        colorscale: 'RdYlGn', reversescale: false,
    }], { height: 200, margin: { l: 100, r: 20, t: 10, b: 60 }, xaxis: { title: 'Batch' } });
}

async function updateEnergyChart(batchId) {
    try {
        const traj = await api.trajectory(batchId);
        if (!traj || !traj.length) return;
        const phaseEnergy = {};
        traj.forEach(r => { const p = r.Phase || 'Unknown'; phaseEnergy[p] = (phaseEnergy[p] || 0) + (r.Energy_kWh || 0); });
        const phases = Object.keys(phaseEnergy).sort((a, b) => phaseEnergy[a] - phaseEnergy[b]);
        const energies = phases.map(p => phaseEnergy[p]);
        plotChart('sim-energy-chart', [{
            y: phases, x: energies, type: 'bar', orientation: 'h',
            marker: { color: energies, colorscale: 'Viridis' },
            text: energies.map(v => `${v.toFixed(2)} kWh`), textposition: 'outside'
        }], { height: 240, margin: { l: 100, r: 40, t: 10, b: 40 }, xaxis: { title: 'Energy (kWh)' } });
    } catch { }
}

/* ── Log ─────────────────────────────────────────────────── */
function addLogEntry(type, title, detail) {
    const log = document.getElementById('sim-log');
    if (!log) return;
    const colors = { system: 'var(--text-muted)', data: 'var(--accent-blue)', ok: 'var(--accent-green)', warning: 'var(--accent-amber)', critical: 'var(--accent-red)', rec: '#9333EA', complete: 'var(--accent-blue)', agent: 'var(--accent-blue)' };
    const icons = { system: '[SYS]', data: '[DATA]', ok: '[OK]', warning: '[WARN]', critical: '[CRIT]', rec: '[REC]', complete: '[DONE]', agent: '[AI]' };
    const now = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border-light);font-size:0.85rem;animation:fadeIn 0.3s ease';
    entry.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px">
            <span>${icons[type] || '•'}</span>
            <strong style="color:${colors[type] || 'inherit'}">${title}</strong>
            <span style="margin-left:auto;color:var(--text-muted);font-size:0.75rem">${now}</span>
        </div>
        <div style="color:var(--text-secondary);font-size:0.8rem;margin-top:2px;padding-left:26px">${detail}</div>`;
    log.prepend(entry);
    while (log.children.length > 100) log.removeChild(log.lastChild);
}

/* ── HITL Decision Panel ─────────────────────────────────── */
function renderInlineSimHITL(batchId, cluster, recs) {
    const container = document.getElementById('sim-hitl-container');
    container.style.display = 'block';

    const pathwayA = recs.pathway_a;
    const pathwayB = recs.pathway_b;

    container.innerHTML = `
        <h3 class="section-title" style="margin-top:0;color:var(--accent-orange)">Simulation Paused: Operator Decision Required</h3>
        <p style="margin-bottom:1rem;font-size:0.88rem;">Drift detected in Batch <strong>${batchId}</strong>. Please execute a causal pathway to correct the trajectory and resume the simulation.</p>
        <div class="grid-2" style="margin-bottom:1rem; gap:1rem;">
          <div class="pathway-card pathway-a" id="sim-card-a" style="padding:1rem;border-radius:var(--radius-sm);border:1px solid var(--border-color);background:var(--bg-card)"></div>
          <div class="pathway-card pathway-b" id="sim-card-b" style="padding:1rem;border-radius:var(--radius-sm);border:1px solid var(--border-color);background:var(--bg-card)"></div>
        </div>
        <div class="grid-2" style="margin-bottom:1rem; gap:1rem;">
          <button class="btn btn-success btn-full" id="sim-btn-exec-a" style="background:var(--accent-green);color:white;border:none;padding:0.7rem;font-weight:700;border-radius:var(--radius-sm);cursor:pointer">Execute ${pathwayA.pathway_name}</button>
          ${pathwayB ? `<button class="btn btn-primary btn-full" id="sim-btn-exec-b" style="background:var(--accent-blue);color:white;border:none;padding:0.7rem;font-weight:700;border-radius:var(--radius-sm);cursor:pointer">Execute ${pathwayB.pathway_name}</button>` : ''}
        </div>
        <div style="border-top:1px solid var(--border-light);padding-top:1rem;margin-top:0.5rem">
          <button class="btn btn-outline" id="sim-btn-agent" style="width:100%;display:flex;align-items:center;justify-content:center;gap:0.5rem;padding:0.6rem;font-weight:600;font-size:0.85rem">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z"/><circle cx="12" cy="15" r="2"/></svg>
            Run Agent Analysis for ${batchId}
          </button>
          <p style="text-align:center;color:var(--text-muted);font-size:0.72rem;margin-top:0.3rem">Runs Prediction, Golden Signature, and Carbon agents with LLM explanations</p>
        </div>
    `;

    renderPathwayCardInline('sim-card-a', pathwayA);
    if (pathwayB) renderPathwayCardInline('sim-card-b', pathwayB);

    document.getElementById('sim-btn-exec-a').addEventListener('click', () => executeSimDecision(batchId, cluster, pathwayA, pathwayB, 'A'));
    if (pathwayB && document.getElementById('sim-btn-exec-b')) {
        document.getElementById('sim-btn-exec-b').addEventListener('click', () => executeSimDecision(batchId, cluster, pathwayA, pathwayB, 'B'));
    }

    document.getElementById('sim-btn-agent').addEventListener('click', () => runAgentForBatch(batchId, cluster));
}

function renderPathwayCardInline(containerId, pw) {
    const el = document.getElementById(containerId);
    if (!el || !pw) return;
    const changes = pw.param_changes || [];
    const safety = pw.safety_check || 'UNKNOWN';
    const confidence = pw.causal_confidence || 0.8;
    const utility = pw.preference_utility ?? 0;

    const changeRows = changes.map(c =>
        `<tr><td style="padding:0.3rem 0.4rem;font-size:0.82rem">${c.param}</td><td style="padding:0.3rem 0.4rem;font-size:0.82rem">${c.old_value}</td><td style="padding:0.3rem 0.4rem;font-size:0.82rem;font-weight:600">${c.new_value}</td><td style="padding:0.3rem 0.4rem;font-size:0.82rem;color:${c.delta_pct < 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${c.delta_pct > 0 ? '+' : ''}${c.delta_pct.toFixed(1)}%</td></tr>`
    ).join('');

    el.innerHTML = `
        <h4 style="margin-bottom:0.3rem;font-size:0.95rem;font-weight:700">${pw.pathway_name}</h4>
        <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:0.8rem">GP Utility Score: <strong style="color:var(--text-primary)">${utility.toFixed(3)}</strong></div>
        ${changes.length ? `<table style="width:100%;border-collapse:collapse;margin-bottom:0.8rem">
          <thead><tr style="border-bottom:2px solid var(--border-color)">
            <th style="padding:0.3rem 0.4rem;text-align:left;font-size:0.68rem;text-transform:uppercase;color:var(--text-muted)">Param</th>
            <th style="padding:0.3rem 0.4rem;text-align:left;font-size:0.68rem;text-transform:uppercase;color:var(--text-muted)">Old</th>
            <th style="padding:0.3rem 0.4rem;text-align:left;font-size:0.68rem;text-transform:uppercase;color:var(--text-muted)">New</th>
            <th style="padding:0.3rem 0.4rem;text-align:left;font-size:0.68rem;text-transform:uppercase;color:var(--text-muted)">%</th>
          </tr></thead>
          <tbody>${changeRows}</tbody>
        </table>` : '<p style="color:var(--text-muted);font-size:0.82rem;margin-bottom:0.8rem">No parameter changes required</p>'}
        <div style="display:flex;gap:0.5rem">
          <div class="metric-card" style="padding:0.5rem;flex:1"><div class="metric-value" style="font-size:0.95rem;color:${pw.expected_co2_change < 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${pw.expected_co2_change > 0 ? '+' : ''}${pw.expected_co2_change.toFixed(3)} kg</div><p class="metric-label" style="font-size:0.65rem">CO₂e Delta</p></div>
          <div class="metric-card" style="padding:0.5rem;flex:1"><div class="metric-value" style="font-size:0.95rem">${(confidence * 100).toFixed(0)}%</div><p class="metric-label" style="font-size:0.65rem">Confidence</p></div>
          <div class="metric-card" style="padding:0.5rem;flex:1"><div class="metric-value" style="font-size:0.95rem;color:${safety === 'PASS' ? 'var(--accent-green)' : 'var(--accent-red)'}">${safety}</div><p class="metric-label" style="font-size:0.65rem">Safety</p></div>
        </div>
    `;
}

async function executeSimDecision(batchId, cluster, pwA, pwB, chosen) {
    const btnA = document.getElementById('sim-btn-exec-a');
    const btnB = document.getElementById('sim-btn-exec-b');
    if (btnA) btnA.disabled = true;
    if (btnB) btnB.disabled = true;

    try {
        await api.logDecision({
            batch_id: batchId,
            pathway_a: pwA, pathway_b: pwB,
            chosen, modified_params: null, reason: 'Simulation HITL', target_config: cluster,
        });

        document.getElementById('sim-hitl-container').style.display = 'none';
        savePathwayDecision(batchId, cluster, chosen, pwA, pwB, simState.dbRunId).catch(() => {});
        addLogEntry('ok', `Decision Logged`, `Operator executed Pathway ${chosen} for Batch ${batchId}.`);

        setTimeout(() => {
            addLogEntry('system', 'Simulation resuming', 'Proceeding to next batch automatically...');
            startSim();
        }, 1000);
    } catch (e) {
        addLogEntry('critical', `Failed to execute decision`, e.message);
        if (btnA) btnA.disabled = false;
        if (btnB) btnB.disabled = false;
    }
}

/* ── Agent Analysis for a Specific Batch ─────────────────── */
async function runAgentForBatch(batchId, cluster) {
    const btn = document.getElementById('sim-btn-agent');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px"></div> Running agents...';
    }

    const container = document.getElementById('sim-agent-container');
    container.style.display = 'block';
    container.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-muted)"><div class="spinner" style="width:24px;height:24px;border-width:3px;margin:0 auto 0.5rem"></div>Running AI agents for ${batchId}...</div>`;

    addLogEntry('agent', `Agent analysis started`, `Running Prediction, Golden Signature, and Carbon agents for Batch ${batchId}...`);

    try {
        const data = await api.agentsRun(batchId, cluster);
        data.cluster_name = cluster;
        const results = data.agent_results || [];

        addLogEntry('agent', `Agent analysis complete`, `${results.length} agents returned. All clear: ${data.all_clear ? 'Yes' : 'No'}`);
        saveAgentRun(data).catch(() => {});

        let html = `
        <div style="border:1px solid var(--accent-blue);border-radius:var(--radius-md);overflow:hidden;margin-bottom:0.5rem">
          <div style="background:var(--accent-blue);color:white;padding:0.6rem 1rem;font-weight:700;font-size:0.88rem;display:flex;align-items:center;gap:0.5rem">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z"/><circle cx="12" cy="15" r="2"/></svg>
            Agent Analysis — Batch ${batchId}
            ${data.all_clear
                ? '<span style="margin-left:auto;background:rgba(255,255,255,0.2);padding:0.15rem 0.5rem;border-radius:12px;font-size:0.7rem">All Clear</span>'
                : `<span style="margin-left:auto;background:rgba(255,255,255,0.2);padding:0.15rem 0.5rem;border-radius:12px;font-size:0.7rem">${data.pending_count} Action(s)</span>`}
          </div>
          <div style="padding:1rem;background:var(--bg-card)">`;

        // Fetch notification IDs so buttons work
        let notifMap = {};
        try {
            const batchNotifs = await api.agentsBatch(batchId);
            for (const n of (batchNotifs.results || [])) {
                if (n.status === 'pending') notifMap[n.agent_name] = n.id;
            }
        } catch {}

        for (const r of results) {
            const agentColors = { prediction: 'var(--accent-blue)', golden_signature: 'var(--accent-orange)', carbon: 'var(--accent-green)' };
            const agentLabels = { prediction: 'Prediction Agent', golden_signature: 'Golden Signature Agent', carbon: 'Carbon Agent' };
            const color = agentColors[r.agent_name] || 'var(--text-muted)';
            const label = agentLabels[r.agent_name] || r.agent_name;

            const actionBadge = r.requires_action
                ? `<span style="background:var(--accent-orange-light);color:var(--accent-orange);padding:0.15rem 0.5rem;border-radius:12px;font-size:0.68rem;font-weight:700">Action Required</span>`
                : `<span style="background:var(--accent-green-light);color:var(--accent-green);padding:0.15rem 0.5rem;border-radius:12px;font-size:0.68rem;font-weight:700">OK</span>`;

            // Action buttons per agent
            let actionButtons = '';
            const nid = notifMap[r.agent_name] || 0;

            if (r.agent_name === 'golden_signature') {
                const analysis = r.analysis || {};
                const dominatesLabel = analysis.dominates ? 'This batch dominates the current signature.' : 'This batch does not dominate, but you can still promote it.';
                actionButtons = `
                <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.6rem;margin-bottom:0.4rem">${dominatesLabel}</div>
                <div style="display:flex;gap:0.5rem">
                  <button class="sim-agent-action" data-action="promote-golden" data-batch="${batchId}" data-cluster="${cluster}" data-nid="${nid}" style="flex:1;padding:0.5rem;background:var(--accent-green);color:white;border:none;border-radius:6px;font-weight:700;font-size:0.78rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.4rem">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>
                    Set as Golden Batch
                  </button>
                  <button class="sim-agent-action" data-action="reject-sig" data-nid="${nid}" style="flex:1;padding:0.5rem;background:var(--accent-red);color:white;border:none;border-radius:6px;font-weight:700;font-size:0.78rem;cursor:pointer">Keep Current Signature</button>
                </div>`;
            } else if (r.requires_action && (r.agent_name === 'carbon' || r.agent_name === 'prediction')) {
                actionButtons = `
                <div style="margin-top:0.8rem">
                  <button class="sim-agent-action" data-action="acknowledge" data-nid="${nid}" style="width:100%;padding:0.5rem;background:var(--accent-amber);color:white;border:none;border-radius:6px;font-weight:700;font-size:0.78rem;cursor:pointer">Acknowledge Alert</button>
                </div>`;
            }

            html += `
            <div style="border-left:3px solid ${color};padding:0.8rem 1rem;margin-bottom:0.8rem;background:var(--bg-input);border-radius:0 var(--radius-sm) var(--radius-sm) 0">
              <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem">
                <strong style="font-size:0.85rem;color:${color}">${label}</strong>
                ${actionBadge}
                <span style="margin-left:auto;font-size:0.72rem;color:var(--text-muted)">Confidence: ${(r.confidence * 100).toFixed(0)}%</span>
              </div>
              <div style="font-size:0.82rem;line-height:1.6;color:var(--text-primary)">${md(r.explanation)}</div>
              ${actionButtons}
            </div>`;
        }

        html += `</div></div>`;
        container.innerHTML = html;

        // Attach button handlers
        container.querySelectorAll('.sim-agent-action').forEach(btn => {
            btn.addEventListener('click', async () => {
                const action = btn.dataset.action;
                btn.disabled = true;
                btn.textContent = 'Processing...';

                try {
                    if (action === 'acknowledge') {
                        const nid = parseInt(btn.dataset.nid);
                        if (nid) {
                            await api.agentsRespond(nid, { action: 'acknowledged', reason: 'Operator acknowledged in simulation' });
                        } else {
                            const pending = await api.agentsPending();
                            const match = (pending.notifications || []).find(n => n.batch_id === batchId && n.status === 'pending');
                            if (match) await api.agentsRespond(match.id, { action: 'acknowledged', reason: 'Operator acknowledged in simulation' });
                        }
                        btn.textContent = 'Acknowledged';
                        btn.style.background = 'var(--accent-green)';
                        saveOperatorDecision(batchId, 'carbon', 'acknowledged', 'Acknowledged in simulation').catch(() => {});
                        addLogEntry('ok', 'Alert Acknowledged', `Operator acknowledged alert for Batch ${batchId}`);

                    } else if (action === 'reject-sig') {
                        const nid = parseInt(btn.dataset.nid);
                        if (nid) {
                            await api.agentsRespond(nid, { action: 'rejected', reason: 'Keeping current signature' });
                        }
                        btn.textContent = 'Current Kept';
                        btn.style.background = 'var(--accent-green)';
                        const sibling = btn.parentElement.querySelector('[data-action="promote-golden"]');
                        if (sibling) sibling.style.display = 'none';
                        saveOperatorDecision(batchId, 'golden_signature', 'kept_current', 'Kept in simulation').catch(() => {});
                        addLogEntry('ok', 'Signature Retained', `Operator chose to keep current golden signature for Batch ${batchId}`);

                    } else if (action === 'promote-golden') {
                        const reason = prompt('Reason for promoting this batch to golden reference:');
                        if (reason === null) { btn.disabled = false; btn.innerHTML = 'Promote to Golden Batch'; return; }
                        const predResult = results.find(r => r.agent_name === 'prediction');
                        const cqas = predResult?.analysis?.predictions || {};
                        await api.post('batch/complete', {
                            batch_id: btn.dataset.batch,
                            actual_cqas: cqas,
                            cluster_name: btn.dataset.cluster,
                        });
                        btn.textContent = 'Promoted to Golden';
                        btn.style.background = 'var(--accent-green)';
                        saveOperatorDecision(batchId, 'golden_signature', 'promoted', reason).catch(() => {});
                        addLogEntry('ok', 'Golden Batch Promoted', `Batch ${batchId} manually promoted. Reason: ${reason}`);
                    }

                    showToast('Action completed', 'info');
                } catch (e) {
                    btn.textContent = 'Error';
                    btn.style.background = 'var(--accent-red)';
                    addLogEntry('critical', 'Action failed', e.message);
                }
            });
        });

        showToast('Agent analysis complete', 'info');
    } catch (e) {
        container.innerHTML = `<div style="padding:1rem;background:var(--accent-red-light);border:1px solid var(--accent-red);border-radius:var(--radius-sm);color:var(--accent-red);font-weight:600;font-size:0.85rem">Agent error: ${e.message}</div>`;
        addLogEntry('critical', 'Agent analysis failed', e.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z"/><circle cx="12" cy="15" r="2"/></svg> Run Agent Analysis for ${batchId}`;
        }
    }
}
