import api from "./axios";

// Sample header APIs
export const createSample = (data) => api.post("/samples", data);

export const getSampleById = (id) => api.get(`/samples/${id}`);

export const updateSample = (id, data) => api.put(`/samples/${id}`, data);

export const deleteSample = (id) => api.delete(`/samples/${id}`);

// Sample entry APIs (Legacy)
export const createSampleEntries = (sampleId, data) => api.post(`/samples/${sampleId}/entries`, data);

export const updateSampleEntryLegacy = (entryId, data) => api.put(`/samples/entries/${entryId}`, data);

export const deleteSampleEntryLegacy = (entryId) => api.delete(`/samples/entries/${entryId}`);

export const assignTestsToSampleEntry = (entryId, data) => api.post(`/samples/entries/${entryId}/tests`, data);

// Material Categories APIs
export const getMaterialCategories = (params = {}) => api.get("/material-categories", { params });

export const createMaterialCategory = (data) => api.post("/material-categories", data);

export const updateMaterialCategory = (id, data) => api.put(`/material-categories/${id}`, data);

export const deleteMaterialCategory = (id) => api.delete(`/material-categories/${id}`);

// Material Types APIs
export const getMaterialTypes = (params = {}) => api.get("/material-types", { params });

export const createMaterialType = (data) => api.post("/material-types", data);

export const updateMaterialType = (id, data) => api.put(`/material-types/${id}`, data);

export const deleteMaterialType = (id) => api.delete(`/material-types/${id}`);

// Sample Types APIs
export const getSampleTypes = (params = {}) => api.get("/sample-types", { params });

export const createSampleType = (data) => api.post("/sample-types", data);

export const updateSampleType = (id, data) => api.put(`/sample-types/${id}`, data);

export const deleteSampleType = (id) => api.delete(`/sample-types/${id}`);

// Sample Conditions APIs
export const getSampleConditions = (params = {}) => api.get("/sample-conditions", { params });

export const createSampleCondition = (data) => api.post("/sample-conditions", data);

export const updateSampleCondition = (id, data) => api.put(`/sample-conditions/${id}`, data);

export const deleteSampleCondition = (id) => api.delete(`/sample-conditions/${id}`);

// Sample Locations APIs
export const getSampleLocations = (params = {}) => api.get("/sample-locations", { params });

export const createSampleLocation = (data) => api.post("/sample-locations", data);

export const updateSampleLocation = (id, data) => api.put(`/sample-locations/${id}`, data);

export const deleteSampleLocation = (id) => api.delete(`/sample-locations/${id}`);

// Testing Days APIs
export const getTestingDays = (params = {}) => api.get("/testing-days", { params });

export const createTestingDays = (data) => api.post("/testing-days", data);

export const updateTestingDay = (id, data) => api.put(`/testing-days/${id}`, data);

export const deleteTestingDay = (id) => api.delete(`/testing-days/${id}`);

// Sample Grades APIs
export const getSampleGrades = (params = {}) => api.get("/sample-grades", { params });

export const createSampleGrade = (data) => api.post("/sample-grades", data);

export const updateSampleGrade = (id, data) => api.put(`/sample-grades/${id}`, data);

export const deleteSampleGrade = (id) => api.delete(`/sample-grades/${id}`);

// Sample Type Tests APIs
export const getSampleTypeTests = (params = {}) => api.get("/sample-type-tests", { params });

export const createSampleTypeTest = (data) => api.post("/sample-type-tests", data);

export const deleteSampleTypeTest = (id) => api.delete(`/sample-type-tests/${id}`);

// Sample Entries APIs (New)
export const getSampleEntries = (params = {}) => api.get("/sample-entries/", { params });

export const getNextSampleNo = () => api.get("/sample-entries/next-sample-no");

export const createSampleEntry = (data) => {
  const config = data instanceof FormData ? {} : { headers: { 'Content-Type': 'application/json' } };
  return api.post("/sample-entries/", data, config);
};

export const createSampleEntriesBatch = (data) => {
  const config = data instanceof FormData ? {} : { headers: { 'Content-Type': 'application/json' } };
  return api.post("/sample-entries/batch", data, config);
};

export const updateSampleEntry = (id, data) => {
  const config = data instanceof FormData ? {} : { headers: { 'Content-Type': 'application/json' } };
  return api.put(`/sample-entries/${id}`, data, config);
};

export const updateSampleReceiptStatus = (id, status) =>
  api.patch(`/sample-entries/${id}/status`, { status });

export const deleteSampleEntry = (id) => api.delete(`/sample-entries/${id}`);

export const getSampleEntryById = (id) => api.get(`/sample-entries/${id}`);

export const getSampleEntryImageUrl = (sampleEntryId, imageId) => {
  const token = localStorage.getItem('token');
  return `/api/sample-entries/${sampleEntryId}/images/${imageId}/view${token ? `?token=${token}` : ''}`;
};

// Get all users for dropdown
export const getUsers = () => api.get("/users/list");
export const getSampleMasterData = () => api.get("/sample-entries/master-data");

export const getMaterialTypesByCategory = (categoryId) => api.get(`/sample-entries/material-types/by-category/${categoryId}`);

export const getSampleGradesByCategory = (categoryId) => api.get(`/sample-entries/sample-grades/by-category/${categoryId}`);

// Sample entry scope tests
export const getSampleEntryScopeTests = (sampleEntryId) => api.get(`/sample-entries/${sampleEntryId}/scope-tests`);

export const updateSampleEntryScopeTests = (sampleEntryId, data) => api.put(`/sample-entries/${sampleEntryId}/scope-tests`, data);
