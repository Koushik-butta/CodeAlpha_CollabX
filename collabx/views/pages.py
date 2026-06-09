from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from collabx.models import Post, Profile

def landing_page(request):
    if request.user.is_authenticated:
        return redirect('home_feed')
    return render(request, 'landing.html')

def login_page(request):
    if request.user.is_authenticated:
        return redirect('home_feed')
    return render(request, 'login.html')

def register_page(request):
    if request.user.is_authenticated:
        return redirect('home_feed')
    return render(request, 'register.html')

@login_required(login_url='login')
def home_feed(request):
    try:
        profile = request.user.profile
    except Profile.DoesNotExist:
        # Auto-create profile if missing
        profile = Profile.objects.create(user=request.user, full_name=request.user.first_name or request.user.username)
        
    return render(request, 'feed.html', {'profile': profile})

@login_required(login_url='login')
def profile_page(request, username=None):
    # If no username, view self
    if username is None:
        target_user = request.user
    else:
        try:
            target_user = User.objects.get(username=username)
        except User.DoesNotExist:
            return redirect('home_feed')

    # Ensure profile exists
    try:
        profile = target_user.profile
    except Profile.DoesNotExist:
        profile = Profile.objects.create(user=target_user, full_name=target_user.first_name or target_user.username)

    is_own_profile = (target_user == request.user)
    
    # Check if logged in user is following target user
    is_following = False
    if not is_own_profile:
        is_following = request.user.following_relations.filter(following=target_user).exists()

    context = {
        'target_user': target_user,
        'profile': profile,
        'is_own_profile': is_own_profile,
        'is_following': is_following
    }
    return render(request, 'profile.html', context)

@login_required(login_url='login')
def create_post_page(request, post_id=None):
    post = None
    if post_id:
        try:
            post = Post.objects.get(id=post_id)
            if post.user != request.user:
                return redirect('home_feed')
        except Post.DoesNotExist:
            return redirect('home_feed')
            
    return render(request, 'create_post.html', {'post': post})

@login_required(login_url='login')
def post_detail_page(request, post_id):
    try:
        post = Post.objects.get(id=post_id)
    except Post.DoesNotExist:
        return redirect('home_feed')
        
    return render(request, 'post_detail.html', {'post': post})
