import client from './client';

/**
 * ATS (Applicant Tracking System) API functions
 */

// Get Kanban board data
export function getKanbanBoard(params = {}) {
  return client.get('/api/v1/jobs/ats/board/', { params });
}

// Get pipeline stages
export function getPipelineStages(params = {}) {
  return client.get('/api/v1/jobs/ats/stages/', { params });
}

// Get recruitment pipelines
export function getRecruitmentPipelines(params = {}) {
  return client.get('/api/v1/jobs/ats/pipelines/', { params });
}

// Get candidate cards
export function getCandidateCards(params = {}) {
  return client.get('/api/v1/jobs/ats/candidates/', { params });
}

// Get single candidate card
export function getCandidateCard(candidateId) {
  return client.get(`/api/v1/jobs/ats/candidates/${candidateId}/`);
}

// Move candidate to different stage
export function moveCandidateStage(candidateId, data) {
  return client.post(`/api/v1/jobs/ats/candidates/${candidateId}/move_stage/`, data);
}

// Bulk move candidates
export function bulkMoveCandidates(data) {
  return client.post('/api/v1/jobs/ats/bulk-move/', data);
}

// Add comment to candidate
export function addCandidateComment(candidateId, data) {
  return client.post(`/api/v1/jobs/ats/candidates/${candidateId}/add_comment/`, data);
}

// Get candidate comments
export function getCandidateComments(candidateId) {
  return client.get(`/api/v1/jobs/ats/candidates/${candidateId}/comments/`);
}

// Get candidate stage history
export function getCandidateHistory(candidateId) {
  return client.get(`/api/v1/jobs/ats/candidates/${candidateId}/history/`);
}

// Generate shareable link
export function generateShareableLink(data) {
  return client.post('/api/v1/jobs/ats/links/generate_link/', data);
}

// Get shareable links
export function getShareableLinks() {
  return client.get('/api/v1/jobs/ats/links/');
}

// Access shared board (no auth required)
export function getSharedBoard(token) {
  return client.get(`/api/v1/jobs/ats/shared/${token}/`);
}

// Update shareable link
export function updateShareableLink(linkId, data) {
  return client.patch(`/api/v1/jobs/ats/links/${linkId}/`, data);
}

// Initialize ATS system
export function initializeATS(data = {}) {
  return client.post('/api/v1/jobs/ats/initialize/', data);
}

// Update candidate card
export function updateCandidateCard(candidateId, data) {
  return client.patch(`/api/v1/jobs/ats/candidates/${candidateId}/`, data);
}

// Create pipeline stage
export function createPipelineStage(data) {
  return client.post('/api/v1/jobs/ats/stages/', data);
}

// Create recruitment pipeline
export function createRecruitmentPipeline(data) {
  return client.post('/api/v1/jobs/ats/pipelines/', data);
}
