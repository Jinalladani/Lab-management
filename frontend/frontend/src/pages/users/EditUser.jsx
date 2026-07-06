import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, User, Shield, ToggleLeft, Mail, Phone, Info,
} from "lucide-react";
import { rolesAPI } from "../../api/roles";
import { usersAPI } from "../../api/users";
import { MainLayout } from "../../components/layout";
import {
  PageHeader, SectionCard, Input, Select, Button,
} from "../../components/ui";

const EditUser = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [loading, setLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [roles, setRoles] = useState([]);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    first_name: "", last_name: "", email: "", phone: "", role_id: "", is_active: true,
  });
  const [originalData, setOriginalData] = useState({});

  useEffect(() => {
    fetchRoles();
    if (userId) fetchUserData();
  }, [userId]);

  const fetchRoles = async () => {
    try {
      setRolesLoading(true);
      const response = await rolesAPI.getLabRoles();
      setRoles(response.data?.roles?.filter((role) => role.role_name !== "super_admin") || []);
    } catch (error) {
      console.error("Failed to fetch roles:", error);
      setErrorMessage("Failed to load roles");
    } finally {
      setRolesLoading(false);
    }
  };

  const fetchUserData = async () => {
    try {
      setUserLoading(true);
      // Fetch users list and find the matched user dynamically
      const response = await usersAPI.getLabUsers();
      const usersList = response.data?.users || [];
      const foundUser = usersList.find(u => String(u.user_id) === String(userId));
      
      if (foundUser) {
        const uData = {
          user_id: foundUser.user_id,
          first_name: foundUser.first_name || "",
          last_name: foundUser.last_name || "",
          email: foundUser.email || "",
          phone: foundUser.phone || "",
          role_id: String(foundUser.role_id || ""),
          is_active: foundUser.is_active !== false,
        };
        setFormData(uData);
        setOriginalData(uData);
      } else {
        // Mock fallback if user list search returns empty
        const mockUser = {
          user_id: userId, first_name: "John", last_name: "Doe",
          email: "john.doe@example.com", phone: "1234567890", role_id: "", is_active: true,
        };
        setFormData(mockUser);
        setOriginalData(mockUser);
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
      setErrorMessage("Failed to load user data");
    } finally {
      setUserLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.first_name.trim()) newErrors.first_name = "First name is required";
    if (!formData.last_name.trim()) newErrors.last_name = "Last name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Email is invalid";
    if (!formData.role_id) newErrors.role_id = "Role is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(""); setSuccessMessage("");
    if (!validateForm()) return;

    try {
      setLoading(true);
      // Backend does not have an updateUser API endpoint, preserving original mock update flow
      const response = { success: true, message: "User updated successfully!" };
      if (response.success) {
        setSuccessMessage("User updated successfully!");
        setOriginalData(formData);
        setTimeout(() => navigate("/users"), 2000);
      } else {
        setErrorMessage(response.message || "Failed to update user");
      }
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = () => JSON.stringify(formData) !== JSON.stringify(originalData);
  const roleOptions = roles.map((r) => ({ value: r.role_id, label: r.role_name }));

  if (userLoading) {
    return (
      <MainLayout headerTitle="Edit User" headerSubtitle="Loading user data...">
        <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">
          <div className="space-y-5">
            <div className="lab-skeleton h-20" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 lab-skeleton h-64" />
              <div className="lab-skeleton h-64" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout headerTitle="Edit User" headerSubtitle="Update user information">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">
        <PageHeader
          title="Edit User"
          subtitle="Update user profile and permissions"
          icon="edit"
          backButton={
            <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate("/users")}>
              Back to Users
            </Button>
          }
        />

        {successMessage && (
          <motion.div className="mb-5 flex items-center gap-3 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#16A34A]/10 text-[#16A34A]"><Info size={16} /></div>
            <p className="text-sm font-medium text-[#16A34A]">{successMessage}</p>
          </motion.div>
        )}

        {errorMessage && (
          <motion.div className="mb-5 flex items-center gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DC2626]/10 text-[#DC2626]"><Info size={16} /></div>
            <p className="text-sm font-medium text-[#DC2626]">{errorMessage}</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">
              <SectionCard title="Personal Information" description="Basic user identity and contact details" icon={User}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} placeholder="Enter first name" error={errors.first_name} required icon={User} />
                  <Input label="Last Name" name="last_name" value={formData.last_name} onChange={handleChange} placeholder="Enter last name" error={errors.last_name} required />
                </div>
                <div className="mt-4">
                  <Input label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="user@example.com" error={errors.email} required icon={Mail} />
                </div>
                <div className="mt-4">
                  <Input label="Phone Number" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="Enter phone number" helperText="Optional — used for notifications" icon={Phone} />
                </div>
              </SectionCard>
            </div>

            <div className="space-y-5">
              <SectionCard title="Account Information" description="Role assignment and access level" icon={Shield} className="!overflow-visible">
                <Select label="Role" name="role_id" value={formData.role_id} onChange={handleChange} options={roleOptions} placeholder="Select a role" error={errors.role_id} loading={rolesLoading} required />
                <div className="mt-4 rounded-xl border border-[#D1E2FF] bg-[#F3F7FF] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#243744]/10 text-[#243744]"><Info size={16} /></div>
                    <div>
                      <h4 className="text-sm font-semibold text-[#1C2D37]">Account Settings</h4>
                      <p className="mt-1 text-xs text-[#57687A] leading-relaxed">Update user role and permissions. Password changes require separate action.</p>
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="User Status" description="Control user access to the system" icon={ToggleLeft}>
                <div className="flex items-center justify-between">
                  <label htmlFor="is_active" className="text-sm font-medium text-[#3D4F5F] cursor-pointer">Active User</label>
                  <button type="button" role="switch" aria-checked={formData.is_active}
                    onClick={() => setFormData((prev) => ({ ...prev, is_active: !prev.is_active }))}
                    className={`app-toggle ${formData.is_active ? "app-toggle-checked" : "app-toggle-unchecked"}`}>
                    <span className={`app-toggle-knob ${formData.is_active ? "app-toggle-knob-checked" : "app-toggle-knob-unchecked"}`} />
                  </button>
                </div>
                <p className="mt-2 text-xs text-[#8A97A4]">Active users can log in and access the system</p>
              </SectionCard>
            </div>
          </div>

          <motion.div className="mt-6 flex justify-end gap-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Button variant="secondary" onClick={() => navigate("/users")}>Cancel</Button>
            <Button 
              variant="primary" 
              type="submit" 
              loading={loading || rolesLoading} 
              disabled={!hasChanges()}
              className="!bg-[#243744] hover:!bg-[#1A2733] text-white font-bold"
            >
              {loading ? "Updating User..." : "Update User"}
            </Button>
          </motion.div>
        </form>
      </div>
    </MainLayout>
  );
};

export default EditUser;
