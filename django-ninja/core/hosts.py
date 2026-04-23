from django_hosts import patterns, host

host_patterns = patterns('',
    host(r'www', 'core.urls', name='www'),
    host(r'api', 'core.api_urls', name='api'),
    host(r'admin', 'core.admin_urls', name='admin'),
)