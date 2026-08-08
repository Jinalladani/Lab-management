import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  UserCheck,
  Shield,
  Info,
  MapPin,
  Mail,
  Phone,
  User,
  Globe
} from "lucide-react";
import { api } from "../../../api";
import { MainLayout } from "../../../components/layout";
import {
  PageHeader,
  SectionCard,
  Input,
  Select,
  Button,
} from "../../../components/ui";
import { validateEmail, validatePhone } from "../../../utils/validators";

const AddLab = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    lab_name: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    postal_code: "",
    description: "",
    status: "active",
    admin_first_name: "",
    admin_last_name: "",
    admin_email: "",
    admin_phone: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.lab_name.trim()) {
      newErrors.lab_name = "Laboratory name is required";
    }

    const contactEmailErr = validateEmail(formData.contact_email, { required: true, fieldName: "Contact email" });
    if (contactEmailErr) newErrors.contact_email = contactEmailErr;

    const contactPhoneErr = validatePhone(formData.contact_phone, { required: false, fieldName: "Contact phone number" });
    if (contactPhoneErr) newErrors.contact_phone = contactPhoneErr;

    if (!formData.admin_first_name.trim()) {
      newErrors.admin_first_name = "Admin first name is required";
    }

    const adminEmailErr = validateEmail(formData.admin_email, { required: true, fieldName: "Admin email" });
    if (adminEmailErr) newErrors.admin_email = adminEmailErr;

    const adminPhoneErr = validatePhone(formData.admin_phone, { required: false, fieldName: "Admin phone number" });
    if (adminPhoneErr) newErrors.admin_phone = adminPhoneErr;

    if (!formData.status.trim()) {
      newErrors.status = "Status is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createAdminUserForLab = async (labId) => {
    try {
      const adminRoleData = {
        lab_id: labId,
        role_name: "admin",
        description: "Lab Administrator - Full control over lab operations"
      };

      const roleResponse = await api.post("/superadmin/roles", adminRoleData);

      let adminRoleId = null;
      if (roleResponse.data?.success) {
        adminRoleId = roleResponse.data.data.role_id;
      } else {
        return;
      }

      const adminUserData = {
        lab_id: labId,
        role_id: adminRoleId,
        first_name: formData.admin_first_name.trim(),
        last_name: formData.admin_last_name.trim(),
        email: formData.admin_email.trim().toLowerCase(),
        contact_no: formData.admin_phone ? formData.admin_phone.trim() : null,
        password: "Admin@123",
        is_verified: true,
        status: "active"
      };

      await api.post("/superadmin/users", adminUserData);
    } catch (error) {
      console.error("Error creating admin user:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!validateForm()) return;

    try {
      setLoading(true);

      const labData = {
        lab_name: formData.lab_name.trim(),
        contact_email: formData.contact_email.trim().toLowerCase(),
        contact_phone: formData.contact_phone ? formData.contact_phone.trim() : null,
        address: formData.address.trim(),
        admin_first_name: formData.admin_first_name.trim(),
        admin_last_name: formData.admin_last_name.trim(),
        admin_email: formData.admin_email.trim().toLowerCase(),
        admin_phone: formData.admin_phone ? formData.admin_phone.trim() : null,
        status: formData.status || "active",
      };

      const response = await api.post("/superadmin/labs", labData);

      if (response.data?.success) {
        setSuccessMessage("Laboratory tenant registered successfully!");

        if (response.data.message && response.data.message.includes("admin user not assigned")) {
          await createAdminUserForLab(response.data.data.lab_id);
        }

        setTimeout(() => navigate("/labs/manage"), 2000);
      } else {
        setErrorMessage(response.data?.message || "Failed to register laboratory");
      }
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Failed to create laboratory profile");
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  return (
    <MainLayout headerTitle="Register New Laboratory" headerSubtitle="Onboard a new laboratory tenant and configure administrative account">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate("/labs/manage")}>
          Back
        </Button>

        {/* Messages */}
        {successMessage && (
          <motion.div
            className="mb-5 flex items-center gap-3 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 mt-4"
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
            className="mb-5 flex items-center gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 mt-4"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DC2626]/10 text-[#DC2626]">
              <Info size={16} />
            </div>
            <p className="text-sm font-medium text-[#DC2626]">{errorMessage}</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="mt-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8 !overflow-visible">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Laboratory & Address details */}
              <div className="lg:col-span-2 space-y-6">

                {/* Laboratory Information */}
                <div>
                  <h3 className="text-sm font-bold text-[#1A2733] flex items-center gap-2 mb-4">
                    <Building2 size={16} className="text-[#3F6E8C]" />
                    Laboratory Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Laboratory Name"
                      name="lab_name"
                      value={formData.lab_name}
                      onChange={handleChange}
                      placeholder="e.g. SmartLab Geotechnical Services"
                      error={errors.lab_name}
                      required
                      icon={Building2}
                    />
                    <Input
                      label="Contact Email Address"
                      name="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={handleChange}
                      placeholder="info@smartlab.com"
                      error={errors.contact_email}
                      required
                      icon={Mail}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <Input
                      label="Contact Phone Number"
                      name="contact_phone"
                      type="tel"
                      value={formData.contact_phone}
                      onChange={handleChange}
                      placeholder="+91 98765 43210"
                      error={errors.contact_phone}
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
                    Address & Location
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label htmlFor="address" className="app-label text-xs font-bold text-gray-500 uppercase mb-1.5 block">Address</label>
                      <textarea
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Enter full laboratory facility street address..."
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#243744]/10 focus:border-[#243744] bg-white text-sm transition-all min-h-[90px]"
                      />
                    </div>
                    <Input
                      label="City"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="e.g. Ahmedabad"
                    />
                    <Input
                      label="State"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="e.g. Gujarat"
                    />
                    <Input
                      label="Postal Code / Pincode"
                      name="postal_code"
                      value={formData.postal_code}
                      onChange={handleChange}
                      placeholder="380001"
                    />
                    <Input
                      label="Country"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      placeholder="India"
                      icon={Globe}
                    />
                  </div>
                </div>

              </div>

              {/* Right Column - Lab Administrator Account (Owner) & Account Status */}
              <div className="space-y-6 lg:border-l lg:border-[#F1F5F9] lg:pl-8">

                {/* Lab Administrator Account (Owner) */}
                <div>
                  <h3 className="text-sm font-bold text-[#1A2733] flex items-center gap-2 mb-4">
                    <UserCheck size={16} className="text-[#3F6E8C]" />
                    Lab Administrator Account (Owner)
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Admin First Name"
                        name="admin_first_name"
                        value={formData.admin_first_name}
                        onChange={handleChange}
                        placeholder="e.g. Rajesh"
                        error={errors.admin_first_name}
                        required
                        icon={User}
                      />
                      <Input
                        label="Admin Last Name"
                        name="admin_last_name"
                        value={formData.admin_last_name}
                        onChange={handleChange}
                        placeholder="e.g. Patel"
                        icon={User}
                      />
                    </div>
                    <Input
                      label="Admin Login Email"
                      name="admin_email"
                      type="email"
                      value={formData.admin_email}
                      onChange={handleChange}
                      placeholder="admin@smartlab.com"
                      error={errors.admin_email}
                      required
                      icon={Mail}
                    />
                    <Input
                      label="Admin Phone Number"
                      name="admin_phone"
                      type="tel"
                      value={formData.admin_phone}
                      onChange={handleChange}
                      placeholder="+91 98765 00000"
                      error={errors.admin_phone}
                      icon={Phone}
                    />
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-[#F1F5F9]" />

                {/* Account Status */}
                <div>
                  <h3 className="text-sm font-bold text-[#1A2733] flex items-center gap-2 mb-4">
                    <Shield size={16} className="text-[#3F6E8C]" />
                    Status & Account Settings
                  </h3>
                  <div className="space-y-4">
                    <Select
                      label="Account Status"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      options={statusOptions}
                      error={errors.status}
                      required
                    />

                    <div>
                      <label htmlFor="description" className="app-label text-xs font-bold text-gray-500 uppercase mb-1.5 block">Laboratory Description / Overview</label>
                      <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Add optional operational notes or accreditation details..."
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#243744]/10 focus:border-[#243744] bg-white text-sm transition-all min-h-[100px]"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#F1F5F9] mt-8">
              <Button type="button" variant="secondary" onClick={() => navigate("/labs/manage")}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={loading}
                className="!bg-[#243744] hover:!bg-[#1A2733] !text-white font-bold px-6 py-2.5 rounded-xl shadow-xs"
              >
                Register Laboratory
              </Button>
            </div>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default AddLab;
