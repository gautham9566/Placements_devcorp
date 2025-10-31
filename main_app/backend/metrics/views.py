from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.paginator import Paginator
from django.db.models import Q
from django.utils import timezone

from metrics.utils import (
    get_or_calculate_metric, 
    get_cached_paginated_data,
    generate_filter_hash
)
from metrics.models import PaginatedDataCache
from companies.models import Company
from companies.serializers import CompanySerializer
from accounts.models import StudentProfile, YearManagement
from accounts.serializers import StudentProfileListSerializer
from jobs.models import JobPosting, JobApplication
from jobs.serializers import EnhancedJobSerializer, JobApplicationSerializer


class CachedMetricsView(APIView):
    """
    API endpoint that returns cached metrics for dashboard
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        metric_type = request.query_params.get('type', 'dashboard_stats')
        force_refresh = request.query_params.get('refresh', 'false').lower() == 'true'
        year = request.query_params.get('year')
        
        # Create metric key that includes year for proper caching
        metric_key = f"{year}" if year else 'all'
        
        data = get_or_calculate_metric(metric_type, metric_key=metric_key, force_refresh=force_refresh, year=year)
        
        if data is None:
            return Response({'error': 'Invalid metric type'}, status=400)
        
        return Response(data)


class CachedCompanyListView(generics.ListAPIView):
    """
    Cached company list with pagination
    """
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def list(self, request, *args, **kwargs):
        # Get filter parameters with enhanced filtering options
        filters = {
            'search': request.query_params.get('search', '').strip(),
            'tier': request.query_params.get('tier', '').strip(),
            'industry': request.query_params.get('industry', '').strip(),
            'location': request.query_params.get('location', '').strip(),  # Added location filter
            'size': request.query_params.get('size', '').strip(),  # Added size filter
            'campus_recruiting': request.query_params.get('campus_recruiting', '').strip(),
            'min_jobs': request.query_params.get('min_jobs', '').strip(),  # Added min jobs filter
            'founded_after': request.query_params.get('founded_after', '').strip(),  # Added founded year filter
        }

        page = int(request.query_params.get('page', 1))
        page_size = min(int(request.query_params.get('page_size', 10)), 100)  # Limit max page size
        force_refresh = request.query_params.get('refresh', 'false').lower() == 'true'
        
        def fetch_companies(filters, page, page_size):
            """Fetch fresh company data with enhanced filtering and performance optimization"""
            # Use prefetch_related for better performance with related objects
            queryset = Company.objects.prefetch_related(
                'job_postings', 'followers'
            ).all()

            # Apply filters
            if filters['search']:
                search_term = filters['search']
                queryset = queryset.filter(
                    Q(name__icontains=search_term) |
                    Q(description__icontains=search_term) |
                    Q(industry__icontains=search_term) |
                    Q(location__icontains=search_term)
                )

            if filters['tier']:
                queryset = queryset.filter(tier=filters['tier'])

            if filters['industry']:
                queryset = queryset.filter(industry__icontains=filters['industry'])

            if filters['location']:
                queryset = queryset.filter(location__icontains=filters['location'])

            if filters['size']:
                queryset = queryset.filter(size__icontains=filters['size'])

            if filters['campus_recruiting']:
                queryset = queryset.filter(
                    campus_recruiting=filters['campus_recruiting'].lower() == 'true'
                )

            if filters['min_jobs']:
                try:
                    min_jobs = int(filters['min_jobs'])
                    queryset = queryset.filter(total_active_jobs__gte=min_jobs)
                except ValueError:
                    pass

            if filters['founded_after']:
                try:
                    year = int(filters['founded_after'])
                    queryset = queryset.filter(founded__gte=str(year))
                except ValueError:
                    pass

            # Order by name for consistent pagination
            queryset = queryset.order_by('name', 'id')

            # Get total count before pagination (use count() for efficiency)
            total_count = queryset.count()

            # Apply pagination using database LIMIT/OFFSET for efficiency
            start = (page - 1) * page_size
            end = start + page_size
            companies = list(queryset[start:end])

            # Serialize data
            serializer = CompanySerializer(companies, many=True, context={'request': request})

            return {
                'data': serializer.data,
                'total_count': total_count,
                'page': page,
                'page_size': page_size,
                'has_next': page * page_size < total_count,
                'has_previous': page > 1,
                'total_pages': (total_count + page_size - 1) // page_size
            }
        
        # Get cached or fresh data
        result = get_cached_paginated_data(
            'companies_list', filters, page, page_size, 
            fetch_companies, force_refresh
        )
        
        return Response(result)


class CachedStudentListView(generics.ListAPIView):
    """
    Cached student list with pagination
    """
    serializer_class = StudentProfileListSerializer
    permission_classes = [permissions.IsAdminUser]
    
    def list(self, request, *args, **kwargs):
        # Get filter parameters with enhanced filtering options
        filters = {
            'search': request.query_params.get('search', '').strip(),
            'department': request.query_params.get('department', '').strip(),
            'branch': request.query_params.get('branch', '').strip(),  # Added branch filter
            'year': request.query_params.get('year', '').strip(),
            'passout_year': request.query_params.get('passout_year', '').strip(),  # Added passout year
            'joining_year': request.query_params.get('joining_year', '').strip(),  # Added joining year
            'cgpa_min': request.query_params.get('cgpa_min', '').strip(),
            'cgpa_max': request.query_params.get('cgpa_max', '').strip(),
            'year_range': request.query_params.get('year_range', '').strip(),  # Added year range filter
        }

        page = int(request.query_params.get('page', 1))
        page_size = min(int(request.query_params.get('page_size', 10)), 100)  # Limit max page size
        force_refresh = request.query_params.get('refresh', 'false').lower() == 'true'
        
        def fetch_students(filters, page, page_size):
            """Fetch fresh student data with enhanced filtering and performance optimization"""
            # Use select_related and prefetch_related for better performance
            queryset = StudentProfile.objects.select_related(
                'user'
            ).prefetch_related(
                'user__job_applications'
            ).all()

            # Apply filters
            if filters['search']:
                search_term = filters['search']
                queryset = queryset.filter(
                    Q(first_name__icontains=search_term) |
                    Q(last_name__icontains=search_term) |
                    Q(student_id__icontains=search_term) |
                    Q(contact_email__icontains=search_term) |
                    Q(user__email__icontains=search_term)
                )

            # Handle both department and branch filters
            if filters['department']:
                queryset = queryset.filter(branch__icontains=filters['department'])
            elif filters['branch']:
                queryset = queryset.filter(branch__icontains=filters['branch'])

            # Handle multiple year filters with proper priority
            if filters['passout_year']:
                try:
                    year = int(filters['passout_year'])
                    queryset = queryset.filter(passout_year=year)
                    print(f"Filtering by passout_year: {year}")
                except ValueError:
                    pass
            elif filters['year']:
                try:
                    year = int(filters['year'])
                    queryset = queryset.filter(passout_year=year)
                    print(f"Filtering by year (mapped to passout_year): {year}")
                except ValueError:
                    pass

            if filters['joining_year']:
                try:
                    year = int(filters['joining_year'])
                    queryset = queryset.filter(joining_year=year)
                except ValueError:
                    pass

            if filters['year_range']:
                # Handle year range like "2020-2024"
                try:
                    if '-' in filters['year_range']:
                        start_year, end_year = filters['year_range'].split('-')
                        start_year = int(start_year.strip())
                        end_year = int(end_year.strip())
                        queryset = queryset.filter(
                            joining_year__gte=start_year,
                            passout_year__lte=end_year
                        )
                except (ValueError, AttributeError):
                    pass

            if filters['cgpa_min']:
                try:
                    cgpa_min = float(filters['cgpa_min'])
                    queryset = queryset.filter(gpa__gte=cgpa_min)
                except ValueError:
                    pass

            if filters['cgpa_max']:
                try:
                    cgpa_max = float(filters['cgpa_max'])
                    queryset = queryset.filter(gpa__lte=cgpa_max)
                except ValueError:
                    pass

            # Order by student_id (roll number) for consistent pagination
            queryset = queryset.order_by('student_id', 'first_name', 'last_name', 'id')

            # Get total count before pagination (use count() for efficiency)
            total_count = queryset.count()

            # Apply pagination using database LIMIT/OFFSET for efficiency
            start = (page - 1) * page_size
            end = start + page_size
            students = list(queryset[start:end])

            # Serialize data
            serializer = StudentProfileListSerializer(students, many=True, context={'request': request})

            # Calculate pagination metadata
            total_pages = (total_count + page_size - 1) // page_size
            has_next = page < total_pages
            has_previous = page > 1

            # Get available years and departments for metadata
            available_years = YearManagement.get_active_years()
            available_departments = list(StudentProfile.objects.values_list('branch', flat=True).distinct().exclude(branch__isnull=True).exclude(branch='').order_by('branch'))

            # Debug logging to check applied filters
            print(f"Applied filters: department={filters.get('department')}, passout_year={filters.get('passout_year')}, search={filters.get('search')}")
            print(f"Queryset count after filters: {queryset.count()}")

            return {
                'data': serializer.data,
                'pagination': {
                    'current_page': page,
                    'total_pages': total_pages,
                    'total_count': total_count,
                    'per_page': page_size,
                    'has_next': has_next,
                    'has_previous': has_previous
                },
                'metadata': {
                    'available_years': available_years,
                    'available_departments': available_departments
                }
            }
        
        # Get cached or fresh data
        result = get_cached_paginated_data(
            'students_list', filters, page, page_size, 
            fetch_students, force_refresh
        )
        
        return Response(result)


class CachedJobListView(generics.ListAPIView):
    """
    Cached job list with pagination
    """
    serializer_class = EnhancedJobSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def list(self, request, *args, **kwargs):
        # Get filter parameters
        filters = {
            'search': request.query_params.get('search', ''),
            'job_type': request.query_params.get('job_type', ''),
            'location': request.query_params.get('location', ''),
            'company': request.query_params.get('company', ''),
            'is_active': request.query_params.get('is_active', 'true'),
        }
        
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 10))
        force_refresh = request.query_params.get('refresh', 'false').lower() == 'true'
        
        def fetch_jobs(filters, page, page_size):
            """Fetch fresh job data"""
            queryset = JobPosting.objects.select_related('company').all()
            
            # Apply filters
            if filters['search']:
                queryset = queryset.filter(
                    Q(title__icontains=filters['search']) |
                    Q(description__icontains=filters['search']) |
                    Q(company__name__icontains=filters['search'])
                )
            
            if filters['job_type']:
                queryset = queryset.filter(job_type=filters['job_type'])
                
            if filters['location']:
                queryset = queryset.filter(location__icontains=filters['location'])
                
            if filters['company']:
                queryset = queryset.filter(company__name__icontains=filters['company'])
                
            if filters['is_active'].lower() == 'true':
                queryset = queryset.filter(is_active=True)
            
            # Order by creation date
            queryset = queryset.order_by('-created_at')
            
            # Get total count before pagination
            total_count = queryset.count()
            
            # Apply pagination
            start = (page - 1) * page_size
            end = start + page_size
            jobs = list(queryset[start:end])
            
            # Serialize data
            serializer = EnhancedJobSerializer(jobs, many=True, context={'request': request})
            
            return {
                'data': serializer.data,
                'total_count': total_count,
                'page': page,
                'page_size': page_size
            }
        
        # Get cached or fresh data
        result = get_cached_paginated_data(
            'jobs_list', filters, page, page_size, 
            fetch_jobs, force_refresh
        )
        
        return Response(result)


class CacheStatusView(APIView):
    """
    View to check cache status and statistics
    """
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        from metrics.models import MetricsCache, PaginatedDataCache
        
        metrics_count = MetricsCache.objects.filter(is_valid=True).count()
        invalid_metrics = MetricsCache.objects.filter(is_valid=False).count()
        
        pagination_count = PaginatedDataCache.objects.filter(is_valid=True).count()
        invalid_pagination = PaginatedDataCache.objects.filter(is_valid=False).count()
        
        return Response({
            'metrics_cache': {
                'valid_entries': metrics_count,
                'invalid_entries': invalid_metrics,
                'total': metrics_count + invalid_metrics
            },
            'pagination_cache': {
                'valid_entries': pagination_count,
                'invalid_entries': invalid_pagination,
                'total': pagination_count + invalid_pagination
            }
        })


class EnhancedStudentMetricsView(APIView):
    """
    API endpoint for comprehensive student metrics including:
    - Total students
    - Departments statistics
    - Active Years analysis
    - High Performers data
    - Department wise breakdown
    - Year wise analysis
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        metric_type = request.query_params.get('type', 'enhanced_student_stats')
        force_refresh = request.query_params.get('refresh', 'false').lower() == 'true'
        
        # Validate metric type
        valid_types = [
            'enhanced_student_stats',
            'student_department_breakdown', 
            'student_year_analysis'
        ]
        
        if metric_type not in valid_types:
            return Response({
                'error': 'Invalid metric type',
                'valid_types': valid_types
            }, status=400)
        
        data = get_or_calculate_metric(metric_type, force_refresh=force_refresh)
        
        if data is None:
            return Response({'error': 'Failed to calculate metrics'}, status=500)
        
        return Response(data)


