/**
 * Shared sidebar component for dashboard pages.
 */

const CLUSTERS = [
    'Max Quality Golden',
    'Deep Decarbonization Golden',
    'Balanced Operational Golden',
];

// Shared state
export const state = {
    cluster: CLUSTERS[2],
    batchId: 'T001',
    emissionFactor: 0.72,
};

export function showSidebar() {
    const el = document.getElementById('sidebar');
    el.classList.remove('hidden');
}

export function hideSidebar() {
    const el = document.getElementById('sidebar');
    el.classList.add('hidden');
}

export function renderSidebar(opts = {}) {
    showSidebar();
    const el = document.getElementById('sidebar');
    const showEF = opts.showEmissionFactor !== false;

    el.innerHTML = `
    <h3>Controls</h3>

    <label for="sb-cluster">Golden Cluster</label>
    <select id="sb-cluster">
      ${CLUSTERS.map(c => `<option value="${c}" ${c === state.cluster ? 'selected' : ''}>${c}</option>`).join('')}
    </select>

    <label for="sb-batch">Batch ID</label>
    <input type="text" id="sb-batch" value="${state.batchId}" />

    ${showEF ? `
      <label for="sb-ef">Emission Factor (kg CO₂/kWh)</label>
      <input type="range" class="sidebar-range" id="sb-ef"
             min="0.3" max="1.2" step="0.01" value="${state.emissionFactor}" />
      <div class="sidebar-range-value" id="sb-ef-val">${state.emissionFactor.toFixed(2)}</div>
    ` : ''}
  `;

    // Bind events
    el.querySelector('#sb-cluster').addEventListener('change', e => {
        state.cluster = e.target.value;
        if (opts.onChange) opts.onChange();
    });
    el.querySelector('#sb-batch').addEventListener('change', e => {
        state.batchId = e.target.value.trim() || 'T001';
        if (opts.onChange) opts.onChange();
    });
    if (showEF) {
        const efInput = el.querySelector('#sb-ef');
        const efVal = el.querySelector('#sb-ef-val');
        efInput.addEventListener('input', e => {
            state.emissionFactor = parseFloat(e.target.value);
            efVal.textContent = state.emissionFactor.toFixed(2);
        });
        efInput.addEventListener('change', () => {
            if (opts.onChange) opts.onChange();
        });
    }
}
