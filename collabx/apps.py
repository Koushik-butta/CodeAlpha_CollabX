from django.apps import AppConfig
from django.db.backends.signals import connection_created

def set_search_path(sender, connection, **kwargs):
    if connection.vendor == 'postgresql':
        with connection.cursor() as cursor:
            cursor.execute("SET search_path TO collabx;")

class CollabxConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'collabx'

    def ready(self):
        connection_created.connect(set_search_path)
