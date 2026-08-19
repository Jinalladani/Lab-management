import React, { useState, useEffect } from "react";
import MainLayout from "../layout/MainLayout";
import TablePagination from "../ui/TablePagination";
import { Archive, RefreshCw, Eye, FileText } from "lucide-react";
import { getObsoleteDocumentsApi } from "../../api/documentControl";

const ObsoleteDocumentsPage = () => {
  const [obsoletes, setObsoletes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchObsoletes();
  }, []);

  const fetchObsoletes = async () => {
    try {
      setLoading(true);
      const res = await getObsoleteDocumentsApi();
      if (res?.data?.success && Array.isArray(res.data.data)) {
        setObsoletes(res.data.data);
      }
    } catch (e) {
      console.error("Error fetching obsolete documents:", e);
    } finally {
      setLoading(false);
    }
  };

  const paginatedObsoletes = obsoletes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <MainLayout headerTitle="Obsolete Documents" headerSubtitle="Historical record of superceded documents">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Obsolete Documents Archive</h1>
            <p className="text-xs text-gray-500 mt-0.5">Immutable audit record of superceded and retired QMS document versions</p>
          </div>
          <button
            onClick={fetchObsoletes}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-gray-200/80 bg-white shadow-xs overflow-hidden">
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
                      <th className="py-3.5 px-4">Title</th>
                      <th className="py-3.5 px-4">Revision</th>
                      <th className="py-3.5 px-4">Obsolete Date</th>
                      <th className="py-3.5 px-4">Obsolete By</th>
                      <th className="py-3.5 px-4">Reason</th>
                      <th className="py-3.5 px-4">Replaced By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {paginatedObsoletes.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/60">
                        <td className="py-3.5 px-4 font-bold text-[#243744]">{item.document_number}</td>
                        <td className="py-3.5 px-4 font-semibold text-gray-900">{item.title}</td>
                        <td className="py-3.5 px-4 font-bold text-gray-500">{item.revision}</td>
                        <td className="py-3.5 px-4 text-gray-600">{item.obsolete_date}</td>
                        <td className="py-3.5 px-4 text-gray-700">{item.obsolete_by}</td>
                        <td className="py-3.5 px-4 text-gray-600 italic">{item.reason}</td>
                        <td className="py-3.5 px-4 text-[#243744] font-bold">{item.replaced_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <TablePagination
                totalItems={obsoletes.length}
                pageSize={pageSize}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                itemLabel="archived documents"
              />
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default ObsoleteDocumentsPage;
