import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Pencil, User, Shield, Mail, Phone,
  Building2, MoreVertical, Calendar, Clock,
} from "lucide-react";
import { usersAPI } from "../../api/users";
import { MainLayout } from "../../components/layout";
import {
  PageHeader, SectionCard, Badge, Avatar, Button, ActionDropdown,
} from "../../components/ui";

const ViewUser = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [userData, setUserData] = useState({
    user_id: "", first_name: "", last_name: "", email: "",
    phone: "", role_name: "", is_active: true, created_at: "", last_login: "",
  });

  useEffect(() => {
    if (userId) fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      // TODO: Create getUser API endpoint
      const mockUser = {
        user_id: userId, first_name: "John", last_name: "Doe",
        email: "john.doe@example.com", phone: "1234567890", role_name: "Admin",
        is_active: true, created_at: "2024-03-24T10:30:00Z", last_login: "2024-03-24T15:45:00Z",
      };
      setUserData(mockUser);
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
        <PageHeader
          title="User Profile"
          subtitle="View detailed user information"
          icon="user"
          backButton={
            <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate("/users")}>
              Back to Users
            </Button>
          }
          actions={
            <div className="flex items-center gap-2">
              <Button variant="primary" icon={Pencil} onClick={() => navigate(`/users/${userId}/edit`)}>
                Edit User
              </Button>
              <ActionDropdown
                open={dropdownOpen}
                onOpenChange={setDropdownOpen}
                trigger={
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="app-icon-button"
                    aria-label="More actions"
                  >
                    <MoreVertical size={18} />
                  </button>
                }
                items={[
                  { label: "Edit Profile", icon: Pencil, onClick: () => navigate(`/users/${userId}/edit`) },
                ]}
              />
            </div>
          }
        />

        {errorMessage && (
          <motion.div
            className="mb-5 flex items-center gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-sm font-medium text-[#DC2626]">{errorMessage}</p>
          </motion.div>
        )}

        {/* User Identity Card */}
        <motion.div
          className="mb-5 app-section-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar name={fullName} size="xl" />
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold text-[#1A2733] tracking-tight">{fullName}</h2>
              <p className="mt-1 text-sm text-[#8A97A4]">{userData.email}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant={userData.is_active ? "success" : "danger"} dot>
                  {userData.is_active ? "Active" : "Inactive"}
                </Badge>
                <Badge variant="info">
                  {userData.role_name}
                </Badge>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <SectionCard title="Personal Information" description="Contact and identity details" icon={User}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#8A97A4] mb-1.5">First Name</p>
                    <div className="rounded-xl border border-[#E2E6EB] bg-[#FAFBFC] px-4 py-3">
                      <p className="text-sm font-medium text-[#1A2733]">{userData.first_name}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#8A97A4] mb-1.5">Last Name</p>
                    <div className="rounded-xl border border-[#E2E6EB] bg-[#FAFBFC] px-4 py-3">
                      <p className="text-sm font-medium text-[#1A2733]">{userData.last_name}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#8A97A4] mb-1.5">Email Address</p>
                  <div className="rounded-xl border border-[#E2E6EB] bg-[#FAFBFC] px-4 py-3 flex items-center gap-2.5">
                    <Mail size={16} className="text-[#8A97A4] shrink-0" />
                    <p className="text-sm font-medium text-[#1A2733]">{userData.email}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#8A97A4] mb-1.5">Phone Number</p>
                  <div className="rounded-xl border border-[#E2E6EB] bg-[#FAFBFC] px-4 py-3 flex items-center gap-2.5">
                    <Phone size={16} className="text-[#8A97A4] shrink-0" />
                    <p className="text-sm font-medium text-[#1A2733]">{userData.phone || "Not provided"}</p>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="space-y-5">
            <SectionCard title="Account Information" description="Role and access details" icon={Shield}>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#8A97A4] mb-1.5">Role</p>
                  <div className="rounded-xl border border-[#E2E6EB] bg-[#FAFBFC] px-4 py-3 flex items-center gap-2.5">
                    <Building2 size={16} className="text-[#8A97A4] shrink-0" />
                    <p className="text-sm font-medium text-[#1A2733]">{userData.role_name}</p>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Activity" description="Login and creation timestamps" icon={Clock}>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#8A97A4] mb-1.5">Last Login</p>
                  <div className="rounded-xl border border-[#E2E6EB] bg-[#FAFBFC] px-4 py-3 flex items-center gap-2.5">
                    <Clock size={16} className="text-[#8A97A4] shrink-0" />
                    <p className="text-sm text-[#57687A]">{formatDate(userData.last_login)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#8A97A4] mb-1.5">Created</p>
                  <div className="rounded-xl border border-[#E2E6EB] bg-[#FAFBFC] px-4 py-3 flex items-center gap-2.5">
                    <Calendar size={16} className="text-[#8A97A4] shrink-0" />
                    <p className="text-sm text-[#57687A]">{formatDate(userData.created_at)}</p>
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
