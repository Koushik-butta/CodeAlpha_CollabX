from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.conf import settings
from django.contrib.auth.models import User
import json
import re
import cloudinary.uploader
from collabx.models import Project, Task, ProjectMessage, ProjectFile, ProjectActivity, Notification

def get_project_or_error(request, project_id):
    try:
        project = Project.objects.get(id=project_id)
        if project.creator == request.user or project.members.filter(id=request.user.id).exists():
            return project, None
        return None, JsonResponse({'message': 'You are not a member of this project'}, status=403)
    except Project.DoesNotExist:
        return None, JsonResponse({'message': 'Project not found'}, status=404)

@login_required(login_url='login')
@csrf_exempt
def workspace_tasks_api(request, project_id):
    project, error = get_project_or_error(request, project_id)
    if error:
        return error

    if request.method == 'GET':
        tasks = project.tasks.all().order_by('-created_at')
        tasks_list = []
        for t in tasks:
            tasks_list.append({
                'id': t.id,
                'title': t.title,
                'description': t.description,
                'status': t.status,
                'priority': t.priority,
                'assignee': {
                    'username': t.assignee.username,
                    'full_name': t.assignee.profile.full_name,
                    'profile_picture': t.assignee.profile.profile_picture
                } if t.assignee else None,
                'due_date': t.due_date.isoformat() if t.due_date else None,
                'created_at': t.created_at.isoformat()
            })
        return JsonResponse({'tasks': tasks_list})

    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            title = data.get('title', '').strip()
            description = data.get('description', '').strip()
            priority = data.get('priority', 'medium')
            status = data.get('status', 'todo')
            assignee_username = data.get('assignee_username')
            due_date = data.get('due_date')

            if not title:
                return JsonResponse({'message': 'Title is required'}, status=400)

            assignee = None
            if assignee_username:
                try:
                    assignee = User.objects.get(username=assignee_username)
                    # verify assignee is member or creator
                    if assignee != project.creator and not project.members.filter(id=assignee.id).exists():
                        return JsonResponse({'message': 'Assignee is not a member of this project'}, status=400)
                except User.DoesNotExist:
                    return JsonResponse({'message': 'Assignee not found'}, status=400)

            task = Task.objects.create(
                project=project,
                title=title,
                description=description,
                priority=priority,
                status=status,
                assignee=assignee,
                due_date=due_date if due_date else None
            )

            # Log activity
            ProjectActivity.objects.create(
                project=project,
                user=request.user,
                description=f"created task: \"{task.title}\"",
                activity_type='task'
            )

            return JsonResponse({'message': 'Task created successfully', 'task_id': task.id}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=500)

    return JsonResponse({'message': 'Method not allowed'}, status=405)

@login_required(login_url='login')
@csrf_exempt
def workspace_task_detail_api(request, project_id, task_id):
    project, error = get_project_or_error(request, project_id)
    if error:
        return error

    try:
        task = Task.objects.get(id=task_id, project=project)
    except Task.DoesNotExist:
        return JsonResponse({'message': 'Task not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse({
            'task': {
                'id': task.id,
                'title': task.title,
                'description': task.description,
                'status': task.status,
                'priority': task.priority,
                'assignee': {
                    'username': task.assignee.username,
                    'full_name': task.assignee.profile.full_name,
                    'profile_picture': task.assignee.profile.profile_picture
                } if task.assignee else None,
                'due_date': task.due_date.isoformat() if task.due_date else None
            }
        })

    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            action = data.get('action', 'update')

            if action == 'delete':
                task_title = task.title
                task.delete()
                # Log activity
                ProjectActivity.objects.create(
                    project=project,
                    user=request.user,
                    description=f"deleted task: \"{task_title}\"",
                    activity_type='task'
                )
                return JsonResponse({'message': 'Task deleted successfully'})

            # Edit/Update fields
            old_status = task.status
            old_title = task.title
            
            task.title = data.get('title', task.title).strip()
            task.description = data.get('description', task.description).strip()
            task.priority = data.get('priority', task.priority)
            task.status = data.get('status', task.status)
            
            due_date = data.get('due_date')
            if due_date is not None:
                task.due_date = due_date if due_date else None

            assignee_username = data.get('assignee_username')
            if assignee_username is not None:
                if assignee_username:
                    try:
                        assignee = User.objects.get(username=assignee_username)
                        if assignee != project.creator and not project.members.filter(id=assignee.id).exists():
                            return JsonResponse({'message': 'Assignee is not a member of this project'}, status=400)
                        task.assignee = assignee
                    except User.DoesNotExist:
                        return JsonResponse({'message': 'Assignee not found'}, status=400)
                else:
                    task.assignee = None

            task.save()

            # Log activities based on what changed
            activity_desc = ""
            if old_status != task.status:
                activity_desc = f"moved task \"{task.title}\" to {task.get_status_display()}"
            else:
                activity_desc = f"updated task \"{task.title}\""

            ProjectActivity.objects.create(
                project=project,
                user=request.user,
                description=activity_desc,
                activity_type='task'
            )

            return JsonResponse({'message': 'Task updated successfully'})
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=500)

    return JsonResponse({'message': 'Method not allowed'}, status=405)

