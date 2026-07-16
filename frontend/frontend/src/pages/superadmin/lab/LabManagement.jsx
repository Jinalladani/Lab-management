import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, CheckCircle2, CreditCard, Eye, Filter, MoreHorizontal,
  Power, SearchX, Users, FolderKanban, UserRound,
} from "lucide-react";
import { MainLayout } from "../../../components/layout";
import {
  ActionDropdown, Badge, Button, DataTable, EmptyState,
  MetricCard, SearchInput,
} from "../../../components/ui";
import { api } from "../../../api";

const Workspace = ({ children }) => (
  <div className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-5 lg:px-6">
    <div className="space-y-6">{children}</div>
  </div>
);

const statusVariant = (status) => status === "active" ? "success" : "neutral";

const LabManagement = () => {
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const navigate = useNavigate();

  const fetchLabs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/superadmin/labs");
      setLabs(response.data.data || []);
    } catch (fetchError) {
      console.error("Error fetching labs:", fetchError);
      setError("Failed to load labs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabs();
  }, []);

  const filteredLabs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return labs.filter((lab) => {
      const matchesSearch =
        !query ||
        lab.lab_name?.toLowerCase().includes(query) ||
        lab.contact_email?.toLowerCase().includes(query) ||
        lab.address?.toLowerCase().includes(query);
      const matchesStatus = filterStatus === "all" || lab.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [labs, searchTerm, filterStatus]);

  const metrics = useMemo(() => {
    const activeLabs = labs.filter((lab) => lab.status === "active").length;
    return [
      { label: "Total Labs", value: labs.length, caption: "Registered laboratory tenants", icon: Building2, tone: "primary" },
      { label: "Active Labs", value: activeLabs, caption: "Operational accounts", icon: CheckCircle2, tone: "success" },
      { label: "Projects", value: labs.reduce((sum, lab) => sum + (lab.total_projects || 0), 0), caption: "Across the platform", icon: FolderKanban, tone: "info" },
      { label: "Users", value: labs.reduce((sum, lab) => sum + (lab.total_users || 0), 0), caption: "Assigned team members", icon: Users, tone: "neutral" },
    ];
  }, [labs]);

  const handleDeleteLab = async (labId) => {
    const lab = labs.find((item) => item.lab_id === labId);
    if (!window.confirm(`Suspend ${lab?.lab_name || "this lab"}?`)) return;
    try {
      await api.delete(`/superadmin/labs/${labId}`);
      fetchLabs();
    } catch (deleteError) {
      console.error("Error suspending lab:", deleteError);
      alert("Failed to suspend lab");
    }
  };

  const handleActivateLab = async (labId) => {
    const lab = labs.find((item) => item.lab_id === labId);
    if (!lab) return;

    try {
      await api.put(`/superadmin/labs/${labId}`, {
        lab_name: lab.lab_name,
        contact_email: lab.contact_email,
        contact_phone: lab.contact_phone,
        address: lab.address,
        status: "active",
      });
      fetchLabs();
    } catch (activateError) {
      console.error("Error activating lab:", activateError);
      alert("Failed to activate lab");
    }
  };

  const columns = [
    {
      key: "lab",
      label: "Lab",
      sortable: true,
      render: (lab) => (
        <div className="min-w-0">
          <p className="max-w-[260px] truncate font-semibold text-[#1E293B]">{lab.lab_name}</p>
          <p className="mt-1 max-w-[260px] truncate text-xs text-[#64748B]">{lab.contact_email || "No email"}</p>
        </div>
      ),
    },
    {
      key: "contact",
      label: "Contact",
      render: (lab) => (
        <div>
          <p className="font-medium">{lab.contact_phone || "-"}</p>
          <p className="mt-1 max-w-[220px] truncate text-xs text-[#64748B]">{lab.address || "No address"}</p>
        </div>
      ),
    },
    { key: "projects", label: "Projects", sortable: true, render: (lab) => <span className="font-semibold">{lab.total_projects ?? 0}</span> },
    { key: "clients", label: "Clients", sortable: true, render: (lab) => <span className="font-semibold">{lab.total_clients ?? 0}</span> },
    { key: "users", label: "Users", sortable: true, render: (lab) => <span className="font-semibold">{lab.total_users ?? 0}</span> },
    {
      key: "status",
      label: "Status",
      render: (lab) => <Badge variant={statusVariant(lab.status)} dot>{lab.status || "inactive"}</Badge>,
    },
    {
      key: "actions",
      label: "",
      render: (lab) => (
        <ActionDropdown
          open={activeDropdownId === lab.lab_id}
          onOpenChange={(open) => setActiveDropdownId(open ? lab.lab_id : null)}
          trigger={(
            <button
              type="button"
              onClick={() => setActiveDropdownId(activeDropdownId === lab.lab_id ? null : lab.lab_id)}
              className="app-icon-button !h-9 !w-9"
              aria-label={`Open actions for ${lab.lab_name}`}
            >
              <MoreHorizontal size={18} />
            </button>
          )}
          items={[
            { label: "View details", icon: Eye, onClick: () => navigate(`/labs/view/${lab.lab_id}`) },
            { label: "Manage subscription", icon: CreditCard, onClick: () => navigate("/superadmin/subscriptions") },
            { divider: true },
            lab.status === "active"
              ? { label: "Suspend", icon: SearchX, danger: true, onClick: () => handleDeleteLab(lab.lab_id) }
              : { label: "Activate", icon: Power, onClick: () => handleActivateLab(lab.lab_id) },
          ]}
        />
      ),
    },
  ];

  return (
    <MainLayout headerTitle="Lab Management" headerSubtitle="Tenant network, status, and operational ownership">
      <Workspace>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
        </section>

        <section className="rounded-[20px] border border-[#E3E7EC] bg-white p-4 sm:p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Laboratories</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-[#1E293B]">Platform tenant registry</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SearchInput
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search labs, email, address..."
                className="w-full sm:w-[320px]"
              />
              <label className="relative min-w-[180px]">
                <Filter size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                <select
                  value={filterStatus}
                  onChange={(event) => setFilterStatus(event.target.value)}
                  className="app-select !pl-10"
                  aria-label="Filter labs by status"
                >
                  <option value="all">All status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>
          </div>

          <div className="mt-5">
            {error ? (
              <EmptyState
                title={error}
                description="The existing lab API did not respond. You can retry without leaving this page."
                action={<Button onClick={fetchLabs}>Retry</Button>}
              />
            ) : (
              <DataTable
                columns={columns}
                data={filteredLabs}
                loading={loading}
                getRowKey={(lab) => lab.lab_id}
                emptyTitle="No labs match the current filters"
                emptyDescription="Adjust search or status filters to find a laboratory."
              />
            )}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {filteredLabs.slice(0, 3).map((lab) => (
            <button
              key={lab.lab_id}
              type="button"
              onClick={() => navigate(`/labs/view/${lab.lab_id}`)}
              className="rounded-[20px] border border-[#E3E7EC] bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-[#5C7896]"
              style={{ boxShadow: "var(--shadow-sm)" }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F4F5F7] text-[#23395B]">
                  <UserRound size={20} />
                </div>
                <Badge variant={statusVariant(lab.status)}>{lab.status || "inactive"}</Badge>
              </div>
              <h3 className="mt-4 truncate text-base font-bold text-[#1E293B]">{lab.lab_name}</h3>
              <p className="mt-1 text-sm text-[#64748B]">{lab.address || lab.contact_email || "Lab profile"}</p>
            </button>
          ))}
        </section>
      </Workspace>
    </MainLayout>
  );
};

export default LabManagement;
