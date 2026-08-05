import axios from './axios';

export const rolesAPI = {
  // Get all roles
  getLabRoles: async () => {
    try {
      const response = await axios.get('/roles/list');
      return response.data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching roles:', error);
      }
      throw error;
    }
  },

  // Alias for getLabRoles
  getRoles: async () => {
    return rolesAPI.getLabRoles();
  },

  // Get specific role details
  getRoleById: async (roleId) => {
    try {
      const response = await axios.get(`/roles/${roleId}`);
      return response.data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Error fetching role ${roleId}:`, error);
      }
      throw error;
    }
  },

  // Create a new role
  createRole: async (roleData) => {
    try {
      const response = await axios.post('/roles', roleData);
      return response.data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error creating role:', error);
      }
      throw error;
    }
  },

  // Update an existing role
  updateRole: async (roleId, roleData) => {
    try {
      const response = await axios.put(`/roles/${roleId}`, roleData);
      return response.data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Error updating role ${roleId}:`, error);
      }
      throw error;
    }
  },

  // Delete a role
  deleteRole: async (roleId) => {
    try {
      const response = await axios.delete(`/roles/${roleId}`);
      return response.data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Error deleting role ${roleId}:`, error);
      }
      throw error;
    }
  }
};

