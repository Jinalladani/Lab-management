import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import MainLayout from "../../components/layout/MainLayout";
import { mockEquipmentDb } from "../../utils/mockEquipmentData";
import { getEquipmentList, createEquipment, deleteEquipment } from "../../api";
import {
  Search,
  FilterList,
  Add,
  QrCode,
  Visibility,
  Edit,
  Delete,
  Close,
  UploadFile,
  CheckCircle,
  HelpOutline
} from "@mui/icons-material";

const EquipmentList = () => {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  
  // Data State
  const [equipments, setEquipments] = useState([]);
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLab, setSelectedLab] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Modals
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [activeQrEq, setActiveQrEq] = useState(null);

  // Load Data
  const fetchEquipment = async () => {
    try {
      const res = await getEquipmentList();
      if (res.success && res.data?.equipment) {
        setEquipments(res.data.equipment);
      }
    } catch (err) {
      console.error("Failed to load equipment list from database:", err);
      setEquipments([]);
    }
  };

  useEffect(() => {
    fetchEquipment();
    
    // Check if redirect requested add page open
    if (routeLocation.state?.openAddWizard) {
      navigate("/equipment/add");
      // Clear state so it doesn't redirect again on reload
      window.history.replaceState({}, document.title);
    }
  }, [routeLocation, navigate]);

  const handleDelete = async (id) => {
    if (window.confirm(`Are you sure you want to delete equipment ${id}?`)) {
      try {
        await deleteEquipment(id);
      } catch (err) {
        console.error("Failed to delete equipment via API:", err);
      }
      
      // Update local state and fallback database
      setEquipments(prev => prev.filter(eq => eq.id !== id));
      mockEquipmentDb.deleteEquipment(id);
    }
  };

  const handlePrintLabel = (eq) => {
    setActiveQrEq(eq);
    setIsQrModalOpen(true);
  };

  // Filter logic
  const filteredEquipments = equipments.filter(eq => {
    const matchesSearch = 
      eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.serialNo.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesLab = selectedLab ? eq.laboratory === selectedLab : true;
    const matchesCategory = selectedCategory ? eq.category === selectedCategory : true;
    const matchesStatus = selectedStatus ? eq.status === selectedStatus : true;
    
    return matchesSearch && matchesLab && matchesCategory && matchesStatus;
  });

  // Distinct values for filter headers
  const laboratories = ["Concrete Lab", "Steel Lab", "Soil Lab", "Chemical Lab", "QC Lab"];
  const categories = ["Concrete", "Steel", "Soil", "General"];
  const statuses = ["Active", "Inactive", "Under Maintenance"];

  return (
    <MainLayout headerTitle="Equipment Registry" headerSubtitle="Manage, inspect, and trace laboratory apparatus & calibration records">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        
        {/* Filters and Search Bar */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by ID, name, model, serial no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2562AA] transition-all"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedLab}
              onChange={(e) => setSelectedLab(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2562AA]"
            >
              <option value="">All Laboratories</option>
              {laboratories.map(lab => <option key={lab} value={lab}>{lab}</option>)}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2562AA]"
            >
              <option value="">All Categories</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2562AA]"
            >
              <option value="">All Statuses</option>
              {statuses.map(st => <option key={st} value={st}>{st}</option>)}
            </select>

            <button
              onClick={() => navigate("/equipment/add")}
              className="flex items-center gap-1 bg-[#2562AA] hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-[0.98]"
            >
              <Add className="w-4 h-4" /> Add Equipment
            </button>
          </div>
        </div>

        {/* Datatable */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-150">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">EQ ID</th>
                  <th className="py-3 px-4">Equipment Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Laboratory</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Calibration Status</th>
                  <th className="py-3 px-4">Next Due</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredEquipments.map((eq) => (
                  <tr key={eq.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#2562AA] hover:underline cursor-pointer" onClick={() => navigate(`/equipment/view/${eq.id}`)}>
                      {eq.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-gray-800 block">{eq.name}</span>
                      <span className="text-xs text-gray-400 font-medium">Model: {eq.model || "N/A"} • S/N: {eq.serialNo || "N/A"}</span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 font-medium">{eq.category}</td>
                    <td className="py-3.5 px-4 text-gray-600 font-medium">{eq.laboratory}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        eq.status === "Active" 
                          ? "bg-emerald-50 text-emerald-700" 
                          : eq.status === "Under Maintenance"
                          ? "bg-indigo-50 text-indigo-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {eq.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        eq.calibrationStatus === "Valid" 
                          ? "bg-emerald-50 text-emerald-700" 
                          : eq.calibrationStatus === "Due Soon"
                          ? "bg-amber-50 text-amber-700"
                          : eq.calibrationStatus === "Due within 7 Days"
                          ? "bg-orange-50 text-orange-700"
                          : "bg-red-50 text-red-700"
                      }`}>
                        {eq.calibrationStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 font-medium">
                      {new Date(eq.nextDue).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/equipment/view/${eq.id}`)} className="p-1.5 hover:bg-gray-100 text-gray-500 hover:text-gray-800 rounded-lg transition-colors" title="View Details">
                          <Visibility className="w-4 h-4" />
                        </button>
                        <button onClick={() => navigate(`/equipment/edit/${eq.id}`)} className="p-1.5 hover:bg-gray-100 text-gray-500 hover:text-gray-800 rounded-lg transition-colors" title="Edit Equipment">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handlePrintLabel(eq)} className="p-1.5 hover:bg-blue-50 text-gray-500 hover:text-[#2562AA] rounded-lg transition-colors" title="Print QR Label">
                          <QrCode className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(eq.id)} className="p-1.5 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-lg transition-colors" title="Delete">
                          <Delete className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredEquipments.length === 0 && (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-gray-400 font-medium bg-gray-50/20">
                      No matching equipment found in the database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Showing {filteredEquipments.length} of {equipments.length} entries</span>
            <div className="flex items-center gap-1.5">
              <button disabled className="px-2.5 py-1 bg-white border border-gray-200 rounded-md shadow-sm disabled:opacity-50">Prev</button>
              <span className="px-3 py-1 bg-[#2562AA] text-white rounded-md">1</span>
              <button disabled className="px-2.5 py-1 bg-white border border-gray-200 rounded-md shadow-sm disabled:opacity-50">Next</button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* QR CODE / EQUIPMENT LABEL MODAL (Screen 13) */}
        {/* ========================================================================= */}
        {isQrModalOpen && activeQrEq && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              <div className="bg-gray-50 border-b border-gray-100 px-5 py-4 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-800">QR Code / Equipment Label</span>
                <button onClick={() => setIsQrModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                  <Close className="w-5 h-5" />
                </button>
              </div>

              {/* Printable Label Section */}
              <div className="p-6 flex flex-col items-center justify-center">
                
                {/* Physical Label Design Card */}
                <div id="equipment-printable-label" className="w-full bg-white border border-gray-300 rounded-2xl p-4 shadow-sm text-gray-900 flex flex-row items-center gap-4 relative">
                  {/* Outer border to simulate cut line */}
                  <div className="absolute inset-2 border border-dashed border-gray-300 pointer-events-none rounded-lg" />
                  
                  {/* Left QR Code Column */}
                  <div className="flex-shrink-0 flex flex-col items-center justify-center z-10 ml-2">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${activeQrEq.id}`}
                      alt={`QR Code for ${activeQrEq.id}`}
                      className="w-24 h-24 border border-gray-200 p-1.5 rounded-lg bg-white"
                    />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{activeQrEq.id}</span>
                  </div>

                  {/* Right Content Column */}
                  <div className="flex-1 flex flex-col justify-between py-1 z-10 text-left pl-2 pr-2">
                    <div>
                      <h4 className="text-sm font-extrabold tracking-tight text-gray-900 line-clamp-1">{activeQrEq.name}</h4>
                      <p className="text-[10px] font-bold text-gray-500 uppercase mt-0.5">{activeQrEq.laboratory} • {activeQrEq.location || "N/A"}</p>
                    </div>
                    
                    <div className="space-y-1 mt-2.5">
                      <div className="flex justify-between items-center text-[10px] font-semibold text-gray-500">
                        <span>Device Status:</span>
                        <span className="font-extrabold text-emerald-600 uppercase text-[9px] bg-emerald-50 px-1.5 py-0.25 rounded border border-emerald-100">{activeQrEq.status}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-semibold text-gray-500">
                        <span>Calibration:</span>
                        <span className={`font-extrabold uppercase text-[9px] px-1.5 py-0.25 rounded border ${
                          activeQrEq.calibrationStatus === "Valid" 
                            ? "text-emerald-700 bg-emerald-50 border-emerald-100" 
                            : "text-amber-700 bg-amber-50 border-amber-100"
                        }`}>{activeQrEq.calibrationStatus}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-semibold text-gray-500">
                        <span>Next Due:</span>
                        <span className="font-bold text-gray-800">{new Date(activeQrEq.nextDue).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs font-semibold text-gray-400 text-center mt-5 max-w-xs">
                  Scan to view calibration certificate, verification logs, and operation standards.
                </p>
              </div>

              {/* Actions */}
              <div className="bg-gray-50 border-t border-gray-100 px-5 py-4 flex gap-3">
                <button
                  onClick={() => alert("Downloaded label PDF successfully.")}
                  className="flex-1 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
                >
                  Download Label
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2 bg-[#2562AA] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
                >
                  Print Label
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </MainLayout>
  );
};

export default EquipmentList;
