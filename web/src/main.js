/**
 * CB-MOPA Web Frontend — Main Entry Point.
 */

import './style.css';
import { renderNavbar } from './components/navbar.js';
import { route, initRouter } from './router.js';
import { initAuth } from './lib/auth.js';
import { renderLanding } from './pages/landing.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderLiveBatch } from './pages/live-batch.js';
import { renderRecommendations } from './pages/recommendations.js';
import { renderSignatures } from './pages/signatures.js';
import { renderCarbon } from './pages/carbon.js';
import { renderSimulation } from './pages/simulation.js';
import { renderLogin } from './pages/login.js';
import { renderSignup } from './pages/signup.js';
import { renderHistory } from './pages/history.js';
import { renderDagEditor } from './pages/dag-editor.js';

// Register routes
route('/', renderLanding);
route('/dashboard', renderDashboard);
route('/live-batch', renderLiveBatch);
route('/recommendations', renderRecommendations);
route('/signatures', renderSignatures);
route('/carbon', renderCarbon);
route('/simulation', renderSimulation);
route('/login', renderLogin);
route('/signup', renderSignup);
route('/history', renderHistory);
route('/dag-editor', renderDagEditor);

// Boot — initialize auth first, then render UI
async function boot() {
  await initAuth();
  renderNavbar();
  initRouter();
}
boot();
