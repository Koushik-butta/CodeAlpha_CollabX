// Workspace State variables
let activePane = 'overview';
let charts = {};
let replyToId = null;
let chatInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    // Initial pane load
    loadOverview();
    
    // Auto-refresh chat if we switch to discussions
    document.getElementById('workspace-file-input').addEventListener('click', (e) => {
        e.stopPropagation(); // prevent label bubble click trigger bugs
    });
});

// Tab/Pane Swapping Mechanism
function switchPane(paneName) {
    activePane = paneName;
    
    // Toggle navigation classes
    document.querySelectorAll('.workspace-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.getElementById(`nav-${paneName}`).classList.add('active');
    
    // Toggle content panes
    document.querySelectorAll('.workspace-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(`pane-${paneName}`).classList.add('active');
    
    // Stop chat polling if switching away
    if (chatInterval) {
        clearInterval(chatInterval);
        chatInterval = null;
    }
    
    // Load pane-specific details
    if (paneName === 'overview') {
        loadOverview();
    } else if (paneName === 'tasks') {
        loadKanbanBoard();
    } else if (paneName === 'discussions') {
        loadDiscussions();
        chatInterval = setInterval(loadDiscussions, 4000); // Poll chat messages
    } else if (paneName === 'files') {
        loadFiles();
    } else if (paneName === 'members') {
        loadTeamMembers();
    } else if (paneName === 'activity') {
        loadActivityTimeline();
    }
}

// -------------------------------------------------------------
// PANE: OVERVIEW & ANALYTICS
// -------------------------------------------------------------
function loadOverview() {
    fetch(`/api/projects/${PROJECT_ID}/workspace/analytics/`)
        .then(res => res.json())
        .then(data => {
            // Populate metrics counters
            document.getElementById('count-total').textContent = data.total_tasks;
            document.getElementById('count-todo').textContent = data.status_counts.todo;
            document.getElementById('count-inprogress').textContent = data.status_counts.in_progress;
            document.getElementById('count-review').textContent = data.status_counts.review;
            document.getElementById('count-completed').textContent = data.status_counts.completed;
            
            // Progress bar
            document.getElementById('overview-progress-bar').style.width = `${data.progress_percentage}%`;
            document.getElementById('progress-percentage-label').textContent = `${data.progress_percentage}%`;
            document.getElementById('progress-numerical-label').textContent = `${data.status_counts.completed} of ${data.total_tasks} tasks completed`;
            
            // Draw Charts
            renderStatusChart(data.status_counts);
            renderPriorityChart(data.priority_counts);
        })
        .catch(err => console.error('Error fetching analytics:', err));
}

function renderStatusChart(statusCounts) {
    const ctx = document.getElementById('chart-status').getContext('2d');
    if (charts['status']) {
        charts['status'].destroy();
    }
    
    charts['status'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Todo', 'In Progress', 'Review', 'Completed'],
            datasets: [{
                data: [statusCounts.todo, statusCounts.in_progress, statusCounts.review, statusCounts.completed],
                backgroundColor: ['#64748b', '#f59e0b', '#7c3aed', '#10b981'],
                borderWidth: 1,
                borderColor: '#1e293b'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#f8fafc' }
                }
            }
        }
    });
}

function renderPriorityChart(priorityCounts) {
    const ctx = document.getElementById('chart-priority').getContext('2d');
    if (charts['priority']) {
        charts['priority'].destroy();
    }
    
    charts['priority'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Low', 'Medium', 'High', 'Urgent'],
            datasets: [{
                label: 'Tasks Count',
                data: [priorityCounts.low, priorityCounts.medium, priorityCounts.high, priorityCounts.urgent],
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#ef4444'],
                borderWidth: 0,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#f8fafc' }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#f8fafc', stepSize: 1 }
                }
            }
        }
    });
}

