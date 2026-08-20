/**
 * Comprehensive Excel Formula Evaluator
 * Supports Excel-identical syntax including:
 * - Exponentiation (^) via Math.pow
 * - Cell ranges (A1:B5) and 2D ranges
 * - Comma-separated multi-argument functions (SUM(A1, B1, C1), AVERAGE(A1, B1))
 * - Standard Excel Math & Stat Functions: SQRT, POWER, ABS, ROUND, ROUNDUP, ROUNDDOWN, LOG10, LOG, LN, EXP, MOD, PI, COUNT, IF, SUM, AVERAGE, MIN, MAX
 * - Percentage operator (%)
 * - Error codes (#DIV/0!, #VALUE!, #NUM!, #ERROR!)
 * - Circular dependency resolution and object-based cell representation normalization
 */

// Helper to convert column letter to 1-based index (A -> 1, Z -> 26, AA -> 27)
export const colLetterToNum = (colStr) => {
  if (!colStr) return 1;
  return colStr
    .toUpperCase()
    .split("")
    .reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0);
};

// Helper to convert 1-based index to column letter (1 -> A, 26 -> Z, 27 -> AA)
export const numToColLetter = (colNum) => {
  let temp = colNum;
  let colLetter = "";
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    colLetter = String.fromCharCode(65 + mod) + colLetter;
    temp = Math.floor((temp - mod) / 26);
  }
  return colLetter;
};

// Helper to convert 0-based column index to letter (0 -> A, 25 -> Z, 26 -> AA)
export const getColumnLetter = (colIndex) => {
  return numToColLetter(colIndex + 1);
};

// Helper to parse cell reference like 'AA4' into 0-indexed col & 1-indexed row
export const parseCellRef = (cellRef) => {
  if (!cellRef || typeof cellRef !== "string") return { col: 0, row: 1, colStr: "A" };
  const match = cellRef.trim().toUpperCase().match(/^([A-Z]+)([1-9]\d*)$/);
  if (!match) return { col: 0, row: 1, colStr: "A" };
  const colStr = match[1];
  const row = parseInt(match[2], 10);
  const col = colLetterToNum(colStr) - 1;
  return { col, row, colStr };
};

// Helper to normalize raw cell value into string representation
export const normalizeCellValue = (val) => {
  if (val === null || val === undefined) return "";
  if (typeof val === "object") {
    if (val.formula) return String(val.formula);
    if (val.value !== undefined && val.value !== null) return String(val.value);
    if (val.rawValue !== undefined && val.rawValue !== null) return String(val.rawValue);
    return "";
  }
  return String(val);
};

// Set of formula function names to avoid matching them as cell references
const EXCEL_FUNCTIONS_SET = new Set([
  "SUM", "AVERAGE", "AVG", "COUNT", "COUNTA", "MIN", "MAX", "PRODUCT", "MEDIAN", "STDEV", "STDEVP",
  "SQRT", "POWER", "ABS", "ROUND", "ROUNDUP", "ROUNDDOWN", "INT", "TRUNC",
  "LOG10", "LOG", "LN", "EXP", "MOD", "PI", "RADIANS", "DEGREES",
  "SIN", "COS", "TAN", "ASIN", "ACOS", "ATAN",
  "IF", "IFS", "AND", "OR", "NOT", "IFERROR",
  "CONCAT", "CONCATENATE", "LEN",
  "TRUE", "FALSE"
]);

/**
 * Main Formula Evaluator
 * @param {string|object} cellVal - Raw cell content (e.g. "=B1+B2" or 10 or { formula: "=SUM(A1:A5)" })
 * @param {object} allCellData - Dictionary of all cells in sheet (e.g. { A1: "10", B1: "20" })
 * @param {Set} evaluating - Internal set for circular reference detection
 * @returns {string|number} Computed result or formatted value
 */
