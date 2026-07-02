import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import MainLayout from "../../components/layout/MainLayout";
import { mockEquipmentDb } from "../../utils/mockEquipmentData";
import { getCalibrationList, createCalibration, getEquipmentList } from "../../api";
import {
  Search,
  Add,
  Close,
  Visibility,
  UploadFile,
  Download,
  Print,
  CheckCircle,
  GppGood
} from "@mui/icons-material";

const CalibrationRegister = () => {
  const routeLocation = useLocation();

  // Data States
  const [calibrations, setCalibrations] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLab, setSelectedLab] = useState("");
  const [selectedAgency, setSelectedAgency] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [activeCert, setActiveCert] = useState(null);

  // New Calibration form state
  const [newCal, setNewCal] = useState({
    eqId: "",
    calibrationDate: "",
    frequency: "12 Months",
    nextDue: "",
    agency: "ABC NABL Lab",
    certificateNo: "",
    cost: "",
    performedBy: "",
    status: "Pass",
    remarks: ""
  });

  const fetchData = async () => {
    try {
      const resCal = await getCalibrationList();
      if (resCal.success && resCal.data?.calibrations) {
        setCalibrations(resCal.data.calibrations);
      } else {
        throw new Error("Failed to load calibrations");
      }
    } catch (err) {
      console.warn("Using fallback local data for Calibrations Register:", err.message);
      setCalibrations(mockEquipmentDb.getCalibrations());
    }

    try {
      const resEq = await getEquipmentList();
      if (resEq.success && resEq.data?.equipment) {
        setEquipmentList(resEq.data.equipment);
        const eq = resEq.data.equipment;
        if (eq.length > 0) {
          setNewCal(prev => ({
            ...prev,
            eqId: eq[0].id,
            calibrationDate: new Date().toISOString().substring(0, 10),
            nextDue: calculateNextDue(new Date().toISOString().substring(0, 10), "12 Months")
          }));
        }
      } else {
        throw new Error("Failed to load equipment list");
      }
    } catch (err) {
      console.warn("Using fallback local data for Equipment List in Calibration Register:", err.message);
      const eq = mockEquipmentDb.getEquipment();
      setEquipmentList(eq);
      if (eq.length > 0) {
        setNewCal(prev => ({
          ...prev,
          eqId: eq[0].id,
          calibrationDate: new Date().toISOString().substring(0, 10),
          nextDue: calculateNextDue(new Date().toISOString().substring(0, 10), "12 Months")
        }));
      }
    }
  };

  useEffect(() => {
    fetchData();

    if (routeLocation.state?.openAddCalibration) {
      setIsAddModalOpen(true);
      // Clear state
      window.history.replaceState({}, document.title);
    }
  }, [routeLocation]);

  const calculateNextDue = (dateStr, freq) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    let monthsToAdd = 12;
    if (freq === "3 Months") monthsToAdd = 3;
    if (freq === "6 Months") monthsToAdd = 6;
    if (freq === "24 Months") monthsToAdd = 24;
    date.setMonth(date.getMonth() + monthsToAdd);
    return date.toISOString().substring(0, 10);
  };

  const handleDateOrFreqChange = (dateVal, freqVal) => {
    const nextDueVal = calculateNextDue(dateVal, freqVal);
    setNewCal(prev => ({
      ...prev,
      calibrationDate: dateVal,
      frequency: freqVal,
      nextDue: nextDueVal
    }));
  };

  const handleSaveCalibration = async () => {
    if (!newCal.certificateNo || !newCal.performedBy || !newCal.cost) {
      alert("Please fill in all required fields.");
      return;
    }

    const selectedEq = equipmentList.find(e => e.id === newCal.eqId);
    const calibrationRecord = {
      ...newCal,
      eqName: selectedEq ? selectedEq.name : "Unknown Device",
      cost: parseFloat(newCal.cost)
    };

    try {
      await createCalibration(calibrationRecord);
    } catch (err) {
      console.error("Failed to save calibration via API:", err);
    }

    // Update local state and fallback database
    mockEquipmentDb.addCalibration(calibrationRecord);
    fetchData();
    setIsAddModalOpen(false);
    
    // Reset form
    setNewCal({
      eqId: equipmentList[0]?.id || "",
      calibrationDate: new Date().toISOString().substring(0, 10),
      frequency: "12 Months",
      nextDue: calculateNextDue(new Date().toISOString().substring(0, 10), "12 Months"),
      agency: "ABC NABL Lab",
      certificateNo: "",
      cost: "",
      performedBy: "",
      status: "Pass",
      remarks: ""
    });
  };

  const handleOpenCertificate = (rec) => {
    // Find equipment specifications for certificate details
    const eq = equipmentList.find(e => e.id === rec.eqId);
    setActiveCert({
      ...rec,
      model: eq ? eq.model : "N/A",
      serialNo: eq ? eq.serialNo : "N/A"
    });
    setIsCertModalOpen(true);
  };

  // Filter
  const filteredCalibrations = calibrations.filter(cal => {
    const eq = equipmentList.find(e => e.id === cal.eqId);
    
    const matchesSearch = 
      cal.eqName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cal.eqId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cal.certificateNo.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesLab = selectedLab ? (eq && eq.laboratory === selectedLab) : true;
    const matchesAgency = selectedAgency ? cal.agency === selectedAgency : true;
    const matchesStatus = selectedStatus ? cal.status === selectedStatus : true;

    return matchesSearch && matchesLab && matchesAgency && matchesStatus;
  });

  const laboratories = ["Concrete Lab", "Steel Lab", "Soil Lab", "Chemical Lab", "QC Lab"];
  const agencies = ["ABC NABL Lab", "XYZ NABL Lab", "National Physical Laboratory"];

  return (
    <MainLayout headerTitle="Calibration Audit Register" headerSubtitle="Chronological logbook of NABL certified equipment calibrations">
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Search & Filters */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by ID, instrument name, certificate no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2562AA]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedLab}
              onChange={(e) => setSelectedLab(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 focus:outline-none"
            >
              <option value="">All Laboratories</option>
              {laboratories.map(lab => <option key={lab} value={lab}>{lab}</option>)}
            </select>

            <select
              value={selectedAgency}
              onChange={(e) => setSelectedAgency(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 focus:outline-none"
            >
              <option value="">All Agencies</option>
              {agencies.map(ag => <option key={ag} value={ag}>{ag}</option>)}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 focus:outline-none"
            >
              <option value="">All Results</option>
              <option value="Pass">Pass</option>
              <option value="Fail">Fail</option>
            </select>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1 bg-[#2562AA] hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-[0.98]"
            >
              <Add className="w-4 h-4" /> Add Record
            </button>
          </div>
        </div>

        {/* Register Table View */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-150 text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">EQ ID</th>
                  <th className="py-3.5 px-4">Equipment Name</th>
                  <th className="py-3.5 px-4">Last Calibration</th>
                  <th className="py-3.5 px-4">Next Due</th>
                  <th className="py-3.5 px-4">Frequency</th>
                  <th className="py-3.5 px-4">Agency</th>
                  <th className="py-3.5 px-4">Certificate No.</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCalibrations.map((cal) => (
                  <tr key={cal.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-gray-600">{cal.eqId}</td>
                    <td className="py-3.5 px-4 font-semibold text-gray-800">{cal.eqName}</td>
                    <td className="py-3.5 px-4 text-gray-600 font-medium">
                      {new Date(cal.calibrationDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 font-bold">
                      {new Date(cal.nextDue).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">{cal.frequency}</td>
                    <td className="py-3.5 px-4 text-gray-600 font-medium">{cal.agency}</td>
                    <td 
                      onClick={() => handleOpenCertificate(cal)}
                      className="py-3.5 px-4 font-extrabold text-[#2562AA] hover:underline cursor-pointer"
                    >
                      {cal.certificateNo}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-2 py-0.25 bg-emerald-50 text-emerald-700 rounded font-bold uppercase text-[10px] border border-emerald-100`}>
                        {cal.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button 
                        onClick={() => handleOpenCertificate(cal)}
                        className="p-1.5 hover:bg-blue-50 text-gray-400 hover:text-[#2562AA] rounded-lg transition-colors"
                        title="View Certificate"
                      >
                        <Visibility className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredCalibrations.length === 0 && (
                  <tr>
                    <td colSpan="9" className="py-8 text-center text-gray-400 font-semibold bg-gray-50/10">
                      No calibration audits logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ADD CALIBRATION RECORD DRAWER (Screen 8) */}
        {/* ========================================================================= */}
        {/* Drawer Backdrop */}
        <div 
          className={`fixed inset-0 bg-black/45 backdrop-blur-xs z-50 transition-opacity duration-300 ${
            isAddModalOpen ? "opacity-100 visible" : "opacity-0 invisible"
          }`} 
          onClick={() => setIsAddModalOpen(false)} 
        />

        {/* Sliding Drawer Container */}
        <div 
          className={`fixed top-0 right-0 h-full w-full sm:w-[500px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ${
            isAddModalOpen ? "translate-x-0" : "translate-x-full"
          } flex flex-col`}
        >
          <div className="bg-[#2562AA] text-white px-5 py-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">Add Calibration Record</h3>
              <p className="text-[10px] text-white/80 mt-0.5 font-semibold">Log new standard validation details and upload certificate scan</p>
            </div>
            <button onClick={() => setIsAddModalOpen(false)} className="p-1.5 hover:bg-white/10 rounded-full text-white transition-colors">
              <Close className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Equipment *</label>
              <select
                value={newCal.eqId}
                onChange={(e) => setNewCal({...newCal, eqId: e.target.value})}
                className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2562AA]"
              >
                {equipmentList.map(eq => (
                  <option key={eq.id} value={eq.id}>{eq.id} - {eq.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Calibration Agency *</label>
              <select
                value={newCal.agency}
                onChange={(e) => setNewCal({...newCal, agency: e.target.value})}
                className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2562AA]"
              >
                {agencies.map(ag => <option key={ag} value={ag}>{ag}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Calibration Date *</label>
                <input
                  type="date"
                  value={newCal.calibrationDate}
                  onChange={(e) => handleDateOrFreqChange(e.target.value, newCal.frequency)}
                  className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Frequency *</label>
                <select
                  value={newCal.frequency}
                  onChange={(e) => handleDateOrFreqChange(newCal.calibrationDate, e.target.value)}
                  className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none"
                >
                  <option value="3 Months">3 Months</option>
                  <option value="6 Months">6 Months</option>
                  <option value="12 Months">12 Months</option>
                  <option value="24 Months">24 Months</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Next Due Date (Auto)</label>
                <input
                  type="date"
                  value={newCal.nextDue}
                  disabled
                  className="px-3.5 py-2.5 w-full border border-gray-200 bg-gray-50 text-gray-500 rounded-xl text-sm font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Certificate Number *</label>
                <input
                  type="text"
                  placeholder="e.g. CAL-2026-085"
                  value={newCal.certificateNo}
                  onChange={(e) => setNewCal({...newCal, certificateNo: e.target.value})}
                  className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Calibration Cost (₹) *</label>
                <input
                  type="number"
                  placeholder="Enter amount"
                  value={newCal.cost}
                  onChange={(e) => setNewCal({...newCal, cost: e.target.value})}
                  className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Performed By *</label>
                <input
                  type="text"
                  placeholder="Technician name"
                  value={newCal.performedBy}
                  onChange={(e) => setNewCal({...newCal, performedBy: e.target.value})}
                  className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Result/Status</label>
                <select
                  value={newCal.status}
                  onChange={(e) => setNewCal({...newCal, status: e.target.value})}
                  className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none"
                >
                  <option value="Pass">Pass</option>
                  <option value="Fail">Fail</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="Optional notes"
                  value={newCal.remarks}
                  onChange={(e) => setNewCal({...newCal, remarks: e.target.value})}
                  className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Upload Certificate File</label>
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4 bg-gray-50 hover:bg-gray-100 flex flex-col items-center justify-center cursor-pointer transition-colors">
                <UploadFile className="w-8 h-8 text-gray-400 mb-1" />
                <span className="text-xs font-bold text-gray-700">Drag & drop certificate PDF here</span>
                <span className="text-[10px] text-gray-400 mt-0.5">Maximum size: 10MB</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border-t border-gray-100 p-5 flex items-center justify-end gap-2">
            <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 flex-1">
              Cancel
            </button>
            <button
              onClick={handleSaveCalibration}
              className="px-6 py-2.5 bg-[#2562AA] hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex-1"
            >
              Save Calibration
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CALIBRATION CERTIFICATE VIEW MODAL (Screen 9) */}
        {/* ========================================================================= */}
        {isCertModalOpen && activeCert && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-gray-900 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-gray-800 animate-in fade-in zoom-in-95 duration-200">
              
              {/* Left Document Thumbnails panel */}
              <div className="w-full md:w-1/5 bg-gray-950 p-4 border-b md:border-b-0 md:border-r border-gray-800 flex flex-row md:flex-col gap-3 justify-center md:justify-start items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden md:block mb-4">Pages</span>
                <div className="w-20 h-28 bg-white border-2 border-[#2562AA] p-1 shadow flex flex-col justify-between items-center rounded cursor-pointer">
                  <div className="w-full h-1 bg-gray-200 mt-1" />
                  <div className="w-3/4 h-1 bg-gray-200" />
                  <span className="text-[10px] font-extrabold text-blue-600">Page 1</span>
                  <div className="w-2/3 h-1 bg-gray-200 mb-1" />
                </div>
                <div className="w-20 h-28 bg-white opacity-40 p-1 shadow flex flex-col justify-between items-center rounded cursor-pointer">
                  <div className="w-full h-1 bg-gray-200 mt-1" />
                  <div className="w-3/4 h-1 bg-gray-200" />
                  <span className="text-[10px] font-semibold text-gray-500">Page 2</span>
                  <div className="w-2/3 h-1 bg-gray-200 mb-1" />
                </div>
              </div>

              {/* Right Interactive Certificate Document Content Area */}
              <div className="flex-1 bg-gray-850 flex flex-col justify-between min-h-[500px]">
                
                {/* PDF Header Controls */}
                <div className="bg-gray-900 border-b border-gray-800 px-5 py-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Calibration Certificate Preview</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => alert("Downloaded PDF certificate.")} className="p-2 bg-gray-800 text-gray-300 hover:text-white rounded-lg transition-colors border border-gray-700" title="Download">
                      <Download className="w-4 h-4" />
                    </button>
                    <button onClick={() => window.print()} className="p-2 bg-gray-800 text-gray-300 hover:text-white rounded-lg transition-colors border border-gray-700" title="Print">
                      <Print className="w-4 h-4" />
                    </button>
                    <button onClick={() => setIsCertModalOpen(false)} className="p-2 bg-red-950/40 border border-red-900/60 text-red-400 hover:text-red-300 rounded-lg transition-colors" title="Close">
                      <Close className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Printable Certificate Page */}
                <div className="p-6 flex-1 flex items-center justify-center overflow-y-auto">
                  <div id="nabl-calibration-certificate" className="w-[595px] min-h-[680px] bg-white text-gray-900 p-8 shadow-2xl rounded-lg font-sans border-8 border-double border-blue-900 flex flex-col justify-between select-none relative">
                    
                    {/* Corner Borders */}
                    <div className="absolute top-2 left-2 right-2 bottom-2 border border-blue-900/40 pointer-events-none" />

                    {/* Laboratory Header */}
                    <div className="text-center space-y-1 relative">
                      <div className="absolute top-0 right-0 w-12 h-12 border-2 border-indigo-900 rounded-full flex items-center justify-center font-extrabold text-blue-900 text-xs shadow-xs p-1">
                        <GppGood className="w-8 h-8 text-blue-900 opacity-80" />
                      </div>
                      <h2 className="text-lg font-extrabold text-blue-900 tracking-wide">ABC CALIBRATION LABORATORY</h2>
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">NABL Accredited Laboratory • ISO/IEC 17025 Standard</span>
                      <div className="w-full h-0.5 bg-blue-900 my-3" />
                      <h3 className="text-md font-bold uppercase text-gray-800 tracking-wider">CALIBRATION CERTIFICATE</h3>
                    </div>

                    {/* Certificate Details */}
                    <div className="grid grid-cols-2 gap-y-4 text-xs font-semibold text-gray-600 mt-4 border-t border-b border-gray-100 py-6">
                      <div className="space-y-2">
                        <div>
                          <span className="text-gray-400 font-bold block uppercase text-[9px]">Certificate No:</span>
                          <span className="text-gray-900 font-extrabold text-sm">{activeCert.certificateNo}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 font-bold block uppercase text-[9px]">Equipment Name:</span>
                          <span className="text-gray-900 font-bold">{activeCert.eqName}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 font-bold block uppercase text-[9px]">Equipment ID:</span>
                          <span className="text-gray-900 font-bold">{activeCert.eqId}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2 pl-6">
                        <div>
                          <span className="text-gray-400 font-bold block uppercase text-[9px]">Date of Issue:</span>
                          <span className="text-gray-900 font-bold">
                            {new Date(activeCert.calibrationDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 font-bold block uppercase text-[9px]">Model Number:</span>
                          <span className="text-gray-900 font-bold">{activeCert.model || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 font-bold block uppercase text-[9px]">Serial Number:</span>
                          <span className="text-gray-900 font-bold">{activeCert.serialNo || "N/A"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Calibration Results Table */}
                    <div className="mt-4">
                      <table className="w-full text-left border border-gray-200 text-xs">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-700">
                            <th className="py-2 px-3">Parameters Tested</th>
                            <th className="py-2 px-3">Observed Value</th>
                            <th className="py-2 px-3">Standard Reference</th>
                            <th className="py-2 px-3">Deviation %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-600">
                          <tr>
                            <td className="py-2.5 px-3 font-semibold">Load Range 1 (500kN)</td>
                            <td className="py-2.5 px-3">500.2 kN</td>
                            <td className="py-2.5 px-3">500.0 kN</td>
                            <td className="py-2.5 px-3 text-emerald-600 font-bold">+0.04%</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-semibold">Load Range 2 (1000kN)</td>
                            <td className="py-2.5 px-3">998.5 kN</td>
                            <td className="py-2.5 px-3">1000.0 kN</td>
                            <td className="py-2.5 px-3 text-emerald-600 font-bold">-0.15%</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-semibold">Load Range 3 (2000kN)</td>
                            <td className="py-2.5 px-3">1995.8 kN</td>
                            <td className="py-2.5 px-3">2000.0 kN</td>
                            <td className="py-2.5 px-3 text-emerald-600 font-bold">-0.21%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Stamp and Seal */}
                    <div className="mt-8 flex justify-between items-end border-t border-gray-100 pt-6">
                      <div className="text-[10px] space-y-1">
                        <p className="text-gray-400 uppercase font-bold text-[8px]">Calibration Status:</p>
                        <span className="text-emerald-700 font-extrabold uppercase bg-emerald-50 px-2 py-0.5 border border-emerald-100 rounded">
                          SATISFACTORY (Pass)
                        </span>
                        <p className="text-gray-500 font-medium mt-2">Next Due Date: {new Date(activeCert.nextDue).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      </div>

                      <div className="text-center relative">
                        {/* Stamp signature overlay */}
                        <div className="border border-blue-900 border-dashed text-blue-900 text-[8px] font-bold py-1 px-3 uppercase tracking-widest rounded mx-auto rotate-[-8deg] opacity-70 mb-6">
                          ABC LAB APPROVED SEAL
                        </div>
                        <div className="w-28 h-0.5 bg-gray-400 mx-auto" />
                        <span className="text-[9px] font-bold text-gray-550 block mt-1 uppercase">Authorized Signatory</span>
                      </div>
                    </div>

                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    </MainLayout>
  );
};

export default CalibrationRegister;
