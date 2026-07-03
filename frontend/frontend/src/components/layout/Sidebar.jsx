import React, { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, User, Users, Briefcase, FlaskConical,
  Microscope, CheckSquare, FileText, Wrench, Calendar,
  Table2, X, Building2, Menu,
} from "lucide-react";

const iconComponents = {
  layoutDashboard: LayoutDashboard, user: User, users: Users,
  briefcase: Briefcase, flask: FlaskConical, microscope: Microscope,
  checkSquare: CheckSquare, fileText: FileText, wrench: Wrench,
  calendar: Calendar, table: Table2, building: Building2,
};

const SidebarLink = ({ to, icon, label, collapsed, onClick, end = false, activeWhen }) => {
  const IconComp = iconComponents[icon] || LayoutDashboard;
  const location = useLocation();

  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        [
          "group relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none",
          collapsed ? "h-11 justify-center px-2.5" : "h-11 px-3.5",
          isActive || activeWhen?.(location.pathname)
            ? "bg-white text-[#1A2733] shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
            : "text-white/70 hover:bg-white/[0.08] hover:text-white",
        ].join(" ")
      }
    >
      {({ isActive }) => {
        const active = isActive || activeWhen?.(location.pathname);
        return (
        <motion.div
          className="flex items-center gap-3 w-full"
          whileHover={!active ? { x: 2 } : {}}
          transition={{ duration: 0.2, ease: [0.22, 0.68, 0, 1] }}
        >
          <motion.div
            animate={{
              scale: active ? 1 : 0.95,
            }}
            transition={{ duration: 0.2 }}
          >
            <IconComp size={18} strokeWidth={active ? 2.2 : 1.8} />
          </motion.div>
          {!collapsed && (
            <span className="truncate">{label}</span>
          )}
        </motion.div>
      );}}
    </NavLink>
  );
};

const Sidebar = ({ isOpen, isCollapsed, onClose, onToggleCollapse }) => {
  const user = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const navItems =
    user?.role === "superadmin" || user?.role === "super_admin"
      ? [
          { path: "/dashboard", label: "Dashboard", icon: "layoutDashboard" },
          { path: "/labs/manage", label: "Lab Management", icon: "building" },
        ]
      : [
          { path: "/dashboard", label: "Dashboard", icon: "layoutDashboard" },
          { path: "/users", label: "Users", icon: "user" },
          { path: "/labClients", label: "Clients", icon: "users" },
          { path: "/projects", label: "Projects", icon: "briefcase" },
          { path: "/scope", label: "Testing Scope", icon: "flask" },
          { path: "/samples", label: "Samples", icon: "microscope" },
          { path: "/test-assignments", label: "Test Assign", icon: "checkSquare" },
          { path: "/reports", label: "Reports", icon: "fileText" },
        ];

  const moduleItems = [
    { path: "/equipment/dashboard", label: "Equipment", icon: "wrench", activeWhen: (pathname) => pathname.startsWith("/equipment") },
    { path: "/calibration/dashboard", label: "Calibration", icon: "calendar", activeWhen: (pathname) => pathname.startsWith("/calibration") },
    { path: "/maintenance/history", label: "Maintenance", icon: "wrench", activeWhen: (pathname) => pathname.startsWith("/maintenance") },
    { path: "/observation-entry", label: "Observation", icon: "table", activeWhen: (pathname) => pathname.startsWith("/observation") },
  ];

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-[#0F1923]/50 backdrop-blur-[2px] md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <motion.aside
        layout
        className={[
          "fixed inset-y-0 left-0 z-50 flex h-screen flex-col overflow-hidden border-r border-[#1C2D37] bg-[#243744] text-white transition-[width,transform] duration-[250ms] ease-in-out md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          isCollapsed ? "md:w-[4.75rem] w-[17rem]" : "md:w-[17rem] w-[17rem]",
        ].join(" ")}
        style={{
          boxShadow: "8px 0 32px rgba(15, 25, 35, 0.15)",
        }}
        transition={{ layout: { duration: 0.24, ease: "easeInOut" } }}
      >
        {/* Logo */}
        <motion.div
          layout
          className={[
            "border-b border-white/8 px-4 transition-[height,padding] duration-[250ms] ease-in-out",
            isCollapsed
              ? "flex h-[116px] flex-col items-center justify-center gap-3 md:px-3"
              : "flex h-[68px] items-center justify-between",
          ].join(" ")}
          transition={{ layout: { duration: 0.24, ease: "easeInOut" } }}
        >
          <motion.div
            layout
            className={`flex items-center gap-3 ${isCollapsed ? "md:justify-center" : "min-w-0"}`}
            transition={{ layout: { duration: 0.24, ease: "easeInOut" } }}
          >
            <motion.div
              layout
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/8"
              transition={{ layout: { duration: 0.24, ease: "easeInOut" } }}
            >
              <FlaskConical size={20} strokeWidth={2} />
            </motion.div>
            {!isCollapsed && (
              <motion.div
                className="min-w-0"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
              >
                <div className="text-sm font-bold tracking-tight">LabMate</div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-white/45">LIMS</div>
              </motion.div>
            )}
          </motion.div>

          <motion.button
            layout
            type="button"
            onClick={onToggleCollapse}
            className="app-icon-button-dark hidden md:inline-flex"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            animate={{ rotate: isCollapsed ? 90 : 0 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeInOut", layout: { duration: 0.24, ease: "easeInOut" } }}
          >
            <Menu size={18} />
          </motion.button>

          <button
            type="button"
            onClick={onClose}
            className="app-icon-button-dark md:hidden"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </motion.div>

        {/* Navigation */}
        <div className="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
          <nav className="space-y-1.5 pb-4">
            {navItems.map(({ path, label, icon }) => (
              <SidebarLink
                key={path}
                to={path}
                label={label}
                icon={icon}
                collapsed={isCollapsed}
                onClick={onClose}
                end={path === "/dashboard"}
              />
            ))}

            <div className="!mt-3 pt-3 border-t border-white/8">
              {moduleItems.map(({ path, label, icon, activeWhen }) => (
                <SidebarLink
                  key={path}
                  to={path}
                  label={label}
                  icon={icon}
                  collapsed={isCollapsed}
                  onClick={onClose}
                  activeWhen={activeWhen}
                />
              ))}
            </div>
          </nav>
        </div>

        {/* Footer */}
        <div className="border-t border-white/8 px-4 py-4">
          <div className={isCollapsed ? "flex justify-center" : ""}>
            <div className="flex items-center gap-2.5 text-white/55">
              <span className="h-2 w-2 rounded-full bg-[#16A34A]" />
              {!isCollapsed && <span className="text-xs font-medium">Secure session active</span>}
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
