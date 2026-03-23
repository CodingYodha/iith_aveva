/**
 * Agent Dashboard — Track B Agentic Control Center.
 * Three-column layout: Prediction | Golden Signature | Carbon agents.
 * Bottom: activity log.
 */
import { api } from '../api.js';
import { renderSidebar, state } from '../components/sidebar.js';
import { plotChart, COLORS } from '../components/charts.js';
import { showModifyModal } from '../components/modify-modal.js';
import { showToast } from '../components/toast.js';
import { saveAgentRun, saveOperatorDecision } from '../lib/db.js';

let _latestResult = null;

/* ── Simple Markdown → HTML ──────────────────────────────── */
function md(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        // headings
        .replace(/^### (.+)$/gm, '<h4 class="ai-h4">$1</h4>')
        .replace(/^## (.+)$/gm, '<h3 class="ai-h3">$1</h3>')
        // bold
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // italic
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // unordered list items (handle nested with spaces)
        .replace(/^(\s*)[-•] (.+)$/gm, (_, sp, content) => {
            const depth = sp.length >= 4 ? ' nested' : '';
            return `<li class="ai-li${depth}">${content}</li>`;
        })
        // numbered list items
        .replace(/^\d+\.\s+(.+)$/gm, '<li class="ai-li ai-ol">$1</li>')
        // wrap consecutive <li> in <ul>
        .replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul class="ai-ul">$1</ul>')
        // paragraphs (double newline)
        .replace(/\n\n/g, '</p><p class="ai-p">')
        // single newlines inside text (not after html tags)
        .replace(/(?<!\>)\n(?!\<)/g, '<br/>')
        // wrap in paragraph
        ;
}

/* ── AI Analysis Modal ───────────────────────────────────── */
function showAIModal(title, explanation, theme = '') {
    const existing = document.getElementById('ai-modal-overlay');
    if (existing) existing.remove();

    const themeClass = theme === 'sig' ? 'sig-theme' : theme === 'carbon' ? 'carbon-theme' : '';
    const accentColor = theme === 'sig' ? 'var(--accent-orange)' : theme === 'carbon' ? 'var(--accent-green)' : 'var(--accent-blue)';

    const overlay = document.createElement('div');
    overlay.id = 'ai-modal-overlay';
    overlay.className = 'ai-modal-overlay';
    overlay.innerHTML = `
    <div class="ai-modal">
      <div class="ai-modal-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2"><path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z"/><circle cx="12" cy="15" r="2"/></svg>
        <h3>${title}</h3>
        <button class="ai-modal-close" id="ai-modal-close-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="ai-modal-body ${themeClass}">
        ${md(explanation)}
      </div>
    </div>`;

    document.body.appendChild(overlay);

    document.getElementById('ai-modal-close-btn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc); }
    });
}

/* ── Inject Agent Page Styles (once) ─────────────────────── */
function injectStyles() {
    if (document.getElementById('agent-styles')) return;
    const style = document.createElement('style');
    style.id = 'agent-styles';
    style.textContent = `
        .agent-card {
            background: var(--bg-card); border-radius: var(--radius-md);
            padding: 1.5rem; box-shadow: var(--shadow-card);
            display: flex; flex-direction: column; height: 100%;
        }
        .agent-card-header {
            display: flex; align-items: center; gap: 0.5rem;
            padding-bottom: 0.75rem; margin-bottom: 0.75rem;
            border-bottom: 1px solid var(--border-light);
        }
        .agent-card-header h3 { font-size: 0.95rem; font-weight: 700; }
        .agent-badge {
            padding: 0.2rem 0.6rem; border-radius: 20px;
            font-size: 0.7rem; font-weight: 700; margin-left: auto;
        }
        .badge-ok   { background: var(--accent-green-light); color: var(--accent-green); }
        .badge-warn { background: var(--accent-orange-light); color: var(--accent-orange); }
        .badge-fail { background: var(--accent-red-light); color: var(--accent-red); }

        /* AI explanation box — compact preview */
        .ai-box {
            background: var(--bg-input); border-radius: var(--radius-sm);
            padding: 0.8rem 1rem; margin-bottom: 0.4rem;
            font-size: 0.82rem; line-height: 1.6; color: var(--text-primary);
            border-left: 3px solid var(--accent-blue);
            max-height: 90px; overflow: hidden; position: relative;
        }
        .ai-box::after {
            content: ''; position: absolute; bottom: 0; left: 0; right: 0;
            height: 30px; background: linear-gradient(transparent, var(--bg-input));
            pointer-events: none;
        }
        .ai-box.sig-box { border-left-color: var(--accent-orange); }
        .ai-box.carbon-box { border-left-color: var(--accent-green); }
        .ai-box .ai-h3 { font-size: 0.88rem; font-weight: 700; margin: 0.6rem 0 0.2rem; color: var(--text-dark); }
        .ai-box .ai-h4 { font-size: 0.84rem; font-weight: 700; margin: 0.5rem 0 0.2rem; color: var(--text-dark); }
        .ai-box .ai-ul { list-style: none; padding: 0; margin: 0.2rem 0; }
        .ai-box .ai-li { position: relative; padding: 0.12rem 0 0.12rem 1rem; font-size: 0.82rem; }
        .ai-box .ai-li::before { content: ''; position: absolute; left: 0; top: 0.55rem; width: 5px; height: 5px; border-radius: 50%; background: var(--accent-blue); }
        .ai-box .ai-li.nested { padding-left: 2rem; }
        .ai-box .ai-li.nested::before { left: 1rem; background: var(--text-muted); width: 4px; height: 4px; }
        .ai-box .ai-li.ai-ol::before { display: none; }
        .ai-box .ai-p { margin: 0.3rem 0; }
        .ai-box strong { color: var(--text-dark); }

        /* View full analysis button */
        .view-full-btn {
            display: flex; align-items: center; justify-content: center; gap: 0.4rem;
            width: 100%; padding: 0.45rem; margin-bottom: 1rem;
            background: transparent; border: 1px dashed var(--border-color);
            border-radius: var(--radius-sm); cursor: pointer;
            font-size: 0.75rem; font-weight: 600; color: var(--accent-blue);
            transition: all var(--transition);
        }
        .view-full-btn:hover { background: var(--accent-blue-light); border-color: var(--accent-blue); }
        .view-full-btn.sig-btn { color: var(--accent-orange); }
        .view-full-btn.sig-btn:hover { background: var(--accent-orange-light); border-color: var(--accent-orange); }
        .view-full-btn.carbon-btn { color: var(--accent-green); }
        .view-full-btn.carbon-btn:hover { background: var(--accent-green-light); border-color: var(--accent-green); }

        /* Full analysis modal */
        .ai-modal-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 10000;
            background: rgba(0,0,0,0.45); backdrop-filter: blur(6px);
            display: flex; align-items: center; justify-content: center;
            animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .ai-modal {
            background: var(--bg-card); border-radius: var(--radius-lg);
            width: 640px; max-width: 92vw; max-height: 85vh;
            display: flex; flex-direction: column;
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
            animation: slideUp 0.25s ease;
        }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .ai-modal-header {
            display: flex; align-items: center; gap: 0.5rem;
            padding: 1.2rem 1.5rem; border-bottom: 1px solid var(--border-light);
        }
        .ai-modal-header h3 { font-size: 1rem; font-weight: 700; flex: 1; }
        .ai-modal-close {
            width: 30px; height: 30px; border: none; background: var(--bg-input);
            border-radius: 50%; cursor: pointer; display: flex;
            align-items: center; justify-content: center; color: var(--text-muted);
            transition: all var(--transition);
        }
        .ai-modal-close:hover { background: var(--accent-red-light); color: var(--accent-red); }
        .ai-modal-body {
            padding: 1.5rem; overflow-y: auto; flex: 1;
            font-size: 0.88rem; line-height: 1.75; color: var(--text-primary);
        }
        .ai-modal-body .ai-h3 { font-size: 1rem; font-weight: 700; margin: 1.2rem 0 0.4rem; color: var(--text-dark); border-bottom: 1px solid var(--border-light); padding-bottom: 0.3rem; }
        .ai-modal-body .ai-h4 { font-size: 0.95rem; font-weight: 700; margin: 1rem 0 0.3rem; color: var(--text-dark); }
        .ai-modal-body .ai-ul { list-style: none; padding: 0; margin: 0.4rem 0; }
        .ai-modal-body .ai-li { position: relative; padding: 0.25rem 0 0.25rem 1.2rem; font-size: 0.88rem; }
        .ai-modal-body .ai-li::before { content: ''; position: absolute; left: 0; top: 0.65rem; width: 6px; height: 6px; border-radius: 50%; background: var(--accent-blue); }
        .ai-modal-body .ai-li.nested { padding-left: 2.4rem; }
        .ai-modal-body .ai-li.nested::before { left: 1.2rem; background: var(--text-muted); width: 5px; height: 5px; }
        .ai-modal-body .ai-li.ai-ol { counter-increment: ol-counter; }
        .ai-modal-body .ai-li.ai-ol::before { display: none; }
        .ai-modal-body .ai-p { margin: 0.5rem 0; }
        .ai-modal-body strong { color: var(--text-dark); background: rgba(79,70,229,0.06); padding: 0.05rem 0.3rem; border-radius: 3px; }
        .ai-modal-body em { color: var(--text-secondary); }
        .ai-modal-body.sig-theme .ai-li::before { background: var(--accent-orange); }
        .ai-modal-body.sig-theme strong { background: rgba(234,88,12,0.06); }
        .ai-modal-body.carbon-theme .ai-li::before { background: var(--accent-green); }
        .ai-modal-body.carbon-theme strong { background: rgba(22,163,74,0.06); }

        /* Section label */
        .section-label {
            font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.8px;
            color: var(--text-muted); font-weight: 600; margin-bottom: 0.5rem;
        }

        /* CQA table */
        .cqa-table { width: 100%; border-collapse: collapse; }
        .cqa-table th {
            padding: 0.4rem 0.5rem; text-align: left;
            font-size: 0.68rem; text-transform: uppercase;
            color: var(--text-muted); font-weight: 600;
            border-bottom: 2px solid var(--border-color);
        }
        .cqa-table td { padding: 0.4rem 0.5rem; font-size: 0.82rem; border-bottom: 1px solid var(--border-light); }
        .cqa-table td:nth-child(2) { font-weight: 600; font-variant-numeric: tabular-nums; }

        /* Impact cards */
        .impact-row { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
        .impact-card {
            flex: 1; text-align: center; padding: 0.6rem 0.4rem;
            background: var(--bg-input); border-radius: var(--radius-sm);
        }
        .impact-val { font-size: 1.15rem; font-weight: 800; }
        .impact-label { font-size: 0.68rem; color: var(--text-muted); margin-top: 0.1rem; }

        /* Action buttons */
        .action-row { display: flex; gap: 0.5rem; margin-top: 1rem; }
        .action-btn {
            flex: 1; padding: 0.6rem; border: none; border-radius: var(--radius-sm);
            font-weight: 700; font-size: 0.82rem; cursor: pointer;
            transition: opacity var(--transition);
        }
        .action-btn:hover { opacity: 0.85; }
        .btn-accept { background: var(--accent-green); color: white; }
        .btn-modify { background: var(--accent-amber); color: white; }
        .btn-reject { background: var(--accent-red); color: white; }

        /* Status alert */
        .status-alert {
            border-radius: var(--radius-sm); padding: 0.6rem 1rem;
            font-weight: 600; font-size: 0.82rem; margin-bottom: 1rem;
            display: flex; align-items: center; gap: 0.5rem;
        }
        .status-alert svg { flex-shrink: 0; }

        /* Agents grid responsive */
        @media (max-width: 1100px) {
            .agents-grid { grid-template-columns: 1fr !important; }
        }
    `;
    document.head.appendChild(style);
}

/* ── Main Render ─────────────────────────────────────────── */
export async function renderAgentDashboard(main) {
    injectStyles();
    renderSidebar({ showEmissionFactor: false, onChange: () => renderAgentDashboard(main) });

    main.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
      <div>
        <h1 style="font-size:1.5rem;font-weight:800;color:var(--text-dark)">Agentic Control Center</h1>
        <p style="color:var(--text-secondary);font-size:0.82rem;margin-top:0.2rem">Multi-Agent Golden Signature Lifecycle &amp; Carbon Reporting</p>
      </div>
      <button class="btn btn-primary" id="run-agents-btn" style="display:flex;align-items:center;gap:0.5rem;font-weight:700">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Run Agents
      </button>
    </div>
    <div id="agents-status" style="margin-bottom:1rem"></div>
    <div class="agents-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1.2rem;margin-bottom:2rem;align-items:start">
      <div id="col-prediction"></div>
      <div id="col-signature"></div>
      <div id="col-carbon"></div>
    </div>
    <div id="activity-log-section"></div>`;

    document.getElementById('run-agents-btn').addEventListener('click', async () => {
        const btn = document.getElementById('run-agents-btn');
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner" style="width:15px;height:15px;border-width:2px"></div> Running...';
        try {
            _latestResult = await api.agentsRun(state.batchId, state.cluster);
            _latestResult.cluster_name = state.cluster;
            renderResults(_latestResult);
            showToast('Agents completed', _latestResult.all_clear ? 'info' : 'warning');
            // Save to Supabase
            saveAgentRun(_latestResult).catch(() => {});
        } catch (e) {
            document.getElementById('agents-status').innerHTML =
                `<div class="status-alert" style="background:var(--accent-red-light);border:1px solid var(--accent-red);color:var(--accent-red)">Agent error: ${e.message}</div>`;
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg> Run Agents';
        }
    });

    try {
        const existing = await api.agentsBatch(state.batchId);
        if (existing.results?.length > 0) renderExistingResults(existing.results);
        else renderEmptyState();
    } catch { renderEmptyState(); }

    loadActivityLog();
}

/* ── Empty / Loading States ──────────────────────────────── */
function renderEmptyState() {
    const cols = ['col-prediction', 'col-signature', 'col-carbon'];
    const names = ['Prediction Agent', 'Golden Signature Agent', 'Carbon Agent'];
    const descs = ['SHAP-based quality analysis', 'Signature lifecycle manager', 'Emissions compliance tracker'];
    const colors = ['var(--accent-blue)', 'var(--accent-orange)', 'var(--accent-green)'];
    cols.forEach((id, i) => {
        document.getElementById(id).innerHTML = `
        <div class="agent-card" style="align-items:center;justify-content:center;min-height:200px">
          <div style="width:40px;height:40px;border-radius:50%;background:${colors[i]}15;display:flex;align-items:center;justify-content:center;margin-bottom:0.75rem">
            <div style="width:8px;height:8px;border-radius:50%;background:${colors[i]}"></div>
          </div>
          <h3 style="font-size:0.95rem;font-weight:700;margin-bottom:0.25rem">${names[i]}</h3>
          <p style="color:var(--text-muted);font-size:0.78rem">${descs[i]}</p>
          <p style="color:var(--text-muted);font-size:0.75rem;margin-top:0.5rem">Click <strong>Run Agents</strong> to analyze <strong>${state.batchId}</strong></p>
        </div>`;
    });
}

function renderEmptyCol(colId, name) {
    document.getElementById(colId).innerHTML = `<div class="agent-card"><h3 style="font-size:0.95rem;font-weight:700">${name}</h3><p style="color:var(--text-muted);font-size:0.82rem;margin-top:0.5rem">No data yet.</p></div>`;
}

/* ── Render All Results ──────────────────────────────────── */
async function renderResults(data) {
    const results = data.agent_results || [];

    // Fetch actual notification IDs from the backend
    try {
        const batchData = await api.agentsBatch(data.batch_id);
        const notifs = batchData.results || [];
        // Attach notification IDs to agent results
        for (const r of results) {
            const match = notifs.find(n => n.agent_name === r.agent_name && n.status === 'pending');
            if (match) r.id = match.id;
        }
    } catch { /* proceed without IDs */ }

    const pred = results.find(r => r.agent_name === 'prediction');
    const sig = results.find(r => r.agent_name === 'golden_signature');
    const carbon = results.find(r => r.agent_name === 'carbon');

    const statusEl = document.getElementById('agents-status');
    if (data.all_clear) {
        statusEl.innerHTML = `<div class="status-alert" style="background:var(--accent-green-light);border:1px solid var(--accent-green);color:var(--accent-green)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          All Clear — No operator action required for batch ${data.batch_id}</div>`;
    } else {
        statusEl.innerHTML = `<div class="status-alert" style="background:var(--accent-orange-light);border:1px solid var(--accent-orange);color:var(--accent-orange)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Action Required — ${data.pending_count} notification(s) need attention</div>`;
    }

    if (pred) renderPredictionCol(pred);
    if (sig) renderSignatureCol(sig);
    if (carbon) renderCarbonCol(carbon);
}

