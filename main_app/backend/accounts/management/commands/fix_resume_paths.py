"""
Management command to fix resume paths in the database.
Updates old paths (/media/resumes/) to new paths (/media/students/{rollnumber}/resumes/)
"""
import os
from django.core.management.base import BaseCommand
from django.conf import settings
from accounts.models import StudentProfile


class Command(BaseCommand):
    help = 'Fix resume paths in the database to use the new structure'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
        
        # Get all student profiles with resumes
        profiles = StudentProfile.objects.filter(resume__isnull=False).exclude(resume='')
        
        self.stdout.write(f'Found {profiles.count()} profiles with resumes')
        
        updated_count = 0
        error_count = 0
        
        for profile in profiles:
            old_path = profile.resume.name  # This is the relative path
            old_full_path = profile.resume.path  # This is the absolute path
            
            # Check if it's using the old path structure
            if not old_path.startswith(f'students/{profile.student_id}/resumes/'):
                # Extract just the filename
                filename = os.path.basename(old_path)
                
                # Build the new path
                new_path = f'students/{profile.student_id}/resumes/{filename}'
                new_full_path = os.path.join(settings.MEDIA_ROOT, new_path)
                
                # Check if the file exists in the new location
                if os.path.exists(new_full_path):
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'✓ Student {profile.student_id} ({profile.first_name} {profile.last_name})'
                        )
                    )
                    self.stdout.write(f'  Old: {old_path}')
                    self.stdout.write(f'  New: {new_path}')
                    self.stdout.write(f'  File exists: YES')
                    
                    if not dry_run:
                        # Update the database record
                        profile.resume.name = new_path
                        profile.save(update_fields=['resume'])
                        updated_count += 1
                        self.stdout.write(self.style.SUCCESS('  UPDATED'))
                    else:
                        self.stdout.write(self.style.WARNING('  WOULD UPDATE'))
                    
                else:
                    # File doesn't exist in new location
                    self.stdout.write(
                        self.style.WARNING(
                            f'⚠ Student {profile.student_id} ({profile.first_name} {profile.last_name})'
                        )
                    )
                    self.stdout.write(f'  Old: {old_path}')
                    self.stdout.write(f'  New: {new_path}')
                    self.stdout.write(f'  File exists: NO')
                    
                    # Check if old file exists
                    if os.path.exists(old_full_path):
                        self.stdout.write(self.style.ERROR('  Old file exists but not in new location!'))
                        self.stdout.write(f'  Consider moving: {old_full_path} -> {new_full_path}')
                    else:
                        self.stdout.write(self.style.ERROR('  File missing from both locations!'))
                    
                    error_count += 1
        
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 60))
        if dry_run:
            self.stdout.write(self.style.WARNING(f'Would update: {updated_count} records'))
            self.stdout.write(self.style.WARNING(f'Errors/Warnings: {error_count} records'))
            self.stdout.write('')
            self.stdout.write(self.style.SUCCESS('Run without --dry-run to apply changes'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Updated: {updated_count} records'))
            self.stdout.write(self.style.WARNING(f'Errors/Warnings: {error_count} records'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
