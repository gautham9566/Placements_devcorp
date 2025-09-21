from django.core.management.base import BaseCommand
from django.db import transaction
from metrics.utils import get_or_calculate_metric
from metrics.models import MetricsCache


class Command(BaseCommand):
    help = 'Initialize metrics cache with initial data'

    def handle(self, *args, **options):
        self.stdout.write('Initializing metrics cache...')
        
        # List of metrics to initialize
        metrics_to_init = [
            'dashboard_stats',
            'company_stats',
            'student_stats',
            'job_stats',
            'application_stats',
            'department_stats',
            'placement_stats'
        ]
        
        for metric_type in metrics_to_init:
            self.stdout.write(f'Calculating {metric_type}...')
            try:
                with transaction.atomic():
                    data = get_or_calculate_metric(metric_type, force_refresh=True)
                    if data:
                        self.stdout.write(
                            self.style.SUCCESS(f'✓ {metric_type}: {data.get("total", "N/A")} records')
                        )
                    else:
                        self.stdout.write(
                            self.style.ERROR(f'✗ Failed to calculate {metric_type}')
                        )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'✗ Error calculating {metric_type}: {str(e)}')
                )
        
        # Show cache status
        total_cache_entries = MetricsCache.objects.count()
        valid_entries = MetricsCache.objects.filter(is_valid=True).count()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nCache initialized: {valid_entries}/{total_cache_entries} valid entries'
            )
        )