function renderExistingResults(results) {
    const pred = results.find(r => r.agent_name === 'prediction');
    const sig = results.find(r => r.agent_name === 'golden_signature');
    const carbon = results.find(r => r.agent_name === 'carbon');
    if (pred) renderPredictionCol(pred); else renderEmptyCol('col-prediction', 'Prediction Agent');
    if (sig) renderSignatureCol(sig); else renderEmptyCol('col-signature', 'Golden Signature Agent');
    if (carbon) renderCarbonCol(carbon); else renderEmptyCol('col-carbon', 'Carbon Agent');
}

/* ═══ PREDICTION COLUMN ══════════════════════════════════ */
function renderPredictionCol(result) {
    const a = result.analysis || {};
    const violations = a.violations || [];
    const hasBad = violations.length > 0;
    const badge = hasBad
        ? '<span class="agent-badge badge-fail">Violations</span>'
        : '<span class="agent-badge badge-ok">All Pass</span>';

    const preds = a.predictions || {};
    let cqaRows = '';
    for (const [cqa, val] of Object.entries(preds)) {
        if (cqa === 'total_CO2e_kg') continue;
        const v = violations.find(x => x.cqa === cqa);
        const statusHtml = v
            ? '<span style="color:var(--accent-red);font-weight:700;font-size:0.75rem">FAIL</span>'
            : '<span style="color:var(--accent-green);font-weight:700;font-size:0.75rem">PASS</span>';
        const rowBg = v ? 'background:var(--accent-red-light);' : '';
        cqaRows += `<tr style="${rowBg}"><td>${cqa.replace(/_/g, ' ')}</td><td>${val?.toFixed?.(2) ?? val}</td><td style="text-align:center">${statusHtml}</td></tr>`;
    }

    const shapResults = a.shap_results || [];
    const shapTarget = violations.length > 0
        ? shapResults.find(s => s.target === violations[0].cqa) || shapResults[0]
        : shapResults[0];

    document.getElementById('col-prediction').innerHTML = `
    <div class="agent-card">
      <div class="agent-card-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        <h3>Prediction Agent</h3>
        ${badge}
      </div>

      <div class="section-label">AI Analysis</div>
      <div class="ai-box">${md(result.explanation)}</div>
      <button class="view-full-btn" data-modal="prediction">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M14 10l6.1-6.1M9 21H3v-6M10 14l-6.1 6.1"/></svg>
        View Full Analysis
      </button>

      ${shapResults.length > 0 ? `
        <div class="section-label">SHAP Feature Impact — ${shapTarget?.target || ''}</div>
        <div id="shap-chart" style="width:100%;height:200px;margin-bottom:1rem"></div>
      ` : ''}

      <div class="section-label">Quality Predictions</div>
      <table class="cqa-table">
        <thead><tr><th>CQA</th><th>Predicted</th><th style="text-align:center">Status</th></tr></thead>
        <tbody>${cqaRows}</tbody>
      </table>

      ${hasBad && result.requires_action ? `<div class="action-row"><button class="action-btn btn-modify" style="flex:1" onclick="document.dispatchEvent(new CustomEvent('agent-ack',{detail:{id:${result.id || 0}}}))">Acknowledge Violations</button></div>` : ''}
    </div>`;

    if (shapTarget) setTimeout(() => renderShapChart(shapTarget), 100);

    // View Full Analysis button
    setTimeout(() => {
        document.querySelector('[data-modal="prediction"]')?.addEventListener('click', () => {
            showAIModal('Prediction Agent — Full Analysis', result.explanation);
        });
    }, 50);
}

