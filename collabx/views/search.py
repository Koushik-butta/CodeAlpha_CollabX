from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from collabx.models import Post, Like

@login_required(login_url='login')
def search_api(request):
    if request.method != 'GET':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
        
    try:
        query = request.GET.get('q', '').strip()
        post_type = request.GET.get('post_type', 'all')
        
        if not query:
            # If no query, return empty list or redirect to standard list
            return JsonResponse({'posts': []})
            
        # Filter posts using Q objects
        posts = Post.objects.filter(
            Q(title__icontains=query) |
            Q(description__icontains=query) |
            Q(skills__icontains=query) |
            Q(user__username__icontains=query) |
            Q(user__profile__full_name__icontains=query)
        ).order_by('-created_at')
        
        if post_type in ['recruitment', 'hackathon']:
            posts = posts.filter(post_type=post_type)
            
        posts_list = []
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
            
        return JsonResponse({'posts': posts_list})
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)
