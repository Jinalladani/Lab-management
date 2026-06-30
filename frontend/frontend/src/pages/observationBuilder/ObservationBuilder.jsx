import React, { useState, useEffect } from "react";
import { MainLayout } from "../../components/layout";
import {
  Undo as UndoIcon,
  Redo as RedoIcon,
  PlayArrow as PreviewIcon,
  CloudUpload as ImportIcon,
  GetApp as ExportIcon,
  Search as SearchIcon,
  Add as AddIcon,
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
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatUnderlined as UnderlineIcon,
  FormatAlignLeft as AlignLeftIcon,
  FormatAlignCenter as AlignCenterIcon,
  FormatAlignRight as AlignRightIcon,
  FormatAlignJustify as AlignJustifyIcon,
  TableChart as TableIcon,
  Calculate as FormulaIcon,
  BarChart as ChartIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Science as ScienceIcon,
  CheckCircle as CheckIcon,
  FormatColorFill as FillIcon,
  FormatColorText as ColorTextIcon,
  ZoomOut as ZoomOutIcon,
  ZoomIn as ZoomInIcon,
} from "@mui/icons-material";
import { getScopeTests } from "../../api/scope";
import {
  getObservationTemplates,
  getObservationTemplate,
  createObservationTemplate,
  updateObservationTemplate,
  deleteObservationTemplate
} from "../../api/observationBuilder";
import { toast, Toaster } from "sonner";

