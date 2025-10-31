from django.urls import path
from . import views

urlpatterns = [
    # Cached metrics endpoints
    path('metrics/', views.CachedMetricsView.as_view(), name='cached-metrics'),
    path('metrics/application-timeline/', views.ApplicationTimelineView.as_view(), name='application-timeline'),
    path('metrics/cache-status/', views.CacheStatusView.as_view(), name='cache-status'),
    
    # Enhanced student metrics endpoints
    path('metrics/students/enhanced/', views.EnhancedStudentMetricsView.as_view(), name='enhanced-student-metrics'),
    path('metrics/students/departments/', views.StudentDepartmentStatsView.as_view(), name='student-department-stats'),
    path('metrics/students/years/', views.StudentYearStatsView.as_view(), name='student-year-stats'),
    path('metrics/students/performance/', views.StudentPerformanceAnalyticsView.as_view(), name='student-performance-analytics'),
    
    # Cached list endpoints with pagination
    path('cached/companies/', views.CachedCompanyListView.as_view(), name='cached-companies'),
    path('cached/students/', views.CachedStudentListView.as_view(), name='cached-students'),
    path('cached/jobs/', views.CachedJobListView.as_view(), name='cached-jobs'),
]
