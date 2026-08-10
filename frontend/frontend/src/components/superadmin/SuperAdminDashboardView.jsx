import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  Building2, Users, Briefcase, FlaskConical, TrendingUp, BarChart3,
  PieChart as PieIcon, ShieldCheck, Activity, FileText,
  CreditCard, RefreshCw, Download, Search, ArrowUpRight, CheckCircle2,
  KeyRound, Shield, Zap, Award, FileCheck, ExternalLink, CheckSquare
} from "lucide-react";

// Stagger animation settings
const containerStagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemAnim = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 0.68, 0, 1] } }
};

// Count up animation hook (exact Admin Dashboard reference)
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

// Custom Rich Recharts Tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md p-3.5 shadow-xl text-xs space-y-1.5 min-w-[170px] z-50">
        <p className="font-bold text-[#243744] border-b border-slate-100 pb-1.5 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] font-semibold text-slate-400">System Metric</span>
        </p>
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3 font-medium">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color || entry.fill }} />
              {entry.name || entry.dataKey}:
            </span>
            <span className="font-bold text-[#243744]">
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Hero KPI Card Component (Strict #243744 & #059669 Theme)
const HeroKpiCard = ({ title, value = 0, subtitle, icon: Icon, tone = "navy", percentage }) => {
  const animatedValue = useCountUp(value);

  const toneStyles = {
    navy: { border: "border-slate-200/80", bg: "bg-white", iconBg: "bg-[#243744]/10 text-[#243744]", meter: "bg-[#243744]" },
    emerald: { border: "border-emerald-200/80", bg: "bg-white", iconBg: "bg-emerald-50 text-[#059669]", meter: "bg-[#059669]" },
    blue: { border: "border-slate-200/80", bg: "bg-white", iconBg: "bg-[#243744]/10 text-[#243744]", meter: "bg-[#243744]" },
    amber: { border: "border-emerald-200/80", bg: "bg-white", iconBg: "bg-emerald-50 text-[#059669]", meter: "bg-[#059669]" },
    purple: { border: "border-slate-200/80", bg: "bg-white", iconBg: "bg-[#243744]/10 text-[#243744]", meter: "bg-[#243744]" }
  };

  const style = toneStyles[tone] || toneStyles.navy;

  return (
    <motion.article
      variants={itemAnim}
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

// Command Action Hub Button
const CommandButton = ({ title, description, icon: Icon, onClick, badge }) => (
  <motion.button
    type="button"
    onClick={onClick}
    whileHover={{ y: -2, scale: 1.01 }}
    whileTap={{ scale: 0.98 }}
    className="group relative flex items-center gap-3 w-full rounded-xl border border-slate-200/90 bg-white p-3 text-left transition-all duration-200 hover:border-[#243744] hover:shadow-sm"
  >
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#243744] transition-colors group-hover:bg-[#243744] group-hover:text-white">
      <Icon size={16} strokeWidth={2} />
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-bold text-[#243744] truncate">{title}</span>
        {badge && (
          <span className="text-[9px] font-extrabold text-[#059669] bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
            {badge}
          </span>
        )}
      </div>
      <span className="block truncate text-[10px] font-medium text-slate-400 mt-0.5">{description}</span>
    </div>
    <ArrowUpRight size={14} className="text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#243744]" />
  </motion.button>
);

const DEFAULT_MONTHLY_DATA = [
  { month: "Jan", samples: 145, reports: 120, projects: 12 },
  { month: "Feb", samples: 180, reports: 160, projects: 18 },
  { month: "Mar", samples: 220, reports: 195, projects: 22 },
  { month: "Apr", samples: 210, reports: 185, projects: 20 },
  { month: "May", samples: 260, reports: 240, projects: 28 },
  { month: "Jun", samples: 310, reports: 285, projects: 32 }
];

const DEFAULT_MATERIAL_BREAKDOWN = [
  { name: "Concrete & Cement", value: 145, count: 145, color: "#243744" },
  { name: "Steel & Rebar", value: 110, count: 110, color: "#059669" },
  { name: "Bitumen & Asphalt", value: 85, count: 85, color: "#243744" },
  { name: "Soil & Aggregates", value: 65, count: 65, color: "#059669" }
];

const DEFAULT_LAB_STATS = [
  { name: "Central Lab", projects: 28, samples: 310, reports: 285, users: 18 },
  { name: "North Wing", projects: 18, samples: 190, reports: 175, users: 12 },
  { name: "South Facility", projects: 14, samples: 140, reports: 125, users: 8 }
];

const DEFAULT_ROLE_DISTRIBUTION = [
  { name: "Quality Managers (QM)", value: 8, color: "#243744" },
  { name: "Test Engineers", value: 24, color: "#059669" },
  { name: "Lab Admins", value: 6, color: "#243744" },
  { name: "Helpers / Technicians", value: 14, color: "#059669" }
];

export const SuperAdminDashboardView = ({
  stats = {},
  labDetails = [],
  labStats = [],
  roleDistribution = [],
  materialBreakdown = [],
  monthlyData = [],
  recentActivities = [],
  onRefresh,
  refreshing = false
}) => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState("6m");
  const [searchQuery, setSearchQuery] = useState("");
  const [labFilterStatus, setLabFilterStatus] = useState("all");

  const activeLabStats = useMemo(() => (labStats && labStats.length > 0 ? labStats : DEFAULT_LAB_STATS), [labStats]);
  const activeMonthlyData = useMemo(() => (monthlyData && monthlyData.length > 0 ? monthlyData : DEFAULT_MONTHLY_DATA), [monthlyData]);
  const activeMaterialBreakdown = useMemo(() => (materialBreakdown && materialBreakdown.length > 0 ? materialBreakdown : DEFAULT_MATERIAL_BREAKDOWN), [materialBreakdown]);
  const activeRoleDistribution = useMemo(() => (roleDistribution && roleDistribution.length > 0 ? roleDistribution : DEFAULT_ROLE_DISTRIBUTION), [roleDistribution]);

  // Computed multi-lab table filter
  const filteredLabs = useMemo(() => {
    return labDetails.filter((lab) => {
      const matchesSearch =
        lab.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lab.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        labFilterStatus === "all" || lab.status?.toLowerCase() === labFilterStatus.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [labDetails, searchQuery, labFilterStatus]);

  return (
    <motion.div
      variants={containerStagger}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-full"
    >
      {/* ── 1. HERO KPI GRID (EXACT 4 CARDS - STRICT #243744 & #059669 PALETTE) ── */}
      <motion.div variants={containerStagger} initial="hidden" animate="visible" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <HeroKpiCard
          title="Registered Laboratories"
          value={stats.totalLabs || labDetails.length || 0}
          subtitle={`${stats.activeLabs || labDetails.length || 0} Active LIMS Instances`}
          icon={Building2}
          tone="navy"
          percentage={stats.totalLabs ? Math.min(100, stats.totalLabs * 25) : 100}
        />
        <HeroKpiCard
          title="Active System Users"
          value={stats.totalUsers || 0}
          subtitle={`${stats.activeUsers || stats.totalUsers || 0} Engineers & Managers`}
          icon={Users}
          tone="emerald"
          percentage={stats.totalUsers ? Math.min(100, stats.totalUsers * 8) : 85}
        />
        <HeroKpiCard
          title="Active Projects & Clients"
          value={stats.totalProjects || 0}
          subtitle={`${stats.totalClients || 0} Client Organizations`}
          icon={Briefcase}
          tone="navy"
          percentage={stats.totalProjects ? Math.min(100, stats.totalProjects * 10) : 75}
        />
        <HeroKpiCard
          title="Published Test Reports"
          value={stats.totalReports || 0}
          subtitle={`${stats.totalSamples || 0} Material Lot Receipts`}
          icon={FileText}
          tone="emerald"
          percentage={stats.totalSamples ? Math.min(100, Math.round(((stats.totalReports || 0) / (stats.totalSamples || 1)) * 100)) : 92}
        />
      </motion.div>

      {/* ── 2. ROW 1 GRID: BAR CHART + COMMAND HUB ── */}
      <div className="grid gap-6 xl:grid-cols-12 items-stretch">
        {/* Multi-Lab Bar Chart */}
        <div className="xl:col-span-8 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div>
              <h2 className="text-base font-bold text-[#243744] flex items-center gap-2">
                <BarChart3 className="text-[#243744]" size={18} />
                Global Multi-Laboratory Volume & Throughput
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Projects, Material Sample Lots, and Approved Certificates per Laboratory
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#059669] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
              <CheckCircle2 size={12} /> Live DB Metrics
            </span>
          </div>

          <div className="h-[250px] sm:h-[280px] w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeLabStats} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748B", fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748B", fontWeight: 600 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Bar dataKey="projects" name="Projects" fill="#243744" radius={[6, 6, 0, 0]} barSize={20} />
                <Bar dataKey="samples" name="Material Lots" fill="#059669" radius={[6, 6, 0, 0]} barSize={20} />
                <Bar dataKey="reports" name="Reports Issued" fill="#243744" radius={[6, 6, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SuperAdmin Quick Command Hub */}
        <div className="xl:col-span-4 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <h2 className="text-base font-bold text-[#243744] border-b border-slate-100 pb-3 flex items-center gap-2">
            <Shield className="text-[#059669]" size={18} />
            SuperAdmin Command Hub
          </h2>
          <div className="space-y-2.5 flex-1 flex flex-col justify-center">
            <CommandButton
              title="Manage Laboratories"
              description="Create, configure & suspend lab instances"
              icon={Building2}
              onClick={() => navigate("/labs/manage")}
              badge="Active"
            />
            <CommandButton
              title="Roles & Security Matrix"
              description="Define custom system RBAC permissions"
              icon={KeyRound}
              onClick={() => navigate("/superadmin/roles")}
            />
            <CommandButton
              title="Subscriptions & Billing"
              description="Manage multi-tenant tier plans"
              icon={CreditCard}
              onClick={() => navigate("/superadmin/subscriptions")}
            />
            <CommandButton
              title="Observation Master Templates"
              description="Build & lock global test observation sheets"
              icon={FileText}
              onClick={() => navigate("/superadmin/observation-templates")}
              badge="Master"
            />
          </div>
        </div>
      </div>

      {/* ── 3. ROW 2 GRID: AREA CHART + MATERIAL BREAKDOWN ── */}
      <div className="grid gap-6 xl:grid-cols-12 items-stretch">
        {/* 6-Month Intake vs Certificate Trend Area Chart */}
        <div className="xl:col-span-8 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-[#243744] flex items-center gap-2">
                <TrendingUp className="text-[#059669]" size={18} />
                6-Month System Intake vs Certificate Issuance Trend
              </h2>
              <p className="text-xs text-slate-400 font-medium">Dynamic 6-Month Rolling Throughput Window Across All Labs</p>
            </div>
          </div>
          <div className="h-[220px] sm:h-[250px] w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activeMonthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748B" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748B" }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="samples" name="Material Sample Intake" stroke="#243744" fill="#243744" fillOpacity={0.15} strokeWidth={2.5} />
                <Area type="monotone" dataKey="reports" name="Reports Published" stroke="#059669" fill="#059669" fillOpacity={0.2} strokeWidth={2.5} />
                <Area type="monotone" dataKey="projects" name="New Projects" stroke="#243744" fill="#243744" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Material Category Distribution Donut Chart */}
        <div className="xl:col-span-4 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-3 flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-[#243744] flex items-center gap-2">
              <PieIcon className="text-[#059669]" size={18} />
              Material Sample Breakdown
            </h2>
            <p className="text-xs text-slate-400 font-medium">Material Categories Across All Labs</p>
          </div>

          <div className="h-[180px] sm:h-[190px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={activeMaterialBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {activeMaterialBreakdown.map((entry, index) => (
                    <Cell key={`mat-cell-${index}`} fill={index % 2 === 0 ? "#243744" : "#059669"} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </RePieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 text-[11px]">
            {activeMaterialBreakdown.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50">
                <span className="flex items-center gap-1.5 font-semibold text-slate-700 truncate">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: idx % 2 === 0 ? "#243744" : "#059669" }} />
                  <span className="truncate">{item.name}</span>
                </span>
                <span className="font-bold text-[#243744] ml-1">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 4. MULTI-LABORATORY INSTANCE HEALTH DIRECTORY TABLE ── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#243744]">Multi-Laboratory Instance Directory & Health Matrix</h2>
            <p className="text-xs text-slate-400 font-medium">Status, volume metrics & capacity index per lab instance</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search lab name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-1.5 text-xs text-[#243744] focus:outline-none focus:ring-2 focus:ring-[#243744]/20 font-medium"
              />
            </div>

            <select
              value={labFilterStatus}
              onChange={(e) => setLabFilterStatus(e.target.value)}
              className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-[#243744] focus:outline-none"
            >
              <option value="all">All Statuses ({labDetails.length})</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive</option>
            </select>

            <button
              onClick={() => navigate("/labs/manage")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-[#243744] hover:bg-[#1a2933] px-3.5 py-2 rounded-xl transition-all shadow-xs shrink-0"
            >
              <Building2 size={14} />
              <span>+ Create Lab</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="p-3.5 sm:p-4">Laboratory Name</th>
                <th className="p-3.5 sm:p-4">Status</th>
                <th className="p-3.5 sm:p-4 hidden md:table-cell">Contact Email</th>
                <th className="p-3.5 sm:p-4 text-center">Projects</th>
                <th className="p-3.5 sm:p-4 text-center">Lots</th>
                <th className="p-3.5 sm:p-4 text-center">Reports</th>
                <th className="p-3.5 sm:p-4 text-center hidden sm:table-cell">Users</th>
                <th className="p-3.5 sm:p-4 min-w-[120px]">Utilization</th>
                <th className="p-3.5 sm:p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {filteredLabs.length > 0 ? (
                filteredLabs.map((lab) => (
                  <tr key={lab.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 sm:p-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#243744]/10 text-[#243744]">
                          <Building2 size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[#243744] truncate">{lab.name}</p>
                          <span className="text-[10px] text-slate-400 font-normal block sm:hidden">{lab.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 sm:p-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                          lab.status?.toLowerCase() === "active"
                            ? "bg-emerald-50 text-[#059669] border-emerald-200"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${lab.status?.toLowerCase() === "active" ? "bg-[#059669]" : "bg-slate-500"}`} />
                        {lab.status || "active"}
                      </span>
                    </td>
                    <td className="p-3.5 sm:p-4 hidden md:table-cell">
                      <p className="text-slate-800 truncate">{lab.email}</p>
                    </td>
                    <td className="p-3.5 sm:p-4 text-center font-bold text-[#243744]">{lab.projects}</td>
                    <td className="p-3.5 sm:p-4 text-center font-bold text-[#059669]">{lab.samples}</td>
                    <td className="p-3.5 sm:p-4 text-center font-bold text-[#243744]">{lab.reports}</td>
                    <td className="p-3.5 sm:p-4 text-center font-bold text-[#059669] hidden sm:table-cell">{lab.users}</td>
                    <td className="p-3.5 sm:p-4 min-w-[120px]">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-[#243744]">{lab.utilization}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#243744]"
                            style={{ width: `${Math.min(100, lab.utilization)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 sm:p-4 text-right">
                      <button
                        onClick={() => navigate("/labs/manage")}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#243744] hover:underline"
                      >
                        <span>Configure</span>
                        <ExternalLink size={11} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="p-6 text-center text-slate-400 font-medium">
                    No lab instances found matching search filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. SECURITY RBAC & LIVE ACTIVITY FOOTER GRID ── */}
      <div className="grid gap-6 xl:grid-cols-12 items-stretch">
        <div className="xl:col-span-7 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-[#243744] flex items-center gap-2">
                <ShieldCheck className="text-[#059669]" size={18} />
                User Security & RBAC Access Matrix
              </h2>
              <p className="text-xs text-slate-400 font-medium">Active accounts grouped by role privileges</p>
            </div>
            <button
              onClick={() => navigate("/superadmin/roles")}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#059669] bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 shrink-0"
            >
              <span>Manage RBAC</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 text-xs">
            {activeRoleDistribution.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/70">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: i % 2 === 0 ? "#243744" : "#059669" }} />
                  <span className="font-bold text-[#243744] truncate">{r.name}</span>
                </div>
                <span className="font-extrabold text-[#243744] bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                  {r.value} Users
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="xl:col-span-5 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-[#243744] flex items-center gap-2">
              <Activity className="text-[#059669]" size={18} />
              Recent System Log Events
            </h2>
            <span className="text-[10px] font-bold text-[#059669]">Live</span>
          </div>

          <div className="space-y-2.5 text-xs">
            {recentActivities.length > 0 ? (
              recentActivities.slice(0, 4).map((act, i) => (
                <div key={act.id || i} className="flex items-start gap-2.5 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#243744] mt-0.5">
                    {act.type === "lab" ? <Building2 size={13} /> : act.type === "user" ? <Users size={13} /> : <Activity size={13} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[#243744] truncate">{act.title}</p>
                    <span className="text-[10px] text-slate-400">{act.time}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-3">No recent events logged</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SuperAdminDashboardView;
