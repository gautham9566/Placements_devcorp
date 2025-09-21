from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from .models import CompanyForm
from .serializers import CompanyFormSerializer
from rest_framework import serializers

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from jobs.models import JobApplication
from .serializers import StudentApplicationSerializer

from .models import JobPosting, JobApplication
from .serializers import (
    JobPostingCreateUpdateSerializer,
    JobApplicationSerializer,
    JobWithApplicationStatsSerializer,
)
from accounts.models import StudentProfile
from college.models import College
from django.shortcuts import get_object_or_404
from django.db import models
from django.db.models import Q, Count
from .serializers import (
    EnhancedJobSerializer, 
    EnhancedJobApplicationSerializer,
    # CompanySerializer removed - use companies.serializers.CompanySerializer if needed
    JobListResponseSerializer,
    StatsSerializer,
    DetailedJobApplicationSerializer,
    ExportConfigSerializer,
    StudentProfileFieldsSerializer
)
# EmployerProfile removed
from .utils import StandardResultsSetPagination, get_paginated_response, get_correct_pagination_data, ApplicationExportService
from django.contrib.auth import get_user_model
from datetime import datetime
from django.utils import timezone

User = get_user_model()

def create_enhanced_application_snapshot(student_profile, custom_responses=None, request=None):
    """Create enhanced application snapshot with organized structure"""
    snapshot = {
        "basic_info": {
            "name": f"{student_profile.first_name} {student_profile.last_name}",
            "email": student_profile.contact_email or student_profile.user.email,
            "student_id": student_profile.student_id,
            "branch": student_profile.branch,
            "current_cgpa": student_profile.gpa,
            "university": student_profile.college_name or student_profile.college.name if student_profile.college else None,
        },
        "academic_info": {
            "tenth_percentage": student_profile.tenth_percentage,
            "twelfth_percentage": student_profile.twelfth_percentage,
            "graduation_year": student_profile.passout_year,
            "joining_year": student_profile.joining_year,
            "semester_wise_cgpa": {
                f"semester{i}": getattr(student_profile, f'semester{i}_cgpa') 
                for i in range(1, 9) 
                if getattr(student_profile, f'semester{i}_cgpa')
            }
        },
        "contact_info": {
            "phone": student_profile.phone,
            "address": student_profile.address,
            "city": student_profile.city,
            "state": student_profile.state,
            "pincode": student_profile.pincode,
            "country": student_profile.country,
        },
        "documents": {
            "resume_url": student_profile.resume.url if student_profile.resume else None,
            "tenth_certificate_url": student_profile.tenth_certificate.url if student_profile.tenth_certificate else None,
            "twelfth_certificate_url": student_profile.twelfth_certificate.url if student_profile.twelfth_certificate else None,
        },
        "custom_responses": custom_responses or {},
        "metadata": {
            "form_version": "1.0",
            "submission_ip": request.META.get('REMOTE_ADDR') if request else None,
            "user_agent": request.META.get('HTTP_USER_AGENT') if request else None,
            "submission_timestamp": timezone.now().isoformat(),
        }
    }
    
    # Clean up None values to keep the JSON clean
    def clean_dict(d):
        if isinstance(d, dict):
            return {k: clean_dict(v) for k, v in d.items() if v is not None and v != ""}
        return d
    
    return clean_dict(snapshot)

class JobPostingListView(generics.ListAPIView):
    serializer_class = JobPostingCreateUpdateSerializer  
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return JobPosting.objects.filter(is_active=True)

class JobPostingCreateView(generics.CreateAPIView):
    serializer_class = JobPostingCreateUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        data = {}
        if not user.is_staff:
            data['on_campus'] = False
        else:
            data['on_campus'] = True
        serializer.save(**data)

class JobPostingUpdateView(generics.UpdateAPIView):
    serializer_class = JobPostingCreateUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = JobPosting.objects.all()

class JobPostingDeleteView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    queryset = JobPosting.objects.all()

class JobPostingListCreateView(generics.ListCreateAPIView):
    serializer_class = JobPostingCreateUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        college_slug = self.kwargs['slug']
        college = get_object_or_404(College, slug=college_slug)
        return JobPosting.objects.filter(
            is_active=True,
            on_campus=True  # Since we moved to company-based model, focus on on-campus jobs
        ).order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        data = {}
        if not user.is_staff:
            data['on_campus'] = False
        else:
            data['on_campus'] = True
        serializer.save(**data)

class JobPostingDetailUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = JobPostingCreateUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = JobPosting.objects.all()
    lookup_field = 'pk'

