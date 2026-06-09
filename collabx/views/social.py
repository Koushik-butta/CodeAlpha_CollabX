from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
import json
from collections import Counter
from collabx.models import Post, Profile, Like, Comment, Follow

@login_required(login_url='login')
@csrf_exempt
def like_post_api(request, post_id):
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
        
    try:
        post = Post.objects.get(id=post_id)
        like_filter = Like.objects.filter(user=request.user, post=post)
        
        if like_filter.exists():
            like_filter.delete()
            liked = False
        else:
            Like.objects.create(user=request.user, post=post)
            liked = True
            
        return JsonResponse({
            'liked': liked,
            'likes_count': post.likes.count()
        })
    except Post.DoesNotExist:
        return JsonResponse({'message': 'Post not found'}, status=404)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)

@login_required(login_url='login')
@csrf_exempt
def comment_api(request, post_id):
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
        
    try:
        post = Post.objects.get(id=post_id)
        data = json.loads(request.body)
        content = data.get('content', '').strip()
        
        if not content:
            return JsonResponse({'message': 'Comment content cannot be empty'}, status=400)
            
        comment = Comment.objects.create(
            user=request.user,
            post=post,
            content=content
        )
        
        profile = request.user.profile
        return JsonResponse({
            'comment': {
                'id': comment.id,
                'content': comment.content,
                'created_at': comment.created_at.isoformat(),
                'author': {
                    'username': request.user.username,
                    'full_name': profile.full_name,
                    'profile_picture': profile.profile_picture
                }
            }
        }, status=201)
    except Post.DoesNotExist:
        return JsonResponse({'message': 'Post not found'}, status=404)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)

@login_required(login_url='login')
@csrf_exempt
def follow_api(request, username):
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
        
    try:
        target_user = User.objects.get(username=username)
        if target_user == request.user:
            return JsonResponse({'message': 'You cannot follow yourself'}, status=400)
            
        follow_filter = Follow.objects.filter(follower=request.user, following=target_user)
        
        if follow_filter.exists():
            follow_filter.delete()
            is_following = False
            message = f"You unfollowed {username}"
        else:
            Follow.objects.create(follower=request.user, following=target_user)
            is_following = True
            message = f"You followed {username}"
            
        return JsonResponse({
            'is_following': is_following,
            'message': message,
            'followers_count': target_user.follower_relations.count()
        })
    except User.DoesNotExist:
        return JsonResponse({'message': 'User not found'}, status=404)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)

@login_required(login_url='login')
def get_suggestions_api(request):
    if request.method != 'GET':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
        
    try:
        # Get IDs of users current user is already following
        following_ids = request.user.following_relations.values_list('following_id', flat=True)
        
        # Suggest users who are NOT followed by current user, excluding themselves
        suggestions = User.objects.exclude(id__in=list(following_ids) + [request.user.id])[:5]
        
        suggestions_list = []
        for u in suggestions:
            try:
                prof = u.profile
            except Profile.DoesNotExist:
                prof = Profile.objects.create(user=u, full_name=u.first_name or u.username)
                
            suggestions_list.append({
                'username': u.username,
                'full_name': prof.full_name,
                'profile_picture': prof.profile_picture,
                'college': prof.college
            })
            
        return JsonResponse({'suggestions': suggestions_list})
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)

@login_required(login_url='login')
def get_trending_skills_api(request):
    if request.method != 'GET':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
        
    try:
        # Accumulate skills from posts & profiles
        skills_counter = Counter()
        
        for post in Post.objects.all():
            for skill in post.skills_list:
                skills_counter[skill.lower()] += 1
                
        for prof in Profile.objects.all():
            for skill in prof.skills_list:
                skills_counter[skill.lower()] += 1
                
        # Get top 8 skills
        top_skills = [item[0] for item in skills_counter.most_common(8)]
        
        # Fallback list if database is thin
        fallbacks = ['React', 'Python', 'Django', 'Node.js', 'PostgreSQL', 'GitHub', 'CSS', 'Figma']
        for skill in fallbacks:
            if len(top_skills) < 8 and skill.lower() not in [s.lower() for s in top_skills]:
                top_skills.append(skill)
                
        # Format properly
        formatted_skills = []
        for s in top_skills:
            # Title case formatting
            name = s.title()
            if s.lower() == 'django': name = 'Django'
            elif s.lower() == 'postgresql': name = 'PostgreSQL'
            elif s.lower() == 'react': name = 'React'
            elif s.lower() == 'node.js': name = 'Node.js'
            elif s.lower() == 'css': name = 'CSS'
            elif s.lower() == 'html': name = 'HTML'
            formatted_skills.append(name)
            
        return JsonResponse({'skills': formatted_skills})
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)
