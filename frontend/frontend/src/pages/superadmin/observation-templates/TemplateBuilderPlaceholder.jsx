import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast, Toaster } from "sonner";
import {
  AlignLeft, ArrowLeft, BarChart3, Calculator, Calendar, CheckSquare, Clock,
  ClipboardList, Columns3, Eye, FileText, Hash, Image, ListChecks, PanelRight,
  PenLine, QrCode, Save, Send, Sigma, Table2, Upload, Wrench,
} from "lucide-react";
import { MainLayout } from "../../../components/layout";
import { Badge, Button } from "../../../components/ui";
import { observationTemplatesApi } from "../../../api/observationTemplates";

const componentGroups = [
  {
    title: "Basic Components",
    items: [
      { type: "section", label: "Section", icon: Columns3, description: "Logical observation sheet block" },
      { type: "single_input", label: "Single Input", icon: AlignLeft, description: "Text observation value" },
      { type: "number_input", label: "Number Input", icon: Hash, description: "Numeric reading or value" },
      { type: "date", label: "Date", icon: Calendar, description: "Date captured by lab user" },
      { type: "time", label: "Time", icon: Clock, description: "Time captured by lab user" },
      { type: "dropdown", label: "Dropdown", icon: ListChecks, description: "Controlled list of values" },
      { type: "checkbox", label: "Checkbox", icon: CheckSquare, description: "Binary observation field" },
      { type: "remarks", label: "Remarks", icon: FileText, description: "Free-form lab comments" },
    ],
  },
  {
    title: "Observation Components",
    items: [
      { type: "observation_table", label: "Observation Table", icon: Table2, description: "Excel-like readings grid" },
      { type: "reading", label: "Reading", icon: ClipboardList, description: "Single measured reading" },
      { type: "multiple_readings", label: "Multiple Readings", icon: Columns3, description: "Repeatable readings set" },
      { type: "unit", label: "Unit", icon: Sigma, description: "Measurement unit display" },
      { type: "equipment", label: "Equipment", icon: Wrench, description: "Instrument or equipment reference" },
      { type: "sample_details", label: "Sample Details", icon: ClipboardList, description: "Sample metadata block" },
    ],
  },
  {
    title: "Calculation Components",
    items: [
      { type: "calculated_field", label: "Calculated Field", icon: Calculator, description: "Formula-backed value" },
      { type: "formula", label: "Formula", icon: Sigma, description: "Formula definition block" },
      { type: "result", label: "Result", icon: FileText, description: "Calculated or entered result" },
      { type: "acceptance_criteria", label: "Acceptance Criteria", icon: ListChecks, description: "Limits and criteria" },
      { type: "pass_fail", label: "Pass / Fail", icon: CheckSquare, description: "Judgement outcome" },
    ],
  },
  {
    title: "Advanced Components",
    items: [
      { type: "image_upload", label: "Image Upload", icon: Image, description: "Observation image evidence" },
      { type: "attachment", label: "Attachment", icon: Upload, description: "Supporting file upload" },
      { type: "signature", label: "Signature", icon: PenLine, description: "Reviewer or analyst sign-off" },
      { type: "qr_barcode", label: "QR / Barcode", icon: QrCode, description: "Traceability identifier" },
      { type: "graph_placeholder", label: "Graph Placeholder", icon: BarChart3, description: "Future plotted result area" },
    ],
  },
];

const componentMeta = componentGroups
  .flatMap((group) => group.items)
  .reduce((lookup, item) => ({ ...lookup, [item.type]: item }), {});

const statusVariant = (status) => {
  if (status === "Published") return "success";
  if (status === "Archived") return "neutral";
  return "warning";
};

