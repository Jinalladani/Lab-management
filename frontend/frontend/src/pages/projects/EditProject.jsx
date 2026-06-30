import React, { useEffect, useState } from "react";
import { getProjectById, updateProject } from "../../api/projects";
import { getClients } from "../../api/clients";
import { getScopeHierarchy } from "../../api/scope";
import { usersAPI } from "../../api/users";
import { useNavigate, useParams } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import ScienceIcon from "@mui/icons-material/Science";
import UploadIcon from "@mui/icons-material/Upload";
import DeleteIcon from "@mui/icons-material/Delete";
import DescriptionIcon from "@mui/icons-material/Description";

const EditProject = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState(null);
  const [scopeData, setScopeData] = useState([]);
  const [loadingScope, setLoadingScope] = useState(false);
  const [selectedScopes, setSelectedScopes] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [expandedMaterials, setExpandedMaterials] = useState({});
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [formData, setFormData] = useState({
    client_id: "",
    project_code: "",
    project_name: "",
    name_of_work_and_other_details: "",
    nabl_scope: false,
    location_name: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    dispatch_mode: "",
    client_representative_name: "",
    request_collected_by: "",
    test_assigned_to: "",
    reviewed_by: "",
    ref_letter_no: "",
    ref_letter_date: "",
    work_order_no: "",
    work_order_date: "",
    start_date: "",
    due_date: "",
    status: "draft",
  });

  const [errors, setErrors] = useState({});

  // Helper function to format status for display
  const formatStatusForDisplay = (status) => {
    if (!status) return "-";
    
    const statusMap = {
      'draft': 'Draft',
      'active': 'Active', 
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'on_hold': 'On Hold',
      'cancelled': 'Cancelled'
    };
    
    return statusMap[status] || status;
  };

  const fetchClients = async () => {
    try {
      setLoadingClients(true);
      const response = await getClients({ status: "active" });
      setClients(response.data?.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingClients(false);
    }
  };

  // Helper function to format date for HTML input
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0]; // yyyy-MM-dd format
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await usersAPI.getLabUsers();
      console.log('Users API Response:', response);
      console.log('Response data:', response.data);
      console.log('Users array:', response.data?.users);
      setUsers(response.data?.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchProjectData = async () => {
    try {
      const response = await getProjectById(id);
      const projectData = response.data?.data;
      
      if (projectData) {
        setProject(projectData);
        setFormData({
          client_id: projectData.client_id || "",
          project_code: projectData.project_code || "",
          project_name: projectData.project_name || "",
          name_of_work_and_other_details: projectData.name_of_work_and_other_details || "",
          nabl_scope: projectData.nabl_scope || false,
          location_name: projectData.location_name || "",
          address: projectData.address || "",
          city: projectData.city || "",
          state: projectData.state || "",
          pincode: projectData.pincode || "",
          dispatch_mode: projectData.dispatch_mode || "",
          client_representative_name: projectData.client_representative_name || "",
          request_collected_by: projectData.request_collected_by || "",
          test_assigned_to: projectData.test_assigned_to || "",
          reviewed_by: projectData.reviewed_by || "",
          ref_letter_no: projectData.ref_letter_no || "",
          ref_letter_date: formatDateForInput(projectData.ref_letter_date),
          work_order_no: projectData.work_order_no || "",
          work_order_date: formatDateForInput(projectData.work_order_date),
          start_date: formatDateForInput(projectData.start_date),
          due_date: formatDateForInput(projectData.due_date),
          status: projectData.status || "draft",
        });
        
        // Set existing scopes if available
        if (projectData.scopes && projectData.scopes.length > 0) {
          const formattedScopes = projectData.scopes.map(scope => ({
            group_id: scope.group_id,
            group_name: scope.group_name,
            material_id: scope.material_id,
            material_name: scope.material_name,
            test_id: scope.scope_test_id, // Map scope_test_id to test_id for consistency
            test_name: scope.test_name,
            test_method: scope.test_method,
            sample_required: scope.sample_required,
            test_quantity: scope.test_quantity,
            remarks: scope.remarks,
            status: scope.status
          }));
          setSelectedScopes(formattedScopes);
        }
        
        // Set existing documents if available
        if (projectData.documents && projectData.documents.length > 0) {
          setDocuments(projectData.documents);
        }
      }
    } catch (error) {
      console.error("Failed to fetch project data:", error);
    }
  };

  const fetchScopeData = async () => {
    try {
      setLoadingScope(true);
      const response = await getScopeHierarchy();
      setScopeData(response.data?.data || []);
    } catch (error) {
      console.error("Failed to fetch scope data:", error);
    } finally {
      setLoadingScope(false);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchUsers();
    fetchProjectData();
    fetchScopeData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.project_code.trim()) {
      newErrors.project_code = "Project code is required";
    }

    if (!formData.project_name.trim()) {
      newErrors.project_name = "Project name is required";
    }

    if (!formData.status.trim()) {
      newErrors.status = "Status is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Scope selection functions
  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const toggleMaterial = (materialId) => {
    setExpandedMaterials(prev => ({
      ...prev,
      [materialId]: !prev[materialId]
    }));
  };

  const handleScopeSelection = (group, material, test, isChecked) => {
    if (isChecked) {
      setSelectedScopes(prev => [...prev, {
        group_id: group.group_id,
        group_name: group.group_name,
        material_id: material.material_id,
        material_name: material.material_name,
        test_id: test.scope_test_id,
        test_name: test.test_name,
        test_method: test.test_method
      }]);
    } else {
      setSelectedScopes(prev => prev.filter(scope => 
        !(scope.group_id === group.group_id && 
          scope.material_id === material.material_id && 
          scope.test_id === test.scope_test_id)
      ));
    }
  };

  const isScopeSelected = (group, material, test) => {
    return selectedScopes.some(scope => 
      scope.group_id === group.group_id && 
      scope.material_id === material.material_id && 
      scope.test_id === test.scope_test_id
    );
  };

  const removeSelectedScope = (index) => {
    setSelectedScopes(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/jpg'
    ];
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    const validFiles = files.filter(file => {
      // Check file type
      if (!validTypes.includes(file.type)) {
        alert(`Invalid file type: ${file.name}. Only PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, and PNG files are allowed.`);
        return false;
      }
      
      // Check file size
      if (file.size > maxSize) {
        alert(`File too large: ${file.name}. Maximum file size is 10MB.`);
        return false;
      }
      
      return true;
    });
    
    if (validFiles.length > 0) {
      const newDocuments = validFiles.map(file => ({
        file,
        document_type: 'project_document',
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        preview: null
      }));
      
      setDocuments(prev => [...prev, ...newDocuments]);
    }
    
    // Reset input
    e.target.value = '';
  };

  const removeDocument = (index) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);
      setUploading(true);

      const formDataToSend = new FormData();
      
      // Add project data
      Object.keys(formData).forEach(key => {
        if (key === 'client_id') {
          formDataToSend.append(key, formData[key] ? Number(formData[key]) : '');
        } else {
          formDataToSend.append(key, formData[key]);
        }
      });

      // Add selected scopes
      const scopeTests = selectedScopes.map(scope => ({
        group_id: scope.group_id,
        material_id: scope.material_id,
        scope_test_id: scope.test_id,
        sample_required: scope.sample_required || true,
        test_quantity: scope.test_quantity || 1,
        remarks: scope.remarks || "",
        status: scope.status || "active"
      }));
      
      formDataToSend.append('scope_tests', JSON.stringify(scopeTests));

      // Add documents - Backend expects simple 'documents' field
      // Only upload NEW documents (those with a file property)
      const newDocumentsToUpload = documents.filter(doc => doc.file);
      
      newDocumentsToUpload.forEach((doc) => {
        if (doc.file) {
          formDataToSend.append('documents', doc.file);
        }
      });

      await updateProject(id, formDataToSend);
      alert("Project updated successfully!");
      
      navigate("/projects");
    } catch (error) {
      const errorMessage = error?.response?.data?.message || "Failed to update project";
      alert(errorMessage);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  if (!project) {
    return (
      <MainLayout headerTitle="Edit Project" headerSubtitle="Loading project data...">
        <div className="p-6">
          <div className="text-center">Loading project data...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout headerTitle="Edit Project" headerSubtitle="Update project details">
      <div className="p-6">
        {/* Back Button */}
        <button
          onClick={() => navigate("/projects")}
          className="mb-4 flex items-center gap-2 text-[#2d66b3] font-medium hover:text-[#1f5498] transition-colors"
        >
          <ArrowBackIcon fontSize="small" />
          Back
        </button>
        
        <div className="w-full">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Form Section */}
            <div className="p-8">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Basic Info */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                      Basic Information
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">Client</label>
                        <select
                          name="client_id"
                          value={formData.client_id}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        >
                          <option value="">
                            {loadingClients ? "Loading clients..." : "Select Client"}
                          </option>
                          {clients.map((client) => (
                            <option key={client.client_id} value={client.client_id}>
                              {client.client_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">Project Code</label>
                        <input
                          type="text"
                          name="project_code"
                          value={formData.project_code}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">Project Name</label>
                        <input
                          type="text"
                          name="project_name"
                          value={formData.project_name}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">Location Name</label>
                        <input
                          type="text"
                          name="location_name"
                          value={formData.location_name}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block mb-2 text-sm font-medium text-gray-700">Name of work & other Details</label>
                      <textarea
                        name="name_of_work_and_other_details"
                        value={formData.name_of_work_and_other_details}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent min-h-[120px]"
                        placeholder="Enter name of work and other details..."
                      />
                    </div>

                    <div className="mt-4">
                      <label className="block mb-2 text-sm font-medium text-gray-700">NABL Scope</label>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="nabl_scope"
                            value="true"
                            checked={formData.nabl_scope === true}
                            onChange={(e) => setFormData(prev => ({ ...prev, nabl_scope: true }))}
                            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Yes</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="nabl_scope"
                            value="false"
                            checked={formData.nabl_scope === false}
                            onChange={(e) => setFormData(prev => ({ ...prev, nabl_scope: false }))}
                            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">No</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Address Section */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                      Address Information
                    </h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">Address</label>
                        <textarea
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent min-h-[100px]"
                          placeholder="Enter complete site address..."
                        />
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
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Scope Selection Section */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 sm:p-6 border border-blue-100 shadow-sm">
                    <div className="flex flex-col gap-3 mb-4 sm:mb-6">
                      <div className="min-w-0">
                        <h2 className="text-base sm:text-lg font-bold text-gray-800 flex items-center">
                          <span className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mr-2 sm:mr-3 flex-shrink-0"></span>
                          <span className="truncate">Testing Scope Selection</span>
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">Choose the tests you want to include in this project</p>
                      </div>
                      {selectedScopes.length > 0 && (
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium shadow-lg flex-shrink-0 self-start">
                          {selectedScopes.length} Test{selectedScopes.length !== 1 ? 's' : ''} Selected
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-4 sm:space-y-6">
                      {/* Selected Scopes Summary */}
                      {selectedScopes.length > 0 && (
                        <div className="bg-white rounded-xl p-3 sm:p-5 border border-green-200 shadow-sm">
                          <div className="flex flex-col gap-2 mb-3">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm sm:text-base font-semibold text-green-800 flex items-center">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full mr-2 flex-shrink-0"></div>
                                <span className="truncate">Selected Tests</span>
                              </h3>
                              <button
                                type="button"
                                onClick={() => setSelectedScopes([])}
                                className="text-red-500 hover:text-red-700 text-xs font-medium hover:bg-red-50 px-2 py-1 rounded transition-colors flex-shrink-0"
                              >
                                Clear All
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2 max-h-40 sm:max-h-48 overflow-y-auto">
                            {selectedScopes.map((scope, index) => (
                              <div key={index} className="bg-gradient-to-r from-green-50 to-emerald-50 p-2 sm:p-3 rounded-lg border border-green-200 hover:shadow-md transition-shadow">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex flex-wrap items-center gap-1 text-xs">
                                        <span className="font-semibold text-green-800 truncate max-w-[80px]" title={scope.group_name}>{scope.group_name}</span>
                                        <span className="text-green-600 flex-shrink-0">›</span>
                                        <span className="font-medium text-green-700 truncate max-w-[80px]" title={scope.material_name}>{scope.material_name}</span>
                                        <span className="text-green-600 flex-shrink-0">›</span>
                                        <span className="text-green-700 truncate max-w-[80px]" title={scope.test_name}>{scope.test_name}</span>
                                      </div>
                                      {scope.test_method && (
                                        <div className="text-xs text-gray-500 mt-1 truncate" title={scope.test_method}>Method: {scope.test_method}</div>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeSelectedScope(index)}
                                      className="text-red-500 hover:text-red-700 hover:bg-red-100 p-1.5 rounded transition-colors flex-shrink-0 ml-2"
                                      title="Remove test"
                                    >
                                      <RemoveIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Scope Selection Tree */}
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-3 sm:px-5 py-2 sm:py-3 border-b border-gray-200">
                          <div className="flex flex-col gap-1">
                            <h3 className="font-medium text-gray-800 text-sm sm:text-base">Available Tests</h3>
                            <div className="text-xs text-gray-500">
                              Click groups and materials to expand • Check tests to select
                            </div>
                          </div>
                        </div>
                        
                        {loadingScope ? (
                          <div className="p-8 text-center">
                            <div className="inline-flex items-center gap-3 text-blue-600">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                              <span className="font-medium">Loading scope data...</span>
                            </div>
                          </div>
                        ) : scopeData.length === 0 ? (
                          <div className="p-8 text-center">
                            <div className="text-gray-400 mb-2">
                              <ScienceIcon className="w-12 h-12 mx-auto" />
                            </div>
                            <p className="text-gray-500 font-medium">No scope data available</p>
                            <p className="text-sm text-gray-400 mt-1">Please add scope data first</p>
                          </div>
                        ) : (
                          <div className="p-2 sm:p-5 space-y-2 sm:space-y-4 max-h-80 sm:max-h-96 overflow-y-auto">
                            {scopeData.map((group) => (
                              <div key={group.group_id} className="border border-gray-200 rounded-lg sm:rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                                {/* Group Header */}
                                <div
                                  className={`flex items-center p-2 sm:p-4 cursor-pointer transition-colors ${
                                    expandedGroups[group.group_id] 
                                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200' 
                                      : 'bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200'
                                  }`}
                                  onClick={() => toggleGroup(group.group_id)}
                                >
                                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                    <div className={`transition-transform duration-200 ${expandedGroups[group.group_id] ? 'rotate-45' : 'rotate-0'} flex-shrink-0`}>
                                      <AddIcon className="w-3 h-3 sm:w-5 sm:h-5 text-blue-600" />
                                    </div>
                                    <div className="min-w-0">
                                      <span className="font-semibold text-gray-900 text-xs sm:text-sm sm:text-base truncate">{group.group_name}</span>
                                      <div className="text-xs text-gray-500 mt-0.5">
                                        {group.materials?.length || 0} material{group.materials?.length !== 1 ? 's' : ''}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Materials */}
                                {expandedGroups[group.group_id] && group.materials && (
                                  <div className="p-1.5 sm:p-3 space-y-1.5 sm:space-y-3 bg-gray-50">
                                    {group.materials.map((material) => (
                                      <div key={material.material_id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                                        {/* Material Header */}
                                        <div
                                          className={`flex items-center justify-between p-1.5 sm:p-3 cursor-pointer transition-colors ${
                                            expandedMaterials[material.material_id] 
                                              ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-200' 
                                              : 'hover:bg-gray-50'
                                          }`}
                                          onClick={() => toggleMaterial(material.material_id)}
                                        >
                                          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                                            <div className={`transition-transform duration-200 ${expandedMaterials[material.material_id] ? 'rotate-45' : 'rotate-0'} flex-shrink-0`}>
                                              <AddIcon className="w-2.5 h-2.5 sm:w-4 sm:h-4 text-indigo-600" />
                                            </div>
                                            <div className="min-w-0">
                                              <span className="font-medium text-gray-800 text-xs sm:text-sm sm:text-base truncate">{material.material_name}</span>
                                              <div className="text-xs text-gray-500 mt-0.5">
                                                {material.tests?.length || 0} test{material.tests?.length !== 1 ? 's' : ''}
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Tests */}
                                        {expandedMaterials[material.material_id] && material.tests && (
                                          <div className="p-1.5 sm:p-3 space-y-1 sm:space-y-2 bg-gradient-to-br from-gray-50 to-white">
                                            {material.tests.map((test) => (
                                              <div key={test.scope_test_id} className="flex items-start gap-1.5 sm:gap-3 p-1.5 sm:p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all">
                                                <input
                                                  type="checkbox"
                                                  checked={isScopeSelected(group, material, test)}
                                                  onChange={(e) => handleScopeSelection(group, material, test, e.target.checked)}
                                                  className="w-3 h-3 sm:w-5 sm:h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex-shrink-0 mt-0.5"
                                                />
                                                <div className="flex-1 min-w-0">
                                                  <div className="font-medium text-gray-900 text-xs sm:text-sm sm:text-base truncate">{test.test_name}</div>
                                                  {test.test_method && (
                                                    <div className="text-xs text-gray-500 mt-0.5 truncate" title={test.test_method}>{test.test_method}</div>
                                                  )}
                                                </div>
                                                {isScopeSelected(group, material, test) && (
                                                  <div className="text-xs bg-green-100 text-green-800 px-1.5 sm:px-2 py-1 rounded-full font-medium flex-shrink-0">
                                                    Selected
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Additional Info */}
                <div className="space-y-6">
                  {/* Client Information */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                      Client Information
                    </h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">Client Representative Name</label>
                        <input
                          type="text"
                          name="client_representative_name"
                          value={formData.client_representative_name}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">Dispatch Mode</label>
                        <div className="space-y-2">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="dispatch_mode"
                              value="by_post"
                              checked={formData.dispatch_mode === "by_post"}
                              onChange={handleChange}
                              className="mr-2 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm">By Post</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="dispatch_mode"
                              value="collect_personally"
                              checked={formData.dispatch_mode === "collect_personally"}
                              onChange={handleChange}
                              className="mr-2 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm">Collect Personally</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Document Upload Section */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                      Project Documents
                    </h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">Upload Documents</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#2b63ae] transition-colors">
                          <input
                            type="file"
                            multiple
                            onChange={handleFileUpload}
                            className="hidden"
                            id="document-upload"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                          />
                          <label htmlFor="document-upload" className="cursor-pointer">
                            <UploadIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                            <p className="text-sm text-gray-600 mb-1">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">
                              PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (MAX. 10MB per file)
                            </p>
                          </label>
                        </div>
                      </div>

                      {documents.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-700 mb-2">Uploaded Documents ({documents.length})</h3>
                          <div className="space-y-2">
                            {documents.map((doc, index) => (
                              <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 gap-3">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                                    <UploadIcon className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                                    <p className="text-xs text-gray-500 truncate">
                                      {doc.file_size && `${(doc.file_size / 1024).toFixed(1)} KB`}
                                      {doc.mime_type && ` • ${doc.mime_type}`}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeDocument(index)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors shrink-0"
                                  title="Remove document"
                                >
                                  <DeleteIcon className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assignment Information */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                      Assignment Information
                    </h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">Request Collected By</label>
                        <select
                          name="request_collected_by"
                          value={formData.request_collected_by}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        >
                          <option value="">
                            {loadingUsers ? "Loading users..." : "Select User"}
                          </option>
                          {console.log('Users in dropdown:', users)}
                          {users.map((user) => (
                            <option key={user.user_id || user.id} value={user.user_id || user.id}>
                              {console.log('User object:', user)}
                              {user.first_name} {user.last_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">Test Assigned To</label>
                        <select
                          name="test_assigned_to"
                          value={formData.test_assigned_to}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        >
                          <option value="">
                            {loadingUsers ? "Loading users..." : "Select User"}
                          </option>
                          {users.map((user) => (
                            <option key={user.user_id} value={user.user_id}>
                              {user.first_name} {user.last_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">Reviewed By</label>
                        <select
                          name="reviewed_by"
                          value={formData.reviewed_by}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        >
                          <option value="">
                            {loadingUsers ? "Loading users..." : "Select User"}
                          </option>
                          {users.map((user) => (
                            <option key={user.user_id} value={user.user_id}>
                              {user.first_name} {user.last_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Project Status */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                      Project Status
                    </h2>
                    
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">Status</label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                      >
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="on_hold">On Hold</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="lg:col-span-3 mt-8">
                  <div className="flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => navigate("/projects")}
                      className="px-6 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || uploading}
                      className="px-8 py-3 rounded-lg bg-gradient-to-r from-[#2b63ae] to-[#1e4a8c] text-white font-medium hover:from-[#1e4a8c] hover:to-[#2b63ae] transition-all disabled:opacity-70 shadow-lg"
                    >
                      {loading || uploading ? "Updating..." : "Update Project"}
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

export default EditProject;
