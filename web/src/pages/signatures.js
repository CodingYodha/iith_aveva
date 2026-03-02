/**
 * Golden Signatures Page — 3D Pareto, cluster profiles, version history, simulate.
 */
import { api } from '../api.js';
import { renderSidebar, state } from '../components/sidebar.js';
import { plotChart, COLORS, CLUSTER_COLORS } from '../components/charts.js';

const CLUSTERS = ['Max Quality Golden', 'Deep Decarbonization Golden', 'Balanced Operational Golden'];

export async function renderSignatures(main) {
    renderSidebar({ showEmissionFactor: false });

    main.innerHTML = `
    <div class="page-header">
      <h1>Golden Signature Explorer</h1>
      <p>Pareto-optimal trade-off space — 3 golden clusters — Continuous learning</p>
    </div>

    <h2 class="section-title">Multi-Objective Pareto Front — Trade-off Space</h2>
    <div id="pareto-chart" class="chart-container" style="height:550px"></div>

    <hr class="divider" />

    <h2 class="section-title">Golden Cluster Profiles</h2>
    <div class="grid-3" id="cluster-cards"></div>

    <hr class="divider" />

    <h2 class="section-title">Signature Version History</h2>
    <div class="form-group" style="max-width:360px;margin-bottom:1rem">
      <label for="hist-cluster">Cluster</label>
      <select id="hist-cluster" style="width:100%;padding:8px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary)">
        ${CLUSTERS.map(c => `<option value="${c}">${c}</option>`).join('')}
      </select>
    </div>
    <div id="version-timeline"></div>

    <hr class="divider" />

    <h2 class="section-title">Simulate New Batch — Dominance Check</h2>
    <div id="sim-panel" style="display:none">
      <div class="form-grid" id="sim-sliders"></div>
      <button class="btn btn-primary" id="btn-sim">Check Dominance</button>
      <div id="sim-result" style="margin-top:1rem"></div>
    </div>
    <button class="btn btn-outline" id="btn-show-sim">Open Simulation Panel</button>

    <hr class="divider" />

    <h2 class="section-title">Export Golden Signatures</h2>
    <button class="btn btn-outline" id="btn-export">Download Golden Signatures (JSON)</button>
  `;

    // Load data
    const [pareto, centroids, constraints] = await Promise.all([
        api.pareto().catch(() => []),
        api.centroids().catch(() => ({})),
        api.constraints().catch(() => ({})),
    ]);

    // 3D Pareto
    if (pareto.length) renderParetoChart(pareto);
    else document.getElementById('pareto-chart').innerHTML = '<div class="alert alert-info">No Pareto front data found.</div>';

    // Cluster cards
    renderClusterCards(centroids);

    // History
    loadHistory(CLUSTERS[0]);
    document.getElementById('hist-cluster').addEventListener('change', e => loadHistory(e.target.value));

    // Simulate
    document.getElementById('btn-show-sim').addEventListener('click', () => {
        document.getElementById('sim-panel').style.display = 'block';
        document.getElementById('btn-show-sim').style.display = 'none';
        buildSimSliders(centroids, constraints);
    });

    // Export
    document.getElementById('btn-export').addEventListener('click', () => exportSignatures(centroids));
}

function renderParetoChart(pareto) {
    const traces = [];
    for (const [cname, color] of Object.entries(CLUSTER_COLORS)) {
        const subset = pareto.filter(r => r.cluster_name === cname);
        if (!subset.length) continue;
        traces.push({
            type: 'scatter3d', mode: 'markers',
            x: subset.map(r => r.Dissolution_Rate || 0),
            y: subset.map(r => r.Hardness || 0),
            z: subset.map(r => r.total_CO2e_kg || r.total_energy_kWh || 0),
            marker: { size: 5, color, opacity: 0.8 },
            name: cname,
            hovertext: subset.map(r =>
                `Cluster: ${cname}<br>Hardness: ${(r.Hardness || 0).toFixed(2)}<br>Dissolution: ${(r.Dissolution_Rate || 0).toFixed(2)}<br>Friability: ${(r.Friability || 0).toFixed(3)}<br>CO₂e: ${(r.total_CO2e_kg || 0).toFixed(2)}`
            ),
            hoverinfo: 'text',
        });
    }

    plotChart('pareto-chart', traces, {
        scene: {
            xaxis: { title: 'Dissolution Rate' },
            yaxis: { title: 'Hardness' },
            zaxis: { title: 'CO₂e (kg)' },
            bgcolor: '#FAFAFA',
        },
        height: 550,
        margin: { l: 0, r: 0, t: 30, b: 0 },
        legend: { orientation: 'h', y: -0.05, font: { size: 12 } },
    });
}

