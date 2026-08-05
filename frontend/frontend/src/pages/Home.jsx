import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import { MainLayout } from "../components/layout";
import {
  Briefcase, FlaskConical, Users, Clock, Building2,
  TrendingUp, ArrowRight, Activity, RefreshCw, CheckCircle2,
  FileText, TestTube, CheckSquare, Sparkles, ArrowUpRight,
  ShieldCheck, Layers, PieChart as PieIcon, BarChart3, TrendingUp as TrendIcon,
  Inbox, UserCheck, Shield, KeyRound, History, ListOrdered, Award, Zap, Gauge
} from "lucide-react";
import { getDashboardData } from "../api/dashboard";

const getRoleTitle = (role) => {
  if (!role) return "Lab Admin";
  const formattedRole = role.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  switch (role.toLowerCase()) {
    case "super_admin":
    case "superadmin":
      return "Super Admin";
    case "admin": return "Client Admin / Lab Manager";
    case "qm": return "Quality Manager";
    case "eng": return "Test Engineer";
    case "lab_admin": return "Lab Administrator";
    case "lab_manager": return "Lab Operations Manager";
    case "quality_manager": return "Quality Manager";
    case "test_engineer": return "Test Engineer";
    default: return formattedRole || "Lab Admin";
  }
};

const useCountUp = (value) => {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    const target = Number(value) || 0;
    const duration = 600;
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
    visible: { transition: { staggerChildren: 0.05 } },
  },
  item: {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 0.68, 0, 1] } },
  },
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md p-3.5 shadow-xl text-xs space-y-1.5 min-w-[160px]">
        <p className="font-bold text-[#243744] border-b border-slate-100 pb-1">{label}</p>
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3 font-medium">
            <span className="flex items-center gap-1.5" style={{ color: entry.color || entry.fill }}>
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color || entry.fill }} />
              {entry.name || entry.dataKey}:
            </span>
            <span className="font-bold text-slate-800">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const KpiCard = ({ title, value = 0, subtitle, icon: Icon, tone = "navy", percentage }) => {
  const animatedValue = useCountUp(value);

  const toneStyles = {
    navy: {
      border: "border-slate-200/80",
      bg: "bg-white",
      iconBg: "bg-[#243744]/10 text-[#243744]",
      meter: "bg-[#243744]"
    },
    emerald: {
      border: "border-emerald-200/80",
      bg: "bg-white",
      iconBg: "bg-emerald-50 text-emerald-600",
      meter: "bg-emerald-600"
    },
    blue: {
      border: "border-blue-200/80",
      bg: "bg-white",
      iconBg: "bg-blue-50 text-blue-600",
      meter: "bg-blue-600"
    },
    amber: {
      border: "border-amber-200/80",
      bg: "bg-white",
      iconBg: "bg-amber-50 text-amber-600",
      meter: "bg-amber-600"
    }
  };

  const style = toneStyles[tone] || toneStyles.navy;

  return (
    <motion.article
      variants={stagger.item}
      whileHover={{ y: -3, boxShadow: "0 14px 30px rgba(0,0,0,0.06)" }}
      className={`relative overflow-hidden rounded-2xl border ${style.border} ${style.bg} p-5 shadow-sm transition-all duration-200`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-[#243744]">{animatedValue.toLocaleString()}</span>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</p>
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${style.iconBg} shadow-inner`}>
          <Icon size={22} strokeWidth={2.2} />
        </div>
      </div>

      {percentage !== undefined && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1.5">
            <span>Utilization Rate</span>
            <span className="text-[#243744]">{percentage}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${style.meter}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
      )}
    </motion.article>
  );
};

const QuickActionButton = ({ title, description, icon: Icon, onClick, badge }) => (
  <motion.button
    type="button"
    onClick={onClick}
    whileHover={{ y: -2, scale: 1.01 }}
    whileTap={{ scale: 0.98 }}
    className="group relative flex items-center gap-3.5 w-full rounded-xl border border-slate-200/90 bg-white p-3.5 text-left transition-all duration-200 hover:border-[#243744] hover:shadow-md"
  >
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#243744] transition-colors group-hover:bg-[#243744] group-hover:text-white">
      <Icon size={18} strokeWidth={2} />
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-[#243744] truncate">{title}</span>
        {badge && (
          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
            {badge}
          </span>
        )}
      </div>
      <span className="block truncate text-[11px] font-medium text-slate-400 mt-0.5">{description}</span>
    </div>
    <ArrowUpRight size={16} className="text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#243744]" />
  </motion.button>
);

const Home = () => {
  const navigate = useNavigate();
  const [dashboardRole, setDashboardRole] = useState("admin");
  const [stats, setStats] = useState({
    totalLabs: 0,
    totalUsers: 0,
    totalProjects: 0,
    totalSamples: 0,
    totalTestingSamples: 0,
    totalClients: 0,
    totalAssignments: 0,
    completedObservations: 0,
    totalReports: 0,
    pendingTests: 0,
  });
  const [labStats, setLabStats] = useState([]);
  const [roleDistribution, setRoleDistribution] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [testStatusData, setTestStatusData] = useState([]);
  const [materialBreakdown, setMaterialBreakdown] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const userName = currentUser?.full_name || currentUser?.username || "Lab Manager";
  const userRole = getRoleTitle(currentUser?.role);
  const isSuperAdmin = currentUser?.role === "superadmin" || currentUser?.role === "super_admin" || dashboardRole === "superadmin";

  const fetchDashboard = async () => {
    try {
      setRefreshing(true);
      const res = await getDashboardData();
      const payload = res?.data?.data || res?.data;
      if (payload) {
        if (payload.role) setDashboardRole(payload.role);
        if (payload.stats) setStats(payload.stats);
        if (payload.labStats) setLabStats(payload.labStats);
        if (payload.roleDistribution) setRoleDistribution(payload.roleDistribution);
        if (payload.monthlyData) setMonthlyData(payload.monthlyData);
        if (payload.testStatusData) setTestStatusData(payload.testStatusData);
        if (payload.materialBreakdown) setMaterialBreakdown(payload.materialBreakdown);
        if (payload.recentActivities) setRecentActivities(payload.recentActivities);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const completionPercentage = useMemo(() => {
    if (!stats.totalSamples || stats.totalSamples === 0) return 0;
    return Math.round((stats.totalReports / stats.totalSamples) * 100) || 0;
  }, [stats.totalSamples, stats.totalReports]);

  const monthRangeText = useMemo(() => {
    if (monthlyData.length > 0) {
      const first = monthlyData[0].month || monthlyData[0].monthShort || "";
      const last = monthlyData[monthlyData.length - 1].month || monthlyData[monthlyData.length - 1].monthShort || "";
      return `${first} to ${last}`;
    }
    return "Dynamic 6 Months";
  }, [monthlyData]);

  const hasMonthlyData = useMemo(() => {
    return monthlyData.some(m => (m.samples || 0) > 0 || (m.reports || 0) > 0 || (m.projects || 0) > 0);
  }, [monthlyData]);

  return (
    <MainLayout headerTitle={isSuperAdmin ? "Super Admin Control Center" : "Analytics Control Center"} headerSubtitle={isSuperAdmin ? "Global System Management, Laboratories & Role Analytics" : "Live Laboratory Operations, Workflows & Visual Analytics"}>
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6 space-y-6">

        {/* ── SUPERADMIN VIEW ── */}
        {isSuperAdmin ? (
          <>
            {/* SuperAdmin KPI Grid */}
            <motion.div
              variants={stagger.container}
              initial="hidden"
              animate="visible"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <KpiCard
                title="Registered Laboratories"
                value={stats.totalLabs || 0}
                subtitle="Active LIMS Instances"
                icon={Building2}
                tone="navy"
                percentage={stats.totalLabs ? Math.min(100, stats.totalLabs * 20) : 0}
              />
              <KpiCard
                title="Active System Users"
                value={stats.totalUsers || 0}
                subtitle="Engineers & Managers"
                icon={Users}
                tone="blue"
                percentage={stats.totalUsers ? Math.min(100, stats.totalUsers * 5) : 0}
              />
              <KpiCard
                title="Global Projects"
                value={stats.totalProjects || 0}
                subtitle="Across All Labs"
                icon={Briefcase}
                tone="emerald"
                percentage={stats.totalProjects ? Math.min(100, stats.totalProjects * 5) : 0}
              />
              <KpiCard
                title="Registered Clients"
                value={stats.totalClients || 0}
                subtitle="Client Organizations"
                icon={Building2}
                tone="amber"
                percentage={stats.totalClients ? Math.min(100, stats.totalClients * 10) : 0}
              />
            </motion.div>

            {/* SuperAdmin Analytics Main Grid */}
            <div className="grid gap-6 xl:grid-cols-12 items-start">
              <div className="xl:col-span-8 space-y-6">

                {/* Graph 1: Laboratory Project & Sample Distribution Bar Chart */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="text-[#243744]" size={20} />
                        <h2 className="text-base font-bold text-[#243744]">Laboratory Distribution Analytics</h2>
                      </div>
                      <p className="text-xs font-medium text-slate-400 mt-0.5">Projects and material sample intake per registered lab</p>
                    </div>
                  </div>

                  <div className="h-[280px] w-full pt-2">
                    {labStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={labStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="projects" name="Projects" fill="#243744" radius={[6, 6, 0, 0]} barSize={28} />
                          <Bar dataKey="samples" name="Material Lots" fill="#059669" radius={[6, 6, 0, 0]} barSize={28} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-1">
                        <Inbox size={28} className="text-slate-300" />
                        <p className="text-xs font-medium">No laboratory distribution records yet</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Graph 2: 6-Month System-Wide Historical Dual Area Chart */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <TrendIcon className="text-[#243744]" size={20} />
                        <h2 className="text-base font-bold text-[#243744]">System-Wide 6-Month Intake Trend</h2>
                      </div>
                      <p className="text-xs font-medium text-slate-400 mt-0.5">Dynamic 6-month window ({monthRangeText}): Global projects & sample lot receipts</p>
                    </div>
                  </div>

                  <div className="h-[280px] w-full pt-2">
                    {hasMonthlyData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorSuperGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#243744" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#243744" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="samples" name="Material Intake" stroke="#243744" strokeWidth={3} fillOpacity={1} fill="url(#colorSuperGrad)" />
                          <Area type="monotone" dataKey="projects" name="Projects" stroke="#059669" strokeWidth={3} fillOpacity={1} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-1">
                        <Inbox size={28} className="text-slate-300" />
                        <p className="text-xs font-medium">No historical intake recorded</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Right Column: SuperAdmin Control Launchpad */}
              <div className="xl:col-span-4 space-y-6">

                {/* Role Allocation Donut Chart */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <PieIcon className="text-[#243744]" size={18} />
                      <h2 className="text-sm font-bold text-[#243744]">User Role Distribution</h2>
                    </div>
                  </div>

                  <div className="h-[200px] w-full relative flex items-center justify-center">
                    {roleDistribution.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={roleDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={78}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {roleDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color || '#243744'} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-1">
                        <Inbox size={24} className="text-slate-300" />
                        <p className="text-xs font-medium">No role distribution data</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* SuperAdmin Action Launchpad */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h2 className="text-base font-bold text-[#243744] tracking-tight">SuperAdmin Management</h2>
                    <Shield className="text-[#243744]" size={18} />
                  </div>

                  <div className="space-y-2.5">
                    <QuickActionButton
                      title="Manage Laboratories"
                      description="Create, edit & configure lab instances"
                      icon={Building2}
                      onClick={() => navigate("/superadmin/labs")}
                    />
                    <QuickActionButton
                      title="Manage System Users"
                      description="User access & credentials control"
                      icon={Users}
                      onClick={() => navigate("/users")}
                    />
                    <QuickActionButton
                      title="Roles & Permissions"
                      description="Define custom system roles & scopes"
                      icon={KeyRound}
                      onClick={() => navigate("/superadmin/roles")}
                    />
                    <QuickActionButton
                      title="Audit Trail Logs"
                      description="System security & activity history"
                      icon={History}
                      onClick={() => navigate("/superadmin/audit")}
                    />
                  </div>
                </div>

              </div>
            </div>
          </>
        ) : (
          /* ── CLIENT ADMIN / LAB MANAGER VIEW ── */
          <>
            {/* Top KPI Cards Grid (4 Dynamic Metrics) */}
            <motion.div
              variants={stagger.container}
              initial="hidden"
              animate="visible"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <KpiCard
                title="Active Projects & Clients"
                value={stats.totalProjects || 0}
                subtitle={`${stats.totalClients || 0} Registered Clients`}
                icon={Briefcase}
                tone="navy"
                percentage={stats.totalProjects ? Math.min(100, stats.totalProjects * 10) : 0}
              />

              <KpiCard
                title="Material Lot Receipts"
                value={stats.totalSamples || 0}
                subtitle={`${stats.totalTestingSamples || 0} Physical Specimens`}
                icon={FlaskConical}
                tone="blue"
                percentage={stats.totalSamples ? Math.min(100, stats.totalSamples * 5) : 0}
              />

              <KpiCard
                title="Test Workload Scheduled"
                value={stats.totalAssignments || 0}
                subtitle={`${stats.pendingTests || 0} Pending Execution`}
                icon={CheckSquare}
                tone="amber"
                percentage={stats.totalAssignments ? Math.min(100, stats.totalAssignments * 5) : 0}
              />

              <KpiCard
                title="Published Test Reports"
                value={stats.totalReports || 0}
                subtitle={`${stats.completedObservations || 0} Verified Observations`}
                icon={FileText}
                tone="emerald"
                percentage={completionPercentage}
              />
            </motion.div>

            {/* Main Workspace Grid: DYNAMIC ANALYTICS GRAPHS */}
            <div className="grid gap-6 xl:grid-cols-12 items-start">
              <div className="xl:col-span-8 space-y-6">

                {/* GRAPH 1: 6-Month Historical Intake vs Test Report Generation Dual Area Chart */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <TrendIcon className="text-[#243744]" size={20} />
                        <h2 className="text-base font-bold text-[#243744] tracking-tight">
                          6-Month Historical Intake vs Test Report Generation
                        </h2>
                      </div>
                      <p className="text-xs font-medium text-slate-400 mt-0.5">
                        Dynamic 6-month window ({monthRangeText}): Sample lot intake vs published test certificates
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-bold shrink-0">
                      <span className="flex items-center gap-1.5 text-[#243744]">
                        <span className="w-3 h-3 rounded-full bg-[#243744]" />
                        Sample Intake
                      </span>
                      <span className="flex items-center gap-1.5 text-emerald-600">
                        <span className="w-3 h-3 rounded-full bg-emerald-600" />
                        Reports Published
                      </span>
                    </div>
                  </div>

                  <div className="h-[300px] w-full pt-3">
                    {hasMonthlyData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorSamplesGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#243744" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#243744" stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="colorReportsGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="samples" name="Material Lots Intake" stroke="#243744" strokeWidth={3} fillOpacity={1} fill="url(#colorSamplesGrad)" />
                          <Area type="monotone" dataKey="reports" name="Reports Published" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#colorReportsGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                        <Inbox size={32} className="text-slate-300" />
                        <p className="text-xs font-semibold">No historical intake or report data recorded yet.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* GRAPH 2 & GRAPH 3 ROW */}
                <div className="grid gap-6 md:grid-cols-2">

                  {/* GRAPH 2: Workload Execution Donut/Pie Chart */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <PieIcon className="text-[#243744]" size={18} />
                        <h2 className="text-sm font-bold text-[#243744]">Test Execution Status</h2>
                      </div>
                    </div>

                    <div className="h-[200px] w-full relative flex items-center justify-center">
                      {testStatusData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={testStatusData}
                              cx="50%"
                              cy="50%"
                              innerRadius={52}
                              outerRadius={78}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {testStatusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color || '#243744'} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-1">
                          <Inbox size={24} className="text-slate-300" />
                          <p className="text-xs font-medium">No test status recorded</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* GRAPH 3: Tested Material Types Volume Bar Chart */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="text-[#243744]" size={18} />
                        <h2 className="text-sm font-bold text-[#243744]">Tested Material Volume</h2>
                      </div>
                    </div>

                    <div className="h-[200px] w-full pt-1">
                      {materialBreakdown.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={materialBreakdown} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="count" name="Material Lots" fill="#243744" radius={[6, 6, 0, 0]} barSize={26} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-1">
                          <Inbox size={24} className="text-slate-300" />
                          <p className="text-xs font-medium">No material types recorded</p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Laboratory Workflow Lifecycle Stage Progress */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h2 className="text-base font-bold text-[#243744] tracking-tight">Laboratory Workflow Stages</h2>
                      <p className="text-xs font-medium text-slate-400">Live distribution of specimen processing lifecycle</p>
                    </div>
                    <span className="text-xs font-extrabold text-[#243744] bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      4 Active Stages
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                    {/* Stage 1 */}
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Step 1</span>
                        <FlaskConical size={16} className="text-[#243744]" />
                      </div>
                      <p className="text-sm font-bold text-[#243744]">Material Receipts</p>
                      <p className="text-xl font-black text-[#243744]">{stats.totalSamples || 0}</p>
                      <p className="text-[11px] font-semibold text-slate-400">Initial lot intake</p>
                    </div>

                    {/* Stage 2 */}
                    <div className="rounded-xl border border-blue-200/80 bg-blue-50/40 p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600">Step 2</span>
                        <CheckSquare size={16} className="text-blue-600" />
                      </div>
                      <p className="text-sm font-bold text-blue-900">Test Scheduling</p>
                      <p className="text-xl font-black text-blue-700">{stats.totalAssignments || 0}</p>
                      <p className="text-[11px] font-semibold text-blue-600">{stats.pendingTests || 0} Pending</p>
                    </div>

                    {/* Stage 3 */}
                    <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600">Step 3</span>
                        <TestTube size={16} className="text-amber-600" />
                      </div>
                      <p className="text-sm font-bold text-amber-900">Observations</p>
                      <p className="text-xl font-black text-amber-700">{stats.completedObservations || 0}</p>
                      <p className="text-[11px] font-semibold text-amber-600">Readings Captured</p>
                    </div>

                    {/* Stage 4 */}
                    <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">Step 4</span>
                        <FileText size={16} className="text-emerald-600" />
                      </div>
                      <p className="text-sm font-bold text-emerald-900">Test Reports</p>
                      <p className="text-xl font-black text-emerald-700">{stats.totalReports || 0}</p>
                      <p className="text-[11px] font-semibold text-emerald-600">Published & Signed</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Quick Launchpad & LATEST OPERATIONAL LOGS */}
              <div className="xl:col-span-4 space-y-6">

                {/* 1. Quick Action Launchpad */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h2 className="text-base font-bold text-[#243744] tracking-tight">Quick Action Launchpad</h2>
                    <Sparkles size={16} className="text-amber-500" />
                  </div>

                  <div className="space-y-2.5">
                    <QuickActionButton
                      title="Receive Material Lot"
                      description="Register new sample lot & client receipt"
                      icon={FlaskConical}
                      onClick={() => navigate("/samples")}
                      badge="New"
                    />

                    <QuickActionButton
                      title="Assign Test Work"
                      description="Schedule lab tests & assign engineers"
                      icon={CheckSquare}
                      onClick={() => navigate("/test-assignments")}
                    />

                    <QuickActionButton
                      title="Enter Observations"
                      description="Fill reading sheets & test values"
                      icon={TestTube}
                      onClick={() => navigate("/observation-entry")}
                    />

                    <QuickActionButton
                      title="Generate Test Report"
                      description="Create & publish final certificate"
                      icon={FileText}
                      onClick={() => navigate("/reports")}
                    />
                  </div>
                </div>

                {/* 2. LATEST OPERATIONAL ACTIVITY LOGS */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Activity size={18} className="text-[#243744]" />
                      <h2 className="text-base font-bold text-[#243744] tracking-tight">Latest Operational Logs</h2>
                    </div>
                    <span className="text-[10px] font-extrabold text-[#243744] bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      Live Stream
                    </span>
                  </div>

                  <div className="space-y-3">
                    {recentActivities.length > 0 ? (
                      recentActivities.map((act, index) => (
                        <div key={index} className="flex items-start gap-3 text-xs pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                          <div className="p-2 rounded-xl bg-slate-100 text-[#243744] shrink-0 mt-0.5">
                            {act.type === "project" ? <Briefcase size={14} /> : <FlaskConical size={14} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-[#243744] truncate">{act.title}</p>
                            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">{act.time}</p>
                          </div>
                          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Recorded
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-slate-400 space-y-1 text-xs">
                        <Inbox size={24} className="text-slate-300" />
                        <p className="font-semibold">No operational activities logged today.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Quality & Pending Task Alert Box */}
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/80 to-amber-100/40 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <ShieldCheck size={16} className="text-amber-700" />
                    <span>Quality Control Summary</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed font-medium">
                    You have <strong>{stats.pendingTests || 0} scheduled tests</strong> requiring execution & observation entry.
                  </p>
                  <button
                    onClick={() => navigate("/test-assignments")}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 hover:text-amber-950 underline underline-offset-2"
                  >
                    <span>View pending test queue</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

              </div>
            </div>
          </>
        )}

      </div>
    </MainLayout>
  );
};

export default Home;
