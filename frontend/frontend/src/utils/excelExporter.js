import { evaluateExcelCell, normalizeCellValue, getColumnLetter } from "./excelFormulaEvaluator";

/**
 * Exports a completed Observation Sheet to Microsoft Excel (.xls) file format
 * @param {Array} sections - Array of section objects containing fields/tables
 * @param {Object} sampleMeta - Sample metadata (e.g. Sample Code, Test Name, Date, Technician)
 * @param {string} sheetTitle - Title of the observation template
 */
export const exportObservationSheetToExcel = (sections = [], sampleMeta = {}, sheetTitle = "Observation Sheet") => {
  try {
    let htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${(sheetTitle || "Observation Sheet").replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 30)}</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 11pt; }
          th, td { border: 1px solid #CBD5E1; padding: 6px 10px; text-align: left; vertical-align: middle; }
          .header-cell { background-color: #243744; color: #FFFFFF; font-weight: bold; text-align: center; }
          .meta-title { font-size: 14pt; font-weight: bold; color: #243744; text-align: center; background-color: #F1F5F9; }
          .section-title { font-size: 12pt; font-weight: bold; color: #0F172A; background-color: #E2E8F0; }
          .meta-label { font-weight: bold; background-color: #F8FAFC; color: #334155; }
          .bold-cell { font-weight: bold; }
          .italic-cell { font-style: italic; }
          .center-cell { text-align: center; }
          .num-cell { text-align: right; }
        </style>
      </head>
      <body>
        <table>
          <!-- Document Header -->
          <tr>
            <td colspan="8" class="meta-title">${sheetTitle || "LABORATORY OBSERVATION SHEET"}</td>
          </tr>
          <tr><td colspan="8"></td></tr>
    `;

    // Add Sample Metadata Section if available
    if (sampleMeta && Object.keys(sampleMeta).length > 0) {
      htmlContent += `
        <tr>
          <td colspan="8" class="section-title">SAMPLE & TEST INFORMATION</td>
        </tr>
      `;

      const metaEntries = Object.entries(sampleMeta).filter(([_, v]) => v !== undefined && v !== null && v !== "");
      for (let i = 0; i < metaEntries.length; i += 2) {
        const [k1, v1] = metaEntries[i];
        const [k2, v2] = metaEntries[i + 1] || [];

        const label1 = String(k1).replace(/_/g, " ").toUpperCase();
        const label2 = k2 ? String(k2).replace(/_/g, " ").toUpperCase() : "";

        htmlContent += `
          <tr>
            <td class="meta-label">${label1}</td>
            <td colspan="3">${v1 || "-"}</td>
            ${k2 ? `<td class="meta-label">${label2}</td><td colspan="3">${v2 || "-"}</td>` : `<td colspan="4"></td>`}
          </tr>
        `;
      }
      htmlContent += `<tr><td colspan="8"></td></tr>`;
    }

    // Process all Sections
    sections.forEach((sec, sIdx) => {
      if (sec.title) {
        htmlContent += `
          <tr>
            <td colspan="8" class="section-title">${sec.title.toUpperCase()}</td>
          </tr>
        `;
      }

      // Collect all sheet cells across all fields in this section for formula calculation
      const allSheetCells = {};
      sections.forEach((s) => {
        s.fields?.forEach((f) => {
          if (f.type === "table" && f.cellData) {
            Object.entries(f.cellData).forEach(([ref, val]) => {
              allSheetCells[ref] = val;
            });
          }
        });
      });

      sec.fields?.forEach((f) => {
        if (f.type === "table") {
          const colCount = f.colCount || 6;
          const rowCount = f.rowCount || 6;

          // Render Table Header Row (A, B, C, D...)
          htmlContent += `
            <tr>
              <th class="header-cell" style="width: 40px;">#</th>
          `;
          for (let c = 0; c < colCount; c++) {
            htmlContent += `<th class="header-cell">${getColumnLetter(c)}</th>`;
          }
          htmlContent += `</tr>`;

          // Render Table Rows
          for (let r = 0; r < rowCount; r++) {
            const rowNum = r + 1;
            htmlContent += `<tr>`;
            htmlContent += `<td class="meta-label text-center" style="text-align: center;">${rowNum}</td>`;

            for (let c = 0; c < colCount; c++) {
              const colLetter = getColumnLetter(c);
              const cellRef = `${colLetter}${rowNum}`;
              const mergeInfo = f.cellMerges?.[cellRef];

              if (mergeInfo?.hidden) {
                continue;
              }

              const rawVal = normalizeCellValue(f.cellData?.[cellRef]);
              const evalVal = evaluateExcelCell(rawVal, allSheetCells);
              const cellStyle = f.cellStyles?.[cellRef] || {};

              const isBold = cellStyle.bold;
              const isItalic = cellStyle.italic;
              const isCenter = cellStyle.center;

              let cellClasses = [];
              if (isBold) cellClasses.push("bold-cell");
              if (isItalic) cellClasses.push("italic-cell");
              if (isCenter) cellClasses.push("center-cell");
              if (!isNaN(parseFloat(evalVal))) cellClasses.push("num-cell");

              const colSpanAttr = mergeInfo?.colSpan ? ` colspan="${mergeInfo.colSpan}"` : "";
              const rowSpanAttr = mergeInfo?.rowSpan ? ` rowspan="${mergeInfo.rowSpan}"` : "";

              htmlContent += `<td${colSpanAttr}${rowSpanAttr} class="${cellClasses.join(" ")}">${evalVal !== undefined && evalVal !== null ? String(evalVal) : ""}</td>`;
            }

            htmlContent += `</tr>`;
          }

          htmlContent += `<tr><td colspan="${colCount + 1}"></td></tr>`;
        } else if (f.type !== "heading" && f.type !== "divider" && f.label) {
          // Render Single Fields (inputs, dates, notes)
          htmlContent += `
            <tr>
              <td class="meta-label">${f.label}</td>
              <td colspan="7">${f.value || "-"}</td>
            </tr>
          `;
        }
      });
    });

    htmlContent += `
        </table>
      </body>
      </html>
    `;

    // Create Download Link
    const blob = new Blob([htmlContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const link = document.createElement("a");
    const filename = `${(sheetTitle || "Observation_Sheet").replace(/[^a-zA-Z0-9_-]/g, "_")}_${sampleMeta?.sample_code || sampleMeta?.sampleCode || "Export"}.xls`;

    if (navigator.msSaveBlob) {
      navigator.msSaveBlob(blob, filename);
    } else {
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    return true;
  } catch (err) {
    console.error("Failed to export observation sheet to Excel:", err);
    throw err;
  }
};
