import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createScopeGroup, createScopeMaterial, createScopeTest, createCompleteScope, getScopeGroups } from "../../api/scope";
import { MainLayout } from "../../components/layout";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ScienceIcon from "@mui/icons-material/Science";
import BuildIcon from "@mui/icons-material/Build";
import BiotechIcon from "@mui/icons-material/Biotech";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

const AddScope = () => {
  const navigate = useNavigate();
  
  // Form states
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  // Group form
  const [groupForm, setGroupForm] = useState({
    testing_scope_type: "permanent_testing",
    group_name: "",
    sort_order: 0
  });
  
  // Materials list
  const [materials, setMaterials] = useState([
    { material_name: "", sort_order: 0, tests: [{ test_name: "", test_method: "", sort_order: 0, is_active: true }] }
  ]);
  
  // Existing groups (for validation)
  const [existingGroups, setExistingGroups] = useState([]);

  useEffect(() => {
    fetchExistingGroups();
  }, []);

  const fetchExistingGroups = async () => {
    try {
      const response = await getScopeGroups();
      setExistingGroups(response.data?.data || []);
    } catch (error) {
      console.error("Failed to fetch existing groups:", error);
    }
  };

  const handleGroupSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await createScopeGroup(groupForm);
      if (response.data.success) {
        setShowModal(true);
      } else {
        setErrorMessage(response.data.message || "Failed to create group");
      }
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  const addMaterial = () => {
    setMaterials([...materials, { 
      material_name: "", 
      sort_order: materials.length, 
      tests: [{ test_name: "", test_method: "", sort_order: 0, is_active: true }] 
    }]);
  };

  const removeMaterial = (index) => {
    if (materials.length > 1) {
      const newMaterials = materials.filter((_, i) => i !== index);
      setMaterials(newMaterials);
    }
  };

  const updateMaterial = (index, field, value) => {
    const newMaterials = [...materials];
    newMaterials[index][field] = value;
    setMaterials(newMaterials);
  };

  const addTest = (materialIndex) => {
    const newMaterials = [...materials];
    newMaterials[materialIndex].tests.push({ 
      test_name: "", 
      test_method: "", 
      sort_order: newMaterials[materialIndex].tests.length, 
      is_active: true 
    });
    setMaterials(newMaterials);
  };

  const removeTest = (materialIndex, testIndex) => {
    const newMaterials = [...materials];
    if (newMaterials[materialIndex].tests.length > 1) {
      newMaterials[materialIndex].tests = newMaterials[materialIndex].tests.filter((_, i) => i !== testIndex);
      setMaterials(newMaterials);
    }
  };

  const updateTest = (materialIndex, testIndex, field, value) => {
    const newMaterials = [...materials];
    newMaterials[materialIndex].tests[testIndex][field] = value;
    setMaterials(newMaterials);
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      // Prepare the complete scope data
      const completeScopeData = {
        group: {
          testing_scope_type: groupForm.testing_scope_type,
          group_name: groupForm.group_name,
          sort_order: groupForm.sort_order
        },
        materials: materials
          .filter(material => material.material_name.trim())
          .map(material => ({
            material_name: material.material_name,
            sort_order: material.sort_order,
            tests: material.tests
              .filter(test => test.test_name.trim() && test.test_method.trim())
              .map(test => ({
                test_name: test.test_name,
                test_method: test.test_method,
                sort_order: test.sort_order,
                is_active: test.is_active
              }))
          }))
      };

      // Create complete scope in one API call
      const response = await createCompleteScope(completeScopeData);
      
      if (response.data.success) {
        // Success - close modal and navigate to scope list
        setShowModal(false);
        navigate("/scope");
      } else {
        throw new Error(response.data.message || "Failed to create scope");
      }
      
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || error.message || "Failed to create scope");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return groupForm.group_name.trim() && 
           materials.some(m => m.material_name.trim() && m.tests.some(t => t.test_name.trim() && t.test_method.trim()));
  };

  return (
    <MainLayout headerTitle="Add New Scope" headerSubtitle="Create new testing scope">
      <div className="p-6">
        {/* Back Button */}
        <button
          onClick={() => navigate("/scope")}
          className="mb-4 flex items-center gap-2 text-[#2d66b3] font-medium hover:text-[#1f5498] transition-colors"
        >
          <ArrowBackIcon fontSize="small" />
          Back
        </button>

        <div className="w-full">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Form Section */}
            <div className="p-8">

              {/* Error Message */}
              {errorMessage && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleGroupSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Group Information */}
                <div className="lg:col-span-3 space-y-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="w-2 h-2 bg-[#2b63ae] rounded-full mr-2"></span>
                      Group Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">Testing Scope Type *</label>
                        <select
                          value={groupForm.testing_scope_type}
                          onChange={(e) => setGroupForm({...groupForm, testing_scope_type: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                          required
                        >
                          <option value="permanent_testing">Permanent Testing</option>
                          <option value="site_testing">Site Testing</option>
                        </select>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">Group Name *</label>
                        <input
                          type="text"
                          value={groupForm.group_name}
                          onChange={(e) => setGroupForm({...groupForm, group_name: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                          placeholder="e.g., CHEMICAL- BUILDING MATERIAL"
                          required
                        />
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">Sort Order</label>
                        <input
                          type="number"
                          value={groupForm.sort_order}
                          onChange={(e) => setGroupForm({...groupForm, sort_order: parseInt(e.target.value) || 0})}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="lg:col-span-3 mt-8">
                  <div className="flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => navigate("/scope")}
                      className="px-6 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !groupForm.group_name.trim()}
                      className="px-8 py-3 rounded-lg bg-gradient-to-r from-[#2b63ae] to-[#1e4a8c] text-white font-medium hover:from-[#1e4a8c] hover:to-[#2b63ae] transition-all disabled:opacity-70 shadow-lg"
                    >
                      {loading ? "Creating..." : "Next Step"}
                    </button>
                  </div>
                </div>
              </form>

            </div>
          </div>
        </div>

        {/* Materials & Tests Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Add Materials & Tests</h2>
                  <button
                    onClick={() => setShowModal(false)}
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

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Materials & Tests</h3>
                    <button
                      onClick={addMaterial}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      <AddIcon className="w-4 h-4" />
                      Add Material
                    </button>
                  </div>

                  {materials.map((material, materialIndex) => (
                    <div key={materialIndex} className="bg-gray-50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-medium text-gray-900">Material {materialIndex + 1}</h4>
                        {materials.length > 1 && (
                          <button
                            onClick={() => removeMaterial(materialIndex)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <DeleteIcon className="w-5 h-5" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-700">
                            Material Name *
                          </label>
                          <input
                            type="text"
                            value={material.material_name}
                            onChange={(e) => updateMaterial(materialIndex, 'material_name', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                            placeholder="e.g., Admixture"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                              Tests
                            </label>
                            <button
                              onClick={() => addTest(materialIndex)}
                              className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                            >
                              <AddIcon className="w-4 h-4" />
                              Add Test
                            </button>
                          </div>

                          {material.tests.map((test, testIndex) => (
                            <div key={testIndex} className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="text-sm font-medium text-gray-900">Test {testIndex + 1}</h5>
                                {material.tests.length > 1 && (
                                  <button
                                    onClick={() => removeTest(materialIndex, testIndex)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <DeleteIcon className="w-4 h-4" />
                                  </button>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block mb-2 text-sm font-medium text-gray-700">
                                    Test Name *
                                  </label>
                                  <input
                                    type="text"
                                    value={test.test_name}
                                    onChange={(e) => updateTest(materialIndex, testIndex, 'test_name', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                                    placeholder="e.g., Ash Content"
                                  />
                                </div>
                                <div>
                                  <label className="block mb-2 text-sm font-medium text-gray-700">
                                    Test Method *
                                  </label>
                                  <input
                                    type="text"
                                    value={test.test_method}
                                    onChange={(e) => updateTest(materialIndex, testIndex, 'test_method', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                                    placeholder="e.g., IS 9103"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-gray-200">
                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFinalSubmit}
                    disabled={loading || !isFormValid()}
                    className="px-8 py-3 rounded-lg bg-gradient-to-r from-[#2b63ae] to-[#1e4a8c] text-white font-medium hover:from-[#1e4a8c] hover:to-[#2b63ae] transition-all disabled:opacity-70 shadow-lg"
                  >
                    {loading ? "Creating Scope..." : "Create Scope"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default AddScope;
