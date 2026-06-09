// Notifications Timeline Logic for CollabX

document.addEventListener('DOMContentLoaded', () => {
  loadNotifications();

  // Bind Mark all read
  const markAllBtn = document.getElementById('btn-mark-all-read');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', async () => {
      markAllBtn.disabled = true;
      markAllBtn.textContent = 'Clearing...';

      const response = await apiRequest('/api/notifications/read/', { method: 'POST' });
      markAllBtn.disabled = false;
      markAllBtn.textContent = 'Mark All as Read';

      if (response.error) {
        showToast(response.error, 'error');
      } else {
        showToast('All notifications marked as read!');
        loadNotifications();
        
        // Sync Navbar badge
        const badge = document.getElementById('navbar-notif-badge');
        if (badge) badge.style.display = 'none';
      }
    });
  }
});

// Fetch and render notifications list
async function loadNotifications() {
  const container = document.getElementById('notifications-container');
  const markAllBtn = document.getElementById('btn-mark-all-read');
  
  if (!container) return;

  const response = await apiRequest('/api/notifications/');
  if (response.error) {
    container.innerHTML = `<div class="empty-notifs"><p class="empty-notifs-title" style="color:var(--status-error);">Error loading notifications</p></div>`;
    return;
  }

  const notifications = response.data.notifications || [];
  
  // Show/Hide Mark All button
  if (markAllBtn) {
    const hasUnread = notifications.some(n => !n.is_read);
    markAllBtn.style.display = hasUnread ? 'inline-block' : 'none';
  }

  if (notifications.length === 0) {
    container.innerHTML = `
      <div class="empty-notifs">
        <p class="empty-notifs-title">No notifications yet</p>
        <p class="empty-feed-desc">Join requests and team decisions alerts will appear here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  notifications.forEach(n => {
    container.appendChild(createNotificationItem(n));
  });

  // Sync Navbar badge count immediately
  const badge = document.getElementById('navbar-notif-badge');
  if (badge) {
    const unreadCount = response.data.unread_count || 0;
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

// Generate notification card DOM node
function createNotificationItem(n) {
  const card = document.createElement('div');
  card.className = `notification-item ${n.is_read ? '' : 'unread'}`;
  card.id = `notification-item-${n.id}`;

  let actionText = '';
  if (n.notification_type === 'join_request') {
    actionText = 'requested to join your project';
  } else if (n.notification_type === 'accepted') {
    actionText = 'accepted your join request to';
  } else if (n.notification_type === 'rejected') {
    actionText = 'declined your join request to';
  }

  const projectLinkHTML = n.project.id ? 
    `<a href="/project/${n.project.id}/" class="notification-project-link">${n.project.title}</a>` : 
    `<span style="color:var(--text-light);">deleted project</span>`;

  let dismissHTML = '';
  if (!n.is_read) {
    dismissHTML = `
      <button class="btn-mark-single-read" data-id="${n.id}" title="Mark as read">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </button>
    `;
  }

  card.innerHTML = `
    <img src="${n.sender.profile_picture}" alt="${n.sender.username}" class="avatar btn-sm" style="width: 36px; height: 36px;">
    
    <div class="notification-content">
      <p class="notification-text">
        <strong>${n.sender.full_name}</strong> ${actionText} ${projectLinkHTML}
      </p>
      <span class="notification-time">${formatRelativeTime(n.created_at)}</span>
    </div>
    
    ${dismissHTML}
  `;

  // Bind single dismiss click
  const dismissBtn = card.querySelector('.btn-mark-single-read');
  if (dismissBtn) {
    dismissBtn.onclick = async () => {
      dismissBtn.disabled = true;
      const response = await apiRequest(`/api/notifications/read/${n.id}/`, { method: 'POST' });
      if (response.error) {
        showToast(response.error, 'error');
        dismissBtn.disabled = false;
      } else {
        card.classList.remove('unread');
        dismissBtn.remove();
        showToast('Notification cleared.');
        loadNotifications(); // Reload to sync navbar & totals
      }
    };
  }

  return card;
}
