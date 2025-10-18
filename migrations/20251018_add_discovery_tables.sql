-- Discovery module schema
-- Tables for persisting sales engineering discovery sessions and responses

-- Discovery Sessions - tracks each discovery conversation
CREATE TABLE discovery_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id VARCHAR(255) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vertical VARCHAR(50) NOT NULL CHECK (vertical IN ('security', 'infrastructure', 'development', 'data', 'ai')),
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'archived')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_discovery_sessions_user_id ON discovery_sessions(user_id);
CREATE INDEX idx_discovery_sessions_account_id ON discovery_sessions(account_id);
CREATE INDEX idx_discovery_sessions_vertical ON discovery_sessions(vertical);
CREATE INDEX idx_discovery_sessions_status ON discovery_sessions(status);
CREATE INDEX idx_discovery_sessions_created_at ON discovery_sessions(created_at);

-- Discovery Responses - stores individual question responses
CREATE TABLE discovery_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES discovery_sessions(id) ON DELETE CASCADE,
    question_id VARCHAR(255) NOT NULL,
    question_title VARCHAR(255) NOT NULL,
    question_type VARCHAR(50) NOT NULL CHECK (question_type IN ('text', 'radio', 'checkbox', 'vendor_multi')),
    response_value JSONB NOT NULL,
    response_raw TEXT,
    vendor_selections JSONB DEFAULT '{}',
    sizing_selections JSONB DEFAULT '{}',
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_discovery_responses_session_id ON discovery_responses(session_id);
CREATE INDEX idx_discovery_responses_question_id ON discovery_responses(question_id);
CREATE INDEX idx_discovery_responses_answered_at ON discovery_responses(answered_at);

-- Discovery Notes - sales engineer notes and observations
CREATE TABLE discovery_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES discovery_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'general' CHECK (note_type IN ('general', 'opportunity', 'risk', 'action_item', 'competitor')),
    related_response_id UUID REFERENCES discovery_responses(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_discovery_notes_session_id ON discovery_notes(session_id);
CREATE INDEX idx_discovery_notes_user_id ON discovery_notes(user_id);
CREATE INDEX idx_discovery_notes_note_type ON discovery_notes(note_type);

-- Discovery Audit Log - tracks all changes for compliance and versioning
CREATE TABLE discovery_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES discovery_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'exported', 'shared')),
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('session', 'response', 'note')),
    entity_id UUID,
    changes JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_discovery_audit_log_session_id ON discovery_audit_log(session_id);
CREATE INDEX idx_discovery_audit_log_user_id ON discovery_audit_log(user_id);
CREATE INDEX idx_discovery_audit_log_action ON discovery_audit_log(action);
CREATE INDEX idx_discovery_audit_log_created_at ON discovery_audit_log(created_at);

-- Discovery Exports - track exports for reporting and Salesforce sync
CREATE TABLE discovery_exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES discovery_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    export_format VARCHAR(50) NOT NULL CHECK (export_format IN ('json', 'csv', 'pdf', 'salesforce')),
    export_data JSONB NOT NULL,
    salesforce_record_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    exported_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_discovery_exports_session_id ON discovery_exports(session_id);
CREATE INDEX idx_discovery_exports_user_id ON discovery_exports(user_id);
CREATE INDEX idx_discovery_exports_status ON discovery_exports(status);
CREATE INDEX idx_discovery_exports_salesforce_record_id ON discovery_exports(salesforce_record_id);

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_discovery_sessions_updated_at BEFORE UPDATE ON discovery_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discovery_responses_updated_at BEFORE UPDATE ON discovery_responses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discovery_notes_updated_at BEFORE UPDATE ON discovery_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
