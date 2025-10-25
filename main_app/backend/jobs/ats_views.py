"""
Views for ATS (Applicant Tracking System)
"""
from rest_framework import viewsets, generics, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from django.db.models import Count, Q
from datetime import timedelta

from .ats_models import (
    PipelineStage,
    RecruitmentPipeline,
    CandidateCard,
    StageMovementHistory,
    CandidateComment,
    ShareableLink
)
from .ats_serializers import (
    PipelineStageSerializer,
    RecruitmentPipelineSerializer,
    CandidateCardSerializer,
    StageMovementHistorySerializer,
    CandidateCommentSerializer,
    ShareableLinkSerializer,
    KanbanBoardSerializer,
    MoveCandidateSerializer,
    BulkMoveCandidatesSerializer
)
from .models import JobApplication, JobPosting
from .utils import StandardResultsSetPagination


class PipelineStageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing pipeline stages
    """
    queryset = PipelineStage.objects.all()
    serializer_class = PipelineStageSerializer
    permission_classes = [permissions.IsAdminUser]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        organization = self.request.query_params.get('organization')
        if organization:
            queryset = queryset.filter(organization_name=organization)
        return queryset.filter(is_active=True)


class RecruitmentPipelineViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing recruitment pipelines
    """
    queryset = RecruitmentPipeline.objects.all()
    serializer_class = RecruitmentPipelineSerializer
    permission_classes = [permissions.IsAdminUser]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        job_id = self.request.query_params.get('job_id')
        if job_id:
            queryset = queryset.filter(job_id=job_id)
        return queryset.filter(is_active=True)
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['get'])
    def kanban_board(self, request, pk=None):
        """
        Get complete Kanban board data for a pipeline
        """
        pipeline = self.get_object()
        
        # Apply filters
        filters = {}
        search = request.query_params.get('search')
        job_filter = request.query_params.get('job')
        tag_filter = request.query_params.get('tag')
        
        board_data = {
            'pipeline': pipeline,
            'filters': filters
        }
        
        serializer = KanbanBoardSerializer(board_data, context={'request': request})
        return Response(serializer.data)


class CandidateCardViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing candidate cards
    """
    queryset = CandidateCard.objects.all()
    serializer_class = CandidateCardSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by pipeline
        pipeline_id = self.request.query_params.get('pipeline_id')
        if pipeline_id:
            queryset = queryset.filter(pipeline_id=pipeline_id)
        
        # Filter by stage
        stage_id = self.request.query_params.get('stage_id')
        if stage_id:
            queryset = queryset.filter(current_stage_id=stage_id)
        
        # Search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(application__applicant__student_profile__first_name__icontains=search) |
                Q(application__applicant__student_profile__last_name__icontains=search) |
                Q(application__applicant__email__icontains=search) |
                Q(application__job__title__icontains=search)
            )
        
        return queryset.select_related(
            'application',
            'application__job',
            'application__job__company',
            'application__applicant__student_profile',
            'current_stage',
            'pipeline',
            'recruiter'
        ).prefetch_related('interviewers')
    
    @action(detail=True, methods=['post'])
    def move_stage(self, request, pk=None):
        """
        Move a candidate to a different stage
        """
        card = self.get_object()
        serializer = MoveCandidateSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        to_stage_id = serializer.validated_data['to_stage_id']
        notes = serializer.validated_data.get('notes', '')
        
        try:
            to_stage = PipelineStage.objects.get(id=to_stage_id)
        except PipelineStage.DoesNotExist:
            return Response(
                {'error': 'Target stage not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Calculate duration in previous stage
        duration = timezone.now() - card.moved_to_current_stage_at
        
        # Create movement history
        StageMovementHistory.objects.create(
            candidate_card=card,
            from_stage=card.current_stage,
            to_stage=to_stage,
            moved_by=request.user,
            duration_in_previous_stage=duration,
            notes=notes
        )
        
        # Update card
        old_stage = card.current_stage
        card.current_stage = to_stage
        card.moved_to_current_stage_at = timezone.now()
        card.save()
        
        # Update application status based on new stage
        self._update_application_status(card, to_stage, request.user)
        
        return Response({
            'message': 'Candidate moved successfully',
            'from_stage': old_stage.name,
            'to_stage': to_stage.name,
            'duration_in_previous_stage': str(duration)
        })
    
    def _update_application_status(self, card, to_stage, user):
        """
        Update the JobApplication status based on the ATS stage
        """
        from .models import JobApplication
        
        # Map ATS stage types to application statuses
        stage_to_status_mapping = {
            'NEW': 'UNDER_REVIEW',
            'SCREENING': 'UNDER_REVIEW',
            'FIRST_INTERVIEW': 'SHORTLISTED',
            'SECOND_INTERVIEW': 'SHORTLISTED',
            'TECHNICAL': 'SHORTLISTED',
            'HR_ROUND': 'SHORTLISTED',
            'CONTRACT_PROPOSAL': 'SHORTLISTED',
            'OFFER_MADE': 'SHORTLISTED',
            'CONTRACT_SIGNED': 'HIRED',
            'REJECTED': 'REJECTED',
            'WITHDRAWN': 'REJECTED',
        }
        
        new_status = stage_to_status_mapping.get(to_stage.stage_type)
        if new_status and card.application.status != new_status:
            # Update application status
            card.application.add_status_change(
                new_status=new_status,
                changed_by=user,
                notes=f"Moved to {to_stage.name} in recruitment pipeline"
            )
            card.application.save()
    
    @action(detail=True, methods=['post'])
    def add_comment(self, request, pk=None):
        """
        Add a comment to a candidate card
        """
        card = self.get_object()
        content = request.data.get('content')
        is_internal = request.data.get('is_internal', True)
        
        if not content:
            return Response(
                {'error': 'Comment content is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        comment = CandidateComment.objects.create(
            candidate_card=card,
            author=request.user,
            content=content,
            is_internal=is_internal
        )
        
        # Update comment count
        card.comment_count = card.comments.count()
        card.save()
        
        serializer = CandidateCommentSerializer(comment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        """
        Get all comments for a candidate card
        """
        card = self.get_object()
        comments = card.comments.all()
        serializer = CandidateCommentSerializer(comments, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """
        Get stage movement history for a candidate
        """
        card = self.get_object()
        history = card.stage_movements.all()
        serializer = StageMovementHistorySerializer(history, many=True)
        return Response(serializer.data)


class KanbanBoardView(APIView):
    """
    Main Kanban board view
    """
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        """
        Get Kanban board data with all stages and candidate cards
        """
        # Get or create default pipeline
        pipeline_id = request.query_params.get('pipeline_id')
        job_id = request.query_params.get('job_id')
        
        if pipeline_id:
            pipeline = get_object_or_404(RecruitmentPipeline, id=pipeline_id, is_active=True)
        elif job_id:
            # Get pipeline for specific job
            pipeline = RecruitmentPipeline.objects.filter(
                job_id=job_id,
                is_active=True
            ).first()
            
            if not pipeline:
                # Create default pipeline for this job
                job = get_object_or_404(JobPosting, id=job_id)
                pipeline = self.create_default_pipeline(job, request.user)
        else:
            # Get default pipeline
            pipeline = RecruitmentPipeline.objects.filter(
                is_default=True,
                is_active=True
            ).first()
            
            if not pipeline:
                # Create default pipeline
                pipeline = self.create_default_pipeline(None, request.user)
        
        # Build board data
        board_data = {'pipeline': pipeline}
        serializer = KanbanBoardSerializer(board_data, context={'request': request})
        
        return Response(serializer.data)
    
    def create_default_pipeline(self, job, user):
        """
        Create a default recruitment pipeline with standard stages
        """
        with transaction.atomic():
            # Create default stages if they don't exist
            default_stages = [
                {'name': 'First Interview', 'stage_type': 'FIRST_INTERVIEW', 'order_index': 0, 'color': '#3b82f6'},
                {'name': 'Second Interview', 'stage_type': 'SECOND_INTERVIEW', 'order_index': 1, 'color': '#8b5cf6'},
                {'name': 'Contract Proposal', 'stage_type': 'CONTRACT_PROPOSAL', 'order_index': 2, 'color': '#f59e0b'},
                {'name': 'Contract Signed', 'stage_type': 'CONTRACT_SIGNED', 'order_index': 3, 'color': '#10b981'},
            ]
            
            stages = []
            for stage_data in default_stages:
                stage, created = PipelineStage.objects.get_or_create(
                    name=stage_data['name'],
                    stage_type=stage_data['stage_type'],
                    defaults={
                        'order_index': stage_data['order_index'],
                        'color': stage_data['color'],
                        'organization_name': 'Caffeine Junction - Coffeeland'
                    }
                )
                stages.append(stage)
            
            # Create pipeline
            pipeline_name = f"Recruitment Pipeline - {job.title}" if job else "Default Recruitment Pipeline"
            pipeline = RecruitmentPipeline.objects.create(
                name=pipeline_name,
                description="Default recruitment pipeline with standard stages",
                job=job,
                is_default=(job is None),
                created_by=user
            )
            
            pipeline.stages.set(stages)
            
            return pipeline


class BulkMoveCandidatesView(APIView):
    """
    Bulk move candidates to a different stage
    """
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request):
        serializer = BulkMoveCandidatesSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        candidate_ids = serializer.validated_data['candidate_ids']
        to_stage_id = serializer.validated_data['to_stage_id']
        notes = serializer.validated_data.get('notes', '')
        
        try:
            to_stage = PipelineStage.objects.get(id=to_stage_id)
        except PipelineStage.DoesNotExist:
            return Response(
                {'error': 'Target stage not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Move all candidates
        moved_count = 0
        with transaction.atomic():
            for candidate_id in candidate_ids:
                try:
                    card = CandidateCard.objects.select_for_update().get(id=candidate_id)
                    
                    # Calculate duration
                    duration = timezone.now() - card.moved_to_current_stage_at
                    
                    # Create movement history
                    StageMovementHistory.objects.create(
                        candidate_card=card,
                        from_stage=card.current_stage,
                        to_stage=to_stage,
                        moved_by=request.user,
                        duration_in_previous_stage=duration,
                        notes=notes
                    )
                    
                    # Update card
                    card.current_stage = to_stage
                    card.moved_to_current_stage_at = timezone.now()
                    card.save()
                    
                    # Update application status based on new stage
                    self._update_application_status(card, to_stage, request.user)
                    
                    moved_count += 1
                except CandidateCard.DoesNotExist:
                    continue
        
        return Response({
            'message': f'Successfully moved {moved_count} candidates',
            'moved_count': moved_count,
            'to_stage': to_stage.name
        })
    
    def _update_application_status(self, card, to_stage, user):
        """
        Update the JobApplication status based on the ATS stage
        """
        from .models import JobApplication
        
        # Map ATS stage types to application statuses
        stage_to_status_mapping = {
            'NEW': 'UNDER_REVIEW',
            'SCREENING': 'UNDER_REVIEW',
            'FIRST_INTERVIEW': 'SHORTLISTED',
            'SECOND_INTERVIEW': 'SHORTLISTED',
            'TECHNICAL': 'SHORTLISTED',
            'HR_ROUND': 'SHORTLISTED',
            'CONTRACT_PROPOSAL': 'SHORTLISTED',
            'OFFER_MADE': 'SHORTLISTED',
            'CONTRACT_SIGNED': 'HIRED',
            'REJECTED': 'REJECTED',
            'WITHDRAWN': 'REJECTED',
        }
        
        new_status = stage_to_status_mapping.get(to_stage.stage_type)
        if new_status and card.application.status != new_status:
            # Update application status
            card.application.add_status_change(
                new_status=new_status,
                changed_by=user,
                notes=f"Moved to {to_stage.name} in recruitment pipeline"
            )
            card.application.save()


class ShareableLinkViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing shareable links
    """
    queryset = ShareableLink.objects.all()
    serializer_class = ShareableLinkSerializer
    permission_classes = [permissions.IsAdminUser]
    
    def get_queryset(self):
        return super().get_queryset().filter(is_active=True)
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['post'])
    def generate_link(self, request):
        """
        Generate a new shareable link
        """
        from jobs.models import JobPosting
        
        pipeline_id = request.data.get('pipeline_id')
        job_id = request.data.get('job_id')
        applications_view = request.data.get('applications_view', False)
        permission_level = request.data.get('permission_level', 'VIEW')
        expires_in_days = request.data.get('expires_in_days')
        
        # Calculate expiry
        expires_at = None
        if expires_in_days:
            expires_at = timezone.now() + timedelta(days=int(expires_in_days))
        
        # Create link
        link_data = {
            'token': ShareableLink.generate_token(),
            'permission_level': permission_level,
            'expires_at': expires_at,
            'applications_view': applications_view,
            'created_by': request.user
        }
        
        # Handle job_id - find or create pipeline for the job
        if job_id:
            try:
                job = JobPosting.objects.get(id=job_id)
                # Try to find existing pipeline for this job
                pipeline = RecruitmentPipeline.objects.filter(job=job).first()
                
                # If no pipeline exists, create a default one
                if not pipeline:
                    import logging
                    logger = logging.getLogger(__name__)
                    
                    pipeline = RecruitmentPipeline.objects.create(
                        name=f"Pipeline for {job.title}",
                        job=job,
                        organization_name=job.company.name if hasattr(job, 'company') else 'Organization',
                        is_default=False,
                        is_active=True
                    )
                    logger.info(f"Created pipeline: {pipeline.id}")
                    
                    # Add default stages to the pipeline
                    default_stages = PipelineStage.objects.filter(
                        stage_type__in=['NEW', 'SCREENING', 'FIRST_INTERVIEW', 'OFFER_MADE', 'CONTRACT_SIGNED'],
                        is_active=True
                    ).order_by('order_index')[:5]
                    
                    if default_stages.exists():
                        logger.info(f"Found {default_stages.count()} existing stages")
                        pipeline.stages.set(default_stages)
                    else:
                        # Create basic stages if they don't exist
                        logger.info("Creating new stages")
                        stages_data = [
                            {'name': 'New', 'stage_type': 'NEW', 'color': '#6366f1', 'order_index': 0},
                            {'name': 'Screening', 'stage_type': 'SCREENING', 'color': '#8b5cf6', 'order_index': 1},
                            {'name': 'Interview', 'stage_type': 'FIRST_INTERVIEW', 'color': '#ec4899', 'order_index': 2},
                            {'name': 'Offered', 'stage_type': 'OFFER_MADE', 'color': '#10b981', 'order_index': 3},
                            {'name': 'Hired', 'stage_type': 'CONTRACT_SIGNED', 'color': '#22c55e', 'order_index': 4},
                        ]
                        created_stages = []
                        for stage_data in stages_data:
                            stage, created = PipelineStage.objects.get_or_create(
                                stage_type=stage_data['stage_type'],
                                defaults={
                                    'name': stage_data['name'],
                                    'color': stage_data['color'], 
                                    'order_index': stage_data['order_index'],
                                    'is_active': True
                                }
                            )
                            created_stages.append(stage)
                            logger.info(f"Stage {stage.name} - Created: {created}")
                        
                        pipeline.stages.set(created_stages)
                        logger.info(f"Added {len(created_stages)} stages to pipeline")
                        
                        # Verify stages were added
                        stage_count = pipeline.stages.count()
                        logger.info(f"Pipeline now has {stage_count} stages")
                
                link_data['pipeline'] = pipeline
                
            except JobPosting.DoesNotExist:
                return Response(
                    {'error': 'Job not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        elif pipeline_id and not applications_view:
            try:
                pipeline = RecruitmentPipeline.objects.get(id=pipeline_id)
                link_data['pipeline'] = pipeline
            except RecruitmentPipeline.DoesNotExist:
                return Response(
                    {'error': 'Pipeline not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        link = ShareableLink.objects.create(**link_data)
        serializer = self.get_serializer(link, context={'request': request})
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SharedAccessView(APIView):
    """
    Public access to recruitment board via shareable link
    """
    permission_classes = []  # No authentication required
    
    def get(self, request, token):
        """
        Access recruitment board via shareable link
        """
        try:
            link = ShareableLink.objects.get(token=token)
        except ShareableLink.DoesNotExist:
            return Response(
                {'error': 'Invalid or expired link'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if not link.can_access():
            return Response(
                {'error': 'This link has expired or is no longer active'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Update access tracking
        link.access_count += 1
        link.last_accessed_at = timezone.now()
        link.save()
        
        # Return appropriate data based on link type
        if link.applications_view:
            # Return applications view data
            return self.get_applications_view(request, link)
        else:
            # Return pipeline/board data
            return self.get_board_view(request, link)
    
    def get_board_view(self, request, link):
        """
        Get Kanban board view for shared access
        """
        import logging
        logger = logging.getLogger(__name__)
        
        pipeline = link.pipeline
        if not pipeline:
            return Response(
                {'error': 'No pipeline associated with this link'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Ensure pipeline has stages
        if pipeline.stages.count() == 0:
            logger.info("Pipeline has no stages, creating default stages")
            stages_data = [
                {'name': 'New', 'stage_type': 'NEW', 'color': '#6366f1', 'order_index': 0},
                {'name': 'Screening', 'stage_type': 'SCREENING', 'color': '#8b5cf6', 'order_index': 1},
                {'name': 'Interview', 'stage_type': 'FIRST_INTERVIEW', 'color': '#ec4899', 'order_index': 2},
                {'name': 'Offered', 'stage_type': 'OFFER_MADE', 'color': '#10b981', 'order_index': 3},
                {'name': 'Hired', 'stage_type': 'CONTRACT_SIGNED', 'color': '#22c55e', 'order_index': 4},
            ]
            created_stages = []
            for stage_data in stages_data:
                stage, created = PipelineStage.objects.get_or_create(
                    stage_type=stage_data['stage_type'],
                    defaults={
                        'name': stage_data['name'],
                        'color': stage_data['color'], 
                        'order_index': stage_data['order_index'],
                        'is_active': True
                    }
                )
                created_stages.append(stage)
                logger.info(f"Stage {stage.name} - Created: {created}, ID: {stage.id}")
            
            pipeline.stages.set(created_stages)
            logger.info(f"Added {len(created_stages)} stages to pipeline {pipeline.id}")
        
        # Initialize candidate cards if they don't exist
        if pipeline.job:
            try:
                from .models import JobApplication
                # Get applications for this job that don't have candidate cards yet
                applications_without_cards = JobApplication.objects.filter(
                    job=pipeline.job,
                    is_deleted=False
                ).exclude(
                    id__in=CandidateCard.objects.filter(pipeline=pipeline).values_list('application_id', flat=True)
                )
                
                logger.info(f"Found {applications_without_cards.count()} applications without cards")
                
                # Create candidate cards for applications without them
                if applications_without_cards.exists():
                    # Try to get first stage by order_index or order
                    first_stage = pipeline.stages.order_by('order_index').first()
                    if not first_stage:
                        first_stage = pipeline.stages.order_by('order').first()
                    
                    if first_stage:
                        logger.info(f"Using first stage: {first_stage.name}")
                        position = 0
                        for application in applications_without_cards:
                            try:
                                CandidateCard.objects.create(
                                    application=application,
                                    pipeline=pipeline,
                                    current_stage=first_stage,
                                    position_in_stage=position
                                )
                                position += 1
                                logger.info(f"Created candidate card for application {application.id}")
                            except Exception as e:
                                logger.error(f"Failed to create candidate card for application {application.id}: {str(e)}")
                                continue
                    else:
                        logger.warning("No first stage found in pipeline")
            except Exception as e:
                logger.error(f"Error initializing candidate cards: {str(e)}")
                # Continue anyway to show existing data
        
        try:
            board_data = {'pipeline': pipeline}
            serializer = KanbanBoardSerializer(board_data, context={'request': request})
            
            return Response({
                'board': serializer.data,
                'link': {
                    'permission_level': link.permission_level,
                    'access_count': link.access_count,
                    'created_at': link.created_at,
                    'expires_at': link.expires_at
                }
            })
        except Exception as e:
            logger.error(f"Error serializing board data: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return Response(
                {'error': f'Failed to load board data: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get_applications_view(self, request, link):
        """
        Get applications list view for shared access
        If a pipeline is associated, return board view instead
        """
        # If link has a pipeline, return board view
        if link.pipeline:
            return self.get_board_view(request, link)
        
        # Otherwise return applications list
        from .serializers import DetailedJobApplicationSerializer
        
        applications = JobApplication.objects.filter(
            is_deleted=False
        ).select_related(
            'job', 'job__company', 'applicant__student_profile'
        ).order_by('-applied_at')[:100]  # Limit to 100 recent applications
        
        serializer = DetailedJobApplicationSerializer(applications, many=True)
        
        return Response({
            'applications': serializer.data,
            'permission_level': link.permission_level,
            'access_info': {
                'access_count': link.access_count,
                'created_at': link.created_at,
                'expires_at': link.expires_at
            }
        })


class InitializeATSView(APIView):
    """
    Initialize ATS system for existing applications
    """
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request):
        """
        Create candidate cards for existing applications
        """
        job_id = request.data.get('job_id')
        
        # Get or create pipeline
        if job_id:
            job = get_object_or_404(JobPosting, id=job_id)
            pipeline = RecruitmentPipeline.objects.filter(job=job, is_active=True).first()
            
            if not pipeline:
                # Create pipeline for this job
                board_view = KanbanBoardView()
                pipeline = board_view.create_default_pipeline(job, request.user)
            
            applications = JobApplication.objects.filter(job=job, is_deleted=False)
        else:
            # Create default pipeline
            pipeline = RecruitmentPipeline.objects.filter(is_default=True, is_active=True).first()
            if not pipeline:
                board_view = KanbanBoardView()
                pipeline = board_view.create_default_pipeline(None, request.user)
            
            applications = JobApplication.objects.filter(is_deleted=False)
        
        # Get first stage
        first_stage = pipeline.stages.order_by('order_index').first()
        if not first_stage:
            return Response(
                {'error': 'Pipeline has no stages'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create candidate cards
        created_count = 0
        skipped_count = 0
        
        for application in applications:
            # Check if card already exists
            if hasattr(application, 'candidate_card'):
                skipped_count += 1
                continue
            
            # Map application status to appropriate stage
            stage = first_stage
            if application.status == 'SHORTLISTED':
                stage = pipeline.stages.filter(stage_type='FIRST_INTERVIEW').first() or first_stage
            elif application.status == 'HIRED':
                stage = pipeline.stages.filter(stage_type='CONTRACT_SIGNED').first() or first_stage
            
            # Create candidate card
            CandidateCard.objects.create(
                application=application,
                current_stage=stage,
                pipeline=pipeline,
                tags=['Roaster'] if 'roaster' in application.job.title.lower() else [],
            )
            created_count += 1
        
        return Response({
            'message': 'ATS initialized successfully',
            'created_cards': created_count,
            'skipped_existing': skipped_count,
            'pipeline_id': str(pipeline.id),
            'pipeline_name': pipeline.name
        })


class ShareableLinkViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing shareable links
    """
    queryset = ShareableLink.objects.select_related(
        'pipeline__job__company'
    ).all()
    serializer_class = ShareableLinkSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by job_id if provided
        job_id = self.request.query_params.get('job_id')
        if job_id:
            # Find pipeline for this job and filter links by that pipeline
            try:
                pipeline = RecruitmentPipeline.objects.get(job_id=job_id)
                queryset = queryset.filter(pipeline=pipeline)
            except RecruitmentPipeline.DoesNotExist:
                # If no pipeline exists for this job, return empty queryset
                return queryset.none()

        # Filter by applications_view if specified
        applications_view = self.request.query_params.get('applications_view')
        if applications_view is not None:
            queryset = queryset.filter(applications_view=applications_view.lower() == 'true')

        # Only return active (non-expired) links by default
        queryset = queryset.filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
        )

        return queryset.order_by('-created_at')

    @action(detail=False, methods=['post'])
    def generate_link(self, request):
        """
        Generate a new shareable link
        """
        job_id = request.data.get('job_id')
        applications_view = request.data.get('applications_view', False)
        permission_level = request.data.get('permission_level', 'VIEW')
        expires_in_days = request.data.get('expires_in_days')

        # Calculate expiry
        expires_at = None
        if expires_in_days:
            expires_at = timezone.now() + timedelta(days=int(expires_in_days))

        # Create link
        link_data = {
            'token': ShareableLink.generate_token(),
            'permission_level': permission_level,
            'expires_at': expires_at,
            'applications_view': applications_view,
            'created_by': request.user
        }

        # Handle job_id - find or create pipeline for the job
        if job_id:
            try:
                job = JobPosting.objects.get(id=job_id)
                # Try to find existing pipeline for this job
                pipeline = RecruitmentPipeline.objects.filter(job=job).first()

                # If no pipeline exists, create a default one
                if not pipeline:
                    import logging
                    logger = logging.getLogger(__name__)

                    pipeline = RecruitmentPipeline.objects.create(
                        name=f"Pipeline for {job.title}",
                        job=job,
                        organization_name=job.company.name if hasattr(job, 'company') else 'Organization',
                        is_default=False,
                        is_active=True
                    )
                    logger.info(f"Created pipeline: {pipeline.id}")

                    # Add default stages to the pipeline
                    default_stages = PipelineStage.objects.filter(
                        stage_type__in=['NEW', 'SCREENING', 'FIRST_INTERVIEW', 'OFFER_MADE', 'CONTRACT_SIGNED'],
                        is_active=True
                    ).order_by('order_index')[:5]

                    if default_stages.exists():
                        logger.info(f"Found {default_stages.count()} existing stages")
                        pipeline.stages.set(default_stages)
                    else:
                        # Create basic stages if they don't exist
                        logger.warning("No default stages found, creating basic ones")
                        # This would need to be implemented based on existing stage creation logic

                link_data['pipeline'] = pipeline
            except JobPosting.DoesNotExist:
                return Response(
                    {'error': 'Job not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

        # Create the link
        link = ShareableLink.objects.create(**link_data)

        serializer = self.get_serializer(link)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
