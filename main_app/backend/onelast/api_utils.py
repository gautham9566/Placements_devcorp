"""
API utilities for consistent response formatting and error handling.
"""

from rest_framework.response import Response
from rest_framework import status
from typing import Dict, Any, Optional, List
from django.core.cache import cache
from django.db.models import QuerySet
import logging

logger = logging.getLogger(__name__)


class APIResponseFormatter:
    """
    Utility class for formatting consistent API responses.
    """
    
    @staticmethod
    def success_response(
        data: Any = None,
        message: str = "Success",
        status_code: int = status.HTTP_200_OK,
        metadata: Optional[Dict] = None
    ) -> Response:
        """
        Format a successful API response.
        
        Args:
            data: Response data
            message: Success message
            status_code: HTTP status code
            metadata: Additional metadata
            
        Returns:
            DRF Response object
        """
        response_data = {
            'success': True,
            'message': message,
            'data': data
        }
        
        if metadata:
            response_data['metadata'] = metadata
            
        return Response(response_data, status=status_code)
    
    @staticmethod
    def error_response(
        message: str = "An error occurred",
        errors: Optional[Dict] = None,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        error_code: Optional[str] = None
    ) -> Response:
        """
        Format an error API response.
        
        Args:
            message: Error message
            errors: Detailed error information
            status_code: HTTP status code
            error_code: Custom error code
            
        Returns:
            DRF Response object
        """
        response_data = {
            'success': False,
            'message': message
        }
        
        if errors:
            response_data['errors'] = errors
            
        if error_code:
            response_data['error_code'] = error_code
            
        return Response(response_data, status=status_code)
    
    @staticmethod
    def paginated_response(
        data: List,
        page: int,
        page_size: int,
        total_count: int,
        message: str = "Data retrieved successfully",
        metadata: Optional[Dict] = None
    ) -> Response:
        """
        Format a paginated API response.
        
        Args:
            data: List of data items
            page: Current page number
            page_size: Items per page
            total_count: Total number of items
            message: Success message
            metadata: Additional metadata
            
        Returns:
            DRF Response object
        """
        total_pages = (total_count + page_size - 1) // page_size
        
        response_data = {
            'success': True,
            'message': message,
            'data': data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_count': total_count,
                'total_pages': total_pages,
                'has_next': page < total_pages,
                'has_previous': page > 1,
            }
        }
        
        if metadata:
            response_data['metadata'] = metadata
            
        return Response(response_data, status=status.HTTP_200_OK)


class CacheManager:
    """
    Utility class for managing API response caching.
    """
    
    @staticmethod
    def get_cache_key(prefix: str, **kwargs) -> str:
        """
        Generate a cache key from prefix and parameters.
        
        Args:
            prefix: Cache key prefix
            **kwargs: Parameters to include in key
            
        Returns:
            Generated cache key
        """
        key_parts = [prefix]
        for key, value in sorted(kwargs.items()):
            key_parts.append(f"{key}:{value}")
        return ":".join(key_parts)
    
    @staticmethod
    def get_or_set_cache(
        cache_key: str,
        data_function: callable,
        timeout: int = 300,
        force_refresh: bool = False
    ) -> Any:
        """
        Get data from cache or set it if not exists.
        
        Args:
            cache_key: Cache key
            data_function: Function to generate data if cache miss
            timeout: Cache timeout in seconds
            force_refresh: Force refresh cache
            
        Returns:
            Cached or fresh data
        """
        if not force_refresh:
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                return cached_data
        
        # Generate fresh data
        fresh_data = data_function()
        
        # Cache the data
        cache.set(cache_key, fresh_data, timeout)
        
        return fresh_data
    
    @staticmethod
    def invalidate_cache_pattern(pattern: str):
        """
        Invalidate cache keys matching a pattern.
        
        Args:
            pattern: Cache key pattern to invalidate
        """
        try:
            # This is a simplified implementation
            # In production, you might want to use Redis pattern matching
            cache.delete_many([pattern])
        except Exception as e:
            logger.warning(f"Failed to invalidate cache pattern {pattern}: {e}")


