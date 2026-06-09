// Project Composer Form Logic for CollabX

document.addEventListener('DOMContentLoaded', () => {
  setupProjectComposerForm();
});

function setupProjectComposerForm() {
  const form = document.getElementById('project-composer-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('project-title').value.trim();
    const description = document.getElementById('project-description').value.trim();
    const teamSize = parseInt(document.getElementById('project-team-size').value);
    const status = document.getElementById('project-status').value;
    
    // Parse skills
    const skillsInput = document.getElementById('project-skills').value;
    const skillsList = skillsInput.split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (!title || !description) {
      showToast('Title and description are required.', 'error');
      return;
    }

    if (isNaN(teamSize) || teamSize < 2) {
      showToast('Desired team size must be at least 2.', 'error');
      return;
    }

    const submitBtn = document.getElementById('btn-project-submit');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving Project...';

    // Route create vs edit
    const isEditing = typeof EDITING_PROJECT_ID !== 'undefined' && EDITING_PROJECT_ID !== null;
    const apiUrl = isEditing ? `/api/projects/${EDITING_PROJECT_ID}/edit/` : '/api/projects/create/';

    const response = await apiRequest(apiUrl, {
      method: 'POST',
      body: JSON.stringify({
        title,
        description,
        team_size: teamSize,
        status,
        skills: skillsList
      })
    });

    submitBtn.disabled = false;
    submitBtn.textContent = originalText;

    if (response.error) {
      showToast(response.error, 'error');
    } else {
      const isNew = !isEditing;
      showToast(isNew ? 'Project created successfully!' : 'Project details saved!');
      
      const targetId = isEditing ? EDITING_PROJECT_ID : response.data.project_id;
      setTimeout(() => {
        window.location.href = `/project/${targetId}/`;
      }, 800);
    }
  });
}
