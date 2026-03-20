/**
 * Login Page — Supabase email/password authentication.
 */
import { supabase } from '../lib/supabase.js';
import { navigate } from '../router.js';
import { getCurrentUser } from '../lib/auth.js';
import { trackAction } from '../lib/tracker.js';
import { hideSidebar } from '../components/sidebar.js';

export function renderLogin(main) {
  hideSidebar();

  // If already logged in, go straight to history
  if (getCurrentUser()) {
    navigate('/history');
    return;
  }

  main.innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-brand">CB-MOPA</div>
          <h1>Welcome back</h1>
          <p>Sign in to your account to continue</p>
        </div>

        <form id="login-form" novalidate>
          <div class="auth-field">
            <label for="login-email">Email address</label>
            <input type="email" id="login-email" class="auth-input" placeholder="you@example.com" autocomplete="email" />
            <div class="auth-field-error" id="login-email-error"></div>
          </div>

          <div class="auth-field">
            <label for="login-password">Password</label>
            <input type="password" id="login-password" class="auth-input" placeholder="••••••••" autocomplete="current-password" />
            <div class="auth-field-error" id="login-password-error"></div>
          </div>

          <div class="auth-error" id="login-api-error"></div>

          <button type="submit" class="btn btn-primary btn-full auth-submit" id="login-btn">
            Sign In
          </button>
        </form>

        <div class="auth-footer">
          Don't have an account? <a href="#/signup" class="auth-link">Create one</a>
        </div>
      </div>
    </div>
  `;

  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const emailError = document.getElementById('login-email-error');
  const passwordError = document.getElementById('login-password-error');
  const apiError = document.getElementById('login-api-error');
  const submitBtn = document.getElementById('login-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous errors
    emailError.textContent = '';
    passwordError.textContent = '';
    apiError.textContent = '';
    apiError.style.display = 'none';

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Client-side validation
    let valid = true;
    if (!email) {
      emailError.textContent = 'Email is required';
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailError.textContent = 'Please enter a valid email address';
      valid = false;
    }
    if (!password) {
      passwordError.textContent = 'Password is required';
      valid = false;
    }
    if (!valid) return;

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="spinner-sm"></div> Signing in…';

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
      apiError.textContent = error.message;
      apiError.style.display = 'block';
      return;
    }

    // Success — track and redirect to history
    trackAction('login', { email });
    navigate('/history');
  });
}
