import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { createReport, getSampleScopeTests } from "../../api/reports";
import { getSampleEntries } from "../../api/sampleMaster";
import { MainLayout } from "../../components/layout";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import ScienceIcon from "@mui/icons-material/Science";

const ReportAdd = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sampleIdFromUrl = searchParams.get('sample_id');
  const [loading, setLoading] = useState(false);
  const [selectedSample, setSelectedSample] = useState(null);
  const [scopeTests, setScopeTests] = useState([]);
  const [formData, setFormData] = useState({
    test_name: "",
    test_method: "",
    test_standard: "",
    status: "pending",
    scope_test_values: {} // Object to store values for each scope test
  });
  const [errorMessage, setErrorMessage] = useState("");

  // Validate sample_id is provided
  useEffect(() => {
    if (!sampleIdFromUrl) {
      setErrorMessage("No sample specified. Please go to sample list and click 'Add Report'.");
      return;
    }
  }, [sampleIdFromUrl]);

  // Fetch sample details and scope tests
  const fetchSampleDetails = async () => {
    if (!sampleIdFromUrl) return;
    
    try {
      setLoading(true);
      
      // Get all samples to find the specific one
      const response = await getSampleEntries();
      const allSamples = response?.data?.data || [];
      const sample = allSamples.find(s => s.sample_id === parseInt(sampleIdFromUrl));
      
      if (!sample) {
        setErrorMessage("Sample not found");
        return;
      }
      
      setSelectedSample(sample);
      await fetchScopeTestsForSample(sampleIdFromUrl);
      
    } catch (error) {
      console.error("Error fetching sample details:", error);
      setErrorMessage("Failed to load sample details");
    } finally {
      setLoading(false);
    }
  };

  // Fetch scope tests when sample is selected
  const fetchScopeTestsForSample = async (sampleId) => {
    if (!sampleId) {
      setScopeTests([]);
      return;
    }
    
    try {
      setLoading(true);
      const response = await getSampleScopeTests(sampleId);
      const allScopeTests = response?.data || [];
      setScopeTests(allScopeTests);
      
      // Initialize scope test values object
      const testValues = {};
      allScopeTests.forEach(test => {
        testValues[test.project_scope_test_id] = {
          test_name: test.test_name,
          test_method: test.test_method,
          group_name: test.group_name,
          material_name: test.material_name,
          test_value: "",
          remarks: ""
        };
      });
      
      setFormData(prev => ({
        ...prev,
        scope_test_values: testValues,
        sample_id: sampleId
      }));
    } catch (error) {
      console.error("Error fetching scope tests:", error);
      setErrorMessage("Failed to load scope tests for sample");
    } finally {
      setLoading(false);
    }
  };

  const handleScopeTestValueChange = (scopeTestId, field, value) => {
    setFormData(prev => ({
      ...prev,
      scope_test_values: {
        ...prev.scope_test_values,
        [scopeTestId]: {
          ...prev.scope_test_values[scopeTestId],
          [field]: value
        }
      }
    }));
  };

  useEffect(() => {
    fetchSampleDetails();
  }, [sampleIdFromUrl]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    setFormData(prev => ({
      ...prev,
      report_file: file
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedSample) {
      setErrorMessage("Please select a sample");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const reportData = {
        project_id: selectedSample.project_id,
        test_name: formData.test_name,
        test_method: formData.test_method,
        test_standard: formData.test_standard,
        status: formData.status,
        scope_test_values: formData.scope_test_values
      };

      await createReport(reportData);
      alert("Report created successfully!");
      navigate("/reports");
    } catch (error) {
      console.error("Error creating report:", error);
      setErrorMessage(
        error?.response?.data?.message || "Failed to create report"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    const projectId = selectedSample?.project_id || "";
    navigate(`/samples?project_id=${projectId}`);
  };

  return (
    <MainLayout 
      headerTitle="Add Test Report" 
      headerSubtitle="Create a new test report for the sample"
    >
      <div className="p-4 sm:p-6">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="mb-4 flex items-center gap-2 text-blue-600 font-medium hover:text-blue-800 transition-colors"
        >
          <ArrowBackIcon className="h-4 w-4" />
          Back 
        </button>
        
        <div className="w-full">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Selected Sample Info */}
            {selectedSample && (
              <div className="bg-blue-50 p-4 border-b">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">Selected Sample Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-blue-700">Sample Code:</span>
                    <span className="text-blue-900 ml-2">{selectedSample.sample_code || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Project:</span>
                    <span className="text-blue-900 ml-2">{selectedSample.project_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Material:</span>
                    <span className="text-blue-900 ml-2">{selectedSample.category_name || 'N/A'} - {selectedSample.type_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Quantity:</span>
                    <span className="text-blue-900 ml-2">{selectedSample.quantity || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Receiver:</span>
                    <span className="text-blue-900 ml-2">{selectedSample.receiver_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Received Date:</span>
                    <span className="text-blue-900 ml-2">{selectedSample.received_date || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Form Section */}
            <div className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Scope Tests with Input Boxes */}
                {scopeTests.length > 0 && (
                  <div className="lg:col-span-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <h4 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                        <ScienceIcon className="h-5 w-5" />
                        Scope Tests for {selectedSample?.sample_code || 'Selected Sample'}
                      </h4>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {scopeTests.map((test) => (
                          <div key={test.project_scope_test_id} className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center gap-4 mb-3">
                              <div className="flex-shrink-0">
                                <span className="inline-block px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                  {test.group_name}
                                </span>
                              </div>
                              <div className="flex-shrink-0">
                                <span className="inline-block px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                  {test.material_name}
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  {test.test_name} *
                                </label>
                                <input
                                  type="text"
                                  value={formData.scope_test_values[test.project_scope_test_id]?.test_value || ""}
                                  onChange={(e) => handleScopeTestValueChange(test.project_scope_test_id, 'test_value', e.target.value)}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                  placeholder={`Enter ${test.test_name.toLowerCase()} value (e.g., 7.2, Pass, 25°C)`}
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Remarks
                                </label>
                                <input
                                  type="text"
                                  value={formData.scope_test_values[test.project_scope_test_id]?.remarks || ""}
                                  onChange={(e) => handleScopeTestValueChange(test.project_scope_test_id, 'remarks', e.target.value)}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                  placeholder="Additional remarks"
                                />
                              </div>
                            </div>
                            {test.test_method && (
                              <div className="mt-2 text-xs text-gray-500">
                                Method: {test.test_method}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 text-sm text-blue-700">
                        <span className="font-medium">{scopeTests.length}</span> scope tests available for this sample
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {errorMessage}
                  </div>
                )}

                {/* Submit Buttons */}
                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={loading}
                    className="px-6 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-8 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-70"
                  >
                    <SaveIcon className="h-4 w-4" />
                    {loading ? "Creating..." : "Create Report"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ReportAdd;
