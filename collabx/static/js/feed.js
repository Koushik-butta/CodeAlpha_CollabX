// Home Feed Page Logic for CollabX

document.addEventListener('DOMContentLoaded', () => {
  let currentPostType = 'all';
  let searchQuery = '';
  let searchTimeout = null;

  // Initialize: Load Feed, suggestions, and trending skills
  loadFeed(currentPostType, searchQuery);
  loadSuggestions();
  loadTrendingSkills();

  // Search input handler with debounce
  const searchInput = document.getElementById('feed-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        loadFeed(currentPostType, searchQuery);
      }, 350); // 350ms debounce
    });
  }

  // Filter chips click handlers
  const filterChips = document.querySelectorAll('.filter-chip');
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      
      currentPostType = chip.getAttribute('data-type');
      loadFeed(currentPostType, searchQuery);
    });
  });
});

// Load posts feed from REST API
async function loadFeed(postType = 'all', query = '') {
  const container = document.getElementById('feed-posts-container');
  const countLabel = document.getElementById('feed-results-count');
  
  if (!container) return;
  container.innerHTML = '<div class="empty-feed"><p class="empty-feed-title">Loading posts...</p></div>';

  let apiUrl = `/api/posts/?post_type=${postType}`;
  if (query) {
    apiUrl = `/api/search/?q=${encodeURIComponent(query)}&post_type=${postType}`;
  }

  const response = await apiRequest(apiUrl);
  
  if (response.error) {
    container.innerHTML = `<div class="empty-feed"><p class="empty-feed-title" style="color:var(--status-error);">Error loading feed</p><p class="empty-feed-desc">${response.error}</p></div>`;
    if (countLabel) countLabel.textContent = 'Error';
    return;
  }

  const posts = response.data.posts || [];
  
  if (countLabel) {
    countLabel.textContent = `${posts.length} post${posts.length !== 1 ? 's' : ''} found`;
  }

  if (posts.length === 0) {
    container.innerHTML = `
      <div class="empty-feed">
        <p class="empty-feed-title">No posts found</p>
        <p class="empty-feed-desc">${query ? 'Try adjusting your search criteria.' : 'Create a post to start the collaboration!'}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  posts.forEach(post => {
    container.appendChild(createPostCard(post));
  });
}

// Dynamically generate a post card node
function createPostCard(post) {
  const card = document.createElement('article');
  card.className = 'card post-card';
  card.id = `post-card-${post.id}`;

  const formattedType = post.post_type === 'recruitment' ? 'Project Recruitment' : 'Hackathon Team';
  const typeClass = post.post_type === 'recruitment' ? 'badge-recruitment' : 'badge-hackathon';
  
  // Sniff content for colorful role badges
  let roleBadgesHTML = '';
  const searchStr = (post.title + ' ' + post.description + ' ' + post.skills.join(' ')).toLowerCase();
  
  if (post.post_type === 'recruitment') {
    if (searchStr.includes('react') || searchStr.includes('frontend') || searchStr.includes('ui/ux') || searchStr.includes('js') || searchStr.includes('css') || searchStr.includes('html')) {
      roleBadgesHTML += `<span class="badge badge-role role-frontend" style="background:#2563EB20; color:#2563EB; border:1px solid #2563EB40; margin-right:4px; font-size:11px;">Looking For Frontend</span>`;
    }
    if (searchStr.includes('backend') || searchStr.includes('django') || searchStr.includes('node') || searchStr.includes('python') || searchStr.includes('api') || searchStr.includes('postgres') || searchStr.includes('sql')) {
      roleBadgesHTML += `<span class="badge badge-role role-backend" style="background:#FF6B3520; color:#FF6B35; border:1px solid #FF6B3540; margin-right:4px; font-size:11px;">Looking For Backend</span>`;
    }
    if (searchStr.includes('figma') || searchStr.includes('design') || searchStr.includes('designer') || searchStr.includes('ui') || searchStr.includes('ux')) {
      roleBadgesHTML += `<span class="badge badge-role role-designer" style="background:#10B98120; color:#10B981; border:1px solid #10B98140; margin-right:4px; font-size:11px;">Looking For Designer</span>`;
    }
    if (searchStr.includes('ai') || searchStr.includes('ml') || searchStr.includes('pytorch') || searchStr.includes('tensorflow') || searchStr.includes('nlp') || searchStr.includes('model') || searchStr.includes('deep learning')) {
      roleBadgesHTML += `<span class="badge badge-role role-ai" style="background:#8B5CF620; color:#8B5CF6; border:1px solid #8B5CF640; margin-right:4px; font-size:11px;">Looking For AI Engineer</span>`;
    }
    if (!roleBadgesHTML) {
      roleBadgesHTML = `<span class="badge badge-role role-builder" style="background:#3B82F620; color:#3B82F6; border:1px solid #3B82F640; margin-right:4px; font-size:11px;">Looking For Builders</span>`;
    }
  }

  // Build skills badges HTML
  let skillsHTML = '';
  post.skills.forEach(skill => {
    skillsHTML += `<span class="badge badge-skill">${skill}</span>`;
  });

  // Simulated project metrics based on post ID
  const simulatedTeamSize = (post.id % 3) + 2; 
  const simulatedTargetSize = (post.id % 2 === 0) ? 4 : 5;
  const simulatedOpenPositions = Math.max(1, simulatedTargetSize - simulatedTeamSize);
  const statusBadgeHTML = `<span class="badge badge-skill" style="font-size:10px; background:#10B98115; color:#10B981; border:1px solid #10B98130; padding:2px 8px;">Hiring</span>`;

  const metaGridHTML = post.post_type === 'recruitment' ? `
    <div class="recruitment-meta-grid">
      <div>
        <div style="font-size:11px; color:var(--text-light); text-transform:uppercase; font-weight:600;">Team Size</div>
        <div style="font-size:13px; font-weight:700; margin-top:2px;">👥 ${simulatedTeamSize}/${simulatedTargetSize} members</div>
      </div>
      <div>
        <div style="font-size:11px; color:var(--text-light); text-transform:uppercase; font-weight:600;">Open Positions</div>
        <div style="font-size:13px; font-weight:700; margin-top:2px; color:var(--accent-cyan);">🎯 ${simulatedOpenPositions} vacancy</div>
      </div>
      <div>
        <div style="font-size:11px; color:var(--text-light); text-transform:uppercase; font-weight:600;">Project Status</div>
        <div style="font-size:13px; font-weight:700; margin-top:2px; color:var(--status-success);">${statusBadgeHTML}</div>
      </div>
    </div>
  ` : '';

  // Follow button logic
  let followButtonHTML = '';
  if (!post.is_author) {
    const followText = post.is_following ? 'Following' : 'Follow';
    const followBtnClass = post.is_following ? 'btn-secondary' : 'btn-primary';
    followButtonHTML = `
      <button class="btn ${followBtnClass} btn-sm btn-follow-toggle" data-username="${post.author.username}">
        ${followText}
      </button>
    `;
  }

  card.innerHTML = `
    <div class="post-header">
      <div class="post-author-info">
        <a href="/profile/${post.author.username}/">
          <img src="${post.author.profile_picture}" alt="${post.author.username}" class="avatar">
        </a>
        <div class="post-author-meta">
          <a href="/profile/${post.author.username}/" class="post-author-name">${post.author.full_name}</a>
          <div class="post-time-meta">
            <span>@${post.author.username}</span>
            <span>&bull;</span>
            <span>${formatRelativeTime(post.created_at)}</span>
          </div>
        </div>
      </div>
      
      <div style="display: flex; gap: 8px; align-items: center;">
        <span class="post-type-badge ${typeClass}">${formattedType}</span>
        ${followButtonHTML}
      </div>
    </div>
    
    <div class="post-role-badges">
      ${roleBadgesHTML}
    </div>
    
    <a href="/post/${post.id}/">
      <h3 class="post-title">${post.title}</h3>
    </a>
    
    <p class="post-desc">${post.description}</p>
    
    ${metaGridHTML}
    
    <div class="post-skills-section">
      ${skillsHTML}
    </div>
    
    <div class="post-actions">
      <button class="post-action-btn btn-like-toggle ${post.is_liked ? 'liked' : ''}" data-post-id="${post.id}">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
        <span>Like (<span class="likes-count">${post.likes_count}</span>)</span>
      </button>
      
      <a href="/post/${post.id}/" class="post-action-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
        </svg>
        <span>Comment (${post.comments_count})</span>
      </a>
    </div>
  `;

  // Bind Follow Button
  const followBtn = card.querySelector('.btn-follow-toggle');
  if (followBtn) {
    followBtn.addEventListener('click', () => toggleFollow(post.author.username));
  }

  // Bind Like Button
  const likeBtn = card.querySelector('.btn-like-toggle');
  if (likeBtn) {
    likeBtn.addEventListener('click', () => toggleLike(post.id, likeBtn));
  }

  return card;
}

// Toggle Like
async function toggleLike(postId, buttonElement) {
  buttonElement.disabled = true;
  const response = await apiRequest(`/api/posts/${postId}/like/`, { method: 'POST' });
  buttonElement.disabled = false;

  if (response.error) {
    showToast(response.error, 'error');
    return;
  }

  const { liked, likes_count } = response.data;
  const countSpan = buttonElement.querySelector('.likes-count');
  
  if (liked) {
    buttonElement.classList.add('liked');
    showToast('Post liked!');
  } else {
    buttonElement.classList.remove('liked');
  }
  
  if (countSpan) countSpan.textContent = likes_count;
}

// Toggle Follow
async function toggleFollow(username) {
  // Disable all follow buttons for this user across page to prevent spam
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

// Fetch suggested connections
async function loadSuggestions() {
  const container = document.getElementById('sidebar-suggestions-container');
  if (!container) return;

  const response = await apiRequest('/api/social/suggestions/');
  if (response.error || !response.data.suggestions) {
    container.innerHTML = '<p style="font-size:12px; color:var(--text-light);">No suggestions currently.</p>';
    return;
  }

  const users = response.data.suggestions;
  if (users.length === 0) {
    container.innerHTML = '<p style="font-size:12px; color:var(--text-light);">No developers found to suggest.</p>';
    return;
  }

  container.innerHTML = '';
  users.forEach(u => {
    const item = document.createElement('div');
    item.className = 'widget-user-item';
    
    item.innerHTML = `
      <div class="widget-user-info">
        <a href="/profile/${u.username}/">
          <img src="${u.profile_picture}" alt="${u.username}" class="avatar btn-sm" style="width: 38px; height: 38px;">
        </a>
        <div class="widget-user-details">
          <a href="/profile/${u.username}/" class="widget-user-name">${u.full_name}</a>
          <span class="widget-user-title">${u.college || '@' + u.username}</span>
        </div>
      </div>
      <button class="btn btn-primary btn-sm btn-follow-toggle" data-username="${u.username}" style="padding: 4px 10px; font-size: 11px;">Follow</button>
    `;

    // Bind Follow
    const btn = item.querySelector('.btn-follow-toggle');
    btn.addEventListener('click', () => toggleFollow(u.username));
    
    container.appendChild(item);
  });
}

// Fetch trending skills
async function loadTrendingSkills() {
  const container = document.getElementById('sidebar-skills-container');
  if (!container) return;

  const response = await apiRequest('/api/social/trending-skills/');
  if (response.error || !response.data.skills) {
    container.innerHTML = '<p style="font-size:12px; color:var(--text-light);">No skills trending.</p>';
    return;
  }

  const skills = response.data.skills;
  container.innerHTML = '';
  skills.forEach(skill => {
    const chip = document.createElement('button');
    chip.className = 'badge badge-skill';
    chip.textContent = skill;
    chip.style.cursor = 'pointer';
    chip.style.border = '1px solid rgba(79, 70, 229, 0.15)';
    
    chip.addEventListener('click', () => {
      const searchInput = document.getElementById('feed-search-input');
      if (searchInput) {
        searchInput.value = skill;
        // Trigger search
        searchInput.dispatchEvent(new Event('input'));
      }
    });
    
    container.appendChild(chip);
  });
}
