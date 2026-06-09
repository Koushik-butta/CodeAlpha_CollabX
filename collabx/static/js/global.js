// Global Javascript Utilities for CollabX

// Helper to get Django CSRF Token from cookie
function getCSRFToken() {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, 'csrftoken'.length + 1) === ('csrftoken' + '=')) {
        cookieValue = decodeURIComponent(cookie.substring('csrftoken'.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Global API Request Wrapper with CSRF and error handling
async function apiRequest(url, options = {}) {
  // Set headers
  options.headers = options.headers || {};
  if (!options.headers['Content-Type'] && !(options.body instanceof FormData)) {
    options.headers['Content-Type'] = 'application/json';
  }
  
  // Inject CSRF token for state-changing operations
  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const csrf = getCSRFToken();
    if (csrf) {
      options.headers['X-CSRFToken'] = csrf;
    }
  }

  // Include credentials (cookies)
  options.credentials = 'same-origin';

  try {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      return { 
        error: data.message || data.error || `HTTP error! Status: ${response.status}`,
        status: response.status,
        data: null
      };
    }
    
    return { error: null, status: response.status, data };
  } catch (err) {
    console.error(`API Request failed at ${url}:`, err);
    return { error: 'Network error. Please try again.', status: 500, data: null };
  }
}

// Custom Toast System
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add('active'), 50);

  // Remove toast after duration
  setTimeout(() => {
    toast.classList.remove('active');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Modal Toggle Helper
function setupModal(triggerId, overlayId, closeBtnId) {
  const trigger = document.getElementById(triggerId);
  const overlay = document.getElementById(overlayId);
  const closeBtn = document.getElementById(closeBtnId);

  if (trigger && overlay) {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      overlay.classList.add('active');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  }

  if (closeBtn && overlay) {
    closeBtn.addEventListener('click', () => {
      overlay.classList.remove('active');
    });
  }
}

// Format relative time helper
function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// Auto-check notifications on load
document.addEventListener('DOMContentLoaded', () => {
  const badge = document.getElementById('navbar-notif-badge');
  if (badge) {
    updateNotificationBadge();
    setInterval(updateNotificationBadge, 30000); // Check every 30 seconds
  }
});

async function updateNotificationBadge() {
  const badge = document.getElementById('navbar-notif-badge');
  if (!badge) return;

  const response = await apiRequest('/api/notifications/?unread_only=true');
  if (!response.error && response.data) {
    const unreadCount = response.data.unread_count || 0;
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}
