import React, { useEffect, useState } from "react";
import { getClientById, updateClient } from "../../api/clients";
import { useNavigate, useParams } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";

const EditLabClient = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(false);
  const [client, setClient] = useState(null);

  const [formData, setFormData] = useState({
    client_name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    gst_no: "",
    pan_no: "",
    status: "active",
  });

  const [errors, setErrors] = useState({});

  const fetchClientData = async () => {
    try {
      const response = await getClientById(id);
      const clientData = response.data?.data;
      
      if (clientData) {
        setClient(clientData);
        setFormData({
          client_name: clientData.client_name || "",
          contact_person: clientData.contact_person || "",
          email: clientData.email || "",
          phone: clientData.phone || "",
          address: clientData.address || "",
          city: clientData.city || "",
          state: clientData.state || "",
          pincode: clientData.pincode || "",
          gst_no: clientData.gst_no || "",
          pan_no: clientData.pan_no || "",
          status: clientData.status || "active",
        });
      }
    } catch (error) {
      console.error("Failed to fetch client data:", error);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.client_name.trim()) {
      newErrors.client_name = "Client name is required";
    }

    if (!formData.status.trim()) {
      newErrors.status = "Status is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);

      const payload = {
        ...formData,
      };

      await updateClient(id, payload);
      alert("Lab client updated successfully!");
      
      navigate("/labClients");
    } catch (error) {
      const errorMessage = error?.response?.data?.message || "Failed to update lab client";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!client) {
    return (
      <MainLayout headerTitle="Edit Lab Client" headerSubtitle="Loading client data...">
        <div className="p-6">
          <div className="text-center">Loading client data...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout headerTitle="Edit Lab Client" headerSubtitle="Update client details">
      <div className="p-6">
        {/* Back Button */}
        <button
          onClick={() => navigate("/labClients")}
          className="mb-4 flex items-center gap-2 text-[#2d66b3] font-medium hover:text-[#1f5498] transition-colors"
        >
          <ArrowBackIcon fontSize="small" />
          Back
        </button>
        
        <div className="w-full">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Form Section */}
            <div className="p-8">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Basic Info */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                      Basic Information
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">Company Name</label>
                        <input
                          type="text"
                          name="client_name"
                          value={formData.client_name}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">Contact Person</label>
                        <input
                          type="text"
                          name="contact_person"
                          value={formData.contact_person}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">Email</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">Phone</label>
                        <input
                          type="text"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address Section */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                      Address Information
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block mb-2 text-sm font-medium text-gray-700">Address</label>
                        <textarea
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent min-h-[100px]"
                          placeholder="Enter complete address..."
                        />
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">City</label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">State</label>
                        <input
                          type="text"
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">Pincode</label>
                        <input
                          type="text"
                          name="pincode"
                          value={formData.pincode}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Additional Info */}
                <div className="space-y-6">
                  {/* Tax Information */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                      Tax Information
                    </h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">GST Number</label>
                        <input
                          type="text"
                          name="gst_no"
                          value={formData.gst_no}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">PAN Number</label>
                        <input
                          type="text"
                          name="pan_no"
                          value={formData.pan_no}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Client Status */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                      Status
                    </h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">Status</label>
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="lg:col-span-3 mt-8">
                  <div className="flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => navigate("/labClients")}
                      className="px-6 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-8 py-3 rounded-lg bg-gradient-to-r from-[#2b63ae] to-[#1e4a8c] text-white font-medium hover:from-[#1e4a8c] hover:to-[#2b63ae] transition-all disabled:opacity-70 shadow-lg"
                    >
                      {loading ? "Updating..." : "Update Lab Client"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default EditLabClient;
