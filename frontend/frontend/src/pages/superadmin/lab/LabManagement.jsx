import React, { useEffect, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2, CheckCircle2, Eye, Filter, MoreVertical,
  Power, SearchX, Users, FolderKanban, Plus, Search, RotateCcw, Pencil, CreditCard,
  ArrowUp, ArrowDown, ArrowUpDown
} from "lucide-react";
import { MainLayout } from "../../../components/layout";
import { TableSkeleton } from "../../../components/ui/Skeleton";
import { TablePagination } from "../../../components/ui/TablePagination";
import { useDebounce } from "../../../hooks/useDebounce";
import { api } from "../../../api";

const getStatusBadge = (status) => {
  const norm = String(status || "").toLowerCase();
  const isAct = norm === "active";
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${isAct
        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
        : "bg-slate-100 text-slate-700 border-slate-200"
      }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isAct ? "bg-emerald-500" : "bg-slate-500"}`} />
      {isAct ? "Active" : "Inactive"}
    </span>
  );
};

// Exact KPI Card matching Home.jsx (Without Utilization Rate)
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
            <span className="text-3xl font-black tracking-tight text-[#243744]">{Number(value).toLocaleString()}</span>
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

// Reusable Portal Action Menu matching ProjectsList
const PortalActionMenu = ({ anchorEl, open, onClose, actions }) => {
  const [style, setStyle] = useState(null);

  useEffect(() => {
    if (!open || !anchorEl) return;

    const updatePosition = () => {
      const rect = anchorEl.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const estimatedHeight = actions.length * 36 + 12;
      const dropdownWidth = 180;
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
            className={`w-full px-4 py-2 text-xs font-semibold flex items-center gap-2 hover:bg-[#FAF9FF] transition-colors ${act.danger ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-[#475569] hover:text-[#243744]"
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

const LabManagement = () => {
  const navigate = useNavigate();
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [filterStatus, setFilterStatus] = useState("all");

  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [activeAnchorEl, setActiveAnchorEl] = useState(null);

  // Pagination states matching ProjectsList
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sort state (Default: Laboratory Name Ascending)
  const [sortConfig, setSortConfig] = useState({ key: "lab_name", direction: "asc" });

  const fetchLabs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/superadmin/labs");
      setLabs(response.data?.data || []);
    } catch (fetchError) {
      console.error("Error fetching labs:", fetchError);
      setError("Failed to load laboratory network");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLabs();
  }, [fetchLabs]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterStatus, sortConfig]);

  const handleSortChange = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const filteredLabs = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    const filtered = labs.filter((lab) => {
      const matchesSearch =
        !query ||
        lab.lab_name?.toLowerCase().includes(query) ||
        lab.contact_email?.toLowerCase().includes(query) ||
        lab.address?.toLowerCase().includes(query);
      const matchesStatus = filterStatus === "all" || lab.status === filterStatus;
      return matchesSearch && matchesStatus;
    });

    return filtered.sort((a, b) => {
      const key = sortConfig.key || "lab_name";
      let valA = a[key] ?? "";
      let valB = b[key] ?? "";

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [labs, debouncedSearch, filterStatus, sortConfig]);

  const paginatedLabs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLabs.slice(start, start + pageSize);
  }, [filteredLabs, currentPage, pageSize]);

  // Aggregates for 4 KPI cards matching Home.jsx
  const totalLabsCount = labs.length;
  const activeLabsCount = useMemo(() => labs.filter((l) => l.status === "active").length, [labs]);
  const totalProjectsCount = useMemo(() => labs.reduce((sum, l) => sum + (l.total_projects || 0), 0), [labs]);
  const totalUsersCount = useMemo(() => labs.reduce((sum, l) => sum + (l.total_users || 0), 0), [labs]);

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

  const handleToggleDropdown = (labId, event) => {
    if (activeDropdownId === labId) {
      setActiveDropdownId(null);
      setActiveAnchorEl(null);
    } else {
      setActiveDropdownId(labId);
      setActiveAnchorEl(event.currentTarget);
    }
  };

  return (
    <MainLayout headerTitle="Lab Management" headerSubtitle="Tenant network, status, and operational ownership">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6 space-y-6">

        {/* ── 1. Exact 4 Hero KPI Cards matching Home.jsx (Without Utilization Rate) ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Registered Laboratories"
            value={totalLabsCount}
            subtitle={`${activeLabsCount} Operational Accounts`}
            icon={Building2}
            tone="navy"
          />
          <KpiCard
            title="Active System Users"
            value={totalUsersCount}
            subtitle="Engineers & Managers"
            icon={Users}
            tone="purple"
          />
          <KpiCard
            title="Global Projects"
            value={totalProjectsCount}
            subtitle="Across All Labs"
            icon={FolderKanban}
            tone="emerald"
          />
          <KpiCard
            title="Operational Status"
            value={activeLabsCount}
            subtitle="Active LIMS Instances"
            icon={CheckCircle2}
            tone="amber"
          />
        </div>

        {/* ── 2. Toolbar & Controls ── */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search Box */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3.5 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search lab name, contact email, address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs font-semibold border border-[#E2E8F0] rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-colors"
                />
              </div>

              {/* Status Filter Dropdown */}
              <div className="relative">
                <Filter className="absolute left-3 top-2.5 text-slate-400" size={15} />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="pl-9 pr-8 py-2 text-xs font-semibold border border-[#E2E8F0] bg-white rounded-xl outline-none focus:border-[#243744] transition-colors cursor-pointer appearance-none"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Create New Lab Button */}
            <button
              type="button"
              onClick={() => navigate("/labs/add")}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#243744] hover:bg-[#1A2733] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus size={16} />
              <span>Create New Lab</span>
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
            {error}
          </div>
        )}

        {/* ── 3. Desktop Table View ── */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          {loading ? (
            <TableSkeleton rows={5} cols={7} />
          ) : filteredLabs.length === 0 ? (
            <div className="p-16 text-center">
              <Building2 size={40} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800">No laboratories found</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">Adjust your search terms or filter selection.</p>
              <button
                type="button"
                onClick={() => { setSearchTerm(""); setFilterStatus("all"); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#243744] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                <RotateCcw size={14} />
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#FAFBFD] text-[10px] font-bold text-[#64748B] uppercase tracking-wider select-none">
                    <th className="px-6 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("lab_name")}>
                      <div className="flex items-center gap-1.5">
                        <span>Laboratory Name</span>
                        {sortConfig.key === "lab_name" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("address")}>
                      <div className="flex items-center gap-1.5">
                        <span>Contact & Location</span>
                        {sortConfig.key === "address" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3.5 text-center cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("total_projects")}>
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Projects</span>
                        {sortConfig.key === "total_projects" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3.5 text-center cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("total_clients")}>
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Clients</span>
                        {sortConfig.key === "total_clients" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3.5 text-center cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("total_users")}>
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Users</span>
                        {sortConfig.key === "total_users" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("status")}>
                      <div className="flex items-center gap-1.5">
                        <span>Status</span>
                        {sortConfig.key === "status" ? (
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
                  {paginatedLabs.map((lab) => (
                    <motion.tr key={lab.lab_id} variants={stagger.item} className="hover:bg-[#FAF9FF] transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-xs text-[#1E293B] truncate max-w-[240px]">{lab.lab_name}</p>
                        <p className="text-[11px] font-medium text-[#64748B] truncate max-w-[240px] mt-0.5">{lab.contact_email || "No email"}</p>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-[#475569]">
                        <p className="font-semibold text-slate-800">{lab.contact_phone || "—"}</p>
                        <p className="text-[11px] font-normal text-slate-400 truncate max-w-[220px] mt-0.5">{lab.address || "No address"}</p>
                      </td>
                      <td className="px-6 py-4 text-center text-xs font-bold text-slate-800">{lab.total_projects ?? 0}</td>
                      <td className="px-6 py-4 text-center text-xs font-bold text-slate-800">{lab.total_clients ?? 0}</td>
                      <td className="px-6 py-4 text-center text-xs font-bold text-slate-800">{lab.total_users ?? 0}</td>
                      <td className="px-6 py-4">{getStatusBadge(lab.status)}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={(e) => handleToggleDropdown(lab.lab_id, e)}
                          className="p-1.5 hover:bg-[#F1F5F9] rounded-lg transition-colors text-[#8A97A4] hover:text-[#1A2733] cursor-pointer"
                        >
                          <MoreVertical size={16} />
                        </button>

                        <PortalActionMenu
                          anchorEl={activeDropdownId === lab.lab_id ? activeAnchorEl : null}
                          open={activeDropdownId === lab.lab_id}
                          onClose={() => { setActiveDropdownId(null); setActiveAnchorEl(null); }}
                          actions={[
                            { label: "View Details", icon: Eye, onClick: () => navigate(`/labs/view/${lab.lab_id}`) },
                            { label: "Edit Lab", icon: Pencil, onClick: () => navigate(`/labs/edit/${lab.lab_id}`) },
                            { label: "Manage Subscriptions", icon: CreditCard, onClick: () => navigate("/superadmin/subscriptions") },
                            lab.status === "active"
                              ? { label: "Suspend Lab", icon: SearchX, danger: true, onClick: () => handleDeleteLab(lab.lab_id) }
                              : { label: "Activate Lab", icon: Power, onClick: () => handleActivateLab(lab.lab_id) }
                          ]}
                        />
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          )}

          {/* ── 4. Table Pagination matching ProjectsList ── */}
          <TablePagination
            totalItems={filteredLabs.length}
            pageSize={pageSize}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="labs"
          />
        </div>

      </div>
    </MainLayout>
  );
};

export default LabManagement;
