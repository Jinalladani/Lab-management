import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPasswordEmail from "./pages/auth/ForgotPasswordEmail";
import ForgotPasswordOtp from "./pages/auth/ForgotPasswordOtp";
import ForgotPasswordReset from "./pages/auth/ForgotPasswordReset";
import VerifyEmail from "./pages/auth/VerifyEmail";
import Home from "./pages/Home";

import ProjectsList from "./pages/projects/ProjectsList";
import AddProject from "./pages/projects/AddProject";
import EditProject from "./pages/projects/EditProject";
import ProjectView from "./pages/projects/ProjectView";
import ProjectPreview from "./pages/projects/ProjectPreview";


import SampleEntry from "./pages/samples/SampleEntry";
import SamplesList from "./pages/samples/SamplesList";
import SampleMasterList from "./pages/samples/SampleMasterList";
import TestAssignmentsList from "./pages/testAssignments/TestAssignmentsList";

// import SampleView from "./pages/samples/SampleView";
import LabClientsList from "./pages/labClients/LabClientsList";
import AddLabClient from "./pages/labClients/AddLabClient";
import EditLabClient from "./pages/labClients/EditLabClient";
import LabClientView from "./pages/labClients/LabClientView";

import ReportList from "./pages/reports/ReportList";
import ReportAdd from "./pages/reports/ReportAdd";
import ReportView from "./pages/reports/ReportView";

import ScopeList from "./pages/scopes/ScopeList";
import ScopeView from "./pages/scopes/ScopeView";
import AddScope from "./pages/scopes/AddScope";
import AddMultipleScope from "./pages/scopes/AddMultipleScope";

import Profile from "./pages/Profile";
import LabProfile from "./pages/labs/LabProfile";
import UsersList from "./pages/users/UsersList";
import AddUser from "./pages/users/AddUser";
import EditUser from "./pages/users/EditUser";
import ViewUser from "./pages/users/ViewUser";

import LabManagement from "./pages/superadmin/lab/LabManagement";
import ViewLab from "./pages/superadmin/lab/ViewLab";
import EditLab from "./pages/superadmin/lab/EditLab";
import SubscriptionPlans from "./pages/superadmin/subscriptions/SubscriptionPlans";
import AuditLogs from "./pages/superadmin/audit/AuditLogs";
import PlatformConfigurationPlaceholder from "./pages/superadmin/configuration/PlatformConfigurationPlaceholder";
import ObservationTemplates from "./pages/superadmin/observation-templates/ObservationTemplates";
import CreateObservationTemplate from "./pages/superadmin/observation-templates/CreateObservationTemplate";
import TemplateBuilderPlaceholder from "./pages/superadmin/observation-templates/TemplateBuilderPlaceholder";
import SuperAdminSettings from "./pages/superadmin/settings/SuperAdminSettings";
import RolesManagement from "./pages/superadmin/roles/RolesManagement";

import ObservationEntry from "./pages/observationBuilder/ObservationEntry";
import ObservationBuilder from "./pages/observationBuilder/ObservationBuilder";

import EquipmentDashboard from "./pages/equipment/EquipmentDashboard";
import EquipmentList from "./pages/equipment/EquipmentList";
import AddEquipment from "./pages/equipment/AddEquipment";
import EditEquipment from "./pages/equipment/EditEquipment";
import EquipmentDetails from "./pages/equipment/EquipmentDetails";
import EquipmentLocations from "./pages/equipment/EquipmentLocations";
import EquipmentTestMapping from "./pages/equipment/EquipmentTestMapping";
import CalibrationDashboard from "./pages/calibration/CalibrationDashboard";
import CalibrationCalendar from "./pages/calibration/CalibrationCalendar";
import CalibrationRegister from "./pages/calibration/CalibrationRegister";
import CalibrationDueOverdue from "./pages/calibration/CalibrationDueOverdue";
import MaintenanceHistory from "./pages/calibration/MaintenanceHistory";

