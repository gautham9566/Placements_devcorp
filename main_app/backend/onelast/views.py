"""
Dashboard views and callbacks for DevCorp Placements Admin
"""
from django.db.models import Count, Q
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from datetime import timedelta
from django.contrib.admin.views.decorators import staff_member_required
from django.shortcuts import render
from django.db.models.functions import TruncDate, TruncMonth
import json

from accounts.models import User, StudentProfile
from jobs.models import JobPosting, JobApplication
from companies.models import Company


@staff_member_required
def dashboard_overview(request):
    """
    Dashboard overview page with charts and KPIs
    """
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
    
    context = {
        'title': 'Dashboard Overview',
        'site_title': 'DevCorp Placements',
        'site_header': 'DevCorp Placement Management System',
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
        'chart': [
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
        ],
    }
    
    # Serialize chart data to JSON for JavaScript
    context['chart'] = json.dumps(context['chart'])
    
    return render(request, 'admin/dashboard_overview.html', context)


def dashboard_callback(request, context):
    """
    Callback to add dashboard widgets using Unfold's built-in components
    """
    from accounts.models import StudentProfile
    from jobs.models import JobPosting, JobApplication
    from companies.models import Company
    
    # Get statistics
    total_students = StudentProfile.objects.count()
    total_companies = Company.objects.count()
    active_jobs = JobPosting.objects.filter(is_active=True).count()
    total_applications = JobApplication.objects.count()
    
    # Applications by status
    applications_by_status = JobApplication.objects.values('status').annotate(
        count=Count('id')
    ).order_by('status')
    
    # Recent applications (last 7 days)
    seven_days_ago = timezone.now() - timedelta(days=7)
    recent_applications = JobApplication.objects.filter(
        applied_at__gte=seven_days_ago
    ).count()
    
    # Students by branch (top 5)
    students_by_branch = StudentProfile.objects.values('branch').annotate(
        count=Count('id')
    ).order_by('-count')[:5]
    
    # Jobs by type
    jobs_by_type = JobPosting.objects.filter(is_active=True).values('job_type').annotate(
        count=Count('id')
    ).order_by('job_type')
    
    # Add dashboard widgets to context
    context.update({
        "dashboard_widgets": [
        {
            "layout": {
                "xs": "col-span-12",
                "sm": "col-span-6",
                "md": "col-span-6",
                "lg": "col-span-3",
                "xl": "col-span-3",
            },
            "kpi": {
                "title": "Total Students",
                "metric": total_students,
                "footer": f"<strong>{total_students}</strong> registered students",
                "chart": None,
                "icon": "school",
            },
        },
        {
            "layout": {
                "xs": "col-span-12",
                "sm": "col-span-6",
                "md": "col-span-6",
                "lg": "col-span-3",
                "xl": "col-span-3",
            },
            "kpi": {
                "title": "Total Companies",
                "metric": total_companies,
                "footer": f"<strong>{total_companies}</strong> registered companies",
                "chart": None,
                "icon": "business",
            },
        },
        {
            "layout": {
                "xs": "col-span-12",
                "sm": "col-span-6",
                "md": "col-span-6",
                "lg": "col-span-3",
                "xl": "col-span-3",
            },
            "kpi": {
                "title": "Active Jobs",
                "metric": active_jobs,
                "footer": f"<strong>{active_jobs}</strong> active job postings",
                "chart": None,
                "icon": "work",
            },
        },
        {
            "layout": {
                "xs": "col-span-12",
                "sm": "col-span-6",
                "md": "col-span-6",
                "lg": "col-span-3",
                "xl": "col-span-3",
            },
            "kpi": {
                "title": "Applications",
                "metric": total_applications,
                "footer": f"<strong>{recent_applications}</strong> in last 7 days",
                "chart": None,
                "icon": "description",
            },
        },
        {
            "layout": {
                "xs": "col-span-12",
                "sm": "col-span-12",
                "md": "col-span-6",
                "lg": "col-span-6",
                "xl": "col-span-6",
            },
            "chart": {
                "title": "Applications by Status",
                "description": "Distribution of job applications",
                "type": "doughnut",
                "data": {
                    "labels": [item['status'] for item in applications_by_status],
                    "datasets": [
                        {
                            "label": "Applications",
                            "data": [item['count'] for item in applications_by_status],
                            "backgroundColor": [
                                "#A855F7",
                                "#3B82F6", 
                                "#10B981",
                                "#F59E0B",
                                "#EF4444",
                                "#6366F1",
                            ],
                        }
                    ],
                },
                "options": {
                    "plugins": {
                        "legend": {
                            "position": "bottom",
                        }
                    }
                },
            },
        },
        {
            "layout": {
                "xs": "col-span-12",
                "sm": "col-span-12",
                "md": "col-span-6",
                "lg": "col-span-6",
                "xl": "col-span-6",
            },
            "chart": {
                "title": "Jobs by Type",
                "description": "Active jobs distribution",
                "type": "pie",
                "data": {
                    "labels": [item['job_type'] for item in jobs_by_type],
                    "datasets": [
                        {
                            "label": "Jobs",
                            "data": [item['count'] for item in jobs_by_type],
                            "backgroundColor": [
                                "#A855F7",
                                "#3B82F6",
                                "#10B981",
                                "#F59E0B",
                            ],
                        }
                    ],
                },
                "options": {
                    "plugins": {
                        "legend": {
                            "position": "bottom",
                        }
                    }
                },
            },
        },
        {
            "layout": {
                "xs": "col-span-12",
                "sm": "col-span-12",
                "md": "col-span-12",
                "lg": "col-span-12",
                "xl": "col-span-12",
            },
            "chart": {
                "title": "Students by Branch",
                "description": "Top 5 branches by student count",
                "type": "bar",
                "data": {
                    "labels": [item['branch'] or 'Not Set' for item in students_by_branch],
                    "datasets": [
                        {
                            "label": "Students",
                            "data": [item['count'] for item in students_by_branch],
                            "backgroundColor": "#A855F7",
                        }
                    ],
                },
                "options": {
                    "scales": {
                        "y": {
                            "beginAtZero": True
                        }
                    },
                    "plugins": {
                        "legend": {
                            "display": False
                        }
                    }
                },
            },
        },
    ]
    })
    
    # Return None to use default context (widgets will be added from context)
    return None
