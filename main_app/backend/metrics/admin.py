from django.contrib import admin
from unfold.admin import ModelAdmin
from unfold.decorators import display, action
from .models import MetricsCache, PaginatedDataCache


@admin.register(MetricsCache)
class MetricsCacheAdmin(ModelAdmin):
    list_display = ['metric_type', 'metric_key', 'last_updated', 'is_valid']
    list_filter = ['metric_type', 'is_valid', 'last_updated']
    search_fields = ['metric_type', 'metric_key']
    readonly_fields = ['created_at', 'last_updated']
    list_filter_submit = True  # Unfold feature
    
    actions = ['invalidate_selected', 'refresh_selected']
    
    @action(description="Invalidate selected metrics")
    def invalidate_selected(self, request, queryset):
        queryset.update(is_valid=False)
        self.message_user(request, f"Invalidated {queryset.count()} metrics.")
    
    @action(description="Refresh selected metrics")
    def refresh_selected(self, request, queryset):
        # This would trigger a refresh of the selected metrics
        queryset.update(is_valid=False)
        self.message_user(request, f"Marked {queryset.count()} metrics for refresh.")


@admin.register(PaginatedDataCache)
class PaginatedDataCacheAdmin(ModelAdmin):
    list_display = ['cache_type', 'page_number', 'page_size', 'total_count', 'last_updated', 'is_valid']
    list_filter = ['cache_type', 'is_valid', 'last_updated']
    search_fields = ['cache_type', 'filter_hash']
    readonly_fields = ['created_at', 'last_updated']
    list_filter_submit = True  # Unfold feature
    
    actions = ['invalidate_selected']
    
    @action(description="Invalidate selected cached pages")
    def invalidate_selected(self, request, queryset):
        queryset.update(is_valid=False)
        self.message_user(request, f"Invalidated {queryset.count()} cached pages.")
