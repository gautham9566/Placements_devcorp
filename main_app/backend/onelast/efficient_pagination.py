"""
Memory-efficient pagination utilities for handling large datasets
without loading all data into memory at once.
"""

from django.core.paginator import Paginator, Page
from django.db.models import QuerySet
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from typing import Dict, Any, Optional, Callable
import hashlib
import json


class MemoryEfficientPaginator:
    """
    Memory-efficient paginator that uses database LIMIT/OFFSET
    instead of loading all data into memory.
    """
    
    def __init__(self, queryset: QuerySet, page_size: int = 20):
        self.queryset = queryset
        self.page_size = page_size
        self._count = None
    
    def get_count(self) -> int:
        """Get total count with caching to avoid repeated queries."""
        if self._count is None:
            self._count = self.queryset.count()
        return self._count
    
    def get_page(self, page_number: int) -> Dict[str, Any]:
        """
        Get a specific page of data without loading all data.
        
        Args:
            page_number: 1-based page number
            
        Returns:
            Dictionary with page data and metadata
        """
        if page_number < 1:
            page_number = 1
            
        offset = (page_number - 1) * self.page_size
        limit = self.page_size
        
        # Use database LIMIT and OFFSET for efficiency
        page_data = list(self.queryset[offset:offset + limit])
        total_count = self.get_count()
        total_pages = (total_count + self.page_size - 1) // self.page_size
        
        return {
            'data': page_data,
            'page_number': page_number,
            'page_size': self.page_size,
            'total_count': total_count,
            'total_pages': total_pages,
            'has_next': page_number < total_pages,
            'has_previous': page_number > 1,
            'start_index': offset + 1 if page_data else 0,
            'end_index': offset + len(page_data),
        }


class CachedMemoryEfficientPagination(PageNumberPagination):
    """
    DRF pagination class that combines memory efficiency with caching.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
    
    def __init__(self, cache_timeout: int = 300):
        super().__init__()
        self.cache_timeout = cache_timeout
    
    def generate_cache_key(self, request, queryset) -> str:
        """Generate a cache key based on request parameters and queryset."""
        # Get filter parameters
        filters = dict(request.query_params)
        
        # Create a hash of the filters and queryset
        filter_str = json.dumps(filters, sort_keys=True)
        queryset_str = str(queryset.query)
        
        cache_data = f"{filter_str}:{queryset_str}"
        return hashlib.md5(cache_data.encode()).hexdigest()
    
    def paginate_queryset(self, queryset, request, view=None):
        """
        Paginate a queryset if required, either returning a page object,
        or None if pagination is not configured for this view.
        """
        page_size = self.get_page_size(request)
        if not page_size:
            return None

        paginator = MemoryEfficientPaginator(queryset, page_size)
        page_number = request.query_params.get(self.page_query_param, 1)
        
        try:
            page_number = int(page_number)
        except (TypeError, ValueError):
            page_number = 1

        self.page_data = paginator.get_page(page_number)
        self.request = request
        
        return self.page_data['data']
    
    def get_paginated_response(self, data):
        """Return a paginated style Response object."""
        return Response({
            'results': data,
            'pagination': {
                'page': self.page_data['page_number'],
                'page_size': self.page_data['page_size'],
                'total_count': self.page_data['total_count'],
                'total_pages': self.page_data['total_pages'],
                'has_next': self.page_data['has_next'],
                'has_previous': self.page_data['has_previous'],
                'start_index': self.page_data['start_index'],
                'end_index': self.page_data['end_index'],
            }
        })


class FilteredPaginationMixin:
    """
    Mixin to add efficient filtering and pagination to views.
    """
    
    def apply_filters(self, queryset, filters: Dict[str, Any]) -> QuerySet:
        """
        Apply filters to queryset. Override this method in subclasses
        to implement specific filtering logic.
        
        Args:
            queryset: Base queryset
            filters: Dictionary of filter parameters
            
        Returns:
            Filtered queryset
        """
        return queryset
    
    def get_filtered_queryset(self, request) -> QuerySet:
        """
        Get filtered queryset based on request parameters.
        """
        queryset = self.get_queryset()
        
        # Extract filter parameters from request
        filters = self.extract_filters(request)
        
        # Apply filters
        filtered_queryset = self.apply_filters(queryset, filters)
        
        return filtered_queryset
    
    def extract_filters(self, request) -> Dict[str, Any]:
        """
        Extract filter parameters from request.
        Override this method to customize filter extraction.
        """
        return {
            'search': request.query_params.get('search', '').strip(),
            'ordering': request.query_params.get('ordering', '').strip(),
        }


def paginate_queryset_efficiently(
    queryset: QuerySet,
    page: int = 1,
    page_size: int = 20,
    serializer_class: Optional[Callable] = None,
    context: Optional[Dict] = None
) -> Dict[str, Any]:
    """
    Utility function to paginate a queryset efficiently.
    
    Args:
        queryset: Django queryset to paginate
        page: Page number (1-based)
        page_size: Number of items per page
        serializer_class: Optional serializer class to serialize data
        context: Optional context for serializer
        
    Returns:
        Dictionary with paginated data and metadata
    """
    paginator = MemoryEfficientPaginator(queryset, page_size)
    page_data = paginator.get_page(page)
    
    # Serialize data if serializer provided
    if serializer_class:
        serializer = serializer_class(
            page_data['data'], 
            many=True, 
            context=context or {}
        )
        page_data['data'] = serializer.data
    
    return page_data


class StreamingPagination:
    """
    Streaming pagination for very large datasets.
    Yields pages one at a time to avoid memory issues.
    """
    
    def __init__(self, queryset: QuerySet, page_size: int = 1000):
        self.queryset = queryset
        self.page_size = page_size
    
    def stream_pages(self):
        """
        Generator that yields pages of data one at a time.
        Useful for processing very large datasets.
        """
        total_count = self.queryset.count()
        total_pages = (total_count + self.page_size - 1) // self.page_size
        
        for page_num in range(1, total_pages + 1):
            offset = (page_num - 1) * self.page_size
            page_data = list(self.queryset[offset:offset + self.page_size])
            
            yield {
                'data': page_data,
                'page_number': page_num,
                'total_pages': total_pages,
                'total_count': total_count,
                'is_last_page': page_num == total_pages
            }


def get_optimized_queryset(model_class, select_related=None, prefetch_related=None):
    """
    Get an optimized queryset with proper select_related and prefetch_related.
    
    Args:
        model_class: Django model class
        select_related: List of fields for select_related
        prefetch_related: List of fields for prefetch_related
        
    Returns:
        Optimized queryset
    """
    queryset = model_class.objects.all()
    
    if select_related:
        queryset = queryset.select_related(*select_related)
    
    if prefetch_related:
        queryset = queryset.prefetch_related(*prefetch_related)
    
    return queryset
