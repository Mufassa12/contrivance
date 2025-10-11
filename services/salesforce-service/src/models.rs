use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SalesforceOpportunity {
    #[serde(rename = "Id")]
    pub id: String,
    #[serde(rename = "Name")]
    pub name: String,
    #[serde(rename = "Amount")]
    pub amount: Option<f64>,
    #[serde(rename = "StageName")]
    pub stage_name: String,
    #[serde(rename = "CloseDate")]
    pub close_date: String,
    #[serde(rename = "Account")]
    pub account: Option<SalesforceAccount>,
    #[serde(rename = "Owner")]
    pub owner: Option<SalesforceUser>,
    #[serde(rename = "CreatedDate")]
    pub created_date: Option<String>,
    #[serde(rename = "LastModifiedDate")]
    pub last_modified_date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SalesforceLead {
    #[serde(rename = "Id")]
    pub id: String,
    #[serde(rename = "Name")]
    pub name: String,
    #[serde(rename = "Company")]
    pub company: String,
    #[serde(rename = "Email")]
    pub email: Option<String>,
    #[serde(rename = "Phone")]
    pub phone: Option<String>,
    #[serde(rename = "Status")]
    pub status: String,
    #[serde(rename = "Owner")]
    pub owner: Option<SalesforceUser>,
    #[serde(rename = "CreatedDate")]
    pub created_date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SalesforceAccount {
    #[serde(rename = "Id")]
    pub id: String,
    #[serde(rename = "Name")]
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SalesforceUser {
    #[serde(rename = "Id")]
    pub id: String,
    #[serde(rename = "Name")]
    pub name: String,
    #[serde(rename = "Email")]
    pub email: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SalesforceQueryResponse<T> {
    #[serde(rename = "totalSize")]
    pub total_size: i32,
    pub done: bool,
    pub records: Vec<T>,
    #[serde(rename = "nextRecordsUrl")]
    pub next_records_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SalesforceToken {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub instance_url: String,
    pub token_type: String,
    pub expires_in: Option<i64>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportRequest {
    pub spreadsheet_id: Option<Uuid>,
    pub create_new_pipeline: bool,
    pub pipeline_name: Option<String>,
    pub field_mappings: std::collections::HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportResponse {
    pub success: bool,
    pub spreadsheet_id: Uuid,
    pub records_imported: usize,
    pub errors: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectionStatus {
    pub connected: bool,
    pub user_info: Option<SalesforceUser>,
    pub instance_url: Option<String>,
    pub last_sync: Option<DateTime<Utc>>,
}

// Database models for storing Salesforce tokens
#[derive(Debug, sqlx::FromRow)]
pub struct SalesforceConnection {
    pub id: Uuid,
    pub user_id: Uuid,
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub instance_url: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub expires_at: Option<DateTime<Utc>>,
}