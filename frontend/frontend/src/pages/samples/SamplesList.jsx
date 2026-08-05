import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus, Eye, Pencil, Trash2, Search, RefreshCw, FlaskConical, Sparkles, Layers, CheckCircle2, Clock, PackageCheck, TestTube, MoreVertical, RotateCcw
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

  // Modals State
  const [addReceiptDrawerOpen, setAddReceiptDrawerOpen] = useState(false);
  const [bulkAssignModalOpen, setBulkAssignModalOpen] = useState(false);
  const [selectedReceiptForAssign, setSelectedReceiptForAssign] = useState(null);
  const [sampleDetailId, setSampleDetailId] = useState(null);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [activeAnchorEl, setActiveAnchorEl] = useState(null);

  const handleToggleDropdown = (id, event) => {
    if (activeDropdownId === id) {
      setActiveDropdownId(null);
      setActiveAnchorEl(null);
    } else {
      setActiveDropdownId(id);
      setActiveAnchorEl(event.currentTarget);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await getProjects();
      setProjects(res.data?.data || res.data?.projects || []);
    } catch (error) {
      toast.error("Failed to load projects");
    }
  };

  const fetchReceipts = useCallback(async () => {
    try {
      setLoading(true);
      const params = projectFilter !== "all" ? { project_id: projectFilter } : {};
      const res = await getSampleEntries(params);
      setReceipts(res.data?.data || []);
    } catch (error) {
      toast.error("Failed to load sample receipts");
    } finally {
      setLoading(false);
    }
  }, [projectFilter]);

  const fetchTestingSamplesData = useCallback(async () => {
    try {
      setLoading(true);
      const params = projectFilter !== "all" ? { project_id: projectFilter } : {};
      const res = await getAllTestingSamples(params);
      setTestingSamples(res.data?.data || []);
    } catch (error) {
      toast.error("Failed to load physical testing samples");
    } finally {
      setLoading(false);
    }
  }, [projectFilter]);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (activeTab === "receipts") {
      fetchReceipts();
    } else {
      fetchTestingSamplesData();
    }
  }, [activeTab, fetchReceipts, fetchTestingSamplesData]);

  const filteredReceipts = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase();
    if (!needle) return receipts;
    return receipts.filter((r) =>
      [r.receipt_no, r.project_code, r.project_name, r.client_name, r.material_name, r.receipt_status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [receipts, debouncedSearch]);

  const filteredTestingSamples = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase();
    if (!needle) return testingSamples;
    return testingSamples.filter((s) =>
      [s.sample_code, s.receipt_no, s.project_code, s.location_name, s.borelog_no, s.client_sample_reference]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [testingSamples, debouncedSearch]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, debouncedSearch, projectFilter]);

  const paginatedReceipts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReceipts.slice(start, start + pageSize);
  }, [filteredReceipts, currentPage, pageSize]);

  const paginatedTestingSamples = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTestingSamples.slice(start, start + pageSize);
  }, [filteredTestingSamples, currentPage, pageSize]);

  const handleDeleteReceipt = async (receiptId) => {
    if (!window.confirm("Are you sure you want to delete this sample receipt No.?")) return;
    try {
      await deleteSampleEntry(receiptId);
      toast.success("Receipt No. deleted");
      fetchReceipts();
    } catch (error) {
      toast.error("Failed to delete receipt");
    }
  };

  return (
    <MainLayout headerTitle="Sample Register" headerSubtitle="Material Lot Receipts & Physical Testing Samples">
      <Toaster position="top-right" richColors />
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">

        {/* Tab Navigation */}
        <div className="flex items-center gap-3 mb-6 border-b border-gray-200 overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => setActiveTab("receipts")}
            className={`flex items-center gap-2 pb-3 px-2 text-sm font-bold border-b-2 transition-all ${activeTab === "receipts"
                ? "border-[#243744] text-[#243744]"
                : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
          >
            <PackageCheck className="w-4 h-4" />
            Sample Receipts / Material Lots ({receipts.length})
          </button>

          <button
            onClick={() => setActiveTab("testing_samples")}
            className={`flex items-center gap-2 pb-3 px-2 text-sm font-bold border-b-2 transition-all ${activeTab === "testing_samples"
                ? "border-[#243744] text-[#243744]"
                : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
          >
            <TestTube className="w-4 h-4" />
            Physical Testing Samples ({testingSamples.length})
          </button>
        </div>

        {/* Toolbar */}
        <div className="mb-6 flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between">

          {/* Search Box */}
          <div className="flex-1 max-w-xl flex h-10 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 focus-within:border-[#243744] focus-within:ring-2 focus-within:ring-[#243744]/10 transition-all shadow-sm">
            <Search size={16} className="text-[#94A3B8] shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeTab === "receipts" ? "Search receipt no, material, project, client..." : "Search sample code, location, borelog..."}
              className="w-full bg-transparent text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="h-10 px-3.5 py-2 text-xs font-semibold text-[#475569] border border-[#E2E8F0] bg-white rounded-xl outline-none focus:border-[#243744] shadow-sm"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.project_id} value={p.project_id}>
                  {p.project_code} - {p.project_name}
                </option>
              ))}
            </select>

            <button
              onClick={activeTab === "receipts" ? fetchReceipts : fetchTestingSamplesData}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] px-4 text-xs font-bold text-[#475569] transition-colors shadow-sm"
            >
              <RefreshCw size={14} className="text-[#8A97A4]" /> Refresh
            </button>

            {activeTab === "receipts" && (
              <button
                type="button"
                onClick={() => setAddReceiptDrawerOpen(true)}
                className="flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 text-xs font-bold text-white shadow-sm transition-colors"
              >
                <Plus size={15} /> Receive Material Lot
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setSelectedReceiptForAssign(null);
                setBulkAssignModalOpen(true);
              }}
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#243744] hover:bg-[#1A2733] px-4 text-xs font-bold text-white shadow-sm transition-colors"
            >
              <Sparkles size={15} className="text-emerald-400" /> Assign Tests
            </button>
          </div>
        </div>

        {/* Active Filter Chips / Pills */}
        {(search || projectFilter !== "all") && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500 mr-1">Active Filters:</span>
            {search && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full font-medium text-slate-700">
                Search: "{search}"
                <button type="button" onClick={() => setSearch("")} className="hover:text-red-500 font-bold ml-0.5 cursor-pointer">×</button>
              </span>
            )}
            {projectFilter !== "all" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full font-medium text-blue-700">
                Project: {projects.find((p) => String(p.project_id) === String(projectFilter))?.project_code || projectFilter}
                <button type="button" onClick={() => setProjectFilter("all")} className="hover:text-red-500 font-bold ml-0.5 cursor-pointer">×</button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setProjectFilter("all");
              }}
              className="text-xs font-bold text-slate-500 hover:text-[#243744] underline ml-2 cursor-pointer"
            >
              Clear All
            </button>
          </div>
        )}

        {/* TAB 1: RECEIPTS LOTS TABLE & CARDS */}
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
                      <tr className="border-b border-[#E2E8F0] bg-[#FAFBFD] font-bold text-[#64748B] uppercase tracking-wider">
                        <th className="px-5 py-3.5 whitespace-nowrap">Receipt No</th>
                        <th className="px-5 py-3.5 whitespace-nowrap">Project</th>
                        <th className="px-5 py-3.5 whitespace-nowrap">Material</th>
                        <th className="px-5 py-3.5 text-center whitespace-nowrap">Qty Received</th>
                        <th className="px-5 py-3.5 text-center whitespace-nowrap">Allocated</th>
                        <th className="px-5 py-3.5 text-center whitespace-nowrap">Remaining</th>
                        <th className="px-5 py-3.5 whitespace-nowrap">Received Date</th>
                        <th className="px-5 py-3.5 whitespace-nowrap">Status</th>
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
                                  label: "Assign Tests",
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
                  {filteredReceipts.map((r) => (
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
                          className="flex-1 py-2 px-3 bg-[#243744] hover:bg-[#1a2832] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Sparkles size={14} className="text-emerald-400" />
                          Assign Tests
                        </button>
                        <button
                          onClick={() => handleDeleteReceipt(r.receipt_id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-xl transition-colors"
                          title="Delete Receipt"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PHYSICAL TESTING SAMPLES TABLE & CARDS */}
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
                      <tr className="border-b border-[#E2E8F0] bg-[#FAFBFD] font-bold text-[#64748B] uppercase tracking-wider">
                        <th className="px-5 py-3.5 whitespace-nowrap">Sample Code</th>
                        <th className="px-5 py-3.5 whitespace-nowrap">Receipt No.</th>
                        <th className="px-5 py-3.5 whitespace-nowrap">Location</th>
                        <th className="px-5 py-3.5 whitespace-nowrap">Borelog</th>
                        <th className="px-5 py-3.5 whitespace-nowrap">Depth</th>
                        <th className="px-5 py-3.5 text-center whitespace-nowrap">Assigned Tests</th>
                        <th className="px-5 py-3.5 text-center whitespace-nowrap">Completed Tests</th>
                        <th className="px-5 py-3.5 whitespace-nowrap">Status</th>
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
                  {filteredTestingSamples.map((s) => (
                    <motion.div
                      key={s.testing_sample_id}
                      variants={stagger.item}
                      className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3 relative hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-bold font-mono text-[#243744] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg">
                            {s.sample_code}
                          </span>
                          <h4 className="font-bold text-sm text-slate-900 mt-2 truncate">{s.receipt_no}</h4>
                        </div>
                        <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          Active
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Location / Bore</p>
                          <p className="font-semibold text-slate-700 truncate">{s.location_name || "—"} {s.borelog_no ? `(${s.borelog_no})` : ""}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Depth</p>
                          <p className="font-semibold text-slate-700">{s.depth_display || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned Tests</p>
                          <p className="font-bold text-blue-600">{s.assigned_test_count}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Completed Tests</p>
                          <p className="font-bold text-emerald-600">{s.completed_test_count}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Modals */}
      <AddSampleDrawer
        open={addReceiptDrawerOpen}
        projectOptions={projects}
        mode="add"
        onClose={() => setAddReceiptDrawerOpen(false)}
        onSaved={() => {
          toast.success("Sample receipt No. created successfully!");
          fetchReceipts();
        }}
      />

      <BulkTestAssignmentModal
        isOpen={bulkAssignModalOpen}
        initialReceipt={selectedReceiptForAssign}
        initialProjectId={projectFilter !== "all" ? projectFilter : ""}
        onClose={() => {
          setBulkAssignModalOpen(false);
          setSelectedReceiptForAssign(null);
        }}
        onSuccess={() => {
          fetchReceipts();
          if (activeTab === "testing_samples") fetchTestingSamplesData();
        }}
      />
    </MainLayout>
  );
};

export default SamplesList;
