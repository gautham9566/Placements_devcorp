from django.db.models import Count, F
from .models import Company

def update_company_job_stats(company_id):
    """
    Update job statistics for a company
    This would be called whenever a job is created, updated, or deleted
    """
    # This is a placeholder implementation. In a real application, you would:
    # 1. Count active jobs associated with this company
    # 2. Count total applicants across all jobs
    # 3. Count hired candidates
    # 4. Count jobs awaiting approval
    
    try:
        company = Company.objects.get(pk=company_id)
        
        # Here you would query your job and application models
        # For now, we'll just use placeholder logic
        
        # Example with a hypothetical Job model:
        # from jobs.models import Job, Application
        # active_jobs = Job.objects.filter(company=company, is_active=True).count()
        # total_applicants = Application.objects.filter(job__company=company).count()
        # hired = Application.objects.filter(job__company=company, status='HIRED').count()
        # awaiting = Job.objects.filter(company=company, status='PENDING').count()
        
        # company.total_active_jobs = active_jobs
        # company.total_applicants = total_applicants
        # company.total_hired = hired
        # company.awaited_approval = awaiting
        # company.save()
        
        return True
    except Company.DoesNotExist:
        return False

def get_company_tier_distribution():
    """Get distribution of companies by tier"""
    return Company.objects.values('tier').annotate(count=Count('id'))

def get_companies_by_metrics(order_by='total_active_jobs', limit=10):
    """Get top companies by a specific metric"""
    if order_by not in ['total_active_jobs', 'total_applicants', 'total_hired']:
        order_by = 'total_active_jobs'
    
    return Company.objects.all().order_by(F(order_by).desc())[:limit]
