import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Beaker, ChevronDown, Eye, FlaskConical, Layers3, Plus,
  Search, TestTube2, Upload, Wrench, Droplet, Settings,
  Activity, SlidersHorizontal, ChevronRight, CircleDot, HelpCircle
} from "lucide-react";
import { getScopeHierarchy } from "../../api/scope";
import { MainLayout } from "../../components/layout";

const normalize = (value) => String(value || "").toLowerCase().trim();

const getScopeTypeDisplay = (scopeType) => {
  switch (scopeType) {
    case "permanent_testing":
      return "Permanent Testing";
    case "site_testing":
      return "Site Testing";
    default:
      return scopeType || "Testing Scope";
  }
};

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
    bgColor: "bg-[#243744]/5",
    iconColor: "text-[#243744]",
  };
};

const EmptyState = ({ searchTerm }) => (
  <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-white px-6 py-14 text-center w-full">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#243744]/5 text-[#243744]">
      <FlaskConical size={22} />
    </div>
    <h2 className="mt-4 text-lg font-bold text-[#1A2733]">
      {searchTerm ? "No matching scope found" : "No scope data found"}
    </h2>
    <p className="mt-1 text-sm text-[#64748B]">
      {searchTerm ? "Try searching a group, material, test name, or IS method." : "Add a testing scope to begin building the lab catalogue."}
    </p>
  </div>
);

