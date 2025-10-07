-- Seed data for Contrivance development environment
-- This file creates sample users, spreadsheets, and sales data

-- Insert sample users
INSERT INTO users (id, email, password_hash, name, role) VALUES 
-- Password for all users is 'password123' hashed with bcrypt
('11111111-1111-1111-1111-111111111111', 'admin@contrivance.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeKnE6.M8rksrK4GW', 'Admin User', 'admin'),
('22222222-2222-2222-2222-222222222222', 'john.doe@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeKnE6.M8rksrK4GW', 'John Doe', 'user'),
('33333333-3333-3333-3333-333333333333', 'jane.smith@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeKnE6.M8rksrK4GW', 'Jane Smith', 'user'),
('44444444-4444-4444-4444-444444444444', 'sales.manager@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeKnE6.M8rksrK4GW', 'Sales Manager', 'user');

-- Insert sample spreadsheets
INSERT INTO spreadsheets (id, name, description, owner_id, is_public, settings) VALUES 
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Q4 2024 Sales Pipeline', 'Fourth quarter sales pipeline tracking', '22222222-2222-2222-2222-222222222222', true, '{"defaultView": "grid", "chartType": "funnel"}'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Enterprise Deals 2024', 'High-value enterprise deals tracking', '33333333-3333-3333-3333-333333333333', true, '{"defaultView": "grid", "chartType": "timeline"}'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Regional Sales - West', 'West coast regional sales pipeline', '44444444-4444-4444-4444-444444444444', false, '{"defaultView": "grid", "chartType": "bar"}');

-- Insert spreadsheet columns for Q4 Sales Pipeline
INSERT INTO spreadsheet_columns (id, spreadsheet_id, name, column_type, position, is_required, validation_rules, display_options) VALUES
('col1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Company', 'text', 1, true, '{}', '{"width": 200}'),
('col2-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Deal Value', 'currency', 2, true, '{"min": 0}', '{"width": 120, "currency": "USD"}'),
('col3-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stage', 'select', 3, true, '{"options": ["Lead", "Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost"]}', '{"width": 150}'),
('col4-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Probability', 'number', 4, false, '{"min": 0, "max": 100}', '{"width": 100, "suffix": "%"}'),
('col5-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Close Date', 'date', 5, false, '{}', '{"width": 120}'),
('col6-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Contact', 'text', 6, false, '{}', '{"width": 180}'),
('col7-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Notes', 'text', 7, false, '{}', '{"width": 250}');

-- Insert spreadsheet columns for Enterprise Deals
INSERT INTO spreadsheet_columns (id, spreadsheet_id, name, column_type, position, is_required, validation_rules, display_options) VALUES
('col1-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Account', 'text', 1, true, '{}', '{"width": 200}'),
('col2-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Deal Size', 'currency', 2, true, '{"min": 50000}', '{"width": 140, "currency": "USD"}'),
('col3-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Status', 'select', 3, true, '{"options": ["Discovery", "Technical Review", "Commercial", "Legal Review", "Closed Won", "Closed Lost"]}', '{"width": 160}'),
('col4-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Decision Maker', 'text', 4, false, '{}', '{"width": 180}'),
('col5-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Next Action', 'text', 5, false, '{}', '{"width": 200}'),
('col6-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Target Close', 'date', 6, false, '{}', '{"width": 120}');

-- Insert sample data rows for Q4 Sales Pipeline
INSERT INTO spreadsheet_rows (id, spreadsheet_id, row_data, position, created_by, updated_by) VALUES
('row1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
 '{"company": "TechCorp Inc", "deal_value": "150000", "stage": "Proposal", "probability": "75", "close_date": "2024-12-15", "contact": "Sarah Wilson", "notes": "Strong interest, waiting on budget approval"}', 
 1, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),

('row2-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
 '{"company": "GlobalSoft LLC", "deal_value": "75000", "stage": "Negotiation", "probability": "85", "close_date": "2024-11-30", "contact": "Mike Johnson", "notes": "Price negotiations in progress"}', 
 2, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),

('row3-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
 '{"company": "StartupXYZ", "deal_value": "25000", "stage": "Qualified", "probability": "45", "close_date": "2024-12-31", "contact": "Alex Chen", "notes": "Early stage startup, budget constraints"}', 
 3, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),

('row4-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
 '{"company": "MegaCorp Industries", "deal_value": "500000", "stage": "Lead", "probability": "25", "close_date": "2025-02-28", "contact": "Jennifer Adams", "notes": "Initial contact made, scheduling discovery call"}', 
 4, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),

('row5-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
 '{"company": "InnovateLabs", "deal_value": "120000", "stage": "Closed Won", "probability": "100", "close_date": "2024-10-15", "contact": "David Park", "notes": "Deal closed successfully!"}', 
 5, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222');

-- Insert sample data rows for Enterprise Deals
INSERT INTO spreadsheet_rows (id, spreadsheet_id, row_data, position, created_by, updated_by) VALUES
('row1-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
 '{"account": "Fortune 500 Corp", "deal_size": "1250000", "status": "Commercial", "decision_maker": "CTO James Brown", "next_action": "Send revised proposal", "target_close": "2024-12-20"}', 
 1, '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333'),

('row2-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
 '{"account": "Global Bank", "deal_size": "800000", "status": "Legal Review", "decision_maker": "VP Technology", "next_action": "Legal contract review", "target_close": "2025-01-15"}', 
 2, '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333'),

('row3-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
 '{"account": "Healthcare Giant", "deal_size": "650000", "status": "Technical Review", "decision_maker": "Chief Medical Officer", "next_action": "Technical demo scheduled", "target_close": "2024-11-30"}', 
 3, '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333');

-- Insert collaborators
INSERT INTO spreadsheet_collaborators (spreadsheet_id, user_id, permission_level, invited_by, accepted_at) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'edit', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'view', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'edit', '33333333-3333-3333-3333-333333333333', CURRENT_TIMESTAMP);

-- Add some sample audit log entries
INSERT INTO audit_log (table_name, record_id, action, user_id, new_values) VALUES
('spreadsheets', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'INSERT', '22222222-2222-2222-2222-222222222222', '{"name": "Q4 2024 Sales Pipeline", "owner_id": "22222222-2222-2222-2222-222222222222"}'),
('spreadsheets', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'INSERT', '33333333-3333-3333-3333-333333333333', '{"name": "Enterprise Deals 2024", "owner_id": "33333333-3333-3333-3333-333333333333"}');

COMMIT;