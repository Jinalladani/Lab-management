import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MainLayout } from "../../components/layout";
import AddSampleDrawer from "../../components/projects/AddSampleDrawer";
import {
  getSampleEntries,
  getSampleEntryById,
  deleteSampleEntry,
} from "../../api/sampleEntries";
import { getProjects } from "../../api/projects";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import { toast, Toaster } from "sonner";

const getSampleId = (sample) => sample.sample_entry_id || sample.sample_id;

const statusClass = (status) => {
  const value = String(status || "").toLowerCase();
  if (value.includes("reject")) return "bg-red-100 text-red-700 border-red-200";
  if (value.includes("assign") || value.includes("test")) return "bg-blue-100 text-blue-700 border-blue-200";
  if (value.includes("complete") || value.includes("approved")) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

const SamplesList = () => {
  const [samples, setSamples] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState("add");
  const [drawerSample, setDrawerSample] = useState(null);

  const fetchProjects = async () => {
    try {
      const res = await getProjects();
      setProjects(res.data?.data || res.data?.projects || []);
    } catch (error) {
      console.error("Failed to load projects:", error);
      toast.error("Failed to load projects");
    }
  };

  const fetchSamples = useCallback(async () => {
    try {
      setLoading(true);
      const params = projectFilter ? { project_id: projectFilter } : {};
      const res = await getSampleEntries(params);
      setSamples(res.data?.data || []);
    } catch (error) {
      console.error("Failed to load samples:", error);
      toast.error("Failed to load samples");
    } finally {
      setLoading(false);
    }
  }, [projectFilter]);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchSamples();
  }, [fetchSamples]);

  const filteredSamples = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return samples;

    return samples.filter((sample) =>
      [
        sample.sample_no,
        sample.project_no,
        sample.project_code,
        sample.project_name,
        sample.client_name,
        sample.material_name,
        sample.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [samples, search]);

  const openDrawer = async (mode, sample = null) => {
    setDrawerMode(mode);
    setDrawerSample(null);
    setDrawerOpen(true);

    if (mode === "add" || !sample) return;

    try {
      const res = await getSampleEntryById(getSampleId(sample));
      setDrawerSample(res.data?.data || sample);
    } catch (error) {
      console.error("Failed to load sample details:", error);
      setDrawerSample(sample);
      toast.error("Sample details API failed. Opening available sample data.");
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerMode("add");
    setDrawerSample(null);
  };

  const handleDelete = async (sample) => {
    if (!window.confirm("Are you sure you want to delete this sample?")) return;

    try {
      await deleteSampleEntry(getSampleId(sample));
      toast.success("Sample deleted successfully");
      fetchSamples();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete sample");
    }
  };

  return (
    <MainLayout headerTitle="Samples" headerSubtitle="Full sample register list">
      <Toaster position="top-right" richColors />
      <div className="p-6 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Samples</h1>
            <p className="text-sm text-slate-500">View every sample and create new sample entries.</p>
          </div>
          <button
            type="button"
            onClick={() => openDrawer("add")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2562AA] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1f5498]"
          >
            <AddIcon fontSize="small" />
            Add Sample
          </button>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <SearchIcon className="text-slate-400" fontSize="small" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sample, project, client or material..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
          >
            <option value="">All Projects</option>
            {projects.map((project) => (
              <option key={project.project_id} value={project.project_id}>
                {project.project_code} - {project.project_name}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Sample No</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Material</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Received Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">Loading samples...</td>
                  </tr>
                ) : filteredSamples.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">No samples found.</td>
                  </tr>
                ) : (
                  filteredSamples.map((sample) => (
                    <tr key={getSampleId(sample)} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{sample.sample_no || getSampleId(sample)}</td>
                      <td className="px-4 py-3 text-slate-700">{sample.project_no || sample.project_code || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{sample.client_name || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{sample.material_name || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{sample.quantity || sample.nos || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{sample.received_date || sample.sample_received_date || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(sample.status)}`}>
                          {sample.status || "Received"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openDrawer("view", sample)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" title="View">
                            <VisibilityIcon fontSize="small" />
                          </button>
                          <button onClick={() => openDrawer("edit", sample)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" title="Edit">
                            <EditIcon fontSize="small" />
                          </button>
                          <button onClick={() => handleDelete(sample)} className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50" title="Delete">
                            <DeleteIcon fontSize="small" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AddSampleDrawer
        open={drawerOpen}
        projectOptions={projects}
        sampleEntry={drawerSample}
        mode={drawerMode}
        onClose={closeDrawer}
        onSaved={() => {
          toast.success(drawerMode === "edit" ? "Sample updated" : "Sample added");
          fetchSamples();
        }}
      />
    </MainLayout>
  );
};

export default SamplesList;
