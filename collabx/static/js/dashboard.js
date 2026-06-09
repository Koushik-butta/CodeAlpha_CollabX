document.addEventListener('DOMContentLoaded', () => {
    // Check if search query exists in URL
    const urlParams = new URLSearchParams(window.location.search);
    const searchQ = urlParams.get('search');
    
    if (searchQ && searchQ.trim()) {
        const input = document.getElementById('dashboard-search-input');
        if (input) input.value = searchQ.trim();
        initiateGlobalSearch(searchQ.trim());
    } else {
        fetchDashboardData();
    }
});

let cachedProjects = [];

// Fetch and Render Standard Dashboard Data
function fetchDashboardData() {
    fetch('/api/dashboard/data/')
        .then(res => res.json())
        .then(data => {
            if (data.message) {
                showToast(data.message, 'error');
                return;
            }
            cachedProjects = data.active_projects || [];
            renderProjects(cachedProjects);
            renderAssignedTasks(data.assigned_tasks || []);
            renderJoinRequests(data.pending_requests_received || []);
            renderNotifications(data.notifications || []);
            populateProjectSelect(cachedProjects);
            
            // Phase 3 Command Center Right Panel
            renderRightPanel(data.assigned_tasks || []);
        })
        .catch(err => {
            console.error('Error fetching dashboard data:', err);
            showToast('Failed to load dashboard data', 'error');
        });
}

function renderRightPanel(tasks) {
    // 1. Render Deadlines
    const deadlinesContainer = document.getElementById('deadlines-container');
    const deadlinesEmpty = document.getElementById('deadlines-empty');
    if (deadlinesContainer) {
        deadlinesContainer.innerHTML = '';
        const taskDeadlines = tasks.filter(t => t.due_date).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
        if (taskDeadlines.length === 0) {
            deadlinesEmpty.style.display = 'block';
        } else {
            deadlinesEmpty.style.display = 'none';
            taskDeadlines.forEach(td => {
                const item = document.createElement('div');
                item.className = 'deadline-item';
                item.innerHTML = `
                    <span class="deadline-title">${escapeHTML(td.title)}</span>
                    <span class="deadline-date">${escapeHTML(td.due_date)}</span>
                `;
                deadlinesContainer.appendChild(item);
            });
        }
    }

    // 2. Fetch Teammate Recommendations
    const recContainer = document.getElementById('recommendations-container');
    const recEmpty = document.getElementById('recommendations-empty');
    if (recContainer) {
        fetch('/api/social/suggestions/')
            .then(res => res.json())
            .then(data => {
                recContainer.innerHTML = '';
                const suggestions = data.suggestions || [];
                if (suggestions.length === 0) {
                    recEmpty.style.display = 'block';
                } else {
                    recEmpty.style.display = 'none';
                    suggestions.forEach(s => {
                        const item = document.createElement('div');
                        item.className = 'rec-teammate';
                        item.innerHTML = `
                            <img src="${s.profile_picture}" alt="${s.username}" class="rec-avatar">
                            <div class="rec-info">
                                <div class="rec-name"><a href="/profile/${s.username}/" style="font-weight:600; hover:underline;">${escapeHTML(s.full_name || s.username)}</a></div>
                                <div class="rec-college">${escapeHTML(s.college || 'Developer')}</div>
                            </div>
                        `;
                        recContainer.appendChild(item);
                    });
                }
            })
            .catch(err => {
                console.error(err);
                recEmpty.style.display = 'block';
            });
    }

    // 3. Fetch Trending Tech (Skills)
    const techContainer = document.getElementById('trending-tech-container');
    if (techContainer) {
        fetch('/api/social/trending-skills/')
            .then(res => res.json())
            .then(data => {
                techContainer.innerHTML = '';
                const skills = data.skills || [];
                skills.forEach(skill => {
                    const tag = document.createElement('span');
                    tag.className = 'tech-tag';
                    tag.textContent = skill;
                    tag.style.cursor = 'pointer';
                    tag.onclick = () => {
                        window.location.href = `/discover/?skill=${encodeURIComponent(skill)}`;
                    };
                    techContainer.appendChild(tag);
                });
            })
            .catch(err => console.error(err));
    }
}

function triggerDashboardSearch(query) {
    if (!query || !query.trim()) return;
    initiateGlobalSearch(query.trim());
}

function clearDashboardSearch() {
    const input = document.getElementById('dashboard-search-input');
    if (input) input.value = '';
    document.getElementById('search-results-wrapper').style.display = 'none';
    document.getElementById('standard-dashboard-view').style.display = 'block';
}

