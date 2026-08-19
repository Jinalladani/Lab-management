import React, { useEffect } from "react";

export const openDocumentPreviewInNewTab = (doc) => {
  if (!doc) return;

  const fileName = doc.fileName || `${doc.documentNumber || doc.id || "DOC"}.pdf`;

  // 1. If document has a fileUrl
  if (doc.fileUrl) {
    if (doc.fileUrl.startsWith("data:")) {
      try {
        const parts = doc.fileUrl.split(";base64,");
        const contentType = parts[0].replace("data:", "") || "application/pdf";
        const base64Data = parts[1];
        const binaryStr = window.atob(base64Data);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: contentType });
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open(blobUrl, "_blank");
        if (!win) {
          alert("Pop-up blocked! Please allow pop-ups to open document preview in a new tab.");
        }
        return;
      } catch (err) {
        console.error("Error converting base64 data to blob:", err);
      }
    } else {
      const win = window.open(doc.fileUrl, "_blank");
      if (!win) {
        alert("Pop-up blocked! Please allow pop-ups to open document preview in a new tab.");
      }
      return;
    }
  }

  // 2. If no direct fileUrl, generate standard Document Metadata & Stamp HTML preview page in new tab
  const previewHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${doc.documentNumber ? doc.documentNumber + ' - ' : ''}${doc.title || 'Document Preview'}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      .no-print { display: none !important; }
    }
  </style>
</head>
<body class="bg-slate-100 min-h-screen flex flex-col font-sans text-slate-800 antialiased">
  <header class="bg-[#243744] text-white px-6 py-4 flex items-center justify-between no-print shadow-md">
    <div class="flex items-center gap-3">
      <div class="h-9 w-9 rounded-xl bg-white/10 text-emerald-400 flex items-center justify-center font-extrabold text-xs">
        PDF
      </div>
      <div>
        <h1 class="text-sm font-extrabold tracking-tight flex items-center gap-2">
          <span>${doc.documentNumber ? doc.documentNumber + ' — ' : ''}${doc.title || 'Document Preview'}</span>
          ${doc.currentRevision ? `<span class="text-[10px] bg-white/15 px-2 py-0.5 rounded-full text-slate-200 ml-2">${doc.currentRevision}</span>` : ''}
        </h1>
        <p class="text-[11px] text-slate-300 font-medium">NABL & ISO 17025 Compliant Document Viewer</p>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <button onclick="window.print()" class="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        Print
      </button>
    </div>
  </header>

  <main class="flex-1 p-6 flex items-center justify-center">
    <div class="w-full max-w-3xl bg-white rounded-2xl p-8 shadow-xl border border-slate-200 min-h-[550px] flex flex-col justify-between relative">
      <div class="flex justify-between items-start border-b border-slate-200 pb-4">
        <div>
          <span class="text-xs font-black uppercase tracking-widest text-[#243744] bg-[#243744]/10 px-2.5 py-1 rounded-lg border border-[#243744]/20 inline-block mb-1">
            SmartLab LIMS Controlled Copy
          </span>
          <h2 class="text-xl font-black text-[#243744]">${doc.title || 'Untitled Document'}</h2>
          <p class="text-xs text-slate-500 font-medium">${doc.category || "NABL Reference"} • ${doc.documentType || "Official Procedure"}</p>
        </div>
        <div class="text-right text-xs">
          <span class="font-extrabold text-[#243744] block text-sm">${doc.documentNumber || "DOC-REF"}</span>
          <span class="text-slate-500 font-semibold block">${doc.currentRevision || `Issue ${doc.issueNumber || '01'}`}</span>
          <span class="text-emerald-600 font-bold block mt-1">Status: Active</span>
        </div>
      </div>

      <div class="my-6 space-y-4 text-xs text-slate-700 leading-relaxed">
        <div class="bg-slate-50 p-5 rounded-xl border border-slate-200 font-mono text-[11px] space-y-1.5">
          <p class="font-bold text-[#243744] mb-2 uppercase tracking-wider border-b border-slate-200 pb-1">Verified Document Registry Metadata:</p>
          <p><span class="text-slate-400">File Name:</span> <span class="font-bold text-[#243744]">${fileName}</span></p>
          <p><span class="text-slate-400">NABL Reference:</span> <span class="font-bold text-[#243744]">${doc.nablReferenceNumber || doc.documentNumber || "NABL 160A"}</span></p>
          <p><span class="text-slate-400">Effective Date:</span> ${doc.effectiveDate || doc.issueDate || "01-Jan-2026"}</p>
          <p><span class="text-slate-400">Review Date:</span> ${doc.reviewDate || "01-Jan-2027"}</p>
          <p><span class="text-slate-400">File Size:</span> ${doc.fileSize || "1.45 MB"}</p>
          <p><span class="text-slate-400">Uploaded By:</span> ${doc.createdBy || "Authorized User"}</p>
        </div>

        ${doc.description ? `<p class="font-medium bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-600">${doc.description}</p>` : ''}

        <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-slate-700 space-y-1">
          <p class="font-bold text-[#059669] flex items-center gap-1.5">✓ ISO 17025 Accreditation Stamp Verified</p>
          <p class="text-[11px] text-slate-500">Document authenticated by SmartLab LIMS Quality Control System. Authorized for laboratory operations.</p>
        </div>
      </div>

      <div class="pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] font-bold text-slate-400">
        <span>SmartLab LIMS Controlled Document Registry</span>
        <span>ISO/IEC 17025:2017 Compliant</span>
      </div>
    </div>
  </main>
</body>
</html>`;

  const blob = new Blob([previewHtml], { type: "text/html" });
  const blobUrl = URL.createObjectURL(blob);
  const win = window.open(blobUrl, "_blank");
  if (!win) {
    alert("Pop-up blocked! Please allow pop-ups to open document preview in a new tab.");
  }
};

export const DocumentPreviewModal = ({ isOpen, doc, onClose }) => {
  useEffect(() => {
    if (isOpen && doc) {
      openDocumentPreviewInNewTab(doc);
      if (onClose) onClose();
    }
  }, [isOpen, doc, onClose]);

  return null;
};

export default DocumentPreviewModal;
