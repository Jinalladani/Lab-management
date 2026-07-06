import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Briefcase,
  User,
  Shield,
  Info,
  MapPin,
  CreditCard,
  Mail,
  Phone
} from "lucide-react";
import { getClientById, updateClient } from "../../api/clients";
import { MainLayout } from "../../components/layout";
import {
  PageHeader,
  Input,
  Select,
  Button
} from "../../components/ui";

const EditLabClient = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(false);
  const [clientLoading, setClientLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errors, setErrors] = useState({});

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

  const fetchClientData = async () => {
    try {
      setClientLoading(true);
      const response = await getClientById(id);
      const clientData = response.data?.data;
      
      if (clientData) {
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
      setErrorMessage("Failed to load client details");
    } finally {
      setClientLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchClientData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.client_name.trim()) {
      newErrors.client_name = "Company name is required";
    }
    if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email format is invalid";
    }
    if (!formData.status.trim()) {
      newErrors.status = "Status is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!validateForm()) return;

    try {
      setLoading(true);
      await updateClient(id, formData);
      setSuccessMessage("Lab client updated successfully!");
      
      setTimeout(() => navigate("/labClients"), 2000);
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Failed to update lab client");
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "suspended", label: "Suspended" },
  ];

  return (
    <MainLayout headerTitle="Edit Lab Client" headerSubtitle="Modify client profile configurations">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate("/labClients")} className="mb-4">
          Back
        </Button>

        {/* Messages */}
        {successMessage && (
          <motion.div
            className="mb-5 flex items-center gap-3 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#16A34A]/10 text-[#16A34A]">
              <Info size={16} />
            </div>
            <p className="text-sm font-medium text-[#16A34A]">{successMessage}</p>
          </motion.div>
        )}

        {errorMessage && (
          <motion.div
            className="mb-5 flex items-center gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DC2626]/10 text-[#DC2626]">
              <Info size={16} />
            </div>
            <p className="text-sm font-medium text-[#DC2626]">{errorMessage}</p>
          </motion.div>
        )}

        {clientLoading ? (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-16 text-center text-sm font-semibold text-gray-500">
            Loading client data...
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8 !overflow-visible">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Company details & Address */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Basic Information */}
                  <div>
                    <h3 className="text-sm font-bold text-[#1A2733] flex items-center gap-2 mb-4">
                      <Briefcase size={16} className="text-[#3F6E8C]" />
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Company Name"
                        name="client_name"
                        value={formData.client_name}
                        onChange={handleChange}
                        placeholder="Enter client company name"
                        error={errors.client_name}
                        required
                        icon={Briefcase}
                      />
                      <Input
                        label="Contact Person"
                        name="contact_person"
                        value={formData.contact_person}
                        onChange={handleChange}
                        placeholder="Enter contact person's name"
                        icon={User}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <Input
                        label="Email Address"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="client@company.com"
                        error={errors.email}
                        icon={Mail}
                      />
                      <Input
                        label="Phone Number"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="Enter contact phone"
                        icon={Phone}
                      />
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-[#F1F5F9]" />

                  {/* Address Information */}
                  <div>
                    <h3 className="text-sm font-bold text-[#1A2733] flex items-center gap-2 mb-4">
                      <MapPin size={16} className="text-[#3F6E8C]" />
                      Address Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label htmlFor="address" className="app-label">Address</label>
                        <textarea
                          id="address"
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          placeholder="Enter company billing or office address..."
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#243744]/10 focus:border-[#243744] bg-white text-sm transition-all min-h-[100px]"
                        />
                      </div>
                      <Input
                        label="City"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="Enter city"
                      />
                      <Input
                        label="State"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        placeholder="Enter state"
                      />
                      <div className="md:col-span-2">
                        <Input
                          label="Pincode"
                          name="pincode"
                          value={formData.pincode}
                          onChange={handleChange}
                          placeholder="Enter postal pincode"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Tax details & Status */}
                <div className="space-y-6 lg:border-l lg:border-[#F1F5F9] lg:pl-8">
                  
                  {/* Tax Information */}
                  <div>
                    <h3 className="text-sm font-bold text-[#1A2733] flex items-center gap-2 mb-4">
                      <CreditCard size={16} className="text-[#3F6E8C]" />
                      Tax Information
                    </h3>
                    <div className="space-y-4">
                      <Input
                        label="GST Number"
                        name="gst_no"
                        value={formData.gst_no}
                        onChange={handleChange}
                        placeholder="e.g. 22AAAAA0000A1Z5"
                      />
                      <Input
                        label="PAN Number"
                        name="pan_no"
                        value={formData.pan_no}
                        onChange={handleChange}
                        placeholder="e.g. ABCDE1234F"
                      />
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-[#F1F5F9]" />

                  {/* Status */}
                  <div className="!overflow-visible">
                    <h3 className="text-sm font-bold text-[#1A2733] flex items-center gap-2 mb-4">
                      <Shield size={16} className="text-[#3F6E8C]" />
                      Client Status
                    </h3>
                    <Select
                      label="Status"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      options={statusOptions}
                      placeholder="Select status"
                      error={errors.status}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-[#F1F5F9] my-6" />

              {/* Actions */}
              <motion.div
                className="flex justify-end gap-3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Button variant="secondary" onClick={() => navigate("/labClients")}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  loading={loading}
                  className="!bg-[#243744] hover:!bg-[#1A2733] text-white font-bold"
                >
                  {loading ? "Updating Client..." : "Update Client"}
                </Button>
              </motion.div>
            </div>
          </form>
        )}
      </div>
    </MainLayout>
  );
};

export default EditLabClient;
