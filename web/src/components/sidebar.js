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

function showLoading() {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:1rem">
        <div class="spinner" style="width:48px;height:48px;border-width:4px"></div>
        <div style="color:var(--text-secondary);font-weight:600">Updating analytics...</div>
      </div>
    `;
        overlay.style.cssText = `
      position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;
      background:rgba(255,255,255,0.85);backdrop-filter:blur(4px);
      display:flex;align-items:center;justify-content:center;
    `;
        document.body.appendChild(overlay);
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.remove();
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

    <button class="btn btn-primary btn-full" id="sb-apply" style="margin-top:1.2rem">Apply Changes</button>
  `;

    // Update local state on input (no page refresh yet)
    el.querySelector('#sb-cluster').addEventListener('change', e => {
        state.cluster = e.target.value;
    });
    el.querySelector('#sb-batch').addEventListener('input', e => {
        state.batchId = e.target.value.trim() || 'T001';
    });
    if (showEF) {
        const efInput = el.querySelector('#sb-ef');
        const efVal = el.querySelector('#sb-ef-val');
        efInput.addEventListener('input', e => {
            state.emissionFactor = parseFloat(e.target.value);
            efVal.textContent = state.emissionFactor.toFixed(2);
        });
    }

    // Apply button triggers page refresh with loading overlay
    el.querySelector('#sb-apply').addEventListener('click', async () => {
        if (opts.onChange) {
            showLoading();
            // Small delay so spinner renders before heavy work
            await new Promise(r => setTimeout(r, 50));
            try {
                await opts.onChange();
            } finally {
                hideLoading();
            }
        }
    });
}
