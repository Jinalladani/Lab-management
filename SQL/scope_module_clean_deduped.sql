-- =========================================================
-- Lab Management SaaS - Scope Module
-- Source: uploaded GOMA scope PDF
-- File: Scope-125313-TC-12603-1767676691.pdf
--
-- This SQL:
-- 1) creates 3 tables
--    - scope_groups
--    - scope_materials
--    - scope_tests
-- 2) inserts deduplicated data from the PDF
-- 3) avoids duplicate groups/materials/tests
--
-- Seed owner:
--   lab email  : goma.lab@example.com
--   created by : jinal@goma.com
-- =========================================================

BEGIN;

-- =========================================================
-- TABLE 1: scope_groups
-- =========================================================
CREATE TABLE IF NOT EXISTS scope_groups (
    group_id BIGSERIAL PRIMARY KEY,
    lab_id BIGINT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    testing_scope_type VARCHAR(30) NOT NULL
        CHECK (testing_scope_type IN ('permanent_testing', 'site_testing')),
    group_name VARCHAR(255) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (lab_id, testing_scope_type, group_name)
);

-- =========================================================
-- TABLE 2: scope_materials
-- =========================================================
CREATE TABLE IF NOT EXISTS scope_materials (
    material_id BIGSERIAL PRIMARY KEY,
    lab_id BIGINT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    group_id BIGINT NOT NULL REFERENCES scope_groups(group_id) ON DELETE CASCADE,
    material_name VARCHAR(255) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (group_id, material_name)
);

-- =========================================================
-- TABLE 3: scope_tests
-- =========================================================
CREATE TABLE IF NOT EXISTS scope_tests (
    scope_test_id BIGSERIAL PRIMARY KEY,
    lab_id BIGINT NOT NULL REFERENCES labs(lab_id) ON DELETE CASCADE,
    group_id BIGINT NOT NULL REFERENCES scope_groups(group_id) ON DELETE CASCADE,
    material_id BIGINT NOT NULL REFERENCES scope_materials(material_id) ON DELETE CASCADE,
    test_name TEXT NOT NULL,
    test_method TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Extra protection against duplicates
CREATE UNIQUE INDEX IF NOT EXISTS uq_scope_tests_unique
ON scope_tests (lab_id, group_id, material_id, test_name, test_method);

CREATE INDEX IF NOT EXISTS idx_scope_groups_lab_id ON scope_groups(lab_id);
CREATE INDEX IF NOT EXISTS idx_scope_groups_type ON scope_groups(testing_scope_type);
CREATE INDEX IF NOT EXISTS idx_scope_materials_lab_id ON scope_materials(lab_id);
CREATE INDEX IF NOT EXISTS idx_scope_materials_group_id ON scope_materials(group_id);
CREATE INDEX IF NOT EXISTS idx_scope_tests_lab_id ON scope_tests(lab_id);
CREATE INDEX IF NOT EXISTS idx_scope_tests_group_id ON scope_tests(group_id);
CREATE INDEX IF NOT EXISTS idx_scope_tests_material_id ON scope_tests(material_id);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_scope_groups_updated_at ON scope_groups;
CREATE TRIGGER trg_scope_groups_updated_at
BEFORE UPDATE ON scope_groups
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_scope_materials_updated_at ON scope_materials;
CREATE TRIGGER trg_scope_materials_updated_at
BEFORE UPDATE ON scope_materials
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_scope_tests_updated_at ON scope_tests;
CREATE TRIGGER trg_scope_tests_updated_at
BEFORE UPDATE ON scope_tests
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- RAW DEDUPED DATA
-- =========================================================
DROP TABLE IF EXISTS temp_scope_groups;
CREATE TEMP TABLE temp_scope_groups (
    testing_scope_type VARCHAR(30),
    group_name TEXT,
    sort_order INTEGER
);

INSERT INTO temp_scope_groups (testing_scope_type, group_name, sort_order)
VALUES
    ('permanent_testing', 'CHEMICAL- BUILDING MATERIAL', 1),
    ('permanent_testing', 'CHEMICAL- WATER', 5),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 22),
    ('permanent_testing', 'MECHANICAL- MECHANICAL PROPERTIES OF METALS', 118),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 129),
    ('permanent_testing', 'NON-DESTRUCTIVE- BUILDING MATERIALS - REINFORCED CONCRETE STRUCTURES', 161),
    ('site_testing', 'MECHANICAL- SOIL AND ROCKS', 1),
    ('site_testing', 'NON-DESTRUCTIVE- BUILDING MATERIALS - REINFORCED CONCRETE STRUCTURES', 14)
;

DROP TABLE IF EXISTS temp_scope_materials;
CREATE TEMP TABLE temp_scope_materials (
    testing_scope_type VARCHAR(30),
    group_name TEXT,
    material_name TEXT,
    sort_order INTEGER
);