class JobApplicationCreateView(generics.CreateAPIView):
    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        job = JobPosting.objects.get(id=self.kwargs['job_id'])
        student = self.request.user.student_profile

        # Check freeze restrictions
        if student.freeze_status == 'complete':
            raise serializers.ValidationError({
                "freeze": "Your account is completely frozen. You cannot apply to any jobs."
            })

        if student.freeze_status == 'partial':
            if not student.can_apply_to_job(job):
                restriction_reasons = student.get_freeze_restriction_reasons(job)
                raise serializers.ValidationError({
                    "freeze": f"Your account has partial restrictions. {student.freeze_reason}",
                    "restrictions": restriction_reasons
                })

        uploaded_resume = self.request.FILES.get("resume", None)
        profile_resume = student.resume

        # Check for resumes in the new Resume model
        student_resumes = student.resumes.all()
        primary_resume = student.resumes.filter(is_primary=True).first()
        latest_resume = student.resumes.first() if student_resumes.exists() else None

        if not uploaded_resume and not profile_resume and not student_resumes.exists():
            raise serializers.ValidationError({
                "resume": "A resume must be uploaded or present in the student profile."
            })

        # Priority: uploaded_resume > profile_resume > primary_resume > latest_resume
        final_resume = uploaded_resume if uploaded_resume else (
            profile_resume if profile_resume else (
                primary_resume.file if primary_resume else (
                    latest_resume.file if latest_resume else None
                )
            )
        )

        # Create enhanced snapshot using utility function
        snapshot = create_enhanced_application_snapshot(
            student_profile=student,
            custom_responses=self.request.data.get('custom_responses', {}),
            request=self.request
        )

        serializer.save(
            job=job,
            applicant=self.request.user,
            resume=uploaded_resume if uploaded_resume else None,
            applied_data_snapshot=snapshot
        )


class AppliedJobsListView(generics.ListAPIView):
    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = JobApplication.objects.filter(applicant=self.request.user).order_by('-applied_at')
        
        # Add filtering for applied jobs
        status = self.request.query_params.get('status')
        job_type = self.request.query_params.get('job_type')
        company = self.request.query_params.get('company')
        
        if status:
            queryset = queryset.filter(status=status)
        if job_type:
            queryset = queryset.filter(job__job_type=job_type)
        if company:
            queryset = queryset.filter(job__company__name__icontains=company)
            
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            # Use corrected pagination calculation
            pagination_data = get_correct_pagination_data(
                request, 
                self.paginator.page.paginator, 
                self.paginator.page, 
                self.pagination_class.page_size
            )
            return Response({
                'data': serializer.data,
                'pagination': pagination_data
            })
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({'data': serializer.data})

class AllApplicationsView(generics.ListAPIView):
    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = JobApplication.objects.select_related('job', 'applicant').order_by('-applied_at')
        
        # Add filtering for admin view
        status = self.request.query_params.get('status')
        job_id = self.request.query_params.get('job_id')
        company = self.request.query_params.get('company')
        student_name = self.request.query_params.get('student_name')
        job_type = self.request.query_params.get('job_type')
        
        if status:
            queryset = queryset.filter(status=status)
        if job_id:
            queryset = queryset.filter(job_id=job_id)
        if company:
            queryset = queryset.filter(job__company__name__icontains=company)
        if student_name:
            queryset = queryset.filter(
                Q(applicant__student_profile__first_name__icontains=student_name) |
                Q(applicant__student_profile__last_name__icontains=student_name)
            )
        if job_type:
            queryset = queryset.filter(job__job_type=job_type)
            
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            # Use corrected pagination calculation
            pagination_data = get_correct_pagination_data(
                request, 
                self.paginator.page.paginator, 
                self.paginator.page, 
                self.pagination_class.page_size
            )
            return Response({
                'data': serializer.data,
                'pagination': pagination_data
            })
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({'data': serializer.data})

class JobApplicationStatusUpdateView(generics.UpdateAPIView):
    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = JobApplication.objects.all()
    lookup_field = 'pk'


class JobStatsListView(generics.ListAPIView):
    queryset = JobPosting.objects.prefetch_related('applications').all()
    serializer_class = JobWithApplicationStatsSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = StandardResultsSetPagination

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            # Use corrected pagination calculation
            pagination_data = get_correct_pagination_data(
                request, 
                self.paginator.page.paginator, 
                self.paginator.page, 
                self.pagination_class.page_size
            )
            return Response({
                'data': serializer.data,
                'pagination': pagination_data
            })
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({'data': serializer.data})


