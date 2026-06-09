from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
import json
from collabx.models import Post, Profile, Like, Comment

@login_required(login_url='login')
@csrf_exempt
def create_post_api(request):
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
        
    try:
        data = json.loads(request.body)
        title = data.get('title', '').strip()
        description = data.get('description', '').strip()
        post_type = data.get('post_type')
        skills = data.get('skills', [])
        
        if not title or not description or not post_type:
            return JsonResponse({'message': 'Title, description, and post type are required'}, status=400)
            
        if post_type not in ['recruitment', 'hackathon']:
            return JsonResponse({'message': 'Invalid post type'}, status=400)
            
        post = Post.objects.create(
            user=request.user,
            title=title,
            description=description,
            post_type=post_type
        )
        post.skills_list = skills
        post.save()
        
        return JsonResponse({'message': 'Post created successfully', 'post_id': post.id}, status=201)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)

@login_required(login_url='login')
@csrf_exempt
def edit_post_api(request, post_id):
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
        
    try:
        post = Post.objects.get(id=post_id)
        if post.user != request.user:
            return JsonResponse({'message': 'You are not authorized to edit this post'}, status=403)
            
        data = json.loads(request.body)
        post.title = data.get('title', post.title).strip()
        post.description = data.get('description', post.description).strip()
        post.post_type = data.get('post_type', post.post_type)
        
        skills = data.get('skills')
        if isinstance(skills, list):
            post.skills_list = skills
            
        post.save()
        return JsonResponse({'message': 'Post updated successfully'})
    except Post.DoesNotExist:
        return JsonResponse({'message': 'Post not found'}, status=404)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)

@login_required(login_url='login')
@csrf_exempt
def delete_post_api(request, post_id):
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
        
    try:
        post = Post.objects.get(id=post_id)
        if post.user != request.user:
            return JsonResponse({'message': 'You are not authorized to delete this post'}, status=403)
            
        post.delete()
        return JsonResponse({'message': 'Post deleted successfully'})
    except Post.DoesNotExist:
        return JsonResponse({'message': 'Post not found'}, status=404)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)

@login_required(login_url='login')
def get_posts_api(request):
    if request.method != 'GET':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
        
    try:
        post_type = request.GET.get('post_type', 'all')
        username = request.GET.get('username')
        
        posts = Post.objects.all().order_by('-created_at')
        
        if post_type in ['recruitment', 'hackathon']:
            posts = posts.filter(post_type=post_type)
            
        if username:
            posts = posts.filter(user__username=username)
            
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

@login_required(login_url='login')
def get_single_post_api(request, post_id):
    if request.method != 'GET':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
        
    try:
        post = Post.objects.get(id=post_id)
        author_profile = post.user.profile
        is_liked = Like.objects.filter(user=request.user, post=post).exists()
        is_following = request.user.following_relations.filter(following=post.user).exists()
        is_author = (post.user == request.user)
        
        # Fetch comments
        comments = post.comments.all().order_by('created_at')
        comments_list = []
        for c in comments:
            c_profile = c.user.profile
            comments_list.append({
                'id': c.id,
                'content': c.content,
                'created_at': c.created_at.isoformat(),
                'author': {
                    'username': c.user.username,
                    'full_name': c_profile.full_name,
                    'profile_picture': c_profile.profile_picture
                }
            })
            
        post_data = {
            'id': post.id,
            'title': post.title,
            'description': post.description,
            'skills': post.skills_list,
            'post_type': post.post_type,
            'created_at': post.created_at.isoformat(),
            'likes_count': post.likes.count(),
            'comments_count': len(comments_list),
            'is_liked': is_liked,
            'is_following': is_following,
            'is_author': is_author,
            'author': {
                'username': post.user.username,
                'full_name': author_profile.full_name,
                'profile_picture': author_profile.profile_picture,
                'college': author_profile.college
            },
            'comments': comments_list
        }
        
        return JsonResponse({'post': post_data})
    except Post.DoesNotExist:
        return JsonResponse({'message': 'Post not found'}, status=404)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)
