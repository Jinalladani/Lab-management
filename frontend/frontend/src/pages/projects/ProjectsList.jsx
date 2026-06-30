import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { getProjects, deleteProject, updateProjectStatus } from "../../api/projects";
import { getSampleEntries } from "../../api/sampleMaster";
import { getClients } from "../../api/clients";
import { MainLayout } from "../../components/layout";
import AddSampleDrawer from "../../components/projects/AddSampleDrawer";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import AddIcon from "@mui/icons-material/Add";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ScienceIcon from "@mui/icons-material/Science";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import AssignmentIcon from "@mui/icons-material/Assignment";
import TimelineIcon from "@mui/icons-material/Timeline";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ArchiveIcon from "@mui/icons-material/Archive";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DescriptionIcon from "@mui/icons-material/Description";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PersonIcon from "@mui/icons-material/Person";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On Hold" },
  { value: "cancelled", label: "Cancelled" },
];

const DROPDOWN_WIDTH = 220;
const DROPDOWN_HEIGHT = 420;

const getStatusStyles = (status) => {
  const map = {
    draft: "bg-slate-100 text-slate-700 border-slate-200",
    active: "bg-emerald-100 text-emerald-700 border-emerald-200",
    in_progress: "bg-blue-100 text-blue-700 border-blue-200",
    completed: "bg-green-100 text-green-700 border-green-200",
    on_hold: "bg-amber-100 text-amber-700 border-amber-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
  };
  return map[status] || "bg-gray-100 text-gray-700 border-gray-200";
};

