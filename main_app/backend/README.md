# DevCorp Backend API Documentation


python manage.py create_student_user
## Overview

The DevCorp backend is a Django REST Framework-based API for a comprehensive job portal application. It provides endpoints for user authentication, student profiles, job postings, company management, application tracking, and an Applicant Tracking System (ATS).

## Technology Stack

- **Framework**: Django 5.1+ with Django REST Framework
- **Authentication**: JWT (JSON Web Tokens) via `djangorestframework-simplejwt`
- **Database**: SQLite (default), with support for PostgreSQL in production
- **File Handling**: Django's file storage for resumes, certificates, and media
- **Python Version**: 3.8+

## API Endpoints

### Authentication & User Management (`/api/`)

#### Authentication Endpoints
- **POST** `/api/auth/register/student/` - Student registration
  - **Request Body**: `{email, password, first_name, last_name, student_id, ...}`
  - **Response**: `{"user": {...}, "token": "...", "refresh_token": "..."}`

- **POST** `/api/auth/login/` - User login
  - **Request Body**: `{email, password}`
  - **Response**: `{"user": {...}, "token": "...", "refresh_token": "..."}`

- **POST** `/api/auth/logout/` - User logout
  - **Response**: `{"message": "Successfully logged out"}`

- **GET** `/api/auth/profile/` - Get current user profile
  - **Response**: User profile data with student details

- **POST** `/api/auth/token/refresh/` - Refresh JWT token
  - **Request Body**: `{refresh: "..."}`
  - **Response**: `{"access": "..."}`

- **POST** `/api/auth/change-password/` - Change password
  - **Request Body**: `{old_password, new_password}`
  - **Response**: `{"message": "Password changed successfully"}`

#### Student Profile Management
- **GET** `/api/students/` - List all students (Admin only)
  - **Response**: `{"count": N, "results": [StudentProfileSerializer]}`

- **GET** `/api/students/optimized/` - Optimized student list with caching
  - **Response**: `{"count": N, "results": [StudentProfileListSerializer]}`

- **GET** `/api/students/{id}/` - Get student details
  - **Response**: `StudentProfileSerializer`

- **PUT/PATCH** `/api/students/{id}/update/` - Update student profile
  - **Request Body**: Student profile data
  - **Response**: `StudentProfileSerializer`

- **POST** `/api/students/{id}/freeze/` - Freeze/unfreeze student profile
  - **Response**: `{"message": "...", "is_frozen": boolean}`

#### Resume Management
- **GET** `/api/profiles/me/resumes/` - List user's resumes
  - **Response**: `[ResumeSerializer]`

- **POST** `/api/profiles/me/resumes/` - Upload new resume
  - **Request Body**: `{name, file, is_primary}`
  - **Response**: `ResumeSerializer`

- **GET** `/api/profiles/me/resumes/{pk}/` - Get resume details
  - **Response**: `ResumeSerializer`

- **DELETE** `/api/profiles/me/resumes/{pk}/` - Delete resume
  - **Response**: `{"message": "Resume deleted successfully"}`

#### Admin Endpoints
- **GET** `/api/admin/system-settings/` - Get system settings
  - **Response**: System configuration data

- **POST** `/api/admin/year-management/` - Manage academic years
  - **Request Body**: Year management data
  - **Response**: Year management data

- **GET** `/api/active-years/` - Get active academic years
  - **Response**: `[{"year": 2024, "is_active": true}]`

### Job Management (`/api/v1/jobs/`)

#### Job Posting Endpoints
- **GET** `/api/v1/jobs/` - List all jobs
  - **Response**: `{"count": N, "results": [EnhancedJobSerializer]}`

- **POST** `/api/v1/jobs/create/` - Create new job posting (Admin)
  - **Request Body**: Job posting data
  - **Response**: `EnhancedJobSerializer`

- **GET** `/api/v1/jobs/{pk}/` - Get job details
  - **Response**: `EnhancedJobSerializer`

- **PUT/PATCH** `/api/v1/jobs/{pk}/` - Update job posting
  - **Response**: `EnhancedJobSerializer`

- **DELETE** `/api/v1/jobs/{pk}/` - Delete job posting
  - **Response**: `{"message": "Job deleted successfully"}`

- **POST** `/api/v1/jobs/{pk}/toggle-publish/` - Toggle job publish status
  - **Response**: `{"is_published": boolean, "message": "..."}`

- **GET** `/api/v1/jobs/{pk}/can-apply/` - Check if user can apply for job
  - **Response**: `{"can_apply": boolean, "reason": "..."}`

#### Job Applications
- **POST** `/api/v1/jobs/{job_id}/apply/` - Apply for job
  - **Request Body**: Application data with custom fields
  - **Response**: `EnhancedJobApplicationSerializer`

