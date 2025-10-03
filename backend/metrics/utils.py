from django.db.models import Count, Q, F, Avg, Max, Min
from django.utils import timezone
from datetime import timedelta
import hashlib
import json

from .models import MetricsCache, PaginatedDataCache
from companies.models import Company
from accounts.models import StudentProfile
from jobs.models import JobPosting, JobApplication


def calculate_dashboard_stats(year=None):
    """
    Calculate dashboard statistics
    """
    # Base querysets
    job_queryset = JobPosting.objects.filter(is_active=True)
    application_queryset = JobApplication.objects.all()
    student_queryset = StudentProfile.objects.all()
    
    # Apply year filter if specified
    if year and year != 'All':
        try:
            year_int = int(year)
            # Filter students by passout year
            student_queryset = student_queryset.filter(passout_year=year_int)
            # Filter applications by student's passout year
            application_queryset = application_queryset.filter(
                applicant__student_profile__passout_year=year_int
            )
            # Note: Jobs are not filtered by year as total active jobs is global
        except (ValueError, TypeError):
            pass  # If year is invalid, use all data
    
    stats = {
        'total_jobs': job_queryset.count(),
        'total_applications': application_queryset.count(),
        'total_students': student_queryset.count(),
        'total_companies': Company.objects.count(),  # Companies are not filtered by year
        'active_jobs': job_queryset.filter(is_published=True).count(),
        'pending_applications': application_queryset.filter(status='APPLIED').count(),
        'hiring_companies': Company.objects.filter(
            job_postings__is_active=True
        ).distinct().count(),  # This might need adjustment for year filtering
        'placement_rate': calculate_placement_rate(year),
        'last_updated': timezone.now().isoformat()
    }
    
    return stats


def calculate_company_stats():
    """
    Calculate company-related statistics
    """
    stats = {
        'total': Company.objects.count(),
        'tier1': Company.objects.filter(tier='Tier 1').count(),
        'tier2': Company.objects.filter(tier='Tier 2').count(),
        'tier3': Company.objects.filter(tier='Tier 3').count(),
        'campus_recruiting': Company.objects.filter(campus_recruiting=True).count(),
        'with_active_jobs': Company.objects.filter(
            job_postings__is_active=True
        ).distinct().count(),
        'tier_distribution': list(Company.objects.values('tier').annotate(
            count=Count('id')
        )),
        'industry_distribution': list(Company.objects.values('industry').annotate(
            count=Count('id')
        ).order_by('-count')[:10]),
        'last_updated': timezone.now().isoformat()
    }
    
    return stats


def calculate_student_stats():
    """
    Calculate student-related statistics with enhanced metrics
    """
    current_year = timezone.now().year

    # Calculate GPA statistics manually since gpa is CharField
    total_gpa = 0
    gpa_count = 0
    gpa_ranges = {
        '9.0+': 0, '8.0-8.9': 0, '7.0-7.9': 0, 
        '6.0-6.9': 0, 'Below 6.0': 0
    }
    
    for student in StudentProfile.objects.exclude(gpa__isnull=True).exclude(gpa='').exclude(gpa='0.0'):
        try:
            gpa_value = float(student.gpa)
            total_gpa += gpa_value
            gpa_count += 1
            
            if gpa_value >= 9.0:
                gpa_ranges['9.0+'] += 1
            elif gpa_value >= 8.0:
                gpa_ranges['8.0-8.9'] += 1
            elif gpa_value >= 7.0:
                gpa_ranges['7.0-7.9'] += 1
            elif gpa_value >= 6.0:
                gpa_ranges['6.0-6.9'] += 1
            else:
                gpa_ranges['Below 6.0'] += 1
        except (ValueError, TypeError):
            continue
    
    avg_gpa = (total_gpa / gpa_count) if gpa_count > 0 else 0
    gpa_distribution = [{'gpa_range': k, 'count': v} for k, v in gpa_ranges.items()]

    # Calculate placement ready manually
    placement_ready = 0
    for student in StudentProfile.objects.filter(passout_year=current_year):
        try:
            if student.gpa and float(student.gpa) >= 6.0:
                placement_ready += 1
        except (ValueError, TypeError):
            continue

    stats = {
        'total': StudentProfile.objects.count(),
        'by_year': list(StudentProfile.objects.values('passout_year').annotate(
            count=Count('id')
        ).exclude(passout_year__isnull=True).order_by('passout_year')),
        'by_branch': list(StudentProfile.objects.values('branch').annotate(
            count=Count('id')
        ).exclude(branch__isnull=True).exclude(branch='').order_by('-count')[:10]),
        'current_year_students': StudentProfile.objects.filter(
            passout_year=current_year
        ).count(),
        'graduated_students': StudentProfile.objects.filter(
            passout_year__lt=current_year
        ).count(),
        'with_applications': StudentProfile.objects.filter(
            user__job_applications__isnull=False
        ).distinct().count(),
        'average_gpa': round(avg_gpa, 2),
        'gpa_distribution': gpa_distribution,
        'placement_ready': placement_ready,
        'last_updated': timezone.now().isoformat()
    }

    return stats