class MyJobApplicationsView(generics.ListAPIView):
    serializer_class = StudentApplicationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        return JobApplication.objects.filter(applicant=self.request.user).order_by('-applied_at')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            # Use corrected pagination calculation
            pagination_data = get_correct_pagination_data(
                request, 
                self.paginator.page.paginator, 
                self.paginator.page, 
                self.pagination_class.page_size
            )
            return Response({
                'data': serializer.data,
                'pagination': pagination_data
            })
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({'data': serializer.data})

class CollegeJobListView(generics.ListAPIView):
    serializer_class = JobPostingCreateUpdateSerializer  
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        college_slug = self.kwargs['slug']
        college = get_object_or_404(College, slug=college_slug)
        
        # Filter jobs that are:
        # 1. Active jobs
        # 2. Either posted by employers from the same college, or
        # 3. On-campus jobs (assuming these are relevant to all colleges)
        # 4. Or all jobs if you want to show all available jobs to students
        
        queryset = JobPosting.objects.filter(
            is_active=True,
            on_campus=True  # For now, only show on-campus jobs since companies don't have college association
        ).order_by('-created_at')

        # Add filtering
        job_type = self.request.query_params.get('job_type')
        location = self.request.query_params.get('location')
        search = self.request.query_params.get('search')

        if job_type:
            queryset = queryset.filter(job_type=job_type)
        if location:
            queryset = queryset.filter(location__icontains=location)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | 
                Q(description__icontains=search)
            )

        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            # Use corrected pagination calculation
            pagination_data = get_correct_pagination_data(
                request, 
                self.paginator.page.paginator, 
                self.paginator.page, 
                self.pagination_class.page_size
            )
            return Response({
                'data': serializer.data,
                'pagination': pagination_data
            })
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({'data': serializer.data})


class JobApplicationsListView(generics.ListAPIView):
    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        job_id = self.kwargs['job_id']
        job = get_object_or_404(JobPosting, id=job_id)
        return JobApplication.objects.filter(job=job).order_by('-applied_at')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            # Use corrected pagination calculation
            pagination_data = get_correct_pagination_data(
                request, 
                self.paginator.page.paginator, 
                self.paginator.page, 
                self.pagination_class.page_size
            )
            return Response({
                'data': serializer.data,
                'pagination': pagination_data
            })
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({'data': serializer.data})

# StandardResultsSetPagination moved to utils.py

class EnhancedJobListCreateView(generics.ListCreateAPIView):
    """Enhanced job listing with filtering and pagination"""
    serializer_class = EnhancedJobSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filterset_fields = ['job_type', 'location']
    search_fields = ['title', 'description', 'company__name']

    def get_queryset(self):
        college_slug = self.kwargs['slug']
        college = get_object_or_404(College, slug=college_slug)
        
        # Base queryset
        queryset = JobPosting.objects.filter(
            is_active=True,
            on_campus=True  # For now, only show on-campus jobs since companies don't have college association
        ).select_related('company').order_by('-created_at')
        
        # For regular users (students), only show published jobs
        # For admins, show all jobs (published and unpublished)
        if not self.request.user.is_staff:
            queryset = queryset.filter(is_published=True)

        # Custom filtering
        job_type = self.request.query_params.get('job_type')
        location = self.request.query_params.get('location')
        salary_min = self.request.query_params.get('salary_min')
        search = self.request.query_params.get('search')

        if job_type:
            queryset = queryset.filter(job_type=job_type)
        if location:
            queryset = queryset.filter(location__icontains=location)
        if salary_min:
            queryset = queryset.filter(salary_min__gte=salary_min)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | 
                Q(description__icontains=search) |
                Q(company__name__icontains=search)
            )

        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            # Use corrected pagination calculation
            pagination_data = get_correct_pagination_data(
                request, 
                self.paginator.page.paginator, 
                self.paginator.page, 
                self.pagination_class.page_size
            )
            return Response({
                'data': serializer.data,
                'pagination': pagination_data
            })
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({'data': serializer.data})

    def perform_create(self, serializer):
        user = self.request.user
        data = {}
        if not user.is_staff:
            data['on_campus'] = False
        else:
            data['on_campus'] = True
        serializer.save(**data)


class EnhancedJobDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Enhanced job detail view"""
    serializer_class = EnhancedJobSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = JobPosting.objects.select_related('company').all()
    lookup_field = 'pk'


class JobApplicationEligibilityView(APIView):
    """Check if student can apply to a specific job based on freeze restrictions"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk, slug=None):
        try:
            job = JobPosting.objects.get(id=pk)
        except JobPosting.DoesNotExist:
            return Response({"detail": "Job posting not found."}, status=404)
        except Exception as e:
            return Response({"detail": f"Error fetching job: {str(e)}"}, status=500)

        try:
            student = request.user.student_profile
        except AttributeError:
            return Response({
                "can_apply": False,
                "reason": "User does not have a student profile. Please complete your student profile first."
            }, status=400)
        except Exception as e:
            return Response({"detail": f"Error fetching student profile: {str(e)}"}, status=500)

        try:
            # Check freeze status
            if student.freeze_status == 'complete':
                return Response({
                    "can_apply": False,
                    "freeze_status": "complete",
                    "reason": "Your account is completely frozen. You cannot apply to any jobs.",
                    "freeze_reason": student.freeze_reason
                })

            if student.freeze_status == 'partial':
                can_apply = student.can_apply_to_job(job)
                if not can_apply:
                    restriction_reasons = student.get_freeze_restriction_reasons(job)
                    return Response({
                        "can_apply": False,
                        "freeze_status": "partial",
                        "reason": f"Your account has partial restrictions. {student.freeze_reason}",
                        "freeze_reason": student.freeze_reason,
                        "restrictions": restriction_reasons
                    })

            # Check if already applied
            if JobApplication.objects.filter(job=job, applicant=request.user).exists():
                return Response({
                    "can_apply": False,
                    "reason": "You have already applied to this job."
                })

            return Response({
                "can_apply": True,
                "freeze_status": student.freeze_status
            })
        except Exception as e:
            return Response({"detail": f"Error checking eligibility: {str(e)}"}, status=500)


class EnhancedJobApplicationCreateView(generics.CreateAPIView):
    """Enhanced job application create view"""
    serializer_class = EnhancedJobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        import os
        from django.core.files.storage import default_storage
        from django.core.files.base import ContentFile
        
        # Get job with proper error handling
        try:
            job = JobPosting.objects.get(id=self.kwargs['job_id'])
        except JobPosting.DoesNotExist:
            raise serializers.ValidationError({
                "job": "Job posting not found."
            })

        # Get student profile with proper error handling
        try:
            student = self.request.user.student_profile
        except AttributeError:
            raise serializers.ValidationError({
                "user": "User does not have a student profile. Please complete your profile first."
            })

        # Check if user has already applied to this job
        if JobApplication.objects.filter(job=job, applicant=self.request.user).exists():
            raise serializers.ValidationError({
                "application": "You have already applied to this job."
            })

        # Check freeze restrictions
        if student.freeze_status == 'complete':
            raise serializers.ValidationError({
                "freeze": "Your account is completely frozen. You cannot apply to any jobs."
            })

        if student.freeze_status == 'partial':
            if not student.can_apply_to_job(job):
                restriction_reasons = student.get_freeze_restriction_reasons(job)
                raise serializers.ValidationError({
                    "freeze": f"Your account has partial restrictions. {student.freeze_reason}",
                    "restrictions": restriction_reasons
                })

        uploaded_resume = self.request.FILES.get("resume", None)
        profile_resume = student.resume

        # Check for resumes in the new Resume model
        student_resumes = student.resumes.all()
        primary_resume = student.resumes.filter(is_primary=True).first()
        latest_resume = student.resumes.first() if student_resumes.exists() else None

        if not uploaded_resume and not profile_resume and not student_resumes.exists():
            raise serializers.ValidationError({
                "resume": "A resume must be uploaded or present in the student profile."
            })

        # Priority: uploaded_resume > profile_resume > primary_resume > latest_resume
        final_resume = uploaded_resume if uploaded_resume else (
            profile_resume if profile_resume else (
                primary_resume.file if primary_resume else (
                    latest_resume.file if latest_resume else None
                )
            )
        )

        # Process additional fields and handle file uploads
        additional_fields = {}
        uploaded_file_urls = {}

        # Get additional field responses from serializer data
        additional_field_responses = self.request.data.get('additional_field_responses', {})
        if additional_field_responses:
            additional_fields.update(additional_field_responses)

        # Handle regular form data (for backward compatibility)
        for key, value in self.request.data.items():
            if key not in ['cover_letter', 'job', 'resume', 'additional_field_responses']:
                # Try to parse JSON for complex fields
                try:
                    import json
                    if isinstance(value, str) and (value.startswith('{') or value.startswith('[')):
                        additional_fields[key] = json.loads(value)
                    else:
                        additional_fields[key] = value
                except (json.JSONDecodeError, ValueError):
                    additional_fields[key] = value
        
        # Handle file uploads
        for key, file in self.request.FILES.items():
            if key != 'resume':  # Skip the main resume field
                # Create a safe filename
                import uuid
                from django.utils.text import slugify
                timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
                safe_filename = f"{timestamp}_{slugify(file.name[:50])}"
                
                # Save file locally
                file_path = f"application_files/{student.student_id}/{safe_filename}"
                file_url = default_storage.save(file_path, ContentFile(file.read()))
                
                # Store file URL in additional fields
                uploaded_file_urls[key] = f"/media/{file_url}"
                additional_fields[key] = f"/media/{file_url}"
        
        # Create enhanced snapshot using utility function
        snapshot = create_enhanced_application_snapshot(
            student_profile=student,
            custom_responses=additional_fields,
            request=self.request
        )
        
        # Add uploaded file URLs to the documents section
        if uploaded_file_urls:
            if 'documents' not in snapshot:
                snapshot['documents'] = {}
            snapshot['documents'].update(uploaded_file_urls)

        serializer.save(
            job=job,
            applicant=self.request.user,
            resume=uploaded_resume if uploaded_resume else None,
            applied_data_snapshot=snapshot
        )


