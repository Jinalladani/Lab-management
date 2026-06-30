import api from "./axios";

export const getScopeGroups = (params = {}) => api.get("/scope/groups", { params });

export const getScopeMaterials = (params = {}) => api.get("/scope/materials", { params });

export const getScopeTests = (params = {}) => api.get("/scope/tests", { params });

export const getScopeHierarchy = (params = {}) => api.get("/scope/hierarchy", { params });

export const createScopeGroup = (data) => api.post("/scope/groups", data);

export const createScopeMaterial = (data) => api.post("/scope/materials", data);

export const createScopeTest = (data) => api.post("/scope/tests", data);

export const createCompleteScope = (data) => api.post("/scope/complete", data);

export const importMultipleScopes = (formData) => api.post("/scope/import", formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});
