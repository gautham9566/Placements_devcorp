# API Reference - Applications System

## 🎯 New API Functions Needed

### Frontend API File: `frontend/src/api/applications.js`

```javascript
import client from './client';

// Get all applications with filtering and pagination
export function getAllApplications(params = {}) {
  const queryParams = new URLSearchParams();
  
  if (params.page) queryParams.append('page', params.page);
  if (params.page_size) queryParams.append('page_size', params.page_size);
  if (params.status && params.status !== 'ALL') queryParams.append('status', params.status);
  if (params.company) queryParams.append('company', params.company);
  if (params.job_title) queryParams.append('job_title', params.job_title);
  if (params.student_name) queryParams.append('student_name', params.student_name);
  if (params.date_from) queryParams.append('date_from', params.date_from);
  if (params.date_to) queryParams.append('date_to', params.date_to);
  
  return client.get(`/api/v1/college/default-college/jobs/applications/?${queryParams}`);
}

// Get single application details
export function getApplicationById(applicationId) {
  return client.get(`/api/v1/college/default-college/jobs/applications/${applicationId}/`);
}

// Update application (status, notes, etc.)
export function updateApplication(applicationId, data) {
  return client.patch(`/api/v1/college/default-college/jobs/applications/${applicationId}/`, data);
}

// Delete application (soft delete)
export function deleteApplication(applicationId) {
  return client.delete(`/api/v1/college/default-college/jobs/applications/${applicationId}/`);
}

// Export applications
export function exportApplications(config) {
  return client.post('/api/v1/college/default-college/jobs/applications/export/', config, {
    responseType: 'blob'
  });
}

// Get available profile fields for form configuration
export function getProfileFields() {
  return client.get('/api/v1/college/default-college/jobs/applications/fields/');
}

// Bulk update applications
export function bulkUpdateApplications(applicationIds, updates) {
  return client.post('/api/v1/college/default-college/jobs/applications/bulk-update/', {
    application_ids: applicationIds,
    updates: updates
  });
}

// Get application statistics
export function getApplicationStats(filters = {}) {
  const queryParams = new URLSearchParams(filters);
  return client.get(`/api/v1/college/default-college/jobs/applications/stats/?${queryParams}`);
}
```

## 🔗 Backend URL Patterns

### Add to `backend/jobs/urls.py`:

```python
urlpatterns = [
    # ... existing patterns ...
    
    # Enhanced application management
    path('applications/', EnhancedApplicationsListView.as_view(), name='enhanced-applications-list'),
    path('applications/<int:pk>/', ApplicationDetailView.as_view(), name='application-detail'),
    path('applications/export/', ApplicationExportView.as_view(), name='applications-export'),
    path('applications/fields/', StudentProfileFieldsView.as_view(), name='profile-fields'),
    path('applications/bulk-update/', BulkApplicationUpdateView.as_view(), name='bulk-application-update'),
    path('applications/stats/', ApplicationStatsView.as_view(), name='application-stats'),
]
```

## 📊 API Response Formats

### Applications List Response:
```json
{
  "results": [
    {
      "id": 1,
      "job_title": "Software Engineer",
      "company_name": "Tech Corp",
      "student_name": "John Doe",
      "student_email": "john@example.com",
      "student_id": "CS2021001",
      "branch": "Computer Science",
      "status": "APPLIED",
      "applied_at": "2024-01-15T10:30:00Z",
      "profile_data": {
        "basic_info": {...},
        "academic_info": {...}
      },
      "custom_responses": {...}
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_count": 100,
    "has_next": true,
    "has_previous": false
  },
  "stats": {
    "total": 100,
    "by_status": [
      {"status": "APPLIED", "count": 45},
      {"status": "UNDER_REVIEW", "count": 30}
    ],
    "recent": 15
  }
}
```

### Profile Fields Response:
```json
{
  "default_fields": [
    {"key": "email", "label": "Email Address", "type": "email"},
    {"key": "university", "label": "School/University", "type": "text"},
    {"key": "twelfth_percentage", "label": "Intermediate Score", "type": "number"},
    {"key": "current_cgpa", "label": "Current CGPA", "type": "number"}
  ],
  "advanced_fields": [
    {"key": "student_id", "label": "Student ID", "type": "text"},
    {"key": "branch", "label": "Branch", "type": "text"},
    {"key": "skills", "label": "Skills", "type": "text"}
  ]
}
```

## 🔧 Integration Points

### Update existing job details page:
In `frontend/src/app/admin/jobs/[id]/page.jsx`, replace the non-functional "View Applications" button:

```jsx
// Replace existing button with:
<button 
  onClick={() => router.push(`/admin/applications?job_id=${jobId}`)}
  className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
>
  <Eye className="w-4 h-4 mr-2" />
  View Applications ({job.applications_count || 0})
</button>
```

This completes the API planning for the applications system! 