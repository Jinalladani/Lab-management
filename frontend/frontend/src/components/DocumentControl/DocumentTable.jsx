import React, { useState } from "react";
import {
  FileText, Eye, MoreVertical, Download, PlusCircle, CheckCircle,
  Archive, Share2, Pencil
} from "lucide-react";
import { PortalActionMenu } from "../ui/PortalActionMenu";
import TablePagination from "../ui/TablePagination";
import { openDocumentPreviewInNewTab } from "./DocumentPreviewModal";

const StatusBadge = ({ status }) => {
  let badgeStyle = "bg-gray-100 text-gray-700 border-gray-200";
  
  if (status === "Active") {
    badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (status === "Under Review" || status === "Submitted") {
    badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
  } else if (status === "Draft") {
    badgeStyle = "bg-blue-50 text-blue-700 border-blue-200";
  } else if (status === "Review Due") {
    badgeStyle = "bg-orange-50 text-orange-700 border-orange-200";
  } else if (status === "Obsolete" || status === "Rejected") {
    badgeStyle = "bg-rose-50 text-rose-700 border-rose-200";
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badgeStyle}`}>
      {status}
    </span>
  );
};

const RevisionBadge = ({ rev }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-[#243744] border border-slate-200">
    {rev}
  </span>
);

const DocumentTable = ({
  documents = [],
  loading = false,
  pagination = {},
  onPageChange,
  onLimitChange,
  onRowClick,
  onPreview,
  onDownload,
  onCreateRevision,
  onSubmitReview,
  onObsolete,
  onRequestAck
}) => {
  const [activeMenuDoc, setActiveMenuDoc] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleOpenMenu = (e, doc) => {
    e.stopPropagation();
    if (activeMenuDoc?.id === doc.id) {
      setActiveMenuDoc(null);
      setAnchorEl(null);
    } else {
      setActiveMenuDoc(doc);
      setAnchorEl(e.currentTarget);
    }
  };

  if (loading) {
    return (
      <div className="w-full space-y-2 rounded-2xl border border-gray-200 bg-white p-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-12 w-full animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-16 px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-[#243744]">
          <FileText size={28} />
        </div>
        <h3 className="mt-4 text-sm font-bold text-gray-900">No documents found</h3>
        <p className="mt-1 text-xs text-gray-500 max-w-sm">
          Try changing your search terms or filters, or upload a new controlled document.
        </p>
      </div>
    );
  }

  const getActions = (doc) => [
    { label: "View Details", icon: Eye, onClick: () => onRowClick(doc) },
    { label: "Preview PDF", icon: FileText, onClick: () => onPreview ? onPreview(doc) : openDocumentPreviewInNewTab(doc) },
    { label: "Download", icon: Download, onClick: () => onDownload && onDownload(doc) },
    { label: "Create New Revision", icon: PlusCircle, onClick: () => onCreateRevision && onCreateRevision(doc) },
    ...(doc?.status === "Draft" ? [{ label: "Submit for Review", icon: CheckCircle, onClick: () => onSubmitReview && onSubmitReview(doc) }] : []),
    { label: "Request Sign-off", icon: Share2, onClick: () => onRequestAck && onRequestAck(doc) },
    { label: "Mark Obsolete", icon: Archive, danger: true, onClick: () => onObsolete && onObsolete(doc) },
  ];

  return (
    <div className="w-full rounded-2xl border border-gray-200/80 bg-white shadow-xs overflow-hidden">
      {/* Desktop Table View (md and above) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs text-gray-700">
          <thead className="bg-gray-50/80 border-b border-gray-200/80 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            <tr>
              <th className="py-3.5 px-4">Document No.</th>
              <th className="py-3.5 px-4">Title</th>
              <th className="py-3.5 px-4">Category</th>
              <th className="py-3.5 px-4">Revision</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Review Due</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium">
            {documents.map((doc) => (
              <tr
                key={doc.id}
                onClick={() => onRowClick && onRowClick(doc)}
                className="group hover:bg-slate-50/80 transition-colors cursor-pointer"
              >
                {/* Document No */}
                <td className="py-3.5 px-4 font-bold text-[#243744] whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[#243744] border border-slate-200">
                      <span className="text-[9px] font-extrabold uppercase">PDF</span>
                    </div>
                    <span>{doc.document_number}</span>
                  </div>
                </td>

                {/* Title */}
                <td className="py-3.5 px-4 font-semibold text-[#1A2733] max-w-xs truncate">
                  {doc.title}
                </td>

                {/* Category */}
                <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">
                  {doc.category}
                </td>

                {/* Revision */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <RevisionBadge rev={doc.revision} />
                </td>

                {/* Status */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <StatusBadge status={doc.status} />
                </td>

                {/* Review Due */}
                <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">
                  {doc.review_date}
                </td>

                {/* Actions */}
                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      title="View Details"
                      onClick={() => onRowClick && onRowClick(doc)}
                      className="p-1.5 text-gray-400 hover:text-[#243744] hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Eye size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleOpenMenu(e, doc)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile & Tablet Card Grid View (Screen < md) */}
      <div className="block md:hidden p-3.5 space-y-3.5 bg-slate-50/60">
        {documents.map((doc) => (
          <div
            key={doc.id}
            onClick={() => onRowClick && onRowClick(doc)}
            className="bg-white rounded-2xl p-4 shadow-xs border border-gray-200 hover:border-[#243744]/40 transition-all cursor-pointer space-y-3"
          >
            {/* Top Row: Document No & Status */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-slate-100 text-[#243744] border border-slate-200 uppercase">
                  PDF
                </span>
                <span className="font-extrabold text-xs text-[#243744]">{doc.document_number}</span>
              </div>
              <StatusBadge status={doc.status} />
            </div>

            {/* Title */}
            <div>
              <h4 className="font-bold text-xs text-gray-900 line-clamp-2">{doc.title}</h4>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px]">
              <div>
                <span className="text-gray-400 font-semibold block text-[10px] uppercase tracking-wider">Category</span>
                <span className="font-bold text-[#243744]">{doc.category}</span>
              </div>
              <div>
                <span className="text-gray-400 font-semibold block text-[10px] uppercase tracking-wider">Revision</span>
                <RevisionBadge rev={doc.revision} />
              </div>
              <div className="col-span-2">
                <span className="text-gray-400 font-semibold block text-[10px] uppercase tracking-wider">Review Due</span>
                <span className="font-medium text-gray-700">{doc.review_date || "—"}</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => onRowClick && onRowClick(doc)}
                className="flex-1 py-1.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-[#243744] flex items-center justify-center gap-1 transition-all"
              >
                <Eye size={13} /> View Details
              </button>
              <button
                type="button"
                onClick={() => onPreview ? onPreview(doc) : openDocumentPreviewInNewTab(doc)}
                className="flex-1 py-1.5 px-3 rounded-xl bg-[#243744] hover:bg-[#1A2733] text-[11px] font-bold text-white shadow-xs flex items-center justify-center gap-1 transition-all"
              >
                <FileText size={13} /> Preview
              </button>
              <button
                type="button"
                onClick={(e) => handleOpenMenu(e, doc)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-gray-500 hover:text-[#243744] transition-colors border border-slate-200 shrink-0"
                title="More Actions"
              >
                <MoreVertical size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Portal Action Menu for smooth overflow behavior */}
      {activeMenuDoc && (
        <PortalActionMenu
          anchorEl={anchorEl}
          open={!!activeMenuDoc}
          onClose={() => {
            setActiveMenuDoc(null);
            setAnchorEl(null);
          }}
          actions={getActions(activeMenuDoc)}
        />
      )}

      {/* Standard SmartLab TablePagination */}
      <TablePagination
        totalItems={pagination.total || 0}
        pageSize={pagination.limit || 10}
        currentPage={pagination.page || 1}
        onPageChange={onPageChange}
        onPageSizeChange={onLimitChange}
        pageSizeOptions={[10, 25, 50, 100]}
        itemLabel="documents"
      />
    </div>
  );
};

export default DocumentTable;
