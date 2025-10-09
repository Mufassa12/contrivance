-- Contrivance Database Schema
-- PostgreSQL schema for sales pipeline management platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication and user management
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- User sessions for JWT token management
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_revoked BOOLEAN DEFAULT false
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Spreadsheets table for main spreadsheet metadata
CREATE TABLE spreadsheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_public BOOLEAN DEFAULT false,
    settings JSONB DEFAULT '{}' -- Stores display settings, permissions, etc.
);

CREATE INDEX idx_spreadsheets_owner_id ON spreadsheets(owner_id);
CREATE INDEX idx_spreadsheets_created_at ON spreadsheets(created_at);
CREATE INDEX idx_spreadsheets_is_public ON spreadsheets(is_public);

-- Spreadsheet columns definition
CREATE TABLE spreadsheet_columns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spreadsheet_id UUID NOT NULL REFERENCES spreadsheets(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    column_type VARCHAR(50) NOT NULL DEFAULT 'text' CHECK (column_type IN ('text', 'number', 'date', 'boolean', 'select', 'currency')),
    position INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT false,
    default_value TEXT,
    validation_rules JSONB DEFAULT '{}', -- For validation constraints
    display_options JSONB DEFAULT '{}', -- For UI display options
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_spreadsheet_columns_spreadsheet_id ON spreadsheet_columns(spreadsheet_id);
CREATE INDEX idx_spreadsheet_columns_position ON spreadsheet_columns(spreadsheet_id, position);

-- Spreadsheet rows with flexible JSONB data storage
CREATE TABLE spreadsheet_rows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spreadsheet_id UUID NOT NULL REFERENCES spreadsheets(id) ON DELETE CASCADE,
    row_data JSONB NOT NULL DEFAULT '{}', -- Flexible storage for all column data
    position INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_spreadsheet_rows_spreadsheet_id ON spreadsheet_rows(spreadsheet_id);
CREATE INDEX idx_spreadsheet_rows_position ON spreadsheet_rows(spreadsheet_id, position);
-- GIN index for JSONB queries
CREATE INDEX idx_spreadsheet_rows_data ON spreadsheet_rows USING GIN (row_data);

-- Spreadsheet collaborators for sharing and permissions
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

-- Audit log for tracking changes
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

-- Sales-specific views and functions

-- Create a view for active deals (sales-specific)
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
  AND s.is_public = true OR EXISTS (
    SELECT 1 FROM spreadsheet_collaborators sc 
    WHERE sc.spreadsheet_id = s.id
  );

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating updated_at timestamps
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spreadsheets_updated_at BEFORE UPDATE ON spreadsheets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spreadsheet_columns_updated_at BEFORE UPDATE ON spreadsheet_columns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spreadsheet_rows_updated_at BEFORE UPDATE ON spreadsheet_rows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function for audit logging
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

-- Apply audit triggers to main tables
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_spreadsheets AFTER INSERT OR UPDATE OR DELETE ON spreadsheets
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_spreadsheet_rows AFTER INSERT OR UPDATE OR DELETE ON spreadsheet_rows
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Todos table for pipeline and row-specific todos
CREATE TABLE todos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP WITH TIME ZONE,
    supporting_artifact TEXT, -- URL or link to supporting documents
    
    -- Link to spreadsheet (pipeline-level todos)
    spreadsheet_id UUID REFERENCES spreadsheets(id) ON DELETE CASCADE,
    
    -- Link to specific row (row-level todos) - optional
    row_id UUID,
    
    -- Owner of the todo
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- User assigned to this todo (can be different from owner)
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Either spreadsheet_id or row_id must be provided (but row_id can be null for pipeline todos)
    CONSTRAINT todos_has_context CHECK (spreadsheet_id IS NOT NULL)
);

-- Update function for todos timestamps
CREATE OR REPLACE FUNCTION update_todos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_todos_updated_at_trigger
    BEFORE UPDATE ON todos
    FOR EACH ROW
    EXECUTE FUNCTION update_todos_updated_at();

-- Apply audit trigger to todos
CREATE TRIGGER audit_todos AFTER INSERT OR UPDATE OR DELETE ON todos
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create useful indexes for common queries
CREATE INDEX idx_row_data_status ON spreadsheet_rows USING GIN ((row_data->>'status'));
CREATE INDEX idx_row_data_stage ON spreadsheet_rows USING GIN ((row_data->>'stage'));
CREATE INDEX idx_row_data_value ON spreadsheet_rows USING GIN ((row_data->>'deal_value'));
CREATE INDEX idx_row_data_company ON spreadsheet_rows USING GIN ((row_data->>'company'));

-- Indexes for todos table
CREATE INDEX idx_todos_spreadsheet_id ON todos(spreadsheet_id);
CREATE INDEX idx_todos_row_id ON todos(row_id) WHERE row_id IS NOT NULL;
CREATE INDEX idx_todos_user_id ON todos(user_id);
CREATE INDEX idx_todos_completed ON todos(completed);
CREATE INDEX idx_todos_priority ON todos(priority);
CREATE INDEX idx_todos_created_at ON todos(created_at);

COMMIT;