class JobStatsView(APIView):
    """Job statistics endpoint with caching"""
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, slug=None):
        try:
            from metrics.utils import get_or_calculate_metric
            
            # Check if client wants fresh data
            force_refresh = request.query_params.get('refresh', 'false').lower() == 'true'
            
            # Get cached or fresh metrics
            stats = get_or_calculate_metric('job_stats', force_refresh=force_refresh)
            
            if stats is not None:
                serializer = StatsSerializer(stats)
                return Response(serializer.data)
        except ImportError:
            # Metrics app not available, fall back to direct calculation
            pass
        
        # Fallback to original calculation if caching fails
        college = get_object_or_404(College, slug=slug)
        
        # Calculate statistics - now using on_campus jobs since we moved to company-based model
        total_jobs = JobPosting.objects.filter(
            on_campus=True
        ).count()
        
        active_jobs = JobPosting.objects.filter(
            on_campus=True,
            is_active=True
        ).count()
        
        total_applications = JobApplication.objects.filter(
            job__on_campus=True
        ).count()
        
        pending_applications = JobApplication.objects.filter(
            job__on_campus=True,
            status='APPLIED'
        ).count()
        
        # Use Company model for stats instead of EmployerProfile
        from companies.models import Company
        total_companies = Company.objects.count()
        hiring_companies = Company.objects.filter(
            job_postings__is_active=True
        ).distinct().count()

        stats = {
            'total_jobs': total_jobs,
            'active_jobs': active_jobs,
            'total_applications': total_applications,
            'pending_applications': pending_applications,
            'total_companies': total_companies,
            'hiring_companies': hiring_companies
        }

        serializer = StatsSerializer(stats)
        return Response(serializer.data)


class CompanyStatsView(APIView):
    """Company statistics endpoint with caching"""
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, slug=None):
        try:
            from metrics.utils import get_or_calculate_metric
            
            # Check if client wants fresh data
            force_refresh = request.query_params.get('refresh', 'false').lower() == 'true'
            
            # Get cached or fresh metrics
            stats = get_or_calculate_metric('company_stats', force_refresh=force_refresh)
            
            if stats is not None:
                return Response(stats)
        except ImportError:
            # Metrics app not available, fall back to direct calculation
            pass
        
        # Fallback to original calculation if caching fails
        college = get_object_or_404(College, slug=slug)
        
        # Use Company model for stats instead of EmployerProfile
        from companies.models import Company
        total_companies = Company.objects.count()
        hiring_companies = Company.objects.filter(
            job_postings__is_active=True
        ).distinct().count()

        stats = {
            'total_companies': total_companies,
            'hiring_companies': hiring_companies
        }

        return Response(stats)


class ApplicationStatsView(APIView):
    """Application statistics endpoint with caching"""
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, slug=None):
        try:
            from metrics.utils import get_or_calculate_metric
            
            # Check if client wants fresh data
            force_refresh = request.query_params.get('refresh', 'false').lower() == 'true'
            
            # Get cached or fresh metrics
            stats = get_or_calculate_metric('application_stats', force_refresh=force_refresh)
            
            if stats is not None:
                return Response(stats)
        except ImportError:
            # Metrics app not available, fall back to direct calculation
            pass
        
        # Fallback to original calculation if caching fails
        college = get_object_or_404(College, slug=slug)
        
        total_applications = JobApplication.objects.filter(
            job__on_campus=True
        ).count()
        
        pending_applications = JobApplication.objects.filter(
            job__on_campus=True,
            status='APPLIED'
        ).count()

        stats = {
            'total_applications': total_applications,
            'pending_applications': pending_applications
        }

        return Response(stats)

