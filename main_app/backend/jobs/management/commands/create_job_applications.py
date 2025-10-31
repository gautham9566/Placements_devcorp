from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Count
from datetime import datetime, timedelta
import random

from jobs.models import JobPosting, JobApplication
from accounts.models import StudentProfile
from companies.models import Company
from jobs.views import create_enhanced_application_snapshot

User = get_user_model()

class Command(BaseCommand):
    help = 'Create realistic job applications using existing students and job postings'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=100,
            help='Number of job applications to create (default: 100)',
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing job applications before creating new ones',
        )

    def handle(self, *args, **options):
        if options['clear']:
            JobApplication.objects.all().delete()
            self.stdout.write(
                self.style.WARNING('Cleared all existing job applications')
            )

        # Check if we have students and jobs
        students = User.objects.filter(user_type=User.UserType.STUDENT).select_related('student_profile')
        jobs = JobPosting.objects.filter(is_active=True, is_published=True)
        
        if not students.exists():
            self.stdout.write(
                self.style.ERROR('No students found. Please create students first using: python manage.py create_student_user')
            )
            return
            
        if not jobs.exists():
            self.stdout.write(
                self.style.ERROR('No active jobs found. Please create jobs first using: python manage.py create_job_postings --count 50')
            )
            return

        self.stdout.write(
            self.style.SUCCESS(f'Found {students.count()} students and {jobs.count()} active jobs')
        )

        # Application status distribution (realistic)
        application_statuses = ['APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'REJECTED', 'HIRED']
        application_weights = [0.45, 0.25, 0.15, 0.12, 0.03]  # Most are still "APPLIED"

        # Cover letter templates
        cover_letter_templates = [
            "Dear Hiring Manager,\n\nI am excited to apply for the {job_title} position at {company_name}. With my strong background in {branch} and passion for technology, I believe I would be a valuable addition to your team.\n\nMy academic achievements include a current CGPA of {cgpa}, and I have developed skills in {skills}. I am particularly interested in this role because it aligns with my career goals and interests.\n\nI am available for an interview at your convenience and look forward to hearing from you.\n\nBest regards,\n{student_name}",
            
            "Dear {company_name} Team,\n\nI am writing to express my interest in the {job_title} position. As a {branch} student with a CGPA of {cgpa}, I am eager to contribute to your organization.\n\nThroughout my academic journey, I have focused on developing technical skills including {skills}. I am particularly drawn to {company_name} because of its reputation for innovation and excellence.\n\nI would welcome the opportunity to discuss how my background and enthusiasm can contribute to your team.\n\nSincerely,\n{student_name}",
            
            "Hello,\n\nI am {student_name}, a {branch} student interested in the {job_title} role at {company_name}. With my academic background and {cgpa} CGPA, I am confident I can make a meaningful contribution to your team.\n\nI have experience with {skills} and am eager to apply these skills in a professional environment. Your company's commitment to innovation aligns perfectly with my career aspirations.\n\nThank you for considering my application. I look forward to the opportunity to discuss this role further.\n\nBest,\n{student_name}",
        ]

        count = options['count']
        applications_created = 0
        attempts = 0
        max_attempts = count * 5  # Allow multiple attempts to avoid duplicates

        # Custom responses templates for different types of applications
        custom_responses_templates = [
            {
                "portfolio_url": "https://portfolio-{student_id}.github.io",
                "github_profile": "https://github.com/{student_id}",
                "preferred_start_date": "Immediately",
                "relocate_willingness": "Yes",
                "notice_period": "Not applicable",
                "expected_salary": "As per company standards",
                "work_authorization": "Yes",
                "availability_for_interview": "Available on weekdays"
            },
            {
                "portfolio_url": "https://{student_id}.netlify.app",
                "linkedin_profile": "https://linkedin.com/in/{student_id}",
                "preferred_start_date": "Within 1 month",
                "relocate_willingness": "Flexible",
                "notice_period": "Immediate",
                "expected_salary": "Negotiable",
                "work_authorization": "Yes",
                "availability_for_interview": "Flexible timing"
            },
            {
                "github_profile": "https://github.com/{student_id}",
                "preferred_start_date": "After graduation",
                "relocate_willingness": "Depends on location",
                "notice_period": "Academic commitments until {graduation_date}",
                "expected_salary": "Market competitive",
                "work_authorization": "Will obtain necessary authorization",
                "availability_for_interview": "Weekends preferred"
            }
        ]

        while applications_created < count and attempts < max_attempts:
            attempts += 1
            
            # Select random student and job
            student = random.choice(students)
            job = random.choice(jobs)
            
            # Check if application already exists
            if JobApplication.objects.filter(job=job, applicant=student).exists():
                continue

            # Skip if student doesn't have a complete profile
            if not hasattr(student, 'student_profile'):
                continue
                
            student_profile = student.student_profile
            
            # Skip if essential student data is missing
            if not student_profile.first_name or not student_profile.last_name:
                continue

            try:
                # Generate application status
                status = random.choices(application_statuses, weights=application_weights)[0]
                
                # Generate cover letter
                cover_letter_template = random.choice(cover_letter_templates)
                cover_letter = cover_letter_template.format(
                    job_title=job.title,
                    company_name=job.company.name,
                    branch=student_profile.branch or 'Computer Science',
                    cgpa=student_profile.gpa or '8.0',
                    skills=student_profile.skills or 'Programming, Problem Solving',
                    student_name=f"{student_profile.first_name} {student_profile.last_name}"
                )
                
                # Generate custom responses
                custom_template = random.choice(custom_responses_templates)
                custom_responses = {}
                for key, value in custom_template.items():
                    if '{student_id}' in value:
                        custom_responses[key] = value.format(
                            student_id=student_profile.student_id or f"student{student.id}"
                        )
                    elif '{graduation_date}' in value:
                        graduation_date = f"{student_profile.passout_year or 2025}-06-01"
                        custom_responses[key] = value.format(graduation_date=graduation_date)
                    else:
                        custom_responses[key] = value

                # Create enhanced application snapshot
                snapshot = create_enhanced_application_snapshot(
                    student_profile=student_profile,
                    custom_responses=custom_responses
                )
                
                # Add some metadata
                snapshot['metadata'] = {
                    'form_version': '2.0',
                    'submission_timestamp': timezone.now().isoformat(),
                    'submission_ip': f"192.168.1.{random.randint(1, 254)}",
                    'user_agent': random.choice([
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
                    ]),
                    'application_source': 'web_portal'
                }

                # Create the application with realistic applied_at time
                # Applications created over the last 90 days
                days_ago = random.randint(1, 90)
                applied_at = timezone.now() - timedelta(days=days_ago)
                
                application = JobApplication.objects.create(
                    job=job,
                    applicant=student,
                    cover_letter=cover_letter,
                    status=status,
                    applied_data_snapshot=snapshot,
                    applied_at=applied_at
                )
                
                # If status is not "APPLIED", add status history
                if status != 'APPLIED':
                    status_changes = ['APPLIED']
                    current_status = 'APPLIED'
                    
                    # Build realistic status progression
                    if status in ['UNDER_REVIEW', 'SHORTLISTED', 'REJECTED', 'HIRED']:
                        status_changes.append('UNDER_REVIEW')
                        current_status = 'UNDER_REVIEW'
                    
                    if status in ['SHORTLISTED', 'HIRED']:
                        status_changes.append('SHORTLISTED')
                        current_status = 'SHORTLISTED'
                    
                    if status == 'REJECTED' and len(status_changes) == 2:
                        # Some rejections happen after shortlisting
                        if random.random() < 0.3:  # 30% chance
                            status_changes.append('SHORTLISTED')
                            current_status = 'SHORTLISTED'
                    
                    if status == 'HIRED':
                        status_changes.append('HIRED')
                        current_status = 'HIRED'
                    elif status == 'REJECTED':
                        status_changes.append('REJECTED')
                        current_status = 'REJECTED'
                    
                    # Create status history
                    status_history = []
                    base_time = applied_at
                    
                    for i, status_change in enumerate(status_changes[1:], 1):  # Skip initial APPLIED
                        days_offset = i * random.randint(3, 14)  # 3-14 days between status changes
                        change_time = base_time + timedelta(days=days_offset)
                        
                        if change_time <= timezone.now():  # Don't create future status changes
                            status_history.append({
                                'from_status': status_changes[i-1],
                                'to_status': status_change,
                                'changed_at': change_time.isoformat(),
                                'changed_by': None,  # System/automated change
                                'notes': f'Status updated to {status_change.replace("_", " ").title()}'
                            })
                    
                    if status_history:
                        application.status_history = status_history
                        application.save()

                applications_created += 1
                
                # Progress indicator
                if applications_created % 20 == 0:
                    self.stdout.write(
                        self.style.SUCCESS(f'Created {applications_created}/{count} applications...')
                    )

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error creating application for {student.email} -> {job.title}: {str(e)}')
                )
                continue

        self.stdout.write(
            self.style.SUCCESS(f'\nCompleted! Created {applications_created} job applications.')
        )
        
        # Show some statistics
        total_applications = JobApplication.objects.count()
        status_counts = JobApplication.objects.values('status').annotate(count=Count('status')).order_by('status')
        
        self.stdout.write(self.style.SUCCESS(f'Total applications in database: {total_applications}'))
        self.stdout.write(self.style.SUCCESS('Status distribution:'))
        for status_count in status_counts:
            self.stdout.write(f"  {status_count['status']}: {status_count['count']}")
            
        # Show company-wise distribution
        self.stdout.write(self.style.SUCCESS('\nTop companies by applications:'))
        company_counts = JobApplication.objects.values(
            'job__company__name'
        ).annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        for company_count in company_counts:
            self.stdout.write(f"  {company_count['job__company__name']}: {company_count['count']}") 