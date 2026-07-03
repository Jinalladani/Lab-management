import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Beaker, ChevronDown, Eye, FlaskConical, Layers3, Plus,
  Search, TestTube2, Upload, Wrench,
} from "lucide-react";
import { getScopeHierarchy } from "../../api/scope";
import { MainLayout } from "../../components/layout";

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.24, ease: [0.22, 0.68, 0, 1] } },
};

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

const ScopeMetric = ({ icon: Icon, label, value, tone }) => (
  <motion.div
    className="rounded-xl border border-[#E2E6EB] bg-white p-5"
    style={{ boxShadow: "var(--shadow-sm)" }}
    variants={cardVariants}
  >
    <div className="flex items-center gap-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tone}`}>
        <Icon size={22} strokeWidth={2.2} />
      </div>
      <div>
        <p className="text-sm font-medium text-[#667684]">{label}</p>
        <p className="mt-0.5 text-2xl font-black leading-none text-[#1A2733]">{value.toLocaleString()}</p>
      </div>
    </div>
  </motion.div>
);

const EmptyState = ({ searchTerm }) => (
  <div className="rounded-xl border border-dashed border-[#D4DBE2] bg-white px-6 py-14 text-center">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#F6F7F9] text-[#3F6E8C]">
      <FlaskConical size={22} />
    </div>
    <h2 className="mt-4 text-lg font-bold text-[#1A2733]">
      {searchTerm ? "No matching scope found" : "No scope data found"}
    </h2>
    <p className="mt-1 text-sm text-[#667684]">
      {searchTerm ? "Try searching a group, material, test name, or IS method." : "Add a testing scope to begin building the lab catalogue."}
    </p>
  </div>
);

const TestRow = ({ test, isMatch }) => (
  <div className={`flex flex-col gap-2 rounded-lg border px-3 py-3 sm:flex-row sm:items-center sm:justify-between ${
    isMatch ? "border-[#BFD5E3] bg-[#F3F8FB]" : "border-[#EDF0F3] bg-white"
  }`}>
    <div className="min-w-0">
      <p className="break-words text-sm font-semibold text-[#1A2733]">{test.test_name || "Untitled test"}</p>
      {test.is_active === false && (
        <p className="mt-0.5 text-xs font-medium text-[#C0564A]">Inactive</p>
      )}
    </div>
    <span className="inline-flex w-fit shrink-0 items-center rounded-lg border border-[#DDE4EA] bg-[#F8FAFB] px-2.5 py-1 text-xs font-semibold text-[#57687A]">
      {test.test_method || "Method pending"}
    </span>
  </div>
);

