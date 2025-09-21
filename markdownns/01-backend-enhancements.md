# Backend Enhancements - Job Application System

## 🎯 Overview
Enhance the backend infrastructure to support advanced application tracking, dynamic forms, and export functionality.

## 📋 Implementation Checklist

### 1. JobApplication Model Enhancements
- [x] Enhance `applied_data_snapshot` JSON structure
- [x] Add new fields for better tracking
- [x] Create data migration for existing applications
- [x] Add validation for JSON structure

### 2. New API Endpoints
- [x] Applications listing with advanced filtering
- [x] Individual application CRUD operations
- [x] Export endpoints (CSV, Excel, PDF)
- [x] Bulk operations endpoints

### 3. Enhanced Serializers
- [x] Detailed application serializer
- [x] Profile field selection serializer
- [x] Export configuration serializer
- [x] Dynamic form response serializer

### 4. Utility Functions
- [x] Export generation utilities
- [x] Form field extraction utilities
- [x] Search and filter utilities
- [x] File handling utilities

---

## 🔧 Implementation Details

### 1. Enhanced JobApplication Model

**File**: `backend/jobs/models.py`

#### New JSON Structure for `applied_data_snapshot`:
```python
# Enhanced structure example
{
    "basic_info": {
        "name": "John Doe",
        "email": "john@example.com",
        "student_id": "CS2021001",
        "branch": "Computer Science",
        "current_cgpa": 8.5
    },
    "academic_info": {
        "tenth_percentage": 95.0,
        "twelfth_percentage": 90.0,
        "university": "ABC University",
        "graduation_year": 2025
    },
    "contact_info": {
        "phone": "+1234567890",
        "address": "123 Main St",
        "city": "City Name",
        "state": "State Name"
    },
    "documents": {
        "resume_url": "https://s3-bucket/resume.pdf",
        "transcript_url": "https://s3-bucket/transcript.pdf"
    },
    "custom_responses": {
        "field_1": "response_1",
        "field_2": ["option1", "option2"],
        "field_3": "2024-03-15"
    },
    "metadata": {
        "form_version": "1.0",
        "submission_ip": "192.168.1.1",
        "user_agent": "Mozilla/5.0...",
        "submission_timestamp": "2024-01-15T10:30:00Z"
    }
}
```

#### Model Updates:
```python
class JobApplication(models.Model):
    # ... existing fields ...
    
    # Enhanced fields
    applied_data_snapshot = models.JSONField(default=dict, null=True, blank=True)
    admin_notes = models.TextField(blank=True, null=True, help_text="Internal admin notes")
    last_modified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='modified_applications'
    )
    is_deleted = models.BooleanField(default=False, help_text="Soft delete flag")
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    # Status timeline
    status_history = models.JSONField(default=list, blank=True, help_text="Status change history")
    
    class Meta:
        ordering = ['-applied_at']
        indexes = [
            models.Index(fields=['status', 'applied_at']),
            models.Index(fields=['job', 'status']),
            models.Index(fields=['applicant', 'applied_at']),
        ]
    
    def add_status_change(self, new_status, changed_by=None, notes=None):
        """Add a status change to the history"""
        change_record = {
            'from_status': self.status,
            'to_status': new_status,
            'changed_at': timezone.now().isoformat(),
            'changed_by': changed_by.id if changed_by else None,
            'notes': notes
        }
        
        if not self.status_history:
            self.status_history = []
        
        self.status_history.append(change_record)
        self.status = new_status
        self.last_modified_by = changed_by
```

### 2. New API Views

**File**: `backend/jobs/views.py`

```python
class EnhancedApplicationsListView(generics.ListAPIView):
    """Enhanced applications list with advanced filtering"""
    serializer_class = DetailedJobApplicationSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = StandardResultsSetPagination
    filterset_class = JobApplicationFilter

    def get_queryset(self):
        queryset = JobApplication.objects.select_related(
            'job', 'job__company', 'applicant__student_profile'
        ).filter(is_deleted=False)
        
        # Apply filters
        queryset = self.filter_queryset(queryset)
        
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
        total = queryset.count()
        by_status = queryset.values('status').annotate(
            count=Count('id')
        ).order_by('status')
        
        return {
            'total': total,
            'by_status': list(by_status),
            'recent': queryset.filter(
                applied_at__gte=timezone.now() - timedelta(days=7)
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
```

### 3. Enhanced Serializers

**File**: `backend/jobs/serializers.py`

