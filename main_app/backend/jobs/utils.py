from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
import math
import csv
import io
import pandas as pd
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from django.utils import timezone


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    # Accept 'page_size' query parameter from frontend
    page_size_query_param = 'page_size'
    max_page_size = 100
    page_query_param = 'page'


def get_paginated_response(view_instance, queryset, serializer_class, request):
    """
    Helper function to return consistent paginated response format
    """
    page = view_instance.paginate_queryset(queryset)
    
    if page is not None:
        serializer = serializer_class(page, many=True, context={'request': request})
        return Response({
            'data': serializer.data,
            'pagination': {
                'current_page': int(request.GET.get('page', 1)),
                'total_pages': view_instance.paginator.page.paginator.num_pages,
                'total_count': view_instance.paginator.page.paginator.count,
                'per_page': view_instance.pagination_class.page_size,
                'has_next': view_instance.paginator.page.has_next(),
                'has_previous': view_instance.paginator.page.has_previous(),
            }
        })
    
    serializer = serializer_class(queryset, many=True, context={'request': request})
    return Response({'data': serializer.data})


def get_correct_pagination_data(request, paginator, page_obj, page_size):
    """
    Helper function to calculate correct pagination metadata
    """
    current_page = int(request.GET.get('page', 1))
    total_count = paginator.count
    per_page = page_size
    
    # Calculate total pages correctly
    total_pages = math.ceil(total_count / per_page) if total_count > 0 else 1
    
    # Calculate has_next and has_previous correctly
    has_next = current_page < total_pages
    has_previous = current_page > 1
    
    return {
        'current_page': current_page,
        'total_pages': total_pages,
        'total_count': total_count,
        'per_page': per_page,
        'has_next': has_next,
        'has_previous': has_previous,
    }


def get_pagination_params(request):
    """
    Helper function to extract and validate pagination parameters
    """
    try:
        page = int(request.GET.get('page', 1))
        per_page = int(request.GET.get('per_page', 10))
    except (ValueError, TypeError):
        page = 1
        per_page = 10
    
    # Ensure reasonable limits
    per_page = min(max(per_page, 1), 100)
    page = max(page, 1)
    
    return page, per_page 


