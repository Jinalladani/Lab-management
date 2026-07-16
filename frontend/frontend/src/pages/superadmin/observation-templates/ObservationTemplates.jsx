import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "sonner";
import {
  Archive, Copy, Edit3, Filter, MoreHorizontal, Plus,
  RotateCcw, SearchX, Send, Trash2,
} from "lucide-react";
import { MainLayout } from "../../../components/layout";
import {
  ActionDropdown, Badge, Button, DataTable, EmptyState, SearchInput,
} from "../../../components/ui";
import { observationTemplatesApi } from "../../../api/observationTemplates";

const Workspace = ({ children }) => (
  <div className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-5 lg:px-6">
    <div className="space-y-6">{children}</div>
  </div>
);

const statusTabs = ["Published", "Draft", "Archived"];

const statusVariant = (status) => {
  if (status === "Published") return "success";
  if (status === "Archived") return "neutral";
  return "warning";
};

const ObservationTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, per_page: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("Published");
  const [filters, setFilters] = useState({ material: "", test: "", standard: "" });
  const [options, setOptions] = useState({ materials: [], tests: [], standards: [] });
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const navigate = useNavigate();

  const fetchOptions = async () => {
    try {
      const response = await observationTemplatesApi.options();
      setOptions(response.data.data || { materials: [], tests: [], standards: [] });
    } catch {
      setOptions({ materials: [], tests: [], standards: [] });
    }
  };

  const fetchTemplates = async (page = pagination.page) => {
    try {
      setLoading(true);
      setError("");
      const response = await observationTemplatesApi.list({
        page,
        per_page: pagination.per_page,
        search,
        status: activeStatus,
        ...filters,
      });
      setTemplates(response.data.data.items || []);
      setPagination(response.data.data.pagination || pagination);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load observation templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchTemplates(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStatus, filters.material, filters.test, filters.standard]);

  const runSearch = () => fetchTemplates(1);

  const runAction = async (action, successMessage) => {
    try {
      await action();
      toast.success(successMessage);
      fetchTemplates(pagination.page);
      fetchOptions();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Action failed");
    }
  };

  const columns = [
    { key: "name", label: "Template Name", sortable: true, render: (template) => (
      <div>
        <p className="font-semibold">{template.name}</p>
        <p className="mt-1 max-w-[320px] truncate text-xs text-[#64748B]">{template.description || "No description"}</p>
      </div>
    ) },
    { key: "material", label: "Material", sortable: true },
    { key: "test", label: "Test", sortable: true },
    { key: "standard", label: "Standard", sortable: true },
    { key: "version", label: "Version", sortable: true, render: (template) => <span className="font-semibold">{template.version}</span> },
    { key: "status", label: "Status", render: (template) => <Badge variant={statusVariant(template.status)} dot>{template.status}</Badge> },
    { key: "updated_at", label: "Last Updated", sortable: true, render: (template) => template.updated_at ? new Date(template.updated_at).toLocaleDateString() : "-" },
    { key: "created_by", label: "Created By", render: (template) => template.created_by || "System" },
    { key: "actions", label: "", render: (template) => (
      <ActionDropdown
        open={activeDropdownId === template.id}
        onOpenChange={(open) => setActiveDropdownId(open ? template.id : null)}
        trigger={(
          <button
            type="button"
            onClick={() => setActiveDropdownId(activeDropdownId === template.id ? null : template.id)}
            className="app-icon-button !h-9 !w-9"
            aria-label={`Open actions for ${template.name}`}
          >
            <MoreHorizontal size={18} />
          </button>
        )}
        items={[
          { label: "Edit", icon: Edit3, onClick: () => navigate(`/superadmin/observation-templates/${template.id}/builder`) },
          { label: "Duplicate", icon: Copy, onClick: () => runAction(() => observationTemplatesApi.duplicate(template.id), "Template duplicated") },
          template.status !== "Published" && { label: "Publish", icon: Send, onClick: () => runAction(() => observationTemplatesApi.publish(template.id), "Template published") },
          template.status !== "Archived" && { label: "Archive", icon: Archive, onClick: () => runAction(() => observationTemplatesApi.archive(template.id), "Template archived") },
          template.status === "Archived" && { label: "Restore", icon: RotateCcw, onClick: () => runAction(() => observationTemplatesApi.restore(template.id), "Template restored") },
          { divider: true },
          { label: "Soft Delete", icon: Trash2, danger: true, onClick: () => runAction(() => observationTemplatesApi.remove(template.id), "Template deleted") },
        ].filter(Boolean)}
      />
    ) },
  ];

  return (
    <MainLayout headerTitle="Observation Templates" headerSubtitle="Platform-owned observation template management">
      <Workspace>
        <Toaster position="top-right" richColors />
        <section className="rounded-[20px] border border-[#E3E7EC] bg-white p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Templates</p>
              <h2 className="mt-1 text-xl font-bold text-[#1E293B]">Observation template registry</h2>
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <Button icon={Plus} onClick={() => navigate("/superadmin/observation-templates/new")}>New Template</Button>
              <SearchInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") runSearch();
                }}
                placeholder="Search templates..."
                className="lg:w-[320px]"
              />
              <Button variant="secondary" icon={SearchX} onClick={runSearch}>Search</Button>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex gap-2 overflow-x-auto">
              {statusTabs.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setActiveStatus(status)}
                  className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    activeStatus === status
                      ? "bg-[#23395B] text-white"
                      : "border border-[#E3E7EC] bg-white text-[#64748B] hover:bg-[#F4F5F7]"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {[
                ["material", "All materials", options.materials],
                ["test", "All tests", options.tests],
                ["standard", "All standards", options.standards],
              ].map(([key, placeholder, values]) => (
                <label key={key} className="relative min-w-[180px]">
                  <Filter size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                  <select
                    className="app-select !pl-10"
                    value={filters[key]}
                    onChange={(event) => setFilters((current) => ({ ...current, [key]: event.target.value }))}
                  >
                    <option value="">{placeholder}</option>
                    {values.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </div>
        </section>

        {error ? (
          <EmptyState title={error} description="Retry loading the template registry." action={<Button onClick={() => fetchTemplates(1)}>Retry</Button>} />
        ) : (
          <DataTable
            columns={columns}
            data={templates}
            loading={loading}
            getRowKey={(template) => template.id}
            emptyTitle={`No ${activeStatus.toLowerCase()} templates`}
            emptyDescription="Create a new draft or adjust the current filters."
          />
        )}

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" disabled={pagination.page <= 1} onClick={() => fetchTemplates(pagination.page - 1)}>Previous</Button>
          <span className="text-sm font-semibold text-[#64748B]">Page {pagination.page} of {pagination.pages || 1}</span>
          <Button variant="secondary" disabled={pagination.page >= pagination.pages} onClick={() => fetchTemplates(pagination.page + 1)}>Next</Button>
        </div>
      </Workspace>
    </MainLayout>
  );
};

export default ObservationTemplates;
