import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import { toast, Toaster } from "sonner";

const inputClass =
  "w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#2b63ae] bg-white/90 text-sm";

const getUserName = (user) =>
  user.full_name ||
  [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
  user.name ||
  user.email ||
  "";

const statusClass = (status) => {
  const value = String(status || "").toLowerCase();
  if (value.includes("complete") || value.includes("approved")) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (value.includes("progress") || value.includes("testing")) return "bg-blue-100 text-blue-700 border-blue-200";
  if (value.includes("review")) return "bg-violet-100 text-violet-700 border-violet-200";
  if (value.includes("result")) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

const TestAssignmentsList = () => {
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
  const [projectFilter, setProjectFilter] = useState("");
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
      const sourceProjects = projectFilter
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

  return (
    <MainLayout headerTitle="Test Assign" headerSubtitle="Full test assignment list">
      <Toaster position="top-right" richColors />
      <div className="p-6 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Test Assign</h1>
            <p className="text-sm text-slate-500">View assignments across projects and assign tests from the right drawer.</p>
          </div>
          <button
            type="button"
            onClick={openDrawer}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2562AA] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1f5498]"
          >
            <AddIcon fontSize="small" />
            Add Test Assign
          </button>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <SearchIcon className="text-slate-400" fontSize="small" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assignment, sample, test, material, technician..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
          >
            <option value="">All Projects</option>
            {projects.map((project) => (
              <option key={project.project_id} value={project.project_id}>
                {project.project_code} - {project.project_name}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Assignment</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Sample</th>
                  <th className="px-4 py-3">Material</th>
                  <th className="px-4 py-3">Test</th>
                  <th className="px-4 py-3">Assigned To</th>
                  <th className="px-4 py-3">Target Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500">Loading assignments...</td>
                  </tr>
                ) : filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500">No test assignments found.</td>
                  </tr>
                ) : (
                  filteredAssignments.map((assignment, index) => (
                    <tr key={assignment.assignment_id || assignment.test_assignment_id || index} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{assignment.assignment_code || assignment.assignment_id || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{assignment.project_code || assignment.project_name || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{assignment.sample_no || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{assignment.material_name || "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{assignment.test_name || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{assignment.assigned_to_name || assignment.assigned_to || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{assignment.target_date || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(assignment.status)}`}>
                          {assignment.status || "Assigned"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <button onClick={() => handleDelete(assignment)} className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50" title="Delete">
                            <DeleteIcon fontSize="small" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-[1000] bg-slate-900/45 backdrop-blur-sm" onClick={closeDrawer} />
          <aside className="fixed top-0 right-0 z-[1001] flex h-full w-full flex-col bg-gradient-to-br from-[#f8fbff] via-white to-[#eef5fd] shadow-2xl md:max-w-[700px] lg:max-w-[560px]">
            <div className="sticky top-0 z-20 border-b border-white/70 bg-white/80 px-5 py-4 backdrop-blur-xl sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Assign Test</h2>
                  <p className="mt-1 text-sm text-gray-500">Select project, sample, tests and assignment details.</p>
                </div>
                <button type="button" onClick={closeDrawer} className="rounded-xl p-2 hover:bg-gray-100">
                  <CloseIcon />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
              <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
                <h3 className="font-semibold text-gray-900">Sample Details</h3>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Project *</label>
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
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Sample *</label>
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
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">Material</label>
                    <input readOnly value={selectedSample?.material_name || ""} className="w-full rounded-xl border border-gray-200 bg-gray-50/90 px-3 py-2.5 text-sm font-medium text-gray-800" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">Quantity</label>
                    <input readOnly value={selectedSample?.quantity || selectedSample?.nos || ""} className="w-full rounded-xl border border-gray-200 bg-gray-50/90 px-3 py-2.5 text-sm font-medium text-gray-800" />
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                  <h4 className="text-sm font-semibold text-gray-800">Project Scope Tests</h4>
                </div>
                <div className="max-h-72 space-y-2 overflow-y-auto p-3">
                  {availableTestsLoading ? (
                    <div className="py-8 text-center text-sm text-gray-500">Loading project scope tests...</div>
                  ) : !form.sample_id ? (
                    <div className="py-8 text-center text-sm text-gray-500">Select a sample to assign tests.</div>
                  ) : availableTests.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-500">No pending scope tests for this sample.</div>
                  ) : (
                    availableTests.map((test) => (
                      <label key={test.project_scope_test_id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={form.scope_test_ids.includes(test.project_scope_test_id)}
                          onChange={(e) => toggleTest(test.project_scope_test_id, e.target.checked)}
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-gray-900">{test.test_name || "Unnamed Test"}</span>
                          <span className="block text-xs text-gray-500">{[test.group_name, test.test_method].filter(Boolean).join(" | ") || "No method"}</span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </section>

              <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
                <h3 className="font-semibold text-gray-900">Assignment Details</h3>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Assign To *</label>
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
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">Target Date *</label>
                    <input type="date" value={form.target_date} onChange={(e) => setForm((prev) => ({ ...prev, target_date: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">Priority</label>
                    <select value={form.priority} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))} className={inputClass}>
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Remarks</label>
                  <textarea rows="3" value={form.remarks} onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))} className={inputClass} />
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 z-20 border-t border-white/70 bg-white/90 px-5 py-4 backdrop-blur-xl sm:px-6">
              <div className="flex justify-end gap-3">
                <button type="button" onClick={closeDrawer} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="button" disabled={saving} onClick={saveAssignment} className="rounded-xl bg-[#2d66b3] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1f5498] disabled:opacity-60">
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
