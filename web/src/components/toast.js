/**
 * Toast notification component — appears top-right, auto-dismisses.
 */

const TOAST_COLORS = {
    info: { bg: 'var(--accent-blue-light)', border: 'var(--accent-blue)', text: 'var(--accent-blue)' },
    warning: { bg: 'var(--accent-orange-light)', border: 'var(--accent-orange)', text: 'var(--accent-orange)' },
    error: { bg: 'var(--accent-red-light)', border: 'var(--accent-red)', text: 'var(--accent-red)' },
};

let _toastContainer = null;

function ensureContainer() {
    if (_toastContainer && document.body.contains(_toastContainer)) return;
    _toastContainer = document.createElement('div');
    _toastContainer.id = 'toast-container';
    _toastContainer.style.cssText = `
        position:fixed;bottom:2rem;right:1.5rem;z-index:10001;
        display:flex;flex-direction:column;gap:0.5rem;
        pointer-events:none;
    `;
    document.body.appendChild(_toastContainer);
}

/**
 * Show a toast notification.
 * @param {string} message — short message text
 * @param {'info'|'warning'|'error'} severity
 * @param {number} duration — ms before auto-dismiss (default 5000)
 */
export function showToast(message, severity = 'info', duration = 5000) {
    ensureContainer();
    const colors = TOAST_COLORS[severity] || TOAST_COLORS.info;

    const toast = document.createElement('div');
    toast.style.cssText = `
        background:${colors.bg};
        border:1px solid ${colors.border};
        color:${colors.text};
        padding:0.75rem 1.25rem;
        border-radius:var(--radius-sm, 8px);
        font-size:0.85rem;
        font-weight:600;
        box-shadow:0 4px 12px rgba(0,0,0,0.1);
        pointer-events:auto;
        cursor:pointer;
        opacity:0;
        transform:translateX(100%);
        transition:opacity 0.3s ease, transform 0.3s ease;
    `;
    toast.textContent = message;
    toast.addEventListener('click', () => {
        window.location.hash = '#/agents';
        dismissToast(toast);
    });

    _toastContainer.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    });

    // Auto-dismiss
    setTimeout(() => dismissToast(toast), duration);
}

function dismissToast(toast) {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
}
