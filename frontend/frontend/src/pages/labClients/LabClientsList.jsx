import React, { useEffect, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Eye, Pencil, Search, RefreshCw, Download, MoreHorizontal, Briefcase,
  ArrowUp, ArrowDown, ArrowUpDown
} from "lucide-react";
import { getClients } from "../../api/clients";
import { MainLayout } from "../../components/layout";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { TablePagination } from "../../components/ui/TablePagination";

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } },
  item: {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 0.68, 0, 1] } },
  },
};

const getStatusBadge = (status) => {
  const isActive = String(status || "").toLowerCase() === "active";
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
      isActive ? "bg-[#ECFDF5] text-[#10B981]" : "bg-[#FEF2F2] text-[#EF4444]"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-[#10B981]" : "bg-[#EF4444]"}`} />
      {status || "Active"}
    </span>
  );
};

// Reusable Portal Action Menu to prevent parent clip and handle screen boundary directions
const PortalActionMenu = ({ anchorEl, open, onClose, actions }) => {
  const [style, setStyle] = useState(null);

  useEffect(() => {
    if (!open || !anchorEl) return;

    const updatePosition = () => {
      const rect = anchorEl.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Estimate menu height based on actions count
      const estimatedHeight = actions.length * 36 + 12;
      const dropdownWidth = 150;
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

const LabClientsList = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sorting state (Default: client_name ascending)
  const [sortConfig, setSortConfig] = useState({ key: "client_name", direction: "asc" });

  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [activeAnchorEl, setActiveAnchorEl] = useState(null);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await getClients({ search });
      setClients(response.data?.data || []);
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Failed to fetch lab clients");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortConfig]);

  const handleSortChange = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => {
      const key = sortConfig.key || "client_name";
      let valA = a[key] ?? "";
      let valB = b[key] ?? "";

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [clients, sortConfig]);

  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedClients.slice(start, start + pageSize);
  }, [sortedClients, currentPage, pageSize]);

  const handleExport = () => {
    alert("Client export will be available in the next release.");
  };

  const handleToggleDropdown = (clientId, event) => {
    if (activeDropdownId === clientId) {
      setActiveDropdownId(null);
      setActiveAnchorEl(null);
    } else {
      setActiveDropdownId(clientId);
      setActiveAnchorEl(event.currentTarget);
    }
  };

  return (
    <MainLayout headerTitle="Clients" headerSubtitle="Manage your lab clients">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">

        {/* Toolbar */}
        <div className="mb-6 flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between">
          
          {/* Search Box */}
          <div className="flex-1 max-w-xl flex h-10 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 focus-within:border-[#243744] focus-within:ring-2 focus-within:ring-[#243744]/10 transition-all">
            <Search size={16} className="text-[#94A3B8] shrink-0" />
            <input
              type="text"
              placeholder="Search lab clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none"
            />
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-3">
            <button
              onClick={fetchClients}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] px-4 text-xs font-bold text-[#475569] transition-colors"
            >
              <RefreshCw size={14} className="text-[#8A97A4]" />
              Refresh
            </button>

            <button
              onClick={handleExport}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] px-4 text-xs font-bold text-[#475569] transition-colors"
            >
              <Download size={14} className="text-[#8A97A4]" />
              Export
            </button>

            <button
              onClick={() => navigate("/labClients/add")}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#243744] hover:bg-[#1A2733] px-4 text-xs font-bold text-white shadow-sm transition-colors"
            >
              <Plus size={14} />
              Add Client
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-semibold text-[#DC2626] animate-pulse">
            {errorMessage}
          </div>
        )}

        {/* Desktop Table View */}
        <div className="hidden lg:block bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          {loading ? (
            <TableSkeleton rows={5} cols={8} />
          ) : clients.length === 0 ? (
            <div className="p-16 text-center">
              <Briefcase size={40} className="mx-auto text-[#94A3B8] mb-3" />
              <h3 className="text-base font-bold text-[#1E293B]">No lab clients found</h3>
              <p className="text-xs text-[#64748B] mt-1">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#FAFBFD] text-[10px] font-bold text-[#64748B] uppercase tracking-wider select-none">
                    <th className="px-6 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("client_name")}>
                      <div className="flex items-center gap-1.5">
                        <span>Company Name</span>
                        {sortConfig.key === "client_name" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("contact_person")}>
                      <div className="flex items-center gap-1.5">
                        <span>Contact Person</span>
                        {sortConfig.key === "contact_person" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("email")}>
                      <div className="flex items-center gap-1.5">
                        <span>Email</span>
                        {sortConfig.key === "email" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("phone")}>
                      <div className="flex items-center gap-1.5">
                        <span>Phone</span>
                        {sortConfig.key === "phone" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("city")}>
                      <div className="flex items-center gap-1.5">
                        <span>City</span>
                        {sortConfig.key === "city" ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("gst_no")}>
                      <div className="flex items-center gap-1.5">
                        <span>GST No</span>
                        {sortConfig.key === "gst_no" ? (
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
                    <th className="px-6 py-3.5 text-right w-[90px]">Actions</th>
                  </tr>
                </thead>
                <motion.tbody variants={stagger.container} initial="hidden" animate="visible" className="divide-y divide-[#F1F5F9]">
                  {paginatedClients.map((client) => (
                    <motion.tr key={client.client_id} variants={stagger.item} className="hover:bg-[#FAF9FF] transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-[#1E293B]">{client.client_name}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-[#475569]">{client.contact_person || "—"}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-[#475569]">{client.email || "—"}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-[#475569]">{client.phone || "—"}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-[#475569]">{client.city || "—"}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-[#475569]">{client.gst_no || "—"}</td>
                      <td className="px-6 py-4">{getStatusBadge(client.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => handleToggleDropdown(client.client_id, e)}
                          className="p-1.5 hover:bg-[#F1F5F9] rounded-lg transition-colors text-[#8A97A4] hover:text-[#1A2733]"
                        >
                          <MoreHorizontal size={16} />
                        </button>

                        <PortalActionMenu
                          anchorEl={activeDropdownId === client.client_id ? activeAnchorEl : null}
                          open={activeDropdownId === client.client_id}
                          onClose={() => { setActiveDropdownId(null); setActiveAnchorEl(null); }}
                          actions={[
                            { label: "View Details", icon: Eye, onClick: () => navigate(`/labClients/view/${client.client_id}`) },
                            { label: "Edit Client", icon: Pencil, onClick: () => navigate(`/labClients/edit/${client.client_id}`) }
                          ]}
                        />
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          )}

          {/* Table Pagination */}
          <TablePagination
            totalItems={sortedClients.length}
            pageSize={pageSize}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="clients"
          />
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="lab-skeleton h-40" />
              ))}
            </div>
          ) : clients.length === 0 ? (
            <div className="p-8 text-center bg-white border border-[#E2E8F0] rounded-2xl">
              <Briefcase size={32} className="mx-auto text-[#94A3B8] mb-2" />
              <h3 className="text-sm font-bold text-[#1E293B]">No lab clients found</h3>
            </div>
          ) : (
            <motion.div className="space-y-4" variants={stagger.container} initial="hidden" animate="visible">
              {paginatedClients.map((client) => (
                <motion.div
                  key={client.client_id}
                  className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden"
                  variants={stagger.item}
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-sm text-[#1E293B]">{client.client_name}</h4>
                        <p className="text-xs text-[#64748B]">{client.contact_person || "No contact person"}</p>
                      </div>
                      {getStatusBadge(client.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-[#F1F5F9] my-2">
                      <div>
                        <span className="text-[#94A3B8] block text-[10px] uppercase font-bold">Email</span>
                        <span className="font-semibold text-[#475569] truncate block">{client.email || "—"}</span>
                      </div>
                      <div>
                        <span className="text-[#94A3B8] block text-[10px] uppercase font-bold">Phone</span>
                        <span className="font-semibold text-[#475569]">{client.phone || "—"}</span>
                      </div>
                      <div>
                        <span className="text-[#94A3B8] block text-[10px] uppercase font-bold">City</span>
                        <span className="font-semibold text-[#475569]">{client.city || "—"}</span>
                      </div>
                      <div>
                        <span className="text-[#94A3B8] block text-[10px] uppercase font-bold">GST No</span>
                        <span className="font-semibold text-[#475569]">{client.gst_no || "—"}</span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => navigate(`/labClients/view/${client.client_id}`)}
                        className="p-1.5 text-[#475569] hover:bg-[#F1F5F9] rounded-lg transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => navigate(`/labClients/edit/${client.client_id}`)}
                        className="p-1.5 text-[#475569] hover:bg-[#F1F5F9] rounded-lg transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
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

export default LabClientsList;
