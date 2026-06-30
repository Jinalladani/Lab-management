import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getReportById } from "../../api/reports";
import { MainLayout } from "../../components/layout";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import DownloadIcon from "@mui/icons-material/Download";
import PrintIcon from "@mui/icons-material/Print";

const ReportView = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [sampleEntry, setSampleEntry] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await getReportById(reportId);
      const reportData = response?.data?.data;
      setReport(reportData);
      // Set sample entry info from report data
      setSampleEntry({
        sample_id: reportData?.sample_code,
        sample_entry_id: reportData?.sample_entry_id,
        category_name: reportData?.category_name,
        type_name: reportData?.type_name
      });
    } catch (error) {
      console.error("Error fetching report:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reportId) {
      fetchReport();
    }
  }, [reportId]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pending" },
      in_progress: { bg: "bg-blue-100", text: "text-blue-800", label: "In Progress" },
      completed: { bg: "bg-green-100", text: "text-green-800", label: "Completed" },
      cancelled: { bg: "bg-red-100", text: "text-red-800", label: "Cancelled" }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`${config.bg} ${config.text} px-2 py-1 rounded-full text-xs font-medium`}>
        {config.label}
      </span>
    );
  };

  const handleDownload = () => {
    if (report?.report_file) {
      // TODO: Implement download functionality
      console.log("Download report:", report.report_file);
      alert("Download started!");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEdit = () => {
    navigate(`/reports/edit/${reportId}`);
  };

  const handleBack = () => {
    navigate("/reports");
  };

  if (loading) {
    return (
      <MainLayout headerTitle="Loading Report...">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading report details...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!report) {
    return (
      <MainLayout headerTitle="Report Not Found">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-600 text-lg">Report not found</p>
            <button
              onClick={handleBack}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Reports
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      headerTitle={`Test Report - ${report.test_name}`}
      headerSubtitle={`Sample: ${sampleEntry?.sample_code || "N/A"}`}
    >
      <div className="p-4 sm:p-6">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="mb-4 flex items-center gap-2 text-blue-600 font-medium hover:text-blue-800 transition-colors"
        >
          <ArrowBackIcon className="h-4 w-4" />
          Back to Reports
        </button>

        <div className="w-full space-y-6">
          {/* Sample Entry Info */}
          {sampleEntry && (
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
              <div className="bg-blue-50 p-4 border-b">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">Sample Entry Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-blue-700">Sample Code:</span>
                    <span className="text-blue-900 ml-2">{sampleEntry.sample_code}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Project:</span>
                    <span className="text-blue-900 ml-2">{sampleEntry.project_name}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Material:</span>
                    <span className="text-blue-900 ml-2">{sampleEntry.material_category} - {sampleEntry.material_type}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Quantity:</span>
                    <span className="text-blue-900 ml-2">{sampleEntry.quantity}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Receiver:</span>
                    <span className="text-blue-900 ml-2">{sampleEntry.receiver_name}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Received Date:</span>
                    <span className="text-blue-900 ml-2">{sampleEntry.received_date}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Report Details */}
          <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Test Report Details</h2>
                <div className="flex gap-2">
                  {getStatusBadge(report.status)}
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <EditIcon className="h-4 w-4" />
                    Edit
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Test Information</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Test Name:</span>
                      <p className="text-gray-900">{report.test_name}</p>
                    </div>
                    <div>
                      <span className="font-medium">Test Method:</span>
                      <p className="text-gray-900">{report.test_method}</p>
                    </div>
                    <div>
                      <span className="font-medium">Test Standard:</span>
                      <p className="text-gray-900">{report.test_standard}</p>
                    </div>
                    <div>
                      <span className="font-medium">Test Values:</span>
                      <p className="text-gray-900 whitespace-pre-wrap">{report.test_values}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Status & Timeline</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Current Status:</span>
                      <div className="mt-1">{getStatusBadge(report.status)}</div>
                    </div>
                    <div>
                      <span className="font-medium">Created:</span>
                      <p className="text-gray-900">{formatDate(report.created_at)}</p>
                    </div>
                    <div>
                      <span className="font-medium">Last Updated:</span>
                      <p className="text-gray-900">{formatDate(report.updated_at)}</p>
                    </div>
                    <div>
                      <span className="font-medium">Created By:</span>
                      <p className="text-gray-900">{report.created_by}</p>
                    </div>
                    <div>
                      <span className="font-medium">Updated By:</span>
                      <p className="text-gray-900">{report.updated_by}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Test Results */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Test Results</h4>
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                    {report.test_results}
                  </p>
                </div>
              </div>

              {/* Scope Test Results */}
              {report.scope_results && report.scope_results.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-4">Scope Test Results</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="space-y-3">
                      {report.scope_results.map((scopeResult, index) => (
                        <div key={scopeResult.report_scope_result_id} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <span className="font-medium text-gray-700">Test Name:</span>
                              <p className="text-gray-900">{scopeResult.test_name}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Test Method:</span>
                              <p className="text-gray-900">{scopeResult.test_method || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Group:</span>
                              <p className="text-gray-900">{scopeResult.group_name}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Material:</span>
                              <p className="text-gray-900">{scopeResult.material_name}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Result Value:</span>
                              <p className="text-gray-900 font-semibold">{scopeResult.result_value}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Unit:</span>
                              <p className="text-gray-900">{scopeResult.unit || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Remarks:</span>
                              <p className="text-gray-900">{scopeResult.remark || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 text-sm text-blue-700">
                      <span className="font-medium">{report.scope_results.length}</span> scope test results recorded
                    </div>
                  </div>
                </div>
              )}

              {/* Remarks */}
              {report.remarks && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Remarks</h4>
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <p className="text-gray-900">{report.remarks}</p>
                  </div>
                </div>
              )}

              {/* Report File */}
              {report.report_file && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Report File</h4>
                  <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex-1">
                      <p className="font-medium text-green-800">{report.report_file}</p>
                      <p className="text-sm text-green-600">PDF Document</p>
                    </div>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <DownloadIcon className="h-4 w-4" />
                      Download Report
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <PrintIcon className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ReportView;
