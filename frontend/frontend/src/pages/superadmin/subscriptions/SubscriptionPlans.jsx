import React, { useMemo, useState } from "react";
import {
  Archive, CalendarClock, Copy, CreditCard, Edit3, HardDrive,
  MoreHorizontal, Plus, RotateCcw, Trash2, Users, X,
} from "lucide-react";
import { MainLayout } from "../../../components/layout";
import {
  ActionDropdown, Badge, Button, DataTable, MetricCard, Modal, SearchInput,
} from "../../../components/ui";

const Workspace = ({ children }) => (
  <div className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-5 lg:px-6">
    <div className="space-y-6">{children}</div>
  </div>
);

const featureOptions = [
  "Projects",
  "Samples",
  "Reports",
  "Observation",
  "Template Builder",
  "Equipment",
  "Calibration",
  "API",
  "AI",
  "Branches",
  "Email",
  "WhatsApp",
];

const emptyPlan = {
  name: "",
  description: "",
  monthlyPrice: "",
  yearlyPrice: "",
  trialDays: "",
  userLimit: "",
  storageLimit: "",
  features: [],
  status: "Active",
};

const initialPlans = [
  {
    id: "plan-essential",
    name: "Essential",
    description: "Entry plan for single-location laboratories starting digital workflows.",
    monthlyPrice: 12000,
    yearlyPrice: 120000,
    userLimit: 15,
    storageLimit: "25 GB",
    features: ["Projects", "Samples", "Reports"],
    status: "Active",
    trialDays: 14,
    sortOrder: 1,
  },
  {
    id: "plan-professional",
    name: "Professional",
    description: "Operational plan for growing labs with larger teams and storage needs.",
    monthlyPrice: 32000,
    yearlyPrice: 320000,
    userLimit: 50,
    storageLimit: "100 GB",
    features: ["Projects", "Samples", "Reports", "Observation", "Equipment", "Calibration"],
    status: "Active",
    trialDays: 21,
    sortOrder: 2,
  },
  {
    id: "plan-enterprise",
    name: "Enterprise",
    description: "Custom plan for multi-branch organizations and high-volume testing.",
    monthlyPrice: 0,
    yearlyPrice: 0,
    userLimit: "Unlimited",
    storageLimit: "1 TB",
    features: ["API", "AI", "Branches", "Email", "WhatsApp", "Template Builder"],
    status: "Archived",
    trialDays: 30,
    sortOrder: 3,
  },
];

const assignedSubscriptions = [
  {
    id: "sub-goma",
    laboratory: "GOMA Engineering Lab",
    currentPlan: "Professional",
    startDate: "2026-07-01",
    expiryDate: "2027-06-30",
    renewalStatus: "Renewing",
    storageUsage: "62 / 100 GB",
    userUsage: "34 / 50",
    status: "Active",
  },
  {
    id: "sub-ucs",
    laboratory: "UCS",
    currentPlan: "Essential",
    startDate: "2026-06-15",
    expiryDate: "2026-08-15",
    renewalStatus: "Due Soon",
    storageUsage: "12 / 25 GB",
    userUsage: "8 / 15",
    status: "Trial",
  },
  {
    id: "sub-rajkot",
    laboratory: "Rajkot Geotech Lab",
    currentPlan: "Essential",
    startDate: "2026-05-10",
    expiryDate: "2027-05-09",
    renewalStatus: "Healthy",
    storageUsage: "18 / 25 GB",
    userUsage: "11 / 15",
    status: "Active",
  },
];

const money = (value) => Number(value) === 0 ? "Custom" : `INR ${Number(value || 0).toLocaleString("en-IN")}`;

