"""
ATS (Applicant Tracking System) Models for Kanban Board Recruitment System
"""
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()


class PipelineStage(models.Model):
    """
    Defines recruitment pipeline stages (columns in Kanban board)
    """
    STAGE_TYPES = [
        ('NEW', 'New Applications'),
        ('SCREENING', 'Initial Screening'),
        ('FIRST_INTERVIEW', 'First Interview'),
        ('SECOND_INTERVIEW', 'Second Interview'),
        ('TECHNICAL', 'Technical Round'),
        ('HR_ROUND', 'HR Round'),
        ('CONTRACT_PROPOSAL', 'Contract Proposal'),
        ('CONTRACT_SIGNED', 'Contract Signed'),
        ('OFFER_MADE', 'Offer Made'),
        ('REJECTED', 'Rejected'),
        ('WITHDRAWN', 'Withdrawn'),
        ('CUSTOM', 'Custom Stage'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    stage_type = models.CharField(max_length=50, choices=STAGE_TYPES, default='CUSTOM')
    description = models.TextField(blank=True, null=True)
    order_index = models.IntegerField(default=0, help_text="Display order in pipeline")
    color = models.CharField(max_length=20, default='#6366f1', help_text="Hex color code for UI")
    is_active = models.BooleanField(default=True)
    is_terminal = models.BooleanField(default=False, help_text="Whether this is a final stage (accepted/rejected)")
    
    # Organization/company specific stages
    organization_name = models.CharField(max_length=255, default='Caffeine Junction - Coffeeland')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order_index', 'created_at']
        indexes = [
            models.Index(fields=['organization_name', 'is_active']),
            models.Index(fields=['order_index']),
        ]
    
    def __str__(self):
        return f"{self.name} (Order: {self.order_index})"


class RecruitmentPipeline(models.Model):
    """
    Main recruitment pipeline/board configuration
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    organization_name = models.CharField(max_length=255, default='Caffeine Junction - Coffeeland')
    
    # Link to job posting (optional - can be for all jobs or specific job)
    job = models.ForeignKey(
        'jobs.JobPosting',
        on_delete=models.CASCADE,
        related_name='pipelines',
        null=True,
        blank=True,
        help_text="If set, pipeline is specific to this job"
    )
    
    # Pipeline stages (ordered)
    stages = models.ManyToManyField(PipelineStage, related_name='pipelines', blank=True)
    
    is_default = models.BooleanField(default=False, help_text="Default pipeline for all jobs")
    is_active = models.BooleanField(default=True)
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_pipelines'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-is_default', '-created_at']
        indexes = [
            models.Index(fields=['organization_name', 'is_active']),
        ]
    
    def __str__(self):
        job_info = f" - {self.job.title}" if self.job else ""
        return f"{self.name}{job_info}"


class CandidateCard(models.Model):
    """
    Represents a candidate in the recruitment pipeline (card in Kanban board)
    Links application to pipeline stage
    """
    RATING_CHOICES = [
        (0, 'Not Rated'),
        (1, '1 Star'),
        (2, '2 Stars'),
        (3, '3 Stars'),
        (4, '4 Stars'),
        (5, '5 Stars'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Link to actual job application
    application = models.OneToOneField(
        'jobs.JobApplication',
        on_delete=models.CASCADE,
        related_name='candidate_card'
    )
    
    # Current stage in pipeline
    current_stage = models.ForeignKey(
        PipelineStage,
        on_delete=models.PROTECT,
        related_name='candidates'
    )
    
    # Pipeline this card belongs to
    pipeline = models.ForeignKey(
        RecruitmentPipeline,
        on_delete=models.CASCADE,
        related_name='candidate_cards'
    )
    
    # Candidate/Card specific data
    position_in_stage = models.IntegerField(default=0, help_text="Order within stage column")
    rating = models.IntegerField(choices=RATING_CHOICES, default=0)
    
    # Interviewers and recruiters
    interviewers = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='interviews',
        blank=True
    )
    recruiter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recruited_candidates'
    )
    
    # Additional metadata
    tags = models.JSONField(default=list, blank=True, help_text="Tags like 'Roaster', etc.")
    notes = models.TextField(blank=True, null=True, help_text="Internal notes about candidate")
    comment_count = models.IntegerField(default=0)
    
    # Source tracking
    source = models.CharField(max_length=100, blank=True, null=True, help_text="How they found the job")
    medium = models.CharField(max_length=100, blank=True, null=True, help_text="Application medium")
    referred_by = models.CharField(max_length=200, blank=True, null=True, help_text="Referrer name")
    
    # Salary/compensation
    expected_salary = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    proposed_salary = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    extra_advantages = models.TextField(blank=True, null=True)
    
    # Availability
    availability_status = models.CharField(
        max_length=50,
        default='Directly Available',
        help_text="e.g., Directly Available, 2 weeks notice, etc."
    )
    
    # Timestamps
    moved_to_current_stage_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['current_stage__order_index', 'position_in_stage', '-created_at']
        indexes = [
            models.Index(fields=['pipeline', 'current_stage']),
            models.Index(fields=['current_stage', 'position_in_stage']),
        ]
    
    def __str__(self):
        candidate_name = self.get_candidate_name()
        return f"{candidate_name} - {self.current_stage.name}"
    
    def get_candidate_name(self):
        """Get candidate name from linked application"""
        try:
            profile = self.application.applicant.student_profile
            return f"{profile.first_name} {profile.last_name}".strip()
        except:
            return self.application.applicant.email
    
    def get_candidate_email(self):
        """Get candidate email"""
        try:
            profile = self.application.applicant.student_profile
            return profile.contact_email or self.application.applicant.email
        except:
            return self.application.applicant.email
    
    def get_candidate_phone(self):
        """Get candidate phone"""
        try:
            return self.application.applicant.student_profile.phone
        except:
            return None


class StageMovementHistory(models.Model):
    """
    Tracks movement of candidates between pipeline stages
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate_card = models.ForeignKey(
        CandidateCard,
        on_delete=models.CASCADE,
        related_name='stage_movements'
    )
    
    from_stage = models.ForeignKey(
        PipelineStage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movements_from'
    )
    to_stage = models.ForeignKey(
        PipelineStage,
        on_delete=models.PROTECT,
        related_name='movements_to'
    )
    
    moved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='stage_movements_made'
    )
    
    moved_at = models.DateTimeField(auto_now_add=True)
    duration_in_previous_stage = models.DurationField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['-moved_at']
        indexes = [
            models.Index(fields=['candidate_card', '-moved_at']),
        ]
    
    def __str__(self):
        from_stage_name = self.from_stage.name if self.from_stage else "New"
        return f"{self.candidate_card.get_candidate_name()}: {from_stage_name} → {self.to_stage.name}"


class CandidateComment(models.Model):
    """
    Comments on candidate cards
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate_card = models.ForeignKey(
        CandidateCard,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='candidate_comments'
    )
    
    content = models.TextField()
    is_internal = models.BooleanField(default=True, help_text="Internal comment vs candidate-visible")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        author_name = self.author.email if self.author else "Unknown"
        return f"Comment by {author_name} on {self.candidate_card}"


class ShareableLink(models.Model):
    """
    Shareable links for accessing recruitment pipeline externally
    """
    PERMISSION_CHOICES = [
        ('VIEW', 'View Only'),
        ('COMMENT', 'View and Comment'),
        ('EDIT', 'View, Comment, and Move Cards'),
        ('FULL', 'Full Access'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    token = models.CharField(max_length=100, unique=True, db_index=True)
    
    # What this link gives access to
    pipeline = models.ForeignKey(
        RecruitmentPipeline,
        on_delete=models.CASCADE,
        related_name='shareable_links',
        null=True,
        blank=True
    )
    
    # Can be for general applications view instead of specific pipeline
    applications_view = models.BooleanField(default=False, help_text="Link to applications view instead of specific pipeline")
    
    # Permissions
    permission_level = models.CharField(max_length=20, choices=PERMISSION_CHOICES, default='VIEW')
    
    # Link metadata
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_shareable_links'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True, help_text="Optional expiry date")
    
    # Usage tracking
    access_count = models.IntegerField(default=0)
    last_accessed_at = models.DateTimeField(null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token', 'is_active']),
        ]
    
    def __str__(self):
        target = self.pipeline.name if self.pipeline else "Applications View"
        return f"Link to {target} ({self.permission_level})"
    
    def is_expired(self):
        """Check if link has expired"""
        if not self.expires_at:
            return False
        return timezone.now() > self.expires_at
    
    def can_access(self):
        """Check if link can be accessed"""
        return self.is_active and not self.is_expired()
    
    @staticmethod
    def generate_token():
        """Generate a unique token for shareable link"""
        import secrets
        return secrets.token_urlsafe(32)