INSERT INTO temp_scope_materials (testing_scope_type, group_name, material_name, sort_order)
VALUES
    ('permanent_testing', 'CHEMICAL- BUILDING MATERIAL', 'Admixture', 1),
    ('permanent_testing', 'CHEMICAL- WATER', 'Drinking Water', 5),
    ('permanent_testing', 'CHEMICAL- WATER', 'Water for construction purpose', 13),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Autoclave aerated blocks', 22),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Bitumen (Industrial/Paving)', 28),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Bitumen (Modified/Industrial/Paving)', 30),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Bituminous Mix & Bituminous Core', 34),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Brick (Common Burnt Clay Bricks, Heavy Duty Burnt Clay Brick, Pulverized Fuel Ash-Lime Brick)', 37),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Brick - Heavy Duty Burnt Clay Brick', 40),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Brick - Pulverized Fuel Ash-Lime Brick (Modular & Non-Modular)', 43),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Cement (OPC & PPC)', 46),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Coarse Aggregate (Crushed Stone, Ballast, Gravel)', 53),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Coarse Aggregate (Crushed Stone, Ballast, Gravel, WMM (Wet Mix Macadam), GSB (Granular Sub Base))', 62),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Common Burnt Clay Bricks (Modular & Non-Modular)', 67),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Fine Aggregate (Crusher Stone Sand, Natural Sand, Mixed Sand, Manufactured Sand, Crushed Gravel Sand)', 70),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Fresh Concrete', 78),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Hardened Concrete', 79),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Hollow & Solid Concrete Blocks', 83),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Paver Block', 89),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Tiles - Cement Concrete Flooring Tile', 99),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Tiles - Ceramic Tile & Vitrified Tile', 107),
    ('permanent_testing', 'MECHANICAL- MECHANICAL PROPERTIES OF METALS', 'Hexagonal Wire Mesh Gabions', 118),
    ('permanent_testing', 'MECHANICAL- MECHANICAL PROPERTIES OF METALS', 'Reinforcement couplers', 121),
    ('permanent_testing', 'MECHANICAL- MECHANICAL PROPERTIES OF METALS', 'Steel HSD Bar/TMT Bar', 123),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Rock', 129),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 134),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil, WMM (Wet Mix Macadam), GSB (Granular Sub Base )', 157),
    ('permanent_testing', 'NON-DESTRUCTIVE- BUILDING MATERIALS - REINFORCED CONCRETE STRUCTURES', 'Concrete Element (Core)', 161),
    ('site_testing', 'MECHANICAL- SOIL AND ROCKS', 'Pile', 1),
    ('site_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 4),
    ('site_testing', 'NON-DESTRUCTIVE- BUILDING MATERIALS - REINFORCED CONCRETE STRUCTURES', 'Any Reinforced Concrete surface', 14),
    ('site_testing', 'NON-DESTRUCTIVE- BUILDING MATERIALS - REINFORCED CONCRETE STRUCTURES', 'Concrete Element (Core)', 15),
    ('site_testing', 'NON-DESTRUCTIVE- BUILDING MATERIALS - REINFORCED CONCRETE STRUCTURES', 'RCC Bridges, Slab', 16),
    ('site_testing', 'NON-DESTRUCTIVE- BUILDING MATERIALS - REINFORCED CONCRETE STRUCTURES', 'Reinforced Concrete Pile', 17),
    ('site_testing', 'NON-DESTRUCTIVE- BUILDING MATERIALS - REINFORCED CONCRETE STRUCTURES', 'Reinforced concrete pile/ Deep foundations', 18),
    ('site_testing', 'NON-DESTRUCTIVE- BUILDING MATERIALS - REINFORCED CONCRETE STRUCTURES', 'Reinforced Concrete Structure', 19)
;

DROP TABLE IF EXISTS temp_scope_tests;
CREATE TEMP TABLE temp_scope_tests (
    testing_scope_type VARCHAR(30),
    group_name TEXT,
    material_name TEXT,
    test_name TEXT,
    test_method TEXT,
    sort_order INTEGER
);

INSERT INTO temp_scope_tests (
    testing_scope_type,
    group_name,
    material_name,
    test_name,
    test_method,
    sort_order
)
VALUES
    ('permanent_testing', 'CHEMICAL- BUILDING MATERIAL', 'Admixture', 'Ash Content', 'IS 9103', 1),
    ('permanent_testing', 'CHEMICAL- BUILDING MATERIAL', 'Admixture', 'Dry Material Content', 'IS 9103', 2),
    ('permanent_testing', 'CHEMICAL- BUILDING MATERIAL', 'Admixture', 'pH', 'IS 9103', 3),
    ('permanent_testing', 'CHEMICAL- BUILDING MATERIAL', 'Admixture', 'Relative Density', 'IS 9103', 4),
    ('permanent_testing', 'CHEMICAL- WATER', 'Drinking Water', 'Calcium', 'IS 3025 (Part-40)', 5),
    ('permanent_testing', 'CHEMICAL- WATER', 'Drinking Water', 'Chloride', 'IS 3025 (Part-32)', 6),
    ('permanent_testing', 'CHEMICAL- WATER', 'Drinking Water', 'Magnesium', 'IS 3025 (Part 46)', 7),
    ('permanent_testing', 'CHEMICAL- WATER', 'Drinking Water', 'pH', 'IS 3025 (Part-11)', 8),
    ('permanent_testing', 'CHEMICAL- WATER', 'Drinking Water', 'Sulphate', 'IS 3025 (Part-24/Sec-1)', 9),
    ('permanent_testing', 'CHEMICAL- WATER', 'Drinking Water', 'Total alkalinity', 'IS 3025 (Part-23)', 10),
    ('permanent_testing', 'CHEMICAL- WATER', 'Drinking Water', 'Total Dissolved Solid', 'IS 3025 (Part-16)', 11),
    ('permanent_testing', 'CHEMICAL- WATER', 'Drinking Water', 'Total Hardness', 'IS 3025 (Part-21)', 12),
    ('permanent_testing', 'CHEMICAL- WATER', 'Water for construction purpose', 'Acidity (Equivalent to vol. of 0.02N NaOH required to neutralize 100 ml sample of water)', 'IS 3025 (Part-22)', 13),
    ('permanent_testing', 'CHEMICAL- WATER', 'Water for construction purpose', 'Alkalinity (Equivalent to vol. of 0.02N H2SO4 required to neutralise 100 ml sample of water)', 'IS 3025 (Part-23)', 14),
    ('permanent_testing', 'CHEMICAL- WATER', 'Water for construction purpose', 'Chloride', 'IS 3025 (Part-32)', 15),
    ('permanent_testing', 'CHEMICAL- WATER', 'Water for construction purpose', 'Inorganic Solid', 'IS 3025 (Part-18)', 16),
    ('permanent_testing', 'CHEMICAL- WATER', 'Water for construction purpose', 'Organic Solid', 'IS 3025 (Part-18)', 17),
    ('permanent_testing', 'CHEMICAL- WATER', 'Water for construction purpose', 'pH', 'IS 3025 (Part-11)', 18),
    ('permanent_testing', 'CHEMICAL- WATER', 'Water for construction purpose', 'Sulphate', 'IS 3025 (Part-24/Sec-1)', 19),
    ('permanent_testing', 'CHEMICAL- WATER', 'Water for construction purpose', 'Total Dissolved Solid', 'IS 3025 (Part-16)', 20),
    ('permanent_testing', 'CHEMICAL- WATER', 'Water for construction purpose', 'Total Suspended Solids', 'IS 3025 (Part-17)', 21),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Autoclave aerated blocks', 'Bulk Density', 'IS 6441 (Part-1)', 22),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Autoclave aerated blocks', 'Compressive strength', 'IS 6441 (Part-5)', 23),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Autoclave aerated blocks', 'Dimension (Height)', 'IS 2185 (Part-3)', 24),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Autoclave aerated blocks', 'Dimension (Length)', 'IS 2185 (Part-3)', 25),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Autoclave aerated blocks', 'Dimension (Width)', 'IS 2185 (Part-3)', 26),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Autoclave aerated blocks', 'Moisture Content', 'IS 6441 (Part-1)', 27),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Bitumen (Industrial/Paving)', 'Absolute Viscosity at 60°C', 'IS 1206 (Part-2)', 28),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Bitumen (Industrial/Paving)', 'Ductility', 'IS 1208', 29),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Bitumen (Modified/Industrial/Paving)', 'Kinematic Viscosity at 135°C', 'IS 1206 (Part-3)', 30),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Bitumen (Modified/Industrial/Paving)', 'Penetration @ 25°C', 'IS 1203', 31),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Bitumen (Modified/Industrial/Paving)', 'Softening Point', 'IS 1205', 32),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Bitumen (Modified/Industrial/Paving)', 'Specific Gravity', 'IS 1202', 33),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Bituminous Mix & Bituminous Core', 'Binder Content', 'IRC SP 11', 34),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Bituminous Mix & Bituminous Core', 'Flow Test', 'ASTM D 6927', 35),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Bituminous Mix & Bituminous Core', 'Marshal Stability', 'ASTM D 6927', 36),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Brick (Common Burnt Clay Bricks, Heavy Duty Burnt Clay Brick, Pulverized Fuel Ash-Lime Brick)', 'Compressive Strength', 'IS 3495 (Part-1)', 37),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Brick (Common Burnt Clay Bricks, Heavy Duty Burnt Clay Brick, Pulverized Fuel Ash-Lime Brick)', 'Efflorescence', 'IS 3495 (Part-3)', 38),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Brick (Common Burnt Clay Bricks, Heavy Duty Burnt Clay Brick, Pulverized Fuel Ash-Lime Brick)', 'Water Absorption', 'IS 3495 (Part-2)', 39),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Brick - Heavy Duty Burnt Clay Brick', 'Dimension-Height', 'IS 2180', 40),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Brick - Heavy Duty Burnt Clay Brick', 'Dimension-Length', 'IS 2180', 41),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Brick - Heavy Duty Burnt Clay Brick', 'Dimension-Width', 'IS 2180', 42),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Brick - Pulverized Fuel Ash-Lime Brick (Modular & Non-Modular)', 'Dimension-Height', 'IS 12894', 43),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Brick - Pulverized Fuel Ash-Lime Brick (Modular & Non-Modular)', 'Dimension-Length', 'IS 12894', 44),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Brick - Pulverized Fuel Ash-Lime Brick (Modular & Non-Modular)', 'Dimension-Width', 'IS 12894', 45),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Cement (OPC & PPC)', 'Compressive Strength', 'IS 4031 (Part-6)', 46),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Cement (OPC & PPC)', 'Density', 'IS 4031 (Part-11)', 47),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Cement (OPC & PPC)', 'Fineness by Blain''s air permeability', 'IS 4031 (Part-2)', 48),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Cement (OPC & PPC)', 'Nominal consistency', 'IS 4031 (Part-4)', 49),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Cement (OPC & PPC)', 'Setting time (Final)', 'IS 4031 (Part-5)', 50),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Cement (OPC & PPC)', 'Setting time (Initial)', 'IS 4031 (Part-5)', 51),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Cement (OPC & PPC)', 'Soundness by Le Chattelier', 'IS 4031 (Part-3)', 52),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Coarse Aggregate (Crushed Stone, Ballast, Gravel)', 'Bulk Density (Loose Density)', 'IS 2386 (Part-3)', 53),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Coarse Aggregate (Crushed Stone, Ballast, Gravel)', 'Crushing Value', 'IS 2386 (Part-4)', 54),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Coarse Aggregate (Crushed Stone, Ballast, Gravel)', 'Determination of clay lumps (Deleterious Material)', 'IS 2386 (Part-2)', 55),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Coarse Aggregate (Crushed Stone, Ballast, Gravel)', 'Determination of Ten Percent Fines value', 'IS 2386 (Part-4)', 56),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Coarse Aggregate (Crushed Stone, Ballast, Gravel)', 'Elongation Index', 'IS 2386 (Part-1)', 57),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Coarse Aggregate (Crushed Stone, Ballast, Gravel)', 'Flakiness Index', 'IS 2386 (Part-1)', 58),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Coarse Aggregate (Crushed Stone, Ballast, Gravel)', 'Soundness by Sodium Sulphate Na2So4', 'IS 2386 (Part-5)', 59),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Coarse Aggregate (Crushed Stone, Ballast, Gravel)', 'Soundness by Magnesium Sulphate MgSo4', 'IS 2386 (Part-5)', 60),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Coarse Aggregate (Crushed Stone, Ballast, Gravel)', 'Specific Gravity', 'IS 2386 (Part-3)', 61),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Coarse Aggregate (Crushed Stone, Ballast, Gravel, WMM (Wet Mix Macadam), GSB (Granular Sub Base))', 'Combined Flakiness Index & Elongation Index', 'IS 2386 (Part-1)', 62),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Coarse Aggregate (Crushed Stone, Ballast, Gravel, WMM (Wet Mix Macadam), GSB (Granular Sub Base))', 'Impact Value', 'IS 2386 (Part-4)', 63),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Coarse Aggregate (Crushed Stone, Ballast, Gravel, WMM (Wet Mix Macadam), GSB (Granular Sub Base))', 'Sieve Analysis (sieve size 3.35 mm, 4.75 mm, 6.3 mm, 10 mm, 12.5 mm, 16 mm, 20 mm, 25 mm, 31.5 mm, 40 mm, 50 mm, 63 mm, 80 mm)', 'IS 2386 (Part-1)', 64),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Coarse Aggregate (Crushed Stone, Ballast, Gravel, WMM (Wet Mix Macadam), GSB (Granular Sub Base))', 'Loss Angeles Abrasion', 'IS 2386 (Part-4)', 65),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Coarse Aggregate (Crushed Stone, Ballast, Gravel, WMM (Wet Mix Macadam), GSB (Granular Sub Base))', 'Water Absorption', 'IS 2386 (Part-3)', 66),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Common Burnt Clay Bricks (Modular & Non-Modular)', 'Dimension-Height', 'IS 1077', 67),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Common Burnt Clay Bricks (Modular & Non-Modular)', 'Dimension-Length', 'IS 1077', 68),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Common Burnt Clay Bricks (Modular & Non-Modular)', 'Dimension-Width', 'IS 1077', 69),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Fine Aggregate (Crusher Stone Sand, Natural Sand, Mixed Sand, Manufactured Sand, Crushed Gravel Sand)', 'Bulk Density (Loose density)', 'IS 2386 (Part-3)', 70),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Fine Aggregate (Crusher Stone Sand, Natural Sand, Mixed Sand, Manufactured Sand, Crushed Gravel Sand)', 'Determination of clay lumps (Deleterious Material)', 'IS 2386 (Part-2)', 71),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Fine Aggregate (Crusher Stone Sand, Natural Sand, Mixed Sand, Manufactured Sand, Crushed Gravel Sand)', 'Soundness by Sodium Sulphate (Na2So4)', 'IS 2386 (Part-5)', 72),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Fine Aggregate (Crusher Stone Sand, Natural Sand, Mixed Sand, Manufactured Sand, Crushed Gravel Sand)', 'Water Absorption', 'IS 2386 (Part 3)', 73),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Fine Aggregate (Crusher Stone Sand, Natural Sand, Mixed Sand, Manufactured Sand, Crushed Gravel Sand)', 'Material Finer than 75µ', 'IS 2386 (Part-1)', 74),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Fine Aggregate (Crusher Stone Sand, Natural Sand, Mixed Sand, Manufactured Sand, Crushed Gravel Sand)', 'Sieve Analysis ( sieve size 75 micron, 150 micron, 300 micron, 600 micron, 1.18 mm, 2.36 mm)', 'IS 2386 (Part-1)', 75),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Fine Aggregate (Crusher Stone Sand, Natural Sand, Mixed Sand, Manufactured Sand, Crushed Gravel Sand)', 'Soundness by Magnesium Sulphate (MgSo4)', 'IS 2386 (Part-5)', 76),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Fine Aggregate (Crusher Stone Sand, Natural Sand, Mixed Sand, Manufactured Sand, Crushed Gravel Sand)', 'Specific Gravity', 'IS 2386 (Part-3)', 77),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Fresh Concrete', 'Slump Test', 'IS 1199 (Part-2)', 78),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Hardened Concrete', 'Compressive Strength of Concrete Cube', 'IS 516 (Part-1/Sec-1)', 79),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Hardened Concrete', 'Compressive strength of Cylindrical Concrete Core', 'IS 516 (Part-4)', 80),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Hardened Concrete', 'Density of Hardened Concrete', 'IS 516 (Part-2/ Sec-1) (Cl-4.5.6)', 81),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Hardened Concrete', 'Flexural Strength of Concrete Beam', 'IS 516 (Part-1/Sec-1)', 82),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Hollow & Solid Concrete Blocks', 'Compressive Strength', 'IS 2185 (Part-1): Annex -D', 83),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Hollow & Solid Concrete Blocks', 'Density', 'IS 2185 (Part-1) : Annex -C', 84),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Hollow & Solid Concrete Blocks', 'Dimensions - Length', 'IS 2185 (Part-1)', 85),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Hollow & Solid Concrete Blocks', 'Dimensions -Height', 'IS 2185 (Part-1) : Annex -B', 86),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Hollow & Solid Concrete Blocks', 'Dimensions -Width', 'IS 2185 (Part-1) : Annex -B', 87),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Hollow & Solid Concrete Blocks', 'Water Absorption', 'IS 2185 (Part-1) Annex -E', 88),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Paver Block', 'Arris', 'IS 15658 Annexure - B (B-2)', 89),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Paver Block', 'Aspect Ratio', 'IS 15658 Annexure - B (B-1)', 90),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Paver Block', 'Compressive Strength', 'IS 15658 (Annexure - D)', 91),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Paver Block', 'Deviation from Squareness', 'IS 15658 : Annexure - B (B-4)', 92),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Paver Block', 'Plan area', 'IS 15658 Annexure - B (B-3) Method-2', 93),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Paver Block', 'Water Absorption', 'IS 15658 (Annexure - C)', 94),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Paver Block', 'Wearing Face Area (Annexure- B)', 'IS 15658 Annexure - B (B-3)', 95),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Paver Block', 'Width', 'IS 15658 Annexure - B (B-1)', 96),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Paver Block', 'Height', 'IS 15658 Annexure - B (B-1)', 97),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Paver Block', 'Length', 'IS 15658 Annexure - B (B-1)', 98),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Tiles - Cement Concrete Flooring Tile', 'Dimensions - Flatness', 'IS 1237 : Annexure - B', 99),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Tiles - Cement Concrete Flooring Tile', 'Dimensions - Height', 'IS 1237', 100),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Tiles - Cement Concrete Flooring Tile', 'Dimensions - Length', 'IS 1237', 101),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Tiles - Cement Concrete Flooring Tile', 'Dimensions - Perpendicularity', 'IS 1237 : Annexure - C', 102),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Tiles - Cement Concrete Flooring Tile', 'Dimensions - Straightness', 'IS 1237 : Annexure - D', 103),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Tiles - Cement Concrete Flooring Tile', 'Dimensions - Width', 'IS 1237', 104),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Tiles - Cement Concrete Flooring Tile', 'Water Absorption', 'IS 1237 : Annexure - E', 105),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Tiles - Cement Concrete Flooring Tile', 'Wet Transverse Strength', 'IS 1237 : Annexure - F', 106),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Tiles - Ceramic Tile & Vitrified Tile', 'Breaking Strength', 'IS 13630 (Part-6)', 107),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Tiles - Ceramic Tile & Vitrified Tile', 'Bulk Density', 'IS 13630 (Part-2)', 108),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Tiles - Ceramic Tile & Vitrified Tile', 'Dimensions - Flatness', 'IS 13630 (Part-1)', 109),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Tiles - Ceramic Tile & Vitrified Tile', 'Dimensions - Length', 'IS 13630 (Part-1)', 110),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Tiles - Ceramic Tile & Vitrified Tile', 'Dimensions - Rectangularity', 'IS 13630 (Part-1)', 111),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Tiles - Ceramic Tile & Vitrified Tile', 'Dimensions - Straightness', 'IS 13630 (Part-1)', 112),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Tiles - Ceramic Tile & Vitrified Tile', 'Dimensions - Width', 'IS 13630 (Part-1)', 113),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Tiles - Ceramic Tile & Vitrified Tile', 'Dimensions (Thickness)', 'IS 13630 (Part-1)', 114),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Tiles - Ceramic Tile & Vitrified Tile', 'Modulus of Rupture', 'IS 13630 (Part-6)', 115),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Tiles - Ceramic Tile & Vitrified Tile', 'Scratch Hardness of Surface According to Mohs’ Scale', 'IS 13630 (Part-13)', 116),
    ('permanent_testing', 'MECHANICAL- BUILDINGS MATERIALS', 'Tiles - Ceramic Tile & Vitrified Tile', 'Water Absorption', 'IS 13630 (Part-2)', 117),
    ('permanent_testing', 'MECHANICAL- MECHANICAL PROPERTIES OF METALS', 'Hexagonal Wire Mesh Gabions', 'Polymer coating thickness', 'IS 16014', 118),
    ('permanent_testing', 'MECHANICAL- MECHANICAL PROPERTIES OF METALS', 'Hexagonal Wire Mesh Gabions', 'Tensile Strength Perpendicular to twist,', 'IS 16014', 119),
    ('permanent_testing', 'MECHANICAL- MECHANICAL PROPERTIES OF METALS', 'Hexagonal Wire Mesh Gabions', 'Tensile Strength Parallel to twist', 'IS 16014', 120),
    ('permanent_testing', 'MECHANICAL- MECHANICAL PROPERTIES OF METALS', 'Reinforcement couplers', 'Percentage elongation (Annexure-B)', 'IS 16172', 121),
    ('permanent_testing', 'MECHANICAL- MECHANICAL PROPERTIES OF METALS', 'Reinforcement couplers', 'Tensile Strength (Annexure-B)', 'IS 16172', 122),
    ('permanent_testing', 'MECHANICAL- MECHANICAL PROPERTIES OF METALS', 'Steel HSD Bar/TMT Bar', 'Yield Strength', 'IS 1608 (Part-1)', 123),
    ('permanent_testing', 'MECHANICAL- MECHANICAL PROPERTIES OF METALS', 'Steel HSD Bar/TMT Bar', 'Bend Test (1. Fe-415 - 8mm), (2. Fe-415D - 10mm,12mm,16mm,20mm) (3. Fe - 500 - 6mm,8mm,10mm,16mm,20m m), (4. Fe - 500D - 8mm), (5. Fe-550 - 8mm, 16mm), (6. Fe-550D - 8mm,10mm,20mm) Mandrel Size - 20mm, 24mm, 32mm, 40mm, 42mm, 56mm, 64mm, 80mm, 84mm, 112mm', 'IS 1599', 124),
    ('permanent_testing', 'MECHANICAL- MECHANICAL PROPERTIES OF METALS', 'Steel HSD Bar/TMT Bar', 'Elongation', 'IS 1608 (Part 1)', 125),
    ('permanent_testing', 'MECHANICAL- MECHANICAL PROPERTIES OF METALS', 'Steel HSD Bar/TMT Bar', 'Mass per meter length', 'IS 1786', 126),
    ('permanent_testing', 'MECHANICAL- MECHANICAL PROPERTIES OF METALS', 'Steel HSD Bar/TMT Bar', 'Rebend test (1. Fe 415/Fe 500 - 8mm,12mm,16mm) (2. Fe 415D/Fe 500D - 6mm,8mm,10mm) (3. Fe 550/Fe 600 - 6mm,8mm) (4. Fe 550D - 12mm,16mm Mandrel Size - 20mm, 24mm, 32mm, 40mm, 42mm, 56mm, 64mm, 80mm, 84mm, 112mm', 'IS 1599 : 2023 & IS 1786', 127),
    ('permanent_testing', 'MECHANICAL- MECHANICAL PROPERTIES OF METALS', 'Steel HSD Bar/TMT Bar', 'Ultimate Tensile Strength', 'IS 1608 (Part-1)', 128),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Rock', 'Density (Determination using saturation and Buoyancy Techniques)', 'IS 13030', 129),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Rock', 'Point Load Strength Index', 'IS 8764', 130),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Rock', 'Porosity (Determination using saturation and Buoyancy Techniques)', 'IS 13030', 131),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Rock', 'Unconfined Compressive Strength', 'IS 9143', 132),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Rock', 'Water Absorption', 'IS 13030', 133),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'CBR (Soaked )', 'IS 2720 (Part-16)', 134),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'CBR (Unsoaked)', 'IS 2720 (Part-16)', 135),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Consolidation (Coefficient of Volume Compressibility) (mv)', 'IS 2720 (Part-15)', 136),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Consolidation (Compression Index) (cc)', 'IS 2720 (Part-15)', 137),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Consolidation Test (Coefficient of Consolidation) (Cv)', 'IS 2720 (Part-15)', 138),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Direct Shear (Angle)', 'IS 2720 (Part-13)', 139),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Direct Shear (Cohesion)', 'IS 2720 (Part-13)', 140),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Free Swell Index', 'IS 2720 (Part-40)', 141),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Grain Size analysis', 'IS 2720 (Part-4)', 142),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Grain size Analysis (Hydrometer Method)', 'IS 2720 (Part-4)', 143),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Maximum Dry Density (MDD) by Light Compaction', 'IS 2720 (Part-7)', 144),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Moisture Content by Rapid Moisture Meter (Calcium Carbide Method)', 'IS 2720 (Part-2)', 145),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Optimum Moisture Content (OMC) by Light Compaction', 'IS 2720 (Part-7)', 146),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Permeability (Constant head method & Falling head)', 'IS 2720 (Part -17)', 147),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Shrinkage Limit', 'IS 2720 (Part-6)', 148),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Specific Gravity', 'IS 2720 (Part-3)', 149),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Swelling Pressure (Constant Volume Method)', 'IS 2720 (Part-41)', 150),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Triaxial Tests (Consolidated Undrained) Cohesion (C)', 'IS 2720 (Part-12)', 151),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Triaxial Tests (Consolidated Undrained) Frictional Angle (Phi)', 'IS 2720 (Part-12)', 152),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Triaxial Tests (Unconsolidated Undrained) Cohesion (C)', 'IS 2720 (Part-11)', 153),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Triaxial Tests (Unconsolidated Undrained) Frictional Ange (phi)', 'IS 2720 (Part-11)', 154),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Unconfined compression strength', 'IS 2720 (Part-10)', 155),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Water content (by Oven drying method)', 'IS 2720 (Part-2)', 156),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil, WMM (Wet Mix Macadam), GSB (Granular Sub Base )', 'Liquid Limit', 'IS 2720 (Part-5)', 157),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil, WMM (Wet Mix Macadam), GSB (Granular Sub Base )', 'Maximum Dry Density (MDD) by Heavy Compaction', 'IS 2720 (Part-8)', 158),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil, WMM (Wet Mix Macadam), GSB (Granular Sub Base )', 'Optimum Moisture Content (OMC) by Heavy Compaction.', 'IS 2720 (Part-8)', 159),
    ('permanent_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil, WMM (Wet Mix Macadam), GSB (Granular Sub Base )', 'Plastic Limit', 'IS 2720 (Part-5)', 160),
    ('permanent_testing', 'NON-DESTRUCTIVE- BUILDING MATERIALS - REINFORCED CONCRETE STRUCTURES', 'Concrete Element (Core)', 'Carbonation depth', 'IS 516 (Part-5/Sec-3)', 161),
    ('site_testing', 'MECHANICAL- SOIL AND ROCKS', 'Pile', 'Lateral load', 'IS 2911 (Part-4)', 1),
    ('site_testing', 'MECHANICAL- SOIL AND ROCKS', 'Pile', 'Pull out (Uplift test)', 'IS 2911 (Part-4)', 2),
    ('site_testing', 'MECHANICAL- SOIL AND ROCKS', 'Pile', 'Vertical Load (Compression)', 'IS 2911 (Part-4)', 3),
    ('site_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Coefficient of elastic uniform compression (Cyclic Plate load)', 'IS 5249', 4),
    ('site_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Dry Density of soil in place by Core-cutter Method', 'IS 2720 (Part-29)', 5),
    ('site_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Dry Density of soil in place by Sand Replacement Method', 'IS 2720 (Part-28)', 6),
    ('site_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Dynamic Cone penetration (DCPT)', 'IS 4968 (Part-1)', 7),
    ('site_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Modulus of subgrade reaction (K- Value)', 'IS 9214', 8),
    ('site_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Safe Bearing Pressure (Plate Load Test)', 'IS 1888', 9),
    ('site_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Soil Resistivity', 'IS 3043', 10),
    ('site_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Standard Penetration test', 'IS 2131', 11),
    ('site_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Strain Modulus Ev2', 'DIN 18134 :2012-04', 12),
    ('site_testing', 'MECHANICAL- SOIL AND ROCKS', 'Soil', 'Vane Shear', 'IS 4434', 13),
    ('site_testing', 'NON-DESTRUCTIVE- BUILDING MATERIALS - REINFORCED CONCRETE STRUCTURES', 'Any Reinforced Concrete surface', 'Half Cell Potential Corrosion Measurement', 'IS 516 (Part-5/Sec-2)', 14),
    ('site_testing', 'NON-DESTRUCTIVE- BUILDING MATERIALS - REINFORCED CONCRETE STRUCTURES', 'Concrete Element (Core)', 'Carbonation depth', 'IS 516 (Part-5/Sec-3)', 15),
    ('site_testing', 'NON-DESTRUCTIVE- BUILDING MATERIALS - REINFORCED CONCRETE STRUCTURES', 'RCC Bridges, Slab', 'Load testing of Bridges (Static)', 'SP - 51', 16),
    ('site_testing', 'NON-DESTRUCTIVE- BUILDING MATERIALS - REINFORCED CONCRETE STRUCTURES', 'Reinforced Concrete Pile', 'Pile Integrity', 'IS 14893', 17),
    ('site_testing', 'NON-DESTRUCTIVE- BUILDING MATERIALS - REINFORCED CONCRETE STRUCTURES', 'Reinforced concrete pile/ Deep foundations', 'Ultrasonic crosshole integrity testing (CHUM)', 'ASTM D 6760', 18),
    ('site_testing', 'NON-DESTRUCTIVE- BUILDING MATERIALS - REINFORCED CONCRETE STRUCTURES', 'Reinforced Concrete Structure', 'Cover meter test', 'BS 1881 (Part 204)', 19),
    ('site_testing', 'NON-DESTRUCTIVE- BUILDING MATERIALS - REINFORCED CONCRETE STRUCTURES', 'Reinforced Concrete Structure', 'Rebound Hammer', 'IS 516 (Part-5/Sec-4)', 20),
    ('site_testing', 'NON-DESTRUCTIVE- BUILDING MATERIALS - REINFORCED CONCRETE STRUCTURES', 'Reinforced Concrete Structure', 'Ultrasonic Pulse Velocity', 'IS 516 (Part-5/Sec-1)', 21)
