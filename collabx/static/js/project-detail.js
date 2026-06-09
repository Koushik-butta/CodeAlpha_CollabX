// Project Details and Application Management Logic for CollabX

document.addEventListener('DOMContentLoaded', () => {
  if (typeof PROJECT_ID !== 'undefined' && PROJECT_ID) {
    loadProjectDetails();
  }
});

async function loadProjectDetails() {
  const response = await apiRequest(`/api/projects/${PROJECT_ID}/`);
  if (response.error) {
    showToast(response.error, 'error');
    return;
  }

  const p = response.data.project;

  // Render header details
  const titleLbl = document.getElementById('project-title-lbl');
  const descLbl = document.getElementById('project-desc-lbl');
  const statusTag = document.getElementById('status-tag-lbl');
  const creatorLink = document.getElementById('creator-profile-link');
  const dateLbl = document.getElementById('project-date-lbl');

  if (titleLbl) titleLbl.textContent = p.title;
  if (descLbl) descLbl.innerHTML = p.description.replace(/\n/g, '<br>');
  
  if (statusTag) {
    statusTag.textContent = p.status === 'open' ? 'Open' : (p.status === 'in_progress' ? 'In Progress' : 'Completed');
    statusTag.className = `status-tag status-${p.status === 'in_progress' ? 'progress' : p.status}`;
  }

  if (creatorLink) {
    creatorLink.textContent = p.creator.full_name;
    creatorLink.href = `/profile/${p.creator.username}/`;
    creatorLink.setAttribute('id', `profile-link-${p.creator.username}`);
  }

  if (dateLbl) {
    dateLbl.textContent = formatRelativeTime(p.created_at);
  }

  // Render required skills
  const skillsContainer = document.getElementById('project-skills-container');
  if (skillsContainer) {
    skillsContainer.innerHTML = '';
    p.skills.forEach(skill => {
      const badge = document.createElement('span');
      badge.className = 'badge badge-skill';
      badge.textContent = skill;
      skillsContainer.appendChild(badge);
    });
  }

  // Edit Project option for Creator
  const editBtn = document.getElementById('btn-edit-project');
  if (editBtn && p.is_creator) {
    editBtn.style.display = 'inline-block';
    editBtn.onclick = () => {
      window.location.href = `/project/edit/${p.id}/`;
    };
  }

  // Render members section
  renderMembers(p.members, p.team_size);

  // Render Side Actions panel
  renderActionsPanel(p);
}

// Render team members profiles list
function renderMembers(members, maxSize) {
  const container = document.getElementById('project-members-container');
  const countLbl = document.getElementById('members-count-lbl');
  const maxSizeLbl = document.getElementById('max-size-lbl');

  if (countLbl) countLbl.textContent = members.length;
  if (maxSizeLbl) maxSizeLbl.textContent = maxSize;

  if (!container) return;
  container.innerHTML = '';

  members.forEach(m => {
    const card = document.createElement('div');
    card.className = 'member-card-small';
    card.innerHTML = `
      <a href="/profile/${m.username}/">
        <img src="${m.profile_picture}" alt="${m.username}" class="member-avatar-small">
      </a>
      <a href="/profile/${m.username}/" class="member-name-small" style="color:var(--text-main);">${m.full_name}</a>
      <span class="member-role-small">${m.role}</span>
      <a href="/profile/${m.username}/" class="btn btn-secondary btn-sm" style="padding: 2px 8px; font-size: 10px; width: 100%;">View</a>
    `;
    container.appendChild(card);
  });
}