const createDefaultProperties = (type) => {
  const label = componentMeta[type]?.label || "Component";
  const base = {
    label,
    field_name: label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
    required: false,
    read_only: false,
  };

  const byType = {
    section: { title: "New Section", description: "", collapsible: false },
    single_input: { ...base, unit: "", default_value: "", validation: "" },
    number_input: { ...base, unit: "", default_value: "", validation: "numeric", precision: 2 },
    date: { ...base, default_value: "", validation: "date" },
    time: { ...base, default_value: "", validation: "time" },
    dropdown: { ...base, options: "Option 1\nOption 2", default_value: "" },
    checkbox: { ...base, default_checked: false },
    remarks: { ...base, placeholder: "Enter remarks", rows: 4 },
    observation_table: {
      label: "Observation Table",
      columns: "Reading No.\nObservation\nUnit\nRemarks",
      rows: 5,
      units: "",
      allow_multiple_entries: true,
    },
    reading: { ...base, unit: "", reading_type: "Observed" },
    multiple_readings: { ...base, unit: "", count: 3, allow_multiple_entries: true },
    unit: { label: "Unit", unit: "", applies_to: "" },
    equipment: { label: "Equipment", field_name: "equipment", required: false, calibration_required: true },
    sample_details: { label: "Sample Details", fields: "Sample ID\nSample Name\nQuantity\nCondition" },
    calculated_field: { ...base, formula: "", precision: 2, decimal_places: 2, dependencies: "" },
    formula: { label: "Formula", formula: "", dependencies: "", notes: "" },
    result: { label: "Result", pass_criteria: "", fail_criteria: "", result_format: "Text" },
    acceptance_criteria: { label: "Acceptance Criteria", pass_criteria: "", fail_criteria: "", result_format: "Pass / Fail" },
    pass_fail: { label: "Pass / Fail", pass_criteria: "", fail_criteria: "", result_format: "Badge" },
    image_upload: { label: "Image Upload", required: false, max_files: 1 },
    attachment: { label: "Attachment", required: false, allowed_types: "pdf,xlsx,jpg,png" },
    signature: { label: "Signature", role: "Analyst", required: true },
    qr_barcode: { label: "QR / Barcode", source: "Sample ID", format: "QR" },
    graph_placeholder: { label: "Graph Placeholder", graph_type: "Line", data_source: "" },
  };

  return byType[type] || base;
};

const createComponent = (type, order) => ({
  id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  type,
  order,
  parent: null,
  layout: {
    width: type === "observation_table" || type === "section" ? "full" : "half",
    row: order,
    column: 1,
  },
  properties: createDefaultProperties(type),
});

const EmptyObservationSheet = () => (
  <div className="space-y-5">
    <div className="border-b border-[#1E293B] pb-3 text-center">
      <h2 className="text-xl font-bold text-[#1E293B]">Observation Sheet</h2>
      <p className="mt-1 text-sm text-[#64748B]">Template canvas for laboratory readings and results</p>
    </div>
    {[
      ["Section", "Sample Information", "(Add Fields Here)"],
      ["Observation Table", "Observation Readings", "(Add Table Here)"],
      ["Calculated Results", "Result Calculations", "(Add Formula Here)"],
      ["Remarks", "Analyst Remarks", ""],
    ].map(([eyebrow, title, hint]) => (
      <section key={title} className="border border-[#D4DBE2] bg-white">
        <div className="border-b border-[#E3E7EC] bg-[#F8FAFC] px-4 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">{eyebrow}</p>
          <h3 className="text-sm font-bold text-[#1E293B]">{title}</h3>
        </div>
        <div className="min-h-[82px] px-4 py-5 text-center text-sm font-semibold text-[#94A3B8]">{hint}</div>
      </section>
    ))}
  </div>
);

