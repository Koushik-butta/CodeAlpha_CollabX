// Authentication UI and Logic for CollabX

document.addEventListener('DOMContentLoaded', () => {
  // 1. Password Visibility Toggle
  setupPasswordToggles();

  // 2. Registration Validation
  setupRegistrationForm();

  // 3. Login Form AJAX
  setupLoginForm();

  // 4. Forgot Password Modal simulation
  setupModal('forgot-password-trigger', 'forgot-password-modal', 'forgot-password-close');
  setupForgotPasswordSubmit();
});

// Password visibility toggler helper
function setupPasswordToggles() {
  const toggleButtons = document.querySelectorAll('.password-toggle-btn');
  toggleButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const container = btn.closest('.password-field-container');
      const input = container.querySelector('.form-input');
      
      if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>`;
      } else {
        input.type = 'password';
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
      }
    });
  });
}

// Client-side Registration Form handler
function setupRegistrationForm() {
  const registerForm = document.getElementById('register-form');
  if (!registerForm) return;

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('full-name').value.trim();
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Simple validations
    if (!fullName || !username || !email || !password || !confirmPassword) {
      showToast('All fields are required.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    // Submit via API
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Account...';

    const response = await apiRequest('/api/auth/register/', {
      method: 'POST',
      body: JSON.stringify({
        full_name: fullName,
        username,
        email,
        password
      })
    });

    submitBtn.disabled = false;
    submitBtn.textContent = originalText;

    if (response.error) {
      showToast(response.error, 'error');
    } else {
      showToast('Account created successfully! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = '/feed/';
      }, 1000);
    }
  });
}

// Client-side Login Form handler
function setupLoginForm() {
  const loginForm = document.getElementById('login-form');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const usernameOrEmail = document.getElementById('username-email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember-me') ? document.getElementById('remember-me').checked : false;

    if (!usernameOrEmail || !password) {
      showToast('Please fill in all fields.', 'error');
      return;
    }

    // Submit via API
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    const response = await apiRequest('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify({
        username_or_email: usernameOrEmail,
        password,
        remember_me: rememberMe
      })
    });

    submitBtn.disabled = false;
    submitBtn.textContent = originalText;

    if (response.error) {
      showToast(response.error, 'error');
    } else {
      showToast('Logged in successfully! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = '/feed/';
      }, 1000);
    }
  });
}

// Mock Forgot Password submit handler
function setupForgotPasswordSubmit() {
  const forgotForm = document.getElementById('forgot-password-form');
  if (!forgotForm) return;

  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();
    
    if (!email) {
      showToast('Please enter your email address.', 'error');
      return;
    }

    const submitBtn = forgotForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending Link...';

    const response = await apiRequest('/api/auth/forgot-password/', {
      method: 'POST',
      body: JSON.stringify({ email })
    });

    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Reset Link';

    if (response.error) {
      showToast(response.error, 'error');
    } else {
      showToast('Password reset link sent! Check your email.', 'success');
      const overlay = document.getElementById('forgot-password-modal');
      if (overlay) overlay.classList.remove('active');
      forgotForm.reset();
    }
  });
}