// -------------------------------------------------------------
// PANE: KANBAN BOARD & DRAG-AND-DROP
// -------------------------------------------------------------
function loadKanbanBoard() {
    fetch(`/api/projects/${PROJECT_ID}/workspace/tasks/`)
        .then(res => res.json())
        .then(data => {
            const tasks = data.tasks || [];
            
            // Filter columns
            const todoTasks = tasks.filter(t => t.status === 'todo');
            const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
            const reviewTasks = tasks.filter(t => t.status === 'review');
            const completedTasks = tasks.filter(t => t.status === 'completed');
            
            // Update column badges
            document.getElementById('count-col-todo').textContent = todoTasks.length;
            document.getElementById('count-col-inprogress').textContent = inProgressTasks.length;
            document.getElementById('count-col-review').textContent = reviewTasks.length;
            document.getElementById('count-col-completed').textContent = completedTasks.length;
            
            // Render columns
            renderKanbanColumn('cards-todo', todoTasks);
            renderKanbanColumn('cards-in_progress', inProgressTasks);
            renderKanbanColumn('cards-review', reviewTasks);
            renderKanbanColumn('cards-completed', completedTasks);
        })
        .catch(err => console.error(err));
}

function renderKanbanColumn(containerId, tasks) {
    const wrapper = document.getElementById(containerId);
    wrapper.innerHTML = '';
    
    tasks.forEach(t => {
        const prioClass = `badge-${t.priority}`;
        const card = document.createElement('div');
        card.className = 'kanban-card';
        card.draggable = true;
        card.id = `task-${t.id}`;
        card.setAttribute('ondragstart', 'handleDragStart(event)');
        card.setAttribute('onclick', `openEditTaskModal(${t.id})`);
        
        card.innerHTML = `
            <div class="kanban-card-header">
                <span class="kanban-card-title">${escapeHTML(t.title)}</span>
            </div>
            <p class="kanban-card-desc">${escapeHTML(t.description || 'No description.')}</p>
            <div class="kanban-card-footer">
                <span class="badge badge-prio ${prioClass}">${t.priority.toUpperCase()}</span>
                ${t.assignee ? `<img src="${t.assignee.profile_picture}" title="Assigned to ${escapeHTML(t.assignee.full_name)}" class="kanban-card-assignee">` : '<span style="font-size:11px; color:var(--text-light);">Unassigned</span>'}
            </div>
        `;
        wrapper.appendChild(card);
    });
}

// Drag & Drop Functions
function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.id);
    e.target.classList.add('dragging');
}

function allowDrop(e) {
    e.preventDefault();
}

function dragEnter(e, columnId) {
    e.preventDefault();
    document.getElementById(`col-${columnId}`).classList.add('drag-over');
}

function dragLeave(e, columnId) {
    document.getElementById(`col-${columnId}`).classList.remove('drag-over');
}

