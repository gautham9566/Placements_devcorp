"""
Serializers for ATS (Applicant Tracking System) models
"""
from rest_framework import serializers
from .ats_models import (
    PipelineStage,
    RecruitmentPipeline,
    CandidateCard,
    StageMovementHistory,
    CandidateComment,
    ShareableLink
)
from .models import JobApplication, JobPosting
from accounts.models import StudentProfile
from django.contrib.auth import get_user_model

User = get_user_model()


class PipelineStageSerializer(serializers.ModelSerializer):
    candidate_count = serializers.SerializerMethodField()
    
    class Meta:
        model = PipelineStage
        fields = [
            'id', 'name', 'stage_type', 'description', 'order_index',
            'color', 'is_active', 'is_terminal', 'organization_name',
            'created_at', 'updated_at', 'candidate_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_candidate_count(self, obj):
        """Get count of candidates in this stage"""
        return obj.candidates.count()


class SimpleUserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'avatar']
    
    def get_name(self, obj):
        try:
            profile = obj.student_profile
            return f"{profile.first_name} {profile.last_name}".strip()
        except:
            return obj.email
    
    def get_avatar(self, obj):
        # Return avatar URL or initials for generating avatar
        try:
            profile = obj.student_profile
            if profile.first_name:
                return profile.first_name[0].upper()
        except:
            pass
        return obj.email[0].upper() if obj.email else "U"


class CandidateCardSerializer(serializers.ModelSerializer):
    # Candidate details from application
    candidate_name = serializers.SerializerMethodField()
    candidate_email = serializers.SerializerMethodField()
    candidate_phone = serializers.SerializerMethodField()
    candidate_id = serializers.SerializerMethodField()
    candidate_avatar = serializers.SerializerMethodField()
    application = serializers.SerializerMethodField()
    
    # Job details
    job_title = serializers.CharField(source='application.job.title', read_only=True)
    job_location = serializers.CharField(source='application.job.location', read_only=True)
    company_name = serializers.CharField(source='application.job.company.name', read_only=True)
    
    # Stage info
    stage_name = serializers.CharField(source='current_stage.name', read_only=True)
    stage_color = serializers.CharField(source='current_stage.color', read_only=True)
    
    # Related objects
    interviewers = SimpleUserSerializer(many=True, read_only=True)
    recruiter = SimpleUserSerializer(read_only=True)
    
    # Time tracking
    time_in_stage = serializers.SerializerMethodField()
    applied_at = serializers.DateTimeField(source='application.applied_at', read_only=True)
    
    # Resume
    resume_url = serializers.SerializerMethodField()
    
    class Meta:
        model = CandidateCard
        fields = [
            'id', 'application', 'current_stage', 'pipeline', 'position_in_stage',
            'rating', 'interviewers', 'recruiter', 'tags', 'notes', 'comment_count',
            'source', 'medium', 'referred_by', 'expected_salary', 'proposed_salary',
            'extra_advantages', 'availability_status', 'moved_to_current_stage_at',
            'created_at', 'updated_at',
            # Computed fields
            'candidate_name', 'candidate_email', 'candidate_phone', 'candidate_id',
            'candidate_avatar', 'job_title', 'job_location', 'company_name',
            'stage_name', 'stage_color', 'time_in_stage', 'applied_at', 'resume_url'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'moved_to_current_stage_at']
    
    def get_candidate_name(self, obj):
        return obj.get_candidate_name()
    
    def get_candidate_email(self, obj):
        return obj.get_candidate_email()
    
    def get_candidate_phone(self, obj):
        return obj.get_candidate_phone()
    
    def get_candidate_id(self, obj):
        try:
            return obj.application.applicant.student_profile.student_id
        except:
            return None
    
    def get_candidate_avatar(self, obj):
        try:
            profile = obj.application.applicant.student_profile
            if profile.first_name:
                return profile.first_name[0].upper()
        except:
            pass
        return "U"
    
    def get_time_in_stage(self, obj):
        """Calculate time spent in current stage"""
        from django.utils import timezone
        duration = timezone.now() - obj.moved_to_current_stage_at
        
        days = duration.days
        if days > 0:
            return f"{days}d"
        hours = duration.seconds // 3600
        if hours > 0:
            return f"{hours}h"
        minutes = duration.seconds // 60
        return f"{minutes}m"
    
    def get_resume_url(self, obj):
        """Get resume URL from multiple sources with priority order"""
        request = self.context.get('request')
        resume_url = None
        
        try:
            # Priority 1: Check application.resume field (the resume selected/uploaded at application time)
            # This is the MOST IMPORTANT - it's what the user actually selected for THIS job
            if obj.application.resume:
                resume_url = obj.application.resume.url
                print(f"✅ Using application.resume: {resume_url}")
            
            # Priority 2: Check applied_data_snapshot documents section
            if not resume_url:
                snapshot = obj.application.applied_data_snapshot or {}
                documents = snapshot.get('documents', {})
                if documents.get('resume_url'):
                    resume_url = documents['resume_url']
                    print(f"✅ Using snapshot resume: {resume_url}")
            
            # Priority 3: Check Resume model for primary resume (fallback)
            if not resume_url:
                try:
                    from accounts.models import Resume
                    profile = obj.application.applicant.student_profile
                    primary_resume = Resume.objects.filter(
                        student=profile,
                        is_primary=True
                    ).first()
                    
                    if primary_resume and primary_resume.file:
                        resume_url = primary_resume.file.url
                        print(f"✅ Using primary resume: {resume_url}")
                    # Fallback to latest resume if no primary
                    elif not primary_resume:
                        latest_resume = Resume.objects.filter(student=profile).first()
                        if latest_resume and latest_resume.file:
                            resume_url = latest_resume.file.url
                            print(f"✅ Using latest resume: {resume_url}")
                except Exception as e:
                    print(f"Error getting resume from Resume model: {e}")
            
            # Priority 4: Check student profile.resume field (legacy)
            if not resume_url:
                try:
                    profile = obj.application.applicant.student_profile
                    if profile.resume:
                        resume_url = profile.resume.url
                        print(f"✅ Using profile resume: {resume_url}")
                except Exception:
                    pass
            
            # Build absolute URL if request is available
            if resume_url and request:
                return request.build_absolute_uri(resume_url)
            return resume_url
            
        except Exception as e:
            print(f"❌ Error getting resume URL: {e}")
        return None

    def get_application(self, obj):
        try:
            app = obj.application
            snapshot = app.applied_data_snapshot or {}
            
            # Get resume URL using the same priority logic as get_resume_url
            resume_url = None
            
            # Check snapshot first
            documents = snapshot.get('documents', {})
            if documents.get('resume_url'):
                resume_url = documents['resume_url']
            
            # Then check application.resume field
            if not resume_url and app.resume:
                resume_url = app.resume.url
            
            # Build absolute URL if needed
            request = self.context.get('request')
            if resume_url and request:
                resume_url = request.build_absolute_uri(resume_url)
            
            return {
                'id': app.id,
                'cover_letter': app.cover_letter,
                'applied_data_snapshot': snapshot,
                'resume': resume_url,
            }
        except Exception as e:
            print(f"Error getting application data: {e}")
            return None


