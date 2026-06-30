import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../../../components/layout';
import { getLabById, updateLab } from '../../../api/labs';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import BusinessIcon from '@mui/icons-material/Business';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import axiosInstance from '../../../api/axios';

const EditLab = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [labData, setLabData] = useState(null);
  const [adminData, setAdminData] = useState(null);

  const [formData, setFormData] = useState({
    lab_name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    status: 'active'
  });

  useEffect(() => {
    fetchLabDetails();
  }, [id]);

  const fetchLabDetails = async () => {
    try {
      setFetchLoading(true);
      const response = await getLabById(id);
      if (response.data.success) {
        const labDetails = response.data.data;
        setLabData(labDetails); // Store original lab data for admin info
        setFormData({
          lab_name: labDetails.lab_name || '',
          contact_email: labDetails.contact_email || '',
          contact_phone: labDetails.contact_phone || '',
          address: labDetails.address || '',
          status: labDetails.status || 'active'
        });
        
        // Fetch admin data separately
        await fetchAdminData();
      } else {
        setErrorMessage(response.data.message || 'Failed to load lab details');
      }
    } catch (err) {
      setErrorMessage('Error loading lab details');
      console.error('Error fetching lab:', err);
    } finally {
      setFetchLoading(false);
    }
  };

  const fetchAdminData = async () => {
    try {
      // Direct query to get admin user from users table
      const response = await axiosInstance.get(`/superadmin/labs/${id}/admin`);
      if (response.data.success) {
        setAdminData(response.data.data);
        console.log('Admin data found:', response.data.data);
      } else {
        console.log('No admin found for this lab');
        setAdminData(null);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setAdminData(null);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setErrors(prev => ({ ...prev, [name]: '' }));
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

    // Phone validation (optional)
    if (formData.contact_phone && formData.contact_phone.trim()) {
      const phoneRegex = /^[+]?[\d\s\-\(\)]+$/;
      if (!phoneRegex.test(formData.contact_phone.trim())) {
        newErrors.contact_phone = 'Please enter a valid contact phone number';
      }
    }

    // Status validation
    if (!formData.status || !['active', 'inactive'].includes(formData.status)) {
      newErrors.status = 'Please select a valid status';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!validateForm()) return;

    try {
      setLoading(true);
      
      // Clean and prepare lab data
      const labData = {
        lab_name: formData.lab_name.trim(),
        contact_email: formData.contact_email.trim().toLowerCase(),
        contact_phone: formData.contact_phone ? formData.contact_phone.trim() : null,
        address: formData.address.trim(),
        status: formData.status || 'active'
      };
      
      const response = await updateLab(id, labData);
      
      if (response.data.success) {
        setSuccessMessage('Lab updated successfully!');
        setSuccess(true);
        
        // Navigate after delay to show success message
        setTimeout(() => {
          navigate('/labs/manage');
        }, 2000);
      } else {
        setErrorMessage(response.data.message || 'Failed to update lab');
      }
    } catch (error) {
      console.error('API Error:', error);
      console.error('Error response:', error.response);
      
      const errorMsg = error?.response?.data?.message || 'Failed to update lab';
      setErrorMessage(errorMsg);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
      navigate('/labs/manage');
    }
  };

  if (fetchLoading) {
    return (
      <MainLayout headerTitle="Edit Lab" headerSubtitle="Loading...">
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2b63ae]"></div>
          <span className="ml-3 text-gray-600">Loading lab details...</span>
        </div>
      </MainLayout>
    );
  }

  if (errorMessage && !success) {
    return (
      <MainLayout headerTitle="Edit Lab" headerSubtitle="Error">
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{errorMessage}</p>
            <button
              onClick={() => navigate('/labs/manage')}
              className="mt-3 text-[#2b63ae] hover:underline"
            >
              Back to Lab Management
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout headerTitle="Edit Lab" headerSubtitle="Update lab information">
      <div className="p-6">
        {/* Back Button */}
        <button
          onClick={() => navigate('/labs/manage')}
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
                        {errors.status && (
                          <p className="mt-1 text-sm text-red-600">{errors.status}</p>
                        )}
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
                          className={`w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent ${
                            errors.address ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter street address"
                        />
                        {errors.address && (
                          <p className="mt-1 text-sm text-red-600">{errors.address}</p>
                        )}
                      </div>
                    </div>
                  </div>
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
                          First Name
                        </label>
                        <div className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 text-gray-900 min-h-[48px] flex items-center">
                          {adminData?.first_name || 'N/A'}
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          Last Name
                        </label>
                        <div className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 text-gray-900 min-h-[48px] flex items-center">
                          {adminData?.last_name || 'N/A'}
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          Admin Email
                        </label>
                        <div className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 text-gray-900 min-h-[48px] flex items-center">
                          {adminData?.email || 'N/A'}
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          Admin Phone
                        </label>
                        <div className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 text-gray-900 min-h-[48px] flex items-center">
                          {adminData?.contact_no || 'N/A'}
                        </div>
                      </div>
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
                      {loading ? 'Updating...' : 'Update Lab'}
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

export default EditLab;
