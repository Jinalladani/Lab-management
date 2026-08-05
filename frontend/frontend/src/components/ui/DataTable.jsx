import React from "react";
import { ChevronDown, ChevronsUpDown, ArrowUp, ArrowDown } from "lucide-react";
import EmptyState from "./EmptyState";

const DataTable = ({
  columns = [],
  data = [],
  getRowKey,
  emptyTitle = "No records found",
  emptyDescription,
  loading = false,
  sortConfig,
  onSortChange,
}) => {
  const rows = loading ? Array.from({ length: 6 }) : data;

  const getColKey = (column, index) => column.key || column.id || column.accessorKey || column.header || column.label || `col-${index}`;
  const getColLabel = (column) => column.label || column.header || "";

  return (
    <div className="overflow-hidden rounded-[20px] border border-[#E3E7EC] bg-white" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="max-h-[680px] overflow-auto">
        <table className="w-full min-w-[920px] border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-[#F4F5F7]">
            <tr>
              {columns.map((column, colIndex) => {
                const colKey = getColKey(column, colIndex);
                const isSortable = column.sortable || Boolean(column.onSort) || Boolean(onSortChange);
                const isSorted = sortConfig && sortConfig.key === colKey;
                const sortDir = isSorted ? sortConfig.direction : column.sortDirection;

                const handleHeaderClick = () => {
                  if (column.onSort) {
                    column.onSort();
                  } else if (onSortChange) {
                    onSortChange(colKey);
                  }
                };

                return (
                  <th
                    key={colKey}
                    onClick={isSortable ? handleHeaderClick : undefined}
                    className={[
                      "border-b border-[#E3E7EC] px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]",
                      isSortable ? "cursor-pointer select-none hover:text-[#1E293B] hover:bg-[#EAECEF]" : ""
                    ].join(" ")}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {getColLabel(column)}
                      {isSortable && (
                        sortDir === "asc" ? (
                          <ArrowDown size={14} className="text-[#23395B] stroke-[2.5]" title="Ascending (A to Z)" />
                        ) : sortDir === "desc" ? (
                          <ArrowUp size={14} className="text-[#23395B] stroke-[2.5]" title="Descending (Z to A)" />
                        ) : (
                          <ChevronsUpDown size={14} className="text-[#94A3B8]" />
                        )
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading && rows.map((_, rowIndex) => (
              <tr key={`loading-row-${rowIndex}`} className="border-b border-[#E3E7EC]">
                {columns.map((column, colIndex) => {
                  const colKey = getColKey(column, colIndex);
                  return (
                    <td key={`loading-cell-${rowIndex}-${colKey}`} className="border-b border-[#EDF0F3] px-5 py-4">
                      <div className="h-4 w-3/4 rounded-lg bg-[#EDF0F3]" />
                    </td>
                  );
                })}
              </tr>
            ))}
            {!loading && data.map((row, rowIndex) => {
              const rowKey = getRowKey ? getRowKey(row, rowIndex) : (row.role_id ?? row.id ?? row.lab_id ?? row.user_id ?? `row-${rowIndex}`);
              return (
                <tr
                  key={rowKey}
                  className="group transition-colors duration-150 hover:bg-[#FAFBFC]"
                >
                  {columns.map((column, colIndex) => {
                    const colKey = getColKey(column, colIndex);
                    const cellContent = column.cell 
                      ? column.cell({ row: { original: row, index: rowIndex }, getValue: () => row[column.accessorKey || column.key] })
                      : column.render 
                        ? column.render(row, rowIndex) 
                        : row[column.key || column.accessorKey];

                    return (
                      <td key={`cell-${rowKey}-${colKey}`} className="border-b border-[#EDF0F3] px-5 py-4 text-sm text-[#1E293B] last:border-b">
                        {cellContent}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
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