def calculate_department_stats():
    """
    Calculate department-wise statistics
    """
    current_year = timezone.now().year

    departments = StudentProfile.objects.values('branch').annotate(
        total_students=Count('id'),
        current_year_students=Count('id', filter=Q(passout_year=current_year)),
        avg_gpa=Avg('gpa'),
        with_applications=Count('id', filter=Q(user__job_applications__isnull=False), distinct=True),
        placed_students=Count('id', filter=Q(user__job_applications__status='HIRED'), distinct=True)
    ).order_by('-total_students')

    stats = {
        'departments': list(departments),
        'total_departments': departments.count(),
        'last_updated': timezone.now().isoformat()
    }

    return stats


def calculate_placement_stats():
    """
    Calculate placement-related statistics
    """
    current_year = timezone.now().year

    # Get placement statistics
    total_eligible = StudentProfile.objects.filter(passout_year=current_year).count()
    total_placed = JobApplication.objects.filter(
        status='HIRED',
        applicant__student_profile__passout_year=current_year
    ).values('applicant').distinct().count()

    placement_rate = (total_placed / total_eligible * 100) if total_eligible > 0 else 0

    # Company-wise placements
    company_placements = JobApplication.objects.filter(
        status='HIRED',
        applicant__student_profile__passout_year=current_year
    ).values('job__company__name', 'job__company__tier').annotate(
        count=Count('id')
    ).order_by('-count')[:10]

    # Department-wise placement rates
    dept_placements = StudentProfile.objects.filter(
        passout_year=current_year
    ).values('branch').annotate(
        total_students=Count('id'),
        placed_students=Count('id', filter=Q(user__job_applications__status='HIRED'), distinct=True)
    ).order_by('-placed_students')

    for dept in dept_placements:
        dept['placement_rate'] = (dept['placed_students'] / dept['total_students'] * 100) if dept['total_students'] > 0 else 0

    stats = {
        'total_eligible': total_eligible,
        'total_placed': total_placed,
        'placement_rate': round(placement_rate, 2),
        'company_wise_placements': list(company_placements),
        'department_wise_placements': list(dept_placements),
        'last_updated': timezone.now().isoformat()
    }

    return stats


def calculate_job_stats():
    """
    Calculate job-related statistics
    """
    stats = {
        'total': JobPosting.objects.count(),
        'active': JobPosting.objects.filter(is_active=True).count(),
        'published': JobPosting.objects.filter(is_published=True).count(),
        'internships': JobPosting.objects.filter(job_type='INTERNSHIP').count(),
        'full_time': JobPosting.objects.filter(job_type='FULL_TIME').count(),
        'on_campus': JobPosting.objects.filter(on_campus=True).count(),
        'remote_eligible': JobPosting.objects.filter(remote_eligible=True).count(),
        'by_type': list(JobPosting.objects.values('job_type').annotate(
            count=Count('id')
        )),
        'by_location': list(JobPosting.objects.values('location').annotate(
            count=Count('id')
        ).order_by('-count')[:10]),
        'expiring_soon': JobPosting.objects.filter(
            application_deadline__gte=timezone.now(),
            application_deadline__lte=timezone.now() + timedelta(days=7),
            is_active=True
        ).count(),
        'last_updated': timezone.now().isoformat()
    }
    
    return stats