function renderShapChart(shapEntry) {
    const el = document.getElementById('shap-chart');
    if (!el || typeof Plotly === 'undefined') return;
    const allFeats = Object.entries(shapEntry.shap_values || {}).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 8);
    Plotly.newPlot(el, [{
        type: 'bar', x: allFeats.map(f => f[1]), y: allFeats.map(f => f[0].replace(/_/g, ' ')),
        orientation: 'h',
        marker: { color: allFeats.map(f => f[1] >= 0 ? 'rgba(22,163,74,0.75)' : 'rgba(220,38,38,0.75)'), line: { width: 0 } },
        hovertemplate: '%{y}: %{x:.3f}<extra></extra>',
    }], {
        margin: { l: 120, r: 15, t: 5, b: 30 },
        xaxis: { title: 'SHAP value', tickfont: { size: 10 }, titlefont: { size: 11 }, zeroline: true, zerolinecolor: '#ccc' },
        yaxis: { tickfont: { size: 10 }, autorange: 'reversed' },
        height: 200, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
        bargap: 0.25,
    }, { responsive: true, displayModeBar: false });
}

/* ═══ GOLDEN SIGNATURE COLUMN ════════════════════════════ */
function renderSignatureCol(result) {
    const a = result.analysis || {};
    const dominates = a.dominates;
    const impact = a.projected_impact || {};
    const confidence = a.confidence_score || result.confidence || 0;

    let bodyHtml = '';
    if (dominates) {
        const impactCards = [
            { key: 'energy_pct', label: 'Energy', icon: '⚡' },
            { key: 'yield_pct', label: 'Yield', icon: '📈' },
            { key: 'carbon_pct', label: 'Carbon', icon: '🌿' },
        ].map(({ key, label, icon }) => {
            const val = impact[key] || 0;
            const color = val < 0 ? 'var(--accent-green)' : val > 0 ? 'var(--accent-red)' : 'var(--text-muted)';
            const arrow = val < 0 ? '↓' : val > 0 ? '↑' : '—';
            return `<div class="impact-card"><div class="impact-val" style="color:${color}">${arrow} ${Math.abs(val).toFixed(1)}%</div><div class="impact-label">${icon} ${label}</div></div>`;
        }).join('');

        bodyHtml = `
        <div class="status-alert" style="background:var(--accent-orange-light);border:1px solid var(--accent-orange);color:var(--accent-orange)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Signature Update Proposed
        </div>
        <div class="section-label">Proposal Explanation</div>
        <div class="ai-box sig-box">${md(result.explanation)}</div>
        <button class="view-full-btn sig-btn" data-modal="signature">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M14 10l6.1-6.1M9 21H3v-6M10 14l-6.1 6.1"/></svg>
          View Full Analysis
        </button>
        <div class="section-label">Projected Impact</div>
        <div class="impact-row">${impactCards}</div>
        <div class="section-label">Confidence Score</div>
        <div id="confidence-gauge" style="height:130px;margin-bottom:0.5rem"></div>
        <div class="action-row">
          <button class="action-btn btn-accept" id="sig-accept">Accept</button>
          <button class="action-btn btn-modify" id="sig-modify">Modify</button>
          <button class="action-btn btn-reject" id="sig-reject">Reject</button>
        </div>`;
    } else {
        bodyHtml = `
        <div class="status-alert" style="background:var(--accent-green-light);border:1px solid var(--accent-green);color:var(--accent-green)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Signature is Current — v${a.current_version || '?'}
        </div>
        <div class="section-label">Status</div>
        <div class="ai-box sig-box">${md(result.explanation)}</div>
        <button class="view-full-btn sig-btn" data-modal="signature">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M14 10l6.1-6.1M9 21H3v-6M10 14l-6.1 6.1"/></svg>
          View Full Analysis
        </button>

        <div style="border-top:1px solid var(--border-light);padding-top:0.8rem;margin-top:0.5rem">
          <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.5rem">Should this batch become the new golden reference?</p>
          <div class="action-row" style="margin-top:0">
            <button class="action-btn btn-accept" id="sig-promote" style="display:flex;align-items:center;justify-content:center;gap:0.4rem">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>
              Set as Golden
            </button>
            <button class="action-btn btn-modify" id="sig-modify-ndom">Modify & Set</button>
            <button class="action-btn btn-reject" id="sig-keep">Keep Current</button>
          </div>
        </div>`;
    }

    document.getElementById('col-signature').innerHTML = `
    <div class="agent-card">
      <div class="agent-card-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-orange)" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5"/></svg>
        <h3>Golden Signature Agent</h3>
        <span style="font-size:0.7rem;color:var(--text-muted);margin-left:auto">${a.cluster_name || state.cluster}</span>
      </div>
      ${bodyHtml}
    </div>`;

    if (dominates) {
        setTimeout(() => {
            const g = document.getElementById('confidence-gauge');
            if (g && typeof Plotly !== 'undefined') {
                Plotly.newPlot(g, [{ type: 'indicator', mode: 'gauge+number', value: confidence,
                    gauge: { axis: { range: [0, 1], tickfont: { size: 9 } }, bar: { color: confidence > 0.7 ? '#16A34A' : '#D97706', thickness: 0.6 },
                        steps: [{ range: [0, 0.5], color: '#fee2e2' }, { range: [0.5, 0.75], color: '#fef9c3' }, { range: [0.75, 1], color: '#dcfce7' }] },
                    number: { font: { size: 22 } },
                }], { margin: { l: 25, r: 25, t: 15, b: 5 }, height: 130, paper_bgcolor: 'transparent' }, { responsive: true, displayModeBar: false });
            }
        }, 100);
        setTimeout(() => {
            const notifId = result.id || 0;
            document.getElementById('sig-accept')?.addEventListener('click', () => handleSigResponse(notifId, 'accepted', a));
            document.getElementById('sig-modify')?.addEventListener('click', () => showModifyModal(a.proposed_cpp || {}, async (p, r) => handleSigResponse(notifId, 'modified', a, p, r)));
            document.getElementById('sig-reject')?.addEventListener('click', () => { const r = prompt('Reason for rejection:') || ''; handleSigResponse(notifId, 'rejected', a, null, r); });
        }, 50);
    }

    // View Full Analysis button (works for both dominates and non-dominates)
    setTimeout(() => {
        document.querySelector('[data-modal="signature"]')?.addEventListener('click', () => {
            showAIModal('Golden Signature Agent — Full Analysis', result.explanation, 'sig');
        });
    }, 50);

    // Non-dominates: Set as Golden / Modify & Set / Keep Current
    if (!dominates) {
        setTimeout(() => {
            document.getElementById('sig-promote')?.addEventListener('click', () => {
                handlePromoteToGolden(a.batch_id, a.cluster_name || state.cluster);
            });
            document.getElementById('sig-modify-ndom')?.addEventListener('click', () => {
                showModifyModal(a.proposed_cpp || {}, async (params, reason) => {
                    // Use modified params to promote
                    try {
                        const cqas = { ...(a.comparison || {}), ...params };
                        await api.post('batch/complete', {
                            batch_id: a.batch_id,
                            actual_cqas: cqas,
                            cluster_name: a.cluster_name || state.cluster,
                        });
                        saveOperatorDecision(a.batch_id, 'golden_signature', 'modified', reason, params).catch(() => {});
                        showToast('Modified & set as golden', 'info');
                        const main = document.getElementById('main-content');
                        if (main) renderAgentDashboard(main);
                    } catch (e) { showToast(`Error: ${e.message}`, 'error'); }
                });
            });
            document.getElementById('sig-keep')?.addEventListener('click', () => {
                saveOperatorDecision(a.batch_id || state.batchId, 'golden_signature', 'kept_current', `Retained v${a.current_version}`).catch(() => {});
                showToast('Keeping current signature', 'info');
                loadActivityLog();
            });
        }, 50);
    }
}

