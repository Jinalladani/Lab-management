import React, { useState, useEffect } from "react";
import { MainLayout } from "../components/layout";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { getDashboardData } from "../api/dashboard";
import {
  People,
  Science,
  Business,
  Assessment,
  TrendingUp,
  TrendingDown,
  Add,
  Visibility,
  Schedule,
  CheckCircle,
  Pending,
  Error,
} from "@mui/icons-material";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ['#2562AA', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const getRoleTitle = (role) => {
  if (!role) return "User";
  
  // Convert API role to proper display format
  // Remove underscores and convert to title case
  const formattedRole = role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  // Special cases for specific role mappings
  switch (role.toLowerCase()) {
    case "super_admin":
      return "Super Admin";
    case "admin":
      return "Admin";
    case "qm":
      return "QM";
    case "eng":
      return "Engineer";
    case "lab_admin":
      return "Lab Admin";
    case "lab_manager":
      return "Lab Manager";
    case "quality_manager":
      return "Quality Manager";
    case "test_engineer":
      return "Test Engineer";
    default:
      return formattedRole || "User";
  }
};

const StatCard = ({ title, value, icon: Icon, color, trend, trendValue }) => (
  <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] h-full">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex-1">
        <p className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wide">{title}</p>
        <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{(value || 0).toLocaleString()}</p>
        {trend && (
          <div className="flex items-center mt-2 sm:mt-3">
            {trend === 'up' ? (
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mr-1 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 mr-1 text-red-500" />
            )}
            <span className={`text-xs sm:text-sm font-medium ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
              {trendValue}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-center">
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
        </div>
      </div>
    </div>
  </div>
);

const QuickAction = ({ title, icon: Icon, onClick, color }) => (
  <button
    onClick={onClick}
    className="w-full bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-5 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] text-left focus:outline-none focus:ring-2 focus:ring-[#2562AA] focus:ring-offset-4 group"
  >
    <div className="flex items-center gap-3 sm:gap-4">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${color} shadow-lg group-hover:shadow-xl transition-shadow flex-shrink-0`}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-gray-900 text-base sm:text-lg group-hover:text-[#2562AA] transition-colors truncate">{title}</h3>
      </div>
    </div>
  </button>
);

const RecentActivity = ({ type, title, time, status }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'project': return <Business className="w-4 h-4" />;
      case 'sample': return <Science className="w-4 h-4" />;
      case 'client': return <People className="w-4 h-4" />;
      default: return <Assessment className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:shadow-md transition-all duration-200">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2562AA] to-[#1e4f8a] flex items-center justify-center text-white shadow-lg">
        {getIcon(type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
        <p className="text-xs text-gray-500 mt-1">{time}</p>
      </div>
      <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getStatusColor(status)}`}>
        {status}
      </span>
    </div>
  );
};

const Home = () => {
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalSamples: 0,
    totalClients: 0,
    totalLabs: 0,
    totalUsers: 0,
    pendingTests: 0,
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [testStatusData, setTestStatusData] = useState([]);
  const [labStats, setLabStats] = useState([]);
  const [roleDistribution, setRoleDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const user = (() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch dashboard data from API endpoint
      const response = await getDashboardData();
      const data = response.data.data;

      // Check user role and set appropriate data
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (user.role === 'superadmin' || user.role === 'super_admin') {
        // Superadmin: Show total labs, total projects, total clients
        setStats({
          totalLabs: data.stats?.totalLabs || 0,
          totalUsers: data.stats?.totalUsers || 0,
          totalProjects: data.stats?.totalProjects || 0,
          totalClients: data.stats?.totalClients || 0,
        });
        
        // Set lab stats for superadmin
        setLabStats(data.labStats || []);
        setRoleDistribution(data.roleDistribution || []);
        
      } else {
        // Admin, QM, Eng: Show current dashboard
        setStats({
          totalProjects: data.stats?.totalProjects || 0,
          totalSamples: data.stats?.totalSamples || 0,
          totalClients: data.stats?.totalClients || 0,
          pendingTests: data.stats?.pendingTests || 0,
        });
        
        // Set monthly data for current dashboard
        setMonthlyData(data.monthlyData || []);
        setTestStatusData(data.testStatusData || []);
      }
      
      // Set recent activities (common for both)
      setRecentActivities(data.recentActivities || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Add New Project',
      // description: 'Create a new testing project',
      icon: Add,
      color: 'bg-[#2562AA]',
      onClick: () => navigate('/projects/add'),
    },
    {
      title: 'Add Sample',
      // description: 'Register a new sample for testing',
      icon: Science,
      color: 'bg-[#2562AA]',
      onClick: () => navigate('/samples/add'),
    },
    {
      title: 'Add Client',
      // description: 'Register a new laboratory client',
      icon: People,
      color: 'bg-[#2562AA]',
      onClick: () => navigate('/labClients/add'),
    },
    {
      title: 'View Reports',
      // description: 'Access all test reports',
      icon: Visibility,
      color: 'bg-[#2562AA]',
      onClick: () => navigate('/reports'),
    },
  ];

  if (loading) {
    return (
      <MainLayout headerTitle="Dashboard" headerSubtitle="Loading...">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-[#2562AA] shadow-lg"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading dashboard data...</p>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout headerTitle="Dashboard" headerSubtitle="Error">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-red-500 text-xl font-bold mb-4">{error}</div>
          <button
            onClick={fetchDashboardData}
            className="px-6 py-3 bg-gradient-to-r from-[#2562AA] to-[#1e4f8a] text-white rounded-xl hover:shadow-lg transition-all duration-300 font-semibold"
          >
            Retry
          </button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout headerTitle={`${getRoleTitle(user?.role) || 'USER'} Dashboard`} headerSubtitle={`Welcome back, ${user?.first_name || 'User'}`}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-8">
          {user?.role === 'superadmin' || user?.role === 'super_admin' ? (
            // Superadmin Dashboard
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                <StatCard
                  title="Total Labs"
                  value={stats.totalLabs}
                  icon={Business}
                  color="bg-gradient-to-br from-[#2562AA] to-[#1e4f8a]"
                  trend="up"
                  trendValue="All labs"
                />
                <StatCard
                  title="Total Users"
                  value={stats.totalUsers}
                  icon={People}
                  color="bg-gradient-to-br from-[#2562AA] to-[#1e4f8a]"
                  trend="up"
                  trendValue="All users"
                />
                <StatCard
                  title="Total Projects"
                  value={stats.totalProjects}
                  icon={Assessment}
                  color="bg-gradient-to-br from-[#2562AA] to-[#1e4f8a]"
                  trend="up"
                  trendValue="All projects"
                />
                <StatCard
                  title="Total Clients"
                  value={stats.totalClients}
                  icon={People}
                  color="bg-gradient-to-br from-[#2562AA] to-[#1e4f8a]"
                  trend="up"
                  trendValue="All clients"
                />
              </div>

              {/* Lab Distribution and Role Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {/* Lab Stats */}
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-gray-100 p-6 lg:p-8">
                  <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-4 lg:mb-6 flex items-center gap-2">
                    <span className="w-1 h-6 lg:h-8 bg-gradient-to-b from-[#2562AA] to-[#1e4f8a] rounded-full"></span>
                    Top Labs
                  </h3>
                  <div className="space-y-3">
                    {labStats?.map((lab, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <span className="font-medium text-gray-900">{lab.name}</span>
                        <div className="flex gap-4 text-sm">
                          <span className="text-[#2562AA] font-semibold">{lab.projects} projects</span>
                          <span className="text-[#2562AA] font-semibold">{lab.samples} samples</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Role Distribution */}
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-gray-100 p-6 lg:p-8">
                  <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-4 lg:mb-6 flex items-center gap-2">
                    <span className="w-1 h-6 lg:h-8 bg-gradient-to-b from-[#2562AA] to-[#1e4f8a] rounded-full"></span>
                    User Distribution
                  </h3>
                  <div className="space-y-3">
                    {roleDistribution?.map((role, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <span className="font-medium text-gray-900 capitalize">{role.role}</span>
                        <span className="bg-gradient-to-r from-[#2562AA] to-[#1e4f8a] text-white px-3 py-1 rounded-full text-sm font-semibold shadow-md">
                          {role.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            // Admin/QM/Eng Dashboard
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                <StatCard
                  title="Total Projects"
                  value={stats.totalProjects}
                  icon={Business}
                  color="bg-gradient-to-br from-[#2562AA] to-[#1e4f8a]"
                  trend="up"
                  trendValue="Active projects"
                />
                <StatCard
                  title="Total Samples"
                  value={stats.totalSamples}
                  icon={Science}
                  color="bg-gradient-to-br from-[#2562AA] to-[#1e4f8a]"
                  trend="up"
                  trendValue="All samples"
                />
                <StatCard
                  title="Total Clients"
                  value={stats.totalClients}
                  icon={People}
                  color="bg-gradient-to-br from-[#2562AA] to-[#1e4f8a]"
                  trend="up"
                  trendValue="Registered clients"
                />
                <StatCard
                  title="Pending Tests"
                  value={stats.pendingTests}
                  icon={Schedule}
                  color="bg-gradient-to-br from-[#2562AA] to-[#1e4f8a]"
                  trend="down"
                  trendValue="Need attention"
                />
              </div>

              {/* Charts and Actions Section */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
                {/* Monthly Trends Chart - 70% on large screens */}
                <div className="xl:col-span-8 lg:col-span-7">
                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-gray-100 p-6 lg:p-8 h-full">
                    <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-4 lg:mb-6 flex items-center gap-2">
                      <span className="w-1 h-6 lg:h-8 bg-gradient-to-b from-[#2562AA] to-[#1e4f8a] rounded-full"></span>
                      Monthly Trends
                    </h2>
                    {monthlyData.length > 0 ? (
                      <div className="w-full overflow-x-auto">
                        <ResponsiveContainer width="100%" height={350}>
                          <LineChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="month" stroke="#6b7280" />
                            <YAxis stroke="#6b7280" />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                              }} 
                            />
                            <Line type="monotone" dataKey="projects" stroke="#2562AA" strokeWidth={3} name="Projects" dot={{ fill: '#2562AA', r: 4 }} />
                            <Line type="monotone" dataKey="samples" stroke="#10b981" strokeWidth={3} name="Samples" dot={{ fill: '#10b981', r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-64">
                        <p className="text-gray-500">No data available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions - 30% on large screens */}
                <div className="xl:col-span-4 lg:col-span-5">
                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-gray-100 p-6 lg:p-8 h-full">
                    <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-4 lg:mb-6 flex items-center gap-2">
                      <span className="w-1 h-6 lg:h-8 bg-gradient-to-b from-[#2562AA] to-[#1e4f8a] rounded-full"></span>
                      Quick Actions
                    </h2>
                    <div className="space-y-3 lg:space-y-4">
                      {quickActions.map((action, index) => (
                        <QuickAction key={index} {...action} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Recent Activities - Common for all roles */}
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-gray-100 p-6 lg:p-8">
            <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-4 lg:mb-6 flex items-center gap-2">
              <span className="w-1 h-6 lg:h-8 bg-gradient-to-b from-[#2562AA] to-[#1e4f8a] rounded-full"></span>
              Recent Activities
            </h3>
            <div className="space-y-3">
              {recentActivities?.map((activity, index) => (
                <RecentActivity key={index} {...activity} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Home;

