import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import MenuIcon from "@mui/icons-material/Menu";
import PersonIcon from "@mui/icons-material/Person";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LogoutIcon from "@mui/icons-material/Logout";
import BusinessIcon from "@mui/icons-material/Business";

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

const Header = ({ onMenuClick, title = "Projects", subtitle = "Performance summary" }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const user = (() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const displayName = user?.first_name || user?.email || "User";
  const role = user?.role || "user";

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore - clear local state anyway
    } finally {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      navigate("/login", { replace: true });
    }
  };

  const handleProfile = () => {
    setDropdownOpen(false);
    navigate("/profile");
  };

  const handleLabDetails = () => {
    setDropdownOpen(false);
    navigate("/lab");
  };

  return (
    <header className="h-auto py-4 px-6 bg-white border-b border-gray-200 shrink-0">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onMenuClick}
            className="md:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
            aria-label="Toggle sidebar"
          >
            <MenuIcon sx={{ width: 24, height: 24, color: "#4b5563" }} />
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
          </div>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors ring-2 ring-transparent hover:ring-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2562AA]"
          >
            <div className="w-10 h-10 rounded-full bg-[#2562AA] flex items-center justify-center shrink-0 shadow-sm">
              <PersonIcon sx={{ fontSize: 22, color: "white" }} />
            </div>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#2562AA] flex items-center justify-center shrink-0">
                    <PersonIcon sx={{ fontSize: 22, color: "white" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-gray-500">{getRoleTitle(role)}</p>
                  </div>
                </div>
              </div>
              <div className="py-1">
                <button
                  type="button"
                  onClick={handleProfile}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <PersonOutlineIcon sx={{ fontSize: 20, color: "#6b7280" }} />
                  Profile
                </button>
                <button
                  type="button"
                  onClick={handleLabDetails}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <BusinessIcon sx={{ fontSize: 20, color: "#6b7280" }} />
                  Lab Details
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <LogoutIcon sx={{ fontSize: 20, color: "#6b7280" }} />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