const MaterialCard = ({ groupId, material, expanded, onToggle, searchTerm }) => {
  const query = normalize(searchTerm);
  const tests = material.tests || [];
  const materialMatches = query && normalize(material.material_name).includes(query);
  const matchingTestIds = new Set(
    tests
      .filter((test) =>
        normalize(test.test_name).includes(query) ||
        normalize(test.test_method).includes(query)
      )
      .map((test) => test.scope_test_id || `${test.test_name}-${test.test_method}`)
  );

  return (
    <motion.article
      className="overflow-hidden rounded-xl border border-[#E2E6EB] bg-white"
      style={{ boxShadow: "var(--shadow-xs)" }}
      variants={cardVariants}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col gap-3 px-4 py-4 text-left transition-colors hover:bg-[#F8FAFB] sm:flex-row sm:items-center sm:justify-between"
        aria-expanded={expanded}
        aria-controls={`material-${groupId}-${material.material_id}`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#DDE4EA] bg-[#F8FAFB] text-[#3F6E8C]">
            <Beaker size={18} />
          </span>
          <span className="min-w-0">
            <span className="block break-words text-sm font-bold text-[#1A2733]">{material.material_name || "Unnamed material"}</span>
            <span className="mt-0.5 block text-xs font-medium text-[#667684]">
              {tests.length.toLocaleString()} test{tests.length === 1 ? "" : "s"}
              {materialMatches ? " · material match" : ""}
            </span>
          </span>
        </span>
        <span className="flex items-center gap-3">
          {query && matchingTestIds.size > 0 && (
            <span className="rounded-lg bg-[#EFF6FF] px-2.5 py-1 text-xs font-semibold text-[#2563EB]">
              {matchingTestIds.size} match{matchingTestIds.size === 1 ? "" : "es"}
            </span>
          )}
          <ChevronDown
            size={18}
            className={`text-[#667684] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={`material-${groupId}-${material.material_id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 0.68, 0, 1] }}
            className="overflow-hidden border-t border-[#EDF0F3]"
          >
            <div className="space-y-2 bg-[#FAFBFC] p-4">
              {tests.length ? tests.map((test, index) => {
                const testKey = test.scope_test_id || `${material.material_id}-${test.test_name}-${index}`;
                return (
                  <TestRow
                    key={testKey}
                    test={test}
                    isMatch={query && (matchingTestIds.has(test.scope_test_id) || matchingTestIds.has(`${test.test_name}-${test.test_method}`))}
                  />
                );
              }) : (
                <div className="rounded-lg border border-dashed border-[#D4DBE2] bg-white px-4 py-5 text-sm text-[#667684]">
                  No tests available for this material.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
};

const ScopeList = () => {
  const navigate = useNavigate();
  const [scopeData, setScopeData] = useState([]);
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

      const hierarchyResponse = await getScopeHierarchy(
        selectedScopeType ? { scope_type: selectedScopeType } : {}
      );
      const nextScopeData = hierarchyResponse.data?.data || [];
      setScopeData(nextScopeData);

      if (nextScopeData.length && !Object.keys(expandedGroups).length) {
        setExpandedGroups({ [nextScopeData[0].group_id]: true });
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

  const totals = useMemo(() => {
    const materialCount = scopeData.reduce((sum, group) => sum + (group.materials?.length || 0), 0);
    const testCount = scopeData.reduce(
      (sum, group) =>
        sum + (group.materials?.reduce((materialSum, material) => materialSum + (material.tests?.length || 0), 0) || 0),
      0
    );
    return { groups: scopeData.length, materials: materialCount, tests: testCount };
  }, [scopeData]);

  const toggleGroup = (groupId) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const toggleMaterial = (materialId) => {
    setExpandedMaterials((prev) => ({ ...prev, [materialId]: !prev[materialId] }));
  };

  const handleViewGroup = (groupId) => {
    navigate(`/scope/view/${groupId}`);
  };

  return (
    <MainLayout
      headerTitle="Testing Scope"
      headerSubtitle={loading ? "Loading scope data..." : "Browse material groups, materials, and test methods"}
    >
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">
        {errorMessage && (
          <div className="mb-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-semibold text-[#C0564A]">
            {errorMessage}
          </div>
        )}

        <motion.section
          className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3"
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.05 }}
        >
          <ScopeMetric icon={Layers3} label="Total Groups" value={totals.groups} tone="bg-[#EAF2F7] text-[#3F6E8C]" />
          <ScopeMetric icon={Wrench} label="Total Materials" value={totals.materials} tone="bg-[#F5F0FF] text-[#7C3AED]" />
          <ScopeMetric icon={TestTube2} label="Total Tests" value={totals.tests} tone="bg-[#ECFDF3] text-[#2F855A]" />
        </motion.section>

        <div className="mb-5 rounded-xl border border-[#E2E6EB] bg-white p-3" style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="grid flex-1 gap-3 md:grid-cols-[minmax(0,1fr)_190px]">
              <label className="flex h-11 items-center gap-2.5 rounded-xl border border-[#DDE4EA] bg-[#F8FAFB] px-3.5 focus-within:border-[#3F6E8C] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#3F6E8C]/12">
                <Search size={17} className="shrink-0 text-[#8A97A4]" />
                <input
                  type="text"
                  placeholder="Search groups, materials, tests, or IS methods..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full bg-transparent text-sm text-[#1A2733] placeholder:text-[#A1ADB8] focus:outline-none"
                  aria-label="Search testing scope"
                />
              </label>

              <select
                value={selectedScopeType}
                onChange={(event) => setSelectedScopeType(event.target.value)}
                className="app-select !h-11 !py-2.5"
                aria-label="Filter testing scope type"
              >
                <option value="">All Scope Types</option>
                <option value="permanent_testing">Permanent Testing</option>
                <option value="site_testing">Site Testing</option>
              </select>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:flex xl:items-center">
              <button
                type="button"
                onClick={() => navigate("/scope/add")}
                className="app-button app-button-primary w-full whitespace-nowrap xl:w-auto"
              >
                <Plus size={17} />
                Add New Scope
              </button>
              <button
                type="button"
                onClick={() => navigate("/scope/multiple")}
                className="app-button app-button-primary w-full whitespace-nowrap xl:w-auto"
              >
                <Upload size={17} />
                Add Multiple Scope
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((item) => <div key={item} className="lab-skeleton h-40" />)}
          </div>
        ) : visibleGroups.length === 0 ? (
          <EmptyState searchTerm={searchTerm} />
        ) : (
          <motion.section className="space-y-4" initial="hidden" animate="visible" transition={{ staggerChildren: 0.04 }}>
            {visibleGroups.map((group) => {
              const groupExpanded = query ? true : Boolean(expandedGroups[group.group_id]);
              const materialCount = group.materials?.length || 0;
              const testCount = group.materials?.reduce((sum, material) => sum + (material.tests?.length || 0), 0) || 0;

              return (
                <motion.article
                  key={group.group_id}
                  className="overflow-hidden rounded-xl border border-[#E2E6EB] bg-white"
                  style={{ boxShadow: "var(--shadow-sm)" }}
                  variants={cardVariants}
                >
                  <div className="flex flex-col gap-3 border-b border-[#EDF0F3] bg-[#FAFBFC] px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.group_id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      aria-expanded={groupExpanded}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#243744] text-white">
                        <FlaskConical size={20} />
                      </span>
                      <span className="min-w-0">
                        <span className="block break-words text-base font-black text-[#1A2733]">{group.group_name || "Unnamed group"}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#667684]">
                          <span>{getScopeTypeDisplay(group.testing_scope_type)}</span>
                          <span className="text-[#CDD4DB]">/</span>
                          <span>{materialCount.toLocaleString()} materials</span>
                          <span className="text-[#CDD4DB]">/</span>
                          <span>{testCount.toLocaleString()} tests</span>
                        </span>
                      </span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleViewGroup(group.group_id)}
                        className="app-button app-button-secondary !h-9 !rounded-lg !px-3 !text-xs"
                      >
                        <Eye size={15} />
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.group_id)}
                        className="app-icon-button !h-9 !w-9 !rounded-lg"
                        aria-label={groupExpanded ? "Collapse group" : "Expand group"}
                      >
                        <ChevronDown className={`transition-transform duration-200 ${groupExpanded ? "rotate-180" : ""}`} size={17} />
                      </button>
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {groupExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.24, ease: [0.22, 0.68, 0, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="grid gap-3 p-4 xl:grid-cols-2">
                          {(group.materials || []).map((material) => {
                            const materialKey = `${group.group_id}-${material.material_id}`;
                            const materialExpanded = query ? true : Boolean(expandedMaterials[materialKey]);
                            return (
                              <MaterialCard
                                key={materialKey}
                                groupId={group.group_id}
                                material={material}
                                expanded={materialExpanded}
                                onToggle={() => toggleMaterial(materialKey)}
                                searchTerm={searchTerm}
                              />
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.article>
              );
            })}
          </motion.section>
        )}
      </div>
    </MainLayout>
  );
};

export default ScopeList;
