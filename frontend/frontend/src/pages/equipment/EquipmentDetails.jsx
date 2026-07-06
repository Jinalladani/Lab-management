import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, Paperclip, Download, Info, CheckCircle, XCircle, Briefcase, Settings, CheckSquare } from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import { getEquipmentDetails } from "../../api";
import { Button } from "../../components/ui";

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
          <Button onClick={() => navigate("/equipment/list")}>
            Return to Registry
          </Button>
        </div>
      </MainLayout>
    );
  }

  const getDocByCategory = (categoryName) => {
    return documents.find(doc => doc.documentType === categoryName);
  };

  return (
    <MainLayout headerTitle={`Specifications: ${equipment.id}`} headerSubtitle="Traceability & Performance metrics">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">
        
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate("/equipment/list")} className="mb-4">
          Back
        </Button>

        <div className="w-full">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 sm:p-6 lg:p-8 !overflow-visible">
            
            {/* Header Section */}
            <div className="p-4 border-b border-[#F1F5F9]">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
                    {equipment.name}
                  </h1>
                  <p className="text-gray-600 mt-1 text-sm sm:text-base break-words">
                    Equipment ID: {equipment.id}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2 sm:gap-3 w-full lg:w-auto relative">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs sm:text-sm font-semibold border ${
                    equipment.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-indigo-50 text-indigo-700 border-indigo-100"
                  }`}>
                    {equipment.status}
                  </span>
                  
                  <Button
                    size="sm"
                    icon={Edit}
                    onClick={() => navigate(`/equipment/edit/${equipment.id}`)}
                  >
                    Edit Equipment
                  </Button>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column - Specifications */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Basic Information */}
                  <div>
                    <h3 className="text-sm font-bold text-[#1A2733] flex items-center gap-2 mb-4">
                      <Briefcase size={16} className="text-[#3F6E8C]" />
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Equipment ID</label>
                        <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold text-gray-800 break-words">{equipment.id}</div>
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Equipment Name</label>
                        <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold text-gray-800 break-words">{equipment.name}</div>
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</label>
                        <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold text-gray-800 break-words">{equipment.category}</div>
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Laboratory Section</label>
                        <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold text-gray-800 break-words">{equipment.laboratory}</div>
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Make / Manufacturer</label>
                        <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold text-gray-800 break-words">{equipment.manufacturer || "—"}</div>
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Model</label>
                        <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold text-gray-800 break-words">{equipment.model || "—"}</div>
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Serial Number</label>
                        <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold text-gray-800 break-words">{equipment.serialNo || "—"}</div>
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Asset Tag / Code</label>
                        <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold text-gray-800 break-words">{equipment.assetTag || "—"}</div>
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Purchase Date</label>
                        <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold text-gray-800 break-words">{equipment.purchaseDate || "—"}</div>
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Installation Date</label>
                        <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold text-gray-800 break-words">{equipment.installationDate || "—"}</div>
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Warranty Expiry Date</label>
                        <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold text-gray-800 break-words">{equipment.warrantyExpiryDate || "—"}</div>
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Location / Room</label>
                        <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold text-gray-800 break-words">{equipment.location || "—"}</div>
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Supplier / Vendor</label>
                        <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold text-gray-800 break-words">{equipment.supplier || "—"}</div>
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Invoice Number</label>
                        <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold text-gray-800 break-words">{equipment.invoiceNo || "—"}</div>
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Purchase Cost</label>
                        <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-bold text-gray-800 break-words">
                          {equipment.purchaseCost ? `₹ ${equipment.purchaseCost.toLocaleString("en-IN")}` : "—"}
                        </div>
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Responsible Engineer</label>
                        <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-bold text-[#243744] break-words">{equipment.responsiblePerson || "—"}</div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Description / Remarks</label>
                      <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold text-gray-800 break-words min-h-[80px] whitespace-pre-wrap">
                        {equipment.description || "No specifications description compiled for this instrument."}
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-[#F1F5F9]" />

                  {/* Technical Specifications */}
                  <div>
                    <h3 className="text-sm font-bold text-[#1A2733] flex items-center gap-2 mb-4">
                      <Settings size={16} className="text-[#3F6E8C]" />
                      Technical Specifications
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Measurement Range</label>
                        <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold text-gray-800 break-words">{equipment.measurementRange || "—"}</div>
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Least Count / Resolution</label>
                        <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold text-gray-800 break-words">{equipment.leastCount || "—"}</div>
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Accuracy / Class</label>
                        <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold text-gray-800 break-words">{equipment.accuracy || "—"}</div>
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Capacity / Size</label>
                        <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold text-gray-800 break-words">{equipment.capacity || "—"}</div>
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Unit</label>
                        <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold text-gray-800 break-words">{equipment.unit || "—"}</div>
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Power Requirement</label>
                        <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold text-gray-800 break-words">{equipment.powerSupply || "—"}</div>
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Software (If any)</label>
                        <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold text-gray-800 break-words">{equipment.software || "—"}</div>
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Other Specification</label>
                        <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold text-gray-800 break-words">{equipment.otherSpecification || "—"}</div>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-[#F1F5F9]" />

                  {/* Calibration & Verification */}
                  <div>
                    <h3 className="text-sm font-bold text-[#1A2733] flex items-center gap-2 mb-4">
                      <CheckSquare size={16} className="text-[#3F6E8C]" />
                      Calibration & Verification
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Calibration Frequency</label>
                        <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold text-gray-800 break-words">{equipment.frequency || "—"}</div>
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Internal Check Frequency</label>
                        <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold text-gray-800 break-words">{equipment.internalCheckFrequency || "—"}</div>
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Calibration Agency</label>
                        <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold text-gray-800 break-words">{equipment.agency || "—"}</div>
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">NABL Accredited</label>
                        <div className="px-4 py-2.5">
                          {equipment.nablAccredited ? (
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-150 items-center gap-1">
                              <CheckCircle size={11} /> Yes
                            </span>
                          ) : (
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-150 items-center gap-1">
                              <XCircle size={11} /> No
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Traceability Details</label>
                        <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold text-gray-800 break-words min-h-[60px] whitespace-pre-wrap">
                          {equipment.traceabilityDetails || "—"}
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Calibration Method / Standard</label>
                        <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold text-gray-800 break-words min-h-[60px] whitespace-pre-wrap">
                          {equipment.calibrationMethod || "—"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-[#F1F5F9]" />

                  {/* Logs & Registers History */}
                  <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm space-y-5">
                    <div className="bg-gray-50 border border-[#E2E8F0] rounded-xl px-2 py-1.5 flex gap-1 text-xs font-bold text-gray-500 max-w-[320px]">
                      <button
                        type="button"
                        onClick={() => setActiveHistoryTab("calibration")}
                        className={`flex-1 px-4 py-2 rounded-lg transition-all ${
                          activeHistoryTab === "calibration"
                            ? "bg-white text-[#243744] shadow-sm font-extrabold"
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
                            ? "bg-white text-[#243744] shadow-sm font-extrabold"
                            : "hover:bg-gray-100"
                        }`}
                      >
                        Maintenance Logs
                      </button>
                    </div>

                    {/* Calibration History Table */}
                    {activeHistoryTab === "calibration" && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-[#E2E8F0] bg-[#FAFBFD] text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                              <th className="px-4 py-3">Certificate No</th>
                              <th className="px-4 py-3">Cal Date</th>
                              <th className="px-4 py-3">Next Due</th>
                              <th className="px-4 py-3">Agency</th>
                              <th className="px-4 py-3">Performed By</th>
                              <th className="px-4 py-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F1F5F9] text-xs">
                            {calibrationHistory.map((cal) => (
                              <tr key={cal.id} className="hover:bg-[#FAF9FF] transition-colors">
                                <td className="px-4 py-3.5 font-bold text-[#243744]">{cal.certificateNo}</td>
                                <td className="px-4 py-3.5 text-gray-600">
                                  {new Date(cal.calibrationDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="px-4 py-3.5 text-gray-600 font-bold">
                                  {new Date(cal.nextDue).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="px-4 py-3.5 text-gray-600">{cal.agency}</td>
                                <td className="px-4 py-3.5 text-gray-600">{cal.performedBy}</td>
                                <td className="px-4 py-3.5">
                                  <span className={`inline-flex px-2 py-0.5 font-bold uppercase text-[9px] rounded ${
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
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-[#E2E8F0] bg-[#FAFBFD] text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                              <th className="px-4 py-3">Date</th>
                              <th className="px-4 py-3">Type</th>
                              <th className="px-4 py-3">Contractor / Engineer</th>
                              <th className="px-4 py-3">Cost (₹)</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3">Remarks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F1F5F9] text-xs">
                            {maintenanceRecords.map((m) => (
                              <tr key={m.id} className="hover:bg-[#FAF9FF] transition-colors">
                                <td className="px-4 py-3.5 text-gray-600">
                                  {new Date(m.date).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="px-4 py-3.5 font-semibold text-gray-800">{m.type}</td>
                                <td className="px-4 py-3.5 text-gray-600">{m.engineer}</td>
                                <td className="px-4 py-3.5 font-bold text-gray-800">
                                  ₹ {m.cost.toLocaleString("en-IN")}
                                </td>
                                <td className="px-4 py-3.5">
                                  <span className={`inline-flex px-2 py-0.5 font-bold uppercase text-[9px] rounded ${
                                    m.status === "Completed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                                  }`}>
                                    {m.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 text-gray-500 italic max-w-[200px] truncate">{m.remarks || "No comments"}</td>
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

                {/* Right Column - Uploads & Reminders */}
                <div className="space-y-6">
                  
                  {/* Attached Documents Box */}
                  <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm space-y-4">
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
                                  <Paperclip size={13} className="text-gray-400" />
                                  <span className="text-[10px] font-bold text-gray-700 truncate max-w-[130px]" title={doc.fileName}>
                                    {doc.fileName}
                                  </span>
                                </div>
                                <a
                                  href={`http://localhost:5000/${doc.filePath}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 hover:bg-[#243744]/10 rounded text-[#243744] transition-colors"
                                  title="Download/View file"
                                >
                                  <Download size={14} />
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

                  {/* Calibration & Check Settings Box */}
                  <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm space-y-4">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Calibration & Check Settings</h3>

                    <div className="space-y-4 text-xs">
                      <div>
                        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Next Calibration Date</span>
                        <span className="text-gray-800 font-bold text-sm block">
                          {equipment.nextDue ? new Date(equipment.nextDue).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : "—"}
                        </span>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Next Internal Check Date</span>
                        <span className="text-gray-800 font-bold text-sm block">
                          {equipment.nextInternalCheckDate ? new Date(equipment.nextInternalCheckDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : "—"}
                        </span>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Reminder Before</span>
                        <span className="text-gray-800 font-bold text-sm block">{equipment.reminderBeforeDays || "30"} Days</span>
                      </div>

                      <div className="bg-[#FAF9FF] border border-[#EDEAFF] rounded-xl p-3 flex items-start gap-2.5">
                        <Info className="text-[#243744] mt-0.5 shrink-0" size={16} />
                        <p className="text-[10px] text-[#475569] font-semibold leading-relaxed">
                          System will send reminders before the due date as per selected days.
                        </p>
                      </div>
                    </div>
                  </div>

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
