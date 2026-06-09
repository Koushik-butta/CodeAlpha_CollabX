// Post Composer Logic for CollabX

document.addEventListener('DOMContentLoaded', () => {
  setupPostTypeSelector();
  setupComposerForm();
});

// Manage selected visual classes on post type radio options
function setupPostTypeSelector() {
  const radioRecruitment = document.getElementById('radio-recruitment');
  const radioHackathon = document.getElementById('radio-hackathon');
  const labelRecruitment = document.getElementById('label-type-recruitment');
  const labelHackathon = document.getElementById('label-type-hackathon');

  if (!radioRecruitment || !radioHackathon) return;

  radioRecruitment.addEventListener('change', () => {
    labelRecruitment.classList.add('selected');
    labelHackathon.classList.remove('selected');
  });

  radioHackathon.addEventListener('change', () => {
    labelHackathon.classList.add('selected');
    labelRecruitment.classList.remove('selected');
  });
}

// Handle submit composer
function setupComposerForm() {
  const form = document.getElementById('post-composer-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('post-title').value.trim();
    const description = document.getElementById('post-description').value.trim();
    
    // Get active radio type
    const typeElement = form.querySelector('input[name="post_type"]:checked');
    const postType = typeElement ? typeElement.value : 'recruitment';

    // Parse comma-separated skills list
    const skillsInput = document.getElementById('post-skills').value;
    const skillsList = skillsInput.split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (!title || !description || !postType) {
      showToast('Title, description, and post type are required.', 'error');
      return;
    }

    const submitBtn = document.getElementById('btn-composer-submit');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving Need...';

    // Determine create vs edit endpoints
    const isEditing = typeof EDITING_POST_ID !== 'undefined' && EDITING_POST_ID !== null;
    const apiUrl = isEditing ? `/api/posts/${EDITING_POST_ID}/edit/` : '/api/posts/create/';

    const response = await apiRequest(apiUrl, {
      method: 'POST',
      body: JSON.stringify({
        title,
        description,
        post_type: postType,
        skills: skillsList
      })
    });

    submitBtn.disabled = false;
    submitBtn.textContent = originalText;

    if (response.error) {
      showToast(response.error, 'error');
    } else {
      const isNew = !isEditing;
      showToast(isNew ? 'Post published successfully!' : 'Post updated successfully!');
      
      const targetId = isEditing ? EDITING_POST_ID : response.data.post_id;
      setTimeout(() => {
        window.location.href = `/post/${targetId}/`;
      }, 800);
    }
  });
}
