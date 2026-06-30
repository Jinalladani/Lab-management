import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MainLayout } from "../../../components/layout";
import { useNavigate } from "react-router-dom";
import { api } from "../../../api";
import {
  Business,
  People,
  Assessment,
  Phone,
  Email,
  LocationOn,
  TrendingUp,
  Visibility,
  Edit,
  Delete,
  Search,
  FilterList,
  MoreVert,
} from "@mui/icons-material";

const DROPDOWN_WIDTH = 180;
const DROPDOWN_HEIGHT = 120;
const DROPDOWN_GAP = 8;

const ActionDropdownPortal = ({
  anchorEl,
  open,
  onClose,
  onView,
  onEdit,
  onDelete
}) => {
  const [style, setStyle] = useState(null);

  useEffect(() => {
    if (!open || !anchorEl) return;

    const updatePosition = () => {
      const rect = anchorEl.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      let top;
      if (spaceBelow >= DROPDOWN_HEIGHT + DROPDOWN_GAP) {
        top = rect.bottom + DROPDOWN_GAP;
      } else if (spaceAbove >= DROPDOWN_HEIGHT + DROPDOWN_GAP) {
        top = rect.top - DROPDOWN_HEIGHT - DROPDOWN_GAP;
      } else {
        top =
          spaceBelow >= spaceAbove
            ? Math.max(8, rect.bottom + DROPDOWN_GAP)
            : Math.max(8, rect.top - DROPDOWN_HEIGHT - DROPDOWN_GAP);
      }

      let left = rect.right - DROPDOWN_WIDTH;

      if (left < 8) left = 8;
      if (left + DROPDOWN_WIDTH > viewportWidth - 8) {
        left = viewportWidth - DROPDOWN_WIDTH - 8;
      }

      setStyle({
        position: "fixed",
        top: `${top}px`,
        left: `${left}px`,
        width: `${DROPDOWN_WIDTH}px`,
        zIndex: 99999,
      });
    };

    const handleClickOutside = (event) => {
      if (
        anchorEl &&
        !anchorEl.contains(event.target) &&
        !event.target.closest(".action-dropdown-portal")
      ) {
        onClose();
      }
    };

    updatePosition();

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, anchorEl, onClose]);

  if (!open || !anchorEl || !style) return null;

  return createPortal(
    <div
      style={style}
      className="action-dropdown-portal bg-white border border-gray-200 rounded-xl shadow-xl py-2 overflow-hidden"
    >
      <button
        type="button"
        onClick={onView}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50"
      >
        <Visibility fontSize="small" />
        <span>View Details</span>
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50"
      >
        <Edit fontSize="small" />
        <span>Edit Lab</span>
      </button>
      {/* <button
        type="button"
        onClick={onDelete}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-red-600 hover:bg-red-50"
      >
        <Delete fontSize="small" />
        <span>Delete Lab</span>
      </button> */}
    </div>,
    document.body
  );
};

