-- Migration: Add assigned_to field to todos for owner assignment functionality
-- This allows todos to be assigned to specific users for better task management

-- Add assigned_to column to todos table
ALTER TABLE todos 
ADD COLUMN assigned_to UUID REFERENCES users(id);

-- Add index for better performance when querying by assigned user
CREATE INDEX idx_todos_assigned_to ON todos(assigned_to);

-- Add constraint to ensure assigned_to references valid users
-- (This is already handled by the REFERENCES constraint above, but documenting)

-- Update existing todos to be assigned to their creators by default
-- This ensures existing todos have an owner
UPDATE todos 
SET assigned_to = user_id 
WHERE assigned_to IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN todos.assigned_to IS 'User ID of the person assigned to complete this todo';