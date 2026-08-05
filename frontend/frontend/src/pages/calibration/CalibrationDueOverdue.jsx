import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search, Download, Mail, MessageCircle, X, Send, AlertTriangle,
} from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import { mockEquipmentDb } from "../../utils/mockEquipmentData";
import { getEquipmentList } from "../../api";
import {
  EquipmentWorkspace,
  SectionHeader,
  getRemainingDays,
  formatDate,
  getUrgencyLabel,
  getRuntimeCalibrationStatus,
  stagger,
} from "../../components/equipment/EquipmentModuleShared";

const FILTER_TABS = [
  { id: "all", label: "All Pending" },
  { id: "due30", label: "Due Soon (1-30 Days)" },
  { id: "due7", label: "Due within 7 Days" },
  { id: "overdue", label: "Overdue" },
];

const CalibrationDueOverdue = () => {
  const [equipments, setEquipments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilterTab, setActiveFilterTab] = useState("all");
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [activeEq, setActiveEq] = useState(null);
  const [notificationTemplate, setNotificationTemplate] = useState({ to: "", subject: "", body: "" });

  const fetchDueEquipment = async () => {
    try {
      const res = await getEquipmentList();
      const raw = res.success && res.data?.equipment ? res.data.equipment : mockEquipmentDb.getEquipment();
      const data = raw.filter((eq) => getRuntimeCalibrationStatus(eq.nextDue) !== "Valid");
      setEquipments(data);
    } catch {
      const data = mockEquipmentDb.getEquipment().filter((eq) => getRuntimeCalibrationStatus(eq.nextDue) !== "Valid");
      setEquipments(data);
    }
  };

  useEffect(() => { fetchDueEquipment(); }, []);

  const buildNotification = (eq) => {
    const daysLeft = getRemainingDays(eq.nextDue);
    const isOverdue = daysLeft < 0;
    const emailMap = {
      "Mr. Rahul Patel": "rahul.patel@limslabs.com",
      "Mrs. Sneha Shah": "sneha.shah@limslabs.com",
    };
    return {
      to: emailMap[eq.responsiblePerson] || "amit.sharma@limslabs.com",
      subject: `[ALERT] Calibration ${isOverdue ? "OVERDUE" : "DUE SOON"} - ${eq.id} (${eq.name})`,
      body: `Hi ${eq.responsiblePerson},\n\nThis is an automated compliance alert from Goma Lab LIMS.\n\nEquipment ID: ${eq.id}\nEquipment Name: ${eq.name}\nLaboratory: ${eq.laboratory}\nNext Due Date: ${formatDate(eq.nextDue)}\n\n${isOverdue ? "CRITICAL: Testing on overdue instruments must cease immediately." : "Please schedule calibration before the deadline."}\n\nBest Regards,\nQA/QC Compliance Department`,
      waBody: `*LIMS CALIBRATION ALERT*\n\nDear *${eq.responsiblePerson}*,\n\nCalibration for *${eq.id} - ${eq.name}* is *${isOverdue ? `OVERDUE by ${Math.abs(daysLeft)} days` : `due in ${daysLeft} days`}*.\n\nDeadline: ${formatDate(eq.nextDue)}`,
    };
  };

  const handleOpenEmail = (eq) => {
    setActiveEq(eq);
    const n = buildNotification(eq);
    setNotificationTemplate({ to: n.to, subject: n.subject, body: n.body });
    setIsEmailModalOpen(true);
  };

  const handleOpenWhatsApp = (eq) => {
    setActiveEq(eq);
    const n = buildNotification(eq);
    setNotificationTemplate({ to: "+91 98765 43210", subject: "", body: n.waBody });
    setIsWaModalOpen(true);
  };

  const handleSendNotification = (type) => {
    alert(`${type} alert dispatched to ${activeEq.responsiblePerson} successfully!`);
    setIsEmailModalOpen(false);
    setIsWaModalOpen(false);
  };

  const filteredEquipments = equipments.filter((eq) => {
    const daysLeft = getRemainingDays(eq.nextDue);
    const matchesSearch =
      eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.laboratory.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilterTab === "overdue") return daysLeft < 0;
    if (activeFilterTab === "due7") return daysLeft >= 0 && daysLeft <= 7;
    if (activeFilterTab === "due30") return daysLeft >= 0 && daysLeft <= 30;
    return true;
  });

  return (
    <MainLayout headerTitle="Calibration Due Registry" headerSubtitle="QA/QC escalation log for overdue instruments">
      <EquipmentWorkspace>
        {/* Filter bar */}
        <div className="mb-5 flex flex-col gap-4 border-b border-[#E2E6EB] pb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex w-fit flex-wrap items-center gap-1 rounded-xl border border-[#E2E6EB] bg-[#F6F7F9] p-1">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilterTab(tab.id)}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                  activeFilterTab === tab.id
                    ? "bg-white text-[#243744] shadow-sm"
                    : "text-[#57687A] hover:text-[#1A2733]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8A97A4]" />
              <input
                type="text"
                placeholder="Search due register..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-xl border border-[#E2E6EB] bg-white py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#3F6E8C]"
              />
            </div>
            <button type="button" onClick={() => alert("Export triggered.")} className="app-button app-button-secondary text-xs">
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        {/* Table */}
        <motion.div
          className="lab-panel overflow-hidden p-0"
          variants={stagger.container}
          initial="hidden"
          animate="visible"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E6EB] bg-[#F6F7F9] text-left text-[11px] font-bold uppercase tracking-wider text-[#8A97A4]">
                  <th className="py-3.5 px-4">EQ ID</th>
                  <th className="py-3.5 px-4">Equipment Name</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4">Time Remaining</th>
                  <th className="py-3.5 px-4">Laboratory</th>
                  <th className="py-3.5 px-4">Responsible</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF0F3]">
                {filteredEquipments.map((eq) => {
                  const urgency = getUrgencyLabel(getRemainingDays(eq.nextDue));
                  return (
                    <tr key={eq.id} className="transition-colors hover:bg-[#F6F7F9]">
                      <td className="py-3.5 px-4 font-bold text-[#3F6E8C]">{eq.id}</td>
                      <td className="py-3.5 px-4 font-semibold text-[#1A2733]">{eq.name}</td>
                      <td className="py-3.5 px-4 font-medium text-[#57687A]">{formatDate(eq.nextDue)}</td>
                      <td className="py-3.5 px-4"><span className={urgency.className}>{urgency.text}</span></td>
                      <td className="py-3.5 px-4 text-[#57687A]">{eq.laboratory}</td>
                      <td className="py-3.5 px-4 font-semibold text-[#1A2733]">{eq.responsiblePerson}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex justify-end gap-1.5">
                          <button type="button" onClick={() => handleOpenEmail(eq)} className="app-icon-button h-8 w-8" title="Send Email">
                            <Mail size={14} />
                          </button>
                          <button type="button" onClick={() => handleOpenWhatsApp(eq)} className="app-icon-button h-8 w-8 text-[#16A34A]" title="Send WhatsApp">
                            <MessageCircle size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredEquipments.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-10 text-center text-sm font-medium text-[#8A97A4]">
                      No calibrations are currently pending or overdue.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Policy warning */}
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#DC2626]" />
          <div>
            <h4 className="text-xs font-bold uppercase text-[#DC2626]">LIMS Safety Warning Policy</h4>
            <p className="mt-1 text-xs leading-relaxed text-[#57687A]">
              Under NABL ISO/IEC 17025, any device with an <strong>OVERDUE</strong> calibration state must be tagged out of service immediately. Usage of overdue instruments for test reports is strictly prohibited.
            </p>
          </div>
        </div>

        {/* Email Modal */}
        {isEmailModalOpen && activeEq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#E2E6EB] bg-white shadow-2xl">
              <div className="flex items-center justify-between bg-[#243744] px-5 py-4 text-white">
                <span className="text-sm font-bold">Email Calibration Alert</span>
                <button type="button" onClick={() => setIsEmailModalOpen(false)} className="rounded-full p-1 hover:bg-white/10">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4 p-5 text-xs font-semibold text-[#57687A]">
                {["to", "subject"].map((field) => (
                  <div key={field}>
                    <label className="mb-1 block capitalize text-[#8A97A4]">{field}:</label>
                    <input
                      type={field === "to" ? "email" : "text"}
                      value={notificationTemplate[field]}
                      onChange={(e) => setNotificationTemplate({ ...notificationTemplate, [field]: e.target.value })}
                      className="w-full rounded-xl border border-[#E2E6EB] px-3.5 py-2 font-bold text-[#1A2733] focus:outline-none focus:ring-2 focus:ring-[#3F6E8C]"
                    />
                  </div>
                ))}
                <div>
                  <label className="mb-1 block text-[#8A97A4]">Message Body:</label>
                  <textarea
                    rows="8"
                    value={notificationTemplate.body}
                    onChange={(e) => setNotificationTemplate({ ...notificationTemplate, body: e.target.value })}
                    className="w-full rounded-xl border border-[#E2E6EB] px-3.5 py-2 font-mono text-[11px] text-[#57687A] focus:outline-none focus:ring-2 focus:ring-[#3F6E8C]"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-[#E2E6EB] bg-[#F6F7F9] px-5 py-4">
                <button type="button" onClick={() => setIsEmailModalOpen(false)} className="app-button app-button-ghost text-xs">Cancel</button>
                <button type="button" onClick={() => handleSendNotification("Email")} className="app-button app-button-primary text-xs">
                  <Send size={14} /> Dispatch Email
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WhatsApp Modal */}
        {isWaModalOpen && activeEq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#E2E6EB] bg-white shadow-2xl">
              <div className="flex items-center justify-between bg-[#16A34A] px-5 py-4 text-white">
                <span className="text-sm font-bold">WhatsApp Alert</span>
                <button type="button" onClick={() => setIsWaModalOpen(false)} className="rounded-full p-1 hover:bg-white/10">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4 p-5 text-xs font-semibold text-[#57687A]">
                <div>
                  <label className="mb-1 block text-[#8A97A4]">To Contact:</label>
                  <input
                    type="text"
                    value={notificationTemplate.to}
                    onChange={(e) => setNotificationTemplate({ ...notificationTemplate, to: e.target.value })}
                    className="w-full rounded-xl border border-[#E2E6EB] px-3.5 py-2 font-bold text-[#1A2733] focus:outline-none focus:ring-2 focus:ring-[#3F6E8C]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[#8A97A4]">WhatsApp Text:</label>
                  <textarea
                    rows="6"
                    value={notificationTemplate.body}
                    onChange={(e) => setNotificationTemplate({ ...notificationTemplate, body: e.target.value })}
                    className="w-full rounded-xl border border-[#E2E6EB] px-3.5 py-2 text-[#57687A] focus:outline-none focus:ring-2 focus:ring-[#3F6E8C]"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-[#E2E6EB] bg-[#F6F7F9] px-5 py-4">
                <button type="button" onClick={() => setIsWaModalOpen(false)} className="app-button app-button-ghost text-xs">Cancel</button>
                <button type="button" onClick={() => handleSendNotification("WhatsApp")} className="app-button text-xs bg-[#16A34A] text-white hover:bg-[#15803D]">
                  <Send size={14} /> Dispatch WhatsApp
                </button>
              </div>
            </div>
          </div>
        )}
      </EquipmentWorkspace>
    </MainLayout>
  );
};

export default CalibrationDueOverdue;
