from django.urls import path
from collabx.views import pages, auth, profile, posts, social, search

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
]
