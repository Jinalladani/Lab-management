import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Briefcase,
  User,
  Shield,
  Info,
  MapPin,
  CreditCard,
  Upload,
  Trash2,
  Minus,
  FlaskConical,
  Check
} from "lucide-react";
import { getProjectById, updateProject } from "../../api/projects";
import { getClients } from "../../api/clients";
import { getScopeHierarchy } from "../../api/scope";
import { SERVER_URL } from "../../api/axios";
import { usersAPI } from "../../api/users";
import { MainLayout } from "../../components/layout";
import { Input, Select, Button } from "../../components/ui";

const EditProject = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [scopeData, setScopeData] = useState([]);
  const [loadingScope, setLoadingScope] = useState(false);
  const [selectedScopes, setSelectedScopes] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [expandedMaterials, setExpandedMaterials] = useState({});
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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
    status: "draft",
  });

  const [errors, setErrors] = useState({});

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
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

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await usersAPI.getLabUsers();
      setUsers(response.data?.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchProjectData = async () => {
    try {
      setProjectLoading(true);
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
          status: projectData.status || "draft",
        });
        
        if (projectData.scopes && projectData.scopes.length > 0) {
          const formattedScopes = projectData.scopes.map(scope => ({
            group_id: scope.group_id,
            group_name: scope.group_name,
            material_id: scope.material_id,
            material_name: scope.material_name,
            test_id: scope.scope_test_id,
            test_name: scope.test_name,
            test_method: scope.test_method,
            sample_required: scope.sample_required,
            test_quantity: scope.test_quantity,
            remarks: scope.remarks,
            status: scope.status
          }));
          setSelectedScopes(formattedScopes);
        }
        
        if (projectData.documents && projectData.documents.length > 0) {
          setDocuments(projectData.documents);
        }
      }
    } catch (error) {
      console.error("Failed to fetch project data:", error);
      setErrorMessage("Failed to load project details");
    } finally {
      setProjectLoading(false);
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
    if (!formData.project_code.trim()) newErrors.project_code = "Project code is required";
    if (!formData.project_name.trim()) newErrors.project_name = "Project name is required";
    if (!formData.status.trim()) newErrors.status = "Status is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
      if (!validTypes.includes(file.type)) {
        alert(`Invalid file type: ${file.name}. Only PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, and PNG files are allowed.`);
        return false;
      }
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
    
    e.target.value = '';
  };

  const removeDocument = (index) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!validateForm()) return;

    try {
      setLoading(true);
      setUploading(true);

      const formDataToSend = new FormData();
      
      Object.keys(formData).forEach(key => {
        if (key === 'client_id') {
          formDataToSend.append(key, formData[key] ? Number(formData[key]) : '');
        } else {
          formDataToSend.append(key, formData[key]);
        }
      });

      const newDocumentsToUpload = documents.filter(doc => doc.file);
      newDocumentsToUpload.forEach((doc) => {
        if (doc.file) {
          formDataToSend.append('documents', doc.file);
        }
      });

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

      await updateProject(id, formDataToSend);
      setSuccessMessage("Project updated successfully!");
      setTimeout(() => navigate("/projects"), 2000);
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Failed to update project");
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const clientOptions = clients.map((c) => ({ value: c.client_id, label: c.client_name }));
  
  const userOptions = users.map((u) => ({
    value: u.user_id || u.id,
    label: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.name || u.email
  }));

  const statusOptions = [
    { value: "draft", label: "Draft" },
    { value: "active", label: "Active" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "on_hold", label: "On Hold" },
    { value: "cancelled", label: "Cancelled" },
  ];

  return (
    <MainLayout headerTitle="Edit Project" headerSubtitle={`Updating project ID: ${id}`}>
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">
        
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate("/projects")} className="mb-4">
          Back
        </Button>

        {/* Messages */}
        {successMessage && (
          <motion.div
            className="mb-5 flex items-center gap-3 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#16A34A]/10 text-[#16A34A]">
              <Info size={16} />
            </div>
            <p className="text-sm font-medium text-[#16A34A]">{successMessage}</p>
          </motion.div>
        )}

        {errorMessage && (
          <motion.div
            className="mb-5 flex items-center gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DC2626]/10 text-[#DC2626]">
              <Info size={16} />
            </div>
            <p className="text-sm font-medium text-[#DC2626]">{errorMessage}</p>
          </motion.div>
        )}

        {projectLoading ? (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-16 text-center text-sm font-semibold text-gray-500">
            Loading project details...
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8 !overflow-visible">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column - Basic Info, Address & Scope Tree */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Basic Information */}
                  <div>
                    <h3 className="text-sm font-bold text-[#1A2733] flex items-center gap-2 mb-4">
                      <Briefcase size={16} className="text-[#3F6E8C]" />
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Select
                        label="Client"
                        name="client_id"
                        value={formData.client_id}
                        onChange={handleChange}
                        options={clientOptions}
                        placeholder={loadingClients ? "Loading clients..." : "Select Client"}
                      />
                      <Input
                        label="Project Code"
                        name="project_code"
                        value={formData.project_code}
                        onChange={handleChange}
                        placeholder="Enter project code"
                        error={errors.project_code}
                        required
                      />
                      <Input
                        label="Project Name"
                        name="project_name"
                        value={formData.project_name}
                        onChange={handleChange}
                        placeholder="Enter project name"
                        error={errors.project_name}
                        required
                      />
                      <Input
                        label="Location Name"
                        name="location_name"
                        value={formData.location_name}
                        onChange={handleChange}
                        placeholder="Enter site location name"
                      />
                    </div>

                    <div className="mt-4">
                      <label htmlFor="name_of_work_and_other_details" className="app-label">Name of work & other Details</label>
                      <textarea
                        id="name_of_work_and_other_details"
                        name="name_of_work_and_other_details"
                        value={formData.name_of_work_and_other_details}
                        onChange={handleChange}
                        placeholder="Enter scope of work or detail parameters..."
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#243744]/10 focus:border-[#243744] bg-white text-sm transition-all min-h-[100px]"
                      />
                    </div>

                    <div className="mt-4">
                      <label className="block mb-2 text-sm font-medium text-gray-700">NABL Scope</label>
                      <div className="flex items-center space-x-6">
                        <label className="flex items-center cursor-pointer select-none">
                          <input
                            type="radio"
                            name="nabl_scope"
                            value="true"
                            checked={formData.nabl_scope === true}
                            onChange={() => setFormData(prev => ({ ...prev, nabl_scope: true }))}
                            className="h-4 w-4 text-[#243744] border-gray-300 focus:ring-[#243744]"
                          />
                          <span className="ml-2 text-sm font-semibold text-gray-700">Yes (NABL Certified)</span>
                        </label>
                        <label className="flex items-center cursor-pointer select-none">
                          <input
                            type="radio"
                            name="nabl_scope"
                            value="false"
                            checked={formData.nabl_scope === false}
                            onChange={() => setFormData(prev => ({ ...prev, nabl_scope: false }))}
                            className="h-4 w-4 text-[#243744] border-gray-300 focus:ring-[#243744]"
                          />
                          <span className="ml-2 text-sm font-semibold text-gray-700">No (Non-NABL)</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-[#F1F5F9]" />

                  {/* Address Information */}
                  <div>
                    <h3 className="text-sm font-bold text-[#1A2733] flex items-center gap-2 mb-4">
                      <MapPin size={16} className="text-[#3F6E8C]" />
                      Address Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="address" className="app-label">Address</label>
                        <textarea
                          id="address"
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          placeholder="Enter complete site address..."
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#243744]/10 focus:border-[#243744] bg-white text-sm transition-all min-h-[90px]"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                          label="City"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          placeholder="Enter city"
                        />
                        <Input
                          label="State"
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                          placeholder="Enter state"
                        />
                        <Input
                          label="Pincode"
                          name="pincode"
                          value={formData.pincode}
                          onChange={handleChange}
                          placeholder="Enter postal pincode"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-[#F1F5F9]" />

                  {/* Testing Scope Selection Tree */}
                  <div>
                    <h3 className="text-sm font-bold text-[#1A2733] flex items-center gap-2 mb-4">
                      <FlaskConical size={16} className="text-[#3F6E8C]" />
                      Testing Scope Selection
                    </h3>
                    
                    <div className="space-y-4">
                      {/* Selected Scopes Summary */}
                      {selectedScopes.length > 0 && (
                        <div className="bg-[#FAF9FF] rounded-xl p-4 border border-[#DCD5FF]">
                          <div className="flex items-center justify-between mb-3 border-b border-[#EDEAFF] pb-2">
                            <span className="text-xs font-bold text-[#5F45FF] uppercase tracking-wider">
                              Selected Tests ({selectedScopes.length})
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedScopes([])}
                              className="text-red-500 hover:text-red-700 text-xs font-bold transition-colors"
                            >
                              Clear All
                            </button>
                          </div>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {selectedScopes.map((scope, index) => (
                              <div key={index} className="bg-white p-2.5 rounded-lg border border-[#EDEAFF] flex items-center justify-between text-xs">
                                <div className="flex-1 min-w-0">
                                  <span className="font-bold text-gray-900 truncate block">
                                    {scope.group_name} › {scope.material_name} › {scope.test_name}
                                  </span>
                                  {scope.test_method && (
                                    <span className="text-slate-500 font-semibold mt-0.5 block truncate">Method: {scope.test_method}</span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeSelectedScope(index)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded ml-3 shrink-0"
                                  title="Remove test"
                                >
                                  <Minus size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Scope Selection Tree */}
                      <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
                        <div className="bg-[#FAFBFD] px-4 py-3 border-b border-[#E2E8F0]">
                          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Available Testing Matrices</span>
                        </div>
                        
                        {loadingScope ? (
                          <div className="p-8 text-center text-xs font-bold text-slate-500">Loading scope directory...</div>
                        ) : scopeData.length === 0 ? (
                          <div className="p-8 text-center text-xs font-bold text-slate-500">No scope entries logged.</div>
                        ) : (
                          <div className="p-4 space-y-3 max-h-96 overflow-y-auto bg-[#FCFDFE]">
                            {scopeData.map((group) => (
                              <div key={group.group_id} className="border border-[#E2E8F0] rounded-xl bg-white overflow-hidden shadow-sm">
                                {/* Group Header */}
                                <div
                                  className={`flex items-center justify-between p-3.5 cursor-pointer select-none transition-colors ${
                                    expandedGroups[group.group_id] ? 'bg-[#243744]/5 border-b border-[#E2E8F0]' : 'hover:bg-slate-50'
                                  }`}
                                  onClick={() => toggleGroup(group.group_id)}
                                >
                                  <span className="font-bold text-sm text-[#1A2733]">{group.group_name}</span>
                                  <span className="text-xs font-bold text-[#64748B]">
                                    {expandedGroups[group.group_id] ? 'Collapse' : `Expand (${group.materials?.length || 0})`}
                                  </span>
                                </div>

                                {/* Materials */}
                                {expandedGroups[group.group_id] && group.materials && (
                                  <div className="p-3 bg-slate-50/50 space-y-3">
                                    {group.materials.map((material) => (
                                      <div key={material.material_id} className="border border-[#E2E8F0] rounded-lg bg-white overflow-hidden">
                                        {/* Material Header */}
                                        <div
                                          className={`flex items-center justify-between p-2.5 cursor-pointer select-none transition-colors ${
                                            expandedMaterials[material.material_id] ? 'bg-indigo-50/40 border-b border-[#E2E8F0]' : 'hover:bg-slate-50'
                                          }`}
                                          onClick={() => toggleMaterial(material.material_id)}
                                        >
                                          <span className="font-bold text-xs text-[#243744]">{material.material_name}</span>
                                          <span className="text-[10px] font-bold text-slate-500">
                                            {expandedMaterials[material.material_id] ? 'Hide' : `Show (${material.tests?.length || 0})`}
                                          </span>
                                        </div>

                                        {/* Tests */}
                                        {expandedMaterials[material.material_id] && material.tests && (
                                          <div className="p-2 space-y-1.5 bg-[#FAFBFD]">
                                            {material.tests.map((test) => {
                                              const isSel = isScopeSelected(group, material, test);
                                              return (
                                                <label key={test.scope_test_id} className="flex items-start gap-2.5 p-2 bg-white rounded-md border border-[#E2E8F0] hover:border-slate-400 cursor-pointer select-none transition-all">
                                                  <input
                                                    type="checkbox"
                                                    checked={isSel}
                                                    onChange={(e) => handleScopeSelection(group, material, test, e.target.checked)}
                                                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#243744] focus:ring-[#243744]"
                                                  />
                                                  <div className="flex-1 min-w-0">
                                                    <span className="font-bold text-xs text-gray-900 block truncate">{test.test_name}</span>
                                                    {test.test_method && (
                                                      <span className="text-[10px] text-slate-500 font-semibold truncate block mt-0.5">{test.test_method}</span>
                                                    )}
                                                  </div>
                                                  {isSel && (
                                                    <span className="flex items-center gap-0.5 text-[9px] bg-green-100 text-green-800 font-bold px-1.5 py-0.5 rounded-full uppercase">
                                                      <Check size={9} /> Selected
                                                    </span>
                                                  )}
                                                </label>
                                              );
                                            })}
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

                {/* Right Column - Client Info, Docs & Assignments */}
                <div className="space-y-6 lg:border-l lg:border-[#F1F5F9] lg:pl-8">
                  
                  {/* Client Information */}
                  <div>
                    <h3 className="text-sm font-bold text-[#1A2733] flex items-center gap-2 mb-4">
                      <User size={16} className="text-[#3F6E8C]" />
                      Client Representative
                    </h3>
                    <div className="space-y-4">
                      <Input
                        label="Representative Name"
                        name="client_representative_name"
                        value={formData.client_representative_name}
                        onChange={handleChange}
                        placeholder="Representative's name"
                      />

                      <div>
                        <label className="block mb-2 text-xs font-bold text-gray-600 uppercase tracking-wider">Dispatch Mode</label>
                        <div className="space-y-2 mt-1">
                          <label className="flex items-center cursor-pointer select-none">
                            <input
                              type="radio"
                              name="dispatch_mode"
                              value="by_post"
                              checked={formData.dispatch_mode === "by_post"}
                              onChange={handleChange}
                              className="h-4 w-4 text-[#243744] border-gray-300 focus:ring-[#243744]"
                            />
                            <span className="ml-2 text-sm font-semibold text-gray-700">By Post (Mail Office)</span>
                          </label>
                          <label className="flex items-center cursor-pointer select-none">
                            <input
                              type="radio"
                              name="dispatch_mode"
                              value="collect_personally"
                              checked={formData.dispatch_mode === "collect_personally"}
                              onChange={handleChange}
                              className="h-4 w-4 text-[#243744] border-gray-300 focus:ring-[#243744]"
                            />
                            <span className="ml-2 text-sm font-semibold text-gray-700">Collect Personally</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-[#F1F5F9]" />

                  {/* Documents Upload */}
                  <div>
                    <h3 className="text-sm font-bold text-[#1A2733] flex items-center gap-2 mb-4">
                      <Upload size={16} className="text-[#3F6E8C]" />
                      Project Documents
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-[#E2E8F0] hover:border-[#243744] rounded-xl p-5 text-center transition-colors">
                        <input
                          type="file"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                          id="document-upload"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                        />
                        <label htmlFor="document-upload" className="cursor-pointer">
                          <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                          <span className="text-xs font-bold text-gray-600 block">Click to upload file</span>
                          <span className="text-[10px] text-gray-500 font-semibold mt-1 block">PDF, DOC, XLS (MAX 10MB)</span>
                        </label>
                      </div>

                      {documents.length > 0 && (
                        <div className="space-y-2">
                          {documents.map((doc, index) => (
                            <div key={index} className="flex items-center justify-between bg-slate-50 p-2 border border-[#E2E8F0] rounded-xl text-xs">
                              {doc.file ? (
                                <span className="font-bold text-gray-800 truncate flex-1 pr-2">{doc.file_name}</span>
                              ) : (
                                <a
                                  href={`${SERVER_URL}/uploads/projects/${doc.file_path}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-bold text-[#243744] hover:underline truncate flex-1 pr-2"
                                >
                                  {doc.file_name}
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => removeDocument(index)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-[#F1F5F9]" />

                  {/* Assignment Information */}
                  <div>
                    <h3 className="text-sm font-bold text-[#1A2733] flex items-center gap-2 mb-4">
                      <User size={16} className="text-[#3F6E8C]" />
                      Assignment & Review
                    </h3>
                    <div className="space-y-4">
                      <Select
                        label="Request Collected By"
                        name="request_collected_by"
                        value={formData.request_collected_by}
                        onChange={handleChange}
                        options={userOptions}
                        placeholder={loadingUsers ? "Loading..." : "Select User"}
                      />
                      <Select
                        label="Test Assigned To"
                        name="test_assigned_to"
                        value={formData.test_assigned_to}
                        onChange={handleChange}
                        options={userOptions}
                        placeholder={loadingUsers ? "Loading..." : "Select User"}
                      />
                      <Select
                        label="Reviewed By"
                        name="reviewed_by"
                        value={formData.reviewed_by}
                        onChange={handleChange}
                        options={userOptions}
                        placeholder={loadingUsers ? "Loading..." : "Select User"}
                      />
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-[#F1F5F9]" />

                  {/* Status */}
                  <div className="!overflow-visible">
                    <h3 className="text-sm font-bold text-[#1A2733] flex items-center gap-2 mb-4">
                      <Shield size={16} className="text-[#3F6E8C]" />
                      Project Status
                    </h3>
                    <Select
                      label="Status"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      options={statusOptions}
                      placeholder="Select status"
                      error={errors.status}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-[#F1F5F9] my-6" />

              {/* Actions */}
              <motion.div
                className="flex justify-end gap-3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Button variant="secondary" onClick={() => navigate("/projects")}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  loading={loading || uploading}
                  className="!bg-[#243744] hover:!bg-[#1A2733] text-white font-bold"
                >
                  {loading || uploading ? "Updating Project..." : "Update Project"}
                </Button>
              </motion.div>
            </div>
          </form>
        )}
      </div>
    </MainLayout>
  );
};

export default EditProject;
