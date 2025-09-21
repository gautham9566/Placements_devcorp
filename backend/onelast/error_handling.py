"""
Comprehensive error handling and monitoring utilities for the optimized system.
"""

import logging
import traceback
import time
from functools import wraps
from typing import Dict, Any, Optional, Callable
from django.http import JsonResponse
from django.core.exceptions import ValidationError, PermissionDenied
from django.db import DatabaseError, IntegrityError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler
from django.conf import settings
import json

# Configure logger
logger = logging.getLogger(__name__)


class PerformanceMonitor:
    """Monitor and log performance metrics."""
    
    @staticmethod
    def monitor_execution_time(func_name: str = None):
        """Decorator to monitor function execution time."""
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args, **kwargs):
                start_time = time.time()
                function_name = func_name or f"{func.__module__}.{func.__name__}"
                
                try:
                    result = func(*args, **kwargs)
                    execution_time = time.time() - start_time
                    
                    # Log performance metrics
                    logger.info(
                        f"Performance: {function_name} executed in {execution_time:.3f}s",
                        extra={
                            'function_name': function_name,
                            'execution_time': execution_time,
                            'status': 'success'
                        }
                    )
                    
                    # Log slow queries (> 1 second)
                    if execution_time > 1.0:
                        logger.warning(
                            f"Slow execution: {function_name} took {execution_time:.3f}s",
                            extra={
                                'function_name': function_name,
                                'execution_time': execution_time,
                                'status': 'slow'
                            }
                        )
                    
                    return result
                    
                except Exception as e:
                    execution_time = time.time() - start_time
                    logger.error(
                        f"Error in {function_name}: {str(e)} (after {execution_time:.3f}s)",
                        extra={
                            'function_name': function_name,
                            'execution_time': execution_time,
                            'status': 'error',
                            'error': str(e)
                        }
                    )
                    raise
                    
            return wrapper
        return decorator


class CacheMonitor:
    """Monitor cache performance and health."""
    
    @staticmethod
    def monitor_cache_operation(operation_type: str):
        """Decorator to monitor cache operations."""
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args, **kwargs):
                start_time = time.time()
                
                try:
                    result = func(*args, **kwargs)
                    execution_time = time.time() - start_time
                    
                    # Determine if it was a cache hit or miss
                    cache_hit = result is not None and operation_type == 'get'
                    
                    logger.info(
                        f"Cache {operation_type}: {'HIT' if cache_hit else 'MISS'} in {execution_time:.3f}s",
                        extra={
                            'cache_operation': operation_type,
                            'cache_hit': cache_hit,
                            'execution_time': execution_time
                        }
                    )
                    
                    return result
                    
                except Exception as e:
                    execution_time = time.time() - start_time
                    logger.error(
                        f"Cache {operation_type} error: {str(e)} (after {execution_time:.3f}s)",
                        extra={
                            'cache_operation': operation_type,
                            'execution_time': execution_time,
                            'error': str(e)
                        }
                    )
                    raise
                    
            return wrapper
        return decorator


class DatabaseMonitor:
    """Monitor database query performance."""
    
    @staticmethod
    def monitor_query_performance(query_type: str = None):
        """Decorator to monitor database query performance."""
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args, **kwargs):
                from django.db import connection
                
                # Get initial query count
                initial_queries = len(connection.queries)
                start_time = time.time()
                
                try:
                    result = func(*args, **kwargs)
                    execution_time = time.time() - start_time
                    
                    # Calculate queries executed
                    queries_executed = len(connection.queries) - initial_queries
                    
                    logger.info(
                        f"DB Query: {query_type or func.__name__} - {queries_executed} queries in {execution_time:.3f}s",
                        extra={
                            'query_type': query_type or func.__name__,
                            'queries_count': queries_executed,
                            'execution_time': execution_time
                        }
                    )
                    
                    # Log if too many queries (potential N+1 problem)
                    if queries_executed > 10:
                        logger.warning(
                            f"High query count: {query_type or func.__name__} executed {queries_executed} queries",
                            extra={
                                'query_type': query_type or func.__name__,
                                'queries_count': queries_executed,
                                'execution_time': execution_time,
                                'potential_n_plus_one': True
                            }
                        )
                    
                    return result
                    
                except Exception as e:
                    execution_time = time.time() - start_time
                    queries_executed = len(connection.queries) - initial_queries
                    
                    logger.error(
                        f"DB Query error in {query_type or func.__name__}: {str(e)} "
                        f"({queries_executed} queries in {execution_time:.3f}s)",
                        extra={
                            'query_type': query_type or func.__name__,
                            'queries_count': queries_executed,
                            'execution_time': execution_time,
                            'error': str(e)
                        }
                    )
                    raise
                    
            return wrapper
        return decorator


