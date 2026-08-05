import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, User, Shield, ToggleLeft, Mail, Phone, Info,
  Lock, Eye, EyeOff, Sparkles, Copy, Check, CheckCircle2, Key
} from "lucide-react";
import { rolesAPI } from "../../api/roles";
import { usersAPI } from "../../api/users";
import { MainLayout } from "../../components/layout";
import {
  PageHeader, SectionCard, Input, Select, Button,
} from "../../components/ui";

const AddUser = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [roles, setRoles] = useState([]);
  const [errors, setErrors] = useState({});

  // Password Options Mode: "auto" vs "manual"
  const [passwordMode, setPasswordMode] = useState("auto");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Credentials display after creation
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role_id: "",
    password: "",
    confirmPassword: "",
    is_active: true,
  });

  useEffect(() => { fetchRoles(); }, []);

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

    if (passwordMode === "manual") {
      if (!formData.password) {
        newErrors.password = "Password is required";
      } else if (formData.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters";
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setCreatedCredentials(null);

    if (!validateForm()) return;

    try {
      setLoading(true);
      const userData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone || null,
        role_id: formData.role_id,
        is_active: formData.is_active,
        ...(passwordMode === "manual" ? { password: formData.password } : {})
      };

      const response = await usersAPI.createUser(userData);
      if (response.success) {
        const assignedPassword = response.data?.password || formData.password || "Auto-Generated";
        setSuccessMessage("User created successfully!");
        setCreatedCredentials({
          email: formData.email,
          password: assignedPassword
        });

        setFormData({
          first_name: "",
          last_name: "",
          email: "",
          phone: "",
          role_id: "",
          password: "",
          confirmPassword: "",
          is_active: true
        });

        setTimeout(() => navigate("/users"), 4000);
      } else {
        setErrorMessage(response.message || "Failed to create user");
      }
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = roles.map((r) => ({ value: r.role_id, label: r.role_name }));

  return (
    <MainLayout headerTitle="Create User" headerSubtitle="Create a new user account">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate("/users")}>
          Back
        </Button>

        {/* Credentials Copy Alert Banner when User Created */}
        {createdCredentials && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 to-emerald-100/50 p-5 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-950 font-extrabold text-sm">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <span>User Created & Password Ready!</span>
              </div>
              <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-200/80 px-2.5 py-0.5 rounded-full">
                Active Account
              </span>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-white p-4 space-y-2.5 text-xs shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="font-bold text-slate-500">Email Address:</span>
                <span className="font-bold text-[#243744]">{createdCredentials.email}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-500">Assigned Password:</span>
                <div className="flex items-center gap-2">
                  <span className="font-black text-[#243744] tracking-wider font-mono bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 text-sm">
                    {createdCredentials.password}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`Email: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2500);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#243744] hover:bg-[#1A2733] px-3 py-1.5 rounded-lg transition-colors shadow-xs"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copied ? "Copied Credentials!" : "Copy Login Info"}</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error Messages */}
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

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-5">
              <SectionCard
                title="Personal Information"
                description="Basic user identity and contact details"
                icon={User}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    placeholder="Enter first name"
                    error={errors.first_name}
                    required
                    icon={User}
                  />
                  <Input
                    label="Last Name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    placeholder="Enter last name"
                    error={errors.last_name}
                    required
                  />
                </div>
                <div className="mt-4">
                  <Input
                    label="Email Address"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="user@example.com"
                    error={errors.email}
                    required
                    icon={Mail}
                  />
                </div>
                <div className="mt-4">
                  <Input
                    label="Phone Number"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                    helperText="Optional — used for notifications"
                    icon={Phone}
                  />
                </div>
              </SectionCard>
            </div>

            {/* Right Column */}
            <div className="space-y-5">
              <SectionCard
                title="Account Role"
                description="Role assignment and access level"
                icon={Shield}
                className="!overflow-visible"
              >
                <Select
                  label="Role"
                  name="role_id"
                  value={formData.role_id}
                  onChange={handleChange}
                  options={roleOptions}
                  placeholder="Select a role"
                  error={errors.role_id}
                  loading={rolesLoading}
                  required
                />
              </SectionCard>

              {/* Password Option Toggle Card */}
              <SectionCard
                title="Password Configuration"
                description="Choose auto-generation or type a custom password"
                icon={Key}
              >
                {/* Mode Selector Tabs */}
                <div className="flex rounded-xl bg-slate-100 p-1 mb-4 border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordMode("auto");
                      setFormData((prev) => ({ ...prev, password: "", confirmPassword: "" }));
                      setErrors((prev) => ({ ...prev, password: "", confirmPassword: "" }));
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${passwordMode === "auto" ? "bg-white text-[#243744] shadow-xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    <Sparkles size={14} className={passwordMode === "auto" ? "text-amber-500" : ""} />
                    <span>Auto-Generate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPasswordMode("manual")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${passwordMode === "manual" ? "bg-white text-[#243744] shadow-xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    <Lock size={14} className={passwordMode === "manual" ? "text-[#243744]" : ""} />
                    <span>Custom Password</span>
                  </button>
                </div>

                {passwordMode === "auto" ? (
                  <div className="rounded-xl border border-[#D1E2FF] bg-[#F3F7FF] p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#243744]/10 text-[#243744]">
                        <Info size={16} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[#1C2D37]">Auto-Generated Mode</h4>
                        <p className="mt-1 text-xs text-[#57687A] leading-relaxed">
                          A 12-character random secure password will be generated automatically and displayed for you to copy.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 pt-1">
                    <div className="relative">
                      <Input
                        label="Password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Enter custom password"
                        error={errors.password}
                        required
                        icon={Lock}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-[38px] text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    <div className="relative">
                      <Input
                        label="Confirm Password"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Re-enter custom password"
                        error={errors.confirmPassword}
                        required
                        icon={Lock}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-[38px] text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="User Status"
                description="Control user access to the system"
                icon={ToggleLeft}
              >
                <div className="flex items-center justify-between">
                  <label htmlFor="is_active" className="text-sm font-medium text-[#3D4F5F] cursor-pointer">
                    Active User
                  </label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.is_active}
                    onClick={() => setFormData((prev) => ({ ...prev, is_active: !prev.is_active }))}
                    className={`app-toggle ${formData.is_active ? "app-toggle-checked" : "app-toggle-unchecked"}`}
                  >
                    <span className={`app-toggle-knob ${formData.is_active ? "app-toggle-knob-checked" : "app-toggle-knob-unchecked"}`} />
                  </button>
                </div>
                <p className="mt-2 text-xs text-[#8A97A4]">
                  Active users can log in and access the system
                </p>
              </SectionCard>
            </div>
          </div>

          {/* Actions */}
          <motion.div
            className="mt-6 flex justify-end gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button variant="secondary" onClick={() => navigate("/users")}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={loading || rolesLoading}
              className="!bg-[#243744] hover:!bg-[#1A2733] text-white font-bold"
            >
              {loading ? "Creating User..." : "Create User"}
            </Button>
          </motion.div>
        </form>
      </div>
    </MainLayout>
  );
};

export default AddUser;
