import React, { useEffect, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SearchableSelect from "./SearchableSelect";
import {
  createSampleEntriesBatch,
  getUsers,
  updateSampleEntry,
} from "../../api/sampleMaster";
import { getScopeMaterials } from "../../api/scope";
import {
  MAX_PHOTOS_PER_SAMPLE,
  REGISTER_MATERIALS,
  SAMPLE_SOURCES,
  RECEIVED_CONDITIONS,
  SAMPLE_PRIORITIES,
  RECEIPT_STATUSES,
} from "../../constants/sampleRegister";

const today = () => new Date().toISOString().split("T")[0];

const getUserName = (user) =>
  [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
  user.name ||
  user.email ||
  "";

const createEmptySample = () => ({
  id: Date.now(),
  sample_entry_id: null,
  letter_date: today(),
  material_name: "",
  quantity: "",
  sample_received_date: today(),
  received_date: today(),
  sample_source: "",
  received_condition: "",
  sample_location: "",
  sample_priority: "Normal",
  status: "Received",
  received_by: "",
  remarks: "",
  photos: [],
});

const Field = ({ label, required, children, className = "", error }) => (
  <div className={className}>
    <label className="block text-xs font-medium text-gray-600 mb-1.5">
      {label}
      {required ? " *" : ""}
    </label>
    {children}
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

const ReadOnlyField = ({ label, value }) => (
  <Field label={label}>
    <div
      className="rounded-xl border border-gray-200 bg-gray-50/90 px-3 py-2.5 text-sm text-gray-800 font-medium truncate"
      title={value}
    >
      {value || "-"}
    </div>
  </Field>
);

const inputClass =
  "w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#2b63ae] bg-white/90 text-sm";

const AddSampleDrawer = ({
  open,
  project,
  projectOptions = [],
  sampleEntry = null,
  mode = "add",
  onClose,
  onSaved,
}) => {
  const [selectedProject, setSelectedProject] = useState(project || null);
  const [samples, setSamples] = useState([createEmptySample()]);
  const [materialOptions, setMaterialOptions] = useState(REGISTER_MATERIALS);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [dragOverId, setDragOverId] = useState(null);

  const effectiveProject = project || selectedProject;
  const sample = samples[0];
  const isViewMode = mode === "view";
  const isEditMode = mode === "edit";

  useEffect(() => {
    if (!open) return;
    setSelectedProject(project || null);
    resetForm();
    loadMasterData();
  }, [open, project?.project_id, sampleEntry?.sample_entry_id, mode]);

  const normalizeSampleEntry = (entry) => ({
    ...createEmptySample(),
    id: entry?.sample_entry_id || Date.now(),
    sample_entry_id: entry?.sample_entry_id || entry?.sample_id || null,
    sample_no: entry?.sample_no || "",
    letter_date: entry?.letter_date || today(),
    material_name: entry?.material_name || "",
    quantity: String(entry?.quantity || entry?.nos || ""),
    sample_received_date: entry?.sample_received_date || entry?.received_date || today(),
    received_date: entry?.received_date || entry?.sample_received_date || today(),
    sample_source: entry?.sample_source || "",
    received_condition: entry?.received_condition || "",
    sample_location: entry?.sample_location || "",
    sample_priority: entry?.sample_priority || "Normal",
    status: entry?.status || "Received",
    received_by: entry?.received_by || entry?.receiver_name || "",
    remarks: entry?.remarks || "",
    photos: [],
    existingImages: entry?.images || [],
  });

  const resetForm = () => {
    if (sampleEntry && (isEditMode || isViewMode)) {
      setSamples([normalizeSampleEntry(sampleEntry)]);
    } else {
      setSamples([createEmptySample()]);
    }
    setErrorMessage("");
    setFieldErrors({});
  };

  const loadMasterData = async () => {
    try {
      const usersRes = await getUsers();
      setUsers(usersRes.data?.data?.users || usersRes.data?.users || []);

      try {
        const materialsRes = await getScopeMaterials();
        const materialsData = materialsRes.data?.data || materialsRes.data || [];
        const materialNames = materialsData.map((m) => m.material_name).filter(Boolean);
        const uniqueNames = Array.from(new Set(materialNames)).sort();
        setMaterialOptions(uniqueNames.length > 0 ? uniqueNames : [...REGISTER_MATERIALS]);
      } catch (matError) {
        console.error("Failed to load dynamic materials:", matError);
        setMaterialOptions([...REGISTER_MATERIALS]);
      }
    } catch (error) {
      console.error("Failed to load drawer master data:", error);
    }
  };

  const handleProjectChange = (projectId) => {
    const nextProject = projectOptions.find(
      (item) => String(item.project_id) === String(projectId)
    );
    setSelectedProject(nextProject || null);
    resetForm();
  };

  const updateSample = (id, field, value) => {
    setSamples((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const addPhotos = (sampleId, fileList) => {
    const files = Array.from(fileList || []);
    setSamples((prev) =>
      prev.map((s) => {
        if (s.id !== sampleId) return s;
        const remaining = MAX_PHOTOS_PER_SAMPLE - s.photos.length;
        const toAdd = files.slice(0, remaining).map((file) => ({
          id: `${file.name}-${file.lastModified}`,
          file,
          preview: URL.createObjectURL(file),
        }));
        return { ...s, photos: [...s.photos, ...toAdd] };
      })
    );
  };

  const removePhoto = (sampleId, photoId) => {
    setSamples((prev) =>
      prev.map((s) => {
        if (s.id !== sampleId) return s;
        const photo = s.photos.find((p) => p.id === photoId);
        if (photo?.preview) URL.revokeObjectURL(photo.preview);
        return { ...s, photos: s.photos.filter((p) => p.id !== photoId) };
      })
    );
  };

  const validateSamples = () => {
    const errors = {};

    if (!effectiveProject?.project_id) {
      setErrorMessage("Project is required.");
      return false;
    }

    if (!sample.letter_date) {
      errors.letter_date = "Letter Date is required";
    }
    if (!sample.sample_received_date && !sample.received_date) {
      errors.sample_received_date = "Sample Received Date is required";
    }
    if (!sample.sample_source?.trim()) {
      errors.sample_source = "Sample Source is required";
    }
    if (!sample.received_condition?.trim()) {
      errors.received_condition = "Received Condition is required";
    }
    if (!sample.status?.trim()) {
      errors.status = "Status is required";
    }
    if (!sample.material_name?.trim()) {
      errors.material_name = "Material is required";
    }
    if (!sample.quantity?.trim()) {
      errors.quantity = "Quantity is required";
    }
    if (!sample.received_by?.trim()) {
      errors.received_by = "Received By is required";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setErrorMessage("Please fix the highlighted fields.");
      return false;
    }

    setErrorMessage("");
    return true;
  };

  const buildPayload = () => ({
    project_id: effectiveProject.project_id,
    project_no: effectiveProject.project_code,
    client_name: effectiveProject.client_name,
    samples: samples.map((s) => ({
      letter_date: s.letter_date,
      material_name: s.material_name,
      quantity: s.quantity,
      sample_received_date: s.sample_received_date || s.received_date,
      received_date: s.sample_received_date || s.received_date,
      sample_source: s.sample_source,
      received_condition: s.received_condition,
      sample_location: s.sample_location,
      sample_priority: s.sample_priority || "Normal",
      status: s.status || "Received",
      received_by: s.received_by,
      remarks: s.remarks,
    })),
  });

  const submitSamples = async () => {
    if (!validateSamples()) return;

    try {
      setLoading(true);
      setErrorMessage("");

      if (isEditMode && sample.sample_entry_id) {
        const payload = {
          project_id: effectiveProject.project_id,
          project_no: effectiveProject.project_code,
          client_name: effectiveProject.client_name,
          letter_date: sample.letter_date,
          material_name: sample.material_name,
          quantity: sample.quantity,
          sample_received_date: sample.sample_received_date || sample.received_date,
          received_date: sample.sample_received_date || sample.received_date,
          sample_source: sample.sample_source,
          received_condition: sample.received_condition,
          sample_location: sample.sample_location,
          sample_priority: sample.sample_priority || "Normal",
          status: sample.status || "Received",
          received_by: sample.received_by,
          remarks: sample.remarks,
        };
        await updateSampleEntry(sample.sample_entry_id, payload);
        onSaved?.(1, "edit");
      } else {
        const payload = buildPayload();
        const formData = new FormData();
        formData.append("data", JSON.stringify(payload));

        samples.forEach((s, sampleIndex) => {
          s.photos.forEach((photo, photoIndex) => {
            formData.append(`photo_${sampleIndex}_${photoIndex}`, photo.file);
          });
        });

        const response = await createSampleEntriesBatch(formData);
        const createdCount = response.data?.data?.created_count || samples.length;
        onSaved?.(createdCount, "add");
      }
      onClose();
    } catch (error) {
      const apiErrors = error?.response?.data?.errors;
      if (apiErrors) setFieldErrors(apiErrors);
      setErrorMessage(error?.response?.data?.message || "Failed to save samples");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const drawerTitle = isViewMode ? "View Sample" : isEditMode ? "Edit Sample" : "Sample Receipt Register";
  const drawerSubtitle = isViewMode
    ? "Sample entry details"
    : isEditMode
      ? "Update sample entry linked to project"
      : "Digital sample entry linked to project";

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-[1000]"
        onClick={onClose}
      />

      <aside className="fixed top-0 right-0 h-full w-full md:max-w-[700px] lg:max-w-[500px] z-[1001] flex flex-col bg-gradient-to-br from-[#f8fbff] via-white to-[#eef5fd] shadow-2xl transform transition-transform duration-300 ease-out translate-x-0">
        <div className="sticky top-0 z-20 border-b border-white/70 bg-white/80 backdrop-blur-xl px-5 sm:px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {drawerTitle}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {drawerSubtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-6">
          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Project Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!project && projectOptions.length > 0 && (
                <Field label="Project" required className="md:col-span-2">
                  <select
                    value={effectiveProject?.project_id || ""}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    disabled={isViewMode || isEditMode}
                    className={inputClass}
                  >
                    <option value="">Select Project</option>
                    {projectOptions.map((p) => (
                      <option key={p.project_id} value={p.project_id}>
                        {p.project_code} - {p.project_name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <ReadOnlyField label="Project No" value={effectiveProject?.project_code} />
              <ReadOnlyField label="Client" value={effectiveProject?.client_name} />
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-5">Sample Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(isViewMode || isEditMode) && (
                <ReadOnlyField label="Sr No" value={sample.sample_no || sample.sr_no || sample.sample_entry_id} />
              )}

              <Field label="Letter Date" required error={fieldErrors.letter_date}>
                <input
                  type="date"
                  value={sample.letter_date}
                  onChange={(e) => updateSample(sample.id, "letter_date", e.target.value)}
                  disabled={isViewMode}
                  className={inputClass}
                />
              </Field>

              <Field label="Sample Received Date" required error={fieldErrors.sample_received_date}>
                <input
                  type="date"
                  value={sample.sample_received_date || sample.received_date}
                  onChange={(e) => {
                    updateSample(sample.id, "sample_received_date", e.target.value);
                    updateSample(sample.id, "received_date", e.target.value);
                  }}
                  disabled={isViewMode}
                  className={inputClass}
                />
              </Field>

              <Field label="Sample Source" required error={fieldErrors.sample_source}>
                <select
                  value={sample.sample_source}
                  onChange={(e) => updateSample(sample.id, "sample_source", e.target.value)}
                  disabled={isViewMode}
                  className={inputClass}
                >
                  <option value="">Select Source</option>
                  {SAMPLE_SOURCES.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </Field>

              <Field label="Material" required error={fieldErrors.material_name}>
                <SearchableSelect
                  value={sample.material_name}
                  onChange={(value) => updateSample(sample.id, "material_name", value)}
                  options={materialOptions}
                  placeholder="Select Material"
                  disabled={isViewMode}
                />
              </Field>

              <Field label="Quantity" required error={fieldErrors.quantity}>
                <input
                  type="text"
                  value={sample.quantity}
                  onChange={(e) => updateSample(sample.id, "quantity", e.target.value)}
                  placeholder="2 Bags"
                  disabled={isViewMode}
                  className={inputClass}
                />
              </Field>

              <Field label="Received Condition" required error={fieldErrors.received_condition}>
                <select
                  value={sample.received_condition}
                  onChange={(e) => updateSample(sample.id, "received_condition", e.target.value)}
                  disabled={isViewMode}
                  className={inputClass}
                >
                  <option value="">Select Condition</option>
                  {RECEIVED_CONDITIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </Field>

              <Field label="Sample Location">
                <input
                  value={sample.sample_location}
                  onChange={(e) => updateSample(sample.id, "sample_location", e.target.value)}
                  placeholder="Store Room A"
                  disabled={isViewMode}
                  className={inputClass}
                />
              </Field>

              <Field label="Sample Priority">
                <select
                  value={sample.sample_priority}
                  onChange={(e) => updateSample(sample.id, "sample_priority", e.target.value)}
                  disabled={isViewMode}
                  className={inputClass}
                >
                  {SAMPLE_PRIORITIES.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </Field>

              <Field label="Status" required error={fieldErrors.status}>
                <select
                  value={sample.status}
                  onChange={(e) => updateSample(sample.id, "status", e.target.value)}
                  disabled={isViewMode}
                  className={inputClass}
                >
                  {RECEIPT_STATUSES.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </Field>

              <Field label="Received By" required error={fieldErrors.received_by}>
                <select
                  value={sample.received_by}
                  onChange={(e) => updateSample(sample.id, "received_by", e.target.value)}
                  disabled={isViewMode}
                  className={inputClass}
                >
                  <option value="">Select User</option>
                  {users.map((user) => (
                    <option key={user.user_id} value={getUserName(user)}>
                      {getUserName(user)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-4">
              <p className="text-sm font-semibold text-gray-800 mb-3">Sample Photos</p>
              <div className="flex flex-wrap gap-3">
                {!isViewMode && (
                  <label
                    onDragOver={(e) => { e.preventDefault(); setDragOverId(sample.id); }}
                    onDragLeave={() => setDragOverId(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverId(null);
                      addPhotos(sample.id, e.dataTransfer.files);
                    }}
                    className={`h-20 w-20 shrink-0 rounded-xl border-2 border-dashed flex items-center justify-center text-3xl font-light cursor-pointer transition-colors ${
                      dragOverId === sample.id
                        ? "border-[#2d66b3] bg-blue-50 text-[#2d66b3]"
                        : "border-gray-300 bg-white text-[#2d66b3] hover:bg-blue-50"
                    }`}
                  >
                    +
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => addPhotos(sample.id, e.target.files)}
                    />
                  </label>
                )}
                {sample.existingImages?.map((image) => (
                  <div
                    key={image.photo_id || image.image_id}
                    className="h-20 w-20 rounded-xl border border-gray-200 bg-gray-50 px-2 py-2 text-[11px] text-gray-600 flex items-center justify-center text-center overflow-hidden"
                    title={image.file_name}
                  >
                    {image.file_name || "Photo"}
                  </div>
                ))}
                {sample.photos?.map((photo) => (
                  <div key={photo.id} className="relative h-20 w-20 rounded-xl overflow-hidden border border-gray-200">
                    <img src={photo.preview} alt="" className="h-full w-full object-cover" />
                    {!isViewMode && (
                      <button
                        type="button"
                        onClick={() => removePhoto(sample.id, photo.id)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                      >
                        <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <Field label="Remarks">
                <textarea
                  rows={4}
                  value={sample.remarks}
                  onChange={(e) => updateSample(sample.id, "remarks", e.target.value)}
                  disabled={isViewMode}
                  className={`${inputClass} min-h-[100px]`}
                  placeholder="Sample remarks"
                />
              </Field>
            </div>
          </section>

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 z-20 border-t border-white/70 bg-white/90 backdrop-blur-xl px-5 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
            >
              {isViewMode ? "Close" : "Cancel"}
            </button>
            {!isViewMode && (
              <button
                type="button"
                disabled={loading}
                onClick={submitSamples}
                className="px-4 py-2.5 rounded-xl bg-[#2d66b3] text-white text-sm font-medium hover:bg-[#1f5498] disabled:opacity-60"
              >
                {loading ? "Saving..." : isEditMode ? "Update Sample" : "Save Sample"}
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default AddSampleDrawer;
