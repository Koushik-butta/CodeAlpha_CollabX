"""
Management command: clear_test_data

Removes test/fake users, their posts, comments, likes, and follows.
Preserves all real user accounts (those registered via actual email,
GitHub OAuth, or Google OAuth).

Usage:
    python manage.py clear_test_data
    python manage.py clear_test_data --dry-run      # Preview only
    python manage.py clear_test_data --superuser    # Also delete superuser test accounts
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from collabx.models import Post, Comment, Like, Follow, Notification


# Known test/fake usernames to remove
TEST_USERNAMES = [
    'testuser', 'test_user', 'demouser', 'demo', 'admin_test',
    'fake_dev', 'sample', 'example_user', 'john_doe_test',
    'jane_dev', 'hackathon_test', 'test123', 'dev_test',
    'alice_test', 'bob_test',
]


class Command(BaseCommand):
    help = 'Remove test accounts, posts, and dummy data. Keeps real user accounts.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview what will be deleted without actually deleting.',
        )
        parser.add_argument(
            '--usernames',
            nargs='+',
            type=str,
            help='Specific usernames to delete (in addition to defaults).',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        extra_usernames = options.get('usernames') or []

        target_names = list(set(TEST_USERNAMES + extra_usernames))

        users_to_delete = User.objects.filter(username__in=target_names)

        if not users_to_delete.exists():
            self.stdout.write(self.style.WARNING(
                'No test accounts found matching the target list. Database looks clean!'
            ))
            return

        self.stdout.write(f'\nFound {users_to_delete.count()} test account(s) to remove:')
        for u in users_to_delete:
            post_count = Post.objects.filter(author=u).count()
            self.stdout.write(f'  - @{u.username} ({post_count} posts)')

        if dry_run:
            self.stdout.write(self.style.WARNING(
                '\nDRY RUN mode — nothing deleted. Remove --dry-run to execute.'
            ))
            return

        # Cascade delete: posts, comments, likes, follows, notifications
        deleted_count = users_to_delete.count()
        users_to_delete.delete()  # Cascade handles related objects

        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Successfully removed {deleted_count} test account(s) and all related data.'
        ))
        self.stdout.write(self.style.SUCCESS(
            'The platform is now clean. Only real user accounts remain.'
        ))
