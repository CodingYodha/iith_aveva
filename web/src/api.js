/**
 * CB-MOPA API client — wraps all fetch calls to the FastAPI backend.
 */

const BASE = '/api';

async function request(method, endpoint, data = null) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (data) opts.body = JSON.stringify(data);
    const res = await fetch(`${BASE}/${endpoint}`, opts);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || res.statusText);
    }
    return res.json();
}

export const api = {
    get: (endpoint) => request('GET', endpoint),
    post: (endpoint, data) => request('POST', endpoint, data),

    // Health
    health: () => fetch('/health').then(r => r.json()).catch(() => null),

    // Data
    centroids: () => request('GET', 'data/centroids'),
    envelopes: () => request('GET', 'data/envelopes'),
    pareto: () => request('GET', 'data/pareto'),
    masterStats: () => request('GET', 'data/master-stats'),
    trajectory: (id) => request('GET', `data/trajectory/${id}`),
    clusterBatchMap: () => request('GET', 'data/cluster-batch-map'),
    constraints: () => request('GET', 'data/constraints'),

    // Batch
    driftCheck: (data) => request('POST', 'batch/drift-check', data),

    // Recommendations
    recommendations: (batchId, cluster) => request('GET', `recommendations/${batchId}/${cluster}`),

    // Decisions
    logDecision: (data) => request('POST', 'decisions/', data),
    decisionHistory: (limit = 50) => request('GET', `decisions/history?limit=${limit}`),

    // Signatures
    signature: (cluster) => request('GET', `signatures/${cluster}`),
    signatureHistory: (cluster) => request('GET', `signatures/${cluster}/history`),

    // Carbon
    carbonTargets: () => request('GET', 'carbon/targets'),

    // Preferences
    preferenceSummary: () => request('GET', 'preferences/summary'),
};
