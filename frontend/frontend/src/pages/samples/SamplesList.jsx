import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Eye, Pencil, Trash2, Search, RefreshCw, Download, MoreHorizontal, FlaskConical, FileText
} from "lucide-react";
import { MainLayout } from "../../components/layout";
import AddSampleDrawer from "../../components/projects/AddSampleDrawer";
import {
  getSampleEntries,
  getSampleEntryById,
  deleteSampleEntry,
} from "../../api/sampleEntries";
import { getProjects } from "../../api/projects";
import { generateReport } from "../../api/reports";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { toast, Toaster } from "sonner";

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } },
  item: {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 0.68, 0, 1] } },
  },
};

const getSampleId = (sample) => sample.sample_entry_id || sample.sample_id;

const getStatusBadge = (status) => {
  const norm = String(status || "").toLowerCase();
  
  const map = {
    completed: { text: "Completed", bg: "bg-[#ECFDF5] text-[#10B981] border-[#D1FAE5]", dot: "bg-[#10B981]" },
    approved: { text: "Approved", bg: "bg-[#ECFDF5] text-[#10B981] border-[#D1FAE5]", dot: "bg-[#10B981]" },
    rejected: { text: "Rejected", bg: "bg-[#FEF2F2] text-[#EF4444] border-[#FEE2E2]", dot: "bg-[#EF4444]" },
    assigned: { text: "Assigned", bg: "bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE]", dot: "bg-[#2563EB]" },
    testing: { text: "Testing", bg: "bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE]", dot: "bg-[#2563EB]" },
  };
  
  const config = map[norm] || { text: status || "Received", bg: "bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]", dot: "bg-[#475569]" };

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

const SamplesList = () => {
  const [samples, setSamples] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const [projectFilter, setProjectFilter] = useState(() => {
    const queryId = new URLSearchParams(window.location.search).get("project_id");
    return queryId || "all";
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState("add");
  const [drawerSample, setDrawerSample] = useState(null);

  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [activeAnchorEl, setActiveAnchorEl] = useState(null);

  const fetchProjects = async () => {
    try {
      const res = await getProjects();
      setProjects(res.data?.data || res.data?.projects || []);
    } catch (error) {
      console.error("Failed to load projects:", error);
      toast.error("Failed to load projects");
    }
  };

  const fetchSamples = useCallback(async () => {
    try {
      setLoading(true);
      const params = projectFilter !== "all" ? { project_id: projectFilter } : {};
      const res = await getSampleEntries(params);
      setSamples(res.data?.data || []);
    } catch (error) {
      console.error("Failed to load samples:", error);
      toast.error("Failed to load samples");
    } finally {
      setLoading(false);
    }
  }, [projectFilter]);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    const queryId = new URLSearchParams(location.search).get("project_id");
    setProjectFilter(queryId || "all");
  }, [location.search]);

  useEffect(() => {
    fetchSamples();
  }, [fetchSamples]);

  const filteredSamples = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return samples;

    return samples.filter((sample) =>
      [
        sample.sample_no,
        sample.project_no,
        sample.project_code,
        sample.project_name,
        sample.client_name,
        sample.material_name,
        sample.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [samples, search]);

  const openDrawer = async (mode, sample = null) => {
    setDrawerMode(mode);
    setDrawerSample(null);
    setDrawerOpen(true);

    if (mode === "add" || !sample) return;

    try {
      const res = await getSampleEntryById(getSampleId(sample));
      setDrawerSample(res.data?.data || sample);
    } catch (error) {
      console.error("Failed to load sample details:", error);
      setDrawerSample(sample);
      toast.error("Sample details API failed. Opening available sample data.");
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerMode("add");
    setDrawerSample(null);
  };

  const handleDelete = async (sample) => {
    if (!window.confirm("Are you sure you want to delete this sample?")) return;

    try {
      await deleteSampleEntry(getSampleId(sample));
      toast.success("Sample deleted successfully");
      fetchSamples();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete sample");
    }
  };

  const handleGenerateReport = async (sample) => {
    const sampleId = getSampleId(sample);
    try {
      toast.loading("Generating test report from observations...");
      const res = await generateReport(sampleId);
      toast.dismiss();
      if (res.success && res.data) {
        toast.success(res.message || "Report generated successfully!");
        navigate(`/reports/view/${res.data.report_id}`);
      } else {
        toast.error(res.message || "Failed to generate report.");
      }
    } catch (err) {
      toast.dismiss();
      toast.error(err.response?.data?.message || err.message || "Failed to generate report.");
    }
  };

  const handleToggleDropdown = (sampleId, event) => {
    if (activeDropdownId === sampleId) {
      setActiveDropdownId(null);
      setActiveAnchorEl(null);
    } else {
      setActiveDropdownId(sampleId);
      setActiveAnchorEl(event.currentTarget);
    }
  };

  return (
    <MainLayout headerTitle="Samples" headerSubtitle="Full sample register list">
      <Toaster position="top-right" richColors />
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">

        {/* Toolbar */}
        <div className="mb-6 flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between">
          
          {/* Search Box */}
          <div className="flex-1 max-w-xl flex h-10 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 focus-within:border-[#243744] focus-within:ring-2 focus-within:ring-[#243744]/10 transition-all">
            <Search size={16} className="text-[#94A3B8] shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sample, project, client or material..."
              className="w-full bg-transparent text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="h-10 px-3.5 py-2 text-xs font-semibold text-[#475569] border border-[#E2E8F0] bg-white rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all shrink-0 max-w-[200px] appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%238A97A4' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: "right 10px center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "16px",
                paddingRight: "30px"
              }}
              aria-label="Filter samples by project"
            >
              <option value="all">All Projects</option>
              {projects.map((project) => (
                <option key={project.project_id} value={project.project_id}>
                  {project.project_code} - {project.project_name}
                </option>
              ))}
            </select>

            <button
              onClick={fetchSamples}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] px-4 text-xs font-bold text-[#475569] transition-colors"
            >
              <RefreshCw size={14} className="text-[#8A97A4]" />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => openDrawer("add")}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#243744] hover:bg-[#1A2733] px-4 text-xs font-bold text-white shadow-sm transition-colors"
            >
              <Plus size={14} />
              Add Sample
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          {loading ? (
            <TableSkeleton rows={5} cols={8} />
          ) : filteredSamples.length === 0 ? (
            <div className="p-16 text-center">
              <FlaskConical size={40} className="mx-auto text-[#94A3B8] mb-3" />
              <h3 className="text-base font-bold text-[#1E293B]">No samples found</h3>
              <p className="text-xs text-[#64748B] mt-1">Try adjusting your search query or project filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#FAFBFD] text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                    <th className="px-6 py-3.5">Sample No</th>
                    <th className="px-6 py-3.5">Project</th>
                    <th className="px-6 py-3.5">Client</th>
                    <th className="px-6 py-3.5">Material</th>
                    <th className="px-6 py-3.5 text-center">Qty</th>
                    <th className="px-6 py-3.5">Received Date</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right w-[90px]">Actions</th>
                  </tr>
                </thead>
                <motion.tbody variants={stagger.container} initial="hidden" animate="visible" className="divide-y divide-[#F1F5F9]">
                  {filteredSamples.map((sample) => {
                    const sampleId = getSampleId(sample);
                    return (
                      <motion.tr key={sampleId} variants={stagger.item} className="hover:bg-[#FAF9FF] transition-colors">
                        <td className="px-6 py-4 text-xs font-bold text-[#1E293B]">{sample.sample_no || sampleId}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-[#475569]">{sample.project_no || sample.project_code || "—"}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-[#475569]">{sample.client_name || "—"}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-[#475569]">{sample.material_name || "—"}</td>
                        <td className="px-6 py-4 text-center text-xs font-bold text-[#1E293B]">{sample.quantity || sample.nos || "—"}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-[#475569]">{sample.received_date || sample.sample_received_date || "—"}</td>
                        <td className="px-6 py-4">{getStatusBadge(sample.status)}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => handleToggleDropdown(sampleId, e)}
                            className="p-1.5 hover:bg-[#F1F5F9] rounded-lg transition-colors text-[#8A97A4] hover:text-[#1A2733]"
                          >
                            <MoreHorizontal size={16} />
                          </button>

                          <PortalActionMenu
                            anchorEl={activeDropdownId === sampleId ? activeAnchorEl : null}
                            open={activeDropdownId === sampleId}
                            onClose={() => { setActiveDropdownId(null); setActiveAnchorEl(null); }}
                            actions={[
                              { label: "View Details", icon: Eye, onClick: () => openDrawer("view", sample) },
                              { label: "Edit Sample", icon: Pencil, onClick: () => openDrawer("edit", sample) },
                              { label: "Generate Report", icon: FileText, onClick: () => handleGenerateReport(sample) },
                              { label: "Delete Sample", icon: Trash2, danger: true, onClick: () => handleDelete(sample) }
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

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-[#E2E8F0] px-6 py-4 bg-white select-none">
            <p className="text-xs font-semibold text-[#64748B]">
              Showing <span className="text-[#1E293B]">{filteredSamples.length}</span> of{" "}
              <span className="text-[#1E293B]">{samples.length}</span> samples
            </p>
            <div className="flex items-center gap-1.5">
              <button className="h-8 w-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40" disabled>&lt;</button>
              <button className="h-8 w-8 rounded-lg bg-[#243744] text-white flex items-center justify-center text-xs font-bold shadow-sm">1</button>
              <button className="h-8 w-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40" disabled>&gt;</button>
            </div>
          </div>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="lab-skeleton h-44" />)}
            </div>
          ) : filteredSamples.length === 0 ? (
            <div className="p-8 text-center bg-white border border-[#E2E8F0] rounded-2xl">
              <FlaskConical size={32} className="mx-auto text-[#94A3B8] mb-2" />
              <h3 className="text-sm font-bold text-[#1E293B]">No samples found</h3>
            </div>
          ) : (
            <motion.div className="space-y-4" variants={stagger.container} initial="hidden" animate="visible">
              {filteredSamples.map((sample) => {
                const sampleId = getSampleId(sample);
                return (
                  <motion.div
                    key={sampleId}
                    className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden"
                    variants={stagger.item}
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-3 gap-3">
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm text-[#1E293B] truncate">
                            {sample.sample_no || sampleId}
                          </h3>
                          <p className="text-xs text-[#64748B] truncate mt-0.5">{sample.project_name || "No Project"}</p>
                        </div>
                        {getStatusBadge(sample.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4 text-xs pt-2">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A97A4] mb-0.5">Client</p>
                          <p className="font-semibold text-[#1E293B] truncate">{sample.client_name || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A97A4] mb-0.5">Material</p>
                          <p className="font-semibold text-[#1E293B] truncate">{sample.material_name || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A97A4] mb-0.5">Quantity</p>
                          <p className="font-bold text-[#1E293B]">{sample.quantity || sample.nos || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A97A4] mb-0.5">Received Date</p>
                          <p className="font-semibold text-[#1E293B] truncate">{sample.received_date || sample.sample_received_date || "—"}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-[#F1F5F9]">
                        <button
                          onClick={() => openDrawer("view", sample)}
                          className="flex-1 py-2 text-xs font-bold text-[#475569] hover:bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Eye size={14} />
                          View Details
                        </button>
                        <button
                          onClick={() => openDrawer("edit", sample)}
                          className="flex-1 py-2 text-xs font-bold text-[#243744] hover:bg-[#243744]/5 border border-[#243744]/20 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Pencil size={14} />
                          Edit Sample
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>

      <AddSampleDrawer
        open={drawerOpen}
        projectOptions={projects}
        sampleEntry={drawerSample}
        mode={drawerMode}
        onClose={closeDrawer}
        onSaved={() => {
          toast.success(drawerMode === "edit" ? "Sample updated" : "Sample added");
          fetchSamples();
        }}
      />
    </MainLayout>
  );
};

export default SamplesList;
