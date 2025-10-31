from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta, date
import random

from jobs.models import JobPosting, JobApplication
from accounts.models import StudentProfile
# EmployerProfile removed - using Company model directly

User = get_user_model()

class Command(BaseCommand):
    help = 'Create comprehensive test data for jobs, companies, and applications'

    def add_arguments(self, parser):
        parser.add_argument(
            '--companies',
            type=int,
            default=15,
            help='Number of companies to create',
        )
        parser.add_argument(
            '--jobs',
            type=int,
            default=50,
            help='Number of jobs to create',
        )
        parser.add_argument(
            '--students',
            type=int,
            default=100,
            help='Number of students to create',
        )
        parser.add_argument(
            '--applications',
            type=int,
            default=200,
            help='Number of applications to create',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Creating test data...'))


        # Create companies and employers
        companies_data = [
            {
                'name': 'Google',
                'description': 'A multinational technology company that specializes in Internet-related services and products.',
                'logo': 'https://logo.clearbit.com/google.com',
                'website': 'https://google.com',
                'location': 'Mountain View, CA',
                'employee_count': 139995,
                'industry': 'Technology',
                'founded': '1998',
                'tier': 'Tier 1'
            },
            {
                'name': 'Microsoft',
                'description': 'A multinational technology corporation that develops, manufactures, and sells computer software and hardware.',
                'logo': 'https://logo.clearbit.com/microsoft.com',
                'website': 'https://microsoft.com',
                'location': 'Redmond, WA',
                'employee_count': 221000,
                'industry': 'Technology',
                'founded': '1975',
                'tier': 'Tier 1'
            },
            {
                'name': 'Amazon',
                'description': 'A multinational technology company focusing on e-commerce, cloud computing, and artificial intelligence.',
                'logo': 'https://logo.clearbit.com/amazon.com',
                'website': 'https://amazon.com',
                'location': 'Seattle, WA',
                'employee_count': 1540000,
                'industry': 'E-commerce',
                'founded': '1994',
                'tier': 'Tier 1'
            },
            {
                'name': 'Meta',
                'description': 'A social media and technology company, formerly known as Facebook.',
                'logo': 'https://logo.clearbit.com/meta.com',
                'website': 'https://meta.com',
                'location': 'Menlo Park, CA',
                'employee_count': 86482,
                'industry': 'Social Media',
                'founded': '2004',
                'tier': 'Tier 1'
            },
            {
                'name': 'Apple',
                'description': 'A multinational technology company that designs and manufactures consumer electronics.',
                'logo': 'https://logo.clearbit.com/apple.com',
                'website': 'https://apple.com',
                'location': 'Cupertino, CA',
                'employee_count': 164000,
                'industry': 'Technology',
                'founded': '1976',
                'tier': 'Tier 1'
            },
            {
                'name': 'Netflix',
                'description': 'A streaming entertainment service with over 230 million paid memberships.',
                'logo': 'https://logo.clearbit.com/netflix.com',
                'website': 'https://netflix.com',
                'location': 'Los Gatos, CA',
                'employee_count': 12800,
                'industry': 'Entertainment',
                'founded': '1997',
                'tier': 'Tier 1'
            },
            {
                'name': 'Uber',
                'description': 'A mobility and delivery platform that connects people with rides and food.',
                'logo': 'https://logo.clearbit.com/uber.com',
                'website': 'https://uber.com',
                'location': 'San Francisco, CA',
                'employee_count': 32800,
                'industry': 'Transportation',
                'founded': '2009',
                'tier': 'Tier 2'
            },
            {
                'name': 'Spotify',
                'description': 'A digital music streaming service that gives you access to millions of songs.',
                'logo': 'https://logo.clearbit.com/spotify.com',
                'website': 'https://spotify.com',
                'location': 'Stockholm, Sweden',
                'employee_count': 9800,
                'industry': 'Music',
                'founded': '2006',
                'tier': 'Tier 2'
            },
            {
                'name': 'Airbnb',
                'description': 'An online marketplace for short-term homestays and experiences.',
                'logo': 'https://logo.clearbit.com/airbnb.com',
                'website': 'https://airbnb.com',
                'location': 'San Francisco, CA',
                'employee_count': 6907,
                'industry': 'Travel',
                'founded': '2008',
                'tier': 'Tier 2'
            },
            {
                'name': 'Stripe',
                'description': 'A financial services and software as a service company.',
                'logo': 'https://logo.clearbit.com/stripe.com',
                'website': 'https://stripe.com',
                'location': 'San Francisco, CA',
                'employee_count': 8000,
                'industry': 'FinTech',
                'founded': '2010',
                'tier': 'Tier 2'
            },
            {
                'name': 'Coinbase',
                'description': 'A digital currency exchange and wallet service.',
                'logo': 'https://logo.clearbit.com/coinbase.com',
                'website': 'https://coinbase.com',
                'location': 'San Francisco, CA',
                'employee_count': 4948,
                'industry': 'Cryptocurrency',
                'founded': '2012',
                'tier': 'Tier 2'
            },
            {
                'name': 'Razorpay',
                'description': 'A digital payments platform that allows businesses to accept online payments.',
                'logo': 'https://logo.clearbit.com/razorpay.com',
                'website': 'https://razorpay.com',
                'location': 'Bangalore, India',
                'employee_count': 3000,
                'industry': 'FinTech',
                'founded': '2014',
                'tier': 'Tier 3'
            },
            {
                'name': 'Zomato',
                'description': 'A restaurant aggregator and food delivery platform.',
                'logo': 'https://logo.clearbit.com/zomato.com',
                'website': 'https://zomato.com',
                'location': 'Gurugram, India',
                'employee_count': 5000,
                'industry': 'Food Tech',
                'founded': '2008',
                'tier': 'Tier 3'
            },
            {
                'name': 'Paytm',
                'description': 'A digital payments and financial services company.',
                'logo': 'https://logo.clearbit.com/paytm.com',
                'website': 'https://paytm.com',
                'location': 'Noida, India',
                'employee_count': 26000,
                'industry': 'FinTech',
                'founded': '2010',
                'tier': 'Tier 3'
            },
            {
                'name': 'Swiggy',
                'description': 'An online food ordering and delivery platform.',
                'logo': 'https://logo.clearbit.com/swiggy.com',
                'website': 'https://swiggy.com',
                'location': 'Bangalore, India',
                'employee_count': 5000,
                'industry': 'Food Tech',
                'founded': '2014',
                'tier': 'Tier 3'
            }
        ]

        # Create companies directly using Company model
        from companies.models import Company
        companies = []
        for i, company_data in enumerate(companies_data[:options['companies']]):
            # Map provided company_data keys to the actual Company model fields.
            # The incoming data contains 'employee_count' but the Company model
            # uses a `size` CharField. Convert/format accordingly and only pass
            # valid field names to get_or_create to avoid FieldError.
            emp_count = company_data.get('employee_count')
            if emp_count is not None:
                size = f"{emp_count:,} employees"
            else:
                size = company_data.get('size', '')

            # Create company directly
            company, created = Company.objects.get_or_create(
                name=company_data['name'],
                defaults={
                    'description': company_data.get('description', ''),
                    'logo': company_data.get('logo', ''),
                    'website': company_data.get('website', ''),
                    'location': company_data.get('location', ''),
                    'industry': company_data.get('industry', ''),
                    'founded': company_data.get('founded', ''),
                    'tier': company_data.get('tier', 'Tier 3'),
                    'size': size,
                }
            )
            companies.append(company)
            
        self.stdout.write(self.style.SUCCESS(f'Created {len(companies)} companies'))

        # Create students
        students = []
        branches = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Chemical', 'Biotechnology']
        for i in range(options['students']):
            student_user, created = User.objects.get_or_create(
                email=f'student{i+1}@amrita.edu',
                defaults={
                    'user_type': User.UserType.STUDENT,
                    'password': 'temppass123'
                }
            )
            
            student_profile, created = StudentProfile.objects.get_or_create(
                user=student_user,
                defaults={
                    'first_name': f'Student{i+1}',
                    'last_name': 'Amrita',
                    'student_id': f'AMR{2021 + (i % 4)}{str(i+1).zfill(4)}',
                    'branch': random.choice(branches),
                    'gpa': f'{random.uniform(6.5, 9.5):.2f}',
                    'contact_email': student_user.email,
                }
            )
            students.append(student_user)
            
        self.stdout.write(self.style.SUCCESS(f'Created {len(students)} students'))

        # Create jobs
        job_titles = [
            'Software Engineer', 'Senior Software Engineer', 'Full Stack Developer',
            'Backend Developer', 'Frontend Developer', 'DevOps Engineer',
            'Data Scientist', 'Machine Learning Engineer', 'Product Manager',
            'Software Engineer Intern', 'Data Analyst', 'QA Engineer',
            'Mobile App Developer', 'Cloud Architect', 'System Administrator'
        ]
        
        job_types = ['FULL_TIME', 'INTERNSHIP', 'CONTRACT', 'PART_TIME']
        locations = ['Remote', 'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune']
        
        jobs = []
        for i in range(options['jobs']):
            company = random.choice(companies)
            job_type = random.choice(job_types)
            title = random.choice(job_titles)
            
            # Adjust salary based on job type
            if job_type == 'INTERNSHIP':
                salary_min = random.randint(15000, 30000)
                salary_max = random.randint(salary_min, salary_min + 15000)
            else:
                salary_min = random.randint(300000, 800000)
                salary_max = random.randint(salary_min, salary_min + 500000)
            
            job = JobPosting.objects.create(
                company=company,
                title=title,
                description=f"We are looking for a talented {title} to join our team. You will be responsible for developing high-quality software solutions and working with cross-functional teams.",
                location=random.choice(locations),
                job_type=job_type,
                salary_min=salary_min,
                salary_max=salary_max,
                required_skills="Python, Django, React, JavaScript, SQL, Git",
                application_deadline=date.today() + timedelta(days=random.randint(30, 90)),
                is_active=random.choice([True, True, True, False]),  # 75% active
                on_campus=random.choice([True, False])
            )
            jobs.append(job)
            
        self.stdout.write(self.style.SUCCESS(f'Created {len(jobs)} jobs'))

        # Create applications
        application_statuses = ['APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'REJECTED', 'HIRED']
        application_weights = [0.4, 0.3, 0.15, 0.1, 0.05]  # Realistic distribution
        
        applications = []
        for i in range(options['applications']):
            student = random.choice(students)
            job = random.choice([j for j in jobs if j.is_active])
            
            # Check if application already exists
            if JobApplication.objects.filter(job=job, applicant=student).exists():
                continue
                
            # Safely determine university info from student profile.
            profile = getattr(student, 'student_profile', None)
            university = None
            if profile:
                university = getattr(profile, 'college_name', None)
                college_obj = getattr(profile, 'college', None)
                if not university and college_obj:
                    # college_obj may be a FK to a College model; get its name safely
                    university = getattr(college_obj, 'name', None)

            application = JobApplication.objects.create(
                job=job,
                applicant=student,
                cover_letter=f"Dear Hiring Manager,\n\nI am excited to apply for the {job.title} position at {job.company.name}. With my strong background in software development and passion for technology, I believe I would be a great fit for your team.\n\nBest regards,\n{student.student_profile.first_name}",
                status=random.choices(application_statuses, weights=application_weights)[0],
                applied_data_snapshot={
                    "basic_info": {
                        "name": f"{student.student_profile.first_name} {student.student_profile.last_name}",
                        "email": student.student_profile.contact_email or student.email,
                        "student_id": student.student_profile.student_id,
                        "branch": student.student_profile.branch,
                        "current_cgpa": student.student_profile.gpa,
                        "university": university,
                    },
                    "academic_info": {
                        "tenth_percentage": student.student_profile.tenth_percentage,
                        "twelfth_percentage": student.student_profile.twelfth_percentage,
                        "graduation_year": student.student_profile.passout_year,
                        "joining_year": student.student_profile.joining_year,
                    },
                    "contact_info": {
                        "phone": student.student_profile.phone,
                        "city": student.student_profile.city,
                        "state": student.student_profile.state,
                    },
                    "custom_responses": {
                        "portfolio_url": f"https://portfolio-{student.id}.example.com",
                        "preferred_start_date": random.choice(["Immediately", "1 month", "2 months"])
                    },
                    "metadata": {
                        "form_version": "1.0",
                        "submission_timestamp": timezone.now().isoformat(),
                    }
                }
            )
            applications.append(application)
            
        self.stdout.write(self.style.SUCCESS(f'Created {len(applications)} applications'))
        
        # Summary
        self.stdout.write(self.style.SUCCESS('=== Test Data Creation Complete ==='))
        self.stdout.write(self.style.SUCCESS(f'Companies: {Company.objects.count()}'))
        self.stdout.write(self.style.SUCCESS(f'Students: {StudentProfile.objects.count()}'))
        self.stdout.write(self.style.SUCCESS(f'Jobs: {JobPosting.objects.count()}'))
        self.stdout.write(self.style.SUCCESS(f'Applications: {JobApplication.objects.count()}'))
        self.stdout.write(self.style.SUCCESS('=== API Endpoints Ready ==='))
        self.stdout.write(self.style.SUCCESS('Company API: /api/v1/college/amrita/companies/'))
        self.stdout.write(self.style.SUCCESS('Jobs API: /api/v1/college/amrita/jobs/'))
        self.stdout.write(self.style.SUCCESS('Applications API: /api/v1/college/amrita/applications/'))
        self.stdout.write(self.style.SUCCESS('Stats API: /api/v1/college/amrita/jobs/stats/')) 