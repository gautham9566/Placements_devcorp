# Generated migration for enhanced metrics system

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('metrics', '0001_initial'),
    ]

    operations = [
        # Add new metric types to MetricsCache
        migrations.AlterField(
            model_name='metricscache',
            name='metric_type',
            field=models.CharField(
                choices=[
                    ('dashboard_stats', 'Dashboard Statistics'),
                    ('company_stats', 'Company Statistics'),
                    ('student_stats', 'Student Statistics'),
                    ('job_stats', 'Job Statistics'),
                    ('application_stats', 'Application Statistics'),
                    ('placement_stats', 'Placement Statistics'),
                    ('department_stats', 'Department Statistics'),
                    ('recruitment_stats', 'Recruitment Statistics'),
                    ('performance_stats', 'Performance Statistics'),
                    ('trend_stats', 'Trend Statistics'),
                ],
                max_length=50
            ),
        ),
        
        # Add auto_refresh field to MetricsCache
        migrations.AddField(
            model_name='metricscache',
            name='auto_refresh',
            field=models.BooleanField(default=True),
        ),
        
        # Add refresh_interval field to MetricsCache
        migrations.AddField(
            model_name='metricscache',
            name='refresh_interval',
            field=models.IntegerField(default=30),
        ),
        
        # Add indexes for better performance
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_metricscache_type_key_valid ON metrics_metricscache(metric_type, metric_key, is_valid);",
            reverse_sql="DROP INDEX IF EXISTS idx_metricscache_type_key_valid;"
        ),
        
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_metricscache_last_updated ON metrics_metricscache(last_updated);",
            reverse_sql="DROP INDEX IF EXISTS idx_metricscache_last_updated;"
        ),
        
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_paginateddatacache_type_hash ON metrics_paginateddatacache(cache_type, filter_hash);",
            reverse_sql="DROP INDEX IF EXISTS idx_paginateddatacache_type_hash;"
        ),
        
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_paginateddatacache_valid_updated ON metrics_paginateddatacache(is_valid, last_updated);",
            reverse_sql="DROP INDEX IF EXISTS idx_paginateddatacache_valid_updated;"
        ),
    ]
