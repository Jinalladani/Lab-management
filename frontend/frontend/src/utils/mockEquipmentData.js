// Mock Database for Equipment & Calibration Module

const defaultEquipment = [
  {
    id: "EQ-001",
    name: "Compression Testing Machine",
    category: "Concrete",
    laboratory: "Concrete Lab",
    status: "Active",
    calibrationStatus: "Valid",
    nextDue: "2027-06-12",
    lastCalibration: "2026-06-12",
    frequency: "12 Months",
    agency: "ABC NABL Lab",
    certificateNo: "CAL-2026-001",
    model: "CTM3200",
    serialNo: "CTM3414",
    location: "Concrete Lab - Room 1",
    responsiblePerson: "Mr. Rahul Patel",
    manufacturer: "AIMIL",
    supplier: "Aimil Ltd",
    purchaseDate: "2024-03-15",
    installationDate: "2024-03-20",
    measurementRange: "0 - 2000 kN",
    leastCount: "1 kN",
    accuracy: "±1%",
    powerSupply: "220 V, 50 Hz",
    description: "Used for compression & flexural strength testing of concrete specimens.",
    remarks: "Calibrated successfully. No errors found.",
  },
  {
    id: "EQ-002",
    name: "Universal Testing Machine",
    category: "Steel",
    laboratory: "Steel Lab",
    status: "Active",
    calibrationStatus: "Due Soon",
    nextDue: "2026-07-28",
    lastCalibration: "2025-07-28",
    frequency: "12 Months",
    agency: "XYZ NABL Lab",
    certificateNo: "CAL-2025-178",
    model: "UTM1000",
    serialNo: "UTM9982",
    location: "Steel Lab - Room 2",
    responsiblePerson: "Mr. Rahul Patel",
    manufacturer: "FIE",
    supplier: "FIE India",
    purchaseDate: "2023-05-10",
    installationDate: "2023-05-15",
    measurementRange: "0 - 1000 kN",
    leastCount: "0.1 kN",
    accuracy: "±0.5%",
    powerSupply: "415 V, 50 Hz",
    description: "Used for tensile, compression, and bend testing of steel rebars.",
    remarks: "Needs calibration booking soon.",
  },
  {
    id: "EQ-003",
    name: "Oven 105°C",
    category: "General",
    laboratory: "Soil Lab",
    status: "Active",
    calibrationStatus: "Due Soon",
    nextDue: "2026-07-05",
    lastCalibration: "2025-07-05",
    frequency: "12 Months",
    agency: "ABC NABL Lab",
    certificateNo: "CAL-2025-096",
    model: "OV-300",
    serialNo: "OV-8821",
    location: "Soil Lab - Oven Room",
    responsiblePerson: "Mrs. Sneha Shah",
    manufacturer: "Tempo",
    supplier: "Tempo Instruments",
    purchaseDate: "2022-08-12",
    installationDate: "2022-08-14",
    measurementRange: "Ambient to 300°C",
    leastCount: "0.1°C",
    accuracy: "±1°C",
    powerSupply: "230 V, 50 Hz",
    description: "Laboratory hot air oven for moisture content determination.",
    remarks: "Thermostat calibrated.",
  },
  {
    id: "EQ-004",
    name: "Balance 0.01g",
    category: "General",
    laboratory: "Soil Lab",
    status: "Active",
    calibrationStatus: "Overdue",
    nextDue: "2026-05-16",
    lastCalibration: "2025-05-16",
    frequency: "12 Months",
    agency: "XYZ NABL Lab",
    certificateNo: "CAL-2025-012",
    model: "Sartorius Entris",
    serialNo: "SAR-1109",
    location: "Soil Lab - Balance Room",
    responsiblePerson: "Mrs. Sneha Shah",
    manufacturer: "Sartorius",
    supplier: "Sartorius India",
    purchaseDate: "2023-11-20",
    installationDate: "2023-11-21",
    measurementRange: "0 - 220 g",
    leastCount: "0.01 g",
    accuracy: "±0.02 g",
    powerSupply: "12V DC Adapter",
    description: "High precision weighing balance for soil specimens.",
    remarks: "Out of calibration window. Needs recalibration immediately.",
  },
  {
    id: "EQ-005",
    name: "Triaxial Testing Machine",
    category: "Soil",
    laboratory: "Soil Lab",
    status: "Active",
    calibrationStatus: "Valid",
    nextDue: "2026-12-20",
    lastCalibration: "2025-12-20",
    frequency: "12 Months",
    agency: "XYZ NABL Lab",
    certificateNo: "CAL-2025-334",
    model: "TRX-50",
    serialNo: "TRX-4491",
    location: "Soil Lab - Room 3",
    responsiblePerson: "Mrs. Sneha Shah",
    manufacturer: "HEICO",
    supplier: "HEICO India",
    purchaseDate: "2024-01-18",
    installationDate: "2024-01-22",
    measurementRange: "0 - 50 kN",
    leastCount: "0.01 kN",
    accuracy: "±1%",
    powerSupply: "220 V, 50 Hz",
    description: "Determines shear strength parameters of soil.",
    remarks: "Next calibration booked.",
  },
  {
    id: "EQ-006",
    name: "Proving Ring 50kN",
    category: "General",
    laboratory: "Concrete Lab",
    status: "Active",
    calibrationStatus: "Due Soon",
    nextDue: "2026-07-18",
    lastCalibration: "2025-07-18",
    frequency: "12 Months",
    agency: "ABC NABL Lab",
    certificateNo: "CAL-2025-199",
    model: "PR-50",
    serialNo: "PR-6671",
    location: "Concrete Lab - Store",
    responsiblePerson: "Mr. Rahul Patel",
    manufacturer: "AIMIL",
    supplier: "Aimil Ltd",
    purchaseDate: "2022-04-10",
    installationDate: "2022-04-10",
    measurementRange: "0 - 50 kN",
    leastCount: "0.1 Div",
    accuracy: "±0.5%",
    powerSupply: "N/A (Mechanical)",
    description: "Load measuring ring used for soil and asphalt testing.",
    remarks: "Good condition.",
  },
  {
    id: "EQ-007",
    name: "Slump Cone",
    category: "General",
    laboratory: "Concrete Lab",
    status: "Active",
    calibrationStatus: "Valid",
    nextDue: "2026-08-11",
    lastCalibration: "2025-08-11",
    frequency: "12 Months",
    agency: "ABC NABL Lab",
    certificateNo: "CAL-2025-288",
    model: "SC-300",
    serialNo: "SC-9981",
    location: "Concrete Lab - Yard",
    responsiblePerson: "Mr. Rahul Patel",
    manufacturer: "Local",
    supplier: "Civil Tech Suppliers",
    purchaseDate: "2025-01-05",
    installationDate: "2025-01-05",
    measurementRange: "0 - 30 cm",
    leastCount: "1 mm",
    accuracy: "±1 mm",
    powerSupply: "N/A (Mechanical)",
    description: "Used to determine consistency and workability of fresh concrete.",
    remarks: "Dimensions verified.",
  },
  {
    id: "EQ-008",
    name: "Digital Vernier Caliper",
    category: "General",
    laboratory: "QC Lab",
    status: "Active",
    calibrationStatus: "Valid",
    nextDue: "2026-09-18",
    lastCalibration: "2025-09-18",
    frequency: "12 Months",
    agency: "ABC NABL Lab",
    certificateNo: "CAL-2025-339",
    model: "Mitutoyo 150",
    serialNo: "MIT-7712",
    location: "QC Lab - Desk 1",
    responsiblePerson: "Mr. Amit Sharma",
    manufacturer: "Mitutoyo",
    supplier: "Mitutoyo Japan",
    purchaseDate: "2024-05-12",
    installationDate: "2024-05-12",
    measurementRange: "0 - 150 mm",
    leastCount: "0.01 mm",
    accuracy: "±0.02 mm",
    powerSupply: "SR44 Battery",
    description: "Digital caliper for high accuracy dimension checks.",
    remarks: "Zero error within bounds.",
  },
  {
    id: "EQ-009",
    name: "Moisture Oven",
    category: "General",
    laboratory: "Soil Lab",
    status: "Active",
    calibrationStatus: "Overdue",
    nextDue: "2026-05-23",
    lastCalibration: "2025-05-23",
    frequency: "12 Months",
    agency: "XYZ NABL Lab",
    certificateNo: "CAL-2025-081",
    model: "MO-100",
    serialNo: "MO-3301",
    location: "Soil Lab - Oven Room",
    responsiblePerson: "Mrs. Sneha Shah",
    manufacturer: "Tempo",
    supplier: "Tempo Instruments",
    purchaseDate: "2021-03-20",
    installationDate: "2021-03-20",
    measurementRange: "Ambient to 200°C",
    leastCount: "1°C",
    accuracy: "±2°C",
    powerSupply: "230 V, 50 Hz",
    description: "Oven for soil moisture testing.",
    remarks: "Calibration expired. Tagged Out of Service.",
  },
  {
    id: "EQ-012",
    name: "Length Comparator",
    category: "General",
    laboratory: "QC Lab",
    status: "Active",
    calibrationStatus: "Overdue",
    nextDue: "2026-06-08",
    lastCalibration: "2025-06-08",
    frequency: "12 Months",
    agency: "ABC NABL Lab",
    certificateNo: "CAL-2025-054",
    model: "LC-10",
    serialNo: "LC-4481",
    location: "QC Lab - Desk 2",
    responsiblePerson: "Mr. Amit Sharma",
    manufacturer: "HEICO",
    supplier: "HEICO India",
    purchaseDate: "2023-02-14",
    installationDate: "2023-02-15",
    measurementRange: "0 - 10 mm",
    leastCount: "0.001 mm",
    accuracy: "±0.002 mm",
    powerSupply: "N/A",
    description: "Determines changes in length of cement specimens.",
    remarks: "Requires urgent inspection.",
  }
];

