import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  X, Eye, Download, FileText, Calendar, History, Plus, Pencil, Trash2, Award, ShieldCheck, Clock
} from "lucide-react";
import { openDocumentPreviewInNewTab } from "./DocumentPreviewModal";

export const DocumentDetailDrawer = ({ doc, onClose, onOpenCreateRevision, onArchive, onPreview }) => {
  const [activeTab, setActiveTab] = useState("details"); // 'details' | 'versions' | 'history'

  if (!doc) return null;

  const revisions = doc.revisions || [
    {
      revisionNumber: doc.currentRevision || "Rev 00",
      status: "Current",
      effectiveDate: doc.effectiveDate || new Date().toISOString().substring(0, 10),
      reviewDate: doc.reviewDate || "—",
      changeReason: "Initial release of document",
      fileName: doc.fileName || `${doc.documentNumber}.pdf`,
      fileSize: doc.fileSize || "1.00 MB",
      createdBy: doc.createdBy || "Authorized User",
      createdAt: doc.createdAt || new Date().toISOString()
    }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      {/* Click outside backdrop */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative z-10 w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200"
      >
        {/* Drawer Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-[#243744] text-white text-xs font-extrabold tracking-wide">
              {doc.documentNumber}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-[#059669] border border-emerald-200">
              {doc.status}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-[#243744]">
              {doc.currentRevision || "Rev 00"}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200/80 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-white">
          {[
            { id: "details", label: "Details" },
            { id: "versions", label: "Versions" },
            { id: "history", label: "History" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-all ${
                activeTab === tab.id
                  ? "border-[#243744] text-[#243744]"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "details" && (
            <>
              {/* Document Title & Description */}
              <div>
                <h3 className="text-lg font-black text-[#1E293B] tracking-tight">{doc.title}</h3>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                  {doc.description || "Laboratory compliance document."}
                </p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Document Number</span>
                  <span className="font-extrabold text-[#1E293B]">{doc.documentNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Category</span>
                  <span className="font-extrabold text-[#243744]">{doc.category}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Document Type</span>
                  <span className="font-extrabold text-[#1E293B]">{doc.documentType || "SOP"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Revision</span>
                  <span className="font-extrabold text-[#243744]">{doc.currentRevision || "Rev 00"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">NABL Reference</span>
                  <span className="font-extrabold text-[#243744]">{doc.nablReferenceNumber || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Effective Date</span>
                  <span className="font-bold text-slate-700">{doc.effectiveDate || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Review Date</span>
                  <span className="font-black text-[#243744]">{doc.reviewDate || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Created By</span>
                  <span className="font-bold text-slate-700">{doc.createdBy || "Authorized User"}</span>
                </div>
              </div>

              {/* File Attachment Box */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">File</h4>
                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-extrabold text-xs">
                      PDF
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#1E293B] line-clamp-1">{doc.fileName || `${doc.documentNumber}.pdf`}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{doc.fileSize || '1.00 MB'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onPreview ? onPreview(doc) : openDocumentPreviewInNewTab(doc)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-[#243744]"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => alert(`Downloading ${doc.fileName}...`)}
                      className="px-3 py-1.5 rounded-xl bg-[#243744] hover:bg-[#1A2733] text-xs font-bold text-white shadow-xs"
                    >
                      Download
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Versions Tab */}
          {activeTab === "versions" && (
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <History size={14} /> Version History
              </h4>

              <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                {revisions.map((rev, index) => (
                  <div key={index} className="p-4 bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-[#243744]">{rev.revisionNumber}</span>
                      {rev.status === "Current" ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-[#059669]">
                          Current
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500">
                          Archived
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 font-bold">{rev.changeReason || "Document release"}</p>
                    {rev.changeSummary && (
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">{rev.changeSummary}</p>
                    )}
                    <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 font-bold border-t border-slate-100 pt-2">
                      <span>Effective: {rev.effectiveDate || '—'}</span>
                      <span>By: {rev.createdBy || 'Authorized User'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Activity History</h4>
              <div className="space-y-2 text-xs text-slate-600">
                {revisions.map((rev, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="font-bold text-[#243744]">Revision {rev.revisionNumber} ({rev.status})</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">By {rev.createdBy || 'Authorized User'} • {rev.effectiveDate || '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Actions Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-2">
          <button
            onClick={() => alert(`Opening edit metadata for ${doc.documentNumber}...`)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700"
          >
            Edit Document
          </button>
          <button
            onClick={onOpenCreateRevision}
            className="px-4 py-2 rounded-xl bg-[#243744] hover:bg-[#1A2733] text-white text-xs font-bold transition-all shadow-xs"
          >
            Create New Revision
          </button>
          <button
            onClick={onArchive}
            className="px-3.5 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-all"
          >
            Archive Document
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default DocumentDetailDrawer;