class ApplicationExportService:
    """Service for exporting application data"""
    
    def get_available_columns(self, job_id=None):
        """Get all available columns including dynamic additional fields"""
        from jobs.models import JobPosting, JobApplication
        
        # Standard columns
        standard_columns = [
            {'key': 'student_name', 'label': 'Student Name', 'category': 'student'},
            {'key': 'student_email', 'label': 'Email', 'category': 'student'},
            {'key': 'student_id', 'label': 'Student ID', 'category': 'student'},
            {'key': 'branch', 'label': 'Branch', 'category': 'student'},
            {'key': 'job_title', 'label': 'Job Title', 'category': 'job'},
            {'key': 'company_name', 'label': 'Company', 'category': 'job'},
            {'key': 'status', 'label': 'Status', 'category': 'application'},
            {'key': 'applied_at', 'label': 'Applied Date', 'category': 'application'},
            {'key': 'current_cgpa', 'label': 'CGPA', 'category': 'academic'},
            {'key': 'twelfth_percentage', 'label': 'Intermediate Score', 'category': 'academic'},
            {'key': 'tenth_percentage', 'label': '10th Grade Score', 'category': 'academic'},
            {'key': 'phone', 'label': 'Phone', 'category': 'contact'},
            {'key': 'city', 'label': 'City', 'category': 'contact'},
            {'key': 'state', 'label': 'State', 'category': 'contact'},
            {'key': 'university', 'label': 'University', 'category': 'academic'},
            {'key': 'graduation_year', 'label': 'Graduation Year', 'category': 'academic'},
            {'key': 'joining_year', 'label': 'Joining Year', 'category': 'academic'},
        ]
        
        # Add dynamic additional fields from job posting
        dynamic_columns = []
        if job_id:
            try:
                job = JobPosting.objects.get(id=job_id)
                for field in job.additional_fields or []:
                    dynamic_columns.append({
                        'key': f"field_{field.get('id', field.get('label', ''))}",
                        'label': field.get('label', f"Custom Field {field.get('id', '')}"),
                        'category': 'additional',
                        'type': field.get('type', 'text'),
                        'original_field': field
                    })
            except JobPosting.DoesNotExist:
                pass
        else:
            # Get all unique additional fields across all applications
            applications = JobApplication.objects.select_related('job').all()
            seen_fields = set()
            for app in applications:
                if app.job.additional_fields:
                    for field in app.job.additional_fields:
                        field_key = f"field_{field.get('id', field.get('label', ''))}"
                        if field_key not in seen_fields:
                            dynamic_columns.append({
                                'key': field_key,
                                'label': field.get('label', f"Custom Field {field.get('id', '')}"),
                                'category': 'additional',
                                'type': field.get('type', 'text'),
                                'original_field': field
                            })
                            seen_fields.add(field_key)
        
        return {
            'standard': standard_columns,
            'additional': dynamic_columns,
            'all': standard_columns + dynamic_columns
        }
    
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
        
        # Add title
        styles = getSampleStyleSheet()
        title = Paragraph("Job Applications Report", styles['Title'])
        elements.append(title)
        elements.append(Paragraph("<br/><br/>", styles['Normal']))
        
        # Prepare table data
        headers = [self.get_column_header(col) for col in columns]
        data = [headers]
        
        for application in queryset:
            row = [str(self.get_column_value(application, col)) for col in columns]
            # Truncate long text for PDF
            row = [text[:30] + '...' if len(text) > 30 else text for text in row]
            data.append(row)
        
        # Create table
        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
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
            'city': 'City',
            'state': 'State',
            'university': 'University',
            'graduation_year': 'Graduation Year',
            'joining_year': 'Joining Year',
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
        
        # JSON snapshot fields - structured format
        basic_info = snapshot.get('basic_info', {})
        academic_info = snapshot.get('academic_info', {})
        contact_info = snapshot.get('contact_info', {})
        custom_responses = snapshot.get('custom_responses', {})
        
        # Check in different sections
        if column in basic_info:
            return basic_info.get(column, '')
        elif column in academic_info:
            return academic_info.get(column, '')
        elif column in contact_info:
            return contact_info.get(column, '')
        elif column in custom_responses:
            value = custom_responses.get(column, '')
            if isinstance(value, list):
                return ', '.join(str(v) for v in value)
            return str(value)
        
        # Handle dynamic additional fields with different key formats
        elif column.startswith('field_'):
            # Try multiple key formats for additional fields
            field_id = column.replace('field_', '')
            possible_keys = [
                column,  # field_123
                field_id,  # 123
                f"field_{field_id}",  # field_123 (redundant but safe)
            ]
            
            for key in possible_keys:
                if key in custom_responses:
                    value = custom_responses[key]
                    if isinstance(value, list):
                        return ', '.join(str(v) for v in value)
                    return str(value)
            
            # Try to find by field label in job's additional_fields
            try:
                job_fields = application.job.additional_fields or []
                for field in job_fields:
                    if (str(field.get('id', '')) == field_id or 
                        field.get('label', '').replace(' ', '_').lower() == field_id):
                        # Try to find value by label
                        label_key = field.get('label', '')
                        if label_key in custom_responses:
                            value = custom_responses[label_key]
                            if isinstance(value, list):
                                return ', '.join(str(v) for v in value)
                            return str(value)
            except:
                pass
        
        # Legacy format fallback (for old data)
        elif column in snapshot:
            value = snapshot.get(column, '')
            if isinstance(value, list):
                return ', '.join(str(v) for v in value)
            return str(value)
        
        return ''