import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Edit, Download, Printer, CheckCircle, XCircle, 
  FileText, Shield, FileSpreadsheet, History, Info, Trash2, Calendar
} from "lucide-react";
import { getReportById, approveReport, rejectReport, createRevision } from "../../api/reports";
import { MainLayout } from "../../components/layout";
import { Button } from "../../components/ui";
import { motion, AnimatePresence } from "framer-motion";

const ReportView = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState("");
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState(""); // "approve" or "reject"
  const [changeLog, setChangeLog] = useState("");
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [activeSheetTab, setActiveSheetTab] = useState("");

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await getReportById(reportId);
      if (res.success && res.data) {
        setReport(res.data);
        if (res.data.test_results && res.data.test_results.length > 0) {
          setActiveSheetTab(res.data.test_results[0].test_name);
        }
      }
    } catch (error) {
      console.error("Error fetching report details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportId]);

  const handlePrint = () => {
    window.print();
  };

  const handleWorkflowAction = async () => {
    try {
      if (approvalAction === "approve") {
        await approveReport(reportId, remarks || "Approved");
      } else {
        await rejectReport(reportId, remarks || "Rejected");
      }
      setShowApprovalDialog(false);
      setRemarks("");
      fetchReport();
    } catch (err) {
      alert("Failed to update report workflow: " + err.message);
    }
  };

  const handleRevisionAction = async () => {
    if (!changeLog.trim()) {
      alert("Please provide a reason for this revision.");
      return;
    }
    try {
      await createRevision(reportId, changeLog);
      setShowRevisionDialog(false);
      setChangeLog("");
      fetchReport();
    } catch (err) {
      alert("Failed to create report revision: " + err.message);
    }
  };

  if (loading) {
    return (
      <MainLayout headerTitle="Loading Report..." headerSubtitle="Retrieving specifications...">
        <div className="p-12 text-center bg-white rounded-3xl border border-gray-150 max-w-xl mx-auto mt-10">
          <p className="text-sm font-semibold text-gray-500">Loading certified values matrix...</p>
        </div>
      </MainLayout>
    );
  }

  if (!report) {
    return (
      <MainLayout headerTitle="Report Details" headerSubtitle="SmartLab Verification">
        <div className="p-12 text-center bg-white rounded-3xl border border-gray-150 max-w-xl mx-auto mt-10 space-y-4">
          <h3 className="text-lg font-bold text-gray-800">Report Not Found</h3>
          <Button onClick={() => navigate("/reports")}>
            Return to Registry
          </Button>
        </div>
      </MainLayout>
    );
  }

  // Helper: Find sheet layout column counts
  const renderObservationSheet = (sheetData) => {
    let maxRow = 1;
    let maxCol = 1;
    const cellKeys = Object.keys(sheetData || {});
    
    cellKeys.forEach(key => {
      const match = key.match(/^([A-Z]+)([0-9]+)$/);
      if (match) {
        const colStr = match[1];
        const rowNum = parseInt(match[2]);
        let colNum = 0;
        for (let i = 0; i < colStr.length; i++) {
          colNum = colNum * 26 + (colStr.charCodeAt(i) - 64);
        }
        if (rowNum > maxRow) maxRow = rowNum;
        if (colNum > maxCol) maxCol = colNum;
      }
    });

    maxRow = Math.max(maxRow, 8);
    maxCol = Math.max(maxCol, 6);

    const rows = Array.from({ length: maxRow }, (_, r) => r + 1);
    const cols = Array.from({ length: maxCol }, (_, c) => String.fromCharCode(65 + c));

    return (
      <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl bg-white shadow-inner max-w-full">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-[#E2E8F0]">
              <th className="w-8 border-r border-[#E2E8F0] bg-gray-100 text-center text-[10px] text-gray-400 font-bold p-1"></th>
              {cols.map(col => (
                <th key={col} className="border-r border-[#E2E8F0] text-center text-[11px] font-bold text-gray-500 p-2 min-w-[90px]">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row} className="border-b border-[#F1F5F9] last:border-b-0">
                <td className="bg-gray-100 text-center text-[10px] text-gray-400 font-bold border-r border-[#E2E8F0] p-1 select-none">{row}</td>
                {cols.map(col => {
                  const label = `${col}${row}`;
                  const cell = sheetData?.[label] || {};
                  return (
                    <td key={col} className="border-r border-[#F1F5F9] last:border-r-0 p-2 text-xs font-semibold text-gray-800 text-center min-w-[90px] bg-white">
                      {cell.value ?? ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <MainLayout headerTitle={`Certified Report: ${report.report_number}`} headerSubtitle="NABL verification logs & history">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">

        {/* Action Header bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 print:hidden">
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate("/reports")}>
            Back to List
          </Button>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" icon={Printer} onClick={handlePrint}>
              Print / Save PDF
            </Button>

            {report.status !== "Locked" && report.status !== "Approved" && (
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => { setApprovalAction("approve"); setShowApprovalDialog(true); }}
                  className="!bg-emerald-600 hover:!bg-emerald-700 !text-white"
                >
                  Verify / Approve
                </Button>
                <Button 
                  onClick={() => { setApprovalAction("reject"); setShowApprovalDialog(true); }}
                  variant="danger"
                >
                  Reject / Revert
                </Button>
              </div>
            )}

            {report.status === "Approved" && (
              <Button onClick={() => setShowRevisionDialog(true)}>
                Create Revision Draft
              </Button>
            )}
          </div>
        </div>

        {/* Interactive Verification Banner */}
        {report.status === "Approved" && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 print:hidden">
            <Shield className="text-emerald-600 shrink-0" size={20} />
            <div>
              <p className="text-xs font-bold text-emerald-800">QR CODE DIGITAL HASH GENERATED & SECURED</p>
              <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Verification Signature Hash: {report.qr_hash}</p>
            </div>
          </div>
        )}

        {/* MAIN PRINT CANVAS WRAPPER */}
        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-6 sm:p-10 lg:p-12 print:border-0 print:shadow-none print:p-0">
          
          {/* NABL standard certificate header */}
          <div className="border-b-2 border-gray-800 pb-6 mb-8">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h1 className="text-2xl font-black text-emerald-800 uppercase tracking-tight">SMARTLAB CO.</h1>
                <p className="text-xs font-bold text-gray-500 uppercase">Geotechnical & Civil Quality Testing Lab</p>
                <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">
                  Building B-404, Main Sector Circle, Industrial Area, State-360005<br />
                  Contact: +91 98765 43210 | Email: reports@smartlab.com
                </p>
              </div>
              <div className="text-right">
                <div className="inline-block border border-gray-400 px-3 py-1 text-center bg-gray-50 rounded">
                  <span className="text-[8px] font-black text-gray-400 uppercase block tracking-widest">NABL ACCREDITED</span>
                  <span className="text-xs font-extrabold text-gray-700">T-4091</span>
                </div>
                {report.status === "Approved" && (
                  <div className="mt-3 flex flex-col items-end">
                    {/* Mock QR box */}
                    <div className="w-16 h-16 bg-gray-100 border border-gray-200 flex items-center justify-center text-[7px] text-gray-400 font-mono text-center">
                      QR CODE<br />{report.report_number.substring(0, 8)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Metadata Specs grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-xs border-b border-[#F1F5F9] pb-6">
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-800 uppercase border-b border-gray-100 pb-1">Report Parameters</h3>
              <div className="grid grid-cols-2 gap-2 font-semibold">
                <span className="text-gray-400 uppercase text-[10px]">Report Number:</span>
                <span className="text-gray-900 font-bold">{report.report_number}</span>
                
                <span className="text-gray-400 uppercase text-[10px]">Client Name:</span>
                <span className="text-gray-800">{report.client_name || "—"}</span>

                <span className="text-gray-400 uppercase text-[10px]">Project Name:</span>
                <span className="text-gray-800">{report.project_name || "—"}</span>
                
                <span className="text-gray-400 uppercase text-[10px]">Project Code:</span>
                <span className="text-gray-800">{report.project_code || "—"}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-800 uppercase border-b border-gray-100 pb-1">Sample Details</h3>
              <div className="grid grid-cols-2 gap-2 font-semibold">
                <span className="text-gray-400 uppercase text-[10px]">Sample ID:</span>
                <span className="text-gray-900 font-bold">{report.sample_no || "—"}</span>

                <span className="text-gray-400 uppercase text-[10px]">Description:</span>
                <span className="text-gray-800 truncate" title={report.sample_desc}>{report.sample_desc || "—"}</span>

                <span className="text-gray-400 uppercase text-[10px]">Received Date:</span>
                <span className="text-gray-800">
                  {report.sample_received_date ? new Date(report.sample_received_date).toLocaleDateString("en-IN") : "—"}
                </span>

                <span className="text-gray-400 uppercase text-[10px]">Testing Standards:</span>
                <span className="text-gray-800">{report.test_method || "NABL IS Quality Standards"}</span>
              </div>
            </div>
          </div>

          {/* Test Tabs navigation (For multiple tests inside report) */}
          {report.test_results && report.test_results.length > 1 && (
            <div className="flex gap-1.5 border-b border-[#F1F5F9] pb-4 mb-6 print:hidden">
              {report.test_results.map((tr) => (
                <button
                  key={tr.report_test_result_id}
                  onClick={() => setActiveSheetTab(tr.test_name)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                    activeSheetTab === tr.test_name
                      ? "bg-[#243744] text-white border-[#243744]"
                      : "bg-white text-gray-600 border-[#E2E8F0] hover:bg-gray-50"
                  }`}
                >
                  {tr.test_name}
                </button>
              ))}
            </div>
          )}

          {/* Render Active Observation Tables */}
          {report.test_results && report.test_results.length > 0 ? (
            report.test_results
              .filter(tr => report.test_results.length === 1 || tr.test_name === activeSheetTab)
              .map((tr) => (
                <div key={tr.report_test_result_id} className="space-y-4 page-break-inside">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                      <FileSpreadsheet size={15} className="text-[#3F6E8C]" />
                      Observation Sheet: {tr.test_name}
                    </h3>
                  </div>

                  {/* Render dynamic sheet */}
                  {tr.raw_observation_data && Object.keys(tr.raw_observation_data).length > 0 ? (
                    renderObservationSheet(tr.raw_observation_data.sheet1 || tr.raw_observation_data)
                  ) : (
                    <p className="text-xs text-gray-400 italic">No observation cell records found.</p>
                  )}
                </div>
              ))
          ) : (
            <p className="text-xs text-gray-400 italic text-center py-6">No test results linked to this report.</p>
          )}

          {/* Signature Sections */}
          <div className="mt-12 pt-8 border-t border-[#F1F5F9]">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-6">Report Signatures & Approvals</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-center text-xs">
              <div className="border border-dashed border-gray-200 rounded-2xl p-4 bg-gray-50/50 flex flex-col items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Prepared By</span>
                <span className="text-gray-800 font-bold text-sm">{report.prepared_by_name || "—"}</span>
                <span className="text-[9px] text-gray-400 font-semibold mt-0.5">Lab Assistant</span>
              </div>
              <div className="border border-dashed border-gray-200 rounded-2xl p-4 bg-gray-50/50 flex flex-col items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Verified By</span>
                <span className="text-gray-800 font-bold text-sm">{report.reviewed_by_name || "—"}</span>
                <span className="text-[9px] text-gray-400 font-semibold mt-0.5">Quality Manager</span>
              </div>
              <div className="border border-dashed border-gray-200 rounded-2xl p-4 bg-gray-50/50 flex flex-col items-center col-span-2 md:col-span-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Approved By</span>
                <span className="text-emerald-700 font-bold text-sm flex items-center gap-1">
                  {report.status === "Approved" ? <CheckCircle size={13} className="text-emerald-500" /> : null}
                  {report.approved_by_name || "—"}
                </span>
                <span className="text-[9px] text-gray-400 font-semibold mt-0.5">Lab Director / Admin</span>
              </div>
            </div>
          </div>

          {/* Audit History Log */}
          {report.approvals && report.approvals.length > 0 && (
            <div className="mt-8 pt-8 border-t border-[#F1F5F9] print:hidden">
              <h3 className="text-xs font-bold text-gray-800 uppercase flex items-center gap-1.5 mb-4">
                <History size={14} />
                Approval History & Comments
              </h3>
              <div className="space-y-3">
                {report.approvals.map((app) => (
                  <div key={app.approval_id} className="p-3 bg-gray-50 border border-[#E2E8F0] rounded-xl flex justify-between items-start gap-4">
                    <div className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{app.user_name}</span>
                        <span className="text-[10px] font-black uppercase text-gray-400">({app.role})</span>
                      </div>
                      <p className="text-gray-600 mt-1">{app.remarks}</p>
                    </div>
                    <div className="text-[9px] text-gray-400 font-bold flex flex-col items-end">
                      <span>{app.status}</span>
                      <span className="mt-0.5 font-semibold">{new Date(app.created_at).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* WORKFLOW APPROVAL DIALOG MODAL */}
        <AnimatePresence>
          {showApprovalDialog && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl p-6 w-full max-w-md space-y-4"
              >
                <div>
                  <h3 className="text-lg font-bold text-gray-900 capitalize">
                    Confirm Report {approvalAction}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Provide optional comments or audit remarks below.
                  </p>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Remarks</label>
                  <textarea
                    rows={3}
                    placeholder="Enter approval/rejection reasons..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 outline-none text-sm font-semibold focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button variant="secondary" onClick={() => setShowApprovalDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleWorkflowAction}
                    className={approvalAction === "approve" ? "!bg-emerald-600 hover:!bg-emerald-700 !text-white" : "!bg-rose-600 hover:!bg-rose-700 !text-white"}
                  >
                    Confirm {approvalAction === "approve" ? "Approval" : "Rejection"}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* REVISION DRAFT DIALOG MODAL */}
        <AnimatePresence>
          {showRevisionDialog && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl p-6 w-full max-w-md space-y-4"
              >
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Create Revision Draft
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    This will revert the approved report back to 'Draft' and log a new version.
                  </p>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Revision Change Log *</label>
                  <textarea
                    rows={3}
                    placeholder="Specify details or reasons for revision..."
                    value={changeLog}
                    onChange={(e) => setChangeLog(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 outline-none text-sm font-semibold focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button variant="secondary" onClick={() => setShowRevisionDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleRevisionAction}>
                    Create Revision
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </MainLayout>
  );
};

export default ReportView;