;

-- =========================================================
-- FINAL INSERTS FOR GOMA LAB / JINAL USER
-- =========================================================
DO $$
DECLARE
    v_lab_email TEXT := 'goma.lab@example.com';
    v_user_email TEXT := 'jinal@goma.com';
    v_lab_id BIGINT;
    v_user_id BIGINT;
BEGIN
    SELECT lab_id INTO v_lab_id
    FROM labs
    WHERE email = v_lab_email
    LIMIT 1;

    IF v_lab_id IS NULL THEN
        RAISE EXCEPTION 'Lab not found for email: %', v_lab_email;
    END IF;

    SELECT user_id INTO v_user_id
    FROM users
    WHERE lab_id = v_lab_id
      AND email = v_user_email
      AND status = 'active'
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Active lab user not found for email: %', v_user_email;
    END IF;

    -- groups
    INSERT INTO scope_groups (
        lab_id,
        testing_scope_type,
        group_name,
        sort_order,
        created_by,
        updated_by,
        created_at,
        updated_at
    )
    SELECT
        v_lab_id,
        g.testing_scope_type,
        g.group_name,
        g.sort_order,
        v_user_id,
        v_user_id,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    FROM temp_scope_groups g
    ON CONFLICT (lab_id, testing_scope_type, group_name) DO UPDATE
    SET
        sort_order = EXCLUDED.sort_order,
        updated_by = v_user_id,
        updated_at = CURRENT_TIMESTAMP;

    -- materials
    INSERT INTO scope_materials (
        lab_id,
        group_id,
        material_name,
        sort_order,
        created_by,
        updated_by,
        created_at,
        updated_at
    )
    SELECT
        v_lab_id,
        sg.group_id,
        m.material_name,
        m.sort_order,
        v_user_id,
        v_user_id,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    FROM temp_scope_materials m
    JOIN scope_groups sg
      ON sg.lab_id = v_lab_id
     AND sg.testing_scope_type = m.testing_scope_type
     AND sg.group_name = m.group_name
    ON CONFLICT (group_id, material_name) DO UPDATE
    SET
        sort_order = EXCLUDED.sort_order,
        updated_by = v_user_id,
        updated_at = CURRENT_TIMESTAMP;

    -- tests
    INSERT INTO scope_tests (
        lab_id,
        group_id,
        material_id,
        test_name,
        test_method,
        sort_order,
        is_active,
        created_by,
        updated_by,
        created_at,
        updated_at
    )
    SELECT
        v_lab_id,
        sg.group_id,
        sm.material_id,
        t.test_name,
        t.test_method,
        t.sort_order,
        TRUE,
        v_user_id,
        v_user_id,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    FROM temp_scope_tests t
    JOIN scope_groups sg
      ON sg.lab_id = v_lab_id
     AND sg.testing_scope_type = t.testing_scope_type
     AND sg.group_name = t.group_name
    JOIN scope_materials sm
      ON sm.lab_id = v_lab_id
     AND sm.group_id = sg.group_id
     AND sm.material_name = t.material_name
    ON CONFLICT (lab_id, group_id, material_id, test_name, test_method) DO UPDATE
    SET
        sort_order = EXCLUDED.sort_order,
        is_active = TRUE,
        updated_by = v_user_id,
        updated_at = CURRENT_TIMESTAMP;

END $$;

COMMIT;

-- =========================================================
-- VERIFY
-- =========================================================
-- SELECT testing_scope_type, group_name FROM scope_groups ORDER BY testing_scope_type, sort_order, group_name;
-- SELECT sg.group_name, sm.material_name FROM scope_materials sm
-- JOIN scope_groups sg ON sg.group_id = sm.group_id
-- ORDER BY sg.testing_scope_type, sg.group_name, sm.sort_order, sm.material_name;
-- SELECT sg.group_name, sm.material_name, st.test_name, st.test_method
-- FROM scope_tests st
-- JOIN scope_groups sg ON sg.group_id = st.group_id
-- JOIN scope_materials sm ON sm.material_id = st.material_id
-- ORDER BY sg.testing_scope_type, sg.group_name, sm.material_name, st.sort_order;

-- Summary from PDF extraction:
-- total deduped groups    : 8
-- total deduped materials : 36
-- total deduped tests     : 182
