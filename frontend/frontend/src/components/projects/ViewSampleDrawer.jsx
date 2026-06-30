import React, { useEffect, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import {
  getSampleEntryById,
  getSampleEntryImageUrl,
  getSampleEntryScopeTests,
} from "../../api/sampleMaster";

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Invalid Date";
  }
};

const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 mb-1">
      {label}
    </label>
    {children}
  </div>
);

const ReadOnlyValue = ({ value }) => (
  <div className="rounded-xl border border-gray-200 bg-gray-50/90 px-3.5 py-2.5 text-sm text-gray-800 font-medium">
    {value || "-"}
  </div>
);

const ViewSampleDrawer = ({ open, sampleEntryId, onClose }) => {
  const [sample, setSample] = useState(null);
  const [scopeTests, setScopeTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!open || !sampleEntryId) return;
    fetchSampleDetails(sampleEntryId);
  }, [open, sampleEntryId]);

  const fetchSampleDetails = async (id) => {
    try {
      setLoading(true);
      setErrorMessage("");
      const [entryRes, scopeRes] = await Promise.all([
        getSampleEntryById(id),
        getSampleEntryScopeTests(id),
      ]);
      setSample(entryRes.data?.data || null);
      setScopeTests(scopeRes.data?.data || []);
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Failed to load sample details");
    } finally {
      setLoading(false);
    }
  };

  const formatScopeTestLabel = (scope) =>
    [
      scope.test_name,
      scope.test_method ? `(${scope.test_method})` : "",
      scope.material_name ? `- ${scope.material_name}` : "",
    ]
      .filter(Boolean)
      .join(" ");

  const getStatusColor = (status) => {
    const statusColors = {
      draft: "bg-slate-100 text-slate-700 border-slate-200",
      pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
      in_progress: "bg-blue-100 text-blue-700 border-blue-200",
      testing: "bg-blue-100 text-blue-700 border-blue-200",
      completed: "bg-green-100 text-green-700 border-green-200",
      rejected: "bg-red-100 text-red-700 border-red-200",
      cancelled: "bg-gray-100 text-gray-700 border-gray-200",
    };
    const key = (status || "").toLowerCase();
    return statusColors[key] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  if (!open) return null;

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
                Sample Details
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Read-only register details & tests
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
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading sample details...</div>
          ) : errorMessage ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {errorMessage}
            </div>
          ) : sample ? (
            <>
              {/* Header Status Bar */}
              <div className="flex items-center justify-between p-4 bg-white/80 rounded-2xl border border-white/90 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </span>
                  <div className="mt-1">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(sample.status)}`}>
                      {(sample.status || "pending").toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    SR No.
                  </span>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">
                    #{sample.sr_no || sample.sample_entry_id}
                  </p>
                </div>
              </div>

              {/* Project Info */}
              <section className="rounded-2xl border border-white/80 bg-white/70 backdrop-blur-md shadow-[0_8px_30px_rgba(45,102,179,0.08)] p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#2d66b3] mb-4">
                  Project Information
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Project No.">
                    <ReadOnlyValue value={sample.project_no} />
                  </Field>
                  <Field label="Project Name">
                    <ReadOnlyValue value={sample.project_name} />
                  </Field>
                  <Field label="Client Name" className="sm:col-span-2">
                    <ReadOnlyValue value={sample.client_name} />
                  </Field>
                </div>
              </section>

              {/* Sample Details */}
              <section className="rounded-2xl border border-white/80 bg-white/75 backdrop-blur-md shadow-[0_8px_30px_rgba(15,23,42,0.06)] p-5 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Sample Fields
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Sample No.">
                    <ReadOnlyValue value={sample.sample_no} />
                  </Field>
                  <Field label="NOS (Quantity)">
                    <ReadOnlyValue value={sample.nos || sample.quantity} />
                  </Field>
                  <Field label="Material Name">
                    <ReadOnlyValue value={sample.material_name} />
                  </Field>
                  <Field label="Material Type">
                    <ReadOnlyValue value={sample.material_type_name} />
                  </Field>
                  <Field label="Sample Category">
                    <ReadOnlyValue value={sample.sample_category} />
                  </Field>
                  <Field label="Letter Date">
                    <ReadOnlyValue value={formatDate(sample.letter_date)} />
                  </Field>
                  <Field label="Received Date">
                    <ReadOnlyValue value={formatDate(sample.received_date)} />
                  </Field>
                  <Field label="Received By">
                    <ReadOnlyValue value={sample.receiver_name || sample.received_by} />
                  </Field>
                  <Field label="Test Performed By" className="sm:col-span-2">
                    <ReadOnlyValue value={sample.test_performed_by} />
                  </Field>
                </div>
              </section>

              {/* Tests Performed */}
              <section className="rounded-2xl border border-white/80 bg-white/75 backdrop-blur-md shadow-[0_8px_30px_rgba(15,23,42,0.06)] p-5 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Tests Performed
                </p>
                {scopeTests.length > 0 ? (
                  <div className="space-y-2">
                    {scopeTests.map((scope) => (
                      <div
                        key={scope.sample_entry_scope_test_id}
                        className="rounded-xl border border-gray-100 bg-white/95 px-4 py-3 text-sm text-gray-800 font-medium shadow-sm"
                      >
                        {formatScopeTestLabel(scope)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-white/60 py-6 text-center text-sm text-gray-400">
                    No tests selected for this sample.
                  </div>
                )}
              </section>

              {/* Images */}
              {sample.images && sample.images.length > 0 && (
                <section className="rounded-2xl border border-white/80 bg-white/75 backdrop-blur-md shadow-[0_8px_30px_rgba(15,23,42,0.06)] p-5 space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Sample Images
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {sample.images.map((image) => (
                      <a
                        key={image.image_id}
                        href={getSampleEntryImageUrl(sampleEntryId, image.image_id)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <img
                          src={getSampleEntryImageUrl(sampleEntryId, image.image_id)}
                          alt={image.file_name}
                          className="h-24 w-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </section>
              )}

              {/* Remarks */}
              <section className="rounded-2xl border border-white/80 bg-white/75 backdrop-blur-md shadow-[0_8px_30px_rgba(15,23,42,0.06)] p-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Remarks
                </p>
                <div className="rounded-xl border border-gray-200 bg-gray-50/90 px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap min-h-[80px]">
                  {sample.remarks || "No remarks entered."}
                </div>
              </section>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">No sample entry found.</div>
          )}
        </div>

        <div className="sticky bottom-0 z-20 border-t border-white/70 bg-white/90 backdrop-blur-xl px-5 sm:px-6 py-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </aside>
    </>
  );
};

export default ViewSampleDrawer;
