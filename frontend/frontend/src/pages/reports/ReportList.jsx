import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, Trash2, Search, RefreshCw, FileText, ChevronLeft, ChevronRight,
  Download, Filter, RotateCcw, CheckCircle, XCircle, Sparkles, TestTube, ArrowRight,
  ArrowUp, ArrowDown, ArrowUpDown
} from "lucide-react";
import {
  getReports, deleteReport, approveReport, rejectReport,
  getPendingObservations, generateReportFromObservation
} from "../../api/reports";
import { getProjects } from "../../api/projects";
import { useDebounce } from "../../hooks/useDebounce";
import { MainLayout } from "../../components/layout";
import { Button } from "../../components/ui";
import { TablePagination } from "../../components/ui/TablePagination";
import { hasPermission } from "../../utils/permissions";

const getStatusBadge = (status) => {
  const norm = String(status || "").toLowerCase();
  const map = {
    draft: { text: "Draft", bg: "bg-gray-100 text-gray-700 border-gray-200" },
    "pending verification": { text: "Pending Verification", bg: "bg-amber-50 text-amber-700 border-amber-200" },
    verified: { text: "Verified", bg: "bg-blue-50 text-blue-700 border-blue-200" },
    approved: { text: "Approved", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    rejected: { text: "Rejected", bg: "bg-rose-50 text-rose-700 border-rose-200" },
    locked: { text: "Locked", bg: "bg-teal-50 text-teal-700 border-teal-200" }
  };
  const config = map[norm] || { text: status, bg: "bg-gray-100 text-gray-700 border-gray-200" };

  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${config.bg}`}>
      {config.text}
    </span>
  );
};

const ReportList = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("reports"); // "reports" or "pending_observations"
  const [reports, setReports] = useState([]);
  const [pendingObs, setPendingObs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [generatingObsId, setGeneratingObsId] = useState(null);

  // User permission check
  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }, []);

  const canApprove = useMemo(() => {
    return hasPermission(currentUser?.role, "report.approve");
  }, [currentUser]);

  // Filters state
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sorting state (Default: report_number ascending)
  const [sortConfig, setSortConfig] = useState({ key: "report_number", direction: "asc" });

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [repRes, projRes, obsRes] = await Promise.all([
        getReports(),
        getProjects(),
        getPendingObservations()
      ]);

      const rawReports = repRes.data?.data || repRes.data || [];
      setReports(Array.isArray(rawReports) ? rawReports : []);

      const rawProj = projRes.data?.data || projRes.data || [];
      setProjects(Array.isArray(rawProj) ? rawProj : []);

      const rawObs = obsRes.data?.data || obsRes.data || [];
      setPendingObs(Array.isArray(rawObs) ? rawObs : []);

    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, projectFilter, dateFrom, dateTo, activeTab, sortConfig]);

  const handleSortChange = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleApproveReport = async (reportId) => {
    if (!window.confirm("Approve and issue this test report certificate?")) return;
    try {
      await approveReport(reportId);
      fetchInitialData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to approve report");
    }
  };

  const handleRejectReport = async (reportId) => {
    const reason = window.prompt("Enter reason for rejecting this report:");
    if (reason === null) return;
    try {
      await rejectReport(reportId, reason);
      fetchInitialData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reject report");
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm("Are you sure you want to delete this report certificate record?")) return;
    try {
      await deleteReport(reportId);
      fetchInitialData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete report");
    }
  };

  const handleGenerateFromObservation = async (obsId) => {
    try {
      setGeneratingObsId(obsId);
      const res = await generateReportFromObservation(obsId);
      const reportId = res.data?.data?.report_id || res.data?.report_id;
      if (reportId) {
        navigate(`/reports/view/${reportId}`);
      } else {
        fetchInitialData();
        setActiveTab("reports");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to generate report from observation");
    } finally {
      setGeneratingObsId(null);
    }
  };

  // Filtered & Sorted Reports
  const filteredReports = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const filtered = reports.filter((r) => {
      const matchesSearch =
        !q ||
        r.report_number?.toLowerCase().includes(q) ||
        r.sample_no?.toLowerCase().includes(q) ||
        r.client_name?.toLowerCase().includes(q) ||
        r.project_name?.toLowerCase().includes(q) ||
        r.test_name?.toLowerCase().includes(q) ||
        r.report_title?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "all" || (r.status || "").toLowerCase() === statusFilter.toLowerCase();
      const matchesProject = projectFilter === "all" || String(r.project_id) === String(projectFilter);

      let matchesDate = true;
      if (dateFrom && r.issue_date) {
        matchesDate = matchesDate && new Date(r.issue_date) >= new Date(dateFrom);
      }
      if (dateTo && r.issue_date) {
        matchesDate = matchesDate && new Date(r.issue_date) <= new Date(dateTo);
      }

      return matchesSearch && matchesStatus && matchesProject && matchesDate;
    });

    return filtered.sort((a, b) => {
      const key = sortConfig.key || "report_number";
      let valA = (key === "test_name" ? (a.test_name || a.report_title) : a[key]) ?? "";
      let valB = (key === "test_name" ? (b.test_name || b.report_title) : b[key]) ?? "";

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [reports, debouncedSearch, statusFilter, projectFilter, dateFrom, dateTo, sortConfig]);

  // Filtered Pending Observations
  const filteredPendingObs = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return pendingObs.filter((obs) => {
      return (
        !q ||
        obs.sample_code?.toLowerCase().includes(q) ||
        obs.test_name?.toLowerCase().includes(q) ||
        obs.project_name?.toLowerCase().includes(q) ||
        obs.client_name?.toLowerCase().includes(q)
      );
    });
  }, [pendingObs, debouncedSearch]);

  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReports.slice(start, start + pageSize);
  }, [filteredReports, currentPage, pageSize]);

  return (
    <MainLayout headerTitle="Test Reports" headerSubtitle="Generate, review, and approve test report certificates">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6 space-y-6">

        {/* Header Tabs */}
        <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between border-b border-[#E2E8F0] pb-4">
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-fit">
            <button
              onClick={() => setActiveTab("reports")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === "reports"
                  ? "bg-white text-[#243744] shadow-sm border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText size={16} />
              Generated Certificates ({reports.length})
            </button>
            <button
              onClick={() => setActiveTab("pending_observations")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === "pending_observations"
                  ? "bg-white text-[#243744] shadow-sm border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sparkles size={16} className="text-amber-500" />
              Submitted Observations ({pendingObs.length})
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchInitialData}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] px-4 text-xs font-bold text-[#475569] transition-colors cursor-pointer"
            >
              <RefreshCw size={14} className="text-[#8A97A4]" />
              Refresh
            </button>

            <button
              onClick={() => navigate("/reports/add")}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#243744] hover:bg-[#1A2733] px-4 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer"
            >
              <FileText size={14} />
              Manual Certificate Create
            </button>
          </div>
        </div>

        {/* TAB 1: Generated Certificates */}
        {activeTab === "reports" && (
          <div className="space-y-4">
            {/* Toolbar Filters */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3.5 top-2.5 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search report no, sample, client, project..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-xs font-semibold border border-[#E2E8F0] rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-colors"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold border border-[#E2E8F0] bg-white rounded-xl outline-none focus:border-[#243744] transition-colors cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="pending verification">Pending Verification</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>

                <select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold border border-[#E2E8F0] bg-white rounded-xl outline-none focus:border-[#243744] transition-colors cursor-pointer max-w-[200px] truncate"
                >
                  <option value="all">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.project_id} value={p.project_id}>{p.project_code}</option>
                  ))}
                </select>

                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl outline-none focus:border-[#243744]"
                />

                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl outline-none focus:border-[#243744]"
                />
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
                {errorMessage}
              </div>
            )}

            {/* Reports Data Table */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-8 space-y-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="p-16 text-center">
                  <FileText size={40} className="mx-auto text-[#94A3B8] mb-3" />
                  <h3 className="text-base font-bold text-[#1E293B]">No reports registered</h3>
                  <p className="text-xs text-[#64748B] mt-1 mb-4">Switch to "Submitted Observations" tab to generate reports from engineer observation entries.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] bg-[#FAFBFD] text-[10px] font-bold text-[#64748B] uppercase tracking-wider select-none">
                        <th className="px-6 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("report_number")}>
                          <div className="flex items-center gap-1.5">
                            <span>Report No</span>
                            {sortConfig.key === "report_number" ? (
                              sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                            ) : (
                              <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("sample_no")}>
                          <div className="flex items-center gap-1.5">
                            <span>Sample No</span>
                            {sortConfig.key === "sample_no" ? (
                              sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                            ) : (
                              <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("client_name")}>
                          <div className="flex items-center gap-1.5">
                            <span>Client Name</span>
                            {sortConfig.key === "client_name" ? (
                              sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                            ) : (
                              <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("project_name")}>
                          <div className="flex items-center gap-1.5">
                            <span>Project Name</span>
                            {sortConfig.key === "project_name" ? (
                              sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                            ) : (
                              <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("test_name")}>
                          <div className="flex items-center gap-1.5">
                            <span>Test Name</span>
                            {sortConfig.key === "test_name" || sortConfig.key === "report_title" ? (
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
                        <th className="px-6 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("prepared_by_name")}>
                          <div className="flex items-center gap-1.5">
                            <span>Prepared By</span>
                            {sortConfig.key === "prepared_by_name" ? (
                              sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                            ) : (
                              <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSortChange("approved_by_name")}>
                          <div className="flex items-center gap-1.5">
                            <span>Approved By</span>
                            {sortConfig.key === "approved_by_name" ? (
                              sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-[#243744]" /> : <ArrowDown size={13} className="text-[#243744]" />
                            ) : (
                              <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-3.5 text-right w-[140px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9] text-xs">
                      {paginatedReports.map((report) => (
                        <tr key={report.report_id} className="hover:bg-[#FAF9FF] transition-colors">
                          <td className="px-6 py-4 font-bold text-[#1E293B]">{report.report_number}</td>
                          <td className="px-6 py-4 font-semibold text-[#475569]">{report.sample_no || "—"}</td>
                          <td className="px-6 py-4 font-semibold text-[#475569] truncate max-w-[150px]">{report.client_name || "—"}</td>
                          <td className="px-6 py-4 font-semibold text-[#475569] truncate max-w-[150px]">{report.project_name || "—"}</td>
                          <td className="px-6 py-4 font-bold text-[#1E293B]">{(report.test_name || report.report_title || "—").replace(/^(Test Certificate:|Observation Sheet:)\s*/i, "")}</td>
                          <td className="px-6 py-4">{getStatusBadge(report.status)}</td>
                          <td className="px-6 py-4 font-semibold text-[#475569]">{report.prepared_by_name || "—"}</td>
                          <td className="px-6 py-4 font-semibold text-[#475569]">{report.approved_by_name || "—"}</td>
                          <td className="px-6 py-4 text-right flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => navigate(`/reports/view/${report.report_id}`)}
                              className="p-1.5 hover:bg-[#F1F5F9] text-gray-500 hover:text-[#243744] rounded-lg transition-colors cursor-pointer"
                              title="View Certificate Details"
                            >
                              <Eye size={15} />
                            </button>

                            {/* Direct Approve Button for Admin & QM */}
                            {canApprove && report.status !== "Approved" && (
                              <button
                                onClick={() => handleApproveReport(report.report_id)}
                                className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors cursor-pointer"
                                title="Approve / Verify Report"
                              >
                                <CheckCircle size={15} />
                              </button>
                            )}

                            {/* Direct Reject Button for Admin & QM */}
                            {canApprove && report.status !== "Approved" && (
                              <button
                                onClick={() => handleRejectReport(report.report_id)}
                                className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer"
                                title="Reject Report"
                              >
                                <XCircle size={15} />
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteReport(report.report_id)}
                              className="p-1.5 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="Delete Report"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Table Pagination */}
              <TablePagination
                totalItems={filteredReports.length}
                pageSize={pageSize}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                itemLabel="test reports"
              />
            </div>
          </div>
        )}

        {/* TAB 2: Pending Observations */}
        {activeTab === "pending_observations" && (
          <div className="space-y-4">
            <div className="bg-[#FAFBFD] p-4 rounded-2xl border border-slate-200">
              <h3 className="font-bold text-sm text-[#1E293B] flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500" />
                Submitted Observation Entries Ready for Report Generation
              </h3>
              <p className="text-xs text-slate-500 mt-1">Engineers have completed and submitted these test observation sheets. Click "Generate Report" to build official test certificate PDFs.</p>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              {filteredPendingObs.length === 0 ? (
                <div className="p-16 text-center">
                  <TestTube size={40} className="mx-auto text-slate-300 mb-3" />
                  <h3 className="text-base font-bold text-slate-800">No pending observations</h3>
                  <p className="text-xs text-slate-500 mt-1">All submitted observation sheets have been converted to reports or are in progress.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] bg-[#FAFBFD] font-bold text-[#64748B] uppercase tracking-wider">
                        <th className="px-6 py-3.5">Sample Code</th>
                        <th className="px-6 py-3.5">Test Name</th>
                        <th className="px-6 py-3.5">Project</th>
                        <th className="px-6 py-3.5">Client</th>
                        <th className="px-6 py-3.5">Technician</th>
                        <th className="px-6 py-3.5">Submitted Date</th>
                        <th className="px-6 py-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {filteredPendingObs.map((obs) => (
                        <tr key={obs.observation_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 font-bold font-mono text-[#243744]">{obs.sample_code}</td>
                          <td className="px-6 py-4 font-bold text-slate-800">{obs.test_name}</td>
                          <td className="px-6 py-4 font-semibold text-slate-700">{obs.project_name || obs.project_code || "—"}</td>
                          <td className="px-6 py-4 font-semibold text-slate-600">{obs.client_name || "—"}</td>
                          <td className="px-6 py-4 font-medium text-slate-600">{obs.technician_name || "—"}</td>
                          <td className="px-6 py-4 font-medium text-slate-500">{obs.created_at || "—"}</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleGenerateFromObservation(obs.observation_id)}
                              disabled={generatingObsId === obs.observation_id}
                              className="px-3 py-1.5 bg-[#243744] hover:bg-[#1A2733] text-white text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                            >
                              {generatingObsId === obs.observation_id ? "Generating..." : "Generate Report"}
                              <ArrowRight size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </MainLayout>
  );
};

export default ReportList;
