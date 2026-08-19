import React, { useState, useEffect } from "react";
import MainLayout from "../layout/MainLayout";
import TablePagination from "../ui/TablePagination";
import {
  Clock, CheckCircle, XCircle, AlertTriangle, Eye, Check, X, RefreshCw
} from "lucide-react";
import {
  getReviewApprovalsApi,
  approveDocumentApi,
  rejectDocumentApi
} from "../../api/documentControl";

const ReviewApprovalPage = () => {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchReviewApprovals();
  }, []);

  const fetchReviewApprovals = async () => {
    try {
      setLoading(true);
      const res = await getReviewApprovalsApi();
      if (res?.data?.success && Array.isArray(res.data.data)) {
        setApprovals(res.data.data);
      }
    } catch (e) {
      console.error("Error fetching review approvals:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (doc) => {
    try {
      const docId = doc.document_id || doc.documentId || doc.id;
      const res = await approveDocumentApi(docId, { comments: "Approved in QA review" });
      if (res?.data?.success) {
        fetchReviewApprovals();
      }
    } catch (e) {
      console.error("Error approving document:", e);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionReason || !selectedDoc) return;
    try {
      const docId = selectedDoc.document_id || selectedDoc.documentId || selectedDoc.id;
      const res = await rejectDocumentApi(docId, { rejection_reason: rejectionReason });
      if (res?.data?.success) {
        setRejectModalOpen(false);
        setRejectionReason("");
        fetchReviewApprovals();
      }
    } catch (e) {
      console.error("Error rejecting document:", e);
    }
  };

  const pendingCount = approvals.filter(a => a.status === "Under Review" || a.status === "Submitted").length;
  const approvedCount = approvals.filter(a => a.status === "Active").length;
  const rejectedCount = approvals.filter(a => a.status === "Draft" || a.status === "Rejected").length;

  const paginatedApprovals = approvals.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <MainLayout headerTitle="Review & Approval" headerSubtitle="Manage document review workflows">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-amber-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-xs font-bold text-gray-600">Pending Review</span>
              <Clock size={18} />
            </div>
            <div className="text-2xl font-black text-gray-900 mt-2">{pendingCount}</div>
            <p className="text-[11px] font-medium text-gray-400 mt-0.5">Awaiting QA action</p>
          </div>

          <div className="rounded-2xl border border-emerald-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-emerald-600">
              <span className="text-xs font-bold text-gray-600">Approved</span>
              <CheckCircle size={18} />
            </div>
            <div className="text-2xl font-black text-gray-900 mt-2">{approvedCount}</div>
            <p className="text-[11px] font-medium text-gray-400 mt-0.5">Ready/Effective</p>
          </div>

          <div className="rounded-2xl border border-rose-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-rose-600">
              <span className="text-xs font-bold text-gray-600">Rejected / Returned</span>
              <XCircle size={18} />
            </div>
            <div className="text-2xl font-black text-gray-900 mt-2">{rejectedCount}</div>
            <p className="text-[11px] font-medium text-gray-400 mt-0.5">Returned to author</p>
          </div>

          <div className="rounded-2xl border border-orange-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-orange-600">
              <span className="text-xs font-bold text-gray-600">Overdue Review</span>
              <AlertTriangle size={18} />
            </div>
            <div className="text-2xl font-black text-gray-900 mt-2">1</div>
            <p className="text-[11px] font-medium text-gray-400 mt-0.5">Past target date</p>
          </div>
        </div>

        {/* Approvals Table */}
        <div className="rounded-2xl border border-gray-200/80 bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Submitted Documents List
            </h3>
          </div>

          {loading ? (
            <div className="p-8 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase">
                    <tr>
                      <th className="py-3.5 px-4">Doc No.</th>
                      <th className="py-3.5 px-4">Document Title</th>
                      <th className="py-3.5 px-4">Revision</th>
                      <th className="py-3.5 px-4">Submitted By</th>
                      <th className="py-3.5 px-4">Submitted Date</th>
                      <th className="py-3.5 px-4">Reviewer</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {paginatedApprovals.map((doc) => (
                      <tr key={doc.document_id} className="hover:bg-gray-50/60">
                        <td className="py-3.5 px-4 font-bold text-[#243744]">{doc.document_number}</td>
                        <td className="py-3.5 px-4 font-semibold text-gray-900 max-w-xs truncate">{doc.title}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-700">{doc.revision}</td>
                        <td className="py-3.5 px-4 text-gray-600">{doc.submitted_by}</td>
                        <td className="py-3.5 px-4 text-gray-500">{doc.submitted_date}</td>
                        <td className="py-3.5 px-4 text-gray-700 font-semibold">{doc.reviewer}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${doc.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : doc.status === "Under Review"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}>
                            {doc.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApprove(doc)}
                              className="flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 shadow-xs"
                            >
                              <Check size={12} /> Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedDoc(doc);
                                setRejectModalOpen(true);
                              }}
                              className="flex items-center gap-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 text-[11px] font-bold hover:bg-rose-100"
                            >
                              <X size={12} /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <TablePagination
                totalItems={approvals.length}
                pageSize={pageSize}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                itemLabel="reviews"
              />
            </>
          )}
        </div>

        {/* Reject Reason Modal */}
        {rejectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 mb-1">Reject Document</h3>
              <p className="text-xs text-gray-500 mb-3">{selectedDoc?.document_number} - {selectedDoc?.title}</p>

              <form onSubmit={handleRejectSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Rejection Reason *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Specify exact corrections or updates required..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 p-2.5 focus:border-[#243744] focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRejectModalOpen(false)}
                    className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white hover:bg-rose-700 shadow-xs"
                  >
                    Submit Rejection
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ReviewApprovalPage;
