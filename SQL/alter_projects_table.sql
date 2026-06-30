-- Alter projects table to rename project_description and add NABL scope
-- Run this query to update the database structure

-- 1. Rename project_description column to name_of_work_and_other_details
ALTER TABLE projects 
RENAME COLUMN project_description TO name_of_work_and_other_details;

-- 2. Add NABL_scope column (boolean, default false)
ALTER TABLE projects 
ADD COLUMN NABL_scope BOOLEAN DEFAULT FALSE;

-- 3. Add comment to describe the new column
COMMENT ON COLUMN projects.name_of_work_and_other_details IS 'Name of work & other details';
COMMENT ON COLUMN projects.NABL_scope IS 'Whether the project requires NABL scope compliance';

-- 4. Update the column to ensure it's not null (optional)
ALTER TABLE projects 
ALTER COLUMN name_of_work_and_other_details SET NOT NULL;

-- 5. Create index for better performance on NABL_scope
CREATE INDEX idx_projects_nabl_scope ON projects(NABL_scope);

-- 6. Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND column_name IN ('name_of_work_and_other_details', 'NABL_scope')
ORDER BY column_name;