const BuilderComponentCard = ({ component, selected, onSelect }) => {
  const meta = componentMeta[component.type] || { label: component.type, icon: PanelRight };
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(component.id)}
      className={`w-full border p-4 text-left transition-colors ${
        selected ? "border-[#23395B] bg-[#F8FAFC]" : "border-[#D4DBE2] bg-white hover:bg-[#FAFBFC]"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F4F5F7] text-[#23395B]">
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#1E293B]">{component.properties?.label || component.properties?.title || meta.label}</p>
          <p className="mt-1 text-xs text-[#64748B]">{meta.label} - order {(component.order || 0) + 1}</p>
        </div>
      </div>
    </button>
  );
};

const PreviewComponent = ({ component }) => {
  const props = component.properties || {};
  const label = props.label || props.title || componentMeta[component.type]?.label || component.type;

  if (component.type === "section") {
    return (
      <section className="border border-[#CBD5E1]">
        <div className="bg-[#F8FAFC] px-4 py-2 font-bold">{props.title || label}</div>
        <div className="min-h-[56px] px-4 py-3 text-sm text-[#64748B]">{props.description || "Section fields will appear here."}</div>
      </section>
    );
  }

  if (component.type === "observation_table") {
    const columns = String(props.columns || "").split("\n").filter(Boolean);
    const rows = Number(props.rows || 3);
    return (
      <section>
        <h3 className="mb-2 text-sm font-bold">{label}</h3>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>{columns.map((column) => <th key={column} className="border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-left">{column}</th>)}</tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>{columns.map((column) => <td key={`${rowIndex}-${column}`} className="h-10 border border-[#CBD5E1] px-3 py-2" />)}</tr>
            ))}
          </tbody>
        </table>
      </section>
    );
  }

  if (["remarks", "attachment", "image_upload", "signature", "graph_placeholder"].includes(component.type)) {
    return (
      <label className="block">
        <span className="text-sm font-bold">{label}</span>
        <div className="mt-2 min-h-[72px] border border-[#CBD5E1] bg-[#FAFBFC] px-3 py-2 text-sm text-[#94A3B8]">
          {componentMeta[component.type]?.description}
        </div>
      </label>
    );
  }

  return (
    <label className="grid grid-cols-[220px_minmax(0,1fr)_80px] items-center gap-3 text-sm">
      <span className="font-semibold">{label}{props.required ? " *" : ""}</span>
      <input className="h-10 border border-[#CBD5E1] px-3" readOnly placeholder={props.default_value || ""} />
      <span className="text-[#64748B]">{props.unit || ""}</span>
    </label>
  );
};

const ObservationRenderer = ({ template, components }) => {
  const ordered = [...components].sort((left, right) => (left.order || 0) - (right.order || 0));

  return (
    <div className="mx-auto max-w-[920px] bg-white p-8 text-[#1E293B]">
      <div className="border-b-2 border-[#1E293B] pb-4">
        <h2 className="text-center text-xl font-bold">Observation Sheet</h2>
        <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <span>Template: <strong>{template?.name || "-"}</strong></span>
          <span>Version: <strong>{template?.version || "-"}</strong></span>
          <span>Material: <strong>{template?.material || "-"}</strong></span>
          <span>Test: <strong>{template?.test || "-"}</strong></span>
          <span>Standard: <strong>{template?.standard || "-"}</strong></span>
          <span>Status: <strong>{template?.status || "Draft"}</strong></span>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {ordered.length === 0 ? (
          <EmptyObservationSheet />
        ) : (
          ordered.map((component) => <PreviewComponent key={component.id} component={component} />)
        )}
      </div>
    </div>
  );
};

const PropertyField = ({ label, value, onChange, type = "text", textarea = false }) => (
  <label className="block">
    <span className="app-label">{label}</span>
    {textarea ? (
      <textarea className="app-input min-h-[86px]" value={value || ""} onChange={(event) => onChange(event.target.value)} />
    ) : (
      <input className="app-input" type={type} value={value ?? ""} onChange={(event) => onChange(type === "number" ? Number(event.target.value) : event.target.value)} />
    )}
  </label>
);

const PropertyToggle = ({ label, checked, onChange }) => (
  <label className="flex items-center justify-between gap-3 rounded-xl border border-[#E3E7EC] px-3 py-2 text-sm font-semibold text-[#1E293B]">
    {label}
    <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} />
  </label>
);

const PropertiesPanel = ({ component, onChange }) => {
  if (!component) {
    return (
      <div className="mt-4 rounded-[20px] border border-dashed border-[#D4DBE2] bg-[#FAFBFC] p-5 text-center">
        <PanelRight className="mx-auto text-[#94A3B8]" size={24} />
        <h2 className="mt-3 text-sm font-bold text-[#1E293B]">No component selected.</h2>
      </div>
    );
  }

  const props = component.properties || {};
  const setProp = (key, value) => onChange(component.id, { ...props, [key]: value });
  const isField = ["single_input", "number_input", "date", "time", "dropdown", "checkbox", "remarks", "reading", "multiple_readings", "calculated_field"].includes(component.type);

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-[16px] border border-[#E3E7EC] bg-[#FAFBFC] p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Selected Component</p>
        <h2 className="mt-1 text-base font-bold text-[#1E293B]">{componentMeta[component.type]?.label || component.type}</h2>
      </div>

      {component.type === "section" && (
        <>
          <PropertyField label="Section Title" value={props.title} onChange={(value) => setProp("title", value)} />
          <PropertyField label="Description" value={props.description} onChange={(value) => setProp("description", value)} textarea />
          <PropertyToggle label="Collapsible" checked={props.collapsible} onChange={(value) => setProp("collapsible", value)} />
        </>
      )}

      {isField && (
        <>
          <PropertyField label="Label" value={props.label} onChange={(value) => setProp("label", value)} />
          <PropertyField label="Field Name" value={props.field_name} onChange={(value) => setProp("field_name", value)} />
          {"unit" in props && <PropertyField label="Unit" value={props.unit} onChange={(value) => setProp("unit", value)} />}
          {"default_value" in props && <PropertyField label="Default Value" value={props.default_value} onChange={(value) => setProp("default_value", value)} />}
          {"validation" in props && <PropertyField label="Validation" value={props.validation} onChange={(value) => setProp("validation", value)} />}
          {"options" in props && <PropertyField label="Options" value={props.options} onChange={(value) => setProp("options", value)} textarea />}
          {"formula" in props && <PropertyField label="Formula" value={props.formula} onChange={(value) => setProp("formula", value)} textarea />}
          {"precision" in props && <PropertyField label="Precision" type="number" value={props.precision} onChange={(value) => setProp("precision", value)} />}
          {"decimal_places" in props && <PropertyField label="Decimal Places" type="number" value={props.decimal_places} onChange={(value) => setProp("decimal_places", value)} />}
          {"dependencies" in props && <PropertyField label="Dependencies" value={props.dependencies} onChange={(value) => setProp("dependencies", value)} textarea />}
          <PropertyToggle label="Required" checked={props.required} onChange={(value) => setProp("required", value)} />
          <PropertyToggle label="Read Only" checked={props.read_only} onChange={(value) => setProp("read_only", value)} />
        </>
      )}

      {component.type === "observation_table" && (
        <>
          <PropertyField label="Label" value={props.label} onChange={(value) => setProp("label", value)} />
          <PropertyField label="Columns" value={props.columns} onChange={(value) => setProp("columns", value)} textarea />
          <PropertyField label="Rows" type="number" value={props.rows} onChange={(value) => setProp("rows", value)} />
          <PropertyField label="Units" value={props.units} onChange={(value) => setProp("units", value)} />
          <PropertyToggle label="Allow Multiple Entries" checked={props.allow_multiple_entries} onChange={(value) => setProp("allow_multiple_entries", value)} />
        </>
      )}

      {["result", "acceptance_criteria", "pass_fail"].includes(component.type) && (
        <>
          <PropertyField label="Result" value={props.label} onChange={(value) => setProp("label", value)} />
          <PropertyField label="Pass Criteria" value={props.pass_criteria} onChange={(value) => setProp("pass_criteria", value)} textarea />
          <PropertyField label="Fail Criteria" value={props.fail_criteria} onChange={(value) => setProp("fail_criteria", value)} textarea />
          <PropertyField label="Result Format" value={props.result_format} onChange={(value) => setProp("result_format", value)} />
        </>
      )}

      {!isField && !["section", "observation_table", "result", "acceptance_criteria", "pass_fail"].includes(component.type) && (
        <>
          <PropertyField label="Label" value={props.label} onChange={(value) => setProp("label", value)} />
          {Object.keys(props).filter((key) => key !== "label").map((key) => (
            <PropertyField key={key} label={key.replace(/_/g, " ")} value={props[key]} onChange={(value) => setProp(key, value)} />
          ))}
        </>
      )}
    </div>
  );
};

const TemplateBuilderPlaceholder = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [builder, setBuilder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);

  const components = useMemo(() => builder?.components || [], [builder]);
  const selectedComponent = components.find((component) => component.id === selectedId);

  useEffect(() => {
    const fetchBuilder = async () => {
      try {
        setLoading(true);
        const response = await observationTemplatesApi.getBuilder(templateId);
        setTemplate(response.data.data.template);
        setBuilder(response.data.data.builder);
      } catch (requestError) {
        toast.error(requestError.response?.data?.message || "Failed to load template builder");
      } finally {
        setLoading(false);
      }
    };
    fetchBuilder();
  }, [templateId]);

  const addComponent = (type) => {
    const next = createComponent(type, components.length);
    setBuilder((current) => {
      const currentComponents = current?.components || [];
      const nextComponents = [...currentComponents, next];
      return {
        ...(current || {}),
        sections: nextComponents.filter((component) => component.type === "section"),
        components: nextComponents,
        component_order: nextComponents.map((component) => component.id),
        properties: {
          ...(current?.properties || {}),
          schema_version: "observation-builder-v2",
          output: "lab_observation_sheet",
        },
      };
    });
    setSelectedId(next.id);
  };

  const updateComponentProperties = (id, properties) => {
    setBuilder((current) => {
      const nextComponents = (current?.components || []).map((component) => (
        component.id === id ? { ...component, properties } : component
      ));
      return {
        ...(current || {}),
        sections: nextComponents.filter((component) => component.type === "section"),
        components: nextComponents,
      };
    });
  };

  const saveBuilderDraft = async () => {
    const nextComponents = components.map((component, index) => ({ ...component, order: index }));
    const payload = {
      sections: nextComponents.filter((component) => component.type === "section"),
      components: nextComponents,
      properties: {
        ...(builder?.properties || {}),
        schema_version: "observation-builder-v2",
        output: "lab_observation_sheet",
      },
      component_order: nextComponents.map((component) => component.id),
      formula_mapping: builder?.formula_mapping || {},
      report_mapping: builder?.report_mapping || {},
    };
    const response = await observationTemplatesApi.saveBuilder(templateId, payload);
    setTemplate(response.data.data.template);
    setBuilder(response.data.data.builder);
    setLastSaved(new Date());
    return response;
  };

  const saveDraft = async () => {
    try {
      setSaving(true);
      await saveBuilderDraft();
      toast.success("Builder draft saved");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Failed to save builder draft");
    } finally {
      setSaving(false);
    }
  };

  const publishTemplate = async () => {
    try {
      setSaving(true);
      await saveBuilderDraft();
      const response = await observationTemplatesApi.publish(templateId);
      setTemplate(response.data.data);
      toast.success("Template published");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Failed to publish template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout headerTitle="Template Builder" headerSubtitle="Observation sheet builder workspace">
      <Toaster position="top-right" richColors />
      <div className="flex h-[calc(100vh-73px)] flex-col overflow-hidden bg-[#F4F5F7]">
        <header className="border-b border-[#E3E7EC] bg-white px-4 py-3 sm:px-5 lg:px-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" className="app-icon-button" onClick={() => navigate("/superadmin/observation-templates")} aria-label="Back to templates">
                <ArrowLeft size={18} />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-lg font-bold text-[#1E293B]">{template?.name || "Observation Template"}</h1>
                  <Badge variant={statusVariant(template?.status || "Draft")}>{template?.status || "Draft"}</Badge>
                </div>
                <p className="mt-0.5 text-sm text-[#64748B]">Builder creates a template. Preview renders the lab observation sheet.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={Save} loading={saving} onClick={saveDraft}>Save Draft</Button>
              <Button icon={Send} loading={saving} onClick={publishTemplate}>Publish</Button>
              <Button variant={previewMode ? "primary" : "secondary"} icon={Eye} onClick={() => setPreviewMode((current) => !current)}>
                {previewMode ? "Builder" : "Preview"}
              </Button>
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[300px_minmax(0,1fr)_340px]">
          <aside className="min-h-0 overflow-y-auto border-b border-[#E3E7EC] bg-white p-4 xl:border-b-0 xl:border-r">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Observation Sheet Components</p>
            <div className="mt-4 space-y-5">
              {componentGroups.map((group) => (
                <section key={group.title}>
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#1E293B]">{group.title}</h2>
                  <div className="space-y-2">
                    {group.items.map((component) => (
                      <button
                        key={component.type}
                        type="button"
                        onClick={() => addComponent(component.type)}
                        className="flex w-full items-start gap-3 rounded-xl border border-[#E3E7EC] bg-white p-3 text-left transition-colors hover:bg-[#F4F5F7]"
                        title="Click to add. Drag-and-drop will be added in a later phase."
                      >
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F4F5F7] text-[#23395B]">
                          <component.icon size={18} />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-[#1E293B]">{component.label}</span>
                          <span className="mt-0.5 block text-xs text-[#64748B]">{component.description}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </aside>

          <main className="min-h-0 overflow-y-auto p-4 sm:p-6">
            {previewMode ? (
              <section className="mx-auto max-w-[980px] border border-[#D4DBE2] bg-white" style={{ boxShadow: "var(--shadow-sm)" }}>
                <ObservationRenderer template={template} components={components} />
              </section>
            ) : (
              <section className="mx-auto min-h-[760px] max-w-[980px] rounded-[14px] border border-[#D4DBE2] bg-white p-6" style={{ boxShadow: "var(--shadow-sm)" }}>
                {loading ? (
                  <div className="lab-skeleton h-[480px]" />
                ) : (
                  <div className="space-y-5">
                    <div className="border-b-2 border-[#1E293B] pb-4 text-center">
                      <h2 className="text-xl font-bold text-[#1E293B]">Observation Sheet</h2>
                      <p className="mt-1 text-sm text-[#64748B]">Design canvas for the lab user's observation form</p>
                    </div>
                    {components.length === 0 ? (
                      <EmptyObservationSheet />
                    ) : (
                      <div className="space-y-3">
                        {[...components].sort((left, right) => (left.order || 0) - (right.order || 0)).map((component) => (
                          <BuilderComponentCard
                            key={component.id}
                            component={component}
                            selected={selectedId === component.id}
                            onSelect={setSelectedId}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
          </main>

          <aside className="min-h-0 overflow-y-auto border-t border-[#E3E7EC] bg-white p-4 xl:border-l xl:border-t-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Properties Panel</p>
            <PropertiesPanel component={selectedComponent} onChange={updateComponentProperties} />
          </aside>
        </div>

        <footer className="border-t border-[#E3E7EC] bg-white px-4 py-3 text-sm text-[#64748B] sm:px-5 lg:px-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span>Template Status: <strong className="text-[#1E293B]">{template?.status || "Draft"}</strong></span>
            <span>Last Saved: <strong className="text-[#1E293B]">{lastSaved ? lastSaved.toLocaleTimeString() : template?.updated_at ? new Date(template.updated_at).toLocaleString() : "Not saved"}</strong></span>
            <span>Version: <strong className="text-[#1E293B]">{template?.version || "Auto"}</strong></span>
            <span>Created By: <strong className="text-[#1E293B]">{template?.created_by || "System"}</strong></span>
          </div>
        </footer>
      </div>
    </MainLayout>
  );
};

export default TemplateBuilderPlaceholder;
