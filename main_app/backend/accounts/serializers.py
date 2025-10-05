from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import StudentProfile, Resume
from jobs.models import JobPosting, JobApplication
from django.utils import timezone

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'user_type')


class SemesterMarksheetSerializer(serializers.Serializer):
    semester = serializers.IntegerField()
    cgpa = serializers.CharField()
    marksheet_file = serializers.FileField(required=False)
    marksheet_url = serializers.SerializerMethodField()
    upload_date = serializers.DateTimeField()
    
    def get_marksheet_url(self, obj):
        marksheet = obj.get('marksheet_file')
        if marksheet:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(marksheet.url)
            return marksheet.url
        return None


class StudentProfileSerializer(serializers.ModelSerializer):
    semester_marksheets = serializers.SerializerMethodField()
    semester_cgpas = serializers.SerializerMethodField()
    profile_image_url = serializers.SerializerMethodField()
    initial = serializers.SerializerMethodField()
    user = UserSerializer(read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    resume_url = serializers.SerializerMethodField()
    tenth_certificate_url = serializers.SerializerMethodField()
    twelfth_certificate_url = serializers.SerializerMethodField()

    class Meta:
        model = StudentProfile
        fields = '__all__'  # joining_year and passout_year will be included automatically

    def get_profile_image_url(self, obj):
        if obj.profile_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_image.url)
            return obj.profile_image.url
        return None

    def get_initial(self, obj):
        return obj.get_initial
        
    def get_resume_url(self, obj):
        if obj.resume:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.resume.url)
            return obj.resume.url
        return None
        
    def get_tenth_certificate_url(self, obj):
        if obj.tenth_certificate:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.tenth_certificate.url)
            return obj.tenth_certificate.url
        return None
        
    def get_twelfth_certificate_url(self, obj):
        if obj.twelfth_certificate:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.twelfth_certificate.url)
            return obj.twelfth_certificate.url
        return None

    def get_semester_marksheets(self, obj):
        semesters_data = obj.get_all_semesters_data()
        return SemesterMarksheetSerializer(semesters_data, many=True, context=self.context).data

    def get_semester_cgpas(self, obj):
        """Return semester CGPAs as an array for frontend compatibility"""
        semester_cgpas = []
        for i in range(1, 9):
            cgpa = getattr(obj, f'semester{i}_cgpa', None)
            if cgpa:
                semester_cgpas.append({
                    'semester': i,
                    'cgpa': cgpa
                })
        return semester_cgpas

    def validate(self, data):
        """Custom validation to handle data type issues"""
        import logging
        logger = logging.getLogger(__name__)

        logger.info(f"Validating data keys: {list(data.keys())}")
        logger.info(f"Validating data: {data}")

        # Handle joining_year and passout_year validation
        for field in ['joining_year', 'passout_year']:
            if field in data:
                value = data[field]
                if value is not None:
                    try:
                        # Convert to integer if it's a string
                        if isinstance(value, str):
                            if value.strip() == '':
                                data[field] = None
                            else:
                                data[field] = int(value)
                        elif not isinstance(value, int):
                            data[field] = None
                    except (ValueError, TypeError):
                        logger.warning(f"Invalid {field} value: {value}")
                        data[field] = None

        # Handle email validation
        if 'contact_email' in data:
            email = data['contact_email']
            if email is not None and email.strip() == '':
                data['contact_email'] = None

        # Validate required fields
        required_string_fields = ['first_name', 'last_name', 'student_id']
        for field in required_string_fields:
            if field in data and data[field] is not None:
                if not isinstance(data[field], str) or not data[field].strip():
                    raise serializers.ValidationError({field: f'{field} cannot be empty'})

        # Handle skills field - should be a string in the model
        if 'skills' in data and data['skills'] is not None:
            if isinstance(data['skills'], list):
                data['skills'] = ', '.join(str(skill).strip() for skill in data['skills'] if skill and str(skill).strip())
            else:
                data['skills'] = str(data['skills']).strip()

        logger.info(f"Data after validation: {data}")
        return data

    def update(self, instance, validated_data):
        """Custom update method to handle semester_cgpas array and individual semester fields"""
        import logging
        logger = logging.getLogger(__name__)

        request = self.context.get('request')

        # Debug logging
        logger.info(f"Update called with validated_data keys: {list(validated_data.keys())}")
        if request and hasattr(request, 'data'):
            logger.info(f"Request data keys: {list(request.data.keys())}")

        # Handle semester_cgpas if present in the request data
        if request and hasattr(request, 'data'):
            semester_cgpas = request.data.get('semester_cgpas')
            if semester_cgpas and isinstance(semester_cgpas, list):
                # Update individual semester CGPA fields from array
                for semester_data in semester_cgpas:
                    if isinstance(semester_data, dict) and 'semester' in semester_data and 'cgpa' in semester_data:
                        semester = semester_data['semester']
                        cgpa = semester_data['cgpa']
                        if 1 <= semester <= 8:
                            setattr(instance, f'semester{semester}_cgpa', cgpa)

            # Also handle individual semester fields sent directly (e.g., semester1_cgpa, semester2_cgpa)
            for i in range(1, 9):
                field_name = f'semester{i}_cgpa'
                if field_name in request.data:
                    setattr(instance, field_name, request.data[field_name])

        # Update all other fields normally
        for attr, value in validated_data.items():
            if attr != 'semester_cgpas':  # Skip this as we handled it above
                setattr(instance, attr, value)

        instance.save()
        return instance


class StudentProfileListSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    semester_marksheets = serializers.SerializerMethodField()

    class Meta:
        model = StudentProfile
        fields = '__all__'  # joining_year and passout_year will be included automatically

    def get_semester_marksheets(self, obj):
        semesters_data = obj.get_all_semesters_data()
        return SemesterMarksheetSerializer(semesters_data, many=True, context=self.context).data






class CompanyJobListingSerializer(serializers.Serializer):
    title = serializers.CharField()
    type = serializers.CharField()
    ctc = serializers.DecimalField(max_digits=12, decimal_places=2)
    stipend = serializers.DecimalField(max_digits=12, decimal_places=2)
    deadline = serializers.DateField(format="%Y-%m-%d")


# Note: CompaniesJSONSerializer removed - we'll use Company model directly now


class ResumeSerializer(serializers.ModelSerializer):
    """Serializer for Resume model"""
    file_url = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()

    class Meta:
        model = Resume
        fields = ['id', 'name', 'file', 'file_url', 'file_name', 'file_size',
                 'uploaded_at', 'updated_at', 'is_primary']
        read_only_fields = ['id', 'file_size', 'uploaded_at', 'updated_at']

    def get_file_url(self, obj):
        """Get the full URL for the resume file"""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None

    def get_file_name(self, obj):
        """Get the filename of the resume"""
        return obj.file_name


class ResumeCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating resumes"""

    class Meta:
        model = Resume
        fields = ['name', 'file', 'is_primary']

    def create(self, validated_data):
        # Get the student from the request context
        request = self.context.get('request')
        if request and hasattr(request.user, 'student_profile'):
            validated_data['student'] = request.user.student_profile
        return super().create(validated_data)