function renderProjects(projects) {
    const container = document.getElementById('active-projects-container');
    const emptyState = document.getElementById('projects-empty-state');
    const countBadge = document.getElementById('projects-count-badge');
    
    if (!container) return;
    container.innerHTML = '';
    
    if (countBadge) {
        countBadge.textContent = `${projects.length} active`;
    }
    
    if (projects.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    projects.forEach(p => {
        const creatorBadge = p.is_creator ? '<span class="badge badge-skill" style="padding:2px 8px; font-size:10px;">Owner</span>' : '';
        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
            <div class="project-card-header">
                <a href="/project/${p.id}/workspace/" class="project-card-title">${escapeHTML(p.title)}</a>
                ${creatorBadge}
            </div>
            <p class="project-card-desc">${escapeHTML(p.description)}</p>
            <div>
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${p.progress_percentage}%"></div>
                </div>
                <div class="project-card-footer">
                    <span>${p.progress_percentage}% Completed</span>
                    <span>${p.members_count} members</span>
                </div>
            </div>
            <a href="/project/${p.id}/workspace/" class="btn btn-secondary btn-sm" style="margin-top: 16px; width: 100%; text-align: center;">Open Workspace</a>
        `;
        container.appendChild(card);
    });
}

function renderAssignedTasks(tasks) {
    const container = document.getElementById('my-tasks-container');
    const emptyState = document.getElementById('tasks-empty-state');
    const countBadge = document.getElementById('tasks-count-badge');
    
    if (!container) return;
    container.innerHTML = '';
    
    if (countBadge) {
        countBadge.textContent = `${tasks.length} pending`;
    }
    
    if (tasks.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    tasks.forEach(t => {
        const prioClass = `badge-${t.priority}`;
        const item = document.createElement('div');
        item.className = 'task-item';
        item.innerHTML = `
            <div class="task-info">
                <span class="task-title">${escapeHTML(t.title)}</span>
                <span class="task-proj">Project: <a href="/project/${t.project_id}/workspace/" style="text-decoration:underline; font-weight:500;">${escapeHTML(t.project_title)}</a></span>
            </div>
            <div class="task-meta">
                <span class="badge badge-prio ${prioClass}">${t.priority.toUpperCase()}</span>
                ${t.due_date ? `<span style="font-size: 12px; color: var(--text-light);">${t.due_date}</span>` : ''}
            </div>
        `;
        container.appendChild(item);
    });
}

function renderJoinRequests(requests) {
    const container = document.getElementById('requests-container');
    const section = document.getElementById('join-requests-section');
    
    if (!container || !section) return;
    container.innerHTML = '';
    
    if (requests.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    requests.forEach(r => {
        const item = document.createElement('div');
        item.className = 'request-item';
        item.innerHTML = `
            <div class="request-header">
                <img src="${r.user.profile_picture}" alt="${r.user.username}" class="request-avatar">
                <div class="request-user-info">
                    <div class="request-user-name">${escapeHTML(r.user.full_name)} (@${escapeHTML(r.user.username)})</div>
                    <div class="request-user-role">${r.user.role}</div>
                </div>
            </div>
            ${r.message ? `<div class="request-message">"${escapeHTML(r.message)}"</div>` : ''}
            <div style="font-size:12px; margin-bottom:12px; color:var(--text-light);">Wants to join: <strong>${escapeHTML(r.project_title)}</strong></div>
            <div class="request-actions">
                <button class="btn btn-primary btn-sm" onclick="handleJoinRequestAction(${r.id}, 'accept', this)">Accept</button>
                <button class="btn btn-secondary btn-sm" style="border-color:var(--status-error); color:var(--status-error);" onclick="handleJoinRequestAction(${r.id}, 'reject', this)">Reject</button>
            </div>
        `;
        container.appendChild(item);
    });
}

function handleJoinRequestAction(reqId, action, button) {
    button.disabled = true;
    fetch(`/api/projects/requests/${reqId}/handle/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ action })
    })
    .then(res => res.json())
    .then(data => {
        if (data.message) {
            showToast(data.message, action === 'accept' ? 'success' : 'warning');
            fetchDashboardData();
        }
    })
    .catch(err => {
        console.error('Error handling join request:', err);
        button.disabled = false;
    });
}