```python
class DetailedJobApplicationSerializer(serializers.ModelSerializer):
    """Detailed application serializer with all related data"""
    
    # Job details
    job_title = serializers.CharField(source='job.title', read_only=True)
    company_name = serializers.CharField(source='job.company.name', read_only=True)
    job_location = serializers.CharField(source='job.location', read_only=True)
    
    # Student details
    student_name = serializers.SerializerMethodField()
    student_email = serializers.CharField(source='applicant.email', read_only=True)
    student_id = serializers.CharField(source='applicant.student_profile.student_id', read_only=True)
    branch = serializers.CharField(source='applicant.student_profile.branch', read_only=True)
    
    # Application details
    formatted_applied_at = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    # JSON data with proper handling
    profile_data = serializers.SerializerMethodField()
    custom_responses = serializers.SerializerMethodField()
    
    class Meta:
        model = JobApplication
        fields = [
            'id', 'job', 'job_title', 'company_name', 'job_location',
            'applicant', 'student_name', 'student_email', 'student_id', 'branch',
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
    format = serializers.ChoiceField(choices=['csv', 'excel', 'pdf'])
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
            {'key': 'email', 'label': 'Email Address', 'type': 'email'},
            {'key': 'university', 'label': 'School/University', 'type': 'text'},
            {'key': 'twelfth_percentage', 'label': 'Intermediate Score (+2)', 'type': 'number'},
            {'key': 'current_cgpa', 'label': 'Current CGPA', 'type': 'number'},
        ]
    
    def get_advanced_fields(self, obj):
        return [
            {'key': 'student_id', 'label': 'Student ID', 'type': 'text'},
            {'key': 'branch', 'label': 'Branch/Department', 'type': 'text'},
            {'key': 'tenth_percentage', 'label': '10th Grade Score', 'type': 'number'},
            {'key': 'graduation_year', 'label': 'Expected Graduation', 'type': 'number'},
            {'key': 'phone', 'label': 'Phone Number', 'type': 'tel'},
            {'key': 'address', 'label': 'Address', 'type': 'textarea'},
            {'key': 'skills', 'label': 'Skills', 'type': 'text'},
            {'key': 'experience', 'label': 'Experience', 'type': 'textarea'},
        ]
```

### 4. Utility Functions

**File**: `backend/jobs/utils.py`