async function handleSigResponse(notifId, action, analysis, modifiedParams = null, reason = '') {
    try {
        await api.agentsRespond(notifId, { action, reason: reason || `Operator ${action} signature proposal`, modified_params: modifiedParams });
        saveOperatorDecision(analysis?.batch_id || state.batchId, 'golden_signature', action, reason, modifiedParams).catch(() => {});
        showToast(`Signature ${action}`, action === 'rejected' ? 'warning' : 'info');
        loadActivityLog();
        const main = document.getElementById('main-content');
        if (main) renderAgentDashboard(main);
    } catch (e) { showToast(`Error: ${e.message}`, 'error'); }
}

async function handlePromoteToGolden(batchId, clusterName) {
    const reason = prompt('Reason for promoting this batch to golden reference:');
    if (reason === null) return; // cancelled

    const btn = document.getElementById('sig-promote');
    if (btn) { btn.disabled = true; btn.textContent = 'Promoting...'; }

    try {
        // Force-update signature via batch complete endpoint with the batch's actual CQAs
        const batchData = await api.agentsBatch(batchId);
        const predResult = (batchData.results || []).find(r => r.agent_name === 'prediction');
        const actualCqas = predResult?.analysis?.predictions || {};

        // Call the signature manager to force promote
        const resp = await api.post(`batch/complete`, {
            batch_id: batchId,
            actual_cqas: actualCqas,
            cluster_name: clusterName,
        });

        saveOperatorDecision(batchId, 'golden_signature', 'promoted', reason).catch(() => {});
        showToast(`Batch ${batchId} promoted to golden reference`, 'info');
        loadActivityLog();
        const main = document.getElementById('main-content');
        if (main) renderAgentDashboard(main);
    } catch (e) {
        showToast(`Error: ${e.message}`, 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg> Promote to Golden Batch'; }
    }
}

/* ═══ CARBON COLUMN ══════════════════════════════════════ */
function renderCarbonCol(result) {
    const a = result.analysis || {};
    const co2 = a.batch_co2e_kg || 0;
    const compliance = a.regulatory_compliance || {};
    const trend = a.trend || 'stable';
    const hasIssue = a.any_over || a.any_at_risk;

    let compRows = '';
    for (const [, comp] of Object.entries(compliance)) {
        const cls = comp.status === 'UNDER' ? 'badge-ok' : comp.status === 'AT_RISK' ? 'badge-warn' : 'badge-fail';
        compRows += `<tr>
            <td>${comp.label}</td>
            <td>${comp.limit_kg} kg</td>
            <td>${co2.toFixed(1)} kg</td>
            <td style="text-align:center"><span class="agent-badge ${cls}" style="font-size:0.68rem">${comp.status}</span></td>
        </tr>`;
    }

    const trendLabel = trend === 'improving' ? '↓ Improving' : trend === 'worsening' ? '↑ Worsening' : '— Stable';
    const trendColor = trend === 'improving' ? 'var(--accent-green)' : trend === 'worsening' ? 'var(--accent-red)' : 'var(--text-muted)';

    document.getElementById('col-carbon').innerHTML = `
    <div class="agent-card">
      <div class="agent-card-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12l2 2 4-4"/></svg>
        <h3>Carbon Agent</h3>
        ${hasIssue ? '<span class="agent-badge badge-fail">Deviation</span>' : '<span class="agent-badge badge-ok">Compliant</span>'}
      </div>

      ${hasIssue ? `<div class="status-alert" style="background:var(--accent-red-light);border:1px solid var(--accent-red);color:var(--accent-red)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Carbon Target Exceeded</div>` : ''}

      <div class="section-label">AI Analysis</div>
      <div class="ai-box carbon-box">${md(result.explanation)}</div>
      <button class="view-full-btn carbon-btn" data-modal="carbon">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M14 10l6.1-6.1M9 21H3v-6M10 14l-6.1 6.1"/></svg>
        View Full Analysis
      </button>

      <div class="section-label">Emissions Gauge</div>
      <div id="co2-gauge" style="height:150px;margin-bottom:0.5rem"></div>

      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem">
        <span class="section-label" style="margin:0">Trend</span>
        <span style="font-weight:700;color:${trendColor};font-size:0.82rem">${trendLabel}</span>
        <span style="margin-left:auto;font-size:0.75rem;color:var(--text-muted)">5-batch avg: ${a.rolling_avg_5 || 0} kg</span>
      </div>

      <div class="section-label">Regulatory Compliance</div>
      <table class="cqa-table">
        <thead><tr><th>Target</th><th>Limit</th><th>Actual</th><th style="text-align:center">Status</th></tr></thead>
        <tbody>${compRows}</tbody>
      </table>

      <div id="co2-trend-chart" style="height:110px;margin-top:1rem"></div>

      ${hasIssue && result.requires_action ? `<div class="action-row"><button class="action-btn btn-modify" style="flex:1" onclick="document.dispatchEvent(new CustomEvent('agent-ack',{detail:{id:${result.id || 0}}}))">Acknowledge Alert</button></div>` : ''}
    </div>`;

    setTimeout(() => {
        const g = document.getElementById('co2-gauge');
        if (g && typeof Plotly !== 'undefined') {
            const target = compliance.Internal?.limit_kg || 50;
            Plotly.newPlot(g, [{ type: 'indicator', mode: 'gauge+number+delta', value: co2,
                delta: { reference: target, decreasing: { color: '#16A34A' }, increasing: { color: '#DC2626' } },
                gauge: { axis: { range: [0, Math.max(80, co2 + 10)], tickfont: { size: 9 } },
                    bar: { color: co2 > target ? '#DC2626' : '#16A34A' },
                    threshold: { line: { color: '#EA580C', width: 3 }, value: target },
                    steps: [{ range: [0, 45], color: '#dcfce7' }, { range: [45, 50], color: '#fef9c3' }, { range: [50, 80], color: '#fee2e2' }] },
                number: { suffix: ' kg', font: { size: 18 } },
            }], { margin: { l: 25, r: 25, t: 25, b: 5 }, height: 150, paper_bgcolor: 'transparent' }, { responsive: true, displayModeBar: false });
        }
    }, 100);

    setTimeout(() => {
        const t = document.getElementById('co2-trend-chart');
        const h = a.co2_history_last10 || [];
        if (t && typeof Plotly !== 'undefined' && h.length > 0) {
            Plotly.newPlot(t, [{ x: h.map((_, i) => `B${i + 1}`), y: h, type: 'scatter', mode: 'lines+markers',
                line: { color: '#4F46E5', width: 2, shape: 'spline' }, marker: { size: 5 },
                fill: 'tozeroy', fillcolor: 'rgba(79,70,229,0.06)',
            }], {
                margin: { l: 35, r: 10, t: 5, b: 25 }, height: 110,
                xaxis: { tickfont: { size: 9 } }, yaxis: { title: 'CO₂e (kg)', tickfont: { size: 9 }, titlefont: { size: 10 } },
                paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
            }, { responsive: true, displayModeBar: false });
        }
    }, 150);

    // View Full Analysis button
    setTimeout(() => {
        document.querySelector('[data-modal="carbon"]')?.addEventListener('click', () => {
            showAIModal('Carbon Agent — Full Analysis', result.explanation, 'carbon');
        });
    }, 50);
}

/* ═══ ACTIVITY LOG ═══════════════════════════════════════ */
async function loadActivityLog() {
    const section = document.getElementById('activity-log-section');
    if (!section) return;
    try {
        const data = await api.agentsHistory(20);
        const history = data.history || [];
        if (history.length === 0) {
            section.innerHTML = `<div class="agent-card"><h3 style="font-size:0.95rem;font-weight:700">Activity Log</h3><p style="color:var(--text-muted);font-size:0.82rem;margin-top:0.5rem">No agent activity yet.</p></div>`;
            return;
        }
        const agentColors = { prediction: 'var(--accent-blue)', golden_signature: 'var(--accent-orange)', carbon: 'var(--accent-green)' };
        const statusCls = { pending: 'badge-warn', acknowledged: 'badge-ok', accepted: 'badge-ok', modified: 'badge-warn', rejected: 'badge-fail' };

        let rows = '';
        for (const h of history) {
            const ac = agentColors[h.agent_name] || 'var(--text-muted)';
            const cls = statusCls[h.status] || '';
            const time = h.created_at ? new Date(h.created_at).toLocaleString() : '';
            const rawSummary = (h.explanation || '').replace(/\*\*/g, '').replace(/###?\s*/g, '').replace(/\n/g, ' ');
            const summary = rawSummary.substring(0, 80) + (rawSummary.length > 80 ? '...' : '');
            rows += `<tr style="border-bottom:1px solid var(--border-light)">
                <td style="padding:0.5rem;font-size:0.75rem;color:var(--text-muted)">${time}</td>
                <td style="padding:0.5rem"><span style="color:${ac};font-weight:600;font-size:0.8rem">${(h.agent_name || '').replace(/_/g, ' ')}</span></td>
                <td style="padding:0.5rem;font-size:0.8rem">${h.notification_type || ''}</td>
                <td style="padding:0.5rem;font-size:0.75rem;color:var(--text-secondary);max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${summary}</td>
                <td style="padding:0.5rem;text-align:center"><span class="agent-badge ${cls}" style="font-size:0.65rem">${h.status}</span></td>
            </tr>`;
        }
        section.innerHTML = `
        <div class="agent-card">
          <h3 style="font-size:0.95rem;font-weight:700;margin-bottom:1rem">Activity Log</h3>
          <div style="overflow-x:auto">
            <table class="cqa-table">
              <thead><tr><th>Time</th><th>Agent</th><th>Type</th><th>Summary</th><th style="text-align:center">Status</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>`;
    } catch { section.innerHTML = ''; }
}

/* ── Global Acknowledge Handler ──────────────────────────── */
document.addEventListener('agent-ack', async (e) => {
    const id = e.detail?.id;
    if (!id) {
        // No ID — try to find the latest pending notification for this batch
        try {
            const pending = await api.agentsPending();
            const batchNotifs = (pending.notifications || []).filter(
                n => n.batch_id === state.batchId && n.status === 'pending'
            );
            if (batchNotifs.length > 0) {
                for (const n of batchNotifs) {
                    await api.agentsRespond(n.id, { action: 'acknowledged', reason: 'Operator acknowledged' });
                    saveOperatorDecision(n.batch_id, n.agent_name, 'acknowledged').catch(() => {});
                }
                showToast(`Acknowledged ${batchNotifs.length} alert(s)`, 'info');
                loadActivityLog();
                const main = document.getElementById('main-content');
                if (main) renderAgentDashboard(main);
                return;
            }
        } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
        return;
    }
    try {
        await api.agentsRespond(id, { action: 'acknowledged', reason: 'Operator acknowledged' });
        saveOperatorDecision(state.batchId, 'agent', 'acknowledged').catch(() => {});
        showToast('Alert acknowledged', 'info');
        loadActivityLog();
        // Refresh the page to update button states
        const main = document.getElementById('main-content');
        if (main) renderAgentDashboard(main);
    } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
});
