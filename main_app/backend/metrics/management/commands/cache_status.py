"""
Management command to monitor cache status and performance.
Provides detailed information about cache hit rates, sizes, and health.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Count, Avg
from metrics.models import MetricsCache, PaginatedDataCache
from accounts.models import StudentProfile
from companies.models import Company
from jobs.models import JobPosting, JobApplication
import json
from datetime import timedelta


class Command(BaseCommand):
    help = 'Monitor cache status and performance metrics'

    def add_arguments(self, parser):
        parser.add_argument(
            '--detailed',
            action='store_true',
            help='Show detailed cache information',
        )
        parser.add_argument(
            '--json',
            action='store_true',
            help='Output in JSON format',
        )
        parser.add_argument(
            '--cleanup',
            action='store_true',
            help='Clean up expired and invalid cache entries',
        )

    def handle(self, *args, **options):
        detailed = options['detailed']
        json_output = options['json']
        cleanup = options['cleanup']
        
        if cleanup:
            self.cleanup_cache()
        
        cache_stats = self.get_cache_statistics()
        
        if json_output:
            self.stdout.write(json.dumps(cache_stats, indent=2, default=str))
        else:
            self.display_cache_status(cache_stats, detailed)

    def get_cache_statistics(self):
        """Get comprehensive cache statistics."""
        now = timezone.now()
        
        # Metrics cache statistics
        metrics_stats = self.get_metrics_cache_stats(now)
        
        # Paginated cache statistics
        paginated_stats = self.get_paginated_cache_stats(now)
        
        # System statistics
        system_stats = self.get_system_stats()
        
        return {
            'timestamp': now,
            'metrics_cache': metrics_stats,
            'paginated_cache': paginated_stats,
            'system': system_stats,
        }

    def get_metrics_cache_stats(self, now):
        """Get metrics cache statistics."""
        total_entries = MetricsCache.objects.count()
        valid_entries = MetricsCache.objects.filter(is_valid=True).count()
        
        # Age distribution
        recent_entries = MetricsCache.objects.filter(
            last_updated__gte=now - timedelta(minutes=30)
        ).count()
        
        old_entries = MetricsCache.objects.filter(
            last_updated__lt=now - timedelta(hours=1)
        ).count()
        
        # Type distribution
        type_distribution = list(
            MetricsCache.objects.values('metric_type')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        
        # Average refresh interval
        avg_refresh_interval = MetricsCache.objects.aggregate(
            avg_interval=Avg('refresh_interval')
        )['avg_interval'] or 0
        
        return {
            'total_entries': total_entries,
            'valid_entries': valid_entries,
            'invalid_entries': total_entries - valid_entries,
            'recent_entries': recent_entries,
            'old_entries': old_entries,
            'type_distribution': type_distribution,
            'average_refresh_interval': round(avg_refresh_interval, 2),
            'cache_hit_rate': round((valid_entries / total_entries * 100) if total_entries > 0 else 0, 2),
        }

    def get_paginated_cache_stats(self, now):
        """Get paginated cache statistics."""
        total_entries = PaginatedDataCache.objects.count()
        valid_entries = PaginatedDataCache.objects.filter(is_valid=True).count()
        
        # Age distribution
        recent_entries = PaginatedDataCache.objects.filter(
            last_updated__gte=now - timedelta(minutes=15)
        ).count()
        
        old_entries = PaginatedDataCache.objects.filter(
            last_updated__lt=now - timedelta(minutes=30)
        ).count()
        
        # Type distribution
        type_distribution = list(
            PaginatedDataCache.objects.values('cache_type')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        
        # Page size distribution
        page_size_distribution = list(
            PaginatedDataCache.objects.values('page_size')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        
        return {
            'total_entries': total_entries,
            'valid_entries': valid_entries,
            'invalid_entries': total_entries - valid_entries,
            'recent_entries': recent_entries,
            'old_entries': old_entries,
            'type_distribution': type_distribution,
            'page_size_distribution': page_size_distribution,
            'cache_hit_rate': round((valid_entries / total_entries * 100) if total_entries > 0 else 0, 2),
        }

    def get_system_stats(self):
        """Get system-wide statistics."""
        return {
            'total_students': StudentProfile.objects.count(),
            'total_companies': Company.objects.count(),
            'total_jobs': JobPosting.objects.count(),
            'total_applications': JobApplication.objects.count(),
            'active_jobs': JobPosting.objects.filter(is_active=True).count(),
            'published_jobs': JobPosting.objects.filter(is_published=True).count(),
        }

    def display_cache_status(self, stats, detailed=False):
        """Display cache status in a formatted way."""
        self.stdout.write(self.style.SUCCESS('📊 Cache Status Report'))
        self.stdout.write('=' * 50)
        
        # Metrics cache section
        self.stdout.write(self.style.HTTP_INFO('\n📈 Metrics Cache'))
        metrics = stats['metrics_cache']
        self.stdout.write(f"  Total entries: {metrics['total_entries']}")
        self.stdout.write(f"  Valid entries: {metrics['valid_entries']}")
        self.stdout.write(f"  Invalid entries: {metrics['invalid_entries']}")
        self.stdout.write(f"  Cache hit rate: {metrics['cache_hit_rate']}%")
        self.stdout.write(f"  Recent entries (30min): {metrics['recent_entries']}")
        self.stdout.write(f"  Old entries (1hr+): {metrics['old_entries']}")
        self.stdout.write(f"  Avg refresh interval: {metrics['average_refresh_interval']} min")
        
        if detailed:
            self.stdout.write("  Type distribution:")
            for item in metrics['type_distribution']:
                self.stdout.write(f"    {item['metric_type']}: {item['count']}")
        
        # Paginated cache section
        self.stdout.write(self.style.HTTP_INFO('\n📄 Paginated Cache'))
        paginated = stats['paginated_cache']
        self.stdout.write(f"  Total entries: {paginated['total_entries']}")
        self.stdout.write(f"  Valid entries: {paginated['valid_entries']}")
        self.stdout.write(f"  Invalid entries: {paginated['invalid_entries']}")
        self.stdout.write(f"  Cache hit rate: {paginated['cache_hit_rate']}%")
        self.stdout.write(f"  Recent entries (15min): {paginated['recent_entries']}")
        self.stdout.write(f"  Old entries (30min+): {paginated['old_entries']}")
        
        if detailed:
            self.stdout.write("  Type distribution:")
            for item in paginated['type_distribution']:
                self.stdout.write(f"    {item['cache_type']}: {item['count']}")
            
            self.stdout.write("  Page size distribution:")
            for item in paginated['page_size_distribution']:
                self.stdout.write(f"    {item['page_size']} items/page: {item['count']} caches")
        
        # System statistics
        self.stdout.write(self.style.HTTP_INFO('\n🏢 System Statistics'))
        system = stats['system']
        self.stdout.write(f"  Total students: {system['total_students']:,}")
        self.stdout.write(f"  Total companies: {system['total_companies']:,}")
        self.stdout.write(f"  Total jobs: {system['total_jobs']:,}")
        self.stdout.write(f"  Active jobs: {system['active_jobs']:,}")
        self.stdout.write(f"  Published jobs: {system['published_jobs']:,}")
        self.stdout.write(f"  Total applications: {system['total_applications']:,}")
        
        # Health assessment
        self.display_health_assessment(stats)

    def display_health_assessment(self, stats):
        """Display cache health assessment."""
        self.stdout.write(self.style.HTTP_INFO('\n🏥 Cache Health Assessment'))
        
        metrics_hit_rate = stats['metrics_cache']['cache_hit_rate']
        paginated_hit_rate = stats['paginated_cache']['cache_hit_rate']
        
        # Assess metrics cache health
        if metrics_hit_rate >= 90:
            metrics_health = self.style.SUCCESS('Excellent')
        elif metrics_hit_rate >= 75:
            metrics_health = self.style.WARNING('Good')
        elif metrics_hit_rate >= 50:
            metrics_health = self.style.WARNING('Fair')
        else:
            metrics_health = self.style.ERROR('Poor')
        
        # Assess paginated cache health
        if paginated_hit_rate >= 90:
            paginated_health = self.style.SUCCESS('Excellent')
        elif paginated_hit_rate >= 75:
            paginated_health = self.style.WARNING('Good')
        elif paginated_hit_rate >= 50:
            paginated_health = self.style.WARNING('Fair')
        else:
            paginated_health = self.style.ERROR('Poor')
        
        self.stdout.write(f"  Metrics cache health: {metrics_health}")
        self.stdout.write(f"  Paginated cache health: {paginated_health}")
        
        # Recommendations
        self.stdout.write(self.style.HTTP_INFO('\n💡 Recommendations'))
        
        if metrics_hit_rate < 75:
            self.stdout.write("  ⚠ Consider warming metrics cache more frequently")
        
        if paginated_hit_rate < 75:
            self.stdout.write("  ⚠ Consider warming paginated cache for common queries")
        
        old_metrics = stats['metrics_cache']['old_entries']
        if old_metrics > 0:
            self.stdout.write(f"  🧹 Consider cleaning up {old_metrics} old metrics cache entries")
        
        old_paginated = stats['paginated_cache']['old_entries']
        if old_paginated > 0:
            self.stdout.write(f"  🧹 Consider cleaning up {old_paginated} old paginated cache entries")

    def cleanup_cache(self):
        """Clean up expired and invalid cache entries."""
        self.stdout.write(self.style.SUCCESS('🧹 Cleaning up cache...'))
        
        now = timezone.now()
        
        # Clean up old metrics cache (older than 2 hours)
        old_metrics = MetricsCache.objects.filter(
            last_updated__lt=now - timedelta(hours=2)
        )
        metrics_deleted = old_metrics.count()
        old_metrics.delete()
        
        # Clean up old paginated cache (older than 1 hour)
        old_paginated = PaginatedDataCache.objects.filter(
            last_updated__lt=now - timedelta(hours=1)
        )
        paginated_deleted = old_paginated.count()
        old_paginated.delete()
        
        # Clean up invalid entries
        invalid_metrics = MetricsCache.objects.filter(is_valid=False)
        invalid_metrics_deleted = invalid_metrics.count()
        invalid_metrics.delete()
        
        invalid_paginated = PaginatedDataCache.objects.filter(is_valid=False)
        invalid_paginated_deleted = invalid_paginated.count()
        invalid_paginated.delete()
        
        self.stdout.write(
            self.style.SUCCESS(
                f"  ✓ Deleted {metrics_deleted} old metrics cache entries"
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"  ✓ Deleted {paginated_deleted} old paginated cache entries"
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"  ✓ Deleted {invalid_metrics_deleted} invalid metrics cache entries"
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"  ✓ Deleted {invalid_paginated_deleted} invalid paginated cache entries"
            )
        )
