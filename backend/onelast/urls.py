from django.contrib import admin
from django.urls import path, include
from jobs.views import AllApplicationsView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
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
    
    #  College-scoped URLs
    path('api/v1/college/<slug:slug>/', include([
        path('auth/', include('accounts.urls')),  # Optional: if you want scoped auth like /api/v1/college/amrita/auth/
        path('jobs/', include('jobs.urls')),
        path('companies/', include('companies.urls', namespace='companies_college')),
        path('applications/', AllApplicationsView.as_view(), name='all-applications'),  # Direct endpoint for all applications
    ])),
]

# Add media URL config if needed
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    # Also serve static files
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
