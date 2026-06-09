// CollabX Feed JS — Instagram-style

document.addEventListener('DOMContentLoaded', () => {
  let currentPostType = 'all';
  let searchQuery = '';
  let searchTimeout = null;

  // Initialize feed, stories, suggestions, skills
  loadFeed(currentPostType, searchQuery);
  loadSuggestions();
  loadTrendingSkills();
  loadProfileStats();

  // Filter chips
  document.querySelectorAll('.insta-filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.insta-filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentPostType = chip.dataset.type;
      loadFeed(currentPostType, searchQuery);
    });
  });

  // Search input with debounce
  const searchInput = document.getElementById('feed-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => loadFeed(currentPostType, searchQuery), 350);
    });
  }
});

// ========================
// Load Feed
// ========================
async function loadFeed(postType = 'all', query = '') {
  const container = document.getElementById('feed-posts-container');
  if (!container) return;

  // Show skeleton
  container.innerHTML = `
    ${skeletonCard()}${skeletonCard()}${skeletonCard()}
  `;

  const apiUrl = query
    ? `/api/search/?q=${encodeURIComponent(query)}&post_type=${postType}`
    : `/api/posts/?post_type=${postType}`;

  const response = await apiRequest(apiUrl);

  if (response.error) {
    container.innerHTML = `<div class="insta-empty-state">
      <div class="insta-empty-state-icon">⚠️</div>
      <h3>Failed to load</h3>
      <p>${response.error}</p>
    </div>`;
    return;
  }

  const posts = response.data.posts || [];

  if (posts.length === 0) {
    container.innerHTML = `<div class="insta-empty-state">
      <div class="insta-empty-state-icon">📭</div>
      <h3>No posts yet</h3>
      <p>Be the first to pitch an idea or share a hackathon!</p>
    </div>`;
    return;
  }

  container.innerHTML = '';
  posts.forEach(post => {
    const card = buildPostCard(post);
    container.appendChild(card);
  });
}

function skeletonCard() {
  return `<div class="insta-skeleton">
    <div class="skeleton-header">
      <div class="skeleton-avatar"></div>
      <div class="skeleton-lines"><div class="skeleton-line w60"></div><div class="skeleton-line w40"></div></div>
    </div>
    <div class="skeleton-body"></div>
  </div>`;
}

// ========================
// Build Instagram Post Card
// ========================
function buildPostCard(post) {
  const card = document.createElement('div');
  card.className = 'insta-post-card';
  card.dataset.postId = post.id;

  const typeLabel = post.post_type === 'recruitment' ? 'Project' :
                    post.post_type === 'hackathon'   ? 'Hackathon' : 'Post';
  const typeClass = post.post_type === 'recruitment' ? 'badge-recruitment' :
                    post.post_type === 'hackathon'   ? 'badge-hackathon' : 'badge-general';

  const timeAgo = formatTimeAgo(post.created_at);
  const skillsHtml = (post.skills || []).slice(0, 5).map(s =>
    `<span class="insta-skill-tag">${s}</span>`).join('');

  // Role badges from content
  const rolesHtml = extractRoleBadges(post.content);

  card.innerHTML = `
    <!-- Post Header -->
    <div class="insta-post-header">
      <a href="/profile/${post.author}/" class="insta-post-avatar-wrap" title="${post.author}">
        <img src="${post.author_avatar || '/static/img/default-avatar.png'}" alt="${post.author}" class="insta-post-avatar"
          onerror="this.src='/static/img/default-avatar.png'">
      </a>
      <div class="insta-post-author-info">
        <a href="/profile/${post.author}/" class="insta-post-author-name">${post.author_name || post.author}</a>
        <div class="insta-post-meta">@${post.author} · ${timeAgo}</div>
      </div>
      <span class="insta-post-type-badge ${typeClass}">${typeLabel}</span>
    </div>

    <!-- Post Content -->
    <div class="insta-post-content">
      <div class="insta-post-title">${escapeHtml(post.title)}</div>
      <div class="insta-post-body" id="body-${post.id}">${escapeHtml(post.content)}</div>
      ${post.content && post.content.length > 200
        ? `<button class="insta-post-expand-btn" onclick="toggleExpand(${post.id})">more</button>`
        : ''}
    </div>

    ${skillsHtml ? `<div class="insta-post-skills">${skillsHtml}</div>` : ''}
    ${rolesHtml  ? `<div class="role-badges-row">${rolesHtml}</div>` : ''}

    <!-- Actions -->
    <div class="insta-post-actions">
      <button class="insta-action-btn ${post.liked_by_user ? 'liked' : ''}" 
              id="like-btn-${post.id}" onclick="handleLike(${post.id})">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="${post.liked_by_user ? '#f43f5e' : 'none'}" 
             stroke="${post.liked_by_user ? '#f43f5e' : 'currentColor'}" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <span class="insta-like-count" id="like-count-${post.id}">${post.likes_count || 0}</span>
      </button>

      <button class="insta-action-btn" onclick="toggleComments(${post.id})">
        <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span id="comment-count-${post.id}">${post.comments_count || 0}</span>
      </button>

      <div class="insta-action-spacer"></div>

      <a href="/post/${post.id}/" class="insta-action-detail-btn" title="View full post">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
        View
      </a>
    </div>

    <!-- Inline Comments Section -->
    <div class="insta-comments-section" id="comments-${post.id}">
      <div class="insta-comment-input-row">
        <img src="${window.CURRENT_USER_AVATAR || '/static/img/default-avatar.png'}" 
             alt="You" class="insta-comment-user-avatar"
             onerror="this.src='/static/img/default-avatar.png'">
        <input type="text" class="insta-comment-input" id="comment-input-${post.id}" 
               placeholder="Add a comment..." maxlength="500">
        <button class="insta-comment-submit-btn" onclick="submitComment(${post.id})">Post</button>
      </div>
      <div class="insta-comments-list" id="comments-list-${post.id}"></div>
    </div>
  `;

  return card;
}