class ErrorHandler:
    """Centralized error handling for the application."""
    
    @staticmethod
    def handle_api_error(exc, context=None):
        """Handle API errors with proper logging and response formatting."""
        
        # Get the standard DRF error response
        response = exception_handler(exc, context)
        
        # Custom error handling
        if response is not None:
            custom_response_data = {
                'success': False,
                'message': 'An error occurred',
                'errors': response.data,
                'error_code': ErrorHandler.get_error_code(exc)
            }
            
            # Log the error
            ErrorHandler.log_error(exc, context, response.status_code)
            
            response.data = custom_response_data
            
        return response
    
    @staticmethod
    def get_error_code(exc) -> str:
        """Get appropriate error code for exception."""
        error_codes = {
            ValidationError: 'VALIDATION_ERROR',
            PermissionDenied: 'PERMISSION_ERROR',
            DatabaseError: 'DATABASE_ERROR',
            IntegrityError: 'INTEGRITY_ERROR',
        }
        
        return error_codes.get(type(exc), 'UNKNOWN_ERROR')
    
    @staticmethod
    def log_error(exc, context=None, status_code=None):
        """Log error with context information."""
        request = context.get('request') if context else None
        
        error_data = {
            'error_type': type(exc).__name__,
            'error_message': str(exc),
            'status_code': status_code,
            'traceback': traceback.format_exc(),
        }
        
        if request:
            error_data.update({
                'method': request.method,
                'path': request.path,
                'user': str(request.user) if hasattr(request, 'user') else 'Anonymous',
                'ip_address': ErrorHandler.get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            })
        
        logger.error(
            f"API Error: {type(exc).__name__} - {str(exc)}",
            extra=error_data
        )
    
    @staticmethod
    def get_client_ip(request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class PaginationMonitor:
    """Monitor pagination performance and usage patterns."""
    
    @staticmethod
    def monitor_pagination(view_name: str = None):
        """Decorator to monitor pagination performance."""
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args, **kwargs):
                start_time = time.time()
                
                # Extract pagination parameters from request
                request = args[1] if len(args) > 1 else kwargs.get('request')
                page = request.query_params.get('page', 1) if request else 1
                page_size = request.query_params.get('page_size', 20) if request else 20
                
                try:
                    result = func(*args, **kwargs)
                    execution_time = time.time() - start_time
                    
                    # Extract result metadata
                    total_count = 0
                    if hasattr(result, 'data') and isinstance(result.data, dict):
                        pagination_data = result.data.get('pagination', {})
                        total_count = pagination_data.get('total_count', 0)
                    
                    logger.info(
                        f"Pagination: {view_name or func.__name__} - page {page}, "
                        f"size {page_size}, total {total_count} in {execution_time:.3f}s",
                        extra={
                            'view_name': view_name or func.__name__,
                            'page': page,
                            'page_size': page_size,
                            'total_count': total_count,
                            'execution_time': execution_time
                        }
                    )
                    
                    return result
                    
                except Exception as e:
                    execution_time = time.time() - start_time
                    logger.error(
                        f"Pagination error in {view_name or func.__name__}: {str(e)} "
                        f"(page {page}, size {page_size}, after {execution_time:.3f}s)",
                        extra={
                            'view_name': view_name or func.__name__,
                            'page': page,
                            'page_size': page_size,
                            'execution_time': execution_time,
                            'error': str(e)
                        }
                    )
                    raise
                    
            return wrapper
        return decorator


