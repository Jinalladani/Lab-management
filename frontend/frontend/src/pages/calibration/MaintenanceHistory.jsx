import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  X,
  Wrench,
  Trash2,
  Eye,
  CheckCircle,
  RefreshCw,
  MoreHorizontal
} from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import { mockEquipmentDb } from "../../utils/mockEquipmentData";
import { getMaintenanceList, createMaintenance, getEquipmentList } from "../../api";
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
    completed: { text: "Completed", bg: "bg-[#ECFDF5] text-[#10B981] border-[#D1FAE5]", dot: "bg-[#10B981]" },
    "in progress": { text: "In Progress", bg: "bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE]", dot: "bg-[#2563EB]" },
    scheduled: { text: "Scheduled", bg: "bg-[#FFFBEB] text-[#D97706] border-[#FEF3C7]", dot: "bg-[#D97706]" },
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

const MaintenanceHistory = () => {
  const navigate = useNavigate();

  // Data States
  const [maintenance, setMaintenance] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Dropdown States
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [activeAnchorEl, setActiveAnchorEl] = useState(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMaint, setNewMaint] = useState({
    eqId: "",
    date: "",
    type: "Preventive",
    engineer: "",
    cost: "",
    status: "Completed",
    remarks: ""
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const resMaint = await getMaintenanceList();
      if (resMaint.success && resMaint.data?.maintenance) {
        setMaintenance(resMaint.data.maintenance);
      } else {
        throw new Error("Failed response maintenance");
      }
    } catch (err) {
      console.warn("Using fallback local data for Maintenance Logs:", err.message);
      setMaintenance(mockEquipmentDb.getMaintenance());
    } finally {
      setLoading(false);
    }

    try {
      const resEq = await getEquipmentList();
      if (resEq.success && resEq.data?.equipment) {
        setEquipmentList(resEq.data.equipment);
        const eq = resEq.data.equipment;
        if (eq.length > 0) {
          setNewMaint(prev => ({
            ...prev,
            eqId: eq[0].id,
            date: new Date().toISOString().substring(0, 10)
          }));
        }
      } else {
        throw new Error("Failed response equipment");
      }
    } catch (err) {
      console.warn("Using fallback local data for Equipment List in Maintenance History:", err.message);
      const eq = mockEquipmentDb.getEquipment();
      setEquipmentList(eq);
      if (eq.length > 0) {
        setNewMaint(prev => ({
          ...prev,
          eqId: eq[0].id,
          date: new Date().toISOString().substring(0, 10)
        }));
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveMaintenance = async () => {
    if (!newMaint.engineer || !newMaint.cost) {
      alert("Please fill in all required fields.");
      return;
    }

    const selectedEq = equipmentList.find(e => e.id === newMaint.eqId);
    const maintRecord = {
      ...newMaint,
      eqName: selectedEq ? selectedEq.name : "Unknown Device",
      cost: parseFloat(newMaint.cost)
    };

    try {
      await createMaintenance(maintRecord);
    } catch (err) {
      console.error("Failed to save maintenance order via API:", err);
    }

    // Update local state and fallback database
    mockEquipmentDb.addMaintenance(maintRecord);
    fetchData();
    setIsModalOpen(false);

    // Reset
    setNewMaint({
      eqId: equipmentList[0]?.id || "",
      date: new Date().toISOString().substring(0, 10),
      type: "Preventive",
      engineer: "",
      cost: "",
      status: "Completed",
      remarks: ""
    });
  };

  const handleToggleDropdown = (maintId, event) => {
    if (activeDropdownId === maintId) {
      setActiveDropdownId(null);
      setActiveAnchorEl(null);
    } else {
      setActiveDropdownId(maintId);
      setActiveAnchorEl(event.currentTarget);
    }
  };

  // Filter
  const filteredMaintenance = maintenance.filter(m => {
    const matchesSearch = 
      m.eqName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.eqId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.engineer.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType ? m.type === selectedType : true;
    const matchesStatus = selectedStatus ? m.status === selectedStatus : true;

    return matchesSearch && matchesType && matchesStatus;
  });

  const maintenanceTypes = ["Preventive", "Repair", "Calibration Support"];
  const statuses = ["Completed", "In Progress", "Scheduled"];

  const inputClass = "w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#243744]/10 focus:border-[#243744] bg-white/90 text-sm transition-all";

  return (
    <MainLayout headerTitle="Maintenance Logs" headerSubtitle="Prevention scheduling & repair registry logbook">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">

        {/* Toolbar - Search & Add button in a single row */}
        <div className="mb-6 flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between">
          
          {/* Search Box */}
          <div className="flex-1 max-w-xl flex h-10 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 focus-within:border-[#243744] focus-within:ring-2 focus-within:ring-[#243744]/10 transition-all">
            <Search size={16} className="text-[#94A3B8] shrink-0" />
            <input
              type="text"
              placeholder="Search work orders by ID, name, contractor or engineer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none"
            />
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-10 px-3.5 py-2 text-xs font-semibold text-[#475569] border border-[#E2E8F0] bg-white rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all shrink-0 max-w-[200px] appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%238A97A4' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: "right 10px center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "16px",
                paddingRight: "30px"
              }}
            >
              <option value="">All Types</option>
              {maintenanceTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-10 px-3.5 py-2 text-xs font-semibold text-[#475569] border border-[#E2E8F0] bg-white rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all shrink-0 max-w-[200px] appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%238A97A4' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: "right 10px center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "16px",
                paddingRight: "30px"
              }}
            >
              <option value="">All Statuses</option>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <button
              onClick={fetchData}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] px-4 text-xs font-bold text-[#475569] transition-colors"
            >
              <RefreshCw size={14} className="text-[#8A97A4]" />
              Refresh
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#243744] hover:bg-[#1A2733] px-4 text-xs font-bold text-white shadow-sm transition-colors"
            >
              <Plus size={14} /> Add Maintenance
            </button>
          </div>
        </div>

        {/* Datatable */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden">
          {loading ? (
            <TableSkeleton rows={5} cols={8} />
          ) : filteredMaintenance.length === 0 ? (
            <div className="p-16 text-center">
              <Wrench size={40} className="mx-auto text-[#94A3B8] mb-3" />
              <h3 className="text-base font-bold text-[#1E293B]">No work orders found</h3>
              <p className="text-xs text-[#64748B] mt-1">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#FAFBFD] text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                    <th className="px-6 py-3.5">Maintenance Date</th>
                    <th className="px-6 py-3.5">EQ ID</th>
                    <th className="px-6 py-3.5">Equipment Name</th>
                    <th className="px-6 py-3.5">Type</th>
                    <th className="px-6 py-3.5">Contractor / Engineer</th>
                    <th className="px-6 py-3.5 text-right">Cost (INR)</th>
                    <th className="px-6 py-3.5 text-center">Status</th>
                    <th className="px-6 py-3.5 text-right w-[90px]">Actions</th>
                  </tr>
                </thead>
                <motion.tbody variants={stagger.container} initial="hidden" animate="visible" className="divide-y divide-[#F1F5F9]">
                  {filteredMaintenance.map((m, idx) => {
                    const orderId = m.id || idx;
                    return (
                      <motion.tr key={orderId} variants={stagger.item} className="hover:bg-[#FAF9FF] transition-colors">
                        <td className="px-6 py-4 text-xs font-semibold text-[#475569]">
                          {new Date(m.date).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td onClick={() => navigate(`/equipment/view/${m.eqId}`)} className="px-6 py-4 text-xs font-bold text-[#243744] hover:underline cursor-pointer">
                          {m.eqId}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-[#1E293B]">{m.eqName}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded-lg ${
                            m.type === "Preventive" ? "text-blue-700 bg-blue-50/80 border border-blue-100" : "text-purple-700 bg-purple-50/80 border border-purple-100"
                          }`}>{m.type}</span>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-[#475569]">{m.engineer}</td>
                        <td className="px-6 py-4 text-xs font-bold text-right text-slate-800">
                          ₹ {m.cost.toLocaleString("en-IN")}
                        </td>
                        <td className="px-6 py-4 text-center">{getStatusBadge(m.status)}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => handleToggleDropdown(orderId, e)}
                            className="p-1.5 hover:bg-[#F1F5F9] rounded-lg transition-colors text-[#8A97A4] hover:text-[#1A2733]"
                          >
                            <MoreHorizontal size={16} />
                          </button>

                          <PortalActionMenu
                            anchorEl={activeDropdownId === orderId ? activeAnchorEl : null}
                            open={activeDropdownId === orderId}
                            onClose={() => { setActiveDropdownId(null); setActiveAnchorEl(null); }}
                            actions={[
                              {
                                label: "View Device Detail",
                                icon: Eye,
                                onClick: () => navigate(`/equipment/view/${m.eqId}`)
                              }
                            ]}
                          />
                        </td>
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sliding Drawer */}
        <AnimatePresence>
          {isModalOpen && (
            <>
              {/* Drawer Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-50"
                onClick={() => setIsModalOpen(false)} 
              />

              {/* Sliding Drawer Container */}
              <motion.aside 
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="fixed top-0 right-0 h-full w-full sm:w-[460px] bg-white shadow-2xl z-50 flex flex-col"
              >
                <div className="sticky top-0 z-20 border-b border-slate-100 bg-[#243744] text-white px-5 py-4 backdrop-blur-xl">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">Add Maintenance Order</h3>
                      <p className="text-xs text-white/70 mt-0.5 font-semibold">Log preventive repairs or service reports</p>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="rounded-xl p-2 hover:bg-white/10 text-white transition-colors">
                      <X size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#FAFCFF]">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-gray-600 uppercase tracking-wider">Select Equipment *</label>
                    <select
                      value={newMaint.eqId}
                      onChange={(e) => setNewMaint({...newMaint, eqId: e.target.value})}
                      className={inputClass}
                    >
                      {equipmentList.map(eq => (
                        <option key={eq.id} value={eq.id}>{eq.id} - {eq.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-gray-600 uppercase tracking-wider">Work Date *</label>
                      <input
                        type="date"
                        value={newMaint.date}
                        onChange={(e) => setNewMaint({...newMaint, date: e.target.value})}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-gray-600 uppercase tracking-wider">Work Type *</label>
                      <select
                        value={newMaint.type}
                        onChange={(e) => setNewMaint({...newMaint, type: e.target.value})}
                        className={inputClass}
                      >
                        {maintenanceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-gray-600 uppercase tracking-wider">Engineer / Service Contractor *</label>
                    <input
                      type="text"
                      placeholder="e.g. Aimil Service Team"
                      value={newMaint.engineer}
                      onChange={(e) => setNewMaint({...newMaint, engineer: e.target.value})}
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-gray-600 uppercase tracking-wider">Cost (₹) *</label>
                      <input
                        type="number"
                        placeholder="INR"
                        value={newMaint.cost}
                        onChange={(e) => setNewMaint({...newMaint, cost: e.target.value})}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-gray-600 uppercase tracking-wider">Job Status</label>
                      <select
                        value={newMaint.status}
                        onChange={(e) => setNewMaint({...newMaint, status: e.target.value})}
                        className={inputClass}
                      >
                        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-gray-600 uppercase tracking-wider">Remarks</label>
                    <textarea
                      rows={3}
                      placeholder="Describe maintenance logs..."
                      value={newMaint.remarks}
                      onChange={(e) => setNewMaint({...newMaint, remarks: e.target.value})}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="sticky bottom-0 z-20 border-t border-slate-100 bg-white/95 px-5 py-4 backdrop-blur-xl flex items-center justify-end gap-2">
                  <button onClick={() => setIsModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-slate-50 transition-colors flex-1">
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveMaintenance}
                    className="rounded-xl bg-[#243744] hover:bg-[#1A2733] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors flex-1"
                  >
                    Save Order
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

      </div>
    </MainLayout>
  );
};

export default MaintenanceHistory;
