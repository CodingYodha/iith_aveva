/**
 * User history tracker — logs actions to the Supabase user_history table.
 * Import `trackAction` and call it whenever a meaningful user event occurs.
 */
import { supabase } from './supabase.js';
import { getCurrentUser } from './auth.js';

/**
 * Log an action to user_history for the currently authenticated user.
 * Silently no-ops if the user is not logged in or Supabase is not configured.
 *
 * @param {string} action  — short action label, e.g. "drift_check", "login"
 * @param {object} metadata — optional JSONB payload with extra context
 */
export async function trackAction(action, metadata = {}) {
  const user = getCurrentUser();
  if (!user || !supabase) return;

  try {
    await supabase.from('user_history').insert({
      user_id: user.id,
      action,
      metadata,
    });
  } catch (err) {
    console.warn('[CB-MOPA] Failed to track action:', err.message);
  }
}