const defaultLocations = [
  { id: 1, name: "Concrete Lab - Room 1", laboratory: "Concrete Lab", building: "Main Building", floor: "Ground Floor", roomNo: "101", totalEquipment: 4 },
  { id: 2, name: "Soil Lab - Soil Room", laboratory: "Soil Lab", building: "Soil building", floor: "Ground Floor", roomNo: "102", totalEquipment: 52 },
  { id: 3, name: "Concrete Lab - Store", laboratory: "Concrete Lab", building: "Main Building", floor: "First Floor", roomNo: "201", totalEquipment: 35 },
  { id: 4, name: "Steel Lab - Room 2", laboratory: "Steel Lab", building: "Main Building", floor: "First Floor", roomNo: "202", totalEquipment: 28 },
  { id: 5, name: "QC Lab - Room 2", laboratory: "QC Lab", building: "General Building", floor: "Ground Floor", roomNo: "103", totalEquipment: 15 }
];

const defaultMaintenance = [
  { id: 1, date: "2026-06-12", eqId: "EQ-001", eqName: "Compression Testing Machine", type: "Preventive", engineer: "ABC Service", cost: 4200, status: "Completed" },
  { id: 2, date: "2026-03-05", eqId: "EQ-002", eqName: "Universal Testing Machine", type: "Repair", engineer: "Internal", cost: 800, status: "Completed" },
  { id: 3, date: "2026-01-20", eqId: "EQ-003", eqName: "Oven 105°C", type: "Preventive", engineer: "ABC Service", cost: 1500, status: "Completed" },
  { id: 4, date: "2026-05-18", eqId: "EQ-004", eqName: "Balance 0.01g", type: "Repair", engineer: "Internal", cost: 650, status: "Completed" }
];

