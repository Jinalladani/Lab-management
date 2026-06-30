import api from "./axios";

export const getObservationTemplates = () => api.get("/observation-builder/templates");

export const getObservationTemplate = (id) => api.get(`/observation-builder/templates/${id}`);

export const createObservationTemplate = (data) => api.post("/observation-builder/templates", data);

export const updateObservationTemplate = (id, data) => api.put(`/observation-builder/templates/${id}`, data);

export const deleteObservationTemplate = (id) => api.delete(`/observation-builder/templates/${id}`);