def calculate_application_stats():
    """
    Calculate application-related statistics
    """
    stats = {
        'total': JobApplication.objects.count(),
        'by_status': list(JobApplication.objects.values('status').annotate(
            count=Count('id')
        )),
        'recent_applications': JobApplication.objects.filter(
            applied_at__gte=timezone.now() - timedelta(days=7)
        ).count(),
        'pending_review': JobApplication.objects.filter(
            status__in=['APPLIED', 'UNDER_REVIEW']
        ).count(),
        'interviews_scheduled': JobApplication.objects.filter(
            status='SHORTLISTED'
        ).count(),
        'hired': JobApplication.objects.filter(status='HIRED').count(),
        'rejected': JobApplication.objects.filter(status='REJECTED').count(),
        'last_updated': timezone.now().isoformat()
    }
    
    return stats


def calculate_placement_rate(year=None):
    """
    Calculate overall placement rate
    """
    # Base queryset for students
    student_queryset = StudentProfile.objects.all()
    
    if year and year != 'All':
        try:
            year_int = int(year)
            student_queryset = student_queryset.filter(passout_year=year_int)
        except (ValueError, TypeError):
            pass  # If year is invalid, use all data
    
    total_eligible = student_queryset.filter(
        passout_year__lte=timezone.now().year
    ).count()
    
    if total_eligible == 0:
        return 0.0
        
    placed = JobApplication.objects.filter(
        status='HIRED',
        applicant__student_profile__passout_year__lte=timezone.now().year
    ).values('applicant').distinct().count()
    
    # If year is specified, also filter placed students by year
    if year and year != 'All':
        try:
            year_int = int(year)
            placed = JobApplication.objects.filter(
                status='HIRED',
                applicant__student_profile__passout_year=year_int,
                applicant__student_profile__passout_year__lte=timezone.now().year
            ).values('applicant').distinct().count()
        except (ValueError, TypeError):
            pass
    
    return round((placed / total_eligible) * 100, 2)


def get_or_calculate_metric(metric_type, metric_key='default', force_refresh=False, **kwargs):
    """
    Get metric from cache or calculate if not available/expired
    """
    if not force_refresh:
        cached_data = MetricsCache.get_cached_metric(metric_type, metric_key)
        if cached_data:
            return cached_data
    
    # Calculate fresh data
    calculators = {
        'dashboard_stats': calculate_dashboard_stats,
        'company_stats': calculate_company_stats,
        'student_stats': calculate_student_stats,
        'enhanced_student_stats': calculate_enhanced_student_stats,
        'student_department_breakdown': calculate_student_department_breakdown,
        'student_year_analysis': calculate_student_year_analysis,
        'job_stats': calculate_job_stats,
        'application_stats': calculate_application_stats,
        'department_stats': calculate_department_stats,
        'placement_stats': calculate_placement_stats,
    }
    
    calculator = calculators.get(metric_type)
    if not calculator:
        return None
    
    # Pass kwargs to calculator if it supports them
    try:
        import inspect
        sig = inspect.signature(calculator)
        if len(sig.parameters) > 0:
            fresh_data = calculator(**kwargs)
        else:
            fresh_data = calculator()
    except TypeError:
        # Fallback for calculators that don't accept parameters
        fresh_data = calculator()
    
    # Cache the fresh data
    MetricsCache.update_metric(metric_type, metric_key, fresh_data)
    
    return fresh_data


def generate_filter_hash(filters):
    """
    Generate a hash for filter parameters to use as cache key
    """
    # Sort the filters to ensure consistent hash
    sorted_filters = json.dumps(filters, sort_keys=True)
    return hashlib.md5(sorted_filters.encode()).hexdigest()


