"""
Signals for accounts app
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Resume


@receiver(post_save, sender=Resume)
def update_applications_on_primary_resume_change(sender, instance, created, **kwargs):
    """
    When a resume is marked as primary, update all existing applications
    for that student to include the new resume in their applied_data_snapshot
    """
    # Only process if this resume is marked as primary
    if not instance.is_primary:
        return
    
    try:
        from jobs.models import JobApplication
        
        # Get all applications for this student
        applications = JobApplication.objects.filter(
            applicant=instance.student.user
        )
        
        # Update each application's snapshot with the new resume data
        for application in applications:
            snapshot = application.applied_data_snapshot or {}
            
            # Ensure documents section exists
            if 'documents' not in snapshot:
                snapshot['documents'] = {}
            
            # Update resume information in the snapshot
            snapshot['documents']['resume_url'] = instance.file.url if instance.file else None
            snapshot['documents']['resume_id'] = instance.id
            snapshot['documents']['resume_name'] = instance.name
            snapshot['documents']['resume_uploaded_at'] = instance.uploaded_at.isoformat() if instance.uploaded_at else None
            
            # Save the updated snapshot
            application.applied_data_snapshot = snapshot
            application.save(update_fields=['applied_data_snapshot'])
            
        print(f"Updated {applications.count()} applications with primary resume for {instance.student.student_id}")
        
    except Exception as e:
        print(f"Error updating applications with primary resume: {e}")
