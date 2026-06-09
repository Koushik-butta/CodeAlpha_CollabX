from django.contrib import admin
from collabx.models import Profile, Post, Comment, Like, Follow, Project, JoinRequest, Notification

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'full_name', 'college', 'github_username', 'github_connected')
    search_fields = ('user__username', 'full_name', 'college', 'github_username')

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'post_type', 'created_at')
    list_filter = ('post_type', 'created_at')
    search_fields = ('title', 'description', 'user__username')

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('title', 'creator', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('title', 'description', 'creator__username')

@admin.register(JoinRequest)
class JoinRequestAdmin(admin.ModelAdmin):
    list_display = ('user', 'project', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('user__username', 'project__title')

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'sender', 'notification_type', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read', 'created_at')
    search_fields = ('user__username', 'sender__username')

admin.site.register(Comment)
admin.site.register(Like)
admin.site.register(Follow)
