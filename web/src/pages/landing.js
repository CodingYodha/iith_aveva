/**
 * Landing Page — Clean modern hero with steps section.
 */
import { hideSidebar } from '../components/sidebar.js';

export function renderLanding(main) {
  hideSidebar();

  main.innerHTML = `
    <div class="landing-hero">
      <p style="color:var(--accent-blue);font-weight:600;font-size:0.85rem;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:1rem">PHARMACEUTICAL PROCESS ANALYTICS</p>

      <h1>The smartest way<br/>to optimize your<br/>manufacturing.</h1>

      <p class="subtitle">
        CB-MOPA uses causal inference, golden batch signatures, and adaptive
        operator preference learning to optimize pharmaceutical tablet
        manufacturing in real-time.
      </p>

      <div style="display:flex;gap:1rem;margin-bottom:3rem">
        <a href="#/dashboard" class="btn btn-primary landing-cta">Enter Dashboard</a>
        <a href="#/signatures" class="btn btn-outline landing-cta-secondary">Explore Signatures</a>
      </div>

      <div class="landing-features">
        <div class="card">
          <h3>Probabilistic DTW Envelope</h3>
          <p>Real-time temporal drift detection against golden batch signatures.
          DBA builds ±3σ probabilistic corridors for each phase × sensor
          combination.</p>
        </div>
        <div class="card">
          <h3>Causal Counterfactual Engine</h3>
          <p>DoWhy Do-calculus interventions that prove causal safety before
          acting. Structural Causal Models estimate treatment effects and generate
          dual-pathway recommendations.</p>
        </div>
        <div class="card">
          <h3>Bayesian HITL Preference</h3>
          <p>BoTorch PairwiseGP learns the operator's latent utility function
          from pairwise A/B choices. Recommendations adapt to each supervisor's
          style over time.</p>
        </div>
      </div>

      <div class="landing-steps">
        <h2>How CB-MOPA works</h2>
        <p class="steps-subtitle">Just 3 steps to optimize your manufacturing process.</p>
        <div class="steps-grid">
          <div class="step-item">
            <div class="step-number">1</div>
            <h4>Detect Drift</h4>
            <p>Compare live batch sensor traces against golden DTW envelopes to detect deviations before they cause quality issues.</p>
          </div>
          <div class="step-item">
            <div class="step-number">2</div>
            <h4>Get Recommendations</h4>
            <p>Receive dual-pathway causal recommendations — Yield Guard or Carbon Savior — backed by Do-calculus safety proofs.</p>
          </div>
          <div class="step-item">
            <div class="step-number">3</div>
            <h4>Learn & Adapt</h4>
            <p>The Bayesian preference model learns from your decisions, continuously improving recommendations for your team.</p>
          </div>
        </div>
      </div>

      <div class="cta-section">
        <h2>Start optimizing today</h2>
        <p>Access live dashboards, causal recommendations, and sustainability tracking.</p>
        <a href="#/dashboard" class="btn btn-primary landing-cta">Go to Dashboard</a>
      </div>

      <div class="footer" style="width:100%;max-width:900px">
        <div>
          <div class="footer-brand">CB-MOPA</div>
          <div class="footer-copy">2026 © CB-MOPA — IIT Hyderabad × AVEVA</div>
        </div>
        <div class="footer-links">
          <div class="footer-links-col">
            <a href="#/">Home</a>
            <a href="#/dashboard">Dashboard</a>
            <a href="#/live-batch">Live Batch</a>
          </div>
          <div class="footer-links-col">
            <a href="#/recommendations">Recommendations</a>
            <a href="#/signatures">Golden Signatures</a>
            <a href="#/carbon">Carbon Targets</a>
          </div>
        </div>
      </div>
    </div>
  `;
}
