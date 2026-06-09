from django.urls import path
from collabx.views import pages, auth, profile, posts, social, search, projects, notifications, discovery, workspace, dashboard

urlpatterns = [
    # Page Views
    path('', pages.landing_page, name='landing'),
    path('login/', pages.login_page, name='login'),
    path('register/', pages.register_page, name='register'),
    path('feed/', pages.home_feed, name='home_feed'),
    path('profile/', pages.profile_page, name='profile_self'),
    path('profile/<str:username>/', pages.profile_page, name='profile_detail'),
    path('post/create/', pages.create_post_page, name='create_post'),
    path('post/edit/<int:post_id>/', pages.create_post_page, name='edit_post'),
    path('post/<int:post_id>/', pages.post_detail_page, name='post_detail'),
    
    # Phase 2 Page Views
    path('discover/', pages.discover_page, name='discover_developers'),
    path('project/create/', pages.create_project_page, name='create_project'),
    path('project/edit/<int:project_id>/', pages.create_project_page, name='edit_project'),
    path('project/<int:project_id>/', pages.project_detail_page, name='project_detail'),
    path('notifications/', pages.notifications_page, name='notifications_page'),

    # Auth API Endpoints
    path('api/auth/register/', auth.register_api, name='api_register'),
    path('api/auth/login/', auth.login_api, name='api_login'),
    path('api/auth/logout/', auth.logout_api, name='api_logout'),
    path('api/auth/forgot-password/', auth.forgot_password_api, name='api_forgot_password'),
    
    # OAuth Routes
    path('auth/github/', auth.github_login, name='github_login'),
    path('auth/github/callback/', auth.github_callback, name='github_callback'),
    path('auth/google/', auth.google_login, name='google_login'),
    path('auth/google/callback/', auth.google_callback, name='google_callback'),

    # Profile API Endpoints
    path('api/profile/', profile.get_profile_api, name='api_profile_self'),
    path('api/profile/edit/', profile.edit_profile_api, name='api_profile_edit'),
    path('api/profile/connect-github/', profile.connect_github_api, name='api_profile_connect_github'),
    path('api/profile/upload-avatar/', profile.upload_avatar_api, name='api_profile_upload_avatar'),
    path('api/profile/<str:username>/', profile.get_profile_api, name='api_profile_detail'),

    # Posts API Endpoints
    path('api/posts/', posts.get_posts_api, name='api_posts_list'),
    path('api/posts/create/', posts.create_post_api, name='api_posts_create'),
    path('api/posts/<int:post_id>/', posts.get_single_post_api, name='api_post_detail'),
    path('api/posts/<int:post_id>/edit/', posts.edit_post_api, name='api_post_edit'),
    path('api/posts/<int:post_id>/delete/', posts.delete_post_api, name='api_post_delete'),
    
    # Social API Endpoints
    path('api/posts/<int:post_id>/like/', social.like_post_api, name='api_post_like'),
    path('api/posts/<int:post_id>/comment/', social.comment_api, name='api_post_comment'),
    path('api/social/follow/<str:username>/', social.follow_api, name='api_social_follow'),
    path('api/social/suggestions/', social.get_suggestions_api, name='api_social_suggestions'),
    path('api/social/trending-skills/', social.get_trending_skills_api, name='api_social_trending_skills'),
    
    # Search API Endpoint
    path('api/search/', search.search_api, name='api_search'),
    
    # Phase 2 Projects API Endpoints
    path('api/projects/', projects.get_projects_api, name='api_projects_list'),
    path('api/projects/create/', projects.create_project_api, name='api_projects_create'),
    path('api/projects/<int:project_id>/', projects.get_single_project_api, name='api_project_detail'),
    path('api/projects/<int:project_id>/edit/', projects.edit_project_api, name='api_project_edit'),
    path('api/projects/<int:project_id>/join/', projects.submit_join_request_api, name='api_project_join'),
    path('api/projects/requests/<int:request_id>/handle/', projects.handle_join_request_api, name='api_project_handle_request'),
    
    # Phase 2 Notifications API Endpoints
    path('api/notifications/', notifications.get_notifications_api, name='api_notifications_list'),
    path('api/notifications/read/', notifications.mark_as_read_api, name='api_notifications_read_all'),
    path('api/notifications/read/<int:notification_id>/', notifications.mark_as_read_api, name='api_notifications_read_single'),
    
    # Phase 2 Developers API Endpoints
    path('api/developers/', discovery.get_developers_api, name='api_developers_list'),

    # Phase 3 Pages
    path('project/<int:project_id>/workspace/', pages.project_workspace_page, name='project_workspace'),
    path('dashboard/', pages.dashboard_page, name='dashboard'),

    # Phase 3 Workspace API Endpoints
    path('api/projects/<int:project_id>/workspace/tasks/', workspace.workspace_tasks_api, name='api_workspace_tasks'),
    path('api/projects/<int:project_id>/workspace/tasks/<int:task_id>/', workspace.workspace_task_detail_api, name='api_workspace_task_detail'),
    path('api/projects/<int:project_id>/workspace/discussions/', workspace.workspace_discussions_api, name='api_workspace_discussions'),
    path('api/projects/<int:project_id>/workspace/discussions/<int:message_id>/', workspace.workspace_message_detail_api, name='api_workspace_message_detail'),
    path('api/projects/<int:project_id>/workspace/files/', workspace.workspace_files_api, name='api_workspace_files'),
    path('api/projects/<int:project_id>/workspace/files/<int:file_id>/', workspace.workspace_file_detail_api, name='api_workspace_file_detail'),
    path('api/projects/<int:project_id>/workspace/timeline/', workspace.workspace_timeline_api, name='api_workspace_timeline'),
    path('api/projects/<int:project_id>/workspace/analytics/', workspace.workspace_analytics_api, name='api_workspace_analytics'),

    # Phase 3 Dashboard API Endpoints
    path('api/dashboard/data/', dashboard.get_dashboard_data_api, name='api_dashboard_data'),
]
