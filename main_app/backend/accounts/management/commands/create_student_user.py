from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from accounts.models import StudentProfile  # Removed SemesterMarksheet import
from faker import Faker
from datetime import datetime, timedelta
import random

User = get_user_model()
fake = Faker()

class Command(BaseCommand):
    help = 'Create student users for each department and multiple batches (joining/passout years) for testing'

    def handle(self, *args, **options):
        # Use a default college name string instead of a College model
        # (the project does not include a `college` app). If you later add
        # a College model, you can restore the previous logic.
        college = None
        default_college_name = 'Default College'

        # Define departments with their details
        departments = [
            {
                'name': 'Computer Science',
                'code': 'CS',
                'education': 'Bachelor of Technology in Computer Science',
                'skills': 'Python, Django, React, SQL, JavaScript, Machine Learning'
            },
            {
                'name': 'Electronics',
                'code': 'EC',
                'education': 'Bachelor of Technology in Electronics Engineering',
                'skills': 'Circuit Design, VLSI, Embedded Systems, Signal Processing'
            },
            {
                'name': 'Mechanical',
                'code': 'ME',
                'education': 'Bachelor of Technology in Mechanical Engineering',
                'skills': 'CAD Design, Thermodynamics, Manufacturing, Robotics'
            },
            {
                'name': 'Civil',
                'code': 'CE',
                'education': 'Bachelor of Technology in Civil Engineering',
                'skills': 'Structural Design, AutoCAD, Project Management, Construction'
            },
            {
                'name': 'Electrical',
                'code': 'EE',
                'education': 'Bachelor of Technology in Electrical Engineering',
                'skills': 'Power Systems, Control Systems, Electronics, PLC Programming'
            },
            {
                'name': 'Information Technology',
                'code': 'IT',
                'education': 'Bachelor of Technology in Information Technology',
                'skills': 'Web Development, Database Management, Networking, Cybersecurity'
            },
            {
                'name': 'Chemical',
                'code': 'CH',
                'education': 'Bachelor of Technology in Chemical Engineering',
                'skills': 'Process Design, Chemical Analysis, Plant Operations, Safety'
            },
            {
                'name': 'Biotechnology',
                'code': 'BT',
                'education': 'Bachelor of Technology in Biotechnology',
                'skills': 'Molecular Biology, Bioprocessing, Genetics, Laboratory Techniques'
            }
        ]

        # Define batches: (joining_year, passout_year)
        batches = [
            (2019, 2023),
            (2020, 2024),
            (2021, 2025),
            (2022, 2026),
        ]
        students_per_batch = 25  # 25 students per batch per department

        # Define boards for academic details
        boards = ['CBSE', 'ICSE', 'State Board', 'International Baccalaureate']
        
        # Define states and districts
        states = {
            'Andhra Pradesh': ['Vijayawada', 'Guntur', 'Visakhapatnam'],
            'Telangana': ['Hyderabad', 'Warangal', 'Karimnagar'],
            'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai'],
            'Karnataka': ['Bangalore', 'Mysore', 'Mangalore'],
            'Maharashtra': ['Mumbai', 'Pune', 'Nagpur'],
            'Delhi': ['New Delhi', 'South Delhi', 'North Delhi']
        }
        
        # Define specializations for 12th
        twelfth_specializations = ['Science (PCM)', 'Science (PCB)', 'Commerce', 'Arts', 'Computer Science']

        password = 'student123'
        user_counter = 1

        for dept in departments:
            self.stdout.write(self.style.SUCCESS(f'\nCreating students for {dept["name"]} department...'))
            for batch in batches:
                joining_year, passout_year = batch
                for i in range(1, students_per_batch + 1):
                    email = f'student{user_counter}@example.com'

                    if User.objects.filter(email=email).exists():
                        self.stdout.write(self.style.WARNING(f'User with email {email} already exists, skipping...'))
                        user_counter += 1
                        continue

                    try:
                        user = User.objects.create_user(
                            email=email,
                            password=password,
                            user_type=User.UserType.STUDENT,
                            is_staff=False,
                            is_superuser=False,
                            # Not setting a College foreign key here because
                            # the `college` app is not present in this repo.
                            # If your User model requires a college FK, add it
                            # back or create a minimal college app.
                            
                        )

                        first_name = fake.first_name()
                        last_name = fake.last_name()
                        student_id = f'{dept["code"]}{joining_year}{i:03d}'
                        branch = dept['name']
                        gpa = round(fake.pyfloat(min_value=6.0, max_value=10.0, right_digits=2), 2)
                        
                        # Generate random date of birth (18-23 years old)
                        age = random.randint(18, 23)
                        dob = datetime.now() - timedelta(days=age*365 + random.randint(0, 364))
                        
                        # Select gender
                        gender = random.choice(['Male', 'Female'])
                        
                        # Generate phone number
                        phone = f"+91 {fake.msisdn()[3:]}"
                        
                        # Generate parent contact
                        parent_contact = f"+91 {fake.msisdn()[3:]}"
                        
                        # Generate address information
                        state = random.choice(list(states.keys()))
                        district = random.choice(states[state])
                        city = district  # Using district as city for simplicity
                        address = f"{fake.building_number()}, {fake.street_name()}, {fake.street_suffix()}"
                        pincode = f"{random.randint(100000, 999999)}"
                        country = "India"
                        
                        # Generate 10th academic details
                        tenth_board = random.choice(boards)
                        tenth_school = f"{fake.last_name()} {random.choice(['Public School', 'High School', 'International School'])}"
                        tenth_year_of_passing = str(joining_year - 4)  # 4 years before joining college
                        tenth_cgpa = str(round(random.uniform(7.0, 10.0), 1))
                        tenth_percentage = str(round(float(tenth_cgpa) * 9.5, 2))  # Approximation
                        
                        # Generate 12th academic details
                        twelfth_board = random.choice(boards)
                        twelfth_school = f"{fake.last_name()} {random.choice(['Public School', 'High School', 'International School'])}"
                        twelfth_year_of_passing = str(joining_year - 2)  # 2 years before joining college
                        twelfth_cgpa = str(round(random.uniform(7.0, 10.0), 1))
                        twelfth_percentage = str(round(float(twelfth_cgpa) * 9.5, 2))  # Approximation
                        twelfth_specialization = random.choice(twelfth_specializations)
                        
                        # College name (use default string since no College model)
                        college_name = default_college_name

                        # Create the student profile with all fields
                        student_profile = StudentProfile.objects.create(
                            user=user,
                            first_name=first_name,
                            last_name=last_name,
                            student_id=student_id,
                            branch=branch,
                            gpa=gpa,
                            contact_email=email,
                            education=dept['education'],
                            skills=dept['skills'],
                            joining_year=joining_year,
                            passout_year=passout_year,
                            # New fields
                            date_of_birth=dob.date(),
                            gender=gender,
                            phone=phone,
                            address=address,
                            city=city,
                            district=district,
                            state=state,
                            pincode=pincode,
                            country=country,
                            tenth_cgpa=tenth_cgpa,
                            tenth_percentage=tenth_percentage,
                            tenth_board=tenth_board,
                            tenth_school=tenth_school,
                            tenth_year_of_passing=tenth_year_of_passing,
                            twelfth_cgpa=twelfth_cgpa,
                            twelfth_percentage=twelfth_percentage,
                            twelfth_board=twelfth_board,
                            twelfth_school=twelfth_school,
                            twelfth_year_of_passing=twelfth_year_of_passing,
                            twelfth_specialization=twelfth_specialization,
                            college_name=college_name,
                            parent_contact=parent_contact
                        )

                        # Generate semester marksheets based on how far the student has progressed
                        current_year = datetime.now().year
                        current_month = datetime.now().month
                        
                        # Calculate how many semesters the student has completed
                        years_since_joining = current_year - joining_year
                        
                        # Add 1 to semester count if we're past June (assuming second semester starts in July)
                        semester_offset = 1 if current_month > 6 else 0
                        
                        # Each year has 2 semesters
                        completed_semesters = min(years_since_joining * 2 + semester_offset, 8)
                        
                        # Only create records for semesters that make sense (no future semesters)
                        if completed_semesters > 0:
                            for semester in range(1, completed_semesters + 1):
                                # Generate random CGPA between 6.0 and 9.8
                                semester_cgpa = str(round(random.uniform(6.0, 9.8), 2))
                                
                                # Set semester CGPA directly on the student profile
                                setattr(student_profile, f'semester{semester}_cgpa', semester_cgpa)
                                setattr(student_profile, f'semester{semester}_upload_date', datetime.now())
                            
                            # Save the student profile with all semester data
                            student_profile.save()
                            
                            self.stdout.write(
                                self.style.SUCCESS(f'Created {completed_semesters} semester marksheets for {student_id}')
                            )

                        # Progress indicator
                        if i % 10 == 0:
                            self.stdout.write(self.style.SUCCESS(
                                f'Created {i}/{students_per_batch} for {dept["name"]} ({joining_year}-{passout_year})'
                            ))

                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f'Error creating student {email}: {str(e)}'))

                    user_counter += 1

        self.stdout.write(self.style.SUCCESS(
            f'\nCompleted! Created users for all {len(departments)} departments and {len(batches)} batches.'
        ))
        self.stdout.write(self.style.SUCCESS(f'Total users created: {(user_counter - 1)} students'))
