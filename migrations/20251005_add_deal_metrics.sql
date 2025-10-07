-- Add sales-specific fields and enhancements
-- Migration to add deal-specific functionality and improved collaboration features

-- Add last_login to users table
ALTER TABLE users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;

-- Add settings column to spreadsheets
ALTER TABLE spreadsheets ADD COLUMN settings JSONB DEFAULT '{}';

-- Enhance spreadsheet_columns with validation and display options
ALTER TABLE spreadsheet_columns ADD COLUMN default_value TEXT;
ALTER TABLE spreadsheet_columns ADD COLUMN validation_rules JSONB DEFAULT '{}';
ALTER TABLE spreadsheet_columns ADD COLUMN display_options JSONB DEFAULT '{}';
ALTER TABLE spreadsheet_columns ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Add user tracking to spreadsheet_rows
ALTER TABLE spreadsheet_rows ADD COLUMN created_by UUID REFERENCES users(id);
ALTER TABLE spreadsheet_rows ADD COLUMN updated_by UUID REFERENCES users(id);

-- Create spreadsheet_collaborators table
CREATE TABLE spreadsheet_collaborators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spreadsheet_id UUID NOT NULL REFERENCES spreadsheets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_level VARCHAR(20) NOT NULL DEFAULT 'view' CHECK (permission_level IN ('view', 'edit', 'admin')),
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(spreadsheet_id, user_id)
);

CREATE INDEX idx_spreadsheet_collaborators_spreadsheet_id ON spreadsheet_collaborators(spreadsheet_id);
CREATE INDEX idx_spreadsheet_collaborators_user_id ON spreadsheet_collaborators(user_id);

-- Create audit_log table
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    user_id UUID REFERENCES users(id),
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- Add updated_at trigger to spreadsheet_columns
CREATE TRIGGER update_spreadsheet_columns_updated_at BEFORE UPDATE ON spreadsheet_columns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create sales-specific indexes for common queries
CREATE INDEX idx_row_data_status ON spreadsheet_rows USING GIN ((row_data->>'status'));
CREATE INDEX idx_row_data_stage ON spreadsheet_rows USING GIN ((row_data->>'stage'));
CREATE INDEX idx_row_data_value ON spreadsheet_rows USING GIN ((row_data->>'deal_value'));
CREATE INDEX idx_row_data_company ON spreadsheet_rows USING GIN ((row_data->>'company'));

-- Create active_deals view
CREATE VIEW active_deals AS
SELECT 
    sr.id as row_id,
    s.id as spreadsheet_id,
    s.name as spreadsheet_name,
    s.owner_id,
    sr.row_data,
    sr.created_at,
    sr.updated_at,
    u.name as owner_name
FROM spreadsheet_rows sr
JOIN spreadsheets s ON sr.spreadsheet_id = s.id
JOIN users u ON s.owner_id = u.id
WHERE sr.row_data->>'status' IS NOT NULL 
  AND sr.row_data->>'status' != 'closed'
  AND (s.is_public = true OR EXISTS (
    SELECT 1 FROM spreadsheet_collaborators sc 
    WHERE sc.spreadsheet_id = s.id
  ));

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, action, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_spreadsheets AFTER INSERT OR UPDATE OR DELETE ON spreadsheets
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_spreadsheet_rows AFTER INSERT OR UPDATE OR DELETE ON spreadsheet_rows
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();