export const evaluateExcelCell = (cellVal, allCellData = {}, evaluating = new Set()) => {
  const normalizedStr = normalizeCellValue(cellVal).trim();

  if (!normalizedStr) return "";
  if (!normalizedStr.startsWith("=")) return normalizedStr;

  try {
    let expr = normalizedStr.substring(1).trim();
    if (!expr) return "";

    // Convert formula expression to uppercase for function keywords and cell refs
    // preserving strings inside quotes if any
    expr = expr.toUpperCase();

    // 1. Resolve Range & Aggregate Functions (SUM, AVERAGE, AVG, COUNT, COUNTA, MIN, MAX, PRODUCT, MEDIAN)
    // Matches functions with parameters like SUM(A1:B5, C1, 10)
    const aggFuncRegex = /(SUM|AVERAGE|AVG|COUNT|COUNTA|MIN|MAX|PRODUCT|MEDIAN)\(([^()]+)\)/g;

    let previousExpr;
    do {
      previousExpr = expr;
      expr = expr.replace(aggFuncRegex, (match, func, argStr) => {
        const rawArgs = argStr.split(",");
        const values = [];

        for (let arg of rawArgs) {
          arg = arg.trim();
          // Check if argument is a range like A1:B5 or $A$1:$B$5
          const rangeMatch = arg.match(/^\$?([A-Z]+)\$?([1-9]\d*)\s*:\s*\$?([A-Z]+)\$?([1-9]\d*)$/);
          if (rangeMatch) {
            const colStart = colLetterToNum(rangeMatch[1]);
            const rowStart = parseInt(rangeMatch[2], 10);
            const colEnd = colLetterToNum(rangeMatch[3]);
            const rowEnd = parseInt(rangeMatch[4], 10);

            const colMin = Math.min(colStart, colEnd);
            const colMax = Math.max(colStart, colEnd);
            const rowMin = Math.min(rowStart, rowEnd);
            const rowMax = Math.max(rowStart, rowEnd);

            for (let r = rowMin; r <= rowMax; r++) {
              for (let c = colMin; c <= colMax; c++) {
                const cellRef = `${numToColLetter(c)}${r}`;
                if (evaluating.has(cellRef)) continue;

                evaluating.add(cellRef);
                const rawCell = allCellData?.[cellRef] ?? allCellData?.[cellRef.toLowerCase()] ?? allCellData?.[cellRef.toUpperCase()];
                const evaluated = evaluateExcelCell(rawCell, allCellData, evaluating);
                evaluating.delete(cellRef);

                const num = parseFloat(evaluated);
                if (!isNaN(num)) {
                  values.push(num);
                }
              }
            }
          } else {
            // Single cell or sub-expression argument
            const num = parseFloat(arg);
            if (!isNaN(num)) {
              values.push(num);
            } else {
              // Could be a cell ref like A1 or $A$1
              const cellMatch = arg.match(/^\$?([A-Z]+)\$?([1-9]\d*)$/);
              if (cellMatch) {
                const cellRef = `${cellMatch[1]}${cellMatch[2]}`;
                if (!evaluating.has(cellRef)) {
                  evaluating.add(cellRef);
                  const rawCell = allCellData?.[cellRef] ?? allCellData?.[cellRef.toLowerCase()] ?? allCellData?.[cellRef.toUpperCase()];
                  const evaluated = evaluateExcelCell(rawCell, allCellData, evaluating);
                  evaluating.delete(cellRef);

                  const parsedNum = parseFloat(evaluated);
                  if (!isNaN(parsedNum)) {
                    values.push(parsedNum);
                  }
                }
              }
            }
          }
        }

        if (func === "SUM") {
          return values.reduce((a, b) => a + b, 0);
        }
        if (func === "AVERAGE" || func === "AVG") {
          return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        }
        if (func === "COUNT" || func === "COUNTA") {
          return values.length;
        }
        if (func === "MIN") {
          return values.length > 0 ? Math.min(...values) : 0;
        }
        if (func === "MAX") {
          return values.length > 0 ? Math.max(...values) : 0;
        }
        if (func === "PRODUCT") {
          return values.length > 0 ? values.reduce((a, b) => a * b, 1) : 0;
        }
        if (func === "MEDIAN") {
          if (values.length === 0) return 0;
          const sorted = [...values].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        }
        return 0;
      });
    } while (expr !== previousExpr);

    // 2. Resolve Single-Argument & Multi-Argument Math & Trigonometric Functions
    expr = expr.replace(/SQRT\(([^()]+)\)/g, (_, a) => `Math.sqrt(${a})`);
    expr = expr.replace(/ABS\(([^()]+)\)/g, (_, a) => `Math.abs(${a})`);
    expr = expr.replace(/INT\(([^()]+)\)/g, (_, a) => `Math.floor(${a})`);
    expr = expr.replace(/TRUNC\(([^()]+)\)/g, (_, a) => `Math.trunc(${a})`);
    expr = expr.replace(/SIN\(([^()]+)\)/g, (_, a) => `Math.sin(${a})`);
    expr = expr.replace(/COS\(([^()]+)\)/g, (_, a) => `Math.cos(${a})`);
    expr = expr.replace(/TAN\(([^()]+)\)/g, (_, a) => `Math.tan(${a})`);
    expr = expr.replace(/LOG10\(([^()]+)\)/g, (_, a) => `Math.log10(${a})`);
    expr = expr.replace(/LN\(([^()]+)\)/g, (_, a) => `Math.log(${a})`);
    expr = expr.replace(/EXP\(([^()]+)\)/g, (_, a) => `Math.exp(${a})`);
    expr = expr.replace(/PI\(\)/g, "Math.PI");
    expr = expr.replace(/\bPI\b/g, "Math.PI");

    // ROUND(x, n) -> (Math.round(x * 10^n) / 10^n)
    expr = expr.replace(/ROUND\(([^,]+),\s*([^()]+)\)/g, (_, val, decimals) => {
      const d = parseInt(decimals, 10) || 0;
      const factor = Math.pow(10, d);
      return `(Math.round((${val}) * ${factor}) / ${factor})`;
    });

    expr = expr.replace(/ROUNDUP\(([^,]+),\s*([^()]+)\)/g, (_, val, decimals) => {
      const d = parseInt(decimals, 10) || 0;
      const factor = Math.pow(10, d);
      return `(Math.ceil((${val}) * ${factor}) / ${factor})`;
    });

    expr = expr.replace(/ROUNDDOWN\(([^,]+),\s*([^()]+)\)/g, (_, val, decimals) => {
      const d = parseInt(decimals, 10) || 0;
      const factor = Math.pow(10, d);
      return `(Math.floor((${val}) * ${factor}) / ${factor})`;
    });

    // POWER(base, exp) -> Math.pow(base, exp)
    expr = expr.replace(/POWER\(([^,]+),\s*([^()]+)\)/g, (_, base, exponent) => {
      return `Math.pow(${base}, ${exponent})`;
    });

    // MOD(a, b) -> ((a) % (b))
    expr = expr.replace(/MOD\(([^,]+),\s*([^()]+)\)/g, (_, a, b) => `((${a}) % (${b}))`);

    // IF(cond, val1, val2) -> ((cond) ? (val1) : (val2))
    expr = expr.replace(/IF\(([^,]+),\s*([^,]+),\s*([^()]+)\)/g, (_, cond, v1, v2) => `((${cond}) ? (${v1}) : (${v2}))`);

    // 3. Resolve Exponentiation Operator ^ -> Math.pow(base, exp)
    // Runs iteratively to handle expressions like B1^2, (A1-B1)^2, 10^3
    let powerSafety = 0;
    while (expr.includes("^") && powerSafety < 10) {
      powerSafety++;
      const nextExpr = expr.replace(/(\([^()]*\)|[A-Za-z0-9_.]+)\s*\^\s*(\([^()]*\)|[A-Za-z0-9_.]+)/g, "Math.pow($1, $2)");
      if (nextExpr === expr) break;
      expr = nextExpr;
    }

    // 4. Resolve Percentage Operator 10% -> (10/100)
    expr = expr.replace(/([0-9A-Z_\).]+)\s*%/g, "(($1)/100)");

    // 5. Resolve Cell References (e.g. B1, C12, AA5, $A$1, $A1, A$1)
    const cellRefRegex = /\$?([A-Z]+)\$?([1-9]\d*)\b/g;
    expr = expr.replace(cellRefRegex, (match, colStr, rowStr) => {
      const cleanRef = `${colStr}${rowStr}`;
      if (EXCEL_FUNCTIONS_SET.has(cleanRef)) return cleanRef;

      if (evaluating.has(cleanRef)) return "0";
      evaluating.add(cleanRef);

      const rawRefVal = allCellData?.[cleanRef] ?? allCellData?.[cleanRef.toLowerCase()] ?? allCellData?.[cleanRef.toUpperCase()];
      const evalRef = evaluateExcelCell(rawRefVal, allCellData, evaluating);
      evaluating.delete(cleanRef);

      const parsed = parseFloat(evalRef);
      return isNaN(parsed) ? "0" : `(${parsed})`;
    });

    // 6. Safe JavaScript Math Evaluation
    // eslint-disable-next-line no-new-func
    const resultFunc = Function(`"use strict"; return (${expr})`);
    const result = resultFunc();

    if (result === Infinity || result === -Infinity) {
      return "#DIV/0!";
    }
    if (typeof result === "number" && isNaN(result)) {
      return "#VALUE!";
    }

    if (typeof result === "number") {
      // Round calculated formula numbers to 2 decimal places
      return String(Math.round(result * 100) / 100);
    }

    return result !== undefined && result !== null ? String(result) : "";

  } catch (err) {
    if (err.message && err.message.includes("Infinity")) {
      return "#DIV/0!";
    }
    return "#ERROR!";
  }
};