const defaultCalibrationRecords = [
  {
    id: "REC-001",
    eqId: "EQ-001",
    eqName: "Compression Testing Machine",
    calibrationDate: "2026-06-12",
    nextDue: "2027-06-12",
    frequency: "12 Months",
    agency: "ABC NABL Lab",
    certificateNo: "CAL-2026-001",
    cost: 15000,
    performedBy: "Ketan Shah",
    status: "Pass",
    remarks: "Fully calibrated in all ranges (500kN, 1000kN, 2000kN). Error well within ±1% limit."
  },
  {
    id: "REC-002",
    eqId: "EQ-002",
    eqName: "Universal Testing Machine",
    calibrationDate: "2025-07-28",
    nextDue: "2026-07-28",
    frequency: "12 Months",
    agency: "XYZ NABL Lab",
    certificateNo: "CAL-2025-178",
    cost: 25000,
    performedBy: "Anil Sharma",
    status: "Pass",
    remarks: "Extensometer and load cell calibrated. Accuracy verified."
  },
  {
    id: "REC-003",
    eqId: "EQ-003",
    eqName: "Oven 105°C",
    calibrationDate: "2025-07-05",
    nextDue: "2026-07-05",
    frequency: "12 Months",
    agency: "ABC NABL Lab",
    certificateNo: "CAL-2025-096",
    cost: 4500,
    performedBy: "Rohan Das",
    status: "Pass",
    remarks: "9-point temperature mapping completed. Uniformity is satisfactory."
  },
  {
    id: "REC-004",
    eqId: "EQ-004",
    eqName: "Balance 0.01g",
    calibrationDate: "2025-05-16",
    nextDue: "2026-05-16",
    frequency: "12 Months",
    agency: "XYZ NABL Lab",
    certificateNo: "CAL-2025-012",
    cost: 3200,
    performedBy: "Ketan Shah",
    status: "Pass",
    remarks: "Linearity and repeatability checked. Standard weights utilized."
  }
];

