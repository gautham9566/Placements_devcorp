from django.db.models import Count, Q, F, Avg, Max, Min
from django.utils import timezone
from datetime import timedelta
import hashlib
import json

from .models import MetricsCache, PaginatedDataCache
from companies.models import Company
from accounts.models import StudentProfile, YearManagement, BranchManagement
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
    else:
        # When no specific year is requested, filter by active years only
        active_years = YearManagement.get_active_years()
        if active_years:
            student_queryset = student_queryset.filter(passout_year__in=active_years)
            application_queryset = application_queryset.filter(
                applicant__student_profile__passout_year__in=active_years
            )
    
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

    # Filter by active years only
    active_years = YearManagement.get_active_years()
    base_queryset = StudentProfile.objects.filter(passout_year__in=active_years) if active_years else StudentProfile.objects.all()

    # Calculate GPA statistics manually since gpa is CharField
    total_gpa = 0
    gpa_count = 0
    gpa_ranges = {
        '9.0+': 0, '8.0-8.9': 0, '7.0-7.9': 0, 
        '6.0-6.9': 0, 'Below 6.0': 0
    }
    
    for student in base_queryset.exclude(gpa__isnull=True).exclude(gpa='').exclude(gpa='0.0'):
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

    # Calculate placement ready manually (only for current year within active years)
    placement_ready = 0
    if current_year in active_years:
        for student in base_queryset.filter(passout_year=current_year):
            try:
                if student.gpa and float(student.gpa) >= 6.0:
                    placement_ready += 1
            except (ValueError, TypeError):
                continue

    stats = {
        'total': base_queryset.count(),
        'by_year': list(base_queryset.values('passout_year').annotate(
            count=Count('id')
        ).exclude(passout_year__isnull=True).order_by('passout_year')),
        'by_branch': list(base_queryset.values('branch').annotate(
            count=Count('id')
        ).exclude(branch__isnull=True).exclude(branch='').order_by('-count')[:10]),
        'current_year_students': base_queryset.filter(
            passout_year=current_year
        ).count() if current_year in active_years else 0,
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

    # Filter by active years only
    active_years = YearManagement.get_active_years()
    base_queryset = StudentProfile.objects.filter(passout_year__in=active_years) if active_years else StudentProfile.objects.all()

    departments = base_queryset.values('branch').annotate(
        total_students=Count('id'),
        current_year_students=Count('id', filter=Q(passout_year=current_year)) if current_year in active_years else 0,
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

    # Filter by active years only
    active_years = YearManagement.get_active_years()
    
    # Get placement statistics (only if current year is active)
    if current_year in active_years:
        total_eligible = StudentProfile.objects.filter(passout_year=current_year).count()
        total_placed = JobApplication.objects.filter(
            status='HIRED',
            applicant__student_profile__passout_year=current_year
        ).values('applicant').distinct().count()
    else:
        total_eligible = 0
        total_placed = 0

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
    
    # Filter by active years only (consistent with other metric functions)
    active_years = YearManagement.get_active_years()
    base_queryset = StudentProfile.objects.filter(passout_year__in=active_years) if active_years else StudentProfile.objects.all()
    
    # DEBUG: Print what we're working with
    print(f"DEBUG: Active years: {active_years}")
    print(f"DEBUG: Base queryset count: {base_queryset.count()}")
    
    # Basic counts
    total_students = base_queryset.count()
    active_departments = base_queryset.exclude(branch__isnull=True).exclude(branch='').values('branch').distinct().count()
    
    # Years with students
    active_years_list = list(base_queryset.exclude(
        passout_year__isnull=True
    ).values_list('passout_year', flat=True).distinct().order_by('passout_year'))
    
    # Manual calculation for GPA-based metrics since gpa is CharField
    high_performers = 0
    total_gpa = 0
    gpa_count = 0
    
    # Get all students and calculate GPA metrics manually
    for student in base_queryset.exclude(gpa__isnull=True).exclude(gpa='').exclude(gpa='0.0'):
        try:
            gpa_value = float(student.gpa)
            total_gpa += gpa_value
            gpa_count += 1
            if gpa_value >= 8.5:
                high_performers += 1
        except (ValueError, TypeError):
            continue
    
    avg_gpa = (total_gpa / gpa_count) if gpa_count > 0 else 0
    
    # Department wise student counts - DEBUG: Manual counting
    print("DEBUG: Manual department counts from base_queryset:")
    all_departments = base_queryset.exclude(branch__isnull=True).exclude(branch='').values_list('branch', flat=True).distinct()
    manual_counts = {}
    for dept in all_departments:
        count = base_queryset.filter(branch=dept).count()
        manual_counts[dept] = count
        print(f"DEBUG: {dept}: {count} students")
    
    # Use manual counts instead of annotation
    department_wise_stats = []
    for dept_name, count in manual_counts.items():
        dept_data = {
            'branch': dept_name,
            'total_students': count,
            'current_year_students': base_queryset.filter(branch=dept_name, passout_year=current_year).count(),
            'with_applications': base_queryset.filter(branch=dept_name).filter(user__job_applications__isnull=False).distinct().count(),
            'placed_students': base_queryset.filter(branch=dept_name).filter(user__job_applications__status='HIRED').distinct().count()
        }
        department_wise_stats.append(dept_data)
    
    # Sort by total_students descending
    department_wise_stats.sort(key=lambda x: x['total_students'], reverse=True)
    
    # Calculate additional metrics for each department
    for dept in department_wise_stats:
        dept_students = base_queryset.filter(branch=dept['branch'])
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
    # IMPORTANT: Use distinct=True for all counts to avoid duplicates from JOIN operations
    year_wise_stats = list(base_queryset.values('passout_year').annotate(
        total_students=Count('id', distinct=True),
        with_applications=Count('id', filter=Q(user__job_applications__isnull=False), distinct=True),
        placed_students=Count('id', filter=Q(user__job_applications__status='HIRED'), distinct=True)
    ).exclude(passout_year__isnull=True).order_by('passout_year'))
    
    # Calculate additional metrics for each year
    for year in year_wise_stats:
        year_students = base_queryset.filter(passout_year=year['passout_year'])
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
    
    for student in base_queryset.exclude(gpa__isnull=True).exclude(gpa='').exclude(gpa='0.0'):
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
    
    gpa_distribution = [{'gpa_range': k, 'count': v} for k, v in gpa_ranges.items()]
    
    # Performance categories based on GPA
    performance_categories = {
        'high_performers': base_queryset.filter(
            Q(gpa__gte='8.5') & ~Q(gpa__isnull=True) & ~Q(gpa='')
        ).count(),
        'good_performers': base_queryset.filter(
            Q(gpa__gte='7.0') & Q(gpa__lt='8.5') & ~Q(gpa__isnull=True) & ~Q(gpa='')
        ).count(),
        'average_performers': base_queryset.filter(
            Q(gpa__gte='6.0') & Q(gpa__lt='7.0') & ~Q(gpa__isnull=True) & ~Q(gpa='')
        ).count(),
        'poor_performers': base_queryset.filter(
            Q(gpa__lt='6.0') & ~Q(gpa__isnull=True) & ~Q(gpa='')
        ).count()
    }
    
    # Current year students (placement ready)
    placement_ready = base_queryset.filter(passout_year=current_year).count()
    
    # Build the comprehensive response
    data = {
        'overview': {
            'total_students': total_students,
            'active_departments': active_departments,
            'active_years': active_years_list,
            'high_performers': high_performers,
            'high_performer_percentage': round((high_performers / total_students) * 100, 2) if total_students > 0 else 0,
            'average_gpa': round(avg_gpa, 2),
            'placement_ready': placement_ready,
            'current_year_students': placement_ready
        },
        'departments': department_wise_stats,
        'years': year_wise_stats,
        'gpa_distribution': gpa_distribution,
        'performance_categories': performance_categories,
        'last_updated': timezone.now().isoformat()
    }
    
    return data


def calculate_student_department_breakdown():
    """
    Calculate department-wise student breakdown with detailed statistics
    """
    current_year = timezone.now().year
    
    # Get department-wise statistics
    # IMPORTANT: Use distinct=True for all counts to avoid duplicates from JOIN operations
    departments = StudentProfile.objects.values('branch').annotate(
        total_students=Count('id', distinct=True),
        current_year_students=Count('id', filter=Q(passout_year=current_year), distinct=True),
        with_applications=Count('id', filter=Q(user__job_applications__isnull=False), distinct=True),
        placed_students=Count('id', filter=Q(user__job_applications__status='HIRED'), distinct=True)
    ).exclude(branch__isnull=True).exclude(branch='').order_by('-total_students')
    
    # Calculate additional metrics for each department
    for dept in departments:
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
    
    data = {
        'departments': list(departments),
        'total_departments': departments.count(),
        'last_updated': timezone.now().isoformat()
    }
    
    return data


def calculate_student_year_analysis(department=None):
    """
    Calculate year-wise student analysis with detailed statistics
    Args:
        department: Optional department name to filter by
    """
    current_year = timezone.now().year
    
    # Filter by active years only
    active_years = YearManagement.get_active_years()
    base_queryset = StudentProfile.objects.filter(passout_year__in=active_years) if active_years else StudentProfile.objects.all()
    
    # Apply department filter if provided
    if department:
        base_queryset = base_queryset.filter(branch=department)
    
    # Get year-wise statistics
    # IMPORTANT: Use distinct=True for all counts to avoid duplicates from JOIN operations
    years = base_queryset.values('passout_year').annotate(
        total_students=Count('id', distinct=True),
        with_applications=Count('id', filter=Q(user__job_applications__isnull=False), distinct=True),
        placed_students=Count('id', filter=Q(user__job_applications__status='HIRED'), distinct=True)
    ).exclude(passout_year__isnull=True).order_by('passout_year')
    
    # Calculate additional metrics for each year
    for year in years:
        # Use the same base queryset with department filter if applicable
        year_students = base_queryset.filter(passout_year=year['passout_year'])
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
    
    data = {
        'years': list(years),
        'total_years': years.count(),
        'department_filter': department,
        'last_updated': timezone.now().isoformat()
    }
    
    return data


def calculate_student_performance_analytics():
    """
    Calculate student performance analytics including GPA distribution and categories
    """
    current_year = timezone.now().year
    
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
    
    gpa_distribution = [{'gpa_range': k, 'count': v} for k, v in gpa_ranges.items()]
    
    # Performance categories based on GPA
    performance_categories = {
        'high_performers': StudentProfile.objects.filter(
            Q(gpa__gte='8.5') & ~Q(gpa__isnull=True) & ~Q(gpa='')
        ).count(),
        'good_performers': StudentProfile.objects.filter(
            Q(gpa__gte='7.0') & Q(gpa__lt='8.5') & ~Q(gpa__isnull=True) & ~Q(gpa='')
        ).count(),
        'average_performers': StudentProfile.objects.filter(
            Q(gpa__gte='6.0') & Q(gpa__lt='7.0') & ~Q(gpa__isnull=True) & ~Q(gpa='')
        ).count(),
        'poor_performers': StudentProfile.objects.filter(
            Q(gpa__lt='6.0') & ~Q(gpa__isnull=True) & ~Q(gpa='')
        ).count()
    }
    
    # Current year students (placement ready)
    placement_ready = StudentProfile.objects.filter(passout_year=current_year).count()
    
    data = {
        'gpa_distribution': gpa_distribution,
        'performance_categories': performance_categories,
        'placement_ready': placement_ready,
        'last_updated': timezone.now().isoformat()
    }
    
    return data
