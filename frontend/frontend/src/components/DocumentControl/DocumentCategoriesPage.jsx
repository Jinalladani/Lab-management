import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Edit, Trash2, CheckCircle, X, ShieldCheck,
  FileText, Layers, Award, Tag, MoreVertical, BookOpen, Filter, Hash, AlertCircle
} from "lucide-react";
import MainLayout from "../layout/MainLayout";
import { mockDocumentDb } from "../../utils/mockDocumentData";
import {
  getDocumentCategoriesApi,
  addDocumentCategoryApi,
  updateDocumentCategoryApi,
  toggleDocumentCategoryStatusApi,
  deleteDocumentCategoryApi
} from "../../api/documentControl";

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } },
  item: {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.22, 0.68, 0, 1] } },
  },
};

export const DocumentCategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'Controlled Document' | 'Supporting Document'
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'inactive'
  
  // Modal / Drawer state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formCategory, setFormCategory] = useState({
    name: "",
    prefix: "",
    categoryType: "Controlled Document",
    description: "",
    active: true
  });

  const fetchCategories = async () => {
    try {
      const res = await getDocumentCategoriesApi();
      if (res?.data?.success && Array.isArray(res.data.data)) {
        setCategories(res.data.data.map(c => ({
          ...c,
          id: c.category_id || c.id,
          name: c.name,
          prefix: c.prefix || (c.name ? c.name.slice(0, 3).toUpperCase() : "CAT"),
          categoryType: c.category_type || c.categoryType || "Controlled Document",
          description: c.description || "",
          active: c.active !== undefined ? c.active : true
        })));
        return;
      }
    } catch (err) {
      console.warn("Backend API unavailable, using local mock DB:", err);
    }
    const data = mockDocumentDb.getDocumentCategories();
    setCategories(data);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Filtered categories logic
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const matchesTab = activeTab === "all" || cat.categoryType === activeTab;
      const matchesSearch =
        cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cat.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cat.prefix || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesStatus = true;
      if (statusFilter === "active") matchesStatus = cat.active === true;
      if (statusFilter === "inactive") matchesStatus = cat.active === false;

      return matchesTab && matchesSearch && matchesStatus;
    });
  }, [categories, activeTab, searchTerm, statusFilter]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = categories.length;
    const controlled = categories.filter((c) => c.categoryType === "Controlled Document").length;
    const supporting = categories.filter((c) => c.categoryType === "Supporting Document").length;
    const activeCount = categories.filter((c) => c.active).length;
    return { total, controlled, supporting, activeCount };
  }, [categories]);

  // Handlers
  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setFormCategory({
      name: "",
      prefix: "",
      categoryType: activeTab === "Supporting Document" ? "Supporting Document" : "Controlled Document",
      description: "",
      active: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat) => {
    setEditingCategory(cat);
    setFormCategory({
      name: cat.name,
      prefix: cat.prefix || "",
      categoryType: cat.categoryType || "Controlled Document",
      description: cat.description || "",
      active: cat.active !== undefined ? cat.active : true
    });
    setIsModalOpen(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!formCategory.name.trim()) return;

    try {
      if (editingCategory) {
        await updateDocumentCategoryApi(editingCategory.id || editingCategory.category_id, formCategory);
        mockDocumentDb.updateDocumentCategory(editingCategory.id, formCategory);
      } else {
        await addDocumentCategoryApi(formCategory);
        mockDocumentDb.addDocumentCategory(formCategory);
      }
    } catch (err) {
      console.error("Error saving category to backend API:", err);
      if (editingCategory) {
        mockDocumentDb.updateDocumentCategory(editingCategory.id, formCategory);
      } else {
        mockDocumentDb.addDocumentCategory(formCategory);
      }
    }

    fetchCategories();
    setIsModalOpen(false);
  };

  const handleToggleStatus = async (id) => {
    try {
      await toggleDocumentCategoryStatusApi(id);
    } catch (err) {
      console.warn("Error toggling category status via backend API:", err);
    }
    mockDocumentDb.toggleCategoryStatus(id);
    fetchCategories();
  };

  const handleDeleteCategory = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete the category "${name}"?`)) {
      try {
        await deleteDocumentCategoryApi(id);
      } catch (err) {
        console.warn("Error deleting category via backend API:", err);
      }
      mockDocumentDb.deleteDocumentCategory(id);
      fetchCategories();
    }
  };

  return (
    <MainLayout headerTitle="Document Categories" headerSubtitle="Manage document classification schemas & ISO 17025 document types">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">

        {/* Top Header Banner */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#243744] to-[#1A2733] p-6 rounded-3xl text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
          
          <div className="relative z-10 space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider border border-emerald-500/30">
                ISO 17025:2017 & NABL Compliant
              </span>
              <span className="text-slate-300 text-xs font-medium">• Document Control Module</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <Layers className="text-emerald-400" size={24} />
              Document Category Management
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl font-medium leading-relaxed">
              Configure master document categories, code prefixes, and structure for Controlled Operational Documents and Supporting Reference Documents.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3 shrink-0">
            <button
              onClick={handleOpenAddModal}
              className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 px-5 text-xs font-bold text-white shadow-md hover:shadow-emerald-500/25 transition-all active:scale-95"
            >
              <Plus size={16} /> Add New Category
            </button>
          </div>
        </div>

        {/* Stats Metrics Banner */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Total Categories</p>
              <h3 className="text-xl font-black text-[#243744] mt-0.5">{stats.total}</h3>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-blue-50 text-[#243744] flex items-center justify-center">
              <Layers size={20} />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Controlled Docs</p>
              <h3 className="text-xl font-black text-[#243744] mt-0.5">{stats.controlled}</h3>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-[#059669] flex items-center justify-center">
              <BookOpen size={20} />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Supporting Docs</p>
              <h3 className="text-xl font-black text-[#243744] mt-0.5">{stats.supporting}</h3>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <FileText size={20} />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Active Schema</p>
              <h3 className="text-xl font-black text-emerald-600 mt-0.5">{stats.activeCount} <span className="text-xs font-semibold text-slate-400">/ {stats.total}</span></h3>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle size={20} />
            </div>
          </div>
        </div>

        {/* Filter Controls & Category Type Tabs */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs mb-6 space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            
            {/* Category Type Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl shrink-0 overflow-x-auto">
              {[
                { id: "all", label: "All Categories", count: stats.total },
                { id: "Controlled Document", label: "Controlled Documents", count: stats.controlled },
                { id: "Supporting Document", label: "Supporting Documents", count: stats.supporting }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-white text-[#243744] shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === tab.id ? "bg-[#243744]/10 text-[#243744]" : "bg-slate-200 text-slate-600"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search Input & Status Filter */}
            <div className="flex items-center gap-3">
              <div className="flex-1 md:w-72 flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-[#243744] focus-within:bg-white transition-all">
                <Search size={14} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search categories or prefix..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 outline-none"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm("")} className="text-slate-400 hover:text-slate-600">
                    <X size={13} />
                  </button>
                )}
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-3 text-xs font-bold text-slate-600 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:border-[#243744] focus:bg-white transition-all appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%238A97A4' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: "right 8px center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "14px",
                  paddingRight: "28px"
                }}
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Categories Main Content Area */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          {filteredCategories.length === 0 ? (
            <div className="p-16 text-center">
              <Layers size={40} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800">No categories found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Try adjusting your search criteria or add a new category to expand your document structure.
              </p>
              <button
                onClick={handleOpenAddModal}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#243744] text-white text-xs font-bold hover:bg-[#1A2733] transition-all"
              >
                <Plus size={14} /> Add Category
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table View (md and above) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      <th className="px-6 py-3.5">Category Name</th>
                      <th className="px-6 py-3.5">Code Prefix</th>
                      <th className="px-6 py-3.5">Classification Type</th>
                      <th className="px-6 py-3.5">Docs Count</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <motion.tbody variants={stagger.container} initial="hidden" animate="visible" className="divide-y divide-slate-100">
                    {filteredCategories.map((cat) => (
                      <motion.tr
                        key={cat.id}
                        variants={stagger.item}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* Category Name & Description */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-[#243744]/10 text-[#243744] flex items-center justify-center font-black text-xs shrink-0">
                              {cat.prefix || cat.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-xs text-slate-800 block group-hover:text-[#243744] transition-colors">{cat.name}</span>
                              {cat.description && (
                                <span className="text-[11px] text-slate-400 font-medium block mt-0.5 max-w-md truncate">{cat.description}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Code Prefix */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-xs text-[#243744] bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                            <Hash size={11} className="text-slate-400" />
                            {cat.prefix || cat.name.slice(0, 3).toUpperCase()}
                          </span>
                        </td>

                        {/* Classification Type */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            cat.categoryType === "Controlled Document"
                              ? "bg-emerald-50 text-[#059669] border border-emerald-200"
                              : "bg-purple-50 text-purple-700 border border-purple-200"
                          }`}>
                            {cat.categoryType}
                          </span>
                        </td>

                        {/* Docs Count */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700">
                            {cat.documentCount || (cat.documentTypes ? cat.documentTypes.length * 4 : 5)} Documents
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleStatus(cat.id)}
                            className="cursor-pointer"
                            title="Click to toggle status"
                          >
                            {cat.active ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#059669] border border-emerald-200 hover:bg-emerald-100 transition-colors">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 transition-colors">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                Inactive
                              </span>
                            )}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(cat)}
                              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-[#243744] rounded-lg transition-colors"
                              title="Edit Category"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                              title="Delete Category"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </table>
              </div>

              {/* Mobile & Tablet Card Grid View (Screen < md) */}
              <div className="block md:hidden p-3.5 space-y-3.5 bg-slate-50/60">
                {filteredCategories.map((cat) => (
                  <motion.div
                    key={cat.id}
                    variants={stagger.item}
                    initial="hidden"
                    animate="visible"
                    className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 space-y-3"
                  >
                    {/* Top Row: Prefix & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="h-7 w-7 rounded-lg bg-[#243744]/10 text-[#243744] flex items-center justify-center font-black text-xs">
                          {cat.prefix || cat.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          cat.categoryType === "Controlled Document"
                            ? "bg-emerald-50 text-[#059669] border border-emerald-200"
                            : "bg-purple-50 text-purple-700 border border-purple-200"
                        }`}>
                          {cat.categoryType}
                        </span>
                      </div>

                      <button onClick={() => handleToggleStatus(cat.id)}>
                        {cat.active ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#059669] border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Inactive
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Name & Description */}
                    <div>
                      <h4 className="font-bold text-xs text-slate-800">{cat.name}</h4>
                      {cat.description && (
                        <p className="text-[11px] text-slate-400 font-medium line-clamp-2 mt-0.5">{cat.description}</p>
                      )}
                    </div>

                    {/* Details pill */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px]">
                      <span className="text-slate-400 font-medium">Doc Count</span>
                      <span className="font-bold text-[#243744]">
                        {cat.documentCount || (cat.documentTypes ? cat.documentTypes.length * 4 : 5)} Documents
                      </span>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEditModal(cat)}
                        className="py-1.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-[#243744] flex items-center gap-1 transition-all"
                      >
                        <Edit size={13} /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="py-1.5 px-3 rounded-xl border border-red-200 bg-red-50 text-[11px] font-bold text-red-600 hover:bg-red-100 flex items-center gap-1 transition-all"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Add / Edit Category Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden"
              >
                <div className="bg-[#243744] text-white px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-white/10 text-emerald-400 flex items-center justify-center font-bold">
                      <Tag size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold tracking-tight">
                        {editingCategory ? "Edit Category Schema" : "Create New Document Category"}
                      </h3>
                      <p className="text-[11px] text-slate-300 font-medium">Configure document classification metadata</p>
                    </div>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-white/15 rounded-full text-white/70 hover:text-white transition-colors">
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveCategory} className="p-6 space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Category Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Standard Operating Procedure (SOP)"
                      value={formCategory.name}
                      onChange={(e) => setFormCategory(prev => ({ ...prev, name: e.target.value }))}
                      required
                      className="w-full h-10 px-3.5 font-semibold text-slate-800 border border-slate-200 rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Code Prefix (e.g. SOP)</label>
                      <input
                        type="text"
                        placeholder="e.g. SOP"
                        value={formCategory.prefix}
                        onChange={(e) => setFormCategory(prev => ({ ...prev, prefix: e.target.value.toUpperCase() }))}
                        className="w-full h-10 px-3.5 font-mono font-bold text-slate-800 border border-slate-200 rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all uppercase"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Classification Type *</label>
                      <select
                        value={formCategory.categoryType}
                        onChange={(e) => setFormCategory(prev => ({ ...prev, categoryType: e.target.value }))}
                        className="w-full h-10 px-3 font-semibold text-slate-800 border border-slate-200 rounded-xl outline-none focus:border-[#243744] bg-white transition-all"
                      >
                        <option value="Controlled Document">Controlled Document</option>
                        <option value="Supporting Document">Supporting Document</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Description & Scope</label>
                    <textarea
                      rows={3}
                      placeholder="Enter details about this category, guidelines, or scope..."
                      value={formCategory.description}
                      onChange={(e) => setFormCategory(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full p-3 font-medium text-slate-800 border border-slate-200 rounded-xl outline-none focus:border-[#243744] focus:ring-2 focus:ring-[#243744]/10 transition-all"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-800 block">Category Status</span>
                      <span className="text-[11px] text-slate-400">Active categories are available for document creation</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormCategory(prev => ({ ...prev, active: !prev.active }))}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        formCategory.active ? "bg-emerald-50 text-[#059669] border border-emerald-200" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {formCategory.active ? "Active" : "Inactive"}
                    </button>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-[#243744] hover:bg-[#1A2733] text-white text-xs font-bold transition-all shadow-md active:scale-95"
                    >
                      {editingCategory ? "Save Changes" : "Create Category"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </MainLayout>
  );
};

export default DocumentCategoriesPage;