// Initialize global arrays on window object to survive page navigations
if (!window.__mock_equipment_db) {
  window.__mock_equipment_db = {
    equipment: defaultEquipment,
    locations: defaultLocations,
    maintenance: defaultMaintenance,
    calibrations: defaultCalibrationRecords,
  };
}

export const mockEquipmentDb = {
  getEquipment: () => window.__mock_equipment_db.equipment,
  addEquipment: (eq) => {
    window.__mock_equipment_db.equipment = [eq, ...window.__mock_equipment_db.equipment];
    return window.__mock_equipment_db.equipment;
  },
  updateEquipment: (id, updatedFields) => {
    window.__mock_equipment_db.equipment = window.__mock_equipment_db.equipment.map(eq => 
      eq.id === id ? { ...eq, ...updatedFields } : eq
    );
    return window.__mock_equipment_db.equipment;
  },
  deleteEquipment: (id) => {
    window.__mock_equipment_db.equipment = window.__mock_equipment_db.equipment.filter(eq => eq.id !== id);
    return window.__mock_equipment_db.equipment;
  },
  
  getLocations: () => window.__mock_equipment_db.locations,
  addLocation: (loc) => {
    window.__mock_equipment_db.locations = [...window.__mock_equipment_db.locations, { id: Date.now(), ...loc }];
    return window.__mock_equipment_db.locations;
  },
  
  getMaintenance: () => window.__mock_equipment_db.maintenance,
  addMaintenance: (maint) => {
    window.__mock_equipment_db.maintenance = [{ id: Date.now(), ...maint }, ...window.__mock_equipment_db.maintenance];
    return window.__mock_equipment_db.maintenance;
  },
  
  getCalibrations: () => window.__mock_equipment_db.calibrations,
  addCalibration: (cal) => {
    window.__mock_equipment_db.calibrations = [{ id: `REC-${Date.now()}`, ...cal }, ...window.__mock_equipment_db.calibrations];
    
    // Also update the calibration status and dates in the corresponding equipment
    mockEquipmentDb.updateEquipment(cal.eqId, {
      lastCalibration: cal.calibrationDate,
      nextDue: cal.nextDue,
      certificateNo: cal.certificateNo,
      agency: cal.agency,
      calibrationStatus: mockEquipmentDb.calculateCalibrationStatus(cal.nextDue)
    });
    
    return window.__mock_equipment_db.calibrations;
  },
  
  calculateCalibrationStatus: (nextDueStr) => {
    const today = new Date();
    const nextDue = new Date(nextDueStr);
    const diffTime = nextDue - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return "Overdue";
    } else if (diffDays <= 7) {
      return "Due within 7 Days";
    } else if (diffDays <= 30) {
      return "Due Soon";
    } else {
      return "Valid";
    }
  }
};
