from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.db.models import Q, Count
from django.contrib.auth.models import User
from collabx.models import Post, Like, Project, Task, Profile

@login_required(login_url='login')
def search_api(request):
    if request.method != 'GET':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
        
    try:
        query = request.GET.get('q', '').strip()
        scope = request.GET.get('scope', 'posts') # 'posts', 'global' or others
        
        if not query:
            return JsonResponse({
                'posts': [],
                'projects': [],
                'users': [],
                'tasks': []
            })
            
        posts_list = []
        projects_list = []
        users_list = []
        tasks_list = []
        
        # 1. Search Posts (Always or if scope is 'posts' / 'global')
        if scope in ['posts', 'global']:
            post_type = request.GET.get('post_type', 'all')
            posts = Post.objects.filter(
                Q(title__icontains=query) |
                Q(description__icontains=query) |
                Q(skills__icontains=query) |
                Q(user__username__icontains=query) |
                Q(user__profile__full_name__icontains=query)
            ).order_by('-created_at')
            
            if post_type in ['recruitment', 'hackathon']:
                posts = posts.filter(post_type=post_type)
                
            for post in posts:
                author_profile = post.user.profile
                is_liked = Like.objects.filter(user=request.user, post=post).exists()
                is_following = request.user.following_relations.filter(following=post.user).exists()
                is_author = (post.user == request.user)
                
                posts_list.append({
                    'id': post.id,
                    'title': post.title,
                    'description': post.description,
                    'skills': post.skills_list,
                    'post_type': post.post_type,
                    'created_at': post.created_at.isoformat(),
                    'likes_count': post.likes.count(),
                    'comments_count': post.comments.count(),
                    'is_liked': is_liked,
                    'is_following': is_following,
                    'is_author': is_author,
                    'author': {
                        'username': post.user.username,
                        'full_name': author_profile.full_name,
                        'profile_picture': author_profile.profile_picture,
                        'college': author_profile.college
                    }
                })

        # 2. Search Projects
        if scope == 'global':
            projects = Project.objects.filter(
                Q(title__icontains=query) |
                Q(description__icontains=query) |
                Q(skills__icontains=query)
            ).distinct().order_by('-created_at')
            
            for proj in projects:
                total_t = proj.tasks.count()
                comp_t = proj.tasks.filter(status='completed').count()
                prog = int((comp_t / total_t * 100)) if total_t > 0 else 0
                
                projects_list.append({
                    'id': proj.id,
                    'title': proj.title,
                    'description': proj.description,
                    'skills': proj.skills_list,
                    'status': proj.status,
                    'members_count': proj.members.count(),
                    'progress_percentage': prog,
                    'creator': {
                        'username': proj.creator.username,
                        'full_name': proj.creator.profile.full_name,
                        'profile_picture': proj.creator.profile.profile_picture
                    }
                })

            # 3. Search Users / Profiles
            users = User.objects.filter(
                Q(username__icontains=query) |
                Q(profile__full_name__icontains=query) |
                Q(profile__bio__icontains=query) |
                Q(profile__skills__icontains=query) |
                Q(profile__role__icontains=query)
            ).distinct().order_by('username')
            
            for u in users:
                prof = u.profile
                users_list.append({
                    'username': u.username,
                    'full_name': prof.full_name,
                    'profile_picture': prof.profile_picture,
                    'college': prof.college,
                    'bio': prof.bio,
                    'skills': prof.skills_list,
                    'role': prof.get_role_display()
                })

            # 4. Search Tasks (only in projects current user is member/creator of)
            tasks = Task.objects.filter(
                Q(project__creator=request.user) | Q(project__members=request.user)
            ).filter(
                Q(title__icontains=query) |
                Q(description__icontains=query)
            ).distinct().order_by('-created_at')
            
            for t in tasks:
                tasks_list.append({
                    'id': t.id,
                    'title': t.title,
                    'description': t.description,
                    'status': t.status,
                    'priority': t.priority,
                    'project_id': t.project.id,
                    'project_title': t.project.title,
                    'due_date': t.due_date.isoformat() if t.due_date else None,
                    'assignee': {
                        'username': t.assignee.username,
                        'full_name': t.assignee.profile.full_name
                    } if t.assignee else None
                })
            
        return JsonResponse({
            'posts': posts_list,
            'projects': projects_list,
            'users': users_list,
            'tasks': tasks_list
        })
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)
