from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    JobPostingListView,
    JobPostingCreateView,
    JobPostingUpdateView,
    JobPostingDeleteView,
    JobPostingListCreateView,
    JobPostingDetailUpdateDeleteView,
    JobApplicationCreateView,
    AppliedJobsListView,
    AllApplicationsView,
    JobApplicationStatusUpdateView,
    JobStatsListView,
    MyJobApplicationsView,
    CollegeJobListView,
    JobApplicationsListView,
    EnhancedJobListCreateView,
    EnhancedJobDetailView,
    EnhancedJobApplicationCreateView,
    JobApplicationEligibilityView,
    JobStatsView,
    CompanyStatsView,
    ApplicationStatsView,
    CompanyFormViewSet,
    CompanyFormDetailView,
    AdminJobPostingCreateView,
    JobPublishToggleView,
    AdminJobListView,
    CompanyJobsManagementView,
    # Enhanced Application Management Views
    EnhancedApplicationsListView,
    ApplicationDetailView,
    ApplicationExportView,
    StudentProfileFieldsView,
    BulkApplicationUpdateView,
    CalendarEventsView,
    PlacedStudentsView,
    PlacedStudentsExportView,
    PlacedStudentsPassoutYearsView,
    RecommendedJobsView,
)

# ATS Views
from .ats_views import (
    PipelineStageViewSet,
    RecruitmentPipelineViewSet,
    CandidateCardViewSet,
    KanbanBoardView,
    BulkMoveCandidatesView,
    ShareableLinkViewSet,
    SharedAccessView,
    InitializeATSView,
)

router = DefaultRouter()
router.register(r'forms', CompanyFormViewSet)
# ATS routers
router.register(r'ats/stages', PipelineStageViewSet)
router.register(r'ats/pipelines', RecruitmentPipelineViewSet)
router.register(r'ats/candidates', CandidateCardViewSet)
router.register(r'ats/links', ShareableLinkViewSet)

urlpatterns = [
    # Enhanced API endpoints (main endpoints)
    path('', EnhancedJobListCreateView.as_view(), name='enhanced-job-list-create'),
    path('create/', AdminJobPostingCreateView.as_view(), name='admin-job-posting-create'),
    path('<int:pk>/', EnhancedJobDetailView.as_view(), name='enhanced-job-detail'),
    path('<int:pk>/can-apply/', JobApplicationEligibilityView.as_view(), name='job-application-eligibility'),
    path('<int:pk>/toggle-publish/', JobPublishToggleView.as_view(), name='job-publish-toggle'),
    path('<int:job_id>/apply/', EnhancedJobApplicationCreateView.as_view(), name='enhanced-job-application-create'),
    path('<int:job_id>/applications/', JobApplicationsListView.as_view(), name='job-applications-list'),
    
    # Statistics endpoints
    path('stats/', JobStatsView.as_view(), name='job-stats-enhanced'),
    path('stats/companies/', CompanyStatsView.as_view(), name='company-stats'),
    path('stats/applications/', ApplicationStatsView.as_view(), name='application-stats'),
    
    # Legacy endpoints (kept for backward compatibility)
    path('legacy/', JobPostingListCreateView.as_view(), name='job-list-create'),
    path('legacy/<int:pk>/', JobPostingDetailUpdateDeleteView.as_view(), name='job-detail-update-delete'),
    path('<int:pk>/update/', JobPostingUpdateView.as_view(), name='job-posting-update'),
    path('<int:pk>/delete/', JobPostingDeleteView.as_view(), name='job-posting-delete'),
    
    # Application management
    path('applied/', AppliedJobsListView.as_view(), name='applied-jobs'),
    path('recommended/', RecommendedJobsView.as_view(), name='recommended-jobs'),
    path('my-applications/', MyJobApplicationsView.as_view(), name='my-applications'),
    
    # Admin views
    path('admin/', AdminJobListView.as_view(), name='admin-job-list'),
    path('admin/all-applications/', AllApplicationsView.as_view(), name='all-job-applications'),
    path('job-stats/', JobStatsListView.as_view(), name='job-stats'),
    path('applications/<int:pk>/update-status/', JobApplicationStatusUpdateView.as_view(), name='application-status-update'),
    path('forms/<uuid:pk>/', CompanyFormDetailView.as_view(), name='company-form-detail'),
    
    # Company job management
    path('company/<int:company_id>/jobs/', CompanyJobsManagementView.as_view(), name='company-jobs-management'),
    
    # Enhanced Application Management
    path('applications/', EnhancedApplicationsListView.as_view(), name='enhanced-applications-list'),
    path('applications/<int:pk>/', ApplicationDetailView.as_view(), name='application-detail'),
    path('applications/export/', ApplicationExportView.as_view(), name='applications-export'),
    path('applications/fields/', StudentProfileFieldsView.as_view(), name='profile-fields'),
    path('applications/bulk-update/', BulkApplicationUpdateView.as_view(), name='bulk-application-update'),
    
    # Placed Students
    path('placed-students/', PlacedStudentsView.as_view(), name='placed-students'),
    path('placed-students/export/', PlacedStudentsExportView.as_view(), name='placed-students-export'),
    path('placed-students/passout_years/', PlacedStudentsPassoutYearsView.as_view(), name='placed-students-passout-years'),
    
    # Calendar API
    path('calendar/events/', CalendarEventsView.as_view(), name='calendar-events'),
    
    # ATS (Applicant Tracking System) API
    path('ats/board/', KanbanBoardView.as_view(), name='ats-kanban-board'),
    path('ats/bulk-move/', BulkMoveCandidatesView.as_view(), name='ats-bulk-move'),
    path('ats/initialize/', InitializeATSView.as_view(), name='ats-initialize'),
    path('ats/shared/<str:token>/', SharedAccessView.as_view(), name='ats-shared-access'),
    
    # Forms API
    path('', include(router.urls)),
]

