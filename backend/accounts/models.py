from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils.translation import gettext_lazy as _
from college.models import College
from django.core.exceptions import ValidationError
import os
import uuid
from django.utils.text import slugify


def validate_resume_file(value):
    """Validate resume file type and size"""
    if value:
        # Check file size (5MB limit)
        if value.size > 5 * 1024 * 1024:
            raise ValidationError('Resume file size cannot exceed 5MB.')

        # Check file extension
        ext = os.path.splitext(value.name)[1].lower()
        valid_extensions = ['.pdf', '.doc', '.docx']
        if ext not in valid_extensions:
            raise ValidationError('Resume must be a PDF, DOC, or DOCX file.')


def student_resume_upload_path(instance, filename):
    """Generate upload path for student resumes based on roll number"""
    # Get student roll number
    if hasattr(instance, 'student'):
        # For Resume model
        roll_number = instance.student.student_id
    else:
        # For StudentProfile model
        roll_number = instance.student_id

    # Create safe filename
    name, ext = os.path.splitext(filename)
    safe_filename = f"{slugify(name)[:50]}{ext}"

    return f"students/{roll_number}/resumes/{safe_filename}"


def student_certificate_upload_path(instance, filename, cert_type):
    """Generate upload path for student certificates based on roll number"""
    roll_number = instance.student_id

    # Create safe filename
    name, ext = os.path.splitext(filename)
    safe_filename = f"{slugify(name)[:50]}{ext}"

    return f"students/{roll_number}/documents/certificates/{cert_type}/{safe_filename}"


def student_tenth_certificate_upload_path(instance, filename):
    """Upload path for 10th certificate"""
    return student_certificate_upload_path(instance, filename, "10th")


def student_twelfth_certificate_upload_path(instance, filename):
    """Upload path for 12th certificate"""
    return student_certificate_upload_path(instance, filename, "12th")


def student_marksheet_upload_path(instance, filename, semester):
    """Generate upload path for student marksheets based on roll number"""
    roll_number = instance.student_id

    # Create safe filename
    name, ext = os.path.splitext(filename)
    safe_filename = f"{slugify(name)[:50]}{ext}"

    return f"students/{roll_number}/documents/marksheets/semester_{semester}/{safe_filename}"


# Dynamic marksheet upload path functions for each semester
def student_semester1_marksheet_upload_path(instance, filename):
    return student_marksheet_upload_path(instance, filename, "1")

def student_semester2_marksheet_upload_path(instance, filename):
    return student_marksheet_upload_path(instance, filename, "2")

def student_semester3_marksheet_upload_path(instance, filename):
    return student_marksheet_upload_path(instance, filename, "3")

def student_semester4_marksheet_upload_path(instance, filename):
    return student_marksheet_upload_path(instance, filename, "4")

def student_semester5_marksheet_upload_path(instance, filename):
    return student_marksheet_upload_path(instance, filename, "5")

def student_semester6_marksheet_upload_path(instance, filename):
    return student_marksheet_upload_path(instance, filename, "6")

def student_semester7_marksheet_upload_path(instance, filename):
    return student_marksheet_upload_path(instance, filename, "7")

def student_semester8_marksheet_upload_path(instance, filename):
    return student_marksheet_upload_path(instance, filename, "8")


def validate_certificate_file(value):
    """Validate certificate file type and size"""
    if value:
        # Check file size (5MB limit)
        if value.size > 5 * 1024 * 1024:
            raise ValidationError('Certificate file size cannot exceed 5MB.')

        # Check file extension
        ext = os.path.splitext(value.name)[1].lower()
        valid_extensions = ['.pdf', '.jpg', '.jpeg', '.png']
        if ext not in valid_extensions:
            raise ValidationError('Certificate must be a PDF, JPG, JPEG, or PNG file.')