class QueryOptimizer:
    """
    Utility class for optimizing database queries.
    """
    
    @staticmethod
    def optimize_queryset(
        queryset: QuerySet,
        select_related: Optional[List[str]] = None,
        prefetch_related: Optional[List[str]] = None,
        only_fields: Optional[List[str]] = None,
        defer_fields: Optional[List[str]] = None
    ) -> QuerySet:
        """
        Optimize a queryset with various performance improvements.
        
        Args:
            queryset: Base queryset
            select_related: Fields for select_related
            prefetch_related: Fields for prefetch_related
            only_fields: Fields to include (only)
            defer_fields: Fields to exclude (defer)
            
        Returns:
            Optimized queryset
        """
        if select_related:
            queryset = queryset.select_related(*select_related)
        
        if prefetch_related:
            queryset = queryset.prefetch_related(*prefetch_related)
        
        if only_fields:
            queryset = queryset.only(*only_fields)
        
        if defer_fields:
            queryset = queryset.defer(*defer_fields)
        
        return queryset
    
    @staticmethod
    def get_optimized_student_queryset():
        """Get optimized queryset for students."""
        from accounts.models import StudentProfile
        
        return QueryOptimizer.optimize_queryset(
            StudentProfile.objects.all(),
            select_related=['user', 'college'],
            prefetch_related=['user__job_applications']
        )
    
    @staticmethod
    def get_optimized_company_queryset():
        """Get optimized queryset for companies."""
        from companies.models import Company
        
        return QueryOptimizer.optimize_queryset(
            Company.objects.all(),
            prefetch_related=['job_postings', 'followers']
        )
    
    @staticmethod
    def get_optimized_job_queryset():
        """Get optimized queryset for jobs."""
        from jobs.models import JobPosting
        
        return QueryOptimizer.optimize_queryset(
            JobPosting.objects.all(),
            select_related=['company'],
            prefetch_related=['applications']
        )


class FilterHelper:
    """
    Utility class for handling common filtering operations.
    """
    
    @staticmethod
    def apply_search_filter(queryset: QuerySet, search_term: str, search_fields: List[str]) -> QuerySet:
        """
        Apply search filter to queryset.
        
        Args:
            queryset: Base queryset
            search_term: Search term
            search_fields: Fields to search in
            
        Returns:
            Filtered queryset
        """
        if not search_term or not search_fields:
            return queryset
        
        from django.db.models import Q
        
        search_query = Q()
        for field in search_fields:
            search_query |= Q(**{f"{field}__icontains": search_term})
        
        return queryset.filter(search_query)
    
    @staticmethod
    def apply_date_range_filter(
        queryset: QuerySet,
        date_field: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> QuerySet:
        """
        Apply date range filter to queryset.
        
        Args:
            queryset: Base queryset
            date_field: Date field name
            start_date: Start date (ISO format)
            end_date: End date (ISO format)
            
        Returns:
            Filtered queryset
        """
        if start_date:
            queryset = queryset.filter(**{f"{date_field}__gte": start_date})
        
        if end_date:
            queryset = queryset.filter(**{f"{date_field}__lte": end_date})
        
        return queryset
    
    @staticmethod
    def apply_numeric_range_filter(
        queryset: QuerySet,
        field_name: str,
        min_value: Optional[float] = None,
        max_value: Optional[float] = None
    ) -> QuerySet:
        """
        Apply numeric range filter to queryset.
        
        Args:
            queryset: Base queryset
            field_name: Numeric field name
            min_value: Minimum value
            max_value: Maximum value
            
        Returns:
            Filtered queryset
        """
        if min_value is not None:
            queryset = queryset.filter(**{f"{field_name}__gte": min_value})
        
        if max_value is not None:
            queryset = queryset.filter(**{f"{field_name}__lte": max_value})
        
        return queryset