// ========================
// Likes
// ========================
async function handleLike(postId) {
  const btn = document.getElementById(`like-btn-${postId}`);
  const countEl = document.getElementById(`like-count-${postId}`);
  if (!btn) return;

  const wasLiked = btn.classList.contains('liked');
  const newCount = Math.max(0, parseInt(countEl.textContent || '0') + (wasLiked ? -1 : 1));

  // Optimistic update
  btn.classList.toggle('liked');
  const svg = btn.querySelector('svg');
  const newColor = wasLiked ? 'currentColor' : '#f43f5e';
  const newFill  = wasLiked ? 'none'         : '#f43f5e';
  svg.setAttribute('stroke', newColor);
  svg.setAttribute('fill', newFill);
  countEl.textContent = newCount;

  const response = await apiRequest(`/api/posts/${postId}/like/`, { method: 'POST' });
  if (response.error) {
    // Revert
    btn.classList.toggle('liked');
    svg.setAttribute('stroke', wasLiked ? '#f43f5e' : 'currentColor');
    svg.setAttribute('fill',   wasLiked ? '#f43f5e' : 'none');
    countEl.textContent = parseInt(countEl.textContent) + (wasLiked ? 1 : -1);
    showToast(response.error, 'error');
  }
}

// ========================
// Comments
// ========================
function toggleComments(postId) {
  const section = document.getElementById(`comments-${postId}`);
  if (!section) return;
  const isOpen = section.classList.contains('open');
  section.classList.toggle('open');
  if (!isOpen) loadComments(postId);
}

async function loadComments(postId) {
  const list = document.getElementById(`comments-list-${postId}`);
  if (!list) return;
  list.innerHTML = '<div style="color:var(--text-light);font-size:13px;padding:8px 0;">Loading...</div>';

  const response = await apiRequest(`/api/posts/${postId}/`);
  if (response.error || !response.data) { list.innerHTML = ''; return; }

  const comments = response.data.comments || [];
  if (comments.length === 0) {
    list.innerHTML = '<div style="color:var(--text-light);font-size:13px;padding:8px 0;">No comments yet. Be first!</div>';
    return;
  }

  list.innerHTML = comments.map(c => `
    <div class="insta-comment-item">
      <img src="${c.author_avatar || '/static/img/default-avatar.png'}" alt="${c.author}" 
           class="insta-comment-item-avatar" onerror="this.src='/static/img/default-avatar.png'">
      <div class="insta-comment-item-body">
        <div class="insta-comment-item-author"><a href="/profile/${c.author}/" style="color:inherit;text-decoration:none;">${c.author}</a></div>
        <div class="insta-comment-item-text">${escapeHtml(c.content)}</div>
        <div class="insta-comment-item-time">${formatTimeAgo(c.created_at)}</div>
      </div>
    </div>
  `).join('');
}

async function submitComment(postId) {
  const input = document.getElementById(`comment-input-${postId}`);
  const content = input ? input.value.trim() : '';
  if (!content) return;

  const response = await apiRequest(`/api/posts/${postId}/comment/`, {
    method: 'POST',
    body: JSON.stringify({ content })
  });

  if (response.error) {
    showToast(response.error, 'error');
    return;
  }

  input.value = '';
  // Update count
  const countEl = document.getElementById(`comment-count-${postId}`);
  if (countEl) countEl.textContent = parseInt(countEl.textContent || '0') + 1;

  // Reload comments inline
  loadComments(postId);
  showToast('Comment posted!', 'success');
}

// Enter key to submit comment
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.classList.contains('insta-comment-input')) {
    const postId = e.target.id.replace('comment-input-', '');
    submitComment(parseInt(postId));
  }
});

