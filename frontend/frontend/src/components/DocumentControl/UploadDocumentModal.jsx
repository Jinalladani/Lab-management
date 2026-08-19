import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, FileText, CheckCircle, Search } from "lucide-react";
import { mockDocumentDb } from "../../utils/mockDocumentData";
import { addLabDocumentApi } from "../../api/documentControl";

export const UploadDocumentModal = ({ isOpen, onClose, onSuccess, currentLabId }) => {
  const [category, setCategory] = useState("Controlled Document");
  const [documentType, setDocumentType] = useState("SOP");
  const [title, setTitle] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [revisionNumber, setRevisionNumber] = useState("Rev 02");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().substring(0, 10));
  const [reviewDate, setReviewDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
  );
  const [description, setDescription] = useState("");

  // NABL References Searchable List
  const [nablList, setNablList] = useState([]);
  const [selectedNablRefId, setSelectedNablRefId] = useState("none");

  // File Upload State
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileUrl, setFileUrl] = useState("");

  const [allCategories, setAllCategories] = useState([]);

  useEffect(() => {
    const refs = mockDocumentDb.getNablReferences();
    setNablList(refs);
    const cats = mockDocumentDb.getDocumentCategories();
    setAllCategories(cats);
  }, []);

  useEffect(() => {
    if (category === "Controlled Document") {
      setDocumentType("SOP");
    } else {
      setDocumentType("Calibration Certificate");
    }
  }, [category]);

  const controlledTypes = React.useMemo(() => {
    const cats = allCategories.filter(c => c.categoryType === "Controlled Document");
    const types = cats.flatMap(c => c.documentTypes || [c.name]);
    return types.length > 0 ? Array.from(new Set(types)) : ["Quality Manual", "Quality Policy", "SOP", "Work Instruction", "Test Method", "Form / Format", "Other"];
  }, [allCategories]);

  const supportingTypes = React.useMemo(() => {
    const cats = allCategories.filter(c => c.categoryType === "Supporting Document");
    const types = cats.flatMap(c => c.documentTypes || [c.name]);
    return types.length > 0 ? Array.from(new Set(types)) : ["Calibration Certificate", "Equipment Document", "Training Document", "Internal Audit", "Management Review", "PT / ILC", "NC / Corrective Action", "Other"];
  }, [allCategories]);

  const handleFileProcess = (file) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setFileUrl(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title) {
      alert("Please enter Document Title.");
      return;
    }
    if (!selectedFile) {
      alert("Please upload a document file.");
      return;
    }

    const selectedNablObj = nablList.find(n => n.id === selectedNablRefId);

    const docPayload = {
      labId: currentLabId || "LAB-001",
      documentNumber: documentNumber || `SOP-${Date.now().toString().slice(-4)}`,
      title,
      category,
      documentType,
      currentRevision: revisionNumber || "Rev 02",
      effectiveDate,
      reviewDate: reviewDate || new Date(Date.now() + 365*24*60*60*1000).toISOString().substring(0, 10),
      description,
      nablReferenceId: selectedNablObj ? selectedNablObj.id : null,
      nablReferenceNumber: selectedNablObj ? selectedNablObj.documentNumber : "-",
      fileName: selectedFile.name,
      fileSize: `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`,
      fileUrl: fileUrl,
      mimeType: selectedFile.type || "application/pdf",
      createdBy: "Authorized User"
    };

    try {
      await addLabDocumentApi(docPayload);
    } catch (err) {
      console.warn("Backend API upload failed, falling back to local DB:", err);
    }

    mockDocumentDb.addLabDocument(docPayload);

    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
        <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="relative z-10 w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200"
        >
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-base font-bold text-[#1E293B]">Upload Document</h3>
              <p className="text-xs text-slate-500 font-medium">Add new document for your laboratory</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-200/80 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Document Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Concrete Compressive Strength Test SOP"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full h-10 px-3 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Document Number</label>
                <input
                  type="text"
                  placeholder="e.g. SOP-CON-001"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:border-[#243744]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Document Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 px-3 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:border-[#243744] bg-white"
                  >
                    <option value="Controlled Document">Controlled Document</option>
                    <option value="Supporting Document">Supporting Document</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Document Type *</label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full h-10 px-3 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:border-[#243744] bg-white"
                  >
                    {(category === "Controlled Document" ? controlledTypes : supportingTypes).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Revision Number *</label>
                  <input
                    type="text"
                    placeholder="Rev 02"
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Applicable NABL Reference *</label>
                <select
                  value={selectedNablRefId}
                  onChange={(e) => setSelectedNablRefId(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:border-[#243744] bg-white"
                >
                  <option value="none">Not Applicable</option>
                  {nablList.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.documentNumber} - {n.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Enter description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:border-[#243744]"
                />
              </div>

              {/* Drag & Drop File Upload Zone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Upload File *</label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleFileDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                    dragActive ? "border-[#243744] bg-[#243744]/5" : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                  }`}
                >
                  <Upload className="w-8 h-8 mx-auto text-[#243744] mb-2" />
                  <p className="text-xs font-bold text-[#1E293B]">Drag & Drop document here</p>
                  <p className="text-[11px] text-slate-400 font-semibold mt-1">PDF, DOCX, XLSX, Images</p>
                  <label className="inline-block mt-3 px-4 py-1.5 rounded-xl bg-[#243744] text-white text-xs font-bold hover:bg-[#1A2733] transition-all cursor-pointer">
                    Browse File
                    <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" onChange={handleFileSelect} className="hidden" />
                  </label>

                  {selectedFile && (
                    <div className="mt-3 inline-flex items-center gap-2 p-2 px-3 rounded-xl bg-[#059669]/10 border border-[#059669]/20 text-xs font-bold text-[#059669]">
                      <span>{selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                      <button type="button" onClick={() => { setSelectedFile(null); setFileUrl(""); }} className="text-red-500 hover:text-red-700 ml-1">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
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
                Save Document
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UploadDocumentModal;
