from rest_framework import serializers
from .models import JobPosting, JobApplication
from accounts.serializers import UserSerializer
# EmployerProfile removed
from .models import CompanyForm
from django.utils import timezone



class JobPostingListSerializer(serializers.ModelSerializer):
    """Serializer for job posting list view."""
    company_name = serializers.SerializerMethodField()
    
    class Meta:
        model = JobPosting
        fields = ('id', 'title', 'location', 'job_type', 'company_name',
                  'salary_min', 'salary_max', 'application_deadline', 'is_active', 'is_published')
    
    def get_company_name(self, obj):
        return obj.company.name if obj.company else None


class JobPostingDetailSerializer(serializers.ModelSerializer):
    """Serializer for job posting detail view."""
    company_name = serializers.SerializerMethodField()
    
    class Meta:
        model = JobPosting
        fields = ('id', 'title', 'description', 'location', 'job_type', 
                  'company_name', 'salary_min', 'salary_max', 
                  'required_skills', 'application_deadline', 
                  'is_active', 'is_published', 'interview_rounds', 
                  'additional_fields', 'min_cgpa', 'created_at', 'updated_at')
    
    def get_company_name(self, obj):
        return obj.company.name if obj.company else None


class JobPostingCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for job posting create/update views."""
    interview_rounds = serializers.ListField(
        child=serializers.DictField(),
        allow_empty=True,
        required=False,
        help_text="List of interview rounds with name, date, and time"
    )
    additional_fields = serializers.ListField(
        child=serializers.DictField(),
        allow_empty=True,
        required=False,
        help_text="Custom fields for job application form"
    )
    allowed_passout_years = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=True,
        required=False,
        help_text="List of passout years that can view and apply for this job. Empty list means all students can view."
    )
    allowed_departments = serializers.ListField(
        child=serializers.CharField(),
        allow_empty=True,
        required=False,
        help_text="List of departments that can view and apply for this job. Empty list means all students can view."
    )
    arrears_requirement = serializers.ChoiceField(
        choices=[
            ('NO_RESTRICTION', 'No restriction on arrears'),
            ('ALLOW_WITH_ARREARS', 'Allow students with active arrears'),
            ('NO_ARREARS_ALLOWED', 'Students must have no active arrears'),
        ],
        default='NO_RESTRICTION',
        required=False,
        help_text="Arrears requirement for applicants"
    )
    min_cgpa = serializers.DecimalField(
        max_digits=4,
        decimal_places=2,
        required=False,
        allow_null=True,
        help_text="Minimum CGPA required for applicants. Leave blank for no CGPA requirement."
    )
    
    class Meta:
        model = JobPosting
        fields = ('id', 'title', 'description', 'location', 'job_type', 
                  'salary_min', 'salary_max', 'required_skills', 
                  'application_deadline', 'is_active', 'is_published',
                  'interview_rounds', 'additional_fields', 'allowed_passout_years', 'allowed_departments', 'arrears_requirement', 'min_cgpa')
        read_only_fields = ('id',)
    
    def validate_interview_rounds(self, value):
        """Validate interview rounds structure"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Interview rounds must be a list")
        
        for round_data in value:
            if not isinstance(round_data, dict):
                raise serializers.ValidationError("Each interview round must be a dictionary")
            
            required_fields = ['name']
            for field in required_fields:
                if field not in round_data or not round_data[field]:
                    raise serializers.ValidationError(f"Interview round must have '{field}' field")
        
        return value
    
    def validate_additional_fields(self, value):
        """Validate additional fields structure"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Additional fields must be a list")
        
        valid_field_types = ['text', 'number', 'file', 'multiple_choice']
        
        for field_data in value:
            if not isinstance(field_data, dict):
                raise serializers.ValidationError("Each additional field must be a dictionary")
            
            # Check required fields
            required_fields = ['type', 'label']
            for field in required_fields:
                if field not in field_data or not field_data[field]:
                    raise serializers.ValidationError(f"Additional field must have '{field}' field")
            
            # Validate field type
            if field_data['type'] not in valid_field_types:
                raise serializers.ValidationError(f"Invalid field type. Must be one of: {valid_field_types}")
            
            # Validate multiple choice options
            if field_data['type'] == 'multiple_choice':
                if 'options' not in field_data or not isinstance(field_data['options'], list):
                    raise serializers.ValidationError("Multiple choice fields must have 'options' list")
                if len(field_data['options']) == 0:
                    raise serializers.ValidationError("Multiple choice fields must have at least one option")
        
        return value
    
    def create(self, validated_data):
        # Note: For now, we'll handle company assignment in the view
        return super().create(validated_data)

class JobApplicationSerializer(serializers.ModelSerializer):
    applicant = UserSerializer(read_only=True)
    job_title = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = JobApplication
        fields = (
            'id', 'job', 'job_title', 'applicant', 'cover_letter', 
            'resume', 'status', 'applied_at', 'updated_at'
        )
        read_only_fields = ('id', 'job_title', 'applied_at', 'updated_at', 'applicant', 'resume')

    def get_job_title(self, obj):
        return obj.job.title

    def update(self, instance, validated_data):
        request = self.context['request']
        user = request.user
        job = instance.job

        if job.on_campus and not user.is_staff:
            raise serializers.ValidationError("Only admin can update status for on-campus jobs.")
        # Skip employer check for now since we're using companies directly
        # TODO: Implement proper company-based permissions

        return super().update(instance, validated_data)
    

# jobs/serializers.py
class JobWithApplicationStatsSerializer(serializers.ModelSerializer):
    total_applicants = serializers.SerializerMethodField()
    total_hired = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()

    class Meta:
        model = JobPosting
        fields = [
            'id', 'title', 'location', 'job_type',
            'company_name', 'application_deadline',
            'total_applicants', 'total_hired', 'is_active', 'is_published'
        ]

    def get_total_applicants(self, obj):
        return obj.applications.count()

    def get_total_hired(self, obj):
        return obj.applications.filter(status='HIRED').count()

    def get_company_name(self, obj):
        return obj.company.name if obj.company else None


from rest_framework import serializers
from jobs.models import JobApplication

class StudentApplicationSerializer(serializers.ModelSerializer):
    job_id = serializers.IntegerField(source='job.id')
    title = serializers.CharField(source='job.title')
    company = serializers.CharField(source='job.company.name')
    description = serializers.CharField(source='job.description')
    location = serializers.CharField(source='job.location')
    job_type = serializers.CharField(source='job.job_type')
    salary_min = serializers.DecimalField(source='job.salary_min', max_digits=10, decimal_places=2)
    salary_max = serializers.DecimalField(source='job.salary_max', max_digits=10, decimal_places=2)
    required_skills = serializers.SerializerMethodField()
    application_deadline = serializers.DateField(source='job.application_deadline', format="%Y-%m-%d")
    is_active = serializers.BooleanField(source='job.is_active')
    on_campus = serializers.BooleanField(source='job.on_campus')
    applied_at = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S.%f")
    updated_at = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S.%f")

    class Meta:
        model = JobApplication
        fields = [
            'id', 'job_id', 'title', 'company', 'description', 'location',
            'job_type', 'salary_min', 'salary_max', 'required_skills',
            'application_deadline', 'is_active', 'on_campus', 'status',
            'applied_at', 'updated_at'
        ]

    def get_required_skills(self, obj):
        if hasattr(obj.job, 'skills') and obj.job.skills:
            return ', '.join(obj.job.skills)
        return ""


# Enhanced serializers for the comprehensive API
# CompanySerializer removed - use companies.serializers.CompanySerializer instead


class EnhancedJobSerializer(serializers.ModelSerializer):
    """Enhanced Job serializer matching the API schema"""
    company_name = serializers.SerializerMethodField()
    company_id = serializers.SerializerMethodField()
    requirements = serializers.SerializerMethodField()
    skills = serializers.ListField(
        child=serializers.CharField(), 
        allow_empty=True,
        required=False
    )
    benefits = serializers.ListField(
        child=serializers.CharField(), 
        allow_empty=True,
        required=False
    )
    duration = serializers.CharField(allow_blank=True, required=False)
    company = serializers.SerializerMethodField()
    
    class Meta:
        model = JobPosting
        fields = [
            'id', 'title', 'company_name', 'company_id', 'description', 
            'location', 'job_type', 'salary_min', 'salary_max', 'duration',
            'application_deadline', 'requirements', 'skills', 'benefits',
            'is_active', 'is_published', 'interview_rounds', 'additional_fields',
            'required_skills', 'allowed_passout_years', 'allowed_departments', 'arrears_requirement', 'min_cgpa',
            'created_at', 'updated_at', 'company'
        ]
        
    def get_company_name(self, obj):
        return obj.company.name if obj.company else None
            
    def get_company_id(self, obj):
        return obj.company.id if obj.company else None
        
    def get_company(self, obj):
        if obj.company:
            from companies.serializers import CompanySerializer
            return CompanySerializer(obj.company).data
        return None

    def get_requirements(self, obj):
        """Convert required_skills string to list"""
        if obj.required_skills:
            return [req.strip() for req in obj.required_skills.split(',') if req.strip()]
        return []

    def to_representation(self, instance):
        """Convert string fields to lists for JSON response"""
        data = super().to_representation(instance)
        
        # Handle skills and benefits (these might need to be added to model or derived)
        data['skills'] = []
        data['benefits'] = []
        
        return data

    def to_internal_value(self, data):
        """Convert lists to strings for model storage"""
        if 'requirements' in data and isinstance(data['requirements'], list):
            data['required_skills'] = ', '.join(data['requirements'])
        
        return super().to_internal_value(data)

    def update(self, instance, validated_data):
        """Handle requirements field conversion during update"""
        # The validated_data already has required_skills from to_internal_value
        return super().update(instance, validated_data)

    def create(self, validated_data):
        """Handle requirements field conversion during create"""
        # The validated_data already has required_skills from to_internal_value
        return super().create(validated_data)


class EnhancedJobApplicationSerializer(serializers.ModelSerializer):
    """Enhanced Job Application serializer"""
    job_id = serializers.IntegerField(source='job.id', read_only=True)
    student_id = serializers.IntegerField(source='applicant.id', read_only=True)
    additional_field_responses = serializers.JSONField(source='applied_data_snapshot', default=dict, required=False)
    
    class Meta:
        model = JobApplication
        fields = [
            'id', 'job_id', 'student_id', 'cover_letter', 'status',
            'additional_field_responses', 'applied_at', 'updated_at'
        ]

    def create(self, validated_data):
        validated_data['applicant'] = self.context['request'].user
        return super().create(validated_data)


class DetailedJobApplicationSerializer(serializers.ModelSerializer):
    """Detailed application serializer with all related data"""
    
    # Job details
    job_title = serializers.CharField(source='job.title', read_only=True)
    company_name = serializers.CharField(source='job.company.name', read_only=True)
    job_location = serializers.CharField(source='job.location', read_only=True)
    job_additional_fields = serializers.JSONField(source='job.additional_fields', read_only=True)
    
    # Student details
    student_name = serializers.SerializerMethodField()
    student_email = serializers.CharField(source='applicant.email', read_only=True)
    student_id = serializers.CharField(source='applicant.student_profile.student_id', read_only=True)
    branch = serializers.CharField(source='applicant.student_profile.branch', read_only=True)
    passout_year = serializers.IntegerField(source='applicant.student_profile.passout_year', read_only=True)
    
    # Application details
    formatted_applied_at = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    # JSON data with proper handling
    profile_data = serializers.SerializerMethodField()
    custom_responses = serializers.SerializerMethodField()
    
    class Meta:
        model = JobApplication
        fields = [
            'id', 'job', 'job_title', 'company_name', 'job_location', 'job_additional_fields',
            'applicant', 'student_name', 'student_email', 'student_id', 'branch', 'passout_year',
            'status', 'status_display', 'applied_at', 'formatted_applied_at',
            'cover_letter', 'resume', 'applied_data_snapshot',
            'profile_data', 'custom_responses', 'admin_notes',
            'status_history', 'last_modified_by'
        ]
        read_only_fields = ['applied_at', 'applicant', 'job']

    def get_student_name(self, obj):
        profile = obj.applicant.student_profile
        return f"{profile.first_name} {profile.last_name}"

    def get_formatted_applied_at(self, obj):
        return obj.applied_at.strftime("%Y-%m-%d %H:%M:%S")

    def get_profile_data(self, obj):
        """Extract profile data from JSON snapshot"""
        snapshot = obj.applied_data_snapshot or {}
        return {
            'basic_info': snapshot.get('basic_info', {}),
            'academic_info': snapshot.get('academic_info', {}),
            'contact_info': snapshot.get('contact_info', {})
        }

    def get_custom_responses(self, obj):
        """Extract custom form responses"""
        snapshot = obj.applied_data_snapshot or {}
        return snapshot.get('custom_responses', {})


class ExportConfigSerializer(serializers.Serializer):
    """Configuration for application export"""
    format = serializers.ChoiceField(choices=['csv', 'xlsx', 'pdf'])
    columns = serializers.ListField(
        child=serializers.CharField(),
        help_text="List of column names to include"
    )
    job_id = serializers.IntegerField(required=False)
    status = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)


class StudentProfileFieldsSerializer(serializers.Serializer):
    """Available student profile fields for form configuration"""
    
    # Default fields (always included)
    default_fields = serializers.SerializerMethodField()
    
    # Advanced fields (optional)
    advanced_fields = serializers.SerializerMethodField()
    
    def get_default_fields(self, obj):
        return [
            {'key': 'email', 'label': 'Email Address', 'type': 'email', 'required': True},
            {'key': 'university', 'label': 'School/University', 'type': 'text', 'required': True},
            {'key': 'twelfth_percentage', 'label': 'Intermediate Score (+2)', 'type': 'number', 'required': True},
            {'key': 'current_cgpa', 'label': 'Current CGPA', 'type': 'number', 'required': True},
        ]
    
    def get_advanced_fields(self, obj):
        return [
            {'key': 'student_id', 'label': 'Student ID', 'type': 'text', 'required': False},
            {'key': 'branch', 'label': 'Branch/Department', 'type': 'text', 'required': False},
            {'key': 'tenth_percentage', 'label': '10th Grade Score', 'type': 'number', 'required': False},
            {'key': 'graduation_year', 'label': 'Expected Graduation', 'type': 'number', 'required': False},
            {'key': 'phone', 'label': 'Phone Number', 'type': 'tel', 'required': False},
            {'key': 'address', 'label': 'Address', 'type': 'textarea', 'required': False},
            {'key': 'skills', 'label': 'Skills', 'type': 'text', 'required': False},
            {'key': 'experience', 'label': 'Experience', 'type': 'textarea', 'required': False},
        ]


class JobListResponseSerializer(serializers.Serializer):
    """Paginated job list response"""
    data = EnhancedJobSerializer(many=True)
    pagination = serializers.DictField()


class StatsSerializer(serializers.Serializer):
    """Statistics serializer"""
    total_jobs = serializers.IntegerField()
    active_jobs = serializers.IntegerField()
    total_applications = serializers.IntegerField()
    pending_applications = serializers.IntegerField()
    total_companies = serializers.IntegerField()
    hiring_companies = serializers.IntegerField()


class CompanyFormSerializer(serializers.ModelSerializer):
    """Serializer for the CompanyForm model"""
    class Meta:
        model = CompanyForm
        fields = '__all__'
        read_only_fields = ['id', 'created_at']
        
    def validate(self, data):
        """
        Validate form data
        """
        instance_submitted = False
        existing_details = {}

        if self.instance is not None:
            instance_submitted = bool(self.instance.submitted)
            existing_details = self.instance.details or {}

        submitted_flag = data.get('submitted')
        is_now_submitted = bool(submitted_flag if submitted_flag is not None else instance_submitted)

        details_payload = data.get('details')
        if details_payload is None:
            details_payload = existing_details

        # If the form is being marked as submitted (either new submission or already submitted)
        if is_now_submitted:
            if not details_payload:
                raise serializers.ValidationError({
                    "details": "Job details are required when marking as submitted."
                })

            details_dict = details_payload if isinstance(details_payload, dict) else {}
            optional_config = details_dict.get('optionalFields') or {}

            # Required fields for downstream job creation. Key job attributes stay required
            # while companies can opt out of skills/deadline collection if desired.
            required_fields = ['title', 'description', 'location']
            if optional_config.get('includeDeadline', True):
                required_fields.append('deadline')
            if optional_config.get('includeSkills', True):
                required_fields.append('skills')
            missing_fields = [field for field in required_fields if not details_payload.get(field)]

            if missing_fields:
                raise serializers.ValidationError({
                    "details": f"Missing required fields: {', '.join(missing_fields)}"
                })
        
        return data
    
    def create(self, validated_data):
        """Create a new form"""
        # Generate a key if not provided
        if 'key' not in validated_data:
            import random
            import string
            validated_data['key'] = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        
        return super().create(validated_data)


class PlacedStudentSerializer(serializers.Serializer):
    """Serializer for placed students with job and company details"""
    student_id = serializers.CharField()
    name = serializers.CharField()
    email = serializers.CharField()
    branch = serializers.CharField()
    passout_year = serializers.IntegerField()
    gpa = serializers.CharField()
    job_title = serializers.CharField()
    company_name = serializers.CharField()
    job_location = serializers.CharField()
    salary_min = serializers.DecimalField(max_digits=12, decimal_places=2)
    salary_max = serializers.DecimalField(max_digits=12, decimal_places=2)
    placed_at = serializers.DateTimeField()
    job_id = serializers.IntegerField()


