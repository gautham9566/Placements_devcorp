from django.contrib import admin
from .models import Company

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'industry', 'tier', 'location', 'campus_recruiting', 'total_active_jobs']
    list_filter = ['tier', 'industry', 'campus_recruiting']
    search_fields = ['name', 'description', 'industry', 'location']
    readonly_fields = ['created_at', 'updated_at']

    # Conditionally add slug field to fieldsets if it exists
    def get_fieldsets(self, request, obj=None):
        # Basic fieldsets without slug
        basic_fields = ('name', 'logo', 'description')
        
        # Check if slug field exists in the database
        fieldsets = [
            (None, {
                'fields': basic_fields
            }),
            ('Company Info', {
                'fields': ('industry', 'size', 'founded', 'location', 'website', 'tier', 'campus_recruiting')
            }),
            ('Metrics', {
                'fields': ('total_active_jobs', 'total_applicants', 'total_hired', 'awaited_approval')
            }),
            ('Timestamps', {
                'fields': ('created_at', 'updated_at'),
                'classes': ('collapse',)
            })
        ]
        
        return fieldsets
    
    # This helps generate slugs for existing records
    def save_model(self, request, obj, form, change):
        if not obj.slug and obj.name:
            from django.utils.text import slugify
            obj.slug = slugify(obj.name)
        super().save_model(request, obj, form, change)