const LabManagement = () => {
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [activeAnchorEl, setActiveAnchorEl] = useState(null);
  const actionButtonRefs = useRef({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchLabs();
  }, []);

  const fetchLabs = async () => {
    try {
      setLoading(true);
      const response = await api.get("/superadmin/labs");
      setLabs(response.data.data || []);
    } catch (error) {
      console.error("Error fetching labs:", error);
      setError("Failed to load labs");
    } finally {
      setLoading(false);
    }
  };

  const filteredLabs = labs.filter(lab => {
    const matchesSearch = lab.lab_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lab.contact_email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || lab.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const closeDropdown = () => {
    setActiveDropdownId(null);
    setActiveAnchorEl(null);
  };

  const handleToggleDropdown = (labId, event) => {
    const buttonEl = event.currentTarget;
    
    if (activeDropdownId === labId) {
      closeDropdown();
    } else {
      setActiveDropdownId(labId);
      setActiveAnchorEl(buttonEl);
    }
  };

  const handleViewLab = (labId) => {
    closeDropdown();
    navigate(`/labs/view/${labId}`);
  };

  const handleEditLab = (labId) => {
    closeDropdown();
    navigate(`/labs/edit/${labId}`);
  };

  const handleDeleteLab = async (labId) => {
    closeDropdown();
    const lab = labs.find(l => l.lab_id === labId);
    if (window.confirm(`Are you sure you want to delete ${lab.lab_name}?`)) {
      try {
        await api.delete(`/superadmin/labs/${labId}`);
        fetchLabs(); // Refresh list
      } catch (error) {
        console.error("Error deleting lab:", error);
        alert("Failed to delete lab");
      }
    }
  };


  const formatStatusForDisplay = (status) => {
    return status === 'active' ? 'Active' : 'Inactive';
  };

  if (loading) {
    return (
      <MainLayout headerTitle="Lab Management" headerSubtitle="Manage all laboratories">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-[#2d66b3] shadow-lg"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading labs...</p>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout headerTitle="Lab Management" headerSubtitle="Error">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-red-500 text-xl font-bold mb-4">{error}</div>
          <button
            onClick={fetchLabs}
            className="px-6 py-3 bg-gradient-to-r from-[#2d66b3] to-[#1f5498] text-white rounded-xl hover:shadow-lg transition-all duration-300 font-semibold"
          >
            Retry
          </button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout headerTitle="Lab Management" headerSubtitle="Manage all laboratories">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <input
            type="text"
            placeholder="Search labs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:max-w-[320px] border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-100"
          />

          <div className="flex gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button
              onClick={() => navigate('/superadmin/add-lab')}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#2d66b3] text-white font-medium hover:bg-[#1f5498] whitespace-nowrap"
            >
              Add Lab
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Labs</p>
                <p className="text-2xl font-bold text-gray-900">{labs.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#2d66b3] flex items-center justify-center">
                <Business className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Labs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {labs.filter(lab => lab.status === 'active').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900">
                  {labs.reduce((sum, lab) => sum + (lab.total_projects || 0), 0)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center">
                <Assessment className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Clients</p>
                <p className="text-2xl font-bold text-gray-900">
                  {labs.reduce((sum, lab) => sum + (lab.total_clients || 0), 0)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center">
                <People className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div> */}

        {/* Desktop Table */}
        <div className="hidden lg:block">
          <div className="bg-white rounded-xl shadow border border-gray-200">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead className="bg-[#eef5fd]">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Lab Name
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Email
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Phone
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Address
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Projects
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Clients
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Users
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 w-[90px]">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {!loading && filteredLabs.length === 0 && (
                    <tr>
                      <td
                        colSpan="9"
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        No labs found
                      </td>
                    </tr>
                  )}

                  {filteredLabs.map((lab) => (
                    <tr
                      key={lab.lab_id}
                      className="border-t border-gray-200"
                    >
                      <td className="px-4 py-4 text-gray-900">
                        <div className="max-w-[200px] break-words font-medium">
                          {lab.lab_name}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-gray-900">
                        <div className="max-w-[180px] break-words">
                          {lab.contact_email || "-"}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-gray-900">
                        <div className="max-w-[120px] break-words">
                          {lab.contact_phone || "-"}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-gray-900">
                        <div className="max-w-[200px] break-words">
                          {lab.address || "-"}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-gray-900">
                        {lab.total_projects ?? 0}
                      </td>

                      <td className="px-4 py-4 text-gray-900">
                        {lab.total_clients ?? 0}
                      </td>

                      <td className="px-4 py-4 text-gray-900">
                        {lab.total_users ?? 0}
                      </td>

                      <td className="px-4 py-4">
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 whitespace-nowrap">
                          {formatStatusForDisplay(lab.status)}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <button
                          type="button"
                          ref={(el) => {
                            actionButtonRefs.current[lab.lab_id] = el;
                          }}
                          onClick={(e) =>
                            handleToggleDropdown(lab.lab_id, e)
                          }
                          className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                          title="Actions"
                        >
                          <MoreVert fontSize="small" />
                        </button>

                        <ActionDropdownPortal
                          anchorEl={
                            activeDropdownId === lab.lab_id
                              ? activeAnchorEl
                              : null
                          }
                          open={activeDropdownId === lab.lab_id}
                          onClose={closeDropdown}
                          onView={() => handleViewLab(lab.lab_id)}
                          onEdit={() => handleEditLab(lab.lab_id)}
                          onDelete={() => handleDeleteLab(lab.lab_id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-4">
          {!loading && filteredLabs.length === 0 && (
            <div className="bg-white rounded-xl shadow p-6 text-center text-gray-500 border border-gray-200">
              No labs found
            </div>
          )}

          {filteredLabs.map((lab) => (
            <div
              key={lab.lab_id}
              className="bg-white rounded-xl shadow border border-gray-200 p-5"
            >
              <div className="flex justify-between items-start mb-4 gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg text-gray-900 break-words mb-1">
                    {lab.lab_name}
                  </h3>
                  <p className="text-sm text-gray-500 break-words">
                    {lab.contact_email || "No email"}
                  </p>
                </div>

                <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 whitespace-nowrap">
                  {formatStatusForDisplay(lab.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Phone</p>
                  <p className="text-sm font-medium break-words">
                    {lab.contact_phone || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Address</p>
                  <p className="text-sm font-medium break-words">
                    {lab.address || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Projects</p>
                  <p className="text-sm font-medium">
                    {lab.total_projects ?? 0}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Clients</p>
                  <p className="text-sm font-medium">
                    {lab.total_clients ?? 0}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Users</p>
                  <p className="text-sm font-medium">
                    {lab.total_users ?? 0}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t">
                <button
                  type="button"
                  ref={(el) => {
                    actionButtonRefs.current[lab.lab_id] = el;
                  }}
                  onClick={(e) => handleToggleDropdown(lab.lab_id, e)}
                  className="flex items-center justify-center gap-2 w-full text-[#2d66b3] hover:bg-blue-50 py-2 rounded-lg transition-colors"
                >
                  <MoreVert fontSize="small" />
                  <span className="text-sm">Actions</span>
                </button>

                <ActionDropdownPortal
                  anchorEl={
                    activeDropdownId === lab.lab_id
                      ? activeAnchorEl
                      : null
                  }
                  open={activeDropdownId === lab.lab_id}
                  onClose={closeDropdown}
                  onView={() => handleViewLab(lab.lab_id)}
                  onEdit={() => handleEditLab(lab.lab_id)}
                  onDelete={() => handleDeleteLab(lab.lab_id)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default LabManagement;
