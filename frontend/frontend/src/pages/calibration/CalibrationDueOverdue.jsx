import React, { useState, useEffect } from "react";
import MainLayout from "../../components/layout/MainLayout";
import { mockEquipmentDb } from "../../utils/mockEquipmentData";
import { getEquipmentList } from "../../api";
import {
  Search,
  MailOutline,
  WhatsApp,
  Download,
  Close,
  Warning,
  Send,
  Timer
} from "@mui/icons-material";

const CalibrationDueOverdue = () => {
  const [equipments, setEquipments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilterTab, setActiveFilterTab] = useState("all");

  // Notifications modal states
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [activeEq, setActiveEq] = useState(null);
  const [notificationTemplate, setNotificationTemplate] = useState({
    to: "",
    subject: "",
    body: ""
  });

  const fetchDueEquipment = async () => {
    try {
      const res = await getEquipmentList();
      if (res.success && res.data?.equipment) {
        const data = res.data.equipment.filter(eq => eq.calibrationStatus !== "Valid" && eq.calibrationStatus !== "Not Required");
        setEquipments(data);
      } else {
        throw new Error("Failed response");
      }
    } catch (err) {
      console.warn("Using fallback local data for Due/Overdue registry:", err.message);
      const data = mockEquipmentDb.getEquipment().filter(eq => eq.calibrationStatus !== "Valid" && eq.calibrationStatus !== "Not Required");
      setEquipments(data);
    }
  };

  useEffect(() => {
    fetchDueEquipment();
  }, []);

  const getRemainingDays = (nextDueStr) => {
    const today = new Date();
    const nextDue = new Date(nextDueStr);
    const diffTime = nextDue - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleOpenEmail = (eq) => {
    setActiveEq(eq);
    const daysLeft = getRemainingDays(eq.nextDue);
    const isOverdue = daysLeft < 0;
    
    setNotificationTemplate({
      to: eq.responsiblePerson === "Mr. Rahul Patel" ? "rahul.patel@limslabs.com" : eq.responsiblePerson === "Mrs. Sneha Shah" ? "sneha.shah@limslabs.com" : "amit.sharma@limslabs.com",
      subject: `[ALERT] Calibration ${isOverdue ? "OVERDUE" : "DUE SOON"} - ${eq.id} (${eq.name})`,
      body: `Hi ${eq.responsiblePerson},\n\nThis is an automated compliance alert from Goma Lab LIMS.\n\nOur records indicate that the calibration for the following equipment is ${isOverdue ? `OVERDUE by ${Math.abs(daysLeft)} days` : `due in ${daysLeft} days`}.\n\nEquipment ID: ${eq.id}\nEquipment Name: ${eq.name}\nLaboratory: ${eq.laboratory}\nLocation: ${eq.location}\nNext Due Date: ${new Date(eq.nextDue).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}\n\n${isOverdue ? "CRITICAL: Under ISO 17025 regulations, testing on overdue instruments must cease immediately. Please coordinate calibration audits immediately." : "Please schedule the calibration audit with NABL approved agencies before the deadline."}\n\nBest Regards,\nQA/QC Compliance Department`
    });
    setIsEmailModalOpen(true);
  };

  const handleOpenWhatsApp = (eq) => {
    setActiveEq(eq);
    const daysLeft = getRemainingDays(eq.nextDue);
    const isOverdue = daysLeft < 0;

    setNotificationTemplate({
      to: "+91 98765 43210",
      subject: "",
      body: `*LIMS CALIBRATION ALERT* ⚠️\n\nDear *${eq.responsiblePerson}*,\n\nCalibration for *${eq.id} - ${eq.name}* (${eq.laboratory}) is *${isOverdue ? `OVERDUE by ${Math.abs(daysLeft)} days` : `due in ${daysLeft} days`}*.\n\n*Deadline:* ${new Date(eq.nextDue).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}\n\n${isOverdue ? "*Action Required:* STOP testing and book NABL audit immediately." : "Please schedule calibration bookings soon."}`
    });
    setIsWaModalOpen(true);
  };

  const handleSendNotification = (type) => {
    alert(`${type} alert notification dispatched to ${activeEq.responsiblePerson} successfully!`);
    setIsEmailModalOpen(false);
    setIsWaModalOpen(false);
  };

  // Filter criteria tabs
  const filteredEquipments = equipments.filter(eq => {
    const daysLeft = getRemainingDays(eq.nextDue);
    const isOverdue = daysLeft < 0;

    const matchesSearch = 
      eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.laboratory.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilterTab === "overdue") return isOverdue;
    if (activeFilterTab === "due7") return !isOverdue && daysLeft <= 7;
    if (activeFilterTab === "due30") return !isOverdue && daysLeft > 7 && daysLeft <= 30;

    return true; // "all"
  });

  return (
    <MainLayout headerTitle="Calibration Due Registry" headerSubtitle="QA/QC escalation logbook for overdue instruments & compliance logs">
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Status Filter Tabs bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-gray-100 p-1.5 rounded-2xl w-fit">
            <button onClick={() => setActiveFilterTab("all")} className={`px-4 py-2.5 rounded-xl transition-all ${activeFilterTab === "all" ? "bg-white text-gray-800 shadow-sm" : "hover:text-gray-800"}`}>
              All Pending
            </button>
            <button onClick={() => setActiveFilterTab("due30")} className={`px-4 py-2.5 rounded-xl transition-all ${activeFilterTab === "due30" ? "bg-white text-amber-600 shadow-sm" : "hover:text-amber-600"}`}>
              Due Soon (1-30 Days)
            </button>
            <button onClick={() => setActiveFilterTab("due7")} className={`px-4 py-2.5 rounded-xl transition-all ${activeFilterTab === "due7" ? "bg-white text-orange-600 shadow-sm" : "hover:text-orange-600"}`}>
              Due within 7 Days
            </button>
            <button onClick={() => setActiveFilterTab("overdue")} className={`px-4 py-2.5 rounded-xl transition-all ${activeFilterTab === "overdue" ? "bg-white text-red-600 shadow-sm" : "hover:text-red-600"}`}>
              Overdue
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search due register..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2562AA]"
              />
            </div>
            <button onClick={() => alert("Mock export triggered.")} className="flex items-center gap-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-bold px-3 py-2.5 rounded-xl shadow-xs transition-all">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>

        {/* Due List Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-150 text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">EQ ID</th>
                  <th className="py-3.5 px-4">Equipment Name</th>
                  <th className="py-3.5 px-4">Calibration Due Date</th>
                  <th className="py-3.5 px-4">Overdue / Time Remaining</th>
                  <th className="py-3.5 px-4">Laboratory</th>
                  <th className="py-3.5 px-4">Responsible</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEquipments.map((eq) => {
                  const daysLeft = getRemainingDays(eq.nextDue);
                  const isOverdue = daysLeft < 0;
                  return (
                    <tr key={eq.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-gray-600">{eq.id}</td>
                      <td className="py-3.5 px-4 font-semibold text-gray-800">{eq.name}</td>
                      <td className="py-3.5 px-4 text-gray-600 font-medium">
                        {new Date(eq.nextDue).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3.5 px-4">
                        {isOverdue ? (
                          <span className="text-xs font-extrabold text-red-600 bg-red-50 px-2.5 py-0.5 rounded border border-red-100">{Math.abs(daysLeft)} Days Overdue</span>
                        ) : (
                          <span className={`text-xs font-bold ${daysLeft <= 7 ? "text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded border border-orange-100" : "text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-100"}`}>{daysLeft} Days Left</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 font-medium">{eq.laboratory}</td>
                      <td className="py-3.5 px-4 text-gray-800 font-semibold">{eq.responsiblePerson}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => handleOpenEmail(eq)} className="p-1.5 bg-blue-50/50 hover:bg-blue-50 text-[#2562AA] rounded-lg transition-colors border border-blue-100" title="Send Email Alert">
                            <MailOutline className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleOpenWhatsApp(eq)} className="p-1.5 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors border border-emerald-100" title="Send WhatsApp Message">
                            <WhatsApp className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredEquipments.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-gray-400 font-semibold">
                      Excellent! No calibrations are currently pending or overdue.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Warning Policy Note */}
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-2.5">
          <Warning className="text-red-500 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-red-800 uppercase">LIMS Safety Warning Policy</h4>
            <p className="text-xs text-red-750 mt-0.5 leading-relaxed">
              **CRITICAL REQUIREMENT:** Under NABL ISO/IEC 17025 standard operating procedures, any lab testing device with an **OVERDUE** calibration state must be tagged out of service immediately. Usage of overdue instruments for test reports is strictly prohibited.
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* EMAIL MOCK ESCALATION DIALOG */}
        {/* ========================================================================= */}
        {isEmailModalOpen && activeEq && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-150 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              <div className="bg-[#2562AA] text-white px-5 py-4 flex items-center justify-between">
                <span className="text-sm font-bold">Email Calibration Alert Escalation</span>
                <button onClick={() => setIsEmailModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full text-white transition-colors">
                  <Close className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs font-semibold text-gray-600">
                <div>
                  <label className="block text-gray-400 mb-1">To:</label>
                  <input
                    type="email"
                    value={notificationTemplate.to}
                    onChange={(e) => setNotificationTemplate({...notificationTemplate, to: e.target.value})}
                    className="px-3.5 py-2 w-full border border-gray-200 rounded-xl font-bold text-gray-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Subject:</label>
                  <input
                    type="text"
                    value={notificationTemplate.subject}
                    onChange={(e) => setNotificationTemplate({...notificationTemplate, subject: e.target.value})}
                    className="px-3.5 py-2 w-full border border-gray-200 rounded-xl font-bold text-gray-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Message Body:</label>
                  <textarea
                    rows="8"
                    value={notificationTemplate.body}
                    onChange={(e) => setNotificationTemplate({...notificationTemplate, body: e.target.value})}
                    className="px-3.5 py-2 w-full border border-gray-200 rounded-xl text-gray-700 font-medium focus:outline-none font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="bg-gray-50 border-t border-gray-100 px-5 py-4 flex items-center justify-end gap-2">
                <button onClick={() => setIsEmailModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-500">Cancel</button>
                <button onClick={() => handleSendNotification("Email")} className="flex items-center gap-1 px-6 py-2 bg-[#2562AA] hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md">
                  <Send className="w-3.5 h-3.5" /> Dispatch Email
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* WHATSAPP MOCK ESCALATION DIALOG */}
        {/* ========================================================================= */}
        {isWaModalOpen && activeEq && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-gray-150 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              <div className="bg-emerald-600 text-white px-5 py-4 flex items-center justify-between">
                <span className="text-sm font-bold">WhatsApp Alert Escalation</span>
                <button onClick={() => setIsWaModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full text-white transition-colors">
                  <Close className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs font-semibold text-gray-600">
                <div>
                  <label className="block text-gray-400 mb-1">To Contact (WhatsApp):</label>
                  <input
                    type="text"
                    value={notificationTemplate.to}
                    onChange={(e) => setNotificationTemplate({...notificationTemplate, to: e.target.value})}
                    className="px-3.5 py-2 w-full border border-gray-200 rounded-xl font-bold text-gray-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">WhatsApp Text:</label>
                  <textarea
                    rows="6"
                    value={notificationTemplate.body}
                    onChange={(e) => setNotificationTemplate({...notificationTemplate, body: e.target.value})}
                    className="px-3.5 py-2 w-full border border-gray-200 rounded-xl text-gray-700 font-medium focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-gray-50 border-t border-gray-100 px-5 py-4 flex items-center justify-end gap-2">
                <button onClick={() => setIsWaModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-500">Cancel</button>
                <button onClick={() => handleSendNotification("WhatsApp")} className="flex items-center gap-1 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md">
                  <Send className="w-3.5 h-3.5" /> Dispatch WhatsApp
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </MainLayout>
  );
};

export default CalibrationDueOverdue;
