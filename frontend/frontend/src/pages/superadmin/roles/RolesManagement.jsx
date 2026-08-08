import React, { useEffect, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  Shield, Plus, Edit2, Trash2, CheckCircle2, Users, AlertCircle, X, ShieldCheck, Search, RotateCcw, MoreVertical,
  ArrowUp, ArrowDown, ArrowUpDown
} from "lucide-react";
import { MainLayout } from "../../../components/layout";
import { TableSkeleton } from "../../../components/ui/Skeleton";
import { TablePagination } from "../../../components/ui/TablePagination";
import { useDebounce } from "../../../hooks/useDebounce";
import { rolesAPI } from "../../../api/roles";

// Exact KPI Card matching Home.jsx & LabManagement.jsx (Without Utilization Rate)
const KpiCard = ({ title, value = 0, subtitle, icon: Icon, tone = "navy" }) => {
  const toneStyles = {
    navy: { border: "border-slate-200/80", bg: "bg-white", iconBg: "bg-[#243744]/10 text-[#243744]" },
    emerald: { border: "border-emerald-200/80", bg: "bg-white", iconBg: "bg-emerald-50 text-emerald-600" },
    blue: { border: "border-blue-200/80", bg: "bg-white", iconBg: "bg-blue-50 text-blue-600" },
    amber: { border: "border-amber-200/80", bg: "bg-white", iconBg: "bg-amber-50 text-amber-600" },
    purple: { border: "border-purple-200/80", bg: "bg-white", iconBg: "bg-purple-50 text-purple-600" }
  };

  const style = toneStyles[tone] || toneStyles.navy;

  return (
    <motion.article
      whileHover={{ y: -3, boxShadow: "0 14px 30px rgba(0,0,0,0.06)" }}
      className={`relative overflow-hidden rounded-2xl border ${style.border} ${style.bg} p-5 shadow-sm transition-all duration-200`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-[#243744]">{typeof value === 'number' ? value.toLocaleString() : value}</span>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</p>
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${style.iconBg} shadow-inner`}>
          <Icon size={22} strokeWidth={2.2} />
        </div>
      </div>
    </motion.article>
  );
};

// Reusable Portal Action Menu matching LabManagement & ProjectsList
const PortalActionMenu = ({ anchorEl, open, onClose, actions }) => {
  const [style, setStyle] = useState(null);

  useEffect(() => {
    if (!open || !anchorEl) return;

    const updatePosition = () => {
      const rect = anchorEl.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const estimatedHeight = actions.length * 36 + 12;
      const dropdownWidth = 160;
      const gap = 6;

      const spaceBelow = viewportHeight - rect.bottom;

      let top;
      if (spaceBelow >= estimatedHeight + gap) {
        top = rect.bottom + window.scrollY + gap;
      } else {
        top = rect.top + window.scrollY - estimatedHeight - gap;
      }

      let left = rect.right - dropdownWidth + window.scrollX;
      if (left < 8) left = 8;
      if (left + dropdownWidth > viewportWidth - 8) {
        left = viewportWidth - dropdownWidth - 8;
      }

      setStyle({
        position: "absolute",
        top: `${top}px`,
        left: `${left}px`,
        width: `${dropdownWidth}px`,
        zIndex: 9999,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    const handleClickOutside = (event) => {
      if (anchorEl && !anchorEl.contains(event.target) && !event.target.closest(".portal-action-menu")) {
        onClose();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, anchorEl, onClose, actions]);

  if (!open || !anchorEl || !style) return null;

  return createPortal(
    <div
      style={style}
      className="portal-action-menu bg-white rounded-xl border border-[#E2E8F0] shadow-lg py-1.5 text-left text-slate-800"
    >
      {actions.map((act, idx) => {
        const Icon = act.icon;
        return (
          <button
            key={idx}
            onClick={() => {
              onClose();
              act.onClick();
            }}
            className={`w-full px-4 py-2 text-xs font-semibold flex items-center gap-2 hover:bg-[#FAF9FF] transition-colors ${
              act.danger ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-[#475569] hover:text-[#243744]"
            }`}
          >
            {Icon && <Icon size={14} />}
            {act.label}
          </button>
        );
      })}
    </div>,
    document.body
  );
};

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } },
  item: {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 0.68, 0, 1] } },
  },
};

const RolesManagement = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Pagination states matching LabManagement
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sort state (Default: Role Name Ascending)
  const [sortConfig, setSortConfig] = useState({ key: "role_name", direction: "asc" });

  // Dropdown states
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [activeAnchorEl, setActiveAnchorEl] = useState(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [deletingRole, setDeletingRole] = useState(null);

  // Form states
  const [formData, setFormData] = useState({ role_name: "", description: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchRoles = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, sortConfig]);

  const handleSortChange = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const filteredRoles = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
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
  }, [roles, debouncedSearch, sortConfig]);

  const paginatedRoles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRoles.slice(start, start + pageSize);
  }, [filteredRoles, currentPage, pageSize]);

  // Aggregates for 4 KPI Cards matching LabManagement
  const totalRolesCount = roles.length;
  const activeRolesCount = useMemo(() => roles.filter((r) => (r.user_count || 0) > 0).length, [roles]);
  const totalUsersCount = useMemo(() => roles.reduce((sum, r) => sum + (r.user_count || 0), 0), [roles]);

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

  const handleToggleDropdown = (roleId, event) => {
    if (activeDropdownId === roleId) {
      setActiveDropdownId(null);
      setActiveAnchorEl(null);
    } else {
      setActiveDropdownId(roleId);
      setActiveAnchorEl(event.currentTarget);
    }
  };

  return (
    <MainLayout headerTitle="Role Management" headerSubtitle="Define system permissions and user access levels">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6 space-y-6">

        {/* ── 1. Exact 4 Hero KPI Cards matching LabManagement & Home.jsx ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Total Roles"
            value={totalRolesCount}
            subtitle="System Access Roles"
            icon={Shield}
            tone="navy"
          />
          <KpiCard
            title="Active Roles"
            value={activeRolesCount}
            subtitle="Assigned to Active Staff"
            icon={CheckCircle2}
            tone="purple"
          />
          <KpiCard
            title="Total Users"
            value={totalUsersCount}
            subtitle="Linked to System Roles"
            icon={Users}
            tone="emerald"
          />
          <KpiCard
            title="Global Scope"
            value="Global"
            subtitle="Applies Platform-wide"
            icon={ShieldCheck}
            tone="amber"
          />
        </div>

        {/* ── 2. Toolbar & Controls matching LabManagement ── */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search Box */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3.5 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search role name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs font-semibold border border-[#E2E8F0] rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-colors"
                />
              </div>
            </div>

            {/* Create New Role Button */}
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#243744] hover:bg-[#1A2733] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus size={16} />
              <span>Add New Role</span>
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
            {error}
          </div>
        )}

        {/* ── 3. Desktop Table View matching LabManagement ── */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          {loading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : filteredRoles.length === 0 ? (
            <div className="p-16 text-center">
              <Shield size={40} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800">No system roles found</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">Adjust your search query or add a new role.</p>
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#243744] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                <RotateCcw size={14} />
                Reset Search
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#FAFBFD] text-[10px] font-bold text-[#64748B] uppercase tracking-wider select-none">
                    <th className="px-6 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("role_name")}>
                      <div className="flex items-center gap-1.5">
                        <span>Role Name</span>
                        {sortConfig.key === "role_name" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("description")}>
                      <div className="flex items-center gap-1.5">
                        <span>Description</span>
                        {sortConfig.key === "description" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3.5 text-center cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("user_count")}>
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Assigned Users</span>
                        {sortConfig.key === "user_count" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("created_at")}>
                      <div className="flex items-center gap-1.5">
                        <span>Created At</span>
                        {sortConfig.key === "created_at" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3.5 text-center w-[90px]">Actions</th>
                  </tr>
                </thead>
                <motion.tbody variants={stagger.container} initial="hidden" animate="visible" className="divide-y divide-[#F1F5F9]">
                  {paginatedRoles.map((role) => (
                    <motion.tr key={role.role_id} variants={stagger.item} className="hover:bg-[#FAF9FF] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#1E293B]">{role.role_name}</span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            Global
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-[#64748B] max-w-xs truncate">
                        {role.description || "No description provided"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                          (role.user_count || 0) > 0
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}>
                          <Users size={12} />
                          {role.user_count || 0} {(role.user_count || 0) === 1 ? "user" : "users"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-[#64748B]">
                        {role.created_at ? new Date(role.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={(e) => handleToggleDropdown(role.role_id, e)}
                          className="p-1.5 hover:bg-[#F1F5F9] rounded-lg transition-colors text-[#8A97A4] hover:text-[#1A2733] cursor-pointer"
                        >
                          <MoreVertical size={16} />
                        </button>

                        <PortalActionMenu
                          anchorEl={activeDropdownId === role.role_id ? activeAnchorEl : null}
                          open={activeDropdownId === role.role_id}
                          onClose={() => { setActiveDropdownId(null); setActiveAnchorEl(null); }}
                          actions={[
                            { label: "Edit Role", icon: Edit2, onClick: () => handleOpenEdit(role) },
                            { label: "Delete Role", icon: Trash2, danger: true, onClick: () => setDeletingRole(role) }
                          ]}
                        />
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          )}

          {/* ── 4. Table Pagination matching LabManagement & ProjectsList ── */}
          <TablePagination
            totalItems={filteredRoles.length}
            pageSize={pageSize}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="roles"
          />
        </div>

        {/* Add / Edit Modal */}
        {(isAddModalOpen || editingRole) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-6 space-y-5">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="text-[#243744]" size={20} />
                  <h3 className="text-lg font-bold text-[#1E293B]">
                    {editingRole ? "Edit Role" : "Add New Role"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
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
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#243744]/10 focus:border-[#243744]"
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
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#243744]/10 focus:border-[#243744]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-[#243744] hover:bg-[#1A2733] text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
                  >
                    {submitting ? "Saving..." : editingRole ? "Update Role" : "Create Role"}
                  </button>
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

              <p className="text-xs font-medium text-slate-600">
                Are you sure you want to delete the role <strong className="text-slate-900">{deletingRole.role_name}</strong>?
              </p>

              {deletingRole.user_count > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  ⚠️ <strong>Notice:</strong> This role is assigned to <strong>{deletingRole.user_count} user(s)</strong>. You cannot delete this role until users are re-assigned to a different role.
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setDeletingRole(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteRole}
                  disabled={submitting || deletingRole.user_count > 0}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {submitting ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </MainLayout>
  );
};

export default RolesManagement;
