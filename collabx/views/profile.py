from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
import json
import requests
import cloudinary.uploader
from collabx.models import Profile, Post

@login_required(login_url='login')
def get_profile_api(request, username=None):
    if request.method != 'GET':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
        
    try:
        if username:
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                return JsonResponse({'message': 'User not found'}, status=444)
        else:
            user = request.user
            
        profile = user.profile
        
        # Count user's posts
        posts_count = Post.objects.filter(user=user).count()
        
        # Count followers & following
        followers_count = user.follower_relations.count()
        following_count = user.following_relations.count()
        
        profile_data = {
            'username': user.username,
            'email': user.email,
            'full_name': profile.full_name,
            'bio': profile.bio,
            'skills': profile.skills_list,
            'college': profile.college,
            'github_link': profile.github_link,
            'linkedin_link': profile.linkedin_link,
            'profile_picture': profile.profile_picture,
            'github_username': profile.github_username,
            'github_repos': profile.github_repos_count,
            'github_followers': profile.github_followers,
            'github_following': profile.github_following,
            'github_connected': profile.github_connected,
            'posts_count': posts_count,
            'followers_count': followers_count,
            'following_count': following_count,
        }
        
        return JsonResponse({'profile': profile_data})
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)

@login_required(login_url='login')
@csrf_exempt
def edit_profile_api(request):
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
        
    try:
        data = json.loads(request.body)
        profile = request.user.profile
        
        profile.full_name = data.get('full_name', profile.full_name)
        profile.bio = data.get('bio', profile.bio)
        profile.college = data.get('college', profile.college)
        profile.linkedin_link = data.get('linkedin_link', profile.linkedin_link)
        
        # Skills management (expects JSON list of skills)
        skills = data.get('skills')
        if isinstance(skills, list):
            profile.skills_list = skills
            
        # Update user first name as well
        user = request.user
        user.first_name = profile.full_name
        user.save()
        
        # Update manual github link if not connected via oauth
        github_link = data.get('github_link')
        if github_link is not None:
            profile.github_link = github_link
            
        profile.save()
        return JsonResponse({'message': 'Profile updated successfully'})
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)

@login_required(login_url='login')
@csrf_exempt
def connect_github_api(request):
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
        
    try:
        data = json.loads(request.body)
        github_username = data.get('github_username', '').strip()
        
        if not github_username:
            # Disconnect
            profile = request.user.profile
            profile.github_username = ''
            profile.github_connected = False
            profile.github_repos_count = 0
            profile.github_followers = 0
            profile.github_following = 0
            profile.save()
            return JsonResponse({'message': 'GitHub account disconnected'})
            
        # Fetch data from GitHub public API
        url = f"https://api.github.com/users/{github_username}"
        headers = {'Accept': 'application/json'}
        resp = requests.get(url, headers=headers)
        
        if resp.status_code == 200:
            gh_data = resp.json()
            profile = request.user.profile
            profile.github_username = github_username
            profile.github_link = gh_data.get('html_url') or f"https://github.com/{github_username}"
            profile.github_repos_count = gh_data.get('public_repos', 0)
            profile.github_followers = gh_data.get('followers', 0)
            profile.github_following = gh_data.get('following', 0)
            profile.github_connected = True
            profile.save()
            
            return JsonResponse({
                'message': f'Successfully linked GitHub profile for {github_username}',
                'github_stats': {
                    'username': github_username,
                    'repos': profile.github_repos_count,
                    'followers': profile.github_followers,
                    'following': profile.github_following,
                    'link': profile.github_link
                }
            })
        else:
            # GitHub username not found or API limits exceeded
            return JsonResponse({'message': 'Could not fetch GitHub account statistics. Make sure the username is correct.'}, status=400)
            
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)

@login_required(login_url='login')
@csrf_exempt
def upload_avatar_api(request):
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
        
    try:
        if not request.FILES.get('profile_picture'):
            return JsonResponse({'message': 'No image file uploaded'}, status=400)
            
        img_file = request.FILES['profile_picture']
        
        # Upload to Cloudinary
        upload_result = cloudinary.uploader.upload(
            img_file,
            folder="collabx/avatars",
            transformation=[
                {"width": 300, "height": 300, "crop": "fill", "gravity": "face"}
            ]
        )
        
        secure_url = upload_result.get('secure_url')
        if not secure_url:
            return JsonResponse({'message': 'Cloudinary upload failed'}, status=500)
            
        profile = request.user.profile
        profile.profile_picture = secure_url
        profile.save()
        
        return JsonResponse({
            'message': 'Avatar uploaded successfully',
            'profile_picture': secure_url
        })
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)
