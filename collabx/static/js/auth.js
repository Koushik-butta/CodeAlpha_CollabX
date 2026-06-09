// CollabX — Auth Forms JS

document.addEventListener('DOMContentLoaded', () => {
  setupEyeToggles();
  setupLoginForm();
  setupRegisterForm();
  setupForgotPasswordModal();
  setupForgotPasswordForm();
});

// ----- Eye toggle (generic) -----
function setupEyeToggles() {
  // Login page single toggle
  const loginEye = document.getElementById('pw-toggle');
  if (loginEye) {
    loginEye.addEventListener('click', () => {
      const input = document.getElementById('password');
      togglePw(input, loginEye);
    });
  }

  // Register page multi-toggles (data-target)
  document.querySelectorAll('.auth-eye-btn[data-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (input) togglePw(input, btn);
    });
  });
}

function togglePw(input, btn) {
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  btn.innerHTML = isPassword
    ? `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`
    : `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}

// ----- Login Form -----
function setupLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const usernameOrEmail = document.getElementById('username-email').value.trim();
    const password = document.getElementById('password').value;

    if (!usernameOrEmail || !password) {
      showToast('Please fill in all fields.', 'error');
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    setLoading(btn, true, 'Logging in...');

    const response = await apiRequest('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username_or_email: usernameOrEmail, password })
    });

    setLoading(btn, false, 'Log In');

    if (response.error) {
      showToast(response.error, 'error');
    } else {
      showToast('Welcome back!', 'success');
      setTimeout(() => { window.location.href = '/feed/'; }, 800);
    }
  });
}

// ----- Register Form -----
function setupRegisterForm() {
  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName     = document.getElementById('full-name').value.trim();
    const username     = document.getElementById('username').value.trim();
    const email        = document.getElementById('email').value.trim();
    const password     = document.getElementById('password').value;
    const confirmPw    = document.getElementById('confirm-password').value;

    if (!fullName || !username || !email || !password || !confirmPw) {
      showToast('All fields are required.', 'error'); return;
    }
    if (password !== confirmPw) {
      showToast('Passwords do not match.', 'error'); return;
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters.', 'error'); return;
    }

    const btn = form.querySelector('button[type="submit"]');
    setLoading(btn, true, 'Creating account...');

    const response = await apiRequest('/api/auth/register/', {
      method: 'POST',
      body: JSON.stringify({ full_name: fullName, username, email, password })
    });

    setLoading(btn, false, 'Create Account');

    if (response.error) {
      showToast(response.error, 'error');
    } else {
      showToast('Account created! Taking you in...', 'success');
      setTimeout(() => { window.location.href = '/feed/'; }, 1000);
    }
  });
}

// ----- Forgot Password Modal -----
function setupForgotPasswordModal() {
  const trigger = document.getElementById('forgot-password-trigger');
  const modal   = document.getElementById('forgot-password-modal');
  const close   = document.getElementById('forgot-password-close');
  if (!trigger || !modal) return;

  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    modal.classList.add('active');
  });
  close?.addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });
}

function setupForgotPasswordForm() {
  const form = document.getElementById('forgot-password-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();
    if (!email) { showToast('Enter your email address.', 'error'); return; }

    const btn = form.querySelector('button[type="submit"]');
    setLoading(btn, true, 'Sending...');

    const response = await apiRequest('/api/auth/forgot-password/', {
      method: 'POST',
      body: JSON.stringify({ email })
    });

    setLoading(btn, false, 'Send Reset Link');

    if (response.error) {
      showToast(response.error, 'error');
    } else {
      showToast('Reset link sent! Check your email.', 'success');
      document.getElementById('forgot-password-modal')?.classList.remove('active');
      form.reset();
    }
  });
}

// ----- Helpers -----
function setLoading(btn, loading, text) {
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = text;
}
