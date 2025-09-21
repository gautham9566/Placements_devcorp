#!/usr/bin/env python
"""
Test script to verify freeze restrictions are working correctly.
"""

import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'onelast.settings')
django.setup()

from accounts.models import StudentProfile
from jobs.models import JobPosting
from companies.models import Company

def test_freeze_restrictions():
    """Test freeze restrictions functionality"""
    
    print("Testing freeze restrictions...")
    
    # Find a student with partial freeze
    student = StudentProfile.objects.filter(
        freeze_status='partial',
        allowed_job_types__isnull=False
    ).exclude(allowed_job_types=[]).first()
    
    if not student:
        print("No students with partial freeze found")
        return
    
    print(f"Testing with student: {student.first_name} {student.last_name}")
    print(f"Allowed job types: {student.allowed_job_types}")
    print(f"Allowed companies: {student.allowed_companies}")

    # Get some jobs to test with - include both allowed and disallowed types
    all_jobs = JobPosting.objects.filter(is_active=True)[:3]
    internship_jobs = JobPosting.objects.filter(is_active=True, job_type='INTERNSHIP')[:3]

    jobs = list(all_jobs) + list(internship_jobs)
    
    print(f"\nTesting against {len(jobs)} jobs:")
    print("-" * 50)
    
    for job in jobs:
        can_apply = student.can_apply_to_job(job)
        restrictions = student.get_freeze_restriction_reasons(job)
        
        print(f"Job: {job.title} ({job.job_type})")
        print(f"Can apply: {can_apply}")
        if restrictions:
            print(f"Restrictions: {restrictions}")
        print()

if __name__ == '__main__':
    test_freeze_restrictions()