function handleDrop(e, status) {
    e.preventDefault();
    document.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('drag-over'));
    
    const elementId = e.dataTransfer.getData('text/plain');
    const card = document.getElementById(elementId);
    if (!card) return;
    
    card.classList.remove('dragging');
    const taskId = elementId.split('-')[1];
    
    // Save to server
    fetch(`/api/projects/${PROJECT_ID}/workspace/tasks/${taskId}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ status: status, action: 'update' })
    })
    .then(res => res.json())
    .then(data => {
        loadKanbanBoard();
        showToast('Task status updated', 'success');
    })
    .catch(err => {
        console.error(err);
        showToast('Error updating status', 'error');
    });
}

// -------------------------------------------------------------
// PANE: TASK MODALS
// -------------------------------------------------------------
function openCreateTaskModal() {
    document.getElementById('task-modal-title').textContent = 'Create Sprint Task';
    document.getElementById('workspace-task-id').value = '';
    document.getElementById('create-workspace-task-form').reset();
    document.getElementById('btn-delete-task').style.display = 'none';
    document.getElementById('btn-submit-task').textContent = 'Create Task';
    
    document.getElementById('create-workspace-task-modal').classList.add('active');
}

function openEditTaskModal(taskId) {
    fetch(`/api/projects/${PROJECT_ID}/workspace/tasks/${taskId}/`)
        .then(res => res.json())
        .then(data => {
            const t = data.task;
            document.getElementById('task-modal-title').textContent = 'Modify Task Details';
            document.getElementById('workspace-task-id').value = t.id;
            document.getElementById('w-task-title').value = t.title;
            document.getElementById('w-task-desc').value = t.description;
            document.getElementById('w-task-priority').value = t.priority;
            document.getElementById('w-task-due').value = t.due_date || '';
            document.getElementById('w-task-assignee').value = t.assignee ? t.assignee.username : '';
            
            document.getElementById('btn-delete-task').style.display = 'block';
            document.getElementById('btn-submit-task').textContent = 'Save Changes';
            
            document.getElementById('create-workspace-task-modal').classList.add('active');
        })
        .catch(err => console.error(err));
}

function closeWorkspaceModal() {
    document.getElementById('create-workspace-task-modal').classList.remove('active');
}

function handleWorkspaceTaskSubmit(event) {
    event.preventDefault();
    const taskId = document.getElementById('workspace-task-id').value;
    const title = document.getElementById('w-task-title').value.trim();
    const description = document.getElementById('w-task-desc').value.trim();
    const priority = document.getElementById('w-task-priority').value;
    const due_date = document.getElementById('w-task-due').value;
    const assignee_username = document.getElementById('w-task-assignee').value;
    
    const url = taskId ? 
        `/api/projects/${PROJECT_ID}/workspace/tasks/${taskId}/` : 
        `/api/projects/${PROJECT_ID}/workspace/tasks/`;
        
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({
            title, description, priority, due_date, assignee_username, action: 'update'
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.message) {
            showToast(data.message, 'success');
            closeWorkspaceModal();
            loadKanbanBoard();
        }
    })
    .catch(err => {
        console.error(err);
        showToast('Error editing task', 'error');
    });
}

function handleDeleteTask() {
    const taskId = document.getElementById('workspace-task-id').value;
    if (!taskId) return;
    
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    fetch(`/api/projects/${PROJECT_ID}/workspace/tasks/${taskId}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ action: 'delete' })
    })
    .then(res => res.json())
    .then(data => {
        showToast('Task deleted successfully', 'warning');
        closeWorkspaceModal();
        loadKanbanBoard();
    })
    .catch(err => console.error(err));
}

// -------------------------------------------------------------
// PANE: DISCUSSIONS (Discord-style Chat)
// -------------------------------------------------------------
function loadDiscussions() {
    fetch(`/api/projects/${PROJECT_ID}/workspace/discussions/`)
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById('chat-messages-container');
            if (!container) return;
            
            // Keep scroll status
            const shouldScroll = container.scrollTop + container.clientHeight >= container.scrollHeight - 60;
            
            container.innerHTML = '';
            
            if (data.messages.length === 0) {
                container.innerHTML = `<div class="empty-state"><p>No messages in this workspace. Send the first message!</p></div>`;
                return;
            }
            
            data.messages.forEach(m => {
                const isOwn = m.user.username === CURRENT_USER_USERNAME;
                const replyBlock = m.reply_to ? `
                    <div class="chat-message-reply-preview">
                        Replying to @${escapeHTML(m.reply_to.username)}: "${escapeHTML(m.reply_to.content)}"
                    </div>
                ` : '';
                
                const actionBlock = `
                    <div class="chat-message-actions">
                        <button class="chat-action-btn" onclick="startReply(${m.id}, '${escapeHTML(m.user.username)}')">Reply</button>
                        ${isOwn ? `
                            <button class="chat-action-btn" onclick="editChatMessage(${m.id}, '${escapeHTML(m.content.replace(/'/g, "\\'"))}')">Edit</button>
                            <button class="chat-action-btn" style="color:var(--status-error);" onclick="deleteChatMessage(${m.id})">Delete</button>
                        ` : ''}
                    </div>
                `;
                
                const msg = document.createElement('div');
                msg.className = 'chat-message';
                msg.id = `chat-msg-${m.id}`;
                msg.innerHTML = `
                    <img src="${m.user.profile_picture}" alt="${m.user.username}" class="chat-avatar">
                    <div class="chat-message-content">
                        <div class="chat-message-header">
                            <span class="chat-sender-name">${escapeHTML(m.user.full_name || m.user.username)}</span>
                            <span class="chat-timestamp">${formatTime(m.created_at)}</span>
                        </div>
                        ${replyBlock}
                        <div class="chat-message-text" id="chat-text-${m.id}">${renderMessageText(m.content)}</div>
                    </div>
                    ${actionBlock}
                `;
                container.appendChild(msg);
            });
            
            if (shouldScroll) {
                container.scrollTop = container.scrollHeight;
            }
        })
        .catch(err => console.error(err));
}

