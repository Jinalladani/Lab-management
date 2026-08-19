import React, { useState, useEffect } from "react";
import MainLayout from "../layout/MainLayout";
import TablePagination from "../ui/TablePagination";
import { Users, Clock, CheckCircle2, AlertTriangle, Share2, Check, RefreshCw, Eye } from "lucide-react";
import {
  getStaffAcknowledgementsApi,
  acknowledgeDocumentApi
} from "../../api/documentControl";

const StaffAcknowledgementPage = () => {
  const [acks, setAcks] = useState([]);
  const [stats, setStats] = useState({ total_required: 0, pending: 0, completed: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [signOffModalOpen, setSignOffModalOpen] = useState(false);
  const [selectedAck, setSelectedAck] = useState(null);
  const [agreed, setAgreed] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchAcknowledgements();
  }, []);

  const fetchAcknowledgements = async () => {
    try {
      setLoading(true);
      const res = await getStaffAcknowledgementsApi();
      if (res?.data?.success && Array.isArray(res.data.data)) {
        setAcks(res.data.data);
        setStats(res.data.stats || {});
      }
    } catch (e) {
      console.error("Error fetching acknowledgements:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!agreed || !selectedAck) return;
    try {
      const res = await acknowledgeDocumentApi(selectedAck.id);
      if (res?.data?.success) {
        setSignOffModalOpen(false);
        setAgreed(false);
        fetchAcknowledgements();
      }
    } catch (e) {
      console.error("Error acknowledging document:", e);
    }
  };

  const paginatedAcks = acks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <MainLayout headerTitle="Staff Acknowledgement" headerSubtitle="Traceable QMS document read & understood sign-offs">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-600">
              <span className="text-xs font-bold text-gray-600">Total Required</span>
              <Users size={18} />
            </div>
            <div className="text-2xl font-black text-gray-900 mt-2">{stats.total_required || 0}</div>
            <p className="text-[11px] font-medium text-gray-400 mt-0.5">All assignments</p>
          </div>

          <div className="rounded-2xl border border-amber-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-xs font-bold text-gray-600">Pending</span>
              <Clock size={18} />
            </div>
            <div className="text-2xl font-black text-gray-900 mt-2">{stats.pending || 0}</div>
            <p className="text-[11px] font-medium text-gray-400 mt-0.5">Awaiting sign-off</p>
          </div>

          <div className="rounded-2xl border border-emerald-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-emerald-600">
              <span className="text-xs font-bold text-gray-600">Completed</span>
              <CheckCircle2 size={18} />
            </div>
            <div className="text-2xl font-black text-gray-900 mt-2">{stats.completed || 0}</div>
            <p className="text-[11px] font-medium text-gray-400 mt-0.5">Signed off</p>
          </div>

          <div className="rounded-2xl border border-rose-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-rose-600">
              <span className="text-xs font-bold text-gray-600">Overdue</span>
              <AlertTriangle size={18} />
            </div>
            <div className="text-2xl font-black text-gray-900 mt-2">{stats.overdue || 0}</div>
            <p className="text-[11px] font-medium text-gray-400 mt-0.5">Pending &gt; 7 days</p>
          </div>
        </div>

        {/* Acknowledgement Table */}
        <div className="rounded-2xl border border-gray-200/80 bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Staff Document Sign-off Status
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
                      <th className="py-3.5 px-4">Document</th>
                      <th className="py-3.5 px-4">Revision</th>
                      <th className="py-3.5 px-4">Staff Member</th>
                      <th className="py-3.5 px-4">Department</th>
                      <th className="py-3.5 px-4">Assigned Date</th>
                      <th className="py-3.5 px-4">Acknowledged Date</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {paginatedAcks.map((ack) => (
                      <tr key={ack.id} className="hover:bg-gray-50/60">
                        <td className="py-3.5 px-4 font-bold text-[#243744]">
                          {ack.document_number} - {ack.title}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-700">{ack.revision}</td>
                        <td className="py-3.5 px-4 font-semibold text-gray-900">{ack.staff_member}</td>
                        <td className="py-3.5 px-4 text-gray-600">{ack.department}</td>
                        <td className="py-3.5 px-4 text-gray-500">{ack.assigned_date}</td>
                        <td className="py-3.5 px-4 text-gray-500">{ack.acknowledged_date}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${ack.status === "Acknowledged"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : ack.status === "Overdue"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}>
                            {ack.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {ack.status !== "Acknowledged" ? (
                            <button
                              onClick={() => {
                                setSelectedAck(ack);
                                setSignOffModalOpen(true);
                              }}
                              className="flex items-center gap-1 rounded-xl bg-[#243744] px-3 py-1 text-[11px] font-bold text-white hover:bg-[#1A2733] shadow-xs ml-auto"
                            >
                              <Check size={12} /> Sign-off Document
                            </button>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald-600 flex items-center justify-end gap-1">
                              <CheckCircle2 size={12} /> Complete
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <TablePagination
                totalItems={acks.length}
                pageSize={pageSize}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                itemLabel="sign-offs"
              />
            </>
          )}
        </div>

        {/* Sign-off Modal */}
        {signOffModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 mb-1">Acknowledge Controlled Document</h3>
              <p className="text-xs text-gray-500 mb-3">{selectedAck?.document_number} ({selectedAck?.revision}) - {selectedAck?.title}</p>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-700 space-y-2 mb-4">
                <p className="font-semibold text-gray-900">Legal & QMS Compliance Declaration:</p>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  By clicking acknowledge, you confirm that you have thoroughly read, understood, and agreed to adhere to the technical instructions and procedures laid out in this document revision.
                </p>
              </div>

              <div className="flex items-start gap-2 text-xs mb-4">
                <input
                  type="checkbox"
                  id="declaration_check"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-[#243744] focus:ring-[#243744]"
                />
                <label htmlFor="declaration_check" className="font-semibold text-gray-800 cursor-pointer">
                  I have read and understood this document revision.
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setSignOffModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 text-xs hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!agreed}
                  onClick={handleAcknowledge}
                  className="rounded-xl bg-[#243744] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1A2733] shadow-xs disabled:opacity-40"
                >
                  Acknowledge Document
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default StaffAcknowledgementPage;
