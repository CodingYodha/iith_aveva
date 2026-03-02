/**
 * Plotly.js chart helper defaults for the light theme.
 */

export const DARK_LAYOUT = {
    paper_bgcolor: '#FFFFFF',
    plot_bgcolor: '#FAFAFA',
    font: { family: 'Inter, sans-serif', color: '#1A1A2E', size: 12 },
    margin: { l: 60, r: 20, t: 40, b: 50 },
    xaxis: { gridcolor: '#E5E7EB', zerolinecolor: '#D1D5DB' },
    yaxis: { gridcolor: '#E5E7EB', zerolinecolor: '#D1D5DB' },
};

export const DARK_CONFIG = {
    displayModeBar: false,
    responsive: true,
};

export const COLORS = {
    blue: '#4F46E5',
    green: '#16A34A',
    orange: '#EA580C',
    red: '#DC2626',
    amber: '#D97706',
    muted: '#9CA3AF',
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
