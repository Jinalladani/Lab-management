import React, { useEffect, useState } from "react";
import { getProjects, updateProjectStatus } from "../../api/projects";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";

const ProjectsList = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await getProjects({
        search,
      });

      setProjects(response.data?.data || []);
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message || "Failed to fetch projects"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProjects();
  };

  const handleStatusChange = async (projectId, newStatus) => {
    try {
      await updateProjectStatus(projectId, {
        status: newStatus,
        change_note: `Project moved to ${newStatus}`,
      });
      fetchProjects();
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to update status");
    }
  };

  const handleEdit = (projectId) => {
    // Navigate to edit page with project ID
    navigate(`/projects/edit/${projectId}`);
  };

  return (
    <MainLayout headerTitle="Projects" headerSubtitle="Manage your projects">
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <form onSubmit={handleSearch} className="flex gap-3 mb-5">
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:max-w-[320px] border border-gray-300 rounded-lg px-4 py-2 outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#2d66b3] text-white font-medium"
            >
              Search
            </button>
          </form>
          <Link
            to="/projects/add"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#2d66b3] text-white font-medium hover:bg-[#1f5498]"
          >
            Add Project
          </Link>

        </div>


        {errorMessage && (
          <p className="text-red-500 text-sm mb-4">{errorMessage}</p>
        )}

        {/* Desktop Table View */}
        <div className="hidden lg:block bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-[#eef5fd]">
              <tr>
                <th className="text-left px-4 py-3">Project Code</th>
                <th className="text-left px-4 py-3">Project Name</th>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-left px-4 py-3">Location</th>
                <th className="text-left px-4 py-3">Reports</th>
                <th className="text-left px-4 py-3">Samples</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {!loading && projects.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-4 py-6 text-center text-gray-500">
                    No projects found
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan="8" className="px-4 py-6 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              )}

              {!loading &&
                projects.map((project) => (
                  <tr key={project.project_id} className="border-t">
                    <td className="px-4 py-3">{project.project_code}</td>
                    <td className="px-4 py-3">{project.project_name}</td>
                    <td className="px-4 py-3">{project.client_name || "-"}</td>
                    <td className="px-4 py-3">{project.location_name || "-"}</td>
                    <td className="px-4 py-3">{project.total_reports}</td>
                    <td className="px-4 py-3">{project.total_samples}</td>
                    <td className="px-4 py-3">
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                        {project.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <Link
                        to={`/projects/view/${project.project_id}`}
                        className="text-[#2d66b3] hover:bg-blue-50 p-2 rounded-lg transition-colors"
                        title="View"
                      >
                        <VisibilityIcon fontSize="small" />
                      </Link>
                      <button
                        onClick={() => handleEdit(project.project_id)}
                        className="text-green-700 hover:bg-green-50 p-2 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <EditIcon fontSize="small" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-4">
          {!loading && projects.length === 0 && (
            <div className="bg-white rounded-xl shadow p-6 text-center text-gray-500">
              No projects found
            </div>
          )}

          {loading && (
            <div className="bg-white rounded-xl shadow p-6 text-center text-gray-500">
              Loading...
            </div>
          )}

          {!loading &&
            projects.map((project) => (
              <div key={project.project_id} className="bg-white rounded-xl shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">
                      {project.project_name}
                    </h3>
                    <p className="text-sm text-gray-500">{project.project_code}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                    {project.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Client</p>
                    <p className="text-sm font-medium">{project.client_name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Location</p>
                    <p className="text-sm font-medium">{project.location_name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Reports</p>
                    <p className="text-sm font-medium">{project.total_reports}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Samples</p>
                    <p className="text-sm font-medium">{project.total_samples}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t">
                  <Link
                    to={`/projects/view/${project.project_id}`}
                    className="flex-1 flex items-center justify-center gap-2 text-[#2d66b3] hover:bg-blue-50 py-2 rounded-lg transition-colors"
                  >
                    <VisibilityIcon fontSize="small" />
                    <span className="text-sm">View</span>
                  </Link>
                  <button
                    onClick={() => handleEdit(project.project_id)}
                    className="flex-1 flex items-center justify-center gap-2 text-green-700 hover:bg-green-50 py-2 rounded-lg transition-colors"
                  >
                    <EditIcon fontSize="small" />
                    <span className="text-sm">Edit</span>
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default ProjectsList;