function roundVal(val, decimals) {
  if (isNaN(val) || val === null || val === undefined) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

const CELL_BORDER_STYLE = "0.02px solid #757679";
const CELL_BORDER_KEYS = ["borderTop", "borderRight", "borderBottom", "borderLeft"];

export default function ObservationBuilder() {
  // View states: 'list' | 'builder'
  const [view, setView] = useState("list");

  // Mode: 'design' | 'preview'
  const [mode, setMode] = useState("design");

  // Database managed templates
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Active template reference for updates
  const [activeTemplateId, setActiveTemplateId] = useState(null);

  const [templateName, setTemplateName] = useState("New Lab Observation Template");
  const [version, setVersion] = useState("1.0.0");

  // Drag Selection states for proper Excel range merges
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });
  const [selectionStart, setSelectionStart] = useState({ row: 0, col: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ row: 0, col: 0 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // Excel double-click edit mode
  const [borderMenuOpen, setBorderMenuOpen] = useState(false);

  // Test Scopes from API
  const [scopes, setScopes] = useState([]);
  const [selectedScope, setSelectedScope] = useState("");
  const [scopesLoading, setScopesLoading] = useState(false);

  // Spreadsheet canvas grid parameters
  const [colsCount, setColsCount] = useState(12);
  const [rowsCount, setRowsCount] = useState(15);

  // Undo/Redo States
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Zoom
  const [zoomLevel, setZoomLevel] = useState(100);

  // Search in templates list view
  const [listSearch, setListSearch] = useState("");

  // Sheets management states
  const [activeSheetId, setActiveSheetId] = useState("sheet1");
  const [sheets, setSheets] = useState([{ id: "sheet1", name: "Sheet 1" }]);
  const [sheetsData, setSheetsData] = useState({
  });

  const cells = sheetsData[activeSheetId] || {};

  const setCells = (updater) => {
    setSheetsData((prev) => {
      const currentCells = prev[activeSheetId] || {};
      const nextCells = typeof updater === "function" ? updater(currentCells) : updater;
      const nextSheetsData = { ...prev, [activeSheetId]: nextCells };
      pushHistory(nextSheetsData, merges);
      return nextSheetsData;
    });
  };

  const [merges, setMerges] = useState([]);

  // Get boundaries of active selection
  const minRow = Math.min(selectionStart.row, selectionEnd.row);
  const maxRow = Math.max(selectionStart.row, selectionEnd.row);
  const minCol = Math.min(selectionStart.col, selectionEnd.col);
  const maxCol = Math.max(selectionStart.col, selectionEnd.col);

  // Fetch templates from Backend Database
  const fetchTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const res = await getObservationTemplates();
      if (res.data && res.data.success) {
        setTemplates(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load templates from database:", err);
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  };

  // Fetch scopes from API on load
  const fetchScopes = async () => {
    try {
      setScopesLoading(true);
      const response = await getScopeTests();
      const fetched = response.data?.data || [];
      setScopes(fetched);
      if (fetched.length > 0) {
        setSelectedScope(fetched[0].scope_test_id);
      }
    } catch (err) {
      console.error("Scope API fetch failed:", err);
      setScopes([]);
    } finally {
      setScopesLoading(false);
    }
  };

  useEffect(() => {
    fetchScopes();
    fetchTemplates();
    setHistory([{ sheetsData, merges }]);
    setHistoryIndex(0);
  }, []);

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
      toast.info("Undo action completed");
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setSheetsData(next.sheetsData);
      setMerges(next.merges);
      setHistoryIndex(historyIndex + 1);
      toast.info("Redo action completed");
    }
  };

  const getCellLabel = (row, col) => {
    const letter = String.fromCharCode(65 + col);
    return `${letter}${row + 1}`;
  };

  const handleSelectCell = (row, col) => {
    setSelectedCell({ row, col });
  };

  const activeLabel = getCellLabel(selectedCell.row, selectedCell.col);
  const activeCellState = cells[activeLabel] || { value: "", type: "text", style: {}, validation: {} };

  const updateActiveCellProp = (field, key, val) => {
    setCells((prev) => {
      const current = prev[activeLabel] || { value: "", type: "text", style: {}, validation: {} };
      let updated = { ...current };

      if (field === "general") {
        updated[key] = val;
      } else if (field === "style") {
        updated.style = { ...updated.style, [key]: val };
      } else if (field === "validation") {
        updated.validation = { ...updated.validation, [key]: val };
      }

      return { ...prev, [activeLabel]: updated };
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
    setCells((prev) => {
      const next = { ...prev };

      for (let row = minRow; row <= maxRow; row += 1) {
        for (let col = minCol; col <= maxCol; col += 1) {
          const label = getCellLabel(row, col);
          const current = next[label] || { value: "", type: "label", style: {}, validation: {} };
          const nextStyle = { ...(current.style || {}) };
          const borderUpdates = getBorderUpdates(borderType, row, col);

          Object.entries(borderUpdates).forEach(([key, value]) => {
            if (value === undefined) {
              delete nextStyle[key];
            } else {
              nextStyle[key] = value;
            }
          });

          next[label] = { ...current, style: nextStyle };
        }
      }

      return next;
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

  // Perform dynamic Excel merge on selected grid range
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

  // Load a template from backend DB for edit
  const handleEditTemplate = async (tmpl) => {
    try {
      toast.loading("Loading template data...");
      const res = await getObservationTemplate(tmpl.template_id);
      toast.dismiss();
      if (res.data && res.data.success) {
        const fullTmpl = res.data.data;
        setActiveTemplateId(fullTmpl.template_id);
        setTemplateName(fullTmpl.name);
        setVersion(fullTmpl.version || "1.0.0");
        setSelectedScope(fullTmpl.scope_test_id);
        setSheetsData(fullTmpl.sheets_data || {
          sheet1: {
            "A1": { value: "Specimen ID", type: "label", style: { fontWeight: "bold" } }
          }
        });

        // Derive sheets tabs list from sheets_data keys
        const sheetKeys = Object.keys(fullTmpl.sheets_data || {});
        if (sheetKeys.length > 0) {
          setSheets(sheetKeys.map((key, idx) => ({ id: key, name: `Sheet ${idx + 1}` })));
          setActiveSheetId(sheetKeys[0]);
        } else {
          setSheets([{ id: "sheet1", name: "Sheet 1" }]);
          setActiveSheetId("sheet1");
        }

        setMerges(fullTmpl.merges_data || []);
        setMode("design");
        setView("builder");
        toast.success("Loaded template configuration from database");
      }
    } catch (err) {
      toast.dismiss();
      console.error(err);
      toast.error("Failed to load template from database.");
    }
  };

  // Publish / Save layout to Backend DB
  const handlePublishTemplate = async () => {
    if (!selectedScope) {
      toast.error("Please select an associated test scope first!");
      return;
    }
    try {
      const payload = {
        name: templateName,
        scope_test_id: parseInt(selectedScope),
        version: version,
        status: "Published",
        sheets_data: sheetsData,
        merges_data: merges
      };

      toast.loading("Saving observation layout to database...");
      let res;
      if (activeTemplateId) {
        res = await updateObservationTemplate(activeTemplateId, payload);
      } else {
        res = await createObservationTemplate(payload);
      }
      toast.dismiss();

      if (res.data && res.data.success) {
        toast.success("Observations template saved and registered in database successfully!");
        fetchTemplates();
        setView("list");
      }
    } catch (err) {
      toast.dismiss();
      toast.error("Failed to save template to database: " + (err.response?.data?.message || err.message));
    }
  };

  const handleCreateNew = () => {
    setActiveTemplateId(null);
    setTemplateName("New Lab Observation Template");
    setVersion("1.0.0");
    if (scopes.length > 0) {
      setSelectedScope(scopes[0].scope_test_id);
    }
    setSheetsData({
      // sheet1: {
      //   "A1": { value: "Observations Entry", type: "label", style: { fontWeight: "bold", backgroundColor: "#f1f5f9" } },
      //   "B1": { value: "100", type: "number" },
      //   "C1": { value: "200", type: "formula", formula: "=B1*2", style: { backgroundColor: "#f0fdf4" } },
      // }
    });
    setSheets([{ id: "sheet1", name: "Sheet 1" }]);
    setActiveSheetId("sheet1");
    setMerges([]);
    setMode("design");
    setView("builder");
    toast.success("Loaded blank spreadsheet workspace");
  };

  const handleDeleteTemplate = async (id) => {
    try {
      toast.loading("Deleting template record...");
      const res = await deleteObservationTemplate(id);
      toast.dismiss();
      if (res.data && res.data.success) {
        toast.success("Template deleted successfully");
        fetchTemplates();
      }
    } catch (err) {
      toast.dismiss();
      toast.error("Failed to delete template from database");
    }
  };

  const handleAddSheet = () => {
    const nextNum = sheets.length + 1;
    const newId = `sheet${nextNum}`;
    setSheets([...sheets, { id: newId, name: `Sheet ${nextNum}` }]);
    setSheetsData((prev) => {
      const updated = {
        ...prev,
        [newId]: {
          "A1": { value: `Sheet ${nextNum} Matrix`, type: "label", style: { fontWeight: "bold", backgroundColor: "#f1f5f9" } }
        }
      };
      pushHistory(updated, merges);
      return updated;
    });
    setActiveSheetId(newId);
    toast.success(`Created Sheet ${nextNum}`);
  };

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(listSearch.toLowerCase()) ||
    (t.test_name && t.test_name.toLowerCase().includes(listSearch.toLowerCase()))
  );

  return (
    <MainLayout>
      <Toaster position="top-right" richColors />

      {view === "list" ? (
        /* 1. Templates List View */
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Observation Templates Master</h1>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                Configure NABL-compliant observation input matrices and calculation rules for lab test scopes.
              </p>
            </div>
            <button
              onClick={handleCreateNew}
              className="px-4.5 py-2.5 bg-[#2562AA] text-white hover:bg-[#1e4f8a] rounded-xl text-xs font-bold transition-all shadow flex items-center gap-1.5"
            >
              <AddIcon fontSize="small" />
              Create Template
            </button>
          </div>

          <div className="flex items-center gap-2 border border-slate-200/80 bg-white rounded-xl px-3.5 py-2 max-w-md shadow-2xs">
            <SearchIcon style={{ fontSize: 18 }} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search templates or test scopes..."
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              className="w-full bg-transparent border-none text-xs outline-none text-slate-800"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/85 overflow-hidden shadow-xs">
            {templatesLoading ? (
              <div className="p-10 text-center text-xs font-bold text-slate-400 animate-pulse">Loading templates from database...</div>
            ) : filteredTemplates.length === 0 ? (
              <div className="p-10 text-center text-xs font-bold text-slate-400">No templates found. Click 'Create Template' to design one.</div>
            ) : (
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-black h-10 select-none text-[10px] uppercase tracking-wider">
                    <th className="px-5">Template Name</th>
                    <th className="px-5">Associated Scope Test</th>
                    <th className="px-5">Test Method</th>
                    <th className="px-4 text-center">Version</th>
                    <th className="px-4 text-center">Status</th>
                    <th className="px-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                  {filteredTemplates.map((tmpl) => (
                    <tr key={tmpl.template_id} className="hover:bg-slate-50/30 transition-all h-12">
                      <td className="px-5 font-bold text-slate-900">{tmpl.name}</td>
                      <td className="px-5 font-bold text-[#2562AA]">
                        {tmpl.test_name || `Scope ID: ${tmpl.scope_test_id}`}
                      </td>
                      <td className="px-5 text-slate-500 font-bold">{tmpl.test_method || "N/A"}</td>
                      <td className="px-4 text-center">{tmpl.version}</td>
                      <td className="px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${tmpl.status === "Published"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-amber-50 text-amber-700 border border-amber-100"
                          }`}>
                          {tmpl.status}
                        </span>
                      </td>
                      <td className="px-5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEditTemplate(tmpl)}
                            className="p-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-slate-600 transition-all flex items-center justify-center"
                          >
                            <EditIcon style={{ fontSize: 14 }} />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(tmpl.template_id)}
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
        /* 2. Full-Width Spreadsheet Form Builder */
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-[#F8FAFC]">

          {/* Top Header Toolbar */}
          <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200/80 gap-4 shrink-0 shadow-xs z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView("list")}
                className="p-1.5 text-slate-400 hover:text-slate-655 border rounded-lg bg-white shadow-2xs hover:scale-95 transition-all flex items-center justify-center"
              >
                <ArrowBackIcon fontSize="small" />
              </button>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="text-sm font-black text-slate-900 outline-none border-b border-transparent hover:border-slate-350 focus:border-[#2562AA] bg-transparent w-72 px-1"
                placeholder="Template Title"
              />
            </div>

            {/* Scope select */}
            <div className="flex items-center gap-3 flex-1 max-w-xl justify-center select-none">
              <ScienceIcon style={{ fontSize: 16 }} className="text-[#2562AA]" />
              <span className="text-xs font-bold text-slate-450 uppercase tracking-wide">Test Scope</span>
              <select
                value={selectedScope}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedScope(val);
                  const scopeName = scopes.find((s) => s.scope_test_id.toString() === val.toString())?.test_name || "";
                  setTemplateName(`${scopeName} Template`);
                  toast.success(`Selected Scope: ${scopeName}`);
                }}
                className="w-80 px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg font-bold text-xs outline-none text-slate-800"
              >
                {scopesLoading ? (
                  <option>Loading Scopes...</option>
                ) : scopes.length === 0 ? (
                  <option>No Scope Tests Registered</option>
                ) : (
                  scopes.map((sc) => (
                    <option key={sc.scope_test_id} value={sc.scope_test_id}>
                      {sc.test_name} ({sc.test_method})
                    </option>
                  ))
                )}
              </select>
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
                onClick={() => setMode(mode === "design" ? "preview" : "design")}
                className="px-3.5 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-[11px] font-bold flex items-center gap-1.5 text-slate-655"
              >
                <PreviewIcon style={{ fontSize: 14 }} />
                {mode === "design" ? "Preview Mode" : "Design Mode"}
              </button>
              <button
                onClick={handlePublishTemplate}
                className="px-4 py-1.5 bg-[#2562AA] text-white hover:bg-[#1e4f8a] rounded-lg text-[11px] font-bold shadow-xs flex items-center gap-1.5"
              >
                <ExportIcon style={{ fontSize: 13 }} />
                Save Template
              </button>
            </div>
          </div>

          {/* Formatting Ribbon */}
          <div className="flex items-center justify-between px-6 py-2 bg-white border-b border-slate-200 shrink-0 text-xs font-semibold text-slate-650 gap-4">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 font-bold uppercase mr-2 bg-slate-100 px-2 py-0.5 rounded">
                {mode === "design" ? "DESIGN CANVAS" : "PREVIEW WRAPPER"}
              </span>

              {/* Dynamic Selection Merge (Click & Drag Range) */}
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
            <span className="italic font-black text-slate-400 font-serif text-sm">fx</span>
            <input
              type="text"
              value={activeCellState.type === "formula" ? (activeCellState.formula || "=") : (activeCellState.value || "")}
              onChange={(e) => {
                const val = e.target.value;
                if (val.startsWith("=")) {
                  setCells((prev) => ({
                    ...prev,
                    [activeLabel]: {
                      ...(prev[activeLabel] || {}),
                      type: "formula",
                      formula: val,
                      value: val,
                    }
                  }));
                } else {
                  setCells((prev) => ({
                    ...prev,
                    [activeLabel]: {
                      ...(prev[activeLabel] || {}),
                      type: prev[activeLabel]?.type === "formula" ? "label" : (prev[activeLabel]?.type || "label"),
                      formula: "",
                      value: val,
                    }
                  }));
                }
              }}
              className="flex-1 px-3 py-1.5 border border-slate-200 bg-slate-50/50 rounded-lg outline-none font-mono text-xs text-slate-800 focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
              placeholder="Enter text value, or start with '=' for calculations (e.g. =B2*1000/C2)"
            />
          </div>

          {/* Central canvas workspace */}
          <div className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]" onMouseUp={() => setIsSelecting(false)}>
            <div className="max-w-[1100px] mx-auto space-y-5">

              {/* [1] PREVIEW MODE ONLY: HEADER TEMPLATE */}
              {mode === "preview" && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 select-none relative overflow-hidden transition-all duration-200 animate-fade-in">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-slate-100 text-[9px] font-bold text-slate-450 uppercase tracking-wider rounded-bl-xl border-l border-b border-slate-200">
                    Common Standard Lab Header
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-xs font-semibold text-slate-500">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase text-slate-400 block font-bold">Client Details</span>
                      <div className="p-2 bg-slate-50 border rounded-lg text-slate-800 font-bold">CLIENT_NAME</div>
                      <div className="p-2 bg-slate-50 border rounded-lg text-slate-800 font-bold mt-1">PROJECT_NAME</div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase text-slate-400 block font-bold">Sample Details</span>
                      <div className="p-2 bg-slate-50 border rounded-lg text-slate-800 font-bold">SAMPLE_ID</div>
                      <div className="p-2 bg-slate-50 border rounded-lg text-slate-800 font-bold mt-1">SAMPLING_DATE</div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase text-slate-400 block font-bold">Method / Standard</span>
                      <div className="p-2 bg-slate-50 border rounded-lg text-[#2562AA] font-bold">
                        {scopes.find((s) => s.scope_test_id.toString() === selectedScope.toString())?.test_name || "IS 516"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* [2] SPREADSHEET OBSERVATION CANVAS */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col min-h-[400px]">
                <div className="px-4 py-2 border-b bg-slate-50/80 flex items-center justify-between text-[10px] font-bold text-[#2562AA] uppercase tracking-wider border-b border-slate-200">
                  <span>Spreadsheet Observations Grid Matrix</span>
                  <span className="text-slate-400 normal-case font-bold text-[9px]">Click & drag to select multiple cells for range merging</span>
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

                            // Dynamic Range Selection check
                            const isCellInSelection =
                              rIdx >= minRow && rIdx <= maxRow && cIdx >= minCol && cIdx <= maxCol;

                            const isSelected = selectedCell.row === rIdx && selectedCell.col === cIdx;
                            const cellValue = cellState.value || "";

                            const isCalculated = cellState.type === "formula";
                            const displayVal = mode === "preview" ? evaluatePreviewCell(cellLabel, cellState) : cellValue;

                            return (
                              <td
                                key={cellLabel}
                                rowSpan={mergeInfo.rowSpan}
                                colSpan={mergeInfo.colSpan}
                                onMouseDown={(e) => {
                                  if (isSelected && isEditing) return; // Allow input click interactions when active
                                  e.preventDefault();
                                  setIsSelecting(true);
                                  setSelectionStart({ row: rIdx, col: cIdx });
                                  setSelectionEnd({ row: rIdx, col: cIdx });
                                  handleSelectCell(rIdx, cIdx);
                                  setIsEditing(false); // Reset editing on new selection/drag
                                }}
                                onMouseEnter={() => {
                                  if (isSelecting) {
                                    setSelectionEnd({ row: rIdx, col: cIdx });
                                  }
                                }}
                                onDoubleClick={() => {
                                  if (mode === "design") setIsEditing(true);
                                }}
                                className={`p-0 border-r border-b border-slate-200 cursor-cell transition-all relative ${isCellInSelection ? "bg-blue-50/60" : ""
                                  } ${isSelected ? "ring-2 ring-inset ring-blue-600 z-10" : ""
                                  }`}
                                style={{
                                  fontWeight: cellStyle.fontWeight || "normal",
                                  fontStyle: cellStyle.fontStyle || "normal",
                                  textDecoration: cellStyle.textDecoration || "none",
                                  backgroundColor: cellStyle.backgroundColor || (isCellInSelection ? "#eff6ff" : "transparent"),
                                  color: cellStyle.color || "inherit",
                                  borderTop: cellStyle.borderTop,
                                  borderRight: cellStyle.borderRight,
                                  borderBottom: cellStyle.borderBottom,
                                  borderLeft: cellStyle.borderLeft,
                                }}
                              >
                                {renderCellBorderOverlay(cellStyle)}
                                {isSelected && mode === "design" && isEditing ? (
                                  <input
                                    type="text"
                                    value={cellValue}
                                    onChange={(e) => {
                                      setCells((prev) => ({
                                        ...prev,
                                        [cellLabel]: {
                                          ...(prev[cellLabel] || { type: "label", style: {}, validation: {} }),
                                          value: e.target.value,
                                        },
                                      }));
                                    }}
                                    onBlur={() => {
                                      setIsEditing(false);
                                      pushHistory(sheetsData, merges);
                                    }}
                                    className="w-full h-full px-2.5 py-1.5 outline-none text-left bg-transparent text-[11px] font-semibold"
                                    style={{ textAlign: cellStyle.alignment || "left", color: cellStyle.color || "inherit" }}
                                    autoFocus
                                  />
                                ) : mode === "preview" && cellState.type !== "label" && cellState.type !== "formula" ? (
                                  <input
                                    type={cellState.type === "number" ? "number" : "text"}
                                    value={cellValue}
                                    onChange={(e) => {
                                      const nextCells = {
                                        ...cells,
                                        [cellLabel]: { ...cellState, value: e.target.value },
                                      };
                                      setCells(nextCells);
                                    }}
                                    className="w-full h-full px-2 outline-none text-left bg-transparent text-[11px]"
                                    style={{ textAlign: cellStyle.alignment || "left" }}
                                  />
                                ) : (
                                  <div
                                    className="w-full h-full px-2.5 py-1.5 text-[11px] overflow-hidden truncate"
                                    style={{ textAlign: cellStyle.alignment || "left" }}
                                  >
                                    {isCalculated && <span className="text-[8px] font-extrabold text-green-700 bg-green-50 px-1 rounded mr-1">fx</span>}
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
                      className={`px-3.5 py-1.5 rounded-lg transition-all ${activeSheetId === s.id
                          ? "bg-white text-[#2562AA] shadow-xs"
                          : "hover:bg-slate-200 hover:text-slate-700 text-slate-500"
                        }`}
                    >
                      {s.name}
                    </button>
                  ))}
                  <button
                    onClick={handleAddSheet}
                    className="p-1.5 hover:bg-slate-200 text-slate-500 hover:text-[#2562AA] rounded-lg transition-all ml-1.5 flex items-center justify-center"
                    title="Add New Sheet Tab"
                  >
                    <AddIcon style={{ fontSize: 15 }} />
                  </button>
                </div>
              </div>

              {/* [3] PREVIEW MODE ONLY: FOOTER TEMPLATE */}
              {mode === "preview" && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 select-none relative overflow-hidden transition-all duration-200 animate-fade-in">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-slate-100 text-[9px] font-bold text-slate-450 uppercase tracking-wider rounded-bl-xl border-l border-b border-slate-200">
                    Common Standard Lab Footer
                  </div>
                  <div className="grid grid-cols-3 gap-6 text-xs font-bold text-slate-500">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase text-slate-400 block">Remarks</span>
                      <div className="h-16 p-2 bg-slate-50 border rounded-lg text-slate-800 font-semibold italic">
                        Remarks / Notes will be entered here...
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase text-slate-400 block">Signatures / Verifications</span>
                      <div className="p-2.5 bg-slate-50 border rounded-lg text-slate-800 flex justify-between">
                        <span>Tested By:</span>
                        <span className="font-extrabold text-slate-550">TESTER_SIGN</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 border rounded-lg text-slate-800 flex justify-between mt-1.5">
                        <span>Checked By:</span>
                        <span className="font-extrabold text-slate-550">VERIFIER_SIGN</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase text-slate-400 block">NABL Authorized Signatory</span>
                      <div className="h-16 bg-slate-50 border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-[9px] uppercase text-slate-400 tracking-wider">
                        Authorized Signatory Signature
                      </div>
                    </div>
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
