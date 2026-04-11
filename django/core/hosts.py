from django.conf import settings
from django_hosts import patterns, host

host_patterns = patterns('',
    host(r'www', settings.ROOT_URLCONF, name='www'),
    host(r'admin', 'core.admin_urls', name='admin'),
    host(r'api', 'core.api_urls', name='api'),
)