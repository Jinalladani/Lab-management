import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, Trash2, Search, RefreshCw, FileText, ChevronLeft, ChevronRight, Download, Filter
} from "lucide-react";
import { getReports, deleteReport } from "../../api/reports";
import { getProjects } from "../../api/projects";
import { MainLayout } from "../../components/layout";
import { Button, Input, Select } from "../../components/ui";

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
  const [reports, setReports] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  
  // Filters & Search State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchFilters = async () => {
    try {
      const projRes = await getProjects();
      if (projRes.data && projRes.data.success) {
        setProjects(projRes.data.data || []);
      }
    } catch (error) {
      console.error("Failed to load filter metadata:", error);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (projectFilter) params.project_id = projectFilter;
      
      const res = await getReports(params);
      if (res.success && res.data) {
        // Client-side date filter if date limits exist
        let filtered = res.data;
        if (dateFrom) {
          filtered = filtered.filter(r => new Date(r.report_create_date) >= new Date(dateFrom));
        }
        if (dateTo) {
          filtered = filtered.filter(r => new Date(r.report_create_date) <= new Date(dateTo));
        }
        setReports(filtered);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Failed to load reports from database registry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
    fetchReports();
  }, [statusFilter, projectFilter, dateFrom, dateTo]);

  const handleDelete = async (reportId) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    try {
      await deleteReport(reportId);
      fetchReports();
    } catch (error) {
      alert("Failed to delete report.");
    }
  };

  return (
    <MainLayout headerTitle="Reports Registry" headerSubtitle="NABL-style certified observations & calculations verification">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">

        {/* Toolbar & Advanced Filters */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 sm:p-5 mb-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="flex-1 w-full max-w-xl flex h-10 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 focus-within:border-[#243744] focus-within:ring-2 focus-within:ring-[#243744]/10 transition-all">
              <Search size={16} className="text-[#94A3B8] shrink-0" />
              <input
                type="text"
                placeholder="Search by Report No, Client, Sample ID, Project..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchReports()}
                className="w-full bg-transparent text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none"
              />
            </div>
            
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <Button onClick={fetchReports} variant="secondary" icon={RefreshCw}>
                Search / Refresh
              </Button>
            </div>
          </div>

          <div className="h-px bg-[#F1F5F9]" />

          {/* Grid Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Project</label>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="w-full h-10 px-3 py-2 text-xs font-semibold text-[#475569] border border-[#E2E8F0] bg-white rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%238A97A4' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: "right 10px center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "16px",
                  paddingRight: "30px"
                }}
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p.project_id} value={p.project_id}>{p.project_code} - {p.project_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Report Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 px-3 py-2 text-xs font-semibold text-[#475569] border border-[#E2E8F0] bg-white rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%238A97A4' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: "right 10px center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "16px",
                  paddingRight: "30px"
                }}
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="Pending Verification">Pending Verification</option>
                <option value="Verified">Verified</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Locked">Locked</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full h-10 px-3.5 py-2 text-xs font-semibold text-[#475569] border border-[#E2E8F0] bg-white rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full h-10 px-3.5 py-2 text-xs font-semibold text-[#475569] border border-[#E2E8F0] bg-white rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10"
              />
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
            {errorMessage}
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="p-16 text-center">
              <FileText size={40} className="mx-auto text-[#94A3B8] mb-3" />
              <h3 className="text-base font-bold text-[#1E293B]">No reports registered</h3>
              <p className="text-xs text-[#64748B] mt-1">Try expanding search metrics or assigning scope observations.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#FAFBFD] text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                    <th className="px-6 py-3.5">Report No</th>
                    <th className="px-6 py-3.5">Sample ID</th>
                    <th className="px-6 py-3.5">Client Name</th>
                    <th className="px-6 py-3.5">Project Name</th>
                    <th className="px-6 py-3.5">Sample Description</th>
                    <th className="px-6 py-3.5">Test Name</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Prepared By</th>
                    <th className="px-6 py-3.5">Verified By</th>
                    <th className="px-6 py-3.5">Approved By</th>
                    <th className="px-6 py-3.5">Report Date</th>
                    <th className="px-6 py-3.5 text-right w-[80px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-xs">
                  {reports.map((report) => (
                    <tr key={report.report_id} className="hover:bg-[#FAF9FF] transition-colors">
                      <td className="px-6 py-4 font-bold text-[#1E293B]">{report.report_number}</td>
                      <td className="px-6 py-4 font-semibold text-[#475569]">{report.sample_no || "—"}</td>
                      <td className="px-6 py-4 font-semibold text-[#475569] truncate max-w-[150px]">{report.client_name || "—"}</td>
                      <td className="px-6 py-4 font-semibold text-[#475569] truncate max-w-[150px]">{report.project_name || "—"}</td>
                      <td className="px-6 py-4 font-medium text-[#64748B] truncate max-w-[180px]">{report.sample_desc || "—"}</td>
                      <td className="px-6 py-4 font-semibold text-[#475569]">{report.report_title}</td>
                      <td className="px-6 py-4">{getStatusBadge(report.status)}</td>
                      <td className="px-6 py-4 font-semibold text-[#475569]">{report.prepared_by_name || "—"}</td>
                      <td className="px-6 py-4 font-semibold text-[#475569]">{report.reviewed_by_name || "—"}</td>
                      <td className="px-6 py-4 font-semibold text-[#475569]">{report.approved_by_name || "—"}</td>
                      <td className="px-6 py-4 font-semibold text-[#64748B]">
                        {report.report_date ? new Date(report.report_date).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric"
                        }) : "Drafting"}
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/reports/view/${report.report_id}`)}
                          className="p-1.5 hover:bg-[#F1F5F9] text-gray-500 hover:text-[#243744] rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(report.report_id)}
                          className="p-1.5 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Delete Report"
                          disabled={report.status === "Locked" || report.status === "Approved"}
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

          {/* Footer Pagination */}
          <div className="flex items-center justify-between border-t border-[#E2E8F0] px-6 py-4 bg-white select-none text-xs">
            <p className="font-semibold text-[#64748B]">
              Showing <span className="text-[#1E293B]">{reports.length}</span> reports
            </p>
            <div className="flex items-center gap-1.5">
              <button className="h-8 w-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center font-semibold text-[#64748B] hover:bg-[#F8FAFC]" disabled>
                <ChevronLeft size={14} />
              </button>
              <button className="h-8 w-8 rounded-lg bg-[#243744] text-white flex items-center justify-center font-bold">1</button>
              <button className="h-8 w-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center font-semibold text-[#64748B] hover:bg-[#F8FAFC]" disabled>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </MainLayout>
  );
};

export default ReportList;
