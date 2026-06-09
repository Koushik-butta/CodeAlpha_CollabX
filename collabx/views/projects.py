from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
import json
from collabx.models import Project, JoinRequest, Notification, Profile

@login_required(login_url='login')
@csrf_exempt
def create_project_api(request):
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
        
    try:
        data = json.loads(request.body)
        title = data.get('title', '').strip()
        description = data.get('description', '').strip()
        skills = data.get('skills', [])
        team_size = int(data.get('team_size', 2))
        status = data.get('status', 'open')
        
        if not title or not description:
            return JsonResponse({'message': 'Title and description are required'}, status=400)
            
        if status not in ['open', 'in_progress', 'completed']:
            return JsonResponse({'message': 'Invalid status value'}, status=400)
            
        project = Project.objects.create(
            creator=request.user,
            title=title,
            description=description,
            team_size=team_size,
            status=status
        )
        project.skills_list = skills
        # Creator is a member of their own project
        project.members.add(request.user)
        project.save()
        
        return JsonResponse({'message': 'Project created successfully', 'project_id': project.id}, status=201)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)

@login_required(login_url='login')
@csrf_exempt
def edit_project_api(request, project_id):
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
        
    try:
        project = Project.objects.get(id=project_id)
        if project.creator != request.user:
            return JsonResponse({'message': 'You are not authorized to edit this project'}, status=403)
            
        data = json.loads(request.body)
        project.title = data.get('title', project.title).strip()
        project.description = data.get('description', project.description).strip()
        project.team_size = int(data.get('team_size', project.team_size))
        project.status = data.get('status', project.status)
        
        skills = data.get('skills')
        if isinstance(skills, list):
            project.skills_list = skills
            
        if project.status not in ['open', 'in_progress', 'completed']:
            return JsonResponse({'message': 'Invalid status value'}, status=400)
            
        project.save()
        return JsonResponse({'message': 'Project updated successfully'})
    except Project.DoesNotExist:
        return JsonResponse({'message': 'Project not found'}, status=404)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)

@login_required(login_url='login')
def get_projects_api(request):
    if request.method != 'GET':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
        
    try:
        status_filter = request.GET.get('status')
        username_filter = request.GET.get('username')
        query = request.GET.get('q', '').strip()
        
        projects = Project.objects.all().order_by('-created_at')
        
        if status_filter:
            projects = projects.filter(status=status_filter)
            
        if username_filter:
            projects = projects.filter(creator__username=username_filter)
            
        if query:
            from django.db.models import Q
            projects = projects.filter(
                Q(title__icontains=query) |
                Q(description__icontains=query) |
                Q(skills__icontains=query) |
                Q(creator__username__icontains=query)
            )
            
        projects_list = []
        for proj in projects:
            creator_profile = proj.creator.profile
            projects_list.append({
                'id': proj.id,
                'title': proj.title,
                'description': proj.description,
                'skills': proj.skills_list,
                'team_size': proj.team_size,
                'status': proj.status,
                'created_at': proj.created_at.isoformat(),
                'members_count': proj.members.count(),
                'creator': {
                    'username': proj.creator.username,
                    'full_name': creator_profile.full_name,
                    'profile_picture': creator_profile.profile_picture,
                    'college': creator_profile.college
                }
            })
            
        return JsonResponse({'projects': projects_list})
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)

