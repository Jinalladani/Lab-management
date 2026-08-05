import React, { useEffect, useMemo, useState } from "react";
import {
  Shield, Plus, Edit2, Trash2, SearchX, CheckCircle2, Users, AlertCircle, X, ShieldCheck
} from "lucide-react";
import { MainLayout } from "../../../components/layout";
import {
  Badge, Button, DataTable, EmptyState, MetricCard, SearchInput
} from "../../../components/ui";
import { rolesAPI } from "../../../api/roles";

const Workspace = ({ children }) => (
  <div className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-5 lg:px-6">
    <div className="space-y-6">{children}</div>
  </div>
);

const RolesManagement = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [deletingRole, setDeletingRole] = useState(null);

  // Form states
  const [formData, setFormData] = useState({ role_name: "", description: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await rolesAPI.getLabRoles();
      const rolesList = res?.data?.roles || [];
      setRoles(rolesList);
    } catch (err) {
      console.error("Error fetching roles:", err);
      setError("Failed to load system roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  // Sort state (Default: Role Name Ascending)
  const [sortConfig, setSortConfig] = useState({ key: "role_name", direction: "asc" });

  const handleSortChange = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const filteredRoles = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const filtered = roles.filter((role) => {
      return (
        !query ||
        role.role_name?.toLowerCase().includes(query) ||
        role.description?.toLowerCase().includes(query)
      );
    });

    return filtered.sort((a, b) => {
      const key = sortConfig.key || "role_name";
      let valA = a[key] ?? "";
      let valB = b[key] ?? "";

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [roles, searchTerm, sortConfig]);

  const metrics = useMemo(() => {
    const totalRoles = roles.length;
    const activeRoles = roles.filter(r => (r.user_count || 0) > 0).length;
    const totalUsers = roles.reduce((sum, r) => sum + (r.user_count || 0), 0);

    return [
      { label: "Total Roles", value: totalRoles, caption: "Configured system access roles", icon: Shield, tone: "primary" },
      { label: "Active Roles", value: activeRoles, caption: "Roles assigned to current users", icon: CheckCircle2, tone: "success" },
      { label: "Assigned Users", value: totalUsers, caption: "Total users linked to roles", icon: Users, tone: "info" },
      { label: "Scope", value: "Global", caption: "Applies platform-wide", icon: ShieldCheck, tone: "neutral" },
    ];
  }, [roles]);

  const handleOpenAdd = () => {
    setFormData({ role_name: "", description: "" });
    setFormError("");
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (role) => {
    setEditingRole(role);
    setFormData({ role_name: role.role_name, description: role.description || "" });
    setFormError("");
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingRole(null);
    setFormData({ role_name: "", description: "" });
    setFormError("");
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.role_name.trim()) {
      setFormError("Role name is required");
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");

      if (editingRole) {
        await rolesAPI.updateRole(editingRole.role_id, formData);
      } else {
        await rolesAPI.createRole(formData);
      }

      handleCloseModal();
      fetchRoles();
    } catch (err) {
      console.error("Save role error:", err);
      const msg = err.response?.data?.message || "Failed to save role";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deletingRole) return;
    try {
      setSubmitting(true);
      await rolesAPI.deleteRole(deletingRole.role_id);
      setDeletingRole(null);
      fetchRoles();
    } catch (err) {
      console.error("Delete role error:", err);
      const msg = err.response?.data?.message || "Failed to delete role";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: "role_name",
      label: "Role Name",
      header: "Role Name",
      accessorKey: "role_name",
      sortable: true,
      cell: (info) => {
        const role = info.row.original;
        return (
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#1E293B] text-sm">
              {role.role_name}
            </span>
            <Badge variant="primary">Global</Badge>
          </div>
        );
      },
    },
    {
      key: "description",
      label: "Description",
      header: "Description",
      accessorKey: "description",
      sortable: true,
      cell: (info) => (
        <span className="text-xs text-[#64748B] max-w-xs block truncate" title={info.row.original.description}>
          {info.row.original.description || "No description provided"}
        </span>
      ),
    },
    {
      key: "user_count",
      label: "Assigned Users",
      header: "Assigned Users",
      accessorKey: "user_count",
      sortable: true,
      cell: (info) => {
        const count = info.row.original.user_count || 0;
        return (
          <Badge variant={count > 0 ? "success" : "neutral"} className="gap-1">
            <Users size={12} />
            {count} {count === 1 ? "user" : "users"}
          </Badge>
        );
      },
    },
    {
      key: "created_at",
      label: "Created At",
      header: "Created At",
      accessorKey: "created_at",
      sortable: true,
      cell: (info) => {
        const dateStr = info.row.original.created_at;
        if (!dateStr) return "-";
        return (
          <span className="text-xs text-[#64748B]">
            {new Date(dateStr).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      header: "Actions",
      id: "actions",
      cell: (info) => {
        const role = info.row.original;
        return (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleOpenEdit(role)}
              className="p-1.5 rounded-lg text-[#64748B] hover:text-[#1E293B] hover:bg-slate-100 transition-colors"
              title="Edit Role"
            >
              <Edit2 size={16} />
            </button>
            <button
              type="button"
              onClick={() => setDeletingRole(role)}
              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
              title="Delete Role"
            >
              <Trash2 size={16} />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <MainLayout headerTitle="Role Management" headerSubtitle="Define system permissions and user access levels">
      <Workspace>
        {/* Metrics Grid */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((m) => (
            <MetricCard
              key={m.label}
              label={m.label}
              value={m.value}
              caption={m.caption}
              icon={m.icon}
              tone={m.tone}
            />
          ))}
        </section>

        {/* Roles Table Section */}
        <section className="rounded-[20px] border border-[#E3E7EC] bg-white p-5 shadow-sm space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#1E293B]">System Roles</h2>
              <p className="text-xs text-[#64748B]">Manage security roles across the platform</p>
            </div>
            <div className="flex items-center gap-3">
              <SearchInput
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64"
              />
              <Button icon={Plus} onClick={handleOpenAdd}>
                Add Role
              </Button>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {!loading && filteredRoles.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={searchTerm ? "No matching roles found" : "No system roles created"}
              description={searchTerm ? "Try searching for another keyword" : "Click 'Add Role' to create your first system role"}
            />
          ) : (
            <DataTable
              columns={columns}
              data={filteredRoles}
              isLoading={loading}
              sortConfig={sortConfig}
              onSortChange={handleSortChange}
            />
          )}
        </section>

        {/* Add / Edit Modal */}
        {(isAddModalOpen || editingRole) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-6 space-y-5">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="text-[#23395B]" size={20} />
                  <h3 className="text-lg font-bold text-[#1E293B]">
                    {editingRole ? "Edit Role" : "Add New Role"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitForm} className="space-y-4">
                {formError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#1E293B] uppercase tracking-wider mb-1">
                    Role Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Quality Auditor"
                    value={formData.role_name}
                    onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#23395B]/20 focus:border-[#23395B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E293B] uppercase tracking-wider mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of permissions and scope..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#23395B]/20 focus:border-[#23395B]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t">
                  <Button variant="ghost" type="button" onClick={handleCloseModal}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Saving..." : editingRole ? "Update Role" : "Create Role"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-6 space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-3 bg-rose-50 rounded-xl">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1E293B]">Delete Role</h3>
                  <p className="text-xs text-slate-500">Confirm role removal</p>
                </div>
              </div>

              <p className="text-sm text-slate-600">
                Are you sure you want to delete the role <strong className="text-slate-900">{deletingRole.role_name}</strong>?
              </p>

              {deletingRole.user_count > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  ⚠️ <strong>Notice:</strong> This role is assigned to <strong>{deletingRole.user_count} user(s)</strong>. You cannot delete this role until users are re-assigned to a different role.
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <Button variant="ghost" onClick={() => setDeletingRole(null)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteRole}
                  disabled={submitting || deletingRole.user_count > 0}
                >
                  {submitting ? "Deleting..." : "Confirm Delete"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Workspace>
    </MainLayout>
  );
};

export default RolesManagement;