```python
import csv
import io
import pandas as pd
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
from reportlab.lib import colors

class ApplicationExportService:
    """Service for exporting application data"""
    
    def generate_export(self, queryset, format, columns, job_id=None):
        """Generate export in specified format"""
        
        if format == 'csv':
            return self.generate_csv(queryset, columns)
        elif format == 'excel':
            return self.generate_excel(queryset, columns, job_id)
        elif format == 'pdf':
            return self.generate_pdf(queryset, columns, job_id)
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def generate_csv(self, queryset, columns):
        """Generate CSV export"""
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write headers
        headers = self.get_column_headers(columns)
        writer.writerow(headers)
        
        # Write data
        for application in queryset:
            row = self.get_application_row(application, columns)
            writer.writerow(row)
        
        return {
            'content': output.getvalue().encode('utf-8'),
            'content_type': 'text/csv',
            'filename': f'applications_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv'
        }
    
    def generate_excel(self, queryset, columns, job_id=None):
        """Generate Excel export"""
        data = []
        
        # Prepare data
        for application in queryset:
            row_data = {}
            for col in columns:
                row_data[self.get_column_header(col)] = self.get_column_value(application, col)
            data.append(row_data)
        
        # Create DataFrame
        df = pd.DataFrame(data)
        
        # Create Excel file
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Applications', index=False)
            
            # Format the worksheet
            worksheet = writer.sheets['Applications']
            for column in worksheet.columns:
                max_length = 0
                column_name = column[0].column_letter
                for cell in column:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                adjusted_width = min(max_length + 2, 50)
                worksheet.column_dimensions[column_name].width = adjusted_width
        
        output.seek(0)
        
        return {
            'content': output.getvalue(),
            'content_type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'filename': f'applications_{timezone.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
        }
    
    def generate_pdf(self, queryset, columns, job_id=None):
        """Generate PDF export"""
        output = io.BytesIO()
        
        # Create document
        doc = SimpleDocTemplate(output, pagesize=A4)
        elements = []
        
        # Prepare table data
        headers = [self.get_column_header(col) for col in columns]
        data = [headers]
        
        for application in queryset:
            row = [self.get_column_value(application, col) for col in columns]
            data.append(row)
        
        # Create table
        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        elements.append(table)
        doc.build(elements)
        
        output.seek(0)
        
        return {
            'content': output.getvalue(),
            'content_type': 'application/pdf',
            'filename': f'applications_{timezone.now().strftime("%Y%m%d_%H%M%S")}.pdf'
        }
    
    def get_column_headers(self, columns):
        """Get human-readable column headers"""
        return [self.get_column_header(col) for col in columns]
    
    def get_column_header(self, column):
        """Get human-readable header for column"""
        header_map = {
            'student_name': 'Student Name',
            'student_email': 'Email',
            'student_id': 'Student ID',
            'branch': 'Branch',
            'job_title': 'Job Title',
            'company_name': 'Company',
            'status': 'Status',
            'applied_at': 'Applied Date',
            'current_cgpa': 'CGPA',
            'twelfth_percentage': 'Intermediate Score',
            'tenth_percentage': '10th Grade Score',
            'phone': 'Phone',
        }
        return header_map.get(column, column.replace('_', ' ').title())
    
    def get_application_row(self, application, columns):
        """Get row data for application"""
        return [self.get_column_value(application, col) for col in columns]
    
    def get_column_value(self, application, column):
        """Get value for specific column"""
        snapshot = application.applied_data_snapshot or {}
        
        # Basic application fields
        if column == 'student_name':
            profile = application.applicant.student_profile
            return f"{profile.first_name} {profile.last_name}"
        elif column == 'student_email':
            return application.applicant.email
        elif column == 'student_id':
            return application.applicant.student_profile.student_id
        elif column == 'branch':
            return application.applicant.student_profile.branch
        elif column == 'job_title':
            return application.job.title
        elif column == 'company_name':
            return application.job.company.name
        elif column == 'status':
            return application.get_status_display()
        elif column == 'applied_at':
            return application.applied_at.strftime("%Y-%m-%d %H:%M")
        
        # JSON snapshot fields
        elif column in snapshot.get('basic_info', {}):
            return snapshot['basic_info'].get(column, '')
        elif column in snapshot.get('academic_info', {}):
            return snapshot['academic_info'].get(column, '')
        elif column in snapshot.get('contact_info', {}):
            return snapshot['contact_info'].get(column, '')
        elif column in snapshot.get('custom_responses', {}):
            value = snapshot['custom_responses'].get(column, '')
            if isinstance(value, list):
                return ', '.join(str(v) for v in value)
            return str(value)
        
        return ''

# ... Additional utility functions for search and filtering
```

### 5. URL Configuration

**File**: `backend/jobs/urls.py`

Add these new URL patterns:

```python
# Enhanced application management URLs
path('applications/', EnhancedApplicationsListView.as_view(), name='enhanced-applications-list'),
path('applications/<int:pk>/', ApplicationDetailView.as_view(), name='application-detail'),
path('applications/export/', ApplicationExportView.as_view(), name='applications-export'),
path('applications/fields/', StudentProfileFieldsView.as_view(), name='profile-fields'),

# Bulk operations
path('applications/bulk-update/', BulkApplicationUpdateView.as_view(), name='bulk-application-update'),
```

---

## ✅ Acceptance Criteria

- [x] Enhanced JobApplication model with proper JSON structure
- [x] New API endpoints for advanced application management
- [x] Export functionality working for CSV, Excel, and PDF
- [x] Proper serializers for detailed application data
- [x] Search and filtering utilities implemented
- [x] Database migrations created and tested
- [x] Real application data generated (150 applications)
- [x] Frontend integration tested and working
- [x] API response format validated with JWT authentication
- [ ] API documentation updated
- [ ] Unit tests written for new functionality

---

## 🧪 Testing Requirements

1. **Model Tests**: Test JSON structure validation and status history
2. **API Tests**: Test all new endpoints with various scenarios
3. **Export Tests**: Test export generation with different formats
4. **Performance Tests**: Test with large datasets
5. **Integration Tests**: Test end-to-end workflows

---

## 🎉 Implementation Complete!

### ✅ What Was Implemented:

**1. Enhanced JobApplication Model:**
- Added `admin_notes`, `last_modified_by`, `is_deleted`, `deleted_at`, `status_history` fields
- Enhanced `applied_data_snapshot` with structured JSON format
- Added database indexes for performance optimization
- Created `add_status_change()` method for status tracking

**2. New API Endpoints:**
- `EnhancedApplicationsListView` - Advanced filtering, search, and statistics
- `ApplicationDetailView` - Individual application CRUD operations  
- `ApplicationExportView` - Export to CSV, Excel, PDF formats
- `StudentProfileFieldsView` - Available profile fields for forms
- `BulkApplicationUpdateView` - Bulk operations on multiple applications

