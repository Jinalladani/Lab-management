import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Area, AreaChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { MainLayout } from "../components/layout";
import {
  Briefcase, FlaskConical, Users, Clock, Building2,
  TrendingUp, TrendingDown, ArrowRight, Activity,
} from "lucide-react";
import Icon from "../components/ui/LucideIcon";
import { getDashboardData } from "../api/dashboard";

const getRoleTitle = (role) => {
  if (!role) return "User";
  const formattedRole = role.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  switch (role.toLowerCase()) {
    case "super_admin": return "Super Admin";
    case "admin": return "Admin";
    case "qm": return "QM";
    case "eng": return "Engineer";
    case "lab_admin": return "Lab Admin";
    case "lab_manager": return "Lab Manager";
    case "quality_manager": return "Quality Manager";
    case "test_engineer": return "Test Engineer";
    default: return formattedRole || "User";
  }
};

const useCountUp = (value) => {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    const target = Number(value) || 0;
    const duration = 700;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    const frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return displayValue;
};

const stagger = {
  container: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06 } },
  },
  item: {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 0.68, 0, 1] } },
  },
};

const Workspace = ({ children }) => (
  <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">
    <div className="app-workspace-shell">{children}</div>
  </div>
);

const iconMap = {
  briefcase: Briefcase,
  flask: FlaskConical,
  users: Users,
  timer: Clock,
  building: Building2,
  user: Users,
};

