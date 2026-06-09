from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import redirect
import json
import os
import requests
import urllib.parse
from collabx.models import Profile

@csrf_exempt
def register_api(request):
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
        
    try:
        data = json.loads(request.body)
        full_name = data.get('full_name')
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        if not all([full_name, username, email, password]):
            return JsonResponse({'message': 'All fields are required'}, status=400)
            
        if User.objects.filter(username=username).exists():
            return JsonResponse({'message': 'Username is already taken'}, status=400)
            
        if User.objects.filter(email=email).exists():
            return JsonResponse({'message': 'Email is already registered'}, status=400)
            
        # Create User
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=full_name
        )
        
        # Create Profile
        Profile.objects.create(
            user=user,
            full_name=full_name
        )
        
        # Log the user in
        login(request, user)
        
        return JsonResponse({'message': 'Registration successful'}, status=201)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)

@csrf_exempt
def login_api(request):
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
        
    try:
        data = json.loads(request.body)
        username_or_email = data.get('username_or_email')
        password = data.get('password')
        remember_me = data.get('remember_me', False)
        
        if not username_or_email or not password:
            return JsonResponse({'message': 'Please fill in all fields'}, status=400)
            
        # Check if username or email
        user = None
        if '@' in username_or_email:
            try:
                user_obj = User.objects.get(email=username_or_email)
                username = user_obj.username
            except User.DoesNotExist:
                username = username_or_email
        else:
            username = username_or_email
            
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            
            # Remember me logic
            if not remember_me:
                request.session.set_expiry(0) # Expires on close
            else:
                request.session.set_expiry(1209600) # 2 weeks
                
            return JsonResponse({'message': 'Login successful'})
        else:
            return JsonResponse({'message': 'Invalid username/email or password'}, status=401)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)

def logout_api(request):
    logout(request)
    return redirect('landing')

@csrf_exempt
def forgot_password_api(request):
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
        
    try:
        data = json.loads(request.body)
        email = data.get('email')
        
        if not email:
            return JsonResponse({'message': 'Email field is required'}, status=400)
            
        user_exists = User.objects.filter(email=email).exists()
        if not user_exists:
            return JsonResponse({'message': 'If the email exists, a reset link will be sent.'}, status=200)
            
        # Log the reset link for development/testing
        reset_link = f"http://localhost:8000/login/?reset_token=dev-test-token-1234&email={email}"
        print(f"\n[DEV PASSWORD RESET] Password reset requested for {email}.")
        print(f"[DEV PASSWORD RESET] Use link to mock reset: {reset_link}\n")
        
        return JsonResponse({'message': 'If the email exists, a reset link will be sent.'})
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)

# ==========================================
# GITHUB OAUTH AND FALLBACK
# ==========================================

def github_login(request):
    client_id = os.getenv('GITHUB_CLIENT_ID')
    
    # Fallback to simulated login if keys are not set
    if not client_id:
        # Create a mock GitHub developer user
        mock_username = 'github_dev_mock'
        user, created = User.objects.get_or_create(
            username=mock_username,
            defaults={
                'email': 'github_dev_mock@example.com',
                'first_name': 'Mock GitHub Dev'
            }
        )
        if created:
            user.set_unusable_password()
            user.save()
            
        profile, p_created = Profile.objects.get_or_create(user=user)
        profile.full_name = 'Mock GitHub Dev'
        profile.github_username = 'bk-dev'
        profile.github_link = 'https://github.com/bk-dev'
        profile.github_repos_count = 24
        profile.github_followers = 15
        profile.github_following = 10
        profile.github_connected = True
        profile.profile_picture = 'https://res.cloudinary.com/dptujrmi1/image/upload/v1717838400/default-avatar.png'
        profile.save()
        
        login(request, user)
        request.session['oauth_simulated'] = True
        return redirect('home_feed')
        
    # Real OAuth Flow
    redirect_uri = 'http://localhost:8000/auth/github/callback/'
    github_url = f"https://github.com/login/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}&scope=user"
    return redirect(github_url)

