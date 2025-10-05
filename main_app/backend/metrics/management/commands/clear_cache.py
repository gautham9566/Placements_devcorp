from django.core.management.base import BaseCommand
from metrics.models import MetricsCache, PaginatedDataCache


class Command(BaseCommand):
    help = 'Clear cached metrics and paginated data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--metrics',
            action='store_true',
            help='Clear metrics cache',
        )
        parser.add_argument(
            '--pagination',
            action='store_true',
            help='Clear pagination cache',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Clear all caches',
        )

    def handle(self, *args, **options):
        if options['all'] or options['metrics']:
            count = MetricsCache.objects.count()
            MetricsCache.objects.all().delete()
            self.stdout.write(
                self.style.SUCCESS(f'Cleared {count} metrics cache entries')
            )

        if options['all'] or options['pagination']:
            count = PaginatedDataCache.objects.count()
            PaginatedDataCache.objects.all().delete()
            self.stdout.write(
                self.style.SUCCESS(f'Cleared {count} pagination cache entries')
            )

        if not any([options['all'], options['metrics'], options['pagination']]):
            self.stdout.write(
                self.style.WARNING('No cache type specified. Use --all, --metrics, or --pagination')
            )
