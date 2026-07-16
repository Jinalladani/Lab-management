import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "sonner";
import { ArrowRight, Save } from "lucide-react";
import { MainLayout } from "../../../components/layout";
import { Button } from "../../../components/ui";
import { observationTemplatesApi } from "../../../api/observationTemplates";

const Workspace = ({ children }) => (
  <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-5 lg:px-6">
    <div className="space-y-6">{children}</div>
  </div>
);

const emptyForm = {
  name: "",
  material: "",
  material_id: null,
  test: "",
  test_id: null,
  standard: "",
  standard_id: null,
  description: "",
  status: "Draft",
};

const extractApiMessage = (requestError, fallback) => {
  if (!requestError.response) {
    return "Network error. Please check the server connection and try again.";
  }
  return requestError.response?.data?.message || fallback;
};

const emptyOptions = {
  materials: [],
  tests: [],
  standards: [],
  material_records: [],
  test_records: [],
  standard_records: [],
};

const CreatableSelect = ({ label, required, value, options, onSelect, onCreate, placeholder, disabled }) => {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return options.filter((option) => option.name.toLowerCase().includes(needle));
  }, [options, query]);
  const canCreate = query.trim() && !options.some((option) => option.name.toLowerCase() === query.trim().toLowerCase());

  return (
    <label>
      <span className="app-label">{label}{required ? " *" : ""}</span>
      <input
        className="app-input"
        value={query || value}
        placeholder={placeholder}
        required={required}
        disabled={disabled || creating}
        onChange={(event) => {
          setQuery(event.target.value);
          onSelect({ id: null, name: event.target.value });
        }}
      />
      {(filtered.length > 0 || canCreate) && (
        <div className="mt-2 max-h-36 overflow-y-auto rounded-xl border border-[#E3E7EC] bg-white p-1">
          {filtered.slice(0, 6).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onSelect(option);
                setQuery("");
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#F4F5F7]"
            >
              {option.name}
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              disabled={creating}
              onClick={async () => {
                try {
                  setCreating(true);
                  const created = await onCreate(query.trim());
                  onSelect(created);
                  setQuery("");
                } finally {
                  setCreating(false);
                }
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#23395B] hover:bg-[#F4F5F7]"
            >
              {creating ? "Creating..." : `+ Create New "${query.trim()}"`}
            </button>
          )}
        </div>
      )}
    </label>
  );
};

