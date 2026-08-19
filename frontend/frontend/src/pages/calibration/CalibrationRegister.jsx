import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, X, Eye, Download, Printer, ChevronDown, CheckCircle, RefreshCw,
  Award, Calendar, AlertTriangle
} from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import { mockEquipmentDb } from "../../utils/mockEquipmentData";
import { getCalibrationList, createCalibration, getEquipmentList } from "../../api";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { TablePagination } from "../../components/ui/TablePagination";

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } },
  item: {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 0.68, 0, 1] } },
  },
};

// Count up animation hook (exact Super Admin Dashboard reference)
const useCountUp = (value) => {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    const target = Number(value) || 0;
    const duration = 600;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    const frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return displayValue;
};

// Summary KPI Card Component (Exact Super Admin Dashboard #243744 & #059669 Pattern & Style)
const KpiCard = ({ title, value = 0, subtitle, icon: Icon, tone = "navy", percentage, meterLabel = "Utilization Rate" }) => {
  const animatedValue = useCountUp(value);

  const toneStyles = {
    navy: { border: "border-slate-200/80", bg: "bg-white", iconBg: "bg-[#243744]/10 text-[#243744]", meter: "bg-[#243744]" },
    emerald: { border: "border-emerald-200/80", bg: "bg-white", iconBg: "bg-emerald-50 text-[#059669]", meter: "bg-[#059669]" },
    blue: { border: "border-slate-200/80", bg: "bg-white", iconBg: "bg-[#243744]/10 text-[#243744]", meter: "bg-[#243744]" },
    amber: { border: "border-amber-200/80", bg: "bg-white", iconBg: "bg-amber-50 text-amber-600", meter: "bg-amber-600" },
    purple: { border: "border-slate-200/80", bg: "bg-white", iconBg: "bg-[#243744]/10 text-[#243744]", meter: "bg-[#243744]" }
  };

  const style = toneStyles[tone] || toneStyles.navy;

  return (
    <motion.article
      variants={stagger.item}
      whileHover={{ y: -3, boxShadow: "0 14px 30px rgba(0,0,0,0.06)" }}
      className={`relative overflow-hidden rounded-2xl border ${style.border} ${style.bg} p-5 shadow-sm transition-all duration-200`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-[#243744]">{animatedValue.toLocaleString()}</span>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</p>
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${style.iconBg} shadow-inner`}>
          <Icon size={22} strokeWidth={2.2} />
        </div>
      </div>

      {percentage !== undefined && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1.5">
            <span>{meterLabel}</span>
            <span className="text-[#243744]">{percentage}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${style.meter}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
      )}
    </motion.article>
  );
};

const getStatusBadge = (status) => {
  const norm = String(status || "").toLowerCase();
  const isPass = norm === "pass";
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${isPass ? "bg-[#F0FDF4] text-[#16A34A]" : "bg-[#FEF2F2] text-[#DC2626]"
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
            className={`w-full px-4 py-2 text-xs font-semibold flex items-center gap-2 hover:bg-[#FAF9FF] transition-colors ${act.danger ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-[#475569] hover:text-[#243744]"
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

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedLab, selectedAgency, selectedStatus]);

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
    if (!newCal.certificateNo || !newCal.cost || !certificateFile) {
      alert("Please fill in all required fields and upload the Calibration Certificate file.");
      return;
    }

    const selectedEq = equipmentList.find(e => e.id === newCal.eqId);
    const calibrationRecord = {
      ...newCal,
      eqCode: selectedEq ? (selectedEq.eqCode || selectedEq.id) : "EQ-CTM-001",
      eqName: selectedEq ? selectedEq.name : "Compression Testing Machine",
      makeAndModel: selectedEq ? `${selectedEq.manufacturer || "AIMIL"} / ${selectedEq.model || "CTM3200"}` : "AIMIL / CTM3200",
      productMaterial: newCal.productMaterial || selectedEq?.category || "Concrete & Cement",
      equipmentUseForTest: newCal.equipmentUseForTest || selectedEq?.description || "Material Testing",
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
      productMaterial: "",
      equipmentUseForTest: "",
      cost: "",
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

  const paginatedCalibrations = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCalibrations.slice(start, start + pageSize);
  }, [filteredCalibrations, currentPage, pageSize]);

  const laboratories = ["Concrete Lab", "Steel Lab", "Soil Lab", "Chemical Lab", "QC Lab"];
  const agencies = ["ABC NABL Lab", "XYZ NABL Lab", "National Physical Laboratory"];

  // Calculated Metrics for Summary Cards (Matching Super Admin Dashboard)
  const totalCalibrationsCount = calibrations.length;
  const validPassedCount = useMemo(() => calibrations.filter(c => c.status === "Pass").length, [calibrations]);
  const dueSoonCount = useMemo(() => calibrations.filter(c => {
    const due = new Date(c.nextDue);
    const now = new Date();
    const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    return diff > 0 && diff <= 60;
  }).length, [calibrations]);
  const overdueCount = useMemo(() => calibrations.filter(c => new Date(c.nextDue) < new Date()).length, [calibrations]);

  const passedPercentage = totalCalibrationsCount > 0 ? Math.round((validPassedCount / totalCalibrationsCount) * 100) : 100;
  const dueSoonPercentage = totalCalibrationsCount > 0 ? Math.round((dueSoonCount / totalCalibrationsCount) * 100) : 0;
  const overduePercentage = totalCalibrationsCount > 0 ? Math.round((overdueCount / totalCalibrationsCount) * 100) : 0;

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

        {/* 4 Summary KPI Cards (Exact Super Admin Dashboard UI, Color Codes & Pattern) */}
        <motion.div variants={stagger.container} initial="hidden" animate="visible" className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total Calibrations"
            value={totalCalibrationsCount}
            subtitle="Logbook Audit Entries"
            icon={Award}
            tone="navy"
            percentage={100}
            meterLabel="System Logged Rate"
          />
          <KpiCard
            title="Valid & Passed"
            value={validPassedCount}
            subtitle="Active Compliant Instruments"
            icon={CheckCircle}
            tone="emerald"
            percentage={passedPercentage}
            meterLabel="Compliance Pass Rate"
          />
          <KpiCard
            title="Due Soon"
            value={dueSoonCount}
            subtitle="Renewal Next 60 Days"
            icon={Calendar}
            tone="navy"
            percentage={dueSoonPercentage}
            meterLabel="Renewal Active Window"
          />
          <KpiCard
            title="Overdue / Alert"
            value={overdueCount}
            subtitle="Attention Required"
            icon={AlertTriangle}
            tone="amber"
            percentage={overduePercentage}
            meterLabel="Inspection Overdue Rate"
          />
        </motion.div>

        {/* Search & Filters Bar */}
        <div className="mb-6 flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between">
          <div className="flex-1 max-w-xl flex h-10 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 focus-within:border-[#243744] focus-within:ring-2 focus-within:ring-[#243744]/10 transition-all">
            <Search size={16} className="text-[#94A3B8] shrink-0" />
            <input
              type="text"
              placeholder="Search by EQ Code, instrument name, agency..."
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
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#243744] hover:bg-[#1A2733] px-4 text-xs font-bold text-white shadow-sm transition-colors w-full sm:w-auto"
            >
              <Plus size={14} /> Add Record
            </button>
          </div>
        </div>

        {/* Responsive Content Section: Desktop Table + Mobile Card Grid */}
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
            <>
              {/* Desktop Table View (Hidden on mobile) */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#FAFBFD] text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                      <th className="px-4 py-3.5 whitespace-nowrap">EQ Code</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">Equipment Name</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">Make & Model</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">Date of Calibration</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">Due of Calibration</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">Calibration Agency</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">Product / Material</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">Equipment Use for Test</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">Status</th>
                      <th className="px-4 py-3.5 text-right w-[90px] whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <motion.tbody variants={stagger.container} initial="hidden" animate="visible" className="divide-y divide-[#F1F5F9]">
                    {paginatedCalibrations.map((cal) => (
                      <motion.tr key={cal.id} variants={stagger.item} className="hover:bg-[#FAF9FF] transition-colors">
                        <td className="px-4 py-4 text-xs font-bold text-[#243744] whitespace-nowrap">{cal.eqCode || cal.eqId}</td>
                        <td className="px-4 py-4 text-xs font-bold text-[#1E293B] whitespace-nowrap">{cal.eqName}</td>
                        <td className="px-4 py-4 text-xs font-semibold text-[#475569] whitespace-nowrap">{cal.makeAndModel || "AIMIL / CTM3200"}</td>
                        <td className="px-4 py-4 text-xs font-semibold text-[#475569] whitespace-nowrap">
                          {new Date(cal.calibrationDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-4 text-xs font-bold text-[#1E293B] whitespace-nowrap">
                          {new Date(cal.nextDue).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-4 text-xs font-semibold text-[#475569] whitespace-nowrap">{cal.agency || "ABC NABL Lab"}</td>
                        <td className="px-4 py-4 text-xs font-semibold text-[#475569] whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-[#243744]">
                            {cal.productMaterial || "Concrete & Cement"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs font-medium text-[#475569] whitespace-nowrap">{cal.equipmentUseForTest || "Material Testing"}</td>
                        <td className="px-4 py-4 whitespace-nowrap">{getStatusBadge(cal.status)}</td>
                        <td className="px-4 py-4 text-right whitespace-nowrap">
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

              {/* Mobile Card Grid View (Visible on screens below lg - Super Admin Dashboard Style) */}
              <div className="block lg:hidden p-4">
                <motion.div variants={stagger.container} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {paginatedCalibrations.map((cal) => (
                    <motion.div
                      key={cal.id}
                      variants={stagger.item}
                      whileHover={{ y: -3, boxShadow: "0 14px 30px rgba(0,0,0,0.06)" }}
                      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 flex flex-col justify-between"
                    >
                      <div>
                        {/* Top Code & Status */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="px-2.5 py-1 rounded-xl bg-[#243744] text-white text-[11px] font-extrabold tracking-wider shadow-xs">
                            {cal.eqCode || cal.eqId}
                          </span>
                          {getStatusBadge(cal.status)}
                        </div>

                        {/* Title & Model */}
                        <h4 className="text-sm font-black text-[#1E293B] tracking-tight line-clamp-1">{cal.eqName}</h4>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">{cal.makeAndModel || "AIMIL / CTM3200"}</p>

                        <div className="my-3.5 border-t border-slate-100" />

                        {/* Dates & Agency */}
                        <div className="space-y-2 text-xs text-slate-600">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">Calibrated:</span>
                            <span className="font-bold text-[#1E293B]">
                              {new Date(cal.calibrationDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">Next Due:</span>
                            <span className="font-black text-[#243744]">
                              {new Date(cal.nextDue).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">Agency:</span>
                            <span className="font-bold text-[#059669]">{cal.agency || "ABC NABL Lab"}</span>
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#243744]/10 text-[#243744]">
                            {cal.productMaterial || "Concrete & Cement"}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#059669] border border-emerald-200/60">
                            {cal.equipmentUseForTest || "Material Testing"}
                          </span>
                        </div>
                      </div>

                      {/* Card Action Footer */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                        <button
                          onClick={() => handleOpenCertificate(cal)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#243744] text-white text-xs font-bold hover:bg-[#1A2733] transition-all shadow-xs active:scale-95"
                        >
                          <Eye size={14} /> View Certificate
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </>
          )}

          {/* Table Pagination */}
          <TablePagination
            totalItems={filteredCalibrations.length}
            pageSize={pageSize}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="calibrations"
          />
        </div>

        {/* ADD CALIBRATION RECORD DRAWER (Screen 8) */}
        <div
          className={`fixed inset-0 bg-black/45 backdrop-blur-xs z-50 transition-opacity duration-300 ${isAddModalOpen ? "opacity-100 visible" : "opacity-0 invisible"
            }`}
          onClick={() => setIsAddModalOpen(false)}
        />

        <div
          className={`fixed top-0 right-0 h-full w-full sm:w-[500px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ${isAddModalOpen ? "translate-x-0" : "translate-x-full"
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
                  onChange={(e) => setNewCal({ ...newCal, eqId: e.target.value })}
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
                  onChange={(e) => setNewCal({ ...newCal, agency: e.target.value })}
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
                    onChange={(e) => setNewCal({ ...newCal, certificateNo: e.target.value })}
                    className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Calibration Cost (₹) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  placeholder="Enter amount"
                  value={newCal.cost}
                  onChange={(e) => setNewCal({ ...newCal, cost: e.target.value })}
                  className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Result/Status</label>
                  <select
                    value={newCal.status}
                    onChange={(e) => setNewCal({ ...newCal, status: e.target.value })}
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
                    onChange={(e) => setNewCal({ ...newCal, remarks: e.target.value })}
                    className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Upload Certificate File <span className="text-red-500">*</span></label>
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
              {certificateFile ? (
                <div className="mt-3 text-xs text-emerald-600 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-100 truncate">
                  ✓ Selected: {certificateFile.name}
                </div>
              ) : (
                <div className="mt-2 text-[11px] text-red-500 font-medium">
                  * Calibration certificate file is required.
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
                        {/* <div>
                          <span className="text-gray-400 font-bold block uppercase text-[9px]">Equipment ID:</span>
                          <span className="text-gray-900 font-bold">{activeCert.eqId}</span>
                        </div> */}
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
