"""
Comprehensive logging configuration for performance monitoring and error tracking.
"""

import os
from django.conf import settings

# Logging configuration for performance monitoring
LOGGING_CONFIG = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
        'json': {
            'format': '{"level": "%(levelname)s", "time": "%(asctime)s", "module": "%(module)s", "message": "%(message)s", "extra": %(extra)s}',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
        'performance': {
            'format': 'PERF {asctime} {name} {levelname} {message}',
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'filters': ['require_debug_true'],
            'class': 'logging.StreamHandler',
            'formatter': 'simple'
        },
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(settings.BASE_DIR, 'logs', 'django.log'),
            'maxBytes': 1024*1024*15,  # 15MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
        'performance_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(settings.BASE_DIR, 'logs', 'performance.log'),
            'maxBytes': 1024*1024*10,  # 10MB
            'backupCount': 5,
            'formatter': 'performance',
        },
        'error_file': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(settings.BASE_DIR, 'logs', 'errors.log'),
            'maxBytes': 1024*1024*10,  # 10MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
        'cache_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(settings.BASE_DIR, 'logs', 'cache.log'),
            'maxBytes': 1024*1024*5,  # 5MB
            'backupCount': 3,
            'formatter': 'performance',
        },
        'database_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(settings.BASE_DIR, 'logs', 'database.log'),
            'maxBytes': 1024*1024*10,  # 10MB
            'backupCount': 5,
            'formatter': 'performance',
        },
        'mail_admins': {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'django.utils.log.AdminEmailHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': True,
        },
        'django.request': {
            'handlers': ['error_file', 'mail_admins'],
            'level': 'ERROR',
            'propagate': False,
        },
        'django.db.backends': {
            'handlers': ['database_file'],
            'level': 'DEBUG' if settings.DEBUG else 'INFO',
            'propagate': False,
        },
        'onelast.error_handling': {
            'handlers': ['performance_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'metrics': {
            'handlers': ['performance_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'cache': {
            'handlers': ['cache_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'performance': {
            'handlers': ['performance_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'accounts': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
        'companies': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
        'jobs': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
}


def setup_logging():
    """Setup logging configuration."""
    import logging.config
    
    # Create logs directory if it doesn't exist
    logs_dir = os.path.join(settings.BASE_DIR, 'logs')
    os.makedirs(logs_dir, exist_ok=True)
    
    # Apply logging configuration
    logging.config.dictConfig(LOGGING_CONFIG)
    
    # Log that logging has been configured
    logger = logging.getLogger(__name__)
    logger.info("Logging configuration applied successfully")


class StructuredLogger:
    """Structured logger for consistent logging format."""
    
    def __init__(self, name):
        self.logger = logging.getLogger(name)
    
    def log_performance(self, operation, duration, **kwargs):
        """Log performance metrics."""
        self.logger.info(
            f"Performance: {operation} completed in {duration:.3f}s",
            extra={
                'operation': operation,
                'duration': duration,
                **kwargs
            }
        )
    
    def log_cache_operation(self, operation, cache_type, hit=None, **kwargs):
        """Log cache operations."""
        hit_status = 'HIT' if hit else 'MISS' if hit is not None else 'OPERATION'
        self.logger.info(
            f"Cache: {operation} {cache_type} - {hit_status}",
            extra={
                'cache_operation': operation,
                'cache_type': cache_type,
                'cache_hit': hit,
                **kwargs
            }
        )
    
    def log_database_query(self, query_type, query_count, duration, **kwargs):
        """Log database query metrics."""
        self.logger.info(
            f"Database: {query_type} - {query_count} queries in {duration:.3f}s",
            extra={
                'query_type': query_type,
                'query_count': query_count,
                'duration': duration,
                **kwargs
            }
        )
    
    def log_api_request(self, method, path, status_code, duration, **kwargs):
        """Log API request metrics."""
        self.logger.info(
            f"API: {method} {path} - {status_code} in {duration:.3f}s",
            extra={
                'method': method,
                'path': path,
                'status_code': status_code,
                'duration': duration,
                **kwargs
            }
        )
    
    def log_error(self, error_type, message, **kwargs):
        """Log errors with context."""
        self.logger.error(
            f"Error: {error_type} - {message}",
            extra={
                'error_type': error_type,
                'error_message': message,
                **kwargs
            }
        )


class MetricsLogger:
    """Specialized logger for metrics and analytics."""
    
    def __init__(self):
        self.logger = StructuredLogger('metrics')
    
    def log_metrics_calculation(self, metric_type, duration, total_items=None, **kwargs):
        """Log metrics calculation performance."""
        self.logger.log_performance(
            f"metrics_calculation_{metric_type}",
            duration,
            metric_type=metric_type,
            total_items=total_items,
            **kwargs
        )
    
    def log_cache_refresh(self, metric_type, duration, forced=False, **kwargs):
        """Log cache refresh operations."""
        self.logger.log_cache_operation(
            'refresh',
            metric_type,
            duration=duration,
            forced=forced,
            **kwargs
        )
    
    def log_pagination_request(self, view_name, page, page_size, total_count, duration, **kwargs):
        """Log pagination request performance."""
        self.logger.log_performance(
            f"pagination_{view_name}",
            duration,
            page=page,
            page_size=page_size,
            total_count=total_count,
            **kwargs
        )


class PerformanceLogger:
    """Specialized logger for performance monitoring."""
    
    def __init__(self):
        self.logger = StructuredLogger('performance')
    
    def log_slow_operation(self, operation, duration, threshold=1.0, **kwargs):
        """Log slow operations that exceed threshold."""
        if duration > threshold:
            self.logger.logger.warning(
                f"Slow operation: {operation} took {duration:.3f}s (threshold: {threshold}s)",
                extra={
                    'operation': operation,
                    'duration': duration,
                    'threshold': threshold,
                    'status': 'slow',
                    **kwargs
                }
            )
    
    def log_memory_usage(self, operation, memory_before, memory_after, **kwargs):
        """Log memory usage for operations."""
        memory_diff = memory_after - memory_before
        self.logger.logger.info(
            f"Memory: {operation} used {memory_diff:.2f}MB",
            extra={
                'operation': operation,
                'memory_before': memory_before,
                'memory_after': memory_after,
                'memory_diff': memory_diff,
                **kwargs
            }
        )
    
    def log_query_analysis(self, view_name, query_count, duration, **kwargs):
        """Log query analysis for views."""
        queries_per_second = query_count / duration if duration > 0 else 0
        
        self.logger.log_database_query(
            view_name,
            query_count,
            duration,
            queries_per_second=queries_per_second,
            **kwargs
        )
        
        # Log potential N+1 problems
        if query_count > 10:
            self.logger.logger.warning(
                f"High query count: {view_name} executed {query_count} queries",
                extra={
                    'view_name': view_name,
                    'query_count': query_count,
                    'duration': duration,
                    'potential_n_plus_one': True,
                    **kwargs
                }
            )


# Global logger instances
metrics_logger = MetricsLogger()
performance_logger = PerformanceLogger()


def get_structured_logger(name):
    """Get a structured logger instance."""
    return StructuredLogger(name)
