import axiosInstance from "./axios";

export const getLabInfo = async () => {
  try {
    const response = await axiosInstance.get("/labs/info");
    return response;
  } catch (error) {
    throw error;
  }
};

export const updateLabInfo = async (labData) => {
  try {
    const response = await axiosInstance.put("/labs/info", labData);
    return response;
  } catch (error) {
    throw error;
  }
};

export const getLabById = async (labId) => {
  try {
    const response = await axiosInstance.get(`/superadmin/labs/${labId}`);
    return response;
  } catch (error) {
    throw error;
  }
};

export const updateLab = async (labId, labData) => {
  try {
    const response = await axiosInstance.put(`/superadmin/labs/${labId}`, labData);
    return response;
  } catch (error) {
    throw error;
  }
};

export const getAllLabs = async () => {
  try {
    const response = await axiosInstance.get("/labs/all");
    return response;
  } catch (error) {
    throw error;
  }
};
