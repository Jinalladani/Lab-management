-- =========================================================
-- ADD MORE SAMPLE TYPES FOR EACH CATEGORY
-- =========================================================

BEGIN;

-- Add more material types for existing categories
INSERT INTO material_types (lab_id, material_category_id, type_name, description)
SELECT 1, mc.material_category_id, 'C.C Cylinder', 'Concrete cylinder material type'
FROM material_categories mc
WHERE mc.lab_id = 1 AND mc.category_name = 'Concrete'
ON CONFLICT (lab_id, material_category_id, type_name) DO NOTHING;

INSERT INTO material_types (lab_id, material_category_id, type_name, description)
SELECT 1, mc.material_category_id, 'C.C Beam', 'Concrete beam material type'
FROM material_categories mc
WHERE mc.lab_id = 1 AND mc.category_name = 'Concrete'
ON CONFLICT (lab_id, material_category_id, type_name) DO NOTHING;

INSERT INTO material_types (lab_id, material_category_id, type_name, description)
SELECT 1, mc.material_category_id, 'C.C Slab', 'Concrete slab material type'
FROM material_categories mc
WHERE mc.lab_id = 1 AND mc.category_name = 'Concrete'
ON CONFLICT (lab_id, material_category_id, type_name) DO NOTHING;

-- More cement types
INSERT INTO material_types (lab_id, material_category_id, type_name, description)
SELECT 1, mc.material_category_id, 'PPC Cement', 'Portland Pozzolana Cement'
FROM material_categories mc
WHERE mc.lab_id = 1 AND mc.category_name = 'Cement'
ON CONFLICT (lab_id, material_category_id, type_name) DO NOTHING;

INSERT INTO material_types (lab_id, material_category_id, type_name, description)
SELECT 1, mc.material_category_id, 'OPC Cement', 'Ordinary Portland Cement'
FROM material_categories mc
WHERE mc.lab_id = 1 AND mc.category_name = 'Cement'
ON CONFLICT (lab_id, material_category_id, type_name) DO NOTHING;

-- More soil types
INSERT INTO material_types (lab_id, material_category_id, type_name, description)
SELECT 1, mc.material_category_id, 'Clay Soil', 'Clay soil material type'
FROM material_categories mc
WHERE mc.lab_id = 1 AND mc.category_name = 'Soil'
ON CONFLICT (lab_id, material_category_id, type_name) DO NOTHING;

INSERT INTO material_types (lab_id, material_category_id, type_name, description)
SELECT 1, mc.material_category_id, 'Black Cotton Soil', 'Black cotton soil material type'
FROM material_categories mc
WHERE mc.lab_id = 1 AND mc.category_name = 'Soil'
ON CONFLICT (lab_id, material_category_id, type_name) DO NOTHING;

INSERT INTO material_types (lab_id, material_category_id, type_name, description)
SELECT 1, mc.material_category_id, 'Murum Soil', 'Murum soil material type'
FROM material_categories mc
WHERE mc.lab_id = 1 AND mc.category_name = 'Soil'
ON CONFLICT (lab_id, material_category_id, type_name) DO NOTHING;

-- Steel types
INSERT INTO material_types (lab_id, material_category_id, type_name, description)
SELECT 1, mc.material_category_id, 'TMT Bar', 'TMT steel bar material type'
FROM material_categories mc
WHERE mc.lab_id = 1 AND mc.category_name = 'Steel'
ON CONFLICT (lab_id, material_category_id, type_name) DO NOTHING;

INSERT INTO material_types (lab_id, material_category_id, type_name, description)
SELECT 1, mc.material_category_id, 'HYSD Bar', 'HYSD steel bar material type'
FROM material_categories mc
WHERE mc.lab_id = 1 AND mc.category_name = 'Steel'
ON CONFLICT (lab_id, material_category_id, type_name) DO NOTHING;

INSERT INTO material_types (lab_id, material_category_id, type_name, description)
SELECT 1, mc.material_category_id, 'Structural Steel', 'Structural steel material type'
FROM material_categories mc
WHERE mc.lab_id = 1 AND mc.category_name = 'Steel'
ON CONFLICT (lab_id, material_category_id, type_name) DO NOTHING;

-- Aggregate types
INSERT INTO material_types (lab_id, material_category_id, type_name, description)
SELECT 1, mc.material_category_id, 'Fine Aggregate', 'Fine aggregate (sand) material type'
FROM material_categories mc
WHERE mc.lab_id = 1 AND mc.category_name = 'Aggregate'
ON CONFLICT (lab_id, material_category_id, type_name) DO NOTHING;

INSERT INTO material_types (lab_id, material_category_id, type_name, description)
SELECT 1, mc.material_category_id, 'Coarse Aggregate', 'Coarse aggregate material type'
FROM material_categories mc
WHERE mc.lab_id = 1 AND mc.category_name = 'Aggregate'
ON CONFLICT (lab_id, material_category_id, type_name) DO NOTHING;

INSERT INTO material_types (lab_id, material_category_id, type_name, description)
SELECT 1, mc.material_category_id, 'Mixed Aggregate', 'Mixed aggregate material type'
FROM material_categories mc
WHERE mc.lab_id = 1 AND mc.category_name = 'Aggregate'
ON CONFLICT (lab_id, material_category_id, type_name) DO NOTHING;

