from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid

class JobPosting(models.Model):
    class JobType(models.TextChoices):
        FULL_TIME = 'FULL_TIME', 'Full Time'
        PART_TIME = 'PART_TIME', 'Part Time'
        CONTRACT = 'CONTRACT', 'Contract'
        INTERNSHIP = 'INTERNSHIP', 'Internship'

    company = models.ForeignKey('companies.Company', on_delete=models.CASCADE, related_name='job_postings')
    title = models.CharField(max_length=255)
    description = models.TextField()
    location = models.CharField(max_length=255)
    job_type = models.CharField(max_length=20, choices=JobType.choices, default=JobType.FULL_TIME)
    salary_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    salary_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    required_skills = models.TextField()
    application_deadline = models.DateField()
    is_active = models.BooleanField(default=True)
    is_published = models.BooleanField(default=False)  # True = Published, False = Draft/To be Published
    interview_rounds = models.JSONField(default=list, blank=True, help_text="List of interview rounds with name, date, and time")
    additional_fields = models.JSONField(default=list, blank=True, help_text="Custom fields for job application form")
    allowed_passout_years = models.JSONField(default=list, blank=True, help_text="List of passout years that can view and apply for this job. Empty list means all students can view.")
    allowed_departments = models.JSONField(default=list, blank=True, help_text="List of departments that can view and apply for this job. Empty list means all students can view.")
    arrears_requirement = models.CharField(max_length=20, choices=[
        ('NO_RESTRICTION', 'No restriction on arrears'),
        ('ALLOW_WITH_ARREARS', 'Allow students with active arrears'),
        ('NO_ARREARS_ALLOWED', 'Students must have no active arrears'),
    ], default='NO_RESTRICTION', help_text="Arrears requirement for applicants")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    on_campus = models.BooleanField(default=True)  # True = On-campus, False = Off-campus


    def __str__(self):
        return f"{self.title} at {self.company.name}"

class JobApplication(models.Model):
    job = models.ForeignKey(JobPosting, on_delete=models.CASCADE, related_name='applications')
    applicant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='job_applications')
    cover_letter = models.TextField(blank=True, null=True)
    resume = models.FileField(upload_to='application_resumes/', blank=True, null=True)
    applied_data_snapshot = models.JSONField(default=dict, null=True, blank=True)

    status = models.CharField(max_length=20, choices=[
        ('APPLIED', 'Applied'),
        ('UNDER_REVIEW', 'Under Review'),
        ('SHORTLISTED', 'Shortlisted'),
        ('REJECTED', 'Rejected'),
        ('HIRED', 'Hired'),
    ], default='APPLIED')
    applied_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Enhanced tracking fields
    admin_notes = models.TextField(blank=True, null=True, help_text="Internal admin notes")
    last_modified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='modified_applications'
    )
    is_deleted = models.BooleanField(default=False, help_text="Soft delete flag")
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    # Status timeline
    status_history = models.JSONField(default=list, blank=True, help_text="Status change history")

    class Meta:
        unique_together = ['job', 'applicant']
        ordering = ['-applied_at']
        indexes = [
            models.Index(fields=['status', 'applied_at']),
            models.Index(fields=['job', 'status']),
            models.Index(fields=['applicant', 'applied_at']),
        ]
    
    def add_status_change(self, new_status, changed_by=None, notes=None):
        """Add a status change to the history"""
        change_record = {
            'from_status': self.status,
            'to_status': new_status,
            'changed_at': timezone.now().isoformat(),
            'changed_by': changed_by.id if changed_by else None,
            'notes': notes
        }
        
        if not self.status_history:
            self.status_history = []
        
        self.status_history.append(change_record)
        self.status = new_status
        self.last_modified_by = changed_by

class CompanyForm(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.CharField(max_length=255)
    key = models.CharField(max_length=20, blank=True)  # Make key optional
    created_at = models.DateTimeField(auto_now_add=True)
    submitted = models.BooleanField(default=False)
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('approved', 'Approved'),
            ('posted', 'Posted'),
            ('rejected', 'Rejected')
        ],
        default='pending'
    )
    details = models.JSONField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.company} Form ({self.status})"
    
    def save(self, *args, **kwargs):
        # Generate a random key if not provided
        if not self.key:
            import random
            import string
            self.key = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        super().save(*args, **kwargs)