class CompanyFormViewSet(viewsets.ModelViewSet):
    """
    API endpoint for company forms
    """
    queryset = CompanyForm.objects.all()
    serializer_class = CompanyFormSerializer
    permission_classes = [permissions.IsAuthenticated]  # TODO: Consider IsAdminUser for production
    
    def get_queryset(self):
        # All authenticated users can see all forms (admin interface)
        # TODO: Add creator field to CompanyForm model to filter by ownership
        return CompanyForm.objects.all()
    
    def perform_create(self, serializer):
        # Generate a random key if not provided
        if 'key' not in serializer.validated_data:
            import random
            import string
            key = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
            serializer.save(key=key)
        else:
            serializer.save()
    
    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            print(f"Error creating form: {str(e)}")
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

class CompanyFormDetailView(generics.RetrieveUpdateAPIView):
    """
    API endpoint to retrieve or update a specific form by ID
    """
    queryset = CompanyForm.objects.all()
    serializer_class = CompanyFormSerializer
    
    def get_permissions(self):
        if self.request.method == 'GET':
            # Anyone with the form ID can view it
            return []
        # Only staff can update forms
        return [permissions.IsAuthenticated(), permissions.IsAdminUser()]
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

class AdminJobPostingCreateView(generics.CreateAPIView):
    """
    Enhanced job creation view for admin users that can associate jobs with companies
    """
    serializer_class = JobPostingCreateUpdateSerializer
    permission_classes = [permissions.IsAdminUser]

    def perform_create(self, serializer):
        from companies.models import Company
        
        # Get the company name from request data
        company_name = self.request.data.get('company_name')
        print(f"🔍 AdminJobPostingCreateView called with company_name: {company_name}")
        
        # Get the college from the URL kwargs
        college_slug = self.kwargs.get('slug', 'default-college')
        college = get_object_or_404(College, slug=college_slug)
        print(f"🔍 College: {college.name}")
        
        if company_name:
            print(f"🔍 Processing company_name: {company_name}")
            # Try to find or create the company
            company, created = Company.objects.get_or_create(
                name=company_name,
                defaults={
                    'description': f'{company_name} - Company profile',
                    'college': college
                }
            )
            
            if created:
                print(f"✅ Created new company: {company.name}")
            else:
                print(f"✅ Found existing company: {company.name}")
            
            # Save the job with the company, mark as on-campus, and set as unpublished (to be published)
            job = serializer.save(company=company, on_campus=True, is_published=False)
            print(f"✅ Job '{job.title}' created for company: {company.name} (Status: To be Published)")
        else:
            # No company name provided - this shouldn't happen for admin created jobs
            print(f"⚠️ No company name provided for admin job creation")
            job = serializer.save(on_campus=True, is_published=False)
            
        return job


class JobPublishToggleView(generics.UpdateAPIView):
    """
    API endpoint to toggle the publish status of a job
    """
    queryset = JobPosting.objects.all()
    permission_classes = [permissions.IsAdminUser]
    lookup_field = 'pk'
    
    def patch(self, request, *args, **kwargs):
        job = self.get_object()
        
        # Toggle the publish status
        job.is_published = not job.is_published
        job.save()
        
        status_text = "Published" if job.is_published else "Unpublished (To be Published)"
        
        return Response({
            'message': f'Job "{job.title}" has been {status_text.lower()}',
            'job_id': job.id,
            'is_published': job.is_published,
            'status': status_text
        })


class CompanyJobsManagementView(generics.ListAPIView):
    """
    API endpoint for admin company management - returns jobs separated by publish status
    """
    permission_classes = [permissions.IsAdminUser]
    serializer_class = EnhancedJobSerializer
    
    def get(self, request, company_id, *args, **kwargs):
        from companies.models import Company
        
        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response({'error': 'Company not found'}, status=404)
        
        # Get all jobs for this company
        all_jobs = company.job_postings.filter(is_active=True).order_by('-created_at')
        
        # Separate by publish status
        to_be_published = all_jobs.filter(is_published=False)
        published = all_jobs.filter(is_published=True)
        
        # Serialize the data
        to_be_published_data = EnhancedJobSerializer(to_be_published, many=True).data
        published_data = EnhancedJobSerializer(published, many=True).data
        
        return Response({
            'company': {
                'id': company.id,
                'name': company.name,
                'description': company.description,
            },
            'jobs': {
                'to_be_published': {
                    'count': to_be_published.count(),
                    'data': to_be_published_data
                },
                'published': {
                    'count': published.count(),
                    'data': published_data
                }
            },
            'total_jobs': all_jobs.count()
        })

