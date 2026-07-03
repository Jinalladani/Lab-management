import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, Search, Bell, Plus,
  ArrowRight, User, LogOut, Settings,
} from "lucide-react";
import { api } from "../../api";

const breadcrumbLabels = {
  dashboard: "Dashboard",
  projects: "Projects",
  users: "Users",
  samples: "Samples",
  reports: "Reports",
  clients: "Clients",
  labclients: "Clients",
  scope: "Testing Scope",
  equipment: "Equipment",
  calibration: "Calibration",
  maintenance: "Maintenance",
  observation: "Observation",
  profile: "Profile",
  lab: "Lab Details",
  labs: "Labs",
};

const getBreadcrumb = (pathname) => {
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length) return [{ label: "Home", path: "/" }];

  let runningPath = "";
  return [
    { label: "Home", path: "/" },
    ...segments.map((segment) => {
      runningPath += `/${segment}`;
      return {
        label: breadcrumbLabels[segment.toLowerCase()] || segment.replace(/-/g, " "),
        path: runningPath,
      };
    }),
  ];
};

const quickLinks = [
  { label: "New Project", path: "/projects/add", hint: "Create project" },
  { label: "Register Sample", path: "/samples/entry", hint: "Open sample intake" },
  { label: "Add Client", path: "/labClients/add", hint: "Create client record" },
  { label: "Create Report", path: "/reports/add", hint: "Start report workflow" },
];

const notifications = [
  { title: "3 pending tests need assignment", meta: "Operations" },
  { title: "Calibration due in 2 days", meta: "Equipment" },
  { title: "5 reports were published today", meta: "Reports" },
];

const dropdownVariants = {
  hidden: { opacity: 0, y: -8, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.18, ease: [0.22, 0.68, 0, 1] },
  },
  exit: {
    opacity: 0, y: -6, scale: 0.98,
    transition: { duration: 0.12, ease: "easeIn" },
  },
};

