"""
Management command: clear_fake_data

Removes all fake/mock/test users (github_dev_mock, google_dev_mock, testuser, etc.)
and all their associated data (posts, comments, likes, follows, notifications).

Preserves all real registered accounts.

Usage:
    python manage.py clear_fake_data              # Clears known fake accounts
    python manage.py clear_fake_data --dry-run    # Preview only, no deletion
    python manage.py clear_fake_data --usernames extra_user1 extra_user2
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User


# Known fake/mock usernames created by the system (no real users)
FAKE_USERNAMES = [
    # OAuth mock fallbacks (removed from code, but may exist in DB)
    'github_dev_mock',
    'google_dev_mock',
    # Common test names
    'testuser', 'test_user', 'test123', 'demo', 'demouser',
    'admin_test', 'fake_dev', 'sample', 'example_user',
    'john_doe_test', 'jane_dev', 'hackathon_test',
    'alice_test', 'bob_test',
]


class Command(BaseCommand):
    help = 'Remove all fake/mock/test accounts and their data from the database.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview deletions without executing.',
        )
        parser.add_argument(
            '--usernames',
            nargs='+',
            type=str,
            help='Additional usernames to delete.',
        )

    def handle(self, *args, **options):
        dry_run       = options.get('dry_run', False)
        extra_names   = options.get('usernames') or []
        targets       = list(set(FAKE_USERNAMES + extra_names))

        to_delete = User.objects.filter(username__in=targets)

        if not to_delete.exists():
            self.stdout.write(self.style.SUCCESS(
                '✅ No fake accounts found. Database is clean!'
            ))
            return

        self.stdout.write(f'\nFound {to_delete.count()} fake account(s):')
        for u in to_delete:
            posts = getattr(u, 'posts', None)
            post_count = posts.count() if posts else 0
            self.stdout.write(f'  [DEL] @{u.username}  ({post_count} posts, email: {u.email})')

        if dry_run:
            self.stdout.write(self.style.WARNING(
                '\n[DRY RUN] Nothing was deleted. Remove --dry-run to execute.'
            ))
            return

        count = to_delete.count()
        to_delete.delete()

        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Deleted {count} fake account(s) and all their data.'
        ))
        self.stdout.write(self.style.SUCCESS(
            'The platform now only contains real user accounts.'
        ))
