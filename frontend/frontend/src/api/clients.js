import api from "./axios";

export const getClients = (params = {}) => api.get("/clients", { params });

export const getClientById = (clientId) => api.get(`/clients/${clientId}`);

export const createClient = (payload) => api.post("/clients", payload);

export const updateClient = (clientId, payload) =>
  api.put(`/clients/${clientId}`, payload);

export const updateClientStatus = (clientId, payload) =>
  api.patch(`/clients/${clientId}/status`, payload);

export const deleteClient = (clientId) => api.delete(`/clients/${clientId}`);