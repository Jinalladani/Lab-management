import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Check, ChevronRight, AlertCircle, Plus, Trash2, Copy, CheckSquare, Layers, FileText, UserCheck, Calendar, Loader2 } from "lucide-react";
import { getProjects } from "../../api/projects";
import {
  getEligibleReceipts,
  getExistingTestingSamples,
  getProjectScopeTests,
  createBulkAssignments
} from "../../api/testAssignments";
import { getProjectLocations, getProjectBorelogs } from "../../api/sampleMaster";
import { usersAPI } from "../../api/users";
import { toast } from "sonner";

export const BulkTestAssignmentModal = ({
  isOpen,
  initialReceipt = null,
  initialProjectId = "",
  onClose,
  onSuccess
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Options
  const [projects, setProjects] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [scopeTests, setScopeTests] = useState([]);
  const [existingSamples, setExistingSamples] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [locations, setLocations] = useState([]);
  const [borelogs, setBorelogs] = useState([]);

  // Selections
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || "");
  const [selectedReceipt, setSelectedReceipt] = useState(initialReceipt || null);
  const [selectedTestIds, setSelectedTestIds] = useState([]);

  // Sample Selection Mode: 'existing' vs 'new'
  const [sampleChoiceMode, setSampleChoiceMode] = useState("existing");
  const [selectedExistingIds, setSelectedExistingIds] = useState([]);

  // New Samples Grid
  const [newRowsCount, setNewRowsCount] = useState(5);
  const [newSamplesGrid, setNewSamplesGrid] = useState([]);

  // Scheduling Form
  const [assignedTo, setAssignedTo] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    fetchProjectsAndUsers();
    if (initialReceipt) {
      setSelectedReceipt(initialReceipt);
      setSelectedProjectId(initialReceipt.project_id);
    } else {
      setSelectedProjectId("");
      setSelectedReceipt(null);
      setScopeTests([]);
      setSelectedTestIds([]);
    }
  }, [isOpen, initialReceipt, initialProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setReceipts([]);
      setScopeTests([]);
      setSelectedTestIds([]);
      return;
    }
    fetchReceiptsAndTests(selectedProjectId);
    fetchLocationsAndBorelogs(selectedProjectId);
  }, [selectedProjectId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!selectedReceipt) return;
    fetchExistingSamplesForReceipt(selectedReceipt.receipt_id);
  }, [selectedReceipt]);

  const extractArray = (res) => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.data?.data)) return res.data.data;
    if (Array.isArray(res.projects)) return res.projects;
    if (Array.isArray(res.users)) return res.users;
    return [];
  };

  const fetchProjectsAndUsers = async () => {
    try {
      const pRes = await getProjects().catch(() => ({ data: [] }));
      const uRes = await usersAPI.getLabUsers().catch(() => ({ data: [] }));
      const pList = extractArray(pRes);
      setProjects(pList);
      setTechnicians(extractArray(uRes));
    } catch (e) {
      console.error(e);
      setProjects([]);
      setTechnicians([]);
    }
  };

  const fetchReceiptsAndTests = async (projectId) => {
    try {
      setLoading(true);
      const [rRes, tRes] = await Promise.all([
        getEligibleReceipts(projectId).catch(() => ({ data: [] })),
        getProjectScopeTests(projectId).catch(() => ({ data: [] }))
      ]);
      const rList = extractArray(rRes);
      const tList = extractArray(tRes);
      setReceipts(rList);
      setScopeTests(tList);

      if (!selectedReceipt && rList.length > 0) {
        setSelectedReceipt(rList[0]);
      }
      setSelectedTestIds([]); // Start with empty selection (do not auto-select)
    } catch (e) {
      toast.error("Failed to load receipts or scope tests");
      setReceipts([]);
      setScopeTests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocationsAndBorelogs = async (projectId) => {
    try {
      const [locRes, bhRes] = await Promise.all([
        getProjectLocations(projectId),
        getProjectBorelogs(projectId)
      ]);
      setLocations(locRes.data?.data || []);
      setBorelogs(bhRes.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchExistingSamplesForReceipt = async (receiptId) => {
    try {
      const res = await getExistingTestingSamples({ receipt_id: receiptId });
      const samples = res.data?.data || [];
      setExistingSamples(samples);
      if (samples.length > 0) {
        setSampleChoiceMode("existing");
        setSelectedExistingIds(samples.map((s) => s.testing_sample_id));
      } else {
        setSampleChoiceMode("new");
        generateNewRows(5);
      }
    } catch (e) {
      toast.error("Failed to load existing samples for receipt");
    }
  };

  const generateNewRows = (count) => {
    const rows = [];
    for (let i = 0; i < count; i++) {
      rows.push({
        id: Date.now() + i,
        location_name: "",
        borelog_no: "",
        depth_from: "",
        depth_to: "",
        depth_unit: "m",
        client_sample_reference: ""
      });
    }
    setNewSamplesGrid(rows);
  };

  const handleToggleTest = (id) => {
    setSelectedTestIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleUpdateNewGridRow = (index, field, value) => {
    setNewSamplesGrid((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleCopyDownPreviousRow = (index) => {
    if (index <= 0) return;
    setNewSamplesGrid((prev) => {
      const updated = [...prev];
      const prevRow = updated[index - 1];
      updated[index] = {
        ...updated[index],
        location_name: prevRow.location_name,
        borelog_no: prevRow.borelog_no,
        depth_from: prevRow.depth_to,
        depth_to: (parseFloat(prevRow.depth_to || 0) + 0.5).toFixed(1)
      };
      return updated;
    });
  };

  const handleSubmitAssignment = async () => {
    if (!selectedProjectId) {
      toast.error("Please select a project");
      return;
    }
    if (!selectedReceipt) {
      toast.error("Please select a sample receipt No.");
      return;
    }
    if (selectedTestIds.length === 0) {
      toast.error("Please select at least one test");
      return;
    }

    const payload = {
      project_id: selectedProjectId,
      receipt_id: selectedReceipt.receipt_id,
      project_scope_test_ids: selectedTestIds,
      assigned_to: assignedTo || null,
      target_date: targetDate || null,
      priority: priority,
      remarks: remarks,
      assignment_mode: sampleChoiceMode
    };

    if (sampleChoiceMode === "existing") {
      if (selectedExistingIds.length === 0) {
        toast.error("Please select at least one existing sample");
        return;
      }
      payload.existing_testing_sample_ids = selectedExistingIds;
    } else {
      if (newSamplesGrid.length === 0) {
        toast.error("Please add at least one sample row");
        return;
      }
      payload.new_samples = newSamplesGrid;
    }

    try {
      setSaving(true);
      const res = await createBulkAssignments(payload);
      if (res.data?.success) {
        toast.success(res.data.message || "Test assignments scheduled successfully!");
        onSuccess();
        onClose();
      } else {
        toast.error(res.data?.message || "Failed to create assignments");
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Error submitting test assignments");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="w-full sm:w-screen sm:max-w-lg bg-white shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden"
            >
              <div className="px-4 sm:px-6 py-4 bg-[#243744] text-white flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold tracking-tight">Assign Test Work</h2>
                    <p className="text-xs text-slate-300">Schedule lab tests on physical samples</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold select-none">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${step === 1
                      ? "bg-[#243744] text-white shadow-sm font-bold"
                      : "text-emerald-700 font-bold hover:bg-emerald-50"
                      }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step === 1 ? "bg-white text-[#243744]" : "bg-emerald-600 text-white"
                      }`}>
                      1
                    </span>
                    <span>Project, Sample & Tests</span>
                  </button>
                  <ChevronRight size={16} className="text-slate-300" />
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedProjectId && selectedReceipt && selectedTestIds.length > 0) {
                        setStep(2);
                      }
                    }}
                    disabled={!selectedProjectId || !selectedReceipt || selectedTestIds.length === 0}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${step === 2
                      ? "bg-[#243744] text-white shadow-sm font-bold"
                      : step > 1
                        ? "text-emerald-700 font-bold hover:bg-emerald-50"
                        : "text-slate-400 cursor-not-allowed"
                      }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step === 2 ? "bg-white text-[#243744]" : "bg-slate-200 text-slate-500"
                      }`}>
                      2
                    </span>
                    <span>Physical Specimens & Schedule</span>
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 sm:space-y-6">
                {step === 1 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      {initialReceipt ? (
                        <>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Project</label>
                            <div className="w-full h-10 px-3 flex items-center gap-2 border border-slate-200 rounded-xl text-xs font-bold bg-slate-100 text-slate-800">
                              <span className="text-slate-500 font-mono">
                                {projects.find((p) => String(p.project_id) === String(selectedProjectId))?.project_code || "PRJ"}
                              </span>
                              <span className="truncate">
                                {projects.find((p) => String(p.project_id) === String(selectedProjectId))?.project_name || "Project"}
                              </span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Sample Receipt No.</label>
                            <div className="w-full h-10 px-3 flex items-center justify-between border border-slate-200 rounded-xl text-xs font-bold bg-slate-100 text-slate-800">
                              <span className="font-mono text-[#243744] truncate">{selectedReceipt?.receipt_no} — {selectedReceipt?.material_name}</span>
                              <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[11px] shrink-0 font-sans">
                                Rem: {selectedReceipt?.quantity_remaining}
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Project</label>
                            <select
                              value={selectedProjectId}
                              onChange={(e) => {
                                setSelectedProjectId(e.target.value);
                                setSelectedReceipt(null);
                              }}
                              className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-semibold bg-white outline-none focus:border-[#243744]"
                            >
                              <option value="">-- Select Project --</option>
                              {(Array.isArray(projects) ? projects : []).map((p) => (
                                <option key={p.project_id} value={p.project_id}>
                                  {p.project_code} — {p.project_name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Sample Receipt No.</label>
                            <select
                              value={selectedReceipt?.receipt_id || ""}
                              onChange={(e) => {
                                const r = receipts.find((item) => String(item.receipt_id) === String(e.target.value));
                                setSelectedReceipt(r || null);
                              }}
                              className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-semibold bg-white outline-none focus:border-[#243744]"
                            >
                              <option value="">-- Select Sample Receipt --</option>
                              {(Array.isArray(receipts) ? receipts : []).map((r) => (
                                <option key={r.receipt_id} value={r.receipt_id}>
                                  {r.receipt_no} — {r.material_name} (Rem: {r.quantity_remaining})
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <FileText size={15} className="text-[#243744]" />
                          Select Tests (Checkboxes)
                        </label>
                        {selectedProjectId && scopeTests.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedTestIds.length === scopeTests.length) setSelectedTestIds([]);
                              else setSelectedTestIds(scopeTests.map((t) => t.project_scope_test_id));
                            }}
                            className="text-xs font-bold text-blue-600 hover:underline"
                          >
                            {selectedTestIds.length === scopeTests.length ? "Deselect All Tests" : "Select All Tests"}
                          </button>
                        )}
                      </div>
                      {!selectedProjectId ? (
                        <div className="p-6 text-center bg-slate-50 border border-dashed rounded-xl text-xs text-slate-500 font-medium">
                          Please select a <strong>Project</strong> above to view available tests.
                        </div>
                      ) : loading ? (
                        <div className="p-6 text-center text-xs text-slate-500">Loading scope tests...</div>
                      ) : scopeTests.length === 0 ? (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
                          No scope tests registered for this project yet.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {(Array.isArray(scopeTests) ? scopeTests : []).map((t) => {
                            const isChecked = selectedTestIds.includes(t.project_scope_test_id);
                            return (
                              <div
                                key={t.project_scope_test_id}
                                onClick={() => handleToggleTest(t.project_scope_test_id)}
                                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${isChecked
                                  ? "border-[#243744] bg-slate-50 shadow-sm"
                                  : "border-slate-200 hover:border-slate-300 bg-white"
                                  }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => { }}
                                  className="rounded border-slate-300 text-[#243744] focus:ring-[#243744]"
                                />
                                <span className="text-xs font-bold text-slate-800 truncate">
                                  {t.test_name} {t.test_method ? `(${t.test_method})` : ""}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {step === 2 && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800">Physical Specimen(s)</label>
                        <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-bold">
                          <button
                            type="button"
                            onClick={() => setSampleChoiceMode("existing")}
                            className={`px-3 py-1 rounded-lg transition-all ${sampleChoiceMode === "existing" ? "bg-white text-[#243744] shadow-sm" : "text-slate-600"
                              }`}
                          >
                            Existing Samples ({existingSamples.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setSampleChoiceMode("new")}
                            className={`px-3 py-1 rounded-lg transition-all ${sampleChoiceMode === "new" ? "bg-white text-[#243744] shadow-sm" : "text-slate-600"
                              }`}
                          >
                            + Add New Samples
                          </button>
                        </div>
                      </div>
                      {sampleChoiceMode === "existing" && (
                        <div className="space-y-2">
                          {existingSamples.length === 0 ? (
                            <div className="p-4 text-center bg-slate-50 border border-dashed rounded-xl text-xs text-slate-500 font-medium">
                              No physical samples allocated yet. Click <strong>+ Add New Samples</strong>.
                            </div>
                          ) : (
                            <div className="max-h-48 overflow-y-auto border rounded-xl divide-y text-xs">
                              {(Array.isArray(existingSamples) ? existingSamples : []).map((s) => {
                                const isSelected = selectedExistingIds.includes(s.testing_sample_id);
                                return (
                                  <div
                                    key={s.testing_sample_id}
                                    onClick={() => {
                                      if (isSelected) setSelectedExistingIds((prev) => prev.filter((id) => id !== s.testing_sample_id));
                                      else setSelectedExistingIds((prev) => [...prev, s.testing_sample_id]);
                                    }}
                                    className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${isSelected ? "bg-slate-50" : "hover:bg-slate-50/50"
                                      }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => { }}
                                        className="rounded border-slate-300 text-[#243744]"
                                      />
                                      <div>
                                        <span className="font-bold font-mono text-[#243744]">{s.sample_code}</span>
                                        <p className="text-[11px] text-slate-500">{s.location_name || "Loc A"} — BH: {s.borelog_no || "BH-01"}</p>
                                      </div>
                                    </div>
                                    <span className="font-semibold text-slate-600 font-mono">
                                      {s.depth_from}–{s.depth_to} {s.depth_unit || 'm'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                      {sampleChoiceMode === "new" && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-600">
                              Remaining Receipt Quantity: <strong className="text-emerald-700">{selectedReceipt?.quantity_remaining || 0}</strong>
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="1"
                                max={selectedReceipt?.quantity_remaining || 50}
                                value={newRowsCount}
                                onChange={(e) => setNewRowsCount(parseInt(e.target.value) || 1)}
                                className="w-16 px-2 py-1 border rounded-lg text-center font-bold outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => generateNewRows(newRowsCount)}
                                className="px-3 py-1 bg-[#243744] text-white font-bold rounded-lg hover:bg-[#1a2832]"
                              >
                                Generate Grid
                              </button>
                            </div>
                          </div>
                          <div className="max-h-52 overflow-y-auto border rounded-xl text-xs">
                            <table className="w-full text-left">
                              <thead className="bg-slate-100 border-b font-bold text-slate-700 sticky top-0">
                                <tr>
                                  <th className="p-2 w-10 text-center">#</th>
                                  <th className="p-2">Location</th>
                                  <th className="p-2">Borehole</th>
                                  <th className="p-2 w-20">From (m)</th>
                                  <th className="p-2 w-20">To (m)</th>
                                  <th className="p-2 w-10 text-center">Copy</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {newSamplesGrid.map((row, idx) => (
                                  <tr key={row.id || idx} className="hover:bg-slate-50">
                                    <td className="p-2 text-center font-bold text-slate-400">{idx + 1}</td>
                                    <td className="p-1">
                                      <input
                                        type="text"
                                        value={row.location_name}
                                        onChange={(e) => handleUpdateNewGridRow(idx, "location_name", e.target.value)}
                                        placeholder="Location"
                                        className="w-full px-2 py-1 border rounded outline-none focus:border-[#243744]"
                                      />
                                    </td>
                                    <td className="p-1">
                                      <input
                                        type="text"
                                        value={row.borelog_no}
                                        onChange={(e) => handleUpdateNewGridRow(idx, "borelog_no", e.target.value)}
                                        placeholder="BH-01"
                                        className="w-full px-2 py-1 border rounded outline-none focus:border-[#243744]"
                                      />
                                    </td>
                                    <td className="p-1">
                                      <input
                                        type="text"
                                        value={row.depth_from}
                                        onChange={(e) => handleUpdateNewGridRow(idx, "depth_from", e.target.value)}
                                        placeholder="0.0"
                                        className="w-full px-2 py-1 border rounded outline-none text-center focus:border-[#243744]"
                                      />
                                    </td>
                                    <td className="p-1">
                                      <input
                                        type="text"
                                        value={row.depth_to}
                                        onChange={(e) => handleUpdateNewGridRow(idx, "depth_to", e.target.value)}
                                        placeholder="1.0"
                                        className="w-full px-2 py-1 border rounded outline-none text-center focus:border-[#243744]"
                                      />
                                    </td>
                                    <td className="p-1 text-center">
                                      {idx > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => handleCopyDownPreviousRow(idx)}
                                          title="Copy from previous row"
                                          className="p-1 text-slate-400 hover:text-blue-600"
                                        >
                                          <Copy size={13} />
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Assign Technician</label>
                        <select
                          value={assignedTo}
                          onChange={(e) => setAssignedTo(e.target.value)}
                          className="w-full h-10 px-3 border rounded-xl text-xs font-semibold bg-white outline-none focus:border-[#243744]"
                        >
                          <option value="">-- Unassigned --</option>
                          {(Array.isArray(technicians) ? technicians : []).map((u) => (
                            <option key={u.user_id} value={u.user_id}>{u.full_name || u.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Target Completion Date</label>
                        <input
                          type="date"
                          value={targetDate}
                          onChange={(e) => setTargetDate(e.target.value)}
                          className="w-full h-10 px-3 border rounded-xl text-xs font-semibold bg-white outline-none focus:border-[#243744]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value)}
                          className="w-full h-10 px-3 border rounded-xl text-xs font-semibold bg-white outline-none focus:border-[#243744]"
                        >
                          <option value="Normal">Normal</option>
                          <option value="Urgent">Urgent</option>
                          <option value="High Priority">High Priority</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Remarks / Testing Notes</label>
                        <input
                          type="text"
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          placeholder="e.g. Perform 3-point test."
                          className="w-full h-10 px-3 border rounded-xl text-xs font-semibold bg-white outline-none focus:border-[#243744]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="px-4 sm:px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <div>
                  {step === 2 ? (
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Back
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-xl"
                    >
                      Cancel
                    </button>
                  )}
                </div>
                <div>
                  {step === 1 ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedProjectId) {
                          toast.error("Please select a project");
                          return;
                        }
                        if (!selectedReceipt) {
                          toast.error("Please select a sample receipt No.");
                          return;
                        }
                        if (selectedTestIds.length === 0) {
                          toast.error("Please select at least one test");
                          return;
                        }
                        setStep(2);
                      }}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#243744] hover:bg-[#1a2832] text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                    >
                      Continue <ChevronRight size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmitAssignment}
                      disabled={saving}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                      {saving ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Scheduling Tests...</span>
                        </>
                      ) : (
                        <span>Confirm & Schedule {selectedTestIds.length} Test(s)</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