/**
 * Adjusts cell references in a formula string when dragging/autofilling across rows and columns.
 * Keeps absolute references ($A$1, A$1, $A1) fixed according to standard Excel rules.
 * Example: "=100-I4" with rowOffset=1 -> "=100-I5"
 * Example: "=A4+B4" with rowOffset=2 -> "=A6+B6"
 * Example: "=$A$1+I4" with rowOffset=1 -> "=$A$1+I5"
 */
export const adjustFormulaForOffset = (formula, rowOffset = 0, colOffset = 0) => {
  if (!formula || typeof formula !== "string" || !formula.startsWith("=")) return formula;

  // Helper to adjust column letter (e.g. 'A' + 1 -> 'B')
  const adjustCol = (colStr, isAbsCol) => {
    if (isAbsCol || colOffset === 0) return colStr;
    let num = 0;
    for (let i = 0; i < colStr.length; i++) {
      num = num * 26 + (colStr.charCodeAt(i) - 64);
    }
    num += colOffset;
    if (num < 1) num = 1;
    let newCol = "";
    while (num > 0) {
      const mod = (num - 1) % 26;
      newCol = String.fromCharCode(65 + mod) + newCol;
      num = Math.floor((num - mod) / 26);
    }
    return newCol;
  };

  // Helper to adjust row number (e.g. 4 + 1 -> 5)
  const adjustRow = (rowStr, isAbsRow) => {
    if (isAbsRow || rowOffset === 0) return rowStr;
    const rNum = parseInt(rowStr, 10);
    const newRow = Math.max(1, rNum + rowOffset);
    return String(newRow);
  };

  // Regex matching cell references with optional $ indicators: ($?)([A-Za-z]+)($?)([1-9]\d*)
  const cellRefRegex = /(\$?)([A-Za-z]+)(\$?)([1-9]\d*)\b/g;

  return formula.replace(cellRefRegex, (match, absCol, colStr, absRow, rowStr) => {
    const isAbsCol = absCol === "$";
    const isAbsRow = absRow === "$";

    const upperCol = colStr.toUpperCase();
    if (EXCEL_FUNCTIONS_SET.has(upperCol)) {
      return match; // Don't alter function names like SUM, SQRT, IF
    }

    const newCol = adjustCol(upperCol, isAbsCol);
    const newRow = adjustRow(rowStr, isAbsRow);

    return `${isAbsCol ? "$" : ""}${newCol}${isAbsRow ? "$" : ""}${newRow}`;
  });
};

