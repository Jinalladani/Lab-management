import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Edit,
  MoreHorizontal,
  Briefcase,
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Shield,
  Info
} from "lucide-react";
import { getClientById } from "../../api/clients";
import { MainLayout } from "../../components/layout";
import { Button } from "../../components/ui";

const getStatusBadge = (status) => {
  const norm = String(status || "").toLowerCase();
  const map = {
    active: { text: "Active", bg: "bg-[#ECFDF5] text-[#10B981] border-[#D1FAE5]", dot: "bg-[#10B981]" },
    inactive: { text: "Inactive", bg: "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]", dot: "bg-[#64748B]" },
    suspended: { text: "Suspended", bg: "bg-[#FEF2F2] text-[#EF4444] border-[#FEE2E2]", dot: "bg-[#EF4444]" },
  };
  const config = map[norm] || { text: status, bg: "bg-slate-50 text-slate-600 border-slate-200", dot: "bg-slate-500" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${config.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.text}
    </span>
  );
};

// Reusable Portal Action Menu to prevent parent clip and handle screen boundary directions
const PortalActionMenu = ({ anchorEl, open, onClose, actions }) => {
  const [style, setStyle] = useState(null);

  useEffect(() => {
    if (!open || !anchorEl) return;

    const updatePosition = () => {
      const rect = anchorEl.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const estimatedHeight = actions.length * 36 + 12;
      const dropdownWidth = 160;
      const gap = 6;

      const spaceBelow = viewportHeight - rect.bottom;
      
      let top;
      if (spaceBelow >= estimatedHeight + gap) {
        top = rect.bottom + window.scrollY + gap;
      } else {
        top = rect.top + window.scrollY - estimatedHeight - gap;
      }

      let left = rect.right - dropdownWidth + window.scrollX;
      if (left < 8) left = 8;
      if (left + dropdownWidth > viewportWidth - 8) {
        left = viewportWidth - dropdownWidth - 8;
      }

      setStyle({
        position: "absolute",
        top: `${top}px`,
        left: `${left}px`,
        width: `${dropdownWidth}px`,
        zIndex: 9999,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    const handleClickOutside = (event) => {
      if (anchorEl && !anchorEl.contains(event.target) && !event.target.closest(".portal-action-menu")) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, anchorEl, onClose, actions]);

  if (!open || !anchorEl || !style) return null;

  return createPortal(
    <div
      style={style}
      className="portal-action-menu bg-white rounded-xl border border-[#E2E8F0] shadow-lg py-1.5 text-left text-slate-800"
    >
      {actions.map((act, idx) => {
        const Icon = act.icon;
        return (
          <button
            key={idx}
            onClick={() => {
              onClose();
              act.onClick();
            }}
            className={`w-full px-4 py-2 text-xs font-semibold flex items-center gap-2 hover:bg-[#FAF9FF] transition-colors ${
              act.danger ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-[#475569] hover:text-[#243744]"
            }`}
          >
            {Icon && <Icon size={14} />}
            {act.label}
          </button>
        );
      })}
    </div>,
    document.body
  );
};

const LabClientView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Dropdown States
  const [showActions, setShowActions] = useState(false);
  const [activeAnchorEl, setActiveAnchorEl] = useState(null);

  const fetchClient = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await getClientById(id);
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
    if (id) fetchClient();
  }, [id]);

  const handleToggleActions = (event) => {
    if (showActions) {
      setShowActions(false);
      setActiveAnchorEl(null);
    } else {
      setShowActions(true);
      setActiveAnchorEl(event.currentTarget);
    }
  };

  const detailBoxClass = "px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold text-gray-800 break-words min-h-[44px] flex items-center";

  return (
    <MainLayout headerTitle="Lab Client Details" headerSubtitle={`Viewing Profile: ${client?.client_name || ""}`}>
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate("/labClients")} className="mb-4">
          Back
        </Button>

        {errorMessage && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-red-600 font-medium">
            <Info size={16} />
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-16 text-center text-sm font-semibold text-gray-500">
            Loading client profile details...
          </div>
        ) : !client ? (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-16 text-center text-sm font-semibold text-gray-500">
            No client records found.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8 !overflow-visible">
            {/* Header section inside the single box */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 pb-6 border-b border-[#F1F5F9]">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 break-words tracking-tight">
                  {client.client_name}
                </h1>
                <p className="text-xs text-slate-500 font-semibold mt-1">Client ID: {id}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {getStatusBadge(client.status)}
                
                <button
                  onClick={handleToggleActions}
                  className="p-2 hover:bg-[#F1F5F9] rounded-xl transition-colors text-[#8A97A4] hover:text-[#1A2733] border border-[#E2E8F0]"
                >
                  <MoreHorizontal size={18} />
                </button>

                <PortalActionMenu
                  anchorEl={showActions ? activeAnchorEl : null}
                  open={showActions}
                  onClose={() => { setShowActions(false); setActiveAnchorEl(null); }}
                  actions={[
                    {
                      label: "Edit Client",
                      icon: Edit,
                      onClick: () => navigate(`/labClients/edit/${id}`)
                    }
                  ]}
                />
              </div>
            </div>

            {/* Content side-by-side details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Company details & Address */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Basic Information */}
                <div>
                  <h3 className="text-sm font-bold text-[#1A2733] flex items-center gap-2 mb-4">
                    <Briefcase size={16} className="text-[#3F6E8C]" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Company Name</label>
                      <div className={detailBoxClass}>{client.client_name || "—"}</div>
                    </div>
                    <div>
                      <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact Person</label>
                      <div className={detailBoxClass}>{client.contact_person || "—"}</div>
                    </div>
                    <div>
                      <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
                      <div className={detailBoxClass}>{client.email || "—"}</div>
                    </div>
                    <div>
                      <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Phone Number</label>
                      <div className={detailBoxClass}>{client.phone || "—"}</div>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-[#F1F5F9]" />

                {/* Address Information */}
                <div>
                  <h3 className="text-sm font-bold text-[#1A2733] flex items-center gap-2 mb-4">
                    <MapPin size={16} className="text-[#3F6E8C]" />
                    Address Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Address</label>
                      <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold text-gray-800 break-words min-h-[80px] whitespace-pre-wrap">
                        {client.address || "—"}
                      </div>
                    </div>
                    <div>
                      <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">City</label>
                      <div className={detailBoxClass}>{client.city || "—"}</div>
                    </div>
                    <div>
                      <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">State</label>
                      <div className={detailBoxClass}>{client.state || "—"}</div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Pincode</label>
                      <div className={detailBoxClass}>{client.pincode || "—"}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Tax details & Status */}
              <div className="space-y-6 lg:border-l lg:border-[#F1F5F9] lg:pl-8">
                
                {/* Tax Information */}
                <div>
                  <h3 className="text-sm font-bold text-[#1A2733] flex items-center gap-2 mb-4">
                    <CreditCard size={16} className="text-[#3F6E8C]" />
                    Tax Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">GST Number</label>
                      <div className={detailBoxClass}>{client.gst_no || "—"}</div>
                    </div>
                    <div>
                      <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">PAN Number</label>
                      <div className={detailBoxClass}>{client.pan_no || "—"}</div>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-[#F1F5F9]" />

                {/* Status */}
                <div>
                  <h3 className="text-sm font-bold text-[#1A2733] flex items-center gap-2 mb-4">
                    <Shield size={16} className="text-[#3F6E8C]" />
                    Client Status
                  </h3>
                  <div>
                    <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</label>
                    <div className="mt-1">{getStatusBadge(client.status)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default LabClientView;