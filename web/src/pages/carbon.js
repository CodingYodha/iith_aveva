/**
 * Carbon Targets Page — gauge, trend, donut, target adjustment, compliance.
 */
import { api } from '../api.js';
import { renderSidebar, state } from '../components/sidebar.js';
import { plotChart, COLORS } from '../components/charts.js';

export async function renderCarbon(main) {
    renderSidebar({ showEmissionFactor: true, onChange: () => renderCarbon(main) });

    // Load data
    let stats, constraints, carbonData, traj;
    try {
        [stats, constraints, carbonData] = await Promise.all([
            api.masterStats(),
            api.constraints(),
            api.carbonTargets().catch(() => null),
        ]);
    } catch (e) {
        main.innerHTML = `<div class="alert alert-crit">Failed to load data: ${e.message}</div>`;
        return;
    }

    const batchData = stats.batch_data?.[state.batchId] || stats.batch_data?.[stats.batch_ids[0]] || {};
    const currentCo2e = batchData.total_CO2e_kg || 67.0;
    const carbonConfig = constraints.CARBON_CONFIG || {};
    const regulatoryLimit = carbonConfig.regulatory_limit_kg || 85;
    const targetCo2e = carbonData?.current_target_kg || 50;
    const allCo2e = stats.batch_ids.map(id => stats.batch_data?.[id]?.total_CO2e_kg || 0).filter(v => v > 0);
    const recentValues = carbonData?.recent_co2e_values || allCo2e.slice(-20);
    const rolling5 = allCo2e.length >= 5 ? allCo2e.slice(-5).reduce((a, b) => a + b, 0) / 5 : currentCo2e;
    const prevCo2e = allCo2e.length >= 2 ? allCo2e[allCo2e.length - 2] : currentCo2e;
    const pctOfTarget = (currentCo2e / regulatoryLimit) * 100;

    main.innerHTML = `
    <div class="page-header">
      <h1>Carbon & Sustainability Targets</h1>
      <p>Real-time CO₂e tracking — Phase attribution — Adaptive target setting</p>
    </div>

    <div class="grid-3" style="margin-bottom:1.5rem">
      <div class="metric-card">
        <div class="metric-value">${currentCo2e.toFixed(2)} kg</div>
        <p class="metric-label">Current Batch CO₂e</p>
        <div class="metric-delta ${currentCo2e < prevCo2e ? 'positive' : 'negative'}">${(currentCo2e - prevCo2e) > 0 ? '+' : ''}${(currentCo2e - prevCo2e).toFixed(2)} kg vs prev</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${rolling5.toFixed(2)} kg</div>
        <p class="metric-label">5-Batch Rolling Average</p>
      </div>
      <div class="metric-card">
        <div class="metric-value" style="color:${pctOfTarget <= 100 ? 'var(--accent-green)' : 'var(--accent-red)'}">${pctOfTarget.toFixed(1)}%</div>
        <p class="metric-label">% vs Regulatory Target</p>
        <div class="metric-delta neutral">Target: ${regulatoryLimit} kg</div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:1.5rem">
      <div>
        <h2 class="section-title">CO₂e Gauge</h2>
        <div id="gauge-chart" class="chart-container" style="height:320px"></div>
      </div>
      <div>
        <h2 class="section-title">CO₂e Trend — Last 20 Batches</h2>
        <div id="trend-chart" class="chart-container" style="height:320px"></div>
      </div>
    </div>

    <hr class="divider" />

    <h2 class="section-title">Phase CO₂e Attribution</h2>
    <div class="grid-2" style="margin-bottom:1.5rem">
      <div id="donut-chart" class="chart-container" style="height:350px"></div>
      <div id="phase-table"></div>
    </div>

    <hr class="divider" />

    <h2 class="section-title">Dynamic Target Adjustment</h2>
    <div class="grid-2" style="margin-bottom:1.5rem">
      <div id="target-chart" class="chart-container" style="height:280px"></div>
      <div id="target-info"></div>
    </div>

    <hr class="divider" />

    <h2 class="section-title">Shift Emission Factors</h2>
    <div id="shift-chart" class="chart-container" style="height:260px"></div>

    <hr class="divider" />

    <h2 class="section-title">Regulatory Compliance Status</h2>
    <div id="compliance-table"></div>
  `;

    // Gauge
    plotChart('gauge-chart', [{
        type: 'indicator', mode: 'gauge+number+delta',
        value: currentCo2e,
        delta: { reference: targetCo2e },
        gauge: {
            axis: { range: [0, regulatoryLimit * 1.5] },
            bar: { color: COLORS.blue },
            steps: [
                { range: [0, targetCo2e * 0.9], color: 'rgba(39,174,96,0.3)' },
                { range: [targetCo2e * 0.9, targetCo2e], color: 'rgba(243,156,18,0.3)' },
                { range: [targetCo2e, regulatoryLimit], color: 'rgba(231,76,60,0.3)' },
            ],
            threshold: { line: { color: COLORS.red, width: 4 }, thickness: 0.75, value: regulatoryLimit },
        },
        number: { suffix: ' kg', font: { size: 28 } },
        title: { text: 'Batch CO₂e', font: { size: 14 } },
    }], { height: 320, margin: { l: 30, r: 30, t: 60, b: 20 } });

    // Trend
    if (recentValues.length) {
        const labels = recentValues.map((_, i) => `B${i + 1}`);
        const trendColors = recentValues.map(v => v <= targetCo2e ? COLORS.green : v <= regulatoryLimit ? COLORS.amber : COLORS.red);
        plotChart('trend-chart', [
            { x: labels, y: recentValues, type: 'bar', marker: { color: trendColors }, name: 'CO₂e' },
            { x: labels, y: labels.map(() => targetCo2e), mode: 'lines', line: { color: COLORS.green, dash: 'dash', width: 2 }, name: 'Internal Target' },
            { x: labels, y: labels.map(() => regulatoryLimit), mode: 'lines', line: { color: COLORS.red, dash: 'dot', width: 2 }, name: 'Regulatory Limit' },
        ], { height: 320, yaxis: { title: 'CO₂e (kg)' }, showlegend: false });
    }

    // Phase donut
    try {
        traj = await api.trajectory(state.batchId);
        if (traj && traj.length) {
            const phaseEnergy = {};
            traj.forEach(r => { phaseEnergy[r.Phase || 'Unknown'] = (phaseEnergy[r.Phase || 'Unknown'] || 0) + (r.Energy_kWh || 0); });
            const phases = Object.keys(phaseEnergy);
            const energies = phases.map(p => phaseEnergy[p]);
            const co2es = energies.map(e => e * state.emissionFactor);
            const phaseColors = ['#27AE60', '#2E86C1', '#E67E22', '#9B59B6', '#E74C3C', '#1ABC9C', '#F39C12'];

            plotChart('donut-chart', [{
                values: co2es, labels: phases, type: 'pie', hole: 0.55,
                marker: { colors: phaseColors.slice(0, phases.length) },
                textinfo: 'label+percent', textfont: { size: 11 },
            }], {
                title: `Phase CO₂e — Batch ${state.batchId}`, height: 350,
                legend: { orientation: 'h', y: -0.1, font: { size: 11 } },
            });

            const total = co2es.reduce((a, b) => a + b, 0);
            const tableRows = phases.map((p, i) =>
                `<tr><td>${p}</td><td>${energies[i].toFixed(2)} kWh</td><td>${co2es[i].toFixed(2)} kg</td><td>${(co2es[i] / total * 100).toFixed(1)}%</td></tr>`
            ).join('');
            document.getElementById('phase-table').innerHTML = `
        <h3 style="margin-bottom:0.5rem">Phase Breakdown</h3>
        <table class="data-table"><thead><tr><th>Phase</th><th>Energy</th><th>CO₂e</th><th>Share</th></tr></thead><tbody>${tableRows}</tbody></table>
      `;
        }
    } catch { /* no trajectory */ }

    // Target adjustment
    const adjustedTarget = targetCo2e;
    plotChart('target-chart', [
        {
            x: ['Current\nBatch', 'Internal\nTarget', 'Regulatory\nLimit'], y: [currentCo2e, adjustedTarget, regulatoryLimit], type: 'bar',
            marker: { color: [currentCo2e <= adjustedTarget ? COLORS.green : COLORS.red, COLORS.blue, COLORS.red] },
            text: [`${currentCo2e.toFixed(1)} kg`, `${adjustedTarget.toFixed(1)} kg`, `${regulatoryLimit.toFixed(1)} kg`],
            textposition: 'outside'
        },
    ], { height: 280, yaxis: { title: 'CO₂e (kg)' } });

    const headroom = adjustedTarget - currentCo2e;
    document.getElementById('target-info').innerHTML = `
    <h3 style="margin-bottom:1rem">Impact Summary</h3>
    <div class="metric-card" style="margin-bottom:0.8rem"><div class="metric-value" style="color:${headroom > 0 ? 'var(--accent-green)' : 'var(--accent-red)'}; font-size:1.3rem">${headroom > 0 ? '+' : ''}${headroom.toFixed(2)} kg</div><p class="metric-label">Headroom vs Target</p></div>
    <div class="metric-card"><div class="metric-value" style="font-size:1.3rem">${(currentCo2e / regulatoryLimit * 100).toFixed(1)}%</div><p class="metric-label">Regulatory Usage</p></div>
  `;

    // Shift emission factors
    const shifts = ['Morning (6-14)', 'Evening (14-22)', 'Night (22-6)'];
    const shiftEFs = [0.68, 0.82, 0.55];
    plotChart('shift-chart', [{
        x: shifts, y: shiftEFs, type: 'bar',
        marker: { color: [COLORS.amber, COLORS.red, COLORS.green] },
        text: shiftEFs.map(v => `${v.toFixed(2)} kg/kWh`), textposition: 'outside',
    }], { height: 260, yaxis: { title: 'kg CO₂/kWh' }, title: 'Grid Emission Factor by Shift' });

    // Compliance table
    renderComplianceTable(batchData, constraints);
}

