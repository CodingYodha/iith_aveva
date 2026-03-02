/**
 * Carbon Targets Page — gauge, trend, donut, target adjustment, compliance.
 * All CO₂e values recalculated using the sidebar emission factor.
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
  const carbonConfig = constraints.CARBON_CONFIG || {};
  const regulatoryLimit = carbonConfig.regulatory_limit_kg || 85;
  const targetCo2e = carbonData?.current_target_kg || 50;

  // Recalculate CO₂e from total_energy using the sidebar emission factor
  const batchEnergy = batchData.total_energy_kWh || (batchData.total_CO2e_kg ? batchData.total_CO2e_kg / 0.72 : 93);
  const currentCo2e = batchEnergy * state.emissionFactor;

  // Recalculate all batch CO₂e values using emission factor
  const allCo2e = stats.batch_ids.map(id => {
    const bd = stats.batch_data?.[id] || {};
    const energy = bd.total_energy_kWh || (bd.total_CO2e_kg ? bd.total_CO2e_kg / 0.72 : 0);
    return energy * state.emissionFactor;
  }).filter(v => v > 0);

  const recentValues = allCo2e.slice(-20);
  const rolling5 = allCo2e.length >= 5 ? allCo2e.slice(-5).reduce((a, b) => a + b, 0) / 5 : currentCo2e;
  const prevCo2e = allCo2e.length >= 2 ? allCo2e[allCo2e.length - 2] : currentCo2e;
  const pctOfTarget = (currentCo2e / regulatoryLimit) * 100;

  main.innerHTML = `
    <div class="page-header">
      <h1>Carbon & Sustainability Targets</h1>
      <p>Real-time CO₂e tracking — Phase attribution — Adaptive target setting  |  EF: <strong>${state.emissionFactor.toFixed(2)}</strong> kg CO₂/kWh</p>
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

  // Gauge — now using recalculated CO2e
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
    title: { text: `Batch CO₂e (EF: ${state.emissionFactor})`, font: { size: 14 } },
  }], { height: 320, margin: { l: 30, r: 30, t: 60, b: 20 } });

  // Trend — now using recalculated values
  if (recentValues.length) {
    const labels = recentValues.map((_, i) => `B${i + 1}`);
    const trendColors = recentValues.map(v => v <= targetCo2e ? COLORS.green : v <= regulatoryLimit ? COLORS.amber : COLORS.red);
    plotChart('trend-chart', [
      { x: labels, y: recentValues, type: 'bar', marker: { color: trendColors }, name: 'CO₂e' },
      { x: labels, y: labels.map(() => targetCo2e), mode: 'lines', line: { color: COLORS.green, dash: 'dash', width: 2 }, name: 'Internal Target' },
      { x: labels, y: labels.map(() => regulatoryLimit), mode: 'lines', line: { color: COLORS.red, dash: 'dot', width: 2 }, name: 'Regulatory Limit' },
    ], { height: 320, yaxis: { title: 'CO₂e (kg)' }, showlegend: false });
  }

  // Phase donut — using emission factor
  try {
    traj = await api.trajectory(state.batchId);
    if (traj && traj.length) {
      const phaseEnergy = {};
      traj.forEach(r => { phaseEnergy[r.Phase || 'Unknown'] = (phaseEnergy[r.Phase || 'Unknown'] || 0) + (r.Energy_kWh || 0); });
      const phases = Object.keys(phaseEnergy);
      const energies = phases.map(p => phaseEnergy[p]);
      const co2es = energies.map(e => e * state.emissionFactor);
      const phaseColors = ['#16A34A', '#4F46E5', '#EA580C', '#9333EA', '#DC2626', '#0D9488', '#D97706'];

      plotChart('donut-chart', [{
        values: co2es, labels: phases, type: 'pie', hole: 0.55,
        marker: { colors: phaseColors.slice(0, phases.length) },
        textinfo: 'label+percent', textfont: { size: 11 },
      }], {
        title: `Phase CO₂e — Batch ${state.batchId} (EF: ${state.emissionFactor})`, height: 350,
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

  // Target adjustment — using recalculated CO2e
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

  // Shift emission factors — highlight the user's current EF
  const shifts = ['Morning (6-14)', 'Evening (14-22)', 'Night (22-6)'];
  const shiftEFs = [0.68, 0.82, 0.55];
  plotChart('shift-chart', [{
    x: shifts, y: shiftEFs, type: 'bar',
    marker: { color: [COLORS.amber, COLORS.red, COLORS.green] },
    text: shiftEFs.map(v => `${v.toFixed(2)} kg/kWh`), textposition: 'outside',
  }], { height: 260, yaxis: { title: 'kg CO₂/kWh' }, title: `Grid Emission Factor by Shift (Your EF: ${state.emissionFactor.toFixed(2)})` });

  // Compliance table — using recalculated CO2e
  renderComplianceTable(batchData, constraints, currentCo2e);
}

function renderComplianceTable(batchData, constraints, currentCo2e) {
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

  // CO2 — using recalculated value
  const co2ok = currentCo2e <= regulatoryLimit;
  rows.push(`<tr><td>Total CO₂e (EF: ${state.emissionFactor})</td><td>${currentCo2e.toFixed(2)} kg</td><td>≤ ${regulatoryLimit} kg</td><td><span class="badge ${co2ok ? 'badge-pass' : 'badge-fail'}">${co2ok ? 'PASS' : 'FAIL'}</span></td></tr>`);

  document.getElementById('compliance-table').innerHTML = `
    <table class="data-table">
      <thead><tr><th>Parameter</th><th>Value</th><th>Limit</th><th>Status</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table>
  `;
}
