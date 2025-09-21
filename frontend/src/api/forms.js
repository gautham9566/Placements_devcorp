import client from './client';

// Get all forms (admin only)
export function getForms() {
  return client.get('/api/v1/jobs/forms/');
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
  // Try using a dedicated delete endpoint with the ID in the URL
  return client.post(`/api/v1/jobs/forms/${formId}/delete/`);
}

// Removed the second updateForm function