-- Bitumen types
INSERT INTO material_types (lab_id, material_category_id, type_name, description)
SELECT 1, mc.material_category_id, 'VG 30', 'VG 30 bitumen grade'
FROM material_categories mc
WHERE mc.lab_id = 1 AND mc.category_name = 'Bitumen'
ON CONFLICT (lab_id, material_category_id, type_name) DO NOTHING;

INSERT INTO material_types (lab_id, material_category_id, type_name, description)
SELECT 1, mc.material_category_id, 'VG 40', 'VG 40 bitumen grade'
FROM material_categories mc
WHERE mc.lab_id = 1 AND mc.category_name = 'Bitumen'
ON CONFLICT (lab_id, material_category_id, type_name) DO NOTHING;

-- Water types
INSERT INTO material_types (lab_id, material_category_id, type_name, description)
SELECT 1, mc.material_category_id, 'Tap Water', 'Tap water sample type'
FROM material_categories mc
WHERE mc.lab_id = 1 AND mc.category_name = 'Water'
ON CONFLICT (lab_id, material_category_id, type_name) DO NOTHING;

INSERT INTO material_types (lab_id, material_category_id, type_name, description)
SELECT 1, mc.material_category_id, 'Ground Water', 'Ground water sample type'
FROM material_categories mc
WHERE mc.lab_id = 1 AND mc.category_name = 'Water'
ON CONFLICT (lab_id, material_category_id, type_name) DO NOTHING;

-- Rock types
INSERT INTO material_types (lab_id, material_category_id, type_name, description)
SELECT 1, mc.material_category_id, 'Gneiss', 'Gneiss rock material type'
FROM material_categories mc
WHERE mc.lab_id = 1 AND mc.category_name = 'Rock'
ON CONFLICT (lab_id, material_category_id, type_name) DO NOTHING;

INSERT INTO material_types (lab_id, material_category_id, type_name, description)
SELECT 1, mc.material_category_id, 'Basalt', 'Basalt rock material type'
FROM material_categories mc
WHERE mc.lab_id = 1 AND mc.category_name = 'Rock'
ON CONFLICT (lab_id, material_category_id, type_name) DO NOTHING;

-- Add corresponding sample types
INSERT INTO sample_types (lab_id, material_type_id, sample_type_name, description)
SELECT 1, mt.material_type_id, mt.type_name, mt.description || ' sample'
FROM material_types mt
WHERE mt.lab_id = 1 
  AND mt.type_name NOT IN (
    SELECT sample_type_name FROM sample_types WHERE lab_id = 1
  )
ON CONFLICT (lab_id, sample_type_name) DO NOTHING;

-- Add more sample grades
INSERT INTO sample_grades (lab_id, sample_type_id, grade_name, grade_description)
SELECT 1, st.sample_type_id, 'M - 15', 'Concrete grade M-15'
FROM sample_types st
WHERE st.lab_id = 1 AND st.sample_type_name IN ('C.C Cube', 'C.C Cylinder', 'C.C Beam', 'C.C Slab')
ON CONFLICT (lab_id, sample_type_id, grade_name) DO NOTHING;

INSERT INTO sample_grades (lab_id, sample_type_id, grade_name, grade_description)
SELECT 1, st.sample_type_id, 'M - 20', 'Concrete grade M-20'
FROM sample_types st
WHERE st.lab_id = 1 AND st.sample_type_name IN ('C.C Cube', 'C.C Cylinder', 'C.C Beam', 'C.C Slab')
ON CONFLICT (lab_id, sample_type_id, grade_name) DO NOTHING;

INSERT INTO sample_grades (lab_id, sample_type_id, grade_name, grade_description)
SELECT 1, st.sample_type_id, 'M - 30', 'Concrete grade M-30'
FROM sample_types st
WHERE st.lab_id = 1 AND st.sample_type_name IN ('C.C Cube', 'C.C Cylinder', 'C.C Beam', 'C.C Slab')
ON CONFLICT (lab_id, sample_type_id, grade_name) DO NOTHING;

INSERT INTO sample_grades (lab_id, sample_type_id, grade_name, grade_description)
SELECT 1, st.sample_type_id, 'Fe - 415', 'Steel grade Fe-415'
FROM sample_types st
WHERE st.lab_id = 1 AND st.sample_type_name IN ('TMT Bar', 'HYSD Bar')
ON CONFLICT (lab_id, sample_type_id, grade_name) DO NOTHING;

INSERT INTO sample_grades (lab_id, sample_type_id, grade_name, grade_description)
SELECT 1, st.sample_type_id, 'Fe - 500', 'Steel grade Fe-500'
FROM sample_types st
WHERE st.lab_id = 1 AND st.sample_type_name IN ('TMT Bar', 'HYSD Bar')
ON CONFLICT (lab_id, sample_type_id, grade_name) DO NOTHING;

INSERT INTO sample_grades (lab_id, sample_type_id, grade_name, grade_description)
SELECT 1, st.sample_type_id, 'Fe - 550', 'Steel grade Fe-550'
FROM sample_types st
WHERE st.lab_id = 1 AND st.sample_type_name IN ('TMT Bar', 'HYSD Bar')
ON CONFLICT (lab_id, sample_type_id, grade_name) DO NOTHING;

COMMIT;

SELECT 'Additional sample types and grades added successfully!' AS status;
