import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FileSpreadsheet, FlaskConical, CheckCircle2, UserCheck, Calendar, Clock,
  Save, Check, Eye, Loader2, ArrowLeft, Layers3, TestTube2, AlertCircle, Info,
  Bold, Italic, AlignCenter, Plus, Minus, Lock, ArrowDown
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { MainLayout } from "../../components/layout";
import { Button } from "../../components/ui";
import { getObservationTemplates, getObservationTemplate } from "../../api/observationBuilder";
import { createSampleObservation, updateSampleObservation, getSampleObservation, getSampleObservations } from "../../api/sampleObservations";
import { getScopeTests } from "../../api/scope";
import { getSampleEntries } from "../../api/sampleEntries";
import { getAllTestingSamples } from "../../api/sampleMaster";

import { evaluateExcelCell, normalizeCellValue, adjustFormulaForOffset, getColumnLetter, parseCellRef, extractReferencedCells } from "../../utils/excelFormulaEvaluator";
import { exportObservationSheetToExcel } from "../../utils/excelExporter";

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
    return sec.map((s) => ({
      ...s,
      fields: (s.fields || []).map((f) => {
        if (f.type === "table" && f.cellData) {
          const normCellData = {};
          Object.entries(f.cellData).forEach(([k, v]) => {
            normCellData[k] = normalizeCellValue(v);
          });
          return { ...f, cellData: normCellData };
        }
        return f;
      }),
    }));
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
              rowCount: 12,
              colCount: 20,
              tableWidth: "100%",
              colHeaders: Array.from({ length: 26 }, (_, i) => getColumnLetter(i)),
              cellData: Object.fromEntries(
                Object.entries(sheet1Cells).map(([k, v]) => [k, normalizeCellValue(v)])
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

export default function ObservationSheetFiller({ observationId, templateId, onBack, readOnly }) {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const scopeTestIdParam = searchParams.get("scope_test_id");
  const sampleIdParam = searchParams.get("sample_id");
  const projectIdParam = searchParams.get("project_id");
  const obsIdParam = searchParams.get("observation_id");

  const activeObsId = observationId || obsIdParam;

  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState(null);
  const [sections, setSections] = useState([]);
  const [templateFixedCells, setTemplateFixedCells] = useState({});
  const [statusMsg, setStatusMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldValues, setFieldValues] = useState({});
  const [savedObservationId, setSavedObservationId] = useState(activeObsId || null);

  // Global active cell & active field selection state
  const [activeCellRef, setActiveCellRef] = useState(null);
  const [activeFieldId, setActiveFieldId] = useState(null);

  // Technician Sample Details
  const [sampleMeta, setSampleMeta] = useState({
    sampleNo: sampleIdParam ? `SAMPLE-${sampleIdParam}` : "LAB/2026/SOIL-094",
    testDate: new Date().toISOString().split("T")[0],
    technicianName: "Lab Technician",
    remarks: "",
  });

  // Dynamic cell dictionary across all sections for instant multi-cell/multi-table Excel formula evaluation
  const allSheetCells = React.useMemo(() => {
    const merged = {};
    (sections || []).forEach((sec) => {
      (sec.fields || []).forEach((f) => {
        if (f.cellData) {
          Object.entries(f.cellData).forEach(([k, v]) => {
            const norm = normalizeCellValue(v);
            merged[k] = norm;
            merged[k.toUpperCase()] = norm;
            merged[k.toLowerCase()] = norm;
          });
        }
      });
    });
    return merged;
  }, [sections]);

  // Load Observation Template or Saved Observation Entry from DB on mount
  useEffect(() => {
    const fetchTemplateData = async () => {
      try {
        setLoading(true);
        let loadedObsSections = null;
        let activeSampleId = sampleIdParam;

        // 1. If editing/viewing existing observation record from DB, fetch observation details first
        if (activeObsId) {
          try {
            const obsRes = await getSampleObservation(activeObsId);
            if (obsRes.data?.success && obsRes.data.data) {
              const obsObj = obsRes.data.data;
              setSavedObservationId(obsObj.observation_id);
              if (obsObj.sample_id || obsObj.testing_sample_id) {
                activeSampleId = obsObj.sample_id || obsObj.testing_sample_id;
              }

              let sData = obsObj.sheets_data;
              if (typeof sData === "string") {
                try {
                  sData = JSON.parse(sData);
                } catch (e) {
                  sData = {};
                }
              }

              if (sData) {
                if (sData.sections && Array.isArray(sData.sections) && sData.sections.length > 0) {
                  loadedObsSections = sData.sections;
                }
                if (sData.fieldValues) {
                  setFieldValues(sData.fieldValues);
                }
                if (sData.sampleMeta) {
                  setSampleMeta(sData.sampleMeta);
                }
              }
              if (obsObj.operator_name) {
                setSampleMeta((prev) => ({ ...prev, technicianName: obsObj.operator_name }));
              }
              if (obsObj.template_id && !templateId) {
                templateId = obsObj.template_id;
              }
            }
          } catch (e) {
            console.warn("Could not load existing observation record:", e);
          }
        } else if (sampleIdParam || scopeTestIdParam) {
          // If activeObsId was not passed in URL, check if an observation was already saved for this sample & test
          try {
            const queryParams = {};
            if (sampleIdParam) queryParams.sample_id = sampleIdParam;
            if (scopeTestIdParam) queryParams.scope_test_id = scopeTestIdParam;

            const existingObsRes = await getSampleObservations(queryParams);
            const existingRecords = existingObsRes.data?.data || [];
            if (existingRecords.length > 0) {
              const obsObj = existingRecords[0];
              setSavedObservationId(obsObj.observation_id);
              if (obsObj.sample_id || obsObj.testing_sample_id) {
                activeSampleId = obsObj.sample_id || obsObj.testing_sample_id;
              }

              let sData = obsObj.sheets_data;
              if (typeof sData === "string") {
                try {
                  sData = JSON.parse(sData);
                } catch (e) {
                  sData = {};
                }
              }

              if (sData) {
                if (sData.sections && Array.isArray(sData.sections) && sData.sections.length > 0) {
                  loadedObsSections = sData.sections;
                }
                if (sData.fieldValues) {
                  setFieldValues(sData.fieldValues);
                }
                if (sData.sampleMeta) {
                  setSampleMeta(sData.sampleMeta);
                }
              }
              if (obsObj.operator_name) {
                setSampleMeta((prev) => ({ ...prev, technicianName: obsObj.operator_name }));
              }
              if (obsObj.template_id && !templateId) {
                templateId = obsObj.template_id;
              }
            }
          } catch (e) {
            console.warn("Could not check existing observation by sample & test:", e);
          }
        }

        // Fetch detailed testing sample info if we have a sample ID
        let sampleDetails = null;
        if (activeSampleId) {
          try {
            const sampleRes = await getAllTestingSamples();
            const samples = sampleRes.data?.data || [];
            const foundSample = samples.find((s) => String(s.testing_sample_id) === String(activeSampleId));
            if (foundSample) {
              sampleDetails = foundSample;
              setSampleMeta((prev) => ({
                ...prev,
                sampleNo: foundSample.sample_code || `SAMPLE-${activeSampleId}`,
                locationName: foundSample.location_name || "",
                borelogNo: foundSample.borelog_no || "",
                projectName: foundSample.project_name || "",
              }));
            }
          } catch (e) {
            console.warn("Could not load testing sample metadata:", e);
          }
        }

        let targetTmpl = null;

        // 2. Fetch template by explicit templateId prop if provided
        if (templateId) {
          const res = await getObservationTemplate(templateId);
          if (res.data?.success && res.data.data) {
            targetTmpl = res.data.data;
          }
        }

        // 3. Fetch templates list to match scope_test_id parameter
        const listRes = await getObservationTemplates();
        const allTmpls = listRes.data?.data || [];

        if (!targetTmpl && scopeTestIdParam) {
          targetTmpl = allTmpls.find((t) => {
            if (t.scope_test_ids && Array.isArray(t.scope_test_ids)) {
              return t.scope_test_ids.some((id) => String(id) === String(scopeTestIdParam));
            }
            return String(t.scope_test_id) === String(scopeTestIdParam);
          });
        }

        if (targetTmpl) {
          setTemplate(targetTmpl);

          // Record all fixed SuperAdmin template cell texts so technicians CANNOT edit text headers, but CAN edit input cells & compute formulas
          const secData = parseSectionsData(targetTmpl);

          const fixedMap = {};
          secData.forEach((sec) => {
            (sec.fields || []).forEach((f) => {
              if (f.type === "table" && f.cellData) {
                fixedMap[f.id] = {};
                Object.entries(f.cellData).forEach(([cRef, val]) => {
                  const normVal = normalizeCellValue(val).trim();
                  if (normVal !== "" && !normVal.startsWith("=")) {
                    fixedMap[f.id][cRef] = true;
                  }
                });
              }
            });
          });
          setTemplateFixedCells(fixedMap);

          // Prioritize saved observation sections if editing existing record, else use blank template layout
          let targetSections = [];
          if (loadedObsSections && loadedObsSections.length > 0) {
            targetSections = loadedObsSections;
            setSections(loadedObsSections);
          } else {
            targetSections = secData;
            setSections(secData);
          }

          // Auto-fill template metadata fields (Name of Work, Location, Borehole No, Date of Testing)
          if (sampleDetails) {
            setFieldValues((prev) => {
              const autoVals = {};
              targetSections.forEach((sec) => {
                (sec.fields || []).forEach((f) => {
                  if (f.label && f.id) {
                    const lbl = f.label.toLowerCase().trim();
                    if (lbl.includes("name of work") || lbl.includes("project name") || lbl === "work") {
                      autoVals[f.id] = prev[f.id] || sampleDetails.project_name || "";
                    } else if (lbl === "site" || lbl.includes("location") || lbl === "site location") {
                      autoVals[f.id] = prev[f.id] || sampleDetails.location_name || "";
                    } else if (lbl.includes("borehole") || lbl.includes("borelog") || lbl.includes("bh id") || lbl === "bh no") {
                      autoVals[f.id] = prev[f.id] || sampleDetails.borelog_no || "";
                    } else if (lbl.includes("date of testing") || lbl.includes("testing date") || lbl === "date") {
                      autoVals[f.id] = prev[f.id] || new Date().toISOString().split("T")[0];
                    }
                  }
                });
              });
              return { ...autoVals, ...prev };
            });
          }
        } else if (loadedObsSections && loadedObsSections.length > 0) {
          setSections(loadedObsSections);
        }
      } catch (err) {
        console.error("Failed to load observation sheet template:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplateData();
  }, [activeObsId, templateId, scopeTestIdParam, sampleIdParam]);

  // Update Cell Value in Section Fields
  const handleUpdateCellVal = (fieldId, cellRef, val) => {
    // Block editing if SuperAdmin pre-filled template text
    if (templateFixedCells[fieldId]?.[cellRef]) {
      return;
    }

    setSections((prevSecs) =>
      prevSecs.map((sec) => ({
        ...sec,
        fields: sec.fields.map((f) => {
          if (f.id === fieldId) {
            return {
              ...f,
              cellData: {
                ...(f.cellData || {}),
                [cellRef]: val,
              },
            };
          }
          return f;
        }),
      }))
    );
  };

  const handleGridCellKeyDown = (e, fieldId, cellRef, colIndex, rowIndex, maxCols, maxRows) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const nextRow = rowIndex + 2;
      if (nextRow <= maxRows) {
        const nextCellRef = `${getColumnLetter(colIndex)}${nextRow}`;
        setActiveFieldId(fieldId);
        setActiveCellRef(nextCellRef);
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        if (colIndex > 0) {
          const prevCellRef = `${getColumnLetter(colIndex - 1)}${rowIndex + 1}`;
          setActiveFieldId(fieldId);
          setActiveCellRef(prevCellRef);
        }
      } else {
        if (colIndex + 1 < maxCols) {
          const nextCellRef = `${getColumnLetter(colIndex + 1)}${rowIndex + 1}`;
          setActiveFieldId(fieldId);
          setActiveCellRef(nextCellRef);
        }
      }
    }
  };

  // Toggle cell text formatting (bold, italic, center) globally
  const handleToggleCellFormat = (formatKey) => {
    if (!activeFieldId || !activeCellRef) return;
    setSections((prevSecs) =>
      prevSecs.map((sec) => ({
        ...sec,
        fields: sec.fields.map((f) => {
          if (f.id === activeFieldId) {
            const styles = { ...(f.cellStyles || {}) };
            const curr = styles[activeCellRef]?.[formatKey];
            styles[activeCellRef] = { ...(styles[activeCellRef] || {}), [formatKey]: !curr };
            return { ...f, cellStyles: styles };
          }
          return f;
        }),
      }))
    );
  };

  // Global Add Row handler
  const handleAddGlobalRow = () => {
    const targetId = activeFieldId || getFirstTableFieldId();
    if (!targetId) return;

    setSections((prevSecs) =>
      prevSecs.map((sec) => ({
        ...sec,
        fields: sec.fields.map((f) => (f.id === targetId ? { ...f, rowCount: (f.rowCount || 1) + 1 } : f)),
      }))
    );
  };

  // Global Remove Row handler
  const handleRemoveGlobalRow = () => {
    const targetId = activeFieldId || getFirstTableFieldId();
    if (!targetId) return;

    setSections((prevSecs) =>
      prevSecs.map((sec) => ({
        ...sec,
        fields: sec.fields.map((f) => {
          if (f.id === targetId) {
            const current = f.rowCount || 1;
            if (current <= 1) return f;
            return { ...f, rowCount: current - 1 };
          }
          return f;
        }),
      }))
    );
  };

  // Auto-fill active cell formula/value down to all remaining rows in current column with Excel relative reference adjustments (e.g. =100-I4 -> =100-I5, =100-I6...)
  const handleFillDownColumn = () => {
    const targetId = activeFieldId || getFirstTableFieldId();
    if (!targetId || !activeCellRef) {
      toast.error("Please click on a formula cell first (e.g. C4) to fill down!");
      return;
    }

    const { colStr: colLetter, row: sourceRow } = parseCellRef(activeCellRef);

    setSections((prevSecs) =>
      prevSecs.map((sec) => ({
        ...sec,
        fields: sec.fields.map((f) => {
          if (f.id === targetId) {
            const currentCellData = { ...(f.cellData || {}) };
            const sourceFormula = normalizeCellValue(currentCellData[activeCellRef] || currentCellData[activeCellRef.toLowerCase()]);

            if (!sourceFormula) {
              toast.error(`Cell ${activeCellRef} is empty! Please enter a formula first (e.g. =100-I4).`);
              return f;
            }

            const totalRows = f.rowCount || 12;
            let updatedCount = 0;

            for (let r = sourceRow + 1; r <= totalRows; r++) {
              const targetRef = `${colLetter}${r}`;
              const rowOffset = r - sourceRow;
              const adjustedFormula = adjustFormulaForOffset(sourceFormula, rowOffset, 0);
              currentCellData[targetRef] = adjustedFormula;
              updatedCount++;
            }

            toast.success(`Auto-filled ${sourceFormula} down ${updatedCount} rows (${colLetter}${sourceRow + 1}:${colLetter}${totalRows})!`);

            return {
              ...f,
              cellData: currentCellData,
            };
          }
          return f;
        }),
      }))
    );
  };

  // Global Add Column handler
  const handleAddGlobalCol = () => {
    const targetId = activeFieldId || getFirstTableFieldId();
    if (!targetId) return;

    setSections((prevSecs) =>
      prevSecs.map((sec) => ({
        ...sec,
        fields: sec.fields.map((f) => {
          if (f.id === targetId) {
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

  // Global Remove Column handler
  const handleRemoveGlobalCol = () => {
    const targetId = activeFieldId || getFirstTableFieldId();
    if (!targetId) return;

    setSections((prevSecs) =>
      prevSecs.map((sec) => ({
        ...sec,
        fields: sec.fields.map((f) => {
          if (f.id === targetId) {
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

  // Helper to find first table field ID
  const getFirstTableFieldId = () => {
    for (const sec of sections) {
      for (const f of sec.fields || []) {
        if (f.type === "table") return f.id;
      }
    }
    return null;
  };

  // Update standard non-table field value
  const handleUpdateFieldValue = (fieldId, val) => {
    setFieldValues((prev) => ({
      ...prev,
      [fieldId]: val,
    }));
  };

  const handleGoBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate("/observation-entry");
    }
  };

  // Export filled observation sheet to Microsoft Excel (.xls)
  const handleExportExcel = () => {
    try {
      exportObservationSheetToExcel(sections, sampleMeta, template?.name || "Observation Sheet");
      toast.success("Observation Sheet exported to Excel (.xls) successfully!");
    } catch (err) {
      console.error("Export Excel error:", err);
      toast.error("Failed to export Excel file. Please try again.");
    }
  };

  // Persist filled test readings into PostgreSQL sample_observations DB table (Save Draft vs Submit)
  const handleSubmitReadings = async (statusOverride = "Submitted") => {
    try {
      setSubmitting(true);

      const payload = {
        project_id: projectIdParam || 1,
        sample_id: sampleIdParam || 101,
        testing_sample_id: sampleIdParam || null,
        scope_test_id: scopeTestIdParam || template?.scope_test_id || 1,
        template_id: templateId || template?.template_id || template?.id || null,
        test_name: template?.name || template?.title || "Lab Test Observation Sheet",
        test_method: template?.standard || "IS Standard Code",
        operator_name: sampleMeta.technicianName || "Lab Technician",
        sheets_data: {
          sections: sections,
          fieldValues: fieldValues,
          sampleMeta: sampleMeta,
        },
        status: statusOverride,
      };

      let res;
      if (savedObservationId) {
        res = await updateSampleObservation(savedObservationId, payload);
      } else {
        res = await createSampleObservation(payload);
      }

      if (res.data?.success && res.data.data?.observation_id) {
        setSavedObservationId(res.data.data.observation_id);
      }

      if (statusOverride === "Draft") {
        toast.success("Observation Sheet draft saved successfully!");
      } else {
        toast.success("Observation Sheet readings submitted for QA/QC approval!");
      }

      // Immediately redirect back to the Master Observations List page
      setTimeout(() => {
        handleGoBack();
      }, 400);

    } catch (err) {
      console.error("Save observation reading failed:", err);
      toast.error(err.response?.data?.message || "Failed to save observation record to database");
    } finally {
      setSubmitting(false);
    }
  };

  // Render dynamic field inputs based on exact field type
  const renderDynamicField = (f) => {
    const val = fieldValues[f.id] ?? f.value ?? "";

    switch (f.type) {
      case "date":
        return (
          <div className="relative">
            <input
              type="date"
              value={val}
              disabled={readOnly}
              onChange={(e) => handleUpdateFieldValue(f.id, e.target.value)}
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-xs font-bold text-[#0F172A] focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 outline-none cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
            />
          </div>
        );

      case "time":
        return (
          <input
            type="time"
            value={val}
            disabled={readOnly}
            onChange={(e) => handleUpdateFieldValue(f.id, e.target.value)}
            className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-xs font-bold text-[#0F172A] focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 outline-none cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          />
        );

      case "number":
      case "calculation":
        return (
          <input
            type="number"
            placeholder={f.placeholder || "Enter numeric reading"}
            value={val}
            disabled={readOnly}
            onChange={(e) => handleUpdateFieldValue(f.id, e.target.value)}
            className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-xs font-bold text-[#0F172A] focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 outline-none disabled:opacity-75 disabled:cursor-not-allowed"
          />
        );

      case "dropdown":
        return (
          <select
            value={val}
            disabled={readOnly}
            onChange={(e) => handleUpdateFieldValue(f.id, e.target.value)}
            className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-xs font-bold text-[#0F172A] focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 outline-none disabled:opacity-75 disabled:cursor-not-allowed"
          >
            <option value="">Select option...</option>
            {(f.options || ["Option 1", "Option 2", "Option 3"]).map((opt, idx) => (
              <option key={idx} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case "textarea":
        return (
          <textarea
            rows={3}
            placeholder={f.placeholder || "Enter details..."}
            value={val}
            disabled={readOnly}
            onChange={(e) => handleUpdateFieldValue(f.id, e.target.value)}
            className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-xs font-medium text-[#0F172A] focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 outline-none resize-y disabled:opacity-75 disabled:cursor-not-allowed"
          />
        );

      case "checkbox":
        return (
          <label className={`flex items-center gap-2.5 pt-1 select-none ${readOnly ? "cursor-not-allowed" : "cursor-pointer"}`}>
            <input
              type="checkbox"
              checked={!!val}
              disabled={readOnly}
              onChange={(e) => handleUpdateFieldValue(f.id, e.target.checked)}
              className="h-4 w-4 rounded border-[#CBD5E1] text-[#243744] focus:ring-[#243744] disabled:opacity-75"
            />
            <span className="text-xs font-bold text-[#1E293B]">{f.placeholder || f.label}</span>
          </label>
        );

      case "file":
      case "photo":
        return (
          <input
            type="file"
            disabled={readOnly}
            onChange={(e) => handleUpdateFieldValue(f.id, e.target.files?.[0]?.name || "")}
            className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs text-[#0F172A] file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#243744]/10 file:text-[#243744] hover:file:bg-[#243744]/20 outline-none disabled:opacity-75 disabled:cursor-not-allowed"
          />
        );

      case "heading":
        return (
          <h4 className="text-sm font-extrabold text-[#243744] border-b border-[#E2E8F0] pb-1">
            {f.label}
          </h4>
        );

      case "note":
        return (
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-[#243744] flex items-start gap-2">
            <Info size={16} className="shrink-0 text-[#2563EB] mt-0.5" />
            <p className="font-semibold">{f.helpText || f.label || "Instruction note for test entry"}</p>
          </div>
        );

      case "divider":
        return <hr className="border-t border-[#E2E8F0] my-2" />;

      default:
        return (
          <input
            type="text"
            placeholder={f.placeholder || `Enter ${f.label}`}
            value={val}
            onChange={(e) => handleUpdateFieldValue(f.id, e.target.value)}
            className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-xs font-medium text-[#0F172A] focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 outline-none"
          />
        );
    }
  };

  if (loading) {
    return (
      <MainLayout headerTitle="Fill Observation Sheet" headerSubtitle="User / Lab Technician Test Readings Entry">
        <Toaster position="top-right" richColors />
        <div className="flex h-64 items-center justify-center gap-2 text-[#64748B]">
          <Loader2 className="animate-spin text-[#243744]" size={22} />
          <span className="text-xs font-bold">Loading Lab Observation Sheet...</span>
        </div>
      </MainLayout>
    );
  }

  // Active cell style state for global toolbar toggles
  const activeField = sections.flatMap((s) => s.fields || []).find((f) => f.id === activeFieldId);
  const activeCellStyle = activeField && activeCellRef ? activeField.cellStyles?.[activeCellRef] : null;

  return (
    <MainLayout
      headerTitle={template?.name || "Observation Entry"}
      headerSubtitle={template?.standard ? `Standard/Method: ${template.standard}` : "User / Lab Technician Test Readings Entry"}
    >
      <Toaster position="top-right" richColors />
      <div className="flex flex-col bg-[#F8FAFC] min-h-[calc(100vh-4rem)] p-4 sm:p-6 space-y-5">
        <div className="w-full max-w-full space-y-5">

          {/* SINGLE ROW TOP BAR: Back button (Left) + Actions right beside it (No Card Wrapper) */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                icon={ArrowLeft}
                onClick={handleGoBack}
              >
                Back
              </Button>
              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer"
                title="Export complete observation sheet to Microsoft Excel (.xls)"
              >
                <FileSpreadsheet size={15} />
                <span>Export Excel</span>
              </button>
              {readOnly && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-xl shadow-2xs">
                  <Info size={14} className="text-amber-600" />
                  View Mode (Read-only)
                </span>
              )}
              {sampleMeta.sampleNo && (
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 font-extrabold rounded-xl shadow-2xs">
                    <FlaskConical size={14} className="text-blue-600" />
                    Sample: {sampleMeta.sampleNo}
                  </span>
                  {sampleMeta.borelogNo && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold rounded-xl shadow-2xs font-mono">
                      <Layers3 size={14} className="text-emerald-600" />
                      Borehole: {sampleMeta.borelogNo}
                    </span>
                  )}
                  {sampleMeta.locationName && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-800 font-extrabold rounded-xl shadow-2xs">
                      Location: {sampleMeta.locationName}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Actions placed directly on the right side in the same row without card */}
            {!readOnly && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#243744] bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 min-w-[42px] text-center shadow-2xs">
                  {activeCellRef || "A1"}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggleCellFormat("bold")}
                    className={`p-2 rounded-xl border text-xs font-bold transition-colors ${activeCellStyle?.bold ? "bg-[#243744] text-white border-[#243744]" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    title="Bold Text"
                  >
                    <Bold size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleCellFormat("italic")}
                    className={`p-2 rounded-xl border text-xs transition-colors ${activeCellStyle?.italic ? "bg-[#243744] text-white border-[#243744]" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    title="Italic Text"
                  >
                    <Italic size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleCellFormat("center")}
                    className={`p-2 rounded-xl border text-xs transition-colors ${activeCellStyle?.center ? "bg-[#243744] text-white border-[#243744]" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    title="Align Center"
                  >
                    <AlignCenter size={14} />
                  </button>
                </div>

                <div className="h-5 w-px bg-slate-300 mx-1" />

                {/* Formula Bar (fx) & Live Evaluated Result */}
                <div className="flex items-center gap-1.5 flex-1 min-w-[280px]">
                  <span className="font-serif italic font-extrabold text-[#243744] text-xs px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200 shadow-2xs select-none">
                    fx
                  </span>
                  {(() => {
                    const targetId = activeFieldId || getFirstTableFieldId();
                    let rawVal = "";
                    let evalVal = "";
                    if (targetId && activeCellRef) {
                      for (const s of sections) {
                        const foundF = (s.fields || []).find((f) => f.id === targetId);
                        if (foundF) {
                          rawVal = normalizeCellValue(foundF.cellData?.[activeCellRef]);
                          evalVal = evaluateExcelCell(rawVal, allSheetCells);
                          break;
                        }
                      }
                    }

                    return (
                      <>
                        <input
                          type="text"
                          placeholder="Formula or value (e.g. =A1+B1 or =SQRT(A1))"
                          value={rawVal}
                          onChange={(e) => {
                            if (targetId && activeCellRef) {
                              handleUpdateCellVal(targetId, activeCellRef, e.target.value);
                            }
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#243744]/20 shadow-2xs"
                        />
                        {rawVal.startsWith("=") && (
                          <div className="shrink-0 font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200/80 shadow-2xs flex items-center gap-1">
                            <span className="text-[10px] text-emerald-600 uppercase tracking-wider font-sans font-semibold">Result:</span>
                            <span>{evalVal}</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                <button
                  type="button"
                  onClick={handleFillDownColumn}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  title="Auto-fill active formula down to all rows in column with relative Excel index adjustment (e.g. =100-I4 -> =100-I5, =100-I6...)"
                >
                  <ArrowDown size={14} />
                  <span>Fill Down</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddGlobalRow}
                  className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition-colors shadow-2xs"
                >
                  + Add Row
                </button>
                <button
                  type="button"
                  onClick={handleRemoveGlobalRow}
                  className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition-colors shadow-2xs"
                >
                  - Remove Row
                </button>
                <button
                  type="button"
                  onClick={handleAddGlobalCol}
                  className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition-colors shadow-2xs"
                >
                  + Add Col
                </button>
                <button
                  type="button"
                  onClick={handleRemoveGlobalCol}
                  className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition-colors shadow-2xs"
                >
                  - Remove Col
                </button>
              </div>
            )}
          </div>

          {/* Interactive Full-Width Observation Tables Grid */}
          {sections.length === 0 ? (
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-14 text-center shadow-sm">
              <FileSpreadsheet size={44} className="mx-auto text-amber-500 mb-3" />
              <h3 className="text-base font-bold text-[#1E293B]">No Observation Template Found</h3>
              <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto">
                No matching observation template has been designed/created for this test yet. Please ask your administrator to design a template in the Template Designer first.
              </p>
              <button
                type="button"
                onClick={handleGoBack}
                className="mt-4 px-4 py-2 bg-[#243744] hover:bg-[#1A2733] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Go Back
              </button>
            </div>
          ) : (
            sections.map((sec) => (
              <div key={sec.id} className="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-6 shadow-sm space-y-4 overflow-x-auto">

                {/* Header Title Bar (ONLY show if sec.title exists and is not empty) */}
                {sec.title && sec.title.trim() && (
                  <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3 mb-2">
                    <h3 className="text-sm font-extrabold text-[#243744] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#243744]" />
                      {sec.title}
                    </h3>
                  </div>
                )}

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {sec.fields.map((f) => {
                    const isTable = f.type === "table";
                    const isHeadingOrNoteOrDivider = f.type === "heading" || f.type === "note" || f.type === "divider";
                    const colCount = f.colCount || 6;
                    const rowCount = f.rowCount || 6;

                    return (
                      <div key={f.id} className={isTable || isHeadingOrNoteOrDivider ? "col-span-full overflow-x-auto" : ""}>
                        {!isHeadingOrNoteOrDivider && f.label && f.label !== "Observation Table Grid" && (
                          <label className="block text-xs font-bold text-[#1E293B] mb-2">
                            {f.label} {f.required && <span className="text-rose-500">*</span>}
                          </label>
                        )}

                        {isTable ? (
                          <div className="w-full rounded-xl border border-[#E2E8F0] bg-white shadow-2xs overflow-x-auto touch-pan-x">
                            <table className="w-full text-left text-xs border-collapse font-sans min-w-[650px]">
                              <thead>
                                <tr className="bg-[#243744] text-white font-bold text-xs font-mono select-none">
                                  <th className="p-2 border-r border-[#34495E] w-10 text-center bg-[#1A2733]">#</th>
                                  {Array.from({ length: colCount }).map((_, cIdx) => {
                                    const colLetter = getColumnLetter(cIdx);
                                    const activeParsed = activeCellRef ? parseCellRef(activeCellRef) : null;
                                    const isColActive = activeFieldId === f.id && activeParsed && activeParsed.colStr === colLetter;
                                    return (
                                      <th
                                        key={cIdx}
                                        className={`p-2 border-r border-[#34495E] text-center font-mono min-w-[90px] transition-colors ${
                                          isColActive ? "bg-[#101D28] text-amber-300 font-extrabold ring-1 ring-amber-300/40" : "text-white"
                                        }`}
                                      >
                                        {colLetter}
                                      </th>
                                    );
                                  })}
                                </tr>
                              </thead>
                                <tbody className="divide-y divide-[#E2E8F0]">
                                  {Array.from({ length: rowCount }).map((_, rIdx) => {
                                    const rowNum = rIdx + 1;
                                    const activeParsed = activeCellRef ? parseCellRef(activeCellRef) : null;
                                    const isRowActive = activeFieldId === f.id && activeParsed && activeParsed.row === rowNum;
                                    return (
                                      <tr key={rIdx} className="hover:bg-[#FAF9FF] transition-colors">
                                        <td
                                          className={`p-2 border-r border-[#E2E8F0] text-center font-mono text-[11px] transition-colors ${
                                            isRowActive ? "bg-[#243744] text-amber-300 font-extrabold ring-1 ring-amber-300/40" : "font-bold text-[#64748B] bg-[#F8FAFC]"
                                          }`}
                                        >
                                          {rowNum}
                                        </td>
                                        {Array.from({ length: colCount }).map((_, cIdx) => {
                                          const colLetter = getColumnLetter(cIdx);
                                          const cellRef = `${colLetter}${rowNum}`;
                                          const mergeInfo = f.cellMerges?.[cellRef];

                                          if (mergeInfo?.hidden) {
                                            return null;
                                          }

                                          const isSuperAdminFixed = !!templateFixedCells[f.id]?.[cellRef];
                                          const rawCellVal = normalizeCellValue(f.cellData?.[cellRef]);
                                          const evalVal = evaluateExcelCell(rawCellVal, allSheetCells);
                                          const isFocused = activeFieldId === f.id && activeCellRef === cellRef;
                                          const displayVal = isFocused ? rawCellVal : evalVal;

                                          // Active formula reference cell highlighting
                                          const activeRawVal = activeFieldId && activeCellRef ? normalizeCellValue(sections.find(s => s.fields.some(field => field.id === activeFieldId))?.fields.find(field => field.id === activeFieldId)?.cellData?.[activeCellRef]) : "";
                                          const activeRefs = extractReferencedCells(activeRawVal);
                                          const refIndex = activeRefs.indexOf(cellRef);
                                          const isReferenced = refIndex !== -1;

                                          const refHighlightClass = isReferenced
                                            ? refIndex === 0
                                              ? "ring-2 ring-blue-500 bg-blue-50/80 font-bold"
                                              : refIndex === 1
                                                ? "ring-2 ring-emerald-500 bg-emerald-50/80 font-bold"
                                                : refIndex === 2
                                                  ? "ring-2 ring-purple-500 bg-purple-50/80 font-bold"
                                                  : refIndex === 3
                                                    ? "ring-2 ring-amber-500 bg-amber-50/80 font-bold"
                                                    : "ring-2 ring-rose-500 bg-rose-50/80 font-bold"
                                            : "";

                                          const cellStyle = f.cellStyles?.[cellRef];
                                          const isBold = cellStyle?.bold;
                                          const isItalic = cellStyle?.italic;
                                          const isCenter = cellStyle?.center;

                                          return (
                                            <td
                                              key={cIdx}
                                              colSpan={mergeInfo?.colSpan || 1}
                                              rowSpan={mergeInfo?.rowSpan || 1}
                                              onClick={(e) => {
                                                if (activeFieldId && activeCellRef && activeCellRef !== cellRef) {
                                                  const activeVal = normalizeCellValue(sections.find(s => s.fields.some(field => field.id === activeFieldId))?.fields.find(field => field.id === activeFieldId)?.cellData?.[activeCellRef]);
                                                  if (activeVal.startsWith("=")) {
                                                    e.stopPropagation();
                                                    handleUpdateCellVal(activeFieldId, activeCellRef, `${activeVal}${cellRef}`);
                                                    return;
                                                  }
                                                }
                                                setActiveFieldId(f.id);
                                                setActiveCellRef(cellRef);
                                              }}
                                              className={`p-1 border-r border-[#E2E8F0] relative ${isSuperAdminFixed ? "bg-[#F1F5F9]/80" : isFocused ? "ring-[#243744] bg-blue-50/70" : "focus-within:bg-blue-50/50"
                                                } ${refHighlightClass}`}
                                            >
                                              {isSuperAdminFixed || readOnly ? (
                                                <div
                                                  className={`w-full bg-transparent px-2 py-1.5 text-xs whitespace-pre-wrap break-words leading-relaxed ${isSuperAdminFixed
                                                    ? "font-bold text-[#243744] select-none"
                                                    : isBold
                                                      ? "font-extrabold text-[#0F172A]"
                                                      : "text-[#1E293B]"
                                                    } ${isItalic ? "italic" : ""} ${isCenter ? "text-center" : ""}`}
                                                  title={isSuperAdminFixed ? "Fixed template label set by SuperAdmin (Read-only)" : ""}
                                                >
                                                  {evalVal}
                                                </div>
                                              ) : (
                                                <textarea
                                                  rows={typeof displayVal === "string" && String(displayVal).includes("\n") ? 2 : 1}
                                                  value={displayVal}
                                                  onChange={(e) => handleUpdateCellVal(f.id, cellRef, e.target.value)}
                                                  onKeyDown={(e) => handleGridCellKeyDown(e, f.id, cellRef, cIdx, rIdx, colCount, rowCount)}
                                                  onFocus={() => {
                                                    setActiveFieldId(f.id);
                                                    setActiveCellRef(cellRef);
                                                  }}
                                                  placeholder=""
                                                  className={`w-full bg-transparent px-2 py-1.5 text-xs focus:outline-none resize-none overflow-hidden whitespace-pre-wrap leading-relaxed ${isBold
                                                    ? "font-extrabold text-[#0F172A]"
                                                    : "text-[#1E293B]"
                                                    } ${isItalic ? "italic" : ""} ${isCenter ? "text-center" : ""}`}
                                                />
                                              )}

                                              {isFocused && !isSuperAdminFixed && !readOnly && (
                                                <div
                                                  className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-[#243744] border border-white cursor-ns-resize z-20 shadow-xs hover:scale-125 transition-transform"
                                                  title="Double-click to Auto-Fill down column"
                                                  onDoubleClick={(e) => {
                                                    e.stopPropagation();
                                                    handleFillDownColumn();
                                                  }}
                                                />
                                              )}
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
                          renderDynamicField(f)
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          {/* ACTIONS: EXPORT TO EXCEL vs SAVE DRAFT vs SUBMIT TEST READINGS */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#475569]">
              <UserCheck size={18} className="text-emerald-600" />
              <span>{readOnly ? "View mode: You can review test readings or export the complete sheet to Excel." : "Ensure all required test readings are filled before submitting for QA/QC approval."}</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 flex-wrap">
              <button
                type="button"
                onClick={handleExportExcel}
                className="w-full sm:w-auto rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-5 py-2.5 text-xs font-bold shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                title="Export complete observation sheet to Microsoft Excel (.xls)"
              >
                <FileSpreadsheet size={16} className="text-emerald-700" />
                <span>Export to Excel</span>
              </button>

              {!readOnly && (
                <>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSubmitReadings("Draft")}
                    className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={15} className="animate-spin text-slate-500" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save size={15} />
                        <span>Save Draft</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSubmitReadings("Submitted")}
                    className="w-full sm:w-auto rounded-xl bg-[#243744] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#1A2733] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} />
                        <span>Submit Test Readings</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </MainLayout>
  );
}
