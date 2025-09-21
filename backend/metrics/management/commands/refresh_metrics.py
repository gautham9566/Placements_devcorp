from django.core.management.base import BaseCommand
from metrics.utils import get_or_calculate_metric


class Command(BaseCommand):
    help = 'Refresh cached metrics data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--type',
            type=str,
            help='Specific metric type to refresh (dashboard_stats, company_stats, etc.)',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Refresh all metrics',
        )

    def handle(self, *args, **options):
        metric_types = [
            'dashboard_stats',
            'company_stats', 
            'student_stats',
            'job_stats',
            'application_stats'
        ]
        
        if options['type']:
            if options['type'] in metric_types:
                metric_types = [options['type']]
            else:
                self.stdout.write(
                    self.style.ERROR(f'Invalid metric type: {options["type"]}')
                )
                return
        elif not options['all']:
            # Default to refreshing dashboard stats
            metric_types = ['dashboard_stats']

        for metric_type in metric_types:
            self.stdout.write(f'Refreshing {metric_type}...')
            try:
                data = get_or_calculate_metric(metric_type, force_refresh=True)
                if data:
                    self.stdout.write(
                        self.style.SUCCESS(f'Successfully refreshed {metric_type}')
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR(f'Failed to refresh {metric_type}')
                    )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error refreshing {metric_type}: {str(e)}')
                )

        self.stdout.write(
            self.style.SUCCESS('Metrics refresh completed')
        )