const ScopeList = () => {
  const navigate = useNavigate();
  const [scopeData, setScopeData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [activeTab, setActiveTab] = useState("tests"); // "materials" or "tests"
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedScopeType, setSelectedScopeType] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("");
  const [expandedMaterials, setExpandedMaterials] = useState({});

  const fetchScopeData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const hierarchyResponse = await getScopeHierarchy(
        selectedScopeType ? { scope_type: selectedScopeType } : {}
      );
      const nextScopeData = hierarchyResponse.data?.data || [];
      setScopeData(nextScopeData);

      // Auto-select the first group if we have data and nothing is selected
      if (nextScopeData.length > 0) {
        const exists = nextScopeData.some(g => g.group_id === selectedGroupId);
        if (!exists) {
          setSelectedGroupId(nextScopeData[0].group_id);
        }
      } else {
        setSelectedGroupId(null);
      }
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Failed to fetch scope data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScopeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScopeType]);

  const query = normalize(searchTerm);

  // Left sidebar filtered groups
  const visibleGroups = useMemo(() => {
    if (!query) return scopeData;

    return scopeData
      .map((group) => {
        const groupMatches =
          normalize(group.group_name).includes(query) ||
          normalize(getScopeTypeDisplay(group.testing_scope_type)).includes(query);

        const materials = (group.materials || [])
          .map((material) => {
            const materialMatches = normalize(material.material_name).includes(query);
            const tests = material.tests || [];
            const matchingTests = tests.filter((test) =>
              normalize(test.test_name).includes(query) ||
              normalize(test.test_method).includes(query)
            );

            if (groupMatches || materialMatches) return material;
            if (matchingTests.length) return { ...material, tests: matchingTests };
            return null;
          })
          .filter(Boolean);

        if (groupMatches || materials.length) return { ...group, materials };
        return null;
      })
      .filter(Boolean);
  }, [query, scopeData]);

  // Totals for overall catalogue stats
  const totals = useMemo(() => {
    const materialCount = scopeData.reduce((sum, group) => sum + (group.materials?.length || 0), 0);
    const testCount = scopeData.reduce(
      (sum, group) =>
        sum + (group.materials?.reduce((materialSum, material) => materialSum + (material.tests?.length || 0), 0) || 0),
      0
    );
    return { groups: scopeData.length, materials: materialCount, tests: testCount };
  }, [scopeData]);

  // Determine active group based on selection, fall back to first visible if selection is filtered out
  const activeGroup = useMemo(() => {
    if (!selectedGroupId) return visibleGroups[0] || null;
    return visibleGroups.find(g => g.group_id === selectedGroupId) || visibleGroups[0] || null;
  }, [selectedGroupId, visibleGroups]);

  // Collect unique methods dynamically for the selected group
  const uniqueMethods = useMemo(() => {
    if (!activeGroup) return [];
    const methods = new Set();
    activeGroup.materials?.forEach(m => {
      m.tests?.forEach(t => {
        if (t.test_method) {
          methods.add(t.test_method.trim());
        }
      });
    });
    return Array.from(methods);
  }, [activeGroup]);

  // Filter materials and tests in detail panel based on search and method filter dropdown
  const filteredMaterials = useMemo(() => {
    if (!activeGroup) return [];
    
    return (activeGroup.materials || []).map(material => {
      let tests = material.tests || [];

      // Filter by dropdown method selection
      if (selectedMethod) {
        tests = tests.filter(test => test.test_method === selectedMethod);
      }

      // Filter by search query
      if (query) {
        const materialMatches = normalize(material.material_name).includes(query);
        if (!materialMatches) {
          tests = tests.filter(test => 
            normalize(test.test_name).includes(query) || 
            normalize(test.test_method).includes(query)
          );
        }
      }

      if (tests.length > 0 || (query && normalize(material.material_name).includes(query))) {
        return { ...material, tests };
      }
      return null;
    }).filter(Boolean);
  }, [activeGroup, query, selectedMethod]);

  const toggleMaterial = (materialId) => {
    setExpandedMaterials((prev) => ({ ...prev, [materialId]: !prev[materialId] }));
  };

  const isMaterialExpanded = (materialId) => {
    if (searchTerm) return true; // Keep expanded when searching
    return expandedMaterials[materialId] !== false; // Default to expanded (true) if undefined
  };

  const totalMaterials = activeGroup?.materials?.length || 0;
  const totalTests = activeGroup?.materials?.reduce((sum, m) => sum + (m.tests?.length || 0), 0) || 0;

  return (
    <MainLayout
      headerTitle="Testing Scope"
      headerSubtitle="Browse material groups, materials, and test methods"
    >
      <div className="mx-auto w-full max-w-[1800px] h-full p-4 sm:p-5 lg:p-6 flex flex-col lg:h-[calc(100vh-100px)] lg:overflow-hidden">
        
        {/* Global Controls & Stats Bar */}
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2E8F0] pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#243744]/5 text-[#243744] px-3 py-1 text-xs font-bold border border-[#243744]/15">
              <Layers3 size={13} />
              {totals.groups} Groups
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#243744]/5 text-[#243744] px-3 py-1 text-xs font-bold border border-[#243744]/15">
              <Wrench size={13} />
              {totals.materials} Materials
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#243744]/5 text-[#243744] px-3 py-1 text-xs font-bold border border-[#243744]/15">
              <TestTube2 size={13} />
              {totals.tests} Tests
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedScopeType}
              onChange={(event) => setSelectedScopeType(event.target.value)}
              className="h-10 px-3.5 py-2 text-sm font-semibold text-[#475569] border border-[#E2E8F0] bg-white rounded-xl outline-none focus:ring-2 focus:ring-[#243744]/10 focus:border-[#243744] transition-all"
              aria-label="Filter testing scope type"
            >
              <option value="">All Scope Types</option>
              <option value="permanent_testing">Permanent Testing</option>
              <option value="site_testing">Site Testing</option>
            </select>

            <button
              type="button"
              onClick={() => navigate("/scope/add")}
              className="flex h-10 items-center gap-1.5 rounded-xl bg-[#243744] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#1A2733] transition-colors"
            >
              <Plus size={16} />
              Add New Scope
            </button>
            <button
              type="button"
              onClick={() => navigate("/scope/multiple")}
              className="flex h-10 items-center gap-1.5 rounded-xl bg-[#F3F4F6] px-4 text-sm font-bold text-[#475569] hover:bg-[#E5E7EB] transition-colors"
            >
              <Upload size={16} />
              Add Multiple Scope
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-xl border border-[#FEE2E2] bg-[#FEF2F2] px-4 py-3 text-sm font-semibold text-[#EF4444] shrink-0">
            {errorMessage}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
            {/* Left Pane Skeleton */}
            <div className="w-full lg:w-[360px] shrink-0 bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-4 shadow-sm h-[280px] lg:h-full">
              <div className="h-6 bg-[#F1F5F9] rounded w-1/2 animate-pulse" />
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-[#F8FAFC] rounded-xl animate-pulse" />
              ))}
            </div>
            {/* Right Pane Skeleton */}
            <div className="flex-1 bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-6 shadow-sm">
              <div className="space-y-2 animate-pulse">
                <div className="h-8 bg-[#F1F5F9] rounded w-1/3" />
                <div className="h-4 bg-[#F1F5F9] rounded w-1/4" />
              </div>
              <div className="h-48 bg-[#F8FAFC] rounded-xl animate-pulse" />
            </div>
          </div>
        ) : visibleGroups.length === 0 ? (
          <div className="flex-1 bg-white rounded-2xl border border-[#E2E8F0] p-8 shadow-sm flex items-center justify-center">
            <EmptyState searchTerm={searchTerm} />
          </div>
        ) : (
          /* Responsive Dual Pane Layout */
          <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-visible lg:overflow-hidden">
            
            {/* Left Pane: Groups Selector */}
            <div className="w-full lg:w-[360px] shrink-0 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col h-[280px] lg:h-full overflow-hidden">
              <div className="p-4 border-b border-[#F1F5F9] flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-base font-bold text-[#1E293B]">Material Groups</h2>
                  <p className="text-xs text-[#64748B] mt-0.5 font-medium">{visibleGroups.length} Groups matched</p>
                </div>
                <button className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors text-[#64748B]" title="Filters">
                  <SlidersHorizontal size={16} />
                </button>
              </div>

              {/* Group Cards Container */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {visibleGroups.map((group) => {
                  const isActive = group.group_id === activeGroup?.group_id;
                  const groupMaterialsCount = group.materials?.length || 0;
                  const groupTestsCount = group.materials?.reduce((sum, material) => sum + (material.tests?.length || 0), 0) || 0;
                  const visuals = getGroupVisuals(group.group_name);
                  const IconComponent = visuals.icon;
                  
                  return (
                    <div
                      key={group.group_id}
                      onClick={() => {
                        setSelectedGroupId(group.group_id);
                        setSelectedMethod(""); // reset sub-filter on select
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center gap-3 relative ${
                        isActive 
                          ? "bg-[#243744] border-[#243744] shadow-md text-white" 
                          : "bg-white border-[#E2E8F0] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive 
                          ? "bg-white/12 text-white" 
                          : `${visuals.bgColor} ${visuals.iconColor}`
                      }`}>
                        <IconComponent size={18} strokeWidth={2.2} />
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <h3 className={`font-bold text-xs truncate ${isActive ? "text-white" : "text-[#1E293B]"}`}>
                          {group.group_name || "Unnamed Group"}
                        </h3>
                        <p className={`text-[11px] mt-0.5 flex items-center gap-1.5 font-medium ${
                          isActive ? "text-white/70" : "text-[#64748B]"
                        }`}>
                          <span>{groupMaterialsCount} Material{groupMaterialsCount === 1 ? "" : "s"}</span>
                          <span className={isActive ? "text-white/30" : "text-[#CBD5E1]"}>•</span>
                          <span>{groupTestsCount} Test{groupTestsCount === 1 ? "" : "s"}</span>
                        </p>
                      </div>
                      
                      <ChevronRight size={14} className={`shrink-0 ${isActive ? "text-white/80" : "text-[#94A3B8]"}`} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Pane: Active Group Details */}
            {activeGroup && (
              <div className="flex-1 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col overflow-visible lg:h-full lg:overflow-hidden">
                
                {/* Details Header */}
                <div className="p-6 border-b border-[#F1F5F9] shrink-0 bg-white">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="text-xl font-extrabold text-[#0F172A] tracking-tight">
                          {activeGroup.group_name}
                        </h1>
                        <span className="inline-flex items-center rounded-full bg-[#F1F5F9] text-[#475569] px-2.5 py-0.5 text-[10px] font-bold border border-[#E2E8F0]">
                          {getScopeTypeDisplay(activeGroup.testing_scope_type)}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-[#64748B] mt-1 uppercase tracking-wider">
                        Discipline / Group Details Catalogue
                      </p>
                    </div>
                    
                    <button
                      onClick={() => navigate(`/scope/view/${activeGroup.group_id}`)}
                      className="self-start sm:self-center flex items-center gap-1.5 text-xs font-bold text-[#243744] hover:text-white transition-all border border-[#243744]/20 bg-[#F8FAFC] hover:bg-[#243744] px-3 py-1.5 rounded-lg"
                    >
                      <Eye size={13} />
                      Manage Group
                    </button>
                  </div>
                  
                  {/* Tabs */}
                  <div className="flex items-center gap-6 mt-5 border-b border-[#E2E8F0] -mb-6">
                    <button
                      onClick={() => setActiveTab("materials")}
                      className={`pb-3 text-xs font-bold border-b-2 px-1 transition-all duration-150 relative cursor-pointer ${
                        activeTab === "materials" 
                          ? "border-[#243744] text-[#243744]" 
                          : "border-transparent text-[#64748B] hover:text-[#1E293B]"
                      }`}
                    >
                      Materials ({totalMaterials})
                    </button>
                    <button
                      onClick={() => setActiveTab("tests")}
                      className={`pb-3 text-xs font-bold border-b-2 px-1 transition-all duration-150 relative cursor-pointer ${
                        activeTab === "tests" 
                          ? "border-[#243744] text-[#243744]" 
                          : "border-transparent text-[#64748B] hover:text-[#1E293B]"
                      }`}
                    >
                      Test Methods ({totalTests})
                    </button>
                  </div>
                </div>

                {/* Sub-Filters / Search row (No "Add Material" or "Add Test" buttons per user instruction) */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-[#F8FAFC] border-b border-[#E2E8F0] shrink-0">
                  <div className="flex-1 flex h-10 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 focus-within:border-[#243744] focus-within:ring-2 focus-within:ring-[#243744]/10 transition-all">
                    <Search size={15} className="text-[#94A3B8] shrink-0" />
                    <input
                      type="text"
                      placeholder={activeTab === "tests" ? "Search tests..." : "Search materials..."}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-transparent text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none"
                    />
                  </div>
                  
                  {activeTab === "tests" && (
                    <select
                      value={selectedMethod}
                      onChange={(e) => setSelectedMethod(e.target.value)}
                      className="h-10 px-3.5 py-2 text-xs font-semibold text-[#475569] border border-[#E2E8F0] bg-white rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all shrink-0 min-w-[130px]"
                    >
                      <option value="">All Methods</option>
                      {uniqueMethods.map(method => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Table details container */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  {activeTab === "tests" ? (
                    /* Test Methods View */
                    filteredMaterials.length === 0 ? (
                      <div className="p-8 text-center text-sm text-[#64748B] flex flex-col items-center justify-center h-full min-h-[200px]">
                        <HelpCircle size={24} className="text-[#94A3B8] mb-2" />
                        <p>No tests found matching current filters.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#E2E8F0]">
                        {filteredMaterials.map((material) => {
                          const materialKey = `${activeGroup.group_id}-${material.material_id}`;
                          const isExpanded = isMaterialExpanded(materialKey);
                          const testsCount = material.tests?.length || 0;
                          
                          return (
                            <div key={materialKey} className="bg-white">
                              {/* Material Category Separator Row */}
                              <div 
                                onClick={() => toggleMaterial(materialKey)}
                                className="flex items-center justify-between bg-[#F1F5F9] border-y border-[#E2E8F0] px-6 py-2.5 cursor-pointer hover:bg-[#E2E8F0] transition-colors select-none"
                              >
                                <div className="flex items-center gap-3">
                                  <ChevronDown 
                                    size={15} 
                                    className={`text-[#243744] transition-transform duration-200 ${isExpanded ? "" : "-rotate-90"}`} 
                                  />
                                  <CircleDot size={15} className="text-[#243744]" />
                                  <span className="text-xs font-bold text-[#243744]">
                                    {material.material_name}
                                  </span>
                                </div>
                                <span className="inline-flex items-center rounded-full bg-white text-[#243744] px-2.5 py-0.5 text-[10px] font-bold border border-[#E2E8F0]">
                                  {testsCount} Test{testsCount === 1 ? "" : "s"}
                                </span>
                              </div>
                              
                              {/* Tests Rows Table */}
                              <AnimatePresence initial={false}>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.18 }}
                                    className="overflow-hidden"
                                  >
                                    {testsCount === 0 ? (
                                      <div className="px-6 py-4 text-[11px] text-[#64748B] italic bg-[#F8FAFC]">
                                        No tests associated with this material.
                                      </div>
                                    ) : (
                                      <div className="bg-white overflow-x-auto">
                                        <div className="grid grid-cols-[1.5fr_1fr_1fr_80px] gap-4 px-6 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] text-[9px] font-bold text-[#243744] uppercase tracking-wider min-w-[450px]">
                                          <span>Test Name</span>
                                          <span>Test Method</span>
                                          <span>Status</span>
                                          <span className="text-right">Actions</span>
                                        </div>
                                        
                                        {material.tests.map((test) => {
                                          const testKey = test.scope_test_id || `${material.material_id}-${test.test_name}`;
                                          const isActive = test.is_active !== false;
                                          
                                          return (
                                            <div key={testKey} className="grid grid-cols-[1.5fr_1fr_1fr_80px] gap-4 px-6 py-3 items-center border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors min-w-[450px]">
                                              <span className="text-xs font-semibold text-[#1E293B] truncate" title={test.test_name}>
                                                {test.test_name}
                                              </span>
                                              <span className="text-xs font-medium text-[#475569] font-mono truncate" title={test.test_method}>
                                                {test.test_method || "Pending"}
                                              </span>
                                              <span className="flex items-center gap-1.5 text-xs font-semibold">
                                                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-[#10B981]" : "bg-[#EF4444]"}`} />
                                                <span className={isActive ? "text-[#10B981]" : "text-[#EF4444]"}>
                                                  {isActive ? "Active" : "Inactive"}
                                                </span>
                                              </span>
                                              <div className="flex items-center justify-end">
                                                <button
                                                  onClick={() => navigate(`/scope/view/${activeGroup.group_id}`)}
                                                  className="p-1 hover:bg-[#F1F5F9] rounded transition-colors text-[#64748B] hover:text-[#1E293B]"
                                                  title="View details"
                                                >
                                                  <Eye size={14} />
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    )
                  ) : (
                    /* Materials List View */
                    filteredMaterials.length === 0 ? (
                      <div className="p-8 text-center text-sm text-[#64748B] flex flex-col items-center justify-center h-full min-h-[200px]">
                        <HelpCircle size={24} className="text-[#94A3B8] mb-2" />
                        <p>No materials found matching search query.</p>
                      </div>
                    ) : (
                      <div className="bg-white overflow-x-auto">
                        <div className="grid grid-cols-[1.5fr_1fr_1fr_80px] gap-4 px-6 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] text-[9px] font-bold text-[#64748B] uppercase tracking-wider min-w-[450px]">
                          <span>Material Name</span>
                          <span>Sort Order</span>
                          <span>Tests count</span>
                          <span className="text-right">Actions</span>
                        </div>
                        
                        {filteredMaterials.map((material) => {
                          const materialKey = `${activeGroup.group_id}-${material.material_id}`;
                          const testCount = material.tests?.length || 0;
                          
                          return (
                            <div key={materialKey} className="grid grid-cols-[1.5fr_1fr_1fr_80px] gap-4 px-6 py-3.5 items-center border-b border-[#F1F5F9] hover:bg-[#FAF9FF] transition-colors min-w-[450px]">
                              <span className="text-xs font-bold text-[#1E293B]">
                                {material.material_name}
                              </span>
                              <span className="text-xs text-[#64748B] font-mono">
                                {material.sort_order ?? 0}
                              </span>
                              <span className="inline-flex w-fit items-center rounded-full bg-[#F3F4F6] text-[#475569] px-2 py-0.5 text-[10px] font-semibold">
                                {testCount} Test{testCount === 1 ? "" : "s"}
                              </span>
                              <div className="flex items-center justify-end">
                                <button
                                  onClick={() => navigate(`/scope/view/${activeGroup.group_id}`)}
                                  className="p-1 hover:bg-[#F1F5F9] rounded transition-colors text-[#64748B] hover:text-[#1E293B]"
                                  title="View details"
                                >
                                  <Eye size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>

              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ScopeList;
