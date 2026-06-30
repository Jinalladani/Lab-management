import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { getClients } from "../../api/clients";
import { Link, useNavigate } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import Visibility from "@mui/icons-material/Visibility";
import Edit from "@mui/icons-material/Edit";
import MoreVert from "@mui/icons-material/MoreVert";

const DROPDOWN_WIDTH = 180;
const DROPDOWN_HEIGHT = 100;
const DROPDOWN_GAP = 8;

const ActionDropdownPortal = ({
  anchorEl,
  open,
  onClose,
  onView,
  onEdit,
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
        <span>Edit Client</span>
      </button>
    </div>,
    document.body
  );
};

const LabClientsList = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [activeAnchorEl, setActiveAnchorEl] = useState(null);
  const actionButtonRefs = useRef({});

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await getClients({
        search,
      });

      setClients(response.data?.data || []);
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message || "Failed to fetch lab clients"
      );
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchClients();
  }, [search]);


  const closeDropdown = () => {
    setActiveDropdownId(null);
    setActiveAnchorEl(null);
  };

  const handleToggleDropdown = (clientId, event) => {
    const buttonEl = event.currentTarget;
    
    if (activeDropdownId === clientId) {
      closeDropdown();
    } else {
      setActiveDropdownId(clientId);
      setActiveAnchorEl(buttonEl);
    }
  };

  const handleView = (clientId) => {
    closeDropdown();
    navigate(`/labClients/view/${clientId}`);
  };

  const handleEdit = (clientId) => {
    closeDropdown();
    navigate(`/labClients/edit/${clientId}`);
  };

  return (
    <MainLayout headerTitle="Clients" headerSubtitle="Manage your lab clients">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <input
            type="text"
            placeholder="Search lab clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:max-w-[320px] border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-100"
          />
          <Link
            to="/labClients/add"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#2d66b3] text-white font-medium hover:bg-[#1f5498] whitespace-nowrap"
          >
            Add Client
          </Link>
        </div>


        {errorMessage && (
          <p className="text-red-500 text-sm mb-4">{errorMessage}</p>
        )}

        {/* Desktop Table View */}
        <div className="hidden lg:block">
          <div className="bg-white rounded-xl shadow border border-gray-200">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead className="bg-[#eef5fd]">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Company Name
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Contact Person
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Email
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Phone
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      City
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      GST No
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
                  {!loading && clients.length === 0 && (
                    <tr>
                      <td
                        colSpan="8"
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        No lab clients found
                      </td>
                    </tr>
                  )}

                  {loading && (
                    <tr>
                      <td
                        colSpan="8"
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        Loading...
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    clients.map((client) => (
                      <tr
                        key={client.client_id}
                        className="border-t border-gray-200"
                      >
                        <td className="px-4 py-4 text-gray-900">
                          <div className="max-w-[150px] break-words font-medium">
                            {client.client_name}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-gray-900">
                          <div className="max-w-[150px] break-words">
                            {client.contact_person || "-"}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-gray-900">
                          <div className="max-w-[180px] break-words">
                            {client.email || "-"}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-gray-900">
                          <div className="max-w-[120px] break-words">
                            {client.phone || "-"}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-gray-900">
                          <div className="max-w-[100px] break-words">
                            {client.city || "-"}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-gray-900">
                          <div className="max-w-[120px] break-words">
                            {client.gst_no || "-"}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 whitespace-nowrap">
                            {client.status}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <button
                            type="button"
                            ref={(el) => {
                              actionButtonRefs.current[client.client_id] = el;
                            }}
                            onClick={(e) =>
                              handleToggleDropdown(client.client_id, e)
                            }
                            className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                            title="Actions"
                          >
                            <MoreVert fontSize="small" />
                          </button>

                          <ActionDropdownPortal
                            anchorEl={
                              activeDropdownId === client.client_id
                                ? activeAnchorEl
                                : null
                            }
                            open={activeDropdownId === client.client_id}
                            onClose={closeDropdown}
                            onView={() => handleView(client.client_id)}
                            onEdit={() => handleEdit(client.client_id)}
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
          {!loading && clients.length === 0 && (
            <div className="bg-white rounded-xl shadow p-6 text-center text-gray-500 border border-gray-200">
              No lab clients found
            </div>
          )}

          {loading && (
            <div className="bg-white rounded-xl shadow p-6 text-center text-gray-500 border border-gray-200">
              Loading...
            </div>
          )}

          {!loading &&
            clients.map((client) => (
              <div
                key={client.client_id}
                className="bg-white rounded-xl shadow border border-gray-200 p-5"
              >
                <div className="flex justify-between items-start mb-4 gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-gray-900 break-words mb-1">
                      {client.client_name}
                    </h3>
                    <p className="text-sm text-gray-500 break-words">
                      {client.contact_person || "No contact person"}
                    </p>
                  </div>

                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 whitespace-nowrap">
                    {client.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Email</p>
                    <p className="text-sm font-medium break-words">
                      {client.email || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Phone</p>
                    <p className="text-sm font-medium break-words">
                      {client.phone || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">City</p>
                    <p className="text-sm font-medium break-words">
                      {client.city || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">GST No</p>
                    <p className="text-sm font-medium break-words">
                      {client.gst_no || "-"}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <button
                    type="button"
                    ref={(el) => {
                      actionButtonRefs.current[client.client_id] = el;
                    }}
                    onClick={(e) => handleToggleDropdown(client.client_id, e)}
                    className="flex items-center justify-center gap-2 w-full text-[#2d66b3] hover:bg-blue-50 py-2 rounded-lg transition-colors"
                  >
                    <MoreVert fontSize="small" />
                    <span className="text-sm">Actions</span>
                  </button>

                  <ActionDropdownPortal
                    anchorEl={
                      activeDropdownId === client.client_id
                        ? activeAnchorEl
                        : null
                    }
                    open={activeDropdownId === client.client_id}
                    onClose={closeDropdown}
                    onView={() => handleView(client.client_id)}
                    onEdit={() => handleEdit(client.client_id)}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default LabClientsList;
