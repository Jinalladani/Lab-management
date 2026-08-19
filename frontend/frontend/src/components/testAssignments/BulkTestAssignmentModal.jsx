import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Sparkles, Plus, Trash2, Layers, FileText, UserCheck, Calendar, Loader2, ArrowRight, Repeat, CheckSquare
} from "lucide-react";
import { getProjects } from "../../api/projects";
import {
  getEligibleReceipts,
  getExistingTestingSamples,
  getProjectScopeTests,
  createBulkAssignments
} from "../../api/testAssignments";
import { usersAPI } from "../../api/users";
import { toast } from "sonner";

export const BulkTestAssignmentModal = ({
  isOpen,
  initialReceipt = null,
  initialProjectId = "",
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Data Options
  const [projects, setProjects] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [scopeTests, setScopeTests] = useState([]);
  const [existingSamples, setExistingSamples] = useState([]);
  const [technicians, setTechnicians] = useState([]);

  // Selection States
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || "");
  const [selectedReceipt, setSelectedReceipt] = useState(initialReceipt || null);

  // Mode: 'new' (Add Boreholes) vs 'existing' (Existing Samples)
  const [sampleChoiceMode, setSampleChoiceMode] = useState("new");

  // Borehole Input & Badges
  const [inputBorehole, setInputBorehole] = useState("");
  const [inputLocation, setInputLocation] = useState("");
  const [addedBoreholes, setAddedBoreholes] = useState([]);
  
  // Table of Added Samples: [{ id, borelog_no, location_name, sample_type, depth_from, depth_to }]
  const [samplesTable, setSamplesTable] = useState([]);

  // Existing Samples Selection
  const [selectedExistingIds, setSelectedExistingIds] = useState([]);

  // Global "Apply Same Test to All" Selection
  const [globalSelectedTestId, setGlobalSelectedTestId] = useState("");
  
  // Per-Sample Selected Tests Map: sampleKey -> array of project_scope_test_ids
  const [sampleTestMap, setSampleTestMap] = useState({});

  // Scheduling Form
  const [assignedTo, setAssignedTo] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    fetchProjectsAndUsers();
    if (initialReceipt) {
      setSelectedReceipt(initialReceipt);
      setSelectedProjectId(initialReceipt.project_id);
    } else {
      setSelectedProjectId("");
      setSelectedReceipt(null);
      setScopeTests([]);
      setSamplesTable([]);
      setAddedBoreholes([]);
      setSelectedExistingIds([]);
      setSampleTestMap({});
    }
  }, [isOpen, initialReceipt, initialProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setReceipts([]);
      setScopeTests([]);
      return;
    }
    fetchReceiptsAndTests(selectedProjectId);
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
      setProjects(extractArray(pRes));
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
    } catch (e) {
      toast.error("Failed to load receipts or scope tests");
      setReceipts([]);
      setScopeTests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingSamplesForReceipt = async (receiptId) => {
    try {
      const res = await getExistingTestingSamples({ receipt_id: receiptId });
      const samples = res.data?.data || [];
      setExistingSamples(samples);

      // Pre-populate sampleTestMap with existing assigned tests for each sample
      const initialMap = {};
      samples.forEach((s) => {
        if (s.assigned_project_scope_test_ids && s.assigned_project_scope_test_ids.length > 0) {
          initialMap[String(s.testing_sample_id)] = s.assigned_project_scope_test_ids.map(Number);
        }
      });
      setSampleTestMap((prev) => ({ ...initialMap, ...prev }));
    } catch (e) {
      toast.error("Failed to load existing samples for receipt");
    }
  };

  // --- Add Borehole Handler ---
  const handleAddBorehole = (e) => {
    if (e) e.preventDefault();
    const bhName = inputBorehole.trim().toUpperCase();
    if (!bhName) {
      toast.error("Please enter a Borehole Number (e.g. BH-01)");
      return;
    }

    const locName = inputLocation.trim();
    const sampleType = selectedReceipt?.material_name || "Soil Sample";

    const newSample = {
      id: Date.now() + Math.random(),
      borelog_no: bhName,
      location_name: locName,
      sample_type: sampleType,
      depth_unit: "m"
    };

    const badgeLabel = locName ? `${bhName} (${locName})` : bhName;
    setAddedBoreholes((prev) => [...prev, badgeLabel]);
    setSamplesTable((prev) => [...prev, newSample]);
    setInputBorehole("");
    setInputLocation("");
    toast.success(`Added ${badgeLabel}`);
  };

  const handleRemoveBorehole = (index) => {
    setSamplesTable((prev) => {
      const targetBh = prev[index]?.borelog_no;
      if (targetBh) {
        setAddedBoreholes((bhPrev) => {
          const bhIndex = bhPrev.findIndex((b) => b.startsWith(targetBh));
          if (bhIndex !== -1) {
            const updatedBh = [...bhPrev];
            updatedBh.splice(bhIndex, 1);
            return updatedBh;
          }
          return bhPrev;
        });
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleRemoveBoreholeBadge = (badgeText) => {
    setAddedBoreholes((prev) => prev.filter((b) => b !== badgeText));
    setSamplesTable((prev) => prev.filter((s) => {
      const bText = s.location_name ? `${s.borelog_no} (${s.location_name})` : s.borelog_no;
      return bText !== badgeText;
    }));
  };

  // --- Apply Same Test to All ---
  const handleApplySameTestToAll = () => {
    if (!globalSelectedTestId) {
      toast.error("Please select a test from the dropdown first");
      return;
    }

    const testObj = scopeTests.find((t) => String(t.project_scope_test_id) === String(globalSelectedTestId));
    const testName = testObj ? testObj.test_name : "selected test";

    const updatedMap = { ...sampleTestMap };
    const sampleKeys = sampleChoiceMode === "new"
      ? samplesTable.map((s, idx) => String(s.id || idx))
      : selectedExistingIds.map((id) => String(id));

    sampleKeys.forEach((key) => {
      const existingArr = updatedMap[key] || [];
      if (!existingArr.includes(Number(globalSelectedTestId))) {
        updatedMap[key] = [...existingArr, Number(globalSelectedTestId)];
      }
    });

    setSampleTestMap(updatedMap);
    toast.success(`Applied ${testName} to all added samples`);
  };

  // --- Row-level Individual Test Toggle ---
  const handleToggleRowTest = (sampleKey, pstId) => {
    const numericId = Number(pstId);
    setSampleTestMap((prevMap) => {
      const currentArr = prevMap[sampleKey] || [];
      const updatedArr = currentArr.includes(numericId)
        ? currentArr.filter((id) => id !== numericId)
        : [...currentArr, numericId];
      return { ...prevMap, [sampleKey]: updatedArr };
    });
  };

  // --- Form Submission ---
  const handleSubmitAssignment = async () => {
    if (!selectedProjectId) {
      toast.error("Please select a project");
      return;
    }
    if (!selectedReceipt) {
      toast.error("Please select a sample receipt / sample type");
      return;
    }

    const currentSamples = sampleChoiceMode === "new"
      ? samplesTable
      : existingSamples.filter((s) => selectedExistingIds.includes(s.testing_sample_id));

    if (currentSamples.length === 0) {
      toast.error("Please add or select at least one sample");
      return;
    }

    // Collect all selected tests across samples
    let allTestIds = [];
    const payloadTestMap = {};

    currentSamples.forEach((s, idx) => {
      const key = String(s.id || s.testing_sample_id || idx);
      const tests = sampleTestMap[key] || [];
      payloadTestMap[key] = tests;
      tests.forEach((id) => {
        if (!allTestIds.includes(id)) allTestIds.push(id);
      });
    });

    if (allTestIds.length === 0) {
      toast.error("Please select at least one test for the samples");
      return;
    }

    const payload = {
      project_id: selectedProjectId,
      receipt_id: selectedReceipt.receipt_id,
      project_scope_test_ids: allTestIds,
      sample_test_map: payloadTestMap,
      assigned_to: assignedTo || null,
      target_date: targetDate || null,
      priority: priority,
      remarks: remarks,
      assignment_mode: sampleChoiceMode
    };

    if (sampleChoiceMode === "existing") {
      payload.existing_testing_sample_ids = selectedExistingIds;
    } else {
      payload.new_samples = samplesTable.map((s, idx) => ({
        ...s,
        project_scope_test_ids: sampleTestMap[String(s.id || idx)] || allTestIds
      }));
    }

    try {
      setSaving(true);
      const res = await createBulkAssignments(payload);
      if (res.data?.success) {
        toast.success(res.data.message || "Test assignments scheduled successfully!");
        onSuccess();
        onClose();
      } else {
        toast.error(res.data?.message || "Failed to create test assignments");
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
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-4">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="w-full max-w-xl md:max-w-2xl bg-white shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden"
            >
              {/* Top Bar / Header */}
              <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#243744] text-white flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold tracking-tight">Assign Test Work</h2>
                    <p className="text-[11px] sm:text-xs text-slate-300">Select project, add borehole numbers & assign tests</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 sm:p-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-xl transition-colors shrink-0"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Main Content Area */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-6 bg-[#FAFBFD]">

                {/* 1. SELECT PROJECT & SAMPLE CARD */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Project *</label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => {
                        setSelectedProjectId(e.target.value);
                        setSelectedReceipt(null);
                      }}
                      className="w-full h-10 px-3.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all truncate"
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
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Sample Type / Receipt Lot *</label>
                    <select
                      value={selectedReceipt?.receipt_id || ""}
                      onChange={(e) => {
                        const r = receipts.find((item) => String(item.receipt_id) === String(e.target.value));
                        setSelectedReceipt(r || null);
                      }}
                      className="w-full h-10 px-3.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all truncate"
                    >
                      <option value="">-- Select Sample Receipt --</option>
                      {(Array.isArray(receipts) ? receipts : []).map((r) => (
                        <option key={r.receipt_id} value={r.receipt_id}>
                          {r.receipt_no} — {r.material_name} (Rem: {r.quantity_remaining})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. ADD BOREHOLE NUMBERS & EXISTING SAMPLES CARD (SPLIT SECTION) */}
                <div className="grid grid-cols-1 gap-4">
                  {/* Left Column: Add Borehole Numbers */}
                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-[#243744] shrink-0">
                        <FileText size={16} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-800">Add Borehole Numbers</h3>
                        <p className="text-[11px] text-slate-400">Enter borehole numbers one by one and add to the list</p>
                      </div>
                    </div>

                    <form onSubmit={handleAddBorehole} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                        <div className="sm:col-span-6 lg:col-span-5">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Borehole Number *</label>
                          <input
                            type="text"
                            placeholder="e.g. BH-01"
                            value={inputBorehole}
                            onChange={(e) => setInputBorehole(e.target.value)}
                            className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all bg-white"
                          />
                        </div>

                        <div className="sm:col-span-6 lg:col-span-5">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Location / Chainage No.</label>
                          <input
                            type="text"
                            placeholder="e.g. Ch 12+500"
                            value={inputLocation}
                            onChange={(e) => setInputLocation(e.target.value)}
                            className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all bg-white"
                          />
                        </div>

                        <div className="sm:col-span-12 lg:col-span-2">
                          <button
                            type="submit"
                            className="w-full h-10 bg-[#243744] hover:bg-[#1A2733] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Plus size={15} />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    </form>

                    {/* Added Boreholes Pills */}
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-[11px] font-bold text-slate-600">Added Boreholes & Locations</label>
                      {addedBoreholes.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No boreholes added yet. Enter a borehole number above.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                          {addedBoreholes.map((bh, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs"
                            >
                              <span>{bh}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveBoreholeBadge(bh)}
                                className="text-slate-400 hover:text-red-600 cursor-pointer"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Existing Sample - Additional Test */}
                  <div className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[#243744]">
                        <Repeat size={18} />
                        <h3 className="text-xs font-bold">Existing Sample – Additional Test</h3>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        Select if you want to perform another test on existing physical samples already registered in the system.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedProjectId) {
                          toast.error("Please select a Project first");
                          return;
                        }
                        if (!selectedReceipt) {
                          toast.error("Please select a Sample Type / Receipt Lot first");
                          return;
                        }
                        const nextMode = sampleChoiceMode === "existing" ? "new" : "existing";
                        setSampleChoiceMode(nextMode);
                        toast.info(nextMode === "existing" ? "Switched to Existing Physical Samples Mode" : "Switched to New Borehole Add");
                      }}
                      className={`w-full sm:w-auto py-2.5 px-4 border border-[#243744] text-[#243744] hover:bg-[#243744] hover:text-white text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer shrink-0 ${
                        sampleChoiceMode === "existing" ? "bg-[#243744] text-white" : "bg-white"
                      }`}
                    >
                      {sampleChoiceMode === "existing" ? "✓ Existing Samples Selected" : "Add Another Test"}
                    </button>
                  </div>
                </div>

                {/* 3. SAMPLES ADDED TABLE WITH GLOBAL & INDIVIDUAL TEST SELECTION */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-4 sm:p-5">
                  {/* Table Header Bar */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-[#243744] shrink-0">
                        <Layers size={16} />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">
                        Samples Added ({sampleChoiceMode === "new" ? samplesTable.length : selectedExistingIds.length})
                      </h3>
                    </div>

                    {/* Apply Same Test to All Bar */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 w-full md:w-auto">
                      <div>
                        <p className="text-[11px] font-bold text-slate-700">Apply Same Test to All</p>
                        <p className="text-[10px] text-slate-400">Select if you want to apply to all added samples</p>
                      </div>

                      <div className="flex items-center gap-1.5 w-full sm:w-auto mt-1 sm:mt-0">
                        <select
                          value={globalSelectedTestId}
                          onChange={(e) => setGlobalSelectedTestId(e.target.value)}
                          className="h-8 px-2.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white outline-none focus:border-[#243744] flex-1 sm:w-36"
                        >
                          <option value="">Select Test...</option>
                          {scopeTests.map((t) => (
                            <option key={t.project_scope_test_id} value={t.project_scope_test_id}>
                              {t.test_name}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={handleApplySameTestToAll}
                          className="h-8 px-3 bg-[#243744] hover:bg-[#1A2733] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Existing Samples Picker (if Mode is 'existing' & Project/Receipt is selected) */}
                  {sampleChoiceMode === "existing" && selectedProjectId && selectedReceipt && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <p className="text-xs font-bold text-slate-700">Check Existing Samples to Assign Tests:</p>
                      <div className="max-h-40 overflow-y-auto divide-y bg-white border rounded-xl text-xs">
                        {existingSamples.map((s) => {
                          const isChecked = selectedExistingIds.includes(s.testing_sample_id);
                          return (
                            <div
                              key={s.testing_sample_id}
                              onClick={() => {
                                if (isChecked) setSelectedExistingIds((prev) => prev.filter((id) => id !== s.testing_sample_id));
                                else setSelectedExistingIds((prev) => [...prev, s.testing_sample_id]);
                              }}
                              className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50"
                            >
                              <div className="flex items-center gap-2">
                                <input type="checkbox" checked={isChecked} onChange={() => {}} className="rounded text-[#243744]" />
                                <span className="font-bold font-mono text-slate-800">{s.sample_code}</span>
                                <span className="text-slate-500">(BH: {s.borelog_no || "BH-01"}{s.location_name ? ` | Loc: ${s.location_name}` : ""})</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Table View */}
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-left border-collapse text-xs min-w-[600px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200/80 font-bold text-slate-600 select-none">
                          <th className="py-3 px-3 w-10 text-center">#</th>
                          <th className="py-3 px-3">Borehole No.</th>
                          <th className="py-3 px-3">Location / Chainage</th>
                          <th className="py-3 px-3">Sample Type</th>
                          <th className="py-3 px-3 min-w-[200px]">Select Tests</th>
                          <th className="py-3 px-3 w-16 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(sampleChoiceMode === "new"
                          ? samplesTable
                          : existingSamples.filter((s) => selectedExistingIds.includes(s.testing_sample_id))
                        ).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                              No samples added yet. Enter a borehole number above and click <strong>Add</strong>.
                            </td>
                          </tr>
                        ) : (
                          (sampleChoiceMode === "new"
                            ? samplesTable
                            : existingSamples.filter((s) => selectedExistingIds.includes(s.testing_sample_id))
                          ).map((row, idx) => {
                            const sKey = String(row.id || row.testing_sample_id || idx);
                            const rowSelectedTests = sampleTestMap[sKey] || [];

                            return (
                              <tr key={sKey} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                                <td className="py-3 px-3 font-bold text-slate-800 whitespace-nowrap">{row.borelog_no || row.sample_code}</td>
                                <td className="py-3 px-3 text-slate-700 font-medium whitespace-nowrap">{row.location_name || "—"}</td>
                                <td className="py-3 px-3 text-slate-600 font-medium whitespace-nowrap">{row.sample_type || selectedReceipt?.material_name || "Soil Sample"}</td>
                                <td className="py-3 px-3">
                                  {/* Multi-Select Test Selector for Individual Sample */}
                                  <div className="space-y-1.5">
                                    <div className="flex flex-wrap gap-1">
                                      {scopeTests.map((t) => {
                                        const isSelected = rowSelectedTests.includes(Number(t.project_scope_test_id));
                                        return (
                                          <button
                                            key={t.project_scope_test_id}
                                            type="button"
                                            onClick={() => handleToggleRowTest(sKey, t.project_scope_test_id)}
                                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                                              isSelected
                                                ? "bg-[#243744] text-white border-[#243744]"
                                                : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                                            }`}
                                          >
                                            {isSelected ? "✓ " : "+ "}{t.test_name}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    {rowSelectedTests.length === 0 && (
                                      <p className="text-[10px] text-amber-600 font-medium">Click test button to select for this sample</p>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBorehole(idx)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                    title="Delete sample"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* SCHEDULING CARD (Technician, Priority & Date) */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">Schedule & Technician Options</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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

                    <div className="sm:col-span-2 lg:col-span-1">
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
                  </div>
                </div>

              </div>

              {/* Bottom Footer Actions */}
              <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-white border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-center"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSubmitAssignment}
                  disabled={saving}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-2.5 bg-[#243744] hover:bg-[#1A2733] text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Scheduling Tests...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm & Schedule Tests</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </div>

            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