function renderComplianceTable(batchData, constraints) {
    const limits = constraints.PHARMA_LIMITS || {};
    const cqaCols = constraints.CQA_COLS || [];
    const regulatoryLimit = constraints.CARBON_CONFIG?.regulatory_limit_kg || 85;

    const rows = [];
    cqaCols.forEach(cqa => {
        const val = batchData[cqa] ?? 0;
        const lim = limits[cqa] || {};
        let ok = true, targetStr = '';
        if (lim.min !== undefined && lim.max !== undefined) { ok = val >= lim.min && val <= lim.max; targetStr = `[${lim.min}, ${lim.max}]`; }
        else if (lim.min !== undefined) { ok = val >= lim.min; targetStr = `≥ ${lim.min}`; }
        else if (lim.max !== undefined) { ok = val <= lim.max; targetStr = `≤ ${lim.max}`; }
        rows.push(`<tr><td>${cqa.replace(/_/g, ' ')}</td><td>${val.toFixed(2)}</td><td>${targetStr}</td><td><span class="badge ${ok ? 'badge-pass' : 'badge-fail'}">${ok ? 'PASS' : 'FAIL'}</span></td></tr>`);
    });

    // CO2
    const co2e = batchData.total_CO2e_kg || 0;
    const co2ok = co2e <= regulatoryLimit;
    rows.push(`<tr><td>Total CO₂e</td><td>${co2e.toFixed(2)} kg</td><td>≤ ${regulatoryLimit} kg</td><td><span class="badge ${co2ok ? 'badge-pass' : 'badge-fail'}">${co2ok ? 'PASS' : 'FAIL'}</span></td></tr>`);

    document.getElementById('compliance-table').innerHTML = `
    <table class="data-table">
      <thead><tr><th>Parameter</th><th>Value</th><th>Limit</th><th>Status</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table>
  `;
}