class AdminJobListView(generics.ListAPIView):
    """
    Admin-specific job listing that shows ALL jobs (published and unpublished)
    """
    serializer_class = EnhancedJobSerializer
    permission_classes = [permissions.IsAuthenticated]  # Temporarily relaxed for debugging
    pagination_class = StandardResultsSetPagination
    filterset_fields = ['job_type', 'location', 'is_published']
    search_fields = ['title', 'description', 'company__name']

    def get_queryset(self):
        college_slug = self.kwargs['slug']
        college = get_object_or_404(College, slug=college_slug)
        
        # Admin view - show ALL jobs regardless of publish status
        queryset = JobPosting.objects.filter(
            is_active=True,
            on_campus=True
        ).select_related('company').order_by('-created_at')

        # Custom filtering
        job_type = self.request.query_params.get('job_type')
        location = self.request.query_params.get('location')
        salary_min = self.request.query_params.get('salary_min')
        salary_max = self.request.query_params.get('salary_max')
        stipend_min = self.request.query_params.get('stipend_min')
        stipend_max = self.request.query_params.get('stipend_max')
        search = self.request.query_params.get('search')
        is_published = self.request.query_params.get('is_published')
        company_id = self.request.query_params.get('company_id')
        company_name = self.request.query_params.get('company_name')
        deadline = self.request.query_params.get('deadline')

        if job_type:
            queryset = queryset.filter(job_type=job_type)
        if location:
            queryset = queryset.filter(location__icontains=location)
        if salary_min:
            queryset = queryset.filter(salary_min__gte=salary_min)
        if salary_max:
            queryset = queryset.filter(salary_max__lte=salary_max)
        if stipend_min:
            queryset = queryset.filter(stipend__gte=stipend_min)
        if stipend_max:
            queryset = queryset.filter(stipend__lte=stipend_max)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | 
                Q(description__icontains=search) |
                Q(company__name__icontains=search)
            )
        if is_published is not None:
            queryset = queryset.filter(is_published=is_published.lower() == 'true')
        if deadline:
            try:
                deadline_date = datetime.strptime(deadline, '%Y-%m-%d').date()
                queryset = queryset.filter(application_deadline__lte=deadline_date)
            except ValueError:
                print(f"⚠️ AdminJobListView: Invalid deadline format: {deadline}")
        
        # Company filtering
        if company_id:
            try:
                queryset = queryset.filter(company__id=int(company_id))
                print(f"🔍 AdminJobListView: Filtering by company_id={company_id}")
            except (ValueError, TypeError):
                print(f"⚠️ AdminJobListView: Invalid company_id={company_id}")
                
        if company_name:
            queryset = queryset.filter(company__name__icontains=company_name)
            print(f"🔍 AdminJobListView: Filtering by company_name={company_name}")

        final_count = queryset.count()
        print(f"🔍 AdminJobListView: Final queryset count: {final_count}")
        
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            pagination_data = get_correct_pagination_data(
                request, 
                self.paginator.page.paginator, 
                self.paginator.page, 
                self.pagination_class.page_size
            )
            return Response({
                'data': serializer.data,
                'pagination': pagination_data
            })
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({'data': serializer.data})


# Enhanced Application Management Views