def invalidate_related_metrics(*data_types):
    """
    Invalidate metrics when related data changes
    """
    metric_mappings = {
        'company': ['dashboard_stats', 'company_stats'],
        'student': [
            'dashboard_stats', 
            'student_stats', 
            'enhanced_student_stats',
            'student_department_breakdown',
            'student_year_analysis',
            'department_stats',
            'placement_stats'
        ],
        'job': ['dashboard_stats', 'job_stats', 'company_stats'],
        'application': ['dashboard_stats', 'application_stats', 'student_stats', 'placement_stats'],
    }
    
    for data_type in data_types:
        metrics_to_invalidate = metric_mappings.get(data_type, [])
        for metric_type in metrics_to_invalidate:
            MetricsCache.invalidate_metric(metric_type)


def invalidate_paginated_cache(*cache_types):
    """
    Invalidate paginated cache when data changes
    """
    for cache_type in cache_types:
        PaginatedDataCache.invalidate_cache(cache_type)


def get_cached_paginated_data(cache_type, filters, page, page_size, 
                              data_fetcher, force_refresh=False):
    """
    Generic function to get cached paginated data with memory optimization
    
    Args:
        cache_type: Type of cache (students_list, companies_list, etc.)
        filters: Filter parameters as dict
        page: Page number
        page_size: Items per page
        data_fetcher: Function that fetches fresh data when cache miss
        force_refresh: Force refresh cache
    
    Returns:
        Dict with data, pagination info
    """
    filter_hash = generate_filter_hash(filters)
    
    if not force_refresh:
        cached_data = PaginatedDataCache.get_cached_page(
            cache_type, filter_hash, page, page_size
        )
        if cached_data:
            return {
                'results': cached_data['data'],
                'pagination': {
                    'page': cached_data['page_number'],
                    'page_size': cached_data['page_size'],
                    'total_count': cached_data['total_count'],
                    'total_pages': (cached_data['total_count'] + page_size - 1) // page_size,
                    'has_next': page < ((cached_data['total_count'] + page_size - 1) // page_size),
                    'has_previous': page > 1,
                }
            }
    
    # Fetch fresh data - this should only fetch the current page
    fresh_data = data_fetcher(filters, page, page_size)
    
    # Cache the fresh data
    if 'data' in fresh_data and 'total_count' in fresh_data:
        PaginatedDataCache.update_cached_page(
            cache_type, filter_hash, page, page_size,
            fresh_data['data'], fresh_data['total_count']
        )
        
        return {
            'results': fresh_data['data'],
            'pagination': {
                'page': fresh_data['page'],
                'page_size': fresh_data['page_size'],
                'total_count': fresh_data['total_count'],
                'total_pages': (fresh_data['total_count'] + page_size - 1) // page_size,
                'has_next': fresh_data['page'] < ((fresh_data['total_count'] + page_size - 1) // page_size),
                'has_previous': fresh_data['page'] > 1,
            }
        }
    
    return fresh_data


def calculate_enhanced_student_stats():
    """
    Calculate comprehensive student statistics including all requested metrics:
    - Total students
    - Departments
    - Active Years
    - High Performers
    - Department wise Number of students
    - Number of students present in the particular year
    """
    current_year = timezone.now().year
    
    # Basic counts
    total_students = StudentProfile.objects.count()
    active_departments = StudentProfile.objects.exclude(branch__isnull=True).exclude(branch='').values('branch').distinct().count()
    
    # Years with students
    active_years = list(StudentProfile.objects.exclude(
        passout_year__isnull=True
    ).values_list('passout_year', flat=True).distinct().order_by('passout_year'))
    
    # Manual calculation for GPA-based metrics since gpa is CharField
    high_performers = 0
    total_gpa = 0
    gpa_count = 0
    
    # Get all students and calculate GPA metrics manually
    for student in StudentProfile.objects.exclude(gpa__isnull=True).exclude(gpa='').exclude(gpa='0.0'):
        try:
            gpa_value = float(student.gpa)
            total_gpa += gpa_value
            gpa_count += 1
            if gpa_value >= 8.5:
                high_performers += 1
        except (ValueError, TypeError):
            continue
    
    avg_gpa = (total_gpa / gpa_count) if gpa_count > 0 else 0
    
    # Department wise student counts
    department_wise_stats = list(StudentProfile.objects.values('branch').annotate(
        total_students=Count('id'),
        current_year_students=Count('id', filter=Q(passout_year=current_year)),
        with_applications=Count('id', filter=Q(user__job_applications__isnull=False), distinct=True),
        placed_students=Count('id', filter=Q(user__job_applications__status='HIRED'), distinct=True)
    ).exclude(branch__isnull=True).exclude(branch='').order_by('-total_students'))
    
    # Calculate additional metrics for each department
    for dept in department_wise_stats:
        dept_students = StudentProfile.objects.filter(branch=dept['branch'])
        dept_gpa_sum = 0
        dept_gpa_count = 0
        dept_high_performers = 0
        
        for student in dept_students.exclude(gpa__isnull=True).exclude(gpa='').exclude(gpa='0.0'):
            try:
                gpa_value = float(student.gpa)
                dept_gpa_sum += gpa_value
                dept_gpa_count += 1
                if gpa_value >= 8.5:
                    dept_high_performers += 1
            except (ValueError, TypeError):
                continue
        
        dept['avg_gpa'] = round(dept_gpa_sum / dept_gpa_count, 2) if dept_gpa_count > 0 else 0
        dept['high_performers'] = dept_high_performers
        dept['placement_rate'] = round((dept['placed_students'] / dept['total_students']) * 100, 2) if dept['total_students'] > 0 else 0
    
    # Year wise student counts
    year_wise_stats = list(StudentProfile.objects.values('passout_year').annotate(
        total_students=Count('id'),
        with_applications=Count('id', filter=Q(user__job_applications__isnull=False), distinct=True),
        placed_students=Count('id', filter=Q(user__job_applications__status='HIRED'), distinct=True)
    ).exclude(passout_year__isnull=True).order_by('passout_year'))
    
    # Calculate additional metrics for each year
    for year in year_wise_stats:
        year_students = StudentProfile.objects.filter(passout_year=year['passout_year'])
        year_gpa_sum = 0
        year_gpa_count = 0
        year_high_performers = 0
        
        for student in year_students.exclude(gpa__isnull=True).exclude(gpa='').exclude(gpa='0.0'):
            try:
                gpa_value = float(student.gpa)
                year_gpa_sum += gpa_value
                year_gpa_count += 1
                if gpa_value >= 8.5:
                    year_high_performers += 1
            except (ValueError, TypeError):
                continue
        
        year['avg_gpa'] = round(year_gpa_sum / year_gpa_count, 2) if year_gpa_count > 0 else 0
        year['high_performers'] = year_high_performers
        year['placement_rate'] = round((year['placed_students'] / year['total_students']) * 100, 2) if year['total_students'] > 0 else 0
    
    # GPA distribution - manual calculation
    gpa_ranges = {
        '9.0+': 0, '8.5-8.9': 0, '8.0-8.4': 0, '7.5-7.9': 0,
        '7.0-7.4': 0, '6.5-6.9': 0, '6.0-6.4': 0, 'Below 6.0': 0
    }
    
    for student in StudentProfile.objects.exclude(gpa__isnull=True).exclude(gpa='').exclude(gpa='0.0'):
        try:
            gpa_value = float(student.gpa)
            if gpa_value >= 9.0:
                gpa_ranges['9.0+'] += 1
            elif gpa_value >= 8.5:
                gpa_ranges['8.5-8.9'] += 1
            elif gpa_value >= 8.0:
                gpa_ranges['8.0-8.4'] += 1
            elif gpa_value >= 7.5:
                gpa_ranges['7.5-7.9'] += 1
            elif gpa_value >= 7.0:
                gpa_ranges['7.0-7.4'] += 1
            elif gpa_value >= 6.5:
                gpa_ranges['6.5-6.9'] += 1
            elif gpa_value >= 6.0:
                gpa_ranges['6.0-6.4'] += 1
            else:
                gpa_ranges['Below 6.0'] += 1
        except (ValueError, TypeError):
            continue
    
    gpa_distribution = [{'gpa_range': k, 'count': v} for k, v in gpa_ranges.items() if v > 0]
    
    # Students ready for placement (current year + good GPA)
    placement_ready = 0
    for student in StudentProfile.objects.filter(passout_year=current_year):
        try:
            if student.gpa and float(student.gpa) >= 6.0:
                placement_ready += 1
        except (ValueError, TypeError):
            continue
    
    # Application statistics
    total_applications = StudentProfile.objects.filter(
        user__job_applications__isnull=False
    ).distinct().count()
    
    # Top performing departments by average GPA
    top_departments_by_gpa = sorted(
        [dept for dept in department_wise_stats if dept['avg_gpa'] > 0 and dept['total_students'] >= 5],
        key=lambda x: x['avg_gpa'],
        reverse=True
    )[:5]
    
    # Find highest and lowest GPA
    highest_gpa = 0
    lowest_gpa = 10
    for student in StudentProfile.objects.exclude(gpa__isnull=True).exclude(gpa='').exclude(gpa='0.0'):
        try:
            gpa_value = float(student.gpa)
            highest_gpa = max(highest_gpa, gpa_value)
            lowest_gpa = min(lowest_gpa, gpa_value)
        except (ValueError, TypeError):
            continue
    
    if lowest_gpa == 10:  # No valid GPA found
        lowest_gpa = 0
    
    stats = {
        'overview': {
            'total_students': total_students,
            'active_departments': active_departments,
            'active_years': len(active_years),
            'high_performers': high_performers,
            'placement_ready': placement_ready,
            'with_applications': total_applications,
            'high_performer_percentage': round((high_performers / total_students * 100), 2) if total_students > 0 else 0,
        },
        'departments': {
            'total_departments': active_departments,
            'department_wise_data': department_wise_stats,
            'top_departments_by_gpa': top_departments_by_gpa,
        },
        'years': {
            'active_years': active_years,
            'year_wise_data': year_wise_stats,
            'current_year': current_year,
            'current_year_students': StudentProfile.objects.filter(passout_year=current_year).count(),
        },
        'performance': {
            'gpa_distribution': gpa_distribution,
            'average_gpa': round(avg_gpa, 2),
            'highest_gpa': highest_gpa,
            'lowest_gpa': lowest_gpa,
            'high_performers': high_performers,
        },
        'trends': {
            'yearly_intake': year_wise_stats,
            'department_growth': department_wise_stats,
        },
        'last_updated': timezone.now().isoformat()
    }
    
    return stats


def calculate_student_department_breakdown():
    """
    Calculate detailed department-wise breakdown for students
    """
    departments = StudentProfile.objects.values('branch').annotate(
        total_students=Count('id'),
        with_resume=Count('id', filter=Q(resume__isnull=False)),
        with_applications=Count('id', filter=Q(user__job_applications__isnull=False), distinct=True),
        placed_students=Count('id', filter=Q(user__job_applications__status='HIRED'), distinct=True)
    ).exclude(branch__isnull=True).exclude(branch='').order_by('-total_students')
    
    # Add calculated fields by processing each department manually
    for dept in departments:
        total = dept['total_students']
        dept_students = StudentProfile.objects.filter(branch=dept['branch'])
        
        # Calculate GPA-related metrics manually
        gpa_sum = 0
        gpa_count = 0
        high_performers = 0
        good_performers = 0
        average_performers = 0
        poor_performers = 0
        max_gpa = 0
        min_gpa = 10
        
        for student in dept_students.exclude(gpa__isnull=True).exclude(gpa='').exclude(gpa='0.0'):
            try:
                gpa_value = float(student.gpa)
                gpa_sum += gpa_value
                gpa_count += 1
                max_gpa = max(max_gpa, gpa_value)
                min_gpa = min(min_gpa, gpa_value)
                
                if gpa_value >= 8.5:
                    high_performers += 1
                elif gpa_value >= 7.0:
                    good_performers += 1
                elif gpa_value >= 6.0:
                    average_performers += 1
                else:
                    poor_performers += 1
            except (ValueError, TypeError):
                continue
        
        # Set calculated values
        dept['avg_gpa'] = round(gpa_sum / gpa_count, 2) if gpa_count > 0 else 0
        dept['max_gpa'] = max_gpa if max_gpa > 0 else 0
        dept['min_gpa'] = min_gpa if min_gpa < 10 else 0
        dept['high_performers'] = high_performers
        dept['good_performers'] = good_performers
        dept['average_performers'] = average_performers
        dept['poor_performers'] = poor_performers
        
        # Calculate percentages
        if total > 0:
            dept['high_performer_percentage'] = round((high_performers / total) * 100, 2)
            dept['placement_rate'] = round((dept['placed_students'] / total) * 100, 2)
            dept['application_rate'] = round((dept['with_applications'] / total) * 100, 2)
            dept['resume_completion_rate'] = round((dept['with_resume'] / total) * 100, 2)
        else:
            dept['high_performer_percentage'] = 0
            dept['placement_rate'] = 0
            dept['application_rate'] = 0
            dept['resume_completion_rate'] = 0
    
    return {
        'departments': list(departments),
        'last_updated': timezone.now().isoformat()
    }


def calculate_student_year_analysis(department=None):
    """
    Calculate year-wise student analysis
    """
    current_year = timezone.now().year
    
    # Base queryset
    queryset = StudentProfile.objects.all()
    
    # Filter by department if specified
    if department:
        queryset = queryset.filter(branch__iexact=department)
    
    years = queryset.values('passout_year').annotate(
        total_students=Count('id'),
        with_applications=Count('id', filter=Q(user__job_applications__isnull=False), distinct=True),
        placed_students=Count('id', filter=Q(user__job_applications__status='HIRED'), distinct=True),
        departments_count=Count('branch', distinct=True),
        male_students=Count('id', filter=Q(gender='Male')),
        female_students=Count('id', filter=Q(gender='Female'))
    ).exclude(passout_year__isnull=True).order_by('passout_year')
    
    # Add calculated fields by processing each year manually
    for year in years:
        total = year['total_students']
        year_queryset = queryset.filter(passout_year=year['passout_year'])
        
        # Calculate GPA-related metrics manually
        gpa_sum = 0
        gpa_count = 0
        high_performers = 0
        
        for student in year_queryset.exclude(gpa__isnull=True).exclude(gpa='').exclude(gpa='0.0'):
            try:
                gpa_value = float(student.gpa)
                gpa_sum += gpa_value
                gpa_count += 1
                if gpa_value >= 8.5:
                    high_performers += 1
            except (ValueError, TypeError):
                continue
        
        # Set calculated values
        year['avg_gpa'] = round(gpa_sum / gpa_count, 2) if gpa_count > 0 else 0
        year['high_performers'] = high_performers
        
        # Calculate percentages
        if total > 0:
            year['placement_rate'] = round((year['placed_students'] / total) * 100, 2)
            year['application_rate'] = round((year['with_applications'] / total) * 100, 2)
            year['high_performer_percentage'] = round((high_performers / total) * 100, 2)
            year['male_percentage'] = round((year['male_students'] / total) * 100, 2)
            year['female_percentage'] = round((year['female_students'] / total) * 100, 2)
        else:
            year['placement_rate'] = 0
            year['application_rate'] = 0
            year['high_performer_percentage'] = 0
            year['male_percentage'] = 0
            year['female_percentage'] = 0
        
        # Classify year status
        if year['passout_year'] and year['passout_year'] < current_year:
            year['status'] = 'graduated'
        elif year['passout_year'] == current_year:
            year['status'] = 'graduating'
        else:
            year['status'] = 'current'
    
    return {
        'years': list(years),
        'current_year': current_year,
        'department_filter': department,
        'last_updated': timezone.now().isoformat()
    }
