import client from './client';

const buildFormsQuery = (params = {}) => {
  const queryParams = new URLSearchParams();

  const {
    status,
    submitted,
    company,
    company_name,
    search,
    ordering,
    limit,
    page,
    page_size,
  } = params;

  if (status) {
    const statusValue = Array.isArray(status) ? status.join(',') : status;
    if (statusValue) {
      queryParams.set('status', statusValue);
    }
  }

  if (submitted !== undefined && submitted !== null) {
    queryParams.set('submitted', submitted ? 'true' : 'false');
  }

  const companyFilter = company || company_name;
  if (companyFilter) {
    queryParams.set('company', companyFilter);
  }

  if (search) {
    queryParams.set('search', search);
  }

  if (ordering) {
    queryParams.set('ordering', ordering);
  }

  if (limit) {
    queryParams.set('page_size', limit);
  }

  if (page_size) {
    queryParams.set('page_size', page_size);
  }

  if (page) {
    queryParams.set('page', page);
  }

  return queryParams.toString();
};

// Get forms with optional filters
export function getForms(params = {}) {
  const queryString = buildFormsQuery(params);
  const url = `/api/v1/jobs/forms/${queryString ? `?${queryString}` : ''}`;
  return client.get(url);
}

// Get forms by status
export function getFormsByStatus(status, params = {}) {
  return getForms({ ...params, status });
}

// Get submitted forms
export function getSubmittedForms(params = {}) {
  return getForms({ ...params, submitted: true });
}

// Get forms for a specific company name (case-insensitive)
export function getFormsForCompany(companyName, params = {}) {
  if (!companyName) {
    return Promise.resolve({ data: [] });
  }
  return getForms({ ...params, company: companyName });
}

// Create a new form
export function createForm(formData) {
  return client.post('/api/v1/jobs/forms/', formData);
}

// Get a specific form by ID
export function getFormById(formId) {
  return client.get(`/api/v1/jobs/forms/${formId}/`);
}

// Update a form
export function updateForm(formId, formData) {
  return client.patch(`/api/v1/jobs/forms/${formId}/`, formData);
}

// Delete a form
export function deleteForm(formId) {
  return client.delete(`/api/v1/jobs/forms/${formId}/`);
}

// Approve a form
export function approveForm(formId) {
  return client.post(`/api/v1/jobs/forms/${formId}/approve/`);
}

// Reject a form
export function rejectForm(formId) {
  return client.post(`/api/v1/jobs/forms/${formId}/reject/`);
}

// Convert form to job
export function convertFormToJob(formId) {
  return client.post(`/api/v1/jobs/forms/${formId}/convert_to_job/`);
}







