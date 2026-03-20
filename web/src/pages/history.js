/**
 * History Page — Displays user_history entries for the authenticated user.
 */
import { supabase } from '../lib/supabase.js';
import { getCurrentUser, requireAuth } from '../lib/auth.js';
import { hideSidebar } from '../components/sidebar.js';

/**
 * Format a timestamp into a human-readable relative or absolute string.
 */
function formatTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Render metadata JSONB as readable key-value pairs.
 */
function formatMetadata(meta, entryId) {
  if (!meta || typeof meta !== 'object' || Object.keys(meta).length === 0) {
    return '<span class="text-muted">—</span>';
  }
  
  // Decide which keys to show inline vs modal
  const inlineMeta = {};
  const complexMeta = {};
  let hasComplex = false;
  
  for (const [key, val] of Object.entries(meta)) {
    if (typeof val === 'object' && val !== null) {
      complexMeta[key] = val;
      hasComplex = true;
    } else {
      inlineMeta[key] = val;
      complexMeta[key] = val; // Also include primitive in the full view
    }
  }

  const inlineHtml = Object.entries(inlineMeta)
    .map(([key, val]) => `<span class="history-meta-key">${key}:</span> <span class="history-meta-val">${val}</span>`)
    .join('<br/>');

  let html = inlineHtml || '<span class="text-muted">Complex Object</span>';
  
  if (hasComplex) {
    const jsonStr = encodeURIComponent(JSON.stringify(complexMeta, null, 2));
    html += `<div style="margin-top: 10px;">
               <button class="btn btn-outline btn-sm view-data-btn" data-json="${jsonStr}" style="padding: 4px 8px; font-size: 0.8rem;">
                 📊 View Full Data
               </button>
             </div>`;
  }

  return html;
}

/**
 * Recursively turns JSON data into a beautiful, readable HTML structure 
 * (nested hierarchies and tables for arrays).
 */
function renderStructuredData(obj) {
  if (obj === null || obj === undefined) return '<span class="text-muted">None</span>';
  if (typeof obj !== 'object') {
    if (typeof obj === 'number' && !Number.isInteger(obj)) return obj.toFixed(4);
    if (typeof obj === 'boolean') return `<span style="color: ${obj ? 'var(--accent-green)' : 'var(--accent-red)'}; font-weight: 600;">${obj ? 'True' : 'False'}</span>`;
    return String(obj);
  }
  
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '<span class="text-muted">Empty list</span>';
    
    // Check if it's an array of objects (ideal for data-table)
    if (obj.every(item => typeof item === 'object' && item !== null && !Array.isArray(item))) {
      const allKeys = new Set();
      obj.forEach(item => Object.keys(item).forEach(k => allKeys.add(k)));
      const keys = Array.from(allKeys);
      
      let html = '<div style="overflow-x:auto;"><table class="data-table" style="margin-top:8px; width:100%; font-size:0.85rem">';
      html += '<thead><tr>' + keys.map(k => `<th>${k.replace(/_/g, ' ')}</th>`).join('') + '</tr></thead><tbody>';
      html += obj.map(row => {
        return '<tr>' + keys.map(k => `<td>${renderStructuredData(row[k])}</td>`).join('') + '</tr>';
      }).join('');
      html += '</tbody></table></div>';
      return html;
    }
    
    // Simple array list
    let html = `<ul class="structured-array">`;
    html += obj.map(item => `<li>${renderStructuredData(item)}</li>`).join('');
    html += `</ul>`;
    return html;
  }
  
  // Normal dictionary/object
  const keys = Object.keys(obj);
  if (keys.length === 0) return '<span class="text-muted">Empty data</span>';
  
  let html = `<div class="structured-obj">`;
  html += keys.map(k => `
    <div class="structured-row">
      <div class="structured-key">${k.replace(/_/g, ' ')}</div>
      <div class="structured-val">${renderStructuredData(obj[k])}</div>
    </div>
  `).join('');
  html += `</div>`;
  return html;
}

export async function renderHistory(main) {
  hideSidebar();

  // Auth guard — redirect if not logged in
  if (!requireAuth()) return;

  const user = getCurrentUser();

  // Show loading state
  main.innerHTML = `
    <div class="page-header">
      <h1>Your History</h1>
      <p>Activity log for ${user.email}</p>
    </div>
    <div class="history-loading">
      <div class="spinner"></div>
      <p class="loading-text">Loading your history…</p>
    </div>
  `;

  // Fetch history
  const { data, error } = await supabase
    .from('user_history')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    main.querySelector('.history-loading').innerHTML = `
      <div class="alert alert-crit">Failed to load history: ${error.message}</div>
    `;
    return;
  }

  const loadingEl = main.querySelector('.history-loading');

  if (!data || data.length === 0) {
    loadingEl.innerHTML = `
      <div class="history-empty">
        <div class="history-empty-icon">📋</div>
        <h3>No history yet</h3>
        <p>Your actions and events will appear here as you use the platform.</p>
        <a href="#/dashboard" class="btn btn-primary" style="margin-top:1rem">Go to Dashboard</a>
      </div>
    `;
    return;
  }

  // Render history entries
  loadingEl.innerHTML = `
    <div class="history-count">${data.length} entr${data.length === 1 ? 'y' : 'ies'}</div>
    <div class="history-list">
      ${data.map(entry => `
        <div class="history-entry card">
          <div class="history-entry-header">
            <span class="history-action badge badge-pass">${entry.action}</span>
            <span class="history-time">${formatTime(entry.created_at)}</span>
          </div>
          <div class="history-entry-meta">${formatMetadata(entry.metadata, entry.id)}</div>
        </div>
      `).join('')}
    </div>
    
    <!-- Modal Container -->
    <div id="history-modal" class="modal-backdrop" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Action Details</h2>
          <button class="modal-close" id="history-modal-close">×</button>
        </div>
        <div class="modal-body" id="history-modal-content">
          <!-- Beautified data renders here -->
        </div>
      </div>
    </div>
  `;

  // Bind modal events
  const modal = main.querySelector('#history-modal');
  const closeBtn = main.querySelector('#history-modal-close');
  const contentView = main.querySelector('#history-modal-content');
  
  main.querySelectorAll('.view-data-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      try {
        const jsonStr = decodeURIComponent(e.currentTarget.getAttribute('data-json'));
        const dataObj = JSON.parse(jsonStr);
        contentView.innerHTML = renderStructuredData(dataObj);
      } catch (err) {
        contentView.innerHTML = `<div class="alert alert-crit">Could not parse data: ${err.message}</div>`;
      }
      modal.style.display = 'flex';
    });
  });

  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
}
