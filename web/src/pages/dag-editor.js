/**
 * DAG Editor Page — Define, validate, upload, and manage custom causal DAGs.
 */
import { api } from '../api.js';
import { renderSidebar } from '../components/sidebar.js';
import { requireAuth } from '../lib/auth.js';
import { trackAction } from '../lib/tracker.js';

const BASE = '/api';

async function dagGet(endpoint) {
    const res = await fetch(`${BASE}/${endpoint}`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || res.statusText);
    }
    return res.json();
}

async function dagPost(endpoint, data) {
    const res = await fetch(`${BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || res.statusText);
    }
    return res.json();
}

async function dagDelete(endpoint) {
    const res = await fetch(`${BASE}/${endpoint}`, { method: 'DELETE' });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || res.statusText);
    }
    return res.json();
}

export async function renderDagEditor(main) {
    if (!requireAuth()) return;
    renderSidebar({});
    trackAction('page_view', { page: 'dag-editor' });

    main.innerHTML = `
    <div class="page-header">
      <h1>Causal DAG Editor</h1>
      <p>Define or override the causal Directed Acyclic Graph used by the recommendation engine.</p>
    </div>

    <!-- Section 1: Current DAG Status -->
    <h2 class="section-title" style="display:flex; justify-content:space-between; align-items:flex-end;">
      <span>Current DAG Status</span>
      <button class="btn btn-outline btn-sm" id="btn-reset-dag" style="border-color:var(--accent-red); color:var(--accent-red); font-size: 0.8rem; padding: 6px 12px;">Reset to Default</button>
    </h2>
    <div id="dag-status-area" style="margin-bottom: 2rem;">
      <div class="card" style="padding:1.5rem;">
        <div style="margin-bottom:1rem;">
            <span style="font-weight:700; font-size:1.1rem;" id="dag-source-label">Loading...</span>
            <span id="dag-stats" style="margin-left:1rem; color:var(--text-muted);"></span>
        </div>
        
        <div style="display:grid; grid-template-columns: 2fr 1fr; gap: 1.5rem;">
          <!-- Left: Visualization -->
          <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); background: #fafafa; position: relative;">
             <div id="dag-network-container" style="width: 100%; height: 400px;"></div>
             <div style="position: absolute; bottom: 8px; left: 8px; font-size: 0.75rem; color: var(--text-muted); pointer-events: none;">
                💡 Drag nodes to interact. Scroll to zoom.
             </div>
          </div>
          
          <!-- Right: Edge Table -->
          <div style="max-height:400px; overflow-y:auto; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
            <table class="data-table" id="dag-edges-table" style="width:100%; margin:0;">
              <thead style="position: sticky; top: 0; z-index: 10;">
                <tr><th>#</th><th>Cause</th><th style="text-align:center;">--&gt;</th><th>Effect</th></tr>
              </thead>
              <tbody id="dag-edges-tbody"></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <hr class="divider" />

    <!-- Section 2: JSON Edge Editor -->
    <h2 class="section-title">JSON Edge Editor</h2>
    <div class="card" style="padding:1.5rem;">
      <p style="margin-bottom:0.75rem; color:var(--text-muted);">Edit the edge list below. Each edge is <code>{"cause": "...", "effect": "..."}</code>.</p>
      <textarea id="dag-json-editor" style="width:100%;height:280px;font-family:monospace;font-size:0.85rem;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border-color);border-radius:6px;padding:12px;resize:vertical;" spellcheck="false"></textarea>
      <div style="margin-top:0.75rem; display:flex; gap:1rem; align-items:center;">
        <button class="btn btn-primary" id="btn-apply-json">Validate & Apply</button>
        <span id="json-feedback" style="font-size:0.9rem;"></span>
      </div>
    </div>

    <hr class="divider" />

    <!-- Section 3: CSV Upload -->
    <h2 class="section-title">CSV Upload</h2>
    <div class="card" style="padding:1.5rem;">
      <p style="margin-bottom:0.75rem; color:var(--text-muted);">Upload a CSV file with columns <code>cause</code> and <code>effect</code>.</p>
      <div style="display:flex; gap:1rem; align-items:center;">
        <input type="file" id="dag-csv-file" accept=".csv" style="color:var(--text-primary);" />
        <button class="btn btn-outline" id="btn-upload-csv">Upload & Apply</button>
      </div>
      <span id="csv-feedback" style="font-size:0.9rem; display:block; margin-top:0.5rem;"></span>
    </div>

    <hr class="divider" />

    <!-- Section 4: Refit Models -->
    <h2 class="section-title">Refit Causal Models</h2>
    <div class="card" style="padding:1.5rem;">
      <p style="margin-bottom:0.75rem; color:var(--text-muted);">After changing the DAG, you must refit the 6 DoWhy structural causal models for the recommendations to reflect the new graph structure.</p>
      <div style="display:flex; gap:1rem; align-items:center;">
        <button class="btn btn-primary" id="btn-refit">Refit Causal Models</button>
        <span id="refit-feedback" style="font-size:0.9rem;"></span>
      </div>
    </div>

    <hr class="divider" />

    <!-- Section 5: Valid Nodes Reference -->
    <h2 class="section-title">Valid Node Names</h2>
    <div class="card" style="padding:1.5rem;">
      <p style="margin-bottom:0.75rem; color:var(--text-muted);">These are all the valid node names you can use when defining edges.</p>
      <input type="text" id="node-search" placeholder="Search nodes..." style="width:100%;padding:8px 12px;margin-bottom:0.75rem;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border-color);border-radius:6px;" />
      <div id="valid-nodes-chips" style="display:flex;flex-wrap:wrap;gap:0.5rem;"></div>
    </div>
    `;

    // Load initial data
    await loadDAGStatus();
    await loadValidNodes();
    attachHandlers();
}


// ---------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------
async function loadDAGStatus() {
    try {
        const data = await dagGet('dag/active');
        const label = document.getElementById('dag-source-label');
        const stats = document.getElementById('dag-stats');
        const tbody = document.getElementById('dag-edges-tbody');
        const editor = document.getElementById('dag-json-editor');

        if (data.source === 'custom') {
            label.innerHTML = '<span style="color:var(--accent-amber); font-weight:700;">Custom (User-Defined)</span>';
        } else {
            label.innerHTML = '<span style="color:var(--accent-green); font-weight:700;">Default (Hardcoded)</span>';
        }
        stats.textContent = `${data.num_nodes} nodes, ${data.num_edges} edges`;

        tbody.innerHTML = data.edges.map((e, i) =>
            `<tr><td>${i + 1}</td><td>${e.cause}</td><td style="text-align:center;color:var(--text-muted);">--&gt;</td><td>${e.effect}</td></tr>`
        ).join('');

        editor.value = JSON.stringify(data.edges, null, 2);

        // Render vis-network
        renderNetwork(data.edges);

    } catch (e) {
        document.getElementById('dag-source-label').textContent = 'Error loading DAG';
    }
}

let networkInstance = null;

function renderNetwork(edges) {
    const container = document.getElementById('dag-network-container');
    if (!container || !window.vis) return;

    // Collect unique nodes
    const nodeSet = new Set();
    edges.forEach(e => {
        nodeSet.add(e.cause);
        nodeSet.add(e.effect);
    });

    const nodesData = Array.from(nodeSet).map((id, index) => {
        // Color coding based on domain knowledge (optional but looks nice)
        let color = '#E5E7EB'; // default generic
        let labelColor = '#1F2937';
        
        if (['total_energy_kWh', 'total_CO2e_kg'].includes(id)) {
            color = '#DBEAFE'; // blue
            labelColor = '#1E3A8A';
        } else if (['Hardness', 'Friability', 'Dissolution_Rate', 'Disintegration_Time', 'Content_Uniformity', 'Tablet_Weight'].includes(id)) {
            color = '#DCFCE7'; // green for CQA
            labelColor = '#14532D';
        } else {
            color = '#FEF3C7'; // yellow for CPP
            labelColor = '#92400E';
        }

        return { 
            id, 
            label: id.replace(/_/g, '\\n'), 
            shape: 'box',
            font: { color: labelColor, face: 'Inter', size: 14, multi: true, bold: '14px' },
            color: {
                background: color,
                border: labelColor,
                highlight: { background: '#FFFFFF', border: '#4F46E5' },
            },
            borderWidth: 2,
            shadow: { enabled: true, color: 'rgba(0,0,0,0.1)', size: 5, x: 2, y: 2 }
        };
    });

    const edgesData = edges.map(e => ({
        from: e.cause,
        to: e.effect,
        arrows: 'to',
        color: { color: '#9CA3AF', highlight: '#4F46E5' },
        width: 2,
        smooth: { type: 'cubicBezier', forceDirection: 'vertical', roundness: 0.4 }
    }));

    const data = {
        nodes: new window.vis.DataSet(nodesData),
        edges: new window.vis.DataSet(edgesData)
    };

    const options = {
        layout: {
            hierarchical: {
                direction: 'UD', // Up to Down
                sortMethod: 'directed',
                nodeSpacing: 180,
                levelSeparation: 120
            }
        },
        physics: false, // Turn off physics since hierarchical is clean
        interaction: {
            dragNodes: true,
            dragView: true,
            zoomView: true,
            hover: true
        }
    };

    if (networkInstance) {
        networkInstance.destroy();
    }
    networkInstance = new window.vis.Network(container, data, options);
}


async function loadValidNodes() {
    try {
        const data = await dagGet('dag/valid-nodes');
        const container = document.getElementById('valid-nodes-chips');
        const allNodes = data.nodes;

        function renderChips(filter = '') {
            const filtered = filter
                ? allNodes.filter(n => n.toLowerCase().includes(filter.toLowerCase()))
                : allNodes;
            container.innerHTML = filtered.map(n =>
                `<span style="display:inline-block;padding:4px 12px;border-radius:20px;font-size:0.8rem;font-weight:500;background:var(--bg-secondary);border:1px solid var(--border-color);color:var(--text-primary);">${n}</span>`
            ).join('');
        }

        renderChips();

        document.getElementById('node-search').addEventListener('input', (e) => {
            renderChips(e.target.value);
        });
    } catch (e) {
        document.getElementById('valid-nodes-chips').textContent = 'Failed to load valid nodes.';
    }
}


// ---------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------
function attachHandlers() {
    // Apply JSON
    document.getElementById('btn-apply-json').addEventListener('click', async () => {
        const fb = document.getElementById('json-feedback');
        const editor = document.getElementById('dag-json-editor');
        fb.textContent = '';
        let edges;
        try {
            edges = JSON.parse(editor.value);
        } catch (e) {
            fb.innerHTML = `<span style="color:var(--accent-red);">Invalid JSON: ${e.message}</span>`;
            return;
        }
        try {
            const res = await dagPost('dag/set', { edges });
            fb.innerHTML = `<span style="color:var(--accent-green);">${res.message}</span>`;
            await loadDAGStatus();
        } catch (e) {
            fb.innerHTML = `<span style="color:var(--accent-red);">${e.message}</span>`;
        }
    });

    // Upload CSV
    document.getElementById('btn-upload-csv').addEventListener('click', async () => {
        const fb = document.getElementById('csv-feedback');
        const fileInput = document.getElementById('dag-csv-file');
        fb.textContent = '';
        if (!fileInput.files.length) {
            fb.innerHTML = `<span style="color:var(--accent-red);">Please select a CSV file first.</span>`;
            return;
        }
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        try {
            const res = await fetch(`${BASE}/dag/upload-csv`, { method: 'POST', body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Upload failed');
            fb.innerHTML = `<span style="color:var(--accent-green);">${data.message}</span>`;
            await loadDAGStatus();
        } catch (e) {
            fb.innerHTML = `<span style="color:var(--accent-red);">${e.message}</span>`;
        }
    });

    // Reset to default
    document.getElementById('btn-reset-dag').addEventListener('click', async () => {
        if (!confirm('Revert to the hardcoded default DAG? Your custom DAG will be deleted.')) return;
        try {
            await dagDelete('dag/reset');
            await loadDAGStatus();
        } catch (e) {
            alert('Reset failed: ' + e.message);
        }
    });

    // Refit models
    document.getElementById('btn-refit').addEventListener('click', async () => {
        const fb = document.getElementById('refit-feedback');
        const btn = document.getElementById('btn-refit');
        btn.disabled = true;
        fb.innerHTML = '<span style="color:var(--accent-amber);">Refitting models... this may take 30-60 seconds.</span>';
        try {
            const res = await dagPost('dag/refit-models', {});
            fb.innerHTML = `<span style="color:var(--accent-green);">${res.message}</span>`;
        } catch (e) {
            fb.innerHTML = `<span style="color:var(--accent-red);">Refit failed: ${e.message}</span>`;
        }
        btn.disabled = false;
    });
}
