import React, { useMemo, useState, useEffect, useRef, useLayoutEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, User, Users, Briefcase, FlaskConical,
  Microscope, CheckSquare, FileText, Wrench, Calendar,
  Table2, X, Building2, Menu, ChevronDown,
  CreditCard, ShieldCheck, Settings, ClipboardList,
  FileStack, Database, Award, FileCheck, History, FileSearch,
} from "lucide-react";
import { hasPermission } from "../../utils/permissions";

const iconComponents = {
  layoutDashboard: LayoutDashboard, user: User, users: Users,
  briefcase: Briefcase, flask: FlaskConical, microscope: Microscope,
  checkSquare: CheckSquare, fileText: FileText, wrench: Wrench,
  calendar: Calendar, table: Table2, building: Building2,
  creditCard: CreditCard, shield: ShieldCheck, settings: Settings,
  clipboard: ClipboardList, fileStack: FileStack,
  database: Database, award: Award, fileCheck: FileCheck,
  history: History, fileSearch: FileSearch,
};

const SidebarSection = ({ title, collapsed }) => (
  <div className="px-3 pb-2 pt-4">
    {!collapsed ? (
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">{title}</p>
    ) : (
      <div className="mx-auto h-px w-8 bg-white/10" />
    )}
  </div>
);

const SidebarLink = ({ to, icon, label, collapsed, onClick, end = false, activeWhen }) => {
  const IconComp = iconComponents[icon] || LayoutDashboard;
  const location = useLocation();

  const handleLinkClick = () => {
    if (window.innerWidth < 768 && onClick) {
      onClick();
    }
  };

  return (
    <NavLink
      to={to}
      end={end}
      onClick={handleLinkClick}
      className={({ isActive }) =>
        [
          "group relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none w-full",
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
        );
      }}
    </NavLink>
  );
};

