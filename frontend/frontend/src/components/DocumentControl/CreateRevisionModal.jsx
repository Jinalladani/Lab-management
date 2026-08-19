import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Upload, History, FileText } from "lucide-react";
import { mockDocumentDb } from "../../utils/mockDocumentData";

export const CreateRevisionModal = ({ isOpen, doc, onClose, onSuccess }) => {
  // Auto-increment revision number e.g. Rev 02 -> Rev 03
  const currentRevNum = doc?.currentRevision || "Rev 00";
  const numPart = parseInt(currentRevNum.replace(/\D/g, ""), 10) || 0;
  const defaultNextRev = `Rev ${String(numPart + 1).padStart(2, "0")}`;

  const [revisionNumber, setRevisionNumber] = useState(defaultNextRev);
  const [changeReason, setChangeReason] = useState("");
  const [changeSummary, setChangeSummary] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().substring(0, 10));
  const [reviewDate, setReviewDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
  );

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  if (!isOpen || !doc) return null;

  const handleFileDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!changeReason) {
      alert("Please specify the Change Reason for this revision.");
      return;
    }
    if (!selectedFile) {
      alert("Please upload the revised document file.");
      return;
    }

    mockDocumentDb.createDocumentRevision(doc.id, {
      revisionNumber,
      changeReason,
      changeSummary,
      effectiveDate,
      reviewDate,
      fileName: selectedFile.name,
      fileSize: `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`,
      createdBy: "Authorized User"
    });

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden"
      >
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#1E293B]">Create New Revision</h3>
            <p className="text-xs text-slate-500 font-medium">{doc.documentNumber} — {doc.title}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Top Status Box (Screen 10) */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs flex justify-between items-center">
            <div>
              <span className="text-slate-400 font-bold text-[10px] uppercase block">Current Revision</span>
              <span className="font-black text-[#243744] text-sm">{currentRevNum}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 font-bold text-[10px] uppercase block">Effective Date</span>
              <span className="font-bold text-slate-700">{doc.effectiveDate || "08-Aug-2026"}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">New Revision Number *</label>
              <input
                type="text"
                value={revisionNumber}
                onChange={(e) => setRevisionNumber(e.target.value)}
                required
                className="w-full h-10 px-3 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:border-[#243744]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Effective Date *</label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                required
                className="w-full h-10 px-3 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:border-[#243744]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Review Date *</label>
              <input
                type="date"
                value={reviewDate}
                onChange={(e) => setReviewDate(e.target.value)}
                required
                className="w-full h-10 px-3 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:border-[#243744]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Change Reason *</label>
            <select
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              required
              className="w-full h-10 px-3 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:border-[#243744] bg-white"
            >
              <option value="">Select Reason</option>
              <option value="Annual Review">Annual Review</option>
              <option value="ISO Standard Alignment">ISO Standard Alignment</option>
              <option value="Scope Extension">Scope Extension</option>
              <option value="Process Improvement">Process Improvement</option>
              <option value="Correction / Errata">Correction / Errata</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Change Summary *</label>
            <textarea
              rows={2}
              placeholder="Enter change summary..."
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:border-[#243744]"
            />
          </div>

          {/* Upload New File Drag & Drop Zone (Screen 10) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Upload New File *</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleFileDrop}
              className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer ${
                dragActive ? "border-[#243744] bg-[#243744]/5" : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
              }`}
            >
              <Upload className="w-6 h-6 mx-auto text-[#243744] mb-1.5" />
              <p className="text-xs font-bold text-[#1E293B]">Drag & Drop document here</p>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">PDF, DOCX, XLSX</p>
              <label className="inline-block mt-2 px-3.5 py-1 rounded-xl bg-[#243744] text-white text-xs font-bold hover:bg-[#1A2733] transition-all cursor-pointer">
                Browse File
                <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={handleFileSelect} className="hidden" />
              </label>

              {selectedFile && (
                <p className="mt-2 text-xs font-bold text-[#059669]">
                  Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#243744] hover:bg-[#1A2733] text-white text-xs font-bold transition-all shadow-sm"
            >
              Create Revision
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CreateRevisionModal;
