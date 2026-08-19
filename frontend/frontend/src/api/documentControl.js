import api from "./axios";

// 1. NABL References API (Super Admin Managed)
export const getNablReferencesApi = (params) => api.get("/document-control/nabl-references", { params });
export const getSingleNablReferenceApi = (refId) => api.get(`/document-control/nabl-references/${refId}`);
export const addNablReferenceApi = (data) => api.post("/document-control/nabl-references", data);
export const updateNablReferenceApi = (refId, data) => api.put(`/document-control/nabl-references/${refId}`, data);
export const addNablAmendmentApi = (refId, data) => api.post(`/document-control/nabl-references/${refId}/amendment`, data);
export const archiveNablReferenceApi = (refId) => api.put(`/document-control/nabl-references/${refId}/archive`);
export const deleteNablReferenceApi = (refId) => api.delete(`/document-control/nabl-references/${refId}`);

// 2. Lab Documents API (Lab Scoped)
export const getLabDocumentsApi = (params) => api.get("/document-control/lab-documents", { params });
export const getSingleLabDocumentApi = (docId) => api.get(`/document-control/lab-documents/${docId}`);
export const addLabDocumentApi = (data) => api.post("/document-control/lab-documents", data);
export const updateLabDocumentApi = (docId, data) => api.put(`/document-control/lab-documents/${docId}`, data);
export const createLabDocumentRevisionApi = (docId, data) => api.post(`/document-control/lab-documents/${docId}/revision`, data);
export const archiveLabDocumentApi = (docId) => api.put(`/document-control/lab-documents/${docId}/archive`);
export const markLabDocumentObsoleteApi = (docId) => api.put(`/document-control/lab-documents/${docId}/obsolete`);
export const deleteLabDocumentApi = (docId) => api.delete(`/document-control/lab-documents/${docId}`);

// 3. Document Categories API
export const getDocumentCategoriesApi = (params) => api.get("/document-control/categories", { params });
export const addDocumentCategoryApi = (data) => api.post("/document-control/categories", data);
export const updateDocumentCategoryApi = (catId, data) => api.put(`/document-control/categories/${catId}`, data);
export const toggleDocumentCategoryStatusApi = (catId) => api.put(`/document-control/categories/${catId}/toggle-status`);
export const deleteDocumentCategoryApi = (catId) => api.delete(`/document-control/categories/${catId}`);

// 4. Approvals, Acknowledgements & Audit Logs API
export const getAuditTrailApi = (params) => api.get("/document-control/audit-trail", { params });
export const getObsoleteDocumentsApi = (params) => api.get("/document-control/obsolete-documents", { params });
export const getReviewDueDocumentsApi = (params) => api.get("/document-control/review-due", { params });
export const getReviewApprovalsApi = (params) => api.get("/document-control/review-approvals", { params });
export const approveDocumentApi = (docId, data) => api.post(`/document-control/lab-documents/${docId}/approvals`, { ...data, action: "Approved" });
export const rejectDocumentApi = (docId, data) => api.post(`/document-control/lab-documents/${docId}/approvals`, { ...data, action: "Rejected", comments: data?.rejection_reason || data?.comments });
export const getStaffAcknowledgementsApi = (params) => api.get("/document-control/staff-acknowledgements", { params });
export const acknowledgeDocumentApi = (ackId, data) => api.post(`/document-control/acknowledgements/${ackId}/acknowledge`, data);
export const addDocumentApprovalApi = (docId, data) => api.post(`/document-control/lab-documents/${docId}/approvals`, data);
export const addDocumentAcknowledgementApi = (docId, data) => api.post(`/document-control/lab-documents/${docId}/acknowledgements`, data);
export const getDocumentAuditLogsApi = (docId) => api.get(`/document-control/lab-documents/${docId}/audit-logs`);
