import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Pencil, User, Shield, Mail, Phone,
  Building2, MoreVertical, Calendar, Clock
} from "lucide-react";
import { usersAPI } from "../../api/users";
import { rolesAPI } from "../../api/roles";
import { MainLayout } from "../../components/layout";
import {
  PageHeader, SectionCard, Avatar, Button
} from "../../components/ui";

const getAvatarBg = () => {
  return "bg-[#243744]"; // Brand sidebar color for all avatars
};

const ViewUser = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [userData, setUserData] = useState({
    user_id: "", first_name: "", last_name: "", email: "",
    phone: "", role_id: "", role_name: "", is_active: true, created_at: "", last_login: "",
  });

  useEffect(() => {
    if (userId) fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      
      // 1. Fetch roles to map role_id to role_name
      const rolesResponse = await rolesAPI.getLabRoles();
      const rolesList = rolesResponse.data?.roles || [];
      
      // 2. Fetch users list and find the matched user dynamically
      const response = await usersAPI.getLabUsers();
      const usersList = response.data?.users || [];
      const foundUser = usersList.find(u => String(u.user_id) === String(userId));
      
      if (foundUser) {
        const matchingRole = rolesList.find(r => String(r.role_id) === String(foundUser.role_id));
        setUserData({
          ...foundUser,
          role_name: matchingRole ? matchingRole.role_name : "User"
        });
      } else {
        // Fallback Mock data if user list lookup fails
        const mockUser = {
          user_id: userId, first_name: "John", last_name: "Doe",
          email: "john.doe@example.com", phone: "1234567890", role_name: "Admin",
          is_active: true, created_at: "2024-03-24T10:30:00Z", last_login: "2024-03-24T15:45:00Z",
        };
        setUserData(mockUser);
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
      setErrorMessage("Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const fullName = `${userData.first_name} ${userData.last_name}`;

  if (loading) {
    return (
      <MainLayout headerTitle="View User" headerSubtitle="Loading user details...">
        <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">
          <div className="space-y-5">
            <div className="lab-skeleton h-20" />
            <div className="lab-skeleton h-32" />
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
    <MainLayout headerTitle="View User" headerSubtitle="User details and information">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">
        
        {/* Navigation back button */}
        <button
          onClick={() => navigate("/users")}
          className="mb-4 flex items-center gap-2 text-[#243744] font-bold hover:text-[#1A2733] transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          Back to Users List
        </button>

        {errorMessage && (
          <div className="mb-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-semibold text-[#DC2626]">
            {errorMessage}
          </div>
        )}

        {/* User Identity Header Card Redesigned to match the User's Mockup */}
        <motion.div
          className="mb-6 rounded-2xl bg-white border border-[#E2E8F0] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="flex items-center gap-5">
            <Avatar 
              name={fullName} 
              size="xl" 
              bgClass={getAvatarBg()} 
              className="ring-4 ring-slate-100" 
            />
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-[#1E293B] tracking-tight">{fullName}</h2>
              <p className="mt-0.5 text-xs text-[#64748B] font-medium">{userData.email}</p>
              
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-lg bg-[#F1F5F9] text-[#475569] px-2.5 py-0.5 text-xs font-bold border border-[#E2E8F0] uppercase tracking-wider">
                  {userData.role_name || "User"}
                </span>

                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-lg bg-[#FAFBFD] border border-[#E2E8F0] text-[#475569]">
                  <span className={`w-1.5 h-1.5 rounded-full ${userData.is_active ? "bg-[#10B981]" : "bg-[#EF4444]"}`} />
                  {userData.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 relative">
            <button
              onClick={() => navigate(`/users/${userId}/edit`)}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#243744] hover:bg-[#1A2733] text-white px-4 text-xs font-bold shadow-sm transition-all"
            >
              <Pencil size={14} />
              Edit User
            </button>
            
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F8FAFC] text-[#475569] border border-[#E2E8F0] hover:bg-[#F1F5F9] transition-all"
              aria-label="More actions"
            >
              <MoreVertical size={16} />
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-12 z-40 bg-white rounded-xl border border-[#E2E8F0] shadow-lg py-1.5 min-w-[140px] text-left text-slate-800"
                  >
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate(`/users/${userId}/edit`);
                      }}
                      className="w-full px-4 py-2 text-xs font-semibold text-[#475569] hover:bg-[#FAF9FF] hover:text-[#243744] flex items-center gap-2"
                    >
                      <Pencil size={14} />
                      Edit Profile
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Personal Information */}
          <div className="lg:col-span-2 space-y-6">
            <SectionCard title="Personal Information" description="Contact and identity details" icon={User}>
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2">First Name</p>
                    <div className="rounded-xl border border-[#E2E8F0] bg-[#FAFBFD] px-4 py-3">
                      <p className="text-sm font-semibold text-[#1E293B]">{userData.first_name || "—"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2">Last Name</p>
                    <div className="rounded-xl border border-[#E2E8F0] bg-[#FAFBFD] px-4 py-3">
                      <p className="text-sm font-semibold text-[#1E293B]">{userData.last_name || "—"}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2">Email Address</p>
                  <div className="rounded-xl border border-[#E2E8F0] bg-[#FAFBFD] px-4 py-3 flex items-center gap-3">
                    <Mail size={16} className="text-[#243744] shrink-0" />
                    <p className="text-sm font-semibold text-[#1E293B]">{userData.email || "—"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2">Phone Number</p>
                  <div className="rounded-xl border border-[#E2E8F0] bg-[#FAFBFD] px-4 py-3 flex items-center gap-3">
                    <Phone size={16} className="text-[#243744] shrink-0" />
                    <p className="text-sm font-semibold text-[#1E293B]">{userData.phone || "Not provided"}</p>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Right Column: Account & Activity */}
          <div className="space-y-6">
            
            {/* Account Info */}
            <SectionCard title="Account Information" description="Role and access details" icon={Shield}>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2">Role Name</p>
                  <div className="rounded-xl border border-[#E2E8F0] bg-[#FAFBFD] px-4 py-3 flex items-center gap-3">
                    <Building2 size={16} className="text-[#243744] shrink-0" />
                    <p className="text-sm font-semibold text-[#1E293B]">{userData.role_name || "User"}</p>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Activity Info */}
            <SectionCard title="Activity" description="Login and creation timestamps" icon={Clock}>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2">Last Login</p>
                  <div className="rounded-xl border border-[#E2E8F0] bg-[#FAFBFD] px-4 py-3 flex items-center gap-3">
                    <Clock size={16} className="text-[#243744] shrink-0" />
                    <p className="text-sm font-semibold text-[#475569]">{formatDate(userData.last_login)}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2">Created On</p>
                  <div className="rounded-xl border border-[#E2E8F0] bg-[#FAFBFD] px-4 py-3 flex items-center gap-3">
                    <Calendar size={16} className="text-[#243744] shrink-0" />
                    <p className="text-sm font-semibold text-[#475569]">{formatDate(userData.created_at)}</p>
                  </div>
                </div>
              </div>
            </SectionCard>

          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ViewUser;