const SidebarSubmenu = ({ label, icon, subItems, collapsed, onClose, activeWhen, path }) => {
  const IconComp = iconComponents[icon] || LayoutDashboard;
  const location = useLocation();
  const navigate = useNavigate();

  const isChildActive = useMemo(() => {
    if (activeWhen) return activeWhen(location.pathname);
    return subItems.some(item => location.pathname.startsWith(item.path));
  }, [location.pathname, activeWhen, subItems]);

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isChildActive && !collapsed) {
      setIsOpen(true);
    }
  }, [isChildActive, collapsed]);

  const handleHeaderClick = () => {
    if (collapsed) {
      navigate(path || subItems[0].path);
      if (window.innerWidth < 768 && onClose) onClose();
    } else {
      setIsOpen((prev) => !prev);
      if (path) {
        navigate(path);
        if (window.innerWidth < 768 && onClose) onClose();
      }
    }
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleHeaderClick}
        className={[
          "group relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none w-full text-left",
          collapsed ? "h-11 justify-center px-2.5" : "h-11 px-3.5",
          isChildActive
            ? "bg-white text-[#1A2733] shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-semibold"
            : "text-white/70 hover:bg-white/[0.08] hover:text-white",
        ].join(" ")}
      >
        <motion.div
          className="flex items-center gap-3 w-full"
          whileHover={!isChildActive ? { x: 2 } : {}}
          transition={{ duration: 0.2, ease: [0.22, 0.68, 0, 1] }}
        >
          <IconComp size={18} strokeWidth={isChildActive ? 2.2 : 1.8} />
          {!collapsed && (
            <>
              <span className="truncate">{label}</span>
              <ChevronDown
                size={14}
                className={[
                  "ml-auto transition-transform duration-200",
                  isChildActive ? "text-[#1A2733]" : "text-white/50 group-hover:text-white",
                  isOpen ? "rotate-180" : "",
                ].join(" ")}
              />
            </>
          )}
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && !collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 0.68, 0, 1] }}
            className="mt-1 ml-4 border-l border-white/10 pl-3 space-y-1 overflow-hidden"
          >
            {subItems.map((subItem) => {
              const isSubActive = location.pathname === subItem.path || location.pathname.startsWith(subItem.path);
              return (
                <NavLink
                  key={subItem.path}
                  to={subItem.path}
                  onClick={() => {
                    if (window.innerWidth < 768 && onClose) onClose();
                  }}
                  className={[
                    "flex items-center h-8 rounded-lg px-3 text-xs font-semibold transition-all duration-200",
                    isSubActive
                      ? "bg-white/20 text-white shadow-[0_2px_4px_rgba(0,0,0,0.06)] font-bold"
                      : "text-white/60 hover:text-white hover:bg-white/[0.04]",
                  ].join(" ")}
                >
                  {subItem.label}
                </NavLink>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Sidebar = ({ isOpen, isCollapsed, onClose, onToggleCollapse }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const scrollRef = useRef(null);

  const user = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const userRole = user?.role || "Engineer";
  const isSuperAdmin = userRole === "superadmin" || userRole === "super_admin";

  // Restore scroll position across route changes & menu clicks
  useLayoutEffect(() => {
    const savedPos = sessionStorage.getItem("sidebar_scroll_position");
    if (savedPos !== null && scrollRef.current) {
      scrollRef.current.scrollTop = Number(savedPos);
    }
  }, [location.pathname]);

  const handleScroll = (e) => {
    sessionStorage.setItem("sidebar_scroll_position", e.target.scrollTop);
  };

  const navItems = useMemo(() => {
    const raw = isSuperAdmin
      ? [
        { path: "/dashboard", label: "Dashboard", icon: "layoutDashboard", perm: "*" },
        { path: "/labs/manage", label: "Lab Management", icon: "building", perm: "*" },
        { path: "/superadmin/roles", label: "Role Management", icon: "shield", perm: "*" },
        { path: "/superadmin/subscriptions", label: "Subscriptions", icon: "creditCard", perm: "*" },
      ]
      : [
        { path: "/dashboard", label: "Dashboard", icon: "layoutDashboard", perm: "dashboard.view" },
        { path: "/users", label: "Users", icon: "user", perm: "user.manage" },
        { path: "/labClients", label: "Clients", icon: "users", perm: "client.view" },
        { path: "/projects", label: "Projects", icon: "briefcase", perm: "project.view" },
        { path: "/samples", label: "Samples", icon: "microscope", perm: "sample.view" },
        { path: "/test-assignments", label: "Test Assign", icon: "checkSquare", perm: "test.assign" },
        { path: "/observation-entry", label: "Observation", icon: "table", perm: "observation.view" },
        { path: "/reports", label: "Test Reports", icon: "fileText", perm: "report.view" },
        { path: "/scope", label: "Testing Scope", icon: "flask", perm: "scope.view" },
      ];
    return raw.filter((item) => hasPermission(userRole, item.perm));
  }, [userRole, isSuperAdmin]);

  const qualityItems = useMemo(() => {
    if (isSuperAdmin) {
      return [
        { path: "/document-control/nabl-references", label: "NABL References", icon: "award", perm: "*" },
        { path: "/document-control/categories", label: "Document Categories", icon: "settings", perm: "*" },
      ];
    }
    return [
      { path: "/document-control", label: "My Documents", icon: "fileCheck", perm: "document.view", end: true, activeWhen: (pathname) => pathname === "/document-control" || pathname === "/document-control/" },
    ];
  }, [isSuperAdmin]);

  const moduleItems = useMemo(() => {
    const raw = [
      {
        label: "Equipment",
        icon: "wrench",
        path: "/equipment/list",
        perm: "equipment.view",
        activeWhen: (pathname) => pathname.startsWith("/equipment"),
        subItems: [
          { path: "/equipment/locations", label: "Locations" },
        ]
      },
      {
        label: "Calibration",
        icon: "calendar",
        path: "/calibration/register",
        perm: "calibration.view",
        activeWhen: (pathname) => pathname.startsWith("/calibration"),
        subItems: [
          { path: "/calibration/calendar", label: "Calendar" },
          { path: "/calibration/due-overdue", label: "Due / Overdue" },
        ]
      },
      { path: "/maintenance/history", label: "Maintenance", icon: "wrench", perm: "equipment.view", activeWhen: (pathname) => pathname.startsWith("/maintenance") },
    ];
    return raw.filter((item) => hasPermission(userRole, item.perm));
  }, [userRole]);

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
          "fixed inset-y-0 left-0 z-50 flex h-screen flex-col overflow-hidden border-r border-[#1C2B36] bg-[#243744] text-white transition-[width,transform] duration-[250ms] ease-in-out md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          isCollapsed ? "md:w-[4.75rem] w-[17rem]" : "md:w-[17rem] w-[17rem]",
        ].join(" ")}
        style={{
          boxShadow: "8px 0 32px rgba(15, 25, 35, 0.15)",
        }}
      >
        {/* Logo Header */}
        <div
          className={[
            "border-b border-white/10 transition-[height,padding] duration-[250ms] ease-in-out shrink-0",
            isCollapsed
              ? "flex h-[116px] flex-col items-center justify-center gap-3 px-2 md:px-3"
              : "flex h-[76px] items-center justify-between px-4",
          ].join(" ")}
        >
          <div
            className={`flex items-center cursor-pointer ${isCollapsed ? "md:justify-center" : "min-w-0 flex-1 pr-2"}`}
            onClick={() => navigate("/")}
          >
            <div className="flex shrink-0 items-center justify-start w-full">
              <img
                src="/logoDark.png"
                alt="LabMate Logo"
                className={
                  isCollapsed
                    ? "h-11 w-11 object-contain transition-all duration-200"
                    : "h-14 sm:h-[75px] w-auto max-w-[250px] object-contain object-left transition-all duration-200"
                }
              />
            </div>
          </div>

          <motion.button
            type="button"
            onClick={onToggleCollapse}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/15 text-white transition-all cursor-pointer border border-white/10 hidden md:inline-flex"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            animate={{ rotate: isCollapsed ? 90 : 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <Menu size={18} />
          </motion.button>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/15 text-white transition-all cursor-pointer border border-white/10 md:hidden"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden px-3 py-4"
        >
          <nav className="space-y-1.5 pb-8">
            {user?.role === "superadmin" || user?.role === "super_admin" ? (
              <>
                <SidebarSection title="Command" collapsed={isCollapsed} />
                {navItems.map((item) => (
                  <SidebarLink
                    key={item.path}
                    to={item.path}
                    label={item.label}
                    icon={item.icon}
                    collapsed={isCollapsed}
                    onClick={onClose}
                    end={item.path === "/dashboard"}
                  />
                ))}
                <div className="!mt-3 pt-3 border-t border-white/8 space-y-1.5">
                  <SidebarSection title="QUALITY & COMPLIANCE" collapsed={isCollapsed} />
                  {qualityItems.map((item) => (
                    <SidebarLink
                      key={item.path}
                      to={item.path}
                      label={item.label}
                      icon={item.icon}
                      collapsed={isCollapsed}
                      onClick={onClose}
                      end={item.end}
                      activeWhen={item.activeWhen}
                    />
                  ))}
                </div>
                <SidebarSection title="Platform Configuration" collapsed={isCollapsed} />
                <SidebarLink to="/superadmin/observation-templates" label="Observation Templates" icon="clipboard" collapsed={isCollapsed} onClick={onClose} />
                <SidebarLink to="/superadmin/report-templates" label="Report Templates" icon="fileStack" collapsed={isCollapsed} onClick={onClose} />
              </>
            ) : (
              <>
                {navItems.map((item) => {
                  if (item.subItems) {
                    return (
                      <SidebarSubmenu
                        key={item.label}
                        label={item.label}
                        icon={item.icon}
                        subItems={item.subItems}
                        collapsed={isCollapsed}
                        onClose={onClose}
                        activeWhen={item.activeWhen}
                        path={item.path}
                      />
                    );
                  }
                  return (
                    <SidebarLink
                      key={item.path}
                      to={item.path}
                      label={item.label}
                      icon={item.icon}
                      collapsed={isCollapsed}
                      onClick={onClose}
                      end={item.path === "/dashboard"}
                    />
                  );
                })}

                <div className="!mt-3 pt-3 border-t border-white/8 space-y-1.5">
                  <SidebarSection title="QUALITY & COMPLIANCE" collapsed={isCollapsed} />
                  {qualityItems.map((item) => (
                    <SidebarLink
                      key={item.path}
                      to={item.path}
                      label={item.label}
                      icon={item.icon}
                      collapsed={isCollapsed}
                      onClick={onClose}
                      end={item.end}
                      activeWhen={item.activeWhen}
                    />
                  ))}
                </div>

                <div className="!mt-3 pt-3 border-t border-white/8 space-y-1.5">
                  <SidebarSection title="EQUIPMENT & CALIBRATION" collapsed={isCollapsed} />
                  {moduleItems.map((item) => {
                    if (item.subItems) {
                      return (
                        <SidebarSubmenu
                          key={item.label}
                          label={item.label}
                          icon={item.icon}
                          subItems={item.subItems}
                          collapsed={isCollapsed}
                          onClose={onClose}
                          activeWhen={item.activeWhen}
                          path={item.path}
                        />
                      );
                    }
                    return (
                      <SidebarLink
                        key={item.path}
                        to={item.path}
                        label={item.label}
                        icon={item.icon}
                        collapsed={isCollapsed}
                        onClick={onClose}
                        activeWhen={item.activeWhen}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </nav>
        </div>

        {/* Footer - User Account Details */}
        <div className="border-t border-white/10 px-4 py-3.5 shrink-0 bg-[#243744]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white font-black text-xs border border-white/15 shadow-xs">
              {(user?.first_name?.[0] || user?.full_name?.[0] || user?.name?.[0] || "U").toUpperCase()}
              {(user?.last_name?.[0] || (user?.full_name?.split(" ")?.[1]?.[0]) || "").toUpperCase()}
            </div>

            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate leading-tight">
                  {user?.full_name || `${user?.first_name || "User"} ${user?.last_name || ""}`}
                </p>
                <p className="text-[11px] font-medium text-white/60 truncate capitalize mt-0.5 leading-tight">
                  {user?.role_name || user?.role || "Staff"}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