// ========================
// Expand/Collapse body text
// ========================
function toggleExpand(postId) {
  const body = document.getElementById(`body-${postId}`);
  const btn = body?.nextElementSibling;
  if (!body) return;
  body.classList.toggle('expanded');
  if (btn) btn.textContent = body.classList.contains('expanded') ? 'less' : 'more';
}

// ========================
// Suggestions (Right Sidebar + Stories)
// ========================
async function loadSuggestions() {
  const container = document.getElementById('sidebar-suggestions-container');
  const storiesContainer = document.getElementById('stories-users-container');

  const response = await apiRequest('/api/social/suggestions/');
  if (response.error) return;

  const users = response.data.suggestions || [];

  // Stories bar
  if (storiesContainer) {
    storiesContainer.innerHTML = users.slice(0, 6).map(u => `
      <div class="insta-story-item" onclick="window.location.href='/profile/${u.username}/'">
        <div class="insta-story-ring">
          <img src="${u.profile_picture || '/static/img/default-avatar.png'}" alt="${u.username}" class="insta-story-avatar"
            onerror="this.src='/static/img/default-avatar.png'">
        </div>
        <span class="insta-story-label">${u.username}</span>
      </div>
    `).join('');
  }

  // Right sidebar suggestions
  if (container) {
    if (users.length === 0) {
      container.innerHTML = '<div style="font-size:13px;color:var(--text-light);">No suggestions yet. Explore developers!</div>';
      return;
    }
    container.innerHTML = users.slice(0, 5).map(u => `
      <div class="insta-suggestion-item">
        <img src="${u.profile_picture || '/static/img/default-avatar.png'}" alt="${u.username}"
             class="insta-suggestion-avatar" onerror="this.src='/static/img/default-avatar.png'">
        <div class="insta-suggestion-info">
          <a href="/profile/${u.username}/" class="insta-suggestion-name">${u.full_name || u.username}</a>
          <span class="insta-suggestion-meta">@${u.username}${u.college ? ' · ' + u.college : ''}</span>
        </div>
        <button class="insta-follow-btn" id="follow-btn-${u.username}" onclick="handleFollow('${u.username}')">
          ${u.is_following ? 'Following' : 'Follow'}
        </button>
      </div>
    `).join('');
  }
}

async function handleFollow(username) {
  const btn = document.getElementById(`follow-btn-${username}`);
  if (!btn) return;
  const isFollowing = btn.textContent.trim() === 'Following';
  btn.textContent = isFollowing ? 'Follow' : 'Following';
  btn.classList.toggle('following', !isFollowing);

  const response = await apiRequest(`/api/social/follow/${username}/`, { method: 'POST' });
  if (response.error) {
    btn.textContent = isFollowing ? 'Following' : 'Follow';
    btn.classList.toggle('following', isFollowing);
    showToast(response.error, 'error');
  }
}

// ========================
// Trending Skills
// ========================
async function loadTrendingSkills() {
  const container = document.getElementById('sidebar-skills-container');
  if (!container) return;

  const response = await apiRequest('/api/social/trending-skills/');
  if (response.error) return;

  const skills = response.data.skills || [];
  container.innerHTML = skills.slice(0, 12).map(s =>
    `<span class="insta-skill-bubble">${s}</span>`
  ).join('');
}

// ========================
// Profile Stats (Left Sidebar)
// ========================
async function loadProfileStats() {
  const response = await apiRequest('/api/profile/');
  if (response.error) return;
  const p = response.data;
  const el = (id, val) => { const e = document.getElementById(id); if(e) e.textContent = val; };
  el('sidebar-followers-count', p.followers_count || 0);
  el('sidebar-following-count', p.following_count || 0);
}

// ========================
// Helpers
// ========================
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

function extractRoleBadges(content) {
  if (!content) return '';
  const roles = [
    { key: 'frontend',  label: 'Frontend Dev',   cls: 'role-badge-frontend' },
    { key: 'backend',   label: 'Backend Dev',    cls: 'role-badge-backend' },
    { key: 'fullstack', label: 'Full Stack',     cls: 'role-badge-fullstack' },
    { key: 'design',    label: 'UI/UX Designer', cls: 'role-badge-design' },
    { key: 'ai',        label: 'AI/ML',          cls: 'role-badge-aiml' },
    { key: 'ml',        label: 'ML Engineer',    cls: 'role-badge-aiml' },
    { key: 'mobile',    label: 'Mobile Dev',     cls: 'role-badge-default' },
  ];
  const lower = content.toLowerCase();
  const found = roles.filter(r => lower.includes(r.key));
  if (!found.length) return '';
  return found.map(r => `<span class="role-badge ${r.cls}">👥 ${r.label}</span>`).join('');
}
