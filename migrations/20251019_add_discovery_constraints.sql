-- Add unique constraint for discovery responses
-- This allows ON CONFLICT clauses to work for upsert operations

-- Add unique constraint on (session_id, question_id)
ALTER TABLE discovery_responses
ADD CONSTRAINT unique_session_question 
UNIQUE (session_id, question_id);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT unique_session_question ON discovery_responses IS 
'Ensures one response per question per session. Used for ON CONFLICT upserts.';
