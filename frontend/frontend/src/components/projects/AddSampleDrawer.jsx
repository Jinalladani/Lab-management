import React, { useEffect, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import SearchableSelect from "./SearchableSelect";
import { createSampleEntry } from "../../api/sampleMaster";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const today = () => new Date().toISOString().split("T")[0];

const REGISTER_MATERIALS = [
  "Soil", "Aggregate", "Concrete", "Cement", "Bitumen", "Steel / Rebar", "Rock", "Water", "Fly Ash", "Geotextile"
];

const Field = ({ label, required, children, className = "", error }) => (
  <div className={className}>
    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
      {label}
      {required ? <span className="text-red-500"> *</span> : ""}
    </label>
    {children}
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

const inputClass =
  "w-full border border-gray-300 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#243744]/10 focus:border-[#243744] bg-white text-sm font-medium transition-all";

const AddSampleDrawer = ({ open, project, projectOptions = [], onClose, onSaved }) => {
  const [selectedProject, setSelectedProject] = useState(project || null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    project_id: "",
    material_name: "",
    quantity_received: "",
    quantity_unit: "Nos",
    received_date: today(),
    client_reference: "",
    received_condition: "Good",
    received_by: "",
    remarks: ""
  });

  useEffect(() => {
    if (!open) return;
    if (project) {
      setSelectedProject(project);
      setForm({
        project_id: project.project_id,
        material_name: "",
        quantity_received: "",
        quantity_unit: "Nos",
        received_date: today(),
        client_reference: "",
        received_condition: "Good",
        received_by: "",
        remarks: ""
      });
    } else {
      setForm({
        project_id: "",
        material_name: "",
        quantity_received: "",
        quantity_unit: "Nos",
        received_date: today(),
        client_reference: "",
        received_condition: "Good",
        received_by: "",
        remarks: ""
      });
    }

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, project, onClose]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pid = selectedProject?.project_id || form.project_id;
    if (!pid) {
      toast.error("Please select a project");
      return;
    }
    if (!form.material_name) {
      toast.error("Please select a material");
      return;
    }
    if (!form.quantity_received || form.quantity_received < 1) {
      toast.error("Please enter a valid quantity received");
      return;
    }

    try {
      setLoading(true);
      await createSampleEntry({
        ...form,
        project_id: pid,
        client_name: selectedProject?.client_name || "Client"
      });
      toast.success("Sample receipt No. recorded successfully!");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record sample receipt");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-[#243744]">Receive Sample Material Lot</h2>
            <p className="text-xs text-gray-500 mt-0.5">Record quantity received without entering individual sample rows at receipt time.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-200/50 transition-colors"
          >
            <CloseIcon fontSize="small" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
          
          <Field label="Project" required>
            <SearchableSelect
              options={projectOptions.map((p) => ({
                id: p.project_id,
                title: `${p.project_code} - ${p.project_name}`,
                subtitle: p.client_name,
                raw: p,
              }))}
              value={selectedProject ? `${selectedProject.project_code} - ${selectedProject.project_name}` : ""}
              placeholder="Search or select project..."
              onSelect={(opt) => {
                setSelectedProject(opt?.raw || null);
                if (opt?.raw) handleChange("project_id", opt.raw.project_id);
              }}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Material / Sample Type" required>
              <select
                value={form.material_name}
                onChange={(e) => handleChange("material_name", e.target.value)}
                className={inputClass}
              >
                <option value="">Select Material / Sample Type...</option>
                {REGISTER_MATERIALS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </Field>

            <Field label="Quantity Received" required>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  value={form.quantity_received}
                  onChange={(e) => handleChange("quantity_received", e.target.value === "" ? "" : parseInt(e.target.value) || "")}
                  className={inputClass}
                  placeholder="e.g. 50"
                />
                <select
                  value={form.quantity_unit}
                  onChange={(e) => handleChange("quantity_unit", e.target.value)}
                  className="w-24 border border-gray-300 rounded-xl px-2 py-2.5 text-xs font-semibold bg-gray-50 outline-none"
                >
                  <option value="Nos">Nos</option>
                  <option value="Bags">Bags</option>
                  <option value="Boxes">Boxes</option>
                  <option value="Kg">Kg</option>
                </select>
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Received Date" required>
              <input
                type="date"
                value={form.received_date}
                onChange={(e) => handleChange("received_date", e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Sample Condition">
              <select
                value={form.received_condition}
                onChange={(e) => handleChange("received_condition", e.target.value)}
                className={inputClass}
              >
                <option value="Good">Good / Intact</option>
                <option value="Disturbed">Disturbed</option>
                <option value="Undisturbed">Undisturbed</option>
                <option value="Damaged">Damaged</option>
              </select>
            </Field>
          </div>

          <Field label="Client Reference (Letter / Chain of Custody)">
            <input
              type="text"
              value={form.client_reference}
              onChange={(e) => handleChange("client_reference", e.target.value)}
              placeholder="e.g. Letter Ref: HW-2026/08/12"
              className={inputClass}
            />
          </Field>

          <Field label="Received By">
            <input
              type="text"
              value={form.received_by}
              onChange={(e) => handleChange("received_by", e.target.value)}
              placeholder="Lab Tech / Receiving Officer"
              className={inputClass}
            />
          </Field>

          <Field label="Remarks / Receipt Notes">
            <textarea
              rows={3}
              value={form.remarks}
              onChange={(e) => handleChange("remarks", e.target.value)}
              placeholder="e.g. Samples received from multiple boreholes/locations."
              className={inputClass}
            />
          </Field>

        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200/60 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#243744] hover:bg-[#1A2733] rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Recording Receipt...</span>
              </>
            ) : (
              <span>Save Receipt</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AddSampleDrawer;
