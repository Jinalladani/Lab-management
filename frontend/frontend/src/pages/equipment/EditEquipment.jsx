import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Upload, Info, Trash2 } from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import { getEquipmentDetails, updateEquipment, uploadEquipmentDocument, deleteEquipmentDocument, getLocationsList } from "../../api";
import { Input, Select, Button } from "../../components/ui";

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

  // Form State
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
          id: res.data.id || id,
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
      await updateEquipment(id, formData);

      // Upload newly selected files
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

  const categoryOptions = [
    { value: "Concrete", label: "Concrete" },
    { value: "Soil", label: "Soil" },
    { value: "Cement", label: "Cement" },
    { value: "Steel", label: "Steel" },
    { value: "Aggregates", label: "Aggregates" },
    { value: "Chemical", label: "Chemical" },
  ];

  const labOptions = [
    { value: "Concrete Lab", label: "Concrete Lab" },
    { value: "Soil Mechanics Lab", label: "Soil Mechanics Lab" },
    { value: "Chemical Testing Lab", label: "Chemical Testing Lab" },
    { value: "NDT Lab", label: "NDT Lab" },
    { value: "Metrology Lab", label: "Metrology Lab" },
  ];

  const statusOptions = [
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "Inactive" },
    { value: "Under Maintenance", label: "Under Maintenance" },
    { value: "Out of Order", label: "Out of Order" },
  ];

  const unitOptions = [
    { value: "kN", label: "kN (Kilonewton)" },
    { value: "kg", label: "kg (Kilogram)" },
    { value: "mm", label: "mm (Millimeter)" },
    { value: "°C", label: "°C (Degree Celsius)" },
    { value: "V", label: "V (Volt)" },
  ];

  const freqOptions = [
    { value: "3 Months", label: "3 Months" },
    { value: "6 Months", label: "6 Months" },
    { value: "12 Months", label: "12 Months (1 Year)" },
    { value: "24 Months", label: "24 Months (2 Years)" },
  ];

  const reminderOptions = [
    { value: "7", label: "7 Days" },
    { value: "15", label: "15 Days" },
    { value: "30", label: "30 Days" },
    { value: "60", label: "60 Days" },
  ];

  const locationOptions = locations.map(loc => ({
    value: loc.name,
    label: `${loc.name} (Room ${loc.roomNo})`
  }));

  return (
    <MainLayout headerTitle="Edit Equipment Details" headerSubtitle="Modify configuration parameters and documents">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">
        
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate(`/equipment/view/${id}`)} className="mb-4">
          Back
        </Button>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8 !overflow-visible">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column - Form Inputs */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Section 1: Basic Information */}
                <div>
                  <h3 className="text-sm font-bold text-[#1A2733] flex items-center gap-2 mb-4">
                    <span className="w-5 h-5 bg-[#243744] text-white text-[10px] rounded-full flex items-center justify-center font-bold">1</span>
                    Basic Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Equipment ID"
                      name="id"
                      value={formData.id}
                      disabled
                      placeholder="Equipment ID"
                    />

                    <Input
                      label="Equipment Name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter equipment name"
                      required
                      error={errors.name}
                    />

                    <Select
                      label="Equipment Category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      options={categoryOptions}
                      required
                      error={errors.category}
                    />

                    <Select
                      label="Laboratory Section"
                      name="laboratory"
                      value={formData.laboratory}
                      onChange={handleChange}
                      options={labOptions}
                      required
                      error={errors.laboratory}
                    />

                    <Input
                      label="Make / Manufacturer"
                      name="manufacturer"
                      value={formData.manufacturer}
                      onChange={handleChange}
                      placeholder="Enter manufacturer name"
                      required
                      error={errors.manufacturer}
                    />

                    <Input
                      label="Model"
                      name="model"
                      value={formData.model}
                      onChange={handleChange}
                      placeholder="Enter model number"
                      required
                      error={errors.model}
                    />

                    <Input
                      label="Serial Number"
                      name="serialNo"
                      value={formData.serialNo}
                      onChange={handleChange}
                      placeholder="Enter serial number"
                      required
                      error={errors.serialNo}
                    />

                    <Input
                      label="Asset Tag / Code"
                      name="assetTag"
                      value={formData.assetTag}
                      onChange={handleChange}
                      placeholder="Enter asset tag"
                    />

                    <Input
                      label="Purchase Date"
                      name="purchaseDate"
                      type="date"
                      value={formData.purchaseDate}
                      onChange={handleChange}
                      required
                      error={errors.purchaseDate}
                    />

                    <Input
                      label="Installation Date"
                      name="installationDate"
                      type="date"
                      value={formData.installationDate}
                      onChange={handleChange}
                    />

                    <Input
                      label="Warranty Expiry Date"
                      name="warrantyExpiryDate"
                      type="date"
                      value={formData.warrantyExpiryDate}
                      onChange={handleChange}
                    />

                    <Select
                      label="Status"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      options={statusOptions}
                      required
                      error={errors.status}
                    />

                    <Input
                      label="Supplier / Vendor"
                      name="supplier"
                      value={formData.supplier}
                      onChange={handleChange}
                      placeholder="Enter supplier name"
                    />

                    <Input
                      label="Invoice Number"
                      name="invoiceNo"
                      value={formData.invoiceNo}
                      onChange={handleChange}
                      placeholder="Enter invoice number"
                    />

                    <Input
                      label="Purchase Cost (₹)"
                      name="purchaseCost"
                      type="number"
                      value={formData.purchaseCost}
                      onChange={handleChange}
                      placeholder="Enter amount"
                    />

                    <Select
                      label="Location / Room"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      options={locationOptions}
                      placeholder="Select Location"
                    />

                    <Input
                      label="Responsible Engineer"
                      name="responsiblePerson"
                      value={formData.responsiblePerson}
                      onChange={handleChange}
                      placeholder="Enter responsible engineer"
                      required
                      error={errors.responsiblePerson}
                      className="md:col-span-2"
                    />

                    <div className="md:col-span-2">
                      <label className="app-label">Description / Remarks</label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Enter description or remarks"
                        rows={3}
                        className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#243744]/10 focus:border-[#243744] bg-white/90 text-sm font-semibold text-gray-800 placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Technical Specification */}
                <div className="pt-6 border-t border-[#F1F5F9]">
                  <h3 className="text-sm font-bold text-[#1A2733] flex items-center gap-2 mb-4">
                    <span className="w-5 h-5 bg-[#243744] text-white text-[10px] rounded-full flex items-center justify-center font-bold">2</span>
                    Technical Specification
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Measurement Range"
                      name="measurementRange"
                      value={formData.measurementRange}
                      onChange={handleChange}
                      placeholder="e.g. 0 - 2000 kN"
                    />

                    <Input
                      label="Least Count / Resolution"
                      name="leastCount"
                      value={formData.leastCount}
                      onChange={handleChange}
                      placeholder="e.g. 0.01 kN"
                    />

                    <Input
                      label="Accuracy / Class"
                      name="accuracy"
                      value={formData.accuracy}
                      onChange={handleChange}
                      placeholder="e.g. ±1%"
                    />

                    <Input
                      label="Capacity / Size"
                      name="capacity"
                      value={formData.capacity}
                      onChange={handleChange}
                      placeholder="e.g. 1000 kN"
                    />

                    <Select
                      label="Unit"
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      options={unitOptions}
                      placeholder="Select Unit"
                    />

                    <Input
                      label="Power Requirement"
                      name="powerSupply"
                      value={formData.powerSupply}
                      onChange={handleChange}
                      placeholder="e.g. 230V, 50Hz"
                    />

                    <Input
                      label="Software (If any)"
                      name="software"
                      value={formData.software}
                      onChange={handleChange}
                      placeholder="Enter software name"
                    />

                    <Input
                      label="Other Specification"
                      name="otherSpecification"
                      value={formData.otherSpecification}
                      onChange={handleChange}
                      placeholder="Enter other specification"
                    />
                  </div>
                </div>

                {/* Section 3: Calibration & Verification */}
                <div className="pt-6 border-t border-[#F1F5F9]">
                  <h3 className="text-sm font-bold text-[#1A2733] flex items-center gap-2 mb-4">
                    <span className="w-5 h-5 bg-[#243744] text-white text-[10px] rounded-full flex items-center justify-center font-bold">3</span>
                    Calibration & Verification
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label="Calibration Frequency"
                      name="frequency"
                      value={formData.frequency}
                      onChange={handleChange}
                      options={freqOptions}
                      required
                      error={errors.frequency}
                    />

                    <Select
                      label="Internal Check Frequency"
                      name="internalCheckFrequency"
                      value={formData.internalCheckFrequency}
                      onChange={handleChange}
                      options={freqOptions}
                      required
                      error={errors.internalCheckFrequency}
                    />

                    <Input
                      label="Calibration Agency"
                      name="agency"
                      value={formData.agency}
                      onChange={handleChange}
                      placeholder="Enter calibration agency"
                    />

                    <div>
                      <label className="app-label">NABL Accredited</label>
                      <div className="flex rounded-xl overflow-hidden border border-gray-200 max-w-[160px] h-[42px] bg-gray-50">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, nablAccredited: true }))}
                          className={`flex-1 text-xs font-bold transition-all ${
                            formData.nablAccredited
                              ? "bg-[#243744] text-white shadow-inner"
                              : "text-gray-600 hover:bg-gray-150"
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, nablAccredited: false }))}
                          className={`flex-1 text-xs font-bold transition-all ${
                            !formData.nablAccredited
                              ? "bg-[#243744] text-white shadow-inner"
                              : "text-gray-600 hover:bg-gray-150"
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="app-label">Traceability Details</label>
                      <textarea
                        name="traceabilityDetails"
                        value={formData.traceabilityDetails}
                        onChange={handleChange}
                        placeholder="Enter traceability details"
                        rows={2}
                        className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#243744]/10 focus:border-[#243744] bg-white/90 text-sm font-semibold text-gray-800 placeholder:text-gray-400"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="app-label">Calibration Method / Standard</label>
                      <textarea
                        name="calibrationMethod"
                        value={formData.calibrationMethod}
                        onChange={handleChange}
                        placeholder="Enter calibration method / standard"
                        rows={2}
                        className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#243744]/10 focus:border-[#243744] bg-white/90 text-sm font-semibold text-gray-800 placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column - Uploads & Reminders */}
              <div className="space-y-6">
                
                {/* Upload Documents Box */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Upload Documents</h3>
                  
                  {/* File Dropzone */}
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl p-5 bg-gray-50 hover:bg-gray-100 flex flex-col items-center justify-center cursor-pointer transition-colors text-center">
                    <Upload className="text-gray-400 w-8 h-8 mb-1.5" />
                    <span className="text-xs font-bold text-gray-700 block">Drag & drop files here</span>
                    <span className="text-[10px] text-gray-400 font-semibold my-1">or</span>
                    <button
                      type="button"
                      onClick={() => triggerFileUpload("Other Document")}
                      className="text-[10px] font-bold text-[#243744] bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      Browse Files
                    </button>
                    <span className="text-[9px] text-gray-400 font-semibold mt-2">Max file size: 10MB</span>
                  </div>

                  {/* Existing documents */}
                  {existingDocs.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-gray-100 text-xs">
                      <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider block">Existing Documents</span>
                      {existingDocs.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                          <div className="flex flex-col min-w-0">
                            <span className="text-gray-700 font-bold truncate">{doc.fileName}</span>
                            <span className="text-[10px] text-gray-400 font-semibold">{doc.documentType}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteExistingDoc(doc.id)}
                            className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Categories list */}
                  <div className="space-y-2 pt-2 border-t border-gray-100 text-xs">
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
                            <span className="text-[10px] text-emerald-600 font-bold max-w-[150px] truncate">
                              ✓ {selectedFiles[docName].name}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => triggerFileUpload(docName)}
                          className="text-[#243744] hover:underline font-bold text-[10px] flex items-center gap-0.5"
                        >
                          {selectedFiles[docName] ? "Change" : "+ Upload"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Calibration & Check Settings Box */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Calibration & Check Settings</h3>

                  <div className="space-y-4">
                    <Input
                      label="Next Calibration Date"
                      name="nextDue"
                      type="date"
                      value={formData.nextDue}
                      onChange={handleChange}
                      required
                      error={errors.nextDue}
                    />

                    <Input
                      label="Next Internal Check Date"
                      name="nextInternalCheckDate"
                      type="date"
                      value={formData.nextInternalCheckDate}
                      onChange={handleChange}
                    />

                    <Select
                      label="Reminder Before (Days)"
                      name="reminderBeforeDays"
                      value={formData.reminderBeforeDays}
                      onChange={handleChange}
                      options={reminderOptions}
                    />

                    <div className="bg-[#FAF9FF] border border-[#EDEAFF] rounded-xl p-3 flex items-start gap-2.5">
                      <Info className="text-[#243744] mt-0.5 shrink-0" size={16} />
                      <p className="text-[10px] text-[#475569] font-semibold leading-relaxed">
                        System will send reminders before the due date as per selected days.
                      </p>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Footer Action Buttons */}
            <div className="border-t border-[#F1F5F9] mt-8 pt-6 flex flex-wrap items-center justify-end gap-3">
              <Button variant="secondary" onClick={() => navigate(`/equipment/view/${id}`)}>
                Cancel
              </Button>
              
              <Button
                type="submit"
                disabled={loading}
                loading={loading}
                icon={Save}
              >
                Save Changes
              </Button>
            </div>

          </div>
        </form>

      </div>
    </MainLayout>
  );
};

export default EditEquipment;
