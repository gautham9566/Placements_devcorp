# DevCorp-backend
#  Job Portal API Documentation

This document lists all available API endpoints for the Job Portal system, along with sample requests and responses.

---

## Authentication

### 1. Student Registration

**POST** `/api/auth/register/student/`

Registers a new student.

**Request Body:**

```json
{
  "email": "john@student.com",
  "password": "securePass123",
  "first_name": "John",
  "last_name": "Doe",
  "student_id": "STU123",
  "contact_email": "john.doe@gmail.com",
  "branch": "CSE",
  "gpa": "9.1",
  "college": 1
}
```

**Response:**

```json
{
  "message": "Student registered successfully."
}
```

---

### 2. Login

**POST** `/api/auth/login/`

Returns JWT tokens and user info.

**Request Body:**

```json
{
  "email": "john@student.com",
  "password": "securePass123"
}
```

**Response:**

```json
{
  "refresh": "<refresh_token>",
  "access": "<access_token>",
  "user": {
    "id": 1,
    "email": "john@student.com",
    "first_name": "John",
    "last_name": "Doe",
    "user_type": "STUDENT"
  }
}
```

---

### 3. Refresh Token

**POST** `/api/auth/token/refresh/`

**Request Body:**

```json
{
  "refresh": "<refresh_token>"
}
```

**Response:**

```json
{
  "access": "<new_access_token>"
}
```

---

## Profile

### 4. Get Profile

**GET** `/api/auth/profile/`

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "id": 1,
  "user": {
    "id": 1,
    "email": "john@student.com",
    "first_name": "John",
    "last_name": "Doe",
    "user_type": "STUDENT"
  },
  "first_name": "John",
  "last_name": "Doe",
  "education": null,
  "skills": null,
  "resume": null,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

---

### 5. Upload Resume

**PATCH** `/api/auth/profile/`

**Headers:**

```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Body (form-data):**

* `resume`: (file upload)

**Response:**

```json
{
  "message": "Resume uploaded successfully."
}
```

---

##  Employer Profile

### 6. Get Employer Profile

**GET** `/api/auth/employer/profile/`

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "id": 1,
  "user": {
    "id": 2,
    "email": "employer@example.com",
    "first_name": "",
    "last_name": "",
    "user_type": "EMPLOYER"
  },
  "company_name": "TechCorp",
  "industry": "Software",
  "location": "Bangalore",
  "website": "https://techcorp.com",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

---

## Job Postings

All job posting routes are prefixed by:

```
/api/v1/college/<college-slug>/jobs/
```

### 7. List Jobs

**GET** `/api/v1/college/amrita/jobs/`

**Response:**

```json
[
  {
    "id": 1,
    "title": "Backend Intern",
    "location": "Remote",
    "job_type": "INTERNSHIP",
    "employer_name": "employer@example.com",
    "salary_min": 10000.0,
    "salary_max": 15000.0,
    "application_deadline": "2025-06-30",
    "is_active": true
  }
]
```

---

### 8. Create Job Posting

**POST** `/api/v1/college/amrita/jobs/create/`

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "title": "Backend Intern",
  "description": "Develop backend APIs",
  "location": "Remote",
  "job_type": "INTERNSHIP",
  "salary_min": 10000.00,
  "salary_max": 15000.00,
  "required_skills": "Python, Django",
  "application_deadline": "2025-06-30",
  "is_active": true,
  "on_campus": false
}
```

**Response:**

```json
{
  "id": 1,
  "title": "Backend Intern",
  "description": "Develop backend APIs",
  "location": "Remote",
  "job_type": "INTERNSHIP",
  "salary_min": "10000.00",
  "salary_max": "15000.00",
  "required_skills": "Python, Django",
  "application_deadline": "2025-06-30",
  "is_active": true,
  "on_campus": false
}
```

---

### 9. Update Job Posting

**PUT** `/api/v1/college/amrita/jobs/1/update/`

(Same input/output as Create Job Posting)

---

### 10. Delete Job Posting

**DELETE** `/api/v1/college/amrita/jobs/1/delete/`

**Response:**

```
204 No Content
```

---

##Job Applications

### 11. Apply to a Job

**POST** `/api/v1/college/amrita/jobs/1/apply/`

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "cover_letter": "I am excited to apply for this position."
}
```

**Response:**

```json
{
  "id": 5,
  "job": 1,
  "job_title": "Backend Intern",
  "applicant": {
    "id": 1,
    "email": "john@student.com",
    "first_name": "John",
    "last_name": "Doe",
    "user_type": "STUDENT"
  },
  "cover_letter": "I am excited to apply for this position.",
  "status": "APPLIED",
  "applied_at": "2025-05-21T14:00:00Z",
  "updated_at": "2025-05-21T14:00:00Z"
}
```

---

### 12. List Applied Jobs (Student)

**GET** `/api/v1/college/amrita/jobs/applied/`

Returns a list of jobs that the authenticated student has applied to.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:**

```json
[
  {
    "id": 5,
    "job": {
      "id": 1,
      "title": "Backend Intern",
      "location": "Remote",
      "job_type": "INTERNSHIP",
      "employer_name": "employer@example.com"
    },
    "cover_letter": "I am excited to apply for this position.",
    "status": "APPLIED",
    "applied_at": "2025-05-21T14:00:00Z",
    "updated_at": "2025-05-21T14:00:00Z"
  }
]
```

---

## Resume Management

### 6a. Get All Resumes

**GET** `/api/accounts/profiles/me/resumes/`

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "id": 1,
  "name": "Software_Engineer_Resume.pdf",
  "file_name": "Software_Engineer_Resume.pdf",
  "resume_url": "/media/resumes/Software_Engineer_Resume.pdf",
  "uploaded_at": "2024-01-15T10:30:00Z",
  "file_size": 245760
}
```

---

### 6b. Delete Resume

**DELETE** `/api/accounts/profiles/me/resumes/{resume_id}/`

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "message": "Resume deleted successfully."
}
```

---

##  Notes

* All job routes require `college-slug`, e.g., `/api/v1/college/amrita/jobs/`
* Use JWT tokens in `Authorization` headers.
* `resume` field uploads in either profile or during application is required to apply.

---




