import api from "./axios";

export const getSampleEntries = (params = {}) => api.get("/sample-entries/", { params });

export const getSampleEntryById = (id) => api.get(`/sample-entries/${id}`);

export const createSampleEntry = (data) => api.post("/sample-entries/", data);

export const updateSampleEntry = (id, data) => api.put(`/sample-entries/${id}`, data);

export const deleteSampleEntry = (id) => api.delete(`/sample-entries/${id}`);

export const getSampleEntryImages = (id) => api.get(`/sample-entries/${id}/images`);

export const addSampleEntryImage = (id, data) => api.post(`/sample-entries/${id}/images`, data);

export const deleteSampleEntryImage = (id, imageId) => api.delete(`/sample-entries/${id}/images/${imageId}`);
