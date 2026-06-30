import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { rolesAPI } from "../../api/roles";
import { usersAPI } from "../../api/users";
import { MainLayout } from "../../components/layout";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const EditUser = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [loading, setLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [roles, setRoles] = useState([]);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role_id: "",
    is_active: true
  });

  const [originalData, setOriginalData] = useState({});

  useEffect(() => {
    fetchRoles();
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  const fetchRoles = async () => {
    try {
      setRolesLoading(true);
      const response = await rolesAPI.getLabRoles();
      setRoles(response.data?.roles?.filter(role => role.role_name !== "super_admin") || []);
    } catch (error) {
      console.error("Failed to fetch roles:", error);
      setErrorMessage("Failed to load roles");
    } finally {
      setRolesLoading(false);
    }
  };

  const fetchUserData = async () => {
    try {
      setUserLoading(true);
      // TODO: Create getUser API endpoint
      // For now, we'll use a mock user data
      const mockUser = {
        user_id: userId,
        first_name: "John",
        last_name: "Doe",
        email: "john.doe@example.com",
        phone: "1234567890",
        role_id: "1",
        is_active: true
      };
      
      setFormData(mockUser);
      setOriginalData(mockUser);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
      setErrorMessage("Failed to load user data");
    } finally {
      setUserLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = "First name is required";
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = "Last name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.role_id) {
      newErrors.role_id = "Role is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!validateForm()) return;

    try {
      setLoading(true);
      
      const userData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone || null,
        role_id: formData.role_id,
        is_active: formData.is_active
      };

      // TODO: Create updateUser API endpoint
      // const response = await usersAPI.updateUser(userId, userData);
      
      // Mock successful update
      const response = { success: true, message: "User updated successfully!" };
      
      if (response.success) {
        setSuccessMessage("User updated successfully!");
        setOriginalData(formData);
        
        // Redirect to users list after 2 seconds
        setTimeout(() => {
          navigate("/users");
        }, 2000);
      } else {
        setErrorMessage(response.message || "Failed to update user");
      }
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message || "Failed to update user"
      );
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = () => {
    return JSON.stringify(formData) !== JSON.stringify(originalData);
  };

  if (userLoading) {
    return (
      <MainLayout headerTitle="Edit User" headerSubtitle="Loading user data...">
        <div className="p-6 flex justify-center items-center">
          <div className="text-gray-500">Loading user information...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout headerTitle="Edit User" headerSubtitle="Update user information">
      <div className="p-6">
        {/* Back Button */}
        <button
          onClick={() => navigate("/users")}
          className="mb-4 flex items-center gap-2 text-[#2d66b3] font-medium hover:text-[#1f5498] transition-colors"
        >
          <ArrowBackIcon fontSize="small" />
          Back
        </button>
        
        <div className="w-full">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Success Message */}
            {successMessage && (
              <div className="bg-green-50 border-l-4 border-green-400 p-4 m-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">{successMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 m-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{errorMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Form Section */}
            <div className="p-8">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Basic Info */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Personal Information */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                      Personal Information
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">First Name *</label>
                        <input
                          type="text"
                          name="first_name"
                          value={formData.first_name}
                          onChange={handleChange}
                          className={`w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent ${
                            errors.first_name ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter first name"
                        />
                        {errors.first_name && (
                          <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
                        )}
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">Last Name *</label>
                        <input
                          type="text"
                          name="last_name"
                          value={formData.last_name}
                          onChange={handleChange}
                          className={`w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent ${
                            errors.last_name ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter last name"
                        />
                        {errors.last_name && (
                          <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block mb-2 text-sm font-medium text-gray-700">Email Address *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent ${
                          errors.email ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter email address"
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                      )}
                    </div>

                    <div className="mt-4">
                      <label className="block mb-2 text-sm font-medium text-gray-700">Phone Number</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column - Account & Status */}
                <div className="space-y-6">
                  {/* Account Information */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                      Account Information
                    </h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">Role *</label>
                        <select
                          name="role_id"
                          value={formData.role_id}
                          onChange={handleChange}
                          className={`w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent ${
                            errors.role_id ? 'border-red-500' : 'border-gray-300'
                          }`}
                          disabled={rolesLoading}
                        >
                          <option value="">
                            {rolesLoading ? "Loading roles..." : "Select a role"}
                          </option>
                          {roles.map((role) => (
                            <option key={role.role_id} value={role.role_id}>
                              {role.role_name}
                            </option>
                          ))}
                        </select>
                        {errors.role_id && (
                          <p className="mt-1 text-sm text-red-600">{errors.role_id}</p>
                        )}
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <svg className="h-5 w-5 text-blue-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <h4 className="text-sm font-medium text-blue-800">Account Settings</h4>
                            <p className="text-xs text-blue-700 mt-1">
                              Update user role and permissions. Password changes require separate action.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* User Status */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                      User Status
                    </h2>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">Active User</label>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            name="is_active"
                            id="is_active"
                            checked={formData.is_active}
                            onChange={handleChange}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#2b63ae] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2b63ae]"></div>
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">
                        Active users can log in and access the system
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="lg:col-span-3 mt-8">
                  <div className="flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => navigate("/users")}
                      className="px-6 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || rolesLoading || !hasChanges()}
                      className="px-8 py-3 rounded-lg bg-gradient-to-r from-[#2b63ae] to-[#1e4a8c] text-white font-medium hover:from-[#1e4a8c] hover:to-[#2b63ae] transition-all disabled:opacity-70 shadow-lg"
                    >
                      {loading ? "Updating User..." : "Update User"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default EditUser;