@login_required(login_url='login')
def get_single_project_api(request, project_id):
    if request.method != 'GET':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
        
    try:
        proj = Project.objects.get(id=project_id)
        creator_profile = proj.creator.profile
        is_creator = (proj.creator == request.user)
        
        # Check current user's join request status
        user_request_status = None
        user_request_id = None
        if not is_creator:
            try:
                jr = JoinRequest.objects.get(user=request.user, project=proj)
                user_request_status = jr.status
                user_request_id = jr.id
            except JoinRequest.DoesNotExist:
                pass
                
        # Fetch members profiles
        members_list = []
        for m in proj.members.all():
            m_prof = m.profile
            members_list.append({
                'username': m.username,
                'full_name': m_prof.full_name,
                'profile_picture': m_prof.profile_picture,
                'college': m_prof.college,
                'role': m_prof.get_role_display()
            })
            
        # Fetch pending join requests (visible to creator only)
        requests_list = []
        if is_creator:
            pending_requests = proj.join_requests.all().order_by('-created_at')
            for req in pending_requests:
                req_prof = req.user.profile
                requests_list.append({
                    'id': req.id,
                    'username': req.user.username,
                    'full_name': req_prof.full_name,
                    'profile_picture': req_prof.profile_picture,
                    'college': req_prof.college,
                    'role': req_prof.get_role_display(),
                    'message': req.message,
                    'status': req.status,
                    'created_at': req.created_at.isoformat()
                })
                
        project_data = {
            'id': proj.id,
            'title': proj.title,
            'description': proj.description,
            'skills': proj.skills_list,
            'team_size': proj.team_size,
            'status': proj.status,
            'created_at': proj.created_at.isoformat(),
            'is_creator': is_creator,
            'user_request_status': user_request_status,
            'user_request_id': user_request_id,
            'creator': {
                'username': proj.creator.username,
                'full_name': creator_profile.full_name,
                'profile_picture': creator_profile.profile_picture,
                'college': creator_profile.college
            },
            'members': members_list,
            'join_requests': requests_list
        }
        
        return JsonResponse({'project': project_data})
    except Project.DoesNotExist:
        return JsonResponse({'message': 'Project not found'}, status=404)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)

@login_required(login_url='login')
@csrf_exempt
def submit_join_request_api(request, project_id):
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
        
    try:
        project = Project.objects.get(id=project_id)
        if project.creator == request.user:
            return JsonResponse({'message': 'You cannot request to join your own project'}, status=400)
            
        # Check if already a member
        if project.members.filter(id=request.user.id).exists():
            return JsonResponse({'message': 'You are already a member of this project'}, status=400)
            
        data = json.loads(request.body)
        message = data.get('message', '').strip()
        
        # Get or create JoinRequest
        req, created = JoinRequest.objects.get_or_create(
            user=request.user,
            project=project,
            defaults={'message': message, 'status': 'pending'}
        )
        
        if not created:
            if req.status == 'accepted':
                return JsonResponse({'message': 'Your request has already been accepted.'}, status=400)
            elif req.status == 'pending':
                return JsonResponse({'message': 'You have a pending request already.'}, status=400)
            else:
                # Reset to pending if rejected previously
                req.status = 'pending'
                req.message = message
                req.save()
                
        # Send Notification to Creator
        Notification.objects.create(
            user=project.creator,
            sender=request.user,
            notification_type='join_request',
            project=project
        )
        
        return JsonResponse({'message': 'Join request submitted successfully', 'status': 'pending'})
    except Project.DoesNotExist:
        return JsonResponse({'message': 'Project not found'}, status=404)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)

@login_required(login_url='login')
@csrf_exempt
def handle_join_request_api(request, request_id):
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
        
    try:
        join_req = JoinRequest.objects.get(id=request_id)
        project = join_req.project
        
        if project.creator != request.user:
            return JsonResponse({'message': 'You are not authorized to accept or reject requests'}, status=403)
            
        data = json.loads(request.body)
        action = data.get('action') # 'accept' or 'reject'
        
        if action not in ['accept', 'reject']:
            return JsonResponse({'message': 'Invalid action'}, status=400)
            
        with transaction.atomic():
            if action == 'accept':
                join_req.status = 'accepted'
                join_req.save()
                
                # Add user as a project member
                project.members.add(join_req.user)
                project.save()
                
                # Notify Applicant
                Notification.objects.create(
                    user=join_req.user,
                    sender=request.user,
                    notification_type='accepted',
                    project=project
                )
                
                return JsonResponse({'message': f'Accepted {join_req.user.username}\'s request.'})
                
            elif action == 'reject':
                join_req.status = 'rejected'
                join_req.save()
                
                # Notify Applicant
                Notification.objects.create(
                    user=join_req.user,
                    sender=request.user,
                    notification_type='rejected',
                    project=project
                )
                
                return JsonResponse({'message': f'Rejected {join_req.user.username}\'s request.'})
                
    except JoinRequest.DoesNotExist:
        return JsonResponse({'message': 'Join request not found'}, status=404)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)