const Header = ({
  onMenuClick,
  title = "Projects",
  subtitle = "Performance summary",
}) => {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const breadcrumb = useMemo(() => getBreadcrumb(location.pathname), [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setQuickAddOpen(false);
        setNotificationsOpen(false);
        setAccountOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setQuickAddOpen(false);
        setNotificationsOpen(false);
        setAccountOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  const accountName = user?.first_name || user?.full_name || user?.email || "Account";

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Preserve logout flow even if the API call fails.
    } finally {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      navigate("/login", { replace: true });
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[#E2E6EB] bg-white/80 backdrop-blur-md">
      <div
        ref={dropdownRef}
        className="mx-auto flex w-full max-w-[1800px] items-center gap-3 px-4 py-3 sm:px-5 lg:px-6"
      >
        <button
          type="button"
          onClick={onMenuClick}
          className="app-icon-button md:hidden"
          aria-label="Open sidebar"
        >
          <Menu size={20} strokeWidth={2} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="hidden items-center gap-1.5 text-xs text-[#8A97A4] sm:flex">
            {breadcrumb.map((crumb, index) => (
              <React.Fragment key={crumb.path}>
                {index > 0 && <span className="text-[#CDD4DB]">/</span>}
                <span className={index === breadcrumb.length - 1 ? "font-semibold text-[#57687A]" : ""}>
                  {crumb.label}
                </span>
              </React.Fragment>
            ))}
          </div>
          <div className="flex min-w-0 items-baseline gap-3">
            <h1 className="truncate text-lg font-bold text-[#1A2733] tracking-tight sm:text-xl">{title}</h1>
            <p className="hidden truncate text-sm text-[#8A97A4] lg:block">{subtitle}</p>
          </div>
        </div>

        <label className="hidden h-10 min-w-[240px] max-w-[420px] flex-1 items-center gap-2.5 rounded-xl border border-[#DDE4EA] bg-[#F8FAFB] px-3.5 transition-all duration-200 focus-within:border-[#3F6E8C] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#3F6E8C]/12 md:flex"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <Search size={16} strokeWidth={2} className="text-[#8A97A4] shrink-0" />
          <input
            type="text"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search projects, samples, reports..."
            className="w-full bg-transparent text-sm text-[#1A2733] placeholder:text-[#A1ADB8] focus:outline-none"
            aria-label="Search dashboard"
          />
        </label>

        {/* Notifications */}
        <div className="relative">
          <motion.button
            type="button"
            onClick={() => {
              setNotificationsOpen((prev) => !prev);
              setQuickAddOpen(false);
              setAccountOpen(false);
            }}
            className="app-icon-button"
            aria-label="Open notifications"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            <Bell size={18} strokeWidth={2} />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#DC2626] ring-2 ring-white" />
          </motion.button>

          <AnimatePresence>
            {notificationsOpen && (
              <motion.div
                className="absolute right-0 mt-2 w-[320px] rounded-xl border border-[#E2E6EB] bg-white p-2 z-50"
                style={{ boxShadow: "var(--shadow-xl)" }}
                variants={dropdownVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <div className="flex items-center justify-between border-b border-[#EDF0F3] px-3 pb-3 pt-1">
                  <p className="text-sm font-semibold text-[#1A2733]">Notifications</p>
                  <span className="text-xs font-medium text-[#8A97A4]">3 new</span>
                </div>
                <div className="space-y-0.5 pt-2">
                  {notifications.map((item) => (
                    <button
                      key={item.title}
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left transition-colors duration-100 hover:bg-[#F6F7F9]"
                    >
                      <span>
                        <span className="block text-sm font-medium text-[#1A2733]">{item.title}</span>
                        <span className="block text-xs text-[#8A97A4]">{item.meta}</span>
                      </span>
                      <ArrowRight size={14} className="text-[#CDD4DB]" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick Add */}
        <div className="relative">
          <motion.button
            type="button"
            onClick={() => {
              setQuickAddOpen((prev) => !prev);
              setNotificationsOpen(false);
              setAccountOpen(false);
            }}
            className="app-button app-button-primary"
            aria-label="Quick add"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <Plus size={17} strokeWidth={2.5} />
            <span className="hidden sm:inline">Quick Add</span>
          </motion.button>

          <AnimatePresence>
            {quickAddOpen && (
              <motion.div
                className="absolute right-0 mt-2 w-[280px] rounded-xl border border-[#E2E6EB] bg-white p-2 z-50"
                style={{ boxShadow: "var(--shadow-xl)" }}
                variants={dropdownVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {quickLinks.map((item) => (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => {
                      setQuickAddOpen(false);
                      navigate(item.path);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left transition-colors duration-100 hover:bg-[#F6F7F9]"
                  >
                    <span>
                      <span className="block text-sm font-medium text-[#1A2733]">{item.label}</span>
                      <span className="block text-xs text-[#8A97A4]">{item.hint}</span>
                    </span>
                    <ArrowRight size={14} className="text-[#CDD4DB]" />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Account */}
        <div className="relative">
          <motion.button
            type="button"
            onClick={() => {
              setAccountOpen((prev) => !prev);
              setQuickAddOpen(false);
              setNotificationsOpen(false);
            }}
            className="app-icon-button"
            aria-label="Open account menu"
            aria-expanded={accountOpen}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            <User size={18} strokeWidth={2} />
          </motion.button>

          <AnimatePresence>
            {accountOpen && (
              <motion.div
                className="absolute right-0 z-50 mt-2 w-[250px] rounded-xl border border-[#E2E6EB] bg-white p-2"
                style={{ boxShadow: "var(--shadow-xl)" }}
                variants={dropdownVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                role="menu"
              >
                <div className="border-b border-[#EDF0F3] px-3 pb-3 pt-1">
                  <p className="truncate text-sm font-semibold text-[#1A2733]">{accountName}</p>
                  <p className="truncate text-xs text-[#8A97A4]">{user?.email || "Signed in"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAccountOpen(false);
                    navigate("/profile");
                  }}
                  className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#1A2733] transition-colors hover:bg-[#F6F7F9]"
                  role="menuitem"
                >
                  <User size={16} className="text-[#57687A]" />
                  Profile
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#8A97A4] transition-colors hover:bg-[#F6F7F9]"
                  role="menuitem"
                >
                  <Settings size={16} />
                  Preferences
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#DC2626] transition-colors hover:bg-[#FEF2F2]"
                  role="menuitem"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default Header;
