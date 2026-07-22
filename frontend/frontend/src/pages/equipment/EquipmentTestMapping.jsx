import React, { useState, useEffect } from "react";
import { Search, Plus, Link2, Trash2, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import { getEquipmentMappings, createEquipmentMapping, deleteEquipmentMapping, getOptionsForMapping } from "../../api";
import { Select, Button } from "../../components/ui";

const EquipmentTestMapping = () => {
  const [mappings, setMappings] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState({ tests: [], equipment: [] });
  
  const [newMapping, setNewMapping] = useState({
    scopeTestId: "",
    equipmentId: "",
    isMandatory: false
  });

  const fetchMappings = async () => {
    try {
      setLoading(true);
      const res = await getEquipmentMappings();
      if (res.success && res.data) {
        setMappings(res.data);
      }
    } catch (err) {
      console.error("Failed to load mappings:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const res = await getOptionsForMapping();
      if (res.success && res.data) {
        setOptions(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch mapping options:", err);
    }
  };

  useEffect(() => {
    fetchMappings();
    fetchOptions();
  }, []);

  const handleAddMapping = async () => {
    if (!newMapping.scopeTestId || !newMapping.equipmentId) {
      alert("Please select both a Test and an Instrument.");
      return;
    }
    
    try {
      const payload = {
        scopeTestId: parseInt(newMapping.scopeTestId),
        equipmentId: newMapping.equipmentId,
        isMandatory: newMapping.isMandatory
      };
      
      const res = await createEquipmentMapping(payload);
      if (res.success) {
        alert("Equipment mapped to test successfully.");
        setIsModalOpen(false);
        setNewMapping({ scopeTestId: "", equipmentId: "", isMandatory: false });
        fetchMappings();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save mapping.");
    }
  };

  const handleDelete = async (mappingId) => {
    if (!window.confirm("Are you sure you want to remove this equipment mapping?")) return;
    
    try {
      const res = await deleteEquipmentMapping(mappingId);
      if (res.success) {
        setMappings(prev => prev.filter(m => m.mappingId !== mappingId));
      }
    } catch (err) {
      alert("Failed to delete mapping.");
    }
  };

  const filteredMappings = mappings.filter(m => 
    m.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.equipmentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout headerTitle="Equipment-Test Mapping" headerSubtitle="Link calibration-controlled instruments to physical test scopes">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">

        {/* Toolbar Section */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          {/* Search Box */}
          <div className="flex-1 max-w-xl flex h-10 w-full items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 focus-within:border-[#243744] focus-within:ring-2 focus-within:ring-[#243744]/10 transition-all">
            <Search size={16} className="text-[#94A3B8] shrink-0" />
            <input
              type="text"
              placeholder="Search by test name, equipment name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none"
            />
          </div>

          <Button
            onClick={() => setIsModalOpen(true)}
            icon={Plus}
          >
            Create New Mapping
          </Button>
        </div>

        {/* Table View */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#FAFBFD] text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                  <th className="px-6 py-3.5">Test Name</th>
                  <th className="px-6 py-3.5">Test Method</th>
                  <th className="px-6 py-3.5">Mapped Equipment</th>
                  <th className="px-6 py-3.5 text-center">Type</th>
                  <th className="px-6 py-3.5">Calibration Status</th>
                  <th className="px-6 py-3.5 text-right w-[90px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-xs">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-500 font-semibold">Loading mappings...</td>
                  </tr>
                ) : filteredMappings.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-500 font-semibold">No equipment-test mappings found.</td>
                  </tr>
                ) : (
                  filteredMappings.map((m) => (
                    <tr key={m.mappingId} className="hover:bg-[#FAF9FF] transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-2">
                        <Link2 size={14} className="text-gray-400" /> {m.testName}
                      </td>
                      <td className="px-6 py-4 font-semibold text-[#475569]">{m.testMethod || "—"}</td>
                      <td className="px-6 py-4 font-semibold text-[#1A2733]">
                        {m.equipmentName} <span className="text-gray-400 font-mono">({m.equipmentId})</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          m.isMandatory 
                            ? "bg-red-50 text-red-700 border border-red-150" 
                            : "bg-blue-50 text-blue-700 border border-blue-150"
                        }`}>
                          {m.isMandatory ? "Mandatory" : "Optional"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold items-center gap-1 ${
                          m.calibrationStatus === "Valid" 
                            ? "bg-emerald-50 text-emerald-700" 
                            : m.calibrationStatus === "Overdue" 
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                        }`}>
                          {m.calibrationStatus === "Valid" ? (
                            <CheckCircle2 size={11} />
                          ) : (
                            <AlertTriangle size={11} />
                          )}
                          {m.calibrationStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDelete(m.mappingId)} 
                          className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                          title="Delete Mapping"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Dialog */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl border border-gray-150 shadow-2xl max-w-lg w-full overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900">Map Equipment to Test</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">Close</button>
              </div>

              <div className="p-6 space-y-4">
                <Select
                  label="Select Test Scope"
                  value={newMapping.scopeTestId}
                  onChange={(e) => setNewMapping(prev => ({ ...prev, scopeTestId: e.target.value }))}
                  options={options.tests.map(t => ({ value: t.scopeTestId, label: `${t.testName} (${t.testMethod})` }))}
                  placeholder="Select Test"
                  required
                />

                <Select
                  label="Select Instrument / Equipment"
                  value={newMapping.equipmentId}
                  onChange={(e) => setNewMapping(prev => ({ ...prev, equipmentId: e.target.value }))}
                  options={options.equipment.map(eq => ({ value: eq.equipmentId, label: `${eq.name} (${eq.equipmentId})` }))}
                  placeholder="Select Instrument"
                  required
                />

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isMandatory"
                    checked={newMapping.isMandatory}
                    onChange={(e) => setNewMapping(prev => ({ ...prev, isMandatory: e.target.checked }))}
                    className="w-4 h-4 text-[#243744] border-gray-300 rounded focus:ring-[#243744]"
                  />
                  <label htmlFor="isMandatory" className="text-xs font-bold text-gray-700">
                    Make usage of this equipment mandatory for the test
                  </label>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddMapping}>
                  Save Mapping
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default EquipmentTestMapping;
