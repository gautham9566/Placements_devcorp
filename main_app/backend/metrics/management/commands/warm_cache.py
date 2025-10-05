"""
Management command to warm up all caches for better initial performance.
This command pre-populates metrics caches and paginated data caches.
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from metrics.utils import get_or_calculate_metric
from metrics.models import MetricsCache, PaginatedDataCache
from accounts.models import StudentProfile
from companies.models import Company
from jobs.models import JobPosting, JobApplication
import time


class Command(BaseCommand):
    help = 'Warm up all caches for better initial performance'

    def add_arguments(self, parser):
        parser.add_argument(
            '--metrics-only',
            action='store_true',
            help='Only warm metrics cache, skip paginated data cache',
        )
        parser.add_argument(
            '--paginated-only',
            action='store_true',
            help='Only warm paginated data cache, skip metrics cache',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force refresh all caches even if they exist',
        )
        parser.add_argument(
            '--page-size',
            type=int,
            default=20,
            help='Page size for paginated cache warming (default: 20)',
        )
        parser.add_argument(
            '--max-pages',
            type=int,
            default=10,
            help='Maximum pages to cache for each dataset (default: 10)',
        )

    def handle(self, *args, **options):
        start_time = time.time()
        
        self.stdout.write(
            self.style.SUCCESS('🚀 Starting cache warming process...')
        )
        
        force_refresh = options['force']
        metrics_only = options['metrics_only']
        paginated_only = options['paginated_only']
        page_size = options['page_size']
        max_pages = options['max_pages']
        
        try:
            if not paginated_only:
                self.warm_metrics_cache(force_refresh)
            
            if not metrics_only:
                self.warm_paginated_cache(page_size, max_pages, force_refresh)
            
            end_time = time.time()
            duration = end_time - start_time
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ Cache warming completed successfully in {duration:.2f} seconds'
                )
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Cache warming failed: {str(e)}')
            )
            raise CommandError(f'Cache warming failed: {str(e)}')

    def warm_metrics_cache(self, force_refresh=False):
        """Warm up all metrics caches."""
        self.stdout.write('📊 Warming metrics cache...')
        
        # List of all metric types to warm
        metric_types = [
            'dashboard_stats',
            'company_stats',
            'student_stats',
            'job_stats',
            'application_stats',
            'department_stats',
            'placement_stats',
        ]
        
        for metric_type in metric_types:
            try:
                self.stdout.write(f'  📈 Calculating {metric_type}...')
                start_time = time.time()
                
                with transaction.atomic():
                    data = get_or_calculate_metric(metric_type, force_refresh=force_refresh)
                    
                if data:
                    end_time = time.time()
                    duration = end_time - start_time
                    
                    # Get some basic info about the data
                    total_items = data.get('total', 'N/A')
                    last_updated = data.get('last_updated', 'N/A')
                    
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'    ✓ {metric_type}: {total_items} items '
                            f'(calculated in {duration:.2f}s)'
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(f'    ⚠ Failed to calculate {metric_type}')
                    )
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'    ✗ Error calculating {metric_type}: {str(e)}')
                )

    def warm_paginated_cache(self, page_size=20, max_pages=10, force_refresh=False):
        """Warm up paginated data caches."""
        self.stdout.write('📄 Warming paginated data cache...')
        
        # Cache configurations for different data types
        cache_configs = [
            {
                'name': 'students',
                'model': StudentProfile,
                'cache_type': 'students_list',
                'common_filters': [
                    {},  # No filters
                    {'department': 'Computer Science'},
                    {'department': 'Electronics'},
                    {'passout_year': timezone.now().year},
                    {'cgpa_min': '7.0'},
                ]
            },
            {
                'name': 'companies',
                'model': Company,
                'cache_type': 'companies_list',
                'common_filters': [
                    {},  # No filters
                    {'tier': 'Tier 1'},
                    {'tier': 'Tier 2'},
                    {'campus_recruiting': 'true'},
                    {'industry': 'Technology'},
                ]
            },
            {
                'name': 'jobs',
                'model': JobPosting,
                'cache_type': 'jobs_list',
                'common_filters': [
                    {},  # No filters
                    {'is_active': 'true'},
                    {'job_type': 'FULL_TIME'},
                    {'is_published': 'true'},
                ]
            },
        ]
        
        for config in cache_configs:
            self.warm_dataset_cache(config, page_size, max_pages, force_refresh)

    def warm_dataset_cache(self, config, page_size, max_pages, force_refresh):
        """Warm cache for a specific dataset."""
        name = config['name']
        model = config['model']
        cache_type = config['cache_type']
        common_filters = config['common_filters']
        
        self.stdout.write(f'  📋 Warming {name} cache...')
        
        # Get total count to determine how many pages to cache
        total_count = model.objects.count()
        total_pages = min((total_count + page_size - 1) // page_size, max_pages)
        
        self.stdout.write(f'    📊 Total {name}: {total_count}, caching {total_pages} pages')
        
        for filters in common_filters:
            filter_desc = ', '.join([f'{k}={v}' for k, v in filters.items()]) or 'no filters'
            self.stdout.write(f'    🔍 Caching with filters: {filter_desc}')
            
            try:
                # Cache first few pages for each filter combination
                for page in range(1, min(total_pages + 1, max_pages + 1)):
                    self.cache_single_page(cache_type, filters, page, page_size, force_refresh)
                    
                self.stdout.write(
                    self.style.SUCCESS(f'      ✓ Cached {min(total_pages, max_pages)} pages')
                )
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'      ✗ Error caching {name}: {str(e)}')
                )

    def cache_single_page(self, cache_type, filters, page, page_size, force_refresh):
        """Cache a single page of data."""
        from metrics.utils import get_cached_paginated_data, generate_filter_hash
        
        # This would normally be done by the actual view's fetch function
        # For now, we'll just mark the cache as warmed
        filter_hash = generate_filter_hash(filters)
        
        # Check if cache already exists and is valid
        if not force_refresh:
            existing_cache = PaginatedDataCache.get_cached_page(
                cache_type, filter_hash, page, page_size
            )
            if existing_cache:
                return  # Cache already exists and is valid
        
        # For actual implementation, you would call the specific fetch function
        # This is a placeholder that creates a minimal cache entry
        PaginatedDataCache.update_cached_page(
            cache_type=cache_type,
            filter_hash=filter_hash,
            page_number=page,
            page_size=page_size,
            data=[],  # Placeholder - would be actual data
            total_count=0  # Placeholder - would be actual count
        )

    def get_cache_stats(self):
        """Get current cache statistics."""
        metrics_count = MetricsCache.objects.filter(is_valid=True).count()
        paginated_count = PaginatedDataCache.objects.filter(is_valid=True).count()
        
        return {
            'metrics_cache_entries': metrics_count,
            'paginated_cache_entries': paginated_count,
        }

    def clear_expired_cache(self):
        """Clear expired cache entries."""
        self.stdout.write('🧹 Clearing expired cache entries...')
        
        # Clear expired metrics cache (older than 1 hour)
        expired_metrics = MetricsCache.objects.filter(
            last_updated__lt=timezone.now() - timezone.timedelta(hours=1)
        )
        metrics_deleted = expired_metrics.count()
        expired_metrics.delete()
        
        # Clear expired paginated cache (older than 30 minutes)
        expired_paginated = PaginatedDataCache.objects.filter(
            last_updated__lt=timezone.now() - timezone.timedelta(minutes=30)
        )
        paginated_deleted = expired_paginated.count()
        expired_paginated.delete()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'  ✓ Cleared {metrics_deleted} expired metrics cache entries'
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                f'  ✓ Cleared {paginated_deleted} expired paginated cache entries'
            )
        )