const StatTile = ({ label, value, icon, tone = "info", caption, trend = "up" }) => {
  const count = useCountUp(value);
  const IconComp = iconMap[icon] || Briefcase;
  const TrendIcon = trend === "down" ? TrendingDown : TrendingUp;

  return (
    <motion.article
      className={`lab-stat-tile lab-stat-${tone}`}
      variants={stagger.item}
      whileHover={{ y: -3, boxShadow: "0 16px 40px rgba(0,0,0,0.08)" }}
      transition={{ duration: 0.2 }}
    >
      <div className="lab-stat-head flex items-start justify-between gap-4">
        <div>
          <p className="lab-overline lab-stat-label">{label}</p>
          <div className="mt-2.5 flex items-end gap-3">
            <span className="lab-stat-number">{count.toLocaleString()}</span>
            <span className={`lab-trend ${trend === "down" ? "lab-trend-danger" : "lab-trend-success"}`}>
              <TrendIcon size={14} />
              {caption}
            </span>
          </div>
        </div>
        <div className="lab-stat-icon">
          <IconComp size={20} strokeWidth={2} />
        </div>
      </div>
      <div className="lab-stat-body">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[#667684]">
          <span>Progress</span>
          <span>{Math.min(88, Math.max(20, Number(value) * 8 || 28))}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-[#EDF0F3]">
          <div className="lab-meter-fill" style={{ width: `${Math.min(88, Math.max(20, Number(value) * 8 || 28))}%` }} />
        </div>
      </div>
    </motion.article>
  );
};

const SectionHeader = ({ eyebrow, title, meta }) => (
  <div className="mb-5 flex items-end justify-between gap-4">
    <div>
      <p className="lab-overline">{eyebrow}</p>
      <h2 className="mt-1 text-lg font-bold text-[#1A2733] tracking-tight">{title}</h2>
    </div>
    {meta && <p className="hidden text-sm text-[#8A97A4] sm:block">{meta}</p>}
  </div>
);

const ActionRow = ({ title, description, icon, onClick }) => (
  <motion.button
    type="button"
    onClick={onClick}
    className="group lab-action-row"
    whileHover={{ y: -2, boxShadow: "0 12px 30px rgba(0,0,0,0.07)" }}
    transition={{ duration: 0.18 }}
  >
    <span className="lab-action-icon">
      <Icon name={icon} size={18} strokeWidth={2} />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-semibold text-[#1A2733]">{title}</span>
      <span className="block truncate text-xs text-[#8A97A4]">{description}</span>
    </span>
    <ArrowRight size={15} className="text-[#CDD4DB] transition-transform duration-200 group-hover:translate-x-1" />
  </motion.button>
);

const activityIconMap = { project: "briefcase", sample: "flask", client: "users" };

const ActivityRow = ({ type, title, time, status, index }) => (
  <div className="lab-activity-row" style={{ animationDelay: `${index * 55}ms` }}>
    <div className="lab-activity-marker">
      <Icon name={activityIconMap[type] || "activity"} size={16} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-semibold text-[#1A2733]">{title}</p>
      <p className="mt-0.5 text-xs text-[#8A97A4]">{time}</p>
    </div>
    <span className="lab-badge lab-badge-success">{status || "updated"}</span>
  </div>
);

const DataList = ({ items, emptyText, renderItem }) => (
  <div className="space-y-2">
    {items.length ? items.map(renderItem) : (
      <div className="lab-empty-state">{emptyText}</div>
    )}
  </div>
);

const Home = () => {
  const [stats, setStats] = useState({
    totalProjects: 0, totalSamples: 0, totalClients: 0,
    totalLabs: 0, totalUsers: 0, pendingTests: 0,
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [testStatusData, setTestStatusData] = useState([]);
  const [labStats, setLabStats] = useState([]);
  const [roleDistribution, setRoleDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  }, []);

  const isSuperAdmin = user?.role === "superadmin" || user?.role === "super_admin";
  const roleTitle = getRoleTitle(user?.role);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true); setError(null);
      const response = await getDashboardData();
      const data = response.data.data;
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

      if (currentUser.role === "superadmin" || currentUser.role === "super_admin") {
        setStats({ totalLabs: data.stats?.totalLabs || 0, totalUsers: data.stats?.totalUsers || 0, totalProjects: data.stats?.totalProjects || 0, totalClients: data.stats?.totalClients || 0 });
        setLabStats(data.labStats || []);
        setRoleDistribution(data.roleDistribution || []);
      } else {
        setStats({ totalProjects: data.stats?.totalProjects || 0, totalSamples: data.stats?.totalSamples || 0, totalClients: data.stats?.totalClients || 0, pendingTests: data.stats?.pendingTests || 0 });
        setMonthlyData(data.monthlyData || []);
        setTestStatusData(data.testStatusData || []);
      }
      setRecentActivities(data.recentActivities || []);
    } catch (fetchError) {
      console.error("Error fetching dashboard data:", fetchError);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const statsConfig = isSuperAdmin
    ? [
        { label: "Labs", value: stats.totalLabs, icon: "building", caption: "Network", tone: "primary" },
        { label: "Users", value: stats.totalUsers, icon: "users", caption: "Workforce", tone: "info" },
        { label: "Projects", value: stats.totalProjects, icon: "briefcase", caption: "Portfolio", tone: "secondary" },
        { label: "Clients", value: stats.totalClients, icon: "user", caption: "Accounts", tone: "success" },
      ]
    : [
        { label: "Projects", value: stats.totalProjects, icon: "briefcase", caption: "Active", tone: "primary" },
        { label: "Samples", value: stats.totalSamples, icon: "flask", caption: "Registered", tone: "info" },
        { label: "Clients", value: stats.totalClients, icon: "users", caption: "Accounts", tone: "secondary" },
        { label: "Pending", value: stats.pendingTests, icon: "timer", caption: "Attention", trend: "down", tone: "danger" },
      ];

  const quickActions = [
    { title: "New Project", description: "Start a testing engagement", icon: "briefcase", onClick: () => navigate("/projects/add") },
    { title: "Register Sample", description: "Open sample intake", icon: "flask", onClick: () => navigate("/samples/add") },
    { title: "Add Client", description: "Create a lab account", icon: "users", onClick: () => navigate("/labClients/add") },
    { title: "Reports", description: "Review published output", icon: "fileText", onClick: () => navigate("/reports") },
  ];

  if (loading) {
    return (
      <MainLayout headerTitle={`${roleTitle} Dashboard`} headerSubtitle="Loading operational workspace">
        <Workspace>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => <div key={item} className="lab-skeleton h-32" />)}
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-12">
            <div className="lab-skeleton h-96 xl:col-span-8" />
            <div className="lab-skeleton h-96 xl:col-span-4" />
          </div>
        </Workspace>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout headerTitle={`${roleTitle} Dashboard`} headerSubtitle="Telemetry unavailable">
        <Workspace>
          <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E2E6EB] bg-white text-[#DC2626]"
              style={{ boxShadow: "var(--shadow-sm)" }}>
              <Activity size={24} />
            </div>
            <h2 className="text-xl font-bold text-[#1A2733]">{error}</h2>
            <p className="mt-2 max-w-xl text-sm text-[#8A97A4]">
              Dashboard data could not be loaded. Navigation and session state are still available.
            </p>
            <motion.button
              type="button"
              onClick={fetchDashboardData}
              className="app-button app-button-primary mt-6"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              Retry
            </motion.button>
          </div>
        </Workspace>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      headerTitle={`${roleTitle} Dashboard`}
      headerSubtitle={isSuperAdmin ? "Network operations command center" : "Projects, samples, tests, and reports"}
    >
      <Workspace>
        {/* Stats */}
        <motion.section
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
          variants={stagger.container}
          initial="hidden"
          animate="visible"
        >
          {statsConfig.map((item) => (
            <StatTile key={item.label} {...item} />
          ))}
        </motion.section>

        {/* Charts & Actions */}
        {isSuperAdmin ? (
          <section className="mt-5 grid gap-4 xl:grid-cols-12">
            <motion.div className="lab-panel xl:col-span-7" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.3 }}>
              <SectionHeader eyebrow="Network" title="Top Labs" meta="Projects and samples by laboratory" />
              <DataList
                items={labStats}
                emptyText="No lab analytics available yet."
                renderItem={(lab, index) => (
                  <div key={index} className="lab-data-row">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#1A2733]">{lab.name}</p>
                      <p className="text-xs text-[#8A97A4]">Operational throughput</p>
                    </div>
                    <div className="flex gap-3 text-sm font-semibold text-[#3F6E8C]">
                      <span>{lab.projects} projects</span>
                      <span>{lab.samples} samples</span>
                    </div>
                  </div>
                )}
              />
            </motion.div>

            <motion.div className="lab-panel xl:col-span-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.3 }}>
              <SectionHeader eyebrow="Access" title="User Distribution" meta="Active roles" />
              <DataList
                items={roleDistribution}
                emptyText="No role distribution data available."
                renderItem={(role, index) => (
                  <div key={index} className="lab-data-row">
                    <span className="text-sm font-semibold capitalize text-[#1A2733]">{role.role}</span>
                    <span className="lab-badge">{role.count}</span>
                  </div>
                )}
              />
            </motion.div>
          </section>
        ) : (
          <section className="mt-5 grid gap-4 xl:grid-cols-12">
            <motion.div className="lab-panel lab-panel-prominent xl:col-span-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.3 }}>
              <SectionHeader eyebrow="Throughput" title="Monthly Movement" meta="Projects and samples" />
              <div className="h-[320px]">
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid stroke="#EDF0F3" strokeDasharray="4 4" />
                      <XAxis dataKey="month" stroke="#8A97A4" tickLine={false} axisLine={{ stroke: "#E2E6EB" }} fontSize={12} />
                      <YAxis stroke="#8A97A4" tickLine={false} axisLine={{ stroke: "#E2E6EB" }} fontSize={12} />
                      <Tooltip contentStyle={{ border: "1px solid #E2E6EB", borderRadius: "12px", boxShadow: "0 16px 40px rgba(0,0,0,0.1)", fontSize: 13 }} />
                      <Line type="monotone" dataKey="projects" stroke="#243744" strokeWidth={2.4} dot={{ r: 4, fill: "#243744" }} activeDot={{ r: 6 }} name="Projects" animationDuration={900} />
                      <Line type="monotone" dataKey="samples" stroke="#16A34A" strokeWidth={2.4} dot={{ r: 4, fill: "#16A34A" }} activeDot={{ r: 6 }} name="Samples" animationDuration={900} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="lab-empty-state h-full">No monthly trend data available.</div>
                )}
              </div>
            </motion.div>

            <motion.div className="lab-panel xl:col-span-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.3 }}>
              <SectionHeader eyebrow="Actions" title="Fast Workflows" meta="Primary tasks" />
              <div className="space-y-2">
                {quickActions.map((action) => <ActionRow key={action.title} {...action} />)}
              </div>
            </motion.div>
          </section>
        )}

        {/* Bottom Section */}
        <section className="mt-5 grid gap-4 xl:grid-cols-12">
          <motion.div className="lab-panel xl:col-span-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.3 }}>
            <SectionHeader eyebrow="Quality" title="Test Status" meta="Current queue" />
            <div className="h-[260px]">
              {testStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={testStatusData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid stroke="#EDF0F3" strokeDasharray="4 4" />
                    <XAxis dataKey="name" stroke="#8A97A4" tickLine={false} axisLine={{ stroke: "#E2E6EB" }} fontSize={12} />
                    <YAxis stroke="#8A97A4" tickLine={false} axisLine={{ stroke: "#E2E6EB" }} fontSize={12} />
                    <Tooltip contentStyle={{ border: "1px solid #E2E6EB", borderRadius: "12px", boxShadow: "0 16px 40px rgba(0,0,0,0.1)", fontSize: 13 }} />
                    <Area type="monotone" dataKey="value" stroke="#3F6E8C" fill="#EDF0F3" strokeWidth={2.2} animationDuration={900} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="lab-empty-state h-full">No status breakdown available.</div>
              )}
            </div>
          </motion.div>

          <motion.div className="lab-panel xl:col-span-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.3 }}>
            <SectionHeader eyebrow="Timeline" title="Recent Operational Activity" meta="Latest system movement" />
            <div className="lab-activity-stream">
              {recentActivities.length ? (
                recentActivities.map((activity, index) => (
                  <ActivityRow key={index} index={index} {...activity} />
                ))
              ) : (
                <div className="lab-empty-state">No recent activity yet.</div>
              )}
            </div>
          </motion.div>
        </section>
      </Workspace>
    </MainLayout>
  );
};

export default Home;
