/**
 * Real-Time Simulation Page
 * Replays batches from the dataset one-by-one at configurable speed,
 * running drift detection + recommendations for each — demonstrating
 * how CB-MOPA works in a real-time production environment.
 */
import { api } from '../api.js';
import { hideSidebar } from '../components/sidebar.js';
import { plotChart, COLORS, DARK_LAYOUT } from '../components/charts.js';

let simState = null;  // simulation state

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
          <input type="range" id="sim-speed" min="1" max="10" step="1" value="3" style="accent-color:var(--accent-blue);width:180px" />
          <span id="sim-speed-val" style="font-weight:700;color:var(--accent-blue)">3s</span>
        </div>
        <div class="sim-buttons">
          <button class="btn btn-primary" id="btn-play">▶ Start</button>
          <button class="btn btn-outline" id="btn-pause" disabled>⏸ Pause</button>
          <button class="btn btn-outline" id="btn-reset">↺ Reset</button>
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

        <h2 class="section-title">CO₂e Trend (Live)</h2>
        <div id="sim-trend" class="chart-container" style="height:280px"></div>

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

    // Build batch → cluster mapping
    const batchCluster = {};
    if (clusterMap) {
        for (const [cluster, bids] of Object.entries(clusterMap)) {
            (bids || []).forEach(bid => { batchCluster[bid] = cluster; });
        }
    }

    // Initialize simulation state
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
    addLogEntry('system', 'Simulation started', `Speed: ${simState.speed / 1000}s per batch`);
    processNextBatch();
    simState.timer = setInterval(processNextBatch, simState.speed);
}

function pauseSim() {
    if (!simState) return;
    simState.running = false;
    clearInterval(simState.timer);
    document.getElementById('btn-play').disabled = false;
    document.getElementById('btn-pause').disabled = true;
    document.getElementById('btn-play').textContent = '▶ Resume';
    addLogEntry('system', 'Simulation paused', `Processed ${simState.currentIndex} / ${simState.batchIds.length}`);
}

function resetSim() {
    if (!simState) return;
    simState.running = false;
    clearInterval(simState.timer);
    simState.currentIndex = 0;
    simState.history = { labels: [], co2e: [], driftScores: [], alarms: [], hardness: [], dissolution: [] };
    document.getElementById('btn-play').disabled = false;
    document.getElementById('btn-play').textContent = '▶ Start';
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
    addLogEntry('system', 'Simulation reset', 'Ready to start again.');
}

async function processNextBatch() {
    if (!simState || simState.currentIndex >= simState.batchIds.length) {
        pauseSim();
        addLogEntry('complete', 'Simulation complete', `All ${simState.batchIds.length} batches processed.`);
        document.getElementById('btn-play').disabled = true;
        return;
    }

    const batchId = simState.batchIds[simState.currentIndex];
    const bd = simState.batchData[batchId] || {};
    const cluster = simState.batchCluster[batchId] || 'Balanced Operational Golden';
    const centroid = simState.centroids[cluster] || {};
    const co2e = bd.total_CO2e_kg || 0;
    const hardness = bd.Hardness || 0;
    const dissolution = bd.Dissolution_Rate || 0;

    // Update current metrics
    document.getElementById('m-batch').textContent = batchId;
    document.getElementById('m-cluster').textContent = cluster.split(' ')[0];
    document.getElementById('m-co2e').textContent = co2e.toFixed(1);

    // Update progress
    simState.currentIndex++;
    const pct = (simState.currentIndex / simState.batchIds.length * 100).toFixed(0);
    document.getElementById('sim-batch-counter').textContent = `${simState.currentIndex} / ${simState.batchIds.length}`;
    document.getElementById('sim-progress').style.width = pct + '%';

    addLogEntry('data', `Batch ${batchId} received`, `Cluster: ${cluster} | CO₂e: ${co2e.toFixed(2)} kg`);

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
            alarmEl.textContent = 'OK';
            alarmEl.style.color = 'var(--accent-green)';
            addLogEntry('ok', `Drift: OK`, `Batch ${batchId} within golden envelope (avg drift: ${avgDrift.toFixed(4)})`);
        } else if (alarm === 'WARNING') {
            alarmEl.textContent = 'WARNING';
            alarmEl.style.color = 'var(--accent-amber)';
            addLogEntry('warning', `Drift: WARNING`, `Batch ${batchId} shows partial deviation (avg drift: ${avgDrift.toFixed(4)})`);
        } else {
            alarmEl.textContent = 'CRITICAL';
            alarmEl.style.color = 'var(--accent-red)';
            addLogEntry('critical', `Drift: CRITICAL`, `Batch ${batchId} significant deviation detected!`);
        }

        // If drift detected, try to get recommendation
        if (alarm !== 'OK') {
            try {
                const recs = await api.recommendations(batchId, cluster);
                if (recs && recs.pathway_a) {
                    const recText = Object.entries(recs.pathway_a.parameter_changes || {})
                        .map(([k, v]) => `${k}: ${v > 0 ? '+' : ''}${v.toFixed(2)}`)
                        .join(', ');
                    addLogEntry('rec', `Recommendation generated`, `Yield Guard: ${recText} | Expected CO₂e: ${(recs.pathway_a.expected_co2e || 0).toFixed(1)} kg`);
                }
            } catch { /* recommendation unavailable */ }
        }
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

    // Update charts
    updateTrendChart();
    updateDriftChart();
    updateHeatmap();
}

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
        z: [h.hardness, h.dissolution, h.co2e],
        x: h.labels,
        y: ['Hardness', 'Dissolution', 'CO₂e'],
        type: 'heatmap',
        colorscale: 'RdYlGn',
        reversescale: false,
    }], { height: 200, margin: { l: 100, r: 20, t: 10, b: 60 }, xaxis: { title: 'Batch' } });
}

function addLogEntry(type, title, detail) {
    const log = document.getElementById('sim-log');
    if (!log) return;

    const colors = {
        system: 'var(--text-muted)',
        data: 'var(--accent-blue)',
        ok: 'var(--accent-green)',
        warning: 'var(--accent-amber)',
        critical: 'var(--accent-red)',
        rec: '#9333EA',
        complete: 'var(--accent-blue)',
    };
    const icons = {
        system: '⚙',
        data: '📦',
        ok: '✅',
        warning: '⚠️',
        critical: '🚨',
        rec: '💡',
        complete: '🏁',
    };

    const now = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border-light);font-size:0.85rem;animation:fadeIn 0.3s ease';
    entry.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px">
            <span>${icons[type] || '•'}</span>
            <strong style="color:${colors[type] || 'inherit'}">${title}</strong>
            <span style="margin-left:auto;color:var(--text-muted);font-size:0.75rem">${now}</span>
        </div>
        <div style="color:var(--text-secondary);font-size:0.8rem;margin-top:2px;padding-left:26px">${detail}</div>
    `;
    log.prepend(entry);

    // Keep max 100 entries
    while (log.children.length > 100) log.removeChild(log.lastChild);
}
