import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, RefreshCw, Trash2, Briefcase, Sparkles, Play,
  FileSpreadsheet, Clock, AlertTriangle, CheckCircle2, Layers,
  UserCheck, Filter, ChevronRight, X, MoreVertical, RotateCcw
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

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [projectFilter, statusFilter, technicianFilter, debouncedSearch]);

  const paginatedAssignments = useMemo(() => {
    const list = Array.isArray(assignments) ? assignments : [];
    const start = (currentPage - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }, [assignments, currentPage, pageSize]);

  const handleOpenObservationSheet = async (assignment) => {
    try {
      if (assignment.status === "Assigned") {
        await changeAssignmentStatus(assignment.assignment_id, "In Progress").catch(() => { });
      }
      const sid = assignment.testing_sample_id || assignment.receipt_id;
      const stid = assignment.project_scope_test_id;
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

        {/* Dashboard Metric KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
          <motion.div whileHover={{ y: -2 }} className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              <Layers size={18} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">Total Scheduled</span>
              <span className="text-xl sm:text-2xl font-black text-[#243744]">{summary.total_assigned || 0}</span>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -2 }} className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <Clock size={18} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">In Progress</span>
              <span className="text-xl sm:text-2xl font-black text-blue-600">{summary.in_progress || 0}</span>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -2 }} className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">Due Today</span>
              <span className="text-xl sm:text-2xl font-black text-amber-600">{summary.due_today || 0}</span>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -2 }} className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">Overdue</span>
              <span className="text-xl sm:text-2xl font-black text-red-600">{summary.overdue || 0}</span>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -2 }} className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 col-span-2 sm:col-span-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">Completed</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-600">{summary.completed || 0}</span>
            </div>
          </motion.div>
        </div>

        {/* Filters & Control Bar */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">

          {/* Quick Search */}
          <div className="flex-1 max-w-lg flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-3 focus-within:bg-white focus-within:border-[#243744] focus-within:ring-2 focus-within:ring-[#243744]/10 transition-all">
            <Search size={16} className="text-slate-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sample code, test, location, technician..."
              className="w-full bg-transparent text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="h-10 px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-200 bg-white rounded-xl outline-none focus:border-[#243744] shadow-sm"
            >
              <option value="all">All Projects</option>
              {(Array.isArray(projects) ? projects : []).map((p) => (
                <option key={p.project_id} value={p.project_id}>{p.project_code} — {p.project_name}</option>
              ))}
            </select>

            <select
              value={technicianFilter}
              onChange={(e) => setTechnicianFilter(e.target.value)}
              className="h-10 px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-200 bg-white rounded-xl outline-none focus:border-[#243744] shadow-sm"
            >
              <option value="all">All Technicians</option>
              {(Array.isArray(technicians) ? technicians : []).map((u) => (
                <option key={u.user_id} value={u.user_id}>{u.full_name || u.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-200 bg-white rounded-xl outline-none focus:border-[#243744] shadow-sm"
            >
              <option value="all">All Statuses</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>

            <button
              onClick={fetchAssignments}
              title="Refresh Test List"
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 text-xs font-bold text-slate-700 transition-colors shadow-sm"
            >
              <RefreshCw size={14} className="text-slate-500" />
            </button>

            <button
              onClick={() => setBulkModalOpen(true)}
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#243744] hover:bg-[#1a2832] px-4 text-xs font-bold text-white shadow-md transition-colors"
            >
              <Sparkles size={15} className="text-emerald-400" />
              Assign Test Work
            </button>
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

        {/* Work Items View: Desktop Table & Mobile/Tablet Card View */}
        <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <TableSkeleton rows={6} cols={10} />
          ) : assignments.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Briefcase size={28} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No test assignments found</h3>
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
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors shadow-2xs cursor-pointer"
                >
                  <RotateCcw size={14} />
                  Reset Filters
                </button>

                <button
                  type="button"
                  onClick={() => setBulkModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#243744] text-white text-xs font-bold rounded-xl hover:bg-[#1a2832] transition-colors shadow-sm"
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
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="px-5 py-3.5 whitespace-nowrap">Sample Code</th>
                    <th className="px-5 py-3.5 whitespace-nowrap">Receipt No.</th>
                    <th className="px-5 py-3.5 whitespace-nowrap">Location</th>
                    <th className="px-5 py-3.5 whitespace-nowrap">Borehole</th>
                    <th className="px-5 py-3.5 max-w-[180px] whitespace-nowrap">Test Name</th>
                    <th className="px-5 py-3.5 whitespace-nowrap">Technician</th>
                    <th className="px-5 py-3.5 whitespace-nowrap">Target Date</th>
                    <th className="px-5 py-3.5 whitespace-nowrap">Priority</th>
                    <th className="px-5 py-3.5 whitespace-nowrap">Status</th>
                    <th className="px-5 py-3.5 text-right whitespace-nowrap w-[90px]">Actions</th>
                  </tr>
                </thead>
                <motion.tbody variants={stagger.container} initial="hidden" animate="visible" className="divide-y divide-slate-100 bg-white">
                  {paginatedAssignments.map((item) => (
                    <motion.tr key={item.assignment_id} variants={stagger.item} className="hover:bg-slate-50/80 transition-colors">
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
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${item.priority === "Urgent" ? "bg-red-100 text-red-800 border border-red-200" : item.priority === "High" ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}>
                          {item.priority}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">{getStatusBadge(item.status)}</td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => handleToggleDropdown(item.assignment_id, e)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                        >
                          <MoreVertical size={16} />
                        </button>

                        <PortalActionMenu
                          anchorEl={activeDropdownId === item.assignment_id ? activeAnchorEl : null}
                          open={activeDropdownId === item.assignment_id}
                          onClose={() => { setActiveDropdownId(null); setActiveAnchorEl(null); }}
                          actions={[
                            {
                              label: "Observation Sheet",
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

          {/* Table Pagination */}
          <TablePagination
            totalItems={(assignments || []).length}
            pageSize={pageSize}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="test assignments"
          />
        </div>

        {/* Mobile & Tablet Card View */}
        <div className="lg:hidden">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-44 bg-slate-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : assignments.length === 0 ? (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
                <Briefcase size={22} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No test assignments found</h3>
            </div>
          ) : (
            <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-4" variants={stagger.container} initial="hidden" animate="visible">
              {(Array.isArray(assignments) ? assignments : []).map((item) => (
                <motion.div
                  key={item.assignment_id}
                  variants={stagger.item}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3 relative hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold font-mono text-[#243744] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg">
                        {item.sample_code}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 mt-2 line-clamp-1">{item.test_name}</h4>
                      <p className="text-xs text-slate-500 font-semibold">{item.receipt_no}</p>
                    </div>
                    <div>
                      {getStatusBadge(item.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Technician</p>
                      <p className="font-semibold text-slate-700 truncate">{item.technician_name || "Unassigned"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Date</p>
                      <p className="font-mono font-semibold text-slate-700">{item.target_date || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Location / Bore</p>
                      <p className="font-semibold text-slate-700 truncate">
                        {item.location_name || "—"} {item.borelog_no ? `(${item.borelog_no})` : ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Priority</p>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${item.priority === "Urgent" ? "bg-red-100 text-red-800" : item.priority === "High" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                        }`}>
                        {item.priority}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => handleOpenObservationSheet(item)}
                      className="flex-1 py-2 px-3 bg-[#243744] hover:bg-[#1a2832] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <FileSpreadsheet size={14} className="text-emerald-400" />
                      Observation Sheet
                    </button>
                    <button
                      onClick={() => handleCancelAssignment(item.assignment_id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-xl transition-colors"
                      title="Cancel Assignment"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

      </div>

      <BulkTestAssignmentModal
        isOpen={bulkModalOpen}
        initialProjectId={projectFilter !== "all" ? projectFilter : ""}
        onClose={() => setBulkModalOpen(false)}
        onSuccess={fetchAssignments}
      />
    </MainLayout>
  );
};

export default TestAssignmentsList;
