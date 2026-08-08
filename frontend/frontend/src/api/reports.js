import { api } from "../api";

// Get all reports with optional filtering
export const getReports = async (params = {}) => {
  try {
    const response = await api.get("/reports", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching reports:", error);
    throw error;
  }
};

// Get a single report by ID
export const getReportById = async (reportId) => {
  try {
    const response = await api.get(`/reports/${reportId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching report:", error);
    throw error;
  }
};

// Create a new report
export const createReport = async (reportData) => {
  try {
    const response = await api.post("/reports", reportData);
    return response.data;
  } catch (error) {
    console.error("Error creating report:", error);
    throw error;
  }
};

// Update an existing report
export const updateReport = async (reportId, reportData) => {
  try {
    const response = await api.put(`/reports/${reportId}`, reportData);
    return response.data;
  } catch (error) {
    console.error("Error updating report:", error);
    throw error;
  }
};

// Delete a report
export const deleteReport = async (reportId) => {
  try {
    const response = await api.delete(`/reports/${reportId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting report:", error);
    throw error;
  }
};

// Get all scope tests for a sample
export const getSampleScopeTests = async (sampleId) => {
  try {
    const response = await api.get(`/reports/sample/${sampleId}/scope-tests`);
    return response.data;
  } catch (error) {
    console.error("Error fetching sample scope tests:", error);
    throw error;
  }
};

// Generate report automatically from observation entries
export const generateReport = async (sampleId) => {
  try {
    const response = await api.post("/reports/generate", { sample_id: sampleId });
    return response.data;
  } catch (error) {
    console.error("Error generating report:", error);
    throw error;
  }
};

// Approve report
export const approveReport = async (reportId, remarks) => {
  try {
    const response = await api.post(`/reports/${reportId}/approve`, { remarks });
    return response.data;
  } catch (error) {
    console.error("Error approving report:", error);
    throw error;
  }
};

// Reject report
export const rejectReport = async (reportId, remarks) => {
  try {
    const response = await api.post(`/reports/${reportId}/reject`, { remarks });
    return response.data;
  } catch (error) {
    console.error("Error rejecting report:", error);
    throw error;
  }
};

// Get Pending Observations submitted by Engineers/Helpers
export const getPendingObservations = async () => {
  try {
    const response = await api.get("/reports/pending-observations");
    return response.data;
  } catch (error) {
    console.error("Error fetching pending observations:", error);
    throw error;
  }
};

// Generate Report directly from an Observation Sheet ID
export const generateReportFromObservation = async (observationId) => {
  try {
    const response = await api.post(`/reports/generate-from-observation/${observationId}`);
    return response.data;
  } catch (error) {
    console.error("Error generating report from observation:", error);
    throw error;
  }
};

// Create report revision
export const createRevision = async (reportId, changeLog) => {
  try {
    const response = await api.post(`/reports/${reportId}/revision`, { change_log: changeLog });
    return response.data;
  } catch (error) {
    console.error("Error creating report revision:", error);
    throw error;
  }
};

// Upload attachment
export const uploadAttachment = async (reportId, formData) => {
  try {
    const response = await api.post(`/reports/${reportId}/attachments`, formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error uploading report attachment:", error);
    throw error;
  }
};

// Verify report QR hash
export const verifyQrHash = async (qrHash) => {
  try {
    const response = await api.get(`/reports/verify-qr/${qrHash}`);
    return response.data;
  } catch (error) {
    console.error("Error verifying QR hash:", error);
    throw error;
  }
};
