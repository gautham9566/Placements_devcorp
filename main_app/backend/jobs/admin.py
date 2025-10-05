from django.contrib import admin
from .models import JobPosting, JobApplication

class JobPostingAdmin(admin.ModelAdmin):
    list_display = ('title', 'company', 'location', 'job_type', 
                    'application_deadline', 'is_active', 'created_at')
    list_filter = ('job_type', 'is_active', 'application_deadline')
    search_fields = ('title', 'description', 'required_skills', 'location', 'company__name')
    date_hierarchy = 'created_at'


class JobApplicationAdmin(admin.ModelAdmin):
    list_display = ('job', 'applicant', 'status', 'applied_at', 'updated_at')
    list_filter = ('status', 'applied_at')
    search_fields = ('job__title', 'applicant__email')
    date_hierarchy = 'applied_at'


admin.site.register(JobPosting, JobPostingAdmin)
admin.site.register(JobApplication, JobApplicationAdmin)
