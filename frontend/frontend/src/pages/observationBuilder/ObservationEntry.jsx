import React, { useState, useEffect } from "react";
import { MainLayout } from "../../components/layout";
import {
  Undo as UndoIcon,
  Redo as RedoIcon,
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatUnderlined as UnderlineIcon,
  FormatAlignLeft as AlignLeftIcon,
  FormatAlignCenter as AlignCenterIcon,
  FormatAlignRight as AlignRightIcon,
  FormatColorFill as FillIcon,
  FormatColorText as ColorTextIcon,
  MergeType as MergeIcon,
  BorderAll as SplitIcon,
  BorderAll as BorderAllIcon,
  BorderTop as BorderTopIcon,
  BorderBottom as BorderBottomIcon,
  BorderLeft as BorderLeftIcon,
  BorderRight as BorderRightIcon,
  BorderOuter as BorderOutsideIcon,
  BorderInner as BorderInsideIcon,
  BorderClear as BorderClearIcon,
  ArrowDropDown as ArrowDropDownIcon,
  Add as PlusIcon,
  Search as SearchIcon,
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Science as ScienceIcon,
  ZoomOut as ZoomOutIcon,
  ZoomIn as ZoomInIcon,
} from "@mui/icons-material";
import { getProjects } from "../../api/projects";
import { getSampleEntries } from "../../api/sampleEntries";
import { getAssignmentsBySample } from "../../api/testAssignments";
import { getObservationTemplates } from "../../api/observationBuilder";
import {
  getSampleObservations,
  getSampleObservation,
  createSampleObservation,
  updateSampleObservation,
  deleteSampleObservation
} from "../../api/sampleObservations";
import { toast, Toaster } from "sonner";

