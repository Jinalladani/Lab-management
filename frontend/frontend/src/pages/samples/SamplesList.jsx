import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus, Eye, Pencil, Trash2, Search, RefreshCw, FlaskConical, Sparkles, Layers, CheckCircle2, Clock, PackageCheck, TestTube, MoreVertical, RotateCcw,
  ArrowUp, ArrowDown, ArrowUpDown
} from "lucide-react";
import { MainLayout } from "../../components/layout";
import AddSampleDrawer from "../../components/projects/AddSampleDrawer";
import { SampleDetailModal } from "../../components/samples/SampleDetailModal";
import { BulkTestAssignmentModal } from "../../components/testAssignments/BulkTestAssignmentModal";
import { getSampleEntries, getAllTestingSamples, deleteSampleEntry } from "../../api/sampleMaster";
import { getProjects } from "../../api/projects";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { PortalActionMenu } from "../../components/ui/PortalActionMenu";
import { TablePagination } from "../../components/ui/TablePagination";
import { useDebounce } from "../../hooks/useDebounce";
import { toast, Toaster } from "sonner";

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } },
  item: {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 0.68, 0, 1] } },
  },
};

const getReceiptBadge = (status) => {
  const norm = String(status || "").toUpperCase();
  if (norm === "FULLY_ALLOCATED") {
    return <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Fully Allocated</span>;
  }
  if (norm === "PARTIALLY_ALLOCATED") {
    return <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />Partially Allocated</span>;
  }
  return <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Received</span>;
};

