import axios from './axios';

export const usersAPI = {
  // Get all users for the current lab
  getLabUsers: async () => {
    try {
      const response = await axios.get('/users/list');
      return response.data;
    } catch (error) {
      // Log error in development only
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching lab users:', error);
      }
      throw error;
    }
  },

  // Create a new user
  createUser: async (userData) => {
    try {
      const response = await axios.post('/users/create', userData);
      return response.data;
    } catch (error) {
      // Log error in development only
      if (process.env.NODE_ENV === 'development') {
        console.error('Error creating user:', error);
      }
      throw error;
    }
  }
};
