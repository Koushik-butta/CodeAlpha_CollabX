import os
import sys

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'collabx_project.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import django
django.setup()

from django.contrib.auth.models import User

fakes = [
    'github_dev_mock', 'google_dev_mock',
    'testuser', 'test_user', 'test123', 'demo', 'demouser',
    'admin_test', 'fake_dev', 'sample', 'example_user',
]

to_delete = User.objects.filter(username__in=fakes)
found = list(to_delete.values_list('username', flat=True))

if not found:
    print("Database is clean - no fake accounts found.")
else:
    print(f"Deleting: {found}")
    result = to_delete.delete()
    print(f"Done. Deleted: {result}")
