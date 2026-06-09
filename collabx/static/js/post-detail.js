// Post Details and Comments Thread Logic for CollabX

document.addEventListener('DOMContentLoaded', () => {
  if (typeof POST_ID !== 'undefined' && POST_ID) {
    loadPostDetails();
    setupCommentForm();
  }
});

let authorUsername = '';

// Load single post info and discussion timeline
async function loadPostDetails() {
  const response = await apiRequest(`/api/posts/${POST_ID}/`);
  if (response.error) {
    showToast(response.error, 'error');
    return;
  }

  const post = response.data.post;
  authorUsername = post.author.username;

  // Render Author Information
  const authorAvatar = document.getElementById('author-avatar-img');
  const authorName = document.getElementById('author-name-lbl');
  const authorProfileLink = document.getElementById('author-profile-link');
  const postDate = document.getElementById('post-date-lbl');
  const postCollege = document.getElementById('post-college-lbl');

  if (authorAvatar) authorAvatar.src = post.author.profile_picture;
  if (authorName) authorName.textContent = post.author.full_name;
  if (authorProfileLink) {
    authorProfileLink.href = `/profile/${post.author.username}/`;
    authorProfileLink.setAttribute('id', `profile-link-${post.author.username}`);
  }
  if (postDate) postDate.textContent = formatRelativeTime(post.created_at);
  if (postCollege) postCollege.textContent = post.author.college ? post.author.college : `@${post.author.username}`;

  // Render Post content
  const postTitle = document.getElementById('post-title-lbl');
  const postDesc = document.getElementById('post-desc-lbl');
  const typeBadge = document.getElementById('post-type-badge');
  const likesCount = document.getElementById('post-likes-count');
  const commentsCount = document.getElementById('post-comments-count');

  if (postTitle) postTitle.textContent = post.title;
  if (postDesc) postDesc.innerHTML = post.description.replace(/\n/g, '<br>');
  if (likesCount) likesCount.textContent = post.likes_count;
  if (commentsCount) commentsCount.textContent = post.comments_count;

  if (typeBadge) {
    typeBadge.textContent = post.post_type === 'recruitment' ? 'Project Recruitment' : 'Hackathon Team';
    typeBadge.className = `post-type-badge ${post.post_type === 'recruitment' ? 'badge-recruitment' : 'badge-hackathon'}`;
  }

  // Render skills list
  const skillsContainer = document.getElementById('post-skills-container');
  if (skillsContainer) {
    skillsContainer.innerHTML = '';
    post.skills.forEach(skill => {
      const badge = document.createElement('span');
      badge.className = 'badge badge-skill';
      badge.textContent = skill;
      skillsContainer.appendChild(badge);
    });
  }

  // Setup Follow Button
  const followBtn = document.getElementById('post-follow-author-btn');
  if (followBtn) {
    if (post.is_author) {
      followBtn.style.display = 'none';
    } else {
      followBtn.style.display = 'inline-flex';
      followBtn.textContent = post.is_following ? 'Following' : 'Follow';
      followBtn.className = `btn ${post.is_following ? 'btn-secondary' : 'btn-primary'} btn-sm`;
      
      // Bind follow toggle
      followBtn.onclick = () => toggleFollowInDetails(post.author.username, followBtn);
    }
  }

  // Setup Like Button Style and Handler
  const likeBtn = document.getElementById('post-like-btn');
  if (likeBtn) {
    if (post.is_liked) {
      likeBtn.classList.add('liked');
    }
    likeBtn.onclick = () => toggleLikeInDetails(post.id, likeBtn);
  }

  // Setup Author Actions (Edit/Delete buttons)
  const authorActions = document.getElementById('author-actions-container');
  if (authorActions && post.is_author) {
    authorActions.style.display = 'flex';
    
    // Bind Edit Action
    const editBtn = document.getElementById('btn-edit-post');
    if (editBtn) {
      editBtn.onclick = () => {
        window.location.href = `/post/edit/${post.id}/`;
      };
    }

    // Bind Delete Action
    const deleteBtn = document.getElementById('btn-delete-post');
    if (deleteBtn) {
      deleteBtn.onclick = () => deletePostInDetails(post.id, deleteBtn);
    }
  }

  // Render Comments List
  renderCommentsList(post.comments);
}

