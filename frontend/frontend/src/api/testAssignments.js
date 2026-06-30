import api from "./axios";

// Assignment CRUD
export const createTestAssignment = (data) => api.post("/test-assignments/", data);
export const updateTestAssignment = (id, data) => api.put(`/test-assignments/${id}`, data);
export const deleteTestAssignment = (id) => api.delete(`/test-assignments/${id}`);
export const getAssignmentDetails = (id) => api.get(`/test-assignments/${id}`);

// List operations
export const getAssignmentsByProject = (projectId) => api.get(`/test-assignments/by-project/${projectId}`);
export const getAssignmentsBySample = (sampleId) => api.get(`/test-assignments/by-sample/${sampleId}`);

// Status operations
export const changeAssignmentStatus = (id, status, remarks = "") => 
  api.patch(`/test-assignments/${id}/status`, { status, remarks });

// Dashboard
export const getAssignmentDashboardSummary = (projectId = "") => 
  api.get("/test-assignments/dashboard-summary", { params: { project_id: projectId } });

// Helper
export const getAvailableTests = (sampleId) => api.get(`/test-assignments/available-tests/${sampleId}`);