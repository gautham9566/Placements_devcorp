# Generated migration for performance indexes on StudentProfile

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        # Add indexes for frequently queried fields on StudentProfile
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_studentprofile_branch ON accounts_studentprofile(branch);",
            reverse_sql="DROP INDEX IF EXISTS idx_studentprofile_branch;"
        ),
        
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_studentprofile_passout_year ON accounts_studentprofile(passout_year);",
            reverse_sql="DROP INDEX IF EXISTS idx_studentprofile_passout_year;"
        ),
        
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_studentprofile_joining_year ON accounts_studentprofile(joining_year);",
            reverse_sql="DROP INDEX IF EXISTS idx_studentprofile_joining_year;"
        ),
        
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_studentprofile_gpa ON accounts_studentprofile(gpa);",
            reverse_sql="DROP INDEX IF EXISTS idx_studentprofile_gpa;"
        ),
        
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_studentprofile_name ON accounts_studentprofile(first_name, last_name);",
            reverse_sql="DROP INDEX IF EXISTS idx_studentprofile_name;"
        ),
        
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_studentprofile_search ON accounts_studentprofile(student_id, contact_email);",
            reverse_sql="DROP INDEX IF EXISTS idx_studentprofile_search;"
        ),
        
        # Composite indexes for common filter combinations
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_studentprofile_branch_year ON accounts_studentprofile(branch, passout_year);",
            reverse_sql="DROP INDEX IF EXISTS idx_studentprofile_branch_year;"
        ),
        
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_studentprofile_year_gpa ON accounts_studentprofile(passout_year, gpa);",
            reverse_sql="DROP INDEX IF EXISTS idx_studentprofile_year_gpa;"
        ),
        
        # Add indexes for User model if needed
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_user_email_lower ON accounts_user(LOWER(email));",
            reverse_sql="DROP INDEX IF EXISTS idx_user_email_lower;"
        ),
        
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_user_type_active ON accounts_user(user_type, is_active);",
            reverse_sql="DROP INDEX IF EXISTS idx_user_type_active;"
        ),
    ]
