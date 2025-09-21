from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from companies.models import Company
from accounts.models import StudentProfile
from jobs.models import JobPosting, JobApplication
from .utils import invalidate_related_metrics, invalidate_paginated_cache


@receiver(post_save, sender=Company)
@receiver(post_delete, sender=Company)
def invalidate_company_metrics(sender, **kwargs):
    """
    Invalidate metrics when company data changes
    """
    invalidate_related_metrics('company')
    invalidate_paginated_cache('companies_list')


@receiver(post_save, sender=StudentProfile)
@receiver(post_delete, sender=StudentProfile)
def invalidate_student_metrics(sender, instance=None, **kwargs):
    """
    Invalidate metrics when student data changes
    """
    invalidate_related_metrics('student')
    invalidate_paginated_cache('students_list')

    # Also invalidate department and placement stats
    from .models import MetricsCache
    MetricsCache.invalidate_metric('department_stats')
    MetricsCache.invalidate_metric('placement_stats')
    MetricsCache.invalidate_metric('enhanced_student_stats')
    MetricsCache.invalidate_metric('student_department_breakdown')
    MetricsCache.invalidate_metric('student_year_analysis')

    # If department-specific year analysis exists, invalidate those too
    if instance and instance.branch:
        dept_key = f"dept_{instance.branch}"
        MetricsCache.invalidate_metric('student_year_analysis', dept_key)

    # If this is a current year student, invalidate dashboard stats too
    if instance and hasattr(instance, 'passout_year'):
        from django.utils import timezone
        current_year = timezone.now().year
        if instance.passout_year == current_year:
            MetricsCache.invalidate_metric('dashboard_stats')


@receiver(post_save, sender=JobPosting)
@receiver(post_delete, sender=JobPosting)
def invalidate_job_metrics(sender, **kwargs):
    """
    Invalidate metrics when job data changes
    """
    invalidate_related_metrics('job')
    invalidate_paginated_cache('jobs_list')


@receiver(post_save, sender=JobApplication)
@receiver(post_delete, sender=JobApplication)
def invalidate_application_metrics(sender, instance=None, **kwargs):
    """
    Invalidate metrics when application data changes
    """
    invalidate_related_metrics('application')
    invalidate_paginated_cache('applications_list')

    # Also invalidate placement stats when application status changes
    from .models import MetricsCache
    MetricsCache.invalidate_metric('placement_stats')
    MetricsCache.invalidate_metric('dashboard_stats')

    # If this is a hiring decision, also invalidate department stats
    if instance and instance.status == 'HIRED':
        MetricsCache.invalidate_metric('department_stats')


# Update company metrics when job applications change
@receiver(post_save, sender=JobApplication)
@receiver(post_delete, sender=JobApplication)
def update_company_job_stats(sender, instance, **kwargs):
    """
    Update company statistics when applications change
    """
    try:
        company = instance.job.company
        if company:
            # Recalculate company metrics
            from companies.utils import update_company_job_stats
            update_company_job_stats(company.id)
    except:
        pass  # Silently handle any errors