class MetricsMonitor:
    """Monitor metrics calculation and caching performance."""
    
    @staticmethod
    def monitor_metrics_calculation(metric_type: str):
        """Decorator to monitor metrics calculation."""
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args, **kwargs):
                start_time = time.time()
                
                try:
                    result = func(*args, **kwargs)
                    execution_time = time.time() - start_time
                    
                    # Extract metrics metadata
                    total_items = result.get('total', 0) if isinstance(result, dict) else 0
                    
                    logger.info(
                        f"Metrics: {metric_type} calculated - {total_items} items in {execution_time:.3f}s",
                        extra={
                            'metric_type': metric_type,
                            'total_items': total_items,
                            'execution_time': execution_time
                        }
                    )
                    
                    # Log slow metrics calculation (> 2 seconds)
                    if execution_time > 2.0:
                        logger.warning(
                            f"Slow metrics calculation: {metric_type} took {execution_time:.3f}s",
                            extra={
                                'metric_type': metric_type,
                                'execution_time': execution_time,
                                'status': 'slow'
                            }
                        )
                    
                    return result
                    
                except Exception as e:
                    execution_time = time.time() - start_time
                    logger.error(
                        f"Metrics calculation error for {metric_type}: {str(e)} "
                        f"(after {execution_time:.3f}s)",
                        extra={
                            'metric_type': metric_type,
                            'execution_time': execution_time,
                            'error': str(e)
                        }
                    )
                    raise
                    
            return wrapper
        return decorator


# Middleware for monitoring
class PerformanceMonitoringMiddleware:
    """Middleware to monitor request performance."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.time()

        # Process request
        response = self.get_response(request)

        # Calculate response time
        response_time = time.time() - start_time

        # Log request performance
        logger.info(
            f"Request: {request.method} {request.path} - {response.status_code} in {response_time:.3f}s",
            extra={
                'method': request.method,
                'path': request.path,
                'status_code': response.status_code,
                'response_time': response_time,
                'user': str(request.user) if hasattr(request, 'user') else 'Anonymous'
            }
        )

        # Log slow requests (> 2 seconds)
        if response_time > 2.0:
            logger.warning(
                f"Slow request: {request.method} {request.path} took {response_time:.3f}s",
                extra={
                    'method': request.method,
                    'path': request.path,
                    'response_time': response_time,
                    'status': 'slow'
                }
            )

        return response


# Utility functions for monitoring
def log_performance_summary():
    """Log a summary of performance metrics."""
    # This would typically aggregate performance data
    # and log summary statistics
    logger.info("Performance summary logged")


def check_system_health():
    """Check overall system health."""
    from django.db import connection
    from metrics.models import MetricsCache

    health_status = {
        'database': 'unknown',
        'cache': 'unknown',
        'metrics': 'unknown',
    }

    # Check database health
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            health_status['database'] = 'healthy'
    except Exception as e:
        health_status['database'] = f'unhealthy: {str(e)}'

    # Check cache health
    try:
        cache_count = MetricsCache.objects.filter(is_valid=True).count()
        health_status['cache'] = 'healthy' if cache_count > 0 else 'empty'
    except Exception as e:
        health_status['cache'] = f'unhealthy: {str(e)}'

    # Check metrics health
    try:
        recent_metrics = MetricsCache.objects.filter(
            last_updated__gte=time.time() - 3600  # Last hour
        ).count()
        health_status['metrics'] = 'healthy' if recent_metrics > 0 else 'stale'
    except Exception as e:
        health_status['metrics'] = f'unhealthy: {str(e)}'

    logger.info(
        "System health check completed",
        extra={'health_status': health_status}
    )

    return health_status
