"""
Management command to sync resumes with existing job applications
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from accounts.models import Resume, StudentProfile
from jobs.models import JobApplication


class Command(BaseCommand):
    help = 'Sync resume data with existing job applications'

    def add_arguments(self, parser):
        parser.add_argument(
            '--student-id',
            type=str,
            help='Update applications for a specific student ID only',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )

    def handle(self, *args, **options):
        student_id = options.get('student_id')
        dry_run = options.get('dry_run', False)
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
        
        # Get students to process
        if student_id:
            students = StudentProfile.objects.filter(student_id=student_id)
            if not students.exists():
                self.stdout.write(self.style.ERROR(f'Student with ID {student_id} not found'))
                return
        else:
            students = StudentProfile.objects.all()
        
        total_students = students.count()
        updated_apps = 0
        skipped_apps = 0
        
        self.stdout.write(f'Processing {total_students} students...')
        
        for student in students:
            # Get primary resume or latest resume for this student
            primary_resume = Resume.objects.filter(
                student=student,
                is_primary=True
            ).first()
            
            if not primary_resume:
                latest_resume = Resume.objects.filter(student=student).first()
                resume = latest_resume
            else:
                resume = primary_resume
            
            if not resume:
                self.stdout.write(
                    self.style.WARNING(f'  No resume found for {student.student_id}')
                )
                continue
            
            # Get all applications for this student
            applications = JobApplication.objects.filter(
                applicant=student.user
            )
            
            if not applications.exists():
                continue
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'  Processing {applications.count()} applications for {student.student_id}'
                )
            )
            
            # Update each application
            for app in applications:
                snapshot = app.applied_data_snapshot or {}
                
                # Check if resume is already in snapshot
                existing_resume = snapshot.get('documents', {}).get('resume_url')
                
                if existing_resume:
                    skipped_apps += 1
                    continue
                
                # Add resume to snapshot
                if 'documents' not in snapshot:
                    snapshot['documents'] = {}
                
                snapshot['documents']['resume_url'] = resume.file.url if resume.file else None
                snapshot['documents']['resume_id'] = resume.id
                snapshot['documents']['resume_name'] = resume.name
                snapshot['documents']['resume_uploaded_at'] = resume.uploaded_at.isoformat() if resume.uploaded_at else None
                
                if not dry_run:
                    app.applied_data_snapshot = snapshot
                    app.save(update_fields=['applied_data_snapshot'])
                
                updated_apps += 1
                self.stdout.write(f'    Updated application {app.id}')
        
        # Summary
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('SUMMARY'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(f'Total students processed: {total_students}')
        self.stdout.write(f'Applications updated: {updated_apps}')
        self.stdout.write(f'Applications skipped (already had resume): {skipped_apps}')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - No actual changes were made'))
        else:
            self.stdout.write(self.style.SUCCESS('All applications updated successfully!'))
