import axios from './axios';

export const rolesAPI = {
  // Get all roles for the current lab
  getLabRoles: async () => {
    try {
      const response = await axios.get('/roles/list');
      return response.data;
    } catch (error) {
      // Log error in development only
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching lab roles:', error);
      }
      throw error;
    }
  }
};
