import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, Eye, Download, FileText, CheckCircle, Clock, Award,
  AlertTriangle, Filter, ChevronDown, Layers, FileCheck, FolderCheck, RefreshCw, X, Bell,
  MoreVertical, Trash2
} from "lucide-react";
import MainLayout from "../layout/MainLayout";
import { mockDocumentDb } from "../../utils/mockDocumentData";
import {
  getLabDocumentsApi,
  addLabDocumentApi,
  archiveLabDocumentApi
} from "../../api/documentControl";
import DocumentDetailDrawer from "./DocumentDetailDrawer";
import UploadDocumentModal from "./UploadDocumentModal";
import CreateRevisionModal from "./CreateRevisionModal";
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

export const DocumentControlMain = () => {
  // Current user / lab scope
  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const currentLabId = currentUser?.labId || "LAB-001";

  // Data states
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters & Tabs
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'Controlled Document' | 'Supporting Document'
  const [selectedStatus, setSelectedStatus] = useState("all"); // 'all' | 'Active' | 'Review Due' | 'Archived'

  // Pagination State (same as Project list)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Portal Action Menu State (same as Project list)
  const [activeMenuDoc, setActiveMenuDoc] = useState(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);

  // Modals & Drawer States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [selectedDocForDrawer, setSelectedDocForDrawer] = useState(null);

  const [isCreateRevisionModalOpen, setIsCreateRevisionModalOpen] = useState(false);
  const [docForRevision, setDocForRevision] = useState(null);

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [docForPreview, setDocForPreview] = useState(null);

  const fetchDocuments = async () => {
    setLoading(true);
    const isSuperAdmin = currentUser?.role === "superadmin" || currentUser?.role === "super_admin";
    const labParam = isSuperAdmin ? "all" : currentLabId;

    try {
      const res = await getLabDocumentsApi({ labId: labParam });
      if (res?.data?.success && Array.isArray(res.data.data)) {
        const formatted = res.data.data.map(d => ({
          ...d,
          id: d.id,
          documentNumber: d.document_number || d.documentNumber,
          documentType: d.document_type || d.documentType,
          currentRevision: d.current_revision || d.currentRevision || "Rev 00",
          effectiveDate: d.effective_date || d.effectiveDate,
          reviewDate: d.review_date || d.reviewDate,
          fileName: d.file_name || d.fileName,
          fileSize: d.file_size || d.fileSize,
          fileUrl: d.file_url || d.fileUrl,
          labId: d.lab_id || d.labId,
          labName: d.lab_name || d.labName,
          createdBy: d.created_by_name || d.createdBy,
          revisions: (d.revisions || []).map(rv => ({
            ...rv,
            revisionNumber: rv.revision_number || rv.revisionNumber,
            effectiveDate: rv.effective_date || rv.effectiveDate,
            fileName: rv.file_name || rv.fileName,
            fileUrl: rv.file_url || rv.fileUrl
          }))
        }));
        setDocuments(formatted);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn("Backend API unavailable for lab documents, using local mock DB:", err);
    }

    const data = mockDocumentDb.getLabDocuments(labParam);
    setDocuments(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, [currentLabId]);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab, selectedStatus]);

  // Filtered documents calculation
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        doc.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.nablReferenceNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.documentType || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTab =
        activeTab === "all" || doc.category === activeTab;

      const matchesStatus =
        selectedStatus === "all" || doc.status === selectedStatus;

      return matchesSearch && matchesTab && matchesStatus;
    });
  }, [documents, searchTerm, activeTab, selectedStatus]);

  // Paginated documents slice
  const paginatedDocuments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDocuments.slice(start, start + pageSize);
  }, [filteredDocuments, currentPage, pageSize]);

  // KPI Summary Metrics Calculation (Screen 5 Reference)
  const stats = useMemo(() => {
    const total = documents.length;
    const active = documents.filter((d) => d.status === "Active").length;
    const reviewDue = documents.filter((d) => d.status === "Review Due").length;

    const activePct = total > 0 ? Math.round((active / total) * 100) : 100;
    const reviewDuePct = total > 0 ? Math.round((reviewDue / total) * 100) : 0;

    return { total, active, reviewDue, activePct, reviewDuePct };
  }, [documents]);

  const handleRowClick = (doc) => {
    setSelectedDocForDrawer(doc);
    setIsDetailDrawerOpen(true);
  };

  const handleOpenCreateRevision = (doc) => {
    setDocForRevision(doc);
    setIsCreateRevisionModalOpen(true);
  };

  const handleArchiveDocument = (docId) => {
    const reason = window.prompt("Please enter a reason for archiving this document:");
    if (reason !== null) {
      mockDocumentDb.archiveLabDocument(docId, reason);
      fetchDocuments();
      if (selectedDocForDrawer && selectedDocForDrawer.id === docId) {
        setIsDetailDrawerOpen(false);
      }
    }
  };

  const handleOpenPreview = (doc) => {
    openDocumentPreviewInNewTab(doc);
  };

  const getStatusBadge = (status) => {
    if (status === "Active") {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#059669] border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
          Active
        </span>
      );
    }
    if (status === "Review Due") {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Review Due
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        Archived
      </span>
    );
  };

  return (
    <MainLayout headerTitle="My Documents" headerSubtitle="Manage your laboratory documents and compliance records">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">

        {/* 3 Summary KPI Cards (Screen 5 Reference - SmartLab Theme) */}
        <motion.div variants={stagger.container} initial="hidden" animate="visible" className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            title="Total Documents"
            value={stats.total}
            subtitle="All time repository"
            icon={FileText}
            tone="navy"
            percentage={100}
            meterLabel="System Logged Rate"
          />
          <KpiCard
            title="Active Documents"
            value={stats.active}
            subtitle="Up to date"
            icon={CheckCircle}
            tone="emerald"
            percentage={stats.activePct}
            meterLabel="Active Compliance Rate"
          />
          <KpiCard
            title="Review Due"
            value={stats.reviewDue}
            subtitle="Due within 30 days"
            icon={Clock}
            tone="amber"
            percentage={stats.reviewDuePct}
            meterLabel="Review Action Window"
          />
        </motion.div>

        {/* Search, Tabs & Quick Filters Bar (Screen 5) */}
        <div className="mb-6 space-y-4">
          {/* Top Bar: Search + Upload Button */}
          <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between">
            <div className="flex-1 max-w-xl flex h-10 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 focus-within:border-[#243744] focus-within:ring-2 focus-within:ring-[#243744]/10 transition-all">
              <Search size={16} className="text-[#94A3B8] shrink-0" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#243744] hover:bg-[#1A2733] px-4 text-xs font-bold text-white shadow-sm transition-all active:scale-95"
              >
                <Plus size={14} /> Upload Document
              </button>
            </div>
          </div>

          {/* Filter Tabs & Quick Pills (Screen 5 Reference) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              {[
                { id: "all", label: "All" },
                { id: "Controlled Document", label: "Controlled Documents" },
                { id: "Supporting Document", label: "Supporting Documents" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === tab.id
                      ? "bg-[#243744] text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-[#243744]"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Quick Status Pills on Right (Screen 5) */}
            <div className="flex items-center gap-2">
              {[
                { id: "all", label: "All" },
                { id: "Active", label: "Active" },
                { id: "Review Due", label: "Review Due" },
                { id: "Archived", label: "Archived" }
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStatus(s.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${selectedStatus === s.id
                      ? "border-[#243744] bg-[#243744]/10 text-[#243744]"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Document Table (Screen 5) */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden">
          {filteredDocuments.length === 0 ? (
            <div className="p-16 text-center">
              <FileText size={40} className="mx-auto text-[#94A3B8] mb-3" />
              <h3 className="text-base font-bold text-[#1E293B]">No documents found</h3>
              <p className="text-xs text-[#64748B] mt-1">Upload your first laboratory document to start managing your compliance records.</p>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#243744] text-white text-xs font-bold hover:bg-[#1A2733] transition-all"
              >
                <Plus size={14} /> Upload Document
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#FAFBFD] text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                    <th className="px-6 py-3.5 whitespace-nowrap">Document No.</th>
                    <th className="px-6 py-3.5 whitespace-nowrap">Title</th>
                    <th className="px-6 py-3.5 whitespace-nowrap">Type</th>
                    <th className="px-6 py-3.5 whitespace-nowrap">Revision</th>
                    <th className="px-6 py-3.5 whitespace-nowrap">NABL Reference</th>
                    <th className="px-6 py-3.5 whitespace-nowrap">Review Date</th>
                    <th className="px-6 py-3.5 whitespace-nowrap">Status</th>
                    <th className="px-6 py-3.5 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <motion.tbody variants={stagger.container} initial="hidden" animate="visible" className="divide-y divide-[#F1F5F9]">
                  {paginatedDocuments.map((doc) => (
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
                        {doc.documentType || "SOP"}
                      </td>
                      <td className="px-6 py-4 text-xs font-extrabold text-[#243744] whitespace-nowrap">
                        {doc.currentRevision || "Rev 00"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-[#243744]">
                          {doc.nablReferenceNumber || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-[#475569] whitespace-nowrap">
                        {doc.reviewDate ? new Date(doc.reviewDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(doc.status)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* <button
                            onClick={() => handleOpenPreview(doc)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-[#243744] transition-colors"
                            title="Preview Document"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => alert(`Downloading ${doc.fileName}...`)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-[#243744] transition-colors"
                            title="Download File"
                          >
                            <Download size={15} />
                          </button> */}

                          {/* Portal Action Menu Trigger (Same as Project List) */}
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
          )}

          {/* Interactive Table Pagination (Same as Project List) */}
          <TablePagination
            totalItems={filteredDocuments.length}
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
              { label: "Preview File", icon: FileText, onClick: () => handleOpenPreview(activeMenuDoc) },
              { label: "Download File", icon: Download, onClick: () => alert(`Downloading ${activeMenuDoc.fileName}...`) },
              { label: "Create Revision", icon: Plus, onClick: () => handleOpenCreateRevision(activeMenuDoc) },
              { label: "Archive Document", icon: Trash2, danger: true, onClick: () => handleArchiveDocument(activeMenuDoc.id) }
            ]}
          />
        )}

        {/* SCREEN 7 & 11 — LAB DOCUMENT DETAIL DRAWER */}
        <AnimatePresence>
          {isDetailDrawerOpen && selectedDocForDrawer && (
            <DocumentDetailDrawer
              doc={selectedDocForDrawer}
              onClose={() => setIsDetailDrawerOpen(false)}
              onOpenCreateRevision={() => {
                setIsDetailDrawerOpen(false);
                handleOpenCreateRevision(selectedDocForDrawer);
              }}
              onArchive={() => handleArchiveDocument(selectedDocForDrawer.id)}
              onPreview={(d) => handleOpenPreview(d)}
            />
          )}
        </AnimatePresence>

        {/* SCREEN 6 — UPLOAD LAB DOCUMENT MODAL */}
        {isUploadModalOpen && (
          <UploadDocumentModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            onSuccess={fetchDocuments}
            currentLabId={currentLabId}
          />
        )}

        {/* SCREEN 10 — CREATE NEW REVISION MODAL */}
        {isCreateRevisionModalOpen && docForRevision && (
          <CreateRevisionModal
            isOpen={isCreateRevisionModalOpen}
            doc={docForRevision}
            onClose={() => setIsCreateRevisionModalOpen(false)}
            onSuccess={fetchDocuments}
          />
        )}

        {/* SCREEN 14 — DOCUMENT PREVIEW MODAL */}
        {isPreviewModalOpen && docForPreview && (
          <DocumentPreviewModal
            isOpen={isPreviewModalOpen}
            doc={docForPreview}
            onClose={() => setIsPreviewModalOpen(false)}
          />
        )}

      </div>
    </MainLayout>
  );
};

export default DocumentControlMain;
