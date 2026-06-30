import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "../../../components/layout";
import { api } from "../../../api";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import BusinessIcon from "@mui/icons-material/Business";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import LocationOnIcon from "@mui/icons-material/LocationOn";

const AddLab = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    lab_name: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postal_code: "",
    description: "",
    status: "active",
    admin_first_name: "",
    admin_last_name: "",
    admin_email: "",
    admin_phone: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const resetForm = () => {
    setFormData({
      lab_name: "",
      contact_email: "",
      contact_phone: "",
      address: "",
      city: "",
      state: "",
      country: "",
      postal_code: "",
      description: "",
      status: "active",
      admin_first_name: "",
      admin_last_name: "",
      admin_email: "",
      admin_phone: "",
    });
    setErrors({});
    setErrorMessage("");
    setSuccessMessage("");
    setSuccess(false);
  };

  const handleCancel = () => {
    if (window.confirm("Are you sure you want to cancel? All entered data will be lost.")) {
      navigate("/labs/manage");
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.lab_name.trim()) {
      newErrors.lab_name = 'Lab name is required';
    } else if (formData.lab_name.trim().length < 2) {
      newErrors.lab_name = 'Lab name must be at least 2 characters long';
    }

    if (!formData.contact_email.trim()) {
      newErrors.contact_email = 'Contact email is required';
    } else if (!validateEmail(formData.contact_email)) {
      newErrors.contact_email = 'Please enter a valid contact email';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    } else if (formData.address.trim().length < 5) {
      newErrors.address = 'Address must be at least 5 characters long';
    }

    // Admin validation
    if (!formData.admin_first_name.trim()) {
      newErrors.admin_first_name = 'Admin first name is required';
    } else if (formData.admin_first_name.trim().length < 2) {
      newErrors.admin_first_name = 'Admin first name must be at least 2 characters long';
    }

    if (!formData.admin_last_name.trim()) {
      newErrors.admin_last_name = 'Admin last name is required';
    } else if (formData.admin_last_name.trim().length < 2) {
      newErrors.admin_last_name = 'Admin last name must be at least 2 characters long';
    }

    if (!formData.admin_email.trim()) {
      newErrors.admin_email = 'Admin email is required';
    } else if (!validateEmail(formData.admin_email)) {
      newErrors.admin_email = 'Please enter a valid admin email';
    }

    // Phone validation (optional)
    if (formData.contact_phone && formData.contact_phone.trim()) {
      const phoneRegex = /^[+]?[\d\s\-\(\)]+$/;
      if (!phoneRegex.test(formData.contact_phone.trim())) {
        newErrors.contact_phone = 'Please enter a valid contact phone number';
      }
    }

    if (formData.admin_phone && formData.admin_phone.trim()) {
      const phoneRegex = /^[+]?[\d\s\-\(\)]+$/;
      if (!phoneRegex.test(formData.admin_phone.trim())) {
        newErrors.admin_phone = 'Please enter a valid admin phone number';
      }
    }

    // Status validation
    if (!formData.status || !['active', 'inactive'].includes(formData.status)) {
      newErrors.status = 'Please select a valid status';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createAdminUserForLab = async (labId) => {
    try {
      console.log('Creating admin user for lab:', labId);
      
      // Step 1: Create admin role for this specific lab
      const adminRoleData = {
        lab_id: labId,
        role_name: 'admin',
        description: 'Lab Administrator - Full control over lab operations'
      };
      
      console.log('Creating admin role:', adminRoleData);
      
      // Create the role first
      const roleResponse = await api.post('/superadmin/roles', adminRoleData);
      
      let adminRoleId = null;
      if (roleResponse.data.success) {
        adminRoleId = roleResponse.data.data.role_id;
        console.log('Admin role created successfully:', roleResponse.data);
      } else {
        console.error('Failed to create admin role:', roleResponse.data);
        setSuccessMessage(prev => prev + ' Failed to create admin role.');
        return;
      }
      
      // Step 2: Create admin user with the new role
      const adminUserData = {
        lab_id: labId,
        role_id: adminRoleId,
        first_name: formData.admin_first_name.trim(),
        last_name: formData.admin_last_name.trim(),
        email: formData.admin_email.trim().toLowerCase(),
        contact_no: formData.admin_phone ? formData.admin_phone.trim() : null,
        password: 'Admin@123', // Default password - can be changed later
        is_verified: true,
        status: 'active'
      };

      console.log('Creating admin user:', adminUserData);

      // Create the admin user
      const adminResponse = await api.post('/superadmin/users', adminUserData);
      
      if (adminResponse.data.success) {
        console.log('Admin user created successfully:', adminResponse.data);
        setSuccessMessage(prev => prev + ' Admin user and role created successfully!');
      } else {
        console.error('Failed to create admin user:', adminResponse.data);
        setSuccessMessage(prev => prev + ' Failed to create admin user.');
      }
    } catch (error) {
      console.error('Error creating admin user:', error);
      setSuccessMessage(prev => prev + ' Error creating admin user.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!validateForm()) return;

    try {
      setLoading(true);
      
      // Clean and prepare lab data
      const labData = {
        lab_name: formData.lab_name.trim(),
        contact_email: formData.contact_email.trim().toLowerCase(),
        contact_phone: formData.contact_phone ? formData.contact_phone.trim() : null,
        address: formData.address.trim(),
        admin_first_name: formData.admin_first_name.trim(),
        admin_last_name: formData.admin_last_name.trim(),
        admin_email: formData.admin_email.trim().toLowerCase(),
        admin_phone: formData.admin_phone ? formData.admin_phone.trim() : null,
        status: formData.status || "active",
      };

      console.log("Submitting lab data:", labData);

      const response = await api.post("/superadmin/labs", labData);

      console.log("API Response:", response);

      if (response.data.success) {
        setSuccessMessage("Lab created successfully!");
        setSuccess(true);
        
        // Create admin user if lab was created successfully
        if (response.data.message && response.data.message.includes("Lab created but admin user not assigned")) {
          await createAdminUserForLab(response.data.data.lab_id);
        }
        
        // Navigate after delay to show success message
        setTimeout(() => {
          navigate('/labs/manage');
        }, 2000);
      } else {
        console.log("API Error Response:", response.data);
        
        // Handle specific error messages
        if (response.data.message && response.data.message.includes("Lab admin role not found")) {
          setErrorMessage("Admin role not found. Creating lab without admin user. You can add admin users later in user management.");
        } else {
          setErrorMessage(response.data.message || "Failed to create lab");
        }
      }
    } catch (error) {
      console.error("Submit Error:", error);
      console.error("Error response:", error.response?.data);

      // Handle specific error cases
      if (error.response?.data?.message && error.response.data.message.includes("Lab admin role not found")) {
        setErrorMessage("Admin role not found. Lab created but admin user not assigned. Please add admin users in user management.");
      } else if (error.response?.data?.message && error.response.data.message.includes("admin role not found")) {
        setErrorMessage("Admin role not found. Please check if admin roles are properly configured in the system.");
      } else {
        const errorMsg = error?.response?.data?.message || error?.message || "Failed to create lab";
        setErrorMessage(errorMsg);
      }
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout headerTitle="Add Lab" headerSubtitle="Create a new laboratory">
      <div className="p-6">
        {/* Back Button */}
        <button
          onClick={() => navigate("/labs/manage")}
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
                  {/* Lab Information */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                      Lab Information
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          Lab Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="lab_name"
                          value={formData.lab_name}
                          onChange={handleChange}
                          className={`w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent ${
                            errors.lab_name ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter lab name"
                        />
                        {errors.lab_name && (
                          <p className="mt-1 text-sm text-red-600">{errors.lab_name}</p>
                        )}
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          Contact Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          name="contact_email"
                          value={formData.contact_email}
                          onChange={handleChange}
                          className={`w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent ${
                            errors.contact_email ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter contact email"
                        />
                        {errors.contact_email && (
                          <p className="mt-1 text-sm text-red-600">{errors.contact_email}</p>
                        )}
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          Contact Phone
                        </label>
                        <input
                          type="tel"
                          name="contact_phone"
                          value={formData.contact_phone}
                          onChange={handleChange}
                          onKeyPress={(e) => {
                            // Allow only numbers, +, -, (, ), space, and backspace/delete
                            const allowedChars = /^[0-9+\-\(\)\s]$/;
                            if (!allowedChars.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab' && e.key !== 'Enter') {
                              e.preventDefault();
                            }
                          }}
                          className={`w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent ${
                            errors.contact_phone ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter contact phone (numbers only)"
                        />
                        {errors.contact_phone && (
                          <p className="mt-1 text-sm text-red-600">{errors.contact_phone}</p>
                        )}
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          Status
                        </label>
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Address Information */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                      Address Information
                    </h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          className={`w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent ${
                            errors.address ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter street address"
                        />
                        {errors.address && (
                          <p className="mt-1 text-sm text-red-600">{errors.address}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-700">City</label>
                          <input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                            placeholder="Enter city"
                          />
                        </div>

                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-700">State</label>
                          <input
                            type="text"
                            name="state"
                            value={formData.state}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                            placeholder="Enter state"
                          />
                        </div>

                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-700">Country</label>
                          <input
                            type="text"
                            name="country"
                            value={formData.country}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                            placeholder="Enter country"
                          />
                        </div>

                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-700">Postal Code</label>
                          <input
                            type="text"
                            name="postal_code"
                            value={formData.postal_code}
                            onChange={handleChange}
                            onKeyPress={(e) => {
                              // Allow only numbers and backspace/delete
                              const allowedChars = /^[0-9]$/;
                              if (!allowedChars.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab' && e.key !== 'Enter') {
                                e.preventDefault();
                              }
                            }}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                            placeholder="Enter postal code (numbers only)"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}

                </div>

                {/* Right Column - Lab Admin Information */}
                <div className="space-y-6">
                  {/* Lab Admin Information */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                      Lab Admin Information
                    </h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="admin_first_name"
                          value={formData.admin_first_name || ""}
                          onChange={handleChange}
                          className={`w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent ${
                            errors.admin_first_name ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter admin first name"
                        />
                        {errors.admin_first_name && (
                          <p className="mt-1 text-sm text-red-600">{errors.admin_first_name}</p>
                        )}
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          Last Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="admin_last_name"
                          value={formData.admin_last_name || ""}
                          onChange={handleChange}
                          className={`w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent ${
                            errors.admin_last_name ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter admin last name"
                        />
                        {errors.admin_last_name && (
                          <p className="mt-1 text-sm text-red-600">{errors.admin_last_name}</p>
                        )}
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          Admin Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          name="admin_email"
                          value={formData.admin_email || ""}
                          onChange={handleChange}
                          className={`w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent ${
                            errors.admin_email ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter admin email"
                        />
                        {errors.admin_email && (
                          <p className="mt-1 text-sm text-red-600">{errors.admin_email}</p>
                        )}
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          Admin Phone
                        </label>
                        <input
                          type="tel"
                          name="admin_phone"
                          value={formData.admin_phone || ""}
                          onChange={handleChange}
                          onKeyPress={(e) => {
                            // Allow only numbers, +, -, (, ), space, and backspace/delete
                            const allowedChars = /^[0-9+\-\(\)\s]$/;
                            if (!allowedChars.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab' && e.key !== 'Enter') {
                              e.preventDefault();
                            }
                          }}
                          className={`w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent ${
                            errors.admin_phone ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter admin phone (numbers only)"
                        />
                        {errors.admin_phone && (
                          <p className="mt-1 text-sm text-red-600">{errors.admin_phone}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-700">
                        <strong>Note:</strong> A password will be automatically generated and sent to the admin's email address.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Error Display */}
                {errorMessage && (
                  <div className="lg:col-span-3">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-600">{errorMessage}</p>
                    </div>
                  </div>
                )}

                {/* Success Display */}
                {success && (
                  <div className="lg:col-span-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-green-800">Lab Created Successfully!</h3>
                          <p className="text-green-700 mt-1">
                            Lab and lab admin have been created successfully. Login credentials have been sent to the admin's email address.
                          </p>
                          <p className="text-green-600 text-sm mt-2">
                            Redirecting to lab management...
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div className="lg:col-span-3 mt-8">
                  <div className="flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-6 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-8 py-3 rounded-lg bg-gradient-to-r from-[#2b63ae] to-[#1e4a8c] text-white font-medium hover:from-[#1e4a8c] hover:to-[#2b63ae] transition-all disabled:opacity-70 shadow-lg"
                    >
                      {loading ? "Creating..." : "Create Lab"}
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

export default AddLab;