- **GET** `/api/v1/jobs/{job_id}/applications/` - Get applications for job (Admin)
  - **Response**: `[DetailedJobApplicationSerializer]`

- **GET** `/api/v1/jobs/applied/` - Get user's applied jobs
  - **Response**: `[StudentApplicationSerializer]`

- **GET** `/api/v1/jobs/my-applications/` - Get user's applications
  - **Response**: `[StudentApplicationSerializer]`

- **PUT** `/api/v1/jobs/applications/{pk}/update-status/` - Update application status (Admin)
  - **Request Body**: `{status: "ACCEPTED|REJECTED|PENDING"}`
  - **Response**: `JobApplicationSerializer`

#### Statistics Endpoints
- **GET** `/api/v1/jobs/stats/` - Job statistics
  - **Response**: `StatsSerializer`

- **GET** `/api/v1/jobs/stats/companies/` - Company statistics
  - **Response**: Company stats data

- **GET** `/api/v1/jobs/stats/applications/` - Application statistics
  - **Response**: Application stats data

#### Enhanced Application Management
- **GET** `/api/v1/jobs/applications/` - List all applications (Admin)
  - **Response**: `{"count": N, "results": [DetailedJobApplicationSerializer]}`

- **GET** `/api/v1/jobs/applications/{pk}/` - Get application details
  - **Response**: `DetailedJobApplicationSerializer`

- **GET** `/api/v1/jobs/applications/export/` - Export applications
  - **Response**: CSV/XLSX file

- **GET** `/api/v1/jobs/applications/fields/` - Get available profile fields
  - **Response**: `StudentProfileFieldsSerializer`

- **POST** `/api/v1/jobs/applications/bulk-update/` - Bulk update applications
  - **Request Body**: `{application_ids: [...], status: "..."}`
  - **Response**: `{"updated": N, "message": "..."}`

#### Placed Students
- **GET** `/api/v1/jobs/placed-students/` - List placed students
  - **Response**: `[PlacedStudentSerializer]`

- **GET** `/api/v1/jobs/placed-students/export/` - Export placed students
  - **Response**: CSV file

- **GET** `/api/v1/jobs/placed-students/passout_years/` - Get passout years for placed students
  - **Response**: `[{"year": 2024, "count": N}]`

#### Calendar & Recommendations
- **GET** `/api/v1/jobs/calendar/events/` - Get calendar events
  - **Response**: Calendar events data

- **GET** `/api/v1/jobs/recommended/` - Get recommended jobs for user
  - **Response**: `[EnhancedJobSerializer]`

#### Company Job Management
- **GET** `/api/v1/jobs/company/{company_id}/jobs/` - Get jobs for company
  - **Response**: `[EnhancedJobSerializer]`

#### Company Forms
- **GET** `/api/v1/jobs/forms/` - List company forms
  - **Response**: `[CompanyFormSerializer]`

- **POST** `/api/v1/jobs/forms/` - Create company form
  - **Request Body**: Form data
  - **Response**: `CompanyFormSerializer`

- **GET** `/api/v1/jobs/forms/{uuid}/` - Get company form details
  - **Response**: `CompanyFormSerializer`

### Applicant Tracking System (ATS) (`/api/v1/jobs/ats/`)

#### Pipeline Management
- **GET** `/api/v1/jobs/ats/stages/` - List pipeline stages
  - **Response**: `[PipelineStageSerializer]`

- **POST** `/api/v1/jobs/ats/stages/` - Create pipeline stage
  - **Request Body**: Stage data
  - **Response**: `PipelineStageSerializer`

- **GET** `/api/v1/jobs/ats/pipelines/` - List recruitment pipelines
  - **Response**: `[RecruitmentPipelineSerializer]`

- **POST** `/api/v1/jobs/ats/pipelines/` - Create recruitment pipeline
  - **Request Body**: Pipeline data
  - **Response**: `RecruitmentPipelineSerializer`

#### Candidate Management
- **GET** `/api/v1/jobs/ats/candidates/` - List candidate cards
  - **Response**: `[CandidateCardSerializer]`

- **POST** `/api/v1/jobs/ats/candidates/` - Create candidate card
  - **Request Body**: Candidate data
  - **Response**: `CandidateCardSerializer`

#### Kanban Board
- **GET** `/api/v1/jobs/ats/board/` - Get Kanban board data
  - **Response**: `KanbanBoardSerializer`

- **POST** `/api/v1/jobs/ats/bulk-move/` - Bulk move candidates between stages
  - **Request Body**: `{candidate_ids: [...], to_stage_id: "...", notes: "..."}`
  - **Response**: `{"moved": N, "message": "..."}`

#### Shareable Links
- **GET** `/api/v1/jobs/ats/links/` - List shareable links
  - **Response**: `[ShareableLinkSerializer]`

