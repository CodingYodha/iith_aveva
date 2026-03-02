/**
 * Plotly.js chart helper defaults for the dark theme.
 */

export const DARK_LAYOUT = {
    paper_bgcolor: '#0D1117',
    plot_bgcolor: '#0D1117',
    font: { family: 'Inter, sans-serif', color: '#E6EDF3', size: 12 },
    margin: { l: 60, r: 20, t: 40, b: 50 },
};

export const DARK_CONFIG = {
    displayModeBar: false,
    responsive: true,
};

export const COLORS = {
    blue: '#2E86C1',
    green: '#27AE60',
    orange: '#E67E22',
    red: '#E74C3C',
    amber: '#F39C12',
    muted: '#8B949E',
};

export const CLUSTER_COLORS = {
    'Max Quality Golden': COLORS.green,
    'Deep Decarbonization Golden': COLORS.blue,
    'Balanced Operational Golden': COLORS.orange,
};

/**
 * Create a chart in a container element.
 */
export function plotChart(containerId, data, layout = {}, config = {}) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const finalLayout = { ...DARK_LAYOUT, ...layout };
    const finalConfig = { ...DARK_CONFIG, ...config };
    Plotly.newPlot(el, data, finalLayout, finalConfig);
}
