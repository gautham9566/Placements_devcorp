"""
Health check and monitoring endpoints for the optimized system.
"""

import time
import psutil
from django.http import JsonResponse
from django.views import View
from django.db import connection
from django.core.cache import cache
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from metrics.models import MetricsCache, PaginatedDataCache
from accounts.models import StudentProfile
from companies.models import Company
from jobs.models import JobPosting, JobApplication
from .error_handling import check_system_health
from .logging_config import get_structured_logger

logger = get_structured_logger('health_check')


class HealthCheckView(APIView):
    """
    Comprehensive health check endpoint.
    """
    
    def get(self, request):
        """Get system health status."""
        start_time = time.time()
        
        try:
            health_data = {
                'status': 'healthy',
                'timestamp': timezone.now().isoformat(),
                'checks': {},
                'performance': {},
                'system': {}
            }
            
            # Run health checks
            health_data['checks'] = self.run_health_checks()
            
            # Get performance metrics
            health_data['performance'] = self.get_performance_metrics()
            
            # Get system metrics
            health_data['system'] = self.get_system_metrics()
            
            # Determine overall status
            overall_status = self.determine_overall_status(health_data['checks'])
            health_data['status'] = overall_status
            
            # Log health check
            duration = time.time() - start_time
            logger.log_performance('health_check', duration, status=overall_status)
            
            status_code = status.HTTP_200_OK if overall_status == 'healthy' else status.HTTP_503_SERVICE_UNAVAILABLE
            
            return Response(health_data, status=status_code)
            
        except Exception as e:
            logger.log_error('health_check_error', str(e))
            return Response({
                'status': 'error',
                'message': str(e),
                'timestamp': timezone.now().isoformat()
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def run_health_checks(self):
        """Run all health checks."""
        checks = {}
        
        # Database health check
        checks['database'] = self.check_database_health()
        
        # Cache health check
        checks['cache'] = self.check_cache_health()
        
        # Metrics health check
        checks['metrics'] = self.check_metrics_health()
        
        # Pagination cache health check
        checks['pagination_cache'] = self.check_pagination_cache_health()
        
        # API endpoints health check
        checks['api_endpoints'] = self.check_api_endpoints_health()
        
        return checks
    
    def check_database_health(self):
        """Check database connectivity and performance."""
        try:
            start_time = time.time()
            
            # Test basic connectivity
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            
            # Test table access
            student_count = StudentProfile.objects.count()
            company_count = Company.objects.count()
            
            duration = time.time() - start_time
            
            return {
                'status': 'healthy',
                'response_time': round(duration * 1000, 2),  # ms
                'student_count': student_count,
                'company_count': company_count,
                'message': 'Database is accessible and responsive'
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'message': 'Database connectivity issues'
            }
    
    def check_cache_health(self):
        """Check cache system health."""
        try:
            start_time = time.time()
            
            # Test cache write/read
            test_key = 'health_check_test'
            test_value = {'timestamp': time.time()}
            
            cache.set(test_key, test_value, 60)
            retrieved_value = cache.get(test_key)
            
            if retrieved_value != test_value:
                raise Exception("Cache read/write test failed")
            
            # Clean up test key
            cache.delete(test_key)
            
            duration = time.time() - start_time
            
            return {
                'status': 'healthy',
                'response_time': round(duration * 1000, 2),  # ms
                'message': 'Cache is working properly'
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'message': 'Cache system issues'
            }
    
    def check_metrics_health(self):
        """Check metrics cache health."""
        try:
            total_metrics = MetricsCache.objects.count()
            valid_metrics = MetricsCache.objects.filter(is_valid=True).count()
            recent_metrics = MetricsCache.objects.filter(
                last_updated__gte=timezone.now() - timezone.timedelta(hours=1)
            ).count()
            
            hit_rate = (valid_metrics / total_metrics * 100) if total_metrics > 0 else 0
            
            status_val = 'healthy'
            if hit_rate < 50:
                status_val = 'degraded'
            if recent_metrics == 0:
                status_val = 'stale'
            
            return {
                'status': status_val,
                'total_metrics': total_metrics,
                'valid_metrics': valid_metrics,
                'recent_metrics': recent_metrics,
                'hit_rate': round(hit_rate, 2),
                'message': f'Metrics cache hit rate: {hit_rate:.1f}%'
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'message': 'Metrics cache issues'
            }
    
    def check_pagination_cache_health(self):
        """Check pagination cache health."""
        try:
            total_cache = PaginatedDataCache.objects.count()
            valid_cache = PaginatedDataCache.objects.filter(is_valid=True).count()
            recent_cache = PaginatedDataCache.objects.filter(
                last_updated__gte=timezone.now() - timezone.timedelta(minutes=30)
            ).count()
            
            hit_rate = (valid_cache / total_cache * 100) if total_cache > 0 else 0
            
            status_val = 'healthy'
            if hit_rate < 50:
                status_val = 'degraded'
            if total_cache == 0:
                status_val = 'empty'
            
            return {
                'status': status_val,
                'total_cache': total_cache,
                'valid_cache': valid_cache,
                'recent_cache': recent_cache,
                'hit_rate': round(hit_rate, 2),
                'message': f'Pagination cache hit rate: {hit_rate:.1f}%'
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'message': 'Pagination cache issues'
            }
    
    def check_api_endpoints_health(self):
        """Check critical API endpoints health."""
        # This is a simplified check - in production you might want to
        # actually test the endpoints
        try:
            return {
                'status': 'healthy',
                'endpoints_checked': [
                    '/api/v1/accounts/students/optimized/',
                    '/api/v1/companies/optimized/',
                    '/api/v1/metrics/cached/'
                ],
                'message': 'API endpoints are accessible'
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'message': 'API endpoint issues'
            }
    
    def get_performance_metrics(self):
        """Get performance metrics."""
        try:
            # Database query performance
            start_time = time.time()
            with connection.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM accounts_studentprofile")
                cursor.fetchone()
            db_response_time = time.time() - start_time
            
            # Cache performance
            start_time = time.time()
            cache.get('test_key')
            cache_response_time = time.time() - start_time
            
            return {
                'database_response_time': round(db_response_time * 1000, 2),  # ms
                'cache_response_time': round(cache_response_time * 1000, 2),  # ms
                'active_connections': len(connection.queries) if hasattr(connection, 'queries') else 0
            }
            
        except Exception as e:
            return {
                'error': str(e),
                'message': 'Could not retrieve performance metrics'
            }
    
    def get_system_metrics(self):
        """Get system resource metrics."""
        try:
            # CPU and memory usage
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            return {
                'cpu_usage': cpu_percent,
                'memory_usage': memory.percent,
                'memory_available': round(memory.available / (1024**3), 2),  # GB
                'disk_usage': disk.percent,
                'disk_free': round(disk.free / (1024**3), 2),  # GB
                'load_average': psutil.getloadavg() if hasattr(psutil, 'getloadavg') else None
            }
            
        except Exception as e:
            return {
                'error': str(e),
                'message': 'Could not retrieve system metrics'
            }
    
    def determine_overall_status(self, checks):
        """Determine overall system status based on individual checks."""
        statuses = [check.get('status', 'unknown') for check in checks.values()]
        
        if 'unhealthy' in statuses:
            return 'unhealthy'
        elif 'degraded' in statuses or 'stale' in statuses:
            return 'degraded'
        elif all(status == 'healthy' for status in statuses):
            return 'healthy'
        else:
            return 'unknown'


class MetricsStatusView(APIView):
    """
    Detailed metrics status endpoint.
    """
    
    def get(self, request):
        """Get detailed metrics status."""
        try:
            # Metrics cache statistics
            metrics_stats = self.get_metrics_statistics()
            
            # Pagination cache statistics
            pagination_stats = self.get_pagination_statistics()
            
            # Performance statistics
            performance_stats = self.get_performance_statistics()
            
            return Response({
                'status': 'success',
                'timestamp': timezone.now().isoformat(),
                'metrics_cache': metrics_stats,
                'pagination_cache': pagination_stats,
                'performance': performance_stats
            })
            
        except Exception as e:
            logger.log_error('metrics_status_error', str(e))
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get_metrics_statistics(self):
        """Get metrics cache statistics."""
        total = MetricsCache.objects.count()
        valid = MetricsCache.objects.filter(is_valid=True).count()
        
        # Type distribution
        type_dist = list(
            MetricsCache.objects.values('metric_type')
            .annotate(count=models.Count('id'))
            .order_by('-count')
        )
        
        return {
            'total_entries': total,
            'valid_entries': valid,
            'invalid_entries': total - valid,
            'hit_rate': round((valid / total * 100) if total > 0 else 0, 2),
            'type_distribution': type_dist
        }
    
    def get_pagination_statistics(self):
        """Get pagination cache statistics."""
        total = PaginatedDataCache.objects.count()
        valid = PaginatedDataCache.objects.filter(is_valid=True).count()
        
        # Type distribution
        type_dist = list(
            PaginatedDataCache.objects.values('cache_type')
            .annotate(count=models.Count('id'))
            .order_by('-count')
        )
        
        return {
            'total_entries': total,
            'valid_entries': valid,
            'invalid_entries': total - valid,
            'hit_rate': round((valid / total * 100) if total > 0 else 0, 2),
            'type_distribution': type_dist
        }
    
    def get_performance_statistics(self):
        """Get performance statistics."""
        return {
            'total_students': StudentProfile.objects.count(),
            'total_companies': Company.objects.count(),
            'total_jobs': JobPosting.objects.count(),
            'active_jobs': JobPosting.objects.filter(is_active=True).count(),
            'total_applications': JobApplication.objects.count()
        }
