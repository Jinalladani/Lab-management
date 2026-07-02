import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "../../components/layout/MainLayout";
import { getEquipmentDetails, updateEquipment, uploadEquipmentDocument, deleteEquipmentDocument, getLocationsList } from "../../api";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import InfoIcon from "@mui/icons-material/Info";
import DeleteIcon from "@mui/icons-material/Delete";
import AttachmentIcon from "@mui/icons-material/Attachment";

const EditEquipment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [existingDocs, setExistingDocs] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState({});
  const [activeUploadCategory, setActiveUploadCategory] = useState(null);
  const fileInputRef = useRef(null);

  // Form State matching the Add Equipment layout specification
  const [formData, setFormData] = useState({
    id: id,
    name: "",
    category: "",
    laboratory: "",
    manufacturer: "",
    model: "",
    serialNo: "",
    assetTag: "",
    purchaseDate: "",
    installationDate: "",
    warrantyExpiryDate: "",
    status: "Active",
    supplier: "",
    invoiceNo: "",
    purchaseCost: "",
    location: "",
    responsiblePerson: "",
    description: "",
    
    // Technical Specification Section
    measurementRange: "",
    leastCount: "",
    accuracy: "",
    capacity: "",
    unit: "",
    powerSupply: "",
    software: "",
    otherSpecification: "",
    
    // Calibration & Verification Section
    frequency: "",
    internalCheckFrequency: "",
    agency: "",
    nablAccredited: true,
    traceabilityDetails: "",
    calibrationMethod: "",
    
    // Right panel settings
    nextDue: "",
    nextInternalCheckDate: "",
    reminderBeforeDays: "30"
  });

  const [errors, setErrors] = useState({});

  const fetchLocations = async () => {
    try {
      setLoadingLocations(true);
      const res = await getLocationsList();
      if (res.success && res.data?.locations) {
        setLocations(res.data.locations);
      }
    } catch (error) {
      console.error("Failed to load locations:", error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await getEquipmentDetails(id);
      if (res.success && res.data) {
        setFormData({
          id: res.data.id,
          name: res.data.name || "",
          category: res.data.category || "",
          laboratory: res.data.laboratory || "",
          manufacturer: res.data.manufacturer || "",
          model: res.data.model || "",
          serialNo: res.data.serialNo || "",
          assetTag: res.data.assetTag || "",
          purchaseDate: res.data.purchaseDate || "",
          installationDate: res.data.installationDate || "",
          warrantyExpiryDate: res.data.warrantyExpiryDate || "",
          status: res.data.status || "Active",
          supplier: res.data.supplier || "",
          invoiceNo: res.data.invoiceNo || "",
          purchaseCost: res.data.purchaseCost || "",
          location: res.data.location || "",
          responsiblePerson: res.data.responsiblePerson || "",
          description: res.data.description || "",
          measurementRange: res.data.measurementRange || "",
          leastCount: res.data.leastCount || "",
          accuracy: res.data.accuracy || "",
          capacity: res.data.capacity || "",
          unit: res.data.unit || "",
          powerSupply: res.data.powerSupply || "",
          software: res.data.software || "",
          otherSpecification: res.data.otherSpecification || "",
          frequency: res.data.frequency || "",
          internalCheckFrequency: res.data.internalCheckFrequency || "",
          agency: res.data.agency || "",
          nablAccredited: res.data.nablAccredited ?? true,
          traceabilityDetails: res.data.traceabilityDetails || "",
          calibrationMethod: res.data.calibrationMethod || "",
          nextDue: res.data.nextDue || "",
          nextInternalCheckDate: res.data.nextInternalCheckDate || "",
          reminderBeforeDays: String(res.data.reminderBeforeDays || "30")
        });
        setExistingDocs(res.data.documents || []);
      }
    } catch (error) {
      console.error("Failed to fetch equipment details for editing:", error);
      alert("Failed to load equipment details from registry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    fetchDetails();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const triggerFileUpload = (category) => {
    setActiveUploadCategory(category);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert("File is too large. Maximum size is 10MB.");
      return;
    }

    setSelectedFiles(prev => ({
      ...prev,
      [activeUploadCategory]: file
    }));
  };

  const handleDeleteExistingDoc = async (docId) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      await deleteEquipmentDocument(docId);
      setExistingDocs(prev => prev.filter(d => d.id !== docId));
      alert("Document deleted successfully.");
    } catch (error) {
      console.error("Failed to delete document:", error);
      alert("Error deleting document from database.");
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Equipment name is required";
    if (!formData.category) newErrors.category = "Category is required";
    if (!formData.laboratory) newErrors.laboratory = "Laboratory section is required";
    if (!formData.manufacturer.trim()) newErrors.manufacturer = "Make/Manufacturer is required";
    if (!formData.model.trim()) newErrors.model = "Model is required";
    if (!formData.serialNo.trim()) newErrors.serialNo = "Serial number is required";
    if (!formData.purchaseDate) newErrors.purchaseDate = "Purchase date is required";
    if (!formData.status) newErrors.status = "Status is required";
    if (!formData.responsiblePerson) newErrors.responsiblePerson = "Responsible person is required";
    if (!formData.frequency) newErrors.frequency = "Calibration frequency is required";
    if (!formData.internalCheckFrequency) newErrors.internalCheckFrequency = "Internal check frequency is required";
    if (!formData.nextDue) newErrors.nextDue = "Next calibration date is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      setLoading(true);
      
      // Update basic fields
      await updateEquipment(id, formData);

      // Upload any newly selected documents
      for (const [category, file] of Object.entries(selectedFiles)) {
        if (file) {
          const fileFormData = new FormData();
          fileFormData.append("file", file);
          fileFormData.append("document_type", category);
          fileFormData.append("file_name", file.name);
          await uploadEquipmentDocument(id, fileFormData);
        }
      }

      alert("Equipment updated successfully!");
      navigate(`/equipment/view/${id}`);
    } catch (error) {
      console.error("Failed to update equipment:", error);
      alert(error.response?.data?.message || "Failed to update equipment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout headerTitle="Edit Equipment Details" headerSubtitle="Modify configuration parameters and documents">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        
        {/* Navigation Headers */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Edit Equipment: {id}</h1>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold mt-1">
              <span>Dashboard</span>
              <span>&gt;</span>
              <span>Equipment Management</span>
              <span>&gt;</span>
              <span>Equipment List</span>
              <span>&gt;</span>
              <span className="text-[#2562AA]">Edit Equipment</span>
            </div>
          </div>
          <button
            onClick={() => navigate(`/equipment/view/${id}`)}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-xl bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs shadow-sm self-start transition-all"
          >
            <ArrowBackIcon sx={{ fontSize: 16 }} /> Back to Details
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Main Grid Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Left Form Area (3 span) */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Section 1: Basic Information */}
            <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm space-y-5">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="w-5 h-5 bg-[#2562AA] text-white text-[10px] rounded-full flex items-center justify-center font-bold">1</span>
                Basic Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Equipment ID</label>
                  <input
                    type="text"
                    value={formData.id}
                    disabled
                    className="w-full bg-gray-50 border border-gray-200 text-gray-500 rounded-xl px-3 py-2 text-xs font-bold cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Equipment Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#2562AA] ${
                      errors.name ? "border-red-400 focus:ring-red-400" : "border-gray-200"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Equipment Category *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 bg-white focus:ring-2 focus:ring-[#2562AA] ${
                      errors.category ? "border-red-400 focus:ring-red-400" : "border-gray-200"
                    }`}
                  >
                    <option value="">Select Category</option>
                    <option value="Concrete">Concrete</option>
                    <option value="Soil">Soil</option>
                    <option value="Cement">Cement</option>
                    <option value="Steel">Steel</option>
                    <option value="Aggregates">Aggregates</option>
                    <option value="Chemical">Chemical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Laboratory Section *</label>
                  <select
                    name="laboratory"
                    value={formData.laboratory}
                    onChange={handleChange}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 bg-white focus:ring-2 focus:ring-[#2562AA] ${
                      errors.laboratory ? "border-red-400 focus:ring-red-400" : "border-gray-200"
                    }`}
                  >
                    <option value="">Select Laboratory</option>
                    <option value="Concrete Lab">Concrete Lab</option>
                    <option value="Soil Mechanics Lab">Soil Mechanics Lab</option>
                    <option value="Chemical Testing Lab">Chemical Testing Lab</option>
                    <option value="NDT Lab">NDT Lab</option>
                    <option value="Metrology Lab">Metrology Lab</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Make / Manufacturer *</label>
                  <input
                    type="text"
                    name="manufacturer"
                    value={formData.manufacturer}
                    onChange={handleChange}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#2562AA] ${
                      errors.manufacturer ? "border-red-400" : "border-gray-200"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Model *</label>
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#2562AA] ${
                      errors.model ? "border-red-400" : "border-gray-200"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Serial Number *</label>
                  <input
                    type="text"
                    name="serialNo"
                    value={formData.serialNo}
                    onChange={handleChange}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#2562AA] ${
                      errors.serialNo ? "border-red-400" : "border-gray-200"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Asset Tag / Code</label>
                  <input
                    type="text"
                    name="assetTag"
                    value={formData.assetTag}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Purchase Date *</label>
                  <input
                    type="date"
                    name="purchaseDate"
                    value={formData.purchaseDate}
                    onChange={handleChange}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none ${
                      errors.purchaseDate ? "border-red-400" : "border-gray-200"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Installation Date</label>
                  <input
                    type="date"
                    name="installationDate"
                    value={formData.installationDate}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Warranty Expiry Date</label>
                  <input
                    type="date"
                    name="warrantyExpiryDate"
                    value={formData.warrantyExpiryDate}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Status *</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 bg-white focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                    <option value="Out of Order">Out of Order</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Supplier / Vendor</label>
                  <input
                    type="text"
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Invoice Number</label>
                  <input
                    type="text"
                    name="invoiceNo"
                    value={formData.invoiceNo}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    name="purchaseCost"
                    value={formData.purchaseCost}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Location / Room</label>
                  <select
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 bg-white focus:outline-none"
                  >
                    <option value="">Select Location</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.name}>{loc.name} (Room {loc.roomNo})</option>
                    ))}
                  </select>
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Responsible Engineer *</label>
                  <select
                    name="responsiblePerson"
                    value={formData.responsiblePerson}
                    onChange={handleChange}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 bg-white ${
                      errors.responsiblePerson ? "border-red-400" : "border-gray-200"
                    }`}
                  >
                    <option value="">Select Engineer</option>
                    <option value="Mr. Rahul Patel">Mr. Rahul Patel</option>
                    <option value="Mrs. Sneha Shah">Mrs. Sneha Shah</option>
                    <option value="Mr. Amit Sharma">Mr. Amit Sharma</option>
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Description / Remarks</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#2562AA]"
                  />
                </div>
              </div>

            </div>

            {/* Section 2: Technical Specification */}
            <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm space-y-5">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="w-5 h-5 bg-[#2562AA] text-white text-[10px] rounded-full flex items-center justify-center font-bold">2</span>
                Technical Specification
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Measurement Range</label>
                  <input
                    type="text"
                    name="measurementRange"
                    value={formData.measurementRange}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Least Count / Resolution</label>
                  <input
                    type="text"
                    name="leastCount"
                    value={formData.leastCount}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Accuracy / Class</label>
                  <input
                    type="text"
                    name="accuracy"
                    value={formData.accuracy}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Capacity / Size</label>
                  <input
                    type="text"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Unit</label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 bg-white"
                  >
                    <option value="">Select Unit</option>
                    <option value="kN">kN (Kilonewton)</option>
                    <option value="kg">kg (Kilogram)</option>
                    <option value="mm">mm (Millimeter)</option>
                    <option value="°C">°C (Degree Celsius)</option>
                    <option value="V">V (Volt)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Power Requirement</label>
                  <input
                    type="text"
                    name="powerSupply"
                    value={formData.powerSupply}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Software (If any)</label>
                  <input
                    type="text"
                    name="software"
                    value={formData.software}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Other Specification</label>
                  <input
                    type="text"
                    name="otherSpecification"
                    value={formData.otherSpecification}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold"
                  />
                </div>

              </div>
            </div>

            {/* Section 3: Calibration & Verification */}
            <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm space-y-5">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="w-5 h-5 bg-[#2562AA] text-white text-[10px] rounded-full flex items-center justify-center font-bold">3</span>
                Calibration & Verification
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Calibration Frequency *</label>
                  <select
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleChange}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 bg-white ${
                      errors.frequency ? "border-red-400" : "border-gray-200"
                    }`}
                  >
                    <option value="">Select Frequency</option>
                    <option value="3 Months">3 Months</option>
                    <option value="6 Months">6 Months</option>
                    <option value="12 Months">12 Months (1 Year)</option>
                    <option value="24 Months">24 Months (2 Years)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Internal Check Frequency *</label>
                  <select
                    name="internalCheckFrequency"
                    value={formData.internalCheckFrequency}
                    onChange={handleChange}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 bg-white ${
                      errors.internalCheckFrequency ? "border-red-400" : "border-gray-200"
                    }`}
                  >
                    <option value="">Select Frequency</option>
                    <option value="3 Months">3 Months</option>
                    <option value="6 Months">6 Months</option>
                    <option value="12 Months">12 Months (1 Year)</option>
                    <option value="24 Months">24 Months (2 Years)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Calibration Agency</label>
                  <select
                    name="agency"
                    value={formData.agency}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 bg-white"
                  >
                    <option value="">Select Agency</option>
                    <option value="ABC NABL Lab">ABC NABL Lab</option>
                    <option value="XYZ NABL Lab">XYZ NABL Lab</option>
                    <option value="National Physical Laboratory">National Physical Laboratory</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">NABL Accredited</label>
                  <div className="flex rounded-xl overflow-hidden border border-gray-200 max-w-[160px] h-8 bg-gray-50">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, nablAccredited: true }))}
                      className={`flex-1 text-[11px] font-bold transition-all ${
                        formData.nablAccredited ? "bg-[#2562AA] text-white" : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, nablAccredited: false }))}
                      className={`flex-1 text-[11px] font-bold transition-all ${
                        !formData.nablAccredited ? "bg-[#2562AA] text-white" : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Traceability Details</label>
                  <textarea
                    name="traceabilityDetails"
                    value={formData.traceabilityDetails}
                    onChange={handleChange}
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Calibration Method / Standard</label>
                  <textarea
                    name="calibrationMethod"
                    value={formData.calibrationMethod}
                    onChange={handleChange}
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold"
                  />
                </div>
              </div>

            </div>

          </div>

          {/* Right sidebar compliance & upload (1 span) */}
          <div className="space-y-6">
            
            {/* Box A: Upload Documents */}
            <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Upload Documents</h3>
              
              {/* File Dropzone */}
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-5 bg-gray-50 hover:bg-gray-100 flex flex-col items-center justify-center cursor-pointer transition-colors text-center">
                <CloudUploadIcon className="text-gray-400 w-8 h-8 mb-1.5" />
                <span className="text-xs font-bold text-gray-700 block">Drag & drop files here</span>
                <span className="text-[10px] text-gray-400 font-semibold my-1">or</span>
                <button
                  type="button"
                  onClick={() => triggerFileUpload("Other Document")}
                  className="text-[10px] font-bold text-[#2562AA] bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-100"
                >
                  Browse Files
                </button>
                <span className="text-[9px] text-gray-400 font-semibold mt-2">Max file size: 10MB</span>
              </div>

              {/* Existing documents */}
              {existingDocs.length > 0 && (
                <div className="space-y-2 border-b border-gray-100 pb-3 text-xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Attached Documents</span>
                  {existingDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <AttachmentIcon sx={{ fontSize: 14 }} className="text-gray-400" />
                        <span className="text-[10px] font-semibold text-gray-700 truncate max-w-[120px]">{doc.fileName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteExistingDoc(doc.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <DeleteIcon sx={{ fontSize: 14 }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Categories list */}
              <div className="space-y-2 pt-2 text-xs">
                {[
                  "Calibration Certificate",
                  "Invoice / Purchase Bill",
                  "Equipment Manual",
                  "AMC / Service Contract",
                  "Photograph",
                  "Other Document"
                ].map((docName, index) => (
                  <div key={index} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                    <div className="flex flex-col">
                      <span className="text-gray-600 font-semibold">{docName}</span>
                      {selectedFiles[docName] && (
                        <span className="text-[10px] text-emerald-600 font-bold max-w-[140px] truncate">
                          ✓ {selectedFiles[docName].name}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => triggerFileUpload(docName)}
                      className="text-[#2562AA] hover:underline font-bold text-[10px]"
                    >
                      {selectedFiles[docName] ? "Change" : "+ Upload"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Box B: Calibration & Check Settings */}
            <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Calibration & Check Settings</h3>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Next Calibration Date *</label>
                  <input
                    type="date"
                    name="nextDue"
                    value={formData.nextDue}
                    onChange={handleChange}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-[#2562AA] ${
                      errors.nextDue ? "border-red-400" : "border-gray-200"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Next Internal Check Date</label>
                  <input
                    type="date"
                    name="nextInternalCheckDate"
                    value={formData.nextInternalCheckDate}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Reminder Before (Days)</label>
                  <select
                    name="reminderBeforeDays"
                    value={formData.reminderBeforeDays}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 bg-white"
                  >
                    <option value="7">7 Days</option>
                    <option value="15">15 Days</option>
                    <option value="30">30 Days</option>
                    <option value="60">60 Days</option>
                  </select>
                </div>

                <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 flex items-start gap-2.5 mt-4">
                  <InfoIcon className="text-[#2562AA] mt-0.5" sx={{ fontSize: 16 }} />
                  <p className="text-[10px] text-blue-900 font-semibold leading-relaxed">
                    System will send reminder before the due date as per selected days.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 pt-5 flex items-center justify-end gap-3.5">
          <button
            type="button"
            onClick={() => navigate(`/equipment/view/${id}`)}
            className="px-6 py-2 border border-gray-300 rounded-xl bg-white hover:bg-gray-50 text-gray-600 font-bold text-xs shadow-sm transition-all"
          >
            Cancel
          </button>
          
          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="px-6 py-2 rounded-xl bg-[#2562AA] hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98] flex items-center gap-1.5"
          >
            <SaveIcon sx={{ fontSize: 14 }} /> {loading ? "Saving..." : "Save Modifications"}
          </button>
        </div>

      </div>
    </MainLayout>
  );
};

export default EditEquipment;
