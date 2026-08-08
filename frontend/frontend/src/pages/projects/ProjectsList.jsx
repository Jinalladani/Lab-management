import React, { useEffect, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Eye, Pencil, Trash2, RefreshCw, Download, Search,
  ChevronDown, Archive, Copy, FileText, FlaskConical, CheckSquare, Table2, MoreVertical, RotateCcw,
  ArrowUp, ArrowDown, ArrowUpDown
} from "lucide-react";
import { getProjects, deleteProject, updateProjectStatus } from "../../api/projects";
import { getSampleEntries } from "../../api/sampleMaster";
import { getClients } from "../../api/clients";
import { MainLayout } from "../../components/layout";
import AddSampleDrawer from "../../components/projects/AddSampleDrawer";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { TablePagination } from "../../components/ui/TablePagination";
import { useDebounce } from "../../hooks/useDebounce";

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On Hold" },
  { value: "cancelled", label: "Cancelled" },
];

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } },
  item: {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 0.68, 0, 1] } },
  },
};

const getStatusBadge = (status) => {
  const map = {
    draft: { text: "Draft", bg: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-500" },
    active: { text: "Active", bg: "bg-emerald-50 text-emerald-700 border-emerald-100", dot: "bg-emerald-500" },
    in_progress: { text: "In Progress", bg: "bg-blue-50 text-blue-700 border-blue-100", dot: "bg-blue-500" },
    completed: { text: "Completed", bg: "bg-green-50 text-green-700 border-green-100", dot: "bg-green-500" },
    on_hold: { text: "On Hold", bg: "bg-amber-50 text-amber-700 border-amber-100", dot: "bg-amber-500" },
    cancelled: { text: "Cancelled", bg: "bg-red-50 text-red-700 border-red-100", dot: "bg-red-500" },
  };
  const config = map[status] || { text: status, bg: "bg-gray-100 text-gray-700 border-gray-200", dot: "bg-gray-500" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${config.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.text}
    </span>
  );
};

// Portal-based action menu to prevent clipping & overflow
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

const ProjectsList = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sorting state (Default: project_name ascending)
  const [sortConfig, setSortConfig] = useState({ key: "project_name", direction: "asc" });

  // Drawer & Action states
  const [drawerProject, setDrawerProject] = useState(null);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [activeAnchorEl, setActiveAnchorEl] = useState(null);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [projRes, clientRes] = await Promise.all([
        getProjects(),
        getClients(),
      ]);

      setProjects(projRes.data?.data || []);
      setClients(clientRes.data?.data || []);
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Failed to fetch projects data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, clientFilter, sortConfig]);

  const handleSortChange = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const filteredProjects = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const filtered = projects.filter((p) => {
      const matchesSearch =
        !q ||
        p.project_name?.toLowerCase().includes(q) ||
        p.project_code?.toLowerCase().includes(q) ||
        p.client_name?.toLowerCase().includes(q) ||
        p.test_assigned_to_name?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      const matchesClient = clientFilter === "all" || String(p.client_id) === String(clientFilter);

      return matchesSearch && matchesStatus && matchesClient;
    });

    return filtered.sort((a, b) => {
      const key = sortConfig.key || "project_name";
      let valA = a[key] ?? "";
      let valB = b[key] ?? "";

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [projects, debouncedSearch, statusFilter, clientFilter, sortConfig]);

  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProjects.slice(start, start + pageSize);
  }, [filteredProjects, currentPage, pageSize]);

  const handleExport = () => {
    alert("Export feature will be implemented in the next release.");
  };

  const handleToggleDropdown = (projectId, event) => {
    if (activeDropdownId === projectId) {
      setActiveDropdownId(null);
      setActiveAnchorEl(null);
    } else {
      setActiveDropdownId(projectId);
      setActiveAnchorEl(event.currentTarget);
    }
  };

  const handleArchiveProject = async (project) => {
    if (!window.confirm(`Are you sure you want to archive project "${project.project_name}"?`)) return;
    try {
      await updateProjectStatus(project.project_id, "cancelled");
      fetchInitialData();
    } catch (err) {
      alert("Failed to archive project");
    }
  };

  const handleDuplicateProject = (project) => {
    navigate("/projects/add", { state: { duplicateFrom: project } });
  };

  return (
    <MainLayout headerTitle="Projects" headerSubtitle="Manage civil testing and laboratory projects">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">

        {/* Toolbar */}
        <div className="mb-6 flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between">
          
          {/* Search Box */}
          <div className="flex-1 max-w-xl flex h-10 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 focus-within:border-[#243744] focus-within:ring-2 focus-within:ring-[#243744]/10 transition-all">
            <Search size={16} className="text-[#94A3B8] shrink-0" />
            <input
              type="text"
              placeholder="Search by code, name, client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none"
            />
          </div>

          {/* Action & Filter Row */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3.5 py-2 text-xs font-semibold text-[#475569] border border-[#E2E8F0] bg-white rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all shrink-0 min-w-[130px]"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* Client Filter */}
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="h-10 px-3.5 py-2 text-xs font-semibold text-[#475569] border border-[#E2E8F0] bg-white rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all shrink-0 max-w-[160px] truncate"
            >
              <option value="all">All Clients</option>
              {clients.map((c) => (
                <option key={c.client_id} value={c.client_id}>{c.client_name}</option>
              ))}
            </select>

            <button
              onClick={fetchInitialData}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] px-4 text-xs font-bold text-[#475569] transition-colors"
            >
              <RefreshCw size={14} className="text-[#8A97A4]" />
              Refresh
            </button>

            <button
              onClick={handleExport}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] px-4 text-xs font-bold text-[#475569] transition-colors"
            >
              <Download size={14} className="text-[#8A97A4]" />
              Export
            </button>

            <button
              onClick={() => navigate("/projects/add")}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#243744] hover:bg-[#1A2733] px-4 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer"
            >
              <Plus size={14} />
              Add Project
            </button>
          </div>
        </div>

        {/* Active Filters Bar */}
        {(search || statusFilter !== "all" || clientFilter !== "all") && (
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
            {clientFilter !== "all" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full font-medium text-emerald-700">
                Client: {clients.find(c => String(c.client_id) === String(clientFilter))?.client_name || clientFilter}
                <button type="button" onClick={() => setClientFilter("all")} className="hover:text-red-500 font-bold ml-0.5 cursor-pointer">×</button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setClientFilter("all");
              }}
              className="text-xs font-bold text-slate-500 hover:text-[#243744] underline ml-2 cursor-pointer"
            >
              Clear All
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-semibold text-[#DC2626] animate-pulse">
            {errorMessage}
          </div>
        )}

        {/* Desktop Table View */}
        <div className="hidden lg:block bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          {loading ? (
            <TableSkeleton rows={5} cols={8} />
          ) : filteredProjects.length === 0 ? (
            <div className="p-16 text-center">
              <FlaskConical size={40} className="mx-auto text-[#94A3B8] mb-3" />
              <h3 className="text-base font-bold text-[#1E293B]">No projects found</h3>
              <p className="text-xs text-[#64748B] mt-1 mb-4">Try adjusting your filters or search query.</p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setClientFilter("all");
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#243744] hover:bg-[#1A2733] text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                <RotateCcw size={14} />
                Reset Search & Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#FAFBFD] text-[10px] font-bold text-[#64748B] uppercase tracking-wider select-none">
                    <th className="px-6 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("project_code")}>
                      <div className="flex items-center gap-1.5">
                        <span>Code</span>
                        {sortConfig.key === "project_code" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("project_name")}>
                      <div className="flex items-center gap-1.5">
                        <span>Project Name</span>
                        {sortConfig.key === "project_name" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("client_name")}>
                      <div className="flex items-center gap-1.5">
                        <span>Client</span>
                        {sortConfig.key === "client_name" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("status")}>
                      <div className="flex items-center gap-1.5">
                        <span>Status</span>
                        {sortConfig.key === "status" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3.5 text-center cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("total_samples")}>
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Samples</span>
                        {sortConfig.key === "total_samples" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3.5 text-center cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("total_reports")}>
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Reports</span>
                        {sortConfig.key === "total_reports" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("test_assigned_to_name")}>
                      <div className="flex items-center gap-1.5">
                        <span>Engineer</span>
                        {sortConfig.key === "test_assigned_to_name" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3.5 text-center w-[90px]">Actions</th>
                  </tr>
                </thead>
                <motion.tbody variants={stagger.container} initial="hidden" animate="visible" className="divide-y divide-[#F1F5F9]">
                  {paginatedProjects.map((project) => (
                    <motion.tr key={project.project_id} variants={stagger.item} className="hover:bg-[#FAF9FF] transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-[#1E293B]">{project.project_code}</td>
                      <td className="px-6 py-4 text-xs font-bold text-[#1E293B]">{project.project_name}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-[#475569]">{project.client_name || "—"}</td>
                      <td className="px-6 py-4">{getStatusBadge(project.status)}</td>
                      <td className="px-6 py-4 text-center text-xs font-bold text-[#1E293B]">{project.total_samples ?? 0}</td>
                      <td className="px-6 py-4 text-center text-xs font-bold text-[#1E293B]">{project.total_reports ?? 0}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-[#475569]">{project.test_assigned_to_name || "—"}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={(e) => handleToggleDropdown(project.project_id, e)}
                          className="p-1.5 hover:bg-[#F1F5F9] rounded-lg transition-colors text-[#8A97A4] hover:text-[#1A2733]"
                        >
                          <MoreVertical size={16} />
                        </button>

                        <PortalActionMenu
                          anchorEl={activeDropdownId === project.project_id ? activeAnchorEl : null}
                          open={activeDropdownId === project.project_id}
                          onClose={() => { setActiveDropdownId(null); setActiveAnchorEl(null); }}
                          actions={[
                            { label: "View Project", icon: Eye, onClick: () => navigate(`/projects/view/${project.project_id}`) },
                            { label: "Edit Project", icon: Pencil, onClick: () => navigate(`/projects/edit/${project.project_id}`) },
                            { label: "Add Sample", icon: Plus, onClick: () => setDrawerProject(project) },
                            { label: "View Samples", icon: FlaskConical, onClick: () => navigate(`/samples?project_id=${project.project_id}`) },
                            { label: "Test Assignments", icon: CheckSquare, onClick: () => navigate(`/test-assignments?project_id=${project.project_id}`) },
                            { label: "View Observations", icon: Table2, onClick: () => navigate(`/observation-entry?project_id=${project.project_id}`) },
                            { label: "Generate Report", icon: FileText, onClick: () => navigate(`/reports/add?project_id=${project.project_id}`) },
                            { label: "View Reports", icon: FileText, onClick: () => navigate(`/reports?project_id=${project.project_id}`) },
                            { label: "Duplicate Project", icon: Copy, onClick: () => handleDuplicateProject(project) },
                            { label: "Archive Project", icon: Archive, onClick: () => handleArchiveProject(project) },
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
            totalItems={filteredProjects.length}
            pageSize={pageSize}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="projects"
          />
        </div>

        {/* Mobile View */}
        <div className="lg:hidden">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="lab-skeleton h-40" />)}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-8 text-center bg-white border border-[#E2E8F0] rounded-2xl">
              <FlaskConical size={32} className="mx-auto text-[#94A3B8] mb-2" />
              <h3 className="text-sm font-bold text-[#1E293B]">No projects found</h3>
            </div>
          ) : (
            <motion.div className="space-y-4" variants={stagger.container} initial="hidden" animate="visible">
              {paginatedProjects.map((project) => (
                <motion.div
                  key={project.project_id}
                  className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden"
                  variants={stagger.item}
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-[10px] font-bold text-[#64748B] block">{project.project_code}</span>
                        <h4 className="font-bold text-sm text-[#1E293B]">{project.project_name}</h4>
                      </div>
                      {getStatusBadge(project.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-[#F1F5F9] my-2">
                      <div>
                        <span className="text-[#94A3B8] block text-[10px] uppercase font-bold">Client</span>
                        <span className="font-semibold text-[#475569] truncate block">{project.client_name || "—"}</span>
                      </div>
                      <div>
                        <span className="text-[#94A3B8] block text-[10px] uppercase font-bold">Engineer</span>
                        <span className="font-semibold text-[#475569]">{project.test_assigned_to_name || "—"}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <div className="flex gap-4 text-xs font-bold text-[#475569]">
                        <span>Samples: {project.total_samples ?? 0}</span>
                        <span>Reports: {project.total_reports ?? 0}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/projects/view/${project.project_id}`)}
                          className="p-1.5 text-[#475569] hover:bg-[#F1F5F9] rounded-lg transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => navigate(`/projects/edit/${project.project_id}`)}
                          className="p-1.5 text-[#475569] hover:bg-[#F1F5F9] rounded-lg transition-colors"
                        >
                          <Pencil size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Add Sample Drawer */}
        {drawerProject && (
          <AddSampleDrawer
            project={drawerProject}
            isOpen={!!drawerProject}
            onClose={() => setDrawerProject(null)}
            onSuccess={() => {
              setDrawerProject(null);
              fetchInitialData();
            }}
          />
        )}

      </div>
    </MainLayout>
  );
};

export default ProjectsList;
