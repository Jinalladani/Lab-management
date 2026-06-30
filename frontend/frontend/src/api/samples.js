import api from "./axios";

export const getSamples = (params = {}) => api.get("/samples", { params });

export const getSampleById = (id) => api.get(`/samples/${id}`);

export const createSample = (data) => api.post("/samples", data);

export const updateSample = (id, data) => api.put(`/samples/${id}`, data);

export const updateSampleStatus = (id, data) => api.patch(`/samples/${id}/status`, data);

export const deleteSample = (id) => api.delete(`/samples/${id}`);

export const getSampleTests = (id) => api.get(`/samples/${id}/tests`);

export const addSampleTest = (id, data) => api.post(`/samples/${id}/tests`, data);

export const updateSampleTest = (sampleId, testId, data) => api.put(`/samples/${sampleId}/tests/${testId}`, data);

export const deleteSampleTest = (sampleId, testId) => api.delete(`/samples/${sampleId}/tests/${testId}`);
