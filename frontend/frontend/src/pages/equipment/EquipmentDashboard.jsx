import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../components/layout/MainLayout";
import { mockEquipmentDb } from "../../utils/mockEquipmentData";
import { getEquipmentList } from "../../api";
import {
  Science,
  Build,
  CalendarMonth,
  Warning,
  CheckCircle,
  ReportProblem,
  ChevronRight,
  Add,
  EventNote,
  Assessment
} from "@mui/icons-material";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

const COLORS = ["#10b981", "#f59e0b", "#f97316", "#ef4444", "#94a3b8"];

const EquipmentDashboard = () => {
  const navigate = useNavigate();
  const [equipments, setEquipments] = useState([]);
  const [dueSoonList, setDueSoonList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await getEquipmentList();
      if (res.success && res.data?.equipment) {
        const data = res.data.equipment;
        setEquipments(data);
        const sorted = [...data]
          .filter(eq => eq.calibrationStatus !== "Valid" && eq.calibrationStatus !== "Not Required")
          .sort((a, b) => new Date(a.nextDue) - new Date(b.nextDue));
        setDueSoonList(sorted);
      }
    } catch (err) {
      console.error("Failed to load equipment list from API:", err);
      setEquipments([]);
      setDueSoonList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Compute stats
  const totalCount = equipments.length;
  const activeCount = equipments.filter(eq => eq.status === "Active").length;
  const activePercent = totalCount ? ((activeCount / totalCount) * 100).toFixed(1) : 0;
  
  const dueCount = equipments.filter(eq => eq.calibrationStatus === "Due Soon" || eq.calibrationStatus === "Due within 7 Days").length;
  const overdueCount = equipments.filter(eq => eq.calibrationStatus === "Overdue").length;
  const maintenanceCount = equipments.filter(eq => eq.status === "Under Maintenance").length;

  // Prepare Calibration Status Chart Data
  const statusCounts = {
    "Valid": 0,
    "Due Soon": 0,
    "Due within 7 Days": 0,
    "Overdue": 0,
    "Not Required": 0
  };
  equipments.forEach(eq => {
    if (statusCounts[eq.calibrationStatus] !== undefined) {
      statusCounts[eq.calibrationStatus]++;
    }
  });

  const pieData = [
    { name: "Valid", value: statusCounts["Valid"] },
    { name: "Due Soon (7-30 Days)", value: statusCounts["Due Soon"] },
    { name: "Due within 7 Days", value: statusCounts["Due within 7 Days"] },
    { name: "Overdue", value: statusCounts["Overdue"] },
    { name: "Not Required", value: statusCounts["Not Required"] }
  ].filter(item => item.value > 0);

  // Prepare Lab Distribution Chart Data
  const labCounts = {};
  equipments.forEach(eq => {
    labCounts[eq.laboratory] = (labCounts[eq.laboratory] || 0) + 1;
  });
  const barData = Object.keys(labCounts).map(lab => ({
    name: lab,
    count: labCounts[lab]
  })).sort((a, b) => b.count - a.count);

  // Helper for countdown styling
  const getRemainingDays = (nextDueStr) => {
    const today = new Date();
    const nextDue = new Date(nextDueStr);
    const diffTime = nextDue - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <MainLayout headerTitle="Equipment & Calibration Overview" headerSubtitle="LIMS Lab Equipment & Standards Control Panel">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        
        {/* KPI Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Equipment</span>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-3xl font-bold text-gray-900">{totalCount}</span>
              <span className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Science fontSize="small" /></span>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Equipment</span>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-3xl font-bold text-gray-900">{activeCount}</span>
              <div className="flex flex-col items-end">
                <span className="text-xs font-medium text-emerald-600 flex items-center bg-emerald-50 px-2 py-0.5 rounded-lg">
                  <CheckCircle className="w-3.5 h-3.5 mr-0.5" /> {activePercent}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Calibration Due</span>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-3xl font-bold text-gray-900">{dueCount}</span>
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">Due in 30 days</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Overdue</span>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-3xl font-bold text-red-600">{overdueCount}</span>
              <span className="p-1 bg-red-50 text-red-500 rounded-xl"><ReportProblem fontSize="small" /></span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Under Maintenance</span>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-3xl font-bold text-indigo-900">{maintenanceCount}</span>
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Build fontSize="small" /></span>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calibration Status Pie Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">Calibration Status</h3>
            <div className="h-[260px] flex items-center justify-center">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} Instruments`]} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400">No data available</p>
              )}
            </div>
          </div>

          {/* Equipment by Lab Bar Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">Equipment by Laboratory</h3>
            <div className="h-[260px]">
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" width={80} style={{ fontSize: 12, fontWeight: 500 }} />
                    <Tooltip formatter={(value) => [`${value} Units`, "Quantity"]} />
                    <Bar dataKey="count" fill="#2562AA" radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400">No data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Due Soon and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calibration Due Soon Table */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Calibration Due Soon</h3>
              <button 
                onClick={() => navigate("/calibration/due-overdue")}
                className="text-xs font-semibold text-[#2562AA] hover:text-blue-700 flex items-center gap-0.5"
              >
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                    <th className="py-2.5 px-3">Equipment</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Urgency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-sm">
                  {dueSoonList.slice(0, 4).map((eq) => {
                    const daysLeft = getRemainingDays(eq.nextDue);
                    const isOverdue = daysLeft < 0;
                    return (
                      <tr key={eq.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-semibold text-gray-800 block">{eq.name}</span>
                          <span className="text-xs text-gray-500">{eq.id} • {eq.laboratory}</span>
                        </td>
                        <td className="py-3 px-3 text-gray-600 font-medium">
                          {new Date(eq.nextDue).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            eq.calibrationStatus === "Overdue" 
                              ? "bg-red-50 text-red-700" 
                              : eq.calibrationStatus === "Due within 7 Days"
                              ? "bg-orange-50 text-orange-700"
                              : "bg-amber-50 text-amber-700"
                          }`}>
                            {eq.calibrationStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {isOverdue ? (
                            <span className="text-xs font-bold text-red-600">{Math.abs(daysLeft)} Days Overdue</span>
                          ) : (
                            <span className={`text-xs font-bold ${
                              daysLeft <= 7 ? "text-orange-600" : "text-amber-600"
                            }`}>{daysLeft} Days Left</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {dueSoonList.length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-gray-400 font-medium">
                        No equipment due for calibration. All devices are fully certified!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-6">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => navigate("/equipment/list", { state: { openAddWizard: true } })}
                  className="p-4 bg-blue-50/50 hover:bg-blue-50 text-blue-800 rounded-2xl border border-blue-100 flex flex-col items-center justify-center gap-2 hover:scale-[1.03] transition-all group"
                >
                  <Add className="text-[#2562AA] group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-center">Add Equipment</span>
                </button>
                
                <button
                  onClick={() => navigate("/calibration/register", { state: { openAddCalibration: true } })}
                  className="p-4 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center gap-2 hover:scale-[1.03] transition-all group"
                >
                  <EventNote className="text-emerald-600 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-center">Add Calibration</span>
                </button>

                <button
                  onClick={() => navigate("/calibration/calendar")}
                  className="p-4 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-800 rounded-2xl border border-indigo-100 flex flex-col items-center justify-center gap-2 hover:scale-[1.03] transition-all group"
                >
                  <CalendarMonth className="text-indigo-600 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-center">Calendar View</span>
                </button>

                <button
                  onClick={() => navigate("/calibration/due-overdue")}
                  className="p-4 bg-amber-50/50 hover:bg-amber-50 text-amber-800 rounded-2xl border border-amber-100 flex flex-col items-center justify-center gap-2 hover:scale-[1.03] transition-all group"
                >
                  <Warning className="text-amber-600 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-center">Due Report</span>
                </button>
              </div>
            </div>

            <div className="mt-8 border-t border-gray-100 pt-4 flex justify-between items-center bg-gray-50 -mx-6 -mb-6 p-4 rounded-b-2xl">
              <div className="flex items-center gap-2 text-gray-500">
                <Assessment className="text-gray-400" />
                <span className="text-xs font-medium">Compliance Index: <strong className="text-emerald-600">96.2%</strong></span>
              </div>
              <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
            </div>
          </div>
        </div>

      </div>
    </MainLayout>
  );
};

export default EquipmentDashboard;
