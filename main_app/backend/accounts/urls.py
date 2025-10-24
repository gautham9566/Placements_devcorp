from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    StudentRegistrationView,
    LoginView,
    UserProfileView,
    BulkStudentUpdateView,
    StudentListView,
    StudentDetailView,
    StudentUpdateView,
    LogoutView,
    StudentProfileViewSet,
    OptimizedStudentListView,
    ChangePasswordView,
    StudentFreezeView,
    ResumeListCreateView,
    ResumeDetailView,
    SystemSettingsView,
    YearManagementView,
    ActiveYearsView,
    BranchManagementView,
    ActiveBranchesView
)

router = DefaultRouter()
router.register(r'profiles', StudentProfileViewSet, basename='studentprofile')

urlpatterns = [
    # Authentication endpoints
    path('auth/register/student/', StudentRegistrationView.as_view(), name='student_register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/profile/', UserProfileView.as_view(), name='user_profile'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='change_password'),
    
    # Student management endpoints
    path('students/', StudentListView.as_view(), name='student_list'),
    path('students/optimized/', OptimizedStudentListView.as_view(), name='optimized_student_list'),
    path('students/<int:id>/', StudentDetailView.as_view(), name='student_detail'),
    path('students/<int:id>/update/', StudentUpdateView.as_view(), name='student_update'),
    path('students/<int:id>/freeze/', StudentFreezeView.as_view(), name='student_freeze'),
    path('students/bulk-update/', BulkStudentUpdateView.as_view(), name='bulk_student_update'),
    
    # Resume management endpoints
    path('profiles/me/resumes/', ResumeListCreateView.as_view(), name='resume-list-create'),
    path('profiles/me/resumes/<int:pk>/', ResumeDetailView.as_view(), name='resume-detail'),

    # Admin endpoints
    path('admin/system-settings/', SystemSettingsView.as_view(), name='system-settings'),
    path('admin/year-management/', YearManagementView.as_view(), name='year-management'),
    path('admin/branch-management/', BranchManagementView.as_view(), name='branch-management'),
    path('active-years/', ActiveYearsView.as_view(), name='active-years'),
    path('active-branches/', ActiveBranchesView.as_view(), name='active-branches'),

    # ViewSet routes
    path('', include(router.urls)),
]