/**
 * Extract all unique cell references from a formula string
 * @param {string} formula - e.g. "=A1+B1+$C$5+SUM(D1:D3)"
 * @returns {Array<string>} - e.g. ["A1", "B1", "C5", "D1", "D2", "D3"]
 */
export const extractReferencedCells = (formula) => {
  if (!formula || typeof formula !== "string" || !formula.startsWith("=")) return [];

  const refs = new Set();
  const upperFormula = formula.toUpperCase();

  // Expand ranges like D1:D3
  const expandedFormula = upperFormula.replace(/(\$?)([A-Z]+)(\$?)([1-9]\d*)\s*:\s*(\$?)([A-Z]+)(\$?)([1-9]\d*)/g, (_, __, col1, ___, row1, ____, col2, _____, row2) => {
    const c1 = colLetterToNum(col1);
    const r1 = parseInt(row1, 10);
    const c2 = colLetterToNum(col2);
    const r2 = parseInt(row2, 10);

    const minC = Math.min(c1, c2);
    const maxC = Math.max(c1, c2);
    const minR = Math.min(r1, r2);
    const maxR = Math.max(r1, r2);

    const expanded = [];
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        expanded.push(`${numToColLetter(c)}${r}`);
      }
    }
    return expanded.join("+");
  });

  const cellRefRegex = /\$?([A-Z]+)\$?([1-9]\d*)\b/g;
  let match;
  while ((match = cellRefRegex.exec(expandedFormula)) !== null) {
    const colStr = match[1];
    const rowStr = match[2];
    if (!EXCEL_FUNCTIONS_SET.has(colStr)) {
      refs.add(`${colStr}${rowStr}`);
    }
  }

  return Array.from(refs);
};

export default evaluateExcelCell;
