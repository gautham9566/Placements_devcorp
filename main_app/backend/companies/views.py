from django.shortcuts import render, get_object_or_404
from django.db.models import Count, Q
from rest_framework import viewsets, permissions, status, filters, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth import get_user_model

from .models import Company, CompanyFollower
from .serializers import (
    CompanySerializer, 
    CompanyListSerializer, 
    CompanyCreateUpdateSerializer,
    CompanyStatsSerializer
)
from onelast.pagination import StandardResultsSetPagination

User = get_user_model()

class CompanyViewSet(viewsets.ModelViewSet):
    """
    A viewset for viewing and editing company instances.
    """
    queryset = Company.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'industry', 'description', 'location']
    ordering_fields = ['name', 'tier', 'total_active_jobs', 'total_applicants']
    ordering = ['name']
    parser_classes = [MultiPartParser, FormParser]
    pagination_class = StandardResultsSetPagination
    
    def get_serializer_class(self):
        if self.action == 'list':
            return CompanyListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return CompanyCreateUpdateSerializer
        return CompanySerializer
    
    def get_queryset(self):
        """
        Filter companies based on query parameters with optimized database queries.
        Only loads the data needed for the current page.
        """
        # Start with optimized base queryset
        queryset = Company.objects.select_related().prefetch_related(
            'job_postings'  # If you need job data
        )
        
        # Filter by tier
        tier = self.request.query_params.get('tier')
        if tier and tier != 'ALL':
            queryset = queryset.filter(tier=tier)
        
        # Filter by industry
        industry = self.request.query_params.get('industry')
        if industry and industry != 'ALL':
            queryset = queryset.filter(industry=industry)
        
        # Filter by campus recruiting
        campus_recruiting = self.request.query_params.get('campus_recruiting')
        if campus_recruiting:
            campus_recruiting = campus_recruiting.lower() == 'true'
            queryset = queryset.filter(campus_recruiting=campus_recruiting)
        
        # Search term
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(industry__icontains=search) | 
                Q(description__icontains=search)
            )
        
        # Sort by - optimize ordering
        sort_by = self.request.query_params.get('sort')
        if sort_by:
            if sort_by == 'name':
                queryset = queryset.order_by('name')
            elif sort_by == 'jobs':
                queryset = queryset.order_by('-total_active_jobs')
            elif sort_by == 'applicants':
                queryset = queryset.order_by('-total_applicants')
            elif sort_by == 'tier':
                queryset = queryset.order_by('tier')
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get company statistics with caching"""
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
        
        # Fallback to original calculation
        total = Company.objects.count()
        tier1 = Company.objects.filter(tier='Tier 1').count()
        tier2 = Company.objects.filter(tier='Tier 2').count()
        tier3 = Company.objects.filter(tier='Tier 3').count()
        campus_recruiting = Company.objects.filter(campus_recruiting=True).count()
        
        stats = {
            'total': total,
            'tier1': tier1,
            'tier2': tier2,
            'tier3': tier3,
            'campus_recruiting': campus_recruiting
        }
        
        return Response(stats)
    
    @action(detail=True, methods=['get'])
    def jobs(self, request, pk=None):
        """Get jobs for a specific company"""
        company = self.get_object()
        # This would need to integrate with your jobs app
        # For now, we'll return a placeholder
        return Response({
            'count': company.total_active_jobs,
            'jobs': []  # This would be populated from your jobs model
        })
    
    @action(detail=False, methods=['get'])
    def industries(self, request):
        """Get list of unique industries"""
        industries = Company.objects.values_list('industry', flat=True).distinct()
        return Response(list(industries))

class CompanyLogoUploadView(APIView):
    """Upload company logo"""
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk=None):
        company = get_object_or_404(Company, pk=pk)
        
        if 'logo' not in request.FILES:
            return Response({'error': 'No logo file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        company.logo = request.FILES['logo']
        company.save()
        
        return Response({'message': 'Logo uploaded successfully'})

class CompanyListView(APIView):
    """Simple API endpoint to list companies (compatible with existing code)"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        companies = Company.objects.all()
        serializer = CompanyListSerializer(companies, many=True)
        return Response(serializer.data)

class CompanyDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Detail view for accessing a single company via /api/v1/company/{id}"""
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'pk'

class CompanyStatsView(APIView):
    """Get statistics about companies with caching"""
    def get(self, request):
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
        
        # Fallback to original calculation
        total = Company.objects.count()
        tier1 = Company.objects.filter(tier='Tier 1').count()
        tier2 = Company.objects.filter(tier='Tier 2').count()
        tier3 = Company.objects.filter(tier='Tier 3').count()
        campus_recruiting = Company.objects.filter(campus_recruiting=True).count()
        
        stats = {
            'total': total,
            'tier1': tier1,
            'tier2': tier2,
            'tier3': tier3,
            'campus_recruiting': campus_recruiting
        }
        
        return Response(stats)

class CompanyFollowersCountView(APIView):
    """Get the number of followers for a company"""
    def get(self, request, company_id):
        company = get_object_or_404(Company, id=company_id)
        count = CompanyFollower.objects.filter(company=company).count()
        return Response({'count': count})

class CompanyFollowerStatusView(APIView):
    """Check if a user is following a company"""
    def get(self, request, company_id):
        company = get_object_or_404(Company, id=company_id)
        user_id = request.query_params.get('user_id')
        
        if not user_id:
            return Response({'error': 'user_id parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = get_object_or_404(User, id=user_id)
        is_following = CompanyFollower.objects.filter(company=company, user=user).exists()
        
        return Response({'is_following': is_following})

class CompanyFollowerView(APIView):
    """Follow or unfollow a company"""
    def post(self, request, company_id):
        company = get_object_or_404(Company, id=company_id)
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = get_object_or_404(User, id=user_id)
        
        # Check if already following
        if CompanyFollower.objects.filter(company=company, user=user).exists():
            return Response({'message': 'Already following this company'}, status=status.HTTP_200_OK)
        
        # Create follower relationship
        CompanyFollower.objects.create(company=company, user=user)
        return Response({'message': 'Successfully followed company'}, status=status.HTTP_201_CREATED)
    
    def delete(self, request, company_id):
        company = get_object_or_404(Company, id=company_id)
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = get_object_or_404(User, id=user_id)
        
        # Delete follower relationship if exists
        follower = CompanyFollower.objects.filter(company=company, user=user).first()
        if follower:
            follower.delete()
            return Response({'message': 'Successfully unfollowed company'}, status=status.HTTP_200_OK)
        
        return Response({'message': 'Not following this company'}, status=status.HTTP_200_OK)

class UserFollowedCompaniesView(APIView):
    """Get all companies a user is following"""
    def get(self, request, user_id):
        user = get_object_or_404(User, id=user_id)
        followed_companies = CompanyFollower.objects.filter(user=user).values_list('company_id', flat=True)
        companies = Company.objects.filter(id__in=followed_companies)
        serializer = CompanySerializer(companies, many=True)
        return Response(serializer.data)


class OptimizedCompanyListView(generics.ListAPIView):
    """
    Optimized company list view with server-side pagination and filtering
    Replaces the inefficient client-side pagination approach
    """
    serializer_class = CompanyListSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'industry', 'description', 'location']
    ordering_fields = ['name', 'tier', 'total_active_jobs', 'total_applicants', 'founded']
    ordering = ['name']

    def get_queryset(self):
        """
        Optimized queryset with prefetch_related for performance
        """
        queryset = Company.objects.prefetch_related(
            'job_postings', 'followers'
        ).all()

        # Apply additional filters from query parameters
        tier = self.request.query_params.get('tier', None)
        industry = self.request.query_params.get('industry', None)
        location = self.request.query_params.get('location', None)
        size = self.request.query_params.get('size', None)
        campus_recruiting = self.request.query_params.get('campus_recruiting', None)
        min_jobs = self.request.query_params.get('min_jobs', None)
        founded_after = self.request.query_params.get('founded_after', None)

        # Filter by tier
        if tier:
            queryset = queryset.filter(tier=tier)

        # Filter by industry
        if industry:
            queryset = queryset.filter(industry__icontains=industry)

        # Filter by location
        if location:
            queryset = queryset.filter(location__icontains=location)

        # Filter by size
        if size:
            queryset = queryset.filter(size__icontains=size)

        # Filter by campus recruiting
        if campus_recruiting:
            is_campus = campus_recruiting.lower() == 'true'
            queryset = queryset.filter(campus_recruiting=is_campus)

        # Filter by minimum active jobs
        if min_jobs:
            try:
                min_jobs = int(min_jobs)
                queryset = queryset.filter(total_active_jobs__gte=min_jobs)
            except ValueError:
                pass

        # Filter by founded year
        if founded_after:
            try:
                year = int(founded_after)
                queryset = queryset.filter(founded__gte=str(year))
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
            # Get unique industries
            industries = Company.objects.values_list('industry', flat=True).distinct().order_by('industry')
            industries = [industry for industry in industries if industry]  # Remove empty values

            # Get unique locations
            locations = Company.objects.values_list('location', flat=True).distinct().order_by('location')
            locations = [location for location in locations if location]  # Remove empty values

            # Get tier distribution
            tier_stats = Company.objects.values('tier').annotate(count=Count('id')).order_by('tier')

            response.data['metadata'] = {
                'available_industries': list(industries),
                'available_locations': list(locations),
                'tier_distribution': list(tier_stats),
                'total_companies': Company.objects.count(),
                'campus_recruiting_count': Company.objects.filter(campus_recruiting=True).count()
            }

        return response

class CompanySimpleListView(APIView):
    """
    Simple, reliable endpoint for listing all companies
    Used by admin panels and job creation forms
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        try:
            # Get all companies with basic fields needed for dropdowns and cards
            companies = Company.objects.all().order_by('name')
            
            # Simple data structure that works for both admin and job creation
            company_data = []
            for company in companies:
                company_data.append({
                    'id': company.id,
                    'name': company.name,
                    'companyName': company.name,  # For backward compatibility
                    'company_name': company.name,  # For job creation
                    'description': company.description,
                    'companyDescription': company.description,  # For backward compatibility
                    'industry': company.industry,
                    'location': company.location,
                    'tier': company.tier,
                    'website': company.website,
                    'logo': company.logo.url if company.logo else None,
                    'campus_recruiting': company.campus_recruiting,
                    'employeeCount': company.size,
                    'totalActiveJobs': company.total_active_jobs,
                    'totalApplicants': company.total_applicants,
                    'totalHired': company.total_hired,
                    'awaitedApproval': company.awaited_approval,
                    # For company details modal
                    'activeListingsData': []  # This would be populated if needed
                })
            
            return Response({
                'success': True,
                'data': company_data,
                'count': len(company_data)
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'data': []
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
