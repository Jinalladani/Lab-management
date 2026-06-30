import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "../components/layout";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import WorkIcon from "@mui/icons-material/Work";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import MoreVertIcon from "@mui/icons-material/MoreVert";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState("bottom");
  const [formData, setFormData] = useState({
    first_name: "",
    email: "",
    role: ""
  });
  const [saveLoading, setSaveLoading] = useState(false);

  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const userData = (() => {
      try {
        const raw = localStorage.getItem("user");
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();
    
    setUser(userData);
    if (userData) {
      setFormData({
        first_name: userData.first_name || "",
        email: userData.email || "",
        role: userData.role || ""
      });
    }
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
    if (user) {
      setFormData({
        first_name: user.first_name || "",
        email: user.email || "",
        role: user.role || ""
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
      // Here you would typically make an API call to update the user profile
      // For now, we'll just update the local storage
      const updatedUser = {
        ...user,
        first_name: formData.first_name,
        email: formData.email,
        role: formData.role
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setSaveLoading(false);
    }
  };

  if (!user) {
    return (
      <MainLayout
        headerTitle="Profile"
        headerSubtitle="Loading profile..."
      >
        <div className="p-6">
          <div className="text-center">Loading profile...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      headerTitle="Profile"
      headerSubtitle={`Viewing ${user.first_name || "User"} Profile`}
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
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        className="w-full bg-transparent border-b-2 border-gray-300 focus:border-[#2d66b3] outline-none text-xl sm:text-2xl font-bold text-gray-900 break-words"
                        placeholder="Your Name"
                      />
                    ) : (
                      user.first_name || "User Profile"
                    )}
                  </h1>
                  <p className="text-gray-600 mt-1 text-sm sm:text-base break-words">
                    User Account Information
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 relative">
                  <span className="px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-medium bg-blue-100 text-blue-700 whitespace-nowrap">
                    {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "User"}
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
                              <span>Edit Profile</span>
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
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
                {/* Left Column - Main Information */}
                <div className="xl:col-span-2 space-y-4 lg:space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                      <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                      Basic Information
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-500">
                          Full Name
                        </label>
                        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                          {isEditing ? (
                            <input
                              type="text"
                              name="first_name"
                              value={formData.first_name}
                              onChange={handleInputChange}
                              className="w-full bg-transparent outline-none text-sm sm:text-base font-medium text-gray-900 break-words"
                              placeholder="Your Name"
                            />
                          ) : (
                            <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                              {user.first_name || "-"}
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
                              placeholder="email@example.com"
                            />
                          ) : (
                            <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                              {user.email || "-"}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Role & Metadata */}
                <div className="space-y-4 lg:space-y-6">
                  {/* User Role */}
                  <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                      <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                      User Role
                    </h2>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-500">
                        Role
                      </label>
                      <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                        <p className="text-sm sm:text-base font-medium text-gray-900 break-words capitalize">
                          {user.role || "-"}
                        </p>
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

export default Profile;
