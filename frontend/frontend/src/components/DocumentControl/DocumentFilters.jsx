import React, { useState, useEffect } from "react";
import { Search, Filter, X, RotateCcw, Check } from "lucide-react";
import { mockDocumentDb } from "../../utils/mockDocumentData";

const DocumentFilters = ({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  statusFilter,
  onStatusChange,
  deptFilter,
  onDeptChange,
  reviewDueFilter,
  onReviewDueChange,
  onApplyFilters,
  onClearFilters,
}) => {
  const [categories, setCategories] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advOwner, setAdvOwner] = useState("");
  const [advApprover, setAdvApprover] = useState("");
  const [advConfidentiality, setAdvConfidentiality] = useState("");

  useEffect(() => {
    const cats = mockDocumentDb.getDocumentCategories();
    const names = Array.from(new Set(cats.map(c => c.name)));
    if (names.length > 0) {
      setCategories(names);
    } else {
      setCategories(["Quality", "Technical", "NABL", "External", "SOP", "Work Instruction"]);
    }
  }, []);

  const hasActiveFilters =
    categoryFilter !== "All" ||
    statusFilter !== "All" ||
    deptFilter !== "All" ||
    reviewDueFilter !== "All" ||
    searchQuery !== "" ||
    advOwner !== "" ||
    advApprover !== "";

  const handleReset = () => {
    setAdvOwner("");
    setAdvApprover("");
    setAdvConfidentiality("");
    onClearFilters();
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by title, number, keyword..."
          className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-xs font-medium text-gray-800 placeholder-gray-400 focus:border-[#243744] focus:outline-none focus:ring-1 focus:ring-[#243744] transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter Dropdowns */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={categoryFilter}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:border-gray-300 focus:border-[#243744] focus:outline-none"
        >
          <option value="All">Category: All</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:border-gray-300 focus:border-[#243744] focus:outline-none"
        >
          <option value="All">Status: All</option>
          <option value="Active">Active</option>
          <option value="Under Review">Under Review</option>
          <option value="Draft">Draft</option>
          <option value="Review Due">Review Due</option>
          <option value="Obsolete">Obsolete</option>
        </select>

        <select
          value={deptFilter}
          onChange={(e) => onDeptChange(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:border-gray-300 focus:border-[#243744] focus:outline-none"
        >
          <option value="All">Department: All</option>
          <option value="Quality">Quality</option>
          <option value="Concrete Lab">Concrete Lab</option>
          <option value="Aggregate Lab">Aggregate Lab</option>
          <option value="Soil Lab">Soil Lab</option>
          <option value="Bitumen Lab">Bitumen Lab</option>
          <option value="Chemical Lab">Chemical Lab</option>
          <option value="NDT">NDT</option>
          <option value="Calibration">Calibration</option>
        </select>

        <select
          value={reviewDueFilter}
          onChange={(e) => onReviewDueChange(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:border-gray-300 focus:border-[#243744] focus:outline-none"
        >
          <option value="All">Review Due: All</option>
          <option value="Overdue">Overdue</option>
          <option value="Due Today">Due Today</option>
          <option value="Due within 7 Days">Due within 7 Days</option>
          <option value="Due within 30 Days">Due within 30 Days</option>
        </select>

        {/* Filters toggle button */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
            hasActiveFilters
              ? "border-[#243744] bg-slate-100 text-[#243744]"
              : "border-slate-300 text-[#243744] hover:bg-slate-50"
          }`}
        >
          <Filter size={14} />
          <span>Filters</span>
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <RotateCcw size={12} />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Advanced Filter Modal / Drawer */}
      {showAdvanced && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Filter size={16} className="text-[#243744]" />
                Advanced Document Filters
              </h3>
              <button
                onClick={() => setShowAdvanced(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Document Owner</label>
                <input
                  type="text"
                  placeholder="e.g. Technical Manager"
                  value={advOwner}
                  onChange={(e) => setAdvOwner(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-[#243744] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Approver</label>
                <input
                  type="text"
                  placeholder="e.g. Quality Manager"
                  value={advApprover}
                  onChange={(e) => setAdvApprover(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-[#243744] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Confidentiality</label>
                <select
                  value={advConfidentiality}
                  onChange={(e) => setAdvConfidentiality(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-[#243744] focus:outline-none"
                >
                  <option value="">All</option>
                  <option value="Public">Public</option>
                  <option value="Internal Use">Internal Use</option>
                  <option value="Confidential">Confidential</option>
                  <option value="Strictly Confidential">Strictly Confidential</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => onStatusChange(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-[#243744] focus:outline-none"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Draft">Draft</option>
                  <option value="Review Due">Review Due</option>
                  <option value="Obsolete">Obsolete</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={handleReset}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Clear Filters
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onApplyFilters) onApplyFilters();
                  setShowAdvanced(false);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-[#243744] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1A2733] shadow-sm"
              >
                <Check size={14} />
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentFilters;