function renderNotifications(notifications) {
    const container = document.getElementById('notifications-container');
    const emptyState = document.getElementById('notifications-empty-state');
    
    if (!container) return;
    container.innerHTML = '';
    
    if (notifications.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    notifications.forEach(n => {
        let typeText = '';
        if (n.notification_type === 'join_request') typeText = 'requested to join';
        if (n.notification_type === 'accepted') typeText = 'accepted your request for';
        if (n.notification_type === 'rejected') typeText = 'declined your request for';
        
        const item = document.createElement('div');
        item.className = 'task-item';
        item.style.padding = '12px 16px';
        item.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px; font-size:13.5px; width:100%;">
                <img src="${n.sender.profile_picture}" alt="${n.sender.username}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                <div style="flex:1;">
                    <strong>${escapeHTML(n.sender.full_name || n.sender.username)}</strong> ${typeText} 
                    <strong>${escapeHTML(n.project ? n.project.title : '')}</strong>
                </div>
                <button class="btn btn-secondary btn-sm" style="padding:4px 8px; font-size:11px;" onclick="markNotifRead(${n.id}, this)">Dismiss</button>
            </div>
        `;
        container.appendChild(item);
    });
}

function markNotifRead(id, button) {
    button.disabled = true;
    fetch(`/api/notifications/read/${id}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken')
        }
    })
    .then(res => res.json())
    .then(data => {
        fetchDashboardData();
    })
    .catch(err => console.error(err));
}

function populateProjectSelect(projects) {
    const select = document.getElementById('task-project-select');
    if (!select) return;
    
    select.innerHTML = '<option value="" disabled selected>Select a workspace...</option>';
    projects.forEach(p => {
        select.innerHTML += `<option value="${p.id}">${escapeHTML(p.title)}</option>`;
    });
}

// Modal Toggle Helpers
function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// Handle Form Submissions
function handleCreateProject(event) {
    event.preventDefault();
    const title = document.getElementById('project-title').value.trim();
    const description = document.getElementById('project-desc').value.trim();
    const skills = document.getElementById('project-skills').value.split(',').map(s => s.trim()).filter(s => s);
    const team_size = document.getElementById('project-size').value;
    const status = document.getElementById('project-status').value;
    
    fetch('/api/projects/create/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ title, description, skills, team_size, status })
    })
    .then(res => res.json())
    .then(data => {
        if (data.project_id) {
            showToast('Project created successfully!', 'success');
            closeModal('create-project-modal');
            document.getElementById('create-project-form').reset();
            fetchDashboardData();
            // Redirect to workspace
            setTimeout(() => {
                window.location.href = `/project/${data.project_id}/workspace/`;
            }, 1000);
        } else {
            showToast(data.message || 'Error creating project', 'error');
        }
    })
    .catch(err => {
        console.error(err);
        showToast('System error creating project', 'error');
    });
}

function handleCreateTask(event) {
    event.preventDefault();
    const projectId = document.getElementById('task-project-select').value;
    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-desc').value.trim();
    const priority = document.getElementById('task-priority').value;
    const due_date = document.getElementById('task-due').value;
    
    if (!projectId) {
        showToast('Please select a project workspace', 'warning');
        return;
    }
    
    fetch(`/api/projects/${projectId}/workspace/tasks/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ title, description, priority, due_date })
    })
    .then(res => res.json())
    .then(data => {
        if (data.task_id) {
            showToast('Task added to project workspace!', 'success');
            closeModal('create-task-modal');
            document.getElementById('create-task-form').reset();
            fetchDashboardData();
        } else {
            showToast(data.message || 'Error creating task', 'error');
        }
    })
    .catch(err => {
        console.error(err);
        showToast('System error creating task', 'error');
    });
}

// Global Unified Search Implementation
function initiateGlobalSearch(query) {
    document.getElementById('standard-dashboard-view').style.display = 'none';
    document.getElementById('search-results-wrapper').style.display = 'block';
    document.getElementById('search-query-title').innerHTML = `Search Results for "${escapeHTML(query)}"`;
    
    fetch(`/api/search/?scope=global&q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => {
            renderSearchProjects(data.projects || []);
            renderSearchUsers(data.users || []);
            renderSearchTasks(data.tasks || []);
        })
        .catch(err => {
            console.error('Error performing search:', err);
            showToast('Failed to perform search query', 'error');
        });
}

