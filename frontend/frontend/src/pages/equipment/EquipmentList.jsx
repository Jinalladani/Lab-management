import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, QrCode, Eye, Pencil, Trash2, X, RefreshCw, Briefcase, ChevronDown
} from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import { mockEquipmentDb } from "../../utils/mockEquipmentData";
import { getEquipmentList, createEquipment, deleteEquipment } from "../../api";
import { TableSkeleton } from "../../components/ui/Skeleton";

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } },
  item: {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 0.68, 0, 1] } },
  },
};

const getStatusBadge = (status) => {
  const norm = String(status || "").toLowerCase();
  const map = {
    active: { text: "Active", bg: "bg-[#ECFDF5] text-[#10B981] border-[#D1FAE5]", dot: "bg-[#10B981]" },
    "under maintenance": { text: "Maintenance", bg: "bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE]", dot: "bg-[#2563EB]" },
  };
  const config = map[norm] || { text: status || "Inactive", bg: "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]", dot: "bg-[#64748B]" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${config.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.text}
    </span>
  );
};

const getCalibrationBadge = (status) => {
  const norm = String(status || "").toLowerCase();
  if (norm === "valid") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#10B981] border-[#D1FAE5]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
        Valid
      </span>
    );
  }
  let color = "bg-[#FFFBEB] text-[#D97706] border-[#FEF3C7]";
  let dotColor = "bg-[#D97706]";
  if (norm.includes("7 days") || norm.includes("soon")) {
    color = "bg-[#FFF5F5] text-[#EF4444] border-[#FEE2E2]";
    dotColor = "bg-[#EF4444]";
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {status}
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
      const dropdownWidth = 180;
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

const EquipmentList = () => {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  
  // Data State
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLab, setSelectedLab] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Modals
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [activeQrEq, setActiveQrEq] = useState(null);

  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [activeAnchorEl, setActiveAnchorEl] = useState(null);

  // Load Data
  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const res = await getEquipmentList();
      if (res.success && res.data?.equipment) {
        setEquipments(res.data.equipment);
      }
    } catch (err) {
      console.error("Failed to load equipment list from database:", err);
      setEquipments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
    
    if (routeLocation.state?.openAddWizard) {
      navigate("/equipment/add");
      window.history.replaceState({}, document.title);
    }
  }, [routeLocation, navigate]);

  const handleDelete = async (id) => {
    if (window.confirm(`Are you sure you want to delete equipment ${id}?`)) {
      try {
        await deleteEquipment(id);
      } catch (err) {
        console.error("Failed to delete equipment via API:", err);
      }
      
      setEquipments(prev => prev.filter(eq => eq.id !== id));
      mockEquipmentDb.deleteEquipment(id);
    }
  };

  const handlePrintLabel = (eq) => {
    setActiveQrEq(eq);
    setIsQrModalOpen(true);
  };

  // Filter logic
  const filteredEquipments = equipments.filter(eq => {
    const matchesSearch = 
      eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.serialNo.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesLab = selectedLab !== "all" ? eq.laboratory === selectedLab : true;
    const matchesCategory = selectedCategory !== "all" ? eq.category === selectedCategory : true;
    const matchesStatus = selectedStatus !== "all" ? eq.status === selectedStatus : true;
    
    return matchesSearch && matchesLab && matchesCategory && matchesStatus;
  });

  const laboratories = ["Concrete Lab", "Steel Lab", "Soil Lab", "Chemical Lab", "QC Lab"];
  const categories = ["Concrete", "Steel", "Soil", "General"];
  const statuses = ["Active", "Inactive", "Under Maintenance"];

  const handleToggleDropdown = (eqId, event) => {
    if (activeDropdownId === eqId) {
      setActiveDropdownId(null);
      setActiveAnchorEl(null);
    } else {
      setActiveDropdownId(eqId);
      setActiveAnchorEl(event.currentTarget);
    }
  };

  return (
    <MainLayout headerTitle="Equipment Registry" headerSubtitle="Manage, inspect, and trace laboratory apparatus & calibration records">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">
        
        {/* Filters and Search Bar */}
        <div className="mb-6 flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between">
          <div className="flex-1 max-w-xl flex h-10 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 focus-within:border-[#243744] focus-within:ring-2 focus-within:ring-[#243744]/10 transition-all">
            <Search size={16} className="text-[#94A3B8] shrink-0" />
            <input
              type="text"
              placeholder="Search by ID, name, model, serial no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedLab}
              onChange={(e) => setSelectedLab(e.target.value)}
              className="h-10 px-3.5 py-2 text-xs font-semibold text-[#475569] border border-[#E2E8F0] bg-white rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all shrink-0 min-w-[130px] appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%238A97A4' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: "right 10px center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "16px",
                paddingRight: "30px"
              }}
              aria-label="Filter equipment by laboratory"
            >
              <option value="all">All Laboratories</option>
              {laboratories.map(lab => <option key={lab} value={lab}>{lab}</option>)}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-10 px-3.5 py-2 text-xs font-semibold text-[#475569] border border-[#E2E8F0] bg-white rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all shrink-0 min-w-[130px] appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%238A97A4' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: "right 10px center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "16px",
                paddingRight: "30px"
              }}
              aria-label="Filter equipment by category"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-10 px-3.5 py-2 text-xs font-semibold text-[#475569] border border-[#E2E8F0] bg-white rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all shrink-0 min-w-[130px] appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%238A97A4' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: "right 10px center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "16px",
                paddingRight: "30px"
              }}
              aria-label="Filter equipment by status"
            >
              <option value="all">All Statuses</option>
              {statuses.map(st => <option key={st} value={st}>{st}</option>)}
            </select>

            <button
              onClick={() => navigate("/equipment/add")}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#243744] hover:bg-[#1A2733] px-4 text-xs font-bold text-white shadow-sm transition-colors"
            >
              <Plus size={14} /> Add Equipment
            </button>
          </div>
        </div>

        {/* Datatable */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden">
          {loading ? (
            <TableSkeleton rows={5} cols={8} />
          ) : filteredEquipments.length === 0 ? (
            <div className="p-16 text-center">
              <Briefcase size={40} className="mx-auto text-[#94A3B8] mb-3" />
              <h3 className="text-base font-bold text-[#1E293B]">No equipment found</h3>
              <p className="text-xs text-[#64748B] mt-1">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#FAFBFD] text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                    <th className="px-6 py-3.5">EQ ID</th>
                    <th className="px-6 py-3.5">Equipment Name</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Laboratory</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Calibration Status</th>
                    <th className="px-6 py-3.5">Next Due</th>
                    <th className="px-6 py-3.5 text-right w-[90px]">Actions</th>
                  </tr>
                </thead>
                <motion.tbody variants={stagger.container} initial="hidden" animate="visible" className="divide-y divide-[#F1F5F9]">
                  {filteredEquipments.map((eq) => (
                    <motion.tr key={eq.id} variants={stagger.item} className="hover:bg-[#FAF9FF] transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-[#1E293B] hover:underline cursor-pointer" onClick={() => navigate(`/equipment/view/${eq.id}`)}>
                        {eq.id}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-xs text-slate-900 block">{eq.name}</span>
                        <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Model: {eq.model || "N/A"} • S/N: {eq.serialNo || "N/A"}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-[#475569]">{eq.category}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-[#475569]">{eq.laboratory}</td>
                      <td className="px-6 py-4">{getStatusBadge(eq.status)}</td>
                      <td className="px-6 py-4">{getCalibrationBadge(eq.calibrationStatus)}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-[#475569]">
                        {new Date(eq.nextDue).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => handleToggleDropdown(eq.id, e)}
                          className="p-1.5 hover:bg-[#F1F5F9] rounded-lg transition-colors text-[#8A97A4] hover:text-[#1A2733]"
                        >
                          <ChevronDown size={16} />
                        </button>

                        <PortalActionMenu
                          anchorEl={activeDropdownId === eq.id ? activeAnchorEl : null}
                          open={activeDropdownId === eq.id}
                          onClose={() => { setActiveDropdownId(null); setActiveAnchorEl(null); }}
                          actions={[
                            { label: "View Details", icon: Eye, onClick: () => navigate(`/equipment/view/${eq.id}`) },
                            { label: "Edit Equipment", icon: Pencil, onClick: () => navigate(`/equipment/edit/${eq.id}`) },
                            { label: "Print QR Label", icon: QrCode, onClick: () => handlePrintLabel(eq) },
                            { label: "Delete Equipment", icon: Trash2, danger: true, onClick: () => handleDelete(eq.id) }
                          ]}
                        />
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-[#E2E8F0] px-6 py-4 bg-white select-none">
            <p className="text-xs font-semibold text-[#64748B]">
              Showing <span className="text-[#1E293B]">{filteredEquipments.length}</span> of{" "}
              <span className="text-[#1E293B]">{equipments.length}</span> entries
            </p>
            <div className="flex items-center gap-1.5">
              <button disabled className="h-8 w-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40">&lt;</button>
              <span className="h-8 w-8 rounded-lg bg-[#243744] text-white flex items-center justify-center text-xs font-bold shadow-sm">1</span>
              <button disabled className="h-8 w-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40">&gt;</button>
            </div>
          </div>
        </div>

        {/* QR CODE / EQUIPMENT LABEL MODAL (Screen 13) */}
        {isQrModalOpen && activeQrEq && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              <div className="bg-gray-50 border-b border-gray-100 px-5 py-4 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-800">QR Code / Equipment Label</span>
                <button onClick={() => setIsQrModalOpen(false)} className="p-1 hover:bg-gray-150 rounded-full text-gray-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Printable Label Section */}
              <div className="p-6 flex flex-col items-center justify-center">
                
                {/* Physical Label Design Card */}
                <div id="equipment-printable-label" className="w-full bg-white border border-gray-300 rounded-2xl p-4 shadow-sm text-gray-900 flex flex-row items-center gap-4 relative">
                  <div className="absolute inset-2 border border-dashed border-gray-300 pointer-events-none rounded-lg" />
                  
                  {/* Left QR Code Column */}
                  <div className="flex-shrink-0 flex flex-col items-center justify-center z-10 ml-2">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${activeQrEq.id}`}
                      alt={`QR Code for ${activeQrEq.id}`}
                      className="w-24 h-24 border border-gray-200 p-1.5 rounded-lg bg-white"
                    />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{activeQrEq.id}</span>
                  </div>

                  {/* Right Content Column */}
                  <div className="flex-1 flex flex-col justify-between py-1 z-10 text-left pl-2 pr-2">
                    <div>
                      <h4 className="text-sm font-extrabold tracking-tight text-gray-900 line-clamp-1">{activeQrEq.name}</h4>
                      <p className="text-[10px] font-bold text-gray-500 uppercase mt-0.5">{activeQrEq.laboratory} • {activeQrEq.location || "N/A"}</p>
                    </div>
                    
                    <div className="space-y-1 mt-2.5">
                      <div className="flex justify-between items-center text-[10px] font-semibold text-gray-500">
                        <span>Device Status:</span>
                        <span className="font-extrabold text-emerald-600 uppercase text-[9px] bg-emerald-50 px-1.5 py-0.25 rounded border border-emerald-100">{activeQrEq.status}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-semibold text-gray-500">
                        <span>Calibration:</span>
                        <span className={`font-extrabold uppercase text-[9px] px-1.5 py-0.25 rounded border ${
                          activeQrEq.calibrationStatus === "Valid" 
                            ? "text-emerald-700 bg-emerald-50 border-emerald-100" 
                            : "text-amber-700 bg-amber-50 border-amber-100"
                        }`}>{activeQrEq.calibrationStatus}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-semibold text-gray-500">
                        <span>Next Due:</span>
                        <span className="font-bold text-gray-800">{new Date(activeQrEq.nextDue).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs font-semibold text-gray-400 text-center mt-5 max-w-xs">
                  Scan to view calibration certificate, verification logs, and operation standards.
                </p>
              </div>

              {/* Actions */}
              <div className="bg-gray-50 border-t border-gray-100 px-5 py-4 flex gap-3">
                <button
                  onClick={() => alert("Downloaded label PDF successfully.")}
                  className="flex-1 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
                >
                  Download Label
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2 bg-[#243744] hover:bg-[#1A2733] text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
                >
                  Print Label
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </MainLayout>
  );
};

export default EquipmentList;
