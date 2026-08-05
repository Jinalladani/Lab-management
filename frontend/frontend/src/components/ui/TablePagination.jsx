import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export const TablePagination = ({
  totalItems = 0,
  pageSize = 10,
  currentPage = 1,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  itemLabel = "items"
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate page numbers array with dynamic ellipses if needed
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, safeCurrentPage - 2);
      let end = Math.min(totalPages, start + maxVisiblePages - 1);

      if (end === totalPages) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }

      for (let i = start; i <= end; i++) pages.push(i);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#E2E8F0] px-4 sm:px-6 py-3.5 bg-white select-none text-xs">
      {/* Left side: Showing X-Y of Z items & Page Size Selector */}
      <div className="flex flex-wrap items-center gap-3 text-[#64748B]">
        <p className="font-semibold">
          Showing <span className="font-bold text-[#1E293B]">{startItem}–{endItem}</span> of{" "}
          <span className="font-bold text-[#1E293B]">{totalItems}</span> {itemLabel}
        </p>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
            <span className="text-[11px] font-semibold text-slate-500">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                if (onPageChange) onPageChange(1);
              }}
              className="h-7 px-2 py-0.5 text-xs font-bold text-[#243744] bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#243744]"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right side: Interactive Page Buttons */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          onClick={() => onPageChange && onPageChange(1)}
          disabled={safeCurrentPage === 1}
          className="h-8 w-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B] disabled:opacity-30 disabled:hover:bg-white transition-colors"
          title="First Page"
        >
          <ChevronsLeft size={15} />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange && onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 1}
          className="h-8 w-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B] disabled:opacity-30 disabled:hover:bg-white transition-colors"
          title="Previous Page"
        >
          <ChevronLeft size={15} />
        </button>

        {/* Page Number Buttons */}
        {getPageNumbers().map((p) => {
          const isActive = p === safeCurrentPage;
          return (
            <button
              key={p}
              onClick={() => onPageChange && onPageChange(p)}
              className={`h-8 min-w-[32px] px-2 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                isActive
                  ? "bg-[#243744] text-white shadow-xs"
                  : "border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B]"
              }`}
            >
              {p}
            </button>
          );
        })}

        {/* Next Page */}
        <button
          onClick={() => onPageChange && onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage === totalPages}
          className="h-8 w-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B] disabled:opacity-30 disabled:hover:bg-white transition-colors"
          title="Next Page"
        >
          <ChevronRight size={15} />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange && onPageChange(totalPages)}
          disabled={safeCurrentPage === totalPages}
          className="h-8 w-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B] disabled:opacity-30 disabled:hover:bg-white transition-colors"
          title="Last Page"
        >
          <ChevronsRight size={15} />
        </button>
      </div>
    </div>
  );
};

export default TablePagination;