@login_required(login_url='login')
@csrf_exempt
def workspace_discussions_api(request, project_id):
    project, error = get_project_or_error(request, project_id)
    if error:
        return error

    if request.method == 'GET':
        messages = project.messages.all().order_by('created_at')
        messages_list = []
        for m in messages:
            messages_list.append({
                'id': m.id,
                'content': m.content,
                'created_at': m.created_at.isoformat(),
                'user': {
                    'username': m.user.username,
                    'full_name': m.user.profile.full_name,
                    'profile_picture': m.user.profile.profile_picture
                },
                'reply_to': {
                    'id': m.reply_to.id,
                    'content': m.reply_to.content,
                    'username': m.reply_to.user.username
                } if m.reply_to else None
            })
        return JsonResponse({'messages': messages_list})

    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            content = data.get('content', '').strip()
            reply_to_id = data.get('reply_to_id')

            if not content:
                return JsonResponse({'message': 'Message content cannot be empty'}, status=400)

            reply_to = None
            if reply_to_id:
                try:
                    reply_to = ProjectMessage.objects.get(id=reply_to_id, project=project)
                except ProjectMessage.DoesNotExist:
                    pass

            message = ProjectMessage.objects.create(
                project=project,
                user=request.user,
                content=content,
                reply_to=reply_to
            )

            # Process mentions: @username
            usernames = re.findall(r'@(\w+)', content)
            for uname in set(usernames):
                try:
                    user_to_notify = User.objects.get(username=uname)
                    # Check if user is creator or member of the project
                    if user_to_notify != request.user and (user_to_notify == project.creator or project.members.filter(id=user_to_notify.id).exists()):
                        Notification.objects.create(
                            user=user_to_notify,
                            sender=request.user,
                            notification_type='join_request', # use existing notification model, or we can use custom type
                            project=project
                        )
                except User.DoesNotExist:
                    pass

            # Log system activity occasionally or keep timeline quiet for chats
            return JsonResponse({'message': 'Message sent successfully', 'message_id': message.id}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=500)

    return JsonResponse({'message': 'Method not allowed'}, status=405)

@login_required(login_url='login')
@csrf_exempt
def workspace_message_detail_api(request, project_id, message_id):
    project, error = get_project_or_error(request, project_id)
    if error:
        return error

    try:
        message = ProjectMessage.objects.get(id=message_id, project=project)
    except ProjectMessage.DoesNotExist:
        return JsonResponse({'message': 'Message not found'}, status=404)

    if request.method == 'POST': # for edit or delete
        try:
            data = json.loads(request.body)
            action = data.get('action', 'edit')

            if message.user != request.user:
                return JsonResponse({'message': 'You can only edit or delete your own messages'}, status=403)

            if action == 'delete':
                message.delete()
                return JsonResponse({'message': 'Message deleted successfully'})
            elif action == 'edit':
                new_content = data.get('content', '').strip()
                if not new_content:
                    return JsonResponse({'message': 'Content cannot be empty'}, status=400)
                message.content = new_content
                message.save()
                return JsonResponse({'message': 'Message updated successfully'})
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=500)

    return JsonResponse({'message': 'Method not allowed'}, status=405)

@login_required(login_url='login')
@csrf_exempt
def workspace_files_api(request, project_id):
    project, error = get_project_or_error(request, project_id)
    if error:
        return error

    if request.method == 'GET':
        files = project.files.all().order_by('-created_at')
        files_list = []
        for f in files:
            files_list.append({
                'id': f.id,
                'file_name': f.file_name,
                'file_url': f.file_url,
                'file_size': f.file_size,
                'file_type': f.file_type,
                'created_at': f.created_at.isoformat(),
                'user': {
                    'username': f.user.username,
                    'full_name': f.user.profile.full_name
                }
            })
        return JsonResponse({'files': files_list})

    elif request.method == 'POST':
        try:
            if not request.FILES.get('file'):
                return JsonResponse({'message': 'No file uploaded'}, status=400)

            uploaded_file = request.FILES['file']
            file_name = uploaded_file.name
            file_size = uploaded_file.size
            file_type = uploaded_file.content_type

            # Upload to Cloudinary using standard file settings folder prefixing
            prefix = getattr(settings, 'CLOUDINARY_STORAGE', {}).get('PREFIX', 'collabx')
            upload_result = cloudinary.uploader.upload(
                uploaded_file,
                folder=f"{prefix}/project_files/{project.id}",
                resource_type="auto"
            )

            secure_url = upload_result.get('secure_url')
            if not secure_url:
                return JsonResponse({'message': 'Cloudinary upload failed'}, status=500)

            project_file = ProjectFile.objects.create(
                project=project,
                user=request.user,
                file_name=file_name,
                file_url=secure_url,
                file_size=file_size,
                file_type=file_type
            )

            # Log activity
            ProjectActivity.objects.create(
                project=project,
                user=request.user,
                description=f"uploaded file: \"{file_name}\"",
                activity_type='file'
            )

            return JsonResponse({
                'message': 'File uploaded successfully',
                'file': {
                    'id': project_file.id,
                    'file_name': project_file.file_name,
                    'file_url': project_file.file_url,
                    'file_size': project_file.file_size,
                    'file_type': project_file.file_type
                }
            }, status=201)

        except Exception as e:
            return JsonResponse({'message': str(e)}, status=500)

    return JsonResponse({'message': 'Method not allowed'}, status=405)

