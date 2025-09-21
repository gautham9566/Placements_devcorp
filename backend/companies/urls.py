from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'companies'

router = DefaultRouter()
router.register(r'companies', views.CompanyViewSet)

urlpatterns = [
    # Static endpoints first (before router to avoid conflicts)
    path('companies/simple/', views.CompanySimpleListView.as_view(), name='simple-company-list'),
    path('companies/optimized/', views.OptimizedCompanyListView.as_view(), name='optimized-company-list'),
    path('companies/stats/', views.CompanyStatsView.as_view(), name='company-stats'),
    path('company/<int:pk>/', views.CompanyDetailView.as_view(), name='company-detail'),
    path('companies/<int:pk>/upload-logo/', views.CompanyLogoUploadView.as_view(), name='company-logo-upload'),
    path('company-list/', views.CompanyListView.as_view(), name='company-list'),

    # Follower endpoints
    path('companies/<int:company_id>/followers/count/', views.CompanyFollowersCountView.as_view(), name='company-followers-count'),
    path('companies/<int:company_id>/followers/status/', views.CompanyFollowerStatusView.as_view(), name='company-follower-status'),
    path('companies/<int:company_id>/followers/', views.CompanyFollowerView.as_view(), name='company-followers'),
    path('users/<int:user_id>/following/', views.UserFollowedCompaniesView.as_view(), name='user-followed-companies'),

    # Router URLs last (to avoid conflicts)
    path('', include(router.urls)),
]