const PlanModal = ({ isOpen, mode, value, onChange, onClose, onSubmit }) => {
  const [customFeature, setCustomFeature] = useState("");

  const updateField = (field, fieldValue) => {
    onChange({ ...value, [field]: fieldValue });
  };

  const toggleFeature = (feature) => {
    const exists = value.features.includes(feature);
    updateField(
      "features",
      exists
        ? value.features.filter((item) => item !== feature)
        : [...value.features, feature]
    );
  };

  const addCustomFeature = () => {
    const feature = customFeature.trim();
    if (!feature || value.features.includes(feature)) return;
    updateField("features", [...value.features, feature]);
    setCustomFeature("");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "edit" ? "Edit Plan" : "Create Plan"}
      description="Frontend-only plan form prepared for future backend integration."
      size="xl"
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="app-label">Plan Name</span>
            <input className="app-input" value={value.name} onChange={(event) => updateField("name", event.target.value)} required />
          </label>
          <label>
            <span className="app-label">Status</span>
            <select className="app-select" value={value.status} onChange={(event) => updateField("status", event.target.value)}>
              <option value="Active">Active</option>
              <option value="Archived">Archived</option>
            </select>
          </label>
          <label className="md:col-span-2">
            <span className="app-label">Description</span>
            <textarea className="app-input min-h-[92px]" value={value.description} onChange={(event) => updateField("description", event.target.value)} required />
          </label>
          <label>
            <span className="app-label">Monthly Price</span>
            <input type="number" min="0" className="app-input" value={value.monthlyPrice} onChange={(event) => updateField("monthlyPrice", event.target.value)} />
          </label>
          <label>
            <span className="app-label">Yearly Price</span>
            <input type="number" min="0" className="app-input" value={value.yearlyPrice} onChange={(event) => updateField("yearlyPrice", event.target.value)} />
          </label>
          <label>
            <span className="app-label">Trial Days</span>
            <input type="number" min="0" className="app-input" value={value.trialDays} onChange={(event) => updateField("trialDays", event.target.value)} />
          </label>
          <label>
            <span className="app-label">User Limit</span>
            <input className="app-input" value={value.userLimit} onChange={(event) => updateField("userLimit", event.target.value)} />
          </label>
          <label>
            <span className="app-label">Storage Limit</span>
            <input className="app-input" value={value.storageLimit} onChange={(event) => updateField("storageLimit", event.target.value)} placeholder="100 GB" />
          </label>
        </div>

        <div>
          <span className="app-label">Features</span>
          <div className="flex flex-wrap gap-2">
            {featureOptions.map((feature) => (
              <button
                key={feature}
                type="button"
                onClick={() => toggleFeature(feature)}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                  value.features.includes(feature)
                    ? "border-[#B9D6E8] bg-[#EDF5FA] text-[#2F6B9A]"
                    : "border-[#E3E7EC] bg-white text-[#64748B] hover:bg-[#F4F5F7]"
                }`}
              >
                {feature}
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              className="app-input"
              placeholder="Add custom feature"
              value={customFeature}
              onChange={(event) => setCustomFeature(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCustomFeature();
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={addCustomFeature}>Add</Button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {value.features.map((feature) => (
              <span key={feature} className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3E7EC] bg-[#F4F5F7] px-2.5 py-1 text-xs font-semibold text-[#64748B]">
                {feature}
                <button type="button" onClick={() => toggleFeature(feature)} className="rounded p-0.5 hover:bg-white" aria-label={`Remove ${feature}`}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-[#EDF0F3] pt-5">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">{mode === "edit" ? "Save Changes" : "Create Plan"}</Button>
        </div>
      </form>
    </Modal>
  );
};

const SubscriptionPlans = () => {
  const [plans, setPlans] = useState(initialPlans);
  const [query, setQuery] = useState("");
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [modalMode, setModalMode] = useState("create");
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [draftPlan, setDraftPlan] = useState(emptyPlan);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredPlans = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return plans;
    return plans.filter((plan) =>
      [plan.name, plan.description, plan.status, ...plan.features]
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [plans, query]);

  const openCreateModal = () => {
    setModalMode("create");
    setEditingPlanId(null);
    setDraftPlan(emptyPlan);
    setIsModalOpen(true);
  };

  const openEditModal = (plan) => {
    setModalMode("edit");
    setEditingPlanId(plan.id);
    setDraftPlan({
      name: plan.name,
      description: plan.description,
      monthlyPrice: plan.monthlyPrice,
      yearlyPrice: plan.yearlyPrice,
      trialDays: plan.trialDays,
      userLimit: plan.userLimit,
      storageLimit: plan.storageLimit,
      features: plan.features,
      status: plan.status,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPlanId(null);
  };

  const normalizePlan = (plan) => ({
    ...plan,
    monthlyPrice: Number(plan.monthlyPrice || 0),
    yearlyPrice: Number(plan.yearlyPrice || 0),
    trialDays: Number(plan.trialDays || 0),
    features: plan.features.length ? plan.features : ["Projects"],
  });

  const savePlan = (event) => {
    event.preventDefault();
    const normalized = normalizePlan(draftPlan);

    if (modalMode === "edit") {
      setPlans((current) => current.map((plan) =>
        plan.id === editingPlanId ? { ...plan, ...normalized } : plan
      ));
    } else {
      setPlans((current) => [
        ...current,
        {
          ...normalized,
          id: `plan-${Date.now()}`,
          sortOrder: current.length + 1,
        },
      ]);
    }

    closeModal();
  };

  const duplicatePlan = (plan) => {
    setPlans((current) => [
      ...current,
      {
        ...plan,
        id: `${plan.id}-copy-${Date.now()}`,
        name: `${plan.name} Copy`,
        status: "Active",
        sortOrder: current.length + 1,
      },
    ]);
  };

  const archivePlan = (planId) => {
    setPlans((current) => current.map((plan) =>
      plan.id === planId ? { ...plan, status: "Archived" } : plan
    ));
  };

  const unarchivePlan = (planId) => {
    setPlans((current) => current.map((plan) =>
      plan.id === planId ? { ...plan, status: "Active" } : plan
    ));
  };

  const deletePlan = (planId) => {
    setPlans((current) => current.filter((plan) => plan.id !== planId));
  };

  const planColumns = [
    { key: "plan", label: "Plan", sortable: true, render: (plan) => (
      <div>
        <p className="font-semibold">{plan.name}</p>
        <p className="mt-1 max-w-[360px] text-xs text-[#64748B]">{plan.description}</p>
      </div>
    ) },
    { key: "price", label: "Pricing", sortable: true, render: (plan) => (
      <div>
        <p className="font-semibold">{money(plan.monthlyPrice)} / mo</p>
        <p className="mt-1 text-xs text-[#64748B]">{money(plan.yearlyPrice)} / yr</p>
      </div>
    ) },
    { key: "limits", label: "Limits", render: (plan) => (
      <div className="space-y-1 text-sm">
        <p>{plan.userLimit} users</p>
        <p className="text-[#64748B]">{plan.storageLimit} storage</p>
      </div>
    ) },
    { key: "features", label: "Features", render: (plan) => (
      <div className="flex max-w-[360px] flex-wrap gap-2">
        {plan.features.map((feature) => <Badge key={feature} variant="neutral">{feature}</Badge>)}
      </div>
    ) },
    { key: "trial", label: "Trial", sortable: true, render: (plan) => `${plan.trialDays} days` },
    { key: "order", label: "Order", sortable: true, render: (plan) => plan.sortOrder },
    { key: "status", label: "Status", render: (plan) => (
      <Badge variant={plan.status === "Active" ? "success" : "neutral"} dot>{plan.status}</Badge>
    ) },
    { key: "actions", label: "", render: (plan) => {
      const isArchived = plan.status === "Archived";
      return (
        <ActionDropdown
          open={activeDropdownId === plan.id}
          onOpenChange={(open) => setActiveDropdownId(open ? plan.id : null)}
          trigger={(
            <button
              type="button"
              onClick={() => setActiveDropdownId(activeDropdownId === plan.id ? null : plan.id)}
              className="app-icon-button !h-9 !w-9"
              aria-label={`Open actions for ${plan.name}`}
            >
              <MoreHorizontal size={18} />
            </button>
          )}
          items={[
            { label: "Edit", icon: Edit3, onClick: () => openEditModal(plan) },
            { label: "Duplicate", icon: Copy, onClick: () => duplicatePlan(plan) },
            isArchived
              ? { label: "Unarchive", icon: RotateCcw, onClick: () => unarchivePlan(plan.id) }
              : { label: "Archive", icon: Archive, onClick: () => archivePlan(plan.id) },
            { divider: true },
            { label: "Delete", icon: Trash2, danger: true, onClick: () => deletePlan(plan.id) },
          ]}
        />
      );
    } },
  ];

  const subscriptionColumns = [
    { key: "laboratory", label: "Laboratory", sortable: true, render: (row) => <span className="font-semibold">{row.laboratory}</span> },
    { key: "currentPlan", label: "Current Plan", sortable: true },
    { key: "startDate", label: "Start Date", sortable: true },
    { key: "expiryDate", label: "Expiry Date", sortable: true },
    { key: "renewalStatus", label: "Renewal Status", render: (row) => <Badge variant={row.renewalStatus === "Due Soon" ? "warning" : "success"}>{row.renewalStatus}</Badge> },
    { key: "storageUsage", label: "Storage Usage" },
    { key: "userUsage", label: "User Usage" },
    { key: "status", label: "Status", render: (row) => <Badge variant={row.status === "Trial" ? "info" : "success"} dot>{row.status}</Badge> },
    { key: "actions", label: "Actions", render: () => <button type="button" className="app-button app-button-ghost !h-9">Manage</button> },
  ];

  return (
    <MainLayout headerTitle="Subscription Management" headerSubtitle="Data-driven plans, assignments, renewals, and limits">
      <Workspace>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Plans" value={plans.length} caption="Plan records ready for API persistence" icon={CreditCard} tone="primary" />
          <MetricCard label="Assigned" value={assignedSubscriptions.length} caption="Laboratory subscriptions" icon={Users} tone="info" />
          <MetricCard label="Trial Plans" value={plans.filter((plan) => plan.trialDays > 0).length} caption="Plans with onboarding period" icon={CalendarClock} tone="warning" />
          <MetricCard label="Max Storage" value="1 TB" caption="Largest configured limit" icon={HardDrive} tone="neutral" />
        </section>

        <section className="rounded-[20px] border border-[#E3E7EC] bg-white p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Plans</p>
              <h2 className="mt-1 text-xl font-bold text-[#1E293B]">Subscription plan catalog</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search plans..." className="sm:w-[340px]" />
              <Button icon={Plus} onClick={openCreateModal}>Create Plan</Button>
            </div>
          </div>
          <div className="mt-5">
            <DataTable
              columns={planColumns}
              data={filteredPlans}
              getRowKey={(plan) => plan.id}
              emptyTitle="No plans found"
              emptyDescription="Create a plan or adjust the current search."
            />
          </div>
        </section>

        <section className="rounded-[20px] border border-[#E3E7EC] bg-white p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Assignments</p>
            <h2 className="mt-1 text-xl font-bold text-[#1E293B]">Assigned subscriptions</h2>
          </div>
          <div className="mt-5">
            <DataTable
              columns={subscriptionColumns}
              data={assignedSubscriptions}
              getRowKey={(subscription) => subscription.id}
              emptyTitle="No assigned subscriptions"
              emptyDescription="Assignments will connect to subscription APIs in a future sprint."
            />
          </div>
        </section>
      </Workspace>

      <PlanModal
        isOpen={isModalOpen}
        mode={modalMode}
        value={draftPlan}
        onChange={setDraftPlan}
        onClose={closeModal}
        onSubmit={savePlan}
      />
    </MainLayout>
  );
};

export default SubscriptionPlans;