@login_required(login_url='login')
@csrf_exempt
def workspace_file_detail_api(request, project_id, file_id):
    project, error = get_project_or_error(request, project_id)
    if error:
        return error

    try:
        file_obj = ProjectFile.objects.get(id=file_id, project=project)
    except ProjectFile.DoesNotExist:
        return JsonResponse({'message': 'File not found'}, status=404)

    if request.method == 'POST':
        data = json.loads(request.body)
        action = data.get('action')
        if action == 'delete':
            # Check permissions: owner of file or owner of project
            if file_obj.user != request.user and project.creator != request.user:
                return JsonResponse({'message': 'You are not authorized to delete this file'}, status=403)

            file_name = file_obj.file_name
            file_obj.delete()

            # Log activity
            ProjectActivity.objects.create(
                project=project,
                user=request.user,
                description=f"deleted file: \"{file_name}\"",
                activity_type='file'
            )
            return JsonResponse({'message': 'File deleted successfully'})

    return JsonResponse({'message': 'Method not allowed'}, status=405)

@login_required(login_url='login')
def workspace_timeline_api(request, project_id):
    project, error = get_project_or_error(request, project_id)
    if error:
        return error

    if request.method == 'GET':
        activities = project.activities.all().order_by('-created_at')[:50]
        activities_list = []
        for a in activities:
            activities_list.append({
                'id': a.id,
                'description': a.description,
                'activity_type': a.activity_type,
                'created_at': a.created_at.isoformat(),
                'user': {
                    'username': a.user.username if a.user else 'System',
                    'full_name': a.user.profile.full_name if a.user else 'System',
                    'profile_picture': a.user.profile.profile_picture if a.user else 'https://res.cloudinary.com/dptujrmi1/image/upload/v1717838400/default-avatar.png'
                }
            })
        return JsonResponse({'activities': activities_list})

    return JsonResponse({'message': 'Method not allowed'}, status=405)

@login_required(login_url='login')
def workspace_analytics_api(request, project_id):
    project, error = get_project_or_error(request, project_id)
    if error:
        return error

    if request.method == 'GET':
        total_tasks = project.tasks.count()
        todo_count = project.tasks.filter(status='todo').count()
        in_progress_count = project.tasks.filter(status='in_progress').count()
        review_count = project.tasks.filter(status='review').count()
        completed_count = project.tasks.filter(status='completed').count()

        # Priority breakdown
        low_count = project.tasks.filter(priority='low').count()
        medium_count = project.tasks.filter(priority='medium').count()
        high_count = project.tasks.filter(priority='high').count()
        urgent_count = project.tasks.filter(priority='urgent').count()

        # Assignee breakdown
        assignee_breakdown = {}
        # Include creator and members
        members_all = list(project.members.all())
        if project.creator not in members_all:
            members_all.append(project.creator)

        for member in members_all:
            count = project.tasks.filter(assignee=member).count()
            if count > 0:
                assignee_breakdown[member.profile.full_name or member.username] = count

        # Unassigned count
        unassigned_count = project.tasks.filter(assignee__isnull=True).count()
        if unassigned_count > 0:
            assignee_breakdown['Unassigned'] = unassigned_count

        return JsonResponse({
            'status_counts': {
                'todo': todo_count,
                'in_progress': in_progress_count,
                'review': review_count,
                'completed': completed_count
            },
            'priority_counts': {
                'low': low_count,
                'medium': medium_count,
                'high': high_count,
                'urgent': urgent_count
            },
            'assignee_counts': assignee_breakdown,
            'total_tasks': total_tasks,
            'progress_percentage': int((completed_count / total_tasks * 100)) if total_tasks > 0 else 0
        })

    return JsonResponse({'message': 'Method not allowed'}, status=405)
