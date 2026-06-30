import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usersAPI } from "../../api/users";
import { MainLayout } from "../../components/layout";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import SecurityIcon from "@mui/icons-material/Security";
import MoreVertIcon from "@mui/icons-material/MoreVert";

const ViewUser = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [userData, setUserData] = useState({
    user_id: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role_name: "",
    is_active: true,
    created_at: "",
    last_login: ""
  });
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState("bottom");

  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

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

  const fetchUserData = async () => {
    try {
      setLoading(true);
      // TODO: Create getUser API endpoint
      // For now, we'll use mock user data
      const mockUser = {
        user_id: userId,
        first_name: "John",
        last_name: "Doe",
        email: "john.doe@example.com",
        phone: "1234567890",
        role_name: "Admin",
        is_active: true,
        created_at: "2024-03-24T10:30:00Z",
        last_login: "2024-03-24T15:45:00Z"
      };
      
      setUserData(mockUser);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
      setErrorMessage("Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  const handleEdit = () => {
    navigate(`/users/${userId}/edit`);
  };

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

  if (loading) {
    return (
      <MainLayout headerTitle="View User" headerSubtitle="Loading user details...">
        <div className="p-6 flex justify-center items-center">
          <div className="text-gray-500">Loading user information...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout headerTitle="View User" headerSubtitle="User details and information">
      <div className="p-6">
        {/* Back Button */}
        <button
          onClick={() => navigate("/users")}
          className="mb-4 flex items-center gap-2 text-[#2d66b3] font-medium hover:text-[#1f5498] transition-colors"
        >
          <ArrowBackIcon fontSize="small" />
          Back
        </button>
        
        <div className="w-full">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
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

            {/* User Details */}
            <div className="p-8">
              {/* Header with Status and 3-dot menu */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-[#2b63ae] rounded-full flex items-center justify-center">
                      <PersonIcon className="text-white text-2xl" />
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-2xl font-bold text-gray-800 break-words">
                        {userData.first_name} {userData.last_name}
                      </h1>
                      <p className="text-gray-600">{userData.email}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 relative">
                  <span className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium ${
                    userData.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {userData.is_active ? 'Active' : 'Inactive'}
                  </span>

                  {/* Action Dropdown */}
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
                            onClick={() => {
                              navigate(`/users/${userId}/edit`);
                              setShowActionDropdown(false);
                            }}
                            className="flex items-center gap-2 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
                          >
                            <EditIcon className="w-4 h-4 shrink-0" />
                            <span>Edit Profile</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Personal Info */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Personal Information */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                      Personal Information
                    </h2>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-500">First Name</label>
                          <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg">
                            <p className="text-gray-800 font-medium">{userData.first_name}</p>
                          </div>
                        </div>
                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-500">Last Name</label>
                          <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg">
                            <p className="text-gray-800 font-medium">{userData.last_name}</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-500">Email Address</label>
                        <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <EmailIcon className="text-gray-400 text-sm" />
                            <p className="text-gray-800 font-medium">{userData.email}</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-500">Phone Number</label>
                        <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <PhoneIcon className="text-gray-400 text-sm" />
                            <p className="text-gray-800 font-medium">{userData.phone || "Not provided"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Account & Status */}
                <div className="space-y-6">
                  {/* Account Information */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                      Account Information
                    </h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-500">Role</label>
                        <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <BusinessIcon className="text-gray-400 text-sm" />
                            <p className="text-gray-800 font-medium">{userData.role_name}</p>
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
      </div>
    </MainLayout>
  );
};

export default ViewUser;
