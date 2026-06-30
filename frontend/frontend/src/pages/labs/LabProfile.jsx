import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getLabInfo, updateLabInfo } from "../../api/labs";
import { MainLayout } from "../../components/layout";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BusinessIcon from "@mui/icons-material/Business";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import PersonIcon from "@mui/icons-material/Person";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import MoreVertIcon from "@mui/icons-material/MoreVert";

const LabProfile = () => {
  const navigate = useNavigate();
  const [labData, setLabData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState("bottom");
  const [formData, setFormData] = useState({
    lab_name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    status: "active",
    // Document Details
    doc_no: "",
    issue_no: "",
    amend_no: "",
    doc_name: "",
    issue_date: "",
    amend_date: "",
    copy_no: "",
    section_no: "",
  });
  const [saveLoading, setSaveLoading] = useState(false);

  const dropdownRef = React.useRef(null);
  const buttonRef = React.useRef(null);

  // Format date to dd/mm/yyyy for display
  const formatDate = (dateString) => {
    if (!dateString) return "";
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      return dateString;
    }
  };

  // Format date to dd/mm/yyyy for display with fallback
  const formatDateDisplay = (dateString) => {
    if (!dateString) return "-";
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      return dateString;
    }
  };

  // Format date to YYYY-MM-DD for input field
  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      return "";
    }
  };

  const fetchLabInfo = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getLabInfo();
      const labInfo = response.data?.data;
      
      if (labInfo) {
        setLabData(labInfo);
        setFormData({
          lab_name: labInfo.lab_name || "",
          contact_person: labInfo.contact_person || "",
          email: labInfo.email || "",
          phone: labInfo.phone || "",
          address: labInfo.address || "",
          status: labInfo.status || "active",
          // Document Details - format dates as dd/mm/yyyy
          doc_no: labInfo.doc_no || "",
          issue_no: labInfo.issue_no || "",
          amend_no: labInfo.amend_no || "",
          doc_name: labInfo.doc_name || "",
          issue_date: formatDate(labInfo.issue_date),
          amend_date: formatDate(labInfo.amend_date),
          copy_no: labInfo.copy_no || "",
          section_no: labInfo.section_no || "",
        });
      }
    } catch (error) {
      setError(error?.response?.data?.message || "Failed to fetch lab information");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabInfo();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setShowActionDropdown(false);
      }
    };

    const handleResize = () => {
      if (showActionDropdown) {
        updateDropdownPosition();
      }
    };

    const handleScroll = () => {
      if (showActionDropdown) {
        updateDropdownPosition();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [showActionDropdown]);

  const updateDropdownPosition = () => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedDropdownHeight = 120;

    if (spaceBelow < estimatedDropdownHeight && rect.top > estimatedDropdownHeight) {
      setDropdownPosition("top");
    } else {
      setDropdownPosition("bottom");
    }
  };

  const handleDropdownToggle = () => {
    if (!showActionDropdown) {
      updateDropdownPosition();
    }
    setShowActionDropdown((prev) => !prev);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setShowActionDropdown(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (labData) {
      setFormData({
        lab_name: labData.lab_name || "",
        contact_person: labData.contact_person || "",
        email: labData.email || "",
        phone: labData.phone || "",
        address: labData.address || "",
        status: labData.status || "active"
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaveLoading(true);
      setError("");
      
      await updateLabInfo(formData);
      await fetchLabInfo();
      setIsEditing(false);
    } catch (error) {
      setError(error?.response?.data?.message || "Failed to update lab information");
    } finally {
      setSaveLoading(false);
    }
  };

  const formatStatusForDisplay = (status) => {
    if (!status) return "-";
    
    const statusMap = {
      'active': 'Active',
      'inactive': 'Inactive'
    };
    
    return statusMap[status] || status;
  };

  if (loading) {
    return (
      <MainLayout
        headerTitle="Lab Profile"
        headerSubtitle="Loading lab information..."
      >
        <div className="p-6">
          <div className="text-center">Loading lab information...</div>
        </div>
      </MainLayout>
    );
  }

  if (error && !labData) {
    return (
      <MainLayout headerTitle="Lab Profile" headerSubtitle="Error loading data">
        <div className="p-6 text-red-500">{error}</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      headerTitle="Lab Profile"
      headerSubtitle={`Viewing ${labData?.lab_name || "Lab Information"}`}
    >
      <div className="p-4 sm:p-6">
        {/* Back Button */}
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-4 flex items-center gap-2 text-[#2d66b3] font-medium hover:text-[#1f5498] transition-colors"
        >
          <ArrowBackIcon fontSize="small" />
          Back
        </button>

        <div className="w-full">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-visible">
            {/* Header Section */}
            <div className="p-4 sm:p-6 lg:p-8 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
                    {isEditing ? (
                      <input
                        type="text"
                        name="lab_name"
                        value={formData.lab_name}
                        onChange={handleInputChange}
                        className="w-full bg-transparent border-b-2 border-gray-300 focus:border-[#2d66b3] outline-none text-xl sm:text-2xl font-bold text-gray-900 break-words"
                        placeholder="Lab Name"
                      />
                    ) : (
                      labData?.lab_name || "Lab Name"
                    )}
                  </h1>
                  <p className="text-gray-600 mt-1 text-sm sm:text-base break-words">
                    Laboratory Information
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 relative">
                  <span className={`px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ${
                    (isEditing ? formData.status : labData?.status) === 'active' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {formatStatusForDisplay(isEditing ? formData.status : labData?.status)}
                  </span>

                  {/* Action Dropdown */}
                  {!isEditing && (
                    <div className="relative shrink-0">
                      <button
                        ref={buttonRef}
                        onClick={handleDropdownToggle}
                        className="flex items-center justify-center p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                        title="Actions"
                      >
                        <MoreVertIcon className="w-5 h-5 text-gray-600" />
                      </button>

                      {showActionDropdown && (
                        <div
                          ref={dropdownRef}
                          className={`
                            absolute right-0 z-[9999]
                            w-44 sm:w-48
                            bg-white rounded-lg shadow-xl border border-gray-200
                            overflow-hidden
                            ${dropdownPosition === "top" ? "bottom-full mb-2" : "top-full mt-2"}
                            
                            max-[480px]:right-0
                            max-[480px]:w-40
                          `}
                        >
                          <div className="py-1">
                            <button
                              onClick={handleEdit}
                              className="flex items-center gap-2 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
                            >
                              <EditIcon className="w-4 h-4 shrink-0" />
                              <span>Edit Lab</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Edit Mode Actions */}
                  {isEditing && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSave}
                        disabled={saveLoading}
                        className="flex items-center justify-center p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                        title={saveLoading ? "Saving..." : "Save"}
                      >
                        <SaveIcon className="w-5 h-5 text-gray-600" />
                      </button>
                      <button
                        onClick={handleCancel}
                        className="flex items-center justify-center p-1 rounded hover:bg-gray-100 transition-colors"
                        title="Cancel"
                      >
                        <CancelIcon className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="space-y-4 lg:space-y-6">
                {/* Full Width Information Sections */}
                <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                    <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                    Basic Information
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-500">
                          Lab Name
                        </label>
                        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                          {isEditing ? (
                            <input
                              type="text"
                              name="lab_name"
                              value={formData.lab_name}
                              onChange={handleInputChange}
                              className="w-full bg-transparent outline-none text-sm sm:text-base font-medium text-gray-900 break-words"
                              placeholder="Lab Name"
                            />
                          ) : (
                            <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                              {labData?.lab_name || "-"}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-500">
                          Contact Person
                        </label>
                        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                          {isEditing ? (
                            <input
                              type="text"
                              name="contact_person"
                              value={formData.contact_person}
                              onChange={handleInputChange}
                              className="w-full bg-transparent outline-none text-sm sm:text-base font-medium text-gray-900 break-words"
                              placeholder="Contact Person Name"
                            />
                          ) : (
                            <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                              {labData?.contact_person || "-"}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-500">
                          Email Address
                        </label>
                        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                          {isEditing ? (
                            <input
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              className="w-full bg-transparent outline-none text-sm sm:text-base font-medium text-gray-900 break-words"
                              placeholder="email@lab.com"
                            />
                          ) : (
                            <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                              {labData?.email || "-"}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-500">
                          Phone Number
                        </label>
                        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                          {isEditing ? (
                            <input
                              type="tel"
                              name="phone"
                              value={formData.phone}
                              onChange={handleInputChange}
                              className="w-full bg-transparent outline-none text-sm sm:text-base font-medium text-gray-900 break-words"
                              placeholder="+1 234 567 8900"
                            />
                          ) : (
                            <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                              {labData?.phone || "-"}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 sm:mt-4">
                      <label className="block mb-2 text-sm font-medium text-gray-500">
                        Address
                      </label>
                      <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg min-h-[100px] sm:min-h-[120px]">
                        {isEditing ? (
                          <textarea
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            rows={4}
                            className="w-full bg-transparent outline-none text-sm sm:text-base font-medium text-gray-900 break-words resize-none"
                            placeholder="Lab address"
                          />
                        ) : (
                          <p className="text-sm sm:text-base font-medium text-gray-900 break-words whitespace-pre-wrap">
                            {labData?.address || "-"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Document Details */}
                  <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                      <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                      Document Details
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-500">
                          Doc. No.
                        </label>
                        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                          {isEditing ? (
                            <input
                              type="text"
                              name="doc_no"
                              value={formData.doc_no}
                              onChange={handleInputChange}
                              className="w-full bg-transparent outline-none text-sm sm:text-base font-medium text-gray-900 break-words"
                              placeholder="Enter document number"
                            />
                          ) : (
                            <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                              {labData?.doc_no || "-"}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-500">
                          Issue No.
                        </label>
                        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                          {isEditing ? (
                            <input
                              type="text"
                              name="issue_no"
                              value={formData.issue_no}
                              onChange={handleInputChange}
                              className="w-full bg-transparent outline-none text-sm sm:text-base font-medium text-gray-900 break-words"
                              placeholder="Enter issue number"
                            />
                          ) : (
                            <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                              {labData?.issue_no || "-"}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-500">
                          Amend No.
                        </label>
                        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                          {isEditing ? (
                            <input
                              type="text"
                              name="amend_no"
                              value={formData.amend_no}
                              onChange={handleInputChange}
                              className="w-full bg-transparent outline-none text-sm sm:text-base font-medium text-gray-900 break-words"
                              placeholder="Enter amendment number"
                            />
                          ) : (
                            <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                              {labData?.amend_no || "-"}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-500">
                          Doc. Name
                        </label>
                        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                          {isEditing ? (
                            <input
                              type="text"
                              name="doc_name"
                              value={formData.doc_name}
                              onChange={handleInputChange}
                              className="w-full bg-transparent outline-none text-sm sm:text-base font-medium text-gray-900 break-words"
                              placeholder="Enter document name"
                            />
                          ) : (
                            <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                              {labData?.doc_name || "-"}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-500">
                          Issue Date
                        </label>
                        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                          {isEditing ? (
                            <input
                              type="text"
                              name="issue_date"
                              value={formData.issue_date}
                              onChange={handleInputChange}
                              placeholder="dd/mm/yyyy"
                              className="w-full bg-transparent outline-none text-sm sm:text-base font-medium text-gray-900 break-words"
                            />
                          ) : (
                            <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                              {formatDateDisplay(labData?.issue_date)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-500">
                          Amend Date
                        </label>
                        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                          {isEditing ? (
                            <input
                              type="text"
                              name="amend_date"
                              value={formData.amend_date}
                              onChange={handleInputChange}
                              placeholder="dd/mm/yyyy"
                              className="w-full bg-transparent outline-none text-sm sm:text-base font-medium text-gray-900 break-words"
                            />
                          ) : (
                            <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                              {formatDateDisplay(labData?.amend_date)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-500">
                          Copy No.
                        </label>
                        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                          {isEditing ? (
                            <input
                              type="text"
                              name="copy_no"
                              value={formData.copy_no}
                              onChange={handleInputChange}
                              className="w-full bg-transparent outline-none text-sm sm:text-base font-medium text-gray-900 break-words"
                              placeholder="Enter copy number"
                            />
                          ) : (
                            <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                              {labData?.copy_no || "-"}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-500">
                          Section No.
                        </label>
                        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                          {isEditing ? (
                            <input
                              type="text"
                              name="section_no"
                              value={formData.section_no}
                              onChange={handleInputChange}
                              className="w-full bg-transparent outline-none text-sm sm:text-base font-medium text-gray-900 break-words"
                              placeholder="Enter section number"
                            />
                          ) : (
                            <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                              {labData?.section_no || "-"}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}
      
    </MainLayout>
  );
};

export default LabProfile;
