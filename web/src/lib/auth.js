/**
 * Global auth state management for CB-MOPA.
 * Provides current user access, auth change subscriptions, auth guard, and logout.
 */
import { supabase } from './supabase.js';
import { navigate } from '../router.js';

let currentUser = null;
const listeners = [];

/** Get the currently authenticated user (or null). */
export function getCurrentUser() {
  return currentUser;
}

/** Subscribe to auth state changes. Returns an unsubscribe function. */
export function onAuthChange(callback) {
  listeners.push(callback);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

function notifyListeners(user) {
  listeners.forEach(fn => fn(user));
}

/**
 * Initialize the auth listener. Call once at app boot.
 * Sets up `onAuthStateChange` and resolves the initial session.
 */
export async function initAuth() {
  if (!supabase) return; // No client — skip auth init

  // Get the initial session
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user ?? null;
  notifyListeners(currentUser);

  // Listen for future auth events (login, logout, token refresh)
  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null;
    notifyListeners(currentUser);
  });
}

/**
 * Auth guard — call at the top of any protected page's render function.
 * Returns true if the user is authenticated, false (and redirects) if not.
 */
export function requireAuth() {
  if (!currentUser) {
    navigate('/login');
    return false;
  }
  return true;
}

/** Sign the user out and redirect to login. */
export async function logout() {
  if (supabase) {
    await supabase.auth.signOut();
  }
  currentUser = null;
  notifyListeners(null);
  navigate('/login');
}
