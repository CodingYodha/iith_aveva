/**
 * Top navigation bar component.
 * Shows auth status: user email + logout when logged in, Login link when not.
 */
import { api } from '../api.js';
import { getCurrentUser, onAuthChange, logout } from '../lib/auth.js';

const NAV_ITEMS = [
    { path: '/', label: 'Home' },
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/live-batch', label: 'I/P Batch' },
    { path: '/recommendations', label: 'Recommendations' },
    { path: '/signatures', label: 'Golden Signatures' },
    { path: '/carbon', label: 'Carbon Targets' },
    { path: '/simulation', label: 'Simulation' },
    { path: '/dag-editor', label: 'DAG Editor' },
    { path: '/history', label: 'History' },
];

export function renderNavbar() {
    const nav = document.getElementById('navbar');
    const links = NAV_ITEMS.map(
        i => `<a href="#${i.path}">${i.label}</a>`
    ).join('');

    function render() {
        const user = getCurrentUser();
        const authHtml = user
            ? `<div class="nav-user">
                 <span class="nav-user-email">${user.email}</span>
                 <button class="btn btn-outline btn-sm" id="nav-logout-btn">Logout</button>
               </div>`
            : `<a href="#/login" class="btn btn-primary btn-sm">Login</a>`;

        nav.innerHTML = `
        <a href="#/" class="nav-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent-blue);"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          CB-MOPA
        </a>
        <div class="nav-links">${links}</div>
        <div class="nav-right">
          <div class="nav-status" id="nav-health">
            <span class="status-dot" id="health-dot"></span>
            <span id="health-text">Checking...</span>
          </div>
          ${authHtml}
        </div>
      `;

        // Attach logout handler
        const logoutBtn = document.getElementById('nav-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => logout());
        }

        checkHealth();
    }

    render();
    setInterval(checkHealth, 15000);

    // Re-render navbar when auth state changes
    onAuthChange(() => render());
}

async function checkHealth() {
    const dot = document.getElementById('health-dot');
    const text = document.getElementById('health-text');
    if (!dot || !text) return;
    try {
        const h = await api.health();
        if (h && h.status === 'ok') {
            dot.className = 'status-dot ok';
            text.textContent = 'API Connected';
        } else {
            dot.className = 'status-dot fail';
            text.textContent = 'API Error';
        }
    } catch {
        dot.className = 'status-dot fail';
        text.textContent = 'API Offline';
    }
}
