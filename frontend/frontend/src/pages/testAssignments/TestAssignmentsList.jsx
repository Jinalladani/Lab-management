import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, RefreshCw, Trash2, Briefcase, Sparkles, Play,
  FileSpreadsheet, Clock, AlertTriangle, CheckCircle2, Layers,
  UserCheck, Filter, ChevronRight, X, MoreVertical, RotateCcw,
  ArrowUp, ArrowDown, ArrowUpDown
} from "lucide-react";
import { MainLayout } from "../../components/layout";
import { getProjects } from "../../api/projects";
import {
  getAssignmentsList,
  getAssignmentDashboardSummary,
  changeAssignmentStatus,
  deleteTestAssignment
} from "../../api/testAssignments";
import { usersAPI } from "../../api/users";
import { BulkTestAssignmentModal } from "../../components/testAssignments/BulkTestAssignmentModal";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { PortalActionMenu } from "../../components/ui/PortalActionMenu";
import { TablePagination } from "../../components/ui/TablePagination";
import { useDebounce } from "../../hooks/useDebounce";
import { toast, Toaster } from "sonner";
import { getObservationTemplates } from "../../api/observationBuilder";

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } },
  item: {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.22, 0.68, 0, 1] } },
  },
};

const getStatusBadge = (status) => {
  const norm = String(status || "").toLowerCase();

  if (norm.includes("completed") || norm.includes("approved")) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Completed
      </span>
    );
  }
  if (norm.includes("progress") || norm.includes("testing")) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        In Progress
      </span>
    );
  }
  if (norm.includes("hold")) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        On Hold
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200 whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
      Assigned
    </span>
  );
};

