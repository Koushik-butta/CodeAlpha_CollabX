from django.db import models
from django.contrib.auth.models import User
import json

class Profile(models.Model):
    ROLE_CHOICES = (
        ('frontend', 'Frontend Developer'),
        ('backend', 'Backend Developer'),
        ('fullstack', 'Full Stack Developer'),
        ('uiux', 'UI/UX Designer'),
        ('aiml', 'AI/ML Engineer'),
        ('data', 'Data Analyst'),
        ('mobile', 'Mobile Developer'),
    )
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    full_name = models.CharField(max_length=150)
    bio = models.TextField(blank=True, default='')
    skills = models.TextField(blank=True, default='[]') # JSON list representation
    college = models.CharField(max_length=250, blank=True, default='')
    github_link = models.URLField(max_length=300, blank=True, default='')
    linkedin_link = models.URLField(max_length=300, blank=True, default='')
    portfolio_link = models.URLField(max_length=300, blank=True, default='')
    profile_picture = models.URLField(
        max_length=500, 
        default='https://res.cloudinary.com/dptujrmi1/image/upload/v1717838400/default-avatar.png'
    )
    github_username = models.CharField(max_length=100, blank=True, default='')
    github_repos_count = models.IntegerField(default=0)
    github_followers = models.IntegerField(default=0)
    github_following = models.IntegerField(default=0)
    github_connected = models.BooleanField(default=False)
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default='fullstack')

    def __str__(self):
        return f"{self.user.username}'s Profile"

    @property
    def skills_list(self):
        if not self.skills:
            return []
        try:
            return json.loads(self.skills)
        except Exception:
            return [s.strip() for s in self.skills.split(',') if s.strip()]

    @skills_list.setter
    def skills_list(self, value):
        if isinstance(value, list):
            self.skills = json.dumps(value)
        else:
            self.skills = json.dumps([])

class Post(models.Model):
    POST_TYPES = (
        ('recruitment', 'Project Recruitment'),
        ('hackathon', 'Hackathon Team'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    title = models.CharField(max_length=200)
    description = models.TextField()
    skills = models.TextField(blank=True, default='[]') # JSON list of required skills
    post_type = models.CharField(max_length=20, choices=POST_TYPES)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

    @property
    def skills_list(self):
        if not self.skills:
            return []
        try:
            return json.loads(self.skills)
        except Exception:
            return [s.strip() for s in self.skills.split(',') if s.strip()]

    @skills_list.setter
    def skills_list(self, value):
        if isinstance(value, list):
            self.skills = json.dumps(value)
        else:
            self.skills = json.dumps([])

class Project(models.Model):
    STATUS_CHOICES = (
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    )
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_projects')
    title = models.CharField(max_length=200)
    description = models.TextField()
    skills = models.TextField(blank=True, default='[]') # JSON list of required skills
    team_size = models.IntegerField(default=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    members = models.ManyToManyField(User, related_name='joined_projects', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

    @property
    def skills_list(self):
        if not self.skills:
            return []
        try:
            return json.loads(self.skills)
        except Exception:
            return [s.strip() for s in self.skills.split(',') if s.strip()]

    @skills_list.setter
    def skills_list(self, value):
        if isinstance(value, list):
            self.skills = json.dumps(value)
        else:
            self.skills = json.dumps([])

class JoinRequest(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='join_requests')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='join_requests')
    message = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'project')

    def __str__(self):
        return f"{self.user.username} request for {self.project.title} ({self.status})"

class Notification(models.Model):
    TYPE_CHOICES = (
        ('join_request', 'New Join Request'),
        ('accepted', 'Request Accepted'),
        ('rejected', 'Request Rejected'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications') # Recipient
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_notifications')
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notification for {self.user.username} ({self.notification_type})"

class Comment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment by {self.user.username} on {self.post.title}"

class Like(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='likes')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'post')

    def __str__(self):
        return f"{self.user.username} liked {self.post.title}"

class Follow(models.Model):
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name='following_relations')
    following = models.ForeignKey(User, on_delete=models.CASCADE, related_name='follower_relations')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('follower', 'following')

    def __str__(self):
        return f"{self.follower.username} follows {self.following.username}"


class Task(models.Model):
    PRIORITY_CHOICES = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    )
    STATUS_CHOICES = (
        ('todo', 'Todo'),
        ('in_progress', 'In Progress'),
        ('review', 'Review'),
        ('completed', 'Completed'),
    )
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='todo')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    assignee = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tasks')
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.status})"


class ProjectMessage(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='messages')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='project_messages')
    content = models.TextField()
    reply_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Message by {self.user.username} in {self.project.title}"


class ProjectFile(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='files')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='project_files')
    file_name = models.CharField(max_length=255)
    file_url = models.URLField(max_length=500)
    file_size = models.BigIntegerField(default=0)  # size in bytes
    file_type = models.CharField(max_length=100, blank=True, default='') # mime type or category
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.file_name} in {self.project.title}"


class ProjectActivity(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='activities')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='project_activities')
    description = models.TextField()
    activity_type = models.CharField(max_length=50, default='system')  # e.g., 'task', 'chat', 'file', 'system'
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Activity in {self.project.title}: {self.description[:30]}"
