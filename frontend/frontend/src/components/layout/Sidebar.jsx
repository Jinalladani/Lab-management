import React from "react";
import BusinessIcon from "@mui/icons-material/Business";
import CloseIcon from "@mui/icons-material/Close";
import BarChartIcon from "@mui/icons-material/BarChart";
import ViewListIcon from "@mui/icons-material/ViewList";
import DescriptionIcon from "@mui/icons-material/Description";
import ScienceIcon from "@mui/icons-material/Science";
import BiotechIcon from "@mui/icons-material/Biotech";
import PeopleIcon from "@mui/icons-material/People";
import GroupIcon from "@mui/icons-material/Group";
import PersonIcon from "@mui/icons-material/Person";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import TableChartIcon from "@mui/icons-material/TableChart";
import { NavLink } from "react-router-dom";
import { useState } from "react";

const Sidebar = ({ isOpen, onClose }) => {
  const [observationOpen, setObservationOpen] = useState(true); // Default open for ease of navigation
  // Get user role from localStorage
  const user = (() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const getNavItems = () => {
    if (user?.role === 'superadmin' || user?.role === 'super_admin') {
      // Superadmin menu - lab management and overview
      return [
        { path: "/dashboard", label: "Dashboard", icon: BarChartIcon },
        { path: "/labs/manage", label: "Lab Management", icon: BusinessIcon },
      ];
    } else {
      // Admin/QM/Eng menu - all items
      const items = [
        { path: "/dashboard", label: "Dashboard", icon: BarChartIcon },
        { path: "/users", label: "Users", icon: PersonIcon },
        { path: "/labClients", label: "Clients", icon: GroupIcon },
        { path: "/projects", label: "Projects", icon: ViewListIcon },
        { path: "/scope", label: "Testing Scope", icon: ScienceIcon },
        { path: "/samples/master", label: "Sample Master", icon: BiotechIcon },
      ];


      items.push({ path: "/reports", label: "Reports", icon: DescriptionIcon });
      return items;
    }
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar panel - 30% on desktop, #2562AA brand color */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-[280px] md:w-[30%] md:min-w-[240px] md:max-w-[360px]
          flex flex-col shrink-0
          transform transition-transform duration-200 ease-out
          md:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          bg-[#2562AA]
          shadow-xl md:shadow-[4px_0_24px_-4px_rgba(37,98,170,0.25)]
        `}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none rounded-r-2xl" />

        <div className="flex items-center justify-between p-4 md:hidden border-b border-white/15">
          <span className="font-medium text-white">Menu</span>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/15 transition-colors text-white"
            aria-label="Close sidebar"
          >
            <CloseIcon sx={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Logo & Brand */}
        <div className="relative flex items-center gap-3 px-6 py-6">
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shadow-lg ring-2 ring-white/20">
            <ScienceIcon sx={{ fontSize: 26, color: "white" }} />
          </div>
          <div>
            <span className="text-lg font-bold text-white tracking-tight block">
              LabMate
            </span>
            <span className="text-sm font-medium text-white/90 tracking-wide">
              Automation
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="relative flex-1 overflow-y-auto px-4 pb-6 pt-2">
          <div className="space-y-1">
            {navItems.map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                    ? "bg-white text-[#2562AA] shadow-md"
                    : "text-white/95 hover:bg-white/12 hover:text-white"
                  }`
                }
              >
                <Icon sx={{ fontSize: 22 }} />
                <span className="font-medium">{label}</span>
              </NavLink>
            ))}

            {/* Collapsible Observation submenus */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setObservationOpen(!observationOpen)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-white/95 hover:bg-white/12 hover:text-white transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <TableChartIcon sx={{ fontSize: 22 }} />
                  <span className="font-medium">Observation</span>
                </div>
                {observationOpen ? (
                  <KeyboardArrowUpIcon sx={{ fontSize: 18 }} />
                ) : (
                  <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />
                )}
              </button>
              
              {observationOpen && (
                <div className="pl-6 space-y-1 mt-1 transition-all">
                  <NavLink
                    to="/observation-entry"
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                        isActive
                          ? "bg-white text-[#2562AA] shadow-md font-bold"
                          : "text-white/80 hover:bg-white/8 hover:text-white"
                      }`
                    }
                  >
                    <span className="font-medium text-xs">Observation Entry</span>
                  </NavLink>
                  
                  <NavLink
                    to="/observation-builder"
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                        isActive
                          ? "bg-white text-[#2562AA] shadow-md font-bold"
                          : "text-white/80 hover:bg-white/8 hover:text-white"
                      }`
                    }
                  >
                    <span className="font-medium text-xs">Form Builder</span>
                  </NavLink>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Bottom accent */}
        <div className="h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent mx-4 mb-4 rounded-full" />
      </aside>
    </>
  );
};

export default Sidebar;
