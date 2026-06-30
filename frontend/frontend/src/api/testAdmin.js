import axiosInstance from "./axios";

export const testLabAdmin = async (labId) => {
  try {
    const response = await axiosInstance.get(`/superadmin/labs/${labId}/admin`);
    return response;
  } catch (error) {
    throw error;
  }
};
