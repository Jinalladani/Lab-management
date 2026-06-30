import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getScopeGroups, getScopeMaterials, getScopeTests } from "../../api/scope";
import { MainLayout } from "../../components/layout";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import ScienceIcon from "@mui/icons-material/Science";
import BuildIcon from "@mui/icons-material/Build";
import BiotechIcon from "@mui/icons-material/Biotech";
import MoreVertIcon from "@mui/icons-material/MoreVert";

const ScopeView = () => {
  const params = useParams();
  const navigate = useNavigate();
  const groupId = params.id;

  const [groupData, setGroupData] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState("bottom");

  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const fetchScopeDetails = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      // Fetch group details
      const groupResponse = await getScopeGroups();
      const groups = groupResponse.data?.data || [];
      const currentGroup = groups.find(g => g.group_id === parseInt(groupId));

      if (!currentGroup) {
        setErrorMessage("Scope group not found");
        return;
      }

      setGroupData(currentGroup);

      // Fetch materials for this group
      const materialsResponse = await getScopeMaterials({ group_id: groupId });
      setMaterials(materialsResponse.data?.data || []);

      // Fetch tests for this group
      const testsResponse = await getScopeTests({ group_id: groupId });
      setTests(testsResponse.data?.data || []);

    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message || "Failed to fetch scope details"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) {
      fetchScopeDetails();
    }
  }, [groupId]);

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

  // Group tests by material
  const testsByMaterial = tests.reduce((acc, test) => {
    if (!acc[test.material_id]) {
      acc[test.material_id] = [];
    }
    acc[test.material_id].push(test);
    return acc;
  }, {});

  const handleDropdownToggle = () => {
    if (!showActionDropdown) {
      // Check if dropdown should appear above or below
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        if (spaceBelow < 200 && spaceAbove > 200) {
          setDropdownPosition("top");
        } else {
          setDropdownPosition("bottom");
        }
      }
    }
    setShowActionDropdown(!showActionDropdown);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setShowActionDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (loading) {
    return (
      <MainLayout headerTitle="Scope Details" headerSubtitle="Loading scope data...">
        <div className="p-6">
          <div className="text-center">Loading scope details...</div>
        </div>
      </MainLayout>
    );
  }

  if (errorMessage) {
    return (
      <MainLayout headerTitle="Scope Details" headerSubtitle="Error loading data">
        <div className="p-6 text-red-500">{errorMessage}</div>
      </MainLayout>
    );
  }

  if (!groupData) {
    return (
      <MainLayout headerTitle="Scope Details" headerSubtitle="No data found">
        <div className="p-6">No scope group found</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout headerTitle="Scope Details" headerSubtitle={`Viewing ${groupData.group_name}`}>
      <div className="p-6">
        {/* Back Button */}
        <button
          onClick={() => navigate("/scope")}
          className="mb-4 flex items-center gap-2 text-[#2d66b3] font-medium hover:text-[#1f5498] transition-colors"
        >
          <ArrowBackIcon fontSize="small" />
          Back to Scope List
        </button>

        {/* Group Information */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-6">
          <div className="p-6 bg-gradient-to-r from-[#2d66b3] to-[#1e4a8c]">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                <ScienceIcon className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white mb-2">{groupData.group_name}</h1>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScopeTypeColor(groupData.testing_scope_type)}`}>
                    {getScopeTypeDisplay(groupData.testing_scope_type)}
                  </span>
                  <span className="text-white/80 text-sm">
                    Sort Order: {groupData.sort_order}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <ScienceIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Materials</p>
                <p className="text-2xl font-bold text-gray-900">{materials.length}</p>
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
                <p className="text-2xl font-bold text-gray-900">{tests.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <BuildIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Tests</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tests.filter(t => t.is_active).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Materials Section */}
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <BuildIcon className="w-5 h-5 text-[#2d66b3]" />
              Materials ({materials.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {materials.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No materials found in this scope group
              </div>
            ) : (
              materials.map((material) => (
                <div key={material.material_id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <BuildIcon className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{material.material_name}</h3>
                        <p className="text-sm text-gray-500">Sort Order: {material.sort_order}</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {testsByMaterial[material.material_id]?.length || 0} tests
                    </span>
                  </div>

                  {/* Tests for this material */}
                  {testsByMaterial[material.material_id] && (
                    <div className="ml-13 space-y-2">
                      {testsByMaterial[material.material_id].length === 0 ? (
                        <div className="text-center text-gray-500 py-2 bg-gray-50 rounded-lg">
                          No tests found for this material
                        </div>
                      ) : (
                        testsByMaterial[material.material_id].map((test) => (
                          <div
                            key={test.scope_test_id}
                            className={`p-4 rounded-lg border ${
                              test.is_active
                                ? "bg-green-50 border-green-200"
                                : "bg-gray-50 border-gray-200"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900 mb-1">
                                  {test.test_name}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Method:</span> {test.test_method}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Sort Order: {test.sort_order}
                                </p>
                              </div>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  test.is_active
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {test.is_active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Additional Information */}
        <div className="mt-6 bg-white rounded-xl shadow border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Group Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Group ID</label>
              <p className="text-gray-900 font-medium">{groupData.group_id}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Testing Scope Type</label>
              <p className="text-gray-900 font-medium">
                {getScopeTypeDisplay(groupData.testing_scope_type)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Sort Order</label>
              <p className="text-gray-900 font-medium">{groupData.sort_order}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Created Date</label>
              <p className="text-gray-900 font-medium">
                {new Date(groupData.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ScopeView;
