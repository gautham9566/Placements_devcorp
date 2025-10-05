# Generated migration for performance indexes on Job models

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0001_initial'),
    ]

    operations = [
        # Add indexes for frequently queried fields on JobPosting
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_jobposting_active ON jobs_jobposting(is_active);",
            reverse_sql="DROP INDEX IF EXISTS idx_jobposting_active;"
        ),
        
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_jobposting_published ON jobs_jobposting(is_published);",
            reverse_sql="DROP INDEX IF EXISTS idx_jobposting_published;"
        ),
        
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_jobposting_type ON jobs_jobposting(job_type);",
            reverse_sql="DROP INDEX IF EXISTS idx_jobposting_type;"
        ),
        
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_jobposting_deadline ON jobs_jobposting(application_deadline);",
            reverse_sql="DROP INDEX IF EXISTS idx_jobposting_deadline;"
        ),
        
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_jobposting_created ON jobs_jobposting(created_at);",
            reverse_sql="DROP INDEX IF EXISTS idx_jobposting_created;"
        ),
        
        # Composite indexes for common queries
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_jobposting_active_published ON jobs_jobposting(is_active, is_published);",
            reverse_sql="DROP INDEX IF EXISTS idx_jobposting_active_published;"
        ),
        
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_jobposting_company_active ON jobs_jobposting(company_id, is_active);",
            reverse_sql="DROP INDEX IF EXISTS idx_jobposting_company_active;"
        ),
        
        # Add indexes for JobApplication
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_jobapplication_status ON jobs_jobapplication(status);",
            reverse_sql="DROP INDEX IF EXISTS idx_jobapplication_status;"
        ),
        
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_jobapplication_applied_at ON jobs_jobapplication(applied_at);",
            reverse_sql="DROP INDEX IF EXISTS idx_jobapplication_applied_at;"
        ),
        
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_jobapplication_updated_at ON jobs_jobapplication(updated_at);",
            reverse_sql="DROP INDEX IF EXISTS idx_jobapplication_updated_at;"
        ),
        
        # Composite indexes for applications
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_jobapplication_job_status ON jobs_jobapplication(job_id, status);",
            reverse_sql="DROP INDEX IF EXISTS idx_jobapplication_job_status;"
        ),
        
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_jobapplication_applicant_status ON jobs_jobapplication(applicant_id, status);",
            reverse_sql="DROP INDEX IF EXISTS idx_jobapplication_applicant_status;"
        ),
        
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_jobapplication_status_date ON jobs_jobapplication(status, applied_at);",
            reverse_sql="DROP INDEX IF EXISTS idx_jobapplication_status_date;"
        ),
    ]
