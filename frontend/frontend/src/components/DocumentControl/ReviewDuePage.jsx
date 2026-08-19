import React, { useState, useEffect } from "react";
import MainLayout from "../layout/MainLayout";
import TablePagination from "../ui/TablePagination";
import { Calendar, AlertTriangle, Clock, RefreshCw, PlusCircle } from "lucide-react";
import { getReviewDueDocumentsApi } from "../../api/documentControl";

const ReviewDuePage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState("All");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchReviewDue();
  }, []);

  const fetchReviewDue = async () => {
    try {
      setLoading(true);
      const res = await getReviewDueDocumentsApi();
      if (res?.data?.success && Array.isArray(res.data.data)) {
        setItems(res.data.data);
      }
    } catch (e) {
      console.error("Error fetching review due documents:", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (filterTab === "Overdue") return item.status === "Overdue";
    if (filterTab === "Due Today") return item.status === "Due Today";
    if (filterTab === "7 Days") return item.status === "Due within 7 Days";
    if (filterTab === "30 Days") return item.status === "Due within 30 Days";
    return true;
  });

  const paginatedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <MainLayout headerTitle="Review Due Management" headerSubtitle="Track periodic quality document reviews">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Review Due Management</h1>
            <p className="text-xs text-gray-500 mt-0.5">Ensure all controlled documents undergo timely annual/periodic reviews</p>
          </div>
          <button
            onClick={fetchReviewDue}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
          {["All", "Overdue", "Due Today", "7 Days", "30 Days"].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setFilterTab(tab);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                filterTab === tab
                  ? "bg-[#243744] text-white shadow-xs"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {tab}
            </button>
          ))}
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
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Revision</th>
                      <th className="py-3.5 px-4">Owner</th>
                      <th className="py-3.5 px-4">Review Date</th>
                      <th className="py-3.5 px-4">Days Remaining</th>
                      <th className="py-3.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {paginatedItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/60">
                        <td className="py-3.5 px-4 font-bold text-[#243744]">{item.document_number}</td>
                        <td className="py-3.5 px-4 font-semibold text-gray-900">{item.title}</td>
                        <td className="py-3.5 px-4 text-gray-600">{item.category}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-700">{item.revision}</td>
                        <td className="py-3.5 px-4 text-gray-700">{item.owner}</td>
                        <td className="py-3.5 px-4 text-gray-600 font-semibold">{item.review_date}</td>
                        <td className="py-3.5 px-4 font-bold text-gray-800">
                          {item.days_remaining < 0 ? (
                            <span className="text-rose-600">{Math.abs(item.days_remaining)} days ago</span>
                          ) : (
                            <span>{item.days_remaining} days</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            item.status === "Overdue"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : item.status === "Due Today"
                              ? "bg-orange-50 text-orange-700 border-orange-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <TablePagination
                totalItems={filteredItems.length}
                pageSize={pageSize}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                itemLabel="records"
              />
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default ReviewDuePage;
