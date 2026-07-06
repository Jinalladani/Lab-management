import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus, Download, RefreshCw, Eye, Pencil,
  MoreHorizontal, Users, Search
} from "lucide-react";
import { usersAPI } from "../../api/users";
import { rolesAPI } from "../../api/roles";
import { MainLayout } from "../../components/layout";
import { Avatar } from "../../components/ui";
import { TableSkeleton } from "../../components/ui/Skeleton";

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } },
  item: {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 0.68, 0, 1] } },
  },
};

const getAvatarBg = () => {
  return "bg-[#243744]"; // Brand sidebar color for all avatars
};

// Portal-based scroll/resize safe action menu to prevent container cutting and toggle directions
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
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", handleClickOutside);
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
            className="w-full px-4 py-2 text-xs font-semibold flex items-center gap-2 hover:bg-[#FAF9FF] text-[#475569] hover:text-[#243744] transition-colors"
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

const UsersList = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [activeAnchorEl, setActiveAnchorEl] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const rolesResponse = await rolesAPI.getLabRoles();
      const rolesList = rolesResponse.data?.roles || [];
      setRoles(rolesList);

      const response = await usersAPI.getLabUsers();
      const userData = response.data?.users || [];
      setAllUsers(userData);
      setUsers(userData);
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    let filtered = allUsers;

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.first_name?.toLowerCase().includes(q) ||
          u.last_name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((u) =>
        statusFilter === "active" ? u.is_active : !u.is_active
      );
    }

    setUsers(filtered);
  }, [search, statusFilter, allUsers]);

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  };

  const getStatusBadge = (isActive) => (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
      isActive ? "bg-[#ECFDF5] text-[#10B981]" : "bg-[#FEF2F2] text-[#EF4444]"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-[#10B981]" : "bg-[#EF4444]"}`} />
      {isActive ? "Active" : "Inactive"}
    </span>
  );

  const getVerifiedBadge = (isVerified) => (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
      isVerified ? "bg-[#ECFDF5] text-[#10B981]" : "bg-[#F1F5F9] text-[#64748B]"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isVerified ? "bg-[#10B981]" : "bg-[#64748B]"}`} />
      {isVerified ? "Yes" : "No"}
    </span>
  );

  const getUserRoleName = (roleId) => {
    const role = roles.find(r => String(r.role_id) === String(roleId));
    return role ? role.role_name : "User";
  };

  const handleToggleDropdown = (userId, event) => {
    if (activeDropdownId === userId) {
      setActiveDropdownId(null);
      setActiveAnchorEl(null);
    } else {
      setActiveDropdownId(userId);
      setActiveAnchorEl(event.currentTarget);
    }
  };

  return (
    <MainLayout headerTitle="Users" headerSubtitle="Manage lab users">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">

        {/* Toolbar */}
        <div className="mb-6 flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between">
          
          {/* Search Box */}
          <div className="flex-1 max-w-xl flex h-10 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 focus-within:border-[#243744] focus-within:ring-2 focus-within:ring-[#243744]/10 transition-all">
            <Search size={16} className="text-[#94A3B8] shrink-0" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none"
            />
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3.5 py-2 text-xs font-semibold text-[#475569] border border-[#E2E8F0] bg-white rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all shrink-0 min-w-[130px] appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%238A97A4' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: "right 10px center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "16px",
                paddingRight: "30px"
              }}
              aria-label="Filter users by status"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <button
              onClick={fetchUsers}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] px-4 text-xs font-bold text-[#475569] transition-colors"
            >
              <RefreshCw size={14} className="text-[#8A97A4]" />
              Refresh
            </button>

            <button
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] px-4 text-xs font-bold text-[#475569] transition-colors"
            >
              <Download size={14} className="text-[#8A97A4]" />
              Export
            </button>

            <button
              onClick={() => navigate("/users/add")}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#243744] hover:bg-[#1A2733] px-4 text-xs font-bold text-white shadow-sm transition-colors"
            >
              <UserPlus size={14} />
              Add User
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-semibold text-[#DC2626] shrink-0 animate-pulse">
            {errorMessage}
          </div>
        )}

        {/* Desktop Table */}
        <div className="hidden lg:block bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          {loading ? (
            <TableSkeleton rows={5} cols={7} />
          ) : users.length === 0 ? (
            <div className="p-16 text-center">
              <Users size={40} className="mx-auto text-[#94A3B8] mb-3" />
              <h3 className="text-base font-bold text-[#1E293B]">No users found</h3>
              <p className="text-xs text-[#64748B] mt-1">Try adjusting your search query or status filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#FAFBFD] text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                    <th className="px-6 py-3.5">User</th>
                    <th className="px-6 py-3.5">Email</th>
                    <th className="px-6 py-3.5">Phone</th>
                    <th className="px-6 py-3.5">Role</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Verified</th>
                    <th className="px-6 py-3.5">Last Login</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <motion.tbody variants={stagger.container} initial="hidden" animate="visible" className="divide-y divide-[#F1F5F9]">
                  {users.map((user) => {
                    const fullNameVal = user.full_name || `${user.first_name} ${user.last_name}`;
                    return (
                      <motion.tr key={user.user_id} variants={stagger.item} className="hover:bg-[#FAF9FF] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar 
                              name={fullNameVal} 
                              size="sm" 
                              bgClass={getAvatarBg()} 
                            />
                            <span className="font-bold text-xs text-[#1E293B]">
                              {fullNameVal}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-[#475569]">{user.email}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-[#475569]">{user.phone || "—"}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-lg bg-[#F1F5F9] text-[#475569] px-2.5 py-0.5 text-[10px] font-bold border border-[#E2E8F0]">
                            {getUserRoleName(user.role_id)}
                          </span>
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(user.is_active)}</td>
                        <td className="px-6 py-4">{getVerifiedBadge(user.is_email_verified)}</td>
                        <td className="px-6 py-4 text-xs text-[#64748B] font-medium">{formatDate(user.last_login)}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => handleToggleDropdown(user.user_id, e)}
                            className="p-1.5 hover:bg-[#F1F5F9] rounded-lg transition-colors text-[#8A97A4] hover:text-[#1A2733]"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          
                          <PortalActionMenu
                            anchorEl={activeDropdownId === user.user_id ? activeAnchorEl : null}
                            open={activeDropdownId === user.user_id}
                            onClose={() => { setActiveDropdownId(null); setActiveAnchorEl(null); }}
                            actions={[
                              { label: "View Details", icon: Eye, onClick: () => navigate(`/users/${user.user_id}`) },
                              { label: "Edit User", icon: Pencil, onClick: () => navigate(`/users/${user.user_id}/edit`) }
                            ]}
                          />
                        </td>
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          <div className="flex items-center justify-between border-t border-[#E2E8F0] px-6 py-4 bg-white select-none">
            <p className="text-xs font-semibold text-[#64748B]">
              Showing <span className="text-[#1E293B]">{users.length}</span> of{" "}
              <span className="text-[#1E293B]">{allUsers.length}</span> users
            </p>
            <div className="flex items-center gap-1.5">
              <button 
                className="h-8 w-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] transition-colors disabled:opacity-40" 
                disabled
              >
                &lt;
              </button>
              <button 
                className="h-8 w-8 rounded-lg bg-[#243744] text-white flex items-center justify-center text-xs font-bold shadow-sm"
              >
                1
              </button>
              <button 
                className="h-8 w-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] transition-colors disabled:opacity-40" 
                disabled
              >
                &gt;
              </button>
            </div>
          </div>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="lab-skeleton h-40" />)}
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center bg-white border border-[#E2E8F0] rounded-2xl">
              <Users size={32} className="mx-auto text-[#94A3B8] mb-2" />
              <h3 className="text-sm font-bold text-[#1E293B]">No users found</h3>
            </div>
          ) : (
            <motion.div className="space-y-4" variants={stagger.container} initial="hidden" animate="visible">
              {users.map((user) => {
                const fullNameVal = user.full_name || `${user.first_name} ${user.last_name}`;
                return (
                  <motion.div
                    key={user.user_id}
                    className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden"
                    variants={stagger.item}
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-3 gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar 
                            name={fullNameVal} 
                            size="md" 
                            bgClass={getAvatarBg()} 
                          />
                          <div className="min-w-0">
                            <h3 className="font-bold text-sm text-[#1E293B] truncate">
                              {fullNameVal}
                            </h3>
                            <p className="text-xs text-[#64748B] truncate">{user.email}</p>
                          </div>
                        </div>
                        {getStatusBadge(user.is_active)}
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A97A4] mb-0.5">Phone</p>
                          <p className="font-semibold text-[#1E293B]">{user.phone || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A97A4] mb-0.5">Role</p>
                          <p className="font-semibold text-[#1E293B]">{getUserRoleName(user.role_id)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A97A4] mb-0.5">Verified</p>
                          {getVerifiedBadge(user.is_email_verified)}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A97A4] mb-0.5">Last Login</p>
                          <p className="font-semibold text-[#57687A]">{formatDate(user.last_login)}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-[#F1F5F9]">
                        <button
                          onClick={() => navigate(`/users/${user.user_id}`)}
                          className="flex-1 py-2 text-xs font-bold text-[#475569] hover:bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Eye size={14} />
                          View Details
                        </button>
                        <button
                          onClick={() => navigate(`/users/${user.user_id}/edit`)}
                          className="flex-1 py-2 text-xs font-bold text-[#243744] hover:bg-[#243744]/5 border border-[#243744]/20 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Pencil size={14} />
                          Edit User
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default UsersList;
