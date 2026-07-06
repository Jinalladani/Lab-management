import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, RefreshCw, X, Trash2, FlaskConical, Briefcase, Eye, Clipboard, HelpCircle, MoreHorizontal
} from "lucide-react";
import { MainLayout } from "../../components/layout";
import { getProjects } from "../../api/projects";
import { getSampleEntries } from "../../api/sampleEntries";
import {
  createTestAssignment,
  deleteTestAssignment,
  getAssignmentsByProject,
  getAvailableTests,
} from "../../api/testAssignments";
import { usersAPI } from "../../api/users";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { toast, Toaster } from "sonner";

const inputClass =
  "w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#243744]/10 focus:border-[#243744] bg-white/90 text-sm transition-all";

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } },
  item: {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 0.68, 0, 1] } },
  },
};

const getUserName = (user) =>
  user.full_name ||
  [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
  user.name ||
  user.email ||
  "";

const getStatusBadge = (status) => {
  const norm = String(status || "").toLowerCase();

  const map = {
    completed: { text: "Completed", bg: "bg-[#ECFDF5] text-[#10B981] border-[#D1FAE5]", dot: "bg-[#10B981]" },
    approved: { text: "Approved", bg: "bg-[#ECFDF5] text-[#10B981] border-[#D1FAE5]", dot: "bg-[#10B981]" },
    testing: { text: "Testing", bg: "bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE]", dot: "bg-[#2563EB]" },
    in_progress: { text: "In Progress", bg: "bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE]", dot: "bg-[#2563EB]" },
    review: { text: "Review", bg: "bg-[#F5F3FF] text-[#7C3AED] border-[#EDE9FE]", dot: "bg-[#7C3AED]" },
    result: { text: "Result", bg: "bg-[#FFFBEB] text-[#D97706] border-[#FEF3C7]", dot: "bg-[#D97706]" },
  };

  const config = map[norm] || { text: status || "Assigned", bg: "bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]", dot: "bg-[#475569]" };

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

const TestAssignmentsList = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [samples, setSamples] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [labUsers, setLabUsers] = useState([]);
  const [availableTests, setAvailableTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [availableTestsLoading, setAvailableTestsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const location = useLocation();
  const [projectFilter, setProjectFilter] = useState(() => {
    const queryId = new URLSearchParams(window.location.search).get("project_id");
    return queryId || "all";
  });

  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [activeAnchorEl, setActiveAnchorEl] = useState(null);

  const [form, setForm] = useState({
    project_id: "",
    sample_id: "",
    scope_test_ids: [],
    assigned_to: "",
    target_date: "",
    priority: "Normal",
    remarks: "",
  });

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
      const params = form.project_id ? { project_id: form.project_id } : {};
      const res = await getSampleEntries(params);
      setSamples(res.data?.data || []);
    } catch (error) {
      console.error("Failed to load samples:", error);
      toast.error("Failed to load samples");
    }
  }, [form.project_id]);

  const fetchLabUsers = async () => {
    try {
      const data = await usersAPI.getLabUsers();
      setLabUsers(data?.data?.users || data?.users || []);
    } catch (error) {
      console.error("Failed to load users:", error);
    }
  };

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const sourceProjects = projectFilter !== "all"
        ? projects.filter((project) => String(project.project_id) === String(projectFilter))
        : projects;

      if (sourceProjects.length === 0) {
        setAssignments([]);
        return;
      }

      const responses = await Promise.all(
        sourceProjects.map((project) =>
          getAssignmentsByProject(project.project_id)
            .then((res) =>
              (res.data?.data || []).map((assignment) => ({
                ...assignment,
                project_id: assignment.project_id || project.project_id,
                project_code: assignment.project_code || project.project_no || project.project_code,
                project_name: assignment.project_name || project.project_name,
              }))
            )
            .catch(() => [])
        )
      );

      setAssignments(responses.flat());
    } catch (error) {
      console.error("Failed to load assignments:", error);
      toast.error("Failed to load test assignments");
    } finally {
      setLoading(false);
    }
  }, [projectFilter, projects]);

  useEffect(() => {
    fetchProjects();
    fetchLabUsers();
  }, []);

  useEffect(() => {
    const queryId = new URLSearchParams(location.search).get("project_id");
    setProjectFilter(queryId || "all");
  }, [location.search]);

  useEffect(() => {
    if (projects.length > 0) fetchAssignments();
  }, [fetchAssignments, projects.length]);

  useEffect(() => {
    if (drawerOpen) fetchSamples();
  }, [drawerOpen, fetchSamples]);

  const filteredSamples = useMemo(() => {
    if (!form.project_id) return samples;
    return samples.filter((sample) => String(sample.project_id) === String(form.project_id));
  }, [samples, form.project_id]);

  const selectedSample = samples.find((sample) => String(sample.sample_id) === String(form.sample_id));

  const filteredAssignments = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return assignments;

    return assignments.filter((assignment) =>
      [
        assignment.assignment_code,
        assignment.project_code,
        assignment.project_name,
        assignment.sample_no,
        assignment.material_name,
        assignment.test_name,
        assignment.assigned_to_name,
        assignment.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [assignments, search]);

  const openDrawer = () => {
    setForm({
      project_id: "",
      sample_id: "",
      scope_test_ids: [],
      assigned_to: "",
      target_date: "",
      priority: "Normal",
      remarks: "",
    });
    setAvailableTests([]);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setAvailableTests([]);
  };

  const handleProjectChange = (projectId) => {
    setForm((prev) => ({
      ...prev,
      project_id: projectId,
      sample_id: "",
      scope_test_ids: [],
    }));
    setAvailableTests([]);
  };

  const handleSampleChange = async (sampleId) => {
    setForm((prev) => ({ ...prev, sample_id: sampleId, scope_test_ids: [] }));
    setAvailableTests([]);

    if (!sampleId) return;

    try {
      setAvailableTestsLoading(true);
      const res = await getAvailableTests(sampleId);
      setAvailableTests(res.data?.data || []);
    } catch (error) {
      console.error("Failed to load available tests:", error);
      toast.error("Failed to load available tests");
    } finally {
      setAvailableTestsLoading(false);
    }
  };

  const toggleTest = (testId, checked) => {
    setForm((prev) => ({
      ...prev,
      scope_test_ids: checked
        ? [...prev.scope_test_ids, testId]
        : prev.scope_test_ids.filter((id) => id !== testId),
    }));
  };

  const saveAssignment = async () => {
    if (!form.sample_id || form.scope_test_ids.length === 0) {
      toast.error("Please select a sample and at least one test");
      return;
    }
    if (!form.assigned_to || !form.target_date) {
      toast.error("Please select assigned user and target date");
      return;
    }

    try {
      setSaving(true);
      const res = await createTestAssignment({
        sample_id: Number(form.sample_id),
        scope_test_ids: form.scope_test_ids,
        assigned_to: form.assigned_to,
        target_date: form.target_date,
        priority: form.priority,
        remarks: form.remarks,
      });

      if (res.data?.success) {
        toast.success("Test assigned successfully");
        closeDrawer();
        fetchAssignments();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to assign test");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (assignment) => {
    const assignmentId = assignment.assignment_id || assignment.test_assignment_id;
    if (!assignmentId) {
      toast.error("Assignment id not found");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this assignment?")) return;

    try {
      await deleteTestAssignment(assignmentId);
      toast.success("Assignment deleted successfully");
      fetchAssignments();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete assignment");
    }
  };

  const handleToggleDropdown = (assignmentId, event) => {
    if (activeDropdownId === assignmentId) {
      setActiveDropdownId(null);
      setActiveAnchorEl(null);
    } else {
      setActiveDropdownId(assignmentId);
      setActiveAnchorEl(event.currentTarget);
    }
  };

  return (
    <MainLayout headerTitle="Test Assign" headerSubtitle="Full test assignment list">
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
              placeholder="Search assignment, sample, test, material, technician..."
              className="w-full bg-transparent text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none"
            />
          </div>

          {/* Action Row */}
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
              aria-label="Filter assignments by project"
            >
              <option value="all">All Projects</option>
              {projects.map((project) => (
                <option key={project.project_id} value={project.project_id}>
                  {project.project_code} - {project.project_name}
                </option>
              ))}
            </select>

            <button
              onClick={fetchAssignments}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] px-4 text-xs font-bold text-[#475569] transition-colors"
            >
              <RefreshCw size={14} className="text-[#8A97A4]" />
              Refresh
            </button>

            <button
              type="button"
              onClick={openDrawer}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#243744] hover:bg-[#1A2733] px-4 text-xs font-bold text-white shadow-sm transition-colors"
            >
              <Plus size={14} />
              Add Test Assign
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          {loading ? (
            <TableSkeleton rows={5} cols={9} />
          ) : filteredAssignments.length === 0 ? (
            <div className="p-16 text-center">
              <Briefcase size={40} className="mx-auto text-[#94A3B8] mb-3" />
              <h3 className="text-base font-bold text-[#1E293B]">No test assignments found</h3>
              <p className="text-xs text-[#64748B] mt-1">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#FAFBFD] text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                    {/* <th className="px-6 py-3.5">Assignment</th> */}
                    <th className="px-6 py-3.5">Project</th>
                    <th className="px-6 py-3.5">Sample</th>
                    <th className="px-6 py-3.5">Material</th>
                    <th className="px-6 py-3.5">Test</th>
                    <th className="px-6 py-3.5">Assigned To</th>
                    <th className="px-6 py-3.5">Target Date</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right w-[90px]">Actions</th>
                  </tr>
                </thead>
                <motion.tbody variants={stagger.container} initial="hidden" animate="visible" className="divide-y divide-[#F1F5F9]">
                  {filteredAssignments.map((assignment, idx) => {
                    const assignmentId = assignment.assignment_id || assignment.test_assignment_id || idx;
                    return (
                      <motion.tr key={assignmentId} variants={stagger.item} className="hover:bg-[#FAF9FF] transition-colors">
                        {/* <td className="px-6 py-4 text-xs font-bold text-[#1E293B]">{assignment.assignment_code || assignment.assignment_id || "—"}</td> */}
                        <td className="px-6 py-4 text-xs font-semibold text-[#475569]">{assignment.project_code || assignment.project_name || "—"}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-[#475569]">{assignment.sample_no || "—"}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-[#475569]">{assignment.material_name || "—"}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-[#475569]">{assignment.test_name || "—"}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-[#475569]">{assignment.assigned_to_name || assignment.assigned_to || "—"}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-[#475569]">{assignment.target_date || "—"}</td>
                        <td className="px-6 py-4">{getStatusBadge(assignment.status)}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => handleToggleDropdown(assignmentId, e)}
                            className="p-1.5 hover:bg-[#F1F5F9] rounded-lg transition-colors text-[#8A97A4] hover:text-[#1A2733]"
                          >
                            <MoreHorizontal size={16} />
                          </button>

                          <PortalActionMenu
                            anchorEl={activeDropdownId === assignmentId ? activeAnchorEl : null}
                            open={activeDropdownId === assignmentId}
                            onClose={() => { setActiveDropdownId(null); setActiveAnchorEl(null); }}
                            actions={[
                              {
                                label: "Observation Sheet",
                                icon: FlaskConical,
                                onClick: () => {
                                  navigate(
                                    `/observation-entry?project_id=${assignment.project_id}&sample_id=${assignment.sample_id}&scope_test_id=${assignment.master_scope_test_id || assignment.scope_test_id}`
                                  );
                                }
                              },
                              { label: "Delete Assign", icon: Trash2, danger: true, onClick: () => handleDelete(assignment) }
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
              Showing <span className="text-[#1E293B]">{filteredAssignments.length}</span> of{" "}
              <span className="text-[#1E293B]">{assignments.length}</span> assignments
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
          ) : filteredAssignments.length === 0 ? (
            <div className="p-8 text-center bg-white border border-[#E2E8F0] rounded-2xl">
              <Briefcase size={32} className="mx-auto text-[#94A3B8] mb-2" />
              <h3 className="text-sm font-bold text-[#1E293B]">No assignments found</h3>
            </div>
          ) : (
            <motion.div className="space-y-4" variants={stagger.container} initial="hidden" animate="visible">
              {filteredAssignments.map((assignment, idx) => {
                const assignmentId = assignment.assignment_id || assignment.test_assignment_id || idx;
                return (
                  <motion.div
                    key={assignmentId}
                    className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden"
                    variants={stagger.item}
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-3 gap-3">
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm text-[#1E293B] truncate">
                            {assignment.assignment_code || `Assignment #${assignmentId}`}
                          </h3>
                          <p className="text-xs text-[#64748B] truncate mt-0.5">{assignment.project_name || "No Project"}</p>
                        </div>
                        {getStatusBadge(assignment.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4 text-xs pt-2">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A97A4] mb-0.5">Sample</p>
                          <p className="font-semibold text-[#1E293B] truncate">{assignment.sample_no || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A97A4] mb-0.5">Material</p>
                          <p className="font-semibold text-[#1E293B] truncate">{assignment.material_name || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A97A4] mb-0.5">Test</p>
                          <p className="font-semibold text-[#1E293B] truncate">{assignment.test_name || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A97A4] mb-0.5">Assigned To</p>
                          <p className="font-semibold text-[#1E293B] truncate">{assignment.assigned_to_name || "—"}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-[#F1F5F9]">
                        <button
                          onClick={() => {
                            navigate(
                              `/observation-entry?project_id=${assignment.project_id}&sample_id=${assignment.sample_id}&scope_test_id=${assignment.master_scope_test_id || assignment.scope_test_id}`
                            );
                          }}
                          className="flex-1 py-2 text-xs font-bold text-[#475569] hover:bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <FlaskConical size={14} />
                          Observation Sheet
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

      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-[1000] bg-slate-900/45 backdrop-blur-sm" onClick={closeDrawer} />
          <aside className="fixed top-0 right-0 z-[1001] flex h-full w-full flex-col bg-white shadow-2xl md:max-w-[700px] lg:max-w-[560px]">
            <div className="sticky top-0 z-20 border-b border-slate-100 bg-white/80 px-5 py-4 backdrop-blur-xl sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Assign Test</h2>
                  <p className="mt-1 text-sm text-gray-500">Select project, sample, tests and assignment details.</p>
                </div>
                <button type="button" onClick={closeDrawer} className="rounded-xl p-2 hover:bg-gray-100">
                  <X />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6 bg-[#FAFCFF]">
              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 flex items-center gap-1.5"><FlaskConical size={16} className="text-[#243744]" /> Sample Details</h3>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-gray-600 uppercase tracking-wider">Project *</label>
                  <select value={form.project_id} onChange={(e) => handleProjectChange(e.target.value)} className={inputClass}>
                    <option value="">Select project</option>
                    {projects.map((project) => (
                      <option key={project.project_id} value={project.project_id}>
                        {project.project_code} - {project.project_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-gray-600 uppercase tracking-wider">Sample *</label>
                  <select value={form.sample_id} onChange={(e) => handleSampleChange(e.target.value)} className={inputClass}>
                    <option value="">Select sample</option>
                    {filteredSamples.map((sample) => (
                      <option key={sample.sample_id} value={sample.sample_id}>
                        {sample.sample_no || `Sample ${sample.sample_id}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-gray-600 uppercase tracking-wider">Material</label>
                    <input readOnly value={selectedSample?.material_name || ""} className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm font-semibold text-gray-800 outline-none" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-gray-600 uppercase tracking-wider">Quantity</label>
                    <input readOnly value={selectedSample?.quantity || selectedSample?.nos || ""} className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm font-semibold text-gray-800 outline-none" />
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-[#FAFBFD] px-4 py-3">
                  <h4 className="text-sm font-bold text-[#243744] uppercase tracking-wider">Project Scope Tests</h4>
                </div>
                <div className="max-h-72 space-y-2 overflow-y-auto p-3">
                  {availableTestsLoading ? (
                    <div className="py-8 text-center text-sm text-gray-500">Loading project scope tests...</div>
                  ) : !form.sample_id ? (
                    <div className="py-8 text-center text-sm text-gray-500 font-medium">Select a sample to assign tests.</div>
                  ) : availableTests.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-500 font-medium">No pending scope tests for this sample.</div>
                  ) : (
                    availableTests.map((test) => (
                      <label key={test.project_scope_test_id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={form.scope_test_ids.includes(test.project_scope_test_id)}
                          onChange={(e) => toggleTest(test.project_scope_test_id, e.target.checked)}
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-gray-900">{test.test_name || "Unnamed Test"}</span>
                          <span className="block text-xs text-gray-500 font-semibold mt-0.5">{[test.group_name, test.test_method].filter(Boolean).join(" | ") || "No method"}</span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </section>

              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 flex items-center gap-1.5"><Clipboard size={16} className="text-[#243744]" /> Assignment Details</h3>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-gray-600 uppercase tracking-wider">Assign To *</label>
                  <select value={form.assigned_to} onChange={(e) => setForm((prev) => ({ ...prev, assigned_to: e.target.value }))} className={inputClass}>
                    <option value="">Select user</option>
                    {labUsers.map((user) => (
                      <option key={user.user_id} value={user.user_id}>
                        {getUserName(user)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-gray-600 uppercase tracking-wider">Target Date *</label>
                    <input type="date" value={form.target_date} onChange={(e) => setForm((prev) => ({ ...prev, target_date: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-gray-600 uppercase tracking-wider">Priority</label>
                    <select value={form.priority} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))} className={inputClass}>
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-gray-600 uppercase tracking-wider">Remarks</label>
                  <textarea rows="3" value={form.remarks} onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))} className={inputClass} />
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 z-20 border-t border-slate-100 bg-white/90 px-5 py-4 backdrop-blur-xl sm:px-6">
              <div className="flex justify-end gap-3">
                <button type="button" onClick={closeDrawer} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="button" disabled={saving} onClick={saveAssignment} className="rounded-xl bg-[#243744] hover:bg-[#1A2733] px-4 py-2.5 text-sm font-bold text-white shadow transition-colors disabled:opacity-60">
                  {saving ? "Assigning..." : "Assign Selected Tests"}
                </button>
              </div>
            </div>
          </aside>
        </>
      )}
    </MainLayout>
  );
};

export default TestAssignmentsList;
