/**
 * Landing Page — Hero section with feature cards.
 */
import { hideSidebar } from '../components/sidebar.js';

export function renderLanding(main) {
    hideSidebar();

    main.innerHTML = `
    <div class="landing-hero">
      <h1>CB-MOPA</h1>
      <p class="subtitle">
        Causal-Bayesian Multi-Objective Process Analytics for pharmaceutical
        tablet manufacturing. Real-time optimization through causal inference,
        golden batch signatures, and adaptive operator preference learning.
      </p>

      <div class="landing-features">
        <div class="card">
          <h3>Module 1: Probabilistic DTW Envelope</h3>
          <p>Real-time temporal drift detection against golden batch signatures.
          DBA builds ±3σ probabilistic corridors for each phase × sensor
          combination. Soft-DTW distance quantifies deviation severity.</p>
        </div>
        <div class="card">
          <h3>Module 2: Causal Counterfactual Engine</h3>
          <p>DoWhy Do-calculus interventions that prove causal safety before
          acting. Structural Causal Models estimate treatment effects and
          generate dual-pathway recommendations (Yield Guard / Carbon Savior).</p>
        </div>
        <div class="card">
          <h3>Module 3: Bayesian HITL Preference</h3>
          <p>BoTorch PairwiseGP learns the operator's latent utility function
          from pairwise A/B choices. Recommendations adapt to each shift
          supervisor's operational style over time.</p>
        </div>
      </div>

      <a href="#/dashboard" class="btn btn-primary landing-cta">Enter Dashboard</a>
    </div>
  `;
}
