// User Profile Page Logic for CollabX

document.addEventListener('DOMContentLoaded', () => {
  // Load profile details and user posts on page load
  loadProfileData();
  loadUserPosts();

  // Setup own profile custom interactions
  if (typeof IS_OWN_PROFILE !== 'undefined' && IS_OWN_PROFILE) {
    setupModal('edit-profile-trigger', 'edit-profile-modal', 'edit-profile-close');
    setupEditProfileForm();
    setupAvatarUpload();
    setupGithubManualLink();
  } else {
    // Setup follow toggle for other profiles
    setupFollowButton();
  }
});

// Fetch Profile Data
async function loadProfileData() {
  const username = (typeof TARGET_USERNAME !== 'undefined') ? TARGET_USERNAME : '';
  const apiUrl = username ? `/api/profile/${username}/` : '/api/profile/';

  const response = await apiRequest(apiUrl);
  if (response.error) {
    showToast(response.error, 'error');
    return;
  }

  const p = response.data.profile;
  
  // Render counts
  const followersCount = document.getElementById('sidebar-followers-count');
  const followingCount = document.getElementById('sidebar-following-count');
  if (followersCount) followersCount.textContent = p.followers_count;
  if (followingCount) followingCount.textContent = p.following_count;
  
  // Set count label in main profile page too if available
  const pFollowersCount = document.getElementById('profile-followers-lbl');
  if (pFollowersCount) pFollowersCount.textContent = p.followers_count;
}

// Edit Profile Form submit handler
function setupEditProfileForm() {
  const form = document.getElementById('edit-profile-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('edit-full-name').value.trim();
    const college = document.getElementById('edit-college').value.trim();
    const bio = document.getElementById('edit-bio').value.trim();
    const linkedin = document.getElementById('edit-linkedin').value.trim();
    const githubLink = document.getElementById('edit-github').value.trim();
    
    // Skills processing
    const skillsInput = document.getElementById('edit-skills').value;
    const skillsList = skillsInput.split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    const response = await apiRequest('/api/profile/edit/', {
      method: 'POST',
      body: JSON.stringify({
        full_name: fullName,
        college,
        bio,
        linkedin_link: linkedin,
        github_link: githubLink,
        skills: skillsList
      })
    });

    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Changes';

    if (response.error) {
      showToast(response.error, 'error');
    } else {
      showToast('Profile updated successfully!');
      
      // Update UI texts immediately
      const nameLbl = document.getElementById('profile-full-name-lbl');
      const bioLbl = document.getElementById('profile-bio-lbl');
      const collegeLbl = document.getElementById('profile-college-lbl');
      const navName = document.getElementById('sidebar-name');
      const navBio = document.getElementById('sidebar-bio');
      
      if (nameLbl) nameLbl.textContent = fullName;
      if (navName) navName.textContent = fullName;
      if (bioLbl) bioLbl.textContent = bio || 'No bio written yet.';
      if (navBio) navBio.textContent = bio || 'No bio written yet. Click profile to edit!';
      
      if (collegeLbl) {
        if (college) {
          collegeLbl.innerHTML = `<span>🏫</span> ${college}`;
          collegeLbl.style.display = 'inline-flex';
        } else {
          collegeLbl.style.display = 'none';
        }
      }

      // Update skills badges
      const skillsContainer = document.getElementById('profile-skills-container');
      if (skillsContainer) {
        skillsContainer.innerHTML = '';
        if (skillsList.length === 0) {
          skillsContainer.innerHTML = '<span style="font-size: 13px; color: var(--text-light);">No skills listed yet.</span>';
        } else {
          skillsList.forEach(skill => {
            const badge = document.createElement('span');
            badge.className = 'badge badge-skill';
            badge.textContent = skill;
            skillsContainer.appendChild(badge);
          });
        }
      }

      // Close modal
      const modal = document.getElementById('edit-profile-modal');
      if (modal) modal.classList.remove('active');
    }
  });
}

// Avatar upload to Cloudinary via AJAX
function setupAvatarUpload() {
  const triggerBtn = document.getElementById('profile-avatar-upload-btn');
  const fileInput = document.getElementById('avatar-file-input');

  if (!triggerBtn || !fileInput) return;

  triggerBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;

    // Validate size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size cannot exceed 5MB.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('profile_picture', file);

    showToast('Uploading image...');

    const response = await apiRequest('/api/profile/upload-avatar/', {
      method: 'POST',
      body: formData
    });

    if (response.error) {
      showToast(response.error, 'error');
    } else {
      const secureUrl = response.data.profile_picture;
      showToast('Profile picture updated!');
      
      // Update all avatar image nodes in DOM
      const profileImg = document.getElementById('profile-avatar-img');
      const navbarImg = document.getElementById('nav-user-avatar');
      const sidebarImg = document.getElementById('sidebar-avatar');

      if (profileImg) profileImg.src = secureUrl;
      if (navbarImg) navbarImg.src = secureUrl;
      if (sidebarImg) sidebarImg.src = secureUrl;
    }
  });
}

