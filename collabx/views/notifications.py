from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from collabx.models import Notification

@login_required(login_url='login')
def get_notifications_api(request):
    if request.method != 'GET':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
        
    try:
        unread_only = request.GET.get('unread_only', 'false') == 'true'
        notifications = Notification.objects.filter(user=request.user).order_by('-created_at')
        
        if unread_only:
            notifications = notifications.filter(is_read=False)
            
        unread_count = Notification.objects.filter(user=request.user, is_read=False).count()
        
        notification_list = []
        for n in notifications:
            sender_profile = n.sender.profile
            notification_list.append({
                'id': n.id,
                'sender': {
                    'username': n.sender.username,
                    'full_name': sender_profile.full_name,
                    'profile_picture': sender_profile.profile_picture
                },
                'notification_type': n.notification_type,
                'project': {
                    'id': n.project.id if n.project else None,
                    'title': n.project.title if n.project else ''
                },
                'is_read': n.is_read,
                'created_at': n.created_at.isoformat()
            })
            
        return JsonResponse({
            'notifications': notification_list,
            'unread_count': unread_count
        })
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)

@login_required(login_url='login')
@csrf_exempt
def mark_as_read_api(request, notification_id=None):
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
        
    try:
        if notification_id:
            try:
                notification = Notification.objects.get(id=notification_id, user=request.user)
                notification.is_read = True
                notification.save()
                return JsonResponse({'message': 'Notification marked as read'})
            except Notification.DoesNotExist:
                return JsonResponse({'message': 'Notification not found'}, status=404)
        else:
            # Mark all as read
            Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
            return JsonResponse({'message': 'All notifications marked as read'})
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)
