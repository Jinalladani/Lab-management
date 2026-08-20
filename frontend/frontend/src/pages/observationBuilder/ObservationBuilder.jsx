import React, { useState, useEffect, useMemo, useRef } from "react";
import { evaluateExcelCell } from "../../utils/excelFormulaEvaluator";
import { MainLayout } from "../../components/layout";
import Button from "../../components/ui/Button";
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
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus as LucidePlus,
  Search as LucideSearch,
  Eye as LucideEye,
  Pencil as LucidePencil,
  Trash2 as LucideTrash,
  MoreHorizontal as LucideMoreHorizontal,
  RefreshCw,
  CircleDot,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Beaker,
  Droplet,
  Settings,
  Layers3,
  Activity,
  TestTube2,
  HelpCircle,
  ArrowLeft,
  Eye,
  Save,
  Check
} from "lucide-react";
import { getScopeTests, getScopeHierarchy } from "../../api/scope";
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

const PortalActionMenu = ({ anchorEl, open, onClose, actions }) => {
  const [style, setStyle] = useState(null);

  useEffect(() => {
    if (!open || !anchorEl) return;

    const updatePosition = () => {
      const rect = anchorEl.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const estimatedHeight = actions.length * 36 + 12;
      const dropdownWidth = 150;
      const gap = 6;

      const spaceBelow = viewportHeight - rect.bottom;

      let top;
      if (spaceBelow >= estimatedHeight + gap) {
        top = rect.bottom + window.scrollY + gap;
      } else {
        top = rect.top + window.scrollY - estimatedHeight - gap;
      }

      let left = rect.right - dropdownWidth + window.scrollX;
      if (left < 8) left = 8;
      if (left + dropdownWidth > viewportWidth - 8) {
        left = viewportWidth - dropdownWidth - 8;
      }

      setStyle({
        position: "absolute",
        top: `${top}px`,
        left: `${left}px`,
        width: `${dropdownWidth}px`,
        zIndex: 9999,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    const handleClickOutside = (event) => {
      if (anchorEl && !anchorEl.contains(event.target) && !event.target.closest(".portal-action-menu")) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, anchorEl, onClose, actions]);

  if (!open || !anchorEl || !style) return null;

  return createPortal(
    <div
      style={style}
      className="portal-action-menu bg-white rounded-xl border border-[#E2E8F0] shadow-lg py-1.5 text-left text-slate-800"
    >
      {actions.map((act, idx) => {
        const Icon = act.icon;
        return (
          <button
            key={idx}
            onClick={() => {
              onClose();
              act.onClick();
            }}
            className={`w-full px-4 py-2 text-xs font-semibold flex items-center gap-2 hover:bg-[#FAF9FF] transition-colors ${act.danger ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-[#475569] hover:text-[#243744]"
              }`}
          >
            {Icon && <Icon size={14} />}
            {act.label}
          </button>
        );
      })}
    </div>,
    document.body
  );
};

export default function ObservationBuilder() {
  const [view, setView] = useState("list");
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [activeAnchorEl, setActiveAnchorEl] = useState(null);
  const [mode, setMode] = useState("design");

  // Database managed templates
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Active template reference for updates
  const [activeTemplateId, setActiveTemplateId] = useState(null);

  const [templateName, setTemplateName] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [category, setCategory] = useState("");
  const [paperSize, setPaperSize] = useState("A4 (210 x 297 mm)");
  const [orientation, setOrientation] = useState("Portrait");
  const [isSaving, setIsSaving] = useState(false);

  // Drag Selection states for proper Excel range merges
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });
  const [selectionStart, setSelectionStart] = useState({ row: 0, col: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ row: 0, col: 0 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // Excel double-click edit mode
  const [borderMenuOpen, setBorderMenuOpen] = useState(false);

  const [scopes, setScopes] = useState([]);
  const [selectedScope, setSelectedScope] = useState("");
  const [selectedScopeIds, setSelectedScopeIds] = useState([]);
  const [testSelectorOpen, setTestSelectorOpen] = useState(false);
  const [searchTestQuery, setSearchTestQuery] = useState("");
  const [scopesLoading, setScopesLoading] = useState(false);
  const testSelectorRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (testSelectorRef.current && !testSelectorRef.current.contains(event.target)) {
        setTestSelectorOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
  const [scopeHierarchy, setScopeHierarchy] = useState([]);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [expandedMaterials, setExpandedMaterials] = useState({});
  const [errorMessage, setErrorMessage] = useState("");

  const toggleMaterial = (materialKey) => {
    setExpandedMaterials((prev) => ({
      ...prev,
      [materialKey]: !prev[materialKey],
    }));
  };

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
      setErrorMessage("");
      const res = await getObservationTemplates();
      if (res.data && res.data.success) {
        setTemplates(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load templates from database:", err);
      setTemplates([]);
      setErrorMessage("Failed to load templates from database.");
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

  const fetchHierarchy = async () => {
    try {
      setHierarchyLoading(true);
      const res = await getScopeHierarchy();
      const nextScopeData = res.data?.data || [];
      setScopeHierarchy(nextScopeData);
      if (nextScopeData.length > 0) {
        const exists = nextScopeData.some(g => g.group_id === selectedGroupId);
        if (!exists) {
          setSelectedGroupId(nextScopeData[0].group_id);
        }
      } else {
        setSelectedGroupId(null);
      }
    } catch (error) {
      console.error("Failed to fetch scope hierarchy:", error);
    } finally {
      setHierarchyLoading(false);
    }
  };

  useEffect(() => {
    const rawUser = localStorage.getItem("user");
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        if (parsed.role !== "superadmin" && parsed.role !== "super_admin") {
          toast.error("Access Denied: Observation Form Builder is only accessible to Super Admins.");
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 2000);
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchScopes();
    fetchTemplates();
    fetchHierarchy();
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

  const evaluatePreviewCell = (label, cellData, evaluating = new Set()) => {
    if (cellData && cellData.type === "formula" && cellData.formula) {
      return evaluateExcelCell(cellData.formula, cells, evaluating);
    }
    return cellData ? evaluateExcelCell(cellData.value, cells, evaluating) : "";
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
        setSelectedScope(fullTmpl.scope_test_id || "");
        setSelectedScopeIds(fullTmpl.scope_test_ids || (fullTmpl.scope_test_id ? [fullTmpl.scope_test_id] : []));
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
    if (selectedScopeIds.length === 0) {
      toast.error("Please map at least one test scope first!");
      return;
    }
    try {
      const payload = {
        name: templateName,
        scope_test_id: selectedScopeIds[0],
        scope_test_ids: selectedScopeIds,
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

  const handleCreateNew = (scopeTestId, testName) => {
    setActiveTemplateId(null);
    setTemplateName(testName ? `${testName} Observation Sheet` : "");
    setVersion("1.0.0");
    if (scopeTestId) {
      setSelectedScope(scopeTestId);
      setSelectedScopeIds([scopeTestId]);
    } else if (scopes.length > 0) {
      setSelectedScope(scopes[0].scope_test_id);
      setSelectedScopeIds([scopes[0].scope_test_id]);
    } else {
      setSelectedScope("");
      setSelectedScopeIds([]);
    }
    setSheetsData({});
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

  const getGroupVisuals = (name = "") => {
    const norm = name.toLowerCase();
    let IconComp = Beaker;
    if (norm.includes("water")) {
      IconComp = Droplet;
    } else if (norm.includes("metal") || norm.includes("mechanical")) {
      IconComp = Settings;
    } else if (norm.includes("soil") || norm.includes("geotechnical")) {
      IconComp = Layers3;
    } else if (norm.includes("destructive")) {
      IconComp = Activity;
    } else if (norm.includes("chemical")) {
      IconComp = FlaskConical;
    }
    return {
      icon: IconComp,
      bgColor: "bg-[#243744]/5",
      iconColor: "text-[#243744]",
    };
  };

  const visibleGroups = useMemo(() => {
    const query = listSearch.toLowerCase().trim();

    // Show only tests that already have created templates
    const templatesCreatedOnly = scopeHierarchy
      .map((group) => {
        const materials = (group.materials || [])
          .map((material) => {
            const tests = (material.tests || []).filter((test) => {
              return templates.some((t) => t.scope_test_id === test.scope_test_id || (t.scope_test_ids && t.scope_test_ids.includes(test.scope_test_id)));
            });

            if (tests.length > 0) {
              return { ...material, tests };
            }
            return null;
          })
          .filter(Boolean);

        if (materials.length > 0) {
          return { ...group, materials };
        }
        return null;
      })
      .filter(Boolean);

    if (!query) return templatesCreatedOnly;

    return templatesCreatedOnly
      .map((group) => {
        const groupMatches = group.group_name.toLowerCase().includes(query);
        const materials = (group.materials || [])
          .map((material) => {
            const materialMatches = material.material_name.toLowerCase().includes(query);
            const tests = material.tests || [];
            const matchingTests = tests.filter((test) =>
              test.test_name.toLowerCase().includes(query) ||
              (test.test_method && test.test_method.toLowerCase().includes(query))
            );

            if (groupMatches || materialMatches) return material;
            if (matchingTests.length) return { ...material, tests: matchingTests };
            return null;
          })
          .filter(Boolean);

        if (groupMatches || materials.length) {
          return { ...group, materials };
        }
        return null;
      })
      .filter(Boolean);
  }, [scopeHierarchy, templates, listSearch]);

  const activeGroup = useMemo(() => {
    if (visibleGroups.length === 0) return null;
    const found = visibleGroups.find((g) => g.group_id === selectedGroupId);
    return found || visibleGroups[0];
  }, [visibleGroups, selectedGroupId]);

  return (
    <MainLayout headerTitle="Sheet Builder" headerSubtitle="Observation Sheets Template Catalogue">
      <Toaster position="top-right" richColors />

      {view === "list" ? (
        /* 1. Dual Pane Templates & Scopes View */
        <div className="mx-auto w-full max-w-[1800px] h-full p-4 sm:p-5 lg:p-6 flex flex-col lg:h-[calc(100vh-100px)] lg:overflow-hidden select-none">

          {/* Controls & Stats Bar */}
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2E8F0] pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#243744]/5 text-[#243744] px-3 py-1 text-xs font-bold border border-[#243744]/15">
                <Layers3 size={13} />
                {scopeHierarchy.length} Groups
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#243744]/5 text-[#243744] px-3 py-1 text-xs font-bold border border-[#243744]/15">
                <TestTube2 size={13} />
                {templates.length} Templates Created
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-10 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 focus-within:border-[#243744] focus-within:ring-2 focus-within:ring-[#243744]/10 transition-all min-w-[240px]">
                <LucideSearch size={16} className="text-[#94A3B8] shrink-0" />
                <input
                  type="text"
                  placeholder="Search scopes, materials, or tests..."
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  className="w-full bg-transparent text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none"
                />
              </div>

              <button
                type="button"
                onClick={async () => {
                  await fetchTemplates();
                  await fetchHierarchy();
                }}
                className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] px-4 text-xs font-bold text-[#475569] transition-colors"
              >
                <RefreshCw size={14} className="text-[#8A97A4]" />
                Refresh
              </button>

              <button
                type="button"
                onClick={() => handleCreateNew()}
                className="flex h-10 items-center gap-1.5 rounded-xl bg-[#243744] px-4 text-xs font-bold text-white shadow-sm hover:bg-[#1A2733] transition-colors"
              >
                <LucidePlus size={14} />
                Create Blank Sheet
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 rounded-xl border border-[#FEE2E2] bg-[#FEF2F2] px-4 py-3 text-sm font-semibold text-[#EF4444] shrink-0">
              {errorMessage}
            </div>
          )}

          {/* Loading state */}
          {templatesLoading || hierarchyLoading ? (
            <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
              {/* Left Pane Skeleton */}
              <div className="w-full lg:w-[360px] shrink-0 bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-4 shadow-sm h-[280px] lg:h-full">
                <div className="h-6 bg-[#F1F5F9] rounded w-1/2 animate-pulse" />
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-[#F8FAFC] rounded-xl animate-pulse" />
                ))}
              </div>
              {/* Right Pane Skeleton */}
              <div className="flex-1 bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-6 shadow-sm">
                <div className="space-y-2 animate-pulse">
                  <div className="h-8 bg-[#F1F5F9] rounded w-1/3" />
                  <div className="h-4 bg-[#F1F5F9] rounded w-1/4" />
                </div>
                <div className="h-48 bg-[#F8FAFC] rounded-xl animate-pulse" />
              </div>
            </div>
          ) : visibleGroups.length === 0 ? (
            <div className="flex-1 bg-white rounded-2xl border border-[#E2E8F0] p-8 shadow-sm flex items-center justify-center">
              <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-white px-6 py-14 text-center w-full max-w-md">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#243744]/5 text-[#243744]">
                  <FlaskConical size={22} />
                </div>
                <h2 className="mt-4 text-lg font-bold text-[#1A2733]">No matching scope found</h2>
                <p className="mt-1 text-sm text-[#64748B]">Try searching a group, material, or test name.</p>
              </div>
            </div>
          ) : (
            /* Responsive Dual Pane Layout */
            <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-visible lg:overflow-hidden">

              {/* Left Pane: Groups Selector */}
              <div className="w-full lg:w-[360px] shrink-0 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col h-[280px] lg:h-full overflow-hidden">
                <div className="p-4 border-b border-[#F1F5F9] flex items-center justify-between shrink-0">
                  <div>
                    <h2 className="text-base font-bold text-[#1E293B]">Material Groups</h2>
                    <p className="text-xs text-[#64748B] mt-0.5 font-medium">{visibleGroups.length} Groups matched</p>
                  </div>
                </div>

                {/* Group Cards Container */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {visibleGroups.map((group) => {
                    const isActive = group.group_id === activeGroup?.group_id;
                    const groupMaterialsCount = group.materials?.length || 0;
                    const groupTestsCount = group.materials?.reduce((sum, material) => sum + (material.tests?.length || 0), 0) || 0;
                    const visuals = getGroupVisuals(group.group_name);
                    const IconComponent = visuals.icon;

                    return (
                      <div
                        key={group.group_id}
                        onClick={() => setSelectedGroupId(group.group_id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center gap-3 relative ${isActive
                          ? "bg-[#243744] border-[#243744] shadow-md text-white"
                          : "bg-white border-[#E2E8F0] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]"
                          }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isActive
                          ? "bg-white/12 text-white"
                          : `${visuals.bgColor} ${visuals.iconColor}`
                          }`}>
                          <IconComponent size={18} strokeWidth={2.2} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className={`font-bold text-xs truncate ${isActive ? "text-white" : "text-[#1E293B]"}`}>
                            {group.group_name || "Unnamed Group"}
                          </h3>
                          <p className={`text-[11px] mt-0.5 flex items-center gap-1.5 font-medium ${isActive ? "text-white/70" : "text-[#64748B]"
                            }`}>
                            <span>{groupMaterialsCount} Material{groupMaterialsCount === 1 ? "" : "s"}</span>
                            <span className={isActive ? "text-white/30" : "text-[#CBD5E1]"}>•</span>
                            <span>{groupTestsCount} Test{groupTestsCount === 1 ? "" : "s"}</span>
                          </p>
                        </div>

                        <ChevronRight size={14} className={`shrink-0 ${isActive ? "text-white/80" : "text-[#94A3B8]"}`} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Pane: Active Group Details */}
              {activeGroup && (
                <div className="flex-1 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col overflow-visible lg:h-full lg:overflow-hidden">

                  {/* Details Header */}
                  <div className="p-6 border-b border-[#F1F5F9] shrink-0 bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h1 className="text-xl font-extrabold text-[#0F172A] tracking-tight">
                            {activeGroup.group_name}
                          </h1>
                          <span className="inline-flex items-center rounded-full bg-[#F1F5F9] text-[#475569] px-2.5 py-0.5 text-[10px] font-bold border border-[#E2E8F0]">
                            {activeGroup.testing_scope_type === "permanent_testing" ? "Permanent Testing" : "Site Testing"}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-[#64748B] mt-1 uppercase tracking-wider">
                          Test Observation Sheets Template Catalogue
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Materials & Tests Template List */}
                  <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-[#E2E8F0]">
                    {(activeGroup.materials || []).length === 0 ? (
                      <div className="p-8 text-center text-sm text-[#64748B] flex flex-col items-center justify-center h-full min-h-[200px]">
                        <HelpCircle size={24} className="text-[#94A3B8] mb-2" />
                        <p>No materials found under this group.</p>
                      </div>
                    ) : (
                      (activeGroup.materials || []).map((material) => {
                        const materialKey = `${activeGroup.group_id}-${material.material_id}`;
                        const isExpanded = expandedMaterials[materialKey] !== false;
                        const testsCount = material.tests?.length || 0;

                        return (
                          <div key={materialKey} className="bg-white">
                            {/* Material Header */}
                            <div
                              onClick={() => toggleMaterial(materialKey)}
                              className="flex items-center justify-between bg-[#F8FAFC] border-y border-[#E2E8F0] px-6 py-2.5 cursor-pointer hover:bg-[#F1F5F9] transition-colors select-none"
                            >
                              <div className="flex items-center gap-3">
                                <ChevronDown
                                  size={15}
                                  className={`text-[#243744] transition-transform duration-200 ${isExpanded ? "" : "-rotate-90"}`}
                                />
                                <CircleDot size={15} className="text-[#243744]" />
                                <span className="text-xs font-bold text-[#243744]">
                                  {material.material_name}
                                </span>
                              </div>
                              <span className="inline-flex items-center rounded-full bg-white text-[#243744] px-2.5 py-0.5 text-[10px] font-bold border border-[#E2E8F0]">
                                {testsCount} Test{testsCount === 1 ? "" : "s"}
                              </span>
                            </div>

                            {/* Tests rows */}
                            <AnimatePresence initial={false}>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.18 }}
                                  className="overflow-hidden"
                                >
                                  {testsCount === 0 ? (
                                    <div className="px-6 py-4 text-[11px] text-[#64748B] italic bg-[#F8FAFC]">
                                      No tests associated with this material.
                                    </div>
                                  ) : (
                                    <div className="bg-white overflow-x-auto">
                                      <div className="grid grid-cols-[1.2fr_1fr_1.2fr_150px_90px] gap-4 px-6 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] text-[9px] font-bold text-[#243744] uppercase tracking-wider min-w-[650px]">
                                        <span>Test Name</span>
                                        <span>Test Method</span>
                                        <span>Template Name / Version</span>
                                        <span>Status</span>
                                        <span className="text-right">Actions</span>
                                      </div>

                                      {(material.tests || []).map((test) => {
                                        const testKey = test.scope_test_id || `${material.material_id}-${test.test_name}`;
                                        const tmpl = templates.find(t => t.scope_test_id === test.scope_test_id || (t.scope_test_ids && t.scope_test_ids.includes(test.scope_test_id)));

                                        return (
                                          <div key={testKey} className="grid grid-cols-[1.2fr_1fr_1.2fr_150px_90px] gap-4 px-6 py-3 items-center border-b border-[#F1F5F9] hover:bg-[#F8FAFC]/50 transition-colors min-w-[650px]">
                                            <span className="text-xs font-semibold text-[#1E293B] truncate" title={test.test_name}>
                                              {test.test_name}
                                            </span>
                                            <span className="text-xs font-medium text-[#475569] font-mono truncate" title={test.test_method}>
                                              {test.test_method || "N/A"}
                                            </span>

                                            {tmpl ? (
                                              <>
                                                <span className="text-xs font-bold text-[#243744] truncate" title={tmpl.name}>
                                                  {tmpl.name} <span className="text-[10px] font-semibold text-[#64748B] ml-1 bg-[#F1F5F9] px-1.5 py-0.5 rounded">v{tmpl.version}</span>
                                                </span>
                                                <span className="flex items-center gap-1.5 text-xs font-semibold">
                                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#10B981] border border-[#D1FAE5]">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                                                    {tmpl.status}
                                                  </span>
                                                </span>
                                                <div className="flex items-center justify-end gap-1.5">
                                                  <button
                                                    onClick={() => handleEditTemplate(tmpl)}
                                                    className="p-1 hover:bg-[#F1F5F9] rounded text-slate-500 hover:text-[#243744] transition-colors"
                                                    title="Edit Template"
                                                  >
                                                    <LucidePencil size={14} />
                                                  </button>
                                                  <button
                                                    onClick={() => handleDeleteTemplate(tmpl.template_id)}
                                                    className="p-1 hover:bg-red-50 rounded text-red-500 hover:text-red-700 transition-colors"
                                                    title="Delete Template"
                                                  >
                                                    <LucideTrash size={14} />
                                                  </button>
                                                </div>
                                              </>
                                            ) : (
                                              <>
                                                <span className="text-xs text-slate-400 italic font-medium">No template designed</span>
                                                <span className="flex items-center gap-1.5 text-xs font-semibold">
                                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#D97706] border border-[#FEF3C7]">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                                                    Pending
                                                  </span>
                                                </span>
                                                <div className="flex items-center justify-end">
                                                  <button
                                                    onClick={() => handleCreateNew(test.scope_test_id, test.test_name)}
                                                    className="flex items-center gap-1 px-2 py-1 bg-[#243744]/5 text-[#243744] hover:bg-[#243744]/10 rounded font-bold text-[10px] transition-colors"
                                                    title="Create Template"
                                                  >
                                                    <LucidePlus size={10} />
                                                    Design
                                                  </button>
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* 2. Full-Width Spreadsheet Form Builder */
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-[#F8FAFC]">

          {/* Top Header Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 py-3 shadow-2xs z-40">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                icon={ArrowLeft}
                onClick={() => setView("list")}
              >
                Back
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 justify-end">
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                title="Undo"
              >
                <UndoIcon style={{ fontSize: 15 }} />
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                title="Redo"
              >
                <RedoIcon style={{ fontSize: 15 }} />
              </button>

              <div className="h-4 w-px bg-slate-200 mx-1" />

              <Button
                variant="secondary"
                size="sm"
                icon={Eye}
                onClick={() => setMode(mode === "design" ? "preview" : "design")}
              >
                Preview
              </Button>

              <Button
                variant="secondary"
                size="sm"
                icon={Save}
                loading={isSaving}
                onClick={handlePublishTemplate}
              >
                Save Draft
              </Button>

              <Button
                variant="primary"
                size="sm"
                icon={Check}
                loading={isSaving}
                onClick={handlePublishTemplate}
              >
                Publish
              </Button>
            </div>
          </div>

          {/* Header Metadata Fields Bar (Responsive Layout) */}
          <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 shadow-2xs relative z-30">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 lg:gap-5 min-w-max sm:min-w-0">
              {/* Template Name * */}
              <div className="flex flex-col gap-1 min-w-[200px] sm:min-w-[220px] flex-1 max-w-full sm:max-w-xs">
                <label className="text-[11px] font-bold text-slate-700">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Enter template name..."
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-[#243744] focus:outline-none focus:ring-1 focus:ring-[#243744]"
                />
              </div>

              {/* Test Name * Multi-Select Dropdown */}
              <div ref={testSelectorRef} className="relative flex flex-col gap-1 min-w-[200px] sm:min-w-[240px] flex-1 max-w-full sm:max-w-xs">
                <label className="text-[11px] font-bold text-slate-700">
                  Test Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setTestSelectorOpen(!testSelectorOpen)}
                    className="h-9 w-full flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-[#243744] focus:outline-none focus:ring-1 focus:ring-[#243744] cursor-pointer shadow-2xs"
                  >
                    <span className="truncate pr-2">
                      {selectedScopeIds.length === 0
                        ? "Select Test Name..."
                        : selectedScopeIds.length === 1
                        ? (scopes.find((s) => String(s.scope_test_id) === String(selectedScopeIds[0]))?.test_name || `${selectedScopeIds.length} Test Selected`)
                        : `${selectedScopeIds.length} Tests Selected`}
                    </span>
                    <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />
                  </button>

                  {/* Dropdown Menu Popup */}
                  {testSelectorOpen && (
                    <div className="absolute left-0 top-full mt-1.5 z-50 w-80 sm:w-84 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl space-y-2">
                      {/* Dropdown Header */}
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="text-xs font-extrabold text-slate-800">Select Test(s)</span>
                        <button
                          type="button"
                          onClick={() => setTestSelectorOpen(false)}
                          className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-100 transition-colors"
                        >
                          <LucideTrash size={14} className="hidden" />
                          <span className="text-sm font-bold">×</span>
                        </button>
                      </div>

                      {/* Search inside Dropdown */}
                      <div className="relative">
                        <LucideSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={searchTestQuery}
                          onChange={(e) => setSearchTestQuery(e.target.value)}
                          placeholder="Search tests by name..."
                          className="w-full rounded-lg border border-slate-200 pl-8 pr-2.5 py-1.5 text-xs text-slate-800 focus:border-[#243744] focus:outline-none font-medium"
                        />
                      </div>

                      {/* List of Scopes with Checkboxes */}
                      <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                        {scopes
                          .filter((sc) => sc.test_name.toLowerCase().includes(searchTestQuery.toLowerCase()))
                          .map((sc) => {
                            const isChecked = selectedScopeIds.includes(sc.scope_test_id);
                            return (
                              <label
                                key={sc.scope_test_id}
                                className={`flex items-center gap-2.5 rounded-lg border p-2 text-xs font-semibold cursor-pointer transition-colors ${
                                  isChecked
                                    ? "border-[#243744]/30 bg-[#243744]/5 text-[#243744]"
                                    : "border-slate-100 hover:bg-slate-50 text-slate-800"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      const nextIds = selectedScopeIds.filter((id) => id !== sc.scope_test_id);
                                      setSelectedScopeIds(nextIds);
                                      if (nextIds.length > 0) setSelectedScope(nextIds[0]);
                                    } else {
                                      const nextIds = [...selectedScopeIds, sc.scope_test_id];
                                      setSelectedScopeIds(nextIds);
                                      setSelectedScope(nextIds[0]);
                                      if (!templateName) setTemplateName(sc.test_name);
                                    }
                                  }}
                                  className="h-4 w-4 rounded border-slate-300 text-[#243744] focus:ring-[#243744] cursor-pointer"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-slate-900 truncate">{sc.test_name}</p>
                                  {sc.test_method && (
                                    <p className="text-[10px] text-slate-500 font-mono truncate">{sc.test_method}</p>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                      </div>

                      {/* Bottom Actions */}
                      <div className="border-t pt-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              const allIds = scopes.map((s) => s.scope_test_id);
                              setSelectedScopeIds(allIds);
                              if (allIds.length > 0) setSelectedScope(allIds[0]);
                            }}
                            className="text-[#243744] font-bold hover:underline"
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedScopeIds([]);
                              setSelectedScope("");
                            }}
                            className="text-slate-500 font-bold hover:underline"
                          >
                            Clear All
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTestSelectorOpen(false)}
                          className="px-3 py-1 bg-[#243744] text-white rounded-lg text-[11px] font-bold shadow-2xs hover:bg-[#1A2733]"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Template Category */}
              <div className="flex flex-col gap-1 min-w-[160px] sm:min-w-[180px] flex-1 max-w-full sm:max-w-[220px]">
                <label className="text-[11px] font-bold text-slate-700">
                  Template Category
                </label>
                <select
                  value={category || ""}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-[#243744] focus:outline-none focus:ring-1 focus:ring-[#243744] cursor-pointer"
                >
                  <option value="">Select Category...</option>
                  <option value="Soil Testing">Soil Testing</option>
                  <option value="Concrete Testing">Concrete Testing</option>
                  <option value="Bitumen Testing">Bitumen Testing</option>
                  <option value="Steel Testing">Steel Testing</option>
                  <option value="Aggregate Testing">Aggregate Testing</option>
                  <option value="Chemical Testing">Chemical Testing</option>
                  <option value="General Testing">General Testing</option>
                </select>
              </div>

              {/* Divider */}
              <div className="hidden lg:block h-8 w-px bg-slate-200 self-end mb-1 mx-1" />

              {/* Paper Size */}
              <div className="flex flex-col gap-1 min-w-[150px] sm:min-w-[170px] flex-1">
                <label className="text-[11px] font-bold text-slate-700">
                  Paper Size
                </label>
                <select
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-[#243744] focus:outline-none focus:ring-1 focus:ring-[#243744] cursor-pointer"
                >
                  <option value="A4 (210 x 297 mm)">A4 (210 x 297 mm)</option>
                  <option value="A3 (297 x 420 mm)">A3 (297 x 420 mm)</option>
                  <option value="Letter (216 x 279 mm)">Letter (216 x 279 mm)</option>
                  <option value="Legal (216 x 356 mm)">Legal (216 x 356 mm)</option>
                </select>
              </div>

              {/* Orientation */}
              <div className="flex flex-col gap-1 min-w-[120px] sm:min-w-[130px] flex-1">
                <label className="text-[11px] font-bold text-slate-700">
                  Orientation
                </label>
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-[#243744] focus:outline-none focus:ring-1 focus:ring-[#243744] cursor-pointer"
                >
                  <option value="Portrait">Portrait</option>
                  <option value="Landscape">Landscape</option>
                </select>
              </div>
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

              <button onClick={() => updateActiveCellProp("style", "fontWeight", activeCellState.style?.fontWeight === "bold" ? "normal" : "bold")} className={`w-7 h-7 rounded flex items-center justify-center font-bold transition-all ${activeCellState.style?.fontWeight === "bold" ? "bg-slate-200 text-blue-600" : "hover:bg-slate-100"}`}>B</button>
              <button onClick={() => updateActiveCellProp("style", "fontStyle", activeCellState.style?.fontStyle === "italic" ? "normal" : "italic")} className={`w-7 h-7 rounded flex items-center justify-center italic transition-all ${activeCellState.style?.fontStyle === "italic" ? "bg-slate-200 text-blue-600" : "hover:bg-slate-100"}`}>I</button>
              <button onClick={() => updateActiveCellProp("style", "textDecoration", activeCellState.style?.textDecoration === "underline" ? "none" : "underline")} className={`w-7 h-7 rounded flex items-center justify-center underline font-semibold transition-all ${activeCellState.style?.textDecoration === "underline" ? "bg-slate-200 text-blue-600" : "hover:bg-slate-100"}`}>U</button>

              <select
                value={activeCellState.style?.fontFamily || "Arial"}
                onChange={(e) => updateActiveCellProp("style", "fontFamily", e.target.value)}
                className="h-7 px-2 border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-655 rounded-lg outline-none cursor-pointer hover:bg-slate-100"
                title="Font Family"
              >
                <option value="Arial">Arial</option>
                <option value="Calibri">Calibri</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Georgia">Georgia</option>
                <option value="Segoe UI">Segoe UI</option>
                <option value="Roboto">Roboto</option>
                <option value="Verdana">Verdana</option>
                <option value="Courier New">Courier New</option>
              </select>

              <select
                value={activeCellState.style?.fontSize || "12px"}
                onChange={(e) => updateActiveCellProp("style", "fontSize", e.target.value)}
                className="h-7 px-2 border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-655 rounded-lg outline-none cursor-pointer hover:bg-slate-100"
                title="Font Size"
              >
                <option value="9px">9px</option>
                <option value="10px">10px</option>
                <option value="11px">11px</option>
                <option value="12px">12px</option>
                <option value="13px">13px</option>
                <option value="14px">14px</option>
                <option value="16px">16px</option>
                <option value="18px">18px</option>
                <option value="20px">20px</option>
                <option value="24px">24px</option>
              </select>

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

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRowsCount(rowsCount + 1)}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 shadow-3xs flex items-center gap-1"
                title="Add 1 Row at the bottom"
              >
                + Row
              </button>
              <button
                type="button"
                onClick={() => setColsCount(colsCount + 1)}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 shadow-3xs flex items-center gap-1"
                title="Add 1 Column at the right"
              >
                + Col
              </button>
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
            <div className="w-full space-y-5">

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
                                  fontSize: cellStyle.fontSize || "inherit",
                                  fontFamily: cellStyle.fontFamily || "inherit",
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
                                    style={{ textAlign: cellStyle.alignment || "left", color: cellStyle.color || "inherit", fontSize: cellStyle.fontSize || "inherit", fontFamily: cellStyle.fontFamily || "inherit" }}
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
                                    className="w-full h-full px-2 outline-none text-left bg-transparent"
                                    style={{ textAlign: cellStyle.alignment || "left", fontSize: cellStyle.fontSize || "inherit", fontFamily: cellStyle.fontFamily || "inherit", color: cellStyle.color || "inherit" }}
                                  />
                                ) : (
                                  <div
                                    className="w-full h-full px-2.5 py-1.5 overflow-hidden truncate"
                                    style={{ textAlign: cellStyle.alignment || "left", fontSize: cellStyle.fontSize || "inherit", fontFamily: cellStyle.fontFamily || "inherit", color: cellStyle.color || "inherit" }}
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