// Link/Disconnect GitHub account
function setupGithubManualLink() {
  const form = document.getElementById('connect-github-form');
  const statsCard = document.getElementById('profile-github-stats-card');
  
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const usernameInput = document.getElementById('github-username-input');
      const username = usernameInput.value.trim();

      if (!username) return;

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Syncing...';

      const response = await apiRequest('/api/profile/connect-github/', {
        method: 'POST',
        body: JSON.stringify({ github_username: username })
      });

      submitBtn.disabled = false;
      submitBtn.textContent = 'Link Account';

      if (response.error) {
        showToast(response.error, 'error');
      } else {
        showToast(response.data.message);
        // Refresh profile stats card in UI
        location.reload();
      }
    });
  }

  // Handle Disconnect Button
  const disconnectBtn = document.getElementById('disconnect-github-btn');
  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to disconnect your GitHub profile?')) return;
      
      disconnectBtn.disabled = true;
      disconnectBtn.textContent = 'Disconnecting...';

      const response = await apiRequest('/api/profile/connect-github/', {
        method: 'POST',
        body: JSON.stringify({ github_username: '' }) // Empty string disconnects
      });

      if (response.error) {
        showToast(response.error, 'error');
        disconnectBtn.disabled = false;
        disconnectBtn.textContent = 'Disconnect GitHub';
      } else {
        showToast(response.data.message);
        location.reload();
      }
    });
  }
}

// Follow toggle for other profile page
function setupFollowButton() {
  const followBtn = document.getElementById('profile-follow-btn');
  if (!followBtn) return;

  followBtn.addEventListener('click', async () => {
    const targetUsername = followBtn.getAttribute('data-username');
    
    followBtn.disabled = true;
    const response = await apiRequest(`/api/social/follow/${targetUsername}/`, { method: 'POST' });
    followBtn.disabled = false;

    if (response.error) {
      showToast(response.error, 'error');
      return;
    }

    const { is_following, followers_count } = response.data;
    
    if (is_following) {
      followBtn.textContent = 'Unfollow';
      followBtn.className = 'btn btn-secondary';
    } else {
      followBtn.textContent = 'Follow';
      followBtn.className = 'btn btn-primary';
    }

    showToast(response.data.message);
    
    // Refresh count values if available
    const countLbl = document.getElementById('sidebar-followers-count');
    if (countLbl) countLbl.textContent = followers_count;
  });
}

// Fetch and render target user posts list
async function loadUserPosts() {
  const container = document.getElementById('profile-posts-container');
  const countLabel = document.getElementById('profile-posts-count');
  
  if (!container) return;

  const username = (typeof TARGET_USERNAME !== 'undefined') ? TARGET_USERNAME : '';
  const apiUrl = `/api/posts/?username=${username}`;

  const response = await apiRequest(apiUrl);
  if (response.error) {
    container.innerHTML = '<div class="empty-feed"><p class="empty-feed-title" style="color:var(--status-error);">Error loading posts</p></div>';
    return;
  }

  const posts = response.data.posts || [];
  if (countLabel) countLabel.textContent = posts.length;

  if (posts.length === 0) {
    container.innerHTML = `
      <div class="empty-feed" style="padding: 40px 0;">
        <p class="empty-feed-title">No posts yet</p>
        <p class="empty-feed-desc">This user has not published any collaboration needs.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  posts.forEach(post => {
    // Reuse createPostCard function declared in feed.js
    // If createPostCard is not globally scoped, let's redefine it here or share it.
    // Redefining it here is safer since scripts load in isolation.
    container.appendChild(createProfilePostCard(post));
  });
}

// Helper to render post cards on profile
function createProfilePostCard(post) {
  const card = document.createElement('article');
  card.className = 'card post-card';

  const formattedType = post.post_type === 'recruitment' ? 'Project Recruitment' : 'Hackathon Team';
  const typeClass = post.post_type === 'recruitment' ? 'badge-recruitment' : 'badge-hackathon';
  
  let skillsHTML = '';
  post.skills.forEach(skill => {
    skillsHTML += `<span class="badge badge-skill">${skill}</span>`;
  });

  card.innerHTML = `
    <div class="post-header">
      <div class="post-author-info">
        <img src="${post.author.profile_picture}" alt="${post.author.username}" class="avatar">
        <div class="post-author-meta">
          <span class="post-author-name">${post.author.full_name}</span>
          <div class="post-time-meta">
            <span>@${post.author.username}</span>
            <span>&bull;</span>
            <span>${formatRelativeTime(post.created_at)}</span>
          </div>
        </div>
      </div>
      
      <span class="post-type-badge ${typeClass}">${formattedType}</span>
    </div>
    
    <a href="/post/${post.id}/">
      <h3 class="post-title">${post.title}</h3>
    </a>
    
    <p class="post-desc">${post.description}</p>
    
    <div class="post-skills-section">
      ${skillsHTML}
    </div>
    
    <div class="post-actions">
      <button class="post-action-btn btn-like-toggle-profile ${post.is_liked ? 'liked' : ''}" data-post-id="${post.id}">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
        <span>Like (<span class="likes-count-profile">${post.likes_count}</span>)</span>
      </button>
      
      <a href="/post/${post.id}/" class="post-action-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
        </svg>
        <span>Comment (${post.comments_count})</span>
      </a>
    </div>
  `;

  // Bind Like in Profile
  const likeBtn = card.querySelector('.btn-like-toggle-profile');
  likeBtn.addEventListener('click', async () => {
    likeBtn.disabled = true;
    const response = await apiRequest(`/api/posts/${post.id}/like/`, { method: 'POST' });
    likeBtn.disabled = false;

    if (response.error) {
      showToast(response.error, 'error');
      return;
    }

    const { liked, likes_count } = response.data;
    const countSpan = card.querySelector('.likes-count-profile');
    if (liked) {
      likeBtn.classList.add('liked');
    } else {
      likeBtn.classList.remove('liked');
    }
    if (countSpan) countSpan.textContent = likes_count;
  });

  return card;
}
