import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  getProjectById,
  downloadProjectDocument,
  viewProjectDocument,
  deleteProjectDocument,
  getProjectRegistration,
  createProjectRegistration,
  updateProjectRegistration,
} from "../../api/projects";
import { getSampleEntries, getSampleEntryById, deleteSampleEntry } from "../../api/sampleEntries";
import { usersAPI } from "../../api/users";
import {
  getAssignmentsByProject,
  getAssignmentsBySample,
  getAssignmentDetails,
  getAvailableTests,
  createTestAssignment,
  updateTestAssignment,
  deleteTestAssignment,
  changeAssignmentStatus,
  getAssignmentDashboardSummary
} from "../../api/testAssignments";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import AddSampleDrawer from "../../components/projects/AddSampleDrawer";
import AssignTestDrawer from "../../components/taskAssign/AssignTestDrawer";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import ScienceIcon from "@mui/icons-material/Science";
import DescriptionIcon from "@mui/icons-material/Description";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import BiotechIcon from "@mui/icons-material/Biotech";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { toast } from "sonner";
import { format } from "date-fns";

const SAMPLE_ACTION_DROPDOWN_WIDTH = 190;
const SAMPLE_ACTION_DROPDOWN_HEIGHT = 150;

const SampleActionMenu = ({ anchorEl, open, onClose, actions }) => {
  const [style, setStyle] = useState(null);

  useEffect(() => {
    if (!open || !anchorEl) return;

    const updatePosition = () => {
      const rect = anchorEl.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;

      let top =
        spaceBelow >= SAMPLE_ACTION_DROPDOWN_HEIGHT + 8
          ? rect.bottom + 8
          : Math.max(8, rect.top - SAMPLE_ACTION_DROPDOWN_HEIGHT - 8);

      let left = rect.right - SAMPLE_ACTION_DROPDOWN_WIDTH;
      if (left < 8) left = 8;
      if (left + SAMPLE_ACTION_DROPDOWN_WIDTH > viewportWidth - 8) {
        left = viewportWidth - SAMPLE_ACTION_DROPDOWN_WIDTH - 8;
      }

      setStyle({
        position: "fixed",
        top: `${top}px`,
        left: `${left}px`,
        width: `${SAMPLE_ACTION_DROPDOWN_WIDTH}px`,
        zIndex: 99999,
      });
    };

    const handleClickOutside = (event) => {
      if (
        anchorEl &&
        !anchorEl.contains(event.target) &&
        !event.target.closest(".sample-action-menu")
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
      className="sample-action-menu bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl shadow-2xl py-2 overflow-hidden"
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



const ProjectView = () => {
  const params = useParams();
  const navigate = useNavigate();
  const project_id = params?.id || params.project_id;
  const projectId = project_id;

  const [project, setProject] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState("project");
  const [dropdownPosition, setDropdownPosition] = useState("bottom");

  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const sampleActionButtonRefs = useRef({});

  const [samples, setSamples] = useState([]);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 10,
    total: 0,
    pages: 0
  });

  const [selectedSampleId, setSelectedSampleId] = useState(null);
  // const [selectedObservationSampleId, setSelectedObservationSampleId] = useState(null);
  const [selectedReportSampleId, setSelectedReportSampleId] = useState(null);
  const [activeSampleActionId, setActiveSampleActionId] = useState(null);
  const [activeSampleActionAnchorEl, setActiveSampleActionAnchorEl] = useState(null);
  const [drawerProject, setDrawerProject] = useState(null);
  const [drawerMode, setDrawerMode] = useState("add");
  const [drawerSampleEntry, setDrawerSampleEntry] = useState(null);
  const [showJobDialog, setShowJobDialog] = useState(false);
  
  // Test Assignment state
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentSummary, setAssignmentSummary] = useState({
    total_samples: 0,
    total_assignments: 0,
    completed: 0,
    in_progress: 0,
    pending: 0
  });
  const [selectedAssignmentSampleId, setSelectedAssignmentSampleId] = useState(null);
  const [showAssignTestModal, setShowAssignTestModal] = useState(false);
  const [availableTests, setAvailableTests] = useState([]);
  const [availableTestsLoading, setAvailableTestsLoading] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    sample_id: null,
    scope_test_ids: [],
    assigned_to: "",
    target_date: "",
    priority: "Normal",
    remarks: ""
  });
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [expandedSampleId, setExpandedSampleId] = useState(null);
  const [sampleAssignments, setSampleAssignments] = useState({});

  const [materialFilter, setMaterialFilter] = useState("");
  const [testFilter, setTestFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [technicianFilter, setTechnicianFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // New Test Assignment Flow State
  const [selectedProjectForAssignment, setSelectedProjectForAssignment] = useState("");
  const [selectedSampleNoForAssignment, setSelectedSampleNoForAssignment] = useState("");
  const [selectedMaterialForAssignment, setSelectedMaterialForAssignment] = useState("");
  const [selectedSampleDescription, setSelectedSampleDescription] = useState("");
  const [selectedSampleDate, setSelectedSampleDate] = useState("");
  const [filteredSamplesForAssignment, setFilteredSamplesForAssignment] = useState([]);
  const [uniqueMaterials, setUniqueMaterials] = useState([]);
  const [availableTestsForAssignment, setAvailableTestsForAssignment] = useState([]);
  const [assignmentTestsBySample, setAssignmentTestsBySample] = useState({});
  const [selectedTestsForAssignment, setSelectedTestsForAssignment] = useState([]);

  const [registration, setRegistration] = useState(null);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [registrationSaving, setRegistrationSaving] = useState(false);
  const [jobForm, setJobForm] = useState({
    registration_no: "",
    job_no: "",
  });
  const [showAssignTestDrawer, setShowAssignTestDrawer] = useState(false);
  const [labUsers, setLabUsers] = useState([]);

  // Helper function to format status for display
  const formatStatusForDisplay = (status) => {
    if (!status) return "-";

    const statusMap = {
      'draft': 'Draft',
      'active': 'Active',
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'on_hold': 'On Hold',
      'cancelled': 'Cancelled'
    };

    return statusMap[status] || status;
  };

  const fetchProject = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await getProjectById(projectId);
      setProject(response.data?.data || null);
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message || "Failed to fetch project details"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistration = async () => {
    try {
      setRegistrationLoading(true);
      const response = await getProjectRegistration(projectId);
      const registrationData = response.data?.data || null;
      setRegistration(registrationData);
      const code = registrationData?.registration_no || registrationData?.job_no || "";
      setJobForm({
        registration_no: code,
        job_no: code,
      });
    } catch (error) {
      if (error?.response?.status !== 404) {
        console.error("Error fetching registration:", error);
      }
      setRegistration(null);
    } finally {
      setRegistrationLoading(false);
    }
  };

  const fetchSamples = async () => {
    setSampleLoading(true);
    try {
      const params = {
        project_id: projectId
      };

      const response = await getSampleEntries(params);

      if (response.data.success) {
        setSamples(response.data.data || []);
        // Set default pagination if not provided
        setPagination(prev => ({
          ...prev,
          total: response.data.data?.length || 0,
          pages: 1
        }));
      }
    } catch (error) {
      console.error('Error fetching samples:', error);
      toast.error('Failed to load samples');
    } finally {
      setSampleLoading(false);
    }
  };

  const fetchLabUsers = async () => {
    try {
      const data = await usersAPI.getLabUsers();
      const usersList = data?.data?.users || data?.users || [];
      setLabUsers(usersList);
    } catch (err) {
      console.error("Failed to load lab users", err);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchRegistration();
    }
  }, [projectId]);

  useEffect(() => {
    if ((activeTab === "samples" || activeTab === "observation" || activeTab === "report") && projectId) {
      fetchSamples();
    }
  }, [activeTab, projectId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setShowActionDropdown(false);
      }
    };

    const handleResize = () => {
      if (showActionDropdown) {
        updateDropdownPosition();
      }
    };

    const handleScroll = () => {
      if (showActionDropdown) {
        updateDropdownPosition();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [showActionDropdown]);

  const updateDropdownPosition = () => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedDropdownHeight = 120;

    if (spaceBelow < estimatedDropdownHeight && rect.top > estimatedDropdownHeight) {
      setDropdownPosition("top");
    } else {
      setDropdownPosition("bottom");
    }
  };

  const handleDropdownToggle = () => {
    if (!showActionDropdown) {
      updateDropdownPosition();
    }
    setShowActionDropdown((prev) => !prev);
  };

  const closeSampleActionMenu = () => {
    setActiveSampleActionId(null);
    setActiveSampleActionAnchorEl(null);
  };

  const handleSampleActionToggle = (sampleId, event) => {
    event.stopPropagation();
    if (activeSampleActionId === sampleId) {
      closeSampleActionMenu();
      return;
    }
    setActiveSampleActionId(sampleId);
    setActiveSampleActionAnchorEl(event.currentTarget);
  };

  const getSampleActions = (sample) => [
    {
      label: "View",
      icon: <VisibilityIcon fontSize="small" />,
      onClick: () => openSampleDrawer("view", sample),
    },
    {
      label: "Edit",
      icon: <EditIcon fontSize="small" />,
      onClick: () => openSampleDrawer("edit", sample),
    },
    {
      label: "Delete",
      icon: <DeleteIcon fontSize="small" />,
      danger: true,
      onClick: () => handleDeleteSample(sample.sample_entry_id),
    },
  ];

  const getSampleStatusStyles = (status) => {
    const normalized = String(status || "").toLowerCase();
    if (normalized.includes("approved") || normalized.includes("completed")) {
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    }
    if (normalized.includes("testing") || normalized.includes("assigned")) {
      return "bg-blue-100 text-blue-700 border-blue-200";
    }
    if (normalized.includes("reject")) {
      return "bg-red-100 text-red-700 border-red-200";
    }
    if (normalized.includes("report") || normalized.includes("dispatch")) {
      return "bg-violet-100 text-violet-700 border-violet-200";
    }
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  };

  const getPriorityStyles = (priority) => {
    const normalized = String(priority || "").toLowerCase();
    if (normalized.includes("high")) return "bg-red-100 text-red-700 border-red-200";
    if (normalized.includes("urgent")) return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  };

  const registrationCode = registration?.registration_no || registration?.job_no || "";

  const openRegistrationDialog = () => {
    const code = registration?.registration_no || registration?.job_no || "";
    setJobForm({
      registration_no: code,
      job_no: code,
    });
    setShowJobDialog(true);
  };

  const handleSaveRegistration = async () => {
    const code = (jobForm.registration_no || jobForm.job_no || "").trim();
    const payload = {
      project_id: projectId,
      registration_no: code,
      job_no: code,
    };

    if (!code) {
      toast.error("Registration No / Job No is required");
      return;
    }

    try {
      setRegistrationSaving(true);
      const response = registration?.id
        ? await updateProjectRegistration(projectId, payload)
        : await createProjectRegistration(payload);

      setRegistration(response.data?.data || null);
      toast.success(response.data?.message || "Registration saved successfully");
      setShowJobDialog(false);
      fetchProject();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save registration");
    } finally {
      setRegistrationSaving(false);
    }
  };

  const openSampleDrawer = async (mode, sample = null) => {
    try {
      setDrawerMode(mode);
      setDrawerProject(project);
      setDrawerSampleEntry(null);

      if (mode === "add") {
        return;
      }

      const response = await getSampleEntryById(sample.sample_entry_id);
      setDrawerSampleEntry(response.data?.data || sample);
    } catch (error) {
      console.error("Failed to load sample details:", error);
      setDrawerSampleEntry(sample);
      toast.error("Sample details API failed. Opening available sample data.");
    }
  };

  const closeSampleDrawer = () => {
    setDrawerProject(null);
    setDrawerMode("add");
    setDrawerSampleEntry(null);
  };

  const closeAssignDrawer = () => {
    setDrawerMode("add");
    // setDrawerAssignmentSampleEntry(null);
  };

  // Sample handlers
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch {
      return 'Invalid Date';
    }
  };

  const handleDeleteSample = async (sampleId) => {
    if (!window.confirm('Are you sure you want to delete this sample entry?')) {
      return;
    }

    try {
      const response = await deleteSampleEntry(sampleId);

      if (response.data.success) {
        toast.success('Sample entry deleted successfully');
        fetchSamples(); // Refresh the list
      } else {
        toast.error(response.data.message || 'Failed to delete sample entry');
      }
    } catch (error) {
      console.error('Error deleting sample entry:', error);
      toast.error(error.response?.data?.message || 'Failed to delete sample entry');
    }
  };

  // Document handlers
  const handleDownloadDocument = async (doc) => {
    try {
      const response = await downloadProjectDocument(projectId, doc.doc_id);

      // Create blob from response
      const blob = new Blob([response.data], { type: doc.mime_type || 'application/octet-stream' });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Failed to download document');
    }
  };

  const handleViewDocument = async (doc) => {
    try {
      // For PDFs and images, open in new tab
      if (doc.mime_type?.includes('pdf') || doc.mime_type?.includes('image')) {
        const response = await downloadProjectDocument(projectId, doc.doc_id);
        const blob = new Blob([response.data], { type: doc.mime_type });
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        window.URL.revokeObjectURL(url);
      } else {
        // For other files, just download them
        handleDownloadDocument(doc);
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      alert('Failed to view document');
    }
  };

  const handleDeleteDocument = async (doc) => {
    if (window.confirm(`Are you sure you want to delete "${doc.file_name}"?`)) {
      try {
        await deleteProjectDocument(projectId, doc.doc_id);
        // Refresh project data to update documents list
        await fetchProject();
      } catch (error) {
        console.error('Error deleting document:', error);
        alert('Failed to delete document');
      }
    }
  };

  // Test Assignment helper functions
  const getAssignmentStatusStyles = (status) => {
    const normalized = String(status || "").toLowerCase();
    if (normalized.includes("approved") || normalized.includes("completed")) {
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    }
    if (normalized.includes("progress") || normalized.includes("testing")) {
      return "bg-blue-100 text-blue-700 border-blue-200";
    }
    if (normalized.includes("review")) {
      return "bg-violet-100 text-violet-700 border-violet-200";
    }
    if (normalized.includes("result")) {
      return "bg-amber-100 text-amber-700 border-amber-200";
    }
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  const fetchSampleAssignments = async (sampleId) => {
    try {
      setAssignmentsLoading(true);
      const res = await getAssignmentsBySample(sampleId);
      if (res.data.success) {
        const data = res.data.data || [];
        setSampleAssignments(prev => ({
          ...prev,
          [sampleId]: {
            data: data,
            total: data.length,
            completed: data.filter(a => a.status === 'Approved' || a.status === 'Completed').length,
            pending: data.filter(a => a.status === 'Assigned' || a.status === 'In Progress').length
          }
        }));
      }
    } catch (err) {
      console.error("Failed to load sample assignments:", err);
      toast.error("Failed to load test assignments");
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const openAssignTestModal = (sample) => {
    setAssignmentForm({
      sample_id: sample.sample_id,
      scope_test_ids: [],
      assigned_to: "",
      target_date: "",
      priority: "Normal",
      remarks: ""
    });
    setShowAssignTestModal(true);
    fetchAvailableTests(sample.sample_id);
  };

  const fetchAvailableTests = async (sampleId) => {
    try {
      setAvailableTestsLoading(true);
      const res = await getAvailableTests(sampleId);
      if (res.data.success) {
        setAvailableTests(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load available tests:", err);
      toast.error("Failed to load available tests");
    } finally {
      setAvailableTestsLoading(false);
    }
  };

  const handleSaveAssignment = async () => {
    if (!assignmentForm.sample_id || assignmentForm.scope_test_ids.length === 0) {
      toast.error("Please select at least one test");
      return;
    }

    try {
      setSavingAssignment(true);
      const payload = {
        sample_id: assignmentForm.sample_id,
        scope_test_ids: assignmentForm.scope_test_ids,
        assigned_to: assignmentForm.assigned_to || null,
        target_date: assignmentForm.target_date || null,
        priority: assignmentForm.priority,
        remarks: assignmentForm.remarks
      };

      const res = await createTestAssignment(payload);
      if (res.data.success) {
        toast.success("Test(s) assigned successfully");
        setShowAssignTestModal(false);
        // Refresh assignments
        if (assignmentForm.sample_id) {
          fetchSampleAssignments(assignmentForm.sample_id);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign tests");
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm("Are you sure you want to delete this assignment?")) {
      return;
    }

    try {
      const res = await deleteTestAssignment(assignmentId);
      if (res.data.success) {
        toast.success("Assignment deleted successfully");
        // Refresh assignments
        if (expandedSampleId) {
          const sample = samples.find(s => s.sample_entry_id === expandedSampleId);
          if (sample) {
            fetchSampleAssignments(sample.sample_id);
          }
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete assignment");
    }
  };

  // New Test Assignment Flow Handlers
  const handleProjectChangeForAssignment = (value) => {
    setSelectedProjectForAssignment(value);
    setSelectedSampleNoForAssignment("");
    setSelectedMaterialForAssignment("");
    setSelectedSampleDescription("");
    setSelectedSampleDate("");
    setFilteredSamplesForAssignment([]);
    setUniqueMaterials([]);
    setAvailableTestsForAssignment([]);
    setSelectedTestsForAssignment([]);
  };

  const handleSampleNoChangeForAssignment = (value) => {
    setSelectedSampleNoForAssignment(value);
    setSelectedTestsForAssignment([]);
    const selectedSample = samples.find(s => String(s.sample_id) === String(value));
    if (selectedSample) {
      setSelectedMaterialForAssignment(selectedSample.material_name || "");
      setSelectedSampleDescription(selectedSample.sample_description || selectedSample.material_name || "");
      setSelectedSampleDate(selectedSample.received_date ? selectedSample.received_date.split('T')[0] : "");
      const cachedTests = assignmentTestsBySample[selectedSample.sample_id];
      if (cachedTests) {
        setAvailableTestsForAssignment(cachedTests);
      } else {
        fetchAvailableTestsForAssignment(selectedSample.sample_id);
      }
    } else {
      setSelectedMaterialForAssignment("");
      setSelectedSampleDescription("");
      setSelectedSampleDate("");
      setAvailableTestsForAssignment([]);
      setSelectedTestsForAssignment([]);
    }
  };

  const handleMaterialChangeForAssignment = (value) => {
    setSelectedMaterialForAssignment(value);
    // Filter samples by material
    const filtered = samples.filter(s => s.material_name === value);
    setFilteredSamplesForAssignment(filtered);
  };

  const fetchAvailableTestsForAssignment = async (sampleId) => {
    try {
      setAvailableTestsLoading(true);
      const res = await getAvailableTests(sampleId);
      if (res.data.success) {
        const tests = res.data.data || [];
        setAssignmentTestsBySample((prev) => ({
          ...prev,
          [sampleId]: tests
        }));
        setAvailableTestsForAssignment(tests);
      }
    } catch (err) {
      console.error("Failed to load available tests:", err);
      toast.error("Failed to load available tests");
    } finally {
      setAvailableTestsLoading(false);
    }
  };

  const handleTestSelection = (testId, checked) => {
    if (checked) {
      setSelectedTestsForAssignment([...selectedTestsForAssignment, testId]);
    } else {
      setSelectedTestsForAssignment(selectedTestsForAssignment.filter(id => id !== testId));
    }
  };

  const handleSaveAssignmentFromPanel = async () => {
    if (!selectedSampleNoForAssignment || selectedTestsForAssignment.length === 0) {
      toast.error("Please select a sample and at least one test");
      return;
    }

    if (!assignmentForm.assigned_to || !assignmentForm.target_date) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setSavingAssignment(true);
      const payload = {
        sample_id: Number(selectedSampleNoForAssignment),
        scope_test_ids: selectedTestsForAssignment,
        assigned_to: assignmentForm.assigned_to || null,
        target_date: assignmentForm.target_date || null,
        priority: assignmentForm.priority,
        remarks: assignmentForm.remarks
      };

      const res = await createTestAssignment(payload);
      if (res.data.success) {
        const createdCount = res.data.data?.created_count || selectedTestsForAssignment.length;
        toast.success(`${createdCount} test(s) assigned successfully`);
        // Reset form
        setSelectedSampleNoForAssignment("");
        setSelectedMaterialForAssignment("");
        setSelectedSampleDescription("");
        setSelectedSampleDate("");
        setAvailableTestsForAssignment([]);
        setAssignmentTestsBySample({});
        setSelectedTestsForAssignment([]);
        setAssignmentForm({
          sample_id: null,
          scope_test_ids: [],
          assigned_to: "",
          target_date: "",
          priority: "Normal",
          remarks: ""
        });
        // Refresh assignments list
        await fetchAssignmentsList();
        await fetchAssignmentSummary();
        setShowAssignTestDrawer(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign tests");
    } finally {
      setSavingAssignment(false);
    }
  };

  const fetchAssignmentsList = async () => {
    try {
      setAssignmentsLoading(true);
      const res = await getAssignmentsByProject(projectId);
      if (res.data.success) {
        setAssignments(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load assignments:", err);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const fetchAssignmentSummary = async () => {
    try {
      const res = await getAssignmentDashboardSummary(projectId);
      if (res.data.success) {
        setAssignmentSummary(res.data.data || {
          total_samples: 0,
          total_assignments: 0,
          completed: 0,
          in_progress: 0,
          pending: 0
        });
      }
    } catch (err) {
      console.error("Failed to load assignment summary:", err);
    }
  };

  const closeAssignTestDrawerPanel = () => {
    setShowAssignTestDrawer(false);
    setSelectedSampleNoForAssignment("");
    setSelectedMaterialForAssignment("");
    setSelectedSampleDescription("");
    setSelectedSampleDate("");
    setAvailableTestsForAssignment([]);
    setSelectedTestsForAssignment([]);
    setAssignmentForm({
      sample_id: null,
      scope_test_ids: [],
      assigned_to: "",
      target_date: "",
      priority: "Normal",
      remarks: ""
    });
  };

  const preloadAssignmentTestsForDrawer = async () => {
    if (!showAssignTestDrawer || samples.length === 0) return;

    const samplesToLoad = samples.filter((sample) => sample.sample_id && !assignmentTestsBySample[sample.sample_id]);
    if (samplesToLoad.length === 0) return;

    try {
      setAvailableTestsLoading(true);
      const loadedEntries = await Promise.all(
        samplesToLoad.map(async (sample) => {
          const res = await getAvailableTests(sample.sample_id);
          return [sample.sample_id, res.data.success ? (res.data.data || []) : []];
        })
      );

      setAssignmentTestsBySample((prev) => ({
        ...prev,
        ...Object.fromEntries(loadedEntries)
      }));
    } catch (err) {
      console.error("Failed to preload available tests:", err);
      toast.error("Failed to load project scope tests");
    } finally {
      setAvailableTestsLoading(false);
    }
  };

  // Load samples data for assignment tab
  useEffect(() => {
    if (activeTab === "testAssignment" && projectId) {
      fetchSamples();
      fetchLabUsers();
      fetchAssignmentsList();
      fetchAssignmentSummary();
    }
  }, [activeTab, projectId]);

  useEffect(() => {
    preloadAssignmentTestsForDrawer();
  }, [showAssignTestDrawer, samples]);

  const selectedAssignmentSample = samples.find(
    (sample) => String(sample.sample_id) === String(selectedSampleNoForAssignment)
  );
  const assignmentMaterialOptions = [
    ...new Set(assignments.map((item) => item.material_name).filter(Boolean))
  ];
  const assignmentTestOptions = [
    ...new Set(assignments.map((item) => item.test_name).filter(Boolean))
  ];
  const filteredAssignments = assignments.filter((item) => {
    const matchesMaterial = !materialFilter || item.material_name === materialFilter;
    const matchesTest = !testFilter || item.test_name === testFilter;
    const matchesStatus = !statusFilter || item.status === statusFilter;
    const matchesTechnician = !technicianFilter || String(item.assigned_to || "") === String(technicianFilter);
    const haystack = [
      item.assignment_code,
      item.sample_no,
      item.material_name,
      item.test_name,
      item.assigned_to_name,
      item.status
    ].filter(Boolean).join(" ").toLowerCase();
    const matchesSearch = !searchTerm || haystack.includes(searchTerm.toLowerCase());

    return matchesMaterial && matchesTest && matchesStatus && matchesTechnician && matchesSearch;
  });

  if (loading) {
    return (
      <MainLayout
        headerTitle="Project View"
        headerSubtitle="Loading project data..."
      >
        <div className="p-6">
          <div className="text-center">Loading project data...</div>
        </div>
      </MainLayout>
    );
  }

  if (errorMessage) {
    return (
      <MainLayout headerTitle="Project View" headerSubtitle="Error loading data">
        <div className="p-6 text-red-500">{errorMessage}</div>
      </MainLayout>
    );
  }

  if (!project) {
    return (
      <MainLayout headerTitle="Project View" headerSubtitle="No data found">
        <div className="p-6">No project found</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      headerTitle="Project View"
      headerSubtitle={`Viewing ${project?.project_name || "Project"}`}
    >
      {showJobDialog && (
        <div className="fixed inset-0 z-[99999] bg-black/50 flex items-center justify-center p-4">

          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                Registration Details
              </h2>

              <button
                onClick={() => setShowJobDialog(false)}
                className="text-gray-500 hover:text-red-500 text-xl"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <div className="p-6">

              <div className="grid grid-cols-1 gap-4">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Registration No. / Job No.
                  </label>

                  <input
                    type="text"
                    value={jobForm.registration_no}
                    onChange={(e) => {
                      const value = e.target.value;
                      setJobForm({ registration_no: value, job_no: value });
                    }}
                    placeholder="Enter Registration No. / Job No."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t">

              <button
                onClick={() => setShowJobDialog(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={handleSaveRegistration}
                disabled={registrationSaving}
                className="px-4 py-2 bg-[#2d66b3] hover:bg-[#1f5498] text-white rounded-lg disabled:opacity-60"
              >
                {registrationSaving ? "Saving..." : "Save"}
              </button>

            </div>

          </div>

        </div>
      )}
      <div className="p-4 sm:p-6">
        {/* Back Button */}
        <button
          onClick={() => navigate("/projects")}
          className="mb-4 flex items-center gap-2 text-[#2d66b3] font-medium hover:text-[#1f5498] transition-colors"
        >
          <ArrowBackIcon fontSize="small" />
          Back
        </button>

        <div className="w-full">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-visible">
            {/* Header Section */}
            <div className="p-4 sm:p-6 lg:p-8 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
                    {project.project_name}
                  </h1>
                  <p className="text-gray-600 mt-1 text-sm sm:text-base break-words">
                    Project Code: {project.project_code}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 relative">
                  <span className="px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-medium bg-blue-100 text-blue-700 whitespace-nowrap">
                    {formatStatusForDisplay(project.status)}
                  </span>

                  {/* Action Dropdown */}
                  <div className="relative shrink-0">
                    <button
                      ref={buttonRef}
                      onClick={handleDropdownToggle}
                      className="flex items-center justify-center p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                      title="Actions"
                    >
                      <MoreVertIcon className="w-5 h-5 text-gray-600" />
                    </button>

                    {showActionDropdown && (
                      <div
                        ref={dropdownRef}
                        className={`
                          absolute right-0 z-[9999]
                          w-44 sm:w-48
                          bg-white rounded-lg shadow-xl border border-gray-200
                          overflow-hidden
                          ${dropdownPosition === "top" ? "bottom-full mb-2" : "top-full mt-2"}
                          
                          max-[480px]:right-0
                          max-[480px]:w-40
                        `}
                      >
                        <div className="py-1">
                          <button
                            onClick={() => {
                              navigate(`/projects/preview/${projectId}`);
                              setShowActionDropdown(false);
                            }}
                            className="flex items-center gap-2 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
                          >
                            <VisibilityIcon className="w-4 h-4 shrink-0" />
                            <span>Preview</span>
                          </button>

                          <button
                            onClick={() => {
                              navigate(`/projects/edit/${projectId}`);
                              setShowActionDropdown(false);
                            }}
                            className="flex items-center gap-2 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
                          >
                            <EditIcon className="w-4 h-4 shrink-0" />
                            <span>Edit Project</span>
                          </button>

                          <button
                            onClick={() => {
                              navigate(`/samples?project_id=${projectId}`);
                              setShowActionDropdown(false);
                            }}
                            className="flex items-center gap-2 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
                          >
                            <BiotechIcon className="w-4 h-4 shrink-0" />
                            <span>View Samples</span>
                          </button>

                          <button
                            onClick={() => {
                              openSampleDrawer("add");
                              setShowActionDropdown(false);
                            }}
                            className="flex items-center gap-2 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
                          >
                            <ScienceIcon className="w-4 h-4 shrink-0" />
                            <span>Add Sample</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-4 sm:p-6 lg:p-8">
              {/* Tabs */}
              <div className="mb-6">
                <div className="border-b border-gray-200 flex items-center justify-between">

                  <nav className="flex space-x-1 overflow-x-auto">

                    <button
                      onClick={() => setActiveTab("project")}
                      className={`px-5 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${activeTab === "project"
                          ? "border-[#2d66b3] text-[#2d66b3]"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                      Project Details
                    </button>

                    <button
                      onClick={() => setActiveTab("samples")}
                      className={`px-5 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${activeTab === "samples"
                          ? "border-[#2d66b3] text-[#2d66b3]"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                      Sample Details
                    </button>

                    <button
                      onClick={() => setActiveTab("testAssignment")}
                      className={`px-5 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${activeTab === "testAssignment"
                          ? "border-[#2d66b3] text-[#2d66b3]"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                      Test Assignment
                    </button>

                    <button
                      onClick={() => setActiveTab("observation")}
                      className={`px-5 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${activeTab === "observation"
                          ? "border-[#2d66b3] text-[#2d66b3]"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                      Observation
                    </button>

                    <button
                      onClick={() => setActiveTab("report")}
                      className={`px-5 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${activeTab === "report"
                          ? "border-[#2d66b3] text-[#2d66b3]"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                      Report
                    </button>

                  </nav>

                  <div className="pr-4">
                    {registrationCode ? (
                      <button
                        onClick={openRegistrationDialog}
                        className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-[#2d66b3] rounded-lg text-sm font-semibold border border-blue-200 shadow-sm"
                        title="Edit Registration / Job No"
                      >
                        {registrationCode}
                      </button>
                    ) : (
                      <button
                        onClick={openRegistrationDialog}
                        disabled={registrationLoading}
                        className="px-4 py-2 bg-[#2d66b3] hover:bg-[#1f5498] text-white rounded-lg text-sm font-medium shadow-sm disabled:opacity-60"
                      >
                        {registrationLoading ? "Loading..." : "Registration No / Job No"}
                      </button>
                    )}
                  </div>

                </div>
              </div>
              {activeTab === "project" && (
                <>
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
                    {/* Left Column */}
                    <div className="xl:col-span-2 space-y-4 lg:space-y-6">
                      <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                        <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                          <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                          Basic Information
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-500">
                              Client
                            </label>
                            <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                              <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                                {project.client_name || "-"}
                              </p>
                            </div>
                          </div>

                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-500">
                              Project Code
                            </label>
                            <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                              <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                                {project.project_code || "-"}
                              </p>
                            </div>
                          </div>

                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-500">
                              Project Name
                            </label>
                            <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg">
                              <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                                {project.project_name || "-"}
                              </p>
                            </div>
                          </div>

                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-500">
                              Location Name
                            </label>
                            <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg">
                              <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                                {project.location_name || "-"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 sm:mt-4">
                          <label className="block mb-2 text-sm font-medium text-gray-500">
                            Name of work & other Details
                          </label>
                          <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg min-h-[100px] sm:min-h-[120px]">
                            <p className="text-sm sm:text-base font-medium text-gray-900 break-words whitespace-pre-wrap">
                              {project.name_of_work_and_other_details || "-"}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">NABL Scope</label>
                            <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                              <p className="text-sm sm:text-base font-medium text-gray-900">
                                {project.nabl_scope ? "Yes" : "No"}
                              </p>
                            </div>
                          </div>
                          <div>
                            {/* Empty div for grid layout */}
                          </div>
                        </div>
                      </div>

                      {/* Address Section */}
                      <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                        <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                          <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                          Address Information
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div className="sm:col-span-2">
                            <label className="block mb-2 text-sm font-medium text-gray-500">
                              Address
                            </label>
                            <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg min-h-[80px] sm:min-h-[100px]">
                              <p className="text-sm sm:text-base font-medium text-gray-900 break-words whitespace-pre-wrap">
                                {project.address || "-"}
                              </p>
                            </div>
                          </div>

                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-500">
                              City
                            </label>
                            <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                              <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                                {project.city || "-"}
                              </p>
                            </div>
                          </div>

                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-500">
                              State
                            </label>
                            <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                              <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                                {project.state || "-"}
                              </p>
                            </div>
                          </div>

                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-500">
                              Pincode
                            </label>
                            <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                              <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                                {project.pincode || "-"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Scope Section */}
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 sm:p-6 border border-blue-100">
                        <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                          Testing Scope
                        </h2>

                        {project.scopes && project.scopes.length > 0 ? (
                          <div className="space-y-3">
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <div className="flex items-center justify-between mb-3 gap-2">
                                <h3 className="font-medium text-gray-800">
                                  Selected Tests ({project.scopes.length})
                                </h3>
                                <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium whitespace-nowrap">
                                  {project.scopes.length} Test
                                  {project.scopes.length !== 1 ? "s" : ""}
                                </div>
                              </div>

                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {project.scopes.map((scope, index) => (
                                  <div
                                    key={scope.project_scope_test_id || index}
                                    className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="flex flex-wrap items-center gap-2 text-sm">
                                        <span className="font-semibold text-blue-800 break-words">
                                          {scope.group_name || scope.group?.group_name}
                                        </span>
                                        <span className="text-blue-600">›</span>
                                        <span className="font-medium text-blue-700 break-words">
                                          {scope.material_name ||
                                            scope.material?.material_name}
                                        </span>
                                        <span className="text-blue-600">›</span>
                                        <span className="text-blue-700 break-words">
                                          {scope.test_name || scope.test?.test_name}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                                        {scope.test_method && (
                                          <span className="break-words">
                                            Method: {scope.test_method}
                                          </span>
                                        )}
                                      </div>
                                      {scope.remarks && (
                                        <div className="text-xs text-gray-500 mt-1 break-words">
                                          Remarks: {scope.remarks}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <div className="text-gray-400 mb-2">
                              <ScienceIcon className="w-8 h-8 mx-auto" />
                            </div>
                            <p className="text-gray-500 font-medium">
                              No testing scope selected
                            </p>
                            <p className="text-sm text-gray-400 mt-1">
                              Edit project to add testing scope
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4 lg:space-y-6">
                      {/* Client Information */}
                      <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                        <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                          <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                          Client Information
                        </h2>

                        <div className="space-y-3 sm:space-y-4">
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-500">
                              Client Representative Name
                            </label>
                            <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                              <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                                {project.client_representative_name || "-"}
                              </p>
                            </div>
                          </div>

                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-500">
                              Dispatch Mode
                            </label>
                            <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                              <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                                {project.dispatch_mode || "-"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Assignment Information */}
                      <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                        <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                          <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                          Assignment Information
                        </h2>

                        <div className="space-y-3 sm:space-y-4">
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-500">
                              Request Collected By
                            </label>
                            <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                              <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                                {project.request_collected_by_name || project.request_collected_by || "-"}
                              </p>
                            </div>
                          </div>

                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-500">
                              Test Assigned To
                            </label>
                            <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                              <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                                {project.test_assigned_to_name || project.test_assigned_to || "-"}
                              </p>
                            </div>
                          </div>

                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-500">
                              Reviewed By
                            </label>
                            <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                              <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                                {project.reviewed_by_name || project.reviewed_by || "-"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Project Status */}
                      <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                        <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                          <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                          Project Status
                        </h2>

                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-500">
                            Status
                          </label>
                          <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                            <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                              {formatStatusForDisplay(project.status)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Project Metrics */}
                      <div className="bg-gradient-to-br from-50 to-emerald-50 rounded-lg p-4 sm:p-6 border border-green-100">
                        <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                          <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                          Project Metrics
                        </h2>

                        <div className="space-y-3 sm:space-y-4">
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-500">
                              Total Reports
                            </label>
                            <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                              <p className="text-sm sm:text-base font-medium text-gray-900">
                                {project.total_reports || 0}
                              </p>
                            </div>
                          </div>

                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-500">
                              Total Samples
                            </label>
                            <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-lg">
                              <div className="flex items-center justify-between">
                                <p className="text-sm sm:text-base font-medium text-gray-900">
                                  {project.total_samples || 0}
                                </p>
                                <button
                                  onClick={() => navigate(`/samples?project_id=${projectId}`)}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                                >
                                  View Samples
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Project Documents */}
                      <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                        <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                          <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                          Project Documents
                        </h2>

                        {project.documents && project.documents.length > 0 ? (
                          <div className="space-y-2">
                            {project.documents.map((doc, index) => (
                              <div
                                key={index}
                                className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-md transition-shadow"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                                      <DescriptionIcon className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-medium text-gray-900 truncate text-sm">
                                        {doc.file_name}
                                      </p>
                                      <p className="text-xs text-gray-500 truncate">
                                        {doc.file_size &&
                                          `${(doc.file_size / 1024).toFixed(1)} KB`}
                                        {doc.mime_type && ` • ${doc.mime_type}`}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => handleViewDocument(doc)}
                                      className="text-green-600 hover:bg-green-50 p-1.5 rounded transition-colors"
                                      title="View in new tab"
                                    >
                                      <VisibilityIcon className="w-3.5 h-3.5" />
                                    </button>

                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 sm:py-8">
                            <div className="text-gray-400 mb-2">
                              <DescriptionIcon className="w-6 h-6 sm:w-8 sm:h-8 mx-auto" />
                            </div>
                            <p className="text-gray-500 font-medium text-sm sm:text-base">
                              No documents uploaded
                            </p>
                            <p className="text-xs sm:text-sm text-gray-400 mt-1">
                              Edit project to add documents
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
              {activeTab === "samples" && (
                <div className="space-y-6">

                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                          Sample Details
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                          Sample entries associated with this project
                        </p>
                      </div>

                      <button
                        onClick={() => openSampleDrawer("add")}
                        className="
                        px-4 py-2
                        bg-[#2d66b3]
                        hover:bg-[#1f5498]
                        text-white
                        rounded-lg
                        text-sm
                        font-medium
                        transition-colors
                      "
                      >
                        + Add Sample
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            {/* <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                              Sr No
                            </th> */}

                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                              Sample No
                            </th>

                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                              Letter Date
                            </th>

                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                              Material
                            </th>

                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                              Quantity
                            </th>

                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                              Received Date
                            </th>

                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                              Sample Condition
                            </th>

                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                              Priority
                            </th>

                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                              Received By
                            </th>

                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                              Status
                            </th>

                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                              Action
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {sampleLoading ? (
                            <tr>
                              <td colSpan="10" className="px-6 py-12 text-center text-gray-500">
                                Loading samples...
                              </td>
                            </tr>
                          ) : samples.length === 0 ? (
                            <tr>
                              <td colSpan="10" className="px-6 py-12 text-center text-gray-500">
                                No Samples Found
                              </td>
                            </tr>
                          ) : (
                            samples.map((sample, index) => (
                              <tr key={sample.sample_entry_id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                {/* <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td> */}
                                <td className="px-4 py-3 text-sm text-gray-900 font-medium">{sample.sample_no || 'N/A'}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{formatDate(sample.letter_date)}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{sample.material_name || 'N/A'}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{sample.quantity || 0}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{formatDate(sample.received_date)}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{sample.received_condition || 'N/A'}</td>
                                <td className="px-4 py-3 text-sm">
                                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getPriorityStyles(sample.sample_priority)}`}>
                                    {sample.sample_priority || 'Normal'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">{sample.received_by || 'N/A'}</td>
                                <td className="px-4 py-3 text-sm">
                                  {/* <div className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getSampleStatusStyles(sample.status)}`}> */}
                                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getSampleStatusStyles(sample.status)}`}>
                                      {sample.status || 'N/A'}
                                    </span>
                                  {/* </div> */}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    type="button"
                                    ref={(el) => {
                                      sampleActionButtonRefs.current[sample.sample_entry_id] = el;
                                    }}
                                    onClick={(event) => handleSampleActionToggle(sample.sample_entry_id, event)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                                    title="Actions"
                                    aria-label="Sample actions"
                                  >
                                    <MoreVertIcon fontSize="small" />
                                  </button>
                                  <SampleActionMenu
                                    anchorEl={activeSampleActionId === sample.sample_entry_id ? activeSampleActionAnchorEl : null}
                                    open={activeSampleActionId === sample.sample_entry_id}
                                    onClose={closeSampleActionMenu}
                                    actions={getSampleActions(sample)}
                                  />
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ========================= TEST ASSIGNMENT TAB ========================= */}
                  {activeTab === "testAssignment" && (
                    <div className="space-y-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-800">Test Assignment</h2>
                          <p className="text-sm text-gray-500 mt-1">
                            Assign project scope tests to samples and track assigned work.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAssignTestDrawer(true)}
                          className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-sm"
                        >
                          Assign Test
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                          <div className="text-sm text-gray-500">Total Samples</div>
                          <div className="text-3xl font-bold text-gray-800 mt-2">{samples.length || assignmentSummary?.total_samples || 0}</div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                          <div className="text-sm text-gray-500">Assigned Tests</div>
                          <div className="text-3xl font-bold text-blue-600 mt-2">{assignmentSummary?.total_assignments || assignments.length || 0}</div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                          <div className="text-sm text-gray-500">Pending Tests</div>
                          <div className="text-3xl font-bold text-yellow-600 mt-2">{assignmentSummary?.pending || 0}</div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                          <div className="text-sm text-gray-500">In Progress</div>
                          <div className="text-3xl font-bold text-indigo-600 mt-2">{assignmentSummary?.in_progress || 0}</div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                          <div className="text-sm text-gray-500">Approved</div>
                          <div className="text-3xl font-bold text-green-600 mt-2">{assignmentSummary?.completed || 0}</div>
                        </div>
                      </div>

                      {showAssignTestDrawer && (
                        <div
                          className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-[1000]"
                          onClick={closeAssignTestDrawerPanel}
                        />
                      )}

                      <aside className={`${showAssignTestDrawer ? "fixed top-0 right-0 h-full w-full md:max-w-[700px] lg:max-w-[560px] z-[1001] flex flex-col bg-gradient-to-br from-[#f8fbff] via-white to-[#eef5fd] shadow-2xl transform transition-transform duration-300 ease-out translate-x-0" : "hidden"}`}>
                        <div className="sticky top-0 z-20 border-b border-white/70 bg-white/80 backdrop-blur-xl px-5 sm:px-6 py-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Assign Test</h2>
                              <p className="text-sm text-gray-500 mt-1">Select a sample, scope tests, and user assignment details.</p>
                            </div>
                          <button
                            type="button"
                            onClick={closeAssignTestDrawerPanel}
                            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                            aria-label="Close assign test drawer"
                          >
                            <CloseIcon />
                          </button>
                        </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-6">
                          <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
                            <h3 className="font-semibold text-gray-900">Sample Details</h3>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1.5">Sample *</label>
                              <select
                                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#2b63ae] bg-white/90 text-sm"
                                value={selectedSampleNoForAssignment}
                                onChange={(e) => handleSampleNoChangeForAssignment(e.target.value)}
                              >
                                <option value="">Select sample</option>
                                {samples.map((sample) => (
                                  <option key={sample.sample_id} value={sample.sample_id}>
                                    {sample.sample_no || `Sample ${sample.sample_id}`}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Material</label>
                                <input
                                  readOnly
                                  value={selectedAssignmentSample?.material_name || selectedMaterialForAssignment || ""}
                                  className="w-full rounded-xl border border-gray-200 bg-gray-50/90 px-3 py-2.5 text-sm text-gray-800 font-medium"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Quantity</label>
                                <input
                                  readOnly
                                  value={selectedAssignmentSample?.quantity || ""}
                                  className="w-full rounded-xl border border-gray-200 bg-gray-50/90 px-3 py-2.5 text-sm text-gray-800 font-medium"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1.5">Received Date</label>
                              <input
                                readOnly
                                value={selectedSampleDate ? formatDate(selectedSampleDate) : ""}
                                className="w-full rounded-xl border border-gray-200 bg-gray-50/90 px-3 py-2.5 text-sm text-gray-800 font-medium"
                              />
                            </div>
                          </section>

                          <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                              <h4 className="font-semibold text-gray-800 text-sm">Project Scope Tests</h4>
                            </div>
                            <div className="max-h-72 overflow-y-auto p-3 space-y-2">
                              {availableTestsLoading ? (
                                <div className="text-sm text-gray-500 py-8 text-center">Loading project scope tests...</div>
                              ) : !selectedSampleNoForAssignment ? (
                                <div className="text-sm text-gray-500 py-8 text-center">Scope tests are ready. Select a sample to assign tests.</div>
                              ) : availableTestsForAssignment.length === 0 ? (
                                <div className="text-sm text-gray-500 py-8 text-center">No pending scope tests for this sample</div>
                              ) : (
                                availableTestsForAssignment.map((test) => (
                                  <label
                                    key={test.project_scope_test_id}
                                    className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      checked={selectedTestsForAssignment.includes(test.project_scope_test_id)}
                                      onChange={(e) => handleTestSelection(test.project_scope_test_id, e.target.checked)}
                                    />
                                    <span className="min-w-0">
                                      <span className="block text-sm font-semibold text-gray-900">{test.test_name || "Unnamed Test"}</span>
                                      <span className="block text-xs text-gray-500">
                                        {[test.group_name, test.test_method].filter(Boolean).join(" | ") || "No method"}
                                      </span>
                                    </span>
                                  </label>
                                ))
                              )}
                            </div>
                          </section>

                          <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
                            <h3 className="font-semibold text-gray-900">Assignment Details</h3>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1.5">Assign To *</label>
                              <select
                                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#2b63ae] bg-white/90 text-sm"
                                value={assignmentForm.assigned_to}
                                onChange={(e) => setAssignmentForm((prev) => ({ ...prev, assigned_to: e.target.value }))}
                              >
                                <option value="">Select user</option>
                                {labUsers.map((user) => (
                                  <option key={user.user_id} value={user.user_id}>
                                    {user.full_name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Target Date *</label>
                                <input
                                  type="date"
                                  value={assignmentForm.target_date}
                                  onChange={(e) => setAssignmentForm((prev) => ({ ...prev, target_date: e.target.value }))}
                                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#2b63ae] bg-white/90 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Priority</label>
                                <select
                                  value={assignmentForm.priority}
                                  onChange={(e) => setAssignmentForm((prev) => ({ ...prev, priority: e.target.value }))}
                                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#2b63ae] bg-white/90 text-sm"
                                >
                                  <option value="Normal">Normal</option>
                                  <option value="High">High</option>
                                  <option value="Urgent">Urgent</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1.5">Remarks</label>
                              <textarea
                                rows="3"
                                value={assignmentForm.remarks}
                                onChange={(e) => setAssignmentForm((prev) => ({ ...prev, remarks: e.target.value }))}
                                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#2b63ae] bg-white/90 text-sm"
                              />
                            </div>

                            <button
                              type="button"
                              disabled={savingAssignment}
                              onClick={handleSaveAssignmentFromPanel}
                              className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-semibold"
                            >
                              {savingAssignment ? "Assigning..." : "Assign Selected Tests"}
                            </button>
                          </section>
                        </div>
                      </aside>

                      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                          <select className="border rounded-lg px-3 py-2 text-sm" value={materialFilter} onChange={(e) => setMaterialFilter(e.target.value)}>
                            <option value="">All Materials</option>
                            {assignmentMaterialOptions.map((material) => (
                              <option key={material} value={material}>{material}</option>
                            ))}
                          </select>

                          <select className="border rounded-lg px-3 py-2 text-sm" value={testFilter} onChange={(e) => setTestFilter(e.target.value)}>
                            <option value="">All Tests</option>
                            {assignmentTestOptions.map((testName) => (
                              <option key={testName} value={testName}>{testName}</option>
                            ))}
                          </select>

                          <select className="border rounded-lg px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="">All Status</option>
                            <option value="Assigned">Assigned</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Observation Completed">Observation Completed</option>
                            <option value="Result Generated">Result Generated</option>
                            <option value="Reviewed">Reviewed</option>
                            <option value="Approved">Approved</option>
                          </select>

                          <select className="border rounded-lg px-3 py-2 text-sm" value={technicianFilter} onChange={(e) => setTechnicianFilter(e.target.value)}>
                            <option value="">All Users</option>
                            {labUsers.map((user) => (
                              <option key={user.user_id} value={user.user_id}>{user.full_name || user.email}</option>
                            ))}
                          </select>

                          <input
                            type="text"
                            placeholder="Search assignments..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="border rounded-lg px-3 py-2 text-sm"
                          />
                        </div>
                      </div>

                      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900">Assigned Test List</h3>
                          <span className="text-sm text-gray-500">{filteredAssignments.length} record(s)</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left">Assignment</th>
                                <th className="px-4 py-3 text-left">Sample No</th>
                                <th className="px-4 py-3 text-left">Material</th>
                                <th className="px-4 py-3 text-left">Qty</th>
                                <th className="px-4 py-3 text-left">Test Name</th>
                                <th className="px-4 py-3 text-left">Assigned To</th>
                                <th className="px-4 py-3 text-left">Target Date</th>
                                <th className="px-4 py-3 text-left">Status</th>
                                <th className="px-4 py-3 text-center">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {assignmentsLoading ? (
                                <tr>
                                  <td colSpan="9" className="text-center py-10">Loading assignments...</td>
                                </tr>
                              ) : filteredAssignments.length === 0 ? (
                                <tr>
                                  <td colSpan="9" className="text-center py-10 text-gray-500">No assignments found</td>
                                </tr>
                              ) : (
                                filteredAssignments.map((item) => (
                                  <tr key={item.assignment_id} className="border-t hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">TA-{item.assignment_id}</td>
                                    <td className="px-4 py-3">{item.sample_no || "N/A"}</td>
                                    <td className="px-4 py-3">{item.material_name || "N/A"}</td>
                                    <td className="px-4 py-3">{item.quantity || "-"}</td>
                                    <td className="px-4 py-3">{item.test_name || "N/A"}</td>
                                    <td className="px-4 py-3">{item.assigned_to_name || "Unassigned"}</td>
                                    <td className="px-4 py-3">{formatDate(item.target_date)}</td>
                                    <td className="px-4 py-3">
                                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getAssignmentStatusStyles(item.status)}`}>
                                        {item.status || "Assigned"}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <div className="flex items-center justify-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const sample = samples.find((s) => String(s.sample_id) === String(item.sample_id));
                                            if (sample) {
                                              // setSelectedObservationSampleId(sample.sample_entry_id);
                                              setActiveTab("observation");
                                            }
                                          }}
                                          className="text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                          Observation
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteAssignment(item.assignment_id)}
                                          className="text-red-600 hover:text-red-700 font-medium"
                                        >
                                          Delete
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
                  )}
{false && activeTab === "testAssignment" && (
  <div className="space-y-6">

    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">
          Test Assignment
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Assign laboratory tests to technicians and track progress
        </p>
      </div>

      {/* <button
        onClick={() => setShowAssignTestDrawer(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
      >
        <span className="text-lg">+</span>
        Assign Test
      </button> */}
      {/* Assign Test Drawer */}
      <AssignTestDrawer
        // open={!!assignTestProject}
        onClose={closeAssignDrawer}
        onAssigned={(assignedCount) => {
          toast.success(`${assignedCount} test(s) assigned successfully`);
          fetchSamples();
        }}
      />  
    </div>

    {/* Summary Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">

      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <div className="text-sm text-gray-500">Total Samples</div>
        <div className="text-3xl font-bold text-gray-800 mt-2">
          {assignmentSummary?.total_samples || 0}
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <div className="text-sm text-gray-500">Assigned Tests</div>
        <div className="text-3xl font-bold text-blue-600 mt-2">
          {assignmentSummary?.assigned_tests || 0}
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <div className="text-sm text-gray-500">Pending Tests</div>
        <div className="text-3xl font-bold text-yellow-600 mt-2">
          {assignmentSummary?.pending_tests || 0}
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <div className="text-sm text-gray-500">In Progress</div>
        <div className="text-3xl font-bold text-indigo-600 mt-2">
          {assignmentSummary?.in_progress_tests || 0}
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <div className="text-sm text-gray-500">Approved</div>
        <div className="text-3xl font-bold text-green-600 mt-2">
          {assignmentSummary?.approved_tests || 0}
        </div>
      </div>

    </div>

    {/* Filters */}
    <div className="bg-white border rounded-xl p-4 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

        <select
          className="border rounded-lg px-3 py-2"
          value={materialFilter}
          onChange={(e) => setMaterialFilter(e.target.value)}
        >
          <option value="">All Materials</option>
          <option value="Soil">Soil</option>
          <option value="Cement">Cement</option>
          <option value="Brick">Brick</option>
          <option value="Aggregate">Aggregate</option>
          <option value="Concrete">Concrete</option>
        </select>

        <select
          className="border rounded-lg px-3 py-2"
          value={testFilter}
          onChange={(e) => setTestFilter(e.target.value)}
        >
          <option value="">All Tests</option>
          <option value="CBR">CBR</option>
          <option value="OMC">OMC</option>
          <option value="MDD">MDD</option>
        </select>

        <select
          className="border rounded-lg px-3 py-2"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="Assigned">Assigned</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Approved">Approved</option>
        </select>

        <select
          className="border rounded-lg px-3 py-2"
          value={technicianFilter}
          onChange={(e) => setTechnicianFilter(e.target.value)}
        >
          <option value="">All Technicians</option>
          {labUsers?.map((user) => (
            <option key={user.user_id} value={user.user_id}>
              {user.full_name}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border rounded-lg px-3 py-2"
        />

      </div>
    </div>

    {/* Table */}
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">

      <div className="overflow-x-auto">

        <table className="min-w-full text-sm">

          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Assignment</th>
              <th className="px-4 py-3 text-left">Sample No</th>
              <th className="px-4 py-3 text-left">Material</th>
              <th className="px-4 py-3 text-left">Test Name</th>
              <th className="px-4 py-3 text-left">Assigned To</th>
              <th className="px-4 py-3 text-left">Target Date</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Observation</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>

          <tbody>

            {assignmentsLoading ? (
              <tr>
                <td colSpan="9" className="text-center py-10">
                  Loading assignments...
                </td>
              </tr>
            ) : assignments?.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-10 text-gray-500">
                  No assignments found
                </td>
              </tr>
            ) : (
              assignments.map((item) => (
                <tr
                  key={item.assignment_id}
                  className="border-t hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-medium">
                    {item.assignment_code}
                  </td>

                  <td className="px-4 py-3">
                    {item.sample_no}
                  </td>

                  <td className="px-4 py-3">
                    {item.material_name}
                  </td>

                  <td className="px-4 py-3">
                    {item.test_name}
                  </td>

                  <td className="px-4 py-3">
                    {item.assigned_to_name}
                  </td>

                  <td className="px-4 py-3">
                    {item.target_date}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium
                        ${
                          item.status === "Approved"
                            ? "bg-green-100 text-green-700"
                            : item.status === "In Progress"
                            ? "bg-indigo-100 text-indigo-700"
                            : item.status === "Pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                    >
                      {item.status}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <button
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {item.status === "Approved"
                        ? "View"
                        : "Start"}
                    </button>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <button className="text-xl text-gray-600 hover:text-black">
                      ⋮
                    </button>
                  </td>
                </tr>
              ))
            )}

          </tbody>

        </table>

      </div>

    </div>

  </div>
)}

                  {activeTab === "observation" && (
                    <div className="space-y-6">
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        {/* Observation content will be implemented here */}
                      </div>
                    </div>
                  )}

                  {activeTab === "report" && (
                    <div className="space-y-6">
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        {/* <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                          <h2 className="text-lg font-semibold text-gray-900">
                            Reports
                          </h2>
                          <p className="text-sm text-gray-500 mt-1">
                            View and manage test reports for samples
                          </p>
                        </div> */}

                        <div className="flex h-[600px]">
                          {/* Left Panel - Sample List */}
                          <div className="w-1/3 border-r border-gray-200 overflow-y-auto bg-gray-50">
                            <div className="divide-y divide-gray-200">
                              {samples.length === 0 ? (
                                <div className="p-6 text-center text-gray-500">
                                  No samples found
                                </div>
                              ) : (
                                samples.map((sample) => (
                                  <div
                                    key={sample.sample_entry_id}
                                    onClick={() => setSelectedReportSampleId(sample.sample_entry_id)}
                                    className={`p-4 cursor-pointer transition-colors ${selectedReportSampleId === sample.sample_entry_id
                                        ? 'bg-green-50 border-l-4 border-green-600'
                                        : 'hover:bg-gray-100'
                                      }`}
                                  >
                                    <div className="font-medium text-gray-900">{sample.sample_no || 'N/A'}</div>
                                    <div className="text-xs text-gray-500 mt-1">{sample.material_name || 'N/A'}</div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Right Panel - Report Details */}
                          <div className="w-2/3 overflow-y-auto">
                            {selectedReportSampleId ? (
                              <div className="p-6 space-y-6">
                                {/* Selected Sample Info */}
                                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                  <h3 className="text-lg font-semibold text-gray-900">
                                    Sample: {samples.find(s => s.sample_entry_id === selectedReportSampleId)?.sample_no || 'N/A'}
                                  </h3>
                                  <p className="text-sm text-gray-600 mt-2">
                                    Material: {samples.find(s => s.sample_entry_id === selectedReportSampleId)?.material_name || 'N/A'}
                                  </p>
                                </div>

                                {/* Report Fields */}
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Test Method
                                      </label>
                                      <input
                                        type="text"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter test method..."
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Test Result
                                      </label>
                                      <input
                                        type="text"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter test result..."
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Test Date
                                      </label>
                                      <input
                                        type="date"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Report Status
                                      </label>
                                      <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                        <option value="">Select Status</option>
                                        <option value="draft">Draft</option>
                                        <option value="completed">Completed</option>
                                        <option value="approved">Approved</option>
                                      </select>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Report Summary
                                    </label>
                                    <textarea
                                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      rows="5"
                                      placeholder="Enter report summary..."
                                    />
                                  </div>

                                  <div className="flex gap-3 pt-4">
                                    <button className="flex-1 px-4 py-2 bg-[#2d66b3] hover:bg-[#1f5498] text-white rounded-lg font-medium transition-colors">
                                      Save Report
                                    </button>
                                    <button className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors">
                                      Generate PDF
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center text-gray-400">
                                <div className="text-center">
                                  <DescriptionIcon className="w-12 h-12 mx-auto mb-2" />
                                  <p>Select a sample to view report details</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
          </div>
        </div>

      {/* Add Sample Drawer */}
      <AddSampleDrawer
        open={!!drawerProject}
        project={drawerProject}
        sampleEntry={drawerSampleEntry}
        mode={drawerMode}
        onClose={closeSampleDrawer}
        onSaved={(createdCount, mode) => {
          toast.success(mode === "edit" ? "Sample updated successfully" : `${createdCount} sample(s) added successfully`);
          fetchSamples();
        }}
      />
         
    </MainLayout>
  );
};

export default ProjectView;
