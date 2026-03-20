/**
 * Signup Page — Supabase email/password registration.
 */
import { supabase } from '../lib/supabase.js';
import { navigate } from '../router.js';
import { getCurrentUser } from '../lib/auth.js';
import { trackAction } from '../lib/tracker.js';
import { hideSidebar } from '../components/sidebar.js';

export function renderSignup(main) {
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
          <h1>Create your account</h1>
          <p>Start optimizing your manufacturing process</p>
        </div>

        <form id="signup-form" novalidate>
          <div class="auth-field">
            <label for="signup-email">Email address</label>
            <input type="email" id="signup-email" class="auth-input" placeholder="you@example.com" autocomplete="email" />
            <div class="auth-field-error" id="signup-email-error"></div>
          </div>

          <div class="auth-field">
            <label for="signup-password">Password</label>
            <input type="password" id="signup-password" class="auth-input" placeholder="Min 6 characters" autocomplete="new-password" />
            <div class="auth-field-error" id="signup-password-error"></div>
          </div>

          <div class="auth-field">
            <label for="signup-confirm">Confirm password</label>
            <input type="password" id="signup-confirm" class="auth-input" placeholder="Repeat password" autocomplete="new-password" />
            <div class="auth-field-error" id="signup-confirm-error"></div>
          </div>

          <div class="auth-error" id="signup-api-error"></div>
          <div class="auth-success" id="signup-success"></div>

          <button type="submit" class="btn btn-primary btn-full auth-submit" id="signup-btn">
            Create Account
          </button>
        </form>

        <div class="auth-footer">
          Already have an account? <a href="#/login" class="auth-link">Sign in</a>
        </div>
      </div>
    </div>
  `;

  const form = document.getElementById('signup-form');
  const emailInput = document.getElementById('signup-email');
  const passwordInput = document.getElementById('signup-password');
  const confirmInput = document.getElementById('signup-confirm');
  const emailError = document.getElementById('signup-email-error');
  const passwordError = document.getElementById('signup-password-error');
  const confirmError = document.getElementById('signup-confirm-error');
  const apiError = document.getElementById('signup-api-error');
  const successMsg = document.getElementById('signup-success');
  const submitBtn = document.getElementById('signup-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous messages
    emailError.textContent = '';
    passwordError.textContent = '';
    confirmError.textContent = '';
    apiError.textContent = '';
    apiError.style.display = 'none';
    successMsg.textContent = '';
    successMsg.style.display = 'none';

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirm = confirmInput.value;

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
    } else if (password.length < 6) {
      passwordError.textContent = 'Password must be at least 6 characters';
      valid = false;
    }
    if (!confirm) {
      confirmError.textContent = 'Please confirm your password';
      valid = false;
    } else if (password !== confirm) {
      confirmError.textContent = 'Passwords do not match';
      valid = false;
    }
    if (!valid) return;

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="spinner-sm"></div> Creating account…';

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
      apiError.textContent = error.message;
      apiError.style.display = 'block';
      return;
    }

    // Check if email confirmation is required
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      // Email already registered
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
      apiError.textContent = 'This email is already registered. Please sign in instead.';
      apiError.style.display = 'block';
      return;
    }

    if (data.session) {
      // Auto-confirmed — track and redirect to history
      trackAction('signup', { email });
      navigate('/history');
    } else {
      // Email confirmation required — show success message
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
      form.style.display = 'none';
      successMsg.innerHTML = `
        <div class="auth-confirm-box">
          <div class="auth-confirm-icon">✉️</div>
          <h3>Check your email</h3>
          <p>We've sent a confirmation link to <strong>${email}</strong>. Click the link to activate your account, then <a href="#/login" class="auth-link">sign in</a>.</p>
        </div>
      `;
      successMsg.style.display = 'block';
    }
  });
}
