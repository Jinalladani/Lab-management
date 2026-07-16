import api from "./axios";

const baseUrl = "/superadmin/observation-templates";

export const observationTemplatesApi = {
  list: (params) => api.get(baseUrl, { params }),
  options: () => api.get(`${baseUrl}/options`),
  get: (id) => api.get(`${baseUrl}/${id}`),
  create: (payload) => api.post(baseUrl, payload),
  update: (id, payload) => api.put(`${baseUrl}/${id}`, payload),
  duplicate: (id) => api.post(`${baseUrl}/${id}/duplicate`),
  publish: (id) => api.post(`${baseUrl}/${id}/publish`),
  archive: (id) => api.post(`${baseUrl}/${id}/archive`),
  restore: (id) => api.post(`${baseUrl}/${id}/restore`),
  remove: (id) => api.delete(`${baseUrl}/${id}`),
  getBuilder: (id) => api.get(`${baseUrl}/${id}/builder`),
  saveBuilder: (id, payload) => api.put(`${baseUrl}/${id}/builder`, payload),
  masters: {
    list: (kind, params) => api.get(`${baseUrl}/masters/${kind}`, { params }),
    create: (kind, payload) => api.post(`${baseUrl}/masters/${kind}`, payload),
    update: (kind, id, payload) => api.put(`${baseUrl}/masters/${kind}/${id}`, payload),
    remove: (kind, id) => api.delete(`${baseUrl}/masters/${kind}/${id}`),
  },
};
