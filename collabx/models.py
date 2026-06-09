from django.db import models
from django.contrib.auth.models import User
import json

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    full_name = models.CharField(max_length=150)
    bio = models.TextField(blank=True, default='')
    skills = models.TextField(blank=True, default='[]') # JSON list representation
    college = models.CharField(max_length=250, blank=True, default='')
    github_link = models.URLField(max_length=300, blank=True, default='')
    linkedin_link = models.URLField(max_length=300, blank=True, default='')
    profile_picture = models.URLField(
        max_length=500, 
        default='https://res.cloudinary.com/dptujrmi1/image/upload/v1717838400/default-avatar.png'
    )
    github_username = models.CharField(max_length=100, blank=True, default='')
    github_repos_count = models.IntegerField(default=0)
    github_followers = models.IntegerField(default=0)
    github_following = models.IntegerField(default=0)
    github_connected = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username}'s Profile"

    @property
    def skills_list(self):
        if not self.skills:
            return []
        try:
            return json.loads(self.skills)
        except Exception:
            # Fallback if stored as comma-separated values
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
