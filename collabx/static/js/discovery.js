// Developer Discovery Logic for CollabX

document.addEventListener('DOMContentLoaded', () => {
  let currentRole = 'all';
  let searchQuery = '';
  let searchTimeout = null;

  // Initial fetch
  loadDevelopers(currentRole, searchQuery);

  // Search input handler with debounce
  const searchInput = document.getElementById('dev-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        loadDevelopers(currentRole, searchQuery);
      }, 350);
    });
  }

  // Role filters click handlers
  const filterItems = document.querySelectorAll('.role-filter-item');
  filterItems.forEach(item => {
    item.addEventListener('click', () => {
      filterItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      currentRole = item.getAttribute('data-role');
      loadDevelopers(currentRole, searchQuery);
    });
  });
});

// Fetch and render developers
async function loadDevelopers(role = 'all', query = '') {
  const container = document.getElementById('developers-container');
  const countLabel = document.getElementById('devs-count-lbl');
  
  if (!container) return;
  container.innerHTML = '<div style="text-align:center; padding: 40px; grid-column: 1/-1;"><p style="font-weight:600;">Loading developers...</p></div>';

  let apiUrl = '/api/developers/';
  let params = [];
  if (role !== 'all') {
    params.push(`role=${role}`);
  }
  if (query) {
    params.push(`q=${encodeURIComponent(query)}`);
  }
  if (params.length > 0) {
    apiUrl += '?' + params.join('&');
  }

  const response = await apiRequest(apiUrl);
  if (response.error) {
    container.innerHTML = `<div style="text-align:center; padding:40px; grid-column:1/-1; color:var(--status-error);"><p style="font-weight:600;">Error loading developers</p><p>${response.error}</p></div>`;
    if (countLabel) countLabel.textContent = 'Error';
    return;
  }

  const devs = response.data.developers || [];
  if (countLabel) {
    countLabel.textContent = `${devs.length} developer${devs.length !== 1 ? 's' : ''} found`;
  }

  if (devs.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 40px; grid-column: 1/-1;">
        <p style="font-weight:600; font-size: 16px;">No developers found</p>
        <p style="color:var(--text-muted); font-size:13px;">Try adjusting your query or role filter.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  devs.forEach(dev => {
    container.appendChild(createDevCard(dev));
  });
}

// Generate developer grid card
function createDevCard(dev) {
  const card = document.createElement('div');
  card.className = 'card dev-card';
  card.id = `dev-card-${dev.username}`;

  let skillsHTML = '';
  if (dev.skills.length > 0) {
    dev.skills.forEach(skill => {
      skillsHTML += `<span class="badge badge-skill">${skill}</span>`;
    });
  } else {
    skillsHTML = '<span style="font-size:12px; color:var(--text-light);">No skills listed</span>';
  }

  const followText = dev.is_following ? 'Following' : 'Follow';
  const followClass = dev.is_following ? 'btn-secondary' : 'btn-primary';

  card.innerHTML = `
    <img src="${dev.profile_picture}" alt="${dev.username}" class="dev-avatar">
    <h3 class="dev-name">${dev.full_name}</h3>
    <span class="dev-role-badge">${dev.role_display}</span>
    <p class="dev-college">${dev.college || '@' + dev.username}</p>
    
    <div class="dev-skills">
      ${skillsHTML}
    </div>
    
    <div class="dev-footer">
      <button class="btn ${followClass} btn-sm btn-follow-toggle" style="flex:1;" data-username="${dev.username}">${followText}</button>
      <a href="/profile/${dev.username}/" class="btn btn-secondary btn-sm" style="flex:1;">Profile</a>
    </div>
  `;

  // Bind follow toggle
  const followBtn = card.querySelector('.btn-follow-toggle');
  followBtn.addEventListener('click', () => toggleFollowInDiscovery(dev.username));

  return card;
}

// Toggle Follow
async function toggleFollowInDiscovery(username) {
  const buttons = document.querySelectorAll(`.btn-follow-toggle[data-username="${username}"]`);
  buttons.forEach(btn => btn.disabled = true);

  const response = await apiRequest(`/api/social/follow/${username}/`, { method: 'POST' });

  buttons.forEach(btn => {
    btn.disabled = false;
    if (response.error) return;

    const { is_following } = response.data;
    if (is_following) {
      btn.textContent = 'Following';
      btn.className = 'btn btn-secondary btn-sm btn-follow-toggle';
    } else {
      btn.textContent = 'Follow';
      btn.className = 'btn btn-primary btn-sm btn-follow-toggle';
    }
  });

  if (response.error) {
    showToast(response.error, 'error');
  } else {
    showToast(response.data.message);
  }
}
