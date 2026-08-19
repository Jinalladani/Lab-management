import {
  addNablReferenceApi,
  addNablAmendmentApi,
  archiveNablReferenceApi,
  addLabDocumentApi,
  createLabDocumentRevisionApi,
  archiveLabDocumentApi,
  addDocumentCategoryApi
} from "../api/documentControl";

// Initial Default Seed Objects
const DEFAULT_NABL_REFERENCES = [];

const DEFAULT_LAB_DOCUMENTS = [];

const DEFAULT_CATEGORIES = [
  { id: "CAT-001", name: "Quality Manual", categoryType: "Controlled Document", active: true, prefix: "QM", description: "Top-level quality policy and governance framework", documentCount: 4, documentTypes: ["Quality Manual"] },
  { id: "CAT-002", name: "Standard Operating Procedure (SOP)", categoryType: "Controlled Document", active: true, prefix: "SOP", description: "Standard operational procedures for lab workflows", documentCount: 18, documentTypes: ["SOP"] },
  { id: "CAT-003", name: "Work Instruction (WI)", categoryType: "Controlled Document", active: true, prefix: "WI", description: "Step-by-step instructions for equipment and testing", documentCount: 12, documentTypes: ["Work Instruction"] },
  { id: "CAT-004", name: "Test Method & Standard", categoryType: "Controlled Document", active: true, prefix: "TM", description: "NABL / IS / ISO accredited test methods and standards", documentCount: 25, documentTypes: ["Test Method"] },
  { id: "CAT-005", name: "Form / Format / Register", categoryType: "Controlled Document", active: true, prefix: "FMT", description: "Standard formats, templates, and logging registers", documentCount: 15, documentTypes: ["Form / Format"] },
  { id: "CAT-006", name: "Calibration Certificate", categoryType: "Supporting Document", active: true, prefix: "CAL", description: "Equipment calibration certificates and traceabilities", documentCount: 30, documentTypes: ["Calibration Certificate"] },
  { id: "CAT-007", name: "Equipment Document", categoryType: "Supporting Document", active: true, prefix: "EQP", description: "User manuals, maintenance records, and specifications", documentCount: 22, documentTypes: ["Equipment Document"] },
  { id: "CAT-008", name: "Internal Audit & Management Review", categoryType: "Supporting Document", active: true, prefix: "AUD", description: "Audit reports, non-conformities, and review minutes", documentCount: 8, documentTypes: ["Internal Audit"] },
  { id: "CAT-009", name: "PT / ILC Interlab Record", categoryType: "Supporting Document", active: true, prefix: "PT", description: "Proficiency testing and inter-laboratory comparisons", documentCount: 6, documentTypes: ["PT / ILC"] }
];

// In-Memory Data Storage (NO localStorage used)
let inMemoryNablRefs = [...DEFAULT_NABL_REFERENCES];
let inMemoryLabDocs = [...DEFAULT_LAB_DOCUMENTS];
let inMemoryCategories = [...DEFAULT_CATEGORIES];

