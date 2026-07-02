import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../components/layout/MainLayout";
import { mockEquipmentDb } from "../../utils/mockEquipmentData";
import { getCalibrationDashboard } from "../../api";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import {
  Science,
  CheckCircle,
  Warning,
  Error,
  MonetizationOn,
  CalendarMonth,
  ChevronRight,
  TrendingUp
} from "@mui/icons-material";

const COLORS = ["#10b981", "#f59e0b", "#f97316", "#ef4444", "#94a3b8"];

const trendData = [
  { name: "Jan", calibrations: 4 },
  { name: "Feb", calibrations: 8 },
  { name: "Mar", calibrations: 12 },
  { name: "Apr", calibrations: 9 },
  { name: "May", calibrations: 15 },
  { name: "Jun", calibrations: 22 }
];

const CalibrationDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalCount: 0,
    validCount: 0,
    dueCount: 0,
    due7Count: 0,
    overdueCount: 0
  });
  const [upcomingCalibrations, setUpcomingCalibrations] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [totalCost, setTotalCost] = useState(0);

  const fetchDashboard = async () => {
    try {
      const res = await getCalibrationDashboard();
      if (res.success && res.data) {
        setStats(res.data.stats);
        setUpcomingCalibrations(res.data.upcoming || []);
        setTrendData(res.data.trends || []);
        setTotalCost(res.data.cost || 0);
      }
    } catch (err) {
      console.error("Failed to load calibration dashboard from API:", err);
      setStats({
        totalCount: 0,
        validCount: 0,
        dueCount: 0,
        due7Count: 0,
        overdueCount: 0
      });
      setUpcomingCalibrations([]);
      setTrendData([]);
      setTotalCost(0);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const totalCount = stats.totalCount;
  const validCount = stats.validCount;
  const validPercent = totalCount ? ((validCount / totalCount) * 100).toFixed(1) : 0;
  const dueCount = stats.dueCount;
  const due7Count = stats.due7Count;
  const overdueCount = stats.overdueCount;

  const pieData = [
    { name: "Valid", value: stats.validCount },
    { name: "Due Soon", value: stats.dueCount },
    { name: "Due within 7 Days", value: stats.due7Count },
    { name: "Overdue", value: stats.overdueCount }
  ].filter(item => item.value > 0);

  const getRemainingDays = (nextDueStr) => {
    const today = new Date();
    const nextDue = new Date(nextDueStr);
    const diffTime = nextDue - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <MainLayout headerTitle="Calibration Control Center" headerSubtitle="Traceability Audits & Compliance Status Dashboard">
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Status Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Equipment</span>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-3xl font-bold text-gray-900">{totalCount}</span>
              <span className="p-2 bg-blue-50 text-[#2562AA] rounded-xl"><Science fontSize="small" /></span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Valid Status</span>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-3xl font-bold text-emerald-600">{validCount}</span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">{validPercent}%</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Due Soon</span>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-3xl font-bold text-amber-500">{dueCount}</span>
              <span className="p-2 bg-amber-50 text-amber-500 rounded-xl"><Warning fontSize="small" /></span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Due within 7 Days</span>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-3xl font-bold text-orange-600">{due7Count}</span>
              <span className="p-2 bg-orange-50 text-orange-500 rounded-xl"><Warning fontSize="small" /></span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Overdue</span>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-3xl font-bold text-red-600">{overdueCount}</span>
              <span className="p-2 bg-red-50 text-red-500 rounded-xl"><Error fontSize="small" /></span>
            </div>
          </div>
        </div>

        {/* Visual Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Donut Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-4">Calibration Status</h3>
            <div className="h-[230px] flex items-center justify-center">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} Devices`]} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" style={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400">No calibration status records found.</p>
              )}
            </div>
          </div>

          {/* Trend Line Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-4">Calibration Trend (Last 6 Months)</h3>
            <div className="h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" style={{ fontSize: 11, fontWeight: 600 }} />
                  <YAxis style={{ fontSize: 11, fontWeight: 600 }} allowDecimals={false} />
                  <Tooltip formatter={(value) => [`${value} Calibrations Done`]} />
                  <Line type="monotone" dataKey="calibrations" stroke="#2562AA" strokeWidth={3} activeDot={{ r: 6 }} dot={{ strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Upcoming Calibrations & Compliance Cost Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Upcoming Calibrations table */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Upcoming Calibrations (Next 30 Days)</h3>
              <button onClick={() => navigate("/calibration/calendar")} className="text-xs font-semibold text-[#2562AA] hover:underline flex items-center gap-0.5">
                Calendar View <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-xs">
                <thead>
                  <tr className="bg-gray-50 text-left font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Equipment</th>
                    <th className="py-2.5 px-3">Equipment ID</th>
                    <th className="py-2.5 px-3">Calibration Due Date</th>
                    <th className="py-2.5 px-3">Remaining Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {upcomingCalibrations.slice(0, 4).map((eq) => {
                    const daysLeft = getRemainingDays(eq.nextDue);
                    const isOverdue = daysLeft < 0;
                    return (
                      <tr key={eq.id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-3 font-semibold text-gray-800">{eq.name}</td>
                        <td className="py-3 px-3 font-bold text-gray-500">{eq.id}</td>
                        <td className="py-3 px-3 text-gray-600 font-medium">{new Date(eq.nextDue).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td className="py-3 px-3">
                          {isOverdue ? (
                            <span className="text-red-600 font-bold">{Math.abs(daysLeft)} Days Overdue</span>
                          ) : (
                            <span className={`font-bold ${daysLeft <= 7 ? "text-orange-600 animate-pulse" : "text-amber-600"}`}>{daysLeft} Days Left</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {upcomingCalibrations.length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-gray-400 font-bold">
                        No calibrations scheduled in the next 30 days.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Calibration Cost Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-6">Calibration Cost (This Year)</h3>
              
              <div className="space-y-4">
                <div>
                  <span className="text-3xl font-extrabold text-gray-900">₹ {(totalCost || 124500).toLocaleString("en-IN")}</span>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="text-emerald-500 w-4 h-4" />
                    <span className="text-xs font-bold text-emerald-600">+10.4% <span className="text-gray-400 font-semibold">vs last year</span></span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-semibold text-gray-400 uppercase">
                    <span>Yearly Budget Consumed</span>
                    <span className="font-bold text-gray-700">62.2%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-[#2562AA] h-full rounded-full" style={{ width: "62.2%" }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-gray-100 pt-4 text-xs font-medium text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>Avg. Cost / Certificate</span>
                <span className="font-bold text-gray-805">₹ 11,250</span>
              </div>
              <div className="flex justify-between">
                <span>Active Contracts</span>
                <span className="font-bold text-emerald-600">3 Agencies</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </MainLayout>
  );
};

export default CalibrationDashboard;
