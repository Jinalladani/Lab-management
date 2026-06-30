import api from "./axios";

// Fetch all saved observation log sheets from database
export const getSampleObservations = (params = {}) => api.get("/sample-observations", { params });

// Retrieve details of a specific observation log by ID
export const getSampleObservation = (id) => api.get(`/sample-observations/${id}`);

// Register a new logged observation entry
export const createSampleObservation = (payload) => api.post("/sample-observations", payload);

// Update cell contents or status of an existing logged sheet
export const updateSampleObservation = (id, payload) => api.put(`/sample-observations/${id}`, payload);

// Delete an observation record
export const deleteSampleObservation = (id) => api.delete(`/sample-observations/${id}`);
