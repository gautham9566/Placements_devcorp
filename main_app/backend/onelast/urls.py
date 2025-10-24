from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect
from jobs.views import AllApplicationsView
from django.conf import settings
from django.conf.urls.static import static
from .views import dashboard_overview


def redirect_to_admin(request):
    """Redirect root URL to admin dashboard"""
    return redirect('admin:index')


urlpatterns = [
    path('', redirect_to_admin, name='home'),
    path('admin/dashboard/', dashboard_overview, name='dashboard_overview'),
    path('admin/', admin.site.urls),
    
    # Global authentication URLs
    path('api/', include('accounts.urls')),
    path('api/accounts/', include('accounts.urls')),
    
    # Include jobs app URLs
    path('api/v1/jobs/', include('jobs.urls')),
    
    # Include metrics app URLs
    path('api/v1/', include('metrics.urls')),
    
    # Direct access to companies API
    path('api/v1/', include('companies.urls', namespace='companies_global')),
]

# Add media URL config if needed
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    # Also serve static files
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
