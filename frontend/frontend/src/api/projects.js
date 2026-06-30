import api from "./axios";

export const getProjects = (params = {}) => api.get("/projects", { params });

export const getProjectById = (projectId) => api.get(`/projects/${projectId}`);

export const getProjectPreview = (projectId) => api.get(`/projects/${projectId}/preview`);

export const createProject = (payload) => {
  // For FormData, don't set any headers to let axios handle it automatically
  // The axios interceptor will add the Authorization token
  const config = payload instanceof FormData 
    ? {} 
    : { headers: { 'Content-Type': 'application/json' } };
  
  return api.post("/projects", payload, config);
};

export const updateProject = (projectId, payload) => {
  // For FormData, don't set any headers to let axios handle it automatically
  // The axios interceptor will add the Authorization token
  const config = payload instanceof FormData 
    ? {} 
    : { headers: { 'Content-Type': 'application/json' } };
  
  return api.put(`/projects/${projectId}`, payload, config);
};

export const updateProjectStatus = (projectId, payload) =>
  api.patch(`/projects/${projectId}/status`, payload);

export const deleteProject = (projectId) => api.delete(`/projects/${projectId}`);

// Document operations
export const downloadProjectDocument = (projectId, docId) => 
  api.get(`/projects/${projectId}/documents/${docId}/download`, { responseType: 'blob' });

export const viewProjectDocument = (projectId, docId) => 
  api.get(`/projects/${projectId}/documents/${docId}/view`);

export const deleteProjectDocument = (projectId, docId) => 
  api.delete(`/projects/${projectId}/documents/${docId}`);

// Project scope tests
export const getProjectScopes = (projectId) => api.get(`/projects/${projectId}/scopes`);

// Project registration / job number
export const getProjectRegistration = (projectId) =>
  api.get(`/project-registration/${projectId}`);

export const createProjectRegistration = (payload) =>
  api.post("/project-registration", payload);

export const updateProjectRegistration = (projectId, payload) =>
  api.put(`/project-registration/${projectId}`, payload);

