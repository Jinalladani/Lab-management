export const MAX_PHOTOS_PER_SAMPLE = 20;

export const REGISTER_MATERIALS = [
  // "C.C. Cube",
  // "Paver Block",
  // "Soil Sample",
  // "GSB",
  // "WMM",
  // "Bitumen",
  // "Cement",
  // "Concrete Core",
  // "AAC Block",
  // "Brick",
  // "Steel",
  // "Aggregate",
  // "Water",
];

export const SAMPLE_SOURCES = ["Site", "Plant", "Client", "Third Party"];

export const RECEIVED_CONDITIONS = ["Good", "Damaged", "Wet", "Broken", "Other"];

export const SAMPLE_PRIORITIES = ["Normal", "Urgent", "High Priority"];

export const RECEIPT_STATUSES = [
  "Received",
  "Assigned",
  "Testing",
  "Observation Completed",
  "Report Generated",
  "Approved",
  "Dispatched",
  "Rejected",
];

export const STATUS_BADGE_CLASSES = {
  Received: "bg-blue-100 text-blue-700",
  Assigned: "bg-indigo-100 text-indigo-700",
  Testing: "bg-amber-100 text-amber-700",
  "Observation Completed": "bg-cyan-100 text-cyan-700",
  "Report Generated": "bg-purple-100 text-purple-700",
  Approved: "bg-green-100 text-green-700",
  Dispatched: "bg-teal-100 text-teal-700",
  Rejected: "bg-red-100 text-red-700",
};

export const PRIORITY_BADGE_CLASSES = {
  Normal: "bg-gray-100 text-gray-700",
  Urgent: "bg-orange-100 text-orange-700",
  "High Priority": "bg-red-100 text-red-700",
};

export const getStatusBadgeClass = (status) =>
  STATUS_BADGE_CLASSES[status] || "bg-gray-100 text-gray-700";

export const getPriorityBadgeClass = (priority) =>
  PRIORITY_BADGE_CLASSES[priority] || "bg-gray-100 text-gray-700";

export const TEST_TYPES = [
  "Compressive Strength",
  "Water Absorption",
  "Density",
  "Sieve Analysis",
  "Bitumen Extraction",
  "CBR",
  "Atterberg Limit",
  "Compaction Test",
  "Marshall Stability",
  "Flexural Strength",
  "Chemical Analysis",
  "Custom Test",
];

export const TESTING_TEAMS = [
  "Testing Team",
  "Soil Team",
  "Concrete Team",
  "Bitumen Team",
  "Chemical Team",
  "Steel Team",
];

export const SAMPLE_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "assigned", label: "Assigned" },
  { value: "testing", label: "Testing" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
];

export const SAMPLE_CATEGORIES = [
  "Concrete",
  "Soil",
  "Highway",
  "Building",
  "Steel",
  "Water",
  "Bitumen",
  "Aggregate",
  "Other",
];

export const DOCUMENT_TYPES = ["Client Letter", "Test Request Form", "Purchase Order", "Site Letter"];