- **POST** `/api/v1/jobs/ats/links/` - Create shareable link
  - **Request Body**: Link data
  - **Response**: `ShareableLinkSerializer`

- **GET** `/api/v1/jobs/ats/shared/{token}/` - Access shared ATS view
  - **Response**: Shared pipeline data

#### ATS Initialization
- **POST** `/api/v1/jobs/ats/initialize/` - Initialize ATS for job
  - **Request Body**: `{job_id: N}`
  - **Response**: `{"pipeline": {...}, "stages": [...], "candidates": [...]}`

### Company Management (`/api/v1/companies/`)

#### Company CRUD
- **GET** `/api/v1/companies/companies/` - List companies
  - **Response**: `[CompanySerializer]`

- **POST** `/api/v1/companies/companies/` - Create company
  - **Request Body**: Company data
  - **Response**: `CompanySerializer`

- **GET** `/api/v1/companies/companies/{pk}/` - Get company details
  - **Response**: `CompanySerializer`

- **PUT/PATCH** `/api/v1/companies/companies/{pk}/` - Update company
  - **Response**: `CompanySerializer`

- **DELETE** `/api/v1/companies/companies/{pk}/` - Delete company
  - **Response**: `{"message": "Company deleted successfully"}`

#### Company Lists & Stats
- **GET** `/api/v1/companies/companies/simple/` - Simple company list
  - **Response**: `[CompanyListSerializer]`

- **GET** `/api/v1/companies/companies/optimized/` - Optimized company list
  - **Response**: `[CompanyListSerializer]`

- **GET** `/api/v1/companies/companies/stats/` - Company statistics
  - **Response**: `[CompanyStatsSerializer]`

- **GET** `/api/v1/companies/company/{pk}/` - Get company by ID
  - **Response**: `CompanySerializer`

- **GET** `/api/v1/companies/company-list/` - Alternative company list
  - **Response**: `[CompanyListSerializer]`

#### Logo Management
- **POST** `/api/v1/companies/companies/{pk}/upload-logo/` - Upload company logo
  - **Request Body**: Logo file
  - **Response**: `{"logo_url": "...", "message": "..."}`

#### Company Following
- **GET** `/api/v1/companies/companies/{company_id}/followers/count/` - Get follower count
  - **Response**: `{"count": N}`

- **GET** `/api/v1/companies/companies/{company_id}/followers/status/` - Get follow status
  - **Response**: `{"is_following": boolean}`

- **POST** `/api/v1/companies/companies/{company_id}/followers/` - Follow/unfollow company
  - **Response**: `{"is_following": boolean, "message": "..."}`

- **GET** `/api/v1/companies/users/{user_id}/following/` - Get user's followed companies
  - **Response**: `[CompanySerializer]`

### Metrics & Caching (`/api/v1/`)

#### Cached Metrics
- **GET** `/api/v1/metrics/` - Get cached dashboard metrics
  - **Query Params**: `type=dashboard_stats`, `refresh=true/false`, `year=2024`
  - **Response**: Dashboard statistics data

- **GET** `/api/v1/metrics/application-timeline/` - Application timeline data
  - **Response**: Timeline data for charts

- **GET** `/api/v1/metrics/cache-status/` - Cache status information
  - **Response**: Cache performance data

#### Enhanced Student Metrics
- **GET** `/api/v1/metrics/students/enhanced/` - Enhanced student metrics
  - **Response**: Comprehensive student statistics

- **GET** `/api/v1/metrics/students/departments/` - Student department statistics
  - **Response**: Department-wise student counts

- **GET** `/api/v1/metrics/students/years/` - Student year statistics
  - **Response**: Year-wise student counts

- **GET** `/api/v1/metrics/students/performance/` - Student performance analytics
  - **Response**: Performance metrics and trends

#### Cached Lists
- **GET** `/api/v1/cached/companies/` - Cached company list with pagination
  - **Query Params**: `search`, `tier`, `industry`, `location`, `page`, `page_size`
  - **Response**: `{"count": N, "results": [CompanySerializer], "pagination": {...}}`

- **GET** `/api/v1/cached/students/` - Cached student list with pagination
  - **Query Params**: `search`, `branch`, `passout_year`, `page`, `page_size`
  - **Response**: `{"count": N, "results": [StudentProfileListSerializer], "pagination": {...}}`

- **GET** `/api/v1/cached/jobs/` - Cached job list with pagination
  - **Query Params**: `search`, `company`, `job_type`, `page`, `page_size`
  - **Response**: `{"count": N, "results": [EnhancedJobSerializer], "pagination": {...}}`

## Data Models

### User Model
```json
{
  "id": 1,
  "email": "student@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "user_type": "STUDENT"
}
```