function renderMessageText(text) {
    // Escape and then highlights mentions: @username
    let formatted = escapeHTML(text);
    formatted = formatted.replace(/@(\w+)/g, '<span style="color:var(--accent-cyan); font-weight:600;">@$1</span>');
    return formatted;
}

function sendChatMessage() {
    const input = document.getElementById('chat-message-input');
    const content = input.value.trim();
    if (!content) return;
    
    fetch(`/api/projects/${PROJECT_ID}/workspace/discussions/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({
            content,
            reply_to_id: replyToId
        })
    })
    .then(res => res.json())
    .then(data => {
        input.value = '';
        cancelReply();
        loadDiscussions();
    })
    .catch(err => console.error(err));
}

function startReply(msgId, username) {
    replyToId = msgId;
    const bar = document.getElementById('chat-reply-indicator');
    const label = document.getElementById('reply-username');
    label.textContent = `@${username}`;
    bar.style.display = 'flex';
}

function cancelReply() {
    replyToId = null;
    document.getElementById('chat-reply-indicator').style.display = 'none';
}

function editChatMessage(msgId, existingText) {
    const newText = prompt('Edit your message:', existingText);
    if (newText === null) return;
    const trimmed = newText.trim();
    if (!trimmed) return;
    
    fetch(`/api/projects/${PROJECT_ID}/workspace/discussions/${msgId}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({
            action: 'edit',
            content: trimmed
        })
    })
    .then(res => res.json())
    .then(data => {
        loadDiscussions();
        showToast('Message updated', 'success');
    })
    .catch(err => console.error(err));
}

function deleteChatMessage(msgId) {
    if (!confirm('Are you sure you want to delete this message?')) return;
    
    fetch(`/api/projects/${PROJECT_ID}/workspace/discussions/${msgId}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ action: 'delete' })
    })
    .then(res => res.json())
    .then(data => {
        loadDiscussions();
        showToast('Message deleted', 'warning');
    })
    .catch(err => console.error(err));
}

// -------------------------------------------------------------
// PANE: FILES SHARING
// -------------------------------------------------------------
function loadFiles() {
    fetch(`/api/projects/${PROJECT_ID}/workspace/files/`)
        .then(res => res.json())
        .then(data => {
            const tbody = document.getElementById('files-table-body');
            const empty = document.getElementById('files-empty-state');
            
            tbody.innerHTML = '';
            const files = data.files || [];
            
            if (files.length === 0) {
                empty.style.display = 'block';
                return;
            }
            empty.style.display = 'none';
            
            files.forEach(f => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid var(--border-light)';
                tr.innerHTML = `
                    <td style="padding:12px 8px; font-weight:600;"><a href="${f.file_url}" target="_blank" style="color:var(--primary-indigo); hover:underline;">${escapeHTML(f.file_name)}</a></td>
                    <td style="padding:12px 8px;">${formatBytes(f.file_size)}</td>
                    <td style="padding:12px 8px;">${escapeHTML(f.user.full_name)} (@${escapeHTML(f.user.username)})</td>
                    <td style="padding:12px 8px;">${formatTime(f.created_at)}</td>
                    <td style="padding:12px 8px; text-align:right;">
                        <a href="${f.file_url}" target="_blank" class="btn btn-secondary btn-sm" style="padding:4px 8px; font-size:11px;">Download</a>
                        <button class="btn btn-secondary btn-sm" style="padding:4px 8px; font-size:11px; border-color:var(--status-error); color:var(--status-error); margin-left:4px;" onclick="deleteWorkspaceFile(${f.id})">Delete</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(err => console.error(err));
}

function uploadWorkspaceFile(input) {
    const file = input.files[0];
    if (!file) return;
    
    const loader = document.getElementById('file-upload-loader');
    loader.style.display = 'flex';
    
    const formData = new FormData();
    formData.append('file', file);
    
    fetch(`/api/projects/${PROJECT_ID}/workspace/files/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        loader.style.display = 'none';
        input.value = '';
        if (data.file) {
            showToast('Document uploaded to Cloudinary!', 'success');
            loadFiles();
        } else {
            showToast(data.message || 'Error uploading file', 'error');
        }
    })
    .catch(err => {
        loader.style.display = 'none';
        input.value = '';
        console.error(err);
        showToast('Upload failed', 'error');
    });
}

function deleteWorkspaceFile(fileId) {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    fetch(`/api/projects/${PROJECT_ID}/workspace/files/${fileId}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ action: 'delete' })
    })
    .then(res => res.json())
    .then(data => {
        showToast('File deleted', 'warning');
        loadFiles();
    })
    .catch(err => console.error(err));
}

