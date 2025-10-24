from rest_framework import generics, status, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from django.http import Http404
from django.core.exceptions import PermissionDenied
from django.db.models import Q
from .models import User, StudentProfile, Resume, SystemSettings, YearManagement, BranchManagement
from rest_framework.permissions import AllowAny, IsAuthenticated
from .serializers import UserSerializer, StudentProfileSerializer, StudentProfileListSerializer, SemesterMarksheetSerializer, ResumeSerializer, ResumeCreateSerializer
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone

# EmployerProfile removed
# EmployerProfileSerializer removed
from rest_framework.pagination import PageNumberPagination
from onelast.pagination import StandardResultsSetPagination
import pandas as pd
from rest_framework import filters, status
from django.db import models
from django.shortcuts import get_object_or_404
# EmployerCompanyDataSerializer removed
# CompaniesJSONSerializer removed

# Import StandardResultsSetPagination for pagination
from jobs.utils import StandardResultsSetPagination, get_correct_pagination_data





class StudentRegistrationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        student_id = request.data.get('student_id')
        contact_email = request.data.get('contact_email')
        branch = request.data.get('branch')
        gpa = request.data.get('gpa')

        # Check if email already exists before creating user
        if User.objects.filter(email=email).exists():
            return Response(
                {"error": "Email already registered."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = User.objects.create_user(
            email=email,
            password=password,
            user_type=User.UserType.STUDENT,
        )

        StudentProfile.objects.create(
            user=user,
            first_name=first_name,
            last_name=last_name,
            student_id=student_id,
            contact_email=contact_email,
            branch=branch,
            gpa=gpa,
        )

        return Response({"message": "Student registered successfully."}, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get("email")
        password = request.data.get("password")
        user = authenticate(email=email, password=password)
        if not user:
            return Response({"detail": "Invalid credentials."}, status=401)
        
        # Check if user is a student and if their account is frozen
        if user.user_type == User.UserType.STUDENT:
            try:
                student_profile = StudentProfile.objects.get(user=user)
                if student_profile.freeze_status == 'complete':
                    return Response({
                        "detail": "Your account has been completely frozen. Please contact the administrator for assistance.",
                        "freeze_status": "complete",
                        "freeze_reason": student_profile.freeze_reason
                    }, status=403)
                elif student_profile.freeze_status == 'partial':
                    # For partial freeze, allow login but include freeze info
                    refresh = RefreshToken.for_user(user)
                    return Response({
                        "refresh": str(refresh),
                        "access": str(refresh.access_token),
                        "user": UserSerializer(user).data,
                        "freeze_status": "partial",
                        "freeze_reason": student_profile.freeze_reason,
                        "freeze_restrictions": {
                            "min_salary_requirement": student_profile.min_salary_requirement,
                            "allowed_job_tiers": student_profile.allowed_job_tiers,
                            "allowed_job_types": student_profile.allowed_job_types,
                            "allowed_companies": student_profile.allowed_companies
                        }
                    })
            except StudentProfile.DoesNotExist:
                # If no student profile exists, allow login (this shouldn't happen normally)
                pass
        
        # Normal login flow for non-frozen users
        refresh = RefreshToken.for_user(user)
        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": UserSerializer(user).data
        })




class UserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        user = request.user
        if user.user_type == User.UserType.STUDENT:
            profile = get_object_or_404(StudentProfile, user=user)
            serializer = StudentProfileSerializer(profile, context={'request': request})
        else:
            serializer = UserSerializer(user)
        return Response(serializer.data)

    def patch(self, request):
        user = request.user
        if user.user_type != User.UserType.STUDENT:
            return Response({"detail": "Only students can upload resumes."}, status=403)

        profile = get_object_or_404(StudentProfile, user=user)

        resume_file = request.FILES.get('resume')
        if not resume_file:
            return Response({"detail": "No resume file provided."}, status=400)

        profile.resume = resume_file
        profile.save()
        return Response({"message": "Resume uploaded successfully."})


# EmployerProfileView removed - no longer needed

class BulkStudentUpdateView(APIView):
    permission_classes = [permissions.IsAdminUser]  # Only admin can access this

    def post(self, request):
        excel_file = request.FILES.get('file')
        if not excel_file:
            return Response({"error": "No file uploaded."}, status=400)

        try:
            df = pd.read_excel(excel_file)

            if "student_id" not in df.columns:
                return Response({"error": "Missing required column: student_id"}, status=400)

            updated = 0
            not_found = []
            duplicates = []

            for _, row in df.iterrows():
                sid = str(row["student_id"]).strip()
                matches = StudentProfile.objects.filter(student_id=sid)

                if matches.count() == 1:
                    student = matches.first()
                    for field in row.index:
                        if field != "student_id" and hasattr(student, field):
                            setattr(student, field, row[field])
                    student.save()
                    updated += 1
                elif matches.count() > 1:
                    duplicates.append(sid)
                else:
                    not_found.append(sid)

            return Response({
                "updated": updated,
                "not_found": not_found,
                "duplicates": duplicates,
            })

        except Exception as e:
            return Response({"error": str(e)}, status=500)





class StudentListView(generics.ListAPIView):
    queryset = StudentProfile.objects.select_related('user').order_by('student_id').all()
    serializer_class = StudentProfileListSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        search_by = self.request.query_params.get('search_by')  # 'name' or 'student_id'
        query = self.request.query_params.get('query')

        if search_by == 'name' and query:
            queryset = queryset.filter(first_name__icontains=query) | queryset.filter(last_name__icontains=query)
        elif search_by == 'student_id' and query:
            queryset = queryset.filter(student_id__icontains=query)

        # Ensure ordering is maintained after filtering
        return queryset.order_by('student_id')

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



class StudentDetailView(generics.RetrieveAPIView):
    queryset = StudentProfile.objects.select_related('user').all()
    serializer_class = StudentProfileSerializer
    permission_classes = [permissions.IsAdminUser]
    lookup_field = 'id'

class StudentUpdateView(generics.UpdateAPIView):
    queryset = StudentProfile.objects.select_related('user').all()
    serializer_class = StudentProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_object(self):
        """Allow users to update their own profile or admins to update any profile"""
        user = self.request.user
        profile_id = self.kwargs.get('id')

        if user.user_type == 'ADMIN' or user.is_staff:
            # Admins can update any profile
            return get_object_or_404(StudentProfile, id=profile_id)
        else:
            # Regular users can only update their own profile
            if hasattr(user, 'student_profile') and str(user.student_profile.id) == str(profile_id):
                return user.student_profile
            else:
                raise PermissionDenied("You can only update your own profile")

    def patch(self, request, *args, **kwargs):
        """Handle PATCH requests with debugging"""
        import logging
        logger = logging.getLogger(__name__)

        logger.info(f"StudentUpdateView PATCH request data: {request.data}")

        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)

        if not serializer.is_valid():
            logger.error(f"StudentUpdateView validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()
        return Response(serializer.data)


# EmployerCompanyListView removed - use Company model directly

from jobs.utils import StandardResultsSetPagination

# CompanyListCreateView removed - replaced with Company model direct access


# CompanyDetailUpdateDeleteView removed - use Company model directly


# EmployerRegistrationView removed - no longer needed


from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token

# Add this class if you need logout functionality
class LogoutView(APIView):
    """
    View for user logout - invalidates the token
    """
    def post(self, request):
        # Get the user's token and delete it
        try:
            token = Token.objects.get(user=request.user)
            token.delete()
            return Response({"message": "Successfully logged out."}, status=status.HTTP_200_OK)
        except Token.DoesNotExist:
            return Response({"message": "User not logged in."}, status=status.HTTP_400_BAD_REQUEST)

from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import StudentProfile
from .serializers import StudentProfileSerializer, SemesterMarksheetSerializer

class StudentProfileViewSet(viewsets.ModelViewSet):
    serializer_class = StudentProfileSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    lookup_value_regex = '[^/]+'  # Allow 'me' and numeric IDs

    def get_queryset(self):
        # If admin, can see all profiles. Otherwise, only own profile
        user = self.request.user
        if user.user_type == 'ADMIN' or user.is_staff:
            # Optimize with select_related for admin users seeing all profiles
            return StudentProfile.objects.select_related('user').all()
        return StudentProfile.objects.select_related('user').filter(user=user)

    def get_object(self):
        # Get profile of logged in user or specified user if admin
        import logging
        logger = logging.getLogger(__name__)

        user = self.request.user
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        pk = self.kwargs.get(lookup_url_kwarg)

        logger.info(f"get_object called with pk={pk}, user={user}, user_type={getattr(user, 'user_type', None)}, is_staff={user.is_staff}")

        # Handle 'me' as a special case to get the current user's profile
        if pk == 'me':
            if hasattr(user, 'student_profile'):
                return user.student_profile
            else:
                raise Http404("You don't have a student profile")

        # Handle normal pk lookup
        elif pk:
            if user.user_type == 'ADMIN' or user.is_staff:
                logger.info(f"Admin user accessing profile {pk}")
                return get_object_or_404(StudentProfile, pk=pk)
            # Non-admins can only view their own profile
            if hasattr(user, 'student_profile') and str(user.student_profile.id) != pk:
                logger.warning(f"Non-admin user {user} trying to access profile {pk}, but owns profile {user.student_profile.id}")
                raise PermissionDenied("You cannot access this profile")
            return user.student_profile

        # If no pk specified, return current user's profile
        else:
            if hasattr(user, 'student_profile'):
                return user.student_profile
            else:
                raise Http404("You don't have a student profile")

    def update(self, request, *args, **kwargs):
        """Handle PUT requests"""
        import logging
        logger = logging.getLogger(__name__)

        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        # Debug logging
        logger.info(f"Update request data: {request.data}")
        logger.info(f"Partial update: {partial}")

        serializer = self.get_serializer(instance, data=request.data, partial=partial)

        if not serializer.is_valid():
            logger.error(f"Serializer validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        self.perform_update(serializer)
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        """Handle PATCH requests"""
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def upload_profile_image(self, request, pk=None):
        profile = self.get_object()
        if 'image' not in request.FILES:
            return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)
            
        profile.profile_image = request.FILES['image']
        profile.save()
        
        return Response({'message': 'Profile image uploaded successfully'})
    
    @action(detail=False, methods=['post'], url_path='me/upload_resume')
    def upload_resume(self, request):
        user = self.request.user
        if not user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            profile = StudentProfile.objects.get(user=user)
        except StudentProfile.DoesNotExist:
            return Response({'error': 'Student profile not found'}, status=status.HTTP_404_NOT_FOUND)

        if 'resume' not in request.FILES:
            return Response({'error': 'No resume provided'}, status=status.HTTP_400_BAD_REQUEST)

        profile.resume = request.FILES['resume']
        profile.save()

        return Response({'message': 'Resume uploaded successfully'})

    @action(detail=True, methods=['post'], url_path='upload_resume')
    def admin_upload_resume(self, request, pk=None):
        """Admin endpoint to upload resume for a specific student"""
        if not request.user.is_staff:
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        try:
            profile = self.get_object()
        except StudentProfile.DoesNotExist:
            return Response({'error': 'Student profile not found'}, status=status.HTTP_404_NOT_FOUND)

        if 'file' not in request.FILES:
            return Response({'error': 'No resume file provided'}, status=status.HTTP_400_BAD_REQUEST)

        file = request.FILES['file']
        name = request.data.get('name', file.name)
        is_primary = request.data.get('is_primary', 'false').lower() == 'true'

        # Create resume using the Resume model
        resume = Resume.objects.create(
            student=profile,
            name=name,
            file=file,
            is_primary=is_primary,
            file_size=file.size
        )

        return Response({
            'message': 'Resume uploaded successfully',
            'resume': {
                'id': resume.id,
                'name': resume.name,
                'file_url': resume.file.url if resume.file else None,
                'is_primary': resume.is_primary,
                'uploaded_at': resume.uploaded_at
            }
        })

    @action(detail=True, methods=['get'], url_path='resumes')
    def admin_get_resumes(self, request, pk=None):
        """Admin endpoint to get resumes for a specific student"""
        if not request.user.is_staff:
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        try:
            profile = self.get_object()
        except StudentProfile.DoesNotExist:
            return Response({'error': 'Student profile not found'}, status=status.HTTP_404_NOT_FOUND)

        # Get all resumes for this student
        resumes = Resume.objects.filter(student=profile).order_by('-is_primary', '-uploaded_at')
        serializer = ResumeSerializer(resumes, many=True)

        return Response(serializer.data)

    @action(detail=True, methods=['delete'], url_path='resumes/(?P<resume_id>[^/.]+)')
    def admin_delete_resume(self, request, pk=None, resume_id=None):
        """Admin endpoint to delete a specific resume for a student"""
        if not request.user.is_staff:
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        try:
            profile = self.get_object()
        except StudentProfile.DoesNotExist:
            return Response({'error': 'Student profile not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            resume = Resume.objects.get(id=resume_id, student=profile)
        except Resume.DoesNotExist:
            return Response({'error': 'Resume not found'}, status=status.HTTP_404_NOT_FOUND)

        # If deleting the primary resume, make another resume primary if available
        if resume.is_primary:
            other_resumes = Resume.objects.filter(
                student=profile
            ).exclude(id=resume.id).first()

            if other_resumes:
                other_resumes.is_primary = True
                other_resumes.save()

        resume.delete()
        return Response({'message': 'Resume deleted successfully'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='upload_certificate')
    def admin_upload_certificate(self, request, pk=None):
        """Admin endpoint to upload certificate for a specific student"""
        if not request.user.is_staff:
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        try:
            profile = self.get_object()
        except StudentProfile.DoesNotExist:
            return Response({'error': 'Student profile not found'}, status=status.HTTP_404_NOT_FOUND)

        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        file = request.FILES['file']
        cert_type = request.data.get('type', '').lower()

        if cert_type not in ['10th', '12th']:
            return Response({'error': 'Invalid certificate type. Must be 10th or 12th'}, status=status.HTTP_400_BAD_REQUEST)

        # Save the certificate
        if cert_type == '10th':
            profile.tenth_certificate = file
        else:
            profile.twelfth_certificate = file

        profile.save()

        return Response({
            'message': f'{cert_type} certificate uploaded successfully',
            'file_url': profile.tenth_certificate.url if cert_type == '10th' else profile.twelfth_certificate.url
        })

    @action(detail=True, methods=['post'], url_path='upload_semester_marksheet')
    def admin_upload_semester_marksheet(self, request, pk=None):
        """Admin endpoint to upload semester marksheet for a specific student"""
        if not request.user.is_staff:
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        try:
            profile = self.get_object()
        except StudentProfile.DoesNotExist:
            return Response({'error': 'Student profile not found'}, status=status.HTTP_404_NOT_FOUND)

        if 'marksheet_file' not in request.FILES:
            return Response({'error': 'No marksheet file provided'}, status=status.HTTP_400_BAD_REQUEST)

        file = request.FILES['marksheet_file']
        semester = request.data.get('semester')
        cgpa = request.data.get('cgpa')

        if not semester or not cgpa:
            return Response({'error': 'Semester and CGPA are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            semester_num = int(semester)
            if not (1 <= semester_num <= 8):
                return Response({'error': 'Semester must be between 1 and 8'}, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({'error': 'Invalid semester format'}, status=status.HTTP_400_BAD_REQUEST)

        # Set semester CGPA and marksheet file directly on the profile
        setattr(profile, f'semester{semester_num}_cgpa', str(cgpa))
        setattr(profile, f'semester{semester_num}_marksheet', file)
        setattr(profile, f'semester{semester_num}_upload_date', timezone.now())

        profile.save()

        # Get the file URL for response
        marksheet_field = getattr(profile, f'semester{semester_num}_marksheet')
        file_url = marksheet_field.url if marksheet_field else None

        return Response({
            'message': f'Semester {semester_num} marksheet uploaded successfully',
            'semester': semester_num,
            'cgpa': cgpa,
            'file_url': file_url
        })
    
    @action(detail=False, methods=['post'], url_path='me/upload_certificate')
    def upload_certificate(self, request):
        user = self.request.user
        if not user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            # First, check if user has a profile directly
            try:
                profile = StudentProfile.objects.get(user=user)
            except StudentProfile.DoesNotExist:
                # Create a new profile if one doesn't exist
                college = getattr(user, 'college', None)
                if not college:
                    return Response({
                        'error': 'User college information is missing. Please contact administrator.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Ensure user is properly assigned with explicit check
                if not user or not user.id:
                    return Response({
                        'error': 'User authentication issue. Please log in again.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                profile = StudentProfile.objects.create(
                    user=user,
                    college=college,
                    first_name=user.first_name or '..',
                    last_name=user.last_name or '..',
                    contact_email=user.email
                )

            # Now we have a valid profile, proceed with certificate upload
            cert_type = request.data.get('type')
            
            if 'file' not in request.FILES:
                return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
                
            if cert_type in ['10th', 'tenth']:
                profile.tenth_certificate = request.FILES['file']
            elif cert_type in ['12th', 'twelfth']:
                profile.twelfth_certificate = request.FILES['file']
            else:
                return Response({'error': 'Invalid certificate type'}, status=status.HTTP_400_BAD_REQUEST)
            
            profile.save()
            return Response({'message': f'{cert_type} certificate uploaded successfully'})
            
        except Exception as e:
            import traceback
            print(f"Error uploading certificate: {e}")
            print(traceback.format_exc())
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def upload_semester_marksheet(self, request, pk=None):
        profile = self.get_object()
        semester = request.data.get('semester')
        cgpa = request.data.get('cgpa')
        
        if not semester or not semester.isdigit() or not (1 <= int(semester) <= 8):
            return Response({'error': 'Valid semester number (1-8) is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not cgpa:
            return Response({'error': 'CGPA is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        if 'marksheet_file' not in request.FILES:
            return Response({'error': 'No marksheet file provided'}, status=status.HTTP_400_BAD_REQUEST)
            
        semester_num = int(semester)
        
        # Set semester CGPA
        setattr(profile, f'semester{semester_num}_cgpa', cgpa)
        
        # Set semester marksheet file
        setattr(profile, f'semester{semester_num}_marksheet', request.FILES['marksheet_file'])
        
        # Set upload date
        setattr(profile, f'semester{semester_num}_upload_date', timezone.now())
        
        profile.save()
        
        return Response({
            'message': f'Semester {semester} marksheet uploaded successfully',
            'semester': semester_num,
            'cgpa': cgpa
        })

    @action(detail=False, methods=['delete'], url_path='me/delete_certificate/(?P<cert_type>[^/.]+)')
    def delete_my_certificate(self, request, cert_type=None):
        """Delete user's own certificate (10th or 12th)"""
        user = request.user
        if not user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            profile = StudentProfile.objects.get(user=user)
        except StudentProfile.DoesNotExist:
            return Response({'error': 'Student profile not found'}, status=status.HTTP_404_NOT_FOUND)

        if cert_type not in ['10th', '12th']:
            return Response({'error': 'Invalid certificate type. Must be 10th or 12th'}, status=status.HTTP_400_BAD_REQUEST)

        # Get the certificate field
        cert_field = 'tenth_certificate' if cert_type == '10th' else 'twelfth_certificate'
        certificate = getattr(profile, cert_field)

        if certificate:
            try:
                # Delete the file from storage
                certificate.delete(save=False)
            except Exception as e:
                print(f"Error deleting certificate file: {e}")

            # Clear the field
            setattr(profile, cert_field, None)
            profile.save()

        return Response({
            'message': f'{cert_type} certificate deleted successfully'
        })

    @action(detail=False, methods=['delete'], url_path='me/delete_marksheet/(?P<semester>[^/.]+)')
    def delete_my_marksheet(self, request, semester=None):
        """Delete user's own semester marksheet"""
        user = request.user
        if not user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            profile = StudentProfile.objects.get(user=user)
        except StudentProfile.DoesNotExist:
            return Response({'error': 'Student profile not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            semester_num = int(semester)
            if not (1 <= semester_num <= 8):
                raise ValueError()
        except ValueError:
            return Response({'error': 'Invalid semester. Must be between 1 and 8'}, status=status.HTTP_400_BAD_REQUEST)

        # Get the marksheet field
        marksheet_field = f'semester{semester_num}_marksheet'
        marksheet = getattr(profile, marksheet_field)

        if marksheet:
            try:
                # Delete the file from storage
                marksheet.delete(save=False)
            except Exception as e:
                print(f"Error deleting marksheet file: {e}")

            # Clear the fields
            setattr(profile, marksheet_field, None)
            setattr(profile, f'semester{semester_num}_cgpa', None)
            setattr(profile, f'semester{semester_num}_upload_date', None)
            profile.save()

        return Response({
            'message': f'Semester {semester_num} marksheet deleted successfully'
        })
    
    @action(detail=True, methods=['get'])
    def semester_marksheets(self, request, pk=None):
        profile = self.get_object()
        semesters_data = profile.get_all_semesters_data()
        serializer = SemesterMarksheetSerializer(semesters_data, many=True, context={'request': request})
        return Response(serializer.data)

    
    @action(detail=True, methods=['get'])
    def semester_marksheets(self, request, pk=None):
        profile = self.get_object()
        semesters_data = profile.get_all_semesters_data()
        serializer = SemesterMarksheetSerializer(semesters_data, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['delete'], url_path='delete_certificate/(?P<cert_type>[^/.]+)')
    def delete_certificate(self, request, pk=None, cert_type=None):
        """Delete a certificate (10th or 12th)"""
        try:
            profile = self.get_object()
        except StudentProfile.DoesNotExist:
            return Response({'error': 'Student profile not found'}, status=status.HTTP_404_NOT_FOUND)

        if cert_type not in ['10th', '12th']:
            return Response({'error': 'Invalid certificate type. Must be 10th or 12th'}, status=status.HTTP_400_BAD_REQUEST)

        # Get the certificate field
        cert_field = 'tenth_certificate' if cert_type == '10th' else 'twelfth_certificate'
        certificate = getattr(profile, cert_field)

        if certificate:
            try:
                # Delete the file from storage
                certificate.delete(save=False)
            except Exception as e:
                print(f"Error deleting certificate file: {e}")

            # Clear the field
            setattr(profile, cert_field, None)
            profile.save()

        return Response({
            'message': f'{cert_type} certificate deleted successfully'
        })

    @action(detail=True, methods=['delete'], url_path='delete_marksheet/(?P<semester>[^/.]+)')
    def delete_marksheet(self, request, pk=None, semester=None):
        """Delete a semester marksheet"""
        try:
            profile = self.get_object()
        except StudentProfile.DoesNotExist:
            return Response({'error': 'Student profile not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            semester_num = int(semester)
            if not (1 <= semester_num <= 8):
                raise ValueError()
        except ValueError:
            return Response({'error': 'Invalid semester. Must be between 1 and 8'}, status=status.HTTP_400_BAD_REQUEST)

        # Get the marksheet field
        marksheet_field = f'semester{semester_num}_marksheet'
        marksheet = getattr(profile, marksheet_field)

        if marksheet:
            try:
                # Delete the file from storage
                marksheet.delete(save=False)
            except Exception as e:
                print(f"Error deleting marksheet file: {e}")

            # Clear the fields
            setattr(profile, marksheet_field, None)
            setattr(profile, f'semester{semester_num}_cgpa', None)
            setattr(profile, f'semester{semester_num}_upload_date', None)
            profile.save()

        return Response({
            'message': f'Semester {semester_num} marksheet deleted successfully'
        })


class OptimizedStudentListView(generics.ListAPIView):
    """
    Optimized student list view with server-side pagination and filtering
    Replaces the inefficient client-side pagination approach
    """
    serializer_class = StudentProfileListSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['first_name', 'last_name', 'student_id', 'contact_email', 'user__email']
    ordering_fields = ['first_name', 'last_name', 'student_id', 'gpa', 'passout_year', 'joining_year']
    ordering = ['student_id']

    def get_queryset(self):
        """
        Optimized queryset with select_related and prefetch_related for performance
        """
        queryset = StudentProfile.objects.select_related(
            'user'
        ).prefetch_related(
            'user__job_applications'
        ).all()

        # Apply additional filters from query parameters
        department = self.request.query_params.get('department', None)
        branch = self.request.query_params.get('branch', None)
        passout_year = self.request.query_params.get('passout_year', None)
        joining_year = self.request.query_params.get('joining_year', None)
        year_range = self.request.query_params.get('year_range', None)
        cgpa_min = self.request.query_params.get('cgpa_min', None)
        cgpa_max = self.request.query_params.get('cgpa_max', None)

        # Filter by department/branch
        if department:
            queryset = queryset.filter(branch__icontains=department)
        elif branch:
            queryset = queryset.filter(branch__icontains=branch)

        # Filter by passout year
        if passout_year:
            try:
                year = int(passout_year)
                queryset = queryset.filter(passout_year=year)
            except ValueError:
                pass

        # Filter by joining year
        if joining_year:
            try:
                year = int(joining_year)
                queryset = queryset.filter(joining_year=year)
            except ValueError:
                pass

        # Filter by year range
        if year_range and '-' in year_range:
            try:
                start_year, end_year = year_range.split('-')
                start_year = int(start_year.strip())
                end_year = int(end_year.strip())
                queryset = queryset.filter(
                    joining_year__gte=start_year,
                    passout_year__lte=end_year
                )
            except (ValueError, AttributeError):
                pass

        # Filter by CGPA range
        if cgpa_min:
            try:
                cgpa_min = float(cgpa_min)
                queryset = queryset.filter(gpa__gte=cgpa_min)
            except ValueError:
                pass

        if cgpa_max:
            try:
                cgpa_max = float(cgpa_max)
                queryset = queryset.filter(gpa__lte=cgpa_max)
            except ValueError:
                pass

        return queryset

    def list(self, request, *args, **kwargs):
        """
        Override list method to add additional metadata
        """
        response = super().list(request, *args, **kwargs)

        # Add metadata about available filters
        if response.status_code == 200:
            # Get unique departments/branches
            departments = StudentProfile.objects.values_list('branch', flat=True).distinct().order_by('branch')
            departments = [dept for dept in departments if dept]  # Remove empty values

            # Get available years
            years = YearManagement.get_active_years()

            response.data['metadata'] = {
                'available_departments': list(departments),
                'available_years': list(years),
                'total_students': StudentProfile.objects.count()
            }

        return response

class ChangePasswordView(APIView):
    """
    Change user password
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not user.check_password(old_password):
            return Response({"detail": "Old password is incorrect."}, status=400)

        user.set_password(new_password)
        user.save()
        return Response({"message": "Password changed successfully."})


class StudentFreezeView(APIView):
    """
    Handle student account freeze operations
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, id):
        """Freeze a student account"""
        try:
            student = StudentProfile.objects.get(id=id)
        except StudentProfile.DoesNotExist:
            return Response({"detail": "Student not found."}, status=404)

        freeze_type = request.data.get('freeze_type')  # 'complete' or 'partial'
        reason = request.data.get('reason', '')
        
        if freeze_type not in ['complete', 'partial']:
            return Response({"detail": "Invalid freeze type. Must be 'complete' or 'partial'."}, status=400)

        # Set freeze status
        student.freeze_status = freeze_type
        student.freeze_reason = reason
        student.freeze_date = timezone.now()
        student.frozen_by = request.user

        # Handle partial freeze restrictions
        if freeze_type == 'partial':
            student.min_salary_requirement = request.data.get('min_salary_requirement')
            student.allowed_job_tiers = request.data.get('allowed_job_tiers', [])
            student.allowed_job_types = request.data.get('allowed_job_types', [])
            student.allowed_companies = request.data.get('allowed_companies', [])

        student.save()

        return Response({
            "message": f"Student account {freeze_type}ly frozen successfully.",
            "freeze_status": student.freeze_status,
            "freeze_date": student.freeze_date
        })

    def delete(self, request, id):
        """Unfreeze a student account"""
        try:
            student = StudentProfile.objects.get(id=id)
        except StudentProfile.DoesNotExist:
            return Response({"detail": "Student not found."}, status=404)

        # Reset all freeze fields
        student.freeze_status = 'none'
        student.freeze_reason = None
        student.freeze_date = None
        student.frozen_by = None
        student.min_salary_requirement = None
        student.allowed_job_tiers = []
        student.allowed_job_types = []
        student.allowed_companies = []

        student.save()

        return Response({"message": "Student account unfrozen successfully."})

    def get(self, request, id):
        """Get freeze status of a student"""
        try:
            student = StudentProfile.objects.get(id=id)
        except StudentProfile.DoesNotExist:
            return Response({"detail": "Student not found."}, status=404)

        return Response({
            "freeze_status": student.freeze_status,
            "freeze_reason": student.freeze_reason,
            "freeze_date": student.freeze_date,
            "frozen_by": student.frozen_by.email if student.frozen_by else None,
            "min_salary_requirement": student.min_salary_requirement,
            "allowed_job_tiers": student.allowed_job_tiers,
            "allowed_job_types": student.allowed_job_types,
            "allowed_companies": student.allowed_companies
        })


class ResumeListCreateView(generics.ListCreateAPIView):
    """
    List all resumes for the authenticated student or create a new resume
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ResumeCreateSerializer
        return ResumeSerializer

    def get_queryset(self):
        try:
            if hasattr(self.request.user, 'student_profile'):
                student_profile = self.request.user.student_profile
                return Resume.objects.filter(student=student_profile)
            else:
                return Resume.objects.none()
        except Exception as e:
            return Resume.objects.none()

    def perform_create(self, serializer):
        if not hasattr(self.request.user, 'student_profile'):
            raise PermissionDenied("Only students can upload resumes")

        # If no name provided, use the filename
        if not serializer.validated_data.get('name') and 'file' in self.request.FILES:
            file = self.request.FILES['file']
            serializer.validated_data['name'] = file.name

        serializer.save(student=self.request.user.student_profile)

    def get(self, request, *args, **kwargs):
        """Override get to ensure proper response format"""
        try:
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response([])


class ResumeDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a specific resume
    """
    serializer_class = ResumeSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        if hasattr(self.request.user, 'student_profile'):
            return Resume.objects.filter(student=self.request.user.student_profile)
        return Resume.objects.none()

    def perform_destroy(self, instance):
        # If deleting the primary resume, make another resume primary if available
        if instance.is_primary:
            other_resumes = Resume.objects.filter(
                student=instance.student
            ).exclude(id=instance.id).first()

            if other_resumes:
                other_resumes.is_primary = True
                other_resumes.save()

        instance.delete()
    
    def patch(self, request, *args, **kwargs):
        """Handle PATCH requests - allow setting as primary"""
        instance = self.get_object()
        
        # Check if setting as primary
        if 'is_primary' in request.data and request.data['is_primary']:
            # The save method in Resume model will automatically unset other primaries
            instance.is_primary = True
            instance.save()
            
            serializer = self.get_serializer(instance)
            return Response({
                'message': 'Resume set as primary successfully',
                'resume': serializer.data
            })
        
        # Otherwise, handle as normal update
        return super().patch(request, *args, **kwargs)


# Admin API Views
class SystemSettingsView(APIView):
    """
    Admin view for managing system settings
    """
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        """Get current system settings"""
        settings = SystemSettings.get_settings()
        return Response({
            'maintenance_mode': settings.maintenance_mode,
            'allow_new_registrations': settings.allow_new_registrations,
            'default_user_role': settings.default_user_role
        })
    
    def post(self, request):
        """Update system settings"""
        settings = SystemSettings.get_settings()
        
        # Update fields if provided
        if 'maintenance_mode' in request.data:
            settings.maintenance_mode = request.data['maintenance_mode']
        if 'allow_new_registrations' in request.data:
            settings.allow_new_registrations = request.data['allow_new_registrations']
        if 'default_user_role' in request.data:
            settings.default_user_role = request.data['default_user_role']
        
        settings.save()
        
        return Response({
            'message': 'System settings updated successfully',
            'settings': {
                'maintenance_mode': settings.maintenance_mode,
                'allow_new_registrations': settings.allow_new_registrations,
                'default_user_role': settings.default_user_role
            }
        })


class YearManagementView(APIView):
    """
    Admin view for managing active/inactive years
    """
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        """Get all years with their active status"""
        # Ensure all existing years are managed
        YearManagement.ensure_years_exist()
        
        years = YearManagement.get_all_years_with_status()
        return Response({
            'years': years
        })
    
    def post(self, request):
        """Update year active status"""
        year_data = request.data.get('years', [])
        
        updated_years = []
        for year_info in year_data:
            year = year_info.get('year')
            is_active = year_info.get('is_active', True)
            
            if year is not None:
                year_obj, created = YearManagement.objects.get_or_create(
                    year=year,
                    defaults={'is_active': is_active}
                )
                if not created:
                    year_obj.is_active = is_active
                    year_obj.save()
                
                updated_years.append({
                    'year': year_obj.year,
                    'is_active': year_obj.is_active
                })
        
        return Response({
            'message': 'Year settings updated successfully',
            'years': updated_years
        })


class ActiveYearsView(APIView):
    """
    Public API endpoint to get list of active years
    Use this for dropdowns and filtering instead of querying cached student_stats
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get list of active years only"""
        active_years = YearManagement.get_active_years()
        return Response({
            'active_years': sorted(active_years, reverse=True),  # Most recent first
            'count': len(active_years)
        })


class BranchManagementView(APIView):
    """
    Admin view for managing active/inactive branches
    """
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        """Get all branches with their active status"""
        # Ensure all existing branches are managed
        BranchManagement.ensure_branches_exist()
        
        branches = BranchManagement.get_all_branches_with_status()
        return Response({
            'branches': branches
        })
    
    def post(self, request):
        """Update branch active status"""
        branch_data = request.data.get('branches', [])
        
        updated_branches = []
        for branch_info in branch_data:
            branch = branch_info.get('branch')
            is_active = branch_info.get('is_active', True)
            
            if branch is not None:
                branch_obj, created = BranchManagement.objects.get_or_create(
                    branch=branch,
                    defaults={'is_active': is_active}
                )
                if not created:
                    branch_obj.is_active = is_active
                    branch_obj.save()
                
                updated_branches.append({
                    'branch': branch_obj.branch,
                    'is_active': branch_obj.is_active
                })
        
        return Response({
            'message': 'Branch settings updated successfully',
            'branches': updated_branches
        })


class ActiveBranchesView(APIView):
    """
    Public API endpoint to get list of active branches
    Use this for dropdowns and filtering
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get list of active branches only"""
        active_branches = BranchManagement.get_active_branches()
        return Response({
            'active_branches': sorted(active_branches),
            'count': len(active_branches)
        })

