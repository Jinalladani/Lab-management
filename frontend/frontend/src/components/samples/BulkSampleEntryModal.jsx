import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Copy, Check, AlertCircle, Loader2, Sparkles, Layers } from "lucide-react";
import { getProjects } from "../../api/projects";
import { getSampleMasterData, createSampleEntriesBatch } from "../../api/sampleMaster";
import { toast } from "sonner";

export const BulkSampleEntryModal = ({ isOpen, onClose, onSuccess }) => {
  const [projects, setProjects] = useState([]);
  const [masterData, setMasterData] = useState({ materials: [], categories: [], types: [] });
  const [projectScopeTests, setProjectScopeTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Common Header State
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [commonMaterial, setCommonMaterial] = useState("Soil");
  const [commonReceivedDate, setCommonReceivedDate] = useState(new Date().toISOString().split("T")[0]);
  const [commonQuantityUnit, setCommonQuantityUnit] = useState("kg");
  const [commonCollectionMode, setCommonCollectionMode] = useState("in_person");
  const [commonCollectedBy, setCommonCollectedBy] = useState("");
  const [commonRemarks, setCommonRemarks] = useState("");

  // Common Required Tests (applied to selected/new rows)
  const [selectedCommonTestIds, setSelectedCommonTestIds] = useState([]);

  // Spreadsheet Rows State
  const [rows, setRows] = useState([
    { id: 1, location_name: "Location A", borelog_no: "BH-01", depth_from: 1.0, depth_to: 1.5, client_reference: "CR-01", sample_description: "Soil sample", selected: true, required_test_ids: [] },
    { id: 2, location_name: "Location A", borelog_no: "BH-01", depth_from: 1.5, depth_to: 2.0, client_reference: "CR-02", sample_description: "Soil sample", selected: true, required_test_ids: [] },
    { id: 3, location_name: "Location A", borelog_no: "BH-02", depth_from: 1.0, depth_to: 1.5, client_reference: "CR-03", sample_description: "Soil sample", selected: true, required_test_ids: [] },
    { id: 4, location_name: "Location B", borelog_no: "BH-01", depth_from: 2.0, depth_to: 2.5, client_reference: "CR-04", sample_description: "Soil sample", selected: true, required_test_ids: [] },
  ]);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [projRes, masterRes] = await Promise.all([
        getProjects(),
        getSampleMasterData().catch(() => ({ data: { data: {} } }))
      ]);
      setProjects(projRes.data?.data || projRes.data || []);
      const mData = masterRes.data?.data || {};
      setMasterData({
        materials: mData.materials || [],
        categories: mData.material_categories || [],
        types: mData.material_types || []
      });
    } catch (err) {
      toast.error("Failed to load initial project & material data");
    } finally {
      setLoading(false);
    }
  };

  // When project changes, fetch active project scope tests
  useEffect(() => {
    if (!selectedProjectId) {
      setProjectScopeTests([]);
      return;
    }
    const proj = projects.find((p) => String(p.project_id) === String(selectedProjectId));
    if (proj && proj.scope_tests) {
      setProjectScopeTests(proj.scope_tests);
    } else {
      // Fallback API call if scope tests embedded or available via projects list
      setProjectScopeTests(proj?.project_scope_tests || []);
    }
  }, [selectedProjectId, projects]);

  const handleAddRow = () => {
    const lastRow = rows[rows.length - 1];
    const newId = rows.length > 0 ? Math.max(...rows.map((r) => r.id)) + 1 : 1;
    setRows([
      ...rows,
      {
        id: newId,
        location_name: lastRow ? lastRow.location_name : "Location A",
        borelog_no: lastRow ? lastRow.borelog_no : "BH-01",
        depth_from: lastRow ? Number((Number(lastRow.depth_to) || 0).toFixed(1)) : 1.0,
        depth_to: lastRow ? Number((Number(lastRow.depth_to) + 0.5).toFixed(1)) : 1.5,
        client_reference: "",
        sample_description: lastRow ? lastRow.sample_description : "Soil sample",
        selected: true,
        required_test_ids: [...selectedCommonTestIds]
      }
    ]);
  };

  const handleDuplicateRow = (id) => {
    const rowToDup = rows.find((r) => r.id === id);
    if (!rowToDup) return;
    const newId = Math.max(...rows.map((r) => r.id)) + 1;
    setRows([
      ...rows,
      {
        ...rowToDup,
        id: newId,
        client_reference: rowToDup.client_reference ? `${rowToDup.client_reference}-COPY` : "",
        selected: true
      }
    ]);
  };

  const handleDeleteRow = (id) => {
    if (rows.length === 1) {
      toast.warning("At least one sample row must remain");
      return;
    }
    setRows(rows.filter((r) => r.id !== id));
  };

  const handleRowChange = (id, field, value) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const toggleSelectAll = (checked) => {
    setRows(rows.map((r) => ({ ...r, selected: checked })));
  };

  const applyCommonTestsToSelected = () => {
    if (selectedCommonTestIds.length === 0) {
      toast.info("Please select at least one required test to apply");
      return;
    }
    setRows(
      rows.map((r) =>
        r.selected ? { ...r, required_test_ids: Array.from(new Set([...r.required_test_ids, ...selectedCommonTestIds])) } : r
      )
    );
    toast.success("Applied required tests to selected rows");
  };

  const handleSubmit = async () => {
    if (!selectedProjectId) {
      toast.error("Please select a project first");
      return;
    }
    const activeRows = rows.filter((r) => r.selected);
    if (activeRows.length === 0) {
      toast.error("Please check at least one sample row to register");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        project_id: selectedProjectId,
        common: {
          material_name: commonMaterial,
          received_date: commonReceivedDate,
          quantity_unit: commonQuantityUnit,
          collection_mode: commonCollectionMode,
          collected_by: commonCollectedBy,
          common_remarks: commonRemarks
        },
        required_test_ids: selectedCommonTestIds,
        samples: activeRows.map((r) => ({
          location_name: r.location_name,
          borelog_no: r.borelog_no,
          depth_from: r.depth_from !== "" ? Number(r.depth_from) : null,
          depth_to: r.depth_to !== "" ? Number(r.depth_to) : null,
          depth_unit: "m",
          client_reference: r.client_reference,
          sample_description: r.sample_description,
          quantity: 1,
          required_test_ids: r.required_test_ids.length > 0 ? r.required_test_ids : selectedCommonTestIds
        }))
      };

      const res = await createSampleEntriesBatch(payload);
      if (res.data?.success) {
        toast.success(res.data.message || `Successfully registered ${activeRows.length} samples!`);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error(res.data?.message || "Failed to register bulk samples");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Error submitting bulk samples");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden border border-gray-100 flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#243744] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Layers className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Bulk Sample Entry — Receipt Register</h2>
              <p className="text-xs text-gray-300">Quickly register 10 to 50+ soil/material samples in a single batch</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-300 hover:text-white" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
          
          {/* Step 1: Common Parameters */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#243744] text-white flex items-center justify-center text-[10px]">1</span>
              Project & Common Batch Metadata
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Project *</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#243744] bg-white"
                >
                  <option value="">-- Select Project --</option>
                  {projects.map((p) => (
                    <option key={p.project_id} value={p.project_id}>
                      {p.project_code} — {p.project_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Material Name *</label>
                <input
                  type="text"
                  value={commonMaterial}
                  onChange={(e) => setCommonMaterial(e.target.value)}
                  placeholder="e.g. Soil / Aggregate"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#243744]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Received Date *</label>
                <input
                  type="date"
                  value={commonReceivedDate}
                  onChange={(e) => setCommonReceivedDate(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#243744]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity Unit</label>
                <input
                  type="text"
                  value={commonQuantityUnit}
                  onChange={(e) => setCommonQuantityUnit(e.target.value)}
                  placeholder="kg / bags / core"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#243744]"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Spreadsheet Editable Table */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#243744] text-white flex items-center justify-center text-[10px]">2</span>
                Sample Rows Register ({rows.length} Rows)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#243744] text-white text-xs font-medium rounded-lg hover:bg-[#1a2832] transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Row
                </button>
              </div>
            </div>

            {/* Editable Table */}
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="p-2.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={rows.every((r) => r.selected)}
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-[#243744] focus:ring-[#243744]"
                      />
                    </th>
                    <th className="p-2.5 w-12 text-center">#</th>
                    <th className="p-2.5">Location *</th>
                    <th className="p-2.5">Borelog / BH No *</th>
                    <th className="p-2.5 w-24">Depth From (m)</th>
                    <th className="p-2.5 w-24">Depth To (m)</th>
                    <th className="p-2.5">Client Ref</th>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5 w-20 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {rows.map((row, idx) => (
                    <tr key={row.id} className={row.selected ? "bg-white" : "bg-gray-50 opacity-60"}>
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={(e) => handleRowChange(row.id, "selected", e.target.checked)}
                          className="rounded border-gray-300 text-[#243744] focus:ring-[#243744]"
                        />
                      </td>
                      <td className="p-2 text-center font-mono text-gray-500 font-semibold">{idx + 1}</td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.location_name}
                          onChange={(e) => handleRowChange(row.id, "location_name", e.target.value)}
                          placeholder="Location A"
                          className="w-full border border-gray-200 rounded px-2 py-1 outline-none focus:border-[#243744]"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.borelog_no}
                          onChange={(e) => handleRowChange(row.id, "borelog_no", e.target.value)}
                          placeholder="BH-01"
                          className="w-full border border-gray-200 rounded px-2 py-1 outline-none focus:border-[#243744] font-medium"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.1"
                          value={row.depth_from}
                          onChange={(e) => handleRowChange(row.id, "depth_from", e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1 outline-none focus:border-[#243744] text-right font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.1"
                          value={row.depth_to}
                          onChange={(e) => handleRowChange(row.id, "depth_to", e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1 outline-none focus:border-[#243744] text-right font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.client_reference}
                          onChange={(e) => handleRowChange(row.id, "client_reference", e.target.value)}
                          placeholder="CR-01"
                          className="w-full border border-gray-200 rounded px-2 py-1 outline-none focus:border-[#243744]"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.sample_description}
                          onChange={(e) => handleRowChange(row.id, "sample_description", e.target.value)}
                          placeholder="Disturbed Soil"
                          className="w-full border border-gray-200 rounded px-2 py-1 outline-none focus:border-[#243744]"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateRow(row.id)}
                            title="Duplicate Row"
                            className="p-1 text-gray-400 hover:text-[#243744] hover:bg-gray-100 rounded"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row.id)}
                            title="Delete Row"
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
          <div className="text-xs text-gray-500 font-medium">
            Ready to register <span className="font-bold text-[#243744]">{rows.filter((r) => r.selected).length}</span> sample(s) for initial receipt
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2 bg-[#243744] text-white text-xs font-semibold rounded-xl hover:bg-[#1a2832] transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save All {rows.filter((r) => r.selected).length} Samples
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
