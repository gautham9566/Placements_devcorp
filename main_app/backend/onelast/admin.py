"""
Custom admin site configuration for DevCorp Placements
"""
from django.contrib import admin
from unfold.sites import UnfoldAdminSite
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta
from django.db.models.functions import TruncDate, TruncMonth
import json


class DevCorpAdminSite(UnfoldAdminSite):
    """
    Custom admin site with enhanced branding and features
    """
    site_title = "DevCorp Placements Admin"
    site_header = "DevCorp Placement Management System"
    index_title = "Dashboard Overview"
    
    def index(self, request, extra_context=None):
        """
        Override index to add dashboard data
        """
        from accounts.models import User, StudentProfile
        from jobs.models import JobPosting, JobApplication
        from companies.models import Company
        
        extra_context = extra_context or {}
        
        # Get current date and calculate date ranges
        today = timezone.now()
        thirty_days_ago = today - timedelta(days=30)
        
        # Calculate statistics
        total_students = User.objects.filter(user_type='STUDENT').count()
        total_companies = Company.objects.count()
        total_jobs = JobPosting.objects.count()
        active_jobs = JobPosting.objects.filter(is_active=True, is_published=True).count()
        total_applications = JobApplication.objects.count()
        
        # Applications by status
        applications_by_status = list(
            JobApplication.objects.values('status')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        
        # Recent applications (last 30 days)
        recent_apps = list(
            JobApplication.objects.filter(
                applied_at__gte=thirty_days_ago
            )
            .annotate(date=TruncDate('applied_at'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
        )
        
        # Jobs by type
        jobs_by_type = list(
            JobPosting.objects.values('job_type')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        
        # Top companies by applications
        top_companies = list(
            Company.objects.annotate(
                app_count=Count('job_postings__applications')
            ).order_by('-app_count')[:5].values('name', 'app_count')
        )
        
        # Companies by tier
        companies_by_tier = list(
            Company.objects.values('tier')
            .annotate(count=Count('id'))
            .order_by('tier')
        )
        
        # Monthly job postings (last 6 months)
        six_months_ago = today - timedelta(days=180)
        monthly_jobs = list(
            JobPosting.objects.filter(
                created_at__gte=six_months_ago
            )
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )
        
        # Add dashboard data
        extra_context.update({
            'kpi': [
                {
                    'title': 'Total Students',
                    'metric': total_students,
                    'footer': 'Registered in system',
                },
                {
                    'title': 'Total Companies',
                    'metric': total_companies,
                    'footer': 'Partner companies',
                },
                {
                    'title': 'Active Jobs',
                    'metric': active_jobs,
                    'footer': f'Out of {total_jobs} total',
                },
                {
                    'title': 'Total Applications',
                    'metric': total_applications,
                    'footer': 'All time applications',
                },
            ],
            'progress': [
                {
                    'title': 'Job Application Rate',
                    'description': f'{total_applications} applications for {total_jobs} jobs',
                    'value': int((total_applications / total_jobs * 100) if total_jobs > 0 else 0),
                },
                {
                    'title': 'Active Job Percentage',
                    'description': f'{active_jobs} active out of {total_jobs} total',
                    'value': int((active_jobs / total_jobs * 100) if total_jobs > 0 else 0),
                },
            ],
            'chart': json.dumps([
                {
                    'title': 'Applications by Status',
                    'description': 'Distribution of application statuses',
                    'type': 'bar',
                    'data': {
                        'labels': [item['status'].replace('_', ' ').title() for item in applications_by_status],
                        'datasets': [
                            {
                                'label': 'Applications',
                                'data': [item['count'] for item in applications_by_status],
                                'backgroundColor': '#9333ea',
                            }
                        ],
                    },
                },
                {
                    'title': 'Jobs by Type',
                    'description': 'Job distribution by employment type',
                    'type': 'doughnut',
                    'data': {
                        'labels': [item['job_type'].replace('_', ' ').title() for item in jobs_by_type],
                        'datasets': [
                            {
                                'label': 'Jobs',
                                'data': [item['count'] for item in jobs_by_type],
                                'backgroundColor': [
                                    '#9333ea',
                                    '#7c3aed', 
                                    '#6d28d9',
                                    '#5b21b6',
                                ],
                            }
                        ],
                    },
                },
                {
                    'title': 'Recent Applications Trend',
                    'description': 'Applications in the last 30 days',
                    'type': 'line',
                    'data': {
                        'labels': [str(item['date']) for item in recent_apps],
                        'datasets': [
                            {
                                'label': 'Applications',
                                'data': [item['count'] for item in recent_apps],
                                'borderColor': '#9333ea',
                                'backgroundColor': 'rgba(147, 51, 234, 0.1)',
                                'fill': True,
                            }
                        ],
                    },
                },
                {
                    'title': 'Top Companies by Applications',
                    'description': 'Companies with most applications',
                    'type': 'bar',
                    'data': {
                        'labels': [item['name'] for item in top_companies],
                        'datasets': [
                            {
                                'label': 'Applications',
                                'data': [item['app_count'] for item in top_companies],
                                'backgroundColor': '#9333ea',
                            }
                        ],
                    },
                    'options': {
                        'indexAxis': 'y',
                    },
                },
                {
                    'title': 'Companies by Tier',
                    'description': 'Distribution of companies by tier',
                    'type': 'pie',
                    'data': {
                        'labels': [item['tier'] for item in companies_by_tier],
                        'datasets': [
                            {
                                'label': 'Companies',
                                'data': [item['count'] for item in companies_by_tier],
                                'backgroundColor': [
                                    '#9333ea',
                                    '#a855f7',
                                    '#c084fc',
                                ],
                            }
                        ],
                    },
                },
                {
                    'title': 'Monthly Job Postings',
                    'description': 'Job postings over the last 6 months',
                    'type': 'line',
                    'data': {
                        'labels': [item['month'].strftime('%Y-%m') if item['month'] else '' for item in monthly_jobs],
                        'datasets': [
                            {
                                'label': 'New Jobs',
                                'data': [item['count'] for item in monthly_jobs],
                                'borderColor': '#7c3aed',
                                'backgroundColor': 'rgba(124, 58, 237, 0.1)',
                                'fill': True,
                                'tension': 0.4,
                            }
                        ],
                    },
                },
            ]),
        })
        
        # Call parent index with enhanced context
        return super().index(request, extra_context)


# Replace default admin site
admin.site = DevCorpAdminSite()
admin.site.__class__ = DevCorpAdminSite
