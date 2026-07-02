import React, { useState, useEffect } from "react";
import MainLayout from "../../components/layout/MainLayout";
import { mockEquipmentDb } from "../../utils/mockEquipmentData";
import { getLocationsList, createLocation } from "../../api";
import {
  Search,
  Add,
  Close,
  Room,
  Domain,
  Layers,
  SettingsSuggest,
  Delete
} from "@mui/icons-material";

const EquipmentLocations = () => {
  const [locations, setLocations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name: "",
    laboratory: "Concrete Lab",
    building: "Main Building",
    floor: "Ground Floor",
    roomNo: "",
    totalEquipment: 0
  });

  const fetchLocations = async () => {
    try {
      const res = await getLocationsList();
      if (res.success && res.data?.locations) {
        setLocations(res.data.locations);
      } else {
        throw new Error("Failed to load locations");
      }
    } catch (err) {
      console.warn("Using fallback local data for Locations:", err.message);
      setLocations(mockEquipmentDb.getLocations());
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleAddLocation = async () => {
    if (!newLocation.name || !newLocation.roomNo) {
      alert("Please fill all required fields.");
      return;
    }
    
    try {
      await createLocation(newLocation);
    } catch (err) {
      console.error("Failed to add location via API:", err);
    }
    
    // Update local state and fallback database
    mockEquipmentDb.addLocation(newLocation);
    fetchLocations();
    setIsModalOpen(false);
    setNewLocation({
      name: "",
      laboratory: "Concrete Lab",
      building: "Main Building",
      floor: "Ground Floor",
      roomNo: "",
      totalEquipment: 0
    });
  };

  const filteredLocations = locations.filter(loc => 
    loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.laboratory.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.building.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.roomNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const laboratories = ["Concrete Lab", "Steel Lab", "Soil Lab", "Chemical Lab", "QC Lab"];
  const floors = ["Ground Floor", "First Floor", "Second Floor", "Basement"];

  return (
    <MainLayout headerTitle="Equipment Locations" headerSubtitle="Map testing devices to specific facilities & physical stations">
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Filters & Actions Header */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by room, lab, building name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2562AA]"
            />
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1 bg-[#2562AA] hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-[0.98]"
          >
            <Add className="w-4 h-4" /> Add Location
          </button>
        </div>

        {/* Table View */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-150">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Location Name</th>
                  <th className="py-3.5 px-4">Laboratory</th>
                  <th className="py-3.5 px-4">Building</th>
                  <th className="py-3.5 px-4">Floor</th>
                  <th className="py-3.5 px-4">Room No.</th>
                  <th className="py-3.5 px-4 text-center">Total Equipment</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredLocations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-gray-800 flex items-center gap-2">
                      <Room className="text-gray-400 w-4 h-4" /> {loc.name}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 font-semibold">{loc.laboratory}</td>
                    <td className="py-3.5 px-4 text-gray-600 font-medium">{loc.building}</td>
                    <td className="py-3.5 px-4 text-gray-600 font-medium">{loc.floor}</td>
                    <td className="py-3.5 px-4 text-gray-800 font-bold bg-gray-50/30 px-2 py-0.5 rounded border border-gray-100/50 inline-block mt-2 ml-4">
                      Room {loc.roomNo}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-indigo-600">
                      {loc.totalEquipment}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button onClick={() => alert("Location deletion mock active.")} className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors">
                        <Delete className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredLocations.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-gray-400 font-semibold">
                      No locations found in records.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ADD LOCATION DRAWER */}
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
              <h3 className="text-sm font-bold">Add Physical Location</h3>
              <p className="text-[10px] text-white/80 mt-0.5 font-semibold">Define new testing room boundaries</p>
            </div>
            <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-white/10 rounded-full text-white transition-colors">
              <Close className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location Name *</label>
              <input
                type="text"
                placeholder="e.g. Concrete Lab - Curing Room"
                value={newLocation.name}
                onChange={(e) => setNewLocation({...newLocation, name: e.target.value})}
                className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2562AA]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Laboratory *</label>
              <select
                value={newLocation.laboratory}
                onChange={(e) => setNewLocation({...newLocation, laboratory: e.target.value})}
                className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2562AA]"
              >
                {laboratories.map(lab => <option key={lab} value={lab}>{lab}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Building</label>
                <input
                  type="text"
                  value={newLocation.building}
                  onChange={(e) => setNewLocation({...newLocation, building: e.target.value})}
                  className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2562AA]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Floor</label>
                <select
                  value={newLocation.floor}
                  onChange={(e) => setNewLocation({...newLocation, floor: e.target.value})}
                  className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2562AA]"
                >
                  {floors.map(fl => <option key={fl} value={fl}>{fl}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Room Number *</label>
              <input
                type="text"
                placeholder="e.g. 104"
                value={newLocation.roomNo}
                onChange={(e) => setNewLocation({...newLocation, roomNo: e.target.value})}
                className="px-3.5 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2562AA]"
              />
            </div>
          </div>

          <div className="bg-gray-50 border-t border-gray-100 p-5 flex items-center justify-end gap-2">
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 flex-1">
              Cancel
            </button>
            <button
              onClick={handleAddLocation}
              className="px-6 py-2.5 bg-[#2562AA] hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex-1"
            >
              Save Location
            </button>
          </div>
        </div>

      </div>
    </MainLayout>
  );
};

export default EquipmentLocations;
