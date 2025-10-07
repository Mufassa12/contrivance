-- Migration: Add todos table for persistent todo storage
-- Date: 2025-10-08
-- Description: Replace localStorage todos with database storage

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
    
    -- Either spreadsheet_id or row_id must be provided (but row_id can be null for pipeline todos)
    CONSTRAINT todos_has_context CHECK (spreadsheet_id IS NOT NULL)
);

-- Indexes for performance
CREATE INDEX idx_todos_spreadsheet_id ON todos(spreadsheet_id);
CREATE INDEX idx_todos_row_id ON todos(row_id) WHERE row_id IS NOT NULL;
CREATE INDEX idx_todos_user_id ON todos(user_id);
CREATE INDEX idx_todos_completed ON todos(completed);
CREATE INDEX idx_todos_priority ON todos(priority);
CREATE INDEX idx_todos_created_at ON todos(created_at);

-- Update function for timestamps
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