function roundVal(val, decimals) {
  if (isNaN(val) || val === null || val === undefined) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

const CELL_BORDER_STYLE = "0.02px solid #757679";
const CELL_BORDER_KEYS = ["borderTop", "borderRight", "borderBottom", "borderLeft"];

function getCellLabel(row, col) {
  const letter = String.fromCharCode(65 + col);
  return `${letter}${row + 1}`;
}

export default function ObservationEntry() {
  // Navigation views: 'list' | 'entry'
  const [view, setView] = useState("list");

  // Dynamic observations register from database
  const [observations, setObservations] = useState([]);
  const [observationsLoading, setObservationsLoading] = useState(false);

  // Editing state tracker
  const [activeObservationId, setActiveObservationId] = useState(null);

  const [listSearch, setListSearch] = useState("");

  // Projects, Samples, Tests loading for wizard selection
  const [projects, setProjects] = useState([]);
  const [samples, setSamples] = useState([]);
  const [assignedTests, setAssignedTests] = useState([]);
  const [templates, setTemplates] = useState([]);

  // Selections
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedSample, setSelectedSample] = useState("");
  const [selectedTest, setSelectedTest] = useState("");

  const [wizardLoading, setWizardLoading] = useState(false);

  // Active loaded spreadsheet settings
  const [activeSheetId, setActiveSheetId] = useState("sheet1");
  const [sheets, setSheets] = useState([{ id: "sheet1", name: "Sheet 1" }]);
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });
  const [zoomLevel, setZoomLevel] = useState(100);

  const [testType, setTestType] = useState("Observations Test");
  const [sampleIdLabel, setSampleIdLabel] = useState("");
  const [method, setMethod] = useState("");

  // Drag Selection states for merges
  const [selectionStart, setSelectionStart] = useState({ row: 0, col: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ row: 0, col: 0 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [borderMenuOpen, setBorderMenuOpen] = useState(false);

  // Grid dimensions
  const colsCount = 12;
  const rowsCount = 15;

  const [sheetsData, setSheetsData] = useState({
    sheet1: {}
  });
  const [merges, setMerges] = useState([]);

  const cells = sheetsData[activeSheetId] || {};
  const activeLabel = getCellLabel(selectedCell.row, selectedCell.col);
  const activeCellState = cells[activeLabel] || { value: "", type: "label", style: {}, validation: {} };

  // Undo/Redo states
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const pushHistory = (newSheetsData, newMerges) => {
    const slice = history.slice(0, historyIndex + 1);
    setHistory([...slice, { sheetsData: newSheetsData, merges: newMerges }]);
    setHistoryIndex(slice.length);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setSheetsData(prev.sheetsData);
      setMerges(prev.merges);
      setHistoryIndex(historyIndex - 1);
      toast.info("Undo completed");
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setSheetsData(next.sheetsData);
      setMerges(next.merges);
      setHistoryIndex(historyIndex + 1);
      toast.info("Redo completed");
    }
  };

  // Fetch observations register
  const fetchObservations = async () => {
    try {
      setObservationsLoading(true);
      const res = await getSampleObservations();
      if (res.data && res.data.success) {
        setObservations(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load observations:", err);
      setObservations([]);
    } finally {
      setObservationsLoading(false);
    }
  };

  useEffect(() => {
    fetchObservations();
  }, []);

  // Fetch initial select items on Wizard load
  const loadSetupResources = async () => {
    try {
      setWizardLoading(true);
      const [projRes, tempRes] = await Promise.all([
        getProjects(),
        getObservationTemplates()
      ]);
      
      if (projRes.data && projRes.data.success) {
        setProjects(projRes.data.data || []);
      }
      if (tempRes.data && tempRes.data.success) {
        setTemplates(tempRes.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load setup resources:", err);
      toast.error("Failed to retrieve setup resources from backend APIs");
    } finally {
      setWizardLoading(false);
    }
  };

  const handleProjectChange = async (projId) => {
    setSelectedProject(projId);
    setSelectedSample("");
    setSelectedTest("");
    setSamples([]);
    setAssignedTests([]);
    setSheetsData({ sheet1: {} });
    setMerges([]);

    if (!projId) return;

    try {
      setWizardLoading(true);
      // Fetch samples under this project
      const res = await getSampleEntries({ project_id: projId });
      if (res.data && res.data.success) {
        const list = res.data.data || [];
        setSamples(list);
        if (list.length === 0) {
          toast.info("No samples registered under the selected project");
        }
      }
    } catch (err) {
      toast.error("Failed to fetch samples list");
    } finally {
      setWizardLoading(false);
    }
  };

  const handleSampleChange = async (sampleId) => {
    setSelectedSample(sampleId);
    setSelectedTest("");
    setAssignedTests([]);
    setSheetsData({ sheet1: {} });
    setMerges([]);

    if (!sampleId) return;

    try {
      setWizardLoading(true);
      const res = await getAssignmentsBySample(sampleId);
      if (res.data) {
        const testsList = res.data.data || res.data || [];
        setAssignedTests(testsList);
        if (testsList.length === 0) {
          toast.info("No test assignments found for the selected sample");
        }
      }
    } catch (err) {
      toast.error("Failed to fetch assigned tests");
    } finally {
      setWizardLoading(false);
    }
  };

  const handleTestChange = (val) => {
    setSelectedTest(val);
    if (!val) {
      setSheetsData({ sheet1: {} });
      setMerges([]);
      return;
    }

    // Match template by scope_test_id
    const matchedTemplate = templates.find(
      t => t.scope_test_id.toString() === val.toString()
    );

    if (!matchedTemplate) {
      setSheetsData({ sheet1: {} });
      setMerges([]);
      toast.error("No observation layout template found for this test scope in the Form Builder yet!");
      return;
    }

    // Load template layout structures
    const loadedData = matchedTemplate.sheets_data || { sheet1: {} };
    const loadedMerges = matchedTemplate.merges_data || [];

    setSheetsData(loadedData);
    setMerges(loadedMerges);

    setHistory([{ sheetsData: loadedData, merges: loadedMerges }]);
    setHistoryIndex(0);

    const sheetKeys = Object.keys(loadedData);
    if (sheetKeys.length > 0) {
      setSheets(sheetKeys.map((key, idx) => ({ id: key, name: `Sheet ${idx + 1}` })));
      setActiveSheetId(sheetKeys[0]);
    } else {
      setSheets([{ id: "sheet1", name: "Sheet 1" }]);
      setActiveSheetId("sheet1");
    }

    const sampleNo = samples.find(s => s.sample_id.toString() === selectedSample.toString())?.sample_no || "SAMPLE_ID";
    const testLabel = matchedTemplate.test_name || matchedTemplate.name || "Test Observations";
    const testMethod = matchedTemplate.test_method || "NABL Standards";

    setSampleIdLabel(sampleNo);
    setTestType(testLabel);
    setMethod(testMethod);
    toast.success("Loaded observation template successfully!");
  };

  // Fetch detailed record cells context for editing
  const handleEditObservation = async (obs) => {
    try {
      loadSetupResources();
      toast.loading("Loading observations cell matrix...");
      const res = await getSampleObservation(obs.observation_id);
      toast.dismiss();
      if (res.data && res.data.success) {
        const fullObs = res.data.data;
        
        // Fetch project-specific samples and sample-specific assignments
        await handleProjectChange(fullObs.project_id);
        
        // Query assignments
        const assnRes = await getAssignmentsBySample(fullObs.sample_id);
        if (assnRes.data) {
          setAssignedTests(assnRes.data.data || assnRes.data || []);
        }

        setActiveObservationId(fullObs.observation_id);
        setSelectedProject(fullObs.project_id);
        setSelectedSample(fullObs.sample_id);
        setSelectedTest(fullObs.scope_test_id);

        setSampleIdLabel(obs.sample_no || "SAMPLE_ID");
        setTestType(fullObs.test_name);
        setMethod(fullObs.test_method);

        setSheetsData(fullObs.sheets_data || { sheet1: {} });
        setMerges(fullObs.merges_data || []);

        setHistory([{ sheetsData: fullObs.sheets_data, merges: fullObs.merges_data }]);
        setHistoryIndex(0);

        const sheetKeys = Object.keys(fullObs.sheets_data || {});
        if (sheetKeys.length > 0) {
          setSheets(sheetKeys.map((key, idx) => ({ id: key, name: `Sheet ${idx + 1}` })));
          setActiveSheetId(sheetKeys[0]);
        } else {
          setSheets([{ id: "sheet1", name: "Sheet 1" }]);
          setActiveSheetId("sheet1");
        }

        setView("entry");
        toast.success("Loaded observations sheet context successfully");
      }
    } catch (err) {
      toast.dismiss();
      console.error(err);
      toast.error("Failed to retrieve observations sheet context");
    }
  };

  const handleSave = async () => {
    if (!selectedProject || !selectedSample || !selectedTest) {
      toast.error("Please ensure Project, Sample No, and Assigned Test are selected!");
      return;
    }
    try {
      const payload = {
        project_id: parseInt(selectedProject),
        sample_id: parseInt(selectedSample),
        scope_test_id: parseInt(selectedTest),
        test_name: testType,
        test_method: method,
        operator_name: "Lab Technician",
        sheets_data: sheetsData,
        merges_data: merges,
        status: "Completed"
      };

      toast.loading("Saving observation log to database...");
      let res;
      if (activeObservationId) {
        res = await updateSampleObservation(activeObservationId, payload);
      } else {
        res = await createSampleObservation(payload);
      }
      toast.dismiss();

      if (res.data && res.data.success) {
        toast.success("Observations logged and saved in database successfully!");
        fetchObservations();
        setView("list");
      }
    } catch (err) {
      toast.dismiss();
      toast.error("Failed to save observation entry: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteObservation = async (id) => {
    try {
      toast.loading("Deleting observation entry from database...");
      const res = await deleteSampleObservation(id);
      toast.dismiss();
      if (res.data && res.data.success) {
        toast.success("Observation entry deleted successfully");
        fetchObservations();
      }
    } catch (err) {
      toast.dismiss();
      toast.error("Failed to delete observation record");
    }
  };

  const handleCreateNew = () => {
    loadSetupResources();
    setActiveObservationId(null);
    setSelectedProject("");
    setSelectedSample("");
    setSelectedTest("");
    setSampleIdLabel("");
    setTestType("Observations Grid");
    setMethod("");
    setSheetsData({ sheet1: {} });
    setSheets([{ id: "sheet1", name: "Sheet 1" }]);
    setActiveSheetId("sheet1");
    setMerges([]);
    setView("entry");
  };

  const checkMergeStatus = (r, c) => {
    for (let m of merges) {
      if (r >= m.startRow && r <= m.endRow && c >= m.startCol && c <= m.endCol) {
        if (r === m.startRow && c === m.startCol) {
          return {
            show: true,
            rowSpan: m.endRow - m.startRow + 1,
            colSpan: m.endCol - m.startCol + 1,
          };
        } else {
          return { show: false, rowSpan: 0, colSpan: 0 };
        }
      }
    }
    return { show: true, rowSpan: 1, colSpan: 1 };
  };

  const evaluatePreviewCell = (label, cellData) => {
    if (cellData.type === "formula" && cellData.formula) {
      try {
        const expression = cellData.formula.slice(1).toUpperCase();
        const resolved = expression.replace(/[A-Z]\d+/g, (match) => {
          const target = cells[match];
          const val = target ? parseFloat(target.value) : 0;
          return isNaN(val) ? 0 : val;
        });
        const result = new Function(`return ${resolved}`)();
        return isNaN(result) ? "#VALUE!" : roundVal(result, 2);
      } catch (err) {
        return "#ERROR!";
      }
    }
    return cellData.value;
  };

  const minRow = Math.min(selectionStart.row, selectionEnd.row);
  const maxRow = Math.max(selectionStart.row, selectionEnd.row);
  const minCol = Math.min(selectionStart.col, selectionEnd.col);
  const maxCol = Math.max(selectionStart.col, selectionEnd.col);

  const updateActiveCellProp = (field, key, val) => {
    setSheetsData((prev) => {
      const currentCells = prev[activeSheetId] || {};
      const current = currentCells[activeLabel] || { value: "", type: "label", style: {}, validation: {} };
      let updated = { ...current };

      if (field === "general") {
        updated[key] = val;
      } else if (field === "style") {
        updated.style = { ...updated.style, [key]: val };
      }

      const nextCells = { ...currentCells, [activeLabel]: updated };
      const nextSheetsData = { ...prev, [activeSheetId]: nextCells };
      pushHistory(nextSheetsData, merges);
      return nextSheetsData;
    });
  };

  const getBorderUpdates = (borderType, row, col) => {
    if (borderType === "none") {
      return CELL_BORDER_KEYS.reduce((updates, key) => ({ ...updates, [key]: undefined }), {});
    }

    const updates = {};
    const addBorder = (key) => {
      updates[key] = CELL_BORDER_STYLE;
    };

    if (borderType === "all") {
      CELL_BORDER_KEYS.forEach(addBorder);
    } else if (borderType === "inside") {
      if (col < maxCol) addBorder("borderRight");
      if (row < maxRow) addBorder("borderBottom");
    } else if (borderType === "outside") {
      if (row === minRow) addBorder("borderTop");
      if (row === maxRow) addBorder("borderBottom");
      if (col === minCol) addBorder("borderLeft");
      if (col === maxCol) addBorder("borderRight");
    } else if (borderType === "top" && row === minRow) {
      addBorder("borderTop");
    } else if (borderType === "bottom" && row === maxRow) {
      addBorder("borderBottom");
    } else if (borderType === "left" && col === minCol) {
      addBorder("borderLeft");
    } else if (borderType === "right" && col === maxCol) {
      addBorder("borderRight");
    }

    return updates;
  };

  const applyBorderToSelection = (borderType) => {
    setSheetsData((prev) => {
      const currentCells = prev[activeSheetId] || {};
      const nextCells = { ...currentCells };

      for (let row = minRow; row <= maxRow; row += 1) {
        for (let col = minCol; col <= maxCol; col += 1) {
          const label = getCellLabel(row, col);
          const current = nextCells[label] || { value: "", type: "label", style: {}, validation: {} };
          const nextStyle = { ...(current.style || {}) };
          const borderUpdates = getBorderUpdates(borderType, row, col);

          Object.entries(borderUpdates).forEach(([key, value]) => {
            if (value === undefined) {
              delete nextStyle[key];
            } else {
              nextStyle[key] = value;
            }
          });

          nextCells[label] = { ...current, style: nextStyle };
        }
      }

      const nextSheetsData = { ...prev, [activeSheetId]: nextCells };
      pushHistory(nextSheetsData, merges);
      return nextSheetsData;
    });

    setBorderMenuOpen(false);
    toast.success(`Applied ${borderType} border to selected cells`);
  };

  const borderMenuItems = [
    { type: "all", label: "All Borders", icon: BorderAllIcon },
    { type: "bottom", label: "Bottom", icon: BorderBottomIcon },
    { type: "top", label: "Top", icon: BorderTopIcon },
    { type: "left", label: "Left", icon: BorderLeftIcon },
    { type: "right", label: "Right", icon: BorderRightIcon },
    { type: "outside", label: "Outside", icon: BorderOutsideIcon },
    { type: "inside", label: "Inside", icon: BorderInsideIcon },
    { type: "none", label: "No Border", icon: BorderClearIcon },
  ];

  const renderCellBorderOverlay = (cellStyle) => (
    <div className="pointer-events-none absolute inset-0 z-20">
      {cellStyle.borderTop && <span className="absolute left-0 top-0 h-px w-full bg-slate-900" />}
      {cellStyle.borderRight && <span className="absolute right-0 top-0 h-full w-px bg-slate-900" />}
      {cellStyle.borderBottom && <span className="absolute bottom-0 left-0 h-px w-full bg-slate-900" />}
      {cellStyle.borderLeft && <span className="absolute left-0 top-0 h-full w-px bg-slate-900" />}
    </div>
  );

  const handleRangeMerge = () => {
    const rSpan = maxRow - minRow + 1;
    const cSpan = maxCol - minCol + 1;

    if (rSpan === 1 && cSpan === 1) {
      toast.error("Please drag-select a range of multiple cells first!");
      return;
    }

    const parentLabel = getCellLabel(minRow, minCol);
    const newMerge = { startRow: minRow, startCol: minCol, endRow: maxRow, endCol: maxCol, parent: parentLabel };

    setMerges((prev) => {
      const filtered = prev.filter(
        (m) =>
          !(
            minRow <= m.endRow &&
            maxRow >= m.startRow &&
            minCol <= m.endCol &&
            maxCol >= m.startCol
          )
      );
      const nextMerges = [...filtered, newMerge];
      pushHistory(sheetsData, nextMerges);
      return nextMerges;
    });
    toast.success(`Merged selection block ${getCellLabel(minRow, minCol)} to ${getCellLabel(maxRow, maxCol)}`);
  };

  const handleSplit = () => {
    const r = selectedCell.row;
    const c = selectedCell.col;

    setMerges((prev) => {
      const nextMerges = prev.filter(
        (m) => !(r >= m.startRow && r <= m.endRow && c >= m.startCol && c <= m.endCol)
      );
      pushHistory(sheetsData, nextMerges);
      return nextMerges;
    });
    toast.success("Split active merged range");
  };

  const filteredObservations = observations.filter(
    (obs) =>
      obs.sample_no?.toLowerCase().includes(listSearch.toLowerCase()) ||
      obs.test_name?.toLowerCase().includes(listSearch.toLowerCase()) ||
      obs.project_code?.toLowerCase().includes(listSearch.toLowerCase())
  );

  return (
    <MainLayout>
      <Toaster position="top-right" richColors />

      {view === "list" ? (
        /* View 1: Observation Records Dashboard */
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Observations Entry Register</h1>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                Select test assignments to record physical laboratory observations and execute standard calculations.
              </p>
            </div>
            <button
              onClick={handleCreateNew}
              className="px-4.5 py-2.5 bg-[#2562AA] text-white hover:bg-[#1e4f8a] rounded-xl text-xs font-bold transition-all shadow flex items-center gap-1.5"
            >
              <PlusIcon fontSize="small" />
              Add Observation
            </button>
          </div>

          <div className="flex items-center gap-2 border border-slate-200/80 bg-white rounded-xl px-3.5 py-2 max-w-md shadow-2xs">
            <SearchIcon style={{ fontSize: 18 }} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search observations by sample, project or test..."
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              className="w-full bg-transparent border-none text-xs outline-none text-slate-800"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/85 overflow-hidden shadow-xs">
            {observationsLoading ? (
              <div className="p-10 text-center text-xs font-bold text-slate-450 animate-pulse">Loading observations from database...</div>
            ) : filteredObservations.length === 0 ? (
              <div className="p-10 text-center text-xs font-bold text-slate-400">No observation records logged. Click 'Add Observation' to record one.</div>
            ) : (
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-black h-10 select-none text-[10px] uppercase tracking-wider">
                    <th className="px-5">Project Code</th>
                    <th className="px-5">Sample ID</th>
                    <th className="px-5">Test Name</th>
                    <th className="px-5">NABL Standard</th>
                    <th className="px-5">Operator</th>
                    <th className="px-4 text-center">Status</th>
                    <th className="px-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                  {filteredObservations.map((obs) => (
                    <tr key={obs.observation_id} className="hover:bg-slate-50/30 transition-all h-12">
                      <td className="px-5 font-bold text-slate-500">{obs.project_code || "N/A"}</td>
                      <td className="px-5 font-bold text-slate-900">{obs.sample_no || `Sample #${obs.sample_id}`}</td>
                      <td className="px-5 font-bold text-[#2562AA]">{obs.test_name}</td>
                      <td className="px-5 text-slate-550 font-bold">{obs.test_method || "N/A"}</td>
                      <td className="px-5 text-slate-450">{obs.operator_name || "Lab Technician"}</td>
                      <td className="px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                          obs.status === "Completed"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}>
                          {obs.status}
                        </span>
                      </td>
                      <td className="px-5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEditObservation(obs)}
                            className="p-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-slate-650 transition-all flex items-center justify-center"
                          >
                            <EditIcon style={{ fontSize: 14 }} />
                          </button>
                          <button
                            onClick={() => handleDeleteObservation(obs.observation_id)}
                            className="p-1.5 border border-red-100 bg-white hover:bg-red-50 text-red-650 rounded-lg transition-all flex items-center justify-center"
                          >
                            <DeleteIcon style={{ fontSize: 14 }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* View 2: Excel Worksheet Canvas for Entry */
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-[#F8FAFC]" onMouseUp={() => setIsSelecting(false)}>
          
          {/* Header Row */}
          <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200/80 gap-4 shrink-0 shadow-xs z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView("list")}
                className="p-1.5 text-slate-400 hover:text-slate-600 border rounded-lg bg-white shadow-2xs hover:scale-95 transition-all flex items-center justify-center"
              >
                <ArrowBackIcon fontSize="small" />
              </button>
              <div>
                <h1 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  {testType}
                </h1>
                <p className="text-[10px] text-slate-450 font-bold mt-0.5">Sample ID: <span className="text-[#2562AA]">{sampleIdLabel || "Select Sample"}</span> | Standard: {method || "NABL Standards"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40"
              >
                <UndoIcon style={{ fontSize: 15 }} />
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40"
              >
                <RedoIcon style={{ fontSize: 15 }} />
              </button>
              <div className="h-4 w-px bg-slate-200" />
              <button
                onClick={handleSave}
                className="px-4.5 py-1.5 bg-[#2562AA] text-white hover:bg-[#1e4f8a] rounded-lg text-xs font-bold shadow-xs"
              >
                Submit observations
              </button>
            </div>
          </div>

          {/* Top Selection panel (Horizontal selects) */}
          <div className="bg-white border-b border-slate-200/80 px-6 py-3 flex items-center gap-6 select-none flex-wrap shrink-0">
            {/* Select Project */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Project:</span>
              <select
                value={selectedProject}
                onChange={(e) => handleProjectChange(e.target.value)}
                disabled={activeObservationId !== null}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold bg-slate-50 outline-none text-slate-700 max-w-xs"
              >
                <option value="">-- Choose Project --</option>
                {projects.map(p => (
                  <option key={p.project_id} value={p.project_id}>
                    {p.project_name} ({p.project_code})
                  </option>
                ))}
              </select>
            </div>

            {/* Select Sample */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Sample No:</span>
              <select
                value={selectedSample}
                onChange={(e) => handleSampleChange(e.target.value)}
                disabled={!selectedProject || activeObservationId !== null}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold bg-slate-50 outline-none text-slate-700 max-w-xs"
              >
                <option value="">-- Choose Sample --</option>
                {samples.map(s => (
                  <option key={s.sample_id} value={s.sample_id}>
                    {s.sample_no} - {s.material_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Select Test */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Assigned Test:</span>
              <select
                value={selectedTest}
                onChange={(e) => handleTestChange(e.target.value)}
                disabled={!selectedSample || activeObservationId !== null}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold bg-slate-50 outline-none text-slate-700 max-w-xs"
              >
                <option value="">-- Choose Test --</option>
                {assignedTests.map(t => (
                  <option key={t.assignment_id} value={t.master_scope_test_id || t.scope_test_id}>
                    {t.test_name} ({t.test_method})
                  </option>
                ))}
              </select>
            </div>

            {wizardLoading && (
              <span className="text-[10px] text-blue-600 font-bold animate-pulse">Loading API assets...</span>
            )}
          </div>

          {/* Formatting Ribbon */}
          <div className="flex items-center justify-between px-6 py-2 bg-white border-b border-slate-200 shrink-0 text-xs font-semibold text-slate-650 gap-4">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 font-bold uppercase mr-2 bg-slate-100 px-2 py-0.5 rounded">
                OBSERVATION EDITOR
              </span>

              {/* Selection Merging */}
              <button
                onClick={handleRangeMerge}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#2562AA] rounded-lg text-[11px] flex items-center gap-1 font-bold shadow-2xs"
                title="Merge selected drag cells range"
              >
                <MergeIcon style={{ fontSize: 13 }} /> Merge Range
              </button>

              <button onClick={handleSplit} className="px-2.5 py-1.5 rounded-lg border hover:bg-slate-50 text-[11px] flex items-center gap-1 text-slate-500 font-bold">
                <SplitIcon style={{ fontSize: 13 }} /> Unmerge
              </button>

              <div className="h-4 w-px bg-slate-200 mx-1" />

              <button onClick={() => updateActiveCellProp("style", "fontWeight", "bold")} className="w-7 h-7 hover:bg-slate-100 rounded flex items-center justify-center font-bold">B</button>
              <button onClick={() => updateActiveCellProp("style", "fontStyle", "italic")} className="w-7 h-7 hover:bg-slate-100 rounded flex items-center justify-center italic">I</button>
              <button onClick={() => updateActiveCellProp("style", "textDecoration", "underline")} className="w-7 h-7 hover:bg-slate-100 rounded flex items-center justify-center underline font-semibold">U</button>
              
              <div className="h-4 w-px bg-slate-200 mx-1" />

              <button onClick={() => updateActiveCellProp("style", "alignment", "left")} className="p-1.5 hover:bg-slate-100 rounded"><AlignLeftIcon style={{ fontSize: 15 }} /></button>
              <button onClick={() => updateActiveCellProp("style", "alignment", "center")} className="p-1.5 hover:bg-slate-100 rounded"><AlignCenterIcon style={{ fontSize: 15 }} /></button>
              <button onClick={() => updateActiveCellProp("style", "alignment", "right")} className="p-1.5 hover:bg-slate-100 rounded"><AlignRightIcon style={{ fontSize: 15 }} /></button>
              
              <div className="h-4 w-px bg-slate-200 mx-1" />

              <div className="relative flex items-center" onMouseLeave={() => setBorderMenuOpen(false)}>
                <button
                  onClick={() => applyBorderToSelection("all")}
                  className="h-7 px-2 hover:bg-slate-100 rounded-l flex items-center gap-1 text-[11px] font-bold text-slate-600"
                  title="All Borders"
                >
                  <BorderAllIcon style={{ fontSize: 15 }} />
                  All Borders
                </button>
                <button
                  onClick={() => setBorderMenuOpen((open) => !open)}
                  className="h-7 w-6 hover:bg-slate-100 rounded-r flex items-center justify-center border-l border-slate-200"
                  title="Border options"
                >
                  <ArrowDropDownIcon style={{ fontSize: 17 }} />
                </button>

                {borderMenuOpen && (
                  <div className="absolute left-0 top-8 z-50 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                    {borderMenuItems.map(({ type, label, icon: Icon }) => (
                      <button
                        key={type}
                        onClick={() => applyBorderToSelection(type)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-bold text-slate-600 hover:bg-blue-50 hover:text-[#2562AA]"
                      >
                        <Icon style={{ fontSize: 15 }} />
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="h-4 w-px bg-slate-200 mx-1" />

              {/* Color Fill picker */}
              <div className="flex items-center gap-1.5 border border-slate-200 bg-slate-50 px-2 py-0.5 rounded-lg select-none">
                <FillIcon style={{ fontSize: 13 }} className="text-slate-400" />
                <input
                  type="color"
                  value={activeCellState.style?.backgroundColor || "#ffffff"}
                  onChange={(e) => updateActiveCellProp("style", "backgroundColor", e.target.value)}
                  className="w-5 h-5 border border-slate-200 rounded cursor-pointer p-0 bg-transparent outline-none"
                  title="Cell Background Color"
                />
              </div>

              {/* Color text picker */}
              <div className="flex items-center gap-1.5 border border-slate-200 bg-slate-50 px-2 py-0.5 rounded-lg select-none">
                <ColorTextIcon style={{ fontSize: 13 }} className="text-slate-400" />
                <input
                  type="color"
                  value={activeCellState.style?.color || "#000000"}
                  onChange={(e) => updateActiveCellProp("style", "color", e.target.value)}
                  className="w-5 h-5 border border-slate-200 rounded cursor-pointer p-0 bg-transparent outline-none"
                  title="Text Color"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
              <span>Zoom</span>
              <button onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))} className="p-1 hover:bg-slate-100 rounded"><ZoomOutIcon style={{ fontSize: 13 }} /></button>
              <span className="w-8 text-center text-slate-700">{zoomLevel}%</span>
              <button onClick={() => setZoomLevel(Math.min(150, zoomLevel + 10))} className="p-1 hover:bg-slate-100 rounded"><ZoomInIcon style={{ fontSize: 13 }} /></button>
            </div>
          </div>

          {/* Formula Bar Horizontal Input Grid */}
          <div className="flex items-center gap-3 px-6 py-2 bg-white border-b border-slate-200 shrink-0 select-none text-xs font-bold text-slate-500">
            <div className="w-14 text-center py-1 bg-slate-50 border rounded-lg font-mono text-[#2562AA]">
              {activeLabel}
            </div>
            <div className="h-5 w-px bg-slate-200" />
            <span className="italic font-black text-slate-450 font-serif text-sm">fx</span>
            <input
              type="text"
              value={activeCellState.type === "formula" ? (activeCellState.formula || "=") : (activeCellState.value || "")}
              readOnly={activeCellState.type === "formula" || (activeCellState.type === "label" && activeCellState.value && activeCellState.value.toString().trim() !== "")}
              onChange={(e) => {
                if (activeCellState.type === "formula" || (activeCellState.type === "label" && activeCellState.value && activeCellState.value.toString().trim() !== "")) return;
                const val = e.target.value;
                const nextCells = {
                  ...cells,
                  [activeLabel]: { 
                    ...activeCellState, 
                    type: activeCellState.type === "label" ? "textbox" : activeCellState.type,
                    value: val 
                  },
                };
                setSheetsData((prev) => ({
                  ...prev,
                  [activeSheetId]: nextCells,
                }));
              }}
              className="flex-1 px-3 py-1.5 border border-slate-200 bg-slate-50/50 rounded-lg outline-none font-mono text-xs text-slate-800 focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-75"
              placeholder={activeCellState.type === "formula" ? "Formula equation (read-only)" : "Enter cell value"}
            />
          </div>

          {/* Worksheet grid area */}
          <div className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]">
            <div className="max-w-[1100px] mx-auto space-y-5">

              {Object.keys(cells).length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center select-none">
                  <ScienceIcon style={{ fontSize: 48 }} className="text-[#2562AA] opacity-55 animate-bounce mb-3" />
                  <h3 className="text-sm font-bold text-slate-700">Spreadsheet observations workspace</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                    Select a Project, registered Sample, and Assigned Test from the panel above to instantly load and display the observation spreadsheet layout.
                  </p>
                </div>
              ) : (
                /* Excel grid canvas */
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col min-h-[400px]">
                  <div className="px-4 py-2 border-b bg-slate-50/80 flex items-center justify-between text-[10px] font-bold text-[#2562AA] uppercase tracking-wider border-b border-slate-200">
                    <span>Observation Grid Sheet</span>
                    <span className="text-slate-400 normal-case font-bold text-[9px]">Fill input values to trigger calculations</span>
                  </div>
                  
                  <div className="flex-1 overflow-auto">
                    <table className="w-full border-collapse border-spacing-0 text-left bg-white text-xs select-none">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-center text-[10px] text-slate-400 font-bold h-7 sticky top-0 z-20">
                          <th className="w-12 border-r border-slate-200 sticky left-0 bg-slate-50 z-30"></th>
                          {Array.from({ length: colsCount }).map((_, colIdx) => (
                            <th key={colIdx} className="border-r border-slate-200 px-3 min-w-[100px]">
                              {String.fromCharCode(65 + colIdx)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: rowsCount }).map((_, rIdx) => (
                          <tr key={rIdx} className="border-b border-slate-100 h-9">
                            <td className="bg-slate-50/80 border-r border-slate-200 text-center text-[10px] text-slate-400 font-bold select-none sticky left-0 z-10">
                              {rIdx + 1}
                            </td>
                            {Array.from({ length: colsCount }).map((_, cIdx) => {
                              const cellLabel = getCellLabel(rIdx, cIdx);
                              const cellState = cells[cellLabel] || { value: "", type: "label", style: {}, validation: {} };
                              const cellStyle = cellState.style || {};

                              const mergeInfo = checkMergeStatus(rIdx, cIdx);
                              if (!mergeInfo.show) return null;

                              const cellValue = cellState.value || "";
                              const isCalculated = cellState.type === "formula";
                              const displayVal = evaluatePreviewCell(cellLabel, cellState);

                              // Check editable conditions: cell is editable if it is not a formula, and not a designed label with value
                              const isEditable = cellState.type !== "formula" && 
                                !(cellState.type === "label" && cellState.value && cellState.value.toString().trim() !== "");

                              const isSelected = selectedCell.row === rIdx && selectedCell.col === cIdx;

                              // Drag Selection check
                              const isCellInSelection =
                                rIdx >= minRow && rIdx <= maxRow && cIdx >= minCol && cIdx <= maxCol;

                              return (
                                <td
                                  key={cellLabel}
                                  rowSpan={mergeInfo.rowSpan}
                                  colSpan={mergeInfo.colSpan}
                                  onMouseDown={(e) => {
                                    setIsSelecting(true);
                                    setSelectionStart({ row: rIdx, col: cIdx });
                                    setSelectionEnd({ row: rIdx, col: cIdx });
                                    setSelectedCell({ row: rIdx, col: cIdx });
                                  }}
                                  onMouseEnter={() => {
                                    if (isSelecting) {
                                      setSelectionEnd({ row: rIdx, col: cIdx });
                                    }
                                  }}
                                  className={`p-0 border-r border-b border-slate-200 relative cursor-cell transition-all ${
                                    isCellInSelection ? "bg-blue-50/60" : ""
                                  } ${
                                    isSelected ? "ring-2 ring-inset ring-blue-600 z-10" : ""
                                  }`}
                                  style={{
                                    fontWeight: cellStyle.fontWeight || "normal",
                                    fontStyle: cellStyle.fontStyle || "normal",
                                    textDecoration: cellStyle.textDecoration || "none",
                                    backgroundColor: isCalculated ? "#f0fdf4" : (cellStyle.backgroundColor || (isCellInSelection ? "#eff6ff" : "transparent")),
                                    color: cellStyle.color || "inherit",
                                    textAlign: cellStyle.alignment || "left",
                                    borderTop: cellStyle.borderTop,
                                    borderRight: cellStyle.borderRight,
                                    borderBottom: cellStyle.borderBottom,
                                    borderLeft: cellStyle.borderLeft,
                                  }}
                                >
                                  {renderCellBorderOverlay(cellStyle)}
                                  {isEditable ? (
                                    <input
                                      type={cellState.type === "number" ? "number" : "text"}
                                      value={cellValue}
                                      onChange={(e) => {
                                        const nextCells = {
                                          ...cells,
                                          [cellLabel]: { 
                                            ...cellState, 
                                            type: cellState.type === "label" ? "textbox" : cellState.type,
                                            value: e.target.value 
                                          },
                                        };
                                        setSheetsData((prev) => ({
                                          ...prev,
                                          [activeSheetId]: nextCells,
                                        }));
                                      }}
                                      className="w-full h-full px-2.5 outline-none text-left bg-transparent text-[11px] font-semibold focus:bg-blue-50/30"
                                      style={{ textAlign: cellStyle.alignment || "left" }}
                                    />
                                  ) : (
                                    <div
                                      className={`w-full h-full px-2.5 py-1.5 text-[11px] overflow-hidden truncate ${
                                        isCalculated ? "font-bold text-[#166534] font-mono" : "text-slate-500 font-semibold"
                                      }`}
                                      style={{ textAlign: cellStyle.alignment || "left" }}
                                    >
                                      {isCalculated && <span className="text-[8px] font-extrabold text-green-700 bg-green-100 px-1 rounded mr-1">fx</span>}
                                      {displayVal}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Bottom sheet tab navigation menu */}
                  <div className="flex items-center gap-1.5 p-2 bg-slate-50 border-t border-slate-200 text-xs font-bold text-slate-450 select-none shrink-0">
                    {sheets.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setActiveSheetId(s.id)}
                        className={`px-3.5 py-1.5 rounded-lg transition-all ${
                          activeSheetId === s.id
                            ? "bg-white text-[#2562AA] shadow-xs"
                            : "hover:bg-slate-200 hover:text-slate-700 text-slate-500"
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      )}
    </MainLayout>
  );
}