const SamplesList = () => {
  const [activeTab, setActiveTab] = useState("receipts"); // 'receipts' vs 'testing_samples'
  const [receipts, setReceipts] = useState([]);
  const [testingSamples, setTestingSamples] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const navigate = useNavigate();
  const location = useLocation();

  const [projectFilter, setProjectFilter] = useState(() => {
    const queryId = new URLSearchParams(window.location.search).get("project_id");
    return queryId || "all";
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sorting state (Default: receipt_no ascending)
  const [sortConfig, setSortConfig] = useState({ key: "receipt_no", direction: "asc" });

  // Modal / Drawer States
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [selectedReceiptDetail, setSelectedReceiptDetail] = useState(null);
  const [selectedReceiptForAssign, setSelectedReceiptForAssign] = useState(null);
  const [bulkAssignModalOpen, setBulkAssignModalOpen] = useState(false);

  // Dropdown portal states
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [activeAnchorEl, setActiveAnchorEl] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [projRes, receiptRes, sampleRes] = await Promise.all([
        getProjects(),
        getSampleEntries(),
        getAllTestingSamples()
      ]);

      setProjects(projRes.data?.data || []);
      setReceipts(receiptRes.data?.data || []);
      setTestingSamples(sampleRes.data?.data || []);
    } catch (err) {
      console.error("Failed to load sample data:", err);
      toast.error("Failed to load samples list data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, projectFilter, activeTab, sortConfig]);

  const handleSortChange = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleToggleDropdown = (id, event) => {
    if (activeDropdownId === id) {
      setActiveDropdownId(null);
      setActiveAnchorEl(null);
    } else {
      setActiveDropdownId(id);
      setActiveAnchorEl(event.currentTarget);
    }
  };

  const handleDeleteReceipt = async (receiptId) => {
    if (!window.confirm("Are you sure you want to delete this sample receipt lot?")) return;
    try {
      await deleteSampleEntry(receiptId);
      toast.success("Sample receipt deleted successfully");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete receipt");
    }
  };

  // Filtered & Sorted Receipts
  const filteredReceipts = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const filtered = receipts.filter((r) => {
      const matchesSearch =
        !q ||
        r.receipt_no?.toLowerCase().includes(q) ||
        r.project_code?.toLowerCase().includes(q) ||
        r.material_name?.toLowerCase().includes(q) ||
        r.sample_name?.toLowerCase().includes(q);

      const matchesProject = projectFilter === "all" || String(r.project_id) === String(projectFilter);

      return matchesSearch && matchesProject;
    });

    return filtered.sort((a, b) => {
      const key = sortConfig.key || "receipt_no";
      let valA = a[key] ?? "";
      let valB = b[key] ?? "";

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [receipts, debouncedSearch, projectFilter, sortConfig]);

  // Filtered & Sorted Testing Samples
  const filteredTestingSamples = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const filtered = testingSamples.filter((s) => {
      const matchesSearch =
        !q ||
        s.sample_code?.toLowerCase().includes(q) ||
        s.receipt_no?.toLowerCase().includes(q) ||
        s.location_name?.toLowerCase().includes(q) ||
        s.borelog_no?.toLowerCase().includes(q);

      const matchesProject = projectFilter === "all" || String(s.project_id) === String(projectFilter);

      return matchesSearch && matchesProject;
    });

    return filtered.sort((a, b) => {
      const key = sortConfig.key || "sample_code";
      let valA = a[key] ?? "";
      let valB = b[key] ?? "";

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [testingSamples, debouncedSearch, projectFilter, sortConfig]);

  const paginatedReceipts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReceipts.slice(start, start + pageSize);
  }, [filteredReceipts, currentPage, pageSize]);

  const paginatedTestingSamples = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTestingSamples.slice(start, start + pageSize);
  }, [filteredTestingSamples, currentPage, pageSize]);

  return (
    <MainLayout headerTitle="Sample Register" headerSubtitle="Manage incoming sample receipts and allocated testing samples">
      <Toaster position="top-right" richColors />
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6 space-y-5">

        {/* Header Tabs & Actions */}
        <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-fit">
            <button
              onClick={() => setActiveTab("receipts")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === "receipts"
                  ? "bg-white text-[#243744] shadow-sm border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <PackageCheck size={16} />
              Sample Receipt Lots ({receipts.length})
            </button>
            <button
              onClick={() => setActiveTab("testing_samples")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === "testing_samples"
                  ? "bg-white text-[#243744] shadow-sm border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <TestTube size={16} />
              Physical Testing Samples ({testingSamples.length})
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 text-xs font-bold text-slate-700 transition-colors shadow-xs"
            >
              <RefreshCw size={14} className="text-slate-400" />
              Refresh
            </button>

            <button
              onClick={() => setIsAddDrawerOpen(true)}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#243744] hover:bg-[#1A2733] px-4 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer"
            >
              <Plus size={16} />
              Receive Material Lot
            </button>
          </div>
        </div>

        {/* Toolbar Search & Project Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder={activeTab === "receipts" ? "Search receipt no, material..." : "Search sample code, location..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-colors"
              />
            </div>

            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="py-2 px-3 text-xs font-semibold border border-slate-200 bg-white rounded-xl outline-none focus:border-[#243744] transition-colors cursor-pointer max-w-[220px] truncate"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.project_id} value={p.project_id}>{p.project_code} - {p.project_name}</option>
              ))}
            </select>
          </div>

          {(search || projectFilter !== "all") && (
            <button
              type="button"
              onClick={() => { setSearch(""); setProjectFilter("all"); }}
              className="text-xs font-bold text-slate-500 hover:text-[#243744] underline px-2 cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* TAB 1: Sample Receipts */}
        {activeTab === "receipts" && (
          <div>
            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              {loading ? (
                <TableSkeleton rows={6} cols={8} />
              ) : filteredReceipts.length === 0 ? (
                <div className="p-16 text-center">
                  <PackageCheck size={40} className="mx-auto text-[#94A3B8] mb-3" />
                  <h3 className="text-base font-bold text-[#1E293B]">No sample receipts recorded</h3>
                  <p className="text-xs text-[#64748B] mt-1 mb-4">Use "Receive Material Lot" to record incoming sample quantities.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setProjectFilter("all");
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#243744] hover:bg-[#1A2733] text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    Reset Search & Filters
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] bg-[#FAFBFD] font-bold text-[#64748B] uppercase tracking-wider select-none">
                        <th className="px-5 py-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("receipt_no")}>
                          <div className="flex items-center gap-1.5">
                            <span>Receipt No</span>
                            {sortConfig.key === "receipt_no" ? (
                              sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                            ) : (
                              <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                            )}
                          </div>
                        </th>
                        <th className="px-5 py-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("project_code")}>
                          <div className="flex items-center gap-1.5">
                            <span>Project</span>
                            {sortConfig.key === "project_code" ? (
                              sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                            ) : (
                              <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                            )}
                          </div>
                        </th>
                        <th className="px-5 py-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("material_name")}>
                          <div className="flex items-center gap-1.5">
                            <span>Material</span>
                            {sortConfig.key === "material_name" ? (
                              sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                            ) : (
                              <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                            )}
                          </div>
                        </th>
                        <th className="px-5 py-3.5 text-center whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("quantity_received")}>
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Qty Received</span>
                            {sortConfig.key === "quantity_received" ? (
                              sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                            ) : (
                              <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                            )}
                          </div>
                        </th>
                        <th className="px-5 py-3.5 text-center whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("quantity_allocated")}>
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Allocated</span>
                            {sortConfig.key === "quantity_allocated" ? (
                              sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                            ) : (
                              <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                            )}
                          </div>
                        </th>
                        <th className="px-5 py-3.5 text-center whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("quantity_remaining")}>
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Remaining</span>
                            {sortConfig.key === "quantity_remaining" ? (
                              sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                            ) : (
                              <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                            )}
                          </div>
                        </th>
                        <th className="px-5 py-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("received_date")}>
                          <div className="flex items-center gap-1.5">
                            <span>Received Date</span>
                            {sortConfig.key === "received_date" ? (
                              sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                            ) : (
                              <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                            )}
                          </div>
                        </th>
                        <th className="px-5 py-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("receipt_status")}>
                          <div className="flex items-center gap-1.5">
                            <span>Status</span>
                            {sortConfig.key === "receipt_status" ? (
                              sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                            ) : (
                              <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                            )}
                          </div>
                        </th>
                        <th className="px-5 py-3.5 text-right whitespace-nowrap w-[90px]">Actions</th>
                      </tr>
                    </thead>
                    <motion.tbody variants={stagger.container} initial="hidden" animate="visible" className="divide-y divide-[#F1F5F9] bg-white">
                      {paginatedReceipts.map((r) => (
                        <motion.tr key={r.receipt_id} variants={stagger.item} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-4 font-bold font-mono text-[#243744] whitespace-nowrap">{r.receipt_no}</td>
                          <td className="px-5 py-4 font-semibold text-gray-700 whitespace-nowrap">{r.project_code}</td>
                          <td className="px-5 py-4 font-semibold text-gray-800 whitespace-nowrap">{r.material_name}</td>
                          <td className="px-5 py-4 text-center font-bold text-gray-800 whitespace-nowrap">{r.quantity_received} {r.quantity_unit}</td>
                          <td className="px-5 py-4 text-center font-bold text-blue-600 whitespace-nowrap">{r.quantity_allocated}</td>
                          <td className="px-5 py-4 text-center font-bold text-emerald-600 whitespace-nowrap">{r.quantity_remaining}</td>
                          <td className="px-5 py-4 font-medium text-gray-600 whitespace-nowrap">{r.received_date}</td>
                          <td className="px-5 py-4 whitespace-nowrap">{getReceiptBadge(r.receipt_status)}</td>
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <button
                              onClick={(e) => handleToggleDropdown(r.receipt_id, e)}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                            >
                              <MoreVertical size={16} />
                            </button>

                            <PortalActionMenu
                              anchorEl={activeDropdownId === r.receipt_id ? activeAnchorEl : null}
                              open={activeDropdownId === r.receipt_id}
                              onClose={() => { setActiveDropdownId(null); setActiveAnchorEl(null); }}
                              actions={[
                                {
                                  label: "View Receipt Details",
                                  icon: Eye,
                                  onClick: () => setSelectedReceiptDetail(r)
                                },
                                {
                                  label: "Schedule / Assign Tests",
                                  icon: Sparkles,
                                  onClick: () => {
                                    setSelectedReceiptForAssign(r);
                                    setBulkAssignModalOpen(true);
                                  }
                                },
                                {
                                  label: "Delete Receipt",
                                  icon: Trash2,
                                  danger: true,
                                  onClick: () => handleDeleteReceipt(r.receipt_id)
                                }
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
                totalItems={filteredReceipts.length}
                pageSize={pageSize}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                itemLabel="sample receipts"
              />
            </div>

            {/* Mobile & Tablet Card View */}
            <div className="lg:hidden">
              {loading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => <div key={i} className="h-40 bg-slate-100 rounded-2xl animate-pulse" />)}
                </div>
              ) : filteredReceipts.length === 0 ? (
                <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
                  <PackageCheck size={32} className="mx-auto text-slate-400 mb-2" />
                  <h3 className="text-sm font-bold text-slate-800">No sample receipts recorded</h3>
                </div>
              ) : (
                <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-4" variants={stagger.container} initial="hidden" animate="visible">
                  {paginatedReceipts.map((r) => (
                    <motion.div
                      key={r.receipt_id}
                      variants={stagger.item}
                      className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3 relative hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-bold font-mono text-[#243744] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg">
                            {r.receipt_no}
                          </span>
                          <h4 className="font-bold text-sm text-slate-900 mt-2 truncate">{r.material_name}</h4>
                          <p className="text-xs text-slate-500 font-semibold">{r.project_code}</p>
                        </div>
                        <div>
                          {getReceiptBadge(r.receipt_status)}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-100 text-center">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Qty Recv</p>
                          <p className="font-bold text-slate-800">{r.quantity_received} {r.quantity_unit}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Allocated</p>
                          <p className="font-bold text-blue-600">{r.quantity_allocated}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Remaining</p>
                          <p className="font-bold text-emerald-600">{r.quantity_remaining}</p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedReceiptForAssign(r);
                            setBulkAssignModalOpen(true);
                          }}
                          className="flex-1 py-2 px-3 bg-[#243744] hover:bg-[#1a2832] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                        >
                          <Sparkles size={14} className="text-emerald-400" />
                          Assign Tests
                        </button>
                        <button
                          onClick={() => handleDeleteReceipt(r.receipt_id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                          title="Delete Receipt"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Physical Testing Samples */}
        {activeTab === "testing_samples" && (
          <div>
            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              {loading ? (
                <TableSkeleton rows={6} cols={8} />
              ) : filteredTestingSamples.length === 0 ? (
                <div className="p-16 text-center">
                  <TestTube size={40} className="mx-auto text-[#94A3B8] mb-3" />
                  <h3 className="text-base font-bold text-[#1E293B]">No physical testing samples allocated yet</h3>
                  <p className="text-xs text-[#64748B] mt-1 mb-4">Physical samples are allocated from receipts during test assignment scheduling.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setProjectFilter("all");
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#243744] hover:bg-[#1A2733] text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    Reset Search & Filters
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] bg-[#FAFBFD] font-bold text-[#64748B] uppercase tracking-wider select-none">
                        <th className="px-5 py-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("sample_code")}>
                          <div className="flex items-center gap-1.5">
                            <span>Sample Code</span>
                            {sortConfig.key === "sample_code" ? (
                              sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                            ) : (
                              <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                            )}
                          </div>
                        </th>
                        <th className="px-5 py-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("receipt_no")}>
                          <div className="flex items-center gap-1.5">
                            <span>Receipt No.</span>
                            {sortConfig.key === "receipt_no" ? (
                              sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                            ) : (
                              <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                            )}
                          </div>
                        </th>
                        <th className="px-5 py-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("location_name")}>
                          <div className="flex items-center gap-1.5">
                            <span>Location</span>
                            {sortConfig.key === "location_name" ? (
                              sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                            ) : (
                              <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                            )}
                          </div>
                        </th>
                        <th className="px-5 py-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("borelog_no")}>
                          <div className="flex items-center gap-1.5">
                            <span>Borelog</span>
                            {sortConfig.key === "borelog_no" ? (
                              sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                            ) : (
                              <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                            )}
                          </div>
                        </th>
                        <th className="px-5 py-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("depth_display")}>
                          <div className="flex items-center gap-1.5">
                            <span>Depth</span>
                            {sortConfig.key === "depth_display" ? (
                              sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                            ) : (
                              <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                            )}
                          </div>
                        </th>
                        <th className="px-5 py-3.5 text-center whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("assigned_test_count")}>
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Assigned Tests</span>
                            {sortConfig.key === "assigned_test_count" ? (
                              sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                            ) : (
                              <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                            )}
                          </div>
                        </th>
                        <th className="px-5 py-3.5 text-center whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("completed_test_count")}>
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Completed Tests</span>
                            {sortConfig.key === "completed_test_count" ? (
                              sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                            ) : (
                              <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                            )}
                          </div>
                        </th>
                        <th className="px-5 py-3.5 whitespace-nowrap font-bold text-[#64748B] uppercase">Status</th>
                      </tr>
                    </thead>
                    <motion.tbody variants={stagger.container} initial="hidden" animate="visible" className="divide-y divide-[#F1F5F9] bg-white">
                      {paginatedTestingSamples.map((s) => (
                        <motion.tr key={s.testing_sample_id} variants={stagger.item} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-4 font-bold font-mono text-[#243744] whitespace-nowrap">{s.sample_code}</td>
                          <td className="px-5 py-4 font-semibold text-gray-700 whitespace-nowrap">{s.receipt_no}</td>
                          <td className="px-5 py-4 font-medium text-gray-800 whitespace-nowrap">{s.location_name || "—"}</td>
                          <td className="px-5 py-4 font-mono text-gray-700 whitespace-nowrap">{s.borelog_no || "—"}</td>
                          <td className="px-5 py-4 font-semibold text-gray-600 whitespace-nowrap">{s.depth_display || "—"}</td>
                          <td className="px-5 py-4 text-center font-bold text-blue-600 whitespace-nowrap">{s.assigned_test_count}</td>
                          <td className="px-5 py-4 text-center font-bold text-emerald-600 whitespace-nowrap">{s.completed_test_count}</td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                              Active
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </motion.tbody>
                  </table>
                </div>
              )}

              {/* Table Pagination */}
              <TablePagination
                totalItems={filteredTestingSamples.length}
                pageSize={pageSize}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                itemLabel="physical testing samples"
              />
            </div>

            {/* Mobile & Tablet Card View */}
            <div className="lg:hidden">
              {loading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => <div key={i} className="h-36 bg-slate-100 rounded-2xl animate-pulse" />)}
                </div>
              ) : filteredTestingSamples.length === 0 ? (
                <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
                  <TestTube size={32} className="mx-auto text-slate-400 mb-2" />
                  <h3 className="text-sm font-bold text-slate-800">No physical testing samples allocated yet</h3>
                </div>
              ) : (
                <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-4" variants={stagger.container} initial="hidden" animate="visible">
                  {paginatedTestingSamples.map((s) => (
                    <motion.div
                      key={s.testing_sample_id}
                      variants={stagger.item}
                      className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-mono text-[#243744] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg">
                          {s.sample_code}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">{s.receipt_no}</span>
                      </div>
                      <div className="text-xs space-y-1">
                        <p className="font-bold text-slate-800">{s.location_name || "No location"}</p>
                        <p className="text-slate-500">Borelog: {s.borelog_no || "—"} | Depth: {s.depth_display || "—"}</p>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 font-semibold">
                        <span className="text-blue-600">Assigned: {s.assigned_test_count}</span>
                        <span className="text-emerald-600">Completed: {s.completed_test_count}</span>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        )}

        {/* Add Material Lot Drawer */}
        <AddSampleDrawer
          isOpen={isAddDrawerOpen}
          projectOptions={projects}
          onClose={() => setIsAddDrawerOpen(false)}
          onSuccess={() => {
            setIsAddDrawerOpen(false);
            fetchData();
          }}
        />

        {/* Receipt Detail Modal */}
        {selectedReceiptDetail && (
          <SampleDetailModal
            isOpen={!!selectedReceiptDetail}
            receipt={selectedReceiptDetail}
            onClose={() => setSelectedReceiptDetail(null)}
          />
        )}

        {/* Bulk Test Assignment Modal */}
        {bulkAssignModalOpen && selectedReceiptForAssign && (
          <BulkTestAssignmentModal
            isOpen={bulkAssignModalOpen}
            receipt={selectedReceiptForAssign}
            onClose={() => {
              setBulkAssignModalOpen(false);
              setSelectedReceiptForAssign(null);
            }}
            onSuccess={() => {
              setBulkAssignModalOpen(false);
              setSelectedReceiptForAssign(null);
              fetchData();
            }}
          />
        )}

      </div>
    </MainLayout>
  );
};

export default SamplesList;
