# Generated migration for performance indexes on Company

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('companies', '0001_initial'),
    ]

    operations = [
        # Add indexes for frequently queried fields on Company
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_company_name_lower ON companies_company(LOWER(name));",
            reverse_sql="DROP INDEX IF EXISTS idx_company_name_lower;"
        ),
        
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_company_tier ON companies_company(tier);",
            reverse_sql="DROP INDEX IF EXISTS idx_company_tier;"
        ),
        
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_company_industry ON companies_company(industry);",
            reverse_sql="DROP INDEX IF EXISTS idx_company_industry;"
        ),
        
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_company_location ON companies_company(location);",
            reverse_sql="DROP INDEX IF EXISTS idx_company_location;"
        ),
        
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_company_campus_recruiting ON companies_company(campus_recruiting);",
            reverse_sql="DROP INDEX IF EXISTS idx_company_campus_recruiting;"
        ),
        
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_company_active_jobs ON companies_company(total_active_jobs);",
            reverse_sql="DROP INDEX IF EXISTS idx_company_active_jobs;"
        ),
        
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_company_founded ON companies_company(founded);",
            reverse_sql="DROP INDEX IF EXISTS idx_company_founded;"
        ),
        
        # Composite indexes for common filter combinations
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_company_tier_industry ON companies_company(tier, industry);",
            reverse_sql="DROP INDEX IF EXISTS idx_company_tier_industry;"
        ),
        
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_company_campus_tier ON companies_company(campus_recruiting, tier);",
            reverse_sql="DROP INDEX IF EXISTS idx_company_campus_tier;"
        ),
        
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_company_location_industry ON companies_company(location, industry);",
            reverse_sql="DROP INDEX IF EXISTS idx_company_location_industry;"
        ),
        
        # Full-text search index for company search
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_company_search ON companies_company(name, description, industry, location);",
            reverse_sql="DROP INDEX IF EXISTS idx_company_search;"
        ),
    ]
