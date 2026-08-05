import api from "./axios";

// Assignment CRUD
export const createTestAssignment = (data) => api.post("/test-assignments/", data);
export const updateTestAssignment = (id, data) => api.put(`/test-assignments/${id}`, data);
export const deleteTestAssignment = (id) => api.delete(`/test-assignments/${id}`);
export const getAssignmentDetails = (id) => api.get(`/test-assignments/${id}`);

// Eligibility & Selection Operations (v3)
export const getEligibleReceipts = (projectId) => 
  api.get("/test-assignments/eligible-receipts", { params: { project_id: projectId } });

export const getExistingTestingSamples = (params = {}) => 
  api.get("/test-assignments/existing-testing-samples", { params });

export const getProjectScopeTests = (projectId) => 
  api.get("/test-assignments/project-scope-tests", { params: { project_id: projectId } });

export const previewBulkAssignment = (payload) => 
  api.post("/test-assignments/preview", payload);

export const createBulkAssignments = (payload) => 
  api.post("/test-assignments/bulk-create", payload);

// Legacy exports for backward compatibility
export const getEligibleSamples = (projectId) => 
  api.get("/test-assignments/eligible-samples", { params: { project_id: projectId } });

export const getEligibleTests = (projectId, sampleIds = []) => 
  api.post("/test-assignments/eligible-tests", { project_id: projectId, sample_ids: sampleIds });

export const getAvailableTests = (sampleId) => 
  api.get(`/test-assignments/available-tests/${sampleId}`);

// List operations
export const getAssignmentsList = (params = {}) => 
  api.get("/test-assignments/", { params });

export const getAssignmentsByProject = (projectId, params = {}) => 
  api.get(`/test-assignments/by-project/${projectId}`, { params });

export const getAssignmentsBySample = (sampleId) => 
  api.get(`/test-assignments/by-sample/${sampleId}`);

// Status operations
export const changeAssignmentStatus = (id, status, remarks = "") => 
  api.patch(`/test-assignments/${id}/status`, { status, remarks });

// Dashboard
export const getAssignmentDashboardSummary = (projectId = "") => 
  api.get("/test-assignments/dashboard-summary", { params: { project_id: projectId } });