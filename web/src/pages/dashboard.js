/**
 * Dashboard Home — System status and module overview.
 */
import { api } from '../api.js';
import { hideSidebar } from '../components/sidebar.js';

export async function renderDashboard(main) {
    hideSidebar();

    main.innerHTML = `
    <div class="page-header">
      <h1>Dashboard</h1>
      <p>Track B Optimization Engine — Pharmaceutical Tablet Manufacturing</p>
    </div>

    <div class="grid-3" style="margin-bottom:1.5rem">
      <div class="card">
        <h3>Module 1: Probabilistic DTW Envelope</h3>
        <p>Real-time temporal drift detection against golden batch signatures.
        DBA builds ±3σ probabilistic corridors for each phase × sensor. Soft-DTW
        distance quantifies deviation severity.</p>
      </div>
      <div class="card">
        <h3>Module 2: Causal Counterfactual Engine</h3>
        <p>DoWhy Do-calculus interventions prove causal safety before acting.
        Structural Causal Models estimate treatment effects and generate dual-pathway
        recommendations.</p>
      </div>
      <div class="card">
        <h3>Module 3: Bayesian HITL Preference</h3>
        <p>BoTorch PairwiseGP learns operator latent utility from pairwise A/B choices.
        Recommendations re-ranked by learned preference, adapting to each supervisor.</p>
      </div>
    </div>

    <h2 class="section-title">System Status</h2>
    <div class="grid-4" id="status-cards">
      <div class="metric-card"><div class="spinner" style="width:24px;height:24px;margin:0 auto"></div><p class="metric-label">API Backend</p></div>
      <div class="metric-card"><div class="spinner" style="width:24px;height:24px;margin:0 auto"></div><p class="metric-label">Database</p></div>
      <div class="metric-card"><div class="metric-value">60</div><p class="metric-label">Batches Loaded</p></div>
      <div class="metric-card"><div class="metric-value">3</div><p class="metric-label">Golden Clusters</p></div>
    </div>

    <hr class="divider" />

    <div class="alert alert-info">Use the navigation bar to access Live Batch Envelope, Causal Recommendations, Golden Signatures, and Carbon Targets.</div>
  `;

    // Health check
    try {
        const h = await api.health();
        const cards = document.getElementById('status-cards');
        if (!cards) return;
        const apiOk = h && h.status === 'ok';
        const dbOk = h && h.db_connected;
        cards.children[0].innerHTML = `<div class="metric-value" style="color:${apiOk ? 'var(--accent-green)' : 'var(--accent-red)'}">●</div><p class="metric-label">API Backend</p>`;
        cards.children[1].innerHTML = `<div class="metric-value" style="color:${dbOk ? 'var(--accent-green)' : 'var(--accent-red)'}">●</div><p class="metric-label">Database</p>`;
    } catch { /* ignore */ }
}
