"""
Custom admin site configuration for DevCorp Placements
"""
from django.contrib import admin
from unfold.sites import UnfoldAdminSite
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta
from django.db.models.functions import TruncDate, TruncMonth
from django.template.response import TemplateResponse
import json


class DevCorpAdminSite(UnfoldAdminSite):
    """
    Custom admin site with enhanced branding and features
    """
    site_title = "DevCorp Placements Admin"
    site_header = "DevCorp Placement Management System"
    index_title = "Dashboard Overview"
    # Force using our custom admin index template
    index_template = 'admin/index.html'
    
    def index(self, request, extra_context=None):
        """Custom index to inject dashboard context reliably.
        We build the context using each_context + app_list to avoid any framework
        overrides dropping our keys, then render the standard admin index template.
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
        
        # Build charts array incrementally
        dashboard_charts = []

        # Base charts
        dashboard_charts.extend([
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
        ])

        # Additional charts requested: students per year and branch-year
        students_by_passout_year = list(
            StudentProfile.objects.exclude(passout_year__isnull=True)
            .values('passout_year')
            .annotate(count=Count('id'))
            .order_by('passout_year')
        )

        students_by_joining_year = list(
            StudentProfile.objects.exclude(joining_year__isnull=True)
            .values('joining_year')
            .annotate(count=Count('id'))
            .order_by('joining_year')
        )

        students_by_branch = list(
            StudentProfile.objects.exclude(branch__isnull=True).exclude(branch='')
            .values('branch')
            .annotate(count=Count('id'))
            .order_by('branch')
        )

        # Branch vs Year (stacked bar: per-branch datasets over passout years)
        branch_year_rows = list(
            StudentProfile.objects.exclude(branch__isnull=True).exclude(branch='')
            .exclude(passout_year__isnull=True)
            .values('branch', 'passout_year')
            .annotate(count=Count('id'))
        )

        unique_years = sorted({row['passout_year'] for row in branch_year_rows})
        unique_branches = sorted({row['branch'] for row in branch_year_rows})

        # Build dataset per branch aligned with unique_years
        branch_datasets = []
        color_palette = [
            '#A855F7', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#22D3EE', '#F472B6', '#84CC16'
        ]
        branch_to_color = {b: color_palette[i % len(color_palette)] for i, b in enumerate(unique_branches)}

        for branch in unique_branches:
            counts_by_year = {row['passout_year']: row['count'] for row in branch_year_rows if row['branch'] == branch}
            data_points = [counts_by_year.get(y, 0) for y in unique_years]
            branch_datasets.append({
                'label': branch,
                'data': data_points,
                'backgroundColor': branch_to_color[branch],
                'stack': 'students',
            })

        # Append new charts
        if students_by_passout_year:
            dashboard_charts.append({
                'title': 'Students by Passout Year',
                'description': 'Number of students per passout year',
                'type': 'bar',
                'data': {
                    'labels': [str(item['passout_year']) for item in students_by_passout_year],
                    'datasets': [{
                        'label': 'Students',
                        'data': [item['count'] for item in students_by_passout_year],
                        'backgroundColor': '#A855F7',
                    }],
                },
                'options': {
                    'scales': { 'y': { 'beginAtZero': True } }
                }
            })

        if students_by_joining_year:
            dashboard_charts.append({
                'title': 'Students by Joining Year',
                'description': 'Number of students per joining year',
                'type': 'bar',
                'data': {
                    'labels': [str(item['joining_year']) for item in students_by_joining_year],
                    'datasets': [{
                        'label': 'Students',
                        'data': [item['count'] for item in students_by_joining_year],
                        'backgroundColor': '#3B82F6',
                    }],
                },
                'options': {
                    'scales': { 'y': { 'beginAtZero': True } }
                }
            })

        if students_by_branch:
            dashboard_charts.append({
                'title': 'Students by Branch',
                'description': 'Number of students per branch',
                'type': 'bar',
                'data': {
                    'labels': [item['branch'] or 'Not Set' for item in students_by_branch],
                    'datasets': [{
                        'label': 'Students',
                        'data': [item['count'] for item in students_by_branch],
                        'backgroundColor': '#10B981',
                    }],
                },
                'options': {
                    'indexAxis': 'y',
                    'scales': { 'x': { 'beginAtZero': True } }
                }
            })

        if unique_years and branch_datasets:
            dashboard_charts.append({
                'title': 'Branch Distribution by Passout Year',
                'description': 'Stacked bar chart of branches across passout years',
                'type': 'bar',
                'data': {
                    'labels': [str(y) for y in unique_years],
                    'datasets': branch_datasets,
                },
                'options': {
                    'plugins': { 'legend': { 'position': 'bottom' } },
                    'scales': {
                        'x': { 'stacked': True },
                        'y': { 'stacked': True, 'beginAtZero': True }
                    }
                }
            })

        # Prepare dashboard data (use unique keys to avoid conflicts)
        dashboard_context = {
            'dashboard_kpi': [
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
            'dashboard_progress': [
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
            'dashboard_chart_json': json.dumps(dashboard_charts),
        }

        # Build base context explicitly to avoid losing keys
        context = self.each_context(request)
        context.update({
            'title': self.index_title,
            'app_list': self.get_app_list(request),
        })
        context.update(dashboard_context)
        context.update(extra_context)

        # Always render our custom admin index template to ensure charts load
        return TemplateResponse(request, 'admin/index.html', context)

# Replace default admin site
admin.site = DevCorpAdminSite()
admin.site.__class__ = DevCorpAdminSite
