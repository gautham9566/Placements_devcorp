from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from django.urls import path
from django.shortcuts import render, redirect
from django.contrib import messages
from django.utils import timezone
from unfold.admin import ModelAdmin
from unfold.decorators import display

from .models import User, StudentProfile, YearManagement, BranchManagement

import pandas as pd
from django import forms

class StudentExcelUploadForm(forms.Form):
    excel_file = forms.FileField()

class UserAdmin(BaseUserAdmin, ModelAdmin):
    """Define admin model for custom User model with Unfold styling."""
    list_display = ('email', 'first_name', 'last_name', 'user_type', 'is_staff')
    list_filter = ('user_type', 'is_staff', 'is_superuser', 'is_active')
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        (_('Personal info'), {'fields': ('first_name', 'last_name')}),
        (_('User type'), {'fields': ('user_type',)}),
        (_('Permissions'), {'fields': ('is_active', 'is_staff', 'is_superuser',
                                       'groups', 'user_permissions')}),
        (_('Important dates'), {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'user_type'),
        }),
    )
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('email',)


class StudentProfileAdmin(ModelAdmin):
    list_display = ('user', 'first_name', 'last_name', 'student_id', 'branch', 'joining_year', 'passout_year', 'get_freeze_status_display', 'created_at')
    search_fields = ('first_name', 'last_name', 'student_id', 'skills', 'branch')
    list_filter = ('joining_year', 'passout_year', 'branch', 'freeze_status')
    
    readonly_fields = ('freeze_date', 'frozen_by')
    
    @display(description='Freeze Status', ordering='freeze_status')
    def get_freeze_status_display(self, obj):
        if obj.freeze_status == 'none':
            return '✅ Active'
        elif obj.freeze_status == 'complete':
            return '🔒 Complete Freeze'
        elif obj.freeze_status == 'partial':
            return '⚠️ Partial Freeze'
        return obj.freeze_status
    
    def save_model(self, request, obj, form, change):
        # Auto-set freeze date and frozen_by when freeze status changes
        if change:  # Only for updates, not new objects
            original = StudentProfile.objects.get(pk=obj.pk)
            if original.freeze_status != obj.freeze_status:
                if obj.freeze_status != 'none':
                    obj.freeze_date = timezone.now()
                    obj.frozen_by = request.user
                else:
                    obj.freeze_date = None
                    obj.frozen_by = None
        super().save_model(request, obj, form, change)
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'first_name', 'last_name', 'student_id', 'date_of_birth', 'gender', 'profile_image')
        }),
        ('Contact Information', {
            'fields': ('contact_email', 'phone', 'address', 'city', 'district', 'state', 'pincode', 'country')
        }),
        ('Academic Information', {
            'fields': ('branch', 'gpa', 'joining_year', 'passout_year', 'college_name', 'parent_contact')
        }),
        ('Documents', {
            'fields': ('resume', 'tenth_certificate', 'twelfth_certificate')
        }),
        ('Academic Details', {
            'fields': (
                'tenth_cgpa', 'tenth_percentage', 'tenth_board', 'tenth_school', 'tenth_year_of_passing',
                'twelfth_cgpa', 'twelfth_percentage', 'twelfth_board', 'twelfth_school', 'twelfth_year_of_passing',
                'twelfth_specialization'
            )
        }),
        ('Additional Information', {
            'fields': ('education', 'skills')
        }),
        ('Account Freeze Settings', {
            'fields': (
                'freeze_status', 'freeze_reason', 'freeze_date', 'frozen_by',
                'min_salary_requirement', 'allowed_job_tiers', 'allowed_job_types', 'allowed_companies'
            ),
            'classes': ('collapse',)
        }),
        ('Semester Marksheets', {
            'fields': (
                'semester1_cgpa', 'semester1_marksheet', 
                'semester2_cgpa', 'semester2_marksheet',
                'semester3_cgpa', 'semester3_marksheet',
                'semester4_cgpa', 'semester4_marksheet',
                'semester5_cgpa', 'semester5_marksheet',
                'semester6_cgpa', 'semester6_marksheet',
                'semester7_cgpa', 'semester7_marksheet',
                'semester8_cgpa', 'semester8_marksheet',
            )
        }),
    )
    
    change_list_template = "admin/student_changelist.html"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path("upload-excel/", self.upload_excel, name="upload_student_excel"),
        ]
        return custom_urls + urls

    def upload_excel(self, request):
        if request.method == "POST":
            form = StudentExcelUploadForm(request.POST, request.FILES)
            if form.is_valid():
                try:
                    df = pd.read_excel(request.FILES["excel_file"])
                    required = ["student_id"]
                    missing = [col for col in required if col not in df.columns]
                    if missing:
                        self.message_user(request, f"Missing column(s): {', '.join(missing)}", level=messages.ERROR)
                        return redirect("..")

                    updated = 0
                    not_found = []

                    for _, row in df.iterrows():
                        sid = row["student_id"]
                        try:
                            student = StudentProfile.objects.get(student_id=sid)
                            for field in row.index:
                                if field != "student_id" and hasattr(student, field):
                                    setattr(student, field, row[field])
                            # Handle joining_year and passout_year if present in Excel
                            if "joining_year" in row and not pd.isnull(row["joining_year"]):
                                student.joining_year = int(row["joining_year"])
                            if "passout_year" in row and not pd.isnull(row["passout_year"]):
                                student.passout_year = int(row["passout_year"])
                            student.save()
                            updated += 1
                        except StudentProfile.DoesNotExist:
                            not_found.append(sid)

                    msg = f"✅ {updated} updated."
                    if not_found:
                        msg += f" ❌ Not found: {', '.join(not_found)}"
                    self.message_user(request, msg, level=messages.SUCCESS)
                    return redirect("..")

                except Exception as e:
                    self.message_user(request, f"Error: {e}", level=messages.ERROR)
                    return redirect("..")
        else:
            form = StudentExcelUploadForm()
        return render(request, "admin/student_excel_upload.html", {"form": form})

@admin.register(YearManagement)
class YearManagementAdmin(ModelAdmin):
    list_display = ('year', 'is_active', 'created_at', 'updated_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('year',)
    ordering = ('-year',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(BranchManagement)
class BranchManagementAdmin(ModelAdmin):
    list_display = ('branch', 'is_active', 'created_at', 'updated_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('branch',)
    ordering = ('branch',)
    readonly_fields = ('created_at', 'updated_at')


admin.site.register(User, UserAdmin)
admin.site.register(StudentProfile, StudentProfileAdmin)

