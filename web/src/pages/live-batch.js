/**
 * Live Batch Page — CPP sliders, drift check, envelope chart, radar, energy.
 */
import { api } from '../api.js';
import { renderSidebar, state } from '../components/sidebar.js';
import { plotChart, DARK_LAYOUT, COLORS, CLUSTER_COLORS } from '../components/charts.js';

let cachedStats = null;
let cachedCentroids = null;
let cachedEnvelopes = null;
let cachedConstraints = null;

export async function renderLiveBatch(main) {
    renderSidebar({ showEmissionFactor: true });

    main.innerHTML = `
    <div class="page-header">
      <h1>Live Batch vs Golden Envelope</h1>
      <p id="batch-caption">Loading...</p>
    </div>

    <h2 class="section-title">Process Parameter Controls</h2>
    <div class="form-grid" id="cpp-sliders"></div>
    <button class="btn btn-primary btn-full" id="btn-drift">Check Drift</button>

    <div id="drift-result" style="margin-top:1rem"></div>

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
    <div id="envelope-chart" class="chart-container" style="height:420px"></div>

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
        [cachedStats, cachedCentroids, cachedEnvelopes, cachedConstraints] = await Promise.all([
            cachedStats || api.masterStats(),
            cachedCentroids || api.centroids(),
            cachedEnvelopes || api.envelopes(),
            cachedConstraints || api.constraints(),
        ]);
    } catch (e) {
        main.innerHTML = `<div class="alert alert-crit">Failed to load data: ${e.message}</div>`;
        return;
    }

    updateCaption();
    buildCPPSliders();
    buildPhaseSelectors();
    renderEnvelope();
    renderRadar();
    loadTrajectory();

    document.getElementById('btn-drift').addEventListener('click', runDriftCheck);
    document.getElementById('env-phase').addEventListener('change', () => {
        buildSensorOptions();
        renderEnvelope();
    });
    document.getElementById('env-sensor').addEventListener('change', renderEnvelope);
}

function updateCaption() {
    const el = document.getElementById('batch-caption');
    if (el) el.textContent = `Cluster: ${state.cluster} | Batch: ${state.batchId} | EF: ${state.emissionFactor} kg CO₂/kWh`;
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

function renderEnvelope() {
    const phase = document.getElementById('env-phase')?.value;
    const sensor = document.getElementById('env-sensor')?.value;
    if (!phase || !sensor) return;

    const envData = cachedEnvelopes?.[state.cluster]?.[phase]?.[sensor];
    if (!envData) {
        document.getElementById('envelope-chart').innerHTML = '<div class="alert alert-info">No envelope data for this selection</div>';
        return;
    }

    const mean = envData.mean;
    const upper = envData.upper;
    const lower = envData.lower;
    const x = Array.from({ length: mean.length }, (_, i) => i);

    // Simulated signal
    const cppVals = getCPPValues();
    const centroid = cachedCentroids[state.cluster] || {};
    let totalDev = 0;
    cachedConstraints.CPP_COLS.forEach(c => {
        const curr = cppVals[c] || 0;
        const gold = centroid[c] || 0.01;
        totalDev += Math.abs(curr - gold) / Math.max(Math.abs(gold), 0.01) * 100;
    });
    totalDev /= cachedConstraints.CPP_COLS.length;

    const std = Math.sqrt(mean.reduce((a, v) => a + Math.pow(v - mean.reduce((s, x) => s + x, 0) / mean.length, 2), 0) / mean.length) || 1;
    const noise = Math.max(0.02, totalDev / 100) * std;

    // Seeded random via simple hash
    let seed = state.batchId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed / 2147483647 - 0.5) * 2; };
    const simulated = mean.map(v => v + rand() * noise);

    const traces = [
        { x: [...x, ...x.slice().reverse()], y: [...upper, ...lower.slice().reverse()], fill: 'toself', fillcolor: 'rgba(46,134,193,0.15)', line: { color: 'rgba(0,0,0,0)' }, name: '±3σ Envelope', hoverinfo: 'skip' },
        { x, y: mean, mode: 'lines', line: { color: COLORS.blue, width: 2, dash: 'dot' }, name: 'Golden Mean (DBA)' },
        { x, y: upper, mode: 'lines', line: { color: COLORS.blue, width: 1, dash: 'dash' }, name: 'Upper +3σ', opacity: 0.6 },
        { x, y: lower, mode: 'lines', line: { color: COLORS.blue, width: 1, dash: 'dash' }, name: 'Lower -3σ', opacity: 0.6 },
        { x, y: simulated, mode: 'lines', line: { color: COLORS.orange, width: 2.5 }, name: `Batch ${state.batchId}` },
    ];

    // Highlight outside
    const outsideX = [], outsideY = [];
    simulated.forEach((v, i) => {
        if (v < lower[i] || v > upper[i]) { outsideX.push(i); outsideY.push(v); }
    });
    if (outsideX.length) {
        traces.push({ x: outsideX, y: outsideY, mode: 'markers', marker: { color: COLORS.red, size: 8, symbol: 'x' }, name: 'Outside Envelope' });
    }

    plotChart('envelope-chart', traces, {
        title: `Batch ${state.batchId} vs ${state.cluster} — ${phase} / ${sensor}`,
        xaxis: { title: 'Time Step' },
        yaxis: { title: sensor.replace(/_/g, ' ') },
        height: 420,
        legend: { orientation: 'h', y: -0.18 },
    });
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
        { type: 'scatterpolar', r: [...goldNorm, goldNorm[0]], theta: [...labels, labels[0]], fill: 'toself', fillcolor: 'rgba(46,134,193,0.2)', line: { color: COLORS.blue, width: 2 }, name: 'Golden Centroid' },
        { type: 'scatterpolar', r: [...currNorm, currNorm[0]], theta: [...labels, labels[0]], fill: 'toself', fillcolor: 'rgba(230,126,34,0.2)', line: { color: COLORS.orange, width: 2 }, name: 'Current Batch' },
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
