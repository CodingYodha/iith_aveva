/**
 * Top navigation bar component.
 */
import { api } from '../api.js';

const NAV_ITEMS = [
    { path: '/', label: 'Home' },
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/live-batch', label: 'Live Batch' },
    { path: '/recommendations', label: 'Recommendations' },
    { path: '/signatures', label: 'Golden Signatures' },
    { path: '/carbon', label: 'Carbon Targets' },
];

export function renderNavbar() {
    const nav = document.getElementById('navbar');
    const links = NAV_ITEMS.map(
        i => `<a href="#${i.path}">${i.label}</a>`
    ).join('');

    nav.innerHTML = `
    <div class="nav-brand">CB-MOPA</div>
    <div class="nav-links">${links}</div>
    <div class="nav-status" id="nav-health">
      <span class="status-dot" id="health-dot"></span>
      <span id="health-text">Checking...</span>
    </div>
  `;

    checkHealth();
    setInterval(checkHealth, 15000);
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