def github_callback(request):
    code = request.GET.get('code')
    if not code:
        return redirect('login')
        
    client_id = os.getenv('GITHUB_CLIENT_ID')
    client_secret = os.getenv('GITHUB_CLIENT_SECRET')
    
    # Exchange code for access token
    token_url = 'https://github.com/login/oauth/access_token'
    headers = {'Accept': 'application/json'}
    payload = {
        'client_id': client_id,
        'client_secret': client_secret,
        'code': code
    }
    
    token_resp = requests.post(token_url, data=payload, headers=headers)
    token_data = token_resp.json()
    access_token = token_data.get('access_token')
    
    if not access_token:
        return redirect('/login/?error=github_token_failed')
        
    # Get user details from GitHub
    user_resp = requests.get(
        'https://api.github.com/user',
        headers={'Authorization': f'token {access_token}', 'Accept': 'application/json'}
    )
    user_data = user_resp.json()
    github_user = user_data.get('login')
    
    if not github_user:
        return redirect('/login/?error=github_user_failed')
        
    email = user_data.get('email') or f"{github_user}@github-oauth.com"
    full_name = user_data.get('name') or github_user
    avatar_url = user_data.get('avatar_url')
    
    # Authenticate or register
    user, created = User.objects.get_or_create(
        username=f"github_{github_user.lower()}",
        defaults={
            'email': email,
            'first_name': full_name
        }
    )
    if created:
        user.set_unusable_password()
        user.save()
        
    profile, p_created = Profile.objects.get_or_create(user=user)
    profile.full_name = full_name
    profile.github_username = github_user
    profile.github_link = f"https://github.com/{github_user}"
    profile.github_repos_count = user_data.get('public_repos', 0)
    profile.github_followers = user_data.get('followers', 0)
    profile.github_following = user_data.get('following', 0)
    profile.github_connected = True
    if avatar_url and (p_created or profile.profile_picture.endswith('default-avatar.png')):
        profile.profile_picture = avatar_url
    profile.save()
    
    login(request, user)
    return redirect('home_feed')

# ==========================================
# GOOGLE OAUTH AND FALLBACK
# ==========================================

def google_login(request):
    client_id = os.getenv('GOOGLE_CLIENT_ID')
    
    # Fallback to simulated login if keys are not set
    if not client_id:
        # Create a mock Google developer user
        mock_username = 'google_dev_mock'
        user, created = User.objects.get_or_create(
            username=mock_username,
            defaults={
                'email': 'google_dev_mock@example.com',
                'first_name': 'Mock Google User'
            }
        )
        if created:
            user.set_unusable_password()
            user.save()
            
        profile, p_created = Profile.objects.get_or_create(user=user)
        profile.full_name = 'Mock Google User'
        profile.save()
        
        login(request, user)
        request.session['oauth_simulated'] = True
        return redirect('home_feed')
        
    # Real OAuth Flow
    redirect_uri = 'http://localhost:8000/auth/google/callback/'
    google_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={client_id}&"
        f"redirect_uri={urllib.parse.quote(redirect_uri)}&"
        "response_type=code&"
        "scope=openid%20email%20profile"
    )
    return redirect(google_url)

def google_callback(request):
    code = request.GET.get('code')
    if not code:
        return redirect('login')
        
    client_id = os.getenv('GOOGLE_CLIENT_ID')
    client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
    redirect_uri = 'http://localhost:8000/auth/google/callback/'
    
    # Exchange code for token
    token_url = 'https://oauth2.googleapis.com/token'
    payload = {
        'code': code,
        'client_id': client_id,
        'client_secret': client_secret,
        'redirect_uri': redirect_uri,
        'grant_type': 'authorization_code'
    }
    
    token_resp = requests.post(token_url, data=payload)
    token_data = token_resp.json()
    access_token = token_data.get('access_token')
    
    if not access_token:
        return redirect('/login/?error=google_token_failed')
        
    # Get user profile information
    user_info_url = 'https://www.googleapis.com/oauth2/v3/userinfo'
    user_resp = requests.get(user_info_url, params={'access_token': access_token})
    user_data = user_resp.json()
    
    email = user_data.get('email')
    full_name = user_data.get('name') or user_data.get('given_name')
    google_id = user_data.get('sub')
    avatar_url = user_data.get('picture')
    
    if not email:
        return redirect('/login/?error=google_email_failed')
        
    username = f"google_{email.split('@')[0].lower()}"
    
    # Authenticate or register
    user, created = User.objects.get_or_create(
        username=username,
        defaults={
            'email': email,
            'first_name': full_name
        }
    )
    if created:
        user.set_unusable_password()
        user.save()
        
    profile, p_created = Profile.objects.get_or_create(user=user)
    profile.full_name = full_name
    if avatar_url and (p_created or profile.profile_picture.endswith('default-avatar.png')):
        profile.profile_picture = avatar_url
    profile.save()
    
    login(request, user)
    return redirect('home_feed')
