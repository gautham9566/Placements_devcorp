#!/usr/bin/env python
"""
Script to fix job type values in student freeze restrictions.
This converts lowercase job type values to uppercase to match the job model.
"""

import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'onelast.settings')
django.setup()

from accounts.models import StudentProfile

def fix_job_types():
    """Fix job type values in student freeze restrictions"""
    
    # Mapping from old lowercase to new uppercase values
    job_type_mapping = {
        'fulltime': 'FULL_TIME',
        'parttime': 'PART_TIME',
        'internship': 'INTERNSHIP',
        'contract': 'CONTRACT'
    }
    
    # Find students with partial freeze and job type restrictions
    students = StudentProfile.objects.filter(
        freeze_status='partial',
        allowed_job_types__isnull=False
    ).exclude(allowed_job_types=[])
    
    print(f"Found {students.count()} students with job type restrictions")
    
    updated_count = 0
    for student in students:
        if student.allowed_job_types:
            old_types = student.allowed_job_types
            new_types = []
            
            for job_type in old_types:
                if job_type in job_type_mapping:
                    new_types.append(job_type_mapping[job_type])
                    print(f"Converting {job_type} -> {job_type_mapping[job_type]}")
                else:
                    # Keep as is if already in correct format
                    new_types.append(job_type)
            
            if new_types != old_types:
                student.allowed_job_types = new_types
                student.save()
                updated_count += 1
                print(f"Updated {student.first_name} {student.last_name}: {old_types} -> {new_types}")
    
    print(f"Updated {updated_count} students")

    # Also fix empty company restrictions that should be None
    students_with_empty_companies = StudentProfile.objects.filter(
        freeze_status='partial',
        allowed_companies=[]
    )

    print(f"\nFound {students_with_empty_companies.count()} students with empty company restrictions")

    for student in students_with_empty_companies:
        # If only job type restrictions are set, clear company restrictions
        if student.allowed_job_types and not student.allowed_job_tiers:
            student.allowed_companies = None
            student.save()
            print(f"Cleared company restrictions for {student.first_name} {student.last_name}")

if __name__ == '__main__':
    fix_job_types()
