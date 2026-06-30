import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { importMultipleScopes } from "../../api/scope";
import { MainLayout } from "../../components/layout";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import UploadIcon from "@mui/icons-material/Upload";
import DownloadIcon from "@mui/icons-material/Download";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

const AddMultipleScope = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(true); // Show modal by default
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file type
      const allowedTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
      ];
      
      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xls|xlsx|csv)$/i)) {
        setErrorMessage("Please upload only Excel (.xls, .xlsx) or CSV files");
        return;
      }
      
      setSelectedFile(file);
      setErrorMessage("");
      setSuccessMessage("");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      
      // Check file type
      const allowedTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
      ];
      
      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xls|xlsx|csv)$/i)) {
        setErrorMessage("Please upload only Excel (.xls, .xlsx) or CSV files");
        return;
      }
      
      setSelectedFile(file);
      setErrorMessage("");
      setSuccessMessage("");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage("Please select a file to upload");
      return;
    }

    setUploading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await importMultipleScopes(formData);
      
      if (response.data.success) {
        setSuccessMessage(`Successfully imported ${response.data.data.imported_count || 0} scopes!`);
        setSelectedFile(null);
        
        // Reset file input
        document.getElementById('file-upload').value = '';
        
        setTimeout(() => {
          setShowModal(false);
          navigate("/scope");
        }, 2000);
      } else {
        throw new Error(response.data.message || "Failed to upload scopes");
      }
      
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || error.message || "Failed to upload scopes");
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    // Create a template download link
    const templateData = `Group Name,Material Name,Test Name,Test Method,Sort Order,Is Active
CHEMICAL- BUILDING MATERIAL,Admixture,Ash Content,IS 9103,1,TRUE
CHEMICAL- BUILDING MATERIAL,Admixture,Specific Gravity,IS 2386,2,TRUE
CHEMICAL- BUILDING MATERIAL,Cement,Fineness,IS 4031,1,TRUE
CHEMICAL- BUILDING MATERIAL,Cement,Compressive Strength,IS 4031,2,TRUE`;

    const blob = new Blob([templateData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scope_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <MainLayout headerTitle="Add Multiple Scopes" headerSubtitle="Upload Excel file with multiple scopes">
      <div className="p-6">
        {/* Back Button */}
        <button
          onClick={() => navigate("/scope")}
          className="mb-4 flex items-center gap-2 text-[#2d66b3] font-medium hover:text-[#1f5498] transition-colors"
        >
          <ArrowBackIcon fontSize="small" />
          Back
        </button>

        {/* Upload Modal - Always Visible */}
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">Upload Multiple Scopes</h2>
                <button
                  onClick={() => navigate("/scope")}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {errorMessage && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                  {successMessage}
                </div>
              )}

              {/* Large Icon and Instructions */}
              <div className="text-center mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-[#2d66b3] to-[#1f5498] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <CloudUploadIcon className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Import Multiple Scopes</h3>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Upload an Excel file containing multiple scopes with their materials and tests. 
                  Make sure your file follows the required column format.
                </p>
              </div>

              {/* Instructions Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Column Sequence */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                    Required Column Sequence
                  </h4>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-[#2d66b3] text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                      <span className="font-medium text-gray-700">Group Name</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-[#2d66b3] text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                      <span className="font-medium text-gray-700">Material Name</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-[#2d66b3] text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                      <span className="font-medium text-gray-700">Test Name</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-[#2d66b3] text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                      <span className="font-medium text-gray-700">Test Method</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-[#2d66b3] text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
                      <span className="font-medium text-gray-700">Sort Order</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-[#2d66b3] text-white rounded-full flex items-center justify-center text-xs font-bold">6</span>
                      <span className="font-medium text-gray-700">Is Active</span>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    <strong>Note:</strong> Columns must be in this exact sequence. Use TRUE/FALSE for Is Active.
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                    Instructions
                  </h4>
                  
                  <div className="space-y-3 text-sm text-blue-800">
                    <p><strong>1. Download Template:</strong> Click the button below to get the Excel format</p>
                    <p><strong>2. Fill Data:</strong> Enter your scope data following the column sequence</p>
                    <p><strong>3. Upload File:</strong> Drag & drop or click to select your file</p>
                    <p><strong>4. Review:</strong> System will validate and import all scopes</p>
                  </div>
                </div>
              </div>

              {/* Enhanced Upload Area */}
              <div className="mb-8">
                <div
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
                    isDragging 
                      ? 'border-[#2d66b3] bg-[#f0f7ff]' 
                      : 'border-gray-300 hover:border-[#2d66b3] bg-gray-50 hover:bg-[#f8fafc]'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-upload').click()}
                >
                  <input
                    id="file-upload"
                    type="file"
                    accept=".xls,.xlsx,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  <CloudUploadIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    {isDragging ? 'Drop your file here' : 'Drag & drop your Excel file here'}
                  </p>
                  <p className="text-sm text-gray-500 mb-4">or click to browse</p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-600">
                    <UploadIcon className="w-4 h-4" />
                    Choose File
                  </div>
                  <p className="text-xs text-gray-400 mt-4">
                    Supported formats: .xls, .xlsx, .csv (Max. 10MB)
                  </p>
                </div>
              </div>

              {/* Selected File Display */}
              {selectedFile && (
                <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <UploadIcon className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-green-900">{selectedFile.name}</p>
                        <p className="text-sm text-green-700">
                          Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        document.getElementById('file-upload').value = '';
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <DownloadIcon className="w-5 h-5" />
                  Download Template
                </button>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate("/scope")}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading}
                    className="px-8 py-3 bg-gradient-to-r from-[#2d66b3] to-[#1e4a8c] text-white rounded-lg hover:from-[#1e4a8c] hover:to-[#2d66b3] disabled:opacity-70 disabled:cursor-not-allowed transition-all font-medium shadow-lg"
                  >
                    {uploading ? "Uploading..." : "Upload & Import"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default AddMultipleScope;