// Render Comments Timeline
function renderCommentsList(comments) {
  const container = document.getElementById('post-comments-container');
  if (!container) return;

  if (comments.length === 0) {
    container.innerHTML = `
      <div class="empty-feed" style="padding: 20px 0;">
        <p class="empty-feed-desc">No comments yet. Start the conversation!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  comments.forEach(c => {
    container.appendChild(createCommentNode(c));
  });
}

// Generate Comment Node
function createCommentNode(c) {
  const item = document.createElement('div');
  item.className = 'comment-card';
  item.id = `comment-${c.id}`;

  item.innerHTML = `
    <a href="/profile/${c.author.username}/">
      <img src="${c.author.profile_picture}" alt="${c.author.username}" class="avatar btn-sm" style="width: 36px; height: 36px;">
    </a>
    
    <div class="comment-content-wrapper">
      <div class="comment-author-meta">
        <a href="/profile/${c.author.username}/" class="comment-author-name">${c.author.full_name}</a>
        <span style="font-size: 11px; color: var(--text-light);">${formatRelativeTime(c.created_at)}</span>
      </div>
      <p class="comment-content">${c.content.replace(/\n/g, '<br>')}</p>
    </div>
  `;
  return item;
}

// Submit Comment via AJAX
function setupCommentForm() {
  const form = document.getElementById('comment-composer-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('comment-input');
    const content = input.value.trim();

    if (!content) return;

    const submitBtn = document.getElementById('btn-comment-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';

    const response = await apiRequest(`/api/posts/${POST_ID}/comment/`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });

    submitBtn.disabled = false;
    submitBtn.textContent = 'Post Comment';

    if (response.error) {
      showToast(response.error, 'error');
    } else {
      showToast('Comment published!');
      input.value = '';
      
      // Update UI counts
      const countLabel = document.getElementById('post-comments-count');
      if (countLabel) {
        const currentCount = parseInt(countLabel.textContent) || 0;
        countLabel.textContent = currentCount + 1;
      }

      // Prepend or append new comment
      const comment = response.data.comment;
      const container = document.getElementById('post-comments-container');
      
      // Remove empty description card if present
      const emptyState = container.querySelector('.empty-feed');
      if (emptyState) emptyState.remove();

      container.appendChild(createCommentNode(comment));
    }
  });
}

// Toggle Like in Details Page
async function toggleLikeInDetails(postId, buttonElement) {
  buttonElement.disabled = true;
  const response = await apiRequest(`/api/posts/${postId}/like/`, { method: 'POST' });
  buttonElement.disabled = false;

  if (response.error) {
    showToast(response.error, 'error');
    return;
  }

  const { liked, likes_count } = response.data;
  const countSpan = document.getElementById('post-likes-count');

  if (liked) {
    buttonElement.classList.add('liked');
    showToast('Post liked!');
  } else {
    buttonElement.classList.remove('liked');
  }

  if (countSpan) countSpan.textContent = likes_count;
}

// Toggle Follow in Details Page
async function toggleFollowInDetails(username, buttonElement) {
  buttonElement.disabled = true;
  const response = await apiRequest(`/api/social/follow/${username}/`, { method: 'POST' });
  buttonElement.disabled = false;

  if (response.error) {
    showToast(response.error, 'error');
    return;
  }

  const { is_following } = response.data;
  
  if (is_following) {
    buttonElement.textContent = 'Following';
    buttonElement.className = 'btn btn-secondary btn-sm';
  } else {
    buttonElement.textContent = 'Follow';
    buttonElement.className = 'btn btn-primary btn-sm';
  }

  showToast(response.data.message);
}

// Delete Post in Details Page
async function deletePostInDetails(postId, buttonElement) {
  if (!confirm('Are you sure you want to permanently delete this post?')) return;

  buttonElement.disabled = true;
  buttonElement.textContent = 'Deleting...';

  const response = await apiRequest(`/api/posts/${postId}/delete/`, { method: 'POST' });
  
  if (response.error) {
    showToast(response.error, 'error');
    buttonElement.disabled = false;
    buttonElement.textContent = 'Delete';
  } else {
    showToast('Post deleted successfully!');
    setTimeout(() => {
      window.location.href = '/feed/';
    }, 800);
  }
}
