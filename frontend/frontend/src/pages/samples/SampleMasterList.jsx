import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  getSampleTypes, 
  getSampleConditions,
  getMaterialCategories,
  getMaterialTypes,
  getSampleLocations,
  getTestingDays,
  getSampleGrades,
  updateSampleType, 
  updateSampleCondition,
  updateMaterialCategory,
  updateMaterialType,
  updateSampleLocation,
  updateTestingDay,
  updateSampleGrade,
  deleteSampleType,
  deleteSampleCondition,
  deleteMaterialCategory,
  deleteMaterialType,
  deleteSampleLocation,
  deleteTestingDay,
  deleteSampleGrade,
  createSampleType,
  createSampleCondition,
  createMaterialCategory,
  createMaterialType,
  createSampleLocation,
  createTestingDays,
  createSampleGrade
} from "../../api/sampleMaster";
import { MainLayout } from "../../components/layout";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ScienceIcon from "@mui/icons-material/Science";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import CategoryIcon from "@mui/icons-material/Category";
import BuildIcon from "@mui/icons-material/Build";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import ScheduleIcon from "@mui/icons-material/Schedule";
import GradeIcon from "@mui/icons-material/Grade";

const SampleMasterList = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("categories"); 
  const [sampleTypes, setSampleTypes] = useState([]);
  const [sampleConditions, setSampleConditions] = useState([]);
  const [materialCategories, setMaterialCategories] = useState([]);
  const [materialTypes, setMaterialTypes] = useState([]);
  const [sampleLocations, setSampleLocations] = useState([]);
  const [testingDays, setTestingDays] = useState([]);
  const [sampleGrades, setSampleGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [addForm, setAddForm] = useState({});

  // Fetch functions for each tab
  const fetchMaterialCategories = async () => {
    try {
      setLoading(true);
      const response = await getMaterialCategories({ status: "active" });
      setMaterialCategories(response.data?.data || []);
    } catch (error) {
      console.error("Error fetching material categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterialTypes = async () => {
    try {
      setLoading(true);
      const response = await getMaterialTypes({ status: "active" });
      setMaterialTypes(response.data?.data || []);
    } catch (error) {
      console.error("Error fetching material types:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSampleTypes = async () => {
    try {
      setLoading(true);
      const response = await getSampleTypes({ status: "active" });
      setSampleTypes(response.data?.data || []);
    } catch (error) {
      console.error("Error fetching sample types:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSampleConditions = async () => {
    try {
      setLoading(true);
      const response = await getSampleConditions({ status: "active" });
      setSampleConditions(response.data?.data || []);
    } catch (error) {
      console.error("Error fetching sample conditions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSampleLocations = async () => {
    try {
      setLoading(true);
      const response = await getSampleLocations({ status: "active" });
      setSampleLocations(response.data?.data || []);
    } catch (error) {
      console.error("Error fetching sample locations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTestingDays = async () => {
    try {
      setLoading(true);
      const response = await getTestingDays({ status: "active" });
      setTestingDays(response.data?.data || []);
    } catch (error) {
      console.error("Error fetching testing days:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSampleGrades = async () => {
    try {
      setLoading(true);
      const response = await getSampleGrades({ status: "active" });
      setSampleGrades(response.data?.data || []);
    } catch (error) {
      console.error("Error fetching sample grades:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    switch (activeTab) {
      case "categories":
        fetchMaterialCategories();
        break;
      case "material-types":
        fetchMaterialTypes();
        break;
      case "types":
        fetchSampleTypes();
        break;
      case "conditions":
        fetchSampleConditions();
        break;
      case "locations":
        fetchSampleLocations();
        break;
      case "testing-days":
        fetchTestingDays();
        break;
      case "grades":
        fetchSampleGrades();
        break;
      default:
        break;
    }
  }, [activeTab]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdown && !event.target.closest('.dropdown-container')) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown]);

  const handleEdit = (item) => {
    setEditingItem(item);
    
    // Set edit form based on active tab
    switch (activeTab) {
      case "categories":
        setEditForm({
          category_name: item.category_name,
          description: item.description || ""
        });
        break;
      case "material-types":
        setEditForm({
          material_category_id: item.material_category_id,
          type_name: item.type_name,
          description: item.description || ""
        });
        break;
      case "types":
        setEditForm({
          material_type_id: item.material_type_id,
          sample_type_name: item.sample_type_name,
          description: item.description || ""
        });
        break;
      case "conditions":
        setEditForm({
          condition_name: item.condition_name,
          description: item.description || ""
        });
        break;
      case "locations":
        setEditForm({
          location_name: item.location_name,
          description: item.description || ""
        });
        break;
      case "testing-days":
        setEditForm({
          days: item.days,
          description: item.description || ""
        });
        break;
      case "grades":
        setEditForm({
          material_category_id: item.material_category_id,
          grade_name: item.grade_name,
          grade_description: item.grade_description || ""
        });
        break;
      default:
        break;
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      switch (activeTab) {
        case "categories":
          await updateMaterialCategory(editingItem.material_category_id, editForm);
          await fetchMaterialCategories();
          break;
        case "material-types":
          await updateMaterialType(editingItem.material_type_id, editForm);
          await fetchMaterialTypes();
          break;
        case "types":
          await updateSampleType(editingItem.sample_type_id, editForm);
          await fetchSampleTypes();
          break;
        case "conditions":
          await updateSampleCondition(editingItem.sample_condition_id, editForm);
          await fetchSampleConditions();
          break;
        case "locations":
          await updateSampleLocation(editingItem.sample_location_id, editForm);
          await fetchSampleLocations();
          break;
        case "testing-days":
          await updateTestingDay(editingItem.testing_day_id, editForm);
          await fetchTestingDays();
          break;
        case "grades":
          await updateSampleGrade(editingItem.sample_grade_id, editForm);
          await fetchSampleGrades();
          break;
      }
      
      setEditingItem(null);
      setEditForm({});
      alert("Updated successfully!");
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to update");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingItem(null);
    setEditForm({});
  };

  const handleDelete = async (item) => {
    if (!window.confirm("Are you sure you want to delete this item? This action cannot be undone.")) {
      return;
    }

    try {
      setLoading(true);
      
      switch (activeTab) {
        case "categories":
          await deleteMaterialCategory(item.material_category_id);
          await fetchMaterialCategories();
          break;
        case "material-types":
          await deleteMaterialType(item.material_type_id);
          await fetchMaterialTypes();
          break;
        case "types":
          await deleteSampleType(item.sample_type_id);
          await fetchSampleTypes();
          break;
        case "conditions":
          await deleteSampleCondition(item.sample_condition_id);
          await fetchSampleConditions();
          break;
        case "locations":
          await deleteSampleLocation(item.sample_location_id);
          await fetchSampleLocations();
          break;
        case "testing-days":
          await deleteTestingDay(item.testing_day_id);
          await fetchTestingDays();
          break;
        case "grades":
          await deleteSampleGrade(item.sample_grade_id);
          await fetchSampleGrades();
          break;
      }
      
      alert("Deleted successfully!");
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to delete");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setLoading(true);
      
      switch (activeTab) {
        case "categories":
          await createMaterialCategory(addForm);
          await fetchMaterialCategories();
          break;
        case "material-types":
          await createMaterialType(addForm);
          await fetchMaterialTypes();
          break;
        case "types":
          await createSampleType(addForm);
          await fetchSampleTypes();
          break;
        case "conditions":
          await createSampleCondition(addForm);
          await fetchSampleConditions();
          break;
        case "locations":
          await createSampleLocation(addForm);
          await fetchSampleLocations();
          break;
        case "testing-days":
          await createTestingDays(addForm);
          await fetchTestingDays();
          break;
        case "grades":
          await createSampleGrade(addForm);
          await fetchSampleGrades();
          break;
      }
      
      setShowAddDialog(false);
      setAddForm({});
      alert("Created successfully!");
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to create");
    } finally {
      setLoading(false);
    }
  };

  const handleDropdownToggle = (itemId) => {
    setActiveDropdown(activeDropdown === itemId ? null : itemId);
  };

  const closeDropdown = () => {
    setActiveDropdown(null);
  };

  const tabs = [
    { id: "categories", label: "Material Categories", icon: <CategoryIcon /> },
    { id: "material-types", label: "Material Types", icon: <BuildIcon /> },
    { id: "types", label: "Sample Types", icon: <ScienceIcon /> },
    { id: "conditions", label: "Sample Conditions", icon: <LocalHospitalIcon /> },
    { id: "locations", label: "Sample Locations", icon: <LocationOnIcon /> },
    { id: "testing-days", label: "Testing Days", icon: <ScheduleIcon /> },
    { id: "grades", label: "Sample Grades", icon: <GradeIcon /> }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "categories":
        return (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Material Categories</h2>
              <button
                onClick={() => {
                  setAddForm({});
                  setShowAddDialog(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#2b63ae] text-white rounded-lg hover:bg-[#1e4a8c] transition-colors"
              >
                <AddIcon className="w-4 h-4" />
                Add Category
              </button>
            </div>
            <div className="space-y-4 overflow-visible">
              {materialCategories.map((category) => (
                <div key={category.material_category_id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  {editingItem?.material_category_id === category.material_category_id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                        <input
                          type="text"
                          value={editForm.category_name}
                          onChange={(e) => setEditForm({ ...editForm, category_name: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                          rows="3"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          disabled={loading}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                          {loading ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900">{category.category_name}</h3>
                        {category.description && (
                          <p className="text-gray-600 text-sm mt-1">{category.description}</p>
                        )}
                      </div>
                      <div className="dropdown-container relative">
                        <button
                          onClick={() => handleDropdownToggle(category.material_category_id)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Actions"
                        >
                          <MoreVertIcon className="w-4 h-4" />
                        </button>
                        {activeDropdown === category.material_category_id && (
                          <div className="absolute right-0 z-50 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                            <button
                              onClick={() => {
                                handleEdit(category);
                                closeDropdown();
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <EditIcon className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                handleDelete(category);
                                closeDropdown();
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <DeleteIcon className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case "material-types":
        return (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Material Types</h2>
              <button
                onClick={() => {
                  setAddForm({});
                  setShowAddDialog(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#2b63ae] text-white rounded-lg hover:bg-[#1e4a8c] transition-colors"
              >
                <AddIcon className="w-4 h-4" />
                Add Material Type
              </button>
            </div>
            <div className="space-y-4 overflow-visible">
              {materialTypes.map((type) => (
                <div key={type.material_type_id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  {editingItem?.material_type_id === type.material_type_id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Material Category</label>
                        <select
                          value={editForm.material_category_id}
                          onChange={(e) => setEditForm({ ...editForm, material_category_id: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        >
                          <option value="">Select a category</option>
                          {materialCategories.map((category) => (
                            <option key={category.material_category_id} value={category.material_category_id}>
                              {category.category_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type Name</label>
                        <input
                          type="text"
                          value={editForm.type_name}
                          onChange={(e) => setEditForm({ ...editForm, type_name: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                          rows="3"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          disabled={loading}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                          {loading ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900">{type.type_name}</h3>
                        {type.description && (
                          <p className="text-gray-600 text-sm mt-1">{type.description}</p>
                        )}
                        <p className="text-gray-500 text-xs mt-2">
                          Category: <span className="text-blue-600">{type.category_name}</span>
                        </p>
                      </div>
                      <div className="dropdown-container relative">
                        <button
                          onClick={() => handleDropdownToggle(type.material_type_id)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Actions"
                        >
                          <MoreVertIcon className="w-4 h-4" />
                        </button>
                        {activeDropdown === type.material_type_id && (
                          <div className="absolute right-0 z-50 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                            <button
                              onClick={() => {
                                handleEdit(type);
                                closeDropdown();
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <EditIcon className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                handleDelete(type);
                                closeDropdown();
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <DeleteIcon className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case "types":
        return (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Sample Types</h2>
              <button
                onClick={() => {
                  setAddForm({});
                  setShowAddDialog(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#2b63ae] text-white rounded-lg hover:bg-[#1e4a8c] transition-colors"
              >
                <AddIcon className="w-4 h-4" />
                Add Sample Type
              </button>
            </div>
            <div className="space-y-4 overflow-visible">
              {sampleTypes.map((type) => (
                <div key={type.sample_type_id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  {editingItem?.sample_type_id === type.sample_type_id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Material Type</label>
                        <select
                          value={editForm.material_type_id}
                          onChange={(e) => setEditForm({ ...editForm, material_type_id: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        >
                          <option value="">Select a material type</option>
                          {materialTypes.map((materialType) => (
                            <option key={materialType.material_type_id} value={materialType.material_type_id}>
                              {materialType.type_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sample Type Name</label>
                        <input
                          type="text"
                          value={editForm.sample_type_name}
                          onChange={(e) => setEditForm({ ...editForm, sample_type_name: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                          rows="3"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          disabled={loading}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                          {loading ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900">{type.sample_type_name}</h3>
                        {type.description && (
                          <p className="text-gray-600 text-sm mt-1">{type.description}</p>
                        )}
                      </div>
                      <div className="dropdown-container relative">
                        <button
                          onClick={() => handleDropdownToggle(type.sample_type_id)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Actions"
                        >
                          <MoreVertIcon className="w-4 h-4" />
                        </button>
                        {activeDropdown === type.sample_type_id && (
                          <div className="absolute right-0 z-50 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                            <button
                              onClick={() => {
                                handleEdit(type);
                                closeDropdown();
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <EditIcon className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                handleDelete(type);
                                closeDropdown();
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <DeleteIcon className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case "conditions":
        return (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Sample Conditions</h2>
              <button
                onClick={() => {
                  setAddForm({});
                  setShowAddDialog(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#2b63ae] text-white rounded-lg hover:bg-[#1e4a8c] transition-colors"
              >
                <AddIcon className="w-4 h-4" />
                Add Sample Condition
              </button>
            </div>
            <div className="space-y-4 overflow-visible">
              {sampleConditions.map((condition) => (
                <div key={condition.sample_condition_id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  {editingItem?.sample_condition_id === condition.sample_condition_id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Condition Name</label>
                        <input
                          type="text"
                          value={editForm.condition_name}
                          onChange={(e) => setEditForm({ ...editForm, condition_name: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                          rows="3"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          disabled={loading}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                          {loading ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900">{condition.condition_name}</h3>
                        {condition.description && (
                          <p className="text-gray-600 text-sm mt-1">{condition.description}</p>
                        )}
                      </div>
                      <div className="dropdown-container relative">
                        <button
                          onClick={() => handleDropdownToggle(condition.sample_condition_id)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Actions"
                        >
                          <MoreVertIcon className="w-4 h-4" />
                        </button>
                        {activeDropdown === condition.sample_condition_id && (
                          <div className="absolute right-0 z-50 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                            <button
                              onClick={() => {
                                handleEdit(condition);
                                closeDropdown();
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <EditIcon className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                handleDelete(condition);
                                closeDropdown();
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <DeleteIcon className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case "locations":
        return (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Sample Locations</h2>
              <button
                onClick={() => {
                  setAddForm({});
                  setShowAddDialog(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#2b63ae] text-white rounded-lg hover:bg-[#1e4a8c] transition-colors"
              >
                <AddIcon className="w-4 h-4" />
                Add Sample Location
              </button>
            </div>
            <div className="space-y-4 overflow-visible">
              {sampleLocations.map((location) => (
                <div key={location.sample_location_id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  {editingItem?.sample_location_id === location.sample_location_id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location Name</label>
                        <input
                          type="text"
                          value={editForm.location_name}
                          onChange={(e) => setEditForm({ ...editForm, location_name: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                          rows="3"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          disabled={loading}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                          {loading ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900">{location.location_name}</h3>
                        {location.description && (
                          <p className="text-gray-600 text-sm mt-1">{location.description}</p>
                        )}
                      </div>
                      <div className="dropdown-container relative">
                        <button
                          onClick={() => handleDropdownToggle(location.sample_location_id)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Actions"
                        >
                          <MoreVertIcon className="w-4 h-4" />
                        </button>
                        {activeDropdown === location.sample_location_id && (
                          <div className="absolute right-0 z-50 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                            <button
                              onClick={() => {
                                handleEdit(location);
                                closeDropdown();
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <EditIcon className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                handleDelete(location);
                                closeDropdown();
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <DeleteIcon className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case "testing-days":
        return (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Testing Days</h2>
              <button
                onClick={() => {
                  setAddForm({});
                  setShowAddDialog(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#2b63ae] text-white rounded-lg hover:bg-[#1e4a8c] transition-colors"
              >
                <AddIcon className="w-4 h-4" />
                Add Testing Days
              </button>
            </div>
            <div className="space-y-4 overflow-visible">
              {testingDays.map((day) => (
                <div key={day.testing_day_id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  {editingItem?.testing_day_id === day.testing_day_id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Days</label>
                        <input
                          type="number"
                          value={editForm.days}
                          onChange={(e) => setEditForm({ ...editForm, days: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                          rows="3"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          disabled={loading}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                          {loading ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900">{day.days} Days</h3>
                        {day.description && (
                          <p className="text-gray-600 text-sm mt-1">{day.description}</p>
                        )}
                      </div>
                      <div className="dropdown-container relative">
                        <button
                          onClick={() => handleDropdownToggle(day.testing_day_id)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Actions"
                        >
                          <MoreVertIcon className="w-4 h-4" />
                        </button>
                        {activeDropdown === day.testing_day_id && (
                          <div className="absolute right-0 z-50 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                            <button
                              onClick={() => {
                                handleEdit(day);
                                closeDropdown();
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <EditIcon className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                handleDelete(day);
                                closeDropdown();
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <DeleteIcon className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case "grades":
        return (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Sample Grades</h2>
              <button
                onClick={() => {
                  setAddForm({});
                  setShowAddDialog(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#2b63ae] text-white rounded-lg hover:bg-[#1e4a8c] transition-colors"
              >
                <AddIcon className="w-4 h-4" />
                Add Sample Grade
              </button>
            </div>
            <div className="space-y-4 overflow-visible">
              {sampleGrades.map((grade) => (
                <div key={grade.sample_grade_id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  {editingItem?.sample_grade_id === grade.sample_grade_id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Material Category</label>
                        <select
                          value={editForm.material_category_id}
                          onChange={(e) => setEditForm({ ...editForm, material_category_id: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        >
                          <option value="">Select a category</option>
                          {materialCategories.map((category) => (
                            <option key={category.material_category_id} value={category.material_category_id}>
                              {category.category_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Grade Name</label>
                        <input
                          type="text"
                          value={editForm.grade_name}
                          onChange={(e) => setEditForm({ ...editForm, grade_name: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Grade Description</label>
                        <textarea
                          value={editForm.grade_description}
                          onChange={(e) => setEditForm({ ...editForm, grade_description: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                          rows="3"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          disabled={loading}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                          {loading ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900">{grade.grade_name}</h3>
                        {grade.grade_description && (
                          <p className="text-gray-600 text-sm mt-1">{grade.grade_description}</p>
                        )}
                        <p className="text-gray-500 text-xs mt-2">
                          {grade.category_name && (
                            <span>Category: <span className="text-blue-600">{grade.category_name}</span></span>
                          )}
                        </p>
                      </div>
                      <div className="dropdown-container relative">
                        <button
                          onClick={() => handleDropdownToggle(grade.sample_grade_id)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Actions"
                        >
                          <MoreVertIcon className="w-4 h-4" />
                        </button>
                        {activeDropdown === grade.sample_grade_id && (
                          <div className="absolute right-0 z-50 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                            <button
                              onClick={() => {
                                handleEdit(grade);
                                closeDropdown();
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <EditIcon className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                handleDelete(grade);
                                closeDropdown();
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <DeleteIcon className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <MainLayout headerTitle="Sample Master Management" headerSubtitle="Manage all sample master data">
      <div className="p-4 sm:p-6">
        <div className="w-full">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200">
            {/* Tabs */}
            <div className="border-b border-gray-200 bg-gray-50">
              <div className="flex flex-wrap">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'text-[#2b63ae] border-b-2 border-[#2b63ae] bg-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border-b-2 border-transparent'
                    }`}
                  >
                    <span className="text-lg">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="p-6 sm:p-8">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>

      {/* Add Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Add New {tabs.find(tab => tab.id === activeTab)?.label?.replace('Material ', '').replace('Sample ', '').replace('Testing ', '').replace('Locations', 'Location').replace('Days', 'Day').replace('Types', 'Type').replace('Conditions', 'Condition').replace('Grades', 'Grade') || 'Item'}
              </h3>
              
              <div className="space-y-4">
                {activeTab === 'categories' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                      <input
                        type="text"
                        value={addForm.category_name || ''}
                        onChange={(e) => setAddForm({ ...addForm, category_name: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        placeholder="Enter category name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={addForm.description || ''}
                        onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        rows="3"
                        placeholder="Enter description"
                      />
                    </div>
                  </>
                )}
                
                {activeTab === 'material-types' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Material Category</label>
                      <select
                        value={addForm.material_category_id || ''}
                        onChange={(e) => setAddForm({ ...addForm, material_category_id: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                      >
                        <option value="">Select a category</option>
                        {materialCategories.map((category) => (
                          <option key={category.material_category_id} value={category.material_category_id}>
                            {category.category_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type Name</label>
                      <input
                        type="text"
                        value={addForm.type_name || ''}
                        onChange={(e) => setAddForm({ ...addForm, type_name: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        placeholder="Enter type name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={addForm.description || ''}
                        onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        rows="3"
                        placeholder="Enter description"
                      />
                    </div>
                  </>
                )}
                
                {activeTab === 'types' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Material Type</label>
                      <select
                        value={addForm.material_type_id || ''}
                        onChange={(e) => setAddForm({ ...addForm, material_type_id: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                      >
                        <option value="">Select a material type</option>
                        {materialTypes.map((type) => (
                          <option key={type.material_type_id} value={type.material_type_id}>
                            {type.type_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sample Type Name</label>
                      <input
                        type="text"
                        value={addForm.sample_type_name || ''}
                        onChange={(e) => setAddForm({ ...addForm, sample_type_name: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        placeholder="Enter sample type name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={addForm.description || ''}
                        onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        rows="3"
                        placeholder="Enter description"
                      />
                    </div>
                  </>
                )}
                
                {activeTab === 'conditions' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Condition Name</label>
                      <input
                        type="text"
                        value={addForm.condition_name || ''}
                        onChange={(e) => setAddForm({ ...addForm, condition_name: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        placeholder="Enter condition name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={addForm.description || ''}
                        onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        rows="3"
                        placeholder="Enter description"
                      />
                    </div>
                  </>
                )}
                
                {activeTab === 'locations' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location Name</label>
                      <input
                        type="text"
                        value={addForm.location_name || ''}
                        onChange={(e) => setAddForm({ ...addForm, location_name: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        placeholder="Enter location name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={addForm.description || ''}
                        onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        rows="3"
                        placeholder="Enter description"
                      />
                    </div>
                  </>
                )}
                
                {activeTab === 'testing-days' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Days</label>
                      <input
                        type="number"
                        value={addForm.days || ''}
                        onChange={(e) => setAddForm({ ...addForm, days: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        placeholder="Enter number of days"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={addForm.description || ''}
                        onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        rows="3"
                        placeholder="Enter description"
                      />
                    </div>
                  </>
                )}
                
                {activeTab === 'grades' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Material Category</label>
                      <select
                        value={addForm.material_category_id || ''}
                        onChange={(e) => setAddForm({ ...addForm, material_category_id: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                      >
                        <option value="">Select a category</option>
                        {materialCategories.map((category) => (
                          <option key={category.material_category_id} value={category.material_category_id}>
                            {category.category_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Grade Name</label>
                      <input
                        type="text"
                        value={addForm.grade_name || ''}
                        onChange={(e) => setAddForm({ ...addForm, grade_name: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        placeholder="Enter grade name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Grade Description</label>
                      <textarea
                        value={addForm.grade_description || ''}
                        onChange={(e) => setAddForm({ ...addForm, grade_description: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2b63ae] focus:border-transparent"
                        rows="3"
                        placeholder="Enter grade description"
                      />
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-[#2b63ae] text-white rounded-lg hover:bg-[#1e4a8c] transition-colors disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create"}
                </button>
                <button
                  onClick={() => {
                    setShowAddDialog(false);
                    setAddForm({});
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default SampleMasterList;
