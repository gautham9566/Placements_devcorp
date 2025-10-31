from django.contrib import admin
from unfold.admin import ModelAdmin
from unfold.decorators import display
from .models import JobPosting, JobApplication, CompanyForm
from .ats_models import (
    PipelineStage,
    RecruitmentPipeline,
    CandidateCard,
    StageMovementHistory,
    CandidateComment,
    ShareableLink
)


class JobPostingAdmin(ModelAdmin):
    list_display = ('title', 'company', 'location', 'job_type', 
                    'application_deadline', 'is_active', 'created_at')
    list_filter = ('job_type', 'is_active', 'application_deadline')
    search_fields = ('title', 'description', 'required_skills', 'location', 'company__name')
    date_hierarchy = 'created_at'
    list_filter_submit = True  # Unfold feature


class JobApplicationAdmin(ModelAdmin):
    list_display = ('job', 'applicant', 'status', 'applied_at', 'updated_at')
    list_filter = ('status', 'applied_at')
    search_fields = ('job__title', 'applicant__email')
    date_hierarchy = 'applied_at'
    list_filter_submit = True  # Unfold feature


class CompanyFormAdmin(ModelAdmin):
    list_display = ('__str__', 'created_at')
    search_fields = ('company__name',)
    date_hierarchy = 'created_at'


class PipelineStageAdmin(ModelAdmin):
    list_display = ('name', 'stage_type', 'order_index', 'organization_name', 'is_active', 'created_at')
    list_filter = ('stage_type', 'is_active', 'organization_name')
    search_fields = ('name', 'description', 'organization_name')
    ordering = ('order_index', 'created_at')


class RecruitmentPipelineAdmin(ModelAdmin):
    list_display = ('name', 'job', 'organization_name', 'is_default', 'is_active', 'created_at', 'updated_at')
    list_filter = ('is_default', 'is_active', 'organization_name')
    search_fields = ('name', 'job__title', 'organization_name')
    date_hierarchy = 'created_at'


class CandidateCardAdmin(ModelAdmin):
    list_display = ('get_candidate_name', 'pipeline', 'current_stage', 'rating', 'created_at')
    list_filter = ('pipeline', 'current_stage', 'rating')
    search_fields = ('application__applicant__email', 'application__applicant__first_name', 'application__applicant__last_name', 'pipeline__name')
    date_hierarchy = 'created_at'
    
    @display(description='Candidate', ordering='application__applicant__email')
    def get_candidate_name(self, obj):
        return obj.get_candidate_name()


class StageMovementHistoryAdmin(ModelAdmin):
    list_display = ('candidate_card', 'from_stage', 'to_stage', 'moved_at', 'moved_by')
    list_filter = ('from_stage', 'to_stage', 'moved_at')
    search_fields = ('candidate_card__candidate__email', 'moved_by__email')
    date_hierarchy = 'moved_at'


class CandidateCommentAdmin(ModelAdmin):
    list_display = ('candidate_card', 'author', 'created_at')
    search_fields = ('candidate_card__candidate__email', 'author__email', 'comment')
    date_hierarchy = 'created_at'


class ShareableLinkAdmin(ModelAdmin):
    list_display = ('pipeline', 'token', 'permission_level', 'is_active', 'created_by', 'created_at', 'expires_at')
    list_filter = ('is_active', 'permission_level', 'created_at', 'expires_at')
    search_fields = ('pipeline__name', 'token', 'created_by__email')
    date_hierarchy = 'created_at'
    readonly_fields = ('token', 'created_at')


admin.site.register(JobPosting, JobPostingAdmin)
admin.site.register(JobApplication, JobApplicationAdmin)
admin.site.register(CompanyForm, CompanyFormAdmin)

# ATS Models
admin.site.register(PipelineStage, PipelineStageAdmin)
admin.site.register(RecruitmentPipeline, RecruitmentPipelineAdmin)
admin.site.register(CandidateCard, CandidateCardAdmin)
admin.site.register(StageMovementHistory, StageMovementHistoryAdmin)
admin.site.register(CandidateComment, CandidateCommentAdmin)
admin.site.register(ShareableLink, ShareableLinkAdmin)
