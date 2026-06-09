from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.db.models import Q
from collabx.models import Profile

@login_required(login_url='login')
def get_developers_api(request):
    if request.method != 'GET':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
        
    try:
        role_filter = request.GET.get('role')
        skill_query = request.GET.get('skill', '').strip()
        search_query = request.GET.get('q', '').strip()
        
        # Start with all profiles, excluding current user
        profiles = Profile.objects.exclude(user=request.user)
        
        if role_filter:
            profiles = profiles.filter(role=role_filter)
            
        if skill_query:
            profiles = profiles.filter(skills__icontains=skill_query)
            
        if search_query:
            profiles = profiles.filter(
                Q(full_name__icontains=search_query) |
                Q(user__username__icontains=search_query) |
                Q(skills__icontains=search_query) |
                Q(college__icontains=search_query)
            )
            
        devs_list = []
        for prof in profiles:
            u = prof.user
            is_following = request.user.following_relations.filter(following=u).exists()
            devs_list.append({
                'username': u.username,
                'full_name': prof.full_name,
                'profile_picture': prof.profile_picture,
                'college': prof.college,
                'role': prof.role,
                'role_display': prof.get_role_display(),
                'skills': prof.skills_list,
                'is_following': is_following,
                'followers_count': u.follower_relations.count()
            })
            
        return JsonResponse({'developers': devs_list})
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)