// Render Side Applications panel
function renderActionsPanel(project) {
  const panelTitle = document.getElementById('actions-panel-title');
  const panelContent = document.getElementById('actions-panel-content');

  if (!panelContent) return;

  // Case 1: Current user is the Project Creator
  if (project.is_creator) {
    panelTitle.textContent = 'Join Applications';
    
    const requests = project.join_requests.filter(r => r.status === 'pending');
    if (requests.length === 0) {
      panelContent.innerHTML = '<p style="font-size: 13px; color: var(--text-light); text-align: center; padding: 20px 0;">No pending requests</p>';
      return;
    }

    panelContent.innerHTML = '';
    requests.forEach(req => {
      const item = document.createElement('div');
      item.className = 'request-item';
      item.innerHTML = `
        <div class="request-header">
          <img src="${req.profile_picture}" alt="${req.username}" class="avatar btn-sm" style="width: 32px; height: 32px;">
          <div style="display:flex; flex-direction:column; min-width:0;">
            <a href="/profile/${req.username}/" class="member-name-small" style="font-size:12px;">${req.full_name}</a>
            <span class="member-role-small" style="font-size:10px; margin-bottom:0;">${req.role}</span>
          </div>
        </div>
        <p class="request-msg">"${req.message || 'No message provided.'}"</p>
        <div class="request-actions">
          <button class="btn btn-primary btn-sm btn-accept" style="flex:1; padding: 6px;" data-id="${req.id}">Accept</button>
          <button class="btn btn-secondary btn-sm btn-reject" style="flex:1; padding: 6px; border-color:rgba(239, 68, 68, 0.2); color:var(--status-error);" data-id="${req.id}">Reject</button>
        </div>
      `;

      // Bind Accept / Reject actions
      item.querySelector('.btn-accept').onclick = () => handleRequest(req.id, 'accept');
      item.querySelector('.btn-reject').onclick = () => handleRequest(req.id, 'reject');

      panelContent.appendChild(item);
    });
    return;
  }

  // Case 2: User is already a Member
  const isMember = project.members.some(m => m.username === TARGET_USERNAME); // Target username is exposed globally
  if (isMember) {
    panelTitle.textContent = 'Team Status';
    panelContent.innerHTML = `
      <div style="text-align:center; padding: 20px 0;">
        <span class="status-badge-static" style="background: rgba(16, 185, 129, 0.1); color: var(--status-success);">
          ✔ Active Team Member
        </span>
      </div>
    `;
    return;
  }

  // Case 3: User has an active Join Request Status (Pending/Rejected)
  if (project.user_request_status) {
    panelTitle.textContent = 'Application Status';
    
    let badgeStyle = '';
    let statusText = '';
    if (project.user_request_status === 'pending') {
      badgeStyle = 'background: rgba(245, 158, 11, 0.1); color: var(--status-warning);';
      statusText = '⏳ Application Pending';
    } else if (project.user_request_status === 'rejected') {
      badgeStyle = 'background: rgba(239, 68, 68, 0.1); color: var(--status-error);';
      statusText = '❌ Request Declined';
    }

    panelContent.innerHTML = `
      <div style="text-align:center; padding: 20px 0; display:flex; flex-direction:column; gap:12px;">
        <span class="status-badge-static" style="${badgeStyle}">
          ${statusText}
        </span>
        <p style="font-size:12.5px; color:var(--text-muted);">The project owner has been notified of your interest.</p>
      </div>
    `;
    return;
  }

  // Case 4: No application exists, project is Open - show Request Form
  if (project.status === 'open') {
    panelTitle.textContent = 'Join this Team';
    panelContent.innerHTML = `
      <form id="join-project-form" style="display:flex; flex-direction:column; gap:12px;">
        <div class="form-group" style="margin-bottom:0;">
          <label for="join-message" class="form-label" style="font-size:12px;">Introduction Message</label>
          <textarea id="join-message" class="form-input" rows="4" placeholder="Briefly introduce yourself, list your relevant skills, and explain why you want to collaborate..." required style="font-size:13px;"></textarea>
        </div>
        <button type="submit" class="btn btn-primary btn-sm" style="width:100%;">Submit Join Request</button>
      </form>
    `;

    // Bind Join form submit
    const joinForm = document.getElementById('join-project-form');
    joinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const message = document.getElementById('join-message').value.trim();

      const submitBtn = joinForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      const response = await apiRequest(`/api/projects/${project.id}/join/`, {
        method: 'POST',
        body: JSON.stringify({ message })
      });

      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Join Request';

      if (response.error) {
        showToast(response.error, 'error');
      } else {
        showToast('Application submitted successfully!');
        // Reload details to sync view state
        loadProjectDetails();
      }
    });
    return;
  }

  // Case 5: Project is In Progress / Completed and user is not a member
  panelTitle.textContent = 'Project Closed';
  panelContent.innerHTML = `
    <div style="text-align:center; padding: 20px 0;">
      <p style="font-size:13px; color:var(--text-muted);">This project is currently closed and is no longer accepting new applications.</p>
    </div>
  `;
}

// Handle accept/reject join requests
async function handleRequest(requestId, action) {
  const submitBtns = document.querySelectorAll(`.request-item button[data-id="${requestId}"]`);
  submitBtns.forEach(btn => btn.disabled = true);

  const response = await apiRequest(`/api/projects/requests/${requestId}/handle/`, {
    method: 'POST',
    body: JSON.stringify({ action })
  });

  if (response.error) {
    showToast(response.error, 'error');
    submitBtns.forEach(btn => btn.disabled = false);
  } else {
    showToast(response.data.message);
    // Reload components to show member updates
    loadProjectDetails();
  }
}
