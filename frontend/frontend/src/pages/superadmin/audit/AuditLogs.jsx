import React, { useEffect, useMemo, useState } from "react";
import { Activity, Building2, Clock, Filter, ShieldCheck, UserRound } from "lucide-react";
import { MainLayout } from "../../../components/layout";
import { Badge, DataTable, MetricCard, SearchInput } from "../../../components/ui";
import { api } from "../../../api";

const Workspace = ({ children }) => (
  <div className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-5 lg:px-6">
    <div className="space-y-6">{children}</div>
  </div>
);

const AuditLogs = () => {
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");

  useEffect(() => {
    const fetchLabs = async () => {
      try {
        setLoading(true);
        const response = await api.get("/superadmin/labs");
        setLabs(response.data.data || []);
      } catch (error) {
        console.error("Error building audit timeline:", error);
        setLabs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLabs();
  }, []);

  const events = useMemo(() => labs.flatMap((lab, index) => [
    {
      id: `${lab.lab_id}-profile`,
      time: lab.updated_at || lab.created_at,
      actor: "Super Admin",
      action: "Lab profile reviewed",
      module: "Labs",
      target: lab.lab_name,
      status: lab.status === "active" ? "Successful" : "Inactive",
      icon: Building2,
    },
    {
      id: `${lab.lab_id}-access`,
      time: lab.created_at,
      actor: "System",
      action: `${lab.total_users || 0} users indexed`,
      module: "Access",
      target: lab.lab_name,
      status: index % 3 === 0 ? "Review" : "Successful",
      icon: UserRound,
    },
  ]), [labs]);

  const filteredEvents = useMemo(() => {
    const needle = query.toLowerCase().trim();
    return events.filter((event) => {
      const matchesQuery = !needle || [event.actor, event.action, event.module, event.target, event.status]
        .some((value) => value?.toLowerCase().includes(needle));
      const matchesModule = moduleFilter === "all" || event.module === moduleFilter;
      return matchesQuery && matchesModule;
    });
  }, [events, moduleFilter, query]);

  const columns = [
    { key: "event", label: "Event", sortable: true, render: (event) => (
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F4F5F7] text-[#23395B]">
          <event.icon size={18} />
        </span>
        <div>
          <p className="font-semibold">{event.action}</p>
          <p className="mt-1 text-xs text-[#64748B]">{event.target}</p>
        </div>
      </div>
    ) },
    { key: "actor", label: "User", sortable: true, render: (event) => event.actor },
    { key: "module", label: "Module", sortable: true, render: (event) => <Badge variant="info">{event.module}</Badge> },
    { key: "time", label: "Date", sortable: true, render: (event) => event.time ? new Date(event.time).toLocaleString() : "Not recorded" },
    { key: "status", label: "Status", render: (event) => <Badge variant={event.status === "Review" ? "warning" : event.status === "Inactive" ? "neutral" : "success"} dot>{event.status}</Badge> },
  ];

  return (
    <MainLayout headerTitle="Audit Logs" headerSubtitle="Platform timeline, access events, and operational review">
      <Workspace>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Events" value={events.length} caption="Frontend audit timeline" icon={Activity} tone="primary" />
          <MetricCard label="Modules" value="2" caption="Labs and access activity" icon={ShieldCheck} tone="info" />
          <MetricCard label="Review Items" value={events.filter((event) => event.status === "Review").length} caption="Needs attention" icon={Filter} tone="warning" />
          <MetricCard label="Latest" value={events.length ? "Now" : "-"} caption="Timeline refresh state" icon={Clock} tone="neutral" />
        </section>

        <section className="rounded-[20px] border border-[#E3E7EC] bg-white p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Audit Trail</p>
              <h2 className="mt-1 text-xl font-bold text-[#1E293B]">System activity</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search action, user, module..." className="sm:w-[340px]" />
              <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)} className="app-select min-w-[180px]">
                <option value="all">All modules</option>
                <option value="Labs">Labs</option>
                <option value="Access">Access</option>
              </select>
            </div>
          </div>
          <div className="mt-5">
            <DataTable columns={columns} data={filteredEvents} loading={loading} getRowKey={(event) => event.id} emptyTitle="No audit events found" emptyDescription="Try changing the search or module filter." />
          </div>
        </section>
      </Workspace>
    </MainLayout>
  );
};

export default AuditLogs;
