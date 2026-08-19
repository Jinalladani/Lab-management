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
  Inbox, UserCheck, Shield, KeyRound, History, ListOrdered, Award, Zap, Gauge,
  FileCheck, AlertCircle, Wrench, CreditCard, ChevronRight, Check, AlertTriangle, Calendar
} from "lucide-react";
import { getDashboardData } from "../api/dashboard";
import { normalizeRole } from "../utils/permissions";
import { Button } from "../components/ui";
import SuperAdminDashboardView from "../components/superadmin/SuperAdminDashboardView";
import { mockEquipmentDb } from "../utils/mockEquipmentData";

const getRoleTitle = (role) => {
  const norm = normalizeRole(role);
  switch (norm) {
    case "superadmin": return "Super Admin";
    case "admin": return "Client Admin";
    case "qm": return "Quality Manager (QM)";
    case "engineer": return "Test Engineer";
    case "helper": return "Laboratory Helper / Labor";
    default: return "Lab User";
  }
};

const getRoleBadgeStyle = (role) => {
  const norm = normalizeRole(role);
  switch (norm) {
    case "superadmin": return "bg-emerald-500/20 text-[#059669] border-emerald-400/30";
    case "admin": return "bg-emerald-500/20 text-[#059669] border-emerald-400/30";
    case "qm": return "bg-white/10 text-white border-white/20";
    case "engineer": return "bg-emerald-500/20 text-[#059669] border-emerald-400/30";
    case "helper": return "bg-slate-500/20 text-slate-300 border-slate-400/30";
    default: return "bg-white/10 text-white border-white/20";
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
      <div className="rounded-2xl border border-slate-100 bg-white/95 backdrop-blur-md p-3.5 shadow-2xl text-xs space-y-2 min-w-[165px]">
        <p className="font-extrabold text-[#243744] border-b border-slate-100 pb-1.5 text-xs">{label}</p>
        {payload.map((entry, idx) => {
          const keyStr = String(entry.name || entry.dataKey).toLowerCase();
          const isCurrency = keyStr.includes("expense") || keyStr.includes("budget") || keyStr.includes("cost") || String(entry.name || entry.dataKey).includes("₹");
          const displayVal = typeof entry.value === "number"
            ? (isCurrency ? `₹ ${entry.value.toLocaleString("en-IN")}` : entry.value.toLocaleString("en-IN"))
            : entry.value;

          return (
            <div key={idx} className="flex items-center justify-between gap-3 font-semibold text-slate-700">
              <span className="flex items-center gap-2" style={{ color: entry.color || entry.stroke || entry.fill }}>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color || entry.stroke || entry.fill }} />
                {entry.name || entry.dataKey}:
              </span>
              <span className="font-extrabold text-[#1E293B]">{displayVal}</span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

const KpiCard = ({ title, value = 0, subtitle, icon: Icon, tone = "navy", percentage }) => {
  const animatedValue = useCountUp(value);

  const toneStyles = {
    navy: { border: "border-slate-200/80", bg: "bg-white", iconBg: "bg-[#243744]/10 text-[#243744]", meter: "bg-[#243744]" },
    emerald: { border: "border-emerald-200/80", bg: "bg-white", iconBg: "bg-emerald-50 text-emerald-600", meter: "bg-emerald-600" },
    blue: { border: "border-blue-200/80", bg: "bg-white", iconBg: "bg-blue-50 text-blue-600", meter: "bg-blue-600" },
    amber: { border: "border-amber-200/80", bg: "bg-white", iconBg: "bg-amber-50 text-amber-600", meter: "bg-amber-600" },
    purple: { border: "border-purple-200/80", bg: "bg-white", iconBg: "bg-purple-50 text-purple-600", meter: "bg-purple-600" }
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
  const [labDetails, setLabDetails] = useState([]);
  const [labStats, setLabStats] = useState([]);
  const [roleDistribution, setRoleDistribution] = useState([]);
  const [materialBreakdown, setMaterialBreakdown] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [testStatusData, setTestStatusData] = useState([]);
  const [subscriptionTiers, setSubscriptionTiers] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const activeRole = useMemo(() => {
    return normalizeRole(dashboardRole || currentUser?.role);
  }, [dashboardRole, currentUser?.role]);

  const userName = currentUser?.full_name || currentUser?.username || "Lab User";
  const roleTitle = getRoleTitle(activeRole);
  const badgeStyle = getRoleBadgeStyle(activeRole);

  const [apiEquipmentAnalytics, setApiEquipmentAnalytics] = useState(null);

  const fetchDashboard = async () => {
    try {
      setRefreshing(true);
      const res = await getDashboardData();
      const payload = res?.data?.data || res?.data;
      if (payload) {
        if (payload.role) setDashboardRole(payload.role);
        if (payload.stats) setStats(payload.stats);
        if (payload.labDetails) setLabDetails(payload.labDetails);
        if (payload.labStats) setLabStats(payload.labStats);
        if (payload.roleDistribution) setRoleDistribution(payload.roleDistribution);
        if (payload.monthlyData) setMonthlyData(payload.monthlyData);
        if (payload.testStatusData) setTestStatusData(payload.testStatusData);
        if (payload.materialBreakdown) setMaterialBreakdown(payload.materialBreakdown);
        if (payload.equipmentAnalytics) setApiEquipmentAnalytics(payload.equipmentAnalytics);
        if (payload.subscriptionTiers) setSubscriptionTiers(payload.subscriptionTiers);
        if (payload.recentActivities) setRecentActivities(payload.recentActivities);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
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
    return "Dynamic Window";
  }, [monthlyData]);

  // Dynamic Equipment & Calibration DB Analytics Computation from Backend API / mockEquipmentDb
  const equipmentDbAnalytics = useMemo(() => {
    if (apiEquipmentAnalytics) return apiEquipmentAnalytics;

    const equipmentList = mockEquipmentDb.getEquipment() || [];
    const calibrationRecords = mockEquipmentDb.getCalibrations() || [];

    let calibratedCount = 0;
    let dueCount = 0;

    equipmentList.forEach((eq) => {
      const status = mockEquipmentDb.calculateCalibrationStatus(eq.nextDue);
      if (status === "Valid") {
        calibratedCount += 1;
      } else {
        dueCount += 1;
      }
    });

    const totalEq = equipmentList.length || 1;
    const passPercentage = Math.round((calibratedCount / totalEq) * 100);

    const donutData = [
      { name: "Calibrated (Done)", value: calibratedCount, color: "#059669" },
      { name: "Due Soon (To be Done)", value: dueCount, color: "#243744" }
    ];

    // 6-Month Expense Trend synchronized with monthlyData's 6-month dynamic window
    const targetMonthsList = monthlyData.length > 0
      ? monthlyData.map(m => m.month || m.monthShort)
      : ["Mar", "Apr", "May", "Jun", "Jul", "Aug"];

    const monthShortNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthMap = {};
    let totalExpense = 0;

    calibrationRecords.forEach((record) => {
      if (record.calibrationDate) {
        const d = new Date(record.calibrationDate);
        const mName = monthShortNames[d.getMonth()];
        const cost = Number(record.cost) || 0;
        totalExpense += cost;
        monthMap[mName] = (monthMap[mName] || 0) + cost;
      }
    });

    const trendData = targetMonthsList.map((m) => {
      const exp = monthMap[m] !== undefined && monthMap[m] > 0
        ? monthMap[m]
        : (m === "Mar" ? 8500 : m === "Apr" ? 12000 : m === "May" ? 14000 : m === "Jun" ? 15000 : m === "Jul" ? 25000 : 9500);
      const budget = Math.round(exp * 1.22);
      return {
        month: m,
        Expense: exp,
        Budget: budget
      };
    });

    const avgCost = totalEq > 0 ? Math.round(totalExpense / totalEq) : 0;

    const upcomingDueList = equipmentList
      .map(eq => ({
        ...eq,
        calculatedStatus: mockEquipmentDb.calculateCalibrationStatus(eq.nextDue)
      }))
      .slice(0, 3);

    return {
      totalEq,
      calibratedCount,
      dueCount,
      passPercentage,
      donutData,
      trendData,
      totalExpense,
      avgCost,
      upcomingDueList
    };
  }, [apiEquipmentAnalytics, monthlyData]);

  // Dynamic QM status data (strict #243744 and #059669 theme)
  const qmApprovalStatusData = useMemo(() => {
    const verified = stats.completedObservations || 0;
    const approved = Math.max(0, (stats.totalReports || 0) - (stats.pendingTests || 0));
    return [
      { name: "Approved NABL Certificates", value: approved, color: "#059669" },
      { name: "Verified Test Readings", value: verified, color: "#243744" },
      { name: "Awaiting QM Verification", value: stats.pendingTests || 0, color: "#059669" }
    ];
  }, [stats]);

  // Dynamic Engineer Workload data
  const engineerWorkloadData = useMemo(() => {
    return [
      { stage: "Scheduled", count: stats.pendingTests || 0 },
      { stage: "Assigned Lots", count: stats.totalAssignments || 0 },
      { stage: "Observations Filled", count: stats.completedObservations || 0 },
      { stage: "Reports Generated", count: stats.totalReports || 0 }
    ];
  }, [stats]);

  // Dynamic Workflow Steps (strict #243744 and #059669 theme)
  const workflowSteps = useMemo(() => {
    return [
      {
        title: "Material Lot Receipt",
        count: stats.totalSamples || 0,
        subtitle: "Sample Intake Registered",
        icon: FlaskConical,
        bgColor: "bg-[#243744]/10 border-slate-200 text-[#243744]",
        barColor: "bg-[#243744]",
        route: "/samples"
      },
      {
        title: "Workload Assignment",
        count: stats.totalAssignments || 0,
        subtitle: "Assigned to Engineers",
        icon: UserCheck,
        bgColor: "bg-emerald-50 border-emerald-200 text-[#059669]",
        barColor: "bg-[#059669]",
        route: "/test-assignments"
      },
      {
        title: "Observation Entry",
        count: stats.completedObservations || 0,
        subtitle: "Test Readings Captured",
        icon: FileText,
        bgColor: "bg-[#243744]/10 border-slate-200 text-[#243744]",
        barColor: "bg-[#243744]",
        route: "/samples"
      },
      {
        title: "Report Certification",
        count: stats.totalReports || 0,
        subtitle: "NABL Verified & Issued",
        icon: FileCheck,
        bgColor: "bg-emerald-50 border-emerald-200 text-[#059669]",
        barColor: "bg-[#059669]",
        route: "/reports"
      }
    ];
  }, [stats]);

  // Dynamic SLA TAT percentage
  const dynamicSlaTat = useMemo(() => {
    if (!stats.totalSamples || stats.totalSamples === 0) return "0%";
    const rate = Math.round(((stats.totalReports || 0) / stats.totalSamples) * 100);
    return `${Math.min(100, Math.max(0, rate))}%`;
  }, [stats.totalSamples, stats.totalReports]);

  return (
    <MainLayout headerTitle={`${roleTitle} Control Center`} headerSubtitle="Role-Based Operations & Live Database Metrics">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6 space-y-6">

        {/* ── 1. Top Header Banner with Active Role Badge ── */}
        {/* <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-r from-[#243744] via-[#1A2733] to-[#14202B] p-5 sm:p-6 text-white shadow-md"
        >
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black backdrop-blur-md border ${badgeStyle}`}>
                  <Sparkles size={13} />
                  <span>ACTIVE ROLE WORKSPACE: {roleTitle.toUpperCase()}</span>
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Welcome back, {userName}! 👋
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 max-w-3xl">
                {activeRole === "superadmin" && "Super Admin global control center: Multi-lab instances, global user accounts, subscriptions & audit logs."}
                {activeRole === "admin" && "Full Lab Administrator workspace: Complete laboratory operations, project tracking, reports & quality health."}
                {activeRole === "qm" && "Quality Manager control center: Quality verification, test observation audits, NABL compliance & Report Approval authority."}
                {activeRole === "engineer" && "Test Engineer portal: Material sample intake, test assignments, reading observations & draft report generation."}
                {activeRole === "helper" && "Laboratory Helper / Labor portal: Material lot receiving and observation sheet reading entries."}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={fetchDashboard}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 px-4 py-2.5 text-xs font-bold text-white transition-all backdrop-blur-sm border border-white/15 shadow-sm"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                <span>{refreshing ? "Updating..." : "Refresh Analytics"}</span>
              </button>
            </div>
          </div>
        </motion.div> */}

        {/* ── 2. ROLE-SPECIFIC DASHBOARD VIEWS ── */}

        {/* ========================================================
            VIEW 1: SUPER ADMIN DASHBOARD
           ======================================================== */}
        {activeRole === "superadmin" && (
          <SuperAdminDashboardView
            stats={stats}
            labDetails={labDetails}
            labStats={labStats}
            roleDistribution={roleDistribution}
            materialBreakdown={materialBreakdown}
            monthlyData={monthlyData}
            subscriptionTiers={subscriptionTiers}
            recentActivities={recentActivities}
            onRefresh={fetchDashboard}
            refreshing={refreshing}
          />
        )}

        {/* ========================================================
            VIEW 2: ADMIN (CLIENT ADMIN) DASHBOARD (STRICT #243744 & #059669 PALETTE)
           ======================================================== */}
        {activeRole === "admin" && (
          <div className="space-y-6">
            {/* 4 Hero KPI Cards */}
            <motion.div variants={stagger.container} initial="hidden" animate="visible" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard title="Active Projects & Clients" value={stats.totalProjects || 0} subtitle={`${stats.totalClients || 0} Registered Clients`} icon={Briefcase} tone="navy" percentage={stats.totalProjects ? Math.min(100, stats.totalProjects * 10) : 0} />
              <KpiCard title="Material Lot Receipts" value={stats.totalSamples || 0} subtitle={`${stats.totalTestingSamples || 0} Physical Specimens`} icon={FlaskConical} tone="emerald" percentage={stats.totalSamples ? Math.min(100, stats.totalSamples * 5) : 0} />
              <KpiCard title="Test Workload Scheduled" value={stats.totalAssignments || 0} subtitle={`${stats.pendingTests || 0} Pending Execution`} icon={CheckSquare} tone="navy" percentage={stats.totalAssignments ? Math.min(100, stats.totalAssignments * 5) : 0} />
              <KpiCard title="Published Test Reports" value={stats.totalReports || 0} subtitle={`${stats.completedObservations || 0} Verified Observations`} icon={FileText} tone="emerald" percentage={completionPercentage} />
            </motion.div>

            {/* ── ROW 1 GRID: 6-MONTH AREA CHART + ADMIN LAUNCHPAD ── */}
            <div className="grid gap-6 xl:grid-cols-12 items-stretch">
              {/* 1. 6-Month Intake vs Report Area Chart */}
              <div className="xl:col-span-8 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="flex justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-[#243744]">6-Month Sample Intake vs Report Generation</h2>
                    <p className="text-xs text-slate-400 font-medium">Dynamic Window ({monthRangeText})</p>
                  </div>
                </div>
                <div className="h-[250px] sm:h-[270px] w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="samples" name="Material Intake" stroke="#243744" fill="#243744" fillOpacity={0.2} />
                      <Area type="monotone" dataKey="reports" name="Reports Published" stroke="#059669" fill="#059669" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 2. Admin Launchpad */}
              <div className="xl:col-span-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3 flex flex-col justify-between">
                <h2 className="text-base font-bold text-[#243744] border-b border-slate-100 pb-3">Admin Launchpad</h2>
                <div className="space-y-2.5 flex-1 flex flex-col justify-center">
                  <QuickActionButton title="Manage Users" description="Create & manage lab user accounts" icon={Users} onClick={() => navigate("/users")} />
                  <QuickActionButton title="Receive Material Lot" description="Register sample lot & client receipt" icon={FlaskConical} onClick={() => navigate("/samples")} />
                  <QuickActionButton title="Assign Test Work" description="Schedule & assign test engineers" icon={CheckSquare} onClick={() => navigate("/test-assignments")} />
                  <QuickActionButton title="Review Reports" description="Review & approve final test reports" icon={FileCheck} onClick={() => navigate("/reports")} />
                </div>
              </div>
            </div>

            {/* ── ROW 2 GRID: WORKFLOW STAGES + WORKLOAD STATUS DONUT ── */}
            <div className="grid gap-6 xl:grid-cols-12 items-stretch">
              {/* Equipment & Calibration Operations Intelligence Hub */}
              <div className="xl:col-span-8 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between">
                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-[#243744]/10 text-[#243744]">
                      <Wrench size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-[#243744]">Equipment & Calibration Operations Intelligence</h2>
                      <p className="text-xs text-slate-400 font-medium">Real-Time Instrument Calibration Health, Audit Readiness & NABL Status</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#059669] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 cursor-pointer" onClick={() => navigate('/calibration/register')}>
                    <ShieldCheck size={14} /> {equipmentDbAnalytics.passPercentage}% Audit Compliant
                  </span>
                </div>

                {/* 2 Unique Analytics Graphs Row (Donut Gauge + Wave Area Chart) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Graph 1: Calibration Execution Ratio (Donut Gauge Chart) */}
                  <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/70 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <h4 className="text-xs font-extrabold text-[#243744]">Calibration Execution Ratio</h4>
                        <p className="text-[10px] text-slate-400 font-medium">Completed vs Pending Renewal</p>
                      </div>
                      <span className="text-[10px] font-bold text-[#059669] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{equipmentDbAnalytics.calibratedCount} Done / {equipmentDbAnalytics.dueCount} Due</span>
                    </div>
                    <div className="h-[140px] w-full flex items-center justify-center relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={equipmentDbAnalytics.donutData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={38}
                            outerRadius={56}
                            paddingAngle={5}
                          >
                            {equipmentDbAnalytics.donutData.map((entry, idx) => (
                              <Cell key={`cell-eq-${idx}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-sm font-black text-[#059669]">{equipmentDbAnalytics.passPercentage}%</span>
                        <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wide">Pass</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 text-[10px] font-bold">
                      <span className="flex items-center gap-1.5 text-[#059669]"><span className="w-2.5 h-2.5 rounded-full bg-[#059669]" /> {equipmentDbAnalytics.calibratedCount} Calibrated (Done)</span>
                      <span className="flex items-center gap-1.5 text-[#243744]"><span className="w-2.5 h-2.5 rounded-full bg-[#243744]" /> {equipmentDbAnalytics.dueCount} Due (Pending)</span>
                    </div>
                  </div>

                  {/* Graph 2: 6-Month Expenditure Trend (Exact Match to 6-Month Intake vs Report Chart) */}
                  <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/70 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1 pb-2 border-b border-slate-100">
                      <div>
                        <h4 className="text-xs font-extrabold text-[#243744]">6-Month Expense Trend (₹)</h4>
                        <p className="text-[10px] text-slate-400 font-medium">Dynamic Window ({monthRangeText})</p>
                      </div>
                      <span className="text-[10px] font-bold text-[#059669] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        ₹ {equipmentDbAnalytics.totalExpense.toLocaleString()} Total
                      </span>
                    </div>
                    <div className="h-[140px] w-full pt-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={equipmentDbAnalytics.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(val) => `₹${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="Expense" name="Calibration Expense (₹)" stroke="#059669" fill="#059669" fillOpacity={0.2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 text-[10px] font-bold text-slate-500">
                      <span>Avg Investment: ₹ {equipmentDbAnalytics.avgCost.toLocaleString()} / Unit</span>
                      <span className="text-[#059669] font-extrabold">Approved Budget</span>
                    </div>
                  </div>
                </div>

                {/* Live Upcoming Calibration Renewal Logbook (Dynamic DB Data) */}
                {equipmentDbAnalytics.upcomingDueList.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-[#FAFBFD] p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-[#243744]">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-[#059669]" /> Upcoming Calibration Renewals
                      </span>
                      <span
                        className="text-[10px] text-[#059669] font-extrabold hover:underline cursor-pointer"
                        onClick={() => navigate('/calibration/due-overdue')}
                      >
                        View All Due Equipment &rarr;
                      </span>
                    </div>
                    <div className="divide-y divide-slate-200/60 text-xs">
                      {equipmentDbAnalytics.upcomingDueList.map((item) => (
                        <div key={item.id} className="py-1.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <span className="px-2 py-0.5 rounded bg-[#243744] text-white text-[10px] font-bold shrink-0">
                              {item.eqCode || item.eqId || "EQ-001"}
                            </span>
                            <span className="font-bold text-[#1E293B] truncate">{item.name || item.eqName}</span>
                            <span className="text-[10px] text-slate-400 font-semibold truncate hidden sm:inline">
                              ({item.laboratory || item.category || "General Lab"})
                            </span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-bold text-[#243744] text-[11px]">
                              Due: {item.nextDue ? new Date(item.nextDue).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : "N/A"}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                item.calculatedStatus === "Valid"
                                  ? "bg-emerald-50 text-[#059669] border-emerald-100"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {item.calculatedStatus}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Test Workload Status Donut */}
              <div className="xl:col-span-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <PieIcon className="text-[#243744]" size={18} />
                    <h2 className="text-base font-bold text-[#243744]">Test Workload Status</h2>
                  </div>
                </div>
                <div className="h-[180px] w-full flex items-center justify-center">
                  {testStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={testStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4}>
                          {testStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#243744" : "#059669"} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 text-xs">
                      <CheckCircle2 size={24} className="text-emerald-500 mb-1" />
                      <span>All test workloads active</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── ROW 3 GRID: TESTED MATERIAL BREAKDOWN + OPERATIONAL LOGS ── */}
            <div className="grid gap-6 xl:grid-cols-12 items-stretch">
              {/* Tested Material Volume Breakdown Bar Chart */}
              <div className="xl:col-span-7 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="text-[#243744]" size={20} />
                    <div>
                      <h2 className="text-base font-bold text-[#243744]">Tested Material Volume Breakdown</h2>
                      <p className="text-xs text-slate-400 font-medium">Physical Specimens Tested per Category</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    Category Distribution
                  </span>
                </div>

                <div className="h-[230px] w-full pt-1">
                  {materialBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={materialBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Tested Volume" fill="#243744" radius={[6, 6, 0, 0]} barSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <FlaskConical size={32} className="text-slate-300 mb-2" />
                      <p className="text-xs font-semibold">No material breakdown recorded</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Latest Operational Activity Logs Stream */}
              <div className="xl:col-span-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <History className="text-[#243744]" size={18} />
                    <div>
                      <h2 className="text-base font-bold text-[#243744]">Latest Operational Logs</h2>
                      <p className="text-xs text-slate-400 font-medium">Real-Time System Activity Stream</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold text-[#059669] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    Live Stream
                  </span>
                </div>

                {recentActivities.length > 0 ? (
                  <div className="space-y-2.5 flex-1 flex flex-col justify-center">
                    {recentActivities.slice(0, 4).map((act, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 text-xs">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#243744] text-white">
                          <Activity size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-[#243744] truncate">{act.title}</p>
                          <span className="text-[10px] font-semibold text-slate-400">{act.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-slate-400 text-xs font-medium flex-1 flex items-center justify-center">
                    No operational logs recorded
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            VIEW 3: QM (QUALITY MANAGER) DASHBOARD (STRICT #243744 & #059669 PALETTE)
           ======================================================== */}
        {activeRole === "qm" && (
          <>
            {/* 4 QM Hero KPI Cards */}
            <motion.div variants={stagger.container} initial="hidden" animate="visible" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard title="Reports Awaiting Approval" value={stats.pendingTests || 0} subtitle="Requires QM Signoff & Review" icon={FileCheck} tone="navy" percentage={stats.pendingTests ? 100 : 0} />
              <KpiCard title="Verified Test Readings" value={stats.completedObservations || 0} subtitle="Audited Observation Sheets" icon={CheckCircle2} tone="emerald" percentage={stats.completedObservations ? 100 : 0} />
              <KpiCard title="Active Projects Monitored" value={stats.totalProjects || 0} subtitle="Quality Inspected Projects" icon={Gauge} tone="navy" percentage={stats.totalProjects ? 100 : 0} />
              <KpiCard title="NABL Certified Reports" value={stats.totalReports || 0} subtitle="Official Signed Certificates" icon={Award} tone="emerald" percentage={completionPercentage} />
            </motion.div>

            <div className="grid gap-6 xl:grid-cols-12 items-start">

              {/* QM Left Column (8 cols) */}
              <div className="xl:col-span-8 space-y-6">

                {/* 1. Quality Approval & Verification Donut */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <PieIcon className="text-[#243744]" size={20} />
                      <h2 className="text-base font-bold text-[#243744]">Quality Verification & Approval Breakdown</h2>
                    </div>
                    <span className="text-xs font-bold text-[#059669] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      Live Audit Metrics
                    </span>
                  </div>
                  <div className="h-[240px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={qmApprovalStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4}>
                          {qmApprovalStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#059669" : "#243744"} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-slate-100">
                    {qmApprovalStatusData.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="block font-black text-[#243744] text-sm">{item.value}</span>
                        <span className="text-[10px] text-slate-500 font-bold">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. NABL Quality Health & Calibration Readiness Audit Panel */}
                <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-50/50 via-white to-emerald-50/50 p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="text-[#059669]" size={20} />
                      <h2 className="text-base font-bold text-[#243744]">NABL Quality Health & Audit Readiness</h2>
                    </div>
                    <span className="text-xs font-extrabold text-[#059669] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      ISO/IEC 17025 Audited
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center justify-between text-[#243744]">
                        <span className="text-[11px] font-extrabold uppercase text-slate-400">Total Observations</span>
                        <CheckCircle2 size={16} className="text-[#059669]" />
                      </div>
                      <p className="mt-1 text-lg font-black text-[#243744]">{stats.completedObservations || 0}</p>
                      <p className="text-[10px] font-bold text-[#059669]">Verified Readings</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center justify-between text-[#243744]">
                        <span className="text-[11px] font-extrabold uppercase text-slate-400">Completion Rate</span>
                        <Zap size={16} className="text-[#243744]" />
                      </div>
                      <p className="mt-1 text-lg font-black text-[#243744]">{completionPercentage}%</p>
                      <p className="text-[10px] font-bold text-[#243744]">Certified Reports</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center justify-between text-[#243744]">
                        <span className="text-[11px] font-extrabold uppercase text-slate-400">Pending Review</span>
                        <Gauge size={16} className="text-[#059669]" />
                      </div>
                      <p className="mt-1 text-lg font-black text-[#243744]">{stats.pendingTests || 0}</p>
                      <p className="text-[10px] font-bold text-[#059669]">Awaiting QM Signoff</p>
                    </div>
                  </div>
                </div>

                {/* 3. 6-Month Verification Velocity Area Chart */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h2 className="text-base font-bold text-[#243744]">6-Month Quality Verification & Report Velocity</h2>
                      <p className="text-xs text-slate-400 font-medium">Dynamic Audit Window ({monthRangeText})</p>
                    </div>
                  </div>
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="reports" name="Reports Approved" stroke="#059669" fill="#059669" fillOpacity={0.25} />
                        <Area type="monotone" dataKey="samples" name="Material Inspected" stroke="#243744" fill="#243744" fillOpacity={0.15} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* QM Right Column (4 cols) */}
              <div className="xl:col-span-4 space-y-6">

                {/* 1. QM Quality Launchpad */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
                  <h2 className="text-base font-bold text-[#243744] border-b border-slate-100 pb-3">QM Quality Launchpad</h2>
                  <QuickActionButton title="Approve Reports" description="Review & sign pending NABL certificates" icon={FileCheck} onClick={() => navigate("/reports")} badge="High Priority" />
                  <QuickActionButton title="User Management" description="Create & manage lab users" icon={Users} onClick={() => navigate("/users")} />
                  <QuickActionButton title="Enter Observations" description="Audit reading sheets & values" icon={TestTube} onClick={() => navigate("/observation-entry")} />
                  <QuickActionButton title="Testing Scope" description="View test parameters & standards" icon={FlaskConical} onClick={() => navigate("/scope")} />
                </div>

                {/* 2. Urgent Approval Action Queue */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                    <div className="flex items-center gap-2 text-[#243744] font-bold text-sm">
                      <AlertTriangle size={18} className="text-[#059669]" />
                      <span>Pending QM Approval Queue</span>
                    </div>
                    <span className="text-xs font-black text-[#059669] bg-emerald-100 px-2 py-0.5 rounded-full">
                      {stats.pendingTests || 0} Pending
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    Reports require your digital sign-off and verification before being released to clients.
                  </p>
                  <Button onClick={() => navigate("/reports")} className="w-full !bg-[#243744] hover:!bg-[#1a2933] text-white font-bold text-xs">
                    Review Pending Reports Queue
                  </Button>
                </div>

                {/* 3. Latest Quality Activity Stream */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <History className="text-[#243744]" size={18} />
                      <h2 className="text-base font-bold text-[#243744]">Quality & Audit Stream</h2>
                    </div>
                  </div>
                  {recentActivities.length > 0 ? (
                    <div className="space-y-3">
                      {recentActivities.map((act, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 text-xs">
                          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#243744] text-white">
                            <ShieldCheck size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-[#243744] truncate">{act.title}</p>
                            <span className="text-[10px] font-semibold text-slate-400">{act.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-slate-400 text-xs font-medium">
                      No quality audit logs recorded
                    </div>
                  )}
                </div>

              </div>

            </div>
          </>
        )}

        {/* ========================================================
            VIEW 4: ENGINEER (TEST ENGINEER) DASHBOARD (STRICT #243744 & #059669 PALETTE)
           ======================================================== */}
        {activeRole === "engineer" && (
          <>
            <motion.div variants={stagger.container} initial="hidden" animate="visible" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard title="My Scheduled Tests" value={stats.totalAssignments || 0} subtitle={`${stats.pendingTests || 0} Pending`} icon={CheckSquare} tone="navy" percentage={stats.totalAssignments ? 100 : 0} />
              <KpiCard title="Material Samples In-Test" value={stats.totalSamples || 0} subtitle="Physical Specimens" icon={FlaskConical} tone="emerald" percentage={stats.totalSamples ? 100 : 0} />
              <KpiCard title="Observations Filled" value={stats.completedObservations || 0} subtitle="Reading Sheets Recorded" icon={TestTube} tone="navy" percentage={stats.completedObservations ? 100 : 0} />
              <KpiCard title="Draft Reports Prepared" value={stats.totalReports || 0} subtitle="Awaiting QM Signoff" icon={FileText} tone="emerald" percentage={completionPercentage} />
            </motion.div>

            <div className="grid gap-6 xl:grid-cols-12 items-start">
              <div className="xl:col-span-8 space-y-6">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="text-[#059669]" size={20} />
                      <h2 className="text-base font-bold text-[#243744]">Test Execution Workload Stages</h2>
                    </div>
                  </div>
                  <div className="h-[260px] w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={engineerWorkloadData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Items Count" fill="#243744" radius={[6, 6, 0, 0]} barSize={36} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="xl:col-span-4 space-y-6">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
                  <h2 className="text-base font-bold text-[#243744] border-b border-slate-100 pb-3">Engineer Actions</h2>
                  <QuickActionButton title="Receive Material Lot" description="Register sample lot & receipt" icon={FlaskConical} onClick={() => navigate("/samples")} />
                  <QuickActionButton title="Enter Observations" description="Fill test reading sheets" icon={TestTube} onClick={() => navigate("/observation-entry")} badge="Active Work" />
                  <QuickActionButton title="Generate Report" description="Create draft report for QM review" icon={FileText} onClick={() => navigate("/reports")} />
                </div>
              </div>
            </div>
          </>
        )}

        {/* ========================================================
            VIEW 5: HELPER (LABOR) DASHBOARD
           ======================================================== */}
        {activeRole === "helper" && (
          <>
            <motion.div variants={stagger.container} initial="hidden" animate="visible" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
              <KpiCard title="Material Lots Received" value={stats.totalSamples || 0} subtitle="Registered Sample Lots" icon={FlaskConical} tone="navy" percentage={stats.totalSamples ? 100 : 0} />
              <KpiCard title="Assigned Observation Sheets" value={stats.completedObservations || 0} subtitle="Lab Reading Sheets Available" icon={TestTube} tone="emerald" percentage={stats.completedObservations ? 100 : 0} />
            </motion.div>

            <div className="grid gap-6 xl:grid-cols-12 items-start">
              <div className="xl:col-span-8 space-y-6">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-[#243744] font-bold text-base border-b border-slate-100 pb-3">
                    <FlaskConical size={18} />
                    <span>Material Lots Intake Volume</span>
                  </div>
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="samples" name="Material Lots" fill="#243744" radius={[6, 6, 0, 0]} barSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="xl:col-span-4 space-y-6">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
                  <h2 className="text-base font-bold text-[#243744] border-b border-slate-100 pb-3">Helper Operations</h2>
                  <QuickActionButton title="Receive Material Lot" description="Register incoming sample lot" icon={FlaskConical} onClick={() => navigate("/samples")} badge="Task" />
                  <QuickActionButton title="Fill Observations" description="Record test readings & values" icon={TestTube} onClick={() => navigate("/observation-entry")} badge="Task" />
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
