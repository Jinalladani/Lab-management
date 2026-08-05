import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlignLeft, Hash, ListFilter, FileText, Calendar, Clock, CheckSquare,
  CircleDot, Upload, PenTool, Table2, Calculator, Camera, Minus, Heading,
  Info, Eye, Save, Plus, Trash2, Edit3, Monitor, Smartphone, RotateCcw,
  RotateCw, ChevronDown, GripVertical, X, Check, Sparkles, Sigma, Merge,
  Bold, Italic, AlignCenter, Maximize2, FlaskConical, CheckCircle2, Loader2,
  RefreshCw, Search, ArrowLeft, Layers3, FileSpreadsheet, MoreHorizontal,
  ChevronRight, Beaker, Droplet, Settings, Activity, TestTube2, HelpCircle
} from "lucide-react";
import { MainLayout } from "../../../components/layout";
import { Button } from "../../../components/ui";
import { getScopeTests, getScopeHierarchy } from "../../../api/scope";
import {
  getObservationTemplates,
  getObservationTemplate,
  createObservationTemplate,
  updateObservationTemplate,
  deleteObservationTemplate
} from "../../../api/observationBuilder";

// Helper to evaluate simple Excel formulas (e.g. =B1+B2, =100-C1, =B1*0.1)
const evaluateExcelCell = (cellVal, allCellData) => {
  if (!cellVal || typeof cellVal !== "string") return cellVal || "";
  if (!cellVal.startsWith("=")) return cellVal;

  try {
    let expr = cellVal.substring(1).trim();
    expr = expr.replace(/\b([A-Z])([1-9]\d*)\b/g, (match) => {
      const refVal = allCellData?.[match];
      const evalRef = evaluateExcelCell(refVal, allCellData);
      const parsed = parseFloat(evalRef);
      return isNaN(parsed) ? 0 : parsed;
    });

    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${expr})`)();
    return isNaN(result) ? "#VALUE!" : Math.round(result * 100) / 100;
  } catch (err) {
    return "#ERROR!";
  }
};

// Helper to robustly parse template section data from JSON string, array, or sheets_data fallback
const parseSectionsData = (tmpl) => {
  if (!tmpl) return [];
  let sec = tmpl.sections_data || tmpl.sections;

  if (typeof sec === "string") {
    try {
      sec = JSON.parse(sec);
    } catch (e) {
      sec = [];
    }
  }

  if (Array.isArray(sec) && sec.length > 0) {
    return sec;
  }

  // Legacy fallback if template was saved with sheets_data object
  if (tmpl.sheets_data) {
    let sheetsObj = tmpl.sheets_data;
    if (typeof sheetsObj === "string") {
      try {
        sheetsObj = JSON.parse(sheetsObj);
      } catch (e) {
        sheetsObj = {};
      }
    }
    const sheet1Cells = sheetsObj.sheet1 || {};
    if (Object.keys(sheet1Cells).length > 0) {
      return [
        {
          id: "sec_legacy",
          title: "Section 1: Observation Table",
          fields: [
            {
              id: "f_legacy",
              type: "table",
              label: "Observation Table Grid",
              rowCount: 10,
              colCount: 6,
              tableWidth: "100%",
              colHeaders: ["Column A", "Column B", "Column C", "Column D", "Column E", "Column F"],
              cellData: Object.fromEntries(
                Object.entries(sheet1Cells).map(([k, v]) => [k, typeof v === "object" ? (v.value || "") : (v || "")])
              ),
              cellMerges: tmpl.merges_data || {},
              cellStyles: {},
            },
          ],
        },
      ];
    }
  }

  return [];
};

// Field palette categories
const fieldCategories = [
  {
    title: "BASIC FIELDS",
    fields: [
      { type: "text", label: "Text Input", icon: AlignLeft, desc: "Single line text input" },
      { type: "number", label: "Number", icon: Hash, desc: "Numeric reading or value" },
      { type: "dropdown", label: "Dropdown", icon: ListFilter, desc: "Select single option" },
      { type: "textarea", label: "Textarea", icon: FileText, desc: "Multi-line text input" },
      { type: "date", label: "Date Picker", icon: Calendar, desc: "Date selection" },
      { type: "time", label: "Time Picker", icon: Clock, desc: "Time selection" },
      { type: "checkbox", label: "Checkbox", icon: CheckSquare, desc: "Toggle or multi-check" },
      { type: "radio", label: "Radio Group", icon: CircleDot, desc: "Single choice radio" },
      { type: "file", label: "File Upload", icon: Upload, desc: "Document attachment" },
      { type: "signature", label: "Signature", icon: PenTool, desc: "Digital sign-off" },
    ],
  },
  {
    title: "ADVANCED FIELDS",
    fields: [
      { type: "table", label: "Excel Table", icon: Table2, desc: "Blank Excel grid table with resizable width & multi-line text" },
      { type: "calculation", label: "Calculation", icon: Calculator, desc: "Formula computed field" },
      { type: "photo", label: "Photo Capture", icon: Camera, desc: "Camera image capture" },
      { type: "divider", label: "Divider", icon: Minus, desc: "Visual line separator" },
      { type: "heading", label: "Heading", icon: Heading, desc: "Section title or heading" },
      { type: "note", label: "Note / Info", icon: Info, desc: "Instructional info box" },
    ],
  },
];

const ObservationTemplates = () => {
  const navigate = useNavigate();

  // Always default to 'list' view mode when opened
  const [viewMode, setViewMode] = useState("list");
  const [deviceMode, setDeviceMode] = useState("desktop");
  const [editingTitle, setEditingTitle] = useState(false);

  // Scope Hierarchy & Templates State
  const [scopeHierarchy, setScopeHierarchy] = useState([]);
  const [scopes, setScopes] = useState([]);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [expandedMaterials, setExpandedMaterials] = useState({});

  // MULTI-SELECT Scope Test IDs
  const [selectedScopeTestIds, setSelectedScopeTestIds] = useState([]);
  const [isScopeDropdownOpen, setIsScopeDropdownOpen] = useState(false);
  const [scopeSearchQuery, setScopeSearchQuery] = useState("");

  // Active template reference for editing/saving
  const [activeTemplateId, setActiveTemplateId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [listSearch, setListSearch] = useState("");

  // Excel Cell Format States
  const [activeCellRef, setActiveCellRef] = useState(null);
  const [selectedCellStart, setSelectedCellStart] = useState(null);
  const [selectedCellEnd, setSelectedCellEnd] = useState(null);
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  const [draggedOverSectionId, setDraggedOverSectionId] = useState(null);

  // Template Metadata
  const [sheetMeta, setSheetMeta] = useState({
    title: "New Observation Template",
    isCode: "IS Standard",
    category: "Civil Testing",
    status: "Active",
    version: "1.0.0",
  });

  // Sections & Fields state
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [selectedFieldId, setSelectedFieldId] = useState(null);

  // Status messages & Preview
  const [saveStatusMessage, setSaveStatusMessage] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTemplateData, setPreviewTemplateData] = useState(null);

  const toggleMaterial = (materialKey) => {
    setExpandedMaterials((prev) => ({
      ...prev,
      [materialKey]: !prev[materialKey],
    }));
  };

  // Fetch all templates and scope hierarchy from API
  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [hierRes, tmplRes, scopeRes] = await Promise.all([
        getScopeHierarchy(),
        getObservationTemplates(),
        getScopeTests()
      ]);

      const hierarchyData = hierRes.data?.data || [];
      setScopeHierarchy(hierarchyData);

      const templatesData = tmplRes.data?.data || [];
      setSavedTemplates(templatesData);

      const scopesData = scopeRes.data?.data || [];
      setScopes(scopesData);

      if (hierarchyData.length > 0 && !selectedGroupId) {
        setSelectedGroupId(hierarchyData[0].group_id);
      }
    } catch (err) {
      console.error("Failed to load observation template data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    setViewMode("list");
  }, []);

  // ONLY SHOW TESTS / MATERIALS THAT ALREADY HAVE CREATED TEMPLATES IN THE CATALOGUE
  const createdOnlyHierarchy = useMemo(() => {
    return scopeHierarchy
      .map((group) => {
        const materials = (group.materials || [])
          .map((material) => {
            const tests = (material.tests || []).filter((test) => {
              return savedTemplates.some(
                (t) =>
                  String(t.scope_test_id) === String(test.scope_test_id) ||
                  (t.scope_test_ids && t.scope_test_ids.map(String).includes(String(test.scope_test_id)))
              );
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
  }, [scopeHierarchy, savedTemplates]);

  // Filter Group & Material Scope Hierarchy based on search query
  const visibleGroups = useMemo(() => {
    const query = listSearch.toLowerCase().trim();
    if (!query) return createdOnlyHierarchy;

    return createdOnlyHierarchy
      .map((group) => {
        const groupMatches = group.group_name?.toLowerCase().includes(query);
        const materials = (group.materials || [])
          .map((material) => {
            const materialMatches = material.material_name?.toLowerCase().includes(query);
            const tests = material.tests || [];
            const matchingTests = tests.filter(
              (test) =>
                test.test_name?.toLowerCase().includes(query) ||
                (test.test_method && test.test_method.toLowerCase().includes(query))
            );

            if (groupMatches || materialMatches) return material;
            if (matchingTests.length > 0) return { ...material, tests: matchingTests };
            return null;
          })
          .filter(Boolean);

        if (groupMatches || materials.length > 0) {
          return { ...group, materials };
        }
        return null;
      })
      .filter(Boolean);
  }, [createdOnlyHierarchy, listSearch]);

  const activeGroup = useMemo(() => {
    if (visibleGroups.length === 0) return null;
    const found = visibleGroups.find((g) => g.group_id === selectedGroupId);
    return found || visibleGroups[0];
  }, [visibleGroups, selectedGroupId]);

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
      bgColor: "bg-[#2563EB]/10",
      iconColor: "text-[#2563EB]",
    };
  };

  // Toggle selection of a scope test in multi-select dropdown
  const toggleScopeTestId = (id) => {
    const strId = String(id);
    setSelectedScopeTestIds((prev) => {
      if (prev.map(String).includes(strId)) {
        return prev.filter((item) => String(item) !== strId);
      } else {
        return [...prev, id];
      }
    });
  };

  // Start Create New Template
  const handleStartNewTemplate = () => {
    setActiveTemplateId(null);
    setSelectedScopeTestIds([]);
    setSheetMeta({
      title: "New Observation Template",
      isCode: "IS Standard",
      category: "Civil Testing",
      status: "Active",
      version: "1.0.0",
    });

    setSections([]);
    setSelectedSectionId(null);
    setSelectedFieldId(null);
    setViewMode("editor");
  };

  // Start Create New Template for specific scope test
  const handleCreateNewForScope = (scopeTestId, testName = "New Test", testMethod = "IS Standard", materialName = "General Lab") => {
    setActiveTemplateId(null);
    setSelectedScopeTestIds(scopeTestId ? [scopeTestId] : []);
    setSheetMeta({
      title: `${testName} Observation Sheet`,
      isCode: testMethod || "IS Standard",
      category: materialName || "General Lab",
      status: "Active",
      version: "1.0.0",
    });

    setSections([]);
    setSelectedSectionId(null);
    setSelectedFieldId(null);
    setViewMode("editor");
  };

  // Edit Existing DB Template with API fetch for complete sections_data
  const handleEditTemplate = async (tmpl) => {
    if (!tmpl) return;
    const tmplId = tmpl.template_id || tmpl.id;
    setActiveTemplateId(tmplId);

    let activeData = tmpl;
    if (tmplId) {
      try {
        const res = await getObservationTemplate(tmplId);
        if (res.data?.success && res.data.data) {
          activeData = res.data.data;
        }
      } catch (e) {
        console.warn("Failed to fetch full template details:", e);
      }
    }

    let initialScopeIds = [];
    if (activeData.scope_test_ids && Array.isArray(activeData.scope_test_ids)) {
      initialScopeIds = activeData.scope_test_ids;
    } else if (activeData.scope_test_id) {
      initialScopeIds = [activeData.scope_test_id];
    }
    setSelectedScopeTestIds(initialScopeIds);

    setSheetMeta({
      title: activeData.name || activeData.title || "Observation Template",
      isCode: activeData.standard || activeData.isCode || "IS Standard",
      category: activeData.material || activeData.category || "General Lab",
      status: activeData.status || "Active",
      version: activeData.version || "1.0.0",
    });

    const parsedSecs = parseSectionsData(activeData);
    setSections(parsedSecs);
    if (parsedSecs.length > 0) {
      setSelectedSectionId(parsedSecs[0].id);
      if (parsedSecs[0].fields?.length > 0) {
        setSelectedFieldId(parsedSecs[0].fields[0].id);
      }
    }

    setViewMode("editor");
  };

  // Open Preview Modal with API fetch for complete sections_data
  const handleOpenPreview = async (tmpl) => {
    if (!tmpl) return;
    const tmplId = tmpl.template_id || tmpl.id;
    let activeData = tmpl;

    if (tmplId) {
      try {
        const res = await getObservationTemplate(tmplId);
        if (res.data?.success && res.data.data) {
          activeData = res.data.data;
        }
      } catch (e) {
        console.warn("Failed to fetch preview template details:", e);
      }
    }

    const parsedSecs = parseSectionsData(activeData);
    setPreviewTemplateData({
      ...activeData,
      parsed_sections: parsedSecs,
    });
    setIsPreviewOpen(true);
  };

  // Delete Template from DB
  const handleDeleteTemplateFromDb = async (templateIdToDelete) => {
    if (!window.confirm("Are you sure you want to delete this observation template from database?")) {
      return;
    }
    try {
      await deleteObservationTemplate(templateIdToDelete);
      setSavedTemplates((prev) => prev.filter((t) => (t.template_id || t.id) !== templateIdToDelete));
      setSaveStatusMessage("Template deleted successfully!");
      setTimeout(() => setSaveStatusMessage(""), 3000);
    } catch (err) {
      console.error("Delete template failed:", err);
      alert("Failed to delete template from database");
    }
  };

  // Range selection bounds helper
  const getSelectedRangeBounds = () => {
    if (!selectedCellStart || !selectedCellEnd) return null;
    const colStart = selectedCellStart.charCodeAt(0) - 65;
    const rowStart = parseInt(selectedCellStart.substring(1)) || 1;

    const colEnd = selectedCellEnd.charCodeAt(0) - 65;
    const rowEnd = parseInt(selectedCellEnd.substring(1)) || 1;

    const minCol = Math.min(colStart, colEnd);
    const maxCol = Math.max(colStart, colEnd);
    const minRow = Math.min(rowStart, rowEnd);
    const maxRow = Math.max(rowStart, rowEnd);

    const colSpan = maxCol - minCol + 1;
    const rowSpan = maxRow - minRow + 1;
    const topLeftRef = `${String.fromCharCode(65 + minCol)}${minRow}`;
    const bottomRightRef = `${String.fromCharCode(65 + maxCol)}${maxRow}`;

    return { minCol, maxCol, minRow, maxRow, colSpan, rowSpan, topLeftRef, bottomRightRef };
  };

  const isCellInSelection = (cellRef) => {
    const bounds = getSelectedRangeBounds();
    if (!bounds) return false;
    const col = cellRef.charCodeAt(0) - 65;
    const row = parseInt(cellRef.substring(1)) || 1;

    return col >= bounds.minCol && col <= bounds.maxCol && row >= bounds.minRow && row <= bounds.maxRow;
  };

  // Create field object
  const createNewFieldObject = (fieldItem) => {
    const newFieldId = `f_${Date.now()}`;
    const isTable = fieldItem.type === "table";

    return {
      id: newFieldId,
      type: fieldItem.type,
      label: isTable ? "Observation Table Grid" : fieldItem.label,
      placeholder: `Enter ${fieldItem.label}`,
      key: isTable ? "excel_sheet" : fieldItem.label.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      required: false,
      showInTable: false,
      uniqueValue: false,
      validation: "None",
      helpText: "",
      rowCount: isTable ? 6 : undefined,
      colCount: isTable ? 6 : undefined,
      tableWidth: isTable ? "100%" : undefined,
      colHeaders: isTable
        ? ["Column A", "Column B", "Column C", "Column D", "Column E", "Column F"]
        : undefined,
      cellData: isTable ? {} : undefined,
      cellMerges: isTable ? {} : undefined,
      cellStyles: isTable ? {} : undefined,
    };
  };

  const handleAddField = (fieldItem, targetSecId = null) => {
    const newField = createNewFieldObject(fieldItem);

    setSections((prevSections) => {
      if (prevSections.length === 0) {
        const newSec = {
          id: `sec_${Date.now()}`,
          title: `Section 1: Readings`,
          fields: [newField],
        };
        setSelectedSectionId(newSec.id);
        return [newSec];
      }

      const destSecId = targetSecId || selectedSectionId || prevSections[prevSections.length - 1]?.id;
      return prevSections.map((sec) => {
        if (sec.id === destSecId) {
          return { ...sec, fields: [...sec.fields, newField] };
        }
        return sec;
      });
    });

    setSelectedFieldId(newField.id);
  };

  // Drag and Drop
  const handlePaletteDragStart = (e, fieldItem) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ source: "palette", item: fieldItem }));
  };

  const handleSectionDragStart = (e, sIdx) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ source: "section", sectionIndex: sIdx }));
  };

  const handleFieldDragStart = (e, sectionId, fieldId, fIdx) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ source: "field", sectionId, fieldId, fieldIndex: fIdx })
    );
  };

  const handleDropOnSection = (e, targetSectionId, targetSectionIndex) => {
    e.preventDefault();
    setDraggedOverSectionId(null);

    const jsonStr = e.dataTransfer.getData("application/json");
    if (!jsonStr) return;

    try {
      const data = JSON.parse(jsonStr);

      if (data.source === "palette" && data.item) {
        handleAddField(data.item, targetSectionId);
      } else if (data.source === "section" && data.sectionIndex !== undefined) {
        const srcIdx = data.sectionIndex;
        if (srcIdx === targetSectionIndex) return;

        setSections((prev) => {
          const updated = [...prev];
          const [movedSec] = updated.splice(srcIdx, 1);
          updated.splice(targetSectionIndex, 0, movedSec);
          return updated;
        });
      } else if (data.source === "field" && data.fieldId && data.sectionId) {
        const { sectionId: srcSecId, fieldId: srcFieldId } = data;

        setSections((prev) => {
          let movedField = null;
          const cleanSections = prev.map((sec) => {
            if (sec.id === srcSecId) {
              const found = sec.fields.find((f) => f.id === srcFieldId);
              if (found) movedField = found;
              return { ...sec, fields: sec.fields.filter((f) => f.id !== srcFieldId) };
            }
            return sec;
          });

          if (movedField) {
            return cleanSections.map((sec) => {
              if (sec.id === targetSectionId) {
                return { ...sec, fields: [...sec.fields, movedField] };
              }
              return sec;
            });
          }
          return cleanSections;
        });
      }
    } catch (err) {
      console.error("Drag and drop error:", err);
    }
  };

  const handleDropOnFieldCard = (e, targetSectionId, targetFieldId, targetFieldIdx) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOverSectionId(null);

    const jsonStr = e.dataTransfer.getData("application/json");
    if (!jsonStr) return;

    try {
      const data = JSON.parse(jsonStr);

      if (data.source === "palette" && data.item) {
        const newField = createNewFieldObject(data.item);
        setSections((prev) =>
          prev.map((sec) => {
            if (sec.id === targetSectionId) {
              const updatedFields = [...sec.fields];
              updatedFields.splice(targetFieldIdx, 0, newField);
              return { ...sec, fields: updatedFields };
            }
            return sec;
          })
        );
        setSelectedFieldId(newField.id);
      } else if (data.source === "field" && data.fieldId) {
        const { sectionId: srcSecId, fieldId: srcFieldId } = data;
        if (srcFieldId === targetFieldId) return;

        setSections((prev) => {
          let movedField = null;
          const cleanSections = prev.map((sec) => {
            if (sec.id === srcSecId) {
              const found = sec.fields.find((f) => f.id === srcFieldId);
              if (found) movedField = found;
              return { ...sec, fields: sec.fields.filter((f) => f.id !== srcFieldId) };
            }
            return sec;
          });

          if (movedField) {
            return cleanSections.map((sec) => {
              if (sec.id === targetSectionId) {
                const updatedFields = [...sec.fields];
                const insertPos = updatedFields.findIndex((f) => f.id === targetFieldId);
                if (insertPos !== -1) {
                  updatedFields.splice(insertPos, 0, movedField);
                } else {
                  updatedFields.push(movedField);
                }
                return { ...sec, fields: updatedFields };
              }
              return sec;
            });
          }
          return cleanSections;
        });
      }
    } catch (err) {
      console.error("Drop on field card error:", err);
    }
  };

  const handleUpdateFieldLabel = (fieldId, newLabel) => {
    setSections((prevSections) =>
      prevSections.map((sec) => ({
        ...sec,
        fields: sec.fields.map((f) => (f.id === fieldId ? { ...f, label: newLabel } : f)),
      }))
    );
  };

  const handleUpdateTableWidth = (fieldId, newWidth) => {
    setSections((prevSections) =>
      prevSections.map((sec) => ({
        ...sec,
        fields: sec.fields.map((f) => (f.id === fieldId ? { ...f, tableWidth: newWidth } : f)),
      }))
    );
  };

  const handleUpdateExcelCell = (fieldId, cellRef, rawValue) => {
    setSections((prevSections) =>
      prevSections.map((sec) => ({
        ...sec,
        fields: sec.fields.map((f) => {
          if (f.id === fieldId) {
            return {
              ...f,
              cellData: {
                ...(f.cellData || {}),
                [cellRef]: rawValue,
              },
            };
          }
          return f;
        }),
      }))
    );
  };

  const handleToggleCellFormat = (fieldId, formatKey) => {
    const bounds = getSelectedRangeBounds();
    const targetCells = [];

    if (bounds) {
      for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
        for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
          targetCells.push(`${String.fromCharCode(65 + c)}${r}`);
        }
      }
    } else if (activeCellRef) {
      targetCells.push(activeCellRef);
    }

    if (targetCells.length === 0) {
      alert("Please select a cell or drag a range of cells to format!");
      return;
    }

    setSections((prevSections) =>
      prevSections.map((sec) => ({
        ...sec,
        fields: sec.fields.map((f) => {
          if (f.id === fieldId) {
            const styles = { ...(f.cellStyles || {}) };
            const firstCellState = styles[targetCells[0]]?.[formatKey];
            const newState = !firstCellState;

            targetCells.forEach((cRef) => {
              styles[cRef] = { ...(styles[cRef] || {}), [formatKey]: newState };
            });

            return { ...f, cellStyles: styles };
          }
          return f;
        }),
      }))
    );
  };

  const handleMergeSelectedRange = (fieldId) => {
    const bounds = getSelectedRangeBounds();
    if (!bounds) {
      alert("Please select a range of cells to merge!");
      return;
    }

    const { minCol, maxCol, minRow, maxRow, colSpan, rowSpan, topLeftRef } = bounds;

    setSections((prevSections) =>
      prevSections.map((sec) => ({
        ...sec,
        fields: sec.fields.map((f) => {
          if (f.id === fieldId) {
            const merges = { ...(f.cellMerges || {}) };

            merges[topLeftRef] = { colSpan, rowSpan };

            for (let r = minRow; r <= maxRow; r++) {
              for (let c = minCol; c <= maxCol; c++) {
                const cellKey = `${String.fromCharCode(65 + c)}${r}`;
                if (cellKey !== topLeftRef) {
                  merges[cellKey] = { hidden: true };
                }
              }
            }

            return { ...f, cellMerges: merges };
          }
          return f;
        }),
      }))
    );
  };

  const handleUnmergeExcelCell = (fieldId, startCellRef) => {
    if (!startCellRef) return;

    setSections((prevSections) =>
      prevSections.map((sec) => ({
        ...sec,
        fields: sec.fields.map((f) => {
          if (f.id === fieldId) {
            const merges = { ...(f.cellMerges || {}) };
            const existing = merges[startCellRef];

            if (existing) {
              const cSpan = existing.colSpan || 1;
              const rSpan = existing.rowSpan || 1;
              const startColCode = startCellRef.charCodeAt(0);
              const startRowNum = parseInt(startCellRef.substring(1)) || 1;

              delete merges[startCellRef];
              for (let r = 0; r < rSpan; r++) {
                for (let c = 0; c < cSpan; c++) {
                  const colLetter = String.fromCharCode(startColCode + c);
                  const cellKey = `${colLetter}${startRowNum + r}`;
                  delete merges[cellKey];
                }
              }
            }

            return { ...f, cellMerges: merges };
          }
          return f;
        }),
      }))
    );
  };

  const handleAddExcelRow = (fieldId) => {
    setSections((prevSections) =>
      prevSections.map((sec) => ({
        ...sec,
        fields: sec.fields.map((f) => (f.id === fieldId ? { ...f, rowCount: (f.rowCount || 1) + 1 } : f)),
      }))
    );
  };

  const handleRemoveExcelRow = (fieldId) => {
    setSections((prevSections) =>
      prevSections.map((sec) => ({
        ...sec,
        fields: sec.fields.map((f) => {
          if (f.id === fieldId) {
            const current = f.rowCount || 1;
            if (current <= 1) return f;
            return { ...f, rowCount: current - 1 };
          }
          return f;
        }),
      }))
    );
  };

  const handleAddExcelCol = (fieldId) => {
    setSections((prevSections) =>
      prevSections.map((sec) => ({
        ...sec,
        fields: sec.fields.map((f) => {
          if (f.id === fieldId) {
            const currentCols = f.colCount || 4;
            const newColLetter = String.fromCharCode(65 + currentCols);
            return {
              ...f,
              colCount: currentCols + 1,
              colHeaders: [...(f.colHeaders || []), `Column ${newColLetter}`],
            };
          }
          return f;
        }),
      }))
    );
  };

  const handleRemoveExcelCol = (fieldId) => {
    setSections((prevSections) =>
      prevSections.map((sec) => ({
        ...sec,
        fields: sec.fields.map((f) => {
          if (f.id === fieldId) {
            const currentCols = f.colCount || 1;
            if (currentCols <= 1) return f;
            return {
              ...f,
              colCount: currentCols - 1,
              colHeaders: (f.colHeaders || []).slice(0, currentCols - 1),
            };
          }
          return f;
        }),
      }))
    );
  };

  const handleDeleteField = (fieldId) => {
    setSections((prevSections) =>
      prevSections.map((sec) => ({
        ...sec,
        fields: sec.fields.filter((f) => f.id !== fieldId),
      }))
    );
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  };

  const handleAddSection = () => {
    const newSecId = `sec_${Date.now()}`;
    const newSec = {
      id: newSecId,
      title: `Section ${sections.length + 1}: Readings`,
      fields: [],
    };
    setSections([...sections, newSec]);
    setSelectedSectionId(newSecId);
  };

  const handleDeleteSection = (secId) => {
    setSections(sections.filter((s) => s.id !== secId));
    if (selectedSectionId === secId) {
      setSelectedSectionId(null);
    }
  };

  // Save template to Database API & redirect back to Catalogue List view
  const handleSaveToDatabase = async (statusOverride = null) => {
    try {
      setIsSaving(true);
      setSaveStatusMessage("");

      const payload = {
        name: sheetMeta.title,
        title: sheetMeta.title,
        material: sheetMeta.category,
        test: sheetMeta.title,
        standard: sheetMeta.isCode,
        scope_test_ids: selectedScopeTestIds,
        status: statusOverride || sheetMeta.status || "Active",
        version: sheetMeta.version || "1.0.0",
        sections_data: sections,
        sections: sections,
      };

      let res;
      if (activeTemplateId) {
        res = await updateObservationTemplate(activeTemplateId, payload);
      } else {
        res = await createObservationTemplate(payload);
      }

      if (res.data?.success) {
        const savedData = res.data.data;
        if (savedData?.id || savedData?.template_id) {
          setActiveTemplateId(savedData.id || savedData.template_id);
        }
        setSaveStatusMessage("Observation Template saved successfully!");
        await fetchAllData();

        // Redirect back to List View after saving
        setTimeout(() => {
          setViewMode("list");
        }, 800);
      } else {
        setSaveStatusMessage("Saved template state!");
      }
    } catch (err) {
      console.error("Save to database failed:", err);
      setSaveStatusMessage("Saved template state!");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatusMessage(""), 3500);
    }
  };

  const rangeBounds = getSelectedRangeBounds();

  // Filtered scopes inside the multi-select dropdown
  const filteredScopesForDropdown = useMemo(() => {
    const q = scopeSearchQuery.toLowerCase();
    if (!q) return scopes;
    return scopes.filter(
      (s) =>
        s.test_name?.toLowerCase().includes(q) ||
        (s.test_code && s.test_code.toLowerCase().includes(q)) ||
        (s.material_name && s.material_name.toLowerCase().includes(q))
    );
  }, [scopes, scopeSearchQuery]);

  const activePreviewSections = previewTemplateData?.parsed_sections || (previewTemplateData ? parseSectionsData(previewTemplateData) : sections);

  // Render input according to exact field type in preview
  const renderPreviewFieldInput = (f) => {
    switch (f.type) {
      case "date":
        return (
          <input
            type="date"
            placeholder={f.placeholder}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 bg-white"
          />
        );
      case "time":
        return (
          <input
            type="time"
            placeholder={f.placeholder}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 bg-white"
          />
        );
      case "number":
      case "calculation":
        return (
          <input
            type="number"
            placeholder={f.placeholder || "Enter number"}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 bg-white"
          />
        );
      case "dropdown":
        return (
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 bg-white">
            <option value="">Select option...</option>
            {(f.options || ["Option 1", "Option 2"]).map((opt, i) => (
              <option key={i} value={opt}>{opt}</option>
            ))}
          </select>
        );
      case "textarea":
        return (
          <textarea
            rows={2}
            placeholder={f.placeholder || "Enter notes..."}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 bg-white"
          />
        );
      case "checkbox":
        return (
          <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs font-semibold text-slate-800">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-[#2563EB]" />
            <span>{f.placeholder || f.label}</span>
          </label>
        );
      default:
        return (
          <input
            type="text"
            placeholder={f.placeholder || `Enter ${f.label}`}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 bg-white"
          />
        );
    }
  };

  return (
    <MainLayout
      headerTitle={viewMode === "list" ? "Observation Templates" : "Observation Template Designer"}
      headerSubtitle={viewMode === "list" ? "Catalogue of created observation templates" : "Configure observation template layout"}
    >
      <div className="flex h-[calc(100vh-4rem)] flex-col bg-[#F8FAFC]">

        {/* MODE 1: CREATED TEMPLATES SCOPE CATALOGUE LIST VIEW */}
        {viewMode === "list" ? (
          <div className="flex flex-col flex-1 overflow-hidden p-6 space-y-4">
            
            {/* Top Toolbar Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shrink-0">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-[#2563EB] px-3 py-1 text-xs font-bold border border-blue-200">
                  <Layers3 size={14} />
                  {createdOnlyHierarchy.length} Active Scope Groups
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-bold border border-emerald-200">
                  <TestTube2 size={14} />
                  {savedTemplates.length} Templates Created
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-64">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search created templates..."
                    value={listSearch}
                    onChange={(e) => setListSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-800 focus:border-[#2563EB] focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={fetchAllData}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw size={14} />
                  <span>Refresh</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartNewTemplate}
                  className="flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
                >
                  <Plus size={16} />
                  <span>+ Create Observation Template</span>
                </button>
              </div>
            </div>

            {/* Main Dual Pane Scope Layout */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center bg-white rounded-2xl border border-slate-200">
                <div className="text-center text-slate-500 space-y-2">
                  <Loader2 className="animate-spin mx-auto text-[#2563EB]" size={28} />
                  <p className="text-xs font-bold">Loading created observation templates...</p>
                </div>
              </div>
            ) : visibleGroups.length === 0 ? (
              <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-12 text-center flex items-center justify-center">
                <div className="space-y-3">
                  <FileSpreadsheet size={40} className="mx-auto text-slate-300" />
                  <h3 className="text-sm font-bold text-slate-800">No Created Observation Templates Found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Click the "+ Create Observation Template" button to create and assign test scopes to your first template.
                  </p>
                  <button
                    type="button"
                    onClick={handleStartNewTemplate}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                  >
                    <Plus size={15} />
                    <span>Create Template Now</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
                
                {/* LEFT PANE: Material Groups Sidebar */}
                <div className="w-full lg:w-[320px] shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Material Groups</h3>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{visibleGroups.length} Active Groups</p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {visibleGroups.map((group) => {
                      const isActive = group.group_id === activeGroup?.group_id;
                      const groupMaterialsCount = group.materials?.length || 0;
                      const groupTestsCount = group.materials?.reduce((sum, m) => sum + (m.tests?.length || 0), 0) || 0;
                      const visuals = getGroupVisuals(group.group_name);
                      const IconComponent = visuals.icon;

                      return (
                        <div
                          key={group.group_id}
                          onClick={() => setSelectedGroupId(group.group_id)}
                          className={`w-full p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                            isActive
                              ? "bg-[#2563EB] border-[#2563EB] text-white shadow-sm"
                              : "bg-white border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isActive ? "bg-white/20 text-white" : `${visuals.bgColor} ${visuals.iconColor}`
                          }`}>
                            <IconComponent size={18} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className={`font-bold text-xs truncate ${isActive ? "text-white" : "text-slate-800"}`}>
                              {group.group_name || "Unnamed Group"}
                            </h4>
                            <p className={`text-[10px] mt-0.5 font-medium ${isActive ? "text-white/80" : "text-slate-500"}`}>
                              {groupMaterialsCount} Materials • {groupTestsCount} Templates
                            </p>
                          </div>

                          <ChevronRight size={14} className={isActive ? "text-white" : "text-slate-400"} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* RIGHT PANE: Group Materials & Created Templates Accordion */}
                {activeGroup && (
                  <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                    
                    {/* Header */}
                    <div className="p-5 border-b border-slate-100 bg-white flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">{activeGroup.group_name}</h2>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">
                          Created Observation Templates Catalogue
                        </p>
                      </div>
                    </div>

                    {/* Materials Accordion */}
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
                      {(activeGroup.materials || []).length === 0 ? (
                        <div className="p-12 text-center text-xs text-slate-400">
                          No created templates under this group.
                        </div>
                      ) : (
                        (activeGroup.materials || []).map((material) => {
                          const materialKey = `${activeGroup.group_id}-${material.material_id}`;
                          const isExpanded = expandedMaterials[materialKey] !== false;
                          const testsCount = material.tests?.length || 0;

                          return (
                            <div key={materialKey} className="bg-white">
                              {/* Material Accordion Header */}
                              <div
                                onClick={() => toggleMaterial(materialKey)}
                                className="flex items-center justify-between bg-slate-50 border-b border-slate-200 px-5 py-3 cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                              >
                                <div className="flex items-center gap-2.5">
                                  <ChevronDown
                                    size={15}
                                    className={`text-slate-600 transition-transform duration-200 ${isExpanded ? "" : "-rotate-90"}`}
                                  />
                                  <CircleDot size={14} className="text-[#2563EB]" />
                                  <span className="text-xs font-bold text-slate-900">
                                    {material.material_name}
                                  </span>
                                </div>
                                <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                                  {testsCount} Created Template{testsCount === 1 ? "" : "s"}
                                </span>
                              </div>

                              {/* Tests Rows Table */}
                              {isExpanded && (
                                <div className="bg-white overflow-x-auto">
                                  <table className="w-full text-left text-xs font-sans border-collapse">
                                    <thead>
                                      <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                                        <th className="p-3 pl-6">Test Scope Name</th>
                                        <th className="p-3">Standard Method</th>
                                        <th className="p-3">Template Title</th>
                                        <th className="p-3">Status</th>
                                        <th className="p-3 pr-6 text-right">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {(material.tests || []).map((test) => {
                                        const testKey = test.scope_test_id || `${material.material_id}-${test.test_name}`;
                                        const tmpl = savedTemplates.find(
                                          (t) =>
                                            String(t.scope_test_id) === String(test.scope_test_id) ||
                                            (t.scope_test_ids && t.scope_test_ids.map(String).includes(String(test.scope_test_id)))
                                        );

                                        if (!tmpl) return null;

                                        return (
                                          <tr key={testKey} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="p-3 pl-6 font-bold text-slate-900">
                                              {test.test_name}
                                            </td>
                                            <td className="p-3 font-mono font-semibold text-blue-700">
                                              {test.test_method || "IS Standard"}
                                            </td>
                                            <td className="p-3">
                                              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                                <FileSpreadsheet size={14} className="text-[#2563EB]" />
                                                {tmpl.name || tmpl.title}
                                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">v{tmpl.version || "1.0"}</span>
                                              </span>
                                            </td>
                                            <td className="p-3">
                                              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                                Active
                                              </span>
                                            </td>
                                            <td className="p-3 pr-6 text-right">
                                              <div className="flex items-center justify-end gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenPreview(tmpl)}
                                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-[11px]"
                                                  title="Preview template layout"
                                                >
                                                  <Eye size={13} />
                                                  <span>Preview</span>
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleEditTemplate(tmpl)}
                                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-[#2563EB] hover:bg-blue-100 font-bold text-[11px]"
                                                  title="Edit template layout"
                                                >
                                                  <Edit3 size={13} />
                                                  <span>Edit</span>
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleDeleteTemplateFromDb(tmpl.template_id || tmpl.id)}
                                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                                                >
                                                  <Trash2 size={14} />
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
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
          /* MODE 2: TEMPLATE DESIGNER WORKSPACE */
          <div className="flex flex-col flex-1 overflow-hidden">
            
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft size={15} />
                  <span>Back to Catalogue</span>
                </button>

                {/* MULTI-SELECT TEST SCOPE DROPDOWN */}
                <div className="relative border-l border-slate-200 pl-3">
                  <button
                    type="button"
                    onClick={() => setIsScopeDropdownOpen(!isScopeDropdownOpen)}
                    className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:border-[#2563EB] shadow-xs"
                  >
                    <FlaskConical size={16} className="text-[#2563EB]" />
                    <span>
                      {selectedScopeTestIds.length === 0
                        ? "Select Test Scopes (Multi-select)"
                        : `${selectedScopeTestIds.length} Test Scope${selectedScopeTestIds.length === 1 ? "" : "s"} Assigned`}
                    </span>
                    <ChevronDown size={14} className="text-slate-400 ml-1" />
                  </button>

                  {/* Multi-Select Dropdown Menu */}
                  {isScopeDropdownOpen && (
                    <div className="absolute left-3 top-full mt-1.5 z-50 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl space-y-2">
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="text-xs font-extrabold text-slate-800">Assign Test Scopes</span>
                        <button
                          type="button"
                          onClick={() => setIsScopeDropdownOpen(false)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={scopeSearchQuery}
                          onChange={(e) => setScopeSearchQuery(e.target.value)}
                          placeholder="Search test scope..."
                          className="w-full rounded-lg border border-slate-200 pl-8 pr-2.5 py-1 text-xs text-slate-800 focus:border-[#2563EB] focus:outline-none"
                        />
                      </div>

                      <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                        {filteredScopesForDropdown.map((s) => {
                          const sId = s.scope_test_id || s.id;
                          const isChecked = selectedScopeTestIds.map(String).includes(String(sId));
                          return (
                            <label
                              key={sId}
                              className="flex items-center gap-2.5 rounded-lg border border-slate-100 p-2 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleScopeTestId(sId)}
                                className="h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-blue-500"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-slate-900 truncate">{s.test_name}</p>
                                <p className="text-[10px] text-slate-500 font-mono truncate">{s.test_code || s.material_name}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      <div className="border-t pt-2 flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={() => setSelectedScopeTestIds(scopes.map((s) => s.scope_test_id || s.id))}
                          className="text-[#2563EB] font-bold hover:underline"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedScopeTestIds([])}
                          className="text-slate-500 font-bold hover:underline"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                {saveStatusMessage && (
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                    {saveStatusMessage}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenPreview({ name: sheetMeta.title, standard: sheetMeta.isCode, material: sheetMeta.category, sections_data: sections })}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Eye size={15} />
                  <span>Preview Template</span>
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveToDatabase("Draft")}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  <span>Save Draft</span>
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveToDatabase("Active")}
                  className="flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  <span>Save & Publish Template</span>
                </button>
              </div>
            </div>

            {/* Selected Test Scope Badges Bar */}
            {selectedScopeTestIds.length > 0 && (
              <div className="bg-blue-50/70 border-b border-blue-100 px-6 py-2 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-[#2563EB] uppercase">Assigned Test Scopes:</span>
                {selectedScopeTestIds.map((id) => {
                  const s = scopes.find((item) => String(item.scope_test_id || item.id) === String(id));
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-slate-800 border border-blue-200 shadow-2xs"
                    >
                      <span>{s?.test_name || `Scope #${id}`}</span>
                      <button
                        type="button"
                        onClick={() => toggleScopeTestId(id)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Designer Work Area */}
            <div className="flex flex-1 overflow-hidden">
              
              {/* LEFT PALETTE */}
              <aside className="w-72 border-r border-slate-200 bg-white flex flex-col overflow-y-auto p-4 space-y-6 flex-shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add Template Fields</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Drag fields or click to add to template</p>
                </div>

                {fieldCategories.map((cat) => (
                  <div key={cat.title} className="space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {cat.title}
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {cat.fields.map((f) => {
                        const IconComp = f.icon || AlignLeft;
                        return (
                          <div
                            key={f.label}
                            draggable
                            onDragStart={(e) => handlePaletteDragStart(e, f)}
                            onClick={() => handleAddField(f)}
                            className="flex flex-col items-start gap-1 rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-left transition-all hover:border-[#2563EB] hover:bg-blue-50/50 hover:shadow-sm cursor-grab active:cursor-grabbing group"
                          >
                            <div className="flex items-center gap-1.5 text-slate-600 group-hover:text-[#2563EB]">
                              <IconComp size={15} />
                              <span className="text-xs font-medium truncate">{f.label}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </aside>

              {/* CENTER CANVAS */}
              <main className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]">
                <div className={`mx-auto transition-all duration-200 ${deviceMode === "mobile" ? "max-w-md" : "w-full max-w-full px-2"}`}>
                  
                  {/* Blank Template Canvas */}
                  {sections.length === 0 ? (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const jsonStr = e.dataTransfer.getData("application/json");
                        if (jsonStr) {
                          try {
                            const data = JSON.parse(jsonStr);
                            if (data.source === "palette" && data.item) {
                              handleAddField(data.item);
                            }
                          } catch (err) {}
                        }
                      }}
                      className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center shadow-sm space-y-4 my-6"
                    >
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB]">
                        <Sparkles size={28} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Blank Template Canvas</h3>
                        <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                          Drag fields from the left palette or click below to start building your observation template.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddSection}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                      >
                        <Plus size={16} />
                        <span>Add First Section</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {sections.map((section, sIdx) => {
                        const isSectionSelected = selectedSectionId === section.id;
                        const isDraggedOver = draggedOverSectionId === section.id;

                        return (
                          <div
                            key={section.id}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setDraggedOverSectionId(section.id);
                            }}
                            onDragLeave={() => setDraggedOverSectionId(null)}
                            onDrop={(e) => handleDropOnSection(e, section.id, sIdx)}
                            onClick={() => setSelectedSectionId(section.id)}
                            className={`rounded-2xl border bg-white shadow-sm transition-all ${
                              isDraggedOver ? "border-[#2563EB] ring-4 ring-[#2563EB]/20 bg-blue-50/10" : ""
                            } ${
                              isSectionSelected ? "border-[#2563EB] ring-2 ring-[#2563EB]/10" : "border-slate-200"
                            }`}
                          >
                            <div
                              draggable
                              onDragStart={(e) => handleSectionDragStart(e, sIdx)}
                              className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3.5 rounded-t-2xl cursor-grab active:cursor-grabbing"
                            >
                              <div className="flex items-center gap-2">
                                <GripVertical size={16} className="text-slate-400 cursor-move" />
                                <input
                                  type="text"
                                  value={section.title}
                                  onChange={(e) => {
                                    const newTitle = e.target.value;
                                    setSections((prev) =>
                                      prev.map((s) => (s.id === section.id ? { ...s, title: newTitle } : s))
                                    );
                                  }}
                                  className="font-bold text-sm text-[#2563EB] bg-transparent focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-400 rounded px-1"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSection(section.id);
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>

                            <div className="p-5">
                              {section.fields.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/30">
                                  <p className="text-xs text-slate-400">Drag and drop fields here from the left palette</p>
                                </div>
                              ) : (
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                  {section.fields.map((f, fIdx) => {
                                    const isSelected = selectedFieldId === f.id;
                                    const isTable = f.type === "table";
                                    const colCount = f.colCount || 6;
                                    const rowCount = f.rowCount || 6;

                                    const tableWidthClass =
                                      f.tableWidth === "33%" ? "w-full max-w-md" :
                                      f.tableWidth === "50%" ? "w-full max-w-xl" :
                                      f.tableWidth === "75%" ? "w-full max-w-3xl" : "w-full";

                                    return (
                                      <div
                                        key={f.id}
                                        draggable
                                        onDragStart={(e) => handleFieldDragStart(e, section.id, f.id, fIdx)}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => handleDropOnFieldCard(e, section.id, f.id, fIdx)}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedFieldId(f.id);
                                          setSelectedSectionId(section.id);
                                        }}
                                        className={`relative rounded-xl border p-3.5 transition-all cursor-grab active:cursor-grabbing ${
                                          isTable ? "col-span-full" : ""
                                        } ${
                                          isSelected
                                            ? "border-[#2563EB] bg-blue-50/20 ring-2 ring-[#2563EB]/20"
                                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <GripVertical size={14} className="text-slate-300" />
                                            {isTable && <Table2 size={16} className="text-[#2563EB]" />}
                                            <input
                                              type="text"
                                              value={f.label}
                                              onChange={(e) => handleUpdateFieldLabel(f.id, e.target.value)}
                                              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-400 rounded px-1"
                                            />
                                          </div>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteField(f.id);
                                            }}
                                            className="opacity-80 hover:text-rose-600 text-slate-400"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>

                                        {isTable ? (
                                          <div className="space-y-2 pt-1">
                                            {/* Formula & Formatting Toolbar */}
                                            <div className="flex items-center justify-between bg-slate-100/90 p-2 rounded-lg border border-slate-200 text-xs gap-2 overflow-x-auto whitespace-nowrap">
                                              <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="font-bold text-slate-700 bg-white px-2 py-0.5 rounded border font-mono text-[11px] min-w-[36px] text-center">
                                                  {rangeBounds && (rangeBounds.colSpan > 1 || rangeBounds?.rowSpan > 1)
                                                    ? `${rangeBounds.topLeftRef}:${rangeBounds.bottomRightRef}`
                                                    : activeCellRef || "A1"}
                                                </span>
                                                <span className="font-extrabold text-[#2563EB]">fx</span>
                                                <input
                                                  type="text"
                                                  value={activeCellRef ? (f.cellData?.[activeCellRef] || "") : ""}
                                                  onChange={(e) => {
                                                    if (activeCellRef) {
                                                      handleUpdateExcelCell(f.id, activeCellRef, e.target.value);
                                                    }
                                                  }}
                                                  placeholder="Type text or =formula..."
                                                  className="w-44 sm:w-56 bg-white border border-slate-200 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-blue-500"
                                                />
                                              </div>

                                              <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleCellFormat(f.id, "bold");
                                                  }}
                                                  className={`p-1.5 rounded border text-xs font-bold ${
                                                    activeCellRef && f.cellStyles?.[activeCellRef]?.bold ? "bg-blue-600 text-white" : "bg-white"
                                                  }`}
                                                >
                                                  <Bold size={13} />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleCellFormat(f.id, "italic");
                                                  }}
                                                  className={`p-1.5 rounded border text-xs ${
                                                    activeCellRef && f.cellStyles?.[activeCellRef]?.italic ? "bg-blue-600 text-white" : "bg-white"
                                                  }`}
                                                >
                                                  <Italic size={13} />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleCellFormat(f.id, "center");
                                                  }}
                                                  className={`p-1.5 rounded border text-xs ${
                                                    activeCellRef && f.cellStyles?.[activeCellRef]?.center ? "bg-blue-600 text-white" : "bg-white"
                                                  }`}
                                                >
                                                  <AlignCenter size={13} />
                                                </button>

                                                <div className="h-4 w-px bg-slate-300 mx-0.5" />

                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (rangeBounds) {
                                                      handleMergeSelectedRange(f.id);
                                                    } else {
                                                      alert("Please drag to select cells to merge!");
                                                    }
                                                  }}
                                                  className="px-3 py-1 bg-[#2563EB] text-white rounded text-[11px] font-bold flex items-center gap-1"
                                                >
                                                  <Merge size={13} />
                                                  <span>Merge & Center</span>
                                                </button>

                                                {activeCellRef && f.cellMerges?.[activeCellRef] && (
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleUnmergeExcelCell(f.id, activeCellRef);
                                                    }}
                                                    className="px-2.5 py-1 bg-amber-100 border border-amber-300 rounded text-[11px] font-bold text-amber-900"
                                                  >
                                                    Unmerge
                                                  </button>
                                                )}

                                                <div className="h-4 w-px bg-slate-300 mx-0.5" />

                                                <button type="button" onClick={(e) => { e.stopPropagation(); handleAddExcelRow(f.id); }} className="px-2 py-1 bg-white border rounded text-[11px] font-bold">+ Row</button>
                                                <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveExcelRow(f.id); }} className="px-2 py-1 bg-white border rounded text-[11px] font-bold">- Row</button>
                                                <button type="button" onClick={(e) => { e.stopPropagation(); handleAddExcelCol(f.id); }} className="px-2 py-1 bg-white border rounded text-[11px] font-bold">+ Col</button>
                                                <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveExcelCol(f.id); }} className="px-2 py-1 bg-white border rounded text-[11px] font-bold">- Col</button>

                                                <div className="ml-auto flex items-center gap-1 bg-white border rounded px-2 py-1 text-xs shrink-0">
                                                  <Maximize2 size={12} className="text-slate-500" />
                                                  <select
                                                    value={f.tableWidth || "100%"}
                                                    onChange={(e) => handleUpdateTableWidth(f.id, e.target.value)}
                                                    className="bg-transparent font-bold text-[11px] text-[#2563EB]"
                                                  >
                                                    <option value="100%">100%</option>
                                                    <option value="75%">75%</option>
                                                    <option value="50%">50%</option>
                                                    <option value="33%">33%</option>
                                                  </select>
                                                </div>
                                              </div>
                                            </div>

                                            {/* Blank Excel Table */}
                                            <div className={`overflow-x-auto rounded-lg border border-slate-200 bg-white select-none ${tableWidthClass}`}>
                                              <table className="w-full text-left text-xs border-collapse font-sans">
                                                <thead>
                                                  <tr className="bg-slate-200/90 border-b border-slate-300 font-bold text-xs font-mono">
                                                    <th className="p-1.5 border-r border-slate-300 w-10 text-center bg-slate-300/60"></th>
                                                    {Array.from({ length: colCount }).map((_, cIdx) => (
                                                      <th key={cIdx} className="p-1.5 border-r border-slate-300 min-w-[120px] text-center">
                                                        {String.fromCharCode(65 + cIdx)}
                                                      </th>
                                                    ))}
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {Array.from({ length: rowCount }).map((_, rIdx) => {
                                                    const rowNum = rIdx + 1;
                                                    return (
                                                      <tr key={rIdx} className="border-b border-slate-200">
                                                        <td className="p-1.5 border-r border-slate-300 text-center font-mono text-[11px] font-bold text-slate-500 bg-slate-100/70">
                                                          {rowNum}
                                                        </td>
                                                        {Array.from({ length: colCount }).map((_, cIdx) => {
                                                          const colLetter = String.fromCharCode(65 + cIdx);
                                                          const cellRef = `${colLetter}${rowNum}`;
                                                          const mergeInfo = f.cellMerges?.[cellRef];
                                                          if (mergeInfo?.hidden) return null;

                                                          const isFocused = activeCellRef === cellRef;
                                                          const isSelected = isCellInSelection(cellRef);
                                                          const rawCellVal = f.cellData?.[cellRef] || "";
                                                          const evalVal = evaluateExcelCell(rawCellVal, f.cellData);

                                                          const cellStyle = f.cellStyles?.[cellRef];
                                                          const isBold = cellStyle?.bold;
                                                          const isItalic = cellStyle?.italic;
                                                          const isCenter = cellStyle?.center;
                                                          const displayVal = isFocused ? rawCellVal : evalVal;

                                                          return (
                                                            <td
                                                              key={cIdx}
                                                              colSpan={mergeInfo?.colSpan || 1}
                                                              rowSpan={mergeInfo?.rowSpan || 1}
                                                              onMouseDown={(e) => {
                                                                e.stopPropagation();
                                                                setIsSelectingRange(true);
                                                                if (!e.shiftKey) setSelectedCellStart(cellRef);
                                                                setSelectedCellEnd(cellRef);
                                                                setActiveCellRef(cellRef);
                                                              }}
                                                              onMouseEnter={() => {
                                                                if (isSelectingRange) setSelectedCellEnd(cellRef);
                                                              }}
                                                              className={`p-1 border-r border-slate-200 relative ${
                                                                isFocused ? "ring-[#2563EB] bg-blue-100/80 font-bold" : isSelected ? "bg-blue-50/80" : ""
                                                              }`}
                                                            >
                                                              <textarea
                                                                rows={typeof displayVal === "string" && displayVal.includes("\n") ? 2 : 1}
                                                                value={displayVal}
                                                                onChange={(e) => handleUpdateExcelCell(f.id, cellRef, e.target.value)}
                                                                onFocus={() => {
                                                                  setActiveCellRef(cellRef);
                                                                  if (!selectedCellStart) setSelectedCellStart(cellRef);
                                                                }}
                                                                className={`w-full bg-transparent px-1.5 py-1 text-xs focus:outline-none resize-none overflow-hidden whitespace-pre-wrap leading-tight ${
                                                                  isBold ? "font-extrabold text-slate-900" : "text-slate-800"
                                                                } ${isItalic ? "italic" : ""} ${isCenter ? "text-center" : ""}`}
                                                              />
                                                            </td>
                                                          );
                                                        })}
                                                      </tr>
                                                    );
                                                  })}
                                                </tbody>
                                              </table>
                                            </div>
                                          </div>
                                        ) : (
                                          <input
                                            type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "time" ? "time" : "text"}
                                            placeholder={f.placeholder}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                                          />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={handleAddSection}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          <Plus size={16} />
                          <span>Add Section</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </main>
            </div>
          </div>
        )}

        {/* Live Preview Modal */}
        {isPreviewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b px-6 py-4 bg-slate-50">
                <div className="flex items-center gap-2">
                  <Eye className="text-[#2563EB]" size={20} />
                  <h3 className="text-base font-bold text-slate-900">
                    Observation Template Preview - {previewTemplateData?.name || previewTemplateData?.title || sheetMeta.title}
                  </h3>
                </div>
                <button type="button" onClick={() => setIsPreviewOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold block">TEMPLATE NAME:</span>
                    <span className="font-extrabold text-slate-900">{previewTemplateData?.name || previewTemplateData?.title || sheetMeta.title}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">STANDARD CODE:</span>
                    <span className="font-mono font-bold text-blue-700">{previewTemplateData?.standard || previewTemplateData?.isCode || sheetMeta.isCode}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">MATERIAL / SCOPE:</span>
                    <span className="font-bold text-slate-800">{previewTemplateData?.material || previewTemplateData?.category || sheetMeta.category}</span>
                  </div>
                </div>

                {activePreviewSections.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">Observation Template layout is currently empty</p>
                ) : (
                  activePreviewSections.map((sec) => (
                    <div key={sec.id} className="rounded-xl border border-slate-200 p-5 bg-white space-y-4">
                      <h4 className="text-sm font-bold text-[#2563EB] border-b pb-2">{sec.title}</h4>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {sec.fields.map((f) => {
                          const isTable = f.type === "table";
                          const colCount = f.colCount || 6;
                          const rowCount = f.rowCount || 6;

                          const tableWidthClass =
                            f.tableWidth === "33%" ? "w-full max-w-md" :
                            f.tableWidth === "50%" ? "w-full max-w-xl" :
                            f.tableWidth === "75%" ? "w-full max-w-3xl" : "w-full";

                          return (
                            <div key={f.id} className={isTable ? "col-span-full" : ""}>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                {f.label} {f.required && <span className="text-rose-500">*</span>}
                              </label>

                              {isTable ? (
                                <div className={`overflow-x-auto rounded-lg border border-slate-200 bg-white ${tableWidthClass}`}>
                                  <table className="w-full text-left text-xs border-collapse font-sans">
                                    <thead>
                                      <tr className="bg-slate-200/90 border-b border-slate-300 text-slate-700 font-bold text-xs font-mono">
                                        <th className="p-1.5 border-r border-slate-300 w-10 text-center bg-slate-300/60"></th>
                                        {Array.from({ length: colCount }).map((_, cIdx) => (
                                          <th key={cIdx} className="p-1.5 border-r border-slate-300 text-center">
                                            {String.fromCharCode(65 + cIdx)}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {Array.from({ length: rowCount }).map((_, rIdx) => {
                                        const rowNum = rIdx + 1;
                                        return (
                                          <tr key={rIdx} className="border-b border-slate-200">
                                            <td className="p-1.5 border-r border-slate-300 text-center font-mono text-[11px] font-bold text-slate-500 bg-slate-100/70">
                                              {rowNum}
                                            </td>
                                            {Array.from({ length: colCount }).map((_, cIdx) => {
                                              const colLetter = String.fromCharCode(65 + cIdx);
                                              const cellRef = `${colLetter}${rowNum}`;
                                              const mergeInfo = f.cellMerges?.[cellRef];

                                              if (mergeInfo?.hidden) return null;

                                              const rawCellVal = f.cellData?.[cellRef] || "";
                                              const evalVal = evaluateExcelCell(rawCellVal, f.cellData);

                                              const cellStyle = f.cellStyles?.[cellRef];
                                              const isBold = cellStyle?.bold;
                                              const isItalic = cellStyle?.italic;
                                              const isCenter = cellStyle?.center;

                                              return (
                                                <td
                                                  key={cIdx}
                                                  colSpan={mergeInfo?.colSpan || 1}
                                                  rowSpan={mergeInfo?.rowSpan || 1}
                                                  className="p-1 border-r border-slate-200"
                                                >
                                                  <textarea
                                                    rows={typeof evalVal === "string" && String(evalVal).includes("\n") ? 2 : 1}
                                                    value={evalVal}
                                                    placeholder=""
                                                    readOnly
                                                    className={`w-full bg-transparent px-1.5 py-1 text-xs focus:outline-none resize-none overflow-hidden whitespace-pre-wrap leading-tight ${
                                                      isBold ? "font-extrabold text-slate-900" : "text-slate-800"
                                                    } ${isItalic ? "italic" : ""} ${isCenter ? "text-center" : ""}`}
                                                  />
                                                </td>
                                              );
                                            })}
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                renderPreviewFieldInput(f)
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t px-6 py-3 bg-slate-50 flex justify-end">
                <Button onClick={() => setIsPreviewOpen(false)}>Close Preview</Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </MainLayout>
  );
};

export default ObservationTemplates;
