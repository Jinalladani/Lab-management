import React, { useState, useEffect } from "react";
import MainLayout from "../layout/MainLayout";
import TablePagination from "../ui/TablePagination";
import { History, RefreshCw, ShieldAlert, Filter } from "lucide-react";
import { getAuditTrailApi } from "../../api/documentControl";

const AuditTrailPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchAuditTrail();
  }, []);

  const fetchAuditTrail = async () => {
    try {
      setLoading(true);
      const res = await getAuditTrailApi();
      if (res?.data?.success && Array.isArray(res.data.data)) {
        setLogs(res.data.data);
      }
    } catch (e) {
      console.error("Error fetching audit trail:", e);
    } finally {
      setLoading(false);
    }
  };

  const paginatedLogs = logs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <MainLayout headerTitle="Audit Trail" headerSubtitle="Complete immutable event trail for QMS compliance">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Audit Log Table */}
        <div className="rounded-2xl border border-gray-200/80 bg-white shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-8 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase">
                    <tr>
                      <th className="py-3.5 px-4">Date & Time</th>
                      <th className="py-3.5 px-4">User</th>
                      <th className="py-3.5 px-4">Action</th>
                      <th className="py-3.5 px-4">Document</th>
                      <th className="py-3.5 px-4">Revision</th>
                      <th className="py-3.5 px-4">Description</th>
                      <th className="py-3.5 px-4">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {paginatedLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/60">
                        <td className="py-3.5 px-4 font-semibold text-gray-500 whitespace-nowrap">{log.created_at}</td>
                        <td className="py-3.5 px-4 font-bold text-gray-900">{log.user_name}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-gray-100 text-gray-800 border border-gray-200">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#243744]">{log.document_number}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-700">{log.revision}</td>
                        <td className="py-3.5 px-4 text-gray-700">{log.description}</td>
                        <td className="py-3.5 px-4 text-gray-400 font-mono text-[11px]">{log.ip_address}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <TablePagination
                totalItems={logs.length}
                pageSize={pageSize}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                itemLabel="audit logs"
              />
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default AuditTrailPage;
