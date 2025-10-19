-- Add multi_select question type support to discovery_responses
-- This allows dropdown multi-select questions like the Security Framework

-- Drop the existing check constraint
ALTER TABLE discovery_responses
DROP CONSTRAINT discovery_responses_question_type_check;

-- Add new check constraint with multi_select included
ALTER TABLE discovery_responses
ADD CONSTRAINT discovery_responses_question_type_check 
CHECK (question_type IN ('text', 'radio', 'checkbox', 'vendor_multi', 'multi_select'));
