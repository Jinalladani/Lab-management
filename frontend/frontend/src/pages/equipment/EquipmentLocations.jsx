import React, { useState, useEffect } from "react";
import { Search, Plus, X, MapPin, Trash2 } from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import { mockEquipmentDb } from "../../utils/mockEquipmentData";
import { getLocationsList, createLocation } from "../../api";
import { Input, Select, Button } from "../../components/ui";

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

  const laboratories = [
    { value: "Concrete Lab", label: "Concrete Lab" },
    { value: "Steel Lab", label: "Steel Lab" },
    { value: "Soil Lab", label: "Soil Lab" },
    { value: "Chemical Lab", label: "Chemical Lab" },
    { value: "QC Lab", label: "QC Lab" }
  ];

  const floors = [
    { value: "Ground Floor", label: "Ground Floor" },
    { value: "First Floor", label: "First Floor" },
    { value: "Second Floor", label: "Second Floor" },
    { value: "Basement", label: "Basement" }
  ];

  return (
    <MainLayout headerTitle="Equipment Locations" headerSubtitle="Map testing devices to specific facilities & physical stations">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">

        {/* Toolbar Section */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          
          {/* Search Box */}
          <div className="flex-1 max-w-xl flex h-10 w-full items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 focus-within:border-[#243744] focus-within:ring-2 focus-within:ring-[#243744]/10 transition-all">
            <Search size={16} className="text-[#94A3B8] shrink-0" />
            <input
              type="text"
              placeholder="Search by room, lab, building name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none"
            />
          </div>

          <Button
            onClick={() => setIsModalOpen(true)}
            icon={Plus}
          >
            Add Location
          </Button>
        </div>

        {/* Table View */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#FAFBFD] text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                  <th className="px-6 py-3.5">Location Name</th>
                  <th className="px-6 py-3.5">Laboratory</th>
                  <th className="px-6 py-3.5">Building</th>
                  <th className="px-6 py-3.5">Floor</th>
                  <th className="px-6 py-3.5">Room No.</th>
                  <th className="px-6 py-3.5 text-center">Total Equipment</th>
                  <th className="px-6 py-3.5 text-right w-[90px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-xs">
                {filteredLocations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-[#FAF9FF] transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-2">
                      <MapPin size={14} className="text-gray-400" /> {loc.name}
                    </td>
                    <td className="px-6 py-4 font-semibold text-[#475569]">{loc.laboratory}</td>
                    <td className="px-6 py-4 font-medium text-[#64748B]">{loc.building}</td>
                    <td className="px-6 py-4 font-medium text-[#64748B]">{loc.floor}</td>
                    <td className="px-6 py-4">
                      <span className="bg-[#FAFBFD] border border-[#E2E8F0] px-2 py-1 rounded font-bold text-gray-800">
                        Room {loc.roomNo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-[#243744]">
                      {loc.totalEquipment}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => alert("Location deletion mock active.")} 
                        className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                        title="Delete Location"
                      >
                        <Trash2 size={14} />
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
          className={`fixed inset-0 bg-black/40 backdrop-blur-xs z-50 transition-opacity duration-300 ${
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
          <div className="bg-[#243744] text-white px-5 py-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">Add Physical Location</h3>
              <p className="text-[10px] text-white/80 mt-0.5 font-semibold">Define new testing room boundaries</p>
            </div>
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="p-1.5 hover:bg-white/10 rounded-full text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <Input
              label="Location Name"
              name="name"
              placeholder="e.g. Concrete Lab - Curing Room"
              value={newLocation.name}
              onChange={(e) => setNewLocation({...newLocation, name: e.target.value})}
              required
            />

            <Select
              label="Laboratory"
              name="laboratory"
              value={newLocation.laboratory}
              onChange={(e) => setNewLocation({...newLocation, laboratory: e.target.value})}
              options={laboratories}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Building"
                name="building"
                value={newLocation.building}
                onChange={(e) => setNewLocation({...newLocation, building: e.target.value})}
              />
              <Select
                label="Floor"
                name="floor"
                value={newLocation.floor}
                onChange={(e) => setNewLocation({...newLocation, floor: e.target.value})}
                options={floors}
              />
            </div>

            <Input
              label="Room Number"
              name="roomNo"
              placeholder="e.g. 104"
              value={newLocation.roomNo}
              onChange={(e) => setNewLocation({...newLocation, roomNo: e.target.value})}
              required
            />
          </div>

          <div className="bg-gray-50 border-t border-gray-100 p-5 flex items-center justify-end gap-3">
            <Button 
              variant="secondary" 
              onClick={() => setIsModalOpen(false)} 
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddLocation}
              className="flex-1"
            >
              Save Location
            </Button>
          </div>
        </div>

      </div>
    </MainLayout>
  );
};

export default EquipmentLocations;
