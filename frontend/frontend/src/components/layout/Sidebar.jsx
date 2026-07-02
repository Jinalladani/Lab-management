import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, User, Users, Briefcase, FlaskConical,
  Microscope, CheckSquare, FileText, Wrench, Calendar,
  Gauge, Table2, X, ChevronDown, Building2, ChevronRight,
} from "lucide-react";
import Icon from "../ui/LucideIcon";

const iconComponents = {
  layoutDashboard: LayoutDashboard, user: User, users: Users,
  briefcase: Briefcase, flask: FlaskConical, microscope: Microscope,
  checkSquare: CheckSquare, fileText: FileText, wrench: Wrench,
  calendar: Calendar, gauge: Gauge, table: Table2, building: Building2,
};

const SidebarLink = ({ to, icon, label, collapsed, onClick, end = false }) => {
  const IconComp = iconComponents[icon] || LayoutDashboard;

  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        [
          "group relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none",
          collapsed ? "h-11 justify-center px-2.5" : "h-11 px-3.5",
          isActive
            ? "bg-white text-[#1A2733] shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
            : "text-white/70 hover:bg-white/[0.08] hover:text-white",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <motion.div
          className="flex items-center gap-3 w-full"
          whileHover={!isActive ? { x: 2 } : {}}
          transition={{ duration: 0.2, ease: [0.22, 0.68, 0, 1] }}
        >
          <motion.div
            animate={{
              scale: isActive ? 1 : 0.95,
            }}
            transition={{ duration: 0.2 }}
          >
            <IconComp size={18} strokeWidth={isActive ? 2.2 : 1.8} />
          </motion.div>
          {!collapsed && (
            <span className="truncate">{label}</span>
          )}
        </motion.div>
      )}
    </NavLink>
  );
};

const SubLink = ({ to, label, collapsed, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      [
        "flex items-center rounded-lg text-xs font-medium transition-all duration-200 focus:outline-none",
        collapsed ? "h-9 justify-center px-2.5" : "h-9 px-3.5",
        isActive
          ? "bg-white/90 text-[#1A2733]"
          : "text-white/55 hover:bg-white/[0.06] hover:text-white/85",
      ].join(" ")
    }
  >
    <span className="truncate">{collapsed ? label.slice(0, 1) : label}</span>
  </NavLink>
);

const AccordionGroup = ({ label, icon, open, onToggle, collapsed, children }) => {
  const IconComp = iconComponents[icon] || Wrench;

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={[
          "flex w-full items-center justify-between rounded-xl text-sm font-medium text-white/70 transition-all duration-200 hover:bg-white/[0.08] hover:text-white focus:outline-none",
          collapsed ? "h-11 justify-center px-2.5" : "h-11 px-3.5",
        ].join(" ")}
        aria-label={`Toggle ${label}`}
      >
        <span className="flex items-center gap-3">
          <IconComp size={18} strokeWidth={1.8} />
          {!collapsed && <span>{label}</span>}
        </span>
        {!collapsed && (
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.22, ease: [0.22, 0.68, 0, 1] }}
          >
            <ChevronDown size={15} />
          </motion.div>
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 0.68, 0, 1] }}
            className="overflow-hidden"
          >
            <div className={collapsed ? "mt-1 space-y-0.5" : "ml-7 mt-1 space-y-0.5 border-l border-white/10 pl-2"}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Sidebar = ({ isOpen, isCollapsed, onClose }) => {
  const [observationOpen, setObservationOpen] = useState(false);
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [calibrationOpen, setCalibrationOpen] = useState(false);
  const location = useLocation();

  const user = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    setEquipmentOpen(location.pathname.startsWith("/equipment"));
    setCalibrationOpen(location.pathname.startsWith("/calibration"));
    setObservationOpen(location.pathname.startsWith("/observation"));
  }, [location.pathname]);

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

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[#1C2D37] bg-[#243744] text-white transition-[width,transform] duration-[280ms] ease-[cubic-bezier(0.22,0.68,0,1)] md:static md:z-auto md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          isCollapsed ? "md:w-[4.75rem] w-[17rem]" : "md:w-[17rem] w-[17rem]",
        ].join(" ")}
        style={{
          boxShadow: "8px 0 32px rgba(15, 25, 35, 0.15)",
        }}
      >
        {/* Logo */}
        <div className="flex h-[68px] items-center justify-between border-b border-white/8 px-4">
          <div className={`flex items-center gap-3 ${isCollapsed ? "md:w-full md:justify-center" : ""}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/12 bg-white/8">
              <FlaskConical size={20} strokeWidth={2} />
            </div>
            {!isCollapsed && (
              <motion.div
                className="min-w-0"
                initial={false}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="text-sm font-bold tracking-tight">LabMate</div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-white/45">LIMS</div>
              </motion.div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="app-icon-button-dark md:hidden"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-5">
          {!isCollapsed && (
            <div className="mb-5 border-l-2 border-white/12 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Workspace</p>
              <p className="mt-1.5 text-[13px] leading-5 text-white/65">
                Civil materials testing operations, projects, reports, and quality control.
              </p>
            </div>
          )}

          <nav className="space-y-1.5">
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
              <AccordionGroup
                label="Equipment"
                icon="wrench"
                open={equipmentOpen}
                onToggle={() => setEquipmentOpen((prev) => !prev)}
                collapsed={isCollapsed}
              >
                <SidebarLink to="/equipment/dashboard" label="Dashboard" icon="gauge" collapsed={isCollapsed} onClick={onClose} />
                <SubLink to="/equipment/list" label="Equipment List" collapsed={isCollapsed} onClick={onClose} />
                <SubLink to="/equipment/locations" label="Locations" collapsed={isCollapsed} onClick={onClose} />
              </AccordionGroup>

              <AccordionGroup
                label="Calibration"
                icon="calendar"
                open={calibrationOpen}
                onToggle={() => setCalibrationOpen((prev) => !prev)}
                collapsed={isCollapsed}
              >
                <SidebarLink to="/calibration/dashboard" label="Dashboard" icon="gauge" collapsed={isCollapsed} onClick={onClose} />
                <SubLink to="/calibration/register" label="Register" collapsed={isCollapsed} onClick={onClose} />
                <SubLink to="/calibration/calendar" label="Calendar" collapsed={isCollapsed} onClick={onClose} />
                <SubLink to="/calibration/due-overdue" label="Due / Overdue" collapsed={isCollapsed} onClick={onClose} />
              </AccordionGroup>

              <SidebarLink
                to="/maintenance/history"
                label="Maintenance"
                icon="wrench"
                collapsed={isCollapsed}
                onClick={onClose}
              />

              <AccordionGroup
                label="Observation"
                icon="table"
                open={observationOpen}
                onToggle={() => setObservationOpen((prev) => !prev)}
                collapsed={isCollapsed}
              >
                <SubLink to="/observation-entry" label="Observation Entry" collapsed={isCollapsed} onClick={onClose} />
                <SubLink to="/observation-builder" label="Form Builder" collapsed={isCollapsed} onClick={onClose} />
              </AccordionGroup>
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
      </aside>
    </>
  );
};

export default Sidebar;
