import React, { useState, useEffect } from "react";
import { X, TestTube, CheckCircle2, Clock, Calendar, MapPin, Layers, User, FileText, ArrowRight, Loader2, Plus, ShieldCheck } from "lucide-react";
import { getSampleEntryById, getSampleEntryScopeTests, updateSampleEntryScopeTests } from "../../api/sampleMaster";
import { toast } from "sonner";

export const SampleDetailModal = ({ sampleId, isOpen, onClose, onAssignClick }) => {
  const [sample, setSample] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scopeTests, setScopeTests] = useState([]);
  const [editingRequiredTests, setEditingRequiredTests] = useState(false);
  const [selectedPstIds, setSelectedPstIds] = useState([]);
  const [savingTests, setSavingTests] = useState(false);

  useEffect(() => {
    if (isOpen && sampleId) {
      loadSampleDetails();
    }
  }, [isOpen, sampleId]);

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

  const loadSampleDetails = async () => {
    try {
      setLoading(true);
      const [res, testsRes] = await Promise.all([
        getSampleEntryById(sampleId),
        getSampleEntryScopeTests(sampleId).catch(() => ({ data: { data: [] } }))
      ]);

      if (res.data?.success) {
        setSample(res.data.data);
      }
      if (testsRes.data?.success) {
        setScopeTests(testsRes.data.data);
        setSelectedPstIds(testsRes.data.data.filter((t) => t.is_required).map((t) => t.project_scope_test_id));
      }
    } catch (err) {
      toast.error("Failed to load sample details");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRequiredTests = async () => {
    try {
      setSavingTests(true);
      const res = await updateSampleEntryScopeTests(sampleId, { project_scope_test_ids: selectedPstIds });
      if (res.data?.success) {
        toast.success("Sample required tests updated successfully");
        setEditingRequiredTests(false);
        loadSampleDetails();
      }
    } catch (err) {
      toast.error("Failed to update sample required tests");
    } finally {
      setSavingTests(false);
    }
  };

  if (!isOpen) return null;

  const reqCount = sample?.required_test_count || 0;
  const assignedCount = sample?.assigned_test_count || 0;
  const inProgressCount = sample?.in_progress_test_count || 0;
  const completedCount = sample?.completed_test_count || 0;

  const getStatusBadge = (status) => {
    const s = String(status || "").toLowerCase();
    if (s.includes("completed")) return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">Testing Completed</span>;
    if (s.includes("testing") || s.includes("in_progress")) return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">Testing</span>;
    if (s.includes("partially")) return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200">Partially Assigned</span>;
    if (s.includes("awaiting")) return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200">Awaiting Assignment</span>;
    return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 border border-gray-200">{sample?.overall_status || "Received"}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-100 flex flex-col max-h-[92vh] animate-in fade-in duration-200">

        {/* Header */}
        <div className="px-6 py-4 bg-[#243744] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <TestTube className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-mono">{sample?.sample_no || `SMP-${sampleId}`}</h2>
                {getStatusBadge(sample?.overall_status)}
              </div>
              <p className="text-xs text-gray-300">
                {sample?.project_code} — {sample?.project_name || "Civil Engineering Testing"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-300 hover:text-white" />
          </button>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#243744] animate-spin" />
            <p className="text-xs text-gray-500 font-medium">Loading sample details & test progress...</p>
          </div>
        ) : (
          <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">

            {/* Identification Grid */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sample Identification & Metadata</h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 block font-medium">Location</span>
                  <span className="font-semibold text-gray-800">{sample?.location_name || sample?.sample_location || "—"}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Borelog / BH No</span>
                  <span className="font-semibold text-gray-800 font-mono">{sample?.borelog_no || "—"}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Depth Range</span>
                  <span className="font-semibold text-gray-800">{sample?.depth_display || "—"}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Material Name</span>
                  <span className="font-semibold text-gray-800">{sample?.material_name || "Soil"}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Client Ref</span>
                  <span className="font-semibold text-gray-800">{sample?.client_reference || "—"}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Received Date</span>
                  <span className="font-semibold text-gray-800">{sample?.received_date || sample?.sample_received_date || "—"}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Condition</span>
                  <span className="font-semibold text-gray-800">{sample?.received_condition || "Good"}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Description</span>
                  <span className="font-semibold text-gray-800">{sample?.sample_description || "Standard Sample"}</span>
                </div>
              </div>
            </div>

            {/* Progress Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-gray-400 block">Required Tests</span>
                  <span className="text-xl font-bold text-gray-800">{reqCount}</span>
                </div>
                <div className="p-2.5 bg-gray-100 text-gray-600 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-gray-400 block">Assigned</span>
                  <span className="text-xl font-bold text-blue-600">{assignedCount} / {reqCount}</span>
                </div>
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-gray-400 block">In Progress</span>
                  <span className="text-xl font-bold text-amber-600">{inProgressCount}</span>
                </div>
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                  <TestTube className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-gray-400 block">Completed</span>
                  <span className="text-xl font-bold text-emerald-600">{completedCount} / {reqCount}</span>
                </div>
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Test Breakdown & Required Test Selector */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  Sample Test Workflow Breakdown
                </h3>
                <button
                  onClick={() => setEditingRequiredTests(!editingRequiredTests)}
                  className="text-xs font-semibold text-[#243744] hover:underline"
                >
                  {editingRequiredTests ? "Cancel Test Editing" : "Configure Required Tests"}
                </button>
              </div>

              {editingRequiredTests ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <p className="text-xs text-gray-600 font-medium">Select which project scope tests are required for this specific sample:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {scopeTests.map((t) => (
                      <label key={t.project_scope_test_id} className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-gray-200 text-xs font-medium cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={selectedPstIds.includes(t.project_scope_test_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPstIds([...selectedPstIds, t.project_scope_test_id]);
                            } else {
                              setSelectedPstIds(selectedPstIds.filter((id) => id !== t.project_scope_test_id));
                            }
                          }}
                          className="rounded border-gray-300 text-[#243744] focus:ring-[#243744]"
                        />
                        <span>{t.test_name} ({t.test_code || "TEST"})</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={handleSaveRequiredTests}
                      disabled={savingTests}
                      className="px-4 py-1.5 bg-[#243744] text-white text-xs font-semibold rounded-lg hover:bg-[#1a2832] transition-colors"
                    >
                      {savingTests ? "Saving..." : "Save Required Tests"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-gray-700 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="p-3">Test Name</th>
                        <th className="p-3">Required</th>
                        <th className="p-3">Assignment Status</th>
                        <th className="p-3">Assigned Technician</th>
                        <th className="p-3">Target Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {sample?.required_tests_list && sample.required_tests_list.length > 0 ? (
                        sample.required_tests_list.map((t, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-3 font-semibold text-gray-800">{t.test_name}</td>
                            <td className="p-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Required
                              </span>
                            </td>
                            <td className="p-3">
                              {t.assignment_status ? (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${t.assignment_status.includes("Completed") ? "bg-emerald-100 text-emerald-800" :
                                    t.assignment_status.includes("Progress") ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                                  }`}>
                                  {t.assignment_status}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-500">
                                  Not Assigned
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-gray-700">{t.assigned_to_name || "—"}</td>
                            <td className="p-3 text-gray-700 font-mono">{t.target_date || "—"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-gray-400">
                            No test requirements configured for this sample yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            Close
          </button>

          <button
            onClick={() => {
              onClose();
              if (onAssignClick) onAssignClick(sample);
            }}
            className="inline-flex items-center gap-2 px-5 py-2 bg-[#243744] text-white text-xs font-semibold rounded-xl hover:bg-[#1a2832] transition-colors"
          >
            Assign Tests For This Sample <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
