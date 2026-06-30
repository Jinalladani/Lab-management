import React, { useEffect, useRef, useState } from "react";
import { getClientById } from "../../api/clients";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import MoreVertIcon from "@mui/icons-material/MoreVert";

const LabClientView = () => {
  const params = useParams();
  const navigate = useNavigate();
  const client_id = params?.id || params.client_id;
  const clientId = client_id;

  const [client, setClient] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState("bottom");

  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const fetchClient = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await getClientById(clientId);
      setClient(response.data?.data || null);
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message || "Failed to fetch client details"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchClient();
    }
  }, [clientId]);

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
    const estimatedDropdownHeight = 110;

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
      <MainLayout
        headerTitle="Lab Client View"
        headerSubtitle="Loading client data..."
      >
        <div className="p-6">
          <div className="text-center">Loading client data...</div>
        </div>
      </MainLayout>
    );
  }

  if (errorMessage) {
    return (
      <MainLayout
        headerTitle="Lab Client View"
        headerSubtitle="Error loading data"
      >
        <div className="p-6 text-red-500">{errorMessage}</div>
      </MainLayout>
    );
  }

  if (!client) {
    return (
      <MainLayout headerTitle="Lab Client View" headerSubtitle="No data found">
        <div className="p-6">No client found</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      headerTitle="Lab Client View"
      headerSubtitle={`Viewing ${client?.client_name || "Client"}`}
    >
      <div className="p-4 sm:p-6">
        <button
          onClick={() => navigate("/labClients")}
          className="mb-4 flex items-center gap-2 text-[#2d66b3] font-medium hover:text-[#1f5498] transition-colors"
        >
          <ArrowBackIcon fontSize="small" />
          Back
        </button>

        <div className="w-full">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-visible">
            <div className="p-4 sm:p-6 lg:p-8 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
                    {client.client_name}
                  </h1>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 relative">
                  <span className="px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-medium bg-blue-100 text-blue-700 whitespace-nowrap">
                    {client.status}
                  </span>

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
                              navigate(`/labClients/edit/${clientId}`);
                              setShowActionDropdown(false);
                            }}
                            className="flex items-center gap-2 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
                          >
                            <EditIcon className="w-4 h-4 shrink-0" />
                            <span>Edit Client</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 lg:p-8">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
                <div className="xl:col-span-2 space-y-4 lg:space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                      <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                      Basic Information
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-500">
                          Company Name
                        </label>
                        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                          <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                            {client.client_name || "-"}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-500">
                          Contact Person
                        </label>
                        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                          <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                            {client.contact_person || "-"}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-500">
                          Email
                        </label>
                        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                          <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                            {client.email || "-"}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-500">
                          Phone
                        </label>
                        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                          <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                            {client.phone || "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                      <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                      Address Information
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="sm:col-span-2">
                        <label className="block mb-2 text-sm font-medium text-gray-500">
                          Address
                        </label>
                        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg min-h-[80px] sm:min-h-[100px]">
                          <p className="text-sm sm:text-base font-medium text-gray-900 break-words whitespace-pre-wrap">
                            {client.address || "-"}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-500">
                          City
                        </label>
                        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                          <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                            {client.city || "-"}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-500">
                          State
                        </label>
                        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                          <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                            {client.state || "-"}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-500">
                          Pincode
                        </label>
                        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                          <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                            {client.pincode || "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 lg:space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                      <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                      Tax Information
                    </h2>

                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-500">
                          GST Number
                        </label>
                        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                          <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                            {client.gst_no || "-"}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-500">
                          PAN Number
                        </label>
                        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                          <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                            {client.pan_no || "-"}
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
      </div>
    </MainLayout>
  );
};

export default LabClientView;