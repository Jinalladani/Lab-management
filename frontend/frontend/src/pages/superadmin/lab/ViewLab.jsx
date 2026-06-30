import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../../../components/layout';
import { getLabById } from '../../../api/labs';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import BusinessIcon from '@mui/icons-material/Business';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import axiosInstance from '../../../api/axios';

const ViewLab = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lab, setLab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showActionDropdown, setShowActionDropdown] = useState(false);

  useEffect(() => {
    fetchLabDetails();
  }, [id]);

  const fetchLabDetails = async () => {
    try {
      setLoading(true);
      const response = await getLabById(id);
      if (response.data.success) {
        setLab(response.data.data);
      } else {
        setError(response.data.message || 'Failed to load lab details');
      }
    } catch (err) {
      setError('Error loading lab details');
      console.error('Error fetching lab:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleEdit = () => {
    navigate(`/labs/edit/${id}`);
  };

  if (loading) {
    return (
      <MainLayout headerTitle="Lab Details" headerSubtitle="Loading...">
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2b63ae]"></div>
          <span className="ml-3 text-gray-600">Loading lab details...</span>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout headerTitle="Lab Details" headerSubtitle="Error">
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
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

  if (!lab) {
    return (
      <MainLayout headerTitle="Lab Details" headerSubtitle="Not Found">
        <div className="p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">Lab not found</p>
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
    <MainLayout headerTitle="Lab Details" headerSubtitle="View lab information">
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
            {/* Header Section */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 break-words">
                    {lab.lab_name}
                  </h1>
                
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 relative">
                  <span className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${getStatusColor(lab.status)}`}>
                    {lab.status || 'unknown'}
                  </span>
                  
                  <div className="relative">
                    <button
                      onClick={() => setShowActionDropdown(!showActionDropdown)}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                      </svg>
                    </button>
                    
                    {showActionDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                        <button
                          onClick={handleEdit}
                          className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 hover:text-[#2b63ae] transition-colors flex items-center gap-3"
                        >
                          <EditIcon fontSize="small" />
                          <span className="font-medium">Edit Lab</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Main Information */}
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
                          Lab Name
                        </label>
                        <div className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 text-gray-900 min-h-[48px] flex items-center">
                          {lab.lab_name || 'N/A'}
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          Contact Email
                        </label>
                        <div className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 text-gray-900 min-h-[48px] flex items-center">
                          {lab.contact_email || 'N/A'}
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          Contact Phone
                        </label>
                        <div className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 text-gray-900 min-h-[48px] flex items-center">
                          {lab.contact_phone || 'N/A'}
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          Status
                        </label>
                        <div className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 min-h-[48px] flex items-center">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(lab.status)}`}>
                            {lab.status || 'unknown'}
                          </span>
                        </div>
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
                          Address
                        </label>
                        <div className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 text-gray-900 min-h-[48px] flex items-start pt-3">
                          {lab.address || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Statistics */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                      Lab Statistics
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <AssignmentIcon className="text-blue-600" fontSize="small" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Total Projects</p>
                            <p className="text-xl font-bold text-gray-900">{lab.total_projects || 0}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <PeopleIcon className="text-green-600" fontSize="small" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Total Clients</p>
                            <p className="text-xl font-bold text-gray-900">{lab.total_clients || 0}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <BusinessIcon className="text-purple-600" fontSize="small" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Total Users</p>
                            <p className="text-xl font-bold text-gray-900">{lab.total_users || 0}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Additional Information */}
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
                          {lab.admin_first_name || 'N/A'}
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          Last Name
                        </label>
                        <div className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 text-gray-900 min-h-[48px] flex items-center">
                          {lab.admin_last_name || 'N/A'}
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          Admin Email
                        </label>
                        <div className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 text-gray-900 min-h-[48px] flex items-center">
                          {lab.admin_email || 'N/A'}
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          Admin Phone
                        </label>
                        <div className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 text-gray-900 min-h-[48px] flex items-center">
                          {lab.admin_phone || 'N/A'}
                        </div>
                      </div>
                    </div>
                    
                   
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ViewLab;