const formatStatus = (status) =>
  STATUS_OPTIONS.find((item) => item.value === status)?.label || status || "-";

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const ProjectActionMenu = ({ anchorEl, open, onClose, actions }) => {
  const [style, setStyle] = useState(null);

  useEffect(() => {
    if (!open || !anchorEl) return;

    const updatePosition = () => {
      const rect = anchorEl.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      let top =
        spaceBelow >= DROPDOWN_HEIGHT + 8
          ? rect.bottom + 8
          : Math.max(8, rect.top - DROPDOWN_HEIGHT - 8);

      let left = rect.right - DROPDOWN_WIDTH;
      if (left < 8) left = 8;
      if (left + DROPDOWN_WIDTH > viewportWidth - 8) {
        left = viewportWidth - DROPDOWN_WIDTH - 8;
      }

      setStyle({
        position: "fixed",
        top: `${top}px`,
        left: `${left}px`,
        width: `${DROPDOWN_WIDTH}px`,
        zIndex: 99999,
      });
    };

    const handleClickOutside = (event) => {
      if (
        anchorEl &&
        !anchorEl.contains(event.target) &&
        !event.target.closest(".project-action-menu")
      ) {
        onClose();
      }
    };

    updatePosition();
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, anchorEl, onClose]);

  if (!open || !anchorEl || !style) return null;

  return createPortal(
    <div
      style={style}
      className="project-action-menu bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl shadow-2xl py-2 overflow-hidden"
    >
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={() => {
            onClose();
            action.onClick();
          }}
          className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-gray-50 ${action.danger ? "text-red-600 hover:bg-red-50" : "text-gray-700"
            }`}
        >
          {action.icon}
          <span>{action.label}</span>
        </button>
      ))}
    </div>,
    document.body
  );
};

const StatCard = ({ label, value, accent }) => (
  <div className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md shadow-[0_8px_30px_rgba(15,23,42,0.08)] p-5 hover:-translate-y-0.5 transition-transform">
    <p className="text-sm text-gray-500 mb-2">{label}</p>
    <p className={`text-3xl font-bold ${accent}`}>{value}</p>
  </div>
);

const ProjectsList = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [sampleEntries, setSampleEntries] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [engineerFilter, setEngineerFilter] = useState("");
  const [materialFilter, setMaterialFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [activeAnchorEl, setActiveAnchorEl] = useState(null);
  const [drawerProject, setDrawerProject] = useState(null);
  const actionButtonRefs = useRef({});

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const [projectsRes, samplesRes, clientsRes] = await Promise.all([
        getProjects({ search }),
        getSampleEntries(),
        getClients(),
      ]);
      setProjects(projectsRes?.data?.data || []);
      setSampleEntries(samplesRes?.data?.data || []);
      setClients(clientsRes?.data?.data || []);
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const projectMaterialMap = useMemo(() => {
    const map = {};
    sampleEntries.forEach((entry) => {
      if (!entry.project_id) return;
      if (!map[entry.project_id]) map[entry.project_id] = new Set();
      if (entry.material_name) map[entry.project_id].add(entry.material_name);
      if (entry.material_type_name) map[entry.project_id].add(entry.material_type_name);
    });
    return map;
  }, [sampleEntries]);

  const engineers = useMemo(() => {
    const names = new Set(
      projects
        .map((project) => project.test_assigned_to_name)
        .filter(Boolean)
    );
    return Array.from(names);
  }, [projects]);

  const materialTypes = useMemo(() => {
    const types = new Set();
    sampleEntries.forEach((entry) => {
      if (entry.material_type_name) types.add(entry.material_type_name);
      if (entry.material_name) types.add(entry.material_name);
    });
    return Array.from(types);
  }, [sampleEntries]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      if (statusFilter && project.status !== statusFilter) return false;
      if (clientFilter && String(project.client_id) !== String(clientFilter)) return false;
      if (engineerFilter && project.test_assigned_to_name !== engineerFilter) return false;

      if (dateFrom) {
        const created = new Date(project.created_at);
        if (created < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        const created = new Date(project.created_at);
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        if (created > endDate) return false;
      }

      if (materialFilter) {
        const materials = projectMaterialMap[project.project_id];
        if (!materials || !Array.from(materials).some((item) => item === materialFilter)) {
          return false;
        }
      }

      return true;
    });
  }, [
    projects,
    statusFilter,
    clientFilter,
    engineerFilter,
    dateFrom,
    dateTo,
    materialFilter,
    projectMaterialMap,
  ]);

  const stats = useMemo(() => {
    const totalProjects = filteredProjects.length;
    const activeProjects = filteredProjects.filter((project) =>
      ["active", "in_progress"].includes(project.status)
    ).length;
    const pendingSamples = sampleEntries.filter((entry) => entry.status === "pending").length;
    const completedReports = filteredProjects.reduce(
      (sum, project) => sum + (project.total_reports || 0),
      0
    );
    const testingInProgress = filteredProjects.filter((project) =>
      project.status === "in_progress"
    ).length;

    return {
      totalProjects,
      activeProjects,
      pendingSamples,
      completedReports,
      testingInProgress,
    };
  }, [filteredProjects, sampleEntries]);

  const closeDropdown = () => {
    setActiveDropdownId(null);
    setActiveAnchorEl(null);
  };

  const handleToggleDropdown = (projectId, event) => {
    if (activeDropdownId === projectId) {
      closeDropdown();
      return;
    }
    setActiveDropdownId(projectId);
    setActiveAnchorEl(event.currentTarget);
  };

  const handleDeleteProject = async (project) => {
    if (!window.confirm(`Delete project "${project.project_name}"?`)) return;
    try {
      await deleteProject(project.project_id);
      fetchData();
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to delete project");
    }
  };

  const handleArchiveProject = async (project) => {
    try {
      await updateProjectStatus(project.project_id, { status: "on_hold" });
      fetchData();
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to archive project");
    }
  };

  const handleDuplicateProject = (project) => {
    alert(`Duplicate project workflow for "${project.project_code}" will open soon.`);
  };

  const handleExport = (type) => {
    alert(`${type} export will be available in the next release.`);
  };

  const handleSampleSaved = (createdCount) => {
    alert(`${createdCount} sample(s) added successfully.`);
    fetchData();
  };

  const getProjectActions = (project) => [
    {
      label: "View Project",
      icon: <VisibilityIcon fontSize="small" />,
      onClick: () => navigate(`/projects/view/${project.project_id}`),
    },
    {
      label: "Edit Project",
      icon: <EditIcon fontSize="small" />,
      onClick: () => navigate(`/projects/edit/${project.project_id}`),
    },
    {
      label: "Add Sample",
      icon: <ScienceIcon fontSize="small" />,
      onClick: () => setDrawerProject(project),
    },
    {
      label: "View Samples",
      icon: <ScienceIcon fontSize="small" />,
      onClick: () => navigate(`/samples?project_id=${project.project_id}`),
    },
    {
      label: "Upload Documents",
      icon: <UploadFileIcon fontSize="small" />,
      onClick: () => navigate(`/projects/edit/${project.project_id}`),
    },
    {
      label: "Test Assignment",
      icon: <AssignmentIcon fontSize="small" />,
      onClick: () => navigate(`/projects/edit/${project.project_id}`),
    },
    {
      label: "Generate Report",
      icon: <DescriptionIcon fontSize="small" />,
      onClick: () => navigate(`/reports/add?project_id=${project.project_id}`),
    },
    {
      label: "Download Report",
      icon: <FileDownloadIcon fontSize="small" />,
      onClick: () => navigate(`/reports?project_id=${project.project_id}`),
    },
    {
      label: "Project Timeline",
      icon: <TimelineIcon fontSize="small" />,
      onClick: () => navigate(`/projects/view/${project.project_id}`),
    },
    {
      label: "Duplicate Project",
      icon: <ContentCopyIcon fontSize="small" />,
      onClick: () => handleDuplicateProject(project),
    },
    {
      label: "Archive Project",
      icon: <ArchiveIcon fontSize="small" />,
      onClick: () => handleArchiveProject(project),
    },
    {
      label: "Delete Project",
      icon: <DeleteOutlineIcon fontSize="small" />,
      danger: true,
      onClick: () => handleDeleteProject(project),
    },
  ];

  return (
    <MainLayout headerTitle="Projects" headerSubtitle="Modern project dashboard for lab operations">
      <div className="p-4 sm:p-6 relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#eef5fd] via-white to-[#f8fbff]" />

        {/* <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Project Dashboard</h1>
            <p className="text-gray-500 mt-1">Manage projects, samples, and reports from one place</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleExport("Excel")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white/80 backdrop-blur text-sm font-medium text-gray-700 hover:bg-white"
            >
              <AssessmentIcon fontSize="small" />
              Export Excel
            </button>
            <button
              type="button"
              onClick={() => handleExport("PDF")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white/80 backdrop-blur text-sm font-medium text-gray-700 hover:bg-white"
            >
              <PictureAsPdfIcon fontSize="small" />
              Export PDF
            </button>
            <button
              type="button"
              onClick={() => handleExport("Import")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white/80 backdrop-blur text-sm font-medium text-gray-700 hover:bg-white"
            >
              <UploadFileIcon fontSize="small" />
              Import Projects
            </button>
            <button
              type="button"
              onClick={() => alert("Bulk sample upload will be available soon.")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white/80 backdrop-blur text-sm font-medium text-gray-700 hover:bg-white"
            >
              <ScienceIcon fontSize="small" />
              Bulk Sample Upload
            </button>
          </div>
        </div> */}

        {/* <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
          <StatCard label="Total Projects" value={stats.totalProjects} accent="text-[#2d66b3]" />
          <StatCard label="Active Projects" value={stats.activeProjects} accent="text-emerald-600" />
          <StatCard label="Pending Samples" value={stats.pendingSamples} accent="text-amber-600" />
          <StatCard label="Completed Reports" value={stats.completedReports} accent="text-green-600" />
          <StatCard label="Testing In Progress" value={stats.testingInProgress} accent="text-blue-600" />
        </div> */}

        <div className="rounded-2xl border border-white/70 bg-white/75 backdrop-blur-md shadow-[0_8px_30px_rgba(15,23,42,0.06)] p-4 sm:p-5 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="xl:col-span-2 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-100 bg-white/90"
            />


            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-100 bg-white/90"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => navigate("/projects/add")}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#2d66b3] text-white font-medium hover:bg-[#1f5498] whitespace-nowrap"
              title="New Project"
            >
              New Project
            </button>


          </div>
        </div>

        {errorMessage && <p className="text-red-500 text-sm mb-4">{errorMessage}</p>}

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white/80 p-10 text-center text-gray-500">
            Loading projects...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white/80 p-10 text-center text-gray-500">
            No projects found
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
  <table className="min-w-full text-sm">
    <thead className="bg-gray-100">
      <tr>
        <th className="px-4 py-3 text-left">Code</th>
        <th className="px-4 py-3 text-left">Project Name</th>
        <th className="px-4 py-3 text-left">Client</th>
        <th className="px-4 py-3 text-left">Status</th>
        <th className="px-4 py-3 text-center">Samples</th>
        <th className="px-4 py-3 text-center">Reports</th>
        <th className="px-4 py-3 text-left">Engineer</th>
        <th className="px-4 py-3 text-center">Actions</th>
      </tr>
    </thead>

    <tbody>
      {filteredProjects.map((project) => (
        <tr
          key={project.project_id}
          className="border-t hover:bg-blue-50 transition"
        >
          <td className="px-4 py-3 font-medium">
            {project.project_code}
          </td>

          <td className="px-4 py-3">
            {project.project_name}
          </td>

          <td className="px-4 py-3">
            {project.client_name || "-"}
          </td>

          <td className="px-4 py-3">
            <span
              className={`px-2 py-1 rounded-full text-xs border ${getStatusStyles(
                project.status
              )}`}
            >
              {formatStatus(project.status)}
            </span>
          </td>

          <td className="px-4 py-3 text-center">
            {project.total_samples ?? 0}
          </td>

          <td className="px-4 py-3 text-center">
            {project.total_reports ?? 0}
          </td>

          <td className="px-4 py-3">
            {project.test_assigned_to_name || "-"}
          </td>

          <td className="px-4 py-3 text-center">
            <button
              ref={(el) => {
                actionButtonRefs.current[project.project_id] = el;
              }}
              onClick={(e) => handleToggleDropdown(project.project_id, e)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <MoreVertIcon fontSize="small" />
            </button>

            <ProjectActionMenu
              anchorEl={
                activeDropdownId === project.project_id
                  ? activeAnchorEl
                  : null
              }
              open={activeDropdownId === project.project_id}
              onClose={closeDropdown}
              actions={getProjectActions(project)}
            />
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
        )}

        <button
          type="button"
          onClick={() => navigate("/projects/add")}
          className="fixed bottom-8 right-8 h-14 w-14 rounded-full bg-gradient-to-r from-[#2b63ae] to-[#1e4a8c] text-white shadow-[0_12px_30px_rgba(45,102,179,0.35)] hover:scale-105 transition-transform flex items-center justify-center z-40"
          title="New Project"
        >
          <AddIcon />
        </button>

        <AddSampleDrawer
          open={!!drawerProject}
          project={drawerProject}
          onClose={() => setDrawerProject(null)}
          onSaved={handleSampleSaved}
        />
      </div>
    </MainLayout>
  );
};

export default ProjectsList;
