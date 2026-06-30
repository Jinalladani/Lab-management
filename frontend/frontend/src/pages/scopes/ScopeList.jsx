import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getScopeHierarchy, getScopeGroups } from "../../api/scope";
import { MainLayout } from "../../components/layout";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ScienceIcon from "@mui/icons-material/Science";
import VisibilityIcon from "@mui/icons-material/Visibility";
import BuildIcon from "@mui/icons-material/Build";
import BiotechIcon from "@mui/icons-material/Biotech";

const ScopeList = () => {
  const navigate = useNavigate();
  const [scopeData, setScopeData] = useState([]);
  const [scopeGroups, setScopeGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [expandedGroups, setExpandedGroups] = useState({});
  const [expandedMaterials, setExpandedMaterials] = useState({});
  const [selectedScopeType, setSelectedScopeType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchScopeData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [hierarchyResponse, groupsResponse] = await Promise.all([
        getScopeHierarchy(selectedScopeType ? { scope_type: selectedScopeType } : {}),
        getScopeGroups()
      ]);

      setScopeData(hierarchyResponse.data?.data || []);
      setScopeGroups(groupsResponse.data?.data || []);
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message || "Failed to fetch scope data"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScopeData();
  }, [selectedScopeType]);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const toggleMaterial = (materialId) => {
    setExpandedMaterials(prev => ({
      ...prev,
      [materialId]: !prev[materialId]
    }));
  };

  const handleViewGroup = (groupId) => {
    navigate(`/scope/view/${groupId}`);
  };

  const getScopeTypeDisplay = (scopeType) => {
    switch (scopeType) {
      case 'permanent_testing':
        return 'Permanent Testing';
      case 'site_testing':
        return 'Site Testing';
      default:
        return scopeType;
    }
  };

  const getScopeTypeColor = (scopeType) => {
    switch (scopeType) {
      case 'permanent_testing':
        return 'bg-blue-100 text-blue-800';
      case 'site_testing':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <MainLayout headerTitle="Testing Scope" headerSubtitle="Loading scope data...">
        <div className="p-6">
          <div className="text-center">Loading scope data...</div>
        </div>
      </MainLayout>
    );
  }

  if (errorMessage) {
    return (
      <MainLayout headerTitle="Testing Scope" headerSubtitle="Error loading data">
        <div className="p-6 text-red-500">{errorMessage}</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout headerTitle="Testing Scope" headerSubtitle="View available testing scope">
      <div className="p-6">
                
        {/* Summary Statistics */}
        {scopeData.length > 0 && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ScienceIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Groups</p>
                  <p className="text-2xl font-bold text-gray-900">{scopeData.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BuildIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Materials</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {scopeData.reduce((sum, group) => sum + (group.materials?.length || 0), 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <BiotechIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Tests</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {scopeData.reduce((sum, group) => 
                      sum + (group.materials?.reduce((materialSum, material) => 
                        materialSum + (material.tests?.length || 0), 0) || 0), 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search Bar with Action Buttons */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search scopes, materials, or tests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d66b3] focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/scope/add")}
              className="flex items-center gap-2 px-6 py-2 bg-[#2d66b3] text-white rounded-lg hover:bg-[#1f5498] transition-colors font-medium shadow-lg"
            >
              <ScienceIcon className="w-5 h-5" />
              Add New Scope
            </button>
            <button
              onClick={() => navigate("/scope/multiple")}
              className="flex items-center gap-2 px-6 py-2 bg-[#2d66b3] text-white rounded-lg hover:bg-[#1f5498] transition-colors font-medium shadow-lg"
            >
              <ScienceIcon className="w-5 h-5" />
              Add Multiple Scope
            </button>
          </div>
        </div>

        
        {/* Scope Data in Merged Table Format */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {scopeData.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No scope data found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#eef5fd]">
                  <tr>
                    <th className="text-left px-4 py-3">Group Name</th>
                    <th className="text-left px-4 py-3">Material Name</th>
                    <th className="text-left px-4 py-3">Test Name</th>
                    <th className="text-left px-4 py-3">Test Method</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {(() => {
                    const flattenedData = [];
                    
                    scopeData.forEach((group) => {
                      if (group.materials && group.materials.length > 0) {
                        group.materials.forEach((material) => {
                          if (material.tests && material.tests.length > 0) {
                            material.tests.forEach((test) => {
                              flattenedData.push({
                                scopeType: group.testing_scope_type,
                                scopeTypeDisplay: getScopeTypeDisplay(group.testing_scope_type),
                                groupName: group.group_name,
                                groupId: group.group_id,
                                materialName: material.material_name,
                                materialId: material.material_id,
                                testName: test.test_name,
                                testMethod: test.test_method,
                                testStatus: test.is_active,
                                testId: test.scope_test_id
                              });
                            });
                          } else {
                            flattenedData.push({
                              scopeType: group.testing_scope_type,
                              scopeTypeDisplay: getScopeTypeDisplay(group.testing_scope_type),
                              groupName: group.group_name,
                              groupId: group.group_id,
                              materialName: material.material_name,
                              materialId: material.material_id,
                              testName: 'No tests available',
                              testMethod: '-',
                              testStatus: false,
                              testId: null
                            });
                          }
                        });
                      }
                    });

                    // Apply search filter
                    const filteredData = flattenedData.filter((row) => {
                      if (!searchTerm.trim()) return true;
                      
                      const searchLower = searchTerm.toLowerCase();
                      return (
                        row.groupName.toLowerCase().includes(searchLower) ||
                        row.materialName.toLowerCase().includes(searchLower) ||
                        row.testName.toLowerCase().includes(searchLower) ||
                        row.testMethod.toLowerCase().includes(searchLower) ||
                        row.scopeTypeDisplay.toLowerCase().includes(searchLower)
                      );
                    });

                    // Group data for rowspan calculations
                    const groups = {};
                    const materials = {};
                    
                    filteredData.forEach((row, index) => {
                      // Group by scope type and group name
                      const groupKey = `${row.scopeType}-${row.groupName}`;
                      if (!groups[groupKey]) {
                        groups[groupKey] = {
                          scopeType: row.scopeType,
                          scopeTypeDisplay: row.scopeTypeDisplay,
                          groupName: row.groupName,
                          groupId: row.groupId,
                          rows: []
                        };
                      }
                      groups[groupKey].rows.push(index);

                      // Group by material within group
                      const materialKey = `${groupKey}-${row.materialName}`;
                      if (!materials[materialKey]) {
                        materials[materialKey] = {
                          materialName: row.materialName,
                          materialId: row.materialId,
                          rows: []
                        };
                      }
                      materials[materialKey].rows.push(index);
                    });

                    return filteredData.map((row, index) => {
                      const groupKey = `${row.scopeType}-${row.groupName}`;
                      const materialKey = `${groupKey}-${row.materialName}`;
                      const groupData = groups[groupKey];
                      const materialData = materials[materialKey];
                      
                      const isFirstGroupRow = groupData.rows[0] === index;
                      const isFirstMaterialRow = materialData.rows[0] === index;
                      const groupRowSpan = groupData.rows.length;
                      const materialRowSpan = materialData.rows.length;

                      const isLastGroupRow = groupData.rows[groupData.rows.length - 1] === index;

                      return (
                        <tr key={`${row.groupId}-${row.materialId}-${row.testId || 'no-test'}`} className={`hover:bg-gray-50 ${isLastGroupRow ? 'border-b-2 border-gray-400' : 'border-b border-gray-100'}`}>
                          {/* Group Name - merged and centered */}
                          {isFirstGroupRow && (
                            <td 
                              rowSpan={groupRowSpan} 
                              className="px-6 py-4 text-center align-middle border-r border-gray-200"
                            >
                              <div className="font-medium text-gray-900">{row.groupName}</div>
                            </td>
                          )}
                          
                          {/* Material Name - merged and centered */}
                          {isFirstMaterialRow && (
                            <td 
                              rowSpan={materialRowSpan} 
                              className="px-6 py-4 text-center align-middle border-r border-gray-200"
                            >
                              <div className="flex items-center justify-center gap-2">
                                
                                <span className="font-medium text-gray-900">{row.materialName}</span>
                              </div>
                            </td>
                          )}
                          
                          {/* Test Name - always shown, centered */}
                          <td className="px-6 py-4 text-center border-r border-gray-200">
                            <div className="flex items-center justify-center gap-2">
                              
                              <span className="font-medium text-gray-900">{row.testName}</span>
                            </div>
                          </td>
                          
                          {/* Test Method - always shown, centered */}
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm text-gray-600">{row.testMethod}</span>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default ScopeList;
