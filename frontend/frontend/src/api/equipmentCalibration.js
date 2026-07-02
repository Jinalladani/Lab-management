import api from "./axios";

// 1. Equipment & Locations APIs
export const getEquipmentList = async (filters = {}) => {
  const response = await api.get("/equipment/list", { params: filters });
  return response.data;
};

export const createEquipment = async (data) => {
  const response = await api.post("/equipment/create", data);
  return response.data;
};

export const getEquipmentDetails = async (id) => {
  const response = await api.get(`/equipment/view/${id}`);
  return response.data;
};

export const updateEquipment = async (id, data) => {
  const response = await api.put(`/equipment/update/${id}`, data);
  return response.data;
};

export const deleteEquipment = async (id) => {
  const response = await api.delete(`/equipment/delete/${id}`);
  return response.data;
};

export const getLocationsList = async () => {
  const response = await api.get("/equipment/locations");
  return response.data;
};

export const createLocation = async (data) => {
  const response = await api.post("/equipment/locations/create", data);
  return response.data;
};

// 2. Calibration & Maintenance APIs
export const getCalibrationDashboard = async () => {
  const response = await api.get("/calibration/dashboard");
  return response.data;
};

export const getCalibrationList = async (filters = {}) => {
  const response = await api.get("/calibration/list", { params: filters });
  return response.data;
};

export const createCalibration = async (data) => {
  const response = await api.post("/calibration/create", data);
  return response.data;
};

export const getMaintenanceList = async (filters = {}) => {
  const response = await api.get("/calibration/maintenance/list", { params: filters });
  return response.data;
};

export const createMaintenance = async (data) => {
  const response = await api.post("/calibration/maintenance/create", data);
  return response.data;
};

// 3. Document Attachment Upload APIs
export const uploadEquipmentDocument = async (eqId, fileData) => {
  const response = await api.post(`/equipment/${eqId}/documents`, fileData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return response.data;
};

export const getEquipmentDocuments = async (eqId) => {
  const response = await api.get(`/equipment/${eqId}/documents`);
  return response.data;
};

export const deleteEquipmentDocument = async (docId) => {
  const response = await api.delete(`/equipment/documents/delete/${docId}`);
  return response.data;
};
