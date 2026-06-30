import api from "./axios";

export const getProjectDocuments = (projectId) => api.get(`/projects/${projectId}/documents`);

export const deleteProjectDocument = (projectId, docId) => api.delete(`/projects/${projectId}/documents/${docId}`);

export const uploadProjectDocument = (projectId, formData) => {
  const config = {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  };
  
  return api.post(`/projects/${projectId}/documents`, formData, config);
};

export const getDocumentDownloadUrl = (projectId, docId) => {
  // Get the base URL and add authentication token
  const token = localStorage.getItem('token');
  return `/api/projects/${projectId}/documents/${docId}/download${token ? `?token=${token}` : ''}`;
};

export const getDocumentViewUrl = (projectId, docId) => {
  // Get the base URL and add authentication token
  const token = localStorage.getItem('token');
  return `/api/projects/${projectId}/documents/${docId}/view${token ? `?token=${token}` : ''}`;
};
