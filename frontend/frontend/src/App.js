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
import SampleMasterList from "./pages/samples/SampleMasterList";

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
import AddLab from "./pages/superadmin/lab/AddLab";
import ViewLab from "./pages/superadmin/lab/ViewLab";
import EditLab from "./pages/superadmin/lab/EditLab";

import ObservationEntry from "./pages/observationBuilder/ObservationEntry";
import ObservationBuilder from "./pages/observationBuilder/ObservationBuilder";

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
          <ProtectedRoute>
            <ProjectsList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/add"
        element={
          <ProtectedRoute>
            <AddProject />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/view/:id"
        element={
          <ProtectedRoute>
            <ProjectView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/preview/:id"
        element={
          <ProtectedRoute>
            <ProjectPreview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/edit/:id"
        element={
          <ProtectedRoute>
            <EditProject />
          </ProtectedRoute>
        }
      />

      {/* Sample Routes */}
      {/* <Route
        path="/samples"
        element={
          <ProtectedRoute>
            <SamplesList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/samples/add"
        element={
          <ProtectedRoute>
            <AddSample />
          </ProtectedRoute>
        }
      /> */}
      <Route
        path="/samples/entry"
        element={
          <ProtectedRoute>
            <SampleEntry />
          </ProtectedRoute>
        }
      />
      {/* <Route
        path="/samples/view/:id"
        element={
          <ProtectedRoute>
            <SampleView />
          </ProtectedRoute>
        }
      /> */}
      {/* <Route
        path="/samples/edit/:id"
        element={
          <ProtectedRoute>
            <EditSample />
          </ProtectedRoute>
        }
      /> */}
      <Route
        path="/samples/master"
        element={
          <ProtectedRoute>
            <SampleMasterList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/labClients"
        element={
          <ProtectedRoute>
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
          <ProtectedRoute>
            <ScopeList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/scope/view/:id"
        element={
          <ProtectedRoute>
            <ScopeView />
          </ProtectedRoute>
        }
      />

      <Route
        path="/scope/add"
        element={
          <ProtectedRoute>
            <AddScope />
          </ProtectedRoute>
        }
      />

      <Route
        path="/scope/multiple"
        element={
          <ProtectedRoute>
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
          <ProtectedRoute>
            <UsersList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users/add"
        element={
          <ProtectedRoute>
            <AddUser />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users/:userId"
        element={
          <ProtectedRoute>
            <ViewUser />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users/:userId/edit"
        element={
          <ProtectedRoute>
            <EditUser />
          </ProtectedRoute>
        }
      />

      {/* Superadmin Routes */}
      <Route
        path="/labs/manage"
        element={
          <ProtectedRoute>
            <LabManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/add-lab"
        element={
          <ProtectedRoute>
            <AddLab />
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
          <ProtectedRoute>
            <ObservationEntry />
          </ProtectedRoute>
        }
      />

      <Route
        path="/observation-builder"
        element={
          <ProtectedRoute>
            <ObservationBuilder />
          </ProtectedRoute>
        }
      />

      {/* Reports Routes */}
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/add/:sampleEntryId?"
        element={
          <ProtectedRoute>
            <ReportAdd />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/view/:reportId"
        element={
          <ProtectedRoute>
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