class UserManager(BaseUserManager):
    def _create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        
        # Ensure we have a college if not provided
        if 'college' not in extra_fields:
            college, created = College.objects.get_or_create(
                id=1,
                defaults={
                    'name': 'Default College',
                    'slug': 'default-college'
                }
            )
            extra_fields['college'] = college
        
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('user_type', User.UserType.ADMIN)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
            
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    class UserType(models.TextChoices):
        ADMIN = 'ADMIN', _('Admin')
        STUDENT = 'STUDENT', _('Student')

    username = None
    email = models.EmailField(_('email address'), unique=True)

    # Added default college (adjust ID as needed)
    college = models.ForeignKey(College, on_delete=models.CASCADE, default=1)

    user_type = models.CharField(
        max_length=10,
        choices=UserType.choices,
        default=UserType.STUDENT,
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.email


class StudentProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')
    college = models.ForeignKey(College, on_delete=models.CASCADE, default=1)

    # Basic Information
    first_name = models.CharField(max_length=100, default='..')
    last_name = models.CharField(max_length=100, default='..')
    student_id = models.CharField(max_length=100, default='TEMP001')
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, null=True, blank=True)
    
    # Contact Information
    contact_email = models.EmailField(default='student@example.com', null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    
    # Academic Information
    branch = models.CharField(max_length=100, null=True, blank=True)
    gpa = models.CharField(max_length=10, default='0.0')
    joining_year = models.PositiveIntegerField(null=True, blank=True)
    passout_year = models.PositiveIntegerField(null=True, blank=True)
    
    # Semester marksheet data (merged from SemesterMarksheet model)
    semester1_cgpa = models.CharField(max_length=10, blank=True, null=True)
    semester2_cgpa = models.CharField(max_length=10, blank=True, null=True)
    semester3_cgpa = models.CharField(max_length=10, blank=True, null=True)
    semester4_cgpa = models.CharField(max_length=10, blank=True, null=True)
    semester5_cgpa = models.CharField(max_length=10, blank=True, null=True)
    semester6_cgpa = models.CharField(max_length=10, blank=True, null=True)
    semester7_cgpa = models.CharField(max_length=10, blank=True, null=True)
    semester8_cgpa = models.CharField(max_length=10, blank=True, null=True)
    
    semester1_marksheet = models.FileField(upload_to=student_semester1_marksheet_upload_path, validators=[validate_certificate_file], blank=True, null=True)
    semester2_marksheet = models.FileField(upload_to=student_semester2_marksheet_upload_path, validators=[validate_certificate_file], blank=True, null=True)
    semester3_marksheet = models.FileField(upload_to=student_semester3_marksheet_upload_path, validators=[validate_certificate_file], blank=True, null=True)
    semester4_marksheet = models.FileField(upload_to=student_semester4_marksheet_upload_path, validators=[validate_certificate_file], blank=True, null=True)
    semester5_marksheet = models.FileField(upload_to=student_semester5_marksheet_upload_path, validators=[validate_certificate_file], blank=True, null=True)
    semester6_marksheet = models.FileField(upload_to=student_semester6_marksheet_upload_path, validators=[validate_certificate_file], blank=True, null=True)
    semester7_marksheet = models.FileField(upload_to=student_semester7_marksheet_upload_path, validators=[validate_certificate_file], blank=True, null=True)
    semester8_marksheet = models.FileField(upload_to=student_semester8_marksheet_upload_path, validators=[validate_certificate_file], blank=True, null=True)
    
    semester1_upload_date = models.DateTimeField(blank=True, null=True)
    semester2_upload_date = models.DateTimeField(blank=True, null=True)
    semester3_upload_date = models.DateTimeField(blank=True, null=True)
    semester4_upload_date = models.DateTimeField(blank=True, null=True)
    semester5_upload_date = models.DateTimeField(blank=True, null=True)
    semester6_upload_date = models.DateTimeField(blank=True, null=True)
    semester7_upload_date = models.DateTimeField(blank=True, null=True)
    semester8_upload_date = models.DateTimeField(blank=True, null=True)
    
    # Profile Photo
    profile_image = models.ImageField(upload_to='profile_images/', blank=True, null=True)
    
    # Address Information
    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    district = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    pincode = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    
    # Documents
    resume = models.FileField(upload_to=student_resume_upload_path, validators=[validate_resume_file], blank=True, null=True)
    tenth_certificate = models.FileField(upload_to=student_tenth_certificate_upload_path, validators=[validate_certificate_file], blank=True, null=True)
    twelfth_certificate = models.FileField(upload_to=student_twelfth_certificate_upload_path, validators=[validate_certificate_file], blank=True, null=True)
    
    # Additional Information
    education = models.CharField(max_length=255, blank=True, null=True)
    skills = models.TextField(blank=True, null=True)
    
    # Academic details
    tenth_cgpa = models.CharField(max_length=10, blank=True, null=True)
    tenth_percentage = models.CharField(max_length=10, blank=True, null=True)
    tenth_board = models.CharField(max_length=100, blank=True, null=True)
    tenth_school = models.CharField(max_length=200, blank=True, null=True)
    tenth_year_of_passing = models.CharField(max_length=10, blank=True, null=True)
    tenth_location = models.CharField(max_length=200, blank=True, null=True)
    tenth_specialization = models.CharField(max_length=100, blank=True, null=True)

    twelfth_cgpa = models.CharField(max_length=10, blank=True, null=True)
    twelfth_percentage = models.CharField(max_length=10, blank=True, null=True)
    twelfth_board = models.CharField(max_length=100, blank=True, null=True)
    twelfth_school = models.CharField(max_length=200, blank=True, null=True)
    twelfth_year_of_passing = models.CharField(max_length=10, blank=True, null=True)
    twelfth_location = models.CharField(max_length=200, blank=True, null=True)
    twelfth_specialization = models.CharField(max_length=100, blank=True, null=True)
    
    # College details
    college_name = models.CharField(max_length=200, blank=True, null=True)
    parent_contact = models.CharField(max_length=20, blank=True, null=True)
    
    # Freeze functionality
    freeze_status = models.CharField(
        max_length=20,
        choices=[
            ('none', 'None'),
            ('complete', 'Complete Freeze'),
            ('partial', 'Partial Freeze')
        ],
        default='none'
    )
    freeze_reason = models.TextField(blank=True, null=True)
    freeze_date = models.DateTimeField(blank=True, null=True)
    frozen_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='frozen_students'
    )
    
    # Partial freeze restrictions
    min_salary_requirement = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Minimum salary requirement in lakhs"
    )
    allowed_job_tiers = models.JSONField(
        default=list, 
        blank=True,
        help_text="List of allowed job tiers (e.g., ['tier1', 'tier2'])"
    )
    allowed_job_types = models.JSONField(
        default=list, 
        blank=True,
        help_text="List of allowed job types (e.g., ['fulltime', 'internship'])"
    )
    allowed_companies = models.JSONField(
        default=list, 
        blank=True,
        help_text="List of allowed company IDs"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
    
    @property
    def get_profile_image_url(self):
        if self.profile_image:
            return self.profile_image.url
        return None
    
    @property
    def get_initial(self):
        if self.first_name:
            return self.first_name[0].upper()
        return "S"  # Default initial if no name
    
    # Helper methods for semester marksheets
    def get_semester_cgpa(self, semester):
        if 1 <= semester <= 8:
            return getattr(self, f'semester{semester}_cgpa', None)
        return None

    def get_semester_marksheet(self, semester):
        if 1 <= semester <= 8:
            return getattr(self, f'semester{semester}_marksheet', None)
        return None

    def get_all_semesters_data(self):
        semesters = []
        for i in range(1, 9):
            cgpa = getattr(self, f'semester{i}_cgpa', None)
            if cgpa:
                marksheet = getattr(self, f'semester{i}_marksheet', None)
                upload_date = getattr(self, f'semester{i}_upload_date', None)
                semesters.append({
                    'semester': i,
                    'cgpa': cgpa,
                    'marksheet_file': marksheet,
                    'upload_date': upload_date,
                })
        return semesters

    def is_frozen(self):
        """Check if the student account is frozen"""
        return self.freeze_status != 'none'

    def is_completely_frozen(self):
        """Check if the student account is completely frozen"""
        return self.freeze_status == 'complete'

    def is_partially_frozen(self):
        """Check if the student account is partially frozen"""
        return self.freeze_status == 'partial'

    def can_apply_to_job(self, job_posting):
        """Check if student can apply to a specific job based on freeze restrictions"""
        if not self.is_partially_frozen():
            return True  # No restrictions if not frozen or completely frozen

        # Check salary requirement
        if self.min_salary_requirement:
            # Use salary_max if available, otherwise salary_min
            job_salary = job_posting.salary_max or job_posting.salary_min
            if job_salary and job_salary < self.min_salary_requirement:
                return False

        # Check job type restrictions
        # If allowed_job_types has values, enforce the restriction
        if self.allowed_job_types and job_posting.job_type:
            # Ensure allowed_job_types is a list
            allowed_types = self.allowed_job_types if isinstance(self.allowed_job_types, list) else []
            # Only enforce restriction if there are specific job types listed
            if allowed_types and str(job_posting.job_type) not in allowed_types:
                return False

        # Check company restrictions
        # If allowed_companies has values, enforce the restriction
        if self.allowed_companies and job_posting.company:
            # Ensure allowed_companies is a list
            allowed_companies = self.allowed_companies if isinstance(self.allowed_companies, list) else []
            # Only enforce restriction if there are specific companies listed
            if allowed_companies and job_posting.company.id not in allowed_companies:
                return False

        # Check job tier restrictions
        if self.allowed_job_tiers is not None and job_posting.company:
            # This would need to be implemented based on your company tier system
            # For now, we'll assume all jobs are allowed if no specific tier logic
            pass

        return True

    def get_freeze_restriction_reasons(self, job_posting):
        """Get specific reasons why a student cannot apply to a job due to freeze restrictions"""
        if not self.is_partially_frozen():
            return []

        reasons = []

        # Check salary requirement
        if self.min_salary_requirement:
            job_salary = job_posting.salary_max or job_posting.salary_min
            if job_salary and job_salary < self.min_salary_requirement:
                reasons.append(f"Job salary ({job_salary} LPA) is below your minimum requirement ({self.min_salary_requirement} LPA)")

        # Check job type restrictions
        if self.allowed_job_types and job_posting.job_type:
            # Ensure allowed_job_types is a list
            allowed_types = self.allowed_job_types if isinstance(self.allowed_job_types, list) else []
            if allowed_types and str(job_posting.job_type) not in allowed_types:
                # Map job types to display names
                job_type_display = {
                    'FULL_TIME': 'Full Time',
                    'PART_TIME': 'Part Time',
                    'CONTRACT': 'Contract',
                    'INTERNSHIP': 'Internship'
                }
                allowed_types_display = [job_type_display.get(jt, jt) for jt in allowed_types]
                reasons.append(f"You can only apply to {', '.join(allowed_types_display)} positions")

        # Check company restrictions
        if self.allowed_companies and job_posting.company:
            # Ensure allowed_companies is a list
            allowed_companies = self.allowed_companies if isinstance(self.allowed_companies, list) else []
            if allowed_companies and job_posting.company.id not in allowed_companies:
                # Get company names for better error message
                from companies.models import Company
                allowed_company_names = []
                for company_id in allowed_companies:
                    try:
                        company = Company.objects.get(id=company_id)
                        allowed_company_names.append(company.name)
                    except Company.DoesNotExist:
                        pass
                if allowed_company_names:
                    reasons.append(f"You can only apply to jobs from: {', '.join(allowed_company_names)}")
                else:
                    reasons.append("You are not allowed to apply to any companies")

        return reasons


class Resume(models.Model):
    """Model to handle multiple resumes per student"""
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='resumes')
    name = models.CharField(max_length=255, help_text="Display name for the resume")
    file = models.FileField(upload_to=student_resume_upload_path, validators=[validate_resume_file], help_text="Resume file")
    file_size = models.PositiveIntegerField(null=True, blank=True, help_text="File size in bytes")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_primary = models.BooleanField(default=False, help_text="Whether this is the primary resume")

    class Meta:
        ordering = ['-is_primary', '-uploaded_at']

    def __str__(self):
        return f"{self.student.first_name} {self.student.last_name} - {self.name}"

    def save(self, *args, **kwargs):
        # Set file size if not already set
        if self.file and not self.file_size:
            self.file_size = self.file.size

        # Set default name if not provided
        if not self.name and self.file:
            self.name = self.file.name

        super().save(*args, **kwargs)

        # If this is set as primary, unset other primary resumes
        if self.is_primary:
            Resume.objects.filter(
                student=self.student
            ).exclude(id=self.id).update(is_primary=False)

    @property
    def file_url(self):
        """Get the URL for the resume file"""
        if self.file:
            return self.file.url
        return None

    @property
    def file_name(self):
        """Get the filename of the resume"""
        if self.file:
            return self.file.name.split('/')[-1]
        return None

    def delete(self, *args, **kwargs):
        """Override delete to remove file from filesystem"""
        # Delete the file from storage
        if self.file:
            try:
                self.file.delete(save=False)
            except Exception as e:
                # Log the error but don't prevent deletion
                print(f"Error deleting resume file {self.file.name}: {e}")

        # If deleting the primary resume, make another resume primary if available
        if self.is_primary:
            other_resumes = Resume.objects.filter(
                student=self.student
            ).exclude(id=self.id).first()

            if other_resumes:
                other_resumes.is_primary = True
                other_resumes.save()

        super().delete(*args, **kwargs)

