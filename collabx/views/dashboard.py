from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Count, Q
from collabx.models import Project, Task, JoinRequest, Notification, Profile

@login_required(login_url='login')
def get_dashboard_data_api(request):
    if request.method != 'GET':
        return JsonResponse({'message': 'Method not allowed'}, status=405)

    try:
        user = request.user

        # 1. Active Projects (created by user or where user is a member)
        active_projects_query = Project.objects.filter(
            Q(creator=user) | Q(members=user)
        ).distinct().order_by('-created_at')

        active_projects = []
        for proj in active_projects_query:
            total_tasks = proj.tasks.count()
            completed_tasks = proj.tasks.filter(status='completed').count()
            progress = int((completed_tasks / total_tasks * 100)) if total_tasks > 0 else 0

            active_projects.append({
                'id': proj.id,
                'title': proj.title,
                'description': proj.description,
                'status': proj.status,
                'members_count': proj.members.count(),
                'progress_percentage': progress,
                'is_creator': proj.creator == user
            })

        # 2. Assigned Tasks (not completed)
        assigned_tasks_query = Task.objects.filter(
            assignee=user
        ).exclude(status='completed').order_by('due_date', '-created_at')

        assigned_tasks = []
        for task in assigned_tasks_query:
            assigned_tasks.append({
                'id': task.id,
                'title': task.title,
                'project_id': task.project.id,
                'project_title': task.project.title,
                'status': task.status,
                'priority': task.priority,
                'due_date': task.due_date.isoformat() if task.due_date else None
            })

        # 3. Pending requests received (projects user created that have pending requests)
        pending_requests_received_query = JoinRequest.objects.filter(
            project__creator=user,
            status='pending'
        ).order_by('-created_at')

        pending_requests_received = []
        for req in pending_requests_received_query:
            req_prof = req.user.profile
            pending_requests_received.append({
                'id': req.id,
                'project_id': req.project.id,
                'project_title': req.project.title,
                'user': {
                    'username': req.user.username,
                    'full_name': req_prof.full_name,
                    'profile_picture': req_prof.profile_picture,
                    'role': req_prof.get_role_display()
                },
                'message': req.message,
                'created_at': req.created_at.isoformat()
            })

        # 4. Pending requests sent (requests user sent to join other projects)
        pending_requests_sent_query = JoinRequest.objects.filter(
            user=user,
            status='pending'
        ).order_by('-created_at')

        pending_requests_sent = []
        for req in pending_requests_sent_query:
            pending_requests_sent.append({
                'id': req.id,
                'project_id': req.project.id,
                'project_title': req.project.title,
                'status': req.status,
                'created_at': req.created_at.isoformat()
            })

        # 5. Recent notifications (unread, limit to 10)
        recent_notifications_query = Notification.objects.filter(
            user=user,
            is_read=False
        ).order_by('-created_at')[:10]

        notifications = []
        for notif in recent_notifications_query:
            notifications.append({
                'id': notif.id,
                'sender': {
                    'username': notif.sender.username,
                    'full_name': notif.sender.profile.full_name,
                    'profile_picture': notif.sender.profile.profile_picture
                },
                'notification_type': notif.notification_type,
                'project': {
                    'id': notif.project.id,
                    'title': notif.project.title
                } if notif.project else None,
                'created_at': notif.created_at.isoformat()
            })

        return JsonResponse({
            'active_projects': active_projects,
            'assigned_tasks': assigned_tasks,
            'pending_requests_received': pending_requests_received,
            'pending_requests_sent': pending_requests_sent,
            'notifications': notifications
        })

    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)
