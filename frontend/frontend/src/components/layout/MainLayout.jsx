import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "./Header";
import Sidebar from "./Sidebar";
import AnimatedPage from "../ui/AnimatedPage";

const moduleNavs = [
  {
    match: (pathname) => pathname.startsWith("/equipment"),
    items: [
      { label: "Dashboard", to: "/equipment/dashboard" },
      { label: "Equipment List", to: "/equipment/list" },
      { label: "Locations", to: "/equipment/locations" },
    ],
  },
  {
    match: (pathname) => pathname.startsWith("/calibration"),
    items: [
      { label: "Dashboard", to: "/calibration/dashboard" },
      { label: "Register", to: "/calibration/register" },
      { label: "Calendar", to: "/calibration/calendar" },
      { label: "Due / Overdue", to: "/calibration/due-overdue" },
    ],
  },
  {
    match: (pathname) => pathname.startsWith("/maintenance"),
    items: [
      { label: "Maintenance", to: "/maintenance/history" },
    ],
  },
  {
    match: (pathname) => pathname.startsWith("/observation"),
    items: [
      { label: "Entry Register", to: "/observation-entry" },
      { label: "Form Builder", to: "/observation-builder" },
    ],
  },
];

const ModuleSubnav = ({ pathname }) => {
  const current = moduleNavs.find((moduleNav) => moduleNav.match(pathname));
  if (!current) return null;

  return (
    <motion.div
      layout
      className="border-b border-[#E2E6EB] bg-white/72 backdrop-blur-md"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeInOut" }}
    >
      <div className="mx-auto flex w-full max-w-[1800px] gap-2 overflow-x-auto px-4 py-3 sm:px-5 lg:px-6">
        {current.items.map((item) => (
          <NavLink
            key={`${item.label}-${item.to}`}
            to={item.to}
            className={({ isActive }) =>
              [
                "shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200",
                isActive
                  ? "bg-[#243744] text-white shadow-[0_8px_20px_rgba(36,55,68,0.18)]"
                  : "text-[#57687A] hover:bg-[#F6F7F9] hover:text-[#1A2733]",
              ].join(" ")
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </motion.div>
  );
};

const MainLayout = ({
  children,
  headerTitle = "Projects",
  headerSubtitle = "Performance summary",
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);
  const toggleSidebarCollapse = () => setSidebarCollapsed((prev) => !prev);

  return (
    <div className="h-screen text-[#1A2733] overflow-hidden" style={{ background: "var(--app-bg)" }}>
      <div className="flex h-full overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          isCollapsed={sidebarCollapsed}
          onClose={closeSidebar}
          onToggleCollapse={toggleSidebarCollapse}
        />

        <motion.div
          layout
          className={[
            "flex h-full min-w-0 flex-1 flex-col overflow-hidden transition-[margin] duration-[250ms] ease-in-out",
            sidebarCollapsed ? "md:ml-[4.75rem]" : "md:ml-[17rem]",
          ].join(" ")}
          transition={{ layout: { duration: 0.24, ease: "easeInOut" } }}
        >
          <Header
            onMenuClick={toggleSidebar}
            title={headerTitle}
            subtitle={headerSubtitle}
          />
          <ModuleSubnav pathname={location.pathname} />
          <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" style={{ background: "var(--app-bg)" }}>
            <AnimatedPage>
              {children}
            </AnimatedPage>
          </main>
        </motion.div>
      </div>
    </div>
  );
};

export default MainLayout;