const CreateObservationTemplate = () => {
  const [form, setForm] = useState(emptyForm);
  const [options, setOptions] = useState(emptyOptions);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const normalizeOptions = (data = emptyOptions) => ({
    materials: data.material_records || (data.materials || []).map((name) => ({ id: name, name })),
    tests: data.test_records || (data.tests || []).map((name) => ({ id: name, name })),
    standards: data.standard_records || (data.standards || []).map((name) => ({ id: name, name })),
    material_records: data.material_records || [],
    test_records: data.test_records || [],
    standard_records: data.standard_records || [],
  });

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const response = await observationTemplatesApi.options();
        setOptions(normalizeOptions(response.data.data));
      } catch {
        setOptions(emptyOptions);
      }
    };
    fetchOptions();
  }, []);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const selectMaster = (nameField, idField, record) => {
    setForm((current) => ({
      ...current,
      [nameField]: record.name,
      [idField]: record.id || record[idField] || null,
    }));
  };

  const createMaster = async (kind, optionKey, name) => {
    try {
      const response = await observationTemplatesApi.masters.create(kind, { name });
      const created = response.data.data;
      setOptions((current) => ({
        ...current,
        [optionKey]: [...current[optionKey].filter((item) => item.id !== created.id), created]
          .sort((left, right) => left.name.localeCompare(right.name)),
      }));
      toast.success(`${created.name} created`);
      return created;
    } catch (requestError) {
      toast.error(extractApiMessage(requestError, `Failed to create ${kind}`));
      throw requestError;
    }
  };

  const validateForm = () => {
    const missing = [];
    if (!form.name.trim()) missing.push("Template Name");
    if (!form.material.trim()) missing.push("Material");
    if (!form.test.trim()) missing.push("Test");
    if (!form.standard.trim()) missing.push("Standard");
    if (missing.length) {
      toast.error(`Missing required fields: ${missing.join(", ")}`);
      return false;
    }
    return true;
  };

  const createTemplate = async (overrides = {}) => {
    if (!validateForm()) return null;
    const response = await observationTemplatesApi.create({ ...form, ...overrides });
    return response.data.data;
  };

  const saveDraft = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const template = await createTemplate({ status: "Draft" });
      if (!template) return;
      toast.success("Draft template saved");
      navigate("/superadmin/observation-templates");
    } catch (requestError) {
      toast.error(extractApiMessage(requestError, "Failed to save template"));
    } finally {
      setSaving(false);
    }
  };

  const continueToBuilder = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const template = await createTemplate();
      if (!template) return;
      toast.success("Template metadata saved");
      navigate(`/superadmin/observation-templates/${template.id}/builder`);
    } catch (requestError) {
      toast.error(extractApiMessage(requestError, "Failed to create template"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout headerTitle="Create Observation Template" headerSubtitle="Step 1: template metadata">
      <Workspace>
        <Toaster position="top-right" richColors />
        <form className="rounded-[20px] border border-[#E3E7EC] bg-white p-5 sm:p-6" style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="rounded-2xl border border-[#E3E7EC] bg-[#F4F5F7] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Step 1</p>
            <h2 className="mt-1 text-lg font-bold text-[#1E293B]">Basic Information</h2>
            <p className="mt-1 text-sm text-[#64748B]">Create the draft foundation. Builder workspace opens after this step.</p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="md:col-span-2">
              <span className="app-label">Template Name *</span>
              <input className="app-input" value={form.name} onChange={(event) => updateField("name", event.target.value)} required />
            </label>
            <CreatableSelect
              label="Material"
              required
              value={form.material}
              options={options.materials}
              placeholder="Search or create material"
              disabled={saving}
              onSelect={(record) => selectMaster("material", "material_id", record)}
              onCreate={(name) => createMaster("materials", "materials", name)}
            />
            <CreatableSelect
              label="Test"
              required
              value={form.test}
              options={options.tests}
              placeholder="Search or create test"
              disabled={saving}
              onSelect={(record) => selectMaster("test", "test_id", record)}
              onCreate={(name) => createMaster("tests", "tests", name)}
            />
            <CreatableSelect
              label="Standard"
              required
              value={form.standard}
              options={options.standards}
              placeholder="Search or create standard"
              disabled={saving}
              onSelect={(record) => selectMaster("standard", "standard_id", record)}
              onCreate={(name) => createMaster("standards", "standards", name)}
            />
            <label>
              <span className="app-label">Status</span>
              <select className="app-select" value={form.status} onChange={(event) => updateField("status", event.target.value)}>
                <option value="Draft">Draft</option>
                <option value="Published">Published</option>
              </select>
            </label>
            <label>
              <span className="app-label">Version</span>
              <input className="app-input" value="Auto" readOnly />
            </label>
            <label className="md:col-span-2">
              <span className="app-label">Description</span>
              <textarea className="app-input min-h-[120px]" value={form.description} onChange={(event) => updateField("description", event.target.value)} />
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-[#EDF0F3] pt-5 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => navigate("/superadmin/observation-templates")}>Cancel</Button>
            <Button type="submit" variant="secondary" icon={Save} loading={saving} onClick={saveDraft}>Save Draft</Button>
            <Button type="submit" iconRight={ArrowRight} loading={saving} onClick={continueToBuilder}>Continue to Builder</Button>
          </div>
        </form>
      </Workspace>
    </MainLayout>
  );
};

export default CreateObservationTemplate;
