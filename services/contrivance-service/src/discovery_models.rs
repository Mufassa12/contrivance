use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DiscoverySession {
    pub id: Uuid,
    pub account_id: String,
    pub account_name: String,
    pub user_id: Uuid,
    pub vertical: String,
    pub status: String,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DiscoveryResponse {
    pub id: Uuid,
    pub session_id: Uuid,
    pub question_id: String,
    pub question_title: String,
    pub question_type: String,
    pub response_value: serde_json::Value,
    pub response_raw: Option<String>,
    pub vendor_selections: serde_json::Value,
    pub sizing_selections: serde_json::Value,
    pub answered_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DiscoveryNote {
    pub id: Uuid,
    pub session_id: Uuid,
    pub user_id: Uuid,
    pub note_text: String,
    pub note_type: String,
    pub related_response_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DiscoveryExport {
    pub id: Uuid,
    pub session_id: Uuid,
    pub user_id: Uuid,
    pub export_format: String,
    pub export_data: serde_json::Value,
    pub salesforce_record_id: Option<String>,
    pub status: String,
    pub error_message: Option<String>,
    pub created_at: DateTime<Utc>,
    pub exported_at: Option<DateTime<Utc>>,
}

// DTOs for API requests/responses
#[derive(Debug, Deserialize)]
pub struct CreateDiscoverySessionRequest {
    pub account_id: String,
    pub account_name: String,
    pub vertical: String,
}

#[derive(Debug, Deserialize)]
pub struct SaveDiscoveryResponseRequest {
    pub question_id: String,
    pub question_title: String,
    pub question_type: String,
    pub response_value: serde_json::Value,
    pub vendor_selections: Option<serde_json::Value>,
    pub sizing_selections: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct AddDiscoveryNoteRequest {
    pub note_text: String,
    pub note_type: Option<String>,
    pub related_response_id: Option<Uuid>,
}

#[derive(Debug, Serialize)]
pub struct DiscoverySessionWithResponses {
    pub session: DiscoverySession,
    pub responses: Vec<DiscoveryResponse>,
    pub notes: Vec<DiscoveryNote>,
    pub total_questions_answered: i32,
}

#[derive(Debug, Serialize)]
pub struct DiscoverySummary {
    pub session_id: Uuid,
    pub account_name: String,
    pub vertical: String,
    pub status: String,
    pub progress_percentage: f64,
    pub total_responses: i32,
    pub vendors_selected: Vec<String>,
    pub sizing_info: serde_json::Value,
}
