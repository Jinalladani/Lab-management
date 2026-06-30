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
