from django.db import models
from django.utils import timezone
import json


class MetricsCache(models.Model):
    """
    Model to store cached metrics data to avoid real-time calculations
    """
    METRIC_TYPES = [
        ('dashboard_stats', 'Dashboard Statistics'),
        ('company_stats', 'Company Statistics'),
        ('student_stats', 'Student Statistics'),
        ('enhanced_student_stats', 'Enhanced Student Statistics'),
        ('student_department_breakdown', 'Student Department Breakdown'),
        ('student_year_analysis', 'Student Year Analysis'),
        ('job_stats', 'Job Statistics'),
        ('application_stats', 'Application Statistics'),
        ('placement_stats', 'Placement Statistics'),
        ('department_stats', 'Department Statistics'),
        ('recruitment_stats', 'Recruitment Statistics'),
        ('performance_stats', 'Performance Statistics'),
        ('trend_stats', 'Trend Statistics'),
    ]
    
    metric_type = models.CharField(max_length=50, choices=METRIC_TYPES)
    metric_key = models.CharField(max_length=100)  # For sub-categorization like 'tier_distribution'
    data = models.JSONField()  # Store the actual metrics data
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_valid = models.BooleanField(default=True)  # To mark if data needs refresh
    auto_refresh = models.BooleanField(default=True)  # Auto-refresh when data changes
    refresh_interval = models.IntegerField(default=30)  # Refresh interval in minutes
    
    class Meta:
        unique_together = ['metric_type', 'metric_key']
        indexes = [
            models.Index(fields=['metric_type', 'metric_key']),
            models.Index(fields=['last_updated']),
            models.Index(fields=['is_valid']),
        ]
    
    def __str__(self):
        return f"{self.metric_type} - {self.metric_key}"
    
    @classmethod
    def get_cached_metric(cls, metric_type, metric_key='default', max_age_minutes=30):
        """
        Get cached metric data, return None if not found or expired
        """
        try:
            cache_obj = cls.objects.get(
                metric_type=metric_type,
                metric_key=metric_key,
                is_valid=True
            )
            
            # Check if cache is still valid
            age = timezone.now() - cache_obj.last_updated
            if age.total_seconds() > (max_age_minutes * 60):
                return None
                
            return cache_obj.data
        except cls.DoesNotExist:
            return None
    
    @classmethod
    def update_metric(cls, metric_type, metric_key='default', data=None):
        """
        Update or create cached metric data
        """
        cache_obj, created = cls.objects.update_or_create(
            metric_type=metric_type,
            metric_key=metric_key,
            defaults={
                'data': data,
                'is_valid': True
            }
        )
        return cache_obj
    
    @classmethod
    def invalidate_metric(cls, metric_type, metric_key=None):
        """
        Invalidate cached metrics (mark for refresh)
        """
        queryset = cls.objects.filter(metric_type=metric_type)
        if metric_key:
            queryset = queryset.filter(metric_key=metric_key)
        
        queryset.update(is_valid=False)


class PaginatedDataCache(models.Model):
    """
    Model to store paginated data to improve loading performance
    """
    CACHE_TYPES = [
        ('students_list', 'Students List'),
        ('companies_list', 'Companies List'),
        ('jobs_list', 'Jobs List'),
        ('applications_list', 'Applications List'),
    ]
    
    cache_type = models.CharField(max_length=50, choices=CACHE_TYPES)
    filter_hash = models.CharField(max_length=64)  # Hash of filter parameters
    page_number = models.IntegerField()
    page_size = models.IntegerField()
    total_count = models.IntegerField()
    data = models.JSONField()  # Store the paginated data
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_valid = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ['cache_type', 'filter_hash', 'page_number', 'page_size']
        indexes = [
            models.Index(fields=['cache_type', 'filter_hash']),
            models.Index(fields=['last_updated']),
            models.Index(fields=['is_valid']),
        ]
    
    def __str__(self):
        return f"{self.cache_type} - Page {self.page_number} ({self.page_size} per page)"
    
    @classmethod
    def get_cached_page(cls, cache_type, filter_hash, page_number, page_size, max_age_minutes=15):
        """
        Get cached page data
        """
        try:
            cache_obj = cls.objects.get(
                cache_type=cache_type,
                filter_hash=filter_hash,
                page_number=page_number,
                page_size=page_size,
                is_valid=True
            )
            
            # Check if cache is still valid
            age = timezone.now() - cache_obj.last_updated
            if age.total_seconds() > (max_age_minutes * 60):
                return None
                
            return {
                'data': cache_obj.data,
                'total_count': cache_obj.total_count,
                'page_number': cache_obj.page_number,
                'page_size': cache_obj.page_size
            }
        except cls.DoesNotExist:
            return None
    
    @classmethod
    def update_cached_page(cls, cache_type, filter_hash, page_number, page_size, data, total_count):
        """
        Update or create cached page data
        """
        cache_obj, created = cls.objects.update_or_create(
            cache_type=cache_type,
            filter_hash=filter_hash,
            page_number=page_number,
            page_size=page_size,
            defaults={
                'data': data,
                'total_count': total_count,
                'is_valid': True
            }
        )
        return cache_obj
    
    @classmethod
    def invalidate_cache(cls, cache_type):
        """
        Invalidate all cached pages for a cache type
        """
        cls.objects.filter(cache_type=cache_type).update(is_valid=False)