class StudentDepartmentStatsView(APIView):
    """
    API endpoint for department-wise student statistics
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            force_refresh = request.query_params.get('refresh', 'false').lower() == 'true'
            department = request.query_params.get('department', None)
            
            logger.info(f"StudentDepartmentStatsView called with params: refresh={force_refresh}, department={department}")
            
            data = get_or_calculate_metric('student_department_breakdown', force_refresh=force_refresh)
            
            if data is None:
                logger.error("get_or_calculate_metric returned None for student_department_breakdown")
                return Response({
                    'error': 'Failed to calculate department stats',
                    'details': 'Metric calculation returned no data',
                    'force_refresh': force_refresh
                }, status=500)
            
            logger.info(f"Successfully retrieved department stats data with {len(data.get('departments', []))} departments")
            
            # Filter by specific department if requested
            if department:
                filtered_data = {
                    'departments': [d for d in data.get('departments', []) if d.get('branch', '').lower() == department.lower()],
                    'last_updated': data.get('last_updated')
                }
                logger.debug(f"Filtered data for department {department}: {len(filtered_data['departments'])} records")
                return Response(filtered_data)
            
            return Response(data)
            
        except Exception as e:
            logger.error(f"Unexpected error in StudentDepartmentStatsView: {str(e)}", exc_info=True)
            return Response({
                'error': 'Internal server error',
                'details': str(e),
                'type': type(e).__name__
            }, status=500)


class StudentYearStatsView(APIView):
    """
    API endpoint for year-wise student statistics
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            force_refresh = request.query_params.get('refresh', 'false').lower() == 'true'
            year = request.query_params.get('year', None)
            department = request.query_params.get('department', None)
            
            logger.info(f"StudentYearStatsView called with params: refresh={force_refresh}, year={year}, department={department}")
            
            # Create a unique cache key based on department filter
            cache_key = f"dept_{department}" if department else "default"
            
            # Pass department as kwargs to the calculator
            kwargs = {}
            if department:
                kwargs['department'] = department
                
            logger.debug(f"Calling get_or_calculate_metric with cache_key={cache_key}, kwargs={kwargs}")
            
            data = get_or_calculate_metric('student_year_analysis', cache_key, force_refresh, **kwargs)
            
            if data is None:
                logger.error("get_or_calculate_metric returned None for student_year_analysis")
                return Response({
                    'error': 'Failed to calculate year stats',
                    'details': 'Metric calculation returned no data',
                    'cache_key': cache_key,
                    'force_refresh': force_refresh
                }, status=500)
            
            logger.info(f"Successfully retrieved year stats data with {len(data.get('years', []))} years")
            
            # Filter by specific year if requested
            if year:
                try:
                    year_int = int(year)
                    filtered_data = {
                        'years': [y for y in data.get('years', []) if y.get('passout_year') == year_int],
                        'current_year': data.get('current_year'),
                        'department_filter': data.get('department_filter'),
                        'last_updated': data.get('last_updated')
                    }
                    logger.debug(f"Filtered data for year {year_int}: {len(filtered_data['years'])} records")
                    return Response(filtered_data)
                except ValueError:
                    logger.warning(f"Invalid year format provided: {year}")
                    return Response({'error': 'Invalid year format'}, status=400)
            
            return Response(data)
            
        except Exception as e:
            logger.error(f"Unexpected error in StudentYearStatsView: {str(e)}", exc_info=True)
            return Response({
                'error': 'Internal server error',
                'details': str(e),
                'type': type(e).__name__
            }, status=500)