class EnhancedApplicationsListView(generics.ListAPIView):
    """Enhanced applications list with advanced filtering"""
    serializer_class = DetailedJobApplicationSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = JobApplication.objects.select_related(
            'job', 'job__company', 'applicant__student_profile'
        ).filter(is_deleted=False)
        
        # Apply filters
        queryset = self.filter_queryset(queryset)
        
        return queryset

    def filter_queryset(self, queryset):
        """Apply custom filtering"""
        # Status filter
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
        
        # Job filter
        job_id = self.request.query_params.get('job_id')
        if job_id:
            queryset = queryset.filter(job_id=job_id)
        
        # Company filter
        company = self.request.query_params.get('company')
        if company:
            queryset = queryset.filter(job__company__name__icontains=company)
        
        # Student name search
        student_name = self.request.query_params.get('student_name')
        if student_name:
            queryset = queryset.filter(
                models.Q(applicant__student_profile__first_name__icontains=student_name) |
                models.Q(applicant__student_profile__last_name__icontains=student_name)
            )
        
        # Date range filters
        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(applied_at__gte=date_from)
        
        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(applied_at__lte=date_to)
        
        # Search across multiple fields
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(job__title__icontains=search) |
                models.Q(job__company__name__icontains=search) |
                models.Q(applicant__student_profile__first_name__icontains=search) |
                models.Q(applicant__student_profile__last_name__icontains=search) |
                models.Q(applicant__student_profile__student_id__icontains=search)
            )
        
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        
        # Get statistics
        stats = self.get_application_stats(queryset)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response({
                'results': serializer.data,
                'stats': stats
            })

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'results': serializer.data,
            'stats': stats
        })

    def get_application_stats(self, queryset):
        """Calculate application statistics"""
        from django.db.models import Count
        total = queryset.count()
        by_status = queryset.values('status').annotate(
            count=Count('id')
        ).order_by('status')
        
        return {
            'total': total,
            'by_status': list(by_status),
            'recent': queryset.filter(
                applied_at__gte=timezone.now() - timezone.timedelta(days=7)
            ).count()
        }


class ApplicationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Individual application management"""
    serializer_class = DetailedJobApplicationSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = JobApplication.objects.select_related(
        'job', 'job__company', 'applicant__student_profile'
    )

    def perform_update(self, serializer):
        # Log status changes
        if 'status' in serializer.validated_data:
            old_status = self.get_object().status
            new_status = serializer.validated_data['status']
            
            if old_status != new_status:
                serializer.instance.add_status_change(
                    new_status=new_status,
                    changed_by=self.request.user,
                    notes=serializer.validated_data.get('admin_notes')
                )
        
        serializer.save(last_modified_by=self.request.user)

    def perform_destroy(self, instance):
        # Soft delete
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save()


class ApplicationExportView(APIView):
    """Export applications to various formats"""
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        """Get available export columns"""
        job_id = request.query_params.get('job_id')
        export_service = ApplicationExportService()
        columns = export_service.get_available_columns(job_id=job_id)
        return Response(columns)

    def post(self, request):
        serializer = ExportConfigSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        config = serializer.validated_data
        
        # Get filtered queryset
        queryset = self.get_export_queryset(config)
        
        # Generate export
        export_service = ApplicationExportService()
        file_data = export_service.generate_export(
            queryset=queryset,
            format=config['format'],
            columns=config['columns'],
            job_id=config.get('job_id')
        )
        
        from django.http import HttpResponse
        response = HttpResponse(
            file_data['content'],
            content_type=file_data['content_type']
        )
        response['Content-Disposition'] = f'attachment; filename="{file_data["filename"]}"'
        
        return response

    def get_export_queryset(self, config):
        """Get filtered queryset for export"""
        queryset = JobApplication.objects.select_related(
            'job', 'job__company', 'applicant__student_profile'
        ).filter(is_deleted=False)
        
        if config.get('job_id'):
            queryset = queryset.filter(job_id=config['job_id'])
        
        if config.get('status'):
            queryset = queryset.filter(status__in=config['status'])
        
        if config.get('date_from'):
            queryset = queryset.filter(applied_at__gte=config['date_from'])
        
        if config.get('date_to'):
            queryset = queryset.filter(applied_at__lte=config['date_to'])
        
        return queryset


class StudentProfileFieldsView(APIView):
    """Get available student profile fields for dynamic forms"""
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        # Use a dummy object since we're just returning field definitions
        serializer = StudentProfileFieldsSerializer({})
        return Response(serializer.data)


class BulkApplicationUpdateView(APIView):
    """Bulk update applications"""
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        application_ids = request.data.get('application_ids', [])
        action = request.data.get('action')
        value = request.data.get('value')
        
        if not application_ids or not action:
            return Response(
                {'error': 'application_ids and action are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = JobApplication.objects.filter(
            id__in=application_ids,
            is_deleted=False
        )
        
        updated_count = 0
        
        if action == 'status_update':
            for application in queryset:
                if application.status != value:
                    application.add_status_change(
                        new_status=value,
                        changed_by=request.user,
                        notes=f"Bulk update by {request.user.email}"
                    )
                    application.save()
                    updated_count += 1
        
        elif action == 'delete':
            queryset.update(
                is_deleted=True,
                deleted_at=timezone.now()
            )
            updated_count = queryset.count()
        
        return Response({
            'message': f'Successfully updated {updated_count} applications',
            'updated_count': updated_count
        })
