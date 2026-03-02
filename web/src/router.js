/**
 * Hash-based SPA router for CB-MOPA.
 */

const routes = {};
let currentCleanup = null;

export function route(path, handler) {
    routes[path] = handler;
}

export function navigate(path) {
    window.location.hash = path;
}

export function currentRoute() {
    return window.location.hash.slice(1) || '/';
}

async function handleRoute() {
    const path = currentRoute();
    const handler = routes[path] || routes['/'];
    if (!handler) return;

    // Cleanup previous page
    if (currentCleanup && typeof currentCleanup === 'function') {
        currentCleanup();
        currentCleanup = null;
    }

    // Update active nav link
    document.querySelectorAll('.nav-links a').forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === `#${path}`);
    });

    const main = document.getElementById('main-content');
    main.innerHTML = '<div class="spinner"></div>';

    try {
        currentCleanup = await handler(main);
    } catch (e) {
        main.innerHTML = `<div class="alert alert-crit">Page error: ${e.message}</div>`;
        console.error(e);
    }
}

export function initRouter() {
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
}