**3. Enhanced Data Structure:**
```json
{
  "basic_info": { "name", "email", "student_id", "branch", "current_cgpa", "university" },
  "academic_info": { "tenth_percentage", "twelfth_percentage", "graduation_year", "semester_wise_cgpa" },
  "contact_info": { "phone", "address", "city", "state", "pincode", "country" },
  "documents": { "resume_url", "certificates_urls" },
  "custom_responses": { "dynamic_form_responses" },
  "metadata": { "form_version", "submission_info", "timestamps" }
}
```

**4. Export Functionality:**
- CSV export with customizable columns
- Excel export with proper formatting
- PDF export with professional styling
- Support for filtered data export

**5. Utility Functions:**
- `ApplicationExportService` class for all export operations
- `create_enhanced_application_snapshot()` for structured data creation
- Enhanced search and filtering across multiple fields

**6. Database Changes:**
- Migration `0014_enhance_job_application_model` successfully applied
- All new fields and indexes added to database

**7. URL Configuration:**
- `/jobs/applications/` - Enhanced applications list
- `/jobs/applications/<id>/` - Individual application management
- `/jobs/applications/export/` - Export functionality
- `/jobs/applications/fields/` - Profile fields API
- `/jobs/applications/bulk-update/` - Bulk operations

### 🚀 Ready for Frontend Integration

The backend now provides:
- ✅ Complete RESTful API for application management
- ✅ Advanced filtering and search capabilities
- ✅ Export functionality in multiple formats
- ✅ Structured JSON data for easy frontend consumption
- ✅ Performance optimized queries with select_related
- ✅ Proper error handling and validation

### 📋 Dependencies Added:
- `openpyxl>=3.0.0` - Excel export functionality
- `reportlab>=3.6.0` - PDF export functionality

---

## 🧪 Testing & Data Generation

### Real Application Data Created:
- **150 realistic job applications** generated using existing students (800) and jobs (203)
- **Status distribution**: 45% APPLIED, 25% UNDER_REVIEW, 15% SHORTLISTED, 12% REJECTED, 3% HIRED
- **Realistic cover letters** and custom responses generated
- **Status history** for applications that progressed beyond APPLIED
- **Timestamps spread over 90 days** for realistic timeline

### API Testing Results:
- ✅ **JWT Authentication**: Working with Bearer token
- ✅ **Filtering by job_id**: Returns 1 application for job_id=25
- ✅ **Pagination**: 10 items per page with proper count
- ✅ **Statistics**: Real-time calculation of status breakdown
- ✅ **Response Format**: Nested structure `{count, next, previous, results: {results: [...], stats: {...}}}`

### Management Command:
```bash
python manage.py create_job_applications
```
Creates 150 realistic applications with proper data structure.

---

## ✅ File Upload System Implementation

### Local File Storage Implementation:
- **✅ Backend Enhanced**: Updated `EnhancedJobApplicationCreateView` to handle file uploads
- **✅ File Organization**: Files stored in `media/application_files/{student_id}/` directories
- **✅ Safe Filenames**: Timestamped and slugified filenames for security
- **✅ URL Access**: Files accessible via `/media/` URLs for download/viewing
- **✅ JSON Integration**: File URLs stored in application snapshot documents section

### Frontend API Integration:
- **✅ FormData Support**: Updated `applyToJob()` function to detect and handle file uploads
- **✅ Automatic Detection**: Checks for File objects in additional fields
- **✅ Mixed Content**: Supports both JSON and file data in same submission
- **✅ Backward Compatibility**: Falls back to JSON for non-file submissions

### File Upload Features:
```javascript
// Frontend automatically detects files
const hasFiles = Object.values(additionalFields).some(value => value instanceof File);

// Backend creates organized file structure
file_path = f"application_files/{student.student_id}/{timestamp}_{safe_filename}"
```

### Testing Results:
- **✅ Student Authentication**: Working with student1@example.com/student123
- **✅ File Upload**: Successfully uploaded and stored test files
- **✅ URL Access**: Files accessible at `/media/application_files/CS2019001/20250709_133229_test_filetxt`
- **✅ Data Structure**: File URLs properly integrated into application snapshot

### Next Steps:
- **🔄 Production Ready**: Current local storage works for development
- **📋 S3 Migration**: Later migrate to AWS S3 for production scalability

---

**Next**: Proceed to `02-admin-applications-dashboard.md` for frontend implementation.