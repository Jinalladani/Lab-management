import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, X, Eye, Download, Printer, ChevronDown, CheckCircle, RefreshCw
} from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import { mockEquipmentDb } from "../../utils/mockEquipmentData";
import { getCalibrationList, createCalibration, getEquipmentList } from "../../api";
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
  const isPass = norm === "pass";
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
      isPass ? "bg-[#F0FDF4] text-[#16A34A]" : "bg-[#FEF2F2] text-[#DC2626]"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isPass ? "bg-[#16A34A]" : "bg-[#DC2626]"}`} />
      {status || "Pass"}
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
      const dropdownWidth = 150;
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

const CalibrationRegister = () => {
  const routeLocation = useLocation();

  // Data States
  const [calibrations, setCalibrations] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLab, setSelectedLab] = useState("all");
  const [selectedAgency, setSelectedAgency] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [activeCert, setActiveCert] = useState(null);
  const [certificateFile, setCertificateFile] = useState(null);
  const fileInputRef = useRef(null);

  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [activeAnchorEl, setActiveAnchorEl] = useState(null);

  // New Calibration form state
  const [newCal, setNewCal] = useState({
    eqId: "",
    calibrationDate: "",
    frequency: "12 Months",
    nextDue: "",
    agency: "",
    certificateNo: "",
    cost: "",
    performedBy: "",
    status: "Pass",
    remarks: ""
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const resCal = await getCalibrationList();
      if (resCal.success && resCal.data?.calibrations) {
        setCalibrations(resCal.data.calibrations);
      } else {
        throw new Error("Failed to load calibrations");
      }
    } catch (err) {
      console.warn("Using fallback local data for Calibrations Register:", err.message);
      setCalibrations(mockEquipmentDb.getCalibrations());
    }

    try {
      const resEq = await getEquipmentList();
      if (resEq.success && resEq.data?.equipment) {
        setEquipmentList(resEq.data.equipment);
        const eq = resEq.data.equipment;
        if (eq.length > 0) {
          setNewCal(prev => ({
            ...prev,
            eqId: eq[0].id,
            calibrationDate: new Date().toISOString().substring(0, 10),
            nextDue: calculateNextDue(new Date().toISOString().substring(0, 10), "12 Months")
          }));
        }
      } else {
        throw new Error("Failed to load equipment list");
      }
    } catch (err) {
      console.warn("Using fallback local data for Equipment List in Calibration Register:", err.message);
      const eq = mockEquipmentDb.getEquipment();
      setEquipmentList(eq);
      if (eq.length > 0) {
        setNewCal(prev => ({
          ...prev,
          eqId: eq[0].id,
          calibrationDate: new Date().toISOString().substring(0, 10),
          nextDue: calculateNextDue(new Date().toISOString().substring(0, 10), "12 Months")
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (routeLocation.state?.openAddCalibration) {
      setIsAddModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [routeLocation]);

  const calculateNextDue = (dateStr, freq) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    let monthsToAdd = 12;
    if (freq === "3 Months") monthsToAdd = 3;
    if (freq === "6 Months") monthsToAdd = 6;
    if (freq === "24 Months") monthsToAdd = 24;
    date.setMonth(date.getMonth() + monthsToAdd);
    return date.toISOString().substring(0, 10);
  };

  const handleDateOrFreqChange = (dateVal, freqVal) => {
    const nextDueVal = calculateNextDue(dateVal, freqVal);
    setNewCal(prev => ({
      ...prev,
      calibrationDate: dateVal,
      frequency: freqVal,
      nextDue: nextDueVal
    }));
  };

  const handleFileChange = (file) => {
    if (!file) return;
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert("File is too large. Maximum size is 10MB.");
      return;
    }
    setCertificateFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFileChange(file);
  };

  const handleSaveCalibration = async () => {
    if (!newCal.certificateNo || !newCal.performedBy || !newCal.cost) {
      alert("Please fill in all required fields.");
      return;
    }

    const selectedEq = equipmentList.find(e => e.id === newCal.eqId);
    const calibrationRecord = {
      ...newCal,
      eqName: selectedEq ? selectedEq.name : "Unknown Device",
      cost: parseFloat(newCal.cost)
    };

    try {
      await createCalibration(calibrationRecord);
    } catch (err) {
      console.error("Failed to save calibration via API:", err);
    }

    mockEquipmentDb.addCalibration(calibrationRecord);
    fetchData();
    setIsAddModalOpen(false);
    
    setNewCal({
      eqId: equipmentList[0]?.id || "",
      calibrationDate: new Date().toISOString().substring(0, 10),
      frequency: "12 Months",
      nextDue: calculateNextDue(new Date().toISOString().substring(0, 10), "12 Months"),
      agency: "",
      certificateNo: "",
      cost: "",
      performedBy: "",
      status: "Pass",
      remarks: ""
    });
    setCertificateFile(null);
  };

  const handleOpenCertificate = (rec) => {
    const eq = equipmentList.find(e => e.id === rec.eqId);
    setActiveCert({
      ...rec,
      model: eq ? eq.model : "N/A",
      serialNo: eq ? eq.serialNo : "N/A"
    });
    setIsCertModalOpen(true);
  };

  // Filter
  const filteredCalibrations = calibrations.filter(cal => {
    const eq = equipmentList.find(e => e.id === cal.eqId);
    
    const matchesSearch = 
      cal.eqName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cal.eqId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cal.certificateNo.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesLab = selectedLab !== "all" ? (eq && eq.laboratory === selectedLab) : true;
    const matchesAgency = selectedAgency !== "all" ? cal.agency === selectedAgency : true;
    const matchesStatus = selectedStatus !== "all" ? cal.status === selectedStatus : true;

    return matchesSearch && matchesLab && matchesAgency && matchesStatus;
  });

  const laboratories = ["Concrete Lab", "Steel Lab", "Soil Lab", "Chemical Lab", "QC Lab"];
  const agencies = ["ABC NABL Lab", "XYZ NABL Lab", "National Physical Laboratory"];

  const handleToggleDropdown = (id, event) => {
    if (activeDropdownId === id) {
      setActiveDropdownId(null);
      setActiveAnchorEl(null);
    } else {
      setActiveDropdownId(id);
      setActiveAnchorEl(event.currentTarget);
    }
  };

  return (
    <MainLayout headerTitle="Calibration Audit Register" headerSubtitle="Chronological logbook of NABL certified equipment calibrations">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">

        {/* Search & Filters */}
        <div className="mb-6 flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between">
          <div className="flex-1 max-w-xl flex h-10 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 focus-within:border-[#243744] focus-within:ring-2 focus-within:ring-[#243744]/10 transition-all">
            <Search size={16} className="text-[#94A3B8] shrink-0" />
            <input
              type="text"
              placeholder="Search by ID, instrument name, certificate no..."
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
              aria-label="Filter calibrations by laboratory"
            >
              <option value="all">All Laboratories</option>
              {laboratories.map(lab => <option key={lab} value={lab}>{lab}</option>)}
            </select>

            <select
              value={selectedAgency}
              onChange={(e) => setSelectedAgency(e.target.value)}
              className="h-10 px-3.5 py-2 text-xs font-semibold text-[#475569] border border-[#E2E8F0] bg-white rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all shrink-0 min-w-[130px] appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%238A97A4' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: "right 10px center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "16px",
                paddingRight: "30px"
              }}
              aria-label="Filter calibrations by agency"
            >
              <option value="all">All Agencies</option>
              {agencies.map(ag => <option key={ag} value={ag}>{ag}</option>)}
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
              aria-label="Filter calibrations by result"
            >
              <option value="all">All Results</option>
              <option value="Pass">Pass</option>
              <option value="Fail">Fail</option>
            </select>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#243744] hover:bg-[#1A2733] px-4 text-xs font-bold text-white shadow-sm transition-colors"
            >
              <Plus size={14} /> Add Record
            </button>
          </div>
        </div>

        {/* Register Table View */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden">
          {loading ? (
            <TableSkeleton rows={5} cols={9} />
          ) : filteredCalibrations.length === 0 ? (
            <div className="p-16 text-center">
              <CheckCircle size={40} className="mx-auto text-[#94A3B8] mb-3" />
              <h3 className="text-base font-bold text-[#1E293B]">No calibrations found</h3>
              <p className="text-xs text-[#64748B] mt-1">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#FAFBFD] text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                    <th className="px-6 py-3.5">EQ ID</th>
                    <th className="px-6 py-3.5">Equipment Name</th>
                    <th className="px-6 py-3.5">Last Calibration</th>
                    <th className="px-6 py-3.5">Next Due</th>
                    <th className="px-6 py-3.5">Frequency</th>
                    <th className="px-6 py-3.5">Agency</th>
                    <th className="px-6 py-3.5">Certificate No.</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right w-[90px]">Actions</th>
                  </tr>
                </thead>
                <motion.tbody variants={stagger.container} initial="hidden" animate="visible" className="divide-y divide-[#F1F5F9]">
                  {filteredCalibrations.map((cal) => (
                    <motion.tr key={cal.id} variants={stagger.item} className="hover:bg-[#FAF9FF] transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-[#475569]">{cal.eqId}</td>
                      <td className="px-6 py-4 text-xs font-bold text-[#1E293B]">{cal.eqName}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-[#475569]">
                        {new Date(cal.calibrationDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-[#1E293B]">
                        {new Date(cal.nextDue).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-[#475569]">{cal.frequency}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-[#475569]">{cal.agency}</td>
                      <td 
                        onClick={() => handleOpenCertificate(cal)}
                        className="px-6 py-4 text-xs font-extrabold text-[#243744] hover:underline cursor-pointer"
                      >
                        {cal.certificateNo}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(cal.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => handleToggleDropdown(cal.id, e)}
                          className="p-1.5 hover:bg-[#F1F5F9] rounded-lg transition-colors text-[#8A97A4] hover:text-[#1A2733]"
                        >
                          <ChevronDown size={16} />
                        </button>

                        <PortalActionMenu
                          anchorEl={activeDropdownId === cal.id ? activeAnchorEl : null}
                          open={activeDropdownId === cal.id}
                          onClose={() => { setActiveDropdownId(null); setActiveAnchorEl(null); }}
                          actions={[
                            { label: "View Certificate", icon: Eye, onClick: () => handleOpenCertificate(cal) }
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
              Showing <span className="text-[#1E293B]">{filteredCalibrations.length}</span> of{" "}
              <span className="text-[#1E293B]">{calibrations.length}</span> entries
            </p>
            <div className="flex items-center gap-1.5">
              <button disabled className="h-8 w-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40">&lt;</button>
              <span className="h-8 w-8 rounded-lg bg-[#243744] text-white flex items-center justify-center text-xs font-bold shadow-sm">1</span>
              <button disabled className="h-8 w-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40">&gt;</button>
            </div>
          </div>
        </div>

        {/* ADD CALIBRATION RECORD DRAWER (Screen 8) */}
        <div 
          className={`fixed inset-0 bg-black/45 backdrop-blur-xs z-50 transition-opacity duration-300 ${
            isAddModalOpen ? "opacity-100 visible" : "opacity-0 invisible"
          }`} 
          onClick={() => setIsAddModalOpen(false)} 
        />

        <div 
          className={`fixed top-0 right-0 h-full w-full sm:w-[500px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ${
            isAddModalOpen ? "translate-x-0" : "translate-x-full"
          } flex flex-col`}
        >
          <div className="bg-[#243744] text-white px-5 py-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">Add Calibration Record</h3>
              <p className="text-[10px] text-white/80 mt-0.5 font-semibold">Log new standard validation details and upload certificate scan</p>
            </div>
            <button onClick={() => setIsAddModalOpen(false)} className="p-1.5 hover:bg-white/10 rounded-full text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#FAFCFF]">
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Select Equipment <span className="text-red-500">*</span></label>
                <select
                  value={newCal.eqId}
                  onChange={(e) => setNewCal({...newCal, eqId: e.target.value})}
                  className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all bg-white"
                >
                  {equipmentList.map(eq => (
                    <option key={eq.id} value={eq.id}>{eq.id} - {eq.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Calibration Agency <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Enter Calibration Agency"
                  value={newCal.agency}
                  onChange={(e) => setNewCal({...newCal, agency: e.target.value})}
                  className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Calibration Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={newCal.calibrationDate}
                    onChange={(e) => handleDateOrFreqChange(e.target.value, newCal.frequency)}
                    className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Frequency <span className="text-red-500">*</span></label>
                  <select
                    value={newCal.frequency}
                    onChange={(e) => handleDateOrFreqChange(newCal.calibrationDate, e.target.value)}
                    className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all bg-white"
                  >
                    <option value="3 Months">3 Months</option>
                    <option value="6 Months">6 Months</option>
                    <option value="12 Months">12 Months</option>
                    <option value="24 Months">24 Months</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Next Due Date (Auto)</label>
                  <input
                    type="date"
                    value={newCal.nextDue}
                    disabled
                    className="px-3.5 py-2.5 w-full border border-slate-200 bg-slate-50 text-gray-500 rounded-xl text-sm font-semibold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Certificate Number <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. CAL-2026-085"
                    value={newCal.certificateNo}
                    onChange={(e) => setNewCal({...newCal, certificateNo: e.target.value})}
                    className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Calibration Cost (₹) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    placeholder="Enter amount"
                    value={newCal.cost}
                    onChange={(e) => setNewCal({...newCal, cost: e.target.value})}
                    className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Performed By <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="Technician name"
                    value={newCal.performedBy}
                    onChange={(e) => setNewCal({...newCal, performedBy: e.target.value})}
                    className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Result/Status</label>
                  <select
                    value={newCal.status}
                    onChange={(e) => setNewCal({...newCal, status: e.target.value})}
                    className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all bg-white"
                  >
                    <option value="Pass">Pass</option>
                    <option value="Fail">Fail</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Remarks</label>
                  <input
                    type="text"
                    placeholder="Optional notes"
                    value={newCal.remarks}
                    onChange={(e) => setNewCal({...newCal, remarks: e.target.value})}
                    className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Upload Certificate File</label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFileChange(e.target.files[0])}
                className="hidden"
                accept="application/pdf,image/*"
              />
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50 hover:bg-slate-100/60 flex flex-col items-center justify-center cursor-pointer transition-colors"
              >
                <span className="text-xs font-semibold text-gray-700">Drag & drop certificate PDF here</span>
                <span className="text-[10px] text-gray-400 mt-0.5">or click to browse • Maximum size: 10MB</span>
              </div>
              {certificateFile && (
                <div className="mt-3 text-xs text-emerald-600 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-100 truncate">
                  ✓ Selected: {certificateFile.name}
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 border-t border-gray-100 p-5 flex items-center justify-end gap-2">
            <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 flex-1">
              Cancel
            </button>
            <button
              onClick={handleSaveCalibration}
              className="px-6 py-2.5 bg-[#243744] hover:bg-[#1A2733] text-white text-xs font-bold rounded-xl shadow transition-all active:scale-[0.98] flex-1"
            >
              Save Calibration
            </button>
          </div>
        </div>

        {/* CALIBRATION CERTIFICATE VIEW MODAL */}
        {isCertModalOpen && activeCert && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-gray-900 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-gray-800 animate-in fade-in zoom-in-95 duration-200">
              
              {/* Left Document Thumbnails panel */}
              <div className="w-full md:w-1/5 bg-gray-950 p-4 border-b md:border-b-0 md:border-r border-gray-800 flex flex-row md:flex-col gap-3 justify-center md:justify-start items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden md:block mb-4">Pages</span>
                <div className="w-20 h-28 bg-white border-2 border-[#243744] p-1 shadow flex flex-col justify-between items-center rounded cursor-pointer">
                  <div className="w-full h-1 bg-gray-200 mt-1" />
                  <div className="w-3/4 h-1 bg-gray-200" />
                  <span className="text-[10px] font-extrabold text-[#243744]">Page 1</span>
                  <div className="w-2/3 h-1 bg-gray-200 mb-1" />
                </div>
                <div className="w-20 h-28 bg-white opacity-40 p-1 shadow flex flex-col justify-between items-center rounded cursor-pointer">
                  <div className="w-full h-1 bg-gray-200 mt-1" />
                  <div className="w-3/4 h-1 bg-gray-200" />
                  <span className="text-[10px] font-semibold text-gray-500">Page 2</span>
                  <div className="w-2/3 h-1 bg-gray-200 mb-1" />
                </div>
              </div>

              {/* Right Interactive Certificate Document Content Area */}
              <div className="flex-1 bg-gray-850 flex flex-col justify-between min-h-[500px]">
                
                {/* PDF Header Controls */}
                <div className="bg-gray-900 border-b border-gray-800 px-5 py-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Calibration Certificate Preview</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => alert("Downloaded PDF certificate.")} className="p-2 bg-gray-800 text-gray-300 hover:text-white rounded-lg transition-colors border border-gray-700" title="Download">
                      <Download size={15} />
                    </button>
                    <button onClick={() => window.print()} className="p-2 bg-gray-800 text-gray-300 hover:text-white rounded-lg transition-colors border border-gray-700" title="Print">
                      <Printer size={15} />
                    </button>
                    <button onClick={() => setIsCertModalOpen(false)} className="p-2 bg-red-950/40 border border-red-900/60 text-red-400 hover:text-red-300 rounded-lg transition-colors" title="Close">
                      <X size={15} />
                    </button>
                  </div>
                </div>

                {/* Printable Certificate Page */}
                <div className="p-6 flex-1 flex items-center justify-center overflow-y-auto">
                  <div id="nabl-calibration-certificate" className="w-[595px] min-h-[680px] bg-white text-gray-900 p-8 shadow-2xl rounded-lg font-sans border-8 border-double border-blue-900 flex flex-col justify-between select-none relative">
                    <div className="absolute top-2 left-2 right-2 bottom-2 border border-blue-900/40 pointer-events-none" />

                    {/* Laboratory Header */}
                    <div className="text-center space-y-1 relative">
                      <h2 className="text-lg font-extrabold text-blue-900 tracking-wide">ABC CALIBRATION LABORATORY</h2>
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">NABL Accredited Laboratory • ISO/IEC 17025 Standard</span>
                      <div className="w-full h-0.5 bg-blue-900 my-3" />
                      <h3 className="text-md font-bold uppercase text-gray-800 tracking-wider">CALIBRATION CERTIFICATE</h3>
                    </div>

                    {/* Certificate Details */}
                    <div className="grid grid-cols-2 gap-y-4 text-xs font-semibold text-gray-600 mt-4 border-t border-b border-gray-100 py-6">
                      <div className="space-y-2">
                        <div>
                          <span className="text-gray-400 font-bold block uppercase text-[9px]">Certificate No:</span>
                          <span className="text-gray-900 font-extrabold text-sm">{activeCert.certificateNo}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 font-bold block uppercase text-[9px]">Equipment Name:</span>
                          <span className="text-gray-900 font-bold">{activeCert.eqName}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 font-bold block uppercase text-[9px]">Equipment ID:</span>
                          <span className="text-gray-900 font-bold">{activeCert.eqId}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2 pl-6">
                        <div>
                          <span className="text-gray-400 font-bold block uppercase text-[9px]">Date of Issue:</span>
                          <span className="text-gray-900 font-bold">
                            {new Date(activeCert.calibrationDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 font-bold block uppercase text-[9px]">Model Number:</span>
                          <span className="text-gray-900 font-bold">{activeCert.model || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 font-bold block uppercase text-[9px]">Serial Number:</span>
                          <span className="text-gray-900 font-bold">{activeCert.serialNo || "N/A"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Calibration Results Table */}
                    <div className="mt-4">
                      <table className="w-full text-left border border-gray-200 text-xs">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-700">
                            <th className="py-2 px-3">Parameters Tested</th>
                            <th className="py-2 px-3">Observed Value</th>
                            <th className="py-2 px-3">Standard Reference</th>
                            <th className="py-2 px-3">Deviation %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-600">
                          <tr>
                            <td className="py-2.5 px-3 font-semibold">Load Range 1 (500kN)</td>
                            <td className="py-2.5 px-3">500.2 kN</td>
                            <td className="py-2.5 px-3">500.0 kN</td>
                            <td className="py-2.5 px-3 text-emerald-600 font-bold">+0.04%</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-semibold">Load Range 2 (1000kN)</td>
                            <td className="py-2.5 px-3">998.5 kN</td>
                            <td className="py-2.5 px-3">1000.0 kN</td>
                            <td className="py-2.5 px-3 text-emerald-600 font-bold">-0.15%</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-semibold">Load Range 3 (2000kN)</td>
                            <td className="py-2.5 px-3">1995.8 kN</td>
                            <td className="py-2.5 px-3">2000.0 kN</td>
                            <td className="py-2.5 px-3 text-emerald-600 font-bold">-0.21%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Stamp and Seal */}
                    <div className="mt-8 flex justify-between items-end border-t border-gray-100 pt-6">
                      <div className="text-[10px] space-y-1">
                        <p className="text-gray-400 uppercase font-bold text-[8px]">Calibration Status:</p>
                        <span className="text-emerald-700 font-extrabold uppercase bg-emerald-50 px-2 py-0.5 border border-emerald-100 rounded">
                          SATISFACTORY (Pass)
                        </span>
                        <p className="text-gray-500 font-medium mt-2">Next Due Date: {new Date(activeCert.nextDue).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      </div>

                      <div className="text-center relative">
                        <div className="border border-blue-900 border-dashed text-blue-900 text-[8px] font-bold py-1 px-3 uppercase tracking-widest rounded mx-auto rotate-[-8deg] opacity-70 mb-6">
                          ABC LAB APPROVED SEAL
                        </div>
                        <div className="w-28 h-0.5 bg-gray-400 mx-auto" />
                        <span className="text-[9px] font-bold text-gray-550 block mt-1 uppercase">Authorized Signatory</span>
                      </div>
                    </div>

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

export default CalibrationRegister;
