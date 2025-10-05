from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.db.models import QuerySet
from rest_framework.response import Response


def get_optimized_paginated_data(queryset, page_number, page_size, serializer_class, context=None):
    """
    Optimized pagination that only queries the data needed for the current page.
    Uses Django's efficient pagination under the hood.
    
    Args:
        queryset: Django QuerySet
        page_number: Current page number
        page_size: Number of items per page
        serializer_class: Serializer to use for the data
        context: Context to pass to serializer
        
    Returns:
        dict with paginated data and metadata
    """
    if context is None:
        context = {}
    
    # Create paginator - this is efficient and doesn't load all data
    paginator = Paginator(queryset, page_size)
    
    try:
        page = paginator.page(page_number)
    except PageNotAnInteger:
        page = paginator.page(1)
    except EmptyPage:
        page = paginator.page(paginator.num_pages)
    
    # Only serialize the current page data
    serializer = serializer_class(page.object_list, many=True, context=context)
    
    return {
        'results': serializer.data,
        'pagination': {
            'page': page.number,
            'page_size': page_size,
            'total_count': paginator.count,
            'total_pages': paginator.num_pages,
            'has_next': page.has_next(),
            'has_previous': page.has_previous(),
            'next_page': page.next_page_number() if page.has_next() else None,
            'previous_page': page.previous_page_number() if page.has_previous() else None,
        }
    }


def optimize_queryset_for_pagination(queryset, select_related_fields=None, prefetch_related_fields=None):
    """
    Optimize a queryset for pagination by adding select_related and prefetch_related.
    
    Args:
        queryset: Base QuerySet
        select_related_fields: List of fields to select_related
        prefetch_related_fields: List of fields to prefetch_related
        
    Returns:
        Optimized QuerySet
    """
    if select_related_fields:
        queryset = queryset.select_related(*select_related_fields)
    
    if prefetch_related_fields:
        queryset = queryset.prefetch_related(*prefetch_related_fields)
    
    return queryset


def get_filter_optimized_queryset(base_queryset, filters):
    """
    Apply filters to a queryset in an optimized way.
    
    Args:
        base_queryset: Base QuerySet to filter
        filters: Dictionary of filters to apply
        
    Returns:
        Filtered QuerySet
    """
    queryset = base_queryset
    
    # Apply filters efficiently
    for field, value in filters.items():
        if value and value != 'ALL' and value != '':
            if field.endswith('__icontains'):
                queryset = queryset.filter(**{field: value})
            elif field.endswith('__gte') or field.endswith('__lte'):
                try:
                    numeric_value = float(value)
                    queryset = queryset.filter(**{field: numeric_value})
                except (ValueError, TypeError):
                    continue
            else:
                queryset = queryset.filter(**{field: value})
    
    return queryset


class MemoryEfficientPagination:
    """
    Memory-efficient pagination class that doesn't load all data at once.
    """
    
    def __init__(self, queryset, page_size=20):
        self.queryset = queryset
        self.page_size = page_size
        self._count = None
    
    def get_page(self, page_number):
        """Get a specific page of data without loading all data."""
        offset = (page_number - 1) * self.page_size
        limit = self.page_size
        
        # Use database LIMIT and OFFSET for efficiency
        page_data = list(self.queryset[offset:offset + limit])
        
        return {
            'data': page_data,
            'page_number': page_number,
            'has_next': len(page_data) == self.page_size and self.has_more_pages(page_number),
            'has_previous': page_number > 1,
        }
    
    def has_more_pages(self, current_page):
        """Check if there are more pages after the current one."""
        # Check if there's at least one more record beyond current page
        offset = current_page * self.page_size
        return self.queryset[offset:offset + 1].exists()
    
    def get_count(self):
        """Get total count (cached)."""
        if self._count is None:
            self._count = self.queryset.count()
        return self._count
    
    def get_total_pages(self):
        """Get total number of pages."""
        count = self.get_count()
        return (count + self.page_size - 1) // self.page_size
