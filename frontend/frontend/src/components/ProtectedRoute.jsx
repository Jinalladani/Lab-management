import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { hasPermission } from "../utils/permissions";

const ProtectedRoute = ({ children, requiredPermission }) => {
  const token = localStorage.getItem("token");
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredPermission) {
    try {
      const rawUser = localStorage.getItem("user");
      const user = rawUser ? JSON.parse(rawUser) : null;
      const userRole = user?.role || "Engineer";

      if (!hasPermission(userRole, requiredPermission)) {
        return <Navigate to="/dashboard" replace />;
      }
    } catch {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
