import React, { useEffect, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Eye, Pencil, Trash2, RefreshCw, Download, Search,
  ChevronDown, Edit3, FileText, FlaskConical, CheckSquare, Table2,
  FileSpreadsheet, CheckCircle2, AlertCircle, Clock
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { MainLayout } from "../../components/layout";
import { TableSkeleton } from "../../components/ui/Skeleton";
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
    qa_approved: { text: "QA Approved", bg: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  };
  const config = map[norm] || { text: status, bg: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${config.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.text}
    </span>
  );
};

// Reusable Portal Action Menu to match ProjectsList.jsx exactly
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

export default function ObservationEntry() {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const scopeTestIdParam = searchParams.get("scope_test_id");
  const sampleIdParam = searchParams.get("sample_id");
  const templateIdParam = searchParams.get("template_id");
  const obsIdParam = searchParams.get("observation_id");

  const isDirectFiller = Boolean(scopeTestIdParam || sampleIdParam || templateIdParam || obsIdParam);

  const [selectedObsId, setSelectedObsId] = useState(obsIdParam || null);
  const [filledSheets, setFilledSheets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [activeAnchorEl, setActiveAnchorEl] = useState(null);

  // Fetch real saved observation records from PostgreSQL DB
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getSampleObservations();
      const records = res.data?.data || [];

      if (records.length > 0) {
        setFilledSheets(records);
      } else {
        // Fallback to sample entries if no saved observations exist yet
        try {
          const sampleRes = await getSampleEntries();
          const samples = sampleRes.data?.data || [];
          const demoList = samples.map((s, idx) => ({
            observation_id: `demo_${s.sample_id || idx}`,
            sample_id: s.sample_id,
            sample_no: s.sample_no || `SAMPLE-2026-00${idx + 1}`,
            test_name: s.test_name || "Soil & Geotechnical Test",
            test_method: s.test_method || "IS Standard Code",
            operator_name: s.created_by_name || "Lab Technician",
            status: idx % 2 === 0 ? "Submitted" : "Approved",
            created_at: s.entry_date || new Date().toISOString(),
          }));
          setFilledSheets(demoList);
        } catch (e) {
          setFilledSheets([]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch filled observations list:", err);
      toast.error("Failed to load observation records");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isDirectFiller) {
      fetchData();
    }
  }, [isDirectFiller, fetchData]);

  const handleToggleDropdown = (id, event) => {
    if (activeDropdownId === id) {
      setActiveDropdownId(null);
      setActiveAnchorEl(null);
    } else {
      setActiveDropdownId(id);
      setActiveAnchorEl(event.currentTarget);
    }
  };

  // Delete saved observation entry from DB
  const handleDeleteObservation = async (obsObj) => {
    if (!window.confirm(`Are you sure you want to delete observation record for ${obsObj.sample_no || "this sample"}?`)) {
      return;
    }
    try {
      const obsId = obsObj.observation_id;
      if (String(obsId).startsWith("demo_")) {
        setFilledSheets((prev) => prev.filter((item) => item.observation_id !== obsId));
        toast.success("Observation record removed");
      } else {
        await deleteSampleObservation(obsId);
        setFilledSheets((prev) => prev.filter((item) => item.observation_id !== obsId));
        toast.success("Observation record deleted successfully");
      }
    } catch (e) {
      console.error("Delete observation error:", e);
      toast.error("Failed to delete observation record");
    }
  };

  // Filtered observation records to match ProjectsList filtering
  const filteredSheets = useMemo(() => {
    let list = [...filledSheets];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.sample_no?.toLowerCase().includes(q) ||
          s.test_name?.toLowerCase().includes(q) ||
          s.test_method?.toLowerCase().includes(q) ||
          s.operator_name?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      list = list.filter((s) => (s.status || "draft").toLowerCase().replace(" ", "_") === statusFilter);
    }

    return list;
  }, [filledSheets, search, statusFilter]);

  // If opened directly or a sheet record is selected for viewing/editing
  if (isDirectFiller || selectedObsId) {
    return (
      <ObservationSheetFiller
        observationId={selectedObsId}
        templateId={templateIdParam}
        onBack={() => {
          if (selectedObsId) {
            setSelectedObsId(null);
            fetchData();
          } else {
            navigate("/test-assignments");
          }
        }}
      />
    );
  }

  // MAIN OBSERVATION TAB: EXACT SAME UI AS PROJECTS LIST
  return (
    <MainLayout
      headerTitle="Observation Entry"
      headerSubtitle="User / Lab Technician Test Readings Entry & Observations Registry"
    >
      <Toaster position="top-right" richColors />
      <div className="flex flex-col bg-[#F8FAFC] min-h-[calc(100vh-4rem)] p-4 sm:p-6 space-y-5">

        {/* Top Search & Action Bar - Matching ProjectsList.jsx exactly */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A97A4]" />
            <input
              type="text"
              placeholder="Search sample no, test, method..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 text-xs font-semibold text-[#1E293B] border border-[#E2E8F0] bg-white rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all placeholder:text-[#8A97A4]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            
            {/* Status select */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3.5 py-2 text-xs font-semibold text-[#475569] border border-[#E2E8F0] bg-white rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all shrink-0 min-w-[130px] appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%238A97A4' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: "right 10px center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "16px",
                paddingRight: "30px"
              }}
              aria-label="Filter observations by status"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <button
              onClick={fetchData}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] px-4 text-xs font-bold text-[#475569] transition-colors"
            >
              <RefreshCw size={14} className="text-[#8A97A4]" />
              Refresh
            </button>

            <button
              onClick={() => navigate("/test-assignments")}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#243744] hover:bg-[#1A2733] px-4 text-xs font-bold text-white shadow-sm transition-colors"
            >
              <Plus size={14} />
              Fill New Sheet
            </button>
          </div>
        </div>

        {/* Desktop Table View - Matching ProjectsList.jsx exactly */}
        <div className="hidden lg:block bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          {loading ? (
            <TableSkeleton rows={5} cols={7} />
          ) : filteredSheets.length === 0 ? (
            <div className="p-16 text-center">
              <FlaskConical size={40} className="mx-auto text-[#94A3B8] mb-3" />
              <h3 className="text-base font-bold text-[#1E293B]">No observation records found</h3>
              <p className="text-xs text-[#64748B] mt-1">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#FAFBFD] text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                    <th className="px-6 py-3.5">Sample No / Job ID</th>
                    <th className="px-6 py-3.5">Test Name</th>
                    <th className="px-6 py-3.5">Standard Method</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Technician</th>
                    <th className="px-6 py-3.5">Testing Date</th>
                    <th className="px-6 py-3.5 text-center w-[90px]">Actions</th>
                  </tr>
                </thead>
                <motion.tbody variants={stagger.container} initial="hidden" animate="visible" className="divide-y divide-[#F1F5F9]">
                  {filteredSheets.map((sheet) => {
                    const obsId = sheet.observation_id || sheet.id;
                    const createdDate = sheet.created_at ? sheet.created_at.split("T")[0] : new Date().toISOString().split("T")[0];

                    return (
                      <motion.tr key={obsId} variants={stagger.item} className="hover:bg-[#FAF9FF] transition-colors">
                        <td className="px-6 py-4 text-xs font-extrabold text-[#1E293B] font-mono">
                          {sheet.sample_no || `SAMPLE-${sheet.sample_id}`}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-[#1E293B]">{sheet.test_name}</td>
                        <td className="px-6 py-4 text-xs font-bold text-[#2563EB] font-mono">{sheet.test_method || "IS Standard Code"}</td>
                        <td className="px-6 py-4">{getStatusBadge(sheet.status)}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-[#475569]">{sheet.operator_name || "Lab Technician"}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-[#64748B]">{createdDate}</td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={(e) => handleToggleDropdown(obsId, e)}
                            className="p-1.5 hover:bg-[#F1F5F9] rounded-lg transition-colors text-[#8A97A4] hover:text-[#1A2733]"
                          >
                            <ChevronDown size={16} />
                          </button>

                          <PortalActionMenu
                            anchorEl={activeDropdownId === obsId ? activeAnchorEl : null}
                            open={activeDropdownId === obsId}
                            onClose={() => { setActiveDropdownId(null); setActiveAnchorEl(null); }}
                            actions={[
                              { label: "View / Edit Sheet", icon: Edit3, onClick: () => setSelectedObsId(obsId) },
                              { label: "Delete Record", icon: Trash2, danger: true, onClick: () => handleDeleteObservation(sheet) }
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

          {/* Pagination - Matching ProjectsList.jsx */}
          <div className="flex items-center justify-between border-t border-[#E2E8F0] px-6 py-4 bg-white select-none">
            <p className="text-xs font-semibold text-[#64748B]">
              Showing <span className="text-[#1E293B]">{filteredProjectsLength(filteredSheets.length)}</span> of{" "}
              <span className="text-[#1E293B]">{filledSheets.length}</span> observation records
            </p>
            <div className="flex items-center gap-1.5">
              <button className="h-8 w-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40" disabled>&lt;</button>
              <button className="h-8 w-8 rounded-lg bg-[#243744] text-white flex items-center justify-center text-xs font-bold shadow-sm">1</button>
              <button className="h-8 w-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40" disabled>&gt;</button>
            </div>
          </div>
        </div>

        {/* Mobile Cards View - Matching ProjectsList.jsx */}
        <div className="lg:hidden">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="lab-skeleton h-44" />)}
            </div>
          ) : filteredSheets.length === 0 ? (
            <div className="p-8 text-center bg-white border border-[#E2E8F0] rounded-2xl">
              <FlaskConical size={32} className="mx-auto text-[#94A3B8] mb-2" />
              <h3 className="text-sm font-bold text-[#1E293B]">No observation records found</h3>
            </div>
          ) : (
            <motion.div className="space-y-4" variants={stagger.container} initial="hidden" animate="visible">
              {filteredSheets.map((sheet) => {
                const obsId = sheet.observation_id || sheet.id;
                const createdDate = sheet.created_at ? sheet.created_at.split("T")[0] : new Date().toISOString().split("T")[0];

                return (
                  <motion.div
                    key={obsId}
                    className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden p-4"
                    variants={stagger.item}
                  >
                    <div className="flex justify-between items-start mb-3 gap-3">
                      <div className="min-w-0">
                        <span className="text-[10px] font-black uppercase text-[#243744] bg-[#243744]/5 border border-[#243744]/15 px-2 py-0.5 rounded font-mono">
                          {sheet.sample_no || `SAMPLE-${sheet.sample_id}`}
                        </span>
                        <h3 className="font-bold text-sm text-[#1E293B] mt-1.5 truncate">
                          {sheet.test_name}
                        </h3>
                        <p className="text-xs font-bold text-blue-700 font-mono mt-0.5">{sheet.test_method || "IS Standard Code"}</p>
                      </div>
                      {getStatusBadge(sheet.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4 text-xs pt-2 border-t border-[#F1F5F9]">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A97A4] mb-0.5">Technician</p>
                        <p className="font-semibold text-[#475569] truncate">{sheet.operator_name || "Lab Technician"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A97A4] mb-0.5">Testing Date</p>
                        <p className="font-bold text-[#1E293B]">{createdDate}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
                      <button
                        onClick={() => setSelectedObsId(obsId)}
                        className="flex items-center gap-1.5 rounded-xl bg-[#243744] px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#1A2733]"
                      >
                        <Edit3 size={14} />
                        View / Edit Sheet
                      </button>
                      <button
                        onClick={() => handleDeleteObservation(sheet)}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>

      </div>
    </MainLayout>
  );
}

const filteredProjectsLength = (len) => len;
