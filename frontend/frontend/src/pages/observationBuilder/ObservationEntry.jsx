import React, { useEffect, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Eye, Pencil, Trash2, RefreshCw, Download, Search,
  ChevronDown, Edit3, FileText, FlaskConical, CheckSquare, Table2,
  FileSpreadsheet, CheckCircle2, AlertCircle, Clock, MoreVertical, RotateCcw,
  ArrowUp, ArrowDown, ArrowUpDown
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { MainLayout } from "../../components/layout";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { TablePagination } from "../../components/ui/TablePagination";
import { useDebounce } from "../../hooks/useDebounce";
import ObservationSheetFiller from "./ObservationSheetFiller";
import { getSampleObservations, deleteSampleObservation } from "../../api/sampleObservations";
import { getSampleEntries } from "../../api/sampleEntries";

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "draft", label: "Draft" },
];

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } },
  item: {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 0.68, 0, 1] } },
  },
};

const getStatusBadge = (status) => {
  const norm = (status || "draft").toLowerCase().replace(" ", "_");
  const map = {
    draft: { text: "Draft", bg: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-500" },
    submitted: { text: "Submitted", bg: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
    approved: { text: "QA Approved", bg: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
    qa_approved: { text: "QA Approved", bg: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]", dot: "bg-[#2563EB]" },
  };
  const config = map[norm] || { text: status, bg: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${config.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.text}
    </span>
  );
};

// Portal-based scroll/resize safe action menu to match ProjectsList.jsx exactly
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

const ObservationEntry = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sorting state (Default: sample_code ascending)
  const [sortConfig, setSortConfig] = useState({ key: "sample_code", direction: "asc" });

  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [activeAnchorEl, setActiveAnchorEl] = useState(null);

  // Modal / Drawer state for Sheet Filler
  const [fillerModal, setFillerModal] = useState({
    open: false,
    mode: "fill", // "fill" | "view" | "edit"
    sheetData: null,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams(location.search);
      const projectId = queryParams.get("project_id");

      const response = await getSampleObservations(projectId ? { project_id: projectId } : {});
      const raw = response.data?.data || response.data || [];
      const list = Array.isArray(raw) ? raw : [];

      setSheets(list);
    } catch (err) {
      console.error("Failed to load observation sheets:", err);
      toast.error("Failed to fetch observation records");
    } finally {
      setLoading(false);
    }
  }, [location.search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, sortConfig]);

  const handleSortChange = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleToggleDropdown = (id, event) => {
    if (activeDropdownId === id) {
      setActiveDropdownId(null);
      setActiveAnchorEl(null);
    } else {
      setActiveDropdownId(id);
      setActiveAnchorEl(event.currentTarget);
    }
  };

  const handleDeleteSheet = async (observationId) => {
    if (!window.confirm("Are you sure you want to delete this observation sheet record?")) return;
    try {
      await deleteSampleObservation(observationId);
      toast.success("Observation record deleted successfully");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete record");
    }
  };

  const filteredSheets = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const filtered = sheets.filter((s) => {
      const matchesSearch =
        !q ||
        s.sample_code?.toLowerCase().includes(q) ||
        s.receipt_no?.toLowerCase().includes(q) ||
        s.location_name?.toLowerCase().includes(q) ||
        s.test_name?.toLowerCase().includes(q) ||
        s.technician_name?.toLowerCase().includes(q);

      const normStatus = (s.status || "draft").toLowerCase();
      const matchesStatus = statusFilter === "all" || normStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });

    return filtered.sort((a, b) => {
      const key = sortConfig.key || "sample_code";
      let valA = a[key] ?? "";
      let valB = b[key] ?? "";

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [sheets, debouncedSearch, statusFilter, sortConfig]);

  const paginatedSheets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSheets.slice(start, start + pageSize);
  }, [filteredSheets, currentPage, pageSize]);

  return (
    <MainLayout headerTitle="Observation Sheets" headerSubtitle="Record and review test observation data for samples">
      <Toaster position="top-right" richColors />
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6 space-y-6">

        {/* Toolbar - Matching ProjectsList.jsx style */}
        <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between">
          
          {/* Search Box */}
          <div className="flex-1 max-w-xl flex h-10 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 focus-within:border-[#243744] focus-within:ring-2 focus-within:ring-[#243744]/10 transition-all">
            <Search size={16} className="text-[#94A3B8] shrink-0" />
            <input
              type="text"
              placeholder="Search sample code, receipt no, test, technician..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none"
            />
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3.5 py-2 text-xs font-semibold text-[#475569] border border-[#E2E8F0] bg-white rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all shrink-0 min-w-[130px] appearance-none cursor-pointer"
              aria-label="Filter observations by status"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <button
              onClick={fetchData}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] px-4 text-xs font-bold text-[#475569] transition-colors cursor-pointer"
            >
              <RefreshCw size={14} className="text-[#8A97A4]" />
              Refresh
            </button>

            <button
              onClick={() => navigate("/test-assignments")}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#243744] hover:bg-[#1A2733] px-4 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer"
            >
              <Plus size={14} />
              Fill New Sheet
            </button>
          </div>
        </div>

        {/* Active Filter Chips / Pills */}
        {(search || statusFilter !== "all") && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500 mr-1">Active Filters:</span>
            {search && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full font-medium text-slate-700">
                Search: "{search}"
                <button type="button" onClick={() => setSearch("")} className="hover:text-red-500 font-bold ml-0.5 cursor-pointer">×</button>
              </span>
            )}
            {statusFilter !== "all" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full font-medium text-blue-700">
                Status: {statusFilter}
                <button type="button" onClick={() => setStatusFilter("all")} className="hover:text-red-500 font-bold ml-0.5 cursor-pointer">×</button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
              className="text-xs font-bold text-slate-500 hover:text-[#243744] underline ml-2 cursor-pointer"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Desktop Table View */}
        <div className="hidden lg:block bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          {loading ? (
            <TableSkeleton rows={5} cols={8} />
          ) : filteredSheets.length === 0 ? (
            <div className="p-16 text-center">
              <FlaskConical size={40} className="mx-auto text-[#94A3B8] mb-3" />
              <h3 className="text-base font-bold text-[#1E293B]">No observation records found</h3>
              <p className="text-xs text-[#64748B] mt-1 mb-4">Try adjusting your filters or search query.</p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#243744] hover:bg-[#1A2733] text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                <RotateCcw size={14} />
                Reset Search & Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#FAFBFD] text-[10px] font-bold text-[#64748B] uppercase tracking-wider select-none">
                    <th className="px-5 py-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("sample_code")}>
                      <div className="flex items-center gap-1.5">
                        <span>Sample Code</span>
                        {sortConfig.key === "sample_code" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-5 py-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("receipt_no")}>
                      <div className="flex items-center gap-1.5">
                        <span>Receipt No.</span>
                        {sortConfig.key === "receipt_no" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-5 py-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("location_name")}>
                      <div className="flex items-center gap-1.5">
                        <span>Location</span>
                        {sortConfig.key === "location_name" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-5 py-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("borelog_no")}>
                      <div className="flex items-center gap-1.5">
                        <span>Borelog</span>
                        {sortConfig.key === "borelog_no" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-5 py-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("test_name")}>
                      <div className="flex items-center gap-1.5">
                        <span>Test Name</span>
                        {sortConfig.key === "test_name" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-5 py-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("status")}>
                      <div className="flex items-center gap-1.5">
                        <span>Status</span>
                        {sortConfig.key === "status" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-5 py-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("technician_name")}>
                      <div className="flex items-center gap-1.5">
                        <span>Technician</span>
                        {sortConfig.key === "technician_name" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-5 py-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("testing_date")}>
                      <div className="flex items-center gap-1.5">
                        <span>Testing Date</span>
                        {sortConfig.key === "testing_date" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-5 py-3.5 text-right whitespace-nowrap w-[90px]">Actions</th>
                  </tr>
                </thead>
                <motion.tbody variants={stagger.container} initial="hidden" animate="visible" className="divide-y divide-[#F1F5F9] bg-white">
                  {paginatedSheets.map((sheet) => (
                    <motion.tr key={sheet.observation_id || sheet.id} variants={stagger.item} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4 font-bold font-mono text-[#243744] whitespace-nowrap">{sheet.sample_code || "—"}</td>
                      <td className="px-5 py-4 font-semibold text-gray-700 whitespace-nowrap">{sheet.receipt_no || "—"}</td>
                      <td className="px-5 py-4 font-medium text-gray-800 whitespace-nowrap">{sheet.location_name || "—"}</td>
                      <td className="px-5 py-4 font-mono text-gray-700 whitespace-nowrap">{sheet.borelog_no || "—"}</td>
                      <td className="px-5 py-4 font-bold text-[#1E293B] whitespace-nowrap">{sheet.test_name || sheet.scope_test_name || "—"}</td>
                      <td className="px-5 py-4 whitespace-nowrap">{getStatusBadge(sheet.status)}</td>
                      <td className="px-5 py-4 font-semibold text-gray-700 whitespace-nowrap">{sheet.technician_name || sheet.created_by_name || "—"}</td>
                      <td className="px-5 py-4 font-medium text-gray-600 whitespace-nowrap">{sheet.testing_date || sheet.created_at || "—"}</td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => handleToggleDropdown(sheet.observation_id || sheet.id, e)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                          <MoreVertical size={16} />
                        </button>

                        <PortalActionMenu
                          anchorEl={activeDropdownId === (sheet.observation_id || sheet.id) ? activeAnchorEl : null}
                          open={activeDropdownId === (sheet.observation_id || sheet.id)}
                          onClose={() => { setActiveDropdownId(null); setActiveAnchorEl(null); }}
                          actions={[
                            {
                              label: "View Sheet Data",
                              icon: Eye,
                              onClick: () => setFillerModal({ open: true, mode: "view", sheetData: sheet })
                            },
                            {
                              label: "Edit Observation",
                              icon: Pencil,
                              onClick: () => setFillerModal({ open: true, mode: "edit", sheetData: sheet })
                            },
                            {
                              label: "Delete Record",
                              icon: Trash2,
                              danger: true,
                              onClick: () => handleDeleteSheet(sheet.observation_id || sheet.id)
                            }
                          ]}
                        />
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          )}

          {/* Table Pagination */}
          <TablePagination
            totalItems={filteredSheets.length}
            pageSize={pageSize}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="observation records"
          />
        </div>

        {/* Mobile View */}
        <div className="lg:hidden">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-40 bg-slate-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : filteredSheets.length === 0 ? (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
              <FlaskConical size={32} className="mx-auto text-[#94A3B8] mb-2" />
              <h3 className="text-sm font-bold text-[#1E293B]">No observation records found</h3>
            </div>
          ) : (
            <motion.div className="space-y-4" variants={stagger.container} initial="hidden" animate="visible">
              {paginatedSheets.map((sheet) => (
                <motion.div
                  key={sheet.observation_id || sheet.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2 relative"
                  variants={stagger.item}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-[#243744] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg">
                      {sheet.sample_code || "—"}
                    </span>
                    {getStatusBadge(sheet.status)}
                  </div>
                  <div className="text-xs space-y-1">
                    <h4 className="font-bold text-slate-800">{sheet.test_name || "—"}</h4>
                    <p className="text-slate-500">Receipt: {sheet.receipt_no || "—"} | Location: {sheet.location_name || "—"}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <span className="text-slate-600 font-medium">Tech: {sheet.technician_name || "—"}</span>
                    <button
                      onClick={() => setFillerModal({ open: true, mode: "view", sheetData: sheet })}
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Observation Sheet Filler Modal */}
        {fillerModal.open && (
          <ObservationSheetFiller
            mode={fillerModal.mode}
            sheetData={fillerModal.sheetData}
            onClose={() => setFillerModal({ open: false, mode: "fill", sheetData: null })}
            onSuccess={() => {
              setFillerModal({ open: false, mode: "fill", sheetData: null });
              fetchData();
            }}
          />
        )}

      </div>
    </MainLayout>
  );
};

export default ObservationEntry;
