"""
Management command to optimize database performance.
Adds strategic indexes, analyzes query patterns, and provides optimization recommendations.
"""

from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.conf import settings
import time


class Command(BaseCommand):
    help = 'Optimize database performance with strategic indexes and analysis'

    def add_arguments(self, parser):
        parser.add_argument(
            '--analyze',
            action='store_true',
            help='Analyze current database performance',
        )
        parser.add_argument(
            '--create-indexes',
            action='store_true',
            help='Create additional performance indexes',
        )
        parser.add_argument(
            '--vacuum',
            action='store_true',
            help='Run database vacuum/analyze (PostgreSQL only)',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Run all optimization tasks',
        )

    def handle(self, *args, **options):
        analyze = options['analyze'] or options['all']
        create_indexes = options['create_indexes'] or options['all']
        vacuum = options['vacuum'] or options['all']
        
        self.stdout.write(
            self.style.SUCCESS('🔧 Starting database optimization...')
        )
        
        if analyze:
            self.analyze_database()
        
        if create_indexes:
            self.create_performance_indexes()
        
        if vacuum:
            self.vacuum_database()
        
        self.stdout.write(
            self.style.SUCCESS('✅ Database optimization completed')
        )

    def analyze_database(self):
        """Analyze current database performance."""
        self.stdout.write('📊 Analyzing database performance...')
        
        with connection.cursor() as cursor:
            # Get database engine
            db_engine = connection.vendor
            self.stdout.write(f'  Database engine: {db_engine}')
            
            # Analyze table sizes
            self.analyze_table_sizes(cursor, db_engine)
            
            # Analyze index usage
            self.analyze_index_usage(cursor, db_engine)
            
            # Check for missing indexes
            self.check_missing_indexes(cursor, db_engine)

    def analyze_table_sizes(self, cursor, db_engine):
        """Analyze table sizes and row counts."""
        self.stdout.write('  📏 Table size analysis:')
        
        tables = [
            'accounts_studentprofile',
            'companies_company',
            'jobs_jobposting',
            'jobs_jobapplication',
            'metrics_metricscache',
            'metrics_paginateddatacache',
        ]
        
        for table in tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                
                if db_engine == 'postgresql':
                    cursor.execute(f"""
                        SELECT pg_size_pretty(pg_total_relation_size('{table}'))
                    """)
                    size = cursor.fetchone()[0]
                    self.stdout.write(f"    {table}: {count:,} rows, {size}")
                else:
                    self.stdout.write(f"    {table}: {count:,} rows")
                    
            except Exception as e:
                self.stdout.write(f"    {table}: Error - {str(e)}")

    def analyze_index_usage(self, cursor, db_engine):
        """Analyze index usage statistics."""
        self.stdout.write('  📇 Index usage analysis:')
        
        if db_engine == 'postgresql':
            cursor.execute("""
                SELECT 
                    schemaname,
                    tablename,
                    indexname,
                    idx_tup_read,
                    idx_tup_fetch
                FROM pg_stat_user_indexes 
                WHERE schemaname = 'public'
                ORDER BY idx_tup_read DESC
                LIMIT 10
            """)
            
            results = cursor.fetchall()
            if results:
                self.stdout.write("    Top 10 most used indexes:")
                for row in results:
                    schema, table, index, reads, fetches = row
                    self.stdout.write(f"      {index}: {reads:,} reads, {fetches:,} fetches")
            else:
                self.stdout.write("    No index usage statistics available")
        else:
            self.stdout.write("    Index usage analysis only available for PostgreSQL")

    def check_missing_indexes(self, cursor, db_engine):
        """Check for potentially missing indexes."""
        self.stdout.write('  🔍 Checking for missing indexes:')
        
        # Common query patterns that should have indexes
        missing_indexes = []
        
        # Check for foreign key indexes
        if db_engine == 'postgresql':
            cursor.execute("""
                SELECT 
                    c.conrelid::regclass AS table_name,
                    a.attname AS column_name
                FROM pg_constraint c
                JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
                WHERE c.contype = 'f'
                AND NOT EXISTS (
                    SELECT 1 FROM pg_index i
                    WHERE i.indrelid = c.conrelid
                    AND a.attnum = ANY(i.indkey)
                )
            """)
            
            fk_without_indexes = cursor.fetchall()
            for table, column in fk_without_indexes:
                missing_indexes.append(f"Foreign key {table}.{column} lacks index")
        
        # Check for commonly filtered fields without indexes
        common_filters = [
            ('accounts_studentprofile', 'branch'),
            ('accounts_studentprofile', 'passout_year'),
            ('accounts_studentprofile', 'gpa'),
            ('companies_company', 'tier'),
            ('companies_company', 'industry'),
            ('companies_company', 'campus_recruiting'),
            ('jobs_jobposting', 'is_active'),
            ('jobs_jobposting', 'is_published'),
            ('jobs_jobapplication', 'status'),
        ]
        
        for table, column in common_filters:
            if not self.index_exists(cursor, table, column):
                missing_indexes.append(f"Consider index on {table}.{column}")
        
        if missing_indexes:
            self.stdout.write("    Potential missing indexes:")
            for index in missing_indexes:
                self.stdout.write(f"      ⚠ {index}")
        else:
            self.stdout.write("    ✓ No obvious missing indexes found")

    def index_exists(self, cursor, table, column):
        """Check if an index exists on a specific column."""
        try:
            cursor.execute("""
                SELECT COUNT(*) FROM information_schema.statistics 
                WHERE table_name = %s AND column_name = %s
            """, [table, column])
            return cursor.fetchone()[0] > 0
        except:
            return False

    def create_performance_indexes(self):
        """Create additional performance indexes."""
        self.stdout.write('🏗️ Creating performance indexes...')
        
        indexes = [
            # Composite indexes for common query patterns
            {
                'name': 'idx_student_search_composite',
                'table': 'accounts_studentprofile',
                'columns': ['branch', 'passout_year', 'gpa'],
                'description': 'Composite index for student filtering'
            },
            {
                'name': 'idx_company_search_composite',
                'table': 'companies_company',
                'columns': ['tier', 'industry', 'campus_recruiting'],
                'description': 'Composite index for company filtering'
            },
            {
                'name': 'idx_job_active_published',
                'table': 'jobs_jobposting',
                'columns': ['is_active', 'is_published', 'application_deadline'],
                'description': 'Composite index for active job queries'
            },
            {
                'name': 'idx_application_status_date',
                'table': 'jobs_jobapplication',
                'columns': ['status', 'applied_at'],
                'description': 'Composite index for application queries'
            },
            # Partial indexes for common conditions
            {
                'name': 'idx_job_active_only',
                'table': 'jobs_jobposting',
                'columns': ['created_at'],
                'condition': 'is_active = true',
                'description': 'Partial index for active jobs only'
            },
            {
                'name': 'idx_application_hired',
                'table': 'jobs_jobapplication',
                'columns': ['applied_at'],
                'condition': "status = 'HIRED'",
                'description': 'Partial index for hired applications'
            },
        ]
        
        with connection.cursor() as cursor:
            for index in indexes:
                try:
                    self.create_index(cursor, index)
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f"    ✗ Failed to create {index['name']}: {str(e)}")
                    )

    def create_index(self, cursor, index_config):
        """Create a single index."""
        name = index_config['name']
        table = index_config['table']
        columns = index_config['columns']
        condition = index_config.get('condition')
        description = index_config['description']
        
        # Check if index already exists
        cursor.execute("""
            SELECT COUNT(*) FROM information_schema.statistics 
            WHERE index_name = %s
        """, [name])
        
        if cursor.fetchone()[0] > 0:
            self.stdout.write(f"    ⏭ Index {name} already exists")
            return
        
        # Build CREATE INDEX statement
        columns_str = ', '.join(columns)
        sql = f"CREATE INDEX CONCURRENTLY {name} ON {table} ({columns_str})"
        
        if condition:
            sql += f" WHERE {condition}"
        
        self.stdout.write(f"    🔨 Creating {name}: {description}")
        
        start_time = time.time()
        cursor.execute(sql)
        end_time = time.time()
        
        self.stdout.write(
            self.style.SUCCESS(
                f"    ✓ Created {name} in {end_time - start_time:.2f}s"
            )
        )

    def vacuum_database(self):
        """Run database vacuum and analyze operations."""
        self.stdout.write('🧹 Running database maintenance...')
        
        if connection.vendor == 'postgresql':
            with connection.cursor() as cursor:
                # Get list of tables to vacuum
                tables = [
                    'accounts_studentprofile',
                    'companies_company',
                    'jobs_jobposting',
                    'jobs_jobapplication',
                    'metrics_metricscache',
                    'metrics_paginateddatacache',
                ]
                
                for table in tables:
                    try:
                        self.stdout.write(f"  🔄 Analyzing {table}...")
                        cursor.execute(f"ANALYZE {table}")
                        self.stdout.write(f"    ✓ Analyzed {table}")
                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(f"    ✗ Failed to analyze {table}: {str(e)}")
                        )
        else:
            self.stdout.write("  Database vacuum only available for PostgreSQL")

    def get_query_performance_tips(self):
        """Get query performance tips."""
        tips = [
            "Use select_related() for foreign key relationships",
            "Use prefetch_related() for many-to-many and reverse foreign key relationships",
            "Add database indexes for frequently filtered fields",
            "Use database-level pagination instead of loading all data",
            "Cache expensive calculations using the metrics system",
            "Use only() and defer() to limit fields when appropriate",
            "Consider using database functions for complex aggregations",
            "Monitor slow query logs to identify bottlenecks",
        ]
        
        self.stdout.write(self.style.HTTP_INFO('\n💡 Query Performance Tips:'))
        for i, tip in enumerate(tips, 1):
            self.stdout.write(f"  {i}. {tip}")

    def display_optimization_summary(self):
        """Display optimization summary."""
        self.stdout.write(self.style.HTTP_INFO('\n📋 Optimization Summary:'))
        self.stdout.write("  ✓ Database analysis completed")
        self.stdout.write("  ✓ Performance indexes created")
        self.stdout.write("  ✓ Database maintenance performed")
        self.stdout.write("\n  Next steps:")
        self.stdout.write("  1. Monitor query performance with Django Debug Toolbar")
        self.stdout.write("  2. Use database query logging to identify slow queries")
        self.stdout.write("  3. Regularly run cache warming commands")
        self.stdout.write("  4. Consider implementing Redis for better caching")
