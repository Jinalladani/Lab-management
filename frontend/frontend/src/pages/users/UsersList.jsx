import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  UserPlus, Download, RefreshCw, Eye, Pencil,
  MoreHorizontal, Users, Filter, UserCheck, UserX, Search,
} from "lucide-react";
import { usersAPI } from "../../api/users";
import { MainLayout } from "../../components/layout";
import {
  PageHeader, SearchInput, Badge, Avatar,
  ActionDropdown, Button, EmptyState,
} from "../../components/ui";
import { TableSkeleton } from "../../components/ui/Skeleton";

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } },
  item: {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 0.68, 0, 1] } },
  },
};

const UsersList = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [openDropdownId, setOpenDropdownId] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");
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
  }, [search, statusFilter, roleFilter, allUsers]);

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  };

  const getStatusBadge = (isActive) => (
    <Badge variant={isActive ? "success" : "danger"} dot>
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );

  const getVerifiedBadge = (isVerified) => (
    <Badge variant={isVerified ? "success" : "warning"} dot>
      {isVerified ? "Verified" : "Not Verified"}
    </Badge>
  );

  const activeCount = allUsers.filter((u) => u.is_active).length;
  const inactiveCount = allUsers.length - activeCount;

  return (
    <MainLayout headerTitle="Users" headerSubtitle="Manage lab users">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">
        <PageHeader
          title="User Management"
          subtitle={`${allUsers.length} team member${allUsers.length !== 1 ? "s" : ""} · ${activeCount} active · ${inactiveCount} inactive`}
          icon="users"
          actions={
            <Button
              variant="primary"
              icon={UserPlus}
              onClick={() => navigate("/users/add")}
            >
              Add User
            </Button>
          }
        />

        {/* Toolbar */}
        <motion.div
          className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.25 }}
        >
          <div className="flex flex-1 items-center gap-3">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full sm:max-w-xs"
            />

            {/* Status Filter */}
            <div className="hidden sm:flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="app-select !py-2.5 !text-xs !w-auto !min-w-[120px]"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={RefreshCw} onClick={fetchUsers}>
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="ghost" size="sm" icon={Download}>
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </motion.div>

        {errorMessage && (
          <motion.div
            className="mb-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#DC2626]"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {errorMessage}
          </motion.div>
        )}

        {/* Desktop Table */}
        <motion.div
          className="hidden lg:block"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
        >
          {loading ? (
            <TableSkeleton rows={5} cols={7} />
          ) : users.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No users found"
              description={search ? "Try adjusting your search or filters" : "Get started by adding your first team member"}
              action={
                !search && (
                  <Button variant="primary" icon={UserPlus} onClick={() => navigate("/users/add")} size="sm">
                    Add User
                  </Button>
                )
              }
            />
          ) : (
            <div className="app-table-container">
              <div className="overflow-x-auto">
                <table className="app-table min-w-[1000px]">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Email Verified</th>
                      <th>Last Login</th>
                      <th>Created</th>
                      <th className="w-[60px]"></th>
                    </tr>
                  </thead>
                  <motion.tbody variants={stagger.container} initial="hidden" animate="visible">
                    {users.map((user) => (
                      <motion.tr key={user.user_id} variants={stagger.item}>
                        <td>
                          <div className="flex items-center gap-3">
                            <Avatar name={user.full_name || `${user.first_name} ${user.last_name}`} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[#1A2733]">{user.full_name}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="text-[#57687A]">{user.email}</span>
                        </td>
                        <td>
                          <span className="text-[#57687A]">{user.phone || "—"}</span>
                        </td>
                        <td>
                          <Badge variant="info">
                            {user.role_name || "User"}
                          </Badge>
                        </td>
                        <td>{getStatusBadge(user.is_active)}</td>
                        <td>{getVerifiedBadge(user.is_email_verified)}</td>
                        <td>
                          <span className="text-[#8A97A4] text-xs">{formatDate(user.last_login)}</span>
                        </td>
                        <td>
                          <span className="text-[#8A97A4] text-xs">{formatDate(user.created_at)}</span>
                        </td>
                        <td>
                          <ActionDropdown
                            open={openDropdownId === user.user_id}
                            onOpenChange={(isOpen) => setOpenDropdownId(isOpen ? user.user_id : null)}
                            trigger={
                              <button
                                type="button"
                                onClick={() => setOpenDropdownId(openDropdownId === user.user_id ? null : user.user_id)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8A97A4] transition-colors hover:bg-[#F0F2F5] hover:text-[#1A2733]"
                                aria-label="Actions"
                              >
                                <MoreHorizontal size={16} />
                              </button>
                            }
                            items={[
                              { label: "View Details", icon: Eye, onClick: () => navigate(`/users/${user.user_id}`) },
                              { label: "Edit User", icon: Pencil, onClick: () => navigate(`/users/${user.user_id}/edit`) },
                            ]}
                          />
                        </td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </table>
              </div>

              {/* Pagination footer */}
              <div className="flex items-center justify-between border-t border-[#EDF0F3] px-5 py-3">
                <p className="text-xs text-[#8A97A4]">
                  Showing <span className="font-semibold text-[#57687A]">{users.length}</span> of{" "}
                  <span className="font-semibold text-[#57687A]">{allUsers.length}</span> users
                </p>
                <div className="flex items-center gap-1.5">
                  <button className="app-button app-button-secondary !h-8 !px-3 !text-xs !rounded-lg" disabled>
                    Previous
                  </button>
                  <button className="app-button app-button-secondary !h-8 !px-3 !text-xs !rounded-lg" disabled>
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Mobile Card View */}
        <div className="lg:hidden">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="lab-skeleton h-48" />)}
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No users found"
              description={search ? "Try adjusting your search or filters" : "Get started by adding your first team member"}
            />
          ) : (
            <motion.div className="space-y-3" variants={stagger.container} initial="hidden" animate="visible">
              {users.map((user) => (
                <motion.div
                  key={user.user_id}
                  className="app-section-card"
                  variants={stagger.item}
                >
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4 gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar name={user.full_name || `${user.first_name} ${user.last_name}`} size="md" />
                        <div className="min-w-0">
                          <h3 className="font-semibold text-[#1A2733] break-words">{user.full_name}</h3>
                          <p className="text-xs text-[#8A97A4] truncate">{user.email}</p>
                        </div>
                      </div>
                      {getStatusBadge(user.is_active)}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A97A4] mb-1">Phone</p>
                        <p className="text-sm text-[#1A2733]">{user.phone || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A97A4] mb-1">Email</p>
                        {getVerifiedBadge(user.is_email_verified)}
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A97A4] mb-1">Last Login</p>
                        <p className="text-sm text-[#57687A]">{formatDate(user.last_login)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A97A4] mb-1">Created</p>
                        <p className="text-sm text-[#57687A]">{formatDate(user.created_at)}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-[#EDF0F3]">
                      <Button variant="ghost" size="sm" icon={Eye} onClick={() => navigate(`/users/${user.user_id}`)} className="flex-1">
                        View
                      </Button>
                      <Button variant="ghost" size="sm" icon={Pencil} onClick={() => navigate(`/users/${user.user_id}/edit`)} className="flex-1">
                        Edit
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default UsersList;
