import React from "react";
import { ChevronDown, ChevronsUpDown } from "lucide-react";
import EmptyState from "./EmptyState";

const DataTable = ({
  columns = [],
  data = [],
  getRowKey,
  emptyTitle = "No records found",
  emptyDescription,
  loading = false,
}) => {
  const rows = loading ? Array.from({ length: 6 }) : data;

  return (
    <div className="overflow-hidden rounded-[20px] border border-[#E3E7EC] bg-white" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="max-h-[680px] overflow-auto">
        <table className="w-full min-w-[920px] border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-[#F4F5F7]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="border-b border-[#E3E7EC] px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]"
                >
                  <span className="inline-flex items-center gap-1.5">
                    {column.label}
                    {column.sortable && <ChevronsUpDown size={14} className="text-[#94A3B8]" />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && rows.map((_, index) => (
              <tr key={index} className="border-b border-[#E3E7EC]">
                {columns.map((column) => (
                  <td key={column.key} className="border-b border-[#EDF0F3] px-5 py-4">
                    <div className="h-4 w-3/4 rounded-lg bg-[#EDF0F3]" />
                  </td>
                ))}
              </tr>
            ))}
            {!loading && data.map((row, index) => (
              <tr
                key={getRowKey ? getRowKey(row) : index}
                className="group transition-colors duration-150 hover:bg-[#FAFBFC]"
              >
                {columns.map((column) => (
                  <td key={column.key} className="border-b border-[#EDF0F3] px-5 py-4 text-sm text-[#1E293B] last:border-b">
                    {column.render ? column.render(row, index) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && data.length === 0 && (
        <div className="p-6">
          <EmptyState title={emptyTitle} description={emptyDescription} className="min-h-[220px]" />
        </div>
      )}
      <div className="flex items-center justify-between border-t border-[#E3E7EC] px-5 py-4 text-sm text-[#64748B]">
        <span>{data.length} records</span>
        <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-[#E3E7EC] bg-white px-3 py-2 font-semibold text-[#23395B]">
          Page 1
          <ChevronDown size={16} />
        </button>
      </div>
    </div>
  );
};

export default DataTable;
