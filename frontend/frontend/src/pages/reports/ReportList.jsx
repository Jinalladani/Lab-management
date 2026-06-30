import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getReports } from "../../api/reports";
import { Link, useNavigate } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ScienceIcon from "@mui/icons-material/Science";
import DeleteIcon from "@mui/icons-material/Delete";

const DROPDOWN_WIDTH = 180;
const DROPDOWN_HEIGHT = 150;
const DROPDOWN_GAP = 8;

// Simple ActionButton component to avoid useRef issues
const ActionButton = ({ reportId, activeDropdownId, setActiveDropdownId, setActiveAnchorEl, onView, onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef(null);

  const handleClick = (e) => {
    const buttonEl = e.currentTarget;
    
    if (activeDropdownId === reportId) {
      setIsOpen(false);
      setActiveDropdownId(null);
      setActiveAnchorEl(null);
      return;
    }

    setActiveDropdownId(reportId);
    setActiveAnchorEl(buttonEl);
    setIsOpen(true);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        className="p-1 hover:bg-gray-100 rounded"
      >
        <MoreVertIcon fontSize="small" />
      </button>
    </div>
  );
};

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
        <VisibilityIcon fontSize="small" />
        <span>View</span>
      </button>

      <button
        type="button"
        onClick={onEdit}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50"
      >
        <EditIcon fontSize="small" />
        <span>Edit</span>
      </button>

      <button
        type="button"
        onClick={onDelete}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50"
      >
        <DeleteIcon fontSize="small" />
        <span>Delete</span>
      </button>
    </div>,
    document.body
  );
};

const ReportList = () => {
  const navigate = useNavigate();
  const actionButtonRefs = useRef({});
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [activeAnchorEl, setActiveAnchorEl] = useState(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await getReports({ search });
      setReports(response?.data?.data || []);
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message || "Failed to fetch reports"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [search]);

  const closeDropdown = () => {
    setActiveDropdownId(null);
    setActiveAnchorEl(null);
  };

  const handleToggleDropdown = (reportId, event) => {
    const buttonEl = event.currentTarget;

    if (activeDropdownId === reportId) {
      closeDropdown();
      return;
    }

    setActiveDropdownId(reportId);
    setActiveAnchorEl(buttonEl);
  };

  const handleView = (reportId) => {
    closeDropdown();
    navigate(`/reports/view/${reportId}`);
  };

  const handleEdit = (reportId) => {
    closeDropdown();
    navigate(`/reports/edit/${reportId}`);
  };

  const handleDelete = (reportId) => {
    closeDropdown();
    // TODO: Implement delete functionality
    console.log("Delete report:", reportId);
  };

  return (
    <MainLayout headerTitle="Reports" headerSubtitle="Manage test reports">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="w-full md:max-w-[320px]">
            <input
              type="text"
              placeholder="Search reports..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:max-w-[320px] border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {errorMessage && (
          <p className="text-red-500 text-sm mb-4">{errorMessage}</p>
        )}

        {/* Desktop Table */}
        <div className="hidden lg:block">
          <div className="bg-white rounded-xl shadow border border-gray-200">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead className="bg-[#eef5fd]">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Report ID
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Sample Code
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Test Name
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Created Date
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      File
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 w-[90px]">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && reports.length === 0 && (
                    <tr>
                      <td
                        colSpan="7"
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        No reports found
                      </td>
                    </tr>
                  )}
                  {loading && (
                    <tr>
                      <td
                        colSpan="7"
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        Loading...
                      </td>
                    </tr>
                  )}
                  {reports.map((report) => (
                    <tr key={report.report_id}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {report.report_id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {report.sample_code}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {report.test_name}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          report.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : report.status === "in_progress"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {report.status === "completed"
                            ? "Completed"
                            : report.status === "in_progress"
                            ? "In Progress"
                            : "Pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(report.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {report.report_file ? (
                          <span className="text-green-600">Available</span>
                        ) : (
                          <span className="text-gray-500">Not Available</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <ActionButton
                          reportId={report.report_id}
                          activeDropdownId={activeDropdownId}
                          setActiveDropdownId={setActiveDropdownId}
                          setActiveAnchorEl={setActiveAnchorEl}
                          onView={() => navigate(`/reports/view/${report.report_id}`)}
                          onEdit={() => navigate(`/reports/edit/${report.report_id}`)}
                          onDelete={() => console.log("Delete report:", report.report_id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-4">
          {reports.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              No reports found
            </div>
          )}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          )}
          {reports.map((report) => (
            <div
              key={report.report_id}
              className="bg-white rounded-xl shadow border border-gray-200 p-4"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {report.sample_code}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {report.test_name}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  report.status === "completed"
                    ? "bg-green-100 text-green-800"
                    : report.status === "in_progress"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}>
                  {report.status === "completed"
                    ? "Completed"
                    : report.status === "in_progress"
                    ? "In Progress"
                    : "Pending"}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Created:</span>
                  <span className="text-sm text-gray-900">
                    {new Date(report.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">File:</span>
                  <span className="text-sm text-gray-900">
                    {report.report_file ? (
                      <span className="text-green-600">Available</span>
                    ) : (
                      <span className="text-gray-500">Not Available</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Link
                  to={`/reports/view/${report.report_id}`}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  View Report
                </Link>
                <Link
                  to={`/reports/edit/${report.report_id}`}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default ReportList;
