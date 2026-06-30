import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProjectById, downloadProjectDocument } from "../../api/projects";
import { getScopeHierarchy } from "../../api/scope";
import { getLabInfo } from "../../api/labs";
import { MainLayout } from "../../components/layout";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PrintIcon from "@mui/icons-material/Print";

const FIRST_PAGE_ROW_LIMIT = 14;
const OTHER_PAGE_ROW_LIMIT = 24;

const ProjectPreview = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [scopeHierarchy, setScopeHierarchy] = useState([]);
  const [labDocument, setLabDocument] = useState(null);
  const [viewedDocument, setViewedDocument] = useState(null);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scopeLoading, setScopeLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [autoPreviewDone, setAutoPreviewDone] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, [id]);

  useEffect(() => {
    return () => {
      if (viewedDocument?.url && viewedDocument?.sourceType === "blob") {
        URL.revokeObjectURL(viewedDocument.url);
      }
    };
  }, [viewedDocument]);

  useEffect(() => {
    const autoOpenFirstDocument = async () => {
      if (
        !autoPreviewDone &&
        project?.documents &&
        project.documents.length > 0 &&
        !showDocumentViewer &&
        !documentLoading
      ) {
        await handleDocumentClick(project.documents[0]);
        setAutoPreviewDone(true);
      }
    };

    autoOpenFirstDocument();
  }, [project, autoPreviewDone, showDocumentViewer, documentLoading]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setScopeLoading(true);
      setErrorMessage("");
      setAutoPreviewDone(false);
      setShowDocumentViewer(false);

      if (viewedDocument?.url && viewedDocument?.sourceType === "blob") {
        URL.revokeObjectURL(viewedDocument.url);
      }
      setViewedDocument(null);

      const [projectRes, scopeRes, labRes] = await Promise.all([
        getProjectById(id),
        getScopeHierarchy({}),
        getLabInfo(),
      ]);

      const projectData = projectRes?.data?.data || null;
      setProject(projectData);
      setScopeHierarchy(scopeRes?.data?.data || []);
      setLabDocument(labRes?.data?.data || null);
    } catch (error) {
      console.error("Error fetching data:", error);
      setErrorMessage(
        error?.response?.data?.message || "Failed to fetch preview data"
      );
    } finally {
      setLoading(false);
      setScopeLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-GB");
  };

  const formatLabDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const splitDateParts = (dateString) => {
    const formatted = formatDate(dateString);
    if (!formatted) return ["", "", ""];
    const parts = formatted.split("/");
    return [parts[0] || "", parts[1] || "", parts[2] || ""];
  };

  const previewDateParts = splitDateParts(project?.created_at);

  const getFileTypeFromName = (fileName = "") => {
    const lower = fileName.toLowerCase();

    if (
      lower.endsWith(".png") ||
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".gif") ||
      lower.endsWith(".webp") ||
      lower.endsWith(".bmp") ||
      lower.endsWith(".svg")
    ) {
      return "image";
    }

    if (lower.endsWith(".pdf")) {
      return "pdf";
    }

    return "other";
  };

  const blobToDataURL = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const selectedScopeKeys = useMemo(() => {
    const set = new Set();

    (project?.scopes || []).forEach((item) => {
      if (item.scope_test_id) {
        set.add(`id-${item.scope_test_id}`);
      }

      const fallbackKey = [
        item.group_name || "",
        item.material_name || "",
        item.test_name || "",
      ]
        .join("||")
        .toLowerCase()
        .trim();

      set.add(`key-${fallbackKey}`);
    });

    return set;
  }, [project?.scopes]);

  const isTestSelected = (groupName, materialName, test) => {
    if (
      test?.scope_test_id &&
      selectedScopeKeys.has(`id-${test.scope_test_id}`)
    ) {
      return true;
    }

    const fallbackKey = [
      groupName || "",
      materialName || "",
      test?.test_name || "",
    ]
      .join("||")
      .toLowerCase()
      .trim();

    return selectedScopeKeys.has(`key-${fallbackKey}`);
  };

  const flatScopeRows = useMemo(() => {
    const rows = [];

    scopeHierarchy.forEach((group) => {
      const materials = group.materials || [];

      materials.forEach((material) => {
        const tests = (material.tests || []).map((test) => ({
          ...test,
          checked: isTestSelected(
            group.group_name,
            material.material_name,
            test
          ),
        }));

        if (tests.length === 0) {
          rows.push({
            groupName: group.group_name,
            materialName: material.material_name,
            test1: null,
            test2: null,
            test3: null,
            isFirstMaterialRow: true,
            materialRowCount: 1,
          });
          return;
        }

        const materialRows = [];
        for (let i = 0; i < tests.length; i += 3) {
          materialRows.push({
            groupName: group.group_name,
            materialName: material.material_name,
            test1: tests[i] || null,
            test2: tests[i + 1] || null,
            test3: tests[i + 2] || null,
            isFirstMaterialRow: i === 0,
            materialRowCount: Math.ceil(tests.length / 3),
          });
        }

        rows.push(...materialRows);
      });
    });

    return rows;
  }, [scopeHierarchy, selectedScopeKeys]);

  const paginatedRows = useMemo(() => {
    const pages = [];
    let currentPage = [];
    let currentCount = 0;
    let pageIndex = 0;

    let i = 0;
    while (i < flatScopeRows.length) {
      const pageLimit =
        pageIndex === 0 ? FIRST_PAGE_ROW_LIMIT : OTHER_PAGE_ROW_LIMIT;

      const currentRow = flatScopeRows[i];
      let blockSize = 1;

      if (currentRow.isFirstMaterialRow) {
        blockSize = currentRow.materialRowCount || 1;
      }

      if (currentPage.length > 0 && currentCount + blockSize > pageLimit) {
        pages.push(currentPage);
        currentPage = [];
        currentCount = 0;
        pageIndex += 1;
        continue;
      }

      for (let j = 0; j < blockSize; j++) {
        if (flatScopeRows[i + j]) {
          currentPage.push(flatScopeRows[i + j]);
        }
      }

      currentCount += blockSize;
      i += blockSize;
    }

    if (currentPage.length > 0 || pages.length === 0) {
      pages.push(currentPage);
    }

    while (pages.length < 5) {
      pages.push([]);
    }

    return pages.map((pageRows) => {
      const groupCounts = {};
      const materialCounts = {};

      pageRows.forEach((row) => {
        groupCounts[row.groupName] = (groupCounts[row.groupName] || 0) + 1;
        const materialKey = `${row.groupName}||${row.materialName}`;
        materialCounts[materialKey] = (materialCounts[materialKey] || 0) + 1;
      });

      const seenGroups = new Set();
      const seenMaterials = new Set();

      return pageRows.map((row) => {
        const materialKey = `${row.groupName}||${row.materialName}`;
        const showGroup = !seenGroups.has(row.groupName);
        const showMaterial = !seenMaterials.has(materialKey);

        if (showGroup) seenGroups.add(row.groupName);
        if (showMaterial) seenMaterials.add(materialKey);

        return {
          ...row,
          showGroup,
          showMaterial,
          groupRowSpan: groupCounts[row.groupName],
          materialRowSpan: materialCounts[materialKey],
        };
      });
    });
  }, [flatScopeRows]);

  const totalPages = paginatedRows.length || 1;

  const SmallCheckBox = ({ checked }) => (
    <span className="inline-flex h-[13px] w-[13px] items-center justify-center border border-black text-[9px] font-bold leading-none">
      {checked ? "✓" : ""}
    </span>
  );

  const handlePrint = () => {
    window.print();
  };

  const handleDocumentClick = async (doc) => {
    try {
      setDocumentLoading(true);

      if (viewedDocument?.url && viewedDocument?.sourceType === "blob") {
        URL.revokeObjectURL(viewedDocument.url);
      }

      const response = await downloadProjectDocument(id, doc.doc_id);

      const responseMime =
        response?.headers?.["content-type"] ||
        doc?.mime_type ||
        "application/octet-stream";

      const fileTypeByName = getFileTypeFromName(doc?.file_name || "");
      const blob = new Blob([response.data], { type: responseMime });

      if (fileTypeByName === "image" || responseMime.startsWith("image/")) {
        const dataUrl = await blobToDataURL(blob);

        setViewedDocument({
          url: dataUrl,
          type: "image",
          name: doc?.file_name || "Image",
          sourceType: "dataurl",
        });

        setShowDocumentViewer(true);
        return;
      }

      if (fileTypeByName === "pdf" || responseMime.includes("pdf")) {
        const objectUrl = URL.createObjectURL(blob);

        setViewedDocument({
          url: objectUrl,
          type: "pdf",
          name: doc?.file_name || "PDF Document",
          sourceType: "blob",
        });

        setShowDocumentViewer(true);
        return;
      }

      const objectUrl = URL.createObjectURL(blob);

      setViewedDocument({
        url: objectUrl,
        type: "other",
        name: doc?.file_name || "Document",
        sourceType: "blob",
      });

      setShowDocumentViewer(true);
    } catch (error) {
      console.error("Error opening document:", error);
      alert("Failed to preview document");
    } finally {
      setDocumentLoading(false);
    }
  };

  const renderScopeTable = (rows, showHeader = true) => {
    return (
      <div className="border-t border-black">
        <table className="w-full border-collapse">
          {showHeader && (
            <thead>
              <tr className="border-b border-black bg-[#f4f4f4]">
                <th className="w-[12%] border-r border-black px-1 py-1 text-center text-[9px] font-bold">
                  Group Name
                </th>
                <th className="w-[12%] border-r border-black px-1 py-1 text-center text-[9px] font-bold">
                  Material Name
                </th>
                <th className="w-[20%] border-r border-black px-1 py-1 text-left text-[9px] font-bold">
                  Test Name
                </th>
                <th className="w-[3%] border-r border-black px-1 py-1 text-center text-[9px] font-bold"></th>
                <th className="w-[20%] border-r border-black px-1 py-1 text-left text-[9px] font-bold">
                  Test Name
                </th>
                <th className="w-[3%] border-r border-black px-1 py-1 text-center text-[9px] font-bold"></th>
                <th className="w-[20%] border-r border-black px-1 py-1 text-left text-[9px] font-bold">
                  Test Name
                </th>
                <th className="w-[3%] px-1 py-1 text-center text-[9px] font-bold"></th>
              </tr>
            </thead>
          )}

          <tbody>
            {rows.length > 0 ? (
              rows.map((row, index) => (
                <tr
                  key={`${row.groupName}-${row.materialName}-${index}`}
                  className="border-b border-black"
                >
                  {row.showGroup && (
                    <td
                      rowSpan={row.groupRowSpan}
                      className="border-r border-black px-1 pt-1.5 pb-1 text-center align-top text-[10px] font-semibold leading-3"
                    >
                      {row.groupName || "-"}
                    </td>
                  )}

                  {row.showMaterial && (
                    <td
                      rowSpan={row.materialRowSpan}
                      className="border-r border-black px-1 pt-1.5 pb-1 text-center align-top text-[10px] font-semibold leading-3"
                    >
                      {row.materialName || "-"}
                    </td>
                  )}

                  <td className="border-r border-black px-1 py-[3px] text-[10px] leading-3">
                    {row.test1?.test_name || ""}
                  </td>
                  <td className="border-r border-black px-1 py-[3px] text-center align-middle">
                    {row.test1?.test_name ? (
                      <SmallCheckBox checked={!!row.test1?.checked} />
                    ) : null}
                  </td>

                  <td className="border-r border-black px-1 py-[3px] text-[10px] leading-3">
                    {row.test2?.test_name || ""}
                  </td>
                  <td className="border-r border-black px-1 py-[3px] text-center align-middle">
                    {row.test2?.test_name ? (
                      <SmallCheckBox checked={!!row.test2?.checked} />
                    ) : null}
                  </td>

                  <td className="border-r border-black px-1 py-[3px] text-[10px] leading-3">
                    {row.test3?.test_name || ""}
                  </td>
                  <td className="px-1 py-[3px] text-center align-middle">
                    {row.test3?.test_name ? (
                      <SmallCheckBox checked={!!row.test3?.checked} />
                    ) : null}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-black">
                <td
                  colSpan={8}
                  className="px-4 py-4 text-center text-[10px] text-gray-600"
                >
                  No scope list available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderDocumentsSection = () => {
    return (
      <div className="flex h-full flex-col p-4">
        {showDocumentViewer && viewedDocument ? (
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-auto border border-gray-300 bg-[#f7f7f7] p-4">
              {viewedDocument?.type === "image" ? (
                <div className="flex h-full items-center justify-center">
                  <img
                    src={viewedDocument.url}
                    alt="Project Document Preview"
                    className="block max-w-full object-contain"
                    style={{
                      width: "auto",
                      height: "auto",
                      maxHeight: "100%",
                    }}
                  />
                </div>
              ) : viewedDocument?.type === "pdf" ? (
                <iframe
                  src={viewedDocument.url}
                  title="PDF Preview"
                  className="h-full w-full bg-white"
                  style={{ border: "none", minHeight: "100%" }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-center text-gray-500">
                  <div>
                    <div className="mb-2 text-[12px]">
                      This file type cannot be previewed here
                    </div>
                    <div className="text-[10px]">
                      Supported preview: image and pdf
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center border border-gray-300 bg-[#f7f7f7] text-gray-500">
            No preview available
          </div>
        )}
      </div>
    );
  };

  const renderFooter = (pageNumber) => {
    return (
      <div className="mt-auto">
        <div className="grid grid-cols-12 border-t border-black">
          <div className="col-span-5 border-r border-black p-3">
            <div className="mb-4 text-[14px]">
              Name of Laboratory:-{" "}
              <span className="font-bold">{labDocument?.lab_name || "-"}</span>
            </div>

            <div className="mb-3 text-[14px]">
              Doc. No. :{" "}
              <span className="font-bold">{labDocument?.doc_no || "-"}</span>
            </div>

            <div className="mb-3 text-[14px]">
              Issue No. :{" "}
              <span className="font-bold">{labDocument?.issue_no || "-"}</span>
            </div>

            <div className="text-[14px]">
              Amend No. :{" "}
              <span className="font-bold">{labDocument?.amend_no || "-"}</span>
            </div>
          </div>

          <div className="col-span-7">
            <div className="border-b border-black p-3 text-[14px]">
              Doc. Name :{" "}
              <span className="font-bold">{labDocument?.doc_name || "-"}</span>
            </div>

            <div className="grid grid-cols-4">
              <div className="border-r border-black p-3 text-[14px]">
                <div>Issue Date.:</div>
                <div className="font-semibold">
                  {formatLabDate(labDocument?.issue_date)}
                </div>
                <div className="mt-4">Amend Date:</div>
                <div className="font-semibold">
                  {formatLabDate(labDocument?.amend_date)}
                </div>
              </div>

              <div className="border-r border-black p-3 text-[14px]">
                <div>Copy No.:</div>
                <div className="font-semibold">
                  {labDocument?.copy_no || "-"}
                </div>
                <div className="mt-4">Prepared by (TM):</div>
                <div className="font-semibold"></div>
              </div>

              <div className="border-r border-black p-3 text-[14px]">
                <div>Section No.:</div>
                <div className="font-semibold">
                  {labDocument?.section_no || "-"}
                </div>
                <div className="mt-4">Approved by (QM):</div>
                <div className="font-semibold"></div>
              </div>

              <div className="p-3 text-[14px]">
                <div>Page No.:</div>
                <div className="font-semibold">
                  {pageNumber} of {totalPages}
                </div>
                <div className="mt-4">Issued by (QM):</div>
                <div className="font-semibold"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading || scopeLoading) {
    return (
      <MainLayout
        headerTitle="Project Preview"
        headerSubtitle="Loading preview..."
      >
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#2b63ae]" />
        </div>
      </MainLayout>
    );
  }

  if (errorMessage) {
    return (
      <MainLayout
        headerTitle="Project Preview"
        headerSubtitle="Error loading preview"
      >
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-lg font-medium text-red-500">
              {errorMessage}
            </div>
            <button
              onClick={() => navigate("/projects")}
              className="rounded-lg bg-[#2b63ae] px-4 py-2 text-white hover:bg-[#1e4f8f]"
            >
              Back
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!project) {
    return (
      <MainLayout
        headerTitle="Project Preview"
        headerSubtitle="Project not found"
      >
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-lg font-medium text-gray-500">
              Project not found
            </div>
            <button
              onClick={() => navigate("/projects")}
              className="rounded-lg bg-[#2b63ae] px-4 py-2 text-white hover:bg-[#1e4f8f]"
            >
              Back
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      headerTitle="Project Preview"
      headerSubtitle="Customer Service Request Form Preview"
    >
      <div className="p-4 sm:p-6">
        <style>
          {`
            .preview-page {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto 18px auto;
              background: white;
              display: flex;
              flex-direction: column;
              box-shadow: 0 8px 24px rgba(0,0,0,0.12);
            }

            .page-content {
              flex: 1;
            }

            @media print {
              body {
                background: white;
              }

              body * {
                visibility: hidden;
              }

              .print-area,
              .print-area * {
                visibility: visible;
              }

              .print-area {
                position: static;
                width: 100%;
                padding: 0;
                margin: 0;
              }

              .preview-page {
                width: 210mm;
                min-height: 297mm;
                margin: 0;
                box-shadow: none;
                page-break-after: always;
              }

              .no-print {
                display: none !important;
              }
            }
          `}
        </style>

        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => navigate("/projects")}
            className="flex items-center gap-2 font-medium text-[#2d66b3] hover:text-[#1f5498]"
          >
            <ArrowBackIcon fontSize="small" />
            Back
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-lg bg-[#2b63ae] px-4 py-2 text-white hover:bg-[#1e4f8f]"
          >
            <PrintIcon fontSize="small" />
            Print Preview
          </button>
        </div>

        <div className="print-area">
          {paginatedRows.map((pageRows, pageIndex) => {
            const pageNumber = pageIndex + 1;
            const isFirstOverallPage = pageIndex === 0;
            const isEvenPage = pageIndex % 2 === 0;
            const nextPageRows = paginatedRows[pageIndex + 1];

            if (!isEvenPage) return null;

            return (
              <div key={pageIndex} className="mb-6 flex gap-4">
                <div className="preview-page flex-1 border border-black text-black">
                  <div className="page-content">
                    {isFirstOverallPage && pageNumber !== 5 && (
                      <div className="border-b border-black px-3 py-2 text-center">
                        <h1 className="text-[24px] font-bold tracking-wide">
                          CUSTOMER&apos;S SERVICE REQUEST FORM
                        </h1>
                      </div>
                    )}

                    {isFirstOverallPage && pageNumber !== 5 && (
                      <div className="grid grid-cols-12 border-b border-black">
                        <div className="col-span-8 border-r border-black p-3">
                          <div className="border-b border-black pb-3">
                            <div className="text-[13px] font-medium">
                              1. Client &amp; Authority Name :
                            </div>
                            <div className="mt-2 min-h-[72px] whitespace-pre-wrap pl-3 text-[20px] leading-8">
                              {project.client_name || "-"}
                            </div>
                          </div>

                          <div className="pb-3">
                            <div className="text-[13px] font-medium">
                              2. Name of Work &amp; Other Detail:
                            </div>
                            <div className="mt-2 min-h-[92px] whitespace-pre-wrap pl-3 text-[18px] leading-7">
                              {project.name_of_work_and_other_details || "-"}
                            </div>
                          </div>
                        </div>

                        <div className="col-span-4 p-3">
                          <div className="grid grid-cols-1 gap-3">
                            <div className="border-b border-black pb-2">
                              <div className="text-[13px] font-bold text-center">
                                DATE :
                              </div>
                              <div className="grid grid-cols-3">
                                {previewDateParts.map((part, index) => (
                                  <div
                                    key={index}
                                    className={`p-2 text-center text-[16px] font-semibold ${
                                      index < 2 ? "border-r border-black" : ""
                                    }`}
                                  >
                                    {part}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="border-b border-black pb-2">
                              <div className="mb-2 text-[13px] font-bold text-center">
                                CONTACT
                              </div>
                              <div className="space-y-1 text-[13px]">
                                <div className="grid grid-cols-[120px,1fr]">
                                  <div>Person :</div>
                                  <div>
                                    {project.client_representative_name || "-"}
                                  </div>
                                </div>
                                <div className="grid grid-cols-[120px,1fr]">
                                  <div>Phone/ Mobile :</div>
                                  <div>-</div>
                                </div>
                                <div className="grid grid-cols-[120px,1fr]">
                                  <div>Fax :</div>
                                  <div>-</div>
                                </div>
                                <div className="grid grid-cols-[120px,1fr]">
                                  <div>E-mail :</div>
                                  <div>-</div>
                                </div>
                              </div>
                            </div>

                            <div className="pb-2">
                              <div className="mb-2 text-[13px] font-bold text-center">
                                Mode of Dispatch of Report
                              </div>
                              <div className="flex items-center justify-center gap-6 text-[13px]">
                                <div className="flex items-center gap-2">
                                  <span>by Post</span>
                                  <span className="flex h-5 w-5 items-center justify-center border border-black text-[14px]">
                                    {project.dispatch_mode === "by_post"
                                      ? "✓"
                                      : ""}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span>Collect Personally</span>
                                  <span className="flex h-5 w-5 items-center justify-center border border-black text-[14px]">
                                    {project.dispatch_mode ===
                                    "collect_personally"
                                      ? "✓"
                                      : ""}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {pageNumber !== 5 &&
                      renderScopeTable(pageRows, isFirstOverallPage)}
                    {pageNumber === 5 && renderDocumentsSection()}

                    {pageRows.length === 0 && pageNumber < 5 && (
                      <div className="py-8 text-center text-[10px] text-gray-500">
                        <div>Continued on next page...</div>
                      </div>
                    )}
                  </div>

                  {pageNumber !== 5 && renderFooter(pageNumber)}
                </div>

                {nextPageRows && (
                  <div className="preview-page flex-1 border border-black text-black">
                    <div className="page-content">
                      {renderScopeTable(nextPageRows, false)}
                    </div>
                    {renderFooter(pageNumber + 1)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {documentLoading && (
          <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="rounded-lg bg-white px-6 py-4 shadow-lg">
              <div className="text-sm font-medium text-gray-700">
                Loading document preview...
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ProjectPreview;