class StageMovementHistorySerializer(serializers.ModelSerializer):
    from_stage_name = serializers.CharField(source='from_stage.name', read_only=True)
    to_stage_name = serializers.CharField(source='to_stage.name', read_only=True)
    moved_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = StageMovementHistory
        fields = [
            'id', 'candidate_card', 'from_stage', 'to_stage',
            'from_stage_name', 'to_stage_name', 'moved_by', 'moved_by_name',
            'moved_at', 'duration_in_previous_stage', 'notes'
        ]
        read_only_fields = ['id', 'moved_at']
    
    def get_moved_by_name(self, obj):
        if obj.moved_by:
            try:
                profile = obj.moved_by.student_profile
                return f"{profile.first_name} {profile.last_name}".strip()
            except:
                return obj.moved_by.email
        return "System"


class CandidateCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_avatar = serializers.SerializerMethodField()
    
    class Meta:
        model = CandidateComment
        fields = [
            'id', 'candidate_card', 'author', 'author_name', 'author_avatar',
            'content', 'is_internal', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_author_name(self, obj):
        if obj.author:
            try:
                profile = obj.author.student_profile
                return f"{profile.first_name} {profile.last_name}".strip()
            except:
                return obj.author.email
        return "Unknown"
    
    def get_author_avatar(self, obj):
        if obj.author:
            try:
                profile = obj.author.student_profile
                if profile.first_name:
                    return profile.first_name[0].upper()
            except:
                pass
            return obj.author.email[0].upper() if obj.author.email else "U"
        return "U"


class RecruitmentPipelineSerializer(serializers.ModelSerializer):
    stages = PipelineStageSerializer(many=True, read_only=True)
    stage_ids = serializers.PrimaryKeyRelatedField(
        queryset=PipelineStage.objects.all(),
        many=True,
        write_only=True,
        required=False
    )
    job_title = serializers.CharField(source='job.title', read_only=True)
    total_candidates = serializers.SerializerMethodField()
    
    class Meta:
        model = RecruitmentPipeline
        fields = [
            'id', 'name', 'description', 'organization_name', 'job',
            'job_title', 'stages', 'stage_ids', 'is_default', 'is_active',
            'created_by', 'created_at', 'updated_at', 'total_candidates'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_total_candidates(self, obj):
        return obj.candidate_cards.count()
    
    def create(self, validated_data):
        stage_ids = validated_data.pop('stage_ids', [])
        pipeline = super().create(validated_data)
        if stage_ids:
            pipeline.stages.set(stage_ids)
        return pipeline
    
    def update(self, instance, validated_data):
        stage_ids = validated_data.pop('stage_ids', None)
        pipeline = super().update(instance, validated_data)
        if stage_ids is not None:
            pipeline.stages.set(stage_ids)
        return pipeline


class KanbanBoardSerializer(serializers.Serializer):
    """
    Serializer for complete Kanban board with stages and candidate cards
    """
    pipeline = RecruitmentPipelineSerializer(read_only=True)
    stages = serializers.SerializerMethodField()
    filters = serializers.DictField(read_only=True)
    
    def get_stages(self, obj):
        """
        Return stages with their candidate cards organized for Kanban view
        """
        pipeline = obj.get('pipeline')
        if not pipeline:
            return []
        
        stages_data = []
        stages = pipeline.stages.filter(is_active=True).order_by('order_index')
        
        for stage in stages:
            candidates = CandidateCard.objects.filter(
                pipeline=pipeline,
                current_stage=stage
            ).select_related(
                'application',
                'application__job',
                'application__job__company',
                'application__applicant__student_profile',
                'current_stage',
                'recruiter'
            ).prefetch_related('interviewers').order_by('position_in_stage', '-created_at')
            
            stage_data = {
                'id': str(stage.id),
                'name': stage.name,
                'stage_type': stage.stage_type,
                'color': stage.color,
                'order_index': stage.order_index,
                'count': candidates.count(),
                'candidates': CandidateCardSerializer(candidates, many=True).data
            }
            stages_data.append(stage_data)
        
        return stages_data


class ShareableLinkSerializer(serializers.ModelSerializer):
    full_url = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    can_access = serializers.SerializerMethodField()
    pipeline_name = serializers.CharField(source='pipeline.name', read_only=True)
    
    class Meta:
        model = ShareableLink
        fields = [
            'id', 'token', 'pipeline', 'pipeline_name', 'applications_view',
            'permission_level', 'created_by', 'created_at', 'expires_at',
            'access_count', 'last_accessed_at', 'is_active',
            'full_url', 'is_expired', 'can_access'
        ]
        read_only_fields = ['id', 'token', 'created_at', 'access_count', 'last_accessed_at']
    
    def get_full_url(self, obj):
        """Generate full shareable URL"""
        # Use frontend URL for shareable links
        from django.conf import settings
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        
        if obj.applications_view:
            return f'{frontend_url}/admin/recruitment/shared/{obj.token}'
        else:
            return f'{frontend_url}/admin/recruitment/shared/{obj.token}'
    
    def get_is_expired(self, obj):
        return obj.is_expired()
    
    def get_can_access(self, obj):
        return obj.can_access()
    
    def create(self, validated_data):
        # Generate token if not provided
        if 'token' not in validated_data:
            validated_data['token'] = ShareableLink.generate_token()
        return super().create(validated_data)


class MoveCandidateSerializer(serializers.Serializer):
    """
    Serializer for moving a candidate between stages
    """
    candidate_id = serializers.UUIDField()
    from_stage_id = serializers.UUIDField(required=False, allow_null=True)
    to_stage_id = serializers.UUIDField()
    position = serializers.IntegerField(required=False, default=0)
    notes = serializers.CharField(required=False, allow_blank=True)


class BulkMoveCandidatesSerializer(serializers.Serializer):
    """
    Serializer for bulk moving candidates
    """
    candidate_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1
    )
    to_stage_id = serializers.UUIDField()
    notes = serializers.CharField(required=False, allow_blank=True)
