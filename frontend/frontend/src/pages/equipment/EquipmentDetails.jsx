import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "../../components/layout/MainLayout";
import { getEquipmentDetails } from "../../api";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import InfoIcon from "@mui/icons-material/Info";
import AttachmentIcon from "@mui/icons-material/Attachment";
import DownloadIcon from "@mui/icons-material/Download";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

const EquipmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [equipment, setEquipment] = useState(null);
  const [calibrationHistory, setCalibrationHistory] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [activeHistoryTab, setActiveHistoryTab] = useState("calibration");

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await getEquipmentDetails(id);
      if (res.success && res.data) {
        setEquipment(res.data);
        setCalibrationHistory(res.data.calibrationHistory || []);
        setMaintenanceRecords(res.data.maintenanceHistory || []);
        setDocuments(res.data.documents || []);
      }
    } catch (error) {
      console.error("Failed to load equipment details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <MainLayout headerTitle="Equipment Details" headerSubtitle="Loading registry details...">
        <div className="p-12 text-center bg-white rounded-3xl border border-gray-150 max-w-xl mx-auto mt-10">
          <p className="text-sm font-semibold text-gray-500">Loading equipment specifications...</p>
        </div>
      </MainLayout>
    );
  }

  if (!equipment) {
    return (
      <MainLayout headerTitle="Equipment Details" headerSubtitle="View specification metrics & records">
        <div className="p-12 text-center bg-white rounded-3xl border border-gray-150 max-w-xl mx-auto mt-10 space-y-4">
          <h3 className="text-lg font-bold text-gray-800">Equipment Not Found</h3>
          <p className="text-sm text-gray-500">The equipment ID "{id}" does not exist in the LIMS registry.</p>
          <button
            onClick={() => navigate("/equipment/list")}
            className="px-5 py-2.5 bg-[#2562AA] hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
          >
            Return to Registry
          </button>
        </div>
      </MainLayout>
    );
  }

  // Find document by category/type helper
  const getDocByCategory = (categoryName) => {
    return documents.find(doc => doc.documentType === categoryName);
  };

  return (
    <MainLayout headerTitle={`Specifications: ${equipment.id}`} headerSubtitle="Traceability & Performance metrics">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        
        {/* Navigation Headers */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{equipment.name} Details</h1>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold mt-1">
              <span>Dashboard</span>
              <span>&gt;</span>
              <span>Equipment Management</span>
              <span>&gt;</span>
              <span>Equipment List</span>
              <span>&gt;</span>
              <span className="text-[#2562AA]">{equipment.id} Details</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/equipment/list")}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-xl bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs shadow-sm transition-all"
            >
              <ArrowBackIcon sx={{ fontSize: 16 }} /> Back to Registry
            </button>
            <button
              onClick={() => navigate(`/equipment/edit/${equipment.id}`)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#2562AA] hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-[0.98]"
            >
              <EditIcon sx={{ fontSize: 16 }} /> Edit Equipment
            </button>
          </div>
        </div>

        {/* Main Grid Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Left Columns (3 span) */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Section 1: Basic Information */}
            <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm space-y-5">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="w-5 h-5 bg-[#2562AA] text-white text-[10px] rounded-full flex items-center justify-center font-bold">1</span>
                Basic Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs border-b border-gray-50 pb-5">
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Equipment ID</span>
                  <span className="text-gray-900 font-extrabold text-sm block">{equipment.id}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Equipment Name</span>
                  <span className="text-gray-800 font-bold text-sm block">{equipment.name}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Category</span>
                  <span className="text-gray-800 font-bold block">{equipment.category}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Laboratory Section</span>
                  <span className="text-gray-800 font-bold block">{equipment.laboratory}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-5 text-xs">
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Make / Manufacturer</span>
                  <span className="text-gray-800 font-semibold block">{equipment.manufacturer || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Model</span>
                  <span className="text-gray-800 font-semibold block">{equipment.model || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Serial Number</span>
                  <span className="text-gray-800 font-semibold block">{equipment.serialNo || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Asset Tag / Code</span>
                  <span className="text-gray-800 font-bold block">{equipment.assetTag || "N/A"}</span>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Purchase Date</span>
                  <span className="text-gray-800 font-semibold block">{equipment.purchaseDate || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Installation Date</span>
                  <span className="text-gray-800 font-semibold block">{equipment.installationDate || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Warranty Expiry Date</span>
                  <span className="text-gray-800 font-semibold block">{equipment.warrantyExpiryDate || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</span>
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    equipment.status === "Active" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-indigo-50 text-indigo-700"
                  }`}>
                    {equipment.status}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Supplier / Vendor</span>
                  <span className="text-gray-800 font-semibold block">{equipment.supplier || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Invoice Number</span>
                  <span className="text-gray-800 font-semibold block">{equipment.invoiceNo || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Purchase Cost (₹)</span>
                  <span className="text-gray-800 font-bold block">
                    {equipment.purchaseCost ? `₹ ${equipment.purchaseCost.toLocaleString("en-IN")}` : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Location / Room</span>
                  <span className="text-gray-800 font-semibold block">{equipment.location || "N/A"}</span>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Responsible Engineer</span>
                  <span className="text-[#2562AA] font-bold block">{equipment.responsiblePerson || "N/A"}</span>
                </div>
                <div className="md:col-span-3">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description / Remarks</span>
                  <p className="text-gray-700 leading-relaxed font-semibold bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    {equipment.description || "No specifications description compiled for this instrument."}
                  </p>
                </div>
              </div>

            </div>

            {/* Section 2: Technical Specification */}
            <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm space-y-5">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="w-5 h-5 bg-[#2562AA] text-white text-[10px] rounded-full flex items-center justify-center font-bold">2</span>
                Technical Specification
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-5 text-xs">
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Measurement Range</span>
                  <span className="text-gray-800 font-semibold block bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-100">{equipment.measurementRange || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Least Count / Resolution</span>
                  <span className="text-gray-800 font-semibold block bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-100">{equipment.leastCount || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Accuracy / Class</span>
                  <span className="text-gray-800 font-semibold block bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-100">{equipment.accuracy || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Capacity / Size</span>
                  <span className="text-gray-800 font-semibold block bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-100">{equipment.capacity || "N/A"}</span>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Unit</span>
                  <span className="text-gray-800 font-semibold block bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-100">{equipment.unit || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Power Requirement</span>
                  <span className="text-gray-800 font-semibold block bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-100">{equipment.powerSupply || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Software (If any)</span>
                  <span className="text-gray-800 font-semibold block bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-100">{equipment.software || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Other Specification</span>
                  <span className="text-gray-800 font-semibold block bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-100">{equipment.otherSpecification || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Section 3: Calibration & Verification */}
            <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm space-y-5">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="w-5 h-5 bg-[#2562AA] text-white text-[10px] rounded-full flex items-center justify-center font-bold">3</span>
                Calibration & Verification
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-5 text-xs">
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Calibration Frequency</span>
                  <span className="text-gray-800 font-semibold block bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-100">{equipment.frequency || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Internal Check Frequency</span>
                  <span className="text-gray-800 font-semibold block bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-100">{equipment.internalCheckFrequency || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Calibration Agency</span>
                  <span className="text-gray-800 font-semibold block bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-100">{equipment.agency || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">NABL Accredited</span>
                  <div className="mt-1 flex items-center gap-1">
                    {equipment.nablAccredited ? (
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-150 flex items-center gap-0.5"><CheckCircleIcon sx={{ fontSize: 12 }} /> Yes</span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-150 flex items-center gap-0.5"><CancelIcon sx={{ fontSize: 12 }} /> No</span>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Traceability Details</span>
                  <p className="text-gray-850 bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-100 font-semibold min-h-[50px] leading-relaxed">
                    {equipment.traceabilityDetails || "No traceability details configured."}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Calibration Method / Standard</span>
                  <p className="text-gray-850 bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-100 font-semibold min-h-[50px] leading-relaxed">
                    {equipment.calibrationMethod || "No specific calibration method standard set."}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 4: Log Registers Tabs (Calibration & Maintenance History) */}
            <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm space-y-4">
              <div className="bg-gray-50 border border-gray-150 rounded-xl px-2 py-1.5 flex gap-1 text-xs font-bold text-gray-500 max-w-[320px]">
                <button
                  type="button"
                  onClick={() => setActiveHistoryTab("calibration")}
                  className={`flex-1 px-4 py-2 rounded-lg transition-all ${
                    activeHistoryTab === "calibration"
                      ? "bg-white text-[#2562AA] shadow-sm font-extrabold"
                      : "hover:bg-gray-100"
                  }`}
                >
                  Calibration Records
                </button>
                <button
                  type="button"
                  onClick={() => setActiveHistoryTab("maintenance")}
                  className={`flex-1 px-4 py-2 rounded-lg transition-all ${
                    activeHistoryTab === "maintenance"
                      ? "bg-white text-[#2562AA] shadow-sm font-extrabold"
                      : "hover:bg-gray-100"
                  }`}
                >
                  Maintenance Logs
                </button>
              </div>

              {/* Calibration History Table */}
              {activeHistoryTab === "calibration" && (
                <div className="overflow-x-auto pt-2">
                  <table className="min-w-full divide-y divide-gray-100 text-xs text-left">
                    <thead>
                      <tr className="bg-gray-50 font-bold text-gray-500 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Certificate No</th>
                        <th className="py-2.5 px-3">Cal Date</th>
                        <th className="py-2.5 px-3">Next Due</th>
                        <th className="py-2.5 px-3">Agency</th>
                        <th className="py-2.5 px-3">Performed By</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {calibrationHistory.map((cal) => (
                        <tr key={cal.id} className="hover:bg-gray-50/50">
                          <td className="py-3 px-3 font-bold text-[#2562AA]">{cal.certificateNo}</td>
                          <td className="py-3 px-3 text-gray-600">
                            {new Date(cal.calibrationDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-3 px-3 text-gray-600 font-bold">
                            {new Date(cal.nextDue).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-3 px-3 text-gray-600">{cal.agency}</td>
                          <td className="py-3 px-3 text-gray-600">{cal.performedBy}</td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex px-2 py-0.25 font-bold uppercase text-[9px] rounded ${
                              cal.status === "Pass" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                            }`}>
                              {cal.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {calibrationHistory.length === 0 && (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-gray-400 font-semibold">
                            No calibration history logs in database.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Maintenance History Table */}
              {activeHistoryTab === "maintenance" && (
                <div className="overflow-x-auto pt-2">
                  <table className="min-w-full divide-y divide-gray-100 text-xs text-left">
                    <thead>
                      <tr className="bg-gray-50 font-bold text-gray-500 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Contractor / Engineer</th>
                        <th className="py-2.5 px-3">Cost (₹)</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {maintenanceRecords.map((m) => (
                        <tr key={m.id} className="hover:bg-gray-50/50">
                          <td className="py-3 px-3 text-gray-600">
                            {new Date(m.date).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-3 px-3 font-semibold text-gray-800">{m.type}</td>
                          <td className="py-3 px-3 text-gray-600">{m.engineer}</td>
                          <td className="py-3 px-3 font-bold text-gray-800">
                            ₹ {m.cost.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex px-2 py-0.25 font-bold uppercase text-[9px] rounded ${
                              m.status === "Completed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                            }`}>
                              {m.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-gray-500 italic max-w-[200px] truncate">{m.remarks || "No comments"}</td>
                        </tr>
                      ))}
                      {maintenanceRecords.length === 0 && (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-gray-400 font-semibold">
                            No maintenance logs recorded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

          </div>

          {/* Right sidebar attachments & settings (1 span) */}
          <div className="space-y-6">
            
            {/* Box A: Attached Documents */}
            <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Attached Documents</h3>

              <div className="space-y-3 text-xs">
                {[
                  "Calibration Certificate",
                  "Invoice / Purchase Bill",
                  "Equipment Manual",
                  "AMC / Service Contract",
                  "Photograph",
                  "Other Document"
                ].map((docName, index) => {
                  const doc = getDocByCategory(docName);
                  return (
                    <div key={index} className="py-2 border-b border-gray-50 last:border-0">
                      <span className="text-gray-400 font-bold block uppercase text-[9px] mb-0.5">{docName}</span>
                      {doc ? (
                        <div className="flex items-center justify-between bg-gray-50 p-2 rounded-xl border border-gray-150 mt-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <AttachmentIcon sx={{ fontSize: 13 }} className="text-gray-400" />
                            <span className="text-[10px] font-bold text-gray-700 truncate max-w-[130px]" title={doc.fileName}>
                              {doc.fileName}
                            </span>
                          </div>
                          <a
                            href={`http://localhost:5000/${doc.filePath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-[#2562AA]/10 rounded text-[#2562AA] transition-colors"
                            title="Download/View file"
                          >
                            <DownloadIcon sx={{ fontSize: 14 }} />
                          </a>
                        </div>
                      ) : (
                        <span className="text-[10px] font-semibold text-gray-400 italic block mt-0.5">No document attached</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Box B: Calibration & Check Settings */}
            <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Calibration & Check Settings</h3>

              <div className="space-y-4 text-xs">
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Next Calibration Date</span>
                  <span className="text-gray-800 font-bold text-sm block">
                    {equipment.nextDue ? new Date(equipment.nextDue).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : "N/A"}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Next Internal Check Date</span>
                  <span className="text-gray-800 font-bold text-sm block">
                    {equipment.nextInternalCheckDate ? new Date(equipment.nextInternalCheckDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : "N/A"}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Reminder Before</span>
                  <span className="text-gray-800 font-bold text-sm block">{equipment.reminderBeforeDays || "30"} Days</span>
                </div>

                <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 flex items-start gap-2.5">
                  <InfoIcon className="text-[#2562AA] mt-0.5" sx={{ fontSize: 16 }} />
                  <p className="text-[10px] text-blue-900 font-semibold leading-relaxed">
                    System will send reminder before the due date as per selected days.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </MainLayout>
  );
};

export default EquipmentDetails;