async function renderClusterCards(centroids) {
    const container = document.getElementById('cluster-cards');
    const cards = [];

    for (const cname of CLUSTERS) {
        const color = CLUSTER_COLORS[cname] || COLORS.blue;
        const cpps = centroids[cname] || {};

        let sigInfo = '';
        try {
            const sig = await api.signature(cname);
            sigInfo = `<div style="color:var(--text-muted);font-size:0.8rem;margin-bottom:0.5rem">v${sig.version} — ${sig.source} — Active since ${(sig.created_at || '').slice(0, 19)}</div>`;
        } catch {
            sigInfo = '<div style="color:var(--text-muted);font-size:0.8rem;margin-bottom:0.5rem">Signature info unavailable</div>';
        }

        const rows = Object.entries(cpps).map(([k, v]) =>
            `<tr><td>${k.replace(/_/g, ' ')}</td><td>${v.toFixed(2)}</td></tr>`
        ).join('');

        cards.push(`
      <div class="card">
        <h3><span class="dot" style="background:${color}"></span>${cname}</h3>
        ${sigInfo}
        <table class="data-table"><thead><tr><th>Parameter</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    `);
    }
    container.innerHTML = cards.join('');
}

async function loadHistory(clusterName) {
    const container = document.getElementById('version-timeline');
    try {
        const history = await api.signatureHistory(clusterName);
        if (!history || !history.length) {
            container.innerHTML = '<div class="alert alert-info">No history available.</div>';
            return;
        }

        container.innerHTML = history.map(entry => {
            const ver = entry.version || '?';
            const source = entry.source || 'unknown';
            const created = (entry.created_at || '').slice(0, 19);
            const trigger = entry.trigger_batch_id;
            const active = entry.is_active ? '<span class="badge badge-pass" style="margin-left:8px">ACTIVE</span>' : '';

            return `
        <div class="timeline-entry">
          <span class="version-badge">v${ver}</span>
          <strong style="margin-left:8px">${source.toUpperCase()}</strong>${active}<br/>
          <span style="color:var(--text-muted)">${created}</span>
          ${trigger ? `<br/><span style="color:var(--accent-green)">Triggered by batch: <strong>${trigger}</strong></span>` : ''}
        </div>
      `;
        }).join('');
    } catch (e) {
        container.innerHTML = `<div class="alert alert-warn">Could not load history: ${e.message}</div>`;
    }
}

async function buildSimSliders(centroids, constraints) {
    const container = document.getElementById('sim-sliders');
    const cppCols = constraints.CPP_COLS || [];
    let stats;
    try { stats = await api.masterStats(); } catch { return; }

    const centroid = centroids[state.cluster] || {};
    container.innerHTML = cppCols.map(cpp => {
        const r = stats.cpp_ranges?.[cpp] || { min: 0, max: 100, mean: 50 };
        const def = centroid[cpp] ?? r.mean;
        const clamped = Math.max(r.min, Math.min(r.max, def));
        const step = ((r.max - r.min) / 50).toFixed(4);
        return `
      <div class="form-group">
        <label>${cpp.replace(/_/g, ' ')}</label>
        <input type="range" id="sim-${cpp}" min="${r.min}" max="${r.max}" step="${step}" value="${clamped}" />
        <div class="range-value" id="srv-${cpp}">${clamped.toFixed(2)}</div>
      </div>
    `;
    }).join('');

    cppCols.forEach(cpp => {
        const sl = document.getElementById(`sim-${cpp}`);
        const rv = document.getElementById(`srv-${cpp}`);
        sl.addEventListener('input', () => { rv.textContent = parseFloat(sl.value).toFixed(2); });
    });

    document.getElementById('btn-sim').addEventListener('click', () => {
        document.getElementById('sim-result').innerHTML = '<div class="alert alert-info">Dominance check requires the backend signature-manager endpoint. Use the API directly for full simulation.</div>';
    });
}

async function exportSignatures(centroids) {
    const exportData = { clusters: {}, export_info: 'CB-MOPA Golden Signature Export' };
    for (const cname of CLUSTERS) {
        try {
            const sig = await api.signature(cname);
            exportData.clusters[cname] = { cpp_params: centroids[cname] || {}, version: sig.version, source: sig.source, created_at: sig.created_at };
        } catch {
            exportData.clusters[cname] = { cpp_params: centroids[cname] || {} };
        }
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'golden_signatures_export.json'; a.click();
    URL.revokeObjectURL(url);
}
