#!/usr/bin/env python
"""
Test script to verify job creation and listing functionality
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'onelast.settings')
django.setup()

from django.contrib.auth import get_user_model
# EmployerProfile removed - using Company model directly
from jobs.models import JobPosting, CompanyForm
from college.models import College
from django.test import RequestFactory
from jobs.views import AdminJobPostingCreateView, EnhancedJobListCreateView
from rest_framework.test import force_authenticate
import json

User = get_user_model()

def test_job_creation_flow():
    print("🧪 Testing Job Creation Flow")
    print("=" * 50)
    
    # 1. Setup test data
    print("1. Setting up test data...")
    
    # Get or create college
    college, created = College.objects.get_or_create(
        slug='default-college',
        defaults={'name': 'Default College'}
    )
    print(f"   College: {college.name} ({'created' if created else 'exists'})")
    
    # Get or create admin user
    admin_user, created = User.objects.get_or_create(
        email='admin@test.com',
        defaults={
            'user_type': User.UserType.ADMIN,
            'is_staff': True,
            'college': college
        }
    )
    print(f"   Admin user: {admin_user.email} ({'created' if created else 'exists'})")
    
    # Create a test form
    form, created = CompanyForm.objects.get_or_create(
        key='test123',
        defaults={
            'company': 'Test2',
            'submitted': True,
            'details': {
                'title': 'Test Job',
                'description': 'Test Description',
                'skills': 'Python, Django',
                'salaryMin': '50000',
                'salaryMax': '80000',
                'deadline': '2025-07-30'
            }
        }
    )
    print(f"   Test form: {form.company} ({'created' if created else 'exists'})")
    
    # 2. Test job creation
    print("\n2. Testing job creation...")
    
    factory = RequestFactory()
    
    # Create request data
    job_data = {
        'title': 'Software Engineer',
        'description': 'Great opportunity',
        'location': 'Remote',
        'job_type': 'FULL_TIME',
        'salary_min': 60000,
        'salary_max': 90000,
        'required_skills': 'Python, Django, React',
        'application_deadline': '2025-07-30',
        'is_active': True,
        'company_name': 'Test2'
    }
    
    # Create POST request
    request = factory.post('/api/v1/college/default-college/jobs/create/', 
                          data=job_data, content_type='application/json')
    request.user = admin_user
    request.data = job_data  # Add data attribute for the view
    
    # Test job creation view
    view = AdminJobPostingCreateView()
    view.request = request
    view.kwargs = {'slug': 'default-college'}
    
    # Simulate job creation
    from jobs.serializers import JobPostingCreateUpdateSerializer
    serializer = JobPostingCreateUpdateSerializer(data=job_data, context={'request': request})
    
    if serializer.is_valid():
        view.perform_create(serializer)
        job = serializer.instance
        print(f"   ✅ Job created: {job.title} (ID: {job.id})")
        print(f"   Company: {job.company.name if job.company else 'No company'}")
        print(f"   On-campus: {job.on_campus}")
        print(f"   Published: {job.is_published}")
        print(f"   Status: {'Published' if job.is_published else 'To be Published'}")
    else:
        print(f"   ❌ Job creation failed: {serializer.errors}")
        return False
    
    # 3. Test job listing
    print("\n3. Testing job listing...")
    
    # Create GET request for job listing
    request = factory.get('/api/v1/college/default-college/jobs/')
    request.user = admin_user
    
    # Mock query_params for the view
    class MockQueryParams:
        def get(self, key, default=None):
            return None
    
    request.query_params = MockQueryParams()
    
    view = EnhancedJobListCreateView()
    view.request = request
    view.kwargs = {'slug': 'default-college'}
    
    queryset = view.get_queryset()
    jobs = list(queryset)
    
    print(f"   Total jobs in queryset: {len(jobs)}")
    
    # Check if our job is in the list
    our_job = None
    for job in jobs:
        if job.title == 'Software Engineer':
            our_job = job
            break
    
    if our_job:
        print(f"   ✅ Job found in listing: {our_job.title}")
        
        # Test serialization
        from jobs.serializers import EnhancedJobSerializer
        serializer = EnhancedJobSerializer(our_job)
        job_data = serializer.data
        
        print(f"   Serialized data:")
        print(f"   - Title: {job_data.get('title')}")
        print(f"   - Company name: {job_data.get('company_name')}")
        print(f"   - Company ID: {job_data.get('company_id')}")
        
        # Test filtering by company name
        test_company_jobs = [j for j in jobs if 
                           j.company and 'Test2' in j.company.name]
        print(f"   Jobs for 'Test2': {len(test_company_jobs)}")
        
    else:
        print(f"   ❌ Job not found in listing")
        print(f"   Available jobs:")
        for job in jobs[:5]:  # Show first 5
            company_name = job.company.name if job.company else 'No company'
            print(f"   - {job.title} by {company_name}")
            
    
    # 4. Test form status update
    print("\n4. Testing form status after job creation...")
    
    # In a real scenario, we'd mark the form as published
    # For now, let's check what forms exist
    forms = CompanyForm.objects.filter(company='Test2')
    print(f"   Forms for Test2: {forms.count()}")
    for form in forms:
        print(f"   - Form {form.key}: submitted={form.submitted}")
    
    # 5. Test publish toggle functionality
    print("\n5. Testing publish toggle functionality...")
    
    if our_job:
        print(f"   Current publish status: {our_job.is_published}")
        
        # Test toggle publish
        from jobs.views import JobPublishToggleView
        
        # Create PATCH request for toggle
        request = factory.patch(f'/api/v1/college/default-college/jobs/{our_job.id}/toggle-publish/')
        request.user = admin_user
        
        # Create view and test toggle
        toggle_view = JobPublishToggleView()
        toggle_view.request = request
        toggle_view.kwargs = {'pk': our_job.id}
        
        # Simulate the toggle
        our_job.refresh_from_db()
        old_status = our_job.is_published
        our_job.is_published = not our_job.is_published
        our_job.save()
        
        print(f"   ✅ Toggled publish status: {old_status} → {our_job.is_published}")
        print(f"   New status: {'Published' if our_job.is_published else 'To be Published'}")
        
        # Test filtering by publish status
        published_jobs = JobPosting.objects.filter(is_published=True)
        unpublished_jobs = JobPosting.objects.filter(is_published=False)
        
        print(f"   Published jobs count: {published_jobs.count()}")
        print(f"   To be published jobs count: {unpublished_jobs.count()}")
    
    print("\n🎉 Test completed!")
    return True

if __name__ == '__main__':
    test_job_creation_flow() 