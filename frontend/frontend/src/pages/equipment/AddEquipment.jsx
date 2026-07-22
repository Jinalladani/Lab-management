import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Upload, Info, Plus } from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import { createEquipment, getLocationsList, uploadEquipmentDocument } from "../../api";
import { mockEquipmentDb } from "../../utils/mockEquipmentData";
import { Input, Select, Button } from "../../components/ui";

const AddEquipment = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  
  // File selection states
  const [selectedFiles, setSelectedFiles] = useState({});
  const [activeUploadCategory, setActiveUploadCategory] = useState(null);
  const fileInputRef = useRef(null);

  // Form State - ID is auto-generated under the hood
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    category: "",
    laboratory: "Concrete Lab",
    manufacturer: "",
    model: "",
    serialNo: "",
    purchaseDate: "",
    installationDate: "",
    status: "Active",
    location: "",
    capacity: "",
    frequency: "12 Months",
    nextDue: "",
    equipmentCode: "",
    calibrationRequired: "Yes",
    equipmentImage: ""
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

  const calculateNextDue = (lastDateStr, freq) => {
    if (!lastDateStr) return "";
    const date = new Date(lastDateStr);
    let monthsToAdd = 12;
    if (freq === "3 Months") monthsToAdd = 3;
    if (freq === "6 Months") monthsToAdd = 6;
    if (freq === "12 Months") monthsToAdd = 12;
    if (freq === "24 Months") monthsToAdd = 24;
    date.setMonth(date.getMonth() + monthsToAdd);
    return date.toISOString().substring(0, 10);
  };

  useEffect(() => {
    fetchLocations();
    // Auto calculate ID for representation
    const count = mockEquipmentDb.getEquipment().length + 1;
    const generatedId = `EQ-${String(count).padStart(4, "0")}`;
    setFormData(prev => ({ ...prev, id: generatedId }));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === "purchaseDate" && updated.frequency) {
        updated.nextDue = calculateNextDue(value, updated.frequency);
      }
      if (name === "frequency" && updated.purchaseDate) {
        updated.nextDue = calculateNextDue(updated.purchaseDate, value);
      }
      return updated;
    });
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

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Equipment name is required";
    if (!formData.category) newErrors.category = "Category is required";
    if (!formData.manufacturer.trim()) newErrors.manufacturer = "Make/Manufacturer is required";
    if (!formData.model.trim()) newErrors.model = "Model is required";
    if (!formData.serialNo.trim()) newErrors.serialNo = "Serial number is required";
    if (!formData.purchaseDate) newErrors.purchaseDate = "Purchase date is required";
    if (!formData.status) newErrors.status = "Status is required";
    
    if (formData.calibrationRequired === "Yes" && !formData.frequency) newErrors.frequency = "Calibration frequency is required";
    if (formData.calibrationRequired === "Yes" && !formData.nextDue) newErrors.nextDue = "Next calibration date is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e, addAnother = false) => {
    if (e) e.preventDefault();
    if (!validateForm()) {
      alert("Please fill in all required fields highlighted in red.");
      return;
    }

    try {
      setLoading(true);
      const today = new Date();
      const nextDue = new Date(formData.nextDue || today);
      const diffDays = Math.ceil((nextDue - today) / (1000 * 60 * 60 * 24));
      
      let calStatus = "Valid";
      if (formData.calibrationRequired === "No") {
        calStatus = "Not Required";
      } else {
        if (diffDays < 0) {
          calStatus = "Overdue";
        } else if (diffDays <= 7) {
          calStatus = "Due within 7 Days";
        } else if (diffDays <= 30) {
          calStatus = "Due Soon";
        }
      }

      const payload = {
        ...formData,
        calibrationRequired: formData.calibrationRequired === "Yes",
        maintenanceRequired: false,
        calibrationStatus: calStatus,
        lastCalibration: formData.purchaseDate
      };

      const res = await createEquipment(payload);
      const eqId = res.id || formData.id;

      // Upload files
      for (const [category, file] of Object.entries(selectedFiles)) {
        if (file) {
          const fileFormData = new FormData();
          fileFormData.append("file", file);
          fileFormData.append("document_type", category);
          fileFormData.append("file_name", file.name);
          await uploadEquipmentDocument(eqId, fileFormData);
        }
      }

      mockEquipmentDb.addEquipment(payload);

      alert("Equipment registered successfully!");
      
      if (addAnother) {
        const nextCount = mockEquipmentDb.getEquipment().length + 1;
        setFormData({
          id: `EQ-${String(nextCount).padStart(4, "0")}`,
          name: "",
          category: "",
          laboratory: "Concrete Lab",
          manufacturer: "",
          model: "",
          serialNo: "",
          purchaseDate: "",
          installationDate: "",
          status: "Active",
          location: "",
          capacity: "",
          frequency: "12 Months",
          nextDue: "",
          equipmentCode: "",
          calibrationRequired: "Yes",
          equipmentImage: ""
        });
        setSelectedFiles({});
      } else {
        navigate("/equipment/list");
      }
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Failed to register equipment");
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

  const statusOptions = [
    { value: "Active", label: "Active" },
    { value: "Under Repair", label: "Under Repair" },
    { value: "Out of Service", label: "Out of Service" }
  ];

  const freqOptions = [
    { value: "3 Months", label: "3 Months" },
    { value: "6 Months", label: "6 Months" },
    { value: "12 Months", label: "12 Months (1 Year)" },
    { value: "24 Months", label: "24 Months (2 Years)" },
  ];

  const locationOptions = locations.map(loc => ({
    value: loc.name,
    label: `${loc.name} (Room ${loc.roomNo})`
  }));

  return (
    <MainLayout headerTitle="Register Equipment" headerSubtitle="Manage, inspect, and trace laboratory apparatus & calibration records">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">
        
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
        />

        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate("/equipment/list")} className="mb-4">
          Back
        </Button>

        <form onSubmit={(e) => handleSubmit(e, false)}>
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
                      label="Equipment Code"
                      name="equipmentCode"
                      value={formData.equipmentCode}
                      onChange={handleChange}
                      placeholder="Enter Equipment Code"
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
                      label="Model Number"
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
                      label="Capacity"
                      name="capacity"
                      value={formData.capacity}
                      onChange={handleChange}
                      placeholder="e.g. 2000 KN"
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

                    <Select
                      label="Location"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      options={locationOptions}
                      placeholder="Select Location"
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
                  </div>
                </div>

                {/* Section 2: Calibration Details */}
                <div className="pt-6 border-t border-[#F1F5F9]">
                  <h3 className="text-sm font-bold text-[#1A2733] flex items-center gap-2 mb-4">
                    <span className="w-5 h-5 bg-[#243744] text-white text-[10px] rounded-full flex items-center justify-center font-bold">2</span>
                    Calibration Details
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label="Calibration Required"
                      name="calibrationRequired"
                      value={formData.calibrationRequired}
                      onChange={handleChange}
                      options={[
                        { value: "Yes", label: "Yes" },
                        { value: "No", label: "No" }
                      ]}
                      required
                    />

                    {formData.calibrationRequired === "Yes" && (
                      <Select
                        label="Calibration Frequency"
                        name="frequency"
                        value={formData.frequency}
                        onChange={handleChange}
                        options={freqOptions}
                        required
                        error={errors.frequency}
                      />
                    )}
                  </div>
                </div>

              </div>

              {/* Right Column - Uploads & Reminders */}
              <div className="space-y-6">
                
                {/* Upload Photograph Box */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Equipment Photograph</h3>
                  
                  {/* File Dropzone */}
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl p-5 bg-gray-50 hover:bg-gray-100 flex flex-col items-center justify-center cursor-pointer transition-colors text-center">
                    <Upload className="text-gray-400 w-8 h-8 mb-1.5" />
                    <span className="text-xs font-bold text-gray-700 block">Drag & drop image here</span>
                    <span className="text-[10px] text-gray-400 font-semibold my-1">or</span>
                    <button
                      type="button"
                      onClick={() => triggerFileUpload("Photograph")}
                      className="text-[10px] font-bold text-[#243744] bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      Upload Photograph
                    </button>
                  </div>

                  {selectedFiles["Photograph"] && (
                    <div className="text-xs text-emerald-600 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-100 truncate">
                      ✓ Selected: {selectedFiles["Photograph"].name}
                    </div>
                  )}
                </div>

                {/* Calibration Due Box */}
                {formData.calibrationRequired === "Yes" && (
                  <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm space-y-4">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Calibration Due Date</h3>

                    <div className="space-y-4">
                      <Input
                        label="Next Calibration Due Date"
                        name="nextDue"
                        type="date"
                        value={formData.nextDue}
                        onChange={handleChange}
                        required
                        error={errors.nextDue}
                      />
                    </div>
                  </div>
                )}

              </div>

            </div>

            {/* Footer Action Buttons */}
            <div className="border-t border-[#F1F5F9] mt-8 pt-6 flex flex-wrap items-center justify-end gap-3">
              <Button variant="secondary" onClick={() => navigate("/equipment/list")}>
                Cancel
              </Button>
              
              <Button
                variant="secondary"
                disabled={loading}
                onClick={() => handleSubmit(null, true)}
                icon={Plus}
              >
                Save & Add Another
              </Button>

              <Button
                type="submit"
                disabled={loading}
                loading={loading}
                icon={Save}
              >
                Save Equipment
              </Button>
            </div>

          </div>
        </form>

      </div>
    </MainLayout>
  );
};

export default AddEquipment;