### StudentProfile Model
```json
{
  "id": 1,
  "user": {...},
  "student_id": "CS2024001",
  "first_name": "John",
  "last_name": "Doe",
  "branch": "Computer Science",
  "passout_year": 2024,
  "joining_year": 2020,
  "cgpa": "8.5",
  "email": "john@example.com",
  "phone": "+1234567890",
  "address": "123 Main St",
  "city": "New York",
  "skills": "Python, JavaScript, React",
  "profile_image_url": "https://...",
  "resume_url": "https://...",
  "tenth_certificate_url": "https://...",
  "twelfth_certificate_url": "https://...",
  "semester_marksheets": [...],
  "semester_cgpas": [...],
  "is_frozen": false,
  "arrears": 0,
  "active_arrears": 0
}
```

### JobPosting Model
```json
{
  "id": 1,
  "title": "Software Engineer",
  "company_name": "Tech Corp",
  "company_id": 1,
  "description": "Job description...",
  "location": "New York",
  "job_type": "FULL_TIME",
  "salary_min": 50000.00,
  "salary_max": 80000.00,
  "application_deadline": "2024-12-31",
  "requirements": ["Python", "Django", "React"],
  "skills": ["Python", "JavaScript"],
  "benefits": ["Health Insurance", "Remote Work"],
  "is_active": true,
  "is_published": true,
  "interview_rounds": [...],
  "additional_fields": [...],
  "allowed_passout_years": [2024, 2025],
  "allowed_departments": ["CS", "IT"],
  "arrears_requirement": "NO_ARREARS_ALLOWED",
  "min_cgpa": 7.0
}
```

### JobApplication Model
```json
{
  "id": 1,
  "job_id": 1,
  "student_id": 1,
  "cover_letter": "Cover letter text...",
  "status": "PENDING",
  "additional_field_responses": {...},
  "applied_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### Company Model
```json
{
  "id": 1,
  "name": "Tech Corp",
  "slug": "tech-corp",
  "description": "Company description...",
  "logo": "https://...",
  "industry": "Technology",
  "location": "New York",
  "tier": "TIER1",
  "size": "500-1000",
  "founded": 2010,
  "website": "https://techcorp.com",
  "campus_recruiting": true,
  "total_active_jobs": 5,
  "total_applicants": 150,
  "total_hired": 12,
  "awaited_approval": 3
}
```

### ATS Models

#### PipelineStage Model
```json
{
  "id": "uuid",
  "name": "Technical Interview",
  "stage_type": "INTERVIEW",
  "description": "Technical assessment round",
  "order_index": 2,
  "color": "#FF6B6B",
  "is_active": true,
  "is_terminal": false,
  "organization_name": "DevCorp",
  "candidate_count": 15
}
```

#### CandidateCard Model
```json
{
  "id": "uuid",
  "candidate_name": "John Doe",
  "candidate_email": "john@example.com",
  "candidate_phone": "+1234567890",
  "candidate_id": "CS2024001",
  "candidate_avatar": "J",
  "job_title": "Software Engineer",
  "job_location": "New York",
  "company_name": "Tech Corp",
  "stage_name": "Technical Interview",
  "stage_color": "#FF6B6B",
  "time_in_stage": "2h",
  "applied_at": "2024-01-15T10:30:00Z",
  "resume_url": "https://...",
  "rating": 4,
  "tags": ["Python", "React"],
  "notes": "Strong candidate",
  "comment_count": 3
}
```

## Authentication

The API uses JWT (JSON Web Token) authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Pagination

List endpoints support pagination with the following query parameters:
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 10, max: 100)

Response format:
```json
{
  "count": 150,
  "next": "https://api.example.com/endpoint/?page=2",
  "previous": null,
  "results": [...]
}
```

## Error Responses

Standard HTTP status codes are used:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

Error response format:
```json
{
  "error": "Error message",
  "details": {...}
}
```

## File Upload

File uploads are supported for:
- Resumes (PDF, DOC, DOCX)
- Profile images (JPG, PNG)
- Certificates (PDF)
- Company logos (JPG, PNG)

Maximum file sizes and allowed formats are configured in settings.

## Health Checks

- **GET** `/health/` - Basic health check
- **GET** `/api/v1/metrics/cache-status/` - Cache health
- Database connectivity and API responsiveness are monitored

## Development Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run migrations:
   ```bash
   python manage.py migrate
   ```

3. Create superuser:
   ```bash
   python manage.py createsuperuser
   ```

4. Run development server:
   ```bash
   python manage.py runserver
   ```

## Production Deployment

- Use PostgreSQL for production database
- Configure proper file storage (AWS S3, etc.)
- Set up proper caching (Redis, etc.)
- Enable HTTPS and secure headers
- Configure CORS for frontend domain
- Set up monitoring and logging