// import ReportList  from "./pages/reports/ReportList";
// import ReportCreate from "./pages/reports/ReportCreate";
// import ReportDetail from "./pages/reports/ReportDetail";



function App() {
  return (
    <Routes>
      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" />} />

      {/* Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPasswordEmail />} />
      <Route
        path="/forgot-password/verify"
        element={<ForgotPasswordOtp />}
      />
      <Route
        path="/forgot-password/reset"
        element={<ForgotPasswordReset />}
      />

      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* Dashboard - All authenticated users */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />

      {/* Role-based dashboard routes */}
      <Route
        path="/superadmin/dashboard"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />

      <Route
        path="/QM/dashboard"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />

      <Route
        path="/Eng/dashboard"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />

      <Route
        path="/projects"
        element={
          <ProtectedRoute requiredPermission="project.view">
            <ProjectsList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/add"
        element={
          <ProtectedRoute requiredPermission="project.manage">
            <AddProject />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/view/:id"
        element={
          <ProtectedRoute requiredPermission="project.view">
            <ProjectView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/preview/:id"
        element={
          <ProtectedRoute requiredPermission="project.view">
            <ProjectPreview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/edit/:id"
        element={
          <ProtectedRoute requiredPermission="project.manage">
            <EditProject />
          </ProtectedRoute>
        }
      />

      {/* Sample Routes */}
      <Route
        path="/samples"
        element={
          <ProtectedRoute requiredPermission="sample.view">
            <SamplesList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/samples/entry"
        element={
          <ProtectedRoute requiredPermission="sample.receive">
            <SampleEntry />
          </ProtectedRoute>
        }
      />
      <Route
        path="/samples/master"
        element={
          <ProtectedRoute requiredPermission="sample.view">
            <SampleMasterList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/test-assignments"
        element={
          <ProtectedRoute requiredPermission="test.assign">
            <TestAssignmentsList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/labClients"
        element={
          <ProtectedRoute requiredPermission="client.view">
            <LabClientsList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/labClients/add"
        element={
          <ProtectedRoute>
            <AddLabClient />
          </ProtectedRoute>
        }
      />
      <Route
        path="/labClients/view/:id"
        element={
          <ProtectedRoute>
            <LabClientView />
          </ProtectedRoute>
        }
      />

      <Route
        path="/labClients/edit/:id"
        element={
          <ProtectedRoute>
            <EditLabClient />
          </ProtectedRoute>
        }
      />

      <Route
        path="/scope"
        element={
          <ProtectedRoute requiredPermission="scope.view">
            <ScopeList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/scope/view/:id"
        element={
          <ProtectedRoute requiredPermission="scope.view">
            <ScopeView />
          </ProtectedRoute>
        }
      />

      <Route
        path="/scope/add"
        element={
          <ProtectedRoute requiredPermission="scope.manage">
            <AddScope />
          </ProtectedRoute>
        }
      />

      <Route
        path="/scope/multiple"
        element={
          <ProtectedRoute requiredPermission="scope.manage">
            <AddMultipleScope />
          </ProtectedRoute>
        }
      />



      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/lab"
        element={
          <ProtectedRoute>
            <LabProfile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute requiredPermission="user.manage">
            <UsersList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users/add"
        element={
          <ProtectedRoute requiredPermission="user.manage">
            <AddUser />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users/:userId"
        element={
          <ProtectedRoute requiredPermission="user.manage">
            <ViewUser />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users/:userId/edit"
        element={
          <ProtectedRoute requiredPermission="user.manage">
            <EditUser />
          </ProtectedRoute>
        }
      />

      {/* Superadmin Routes */}
      <Route
        path="/superadmin/roles"
        element={
          <ProtectedRoute>
            <RolesManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/roles"
        element={
          <ProtectedRoute>
            <RolesManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/labs/manage"
        element={
          <ProtectedRoute>
            <LabManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/subscriptions"
        element={
          <ProtectedRoute>
            <SubscriptionPlans />
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/audit-logs"
        element={
          <ProtectedRoute>
            <AuditLogs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/master-data"
        element={
          <ProtectedRoute>
            <PlatformConfigurationPlaceholder moduleKey="masterData" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/observation-templates"
        element={
          <ProtectedRoute>
            <ObservationTemplates />
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/observation-templates/new"
        element={
          <ProtectedRoute>
            <CreateObservationTemplate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/observation-templates/:templateId/builder"
        element={
          <ProtectedRoute>
            <TemplateBuilderPlaceholder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/report-templates"
        element={
          <ProtectedRoute>
            <PlatformConfigurationPlaceholder moduleKey="reportTemplates" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/settings"
        element={
          <ProtectedRoute>
            <SuperAdminSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/labs/view/:id"
        element={
          <ProtectedRoute>
            <ViewLab />
          </ProtectedRoute>
        }
      />
      <Route
        path="/labs/edit/:id"
        element={
          <ProtectedRoute>
            <EditLab />
          </ProtectedRoute>
        }
      />

      <Route
        path="/observation-entry"
        element={
          <ProtectedRoute requiredPermission="observation.view">
            <ObservationEntry />
          </ProtectedRoute>
        }
      />

      <Route
        path="/superadmin/observation-builder"
        element={
          <ProtectedRoute>
            <ObservationBuilder />
          </ProtectedRoute>
        }
      />

      {/* Equipment & Calibration Routes */}
      <Route
        path="/equipment"
        element={<Navigate to="/equipment/list" replace />}
      />
      <Route
        path="/equipment/dashboard"
        element={
          <ProtectedRoute requiredPermission="equipment.view">
            <EquipmentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/equipment/list"
        element={
          <ProtectedRoute requiredPermission="equipment.view">
            <EquipmentList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/equipment/add"
        element={
          <ProtectedRoute requiredPermission="equipment.manage">
            <AddEquipment />
          </ProtectedRoute>
        }
      />
      <Route
        path="/equipment/view/:id"
        element={
          <ProtectedRoute requiredPermission="equipment.view">
            <EquipmentDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/equipment/edit/:id"
        element={
          <ProtectedRoute requiredPermission="equipment.manage">
            <EditEquipment />
          </ProtectedRoute>
        }
      />
      <Route
        path="/equipment/locations"
        element={
          <ProtectedRoute requiredPermission="equipment.view">
            <EquipmentLocations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/equipment/mapping"
        element={
          <ProtectedRoute requiredPermission="equipment.manage">
            <EquipmentTestMapping />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calibration"
        element={<Navigate to="/calibration/register" replace />}
      />
      <Route
        path="/calibration/dashboard"
        element={
          <ProtectedRoute requiredPermission="calibration.view">
            <CalibrationDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calibration/calendar"
        element={
          <ProtectedRoute requiredPermission="calibration.view">
            <CalibrationCalendar />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calibration/register"
        element={
          <ProtectedRoute requiredPermission="calibration.view">
            <CalibrationRegister />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calibration/due-overdue"
        element={
          <ProtectedRoute requiredPermission="calibration.view">
            <CalibrationDueOverdue />
          </ProtectedRoute>
        }
      />
      <Route
        path="/maintenance/history"
        element={
          <ProtectedRoute requiredPermission="equipment.view">
            <MaintenanceHistory />
          </ProtectedRoute>
        }
      />

      {/* Reports Routes */}
      <Route
        path="/observation"
        element={<Navigate to="/observation-entry" replace />}
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute requiredPermission="report.view">
            <ReportList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/add/:sampleEntryId?"
        element={
          <ProtectedRoute requiredPermission="report.generate">
            <ReportAdd />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/view/:reportId"
        element={
          <ProtectedRoute requiredPermission="report.view">
            <ReportView />
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<div>Page Not Found</div>} />
    </Routes>
  );
}

export default App;
