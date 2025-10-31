from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
import random

from jobs.models import JobPosting
from companies.models import Company


class Command(BaseCommand):
    help = 'Create job postings for existing companies with realistic data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=150,
            help='Number of job postings to create (default: 150)',
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing job postings before creating new ones',
        )

    def handle(self, *args, **options):
        if options['clear']:
            JobPosting.objects.all().delete()
            self.stdout.write(
                self.style.WARNING('Cleared all existing job postings')
            )

        # Get all companies
        companies = list(Company.objects.all())
        if not companies:
            self.stdout.write(
                self.style.ERROR('No companies found. Please create companies first using: python manage.py create_companies --count 50')
            )
            return

        count = options['count']
        
        # Job title templates organized by category
        job_templates = {
            'software_engineering': [
                'Software Engineer',
                'Senior Software Engineer', 
                'Full Stack Developer',
                'Backend Developer',
                'Frontend Developer',
                'Software Engineer Intern',
                'Junior Software Developer',
                'Lead Software Engineer',
                'Principal Software Engineer'
            ],
            'data_science': [
                'Data Scientist',
                'Senior Data Scientist',
                'Data Analyst',
                'Data Engineer',
                'Machine Learning Engineer',
                'AI Research Scientist',
                'Data Science Intern',
                'Business Intelligence Analyst'
            ],
            'product_management': [
                'Product Manager',
                'Senior Product Manager',
                'Product Owner',
                'Product Marketing Manager',
                'Technical Product Manager',
                'Product Strategy Manager',
                'Product Manager Intern'
            ],
            'engineering_ops': [
                'DevOps Engineer',
                'Site Reliability Engineer',
                'Cloud Engineer',
                'Infrastructure Engineer',
                'Platform Engineer',
                'Security Engineer',
                'QA Engineer',
                'Test Automation Engineer'
            ],
            'design_ux': [
                'UI/UX Designer',
                'Product Designer',
                'Visual Designer',
                'UX Researcher',
                'Design Intern',
                'Graphic Designer'
            ],
            'sales_marketing': [
                'Sales Development Representative',
                'Account Executive',
                'Customer Success Manager',
                'Marketing Manager',
                'Digital Marketing Specialist',
                'Growth Marketing Manager',
                'Sales Engineer'
            ],
            'operations': [
                'Operations Manager',
                'Business Operations Analyst',
                'Supply Chain Manager',
                'Project Manager',
                'Scrum Master',
                'Program Manager'
            ],
            'finance': [
                'Financial Analyst',
                'Business Analyst',
                'Investment Banking Analyst',
                'Risk Analyst',
                'Corporate Development Associate'
            ]
        }

        # Flatten all job titles
        all_job_titles = []
        for category, titles in job_templates.items():
            all_job_titles.extend(titles)

        # Job type distribution (weighted)
        job_types = ['FULL_TIME', 'INTERNSHIP', 'CONTRACT', 'PART_TIME']
        job_type_weights = [0.6, 0.25, 0.10, 0.05]  # 60% full-time, 25% internship, etc.

        # Location options
        locations = [
            'Remote', 'Hybrid', 'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 
            'Chennai', 'Pune', 'Gurgaon', 'Noida', 'Kolkata', 'Ahmedabad',
            'San Francisco, CA', 'New York, NY', 'Seattle, WA', 'Austin, TX',
            'Boston, MA', 'Los Angeles, CA', 'Chicago, IL', 'Denver, CO'
        ]

        # Skills by category
        skill_sets = {
            'software_engineering': ['Python', 'Java', 'JavaScript', 'React', 'Node.js', 'Django', 'Flask', 'Spring Boot', 'Angular', 'Vue.js', 'Git', 'Docker', 'Kubernetes'],
            'data_science': ['Python', 'R', 'SQL', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Scikit-learn', 'Tableau', 'Power BI'],
            'cloud_devops': ['AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'CI/CD', 'Linux', 'Ansible', 'Prometheus'],
            'frontend': ['JavaScript', 'TypeScript', 'React', 'Angular', 'Vue.js', 'HTML', 'CSS', 'SASS', 'Webpack', 'Redux'],
            'backend': ['Python', 'Java', 'Node.js', 'Go', 'Ruby', 'C#', '.NET', 'Django', 'Spring', 'Express.js', 'PostgreSQL', 'MongoDB'],
            'mobile': ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Java', 'Objective-C', 'Android', 'iOS'],
            'general': ['Communication', 'Problem Solving', 'Team Work', 'Leadership', 'Agile', 'Scrum', 'Project Management']
        }

        created_jobs = []
        
        for i in range(count):
            try:
                # Select random company
                company = random.choice(companies)
                
                # Select job title
                job_title = random.choice(all_job_titles)
                
                # Select job type based on weights
                job_type = random.choices(job_types, weights=job_type_weights)[0]
                
                # Generate salary based on job type and company tier
                salary_min, salary_max = self.generate_salary(job_type, company.tier, job_title)
                
                # Generate deadline (30-90 days from now)
                deadline = date.today() + timedelta(days=random.randint(30, 90))
                
                # Generate skills based on job title
                skills = self.generate_skills(job_title, skill_sets)
                
                # Generate description
                description = self.generate_job_description(job_title, company.name, skills)
                
                # Determine publish status (70% published, 30% to be published)
                is_published = random.choices([True, False], weights=[0.7, 0.3])[0]
                
                # Create job posting
                job = JobPosting.objects.create(
                    company=company,
                    title=job_title,
                    description=description,
                    location=random.choice(locations),
                    job_type=job_type,
                    salary_min=salary_min,
                    salary_max=salary_max,
                    required_skills=', '.join(skills),
                    application_deadline=deadline,
                    is_active=True,
                    is_published=is_published,
                    on_campus=True
                )
                
                created_jobs.append(job)
                
                if (i + 1) % 25 == 0:
                    self.stdout.write(
                        self.style.SUCCESS(f'Created {i + 1} job postings...')
                    )
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error creating job {i + 1}: {str(e)}')
                )

        # Update company metrics
        self.update_company_metrics()
        
        # Summary statistics
        total_created = len(created_jobs)
        published_count = sum(1 for job in created_jobs if job.is_published)
        to_be_published_count = total_created - published_count
        
        self.stdout.write(self.style.SUCCESS(f'\n=== Job Creation Complete ==='))
        self.stdout.write(self.style.SUCCESS(f'Total jobs created: {total_created}'))
        self.stdout.write(self.style.SUCCESS(f'Published jobs: {published_count}'))
        self.stdout.write(self.style.SUCCESS(f'To be published: {to_be_published_count}'))
        
        # Show breakdown by job type
        job_type_stats = {}
        for job in created_jobs:
            job_type_stats[job.job_type] = job_type_stats.get(job.job_type, 0) + 1
        
        self.stdout.write(self.style.SUCCESS(f'\nJob Type Breakdown:'))
        for job_type, count in job_type_stats.items():
            self.stdout.write(f'  {job_type}: {count} jobs')
            
        # Show breakdown by company tier
        tier_stats = {}
        for job in created_jobs:
            tier = job.company.tier
            tier_stats[tier] = tier_stats.get(tier, 0) + 1
            
        self.stdout.write(self.style.SUCCESS(f'\nCompany Tier Breakdown:'))
        for tier, count in tier_stats.items():
            self.stdout.write(f'  {tier}: {count} jobs')

    def generate_salary(self, job_type, company_tier, job_title):
        """Generate realistic salary ranges based on job type, company tier, and seniority"""
        
        # Base salary ranges by job type
        if job_type == 'INTERNSHIP':
            base_min, base_max = 15000, 50000  # Monthly stipend
        elif job_type == 'PART_TIME':
            base_min, base_max = 200000, 500000  # Annual for part-time
        elif job_type == 'CONTRACT':
            base_min, base_max = 400000, 1200000  # Annual contract
        else:  # FULL_TIME
            base_min, base_max = 300000, 2500000  # Annual full-time
        
        # Adjust based on company tier
        tier_multipliers = {
            'Tier 1': 1.5,
            'Tier 2': 1.2,
            'Tier 3': 1.0
        }
        multiplier = tier_multipliers.get(company_tier, 1.0)
        
        # Adjust based on seniority (inferred from job title)
        seniority_multipliers = {
            'intern': 0.3,
            'junior': 0.6,
            'associate': 0.8,
            'senior': 1.4,
            'lead': 1.8,
            'principal': 2.2,
            'director': 2.8,
            'vp': 3.5
        }
        
        title_lower = job_title.lower()
        seniority_mult = 1.0
        for level, mult in seniority_multipliers.items():
            if level in title_lower:
                seniority_mult = mult
                break
        
        # Calculate final range
        final_min = int(base_min * multiplier * seniority_mult)
        final_max = int(base_max * multiplier * seniority_mult)
        
        # Add some randomness (±15%)
        variance = 0.15
        final_min = int(final_min * (1 - variance + 2 * variance * random.random()))
        final_max = int(final_max * (1 - variance + 2 * variance * random.random()))
        
        # Ensure max >= min
        if final_max < final_min:
            final_max = final_min + 50000
            
        return final_min, final_max

    def generate_skills(self, job_title, skill_sets):
        """Generate relevant skills based on job title"""
        title_lower = job_title.lower()
        selected_skills = []
        
        # Map job titles to skill categories
        if any(term in title_lower for term in ['software', 'developer', 'engineer', 'programmer']):
            if 'frontend' in title_lower or 'ui' in title_lower:
                selected_skills.extend(random.sample(skill_sets['frontend'], random.randint(4, 6)))
            elif 'backend' in title_lower or 'server' in title_lower:
                selected_skills.extend(random.sample(skill_sets['backend'], random.randint(4, 6)))
            elif 'full stack' in title_lower or 'fullstack' in title_lower:
                selected_skills.extend(random.sample(skill_sets['frontend'], random.randint(2, 3)))
                selected_skills.extend(random.sample(skill_sets['backend'], random.randint(2, 3)))
            elif 'mobile' in title_lower or 'android' in title_lower or 'ios' in title_lower:
                selected_skills.extend(random.sample(skill_sets['mobile'], random.randint(3, 5)))
            else:
                selected_skills.extend(random.sample(skill_sets['software_engineering'], random.randint(4, 6)))
                
        elif any(term in title_lower for term in ['data', 'analytics', 'machine learning', 'ai']):
            selected_skills.extend(random.sample(skill_sets['data_science'], random.randint(4, 6)))
            
        elif any(term in title_lower for term in ['devops', 'sre', 'cloud', 'infrastructure', 'platform']):
            selected_skills.extend(random.sample(skill_sets['cloud_devops'], random.randint(4, 6)))
            
        else:
            # General technical skills
            all_technical = skill_sets['software_engineering'] + skill_sets['general']
            selected_skills.extend(random.sample(all_technical, random.randint(3, 5)))
        
        # Always add some general skills
        selected_skills.extend(random.sample(skill_sets['general'], random.randint(1, 2)))
        
        # Remove duplicates and return
        return list(set(selected_skills))

    def generate_job_description(self, job_title, company_name, skills):
        """Generate a realistic job description"""
        
        descriptions = [
            f"We are looking for a talented {job_title} to join our team at {company_name}. "
            f"You will be responsible for developing high-quality software solutions and working with cross-functional teams to deliver exceptional products.",
            
            f"Join {company_name} as a {job_title} and help us build the next generation of innovative solutions. "
            f"You'll work in a collaborative environment with cutting-edge technologies and contribute to impactful projects.",
            
            f"{company_name} is seeking a motivated {job_title} to drive technical excellence and innovation. "
            f"This role offers the opportunity to work on challenging problems and make a significant impact on our products and services.",
            
            f"Are you passionate about technology and problem-solving? Join our team at {company_name} as a {job_title}. "
            f"You'll be part of a dynamic team building scalable solutions that impact millions of users worldwide.",
            
            f"We're hiring a {job_title} to join our growing team at {company_name}. "
            f"This is an excellent opportunity to work with modern technologies, learn from industry experts, and contribute to meaningful projects."
        ]
        
        base_description = random.choice(descriptions)
        
        responsibilities = [
            "• Design, develop, and maintain high-quality software applications",
            "• Collaborate with cross-functional teams to define and implement new features",
            "• Write clean, efficient, and well-documented code",
            "• Participate in code reviews and contribute to technical discussions",
            "• Debug and resolve technical issues in a timely manner",
            "• Stay updated with the latest industry trends and technologies",
            "• Mentor junior team members and share knowledge",
            "• Contribute to architectural decisions and technical strategy"
        ]
        
        selected_responsibilities = random.sample(responsibilities, random.randint(4, 6))
        
        requirements = [
            f"• Proficiency in: {', '.join(skills[:5])}",
            "• Strong problem-solving and analytical skills",
            "• Excellent communication and teamwork abilities",
            "• Bachelor's degree in Computer Science or related field",
            "• Experience with agile development methodologies"
        ]
        
        if 'senior' in job_title.lower() or 'lead' in job_title.lower():
            requirements.append("• 3+ years of professional experience")
            requirements.append("• Leadership and mentoring experience")
        elif 'intern' in job_title.lower():
            requirements = [
                "• Currently pursuing a degree in Computer Science or related field",
                "• Strong foundation in programming concepts",
                f"• Familiarity with: {', '.join(skills[:3])}",
                "• Eagerness to learn and contribute to team projects"
            ]
        
        full_description = f"""{base_description}

Responsibilities:
{chr(10).join(selected_responsibilities)}

Requirements:
{chr(10).join(requirements)}

What we offer:
• Competitive salary and benefits package
• Flexible working arrangements
• Professional development opportunities
• Collaborative and inclusive work environment
• Cutting-edge technology and tools"""

        return full_description

    def update_company_metrics(self):
        """Update company statistics based on created jobs"""
        for company in Company.objects.all():
            jobs = company.job_postings.filter(is_active=True)
            company.total_active_jobs = jobs.count()
            
            # Simulate some applicants (random but realistic)
            total_applicants = 0
            for job in jobs:
                # Generate applicants based on job type and company tier
                if job.job_type == 'INTERNSHIP':
                    applicants = random.randint(20, 100)
                elif company.tier == 'Tier 1':
                    applicants = random.randint(50, 200)
                elif company.tier == 'Tier 2':
                    applicants = random.randint(30, 150)
                else:
                    applicants = random.randint(10, 80)
                    
                total_applicants += applicants
            
            company.total_applicants = total_applicants
            company.total_hired = int(total_applicants * random.uniform(0.05, 0.15))  # 5-15% hire rate
            company.awaited_approval = int(total_applicants * random.uniform(0.1, 0.3))  # 10-30% pending
            
            company.save()
        
        self.stdout.write(self.style.SUCCESS('Updated company metrics')) 