import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../components/layout/MainLayout";
import { mockEquipmentDb } from "../../utils/mockEquipmentData";
import { getMaintenanceList, createMaintenance, getEquipmentList } from "../../api";
import {
  Search,
  Add,
  Close,
  Build,
  Engineering,
  Delete,
  Visibility,
  CheckCircle
} from "@mui/icons-material";

const MaintenanceHistory = () => {
  const navigate = useNavigate();

  // Data States
  const [maintenance, setMaintenance] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMaint, setNewMaint] = useState({
    eqId: "",
    date: "",
    type: "Preventive",
    engineer: "",
    cost: "",
    status: "Completed",
    remarks: ""
  });

  const fetchData = async () => {
    try {
      const resMaint = await getMaintenanceList();
      if (resMaint.success && resMaint.data?.maintenance) {
        setMaintenance(resMaint.data.maintenance);
      } else {
        throw new Error("Failed response maintenance");
      }
    } catch (err) {
      console.warn("Using fallback local data for Maintenance Logs:", err.message);
      setMaintenance(mockEquipmentDb.getMaintenance());
    }

    try {
      const resEq = await getEquipmentList();
      if (resEq.success && resEq.data?.equipment) {
        setEquipmentList(resEq.data.equipment);
        const eq = resEq.data.equipment;
        if (eq.length > 0) {
          setNewMaint(prev => ({
            ...prev,
            eqId: eq[0].id,
            date: new Date().toISOString().substring(0, 10)
          }));
        }
      } else {
        throw new Error("Failed response equipment");
      }
    } catch (err) {
      console.warn("Using fallback local data for Equipment List in Maintenance History:", err.message);
      const eq = mockEquipmentDb.getEquipment();
      setEquipmentList(eq);
      if (eq.length > 0) {
        setNewMaint(prev => ({
          ...prev,
          eqId: eq[0].id,
          date: new Date().toISOString().substring(0, 10)
        }));
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveMaintenance = async () => {
    if (!newMaint.engineer || !newMaint.cost) {
      alert("Please fill in all required fields.");
      return;
    }

    const selectedEq = equipmentList.find(e => e.id === newMaint.eqId);
    const maintRecord = {
      ...newMaint,
      eqName: selectedEq ? selectedEq.name : "Unknown Device",
      cost: parseFloat(newMaint.cost)
    };

    try {
      await createMaintenance(maintRecord);
    } catch (err) {
      console.error("Failed to save maintenance order via API:", err);
    }

    // Update local state and fallback database
    mockEquipmentDb.addMaintenance(maintRecord);
    fetchData();
    setIsModalOpen(false);

    // Reset
    setNewMaint({
      eqId: equipmentList[0]?.id || "",
      date: new Date().toISOString().substring(0, 10),
      type: "Preventive",
      engineer: "",
      cost: "",
      status: "Completed",
      remarks: ""
    });
  };

  // Filter
  const filteredMaintenance = maintenance.filter(m => {
    const matchesSearch = 
      m.eqName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.eqId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.engineer.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType ? m.type === selectedType : true;
    const matchesStatus = selectedStatus ? m.status === selectedStatus : true;

    return matchesSearch && matchesType && matchesStatus;
  });

  const maintenanceTypes = ["Preventive", "Repair", "Calibration Support"];
  const statuses = ["Completed", "In Progress", "Scheduled"];

  return (
    <MainLayout headerTitle="Maintenance Work Orders" headerSubtitle="Prevention scheduling & repair registry logbook">
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Filter Toolbar */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search work orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2562AA]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 focus:outline-none"
            >
              <option value="">All Types</option>
              {maintenanceTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 focus:outline-none"
            >
              <option value="">All Statuses</option>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1 bg-[#2562AA] hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-[0.98]"
            >
              <Add className="w-4 h-4" /> Add Maintenance
            </button>
          </div>
        </div>

        {/* Datatable */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-150 text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Maintenance Date</th>
                  <th className="py-3.5 px-4">EQ ID</th>
                  <th className="py-3.5 px-4">Equipment Name</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Contractor / Engineer</th>
                  <th className="py-3.5 px-4">Cost (INR)</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMaintenance.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 px-4 text-gray-600 font-semibold">
                      {new Date(m.date).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td onClick={() => navigate(`/equipment/view/${m.eqId}`)} className="py-3.5 px-4 font-bold text-[#2562AA] hover:underline cursor-pointer">
                      {m.eqId}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-800">{m.eqName}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-2 py-0.25 text-xs font-bold rounded ${
                        m.type === "Preventive" ? "text-blue-700 bg-blue-50" : "text-purple-700 bg-purple-50"
                      }`}>{m.type}</span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 font-medium flex items-center gap-1.5 mt-1.5">
                      <Engineering className="text-gray-400 w-4 h-4" /> {m.engineer}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-800">
                      ₹ {m.cost.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-2 py-0.25 text-[10px] font-extrabold rounded uppercase ${
                        m.status === "Completed" ? "text-emerald-700 bg-emerald-50 border border-emerald-100" : m.status === "In Progress" ? "text-amber-700 bg-amber-50" : "text-gray-600 bg-gray-100"
                      }`}>{m.status}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button onClick={() => navigate(`/equipment/view/${m.eqId}`)} className="p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-700 rounded-lg">
                        <Visibility className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredMaintenance.length === 0 && (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-gray-400 font-semibold bg-gray-50/10">
                      No maintenance work orders stored.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ADD MAINTENANCE DRAWER */}
        {/* ========================================================================= */}
        {/* Drawer Backdrop */}
        <div 
          className={`fixed inset-0 bg-black/45 backdrop-blur-xs z-50 transition-opacity duration-300 ${
            isModalOpen ? "opacity-100 visible" : "opacity-0 invisible"
          }`} 
          onClick={() => setIsModalOpen(false)} 
        />

        {/* Sliding Drawer Container */}
        <div 
          className={`fixed top-0 right-0 h-full w-full sm:w-[450px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ${
            isModalOpen ? "translate-x-0" : "translate-x-full"
          } flex flex-col`}
        >
          <div className="bg-[#2562AA] text-white px-5 py-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">Add Maintenance Order</h3>
              <p className="text-[10px] text-white/80 mt-0.5 font-semibold">Log preventive repairs or service reports</p>
            </div>
            <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-white/10 rounded-full text-white transition-colors">
              <Close className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Equipment *</label>
              <select
                value={newMaint.eqId}
                onChange={(e) => setNewMaint({...newMaint, eqId: e.target.value})}
                className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2562AA]"
              >
                {equipmentList.map(eq => (
                  <option key={eq.id} value={eq.id}>{eq.id} - {eq.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Work Date *</label>
                <input
                  type="date"
                  value={newMaint.date}
                  onChange={(e) => setNewMaint({...newMaint, date: e.target.value})}
                  className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Work Type *</label>
                <select
                  value={newMaint.type}
                  onChange={(e) => setNewMaint({...newMaint, type: e.target.value})}
                  className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none"
                >
                  {maintenanceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Engineer / Service Contractor *</label>
              <input
                type="text"
                placeholder="e.g. Aimil Service Team"
                value={newMaint.engineer}
                onChange={(e) => setNewMaint({...newMaint, engineer: e.target.value})}
                className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cost (₹) *</label>
                <input
                  type="number"
                  placeholder="INR"
                  value={newMaint.cost}
                  onChange={(e) => setNewMaint({...newMaint, cost: e.target.value})}
                  className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Job Status</label>
                <select
                  value={newMaint.status}
                  onChange={(e) => setNewMaint({...newMaint, status: e.target.value})}
                  className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none"
                >
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Remarks</label>
              <input
                type="text"
                placeholder="Describe maintenance logs..."
                value={newMaint.remarks}
                onChange={(e) => setNewMaint({...newMaint, remarks: e.target.value})}
                className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2562AA]"
              />
            </div>
          </div>

          <div className="bg-gray-50 border-t border-gray-100 p-5 flex items-center justify-end gap-2">
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 flex-1">
              Cancel
            </button>
            <button
              onClick={handleSaveMaintenance}
              className="px-6 py-2.5 bg-[#2562AA] hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex-1"
            >
              Save Order
            </button>
          </div>
        </div>

      </div>
    </MainLayout>
  );
};

export default MaintenanceHistory;
