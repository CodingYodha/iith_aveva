/**
 * Modify Modal — reusable modal for editing CPP parameters
 * when operator chooses "Modify" on a signature proposal.
 */

const CPP_LABELS = {
    Granulation_Time: 'Granulation Time',
    Binder_Amount: 'Binder Amount',
    Drying_Temp: 'Drying Temp',
    Drying_Time: 'Drying Time',
    Compression_Force: 'Compression Force',
    Machine_Speed: 'Machine Speed',
    Lubricant_Conc: 'Lubricant Conc',
    Moisture_Content: 'Moisture Content',
};

/**
 * Show the modify modal.
 * @param {Object} currentParams — current CPP values from the proposal
 * @param {Function} onSubmit — called with (modifiedParams, reason)
 */
export function showModifyModal(currentParams, onSubmit) {
    // Remove existing modal if any
    const existing = document.getElementById('modify-modal-overlay');
    if (existing) existing.remove();

    const fields = Object.entries(CPP_LABELS).map(([key, label]) => {
        const val = currentParams[key] ?? '';
        return `
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.6rem">
          <label style="width:140px;font-size:0.82rem;font-weight:600;color:var(--text-primary)">${label}</label>
          <input type="number" step="any" class="modify-input" data-param="${key}"
                 value="${val}"
                 style="flex:1;padding:0.4rem 0.6rem;border:1px solid var(--border-color);border-radius:var(--radius-sm);font-size:0.85rem;background:var(--bg-input)" />
        </div>`;
    }).join('');

    const overlay = document.createElement('div');
    overlay.id = 'modify-modal-overlay';
    overlay.style.cssText = `
        position:fixed;top:0;left:0;right:0;bottom:0;z-index:10000;
        background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);
        display:flex;align-items:center;justify-content:center;
    `;
    overlay.innerHTML = `
    <div style="background:var(--bg-card);border-radius:var(--radius-lg);padding:2rem;width:480px;max-height:90vh;overflow-y:auto;box-shadow:var(--shadow-lg)">
      <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:1.2rem">Modify Signature Parameters</h3>
      ${fields}
      <div style="margin-top:1rem">
        <label style="font-size:0.82rem;font-weight:600;color:var(--text-primary);display:block;margin-bottom:0.3rem">Reason</label>
        <textarea id="modify-reason" rows="2"
                  style="width:100%;padding:0.5rem;border:1px solid var(--border-color);border-radius:var(--radius-sm);font-size:0.85rem;background:var(--bg-input);resize:vertical"
                  placeholder="Reason for modification..."></textarea>
      </div>
      <div style="display:flex;gap:0.75rem;margin-top:1.2rem">
        <button id="modify-submit" class="btn" style="flex:1;background:var(--accent-blue);color:white;font-weight:700;border:none;padding:0.65rem;border-radius:var(--radius-sm);cursor:pointer">Submit Modified</button>
        <button id="modify-cancel" class="btn" style="flex:1;background:var(--bg-input);color:var(--text-primary);font-weight:600;border:1px solid var(--border-color);padding:0.65rem;border-radius:var(--radius-sm);cursor:pointer">Cancel</button>
      </div>
    </div>`;

    document.body.appendChild(overlay);

    // Cancel
    document.getElementById('modify-cancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    // Submit
    document.getElementById('modify-submit').addEventListener('click', () => {
        const inputs = overlay.querySelectorAll('.modify-input');
        const params = {};
        inputs.forEach(inp => {
            const key = inp.dataset.param;
            const val = parseFloat(inp.value);
            if (!isNaN(val)) params[key] = val;
        });
        const reason = document.getElementById('modify-reason').value || '';
        overlay.remove();
        onSubmit(params, reason);
    });
}
