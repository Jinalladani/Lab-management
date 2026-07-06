import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { TrendingUp } from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import { getCalibrationDashboard } from "../../api";
import {
  EquipmentWorkspace,
  StatTile,
  SectionHeader,
  ActionLink,
  stagger,
  CHART_COLORS,
  PRIMARY_CHART,
  getRemainingDays,
  formatDate,
  getUrgencyLabel,
} from "../../components/equipment/EquipmentModuleShared";

const CalibrationDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalCount: 0, validCount: 0, dueCount: 0, due7Count: 0, overdueCount: 0 });
  const [upcomingCalibrations, setUpcomingCalibrations] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [totalCost, setTotalCost] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await getCalibrationDashboard();
      if (res.success && res.data) {
        setStats(res.data.stats || {});
        setUpcomingCalibrations(res.data.upcoming || []);
        setTrendData(res.data.trends || []);
        setTotalCost(res.data.cost || 0);
      }
    } catch (err) {
      console.error("Failed to load calibration dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const validPercent = stats.totalCount ? ((stats.validCount / stats.totalCount) * 100).toFixed(1) : 0;

  const pieData = useMemo(() => [
    { name: "Valid", value: stats.validCount },
    { name: "Due Soon", value: stats.dueCount },
    { name: "Due within 7 Days", value: stats.due7Count },
    { name: "Overdue", value: stats.overdueCount },
  ].filter((item) => item.value > 0), [stats]);

  const budgetPct = totalCost ? Math.min(100, Math.round((totalCost / 200000) * 100)) : 62;

  if (loading) {
    return (
      <MainLayout headerTitle="Calibration Control Center" headerSubtitle="Traceability audits & compliance status">
        <EquipmentWorkspace>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className="lab-skeleton h-32" />)}
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <div className="lab-skeleton h-72 xl:col-span-1" />
            <div className="lab-skeleton h-72 xl:col-span-2" />
          </div>
        </EquipmentWorkspace>
      </MainLayout>
    );
  }

  return (
    <MainLayout headerTitle="Calibration Control Center" headerSubtitle="Traceability audits & compliance status">
      <EquipmentWorkspace>
        {/* KPI Stats */}
        <motion.section
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"
          variants={stagger.container}
          initial="hidden"
          animate="visible"
        >
          <StatTile label="Total Equipment" value={stats.totalCount} icon="microscope" tone="primary" caption="Tracked" />
          <StatTile label="Valid Status" value={stats.validCount} icon="check" tone="success" caption={`${validPercent}%`} />
          <StatTile label="Due Soon" value={stats.dueCount} icon="calendar" tone="warning" caption="7-30 days" trend="down" />
          <StatTile label="Due within 7 Days" value={stats.due7Count} icon="timer" tone="danger" caption="Urgent" trend="down" />
          <StatTile label="Overdue" value={stats.overdueCount} icon="warning" tone="danger" caption="Critical" trend="down" />
        </motion.section>

        {/* Charts */}
        <section className="mt-5 grid gap-4 xl:grid-cols-3">
          <motion.div
            className="lab-panel xl:col-span-1"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <SectionHeader eyebrow="Status" title="Calibration Status" />
            <div className="flex h-[240px] items-center justify-center">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={78} paddingAngle={3} dataKey="value">
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} devices`, "Count"]} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-[#8A97A4]">No calibration records found</p>
              )}
            </div>
          </motion.div>

          <motion.div
            className="lab-panel xl:col-span-2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <SectionHeader eyebrow="Trends" title="Calibration Trend (Last 6 Months)" />
            <div className="h-[240px]">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E6EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#57687A" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#57687A" }} allowDecimals={false} />
                    <Tooltip formatter={(value) => [`${value} calibrations`, "Completed"]} />
                    <Line type="monotone" dataKey="calibrations" stroke={PRIMARY_CHART} strokeWidth={2.5} dot={{ fill: PRIMARY_CHART, strokeWidth: 2 }} activeDot={{ r: 6, fill: PRIMARY_CHART }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="flex h-full items-center justify-center text-sm text-[#8A97A4]">No trend data available</p>
              )}
            </div>
          </motion.div>
        </section>

        {/* Upcoming + Cost */}
        <section className="mt-5 grid gap-4 lg:grid-cols-3">
          <motion.div
            className="lab-panel lg:col-span-2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <SectionHeader
              eyebrow="Schedule"
              title="Upcoming Calibrations (Next 30 Days)"
              action={<ActionLink onClick={() => navigate("/calibration/calendar")}>Calendar View</ActionLink>}
            />
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2E6EB] text-left text-[11px] font-semibold uppercase tracking-wider text-[#8A97A4]">
                    <th className="py-2.5 px-3">Equipment</th>
                    <th className="py-2.5 px-3">Equipment ID</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF0F3]">
                  {upcomingCalibrations.slice(0, 5).map((eq) => {
                    const daysLeft = getRemainingDays(eq.nextDue);
                    const urgency = getUrgencyLabel(daysLeft);
                    return (
                      <tr key={eq.id} className="transition-colors hover:bg-[#F6F7F9]">
                        <td className="py-3 px-3 font-semibold text-[#1A2733]">{eq.name}</td>
                        <td className="py-3 px-3 font-bold text-[#3F6E8C]">{eq.id}</td>
                        <td className="py-3 px-3 font-medium text-[#57687A]">{formatDate(eq.nextDue)}</td>
                        <td className="py-3 px-3"><span className={urgency.className}>{urgency.text}</span></td>
                      </tr>
                    );
                  })}
                  {upcomingCalibrations.length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-10 text-center text-sm font-medium text-[#8A97A4]">
                        No calibrations scheduled in the next 30 days.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          <motion.div
            className="lab-panel flex flex-col justify-between"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div>
              <SectionHeader eyebrow="Finance" title="Calibration Cost (This Year)" />
              <div className="space-y-4">
                <div>
                  <span className="text-3xl font-extrabold text-[#1A2733]">
                    ₹ {(totalCost || 0).toLocaleString("en-IN")}
                  </span>
                  <div className="mt-1 flex items-center gap-1">
                    <TrendingUp size={14} className="text-[#16A34A]" />
                    <span className="text-xs font-semibold text-[#16A34A]">
                      +10.4% <span className="font-medium text-[#8A97A4]">vs last year</span>
                    </span>
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex justify-between text-[11px] font-semibold uppercase text-[#8A97A4]">
                    <span>Yearly Budget Consumed</span>
                    <span className="text-[#1A2733]">{budgetPct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#EDF0F3]">
                    <div className="lab-meter-fill h-full" style={{ width: `${budgetPct}%` }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 space-y-2 border-t border-[#E2E6EB] pt-4 text-xs font-medium text-[#57687A]">
              <div className="flex justify-between">
                <span>Avg. Cost / Certificate</span>
                <span className="font-bold text-[#1A2733]">₹ 11,250</span>
              </div>
              <div className="flex justify-between">
                <span>Active Contracts</span>
                <span className="font-bold text-[#16A34A]">3 Agencies</span>
              </div>
            </div>
          </motion.div>
        </section>
      </EquipmentWorkspace>
    </MainLayout>
  );
};

export default CalibrationDashboard;