export const mockDocumentDb = {
  // NABL Reference Operations (Super Admin Managed)
  getNablReferences: () => {
    return [...inMemoryNablRefs];
  },

  addNablReference: (newDoc) => {
    const docId = `NABL-${Date.now()}`;
    const formatted = {
      id: docId,
      documentNumber: newDoc.documentNumber || `NABL ${Date.now().toString().slice(-3)}`,
      title: newDoc.title || "Untitled NABL Reference",
      category: newDoc.category || "Guidance",
      issueNumber: newDoc.issueNumber || "01",
      amendmentNumber: newDoc.amendmentNumber || "00",
      issueDate: newDoc.issueDate || new Date().toISOString().substring(0, 10),
      amendmentDate: newDoc.amendmentDate || new Date().toISOString().substring(0, 10),
      description: newDoc.description || "",
      filePath: newDoc.filePath || `/docs/${newDoc.fileName || 'nabl-document.pdf'}`,
      fileName: newDoc.fileName || "NABL-Reference.pdf",
      fileSize: newDoc.fileSize || "1.50 MB",
      fileUrl: newDoc.fileUrl || "",
      mimeType: newDoc.mimeType || "application/pdf",
      status: "LATEST",
      version: `v${newDoc.issueNumber || '1'}.${newDoc.amendmentNumber || '0'}`,
      history: [
        {
          version: `v${newDoc.issueNumber || '1'}.${newDoc.amendmentNumber || '0'}`,
          issueNumber: newDoc.issueNumber || "01",
          amendmentNumber: newDoc.amendmentNumber || "00",
          date: newDoc.issueDate || new Date().toISOString().substring(0, 10),
          status: "LATEST",
          fileName: newDoc.fileName || "NABL-Reference.pdf",
          fileUrl: newDoc.fileUrl || "",
          changeReason: "Initial publication of NABL document"
        }
      ],
      createdBy: "Super Admin",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    inMemoryNablRefs = [formatted, ...inMemoryNablRefs];
    addNablReferenceApi(formatted).catch(() => {});

    return formatted;
  },

  addNablAmendment: (id, amendmentData) => {
    const index = inMemoryNablRefs.findIndex(r => r.id === id || r.documentNumber === id);
    if (index === -1) return null;

    const current = inMemoryNablRefs[index];

    // Archive snapshot of current (previous version before amendment)
    const archivedPrevDoc = {
      ...current,
      id: `${current.id}_amended_v${current.amendmentNumber || '00'}_${Date.now()}`,
      title: `${current.title} (Amended v${current.amendmentNumber || '00'})`,
      status: "ARCHIVED",
      archivedAt: new Date().toISOString(),
      isArchivedAmendment: true,
      originalDocId: current.id
    };

    const existingHistory = current.history && current.history.length > 0
      ? current.history
      : [{
          version: `v${current.issueNumber || '1'}.${current.amendmentNumber || '0'}`,
          issueNumber: current.issueNumber || "01",
          amendmentNumber: current.amendmentNumber || "00",
          date: current.amendmentDate || current.issueDate || new Date().toISOString().substring(0, 10),
          status: "ARCHIVED",
          fileName: current.fileName,
          fileSize: current.fileSize,
          fileUrl: current.fileUrl,
          changeReason: "Initial document version"
        }];

    const updatedHistory = existingHistory.map(h => ({ ...h, status: "ARCHIVED" }));
    const newVersionStr = `v${amendmentData.issueNumber || current.issueNumber}.${amendmentData.amendmentNumber || '0'}`;

    const newHistoryEntry = {
      version: newVersionStr,
      issueNumber: amendmentData.issueNumber || current.issueNumber,
      amendmentNumber: amendmentData.amendmentNumber || "01",
      date: amendmentData.amendmentDate || new Date().toISOString().substring(0, 10),
      status: "LATEST",
      fileName: amendmentData.fileName || current.fileName,
      fileSize: amendmentData.fileSize || current.fileSize,
      fileUrl: amendmentData.fileUrl || current.fileUrl,
      changeReason: amendmentData.changeReason || "NABL Amendment Publication"
    };

    const updatedDoc = {
      ...current,
      issueNumber: amendmentData.issueNumber || current.issueNumber,
      amendmentNumber: amendmentData.amendmentNumber || "01",
      amendmentDate: amendmentData.amendmentDate || new Date().toISOString().substring(0, 10),
      description: amendmentData.description || current.description,
      fileName: amendmentData.fileName || current.fileName,
      fileSize: amendmentData.fileSize || current.fileSize,
      fileUrl: amendmentData.fileUrl || current.fileUrl,
      status: "LATEST",
      version: newVersionStr,
      history: [newHistoryEntry, ...updatedHistory],
      updatedAt: new Date().toISOString()
    };

    inMemoryNablRefs[index] = updatedDoc;
    inMemoryNablRefs = [archivedPrevDoc, ...inMemoryNablRefs];

    addNablAmendmentApi(id, amendmentData).catch(() => {});

    return updatedDoc;
  },

  archiveNablReference: (id) => {
    inMemoryNablRefs = inMemoryNablRefs.map(r => {
      if (r.id === id) return { ...r, status: "ARCHIVED", updatedAt: new Date().toISOString() };
      return r;
    });

    archiveNablReferenceApi(id).catch(() => {});
    return true;
  },

  // Lab Document Operations (Lab Specific & Isolated)
  getLabDocuments: (labId = null) => {
    const today = new Date();
    let list = inMemoryLabDocs.map(doc => {
      if (doc.status === "Archived") return doc;
      if (doc.reviewDate) {
        const revDate = new Date(doc.reviewDate);
        const diffDays = Math.ceil((revDate - today) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
          return { ...doc, status: "Review Due" };
        }
      }
      return doc;
    });

    if (labId && labId !== "all") {
      return list.filter(d => d.labId === labId || d.labName === labId);
    }
    return list;
  },

  addLabDocument: (newDoc) => {
    const docId = `DOC-${Date.now()}`;
    const initialRev = newDoc.currentRevision || "Rev 00";

    const formatted = {
      id: docId,
      labId: newDoc.labId || "LAB-001",
      labName: newDoc.labName || "Central Lab",
      documentNumber: newDoc.documentNumber || `DOC-${Date.now().toString().slice(-4)}`,
      title: newDoc.title || "Untitled Document",
      category: newDoc.category || "Controlled Document",
      documentType: newDoc.documentType || "SOP",
      description: newDoc.description || "",
      nablReferenceId: newDoc.nablReferenceId || null,
      nablReferenceNumber: newDoc.nablReferenceNumber || "Not Applicable",
      currentRevision: initialRev,
      effectiveDate: newDoc.effectiveDate || new Date().toISOString().substring(0, 10),
      reviewDate: newDoc.reviewDate || "",
      status: newDoc.status || "Active",
      filePath: newDoc.filePath || `/uploads/${newDoc.fileName || 'document.pdf'}`,
      fileName: newDoc.fileName || "Document.pdf",
      fileSize: newDoc.fileSize || "1.20 MB",
      fileUrl: newDoc.fileUrl || "",
      mimeType: newDoc.mimeType || "application/pdf",
      revisions: [
        {
          revisionNumber: initialRev,
          status: "Current",
          effectiveDate: newDoc.effectiveDate || new Date().toISOString().substring(0, 10),
          reviewDate: newDoc.reviewDate || "",
          changeReason: "Initial release of document",
          changeSummary: "Original document upload",
          filePath: newDoc.filePath || `/uploads/${newDoc.fileName || 'document.pdf'}`,
          fileName: newDoc.fileName || "Document.pdf",
          fileSize: newDoc.fileSize || "1.20 MB",
          fileUrl: newDoc.fileUrl || "",
          createdBy: newDoc.createdBy || "Authorized User",
          createdAt: new Date().toISOString()
        }
      ],
      createdBy: newDoc.createdBy || "Authorized User",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    inMemoryLabDocs = [formatted, ...inMemoryLabDocs];
    addLabDocumentApi(formatted).catch(() => {});

    return formatted;
  },

  createDocumentRevision: (docId, revData) => {
    const index = inMemoryLabDocs.findIndex(d => d.id === docId);
    if (index === -1) return null;

    const current = inMemoryLabDocs[index];
    const updatedRevisions = (current.revisions || []).map(r => ({ ...r, status: "Archived" }));

    const newRevNumber = revData.revisionNumber || `Rev 0${(current.revisions || []).length}`;

    const newRevObj = {
      revisionNumber: newRevNumber,
      status: "Current",
      effectiveDate: revData.effectiveDate || new Date().toISOString().substring(0, 10),
      reviewDate: revData.reviewDate || current.reviewDate,
      changeReason: revData.changeReason || "Document Revision",
      changeSummary: revData.changeSummary || "Updated document content and metadata",
      filePath: revData.filePath || `/uploads/${revData.fileName || current.fileName}`,
      fileName: revData.fileName || current.fileName,
      fileSize: revData.fileSize || current.fileSize,
      fileUrl: revData.fileUrl || current.fileUrl,
      createdBy: revData.createdBy || "Authorized User",
      createdAt: new Date().toISOString()
    };

    const updatedDoc = {
      ...current,
      currentRevision: newRevNumber,
      effectiveDate: revData.effectiveDate || new Date().toISOString().substring(0, 10),
      reviewDate: revData.reviewDate || current.reviewDate,
      fileName: revData.fileName || current.fileName,
      fileSize: revData.fileSize || current.fileSize,
      fileUrl: revData.fileUrl || current.fileUrl,
      status: "Active",
      revisions: [newRevObj, ...updatedRevisions],
      updatedAt: new Date().toISOString()
    };

    inMemoryLabDocs[index] = updatedDoc;
    createLabDocumentRevisionApi(docId, revData).catch(() => {});

    return updatedDoc;
  },

  updateLabDocument: (docId, updatedData) => {
    const index = inMemoryLabDocs.findIndex(d => d.id === docId);
    if (index === -1) return null;

    const updatedDoc = {
      ...inMemoryLabDocs[index],
      ...updatedData,
      updatedAt: new Date().toISOString()
    };

    inMemoryLabDocs[index] = updatedDoc;
    return updatedDoc;
  },

  archiveLabDocument: (docId, reason = "") => {
    const index = inMemoryLabDocs.findIndex(d => d.id === docId);
    if (index === -1) return false;

    const current = inMemoryLabDocs[index];
    const updatedDoc = {
      ...current,
      status: "Archived",
      archiveReason: reason || "Archived by user",
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    inMemoryLabDocs[index] = updatedDoc;
    archiveLabDocumentApi(docId).catch(() => {});

    return updatedDoc;
  },

  // Document Categories
  getDocumentCategories: () => {
    return [...inMemoryCategories];
  },

  addDocumentCategory: (cat) => {
    const newCat = {
      id: `CAT-${Date.now()}`,
      name: cat.name,
      categoryType: cat.categoryType || "Controlled Document",
      prefix: cat.prefix || cat.name.slice(0, 3).toUpperCase(),
      description: cat.description || "",
      active: true,
      documentCount: 0,
      documentTypes: [cat.name]
    };
    inMemoryCategories = [newCat, ...inMemoryCategories];

    addDocumentCategoryApi(cat).catch(() => {});

    return newCat;
  },

  updateDocumentCategory: (id, catData) => {
    const index = inMemoryCategories.findIndex(c => c.id === id);
    if (index === -1) return null;

    inMemoryCategories[index] = {
      ...inMemoryCategories[index],
      ...catData,
      updatedAt: new Date().toISOString()
    };
    return inMemoryCategories[index];
  },

  toggleCategoryStatus: (id) => {
    const index = inMemoryCategories.findIndex(c => c.id === id);
    if (index === -1) return null;

    inMemoryCategories[index].active = !inMemoryCategories[index].active;
    return inMemoryCategories[index];
  },

  deleteDocumentCategory: (id) => {
    inMemoryCategories = inMemoryCategories.filter(c => c.id !== id);
    return true;
  }
};