function renderSearchProjects(projects) {
    document.getElementById('count-projects').textContent = projects.length;
    const grid = document.getElementById('search-projects-grid');
    const empty = document.getElementById('search-projects-empty');
    
    grid.innerHTML = '';
    if (projects.length === 0) {
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';
    
    projects.forEach(p => {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
            <div class="project-card-header">
                <span class="project-card-title">${escapeHTML(p.title)}</span>
                <span class="badge badge-skill" style="font-size:10px;">${escapeHTML(p.status.toUpperCase())}</span>
            </div>
            <p class="project-card-desc">${escapeHTML(p.description)}</p>
            <div style="font-size: 12px; margin-bottom: 12px; color: var(--text-light);">
                Skills: ${p.skills.map(s => `<span class="badge badge-skill" style="margin-right:4px; font-size:10px;">${escapeHTML(s)}</span>`).join('')}
            </div>
            <div>
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${p.progress_percentage}%"></div>
                </div>
                <div class="project-card-footer">
                    <span>${p.progress_percentage}% Completed</span>
                    <span>By @${escapeHTML(p.creator.username)}</span>
                </div>
            </div>
            <a href="/project/${p.id}/" class="btn btn-secondary btn-sm" style="margin-top: 16px; width: 100%; text-align: center;">View Project Info</a>
        `;
        grid.appendChild(card);
    });
}

function renderSearchUsers(users) {
    document.getElementById('count-users').textContent = users.length;
    const grid = document.getElementById('search-users-grid');
    const empty = document.getElementById('search-users-empty');
    
    grid.innerHTML = '';
    if (users.length === 0) {
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';
    
    users.forEach(u => {
        const card = document.createElement('div');
        card.className = 'project-card'; // re-use styles
        card.innerHTML = `
            <div class="project-card-header">
                <div style="display:flex; align-items:center; gap:12px;">
                    <img src="${u.profile_picture}" alt="${u.username}" class="request-avatar">
                    <div>
                        <a href="/profile/${u.username}/" class="project-card-title">${escapeHTML(u.full_name)}</a>
                        <div style="font-size: 12px; color:var(--text-muted);">@${escapeHTML(u.username)}</div>
                    </div>
                </div>
                <span class="badge badge-hackathon" style="font-size:9.5px;">${escapeHTML(u.role)}</span>
            </div>
            <p class="project-card-desc" style="margin-bottom:12px;">${escapeHTML(u.bio || 'No bio provided.')}</p>
            <div style="font-size:11px; color:var(--text-light); margin-bottom:16px;">
                Org/College: ${escapeHTML(u.college || 'Not specified')}
            </div>
            <div style="font-size: 12px; margin-top:auto;">
                ${u.skills.map(s => `<span class="badge badge-skill" style="margin-right:4px; margin-bottom:4px; font-size:10px;">${escapeHTML(s)}</span>`).join('')}
            </div>
            <a href="/profile/${u.username}/" class="btn btn-secondary btn-sm" style="margin-top:16px; width: 100%; text-align: center;">View Developer Profile</a>
        `;
        grid.appendChild(card);
    });
}

function renderSearchTasks(tasks) {
    document.getElementById('count-tasks').textContent = tasks.length;
    const list = document.getElementById('search-tasks-list');
    const empty = document.getElementById('search-tasks-empty');
    
    list.innerHTML = '';
    if (tasks.length === 0) {
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';
    
    tasks.forEach(t => {
        const prioClass = `badge-${t.priority}`;
        const item = document.createElement('div');
        item.className = 'task-item';
        item.innerHTML = `
            <div class="task-info">
                <span class="task-title">${escapeHTML(t.title)}</span>
                <span class="task-proj">Project Workspace: <a href="/project/${t.project_id}/workspace/" style="text-decoration:underline; font-weight:500;">${escapeHTML(t.project_title)}</a> &bull; Status: <span style="text-transform:capitalize;">${t.status.replace('_', ' ')}</span></span>
                ${t.description ? `<p style="font-size:13px; color:var(--text-muted); margin-top:4px;">${escapeHTML(t.description)}</p>` : ''}
            </div>
            <div class="task-meta">
                <span class="badge badge-prio ${prioClass}">${t.priority.toUpperCase()}</span>
                ${t.assignee ? `<span style="font-size: 12px; color: var(--text-light);">Assigned to @${escapeHTML(t.assignee.username)}</span>` : ''}
            </div>
        `;
        list.appendChild(item);
    });
}

function switchSearchTab(tabName) {
    // Buttons
    document.querySelectorAll('.search-tab').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-btn-${tabName}`).classList.add('active');
    
    // Content sections
    document.querySelectorAll('.search-results-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`search-${tabName}`).classList.add('active');
}

function clearSearch() {
    window.location.href = '/dashboard/';
}

// Utility Helpers
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
