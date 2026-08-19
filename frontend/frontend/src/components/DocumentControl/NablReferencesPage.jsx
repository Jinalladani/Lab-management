import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, Eye, Download, FileText, Award, Layers, CheckCircle,
  Clock, History, Filter, Upload, ChevronRight, X, AlertTriangle, ShieldCheck, Bell,
  MoreVertical, Trash2
} from "lucide-react";
import MainLayout from "../layout/MainLayout";
import { mockDocumentDb } from "../../utils/mockDocumentData";
import {
  getNablReferencesApi,
  addNablReferenceApi,
  addNablAmendmentApi,
  archiveNablReferenceApi
} from "../../api/documentControl";
import DocumentPreviewModal, { openDocumentPreviewInNewTab } from "./DocumentPreviewModal";
import TablePagination from "../ui/TablePagination";

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } },
  item: {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 0.68, 0, 1] } },
  },
};

// Portal-based action menu (Exact same pattern as Project List)
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
      className="portal-action-menu bg-white rounded-xl border border-[#E2E8F0] shadow-xl py-1.5 text-left text-slate-800"
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

// Count up animation hook
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

// Summary KPI Card Component (Exact SmartLab Palette #243744 & #059669)
const KpiCard = ({ title, value = 0, subtitle, icon: Icon, tone = "navy", percentage, meterLabel = "Utilization Rate" }) => {
  const animatedValue = useCountUp(value);

  const toneStyles = {
    navy: { border: "border-slate-200/80", bg: "bg-white", iconBg: "bg-[#243744]/10 text-[#243744]", meter: "bg-[#243744]" },
    emerald: { border: "border-emerald-200/80", bg: "bg-white", iconBg: "bg-emerald-50 text-[#059669]", meter: "bg-[#059669]" },
    amber: { border: "border-amber-200/80", bg: "bg-white", iconBg: "bg-amber-50 text-amber-600", meter: "bg-amber-600" }
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

export const NablReferencesPage = () => {
  const [nablDocs, setNablDocs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Pagination state (same as Projects list)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Portal Action Menu State (same as Projects list)
  const [activeMenuDoc, setActiveMenuDoc] = useState(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);

  // Modals & Drawers
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAmendmentModalOpen, setIsAmendmentModalOpen] = useState(false);
  const [activeDocForAmendment, setActiveDocForAmendment] = useState(null);

  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [activeDocForDrawer, setActiveDocForDrawer] = useState(null);
  const [drawerTab, setDrawerTab] = useState("details");

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [activeDocForPreview, setActiveDocForPreview] = useState(null);

  // Forms
  const [newNabl, setNewNabl] = useState({
    documentNumber: "",
    title: "",
    category: "Guidance",
    issueNumber: "01",
    amendmentNumber: "00",
    issueDate: new Date().toISOString().substring(0, 10),
    amendmentDate: new Date().toISOString().substring(0, 10),
    description: "",
    fileName: "",
    fileSize: "1.50 MB"
  });

  const [amendmentForm, setAmendmentForm] = useState({
    issueNumber: "",
    amendmentNumber: "",
    amendmentDate: new Date().toISOString().substring(0, 10),
    changeReason: "",
    description: "",
    fileName: "",
    fileSize: "1.80 MB"
  });

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const fetchNablDocs = async () => {
    try {
      const res = await getNablReferencesApi();
      if (res?.data?.success && Array.isArray(res.data.data)) {
        const formatted = res.data.data.map(d => ({
          ...d,
          id: d.id,
          documentNumber: d.document_number || d.documentNumber,
          issueNumber: d.issue_number || d.issueNumber || "01",
          amendmentNumber: d.amendment_number || d.amendmentNumber || "00",
          issueDate: d.issue_date || d.issueDate,
          amendmentDate: d.amendment_date || d.amendmentDate,
          fileName: d.file_name || d.fileName,
          fileSize: d.file_size || d.fileSize,
          fileUrl: d.file_url || d.fileUrl,
          createdBy: d.created_by_name || d.createdBy || "Super Admin",
          history: (d.history || []).map(h => ({
            ...h,
            version: h.version,
            issueNumber: h.issue_number || h.issueNumber,
            amendmentNumber: h.amendment_number || h.amendmentNumber,
            date: h.amendment_date || h.date,
            status: h.status,
            fileName: h.file_name || h.fileName,
            fileUrl: h.file_url || h.fileUrl,
            changeReason: h.change_reason || h.changeReason
          }))
        }));
        setNablDocs(formatted);
        return;
      }
    } catch (err) {
      console.warn("Backend API error fetching NABL references, fallback to local DB:", err);
    }
    const data = mockDocumentDb.getNablReferences();
    setNablDocs(data);
  };

  useEffect(() => {
    fetchNablDocs();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedStatus]);

  // Consolidate main docs + archived history versions
  const allAvailableDocs = useMemo(() => {
    const list = [];
    const seenKeys = new Set();

    nablDocs.forEach(doc => {
      list.push(doc);
      seenKeys.add(doc.id);

      // If document has history with archived versions, make them viewable items under ARCHIVED filter
      if (doc.history && doc.history.length > 1) {
        doc.history.forEach((h, idx) => {
          if (h.status === "ARCHIVED") {
            const key = `${doc.id}_hist_${h.amendmentNumber || idx}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              list.push({
                id: key,
                documentNumber: doc.documentNumber,
                title: `${doc.title} (Amended v${h.amendmentNumber || '00'})`,
                category: doc.category,
                issueNumber: h.issueNumber || doc.issueNumber,
                amendmentNumber: h.amendmentNumber || "00",
                issueDate: h.date || doc.issueDate,
                amendmentDate: h.date || doc.amendmentDate,
                description: h.changeReason || doc.description,
                fileName: h.fileName || doc.fileName,
                fileSize: h.fileSize || doc.fileSize || "1.50 MB",
                fileUrl: h.fileUrl || doc.fileUrl,
                mimeType: doc.mimeType,
                status: "ARCHIVED",
                version: h.version || `v${h.issueNumber || '1'}.${h.amendmentNumber || '0'}`,
                history: doc.history,
                isArchivedHistoryRow: true
              });
            }
          }
        });
      }
    });

    return list;
  }, [nablDocs]);

  const filteredDocs = useMemo(() => {
    return allAvailableDocs.filter(doc => {
      const matchesSearch =
        doc.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.description || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCat = selectedCategory === "all" || doc.category === selectedCategory;

      let matchesStatus = true;
      if (selectedStatus !== "all") {
        if (selectedStatus === "ARCHIVED" || selectedStatus === "Archived") {
          matchesStatus = doc.status === "ARCHIVED" || doc.status === "Archived";
        } else if (selectedStatus === "LATEST" || selectedStatus === "Active") {
          matchesStatus = doc.status === "LATEST" || doc.status === "Active";
        } else {
          matchesStatus = doc.status === selectedStatus;
        }
      }

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [allAvailableDocs, searchTerm, selectedCategory, selectedStatus]);

  // Paginated docs slice
  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDocs.slice(start, start + pageSize);
  }, [filteredDocs, currentPage, pageSize]);

  // Calculated Metrics for Screen 1
  const stats = useMemo(() => {
    const total = nablDocs.length;
    const active = nablDocs.filter(d => d.status === "LATEST" || d.status === "Active").length;
    const archived = allAvailableDocs.filter(d => d.status === "ARCHIVED" || d.status === "Archived").length;
    const categoriesCount = new Set(nablDocs.map(d => d.category)).size;

    return { total, active, archived, categoriesCount };
  }, [nablDocs, allAvailableDocs]);

  const categories = ["Guidance", "Policy", "Procedure", "Checklist", "Application / Accreditation", "Assessment", "Other"];

  const [fileUrl, setFileUrl] = useState("");

  const handleFileProcess = (file) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setFileUrl(e.target.result);
    };
    reader.readAsDataURL(file);
    setNewNabl(prev => ({
      ...prev,
      fileName: file.name,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`
    }));
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleSaveNablDoc = async (e) => {
    e.preventDefault();
    if (!newNabl.documentNumber || !newNabl.title) {
      alert("Please fill in required fields: Document Number and Title.");
      return;
    }

    const payload = {
      ...newNabl,
      fileName: selectedFile ? selectedFile.name : (newNabl.fileName || `${newNabl.documentNumber.replace(/\s+/g, '-')}.pdf`),
      fileSize: selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : "1.85 MB",
      fileUrl: fileUrl
    };

    try {
      await addNablReferenceApi(payload);
    } catch (err) {
      console.warn("Backend API error adding NABL reference:", err);
    }

    mockDocumentDb.addNablReference(payload);

    fetchNablDocs();
    setIsUploadModalOpen(false);
    setSelectedFile(null);
    setFileUrl("");
    setNewNabl({
      documentNumber: "",
      title: "",
      category: "Guidance",
      issueNumber: "01",
      amendmentNumber: "00",
      issueDate: new Date().toISOString().substring(0, 10),
      amendmentDate: new Date().toISOString().substring(0, 10),
      description: "",
      fileName: "",
      fileSize: "1.50 MB"
    });
  };

  const handleOpenAmendmentModal = (doc) => {
    setActiveDocForAmendment(doc);
    setAmendmentForm({
      issueNumber: doc.issueNumber || "01",
      amendmentNumber: String(Number(doc.amendmentNumber || 0) + 1).padStart(2, '0'),
      amendmentDate: new Date().toISOString().substring(0, 10),
      changeReason: "",
      description: doc.description || "",
      fileName: "",
      fileSize: "2.10 MB"
    });
    setIsAmendmentModalOpen(true);
  };

  const handleSaveAmendment = async (e) => {
    e.preventDefault();
    if (!activeDocForAmendment) return;

    const payload = {
      ...amendmentForm,
      fileName: selectedFile ? selectedFile.name : (amendmentForm.fileName || `${activeDocForAmendment.documentNumber.replace(/\s+/g, '-')}-A${amendmentForm.amendmentNumber}.pdf`),
      fileSize: selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : "2.10 MB",
      fileUrl: fileUrl || activeDocForAmendment.fileUrl
    };

    try {
      await addNablAmendmentApi(activeDocForAmendment.id, payload);
    } catch (err) {
      console.warn("Backend API error saving amendment:", err);
    }

    mockDocumentDb.addNablAmendment(activeDocForAmendment.id, payload);

    fetchNablDocs();
    setIsAmendmentModalOpen(false);
    setActiveDocForAmendment(null);
    setSelectedFile(null);
    setFileUrl("");
  };

  const handleArchive = async (id) => {
    if (window.confirm("Are you sure you want to archive this NABL Reference Document?")) {
      try {
        await archiveNablReferenceApi(id);
      } catch (err) {
        console.warn("Backend API error archiving NABL reference:", err);
      }
      mockDocumentDb.archiveNablReference(id);
      fetchNablDocs();
      if (activeDocForDrawer && activeDocForDrawer.id === id) {
        setIsDetailDrawerOpen(false);
      }
    }
  };

  const handleRowClick = (doc) => {
    setActiveDocForDrawer(doc);
    setDrawerTab("details");
    setIsDetailDrawerOpen(true);
  };

  return (
    <MainLayout headerTitle="NABL References" headerSubtitle="Manage official NABL guidance and reference documents">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">

        {/* 4 Summary KPI Cards (Screen 1 Reference) */}
        <motion.div variants={stagger.container} initial="hidden" animate="visible" className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total Documents"
            value={stats.total}
            subtitle="All time reference library"
            icon={FileText}
            tone="navy"
            percentage={100}
            meterLabel="System Logged Rate"
          />
          <KpiCard
            title="Active Documents"
            value={stats.active}
            subtitle="Latest published versions"
            icon={CheckCircle}
            tone="emerald"
            percentage={stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 100}
            meterLabel="Active Version Share"
          />
          <KpiCard
            title="Archived Versions"
            value={stats.archived}
            subtitle="Old archived revisions"
            icon={Clock}
            tone="navy"
            percentage={stats.total > 0 ? Math.round((stats.archived / stats.total) * 100) : 0}
            meterLabel="Archived History Rate"
          />
          <KpiCard
            title="Categories"
            value={stats.categoriesCount}
            subtitle="Document category schemas"
            icon={Layers}
            tone="emerald"
            percentage={100}
            meterLabel="Category Coverage"
          />
        </motion.div>

        {/* Top Header Controls (Screen 1) */}
        <div className="mb-6 flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between">
          <div className="flex-1 max-w-xl flex h-10 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 focus-within:border-[#243744] focus-within:ring-2 focus-within:ring-[#243744]/10 transition-all">
            <Search size={16} className="text-[#94A3B8] shrink-0" />
            <input
              type="text"
              placeholder="Search by document number or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-10 px-3.5 py-2 text-xs font-semibold text-[#475569] border border-[#E2E8F0] bg-white rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all shrink-0 min-w-[140px] appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%238A97A4' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: "right 10px center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "16px",
                paddingRight: "30px"
              }}
              aria-label="Filter NABL documents by category"
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
              aria-label="Filter NABL documents by status"
            >
              <option value="all">All Status</option>
              <option value="LATEST">Active</option>
              <option value="ARCHIVED">Archived</option>
            </select>

            {/* <button
              onClick={() => alert("Filter options active")}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 px-3.5 text-xs font-bold text-[#475569] shadow-xs transition-all"
            >
              <Filter size={14} className="text-[#243744]" /> Filters
            </button> */}

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#243744] hover:bg-[#1A2733] px-4 text-xs font-bold text-white shadow-sm transition-all active:scale-95"
            >
              <Plus size={14} /> Upload NABL Document
            </button>
          </div>
        </div>

        {/* NABL Documents Data Table (Screen 1) */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden">
          {filteredDocs.length === 0 ? (
            <div className="p-16 text-center">
              <Award size={40} className="mx-auto text-[#94A3B8] mb-3" />
              <h3 className="text-base font-bold text-[#1E293B]">No NABL references available</h3>
              <p className="text-xs text-[#64748B] mt-1">Upload an official NABL reference document to populate the central library.</p>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#243744] text-white text-xs font-bold hover:bg-[#1A2733] transition-all"
              >
                <Plus size={14} /> Upload NABL Document
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table View (md and above) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#FAFBFD] text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                      <th className="px-6 py-3.5 whitespace-nowrap">Document No.</th>
                      <th className="px-6 py-3.5 whitespace-nowrap">Title</th>
                      <th className="px-6 py-3.5 whitespace-nowrap">Issue</th>
                      <th className="px-6 py-3.5 whitespace-nowrap">Amendment</th>
                      <th className="px-6 py-3.5 whitespace-nowrap">Issue / Amendment Date</th>
                      <th className="px-6 py-3.5 whitespace-nowrap">Category</th>
                      <th className="px-6 py-3.5 whitespace-nowrap">Status</th>
                      <th className="px-6 py-3.5 text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <motion.tbody variants={stagger.container} initial="hidden" animate="visible" className="divide-y divide-[#F1F5F9]">
                    {paginatedDocs.map((doc) => (
                      <motion.tr
                        key={doc.id}
                        variants={stagger.item}
                        onClick={() => handleRowClick(doc)}
                        className="hover:bg-[#FAF9FF] transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4 text-xs font-black text-[#243744] whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#243744]/10 text-[#243744]">
                            {doc.documentNumber}
                          </span>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <span className="font-bold text-xs text-[#1E293B] block line-clamp-1">{doc.title}</span>
                          {doc.description && (
                            <span className="text-[11px] text-slate-400 font-medium block mt-0.5 line-clamp-1">{doc.description}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-[#475569] whitespace-nowrap">
                          {doc.issueNumber || "01"}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-[#475569] whitespace-nowrap">
                          {doc.amendmentNumber && doc.amendmentNumber !== "00" ? doc.amendmentNumber : "-"}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-[#475569] whitespace-nowrap">
                          {doc.issueDate ? new Date(doc.issueDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-[#243744]">
                            {doc.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {doc.status === "LATEST" || doc.status === "Active" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#059669] border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Archived
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuDoc(doc);
                                setMenuAnchorEl(e.currentTarget);
                              }}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-[#243744] transition-colors"
                              title="More Actions"
                            >
                              <MoreVertical size={16} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </table>
              </div>

              {/* Mobile & Tablet Responsive Card View (Screen < md) */}
              <div className="block md:hidden p-3.5 space-y-3.5 bg-slate-50/60">
                {paginatedDocs.map((doc) => (
                  <motion.div
                    key={doc.id}
                    variants={stagger.item}
                    initial="hidden"
                    animate="visible"
                    onClick={() => handleRowClick(doc)}
                    className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 hover:border-[#243744]/40 transition-all cursor-pointer space-y-3"
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#243744]/10 text-[#243744] font-black text-xs">
                        {doc.documentNumber}
                      </span>
                      {doc.status === "LATEST" || doc.status === "Active" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#059669] border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Archived
                        </span>
                      )}
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h4 className="font-bold text-xs text-[#1E293B] line-clamp-2">{doc.title}</h4>
                      {doc.description && (
                        <p className="text-[11px] text-slate-400 font-medium line-clamp-2 mt-0.5">{doc.description}</p>
                      )}
                    </div>

                    {/* Information Grid */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px]">
                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Category</span>
                        <span className="font-bold text-[#243744]">{doc.category}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Issue / Amd</span>
                        <span className="font-bold text-slate-700">Issue {doc.issueNumber || "01"} {doc.amendmentNumber && doc.amendmentNumber !== "00" ? `• Amd ${doc.amendmentNumber}` : ''}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Date</span>
                        <span className="font-medium text-slate-700">
                          {doc.issueDate ? new Date(doc.issueDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : "—"}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Action Toolbar */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleRowClick(doc)}
                        className="flex-1 py-1.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-[#243744] flex items-center justify-center gap-1 transition-all"
                      >
                        <Eye size={13} /> View Details
                      </button>
                      <button
                        onClick={() => openDocumentPreviewInNewTab(doc)}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-[#243744] hover:bg-[#1A2733] text-[11px] font-bold text-white shadow-xs flex items-center justify-center gap-1 transition-all"
                      >
                        <FileText size={13} /> Preview
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuDoc(doc);
                          setMenuAnchorEl(e.currentTarget);
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-[#243744] transition-colors border border-slate-200 shrink-0"
                        title="More Actions"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}

          {/* Interactive Table Pagination (Same as Project List) */}
          <TablePagination
            totalItems={filteredDocs.length}
            pageSize={pageSize}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="documents"
          />
        </div>

        {/* Portal Action Menu (Same as Project List) */}
        {activeMenuDoc && (
          <PortalActionMenu
            anchorEl={menuAnchorEl}
            open={Boolean(activeMenuDoc)}
            onClose={() => { setActiveMenuDoc(null); setMenuAnchorEl(null); }}
            actions={[
              { label: "View Details", icon: Eye, onClick: () => handleRowClick(activeMenuDoc) },
              { label: "Preview Document", icon: FileText, onClick: () => openDocumentPreviewInNewTab(activeMenuDoc) },
              { label: "Download File", icon: Download, onClick: () => alert(`Downloading ${activeMenuDoc.fileName || activeMenuDoc.documentNumber + '.pdf'}...`) },
              { label: "Upload Amendment", icon: Plus, onClick: () => handleOpenAmendmentModal(activeMenuDoc) },
              { label: "Archive Document", icon: Trash2, danger: true, onClick: () => handleArchive(activeMenuDoc.id) }
            ]}
          />
        )}

        {/* SCREEN 2 — UPLOAD NABL DOCUMENT DRAWER */}
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
            <div className="absolute inset-0 cursor-pointer" onClick={() => setIsUploadModalOpen(false)} />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative z-10 w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200"
            >
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-base font-bold text-[#1E293B]">Upload NABL Document</h3>
                  <p className="text-xs text-slate-500 font-medium">Add new NABL reference or upload latest amendment</p>
                </div>
                <button onClick={() => setIsUploadModalOpen(false)} className="p-1.5 hover:bg-slate-200/80 rounded-full text-slate-400 hover:text-slate-700 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveNablDoc} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-semibold">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Document Number *</label>
                      <input
                        type="text"
                        placeholder="e.g. NABL 160A"
                        value={newNabl.documentNumber}
                        onChange={(e) => setNewNabl(prev => ({ ...prev, documentNumber: e.target.value }))}
                        required
                        className="w-full h-10 px-3 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Document Category *</label>
                      <select
                        value={newNabl.category}
                        onChange={(e) => setNewNabl(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full h-10 px-3 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all bg-white"
                      >
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Document Title *</label>
                    <input
                      type="text"
                      placeholder="e.g. Guide for Preparing Management System Document"
                      value={newNabl.title}
                      onChange={(e) => setNewNabl(prev => ({ ...prev, title: e.target.value }))}
                      required
                      className="w-full h-10 px-3 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Issue Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 01"
                        value={newNabl.issueNumber}
                        onChange={(e) => setNewNabl(prev => ({ ...prev, issueNumber: e.target.value }))}
                        className="w-full h-10 px-3 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:border-[#243744]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Amendment Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 01"
                        value={newNabl.amendmentNumber}
                        onChange={(e) => setNewNabl(prev => ({ ...prev, amendmentNumber: e.target.value }))}
                        className="w-full h-10 px-3 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:border-[#243744]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Issue Date</label>
                      <input
                        type="date"
                        value={newNabl.issueDate}
                        onChange={(e) => setNewNabl(prev => ({ ...prev, issueDate: e.target.value }))}
                        className="w-full h-10 px-3 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:border-[#243744]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Amendment Date</label>
                      <input
                        type="date"
                        value={newNabl.amendmentDate}
                        onChange={(e) => setNewNabl(prev => ({ ...prev, amendmentDate: e.target.value }))}
                        className="w-full h-10 px-3 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:border-[#243744]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                    <textarea
                      rows={3}
                      placeholder="Enter description..."
                      value={newNabl.description}
                      onChange={(e) => setNewNabl(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:border-[#243744]"
                    />
                  </div>

                  {/* Drag & Drop Upload Zone (Screen 2) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Upload Document *</label>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={handleFileDrop}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${dragActive ? "border-[#243744] bg-[#243744]/5" : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                        }`}
                    >
                      <Upload className="w-8 h-8 mx-auto text-[#243744] mb-2" />
                      <p className="text-xs font-bold text-[#1E293B]">Drag & Drop document here</p>
                      <p className="text-[11px] text-slate-400 font-semibold mt-1">PDF recommended</p>
                      <label className="inline-block mt-3 px-4 py-1.5 rounded-xl bg-[#243744] text-white text-xs font-bold hover:bg-[#1A2733] transition-all cursor-pointer">
                        Browse File
                        <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileSelect} className="hidden" />
                      </label>
                      {selectedFile && (
                        <p className="mt-2 text-xs font-bold text-[#059669]">
                          Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#243744] hover:bg-[#1A2733] text-white text-xs font-bold transition-all shadow-sm"
                  >
                    Save Document
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* SCREEN 3 & 4 — NABL REFERENCE DETAIL DRAWER */}
        <AnimatePresence>
          {isDetailDrawerOpen && activeDocForDrawer && (
            <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
              <div className="absolute inset-0 cursor-pointer" onClick={() => setIsDetailDrawerOpen(false)} />

              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative z-10 w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200"
              >
                {/* Drawer Header (Screen 3) */}
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-[#243744] text-white text-xs font-extrabold tracking-wide">
                      {activeDocForDrawer.documentNumber}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-[#059669] border border-emerald-200">
                      Active
                    </span>
                  </div>
                  <button onClick={() => setIsDetailDrawerOpen(false)} className="p-1.5 hover:bg-slate-200/80 rounded-full text-slate-400 hover:text-slate-700">
                    <X size={18} />
                  </button>
                </div>

                {/* Drawer Tabs (Screen 3 & 4: Details / Versions / History) */}
                <div className="flex border-b border-slate-200 px-6 bg-white">
                  {[
                    { id: "details", label: "Details" },
                    { id: "versions", label: "Versions" },
                    { id: "history", label: "History" }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setDrawerTab(tab.id)}
                      className={`px-4 py-3 text-xs font-bold border-b-2 transition-all ${drawerTab === tab.id
                        ? "border-[#243744] text-[#243744]"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Drawer Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {drawerTab === "details" && (
                    <>
                      <div>
                        <h3 className="text-lg font-black text-[#1E293B] tracking-tight">{activeDocForDrawer.title}</h3>
                        <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                          {activeDocForDrawer.description || "Official NABL reference guidelines and compliance specifications."}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 text-xs">
                        <div>
                          <span className="text-slate-400 font-bold block text-[10px] uppercase">Document Number</span>
                          <span className="font-extrabold text-[#1E293B]">{activeDocForDrawer.documentNumber}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block text-[10px] uppercase">Category</span>
                          <span className="font-extrabold text-[#243744]">{activeDocForDrawer.category}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block text-[10px] uppercase">Issue Number</span>
                          <span className="font-extrabold text-[#1E293B]">{activeDocForDrawer.issueNumber || "01"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block text-[10px] uppercase">Amendment Number</span>
                          <span className="font-extrabold text-[#1E293B]">{activeDocForDrawer.amendmentNumber || "01"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block text-[10px] uppercase">Issue Date</span>
                          <span className="font-bold text-slate-700">{activeDocForDrawer.issueDate || "02-Jan-2026"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block text-[10px] uppercase">Amendment Date</span>
                          <span className="font-bold text-slate-700">{activeDocForDrawer.amendmentDate || "02-Jan-2026"}</span>
                        </div>
                      </div>

                      {/* File Card (Screen 3) */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Latest Document File</h4>
                        <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-extrabold text-xs">
                              PDF
                            </div>
                            <div>
                              <p className="text-xs font-bold text-[#1E293B] line-clamp-1">{activeDocForDrawer.fileName || `${activeDocForDrawer.documentNumber}-Am01.pdf`}</p>
                              <p className="text-[10px] text-slate-400 font-semibold">{activeDocForDrawer.fileSize || '1.24 MB'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openDocumentPreviewInNewTab(activeDocForDrawer)}
                              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-[#243744]"
                            >
                              Preview
                            </button>
                            <button
                              onClick={() => alert(`Downloading ${activeDocForDrawer.fileName || activeDocForDrawer.documentNumber + '.pdf'}...`)}
                              className="px-3 py-1.5 rounded-xl bg-[#243744] hover:bg-[#1A2733] text-xs font-bold text-white shadow-xs"
                            >
                              Download
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Screen 4 — Versions Tab */}
                  {drawerTab === "versions" && (
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                        <p className="font-extrabold text-[#243744]">{activeDocForDrawer.documentNumber}</p>
                        <p className="text-slate-500 font-medium">{activeDocForDrawer.title}</p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                            <tr>
                              <th className="px-3 py-2.5">Version</th>
                              <th className="px-3 py-2.5">Issue</th>
                              <th className="px-3 py-2.5">Amd</th>
                              <th className="px-3 py-2.5">Date</th>
                              <th className="px-3 py-2.5">File</th>
                              <th className="px-3 py-2.5 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-semibold">
                            {(activeDocForDrawer.history || [
                              { version: `v${activeDocForDrawer.issueNumber || '1'}.${activeDocForDrawer.amendmentNumber || '0'}`, issueNumber: activeDocForDrawer.issueNumber || "01", amendmentNumber: activeDocForDrawer.amendmentNumber || "00", date: activeDocForDrawer.issueDate || "—", fileName: activeDocForDrawer.fileName || `${activeDocForDrawer.documentNumber}.pdf`, status: activeDocForDrawer.status || "LATEST" }
                            ]).map((ver, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-3 py-3 font-bold text-[#243744]">{ver.version || `Amd ${ver.amendmentNumber}`}</td>
                                <td className="px-3 py-3 text-slate-600">{ver.issueNumber || "01"}</td>
                                <td className="px-3 py-3 text-slate-600">{ver.amendmentNumber || "-"}</td>
                                <td className="px-3 py-3 text-slate-600">{ver.date || "—"}</td>
                                <td className="px-3 py-3 text-[#243744] font-bold max-w-[120px] truncate">{ver.fileName || 'document.pdf'}</td>
                                <td className="px-3 py-3 text-right">
                                  {ver.status === "Latest" || ver.status === "LATEST" ? (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-[#059669]">Latest</span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500">Archived</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <span>ⓘ Only the latest version is shown in the dropdown for labs.</span>
                      </p>
                    </div>
                  )}

                  {drawerTab === "history" && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Publication History</h4>
                      <div className="space-y-2 text-xs text-slate-600">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <p className="font-bold text-[#243744]">Uploaded Initial Version</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">By Super Admin • 15-Jul-2024</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <p className="font-bold text-[#243744]">Published Amendment 01</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">By Super Admin • 02-Jan-2026</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Drawer Footer Actions (Screen 3) */}
                <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-3">
                  <button
                    onClick={() => { setIsDetailDrawerOpen(false); handleOpenAmendmentModal(activeDocForDrawer); }}
                    className="px-4 py-2 rounded-xl border border-[#243744] bg-[#243744]/10 hover:bg-[#243744]/20 text-[#243744] text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Plus size={14} /> Upload New Amendment
                  </button>
                  <button
                    onClick={() => handleArchive(activeDocForDrawer.id)}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all"
                  >
                    Archive Document
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* UPLOAD AMENDMENT MODAL */}
        {isAmendmentModalOpen && activeDocForAmendment && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden"
            >
              <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#1E293B]">Upload New NABL Amendment</h3>
                  <p className="text-xs text-slate-500 font-medium">Publish revised version for {activeDocForAmendment.documentNumber}</p>
                </div>
                <button onClick={() => setIsAmendmentModalOpen(false)} className="p-1 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveAmendment} className="p-6 space-y-4">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-xs space-y-1">
                  <p className="font-extrabold text-[#243744]">{activeDocForAmendment.documentNumber} - {activeDocForAmendment.title}</p>
                  <p className="text-slate-500 font-semibold">Current Version: Issue {activeDocForAmendment.issueNumber} / Amd {activeDocForAmendment.amendmentNumber}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Issue No.</label>
                    <input
                      type="text"
                      value={amendmentForm.issueNumber}
                      onChange={(e) => setAmendmentForm(prev => ({ ...prev, issueNumber: e.target.value }))}
                      required
                      className="w-full h-10 px-3 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:border-[#243744]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Amd No. *</label>
                    <input
                      type="text"
                      value={amendmentForm.amendmentNumber}
                      onChange={(e) => setAmendmentForm(prev => ({ ...prev, amendmentNumber: e.target.value }))}
                      required
                      className="w-full h-10 px-3 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:border-[#243744]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Amd Date</label>
                    <input
                      type="date"
                      value={amendmentForm.amendmentDate}
                      onChange={(e) => setAmendmentForm(prev => ({ ...prev, amendmentDate: e.target.value }))}
                      className="w-full h-10 px-3 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:border-[#243744]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Amendment / Change Summary *</label>
                  <textarea
                    rows={2}
                    placeholder="Describe changes in this NABL amendment..."
                    value={amendmentForm.changeReason}
                    onChange={(e) => setAmendmentForm(prev => ({ ...prev, changeReason: e.target.value }))}
                    required
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:border-[#243744]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Upload Revised Amendment File *</label>
                  <input type="file" accept=".pdf" onChange={handleFileSelect} className="w-full text-xs font-semibold text-slate-600" />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAmendmentModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#243744] hover:bg-[#1A2733] text-white text-xs font-bold transition-all shadow-sm"
                  >
                    Publish Amendment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* DOCUMENT PREVIEW MODAL */}
        {isPreviewModalOpen && activeDocForPreview && (
          <DocumentPreviewModal
            isOpen={isPreviewModalOpen}
            doc={activeDocForPreview}
            onClose={() => setIsPreviewModalOpen(false)}
          />
        )}

      </div>
    </MainLayout>
  );
};

export default NablReferencesPage;