class StudentPerformanceAnalyticsView(APIView):
    """
    API endpoint for student performance analytics
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from accounts.models import StudentProfile
        from django.db.models import Count, Q
        from django.utils import timezone
        
        current_year = timezone.now().year
        
        # Filter by active years only
        active_years = YearManagement.get_active_years()
        base_queryset = StudentProfile.objects.filter(passout_year__in=active_years) if active_years else StudentProfile.objects.all()
        
        # Get high performers by department - manual calculation
        departments = base_queryset.values('branch').annotate(
            total_students=Count('id')
        ).exclude(branch__isnull=True).exclude(branch='').filter(total_students__gte=1)
        
        high_performers_by_dept = []
        for dept in departments:
            dept_students = base_queryset.filter(branch=dept['branch'])
            dept_total = dept['total_students']
            dept_high_performers = 0
            dept_gpa_sum = 0
            dept_gpa_count = 0
            
            for student in dept_students.exclude(gpa__isnull=True).exclude(gpa='').exclude(gpa='0.0'):
                try:
                    gpa_value = float(student.gpa)
                    dept_gpa_sum += gpa_value
                    dept_gpa_count += 1
                    if gpa_value >= 8.5:
                        dept_high_performers += 1
                except (ValueError, TypeError):
                    continue
            
            avg_gpa = round(dept_gpa_sum / dept_gpa_count, 2) if dept_gpa_count > 0 else 0
            high_performer_percentage = round((dept_high_performers / dept_total) * 100, 2) if dept_total > 0 else 0
            
            high_performers_by_dept.append({
                'branch': dept['branch'],
                'total_students': dept_total,
                'high_performers': dept_high_performers,
                'avg_gpa': avg_gpa,
                'high_performer_percentage': high_performer_percentage
            })
        
        # Sort by high performers count
        high_performers_by_dept.sort(key=lambda x: x['high_performers'], reverse=True)
        
        # GPA trends by year - manual calculation
        active_years = YearManagement.get_active_years()
        years = StudentProfile.objects.filter(passout_year__in=active_years).values('passout_year').annotate(
            student_count=Count('id')
        ).exclude(passout_year__isnull=True).order_by('passout_year')
        
        gpa_trends = []
        for year in years:
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
            
            avg_gpa = round(year_gpa_sum / year_gpa_count, 2) if year_gpa_count > 0 else 0
            
            gpa_trends.append({
                'passout_year': year['passout_year'],
                'avg_gpa': avg_gpa,
                'student_count': year['student_count'],
                'high_performers': year_high_performers
            })
        
        # Overall performance stats - manual calculation
        total_students = base_queryset.count()
        total_gpa = 0
        total_gpa_count = 0
        high_performers = 0
        good_performers = 0
        average_performers = 0
        poor_performers = 0
        
        for student in base_queryset.exclude(gpa__isnull=True).exclude(gpa='').exclude(gpa='0.0'):
            try:
                gpa_value = float(student.gpa)
                total_gpa += gpa_value
                total_gpa_count += 1
                
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
        
        avg_gpa = round(total_gpa / total_gpa_count, 2) if total_gpa_count > 0 else 0
        
        overall_stats = {
            'total_students': total_students,
            'avg_gpa': avg_gpa,
            'high_performers': high_performers,
            'good_performers': good_performers,
            'average_performers': average_performers,
            'poor_performers': poor_performers
        }
        
        data = {
            'high_performers_by_department': high_performers_by_dept,
            'gpa_trends_by_year': gpa_trends,
            'overall_performance': overall_stats,
            'performance_categories': {
                'high_performers': high_performers,
                'good_performers': good_performers,
                'average_performers': average_performers,
                'poor_performers': poor_performers
            },
            'last_updated': timezone.now().isoformat()
        }
        
        return Response(data)


class ApplicationTimelineView(APIView):
    """
    API endpoint that returns application timeline data for charts
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        year_param = request.query_params.get('year')
        
        # If year is "All" or empty, aggregate data across all years
        if year_param in [None, '', 'All']:
            return self.get_all_years_data()
        
        try:
            year = int(year_param)
        except ValueError:
            return Response({'error': 'Invalid year parameter'}, status=400)

        return self.get_year_data(year)
    
    def get_year_data(self, year):
        """Get timeline data for a specific year"""
        # Calculate monthly application data for the year
        monthly_data = []
        months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

        for month_idx, month_name in enumerate(months, 1):
            # Get start and end of month
            month_start = timezone.datetime(year, month_idx, 1)
            if month_idx == 12:
                month_end = timezone.datetime(year + 1, 1, 1) - timezone.timedelta(days=1)
            else:
                month_end = timezone.datetime(year, month_idx + 1, 1) - timezone.timedelta(days=1)

            # Count applications by status for this month
            applications = JobApplication.objects.filter(
                applied_at__date__range=[month_start.date(), month_end.date()]
            )

            sent = applications.count()
            interviews = applications.filter(status='SHORTLISTED').count()
            approved = applications.filter(status='HIRED').count()
            rejected = applications.filter(status='REJECTED').count()
            pending = applications.filter(status__in=['APPLIED', 'UNDER_REVIEW']).count()

            monthly_data.append({
                'name': month_name,
                'sent': sent,
                'interviews': interviews,
                'approved': approved,
                'rejected': rejected,
                'pending': pending
            })

        return Response(monthly_data)
    
    def get_all_years_data(self):
        """Get aggregated timeline data across all years"""
        # Get all applications grouped by month and year
        applications = JobApplication.objects.all()
        
        # Create a dictionary to aggregate data by month
        monthly_aggregates = {}
        months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        
        # Initialize monthly aggregates
        for month_name in months:
            monthly_aggregates[month_name] = {
                'sent': 0,
                'interviews': 0,
                'approved': 0,
                'rejected': 0,
                'pending': 0
            }
        
        # Aggregate data across all years
        for application in applications:
            month_name = application.applied_at.strftime('%b')
            if month_name in monthly_aggregates:
                monthly_aggregates[month_name]['sent'] += 1
                if application.status == 'SHORTLISTED':
                    monthly_aggregates[month_name]['interviews'] += 1
                elif application.status == 'HIRED':
                    monthly_aggregates[month_name]['approved'] += 1
                elif application.status == 'REJECTED':
                    monthly_aggregates[month_name]['rejected'] += 1
                elif application.status in ['APPLIED', 'UNDER_REVIEW']:
                    monthly_aggregates[month_name]['pending'] += 1
        
        # Convert to list format
        monthly_data = []
        for month_name in months:
            monthly_data.append({
                'name': month_name,
                **monthly_aggregates[month_name]
            })
        
        return Response(monthly_data)