// -------------------------------------------------------------
// PANE: TEAM MEMBERS
// -------------------------------------------------------------
function loadTeamMembers() {
    fetch(`/api/projects/${PROJECT_ID}/`)
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById('team-members-container');
            if (!container) return;
            
            container.innerHTML = '';
            
            // Render Creator
            const owner = data.project.creator;
            const ownerCard = document.createElement('div');
            ownerCard.className = 'project-card';
            ownerCard.innerHTML = `
                <div class="project-card-header" style="display:flex; align-items:center; gap:12px;">
                    <img src="${owner.profile_picture}" alt="${owner.username}" class="request-avatar">
                    <div>
                        <span class="project-card-title">${escapeHTML(owner.full_name)}</span>
                        <div style="font-size:12px; color:var(--text-muted);">@${escapeHTML(owner.username)}</div>
                    </div>
                    <span class="badge badge-skill" style="margin-left:auto; font-size:10px;">Workspace Owner</span>
                </div>
                <p class="project-card-desc" style="margin-top:12px; margin-bottom:0;">Project Creator & Lead Architect.</p>
            `;
            container.appendChild(ownerCard);
            
            // Render Members
            const members = data.project.members || [];
            members.forEach(m => {
                const card = document.createElement('div');
                card.className = 'project-card';
                card.innerHTML = `
                    <div class="project-card-header" style="display:flex; align-items:center; gap:12px;">
                        <img src="${m.profile_picture}" alt="${m.username}" class="request-avatar">
                        <div>
                            <span class="project-card-title">${escapeHTML(m.full_name)}</span>
                            <div style="font-size:12px; color:var(--text-muted);">@${escapeHTML(m.username)}</div>
                        </div>
                        <span class="badge badge-hackathon" style="margin-left:auto; font-size:10px;">${escapeHTML(m.role || 'Contributor')}</span>
                    </div>
                    <p class="project-card-desc" style="margin-top:12px; margin-bottom:0;">Org: ${escapeHTML(m.college || 'Developer workspace contributor')}</p>
                `;
                container.appendChild(card);
            });
        })
        .catch(err => console.error(err));
}

// -------------------------------------------------------------
// PANE: ACTIVITY TIMELINE
// -------------------------------------------------------------
function loadActivityTimeline() {
    fetch(`/api/projects/${PROJECT_ID}/workspace/timeline/`)
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById('timeline-feed-container');
            if (!container) return;
            
            container.innerHTML = '';
            const activities = data.activities || [];
            
            if (activities.length === 0) {
                container.innerHTML = `<div class="empty-state"><p>No activity recorded in this workspace.</p></div>`;
                return;
            }
            
            activities.forEach(a => {
                const item = document.createElement('div');
                item.className = 'timeline-item';
                item.innerHTML = `
                    <div class="timeline-marker"></div>
                    <div class="timeline-content">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <img src="${a.user.profile_picture}" alt="${a.user.username}" style="width:28px; height:28px; border-radius:50%; object-fit:cover;">
                            <div style="font-size:13.5px; flex:1;">
                                <strong>${escapeHTML(a.user.full_name || a.user.username)}</strong> ${escapeHTML(a.description)}
                            </div>
                            <span style="font-size:11px; color:var(--text-light);">${formatTime(a.created_at)}</span>
                        </div>
                    </div>
                `;
                container.appendChild(item);
            });
        })
        .catch(err => console.error(err));
}

// -------------------------------------------------------------
// UTILITY HELPERS
// -------------------------------------------------------------
function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + 
           date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

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
