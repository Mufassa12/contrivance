-- Migration: Add Owner column to spreadsheets
-- This migration adds the "Owner" column definition to existing spreadsheets

BEGIN;

-- For spreadsheets that don't have an Owner column defined, add it
-- We'll add it to the spreadsheet_columns table as a proper column definition
-- and also ensure existing rows have a placeholder for the owner data

-- First, let's add the Owner column definition to existing spreadsheets
-- We'll do this by inserting a column definition for each spreadsheet that doesn't have one

INSERT INTO spreadsheet_columns (
    spreadsheet_id,
    name,
    column_type,
    position,
    is_required,
    default_value,
    validation_rules,
    display_options
)
SELECT 
    s.id as spreadsheet_id,
    'Owner' as name,
    'select' as column_type,
    (
        SELECT COALESCE(MAX(position), 0) + 1 
        FROM spreadsheet_columns sc2 
        WHERE sc2.spreadsheet_id = s.id
    ) as position,
    false as is_required,
    NULL as default_value,
    '{"multiple": true, "options": []}' as validation_rules,
    '{"searchable": true, "multi_select": true, "placeholder": "Select Sales Engineers"}' as display_options
FROM spreadsheets s
WHERE NOT EXISTS (
    SELECT 1 FROM spreadsheet_columns sc 
    WHERE sc.spreadsheet_id = s.id 
    AND sc.name = 'Owner'
);

-- Update existing rows to include an empty Owner field if they don't have one
UPDATE spreadsheet_rows
SET row_data = row_data || '{"Owner": []}'::jsonb
WHERE NOT (row_data ? 'Owner');

-- Create an index for better performance when querying by owner
CREATE INDEX IF NOT EXISTS idx_row_data_owner ON spreadsheet_rows USING GIN ((row_data->'Owner'));

-- Insert sample owner options for existing spreadsheets (you can customize these)
-- This creates a reference list of sales engineers that can be selected
UPDATE spreadsheet_columns 
SET validation_rules = jsonb_set(
    validation_rules, 
    '{options}', 
    '[
        {"value": "john_doe", "label": "John Doe", "role": "Senior SE"},
        {"value": "jane_smith", "label": "Jane Smith", "role": "Enterprise SE"},
        {"value": "mike_johnson", "label": "Mike Johnson", "role": "Technical Lead"},
        {"value": "sarah_wilson", "label": "Sarah Wilson", "role": "Solutions Architect"},
        {"value": "alex_chen", "label": "Alex Chen", "role": "Pre-Sales Engineer"}
    ]'::jsonb
)
WHERE name = 'Owner' AND column_type = 'select';

COMMIT;