// Exact KPI Card matching Home.jsx & LabManagement.jsx (Without Utilization Rate)
const KpiCard = ({ title, value = 0, subtitle, icon: Icon, tone = "navy" }) => {
  const toneStyles = {
    navy: { border: "border-slate-200/80", bg: "bg-white", iconBg: "bg-[#243744]/10 text-[#243744]" },
    emerald: { border: "border-emerald-200/80", bg: "bg-white", iconBg: "bg-emerald-50 text-emerald-600" },
    blue: { border: "border-blue-200/80", bg: "bg-white", iconBg: "bg-blue-50 text-blue-600" },
    amber: { border: "border-amber-200/80", bg: "bg-white", iconBg: "bg-amber-50 text-amber-600" },
    purple: { border: "border-purple-200/80", bg: "bg-white", iconBg: "bg-purple-50 text-purple-600" }
  };

  const style = toneStyles[tone] || toneStyles.navy;

  return (
    <motion.article
      whileHover={{ y: -3, boxShadow: "0 14px 30px rgba(0,0,0,0.06)" }}
      className={`relative overflow-hidden rounded-2xl border ${style.border} ${style.bg} p-5 shadow-sm transition-all duration-200`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-[#243744]">{typeof value === 'number' ? value.toLocaleString() : value}</span>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</p>
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${style.iconBg} shadow-inner`}>
          <Icon size={22} strokeWidth={2.2} />
        </div>
      </div>
    </motion.article>
  );
};

const TestAssignmentsList = () => {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [summary, setSummary] = useState({ total_assigned: 0, in_progress: 0, due_today: 0, overdue: 0, completed: 0 });
  const [loading, setLoading] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [activeAnchorEl, setActiveAnchorEl] = useState(null);

  const handleToggleDropdown = (id, event) => {
    if (activeDropdownId === id) {
      setActiveDropdownId(null);
      setActiveAnchorEl(null);
    } else {
      setActiveDropdownId(id);
      setActiveAnchorEl(event.currentTarget);
    }
  };

  // Filters
  const [projectFilter, setProjectFilter] = useState(() => {
    const queryId = new URLSearchParams(window.location.search).get("project_id");
    return queryId || "all";
  });
  const [statusFilter, setStatusFilter] = useState("all");
  const [technicianFilter, setTechnicianFilter] = useState("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  // Pagination & Sorting states matching LabManagement.jsx
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: "sample_code", direction: "asc" });

  // Modal State
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  useEffect(() => {
    fetchInitialOptions();
  }, []);

  const extractArray = (res) => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.data?.data)) return res.data.data;
    if (Array.isArray(res.projects)) return res.projects;
    return [];
  };

  const fetchInitialOptions = async () => {
    try {
      const pRes = await getProjects().catch(() => ({ data: [] }));
      const uRes = await usersAPI.getLabUsers().catch(() => ({ data: [] }));
      setProjects(extractArray(pRes));
      setTechnicians(extractArray(uRes));
    } catch (err) {
      console.error(err);
      setProjects([]);
      setTechnicians([]);
    }
  };

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (projectFilter !== "all") params.project_id = projectFilter;
      if (statusFilter !== "all") params.status = statusFilter;
      if (technicianFilter !== "all") params.assigned_to = technicianFilter;
      if (debouncedSearch) params.search = debouncedSearch;

      const [listRes, summaryRes] = await Promise.all([
        getAssignmentsList(params).catch(() => ({ data: { success: false, data: [] } })),
        getAssignmentDashboardSummary(projectFilter !== "all" ? projectFilter : "").catch(() => ({ data: { success: false, data: {} } }))
      ]);

      if (listRes.data?.data) {
        setAssignments(extractArray(listRes.data));
      }
      if (summaryRes.data?.data) {
        setSummary(summaryRes.data.data || { total_assigned: 0, in_progress: 0, due_today: 0, overdue: 0, completed: 0 });
      }
    } catch (err) {
      toast.error("Failed to load test assignments");
    } finally {
      setLoading(false);
    }
  }, [projectFilter, statusFilter, technicianFilter, debouncedSearch]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  useEffect(() => {
    setCurrentPage(1);
  }, [projectFilter, statusFilter, technicianFilter, debouncedSearch, sortConfig]);

  const handleSortChange = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortedAssignments = useMemo(() => {
    const list = Array.isArray(assignments) ? [...assignments] : [];
    return list.sort((a, b) => {
      const key = sortConfig.key || "sample_code";
      let valA = a[key] ?? "";
      let valB = b[key] ?? "";

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [assignments, sortConfig]);

  const paginatedAssignments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedAssignments.slice(start, start + pageSize);
  }, [sortedAssignments, currentPage, pageSize]);

  const handleOpenObservationSheet = async (assignment) => {
    try {
      // 1. Fetch templates to verify if a template has been created for this test
      const tmplRes = await getObservationTemplates().catch(() => ({ data: { success: false, data: [] } }));
      const allTemplates = tmplRes.data?.data || [];
      
      const hasTemplate = allTemplates.some((t) => {
        if (t.scope_test_ids && Array.isArray(t.scope_test_ids)) {
          return t.scope_test_ids.some((id) => String(id) === String(assignment.scope_test_id));
        }
        return String(t.scope_test_id) === String(assignment.scope_test_id);
      });

      if (!hasTemplate) {
        toast.warning(`No Observation Template configured for test "${assignment.test_name}". Please create one in the Template Designer first.`);
        return;
      }

      if (assignment.status === "Assigned") {
        await changeAssignmentStatus(assignment.assignment_id, "In Progress").catch(() => { });
      }
      const sid = assignment.testing_sample_id || assignment.receipt_id;
      const stid = assignment.scope_test_id; // Pass master scope_test_id for proper template matching
      const aid = assignment.assignment_id;
      navigate(`/observation-entry?sample_id=${sid}&scope_test_id=${stid}&assignment_id=${aid}`);
    } catch (err) {
      toast.error("Failed to open observation sheet");
    }
  };

  const handleCancelAssignment = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this test assignment?")) return;
    try {
      await deleteTestAssignment(id);
      toast.success("Assignment cancelled");
      fetchAssignments();
    } catch (err) {
      toast.error("Failed to cancel assignment");
    }
  };

  return (
    <MainLayout headerTitle="Test Assignments" headerSubtitle="Manage physical specimen testing & observation sheets">
      <Toaster position="top-right" richColors />
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6 space-y-6">

        {/* ── 1. Exact 4 Hero KPI Cards matching LabManagement & Home.jsx ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Total Scheduled"
            value={summary.total_assigned || assignments.length}
            subtitle="Assigned Test Workflows"
            icon={Layers}
            tone="navy"
          />
          <KpiCard
            title="In Progress"
            value={summary.in_progress || 0}
            subtitle="Active Specimen Testing"
            icon={Clock}
            tone="blue"
          />
          <KpiCard
            title="Due Today"
            value={summary.due_today || 0}
            subtitle="Pending Today"
            icon={AlertTriangle}
            tone="amber"
          />
          <KpiCard
            title="Completed Tests"
            value={summary.completed || 0}
            subtitle="Testing Completed"
            icon={CheckCircle2}
            tone="emerald"
          />
        </div>

        {/* ── 2. Toolbar & Controls matching LabManagement ── */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search Box */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3.5 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search sample code, test, location, technician..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs font-semibold border border-[#E2E8F0] rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-colors"
                />
              </div>

              {/* Project Filter */}
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="py-2 px-3 text-xs font-semibold border border-[#E2E8F0] bg-white rounded-xl outline-none focus:border-[#243744] transition-colors cursor-pointer max-w-[200px] truncate"
              >
                <option value="all">All Projects</option>
                {(Array.isArray(projects) ? projects : []).map((p) => (
                  <option key={p.project_id} value={p.project_id}>{p.project_code} — {p.project_name}</option>
                ))}
              </select>

              {/* Technician Filter */}
              <select
                value={technicianFilter}
                onChange={(e) => setTechnicianFilter(e.target.value)}
                className="py-2 px-3 text-xs font-semibold border border-[#E2E8F0] bg-white rounded-xl outline-none focus:border-[#243744] transition-colors cursor-pointer max-w-[180px] truncate"
              >
                <option value="all">All Technicians</option>
                {(Array.isArray(technicians) ? technicians : []).map((u) => (
                  <option key={u.user_id} value={u.user_id}>{u.full_name || u.name}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-2 px-3 text-xs font-semibold border border-[#E2E8F0] bg-white rounded-xl outline-none focus:border-[#243744] transition-colors cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={fetchAssignments}
                title="Refresh Test List"
                className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] px-4 text-xs font-bold text-[#475569] transition-colors cursor-pointer"
              >
                <RefreshCw size={14} className="text-[#8A97A4]" />
                Refresh
              </button>

              <button
                onClick={() => setBulkModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#243744] hover:bg-[#1A2733] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
              >
                <Sparkles size={16} className="text-emerald-400" />
                <span>Assign Test Work</span>
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter Chips / Pills */}
        {(search || projectFilter !== "all" || statusFilter !== "all" || technicianFilter !== "all") && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500 mr-1">Active Filters:</span>
            {search && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full font-medium text-slate-700">
                Search: "{search}"
                <button type="button" onClick={() => setSearch("")} className="hover:text-red-500 font-bold ml-0.5 cursor-pointer">×</button>
              </span>
            )}
            {projectFilter !== "all" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full font-medium text-blue-700">
                Project: {projects.find((p) => String(p.project_id) === String(projectFilter))?.project_code || projectFilter}
                <button type="button" onClick={() => setProjectFilter("all")} className="hover:text-red-500 font-bold ml-0.5 cursor-pointer">×</button>
              </span>
            )}
            {statusFilter !== "all" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full font-medium text-amber-700">
                Status: {statusFilter}
                <button type="button" onClick={() => setStatusFilter("all")} className="hover:text-red-500 font-bold ml-0.5 cursor-pointer">×</button>
              </span>
            )}
            {technicianFilter !== "all" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full font-medium text-emerald-700">
                Technician: {technicianFilter}
                <button type="button" onClick={() => setTechnicianFilter("all")} className="hover:text-red-500 font-bold ml-0.5 cursor-pointer">×</button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setProjectFilter("all");
                setStatusFilter("all");
                setTechnicianFilter("all");
              }}
              className="text-xs font-bold text-slate-500 hover:text-[#243744] underline ml-2 cursor-pointer"
            >
              Clear All
            </button>
          </div>
        )}

        {/* ── 3. Desktop Table View matching LabManagement ── */}
        <div className="hidden lg:block bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          {loading ? (
            <TableSkeleton rows={6} cols={10} />
          ) : sortedAssignments.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Briefcase size={28} />
              </div>
              <h3 className="text-base font-bold text-slate-800">No test assignments found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No active tests matched your filters. Click "Assign Test Work" to schedule test assignments for physical specimens.
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setProjectFilter("all");
                    setStatusFilter("all");
                    setTechnicianFilter("all");
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  <RotateCcw size={14} />
                  Reset Filters
                </button>

                <button
                  type="button"
                  onClick={() => setBulkModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#243744] text-white text-xs font-bold rounded-xl hover:bg-[#1a2832] transition-colors shadow-sm cursor-pointer"
                >
                  <Sparkles size={14} className="text-emerald-400" />
                  Assign Test Work
                </button>
              </div>
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
                        <span>Borehole</span>
                        {sortConfig.key === "borelog_no" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-5 py-3.5 max-w-[180px] whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("test_name")}>
                      <div className="flex items-center gap-1.5">
                        <span>Test Name</span>
                        {sortConfig.key === "test_name" ? (
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
                    <th className="px-5 py-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("target_date")}>
                      <div className="flex items-center gap-1.5">
                        <span>Target Date</span>
                        {sortConfig.key === "target_date" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-5 py-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("priority")}>
                      <div className="flex items-center gap-1.5">
                        <span>Priority</span>
                        {sortConfig.key === "priority" ? (
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
                    <th className="px-5 py-3.5 text-right whitespace-nowrap w-[90px]">Actions</th>
                  </tr>
                </thead>
                <motion.tbody variants={stagger.container} initial="hidden" animate="visible" className="divide-y divide-[#F1F5F9] bg-white">
                  {paginatedAssignments.map((item) => (
                    <motion.tr key={item.assignment_id} variants={stagger.item} className="hover:bg-[#FAF9FF] transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-bold font-mono text-[#243744] bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 whitespace-nowrap">
                          {item.sample_code}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-600 whitespace-nowrap">{item.receipt_no}</td>
                      <td className="px-5 py-4 font-medium text-slate-800 whitespace-nowrap">{item.location_name || "—"}</td>
                      <td className="px-5 py-4 font-mono text-slate-700 whitespace-nowrap">{item.borelog_no || "—"}</td>
                      <td className="px-5 py-4 max-w-[180px] truncate" title={item.test_name}>
                        <span className="font-bold text-slate-900 truncate block">{item.test_name}</span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 whitespace-nowrap">
                          <UserCheck size={14} className="text-slate-400" />
                          {item.technician_name || "Unassigned"}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-600 whitespace-nowrap">{item.target_date || "—"}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                          item.priority === "Urgent" ? "bg-red-100 text-red-800 border border-red-200" : item.priority === "High" ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}>
                          {item.priority}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">{getStatusBadge(item.status)}</td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => handleToggleDropdown(item.assignment_id, e)}
                          className="p-1.5 hover:bg-[#F1F5F9] rounded-lg transition-colors text-[#8A97A4] hover:text-[#1A2733] cursor-pointer"
                        >
                          <MoreVertical size={16} />
                        </button>

                        <PortalActionMenu
                          anchorEl={activeDropdownId === item.assignment_id ? activeAnchorEl : null}
                          open={activeDropdownId === item.assignment_id}
                          onClose={() => { setActiveDropdownId(null); setActiveAnchorEl(null); }}
                          actions={[
                            {
                              label: "Fill Observation Sheet",
                              icon: FileSpreadsheet,
                              onClick: () => handleOpenObservationSheet(item)
                            },
                            {
                              label: "Cancel Assignment",
                              icon: Trash2,
                              danger: true,
                              onClick: () => handleCancelAssignment(item.assignment_id)
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

          {/* ── 4. Table Pagination matching LabManagement ── */}
          <TablePagination
            totalItems={sortedAssignments.length}
            pageSize={pageSize}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="test assignments"
          />
        </div>

        {/* Mobile / Tablet Card View */}
        <div className="lg:hidden">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-40 bg-slate-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : sortedAssignments.length === 0 ? (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
              <Briefcase size={32} className="mx-auto text-slate-400 mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No test assignments found</h3>
            </div>
          ) : (
            <motion.div className="space-y-4" variants={stagger.container} initial="hidden" animate="visible">
              {paginatedAssignments.map((item) => (
                <motion.div
                  key={item.assignment_id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 relative"
                  variants={stagger.item}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold font-mono text-[#243744] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg">
                        {item.sample_code}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 mt-2">{item.test_name}</h4>
                      <p className="text-xs text-slate-500 font-semibold">{item.receipt_no}</p>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Technician</span>
                      <span className="font-semibold text-slate-700 truncate block">{item.technician_name || "Unassigned"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Target Date</span>
                      <span className="font-semibold text-slate-700">{item.target_date || "—"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-semibold text-slate-500">Priority: {item.priority}</span>
                    <button
                      onClick={() => handleOpenObservationSheet(item)}
                      className="px-3 py-1.5 bg-[#243744] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <FileSpreadsheet size={14} />
                      Fill Sheet
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Bulk Assignment Modal */}
        <BulkTestAssignmentModal
          isOpen={bulkModalOpen}
          onClose={() => setBulkModalOpen(false)}
          onSuccess={() => {
            setBulkModalOpen(false);
            fetchAssignments();
          }}
        />

      </div>
    </MainLayout>
  );
};

export default TestAssignmentsList;
