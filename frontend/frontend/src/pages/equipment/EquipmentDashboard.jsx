import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import MainLayout from "../../components/layout/MainLayout";
import { getEquipmentList } from "../../api";
import {
  EquipmentWorkspace,
  StatTile,
  SectionHeader,
  QuickActionCard,
  ActionLink,
  ComplianceFooter,
  stagger,
  CHART_COLORS,
  PRIMARY_CHART,
  getRemainingDays,
  formatDate,
  getCalibrationBadgeClass,
  getUrgencyLabel,
} from "../../components/equipment/EquipmentModuleShared";

const EquipmentDashboard = () => {
  const navigate = useNavigate();
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await getEquipmentList();
      if (res.success && res.data?.equipment) {
        setEquipments(res.data.equipment);
      } else {
        setEquipments([]);
      }
    } catch (err) {
      console.error("Failed to load equipment list:", err);
      setEquipments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, []);

  const stats = useMemo(() => {
    const total = equipments.length;
    const active = equipments.filter((eq) => eq.status === "Active").length;
    const due = equipments.filter((eq) =>
      eq.calibrationStatus === "Due Soon" || eq.calibrationStatus === "Due within 7 Days"
    ).length;
    const overdue = equipments.filter((eq) => eq.calibrationStatus === "Overdue").length;
    const maintenance = equipments.filter((eq) => eq.status === "Under Maintenance").length;
    const activePct = total ? ((active / total) * 100).toFixed(1) : 0;
    return { total, active, due, overdue, maintenance, activePct };
  }, [equipments]);

  const pieData = useMemo(() => {
    const counts = { Valid: 0, "Due Soon": 0, "Due within 7 Days": 0, Overdue: 0, "Not Required": 0 };
    equipments.forEach((eq) => {
      if (counts[eq.calibrationStatus] !== undefined) counts[eq.calibrationStatus]++;
    });
    return [
      { name: "Valid (>30 Days)", value: counts.Valid },
      { name: "Due Soon (7-30 Days)", value: counts["Due Soon"] },
      { name: "Due within 7 Days", value: counts["Due within 7 Days"] },
      { name: "Overdue", value: counts.Overdue },
      { name: "Not Required", value: counts["Not Required"] },
    ].filter((item) => item.value > 0);
  }, [equipments]);

  const barData = useMemo(() => {
    const labCounts = {};
    equipments.forEach((eq) => { labCounts[eq.laboratory] = (labCounts[eq.laboratory] || 0) + 1; });
    return Object.keys(labCounts).map((lab) => ({ name: lab, count: labCounts[lab] })).sort((a, b) => b.count - a.count);
  }, [equipments]);

  const dueSoonList = useMemo(() =>
    [...equipments]
      .filter((eq) => eq.calibrationStatus !== "Valid" && eq.calibrationStatus !== "Not Required")
      .sort((a, b) => new Date(a.nextDue) - new Date(b.nextDue)),
    [equipments]
  );

  const complianceIndex = useMemo(() => {
    if (!equipments.length) return 0;
    const valid = equipments.filter((eq) => eq.calibrationStatus === "Valid" || eq.calibrationStatus === "Not Required").length;
    return ((valid / equipments.length) * 100).toFixed(1);
  }, [equipments]);

  if (loading) {
    return (
      <MainLayout headerTitle="Equipment Overview" headerSubtitle="Lab equipment & standards control panel">
        <EquipmentWorkspace>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className="lab-skeleton h-32" />)}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="lab-skeleton h-80" />
            <div className="lab-skeleton h-80" />
          </div>
        </EquipmentWorkspace>
      </MainLayout>
    );
  }

  return (
    <MainLayout headerTitle="Equipment Overview" headerSubtitle="Lab equipment & standards control panel">
      <EquipmentWorkspace>
        {/* KPI Stats */}
        <motion.section
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"
          variants={stagger.container}
          initial="hidden"
          animate="visible"
        >
          <StatTile label="Total Equipment" value={stats.total} icon="microscope" tone="primary" caption="Registry" />
          <StatTile label="Active Equipment" value={stats.active} icon="check" tone="success" caption={`${stats.activePct}%`} />
          <StatTile label="Calibration Due" value={stats.due} icon="calendar" tone="warning" caption="30 days" trend="down" />
          <StatTile label="Overdue" value={stats.overdue} icon="warning" tone="danger" caption="Critical" trend="down" />
          <StatTile label="Under Maintenance" value={stats.maintenance} icon="wrench" tone="info" caption="Active" />
        </motion.section>

        {/* Charts */}
        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          <motion.div
            className="lab-panel"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <SectionHeader eyebrow="Compliance" title="Calibration Status" />
            <div className="flex h-[280px] items-center justify-center">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={3} dataKey="value">
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} instruments`, "Count"]} />
                    <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-[#8A97A4]">No calibration data available</p>
              )}
            </div>
          </motion.div>

          <motion.div
            className="lab-panel"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <SectionHeader eyebrow="Distribution" title="Equipment by Laboratory" />
            <div className="h-[280px]">
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E6EB" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#57687A" }} />
                    <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11, fill: "#1A2733", fontWeight: 500 }} />
                    <Tooltip formatter={(value) => [`${value} units`, "Quantity"]} />
                    <Bar dataKey="count" fill={PRIMARY_CHART} radius={[0, 6, 6, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-[#8A97A4]">No laboratory data available</p>
              )}
            </div>
          </motion.div>
        </section>

        {/* Due Soon + Quick Actions */}
        <section className="mt-5 grid gap-4 lg:grid-cols-3">
          <motion.div
            className="lab-panel lg:col-span-2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <SectionHeader
              eyebrow="Alerts"
              title="Calibration Due Soon"
              action={<ActionLink onClick={() => navigate("/calibration/due-overdue")}>View All</ActionLink>}
            />
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2E6EB] text-left text-[11px] font-semibold uppercase tracking-wider text-[#8A97A4]">
                    <th className="py-2.5 px-3">Equipment</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Urgency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF0F3]">
                  {dueSoonList.slice(0, 5).map((eq) => {
                    const daysLeft = getRemainingDays(eq.nextDue);
                    const urgency = getUrgencyLabel(daysLeft);
                    return (
                      <tr
                        key={eq.id}
                        className="cursor-pointer transition-colors hover:bg-[#F6F7F9]"
                        onClick={() => navigate(`/equipment/view/${eq.id}`)}
                      >
                        <td className="py-3 px-3">
                          <span className="block font-semibold text-[#1A2733]">{eq.name}</span>
                          <span className="text-xs text-[#8A97A4]">{eq.id} · {eq.laboratory}</span>
                        </td>
                        <td className="py-3 px-3 font-medium text-[#57687A]">{formatDate(eq.nextDue)}</td>
                        <td className="py-3 px-3">
                          <span className={getCalibrationBadgeClass(eq.calibrationStatus)}>{eq.calibrationStatus}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={urgency.className}>{urgency.text}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {dueSoonList.length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-10 text-center text-sm font-medium text-[#8A97A4]">
                        All equipment is fully certified.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          <motion.div
            className="lab-panel flex flex-col"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <SectionHeader eyebrow="Shortcuts" title="Quick Actions" />
            <div className="grid grid-cols-2 gap-3">
              <QuickActionCard title="Add Equipment" icon="plus" tone="primary" onClick={() => navigate("/equipment/add")} />
              <QuickActionCard title="Add Calibration" icon="fileText" tone="success" onClick={() => navigate("/calibration/register", { state: { openAddCalibration: true } })} />
              <QuickActionCard title="Calendar View" icon="calendar" tone="primary" onClick={() => navigate("/calibration/calendar")} />
              <QuickActionCard title="Due Report" icon="warning" tone="warning" onClick={() => navigate("/calibration/due-overdue")} />
            </div>
            <ComplianceFooter index={complianceIndex} />
          </motion.div>
        </section>
      </EquipmentWorkspace>
    </MainLayout>
  );
};

export default EquipmentDashboard;
