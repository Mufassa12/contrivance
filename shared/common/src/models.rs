use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use validator::Validate;

/// User role enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::Type)]
#[sqlx(type_name = "varchar", rename_all = "lowercase")]
pub enum UserRole {
    Admin,
    User,
}

impl Default for UserRole {
    fn default() -> Self {
        UserRole::User
    }
}

/// User model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub password_hash: String,
    pub name: String,
    pub role: UserRole,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
    pub is_active: Option<bool>,
    pub last_login: Option<DateTime<Utc>>,
}

/// User creation request
#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct CreateUserRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 8, message = "Password must be at least 8 characters"))]
    pub password: String,
    #[validate(length(min = 1, message = "Name is required"))]
    pub name: String,
    pub role: Option<UserRole>,
}

/// User update request
#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct UpdateUserRequest {
    #[validate(email)]
    pub email: Option<String>,
    pub name: Option<String>,
    pub role: Option<UserRole>,
    pub is_active: Option<bool>,
}

/// Public user response (without sensitive data)
#[derive(Debug, Serialize, Deserialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub role: UserRole,
    pub created_at: DateTime<Utc>,
    pub last_login: Option<DateTime<Utc>>,
    pub is_active: bool,
}

impl From<User> for UserResponse {
    fn from(user: User) -> Self {
        UserResponse {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            created_at: user.created_at.unwrap_or_else(Utc::now),
            last_login: user.last_login,
            is_active: user.is_active.unwrap_or(true),
        }
    }
}

/// Login request
#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct LoginRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 1))]
    pub password: String,
}

/// Login response
#[derive(Debug, Serialize, Deserialize)]
pub struct LoginResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub user: UserResponse,
    pub expires_at: DateTime<Utc>,
}

/// User session model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserSession {
    pub id: Uuid,
    pub user_id: Uuid,
    pub token_hash: String,
    pub expires_at: DateTime<Utc>,
    pub created_at: Option<DateTime<Utc>>,
    pub is_revoked: Option<bool>,
}

/// Column type enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::Type)]
#[serde(rename_all = "lowercase")]
#[sqlx(type_name = "varchar", rename_all = "lowercase")]
pub enum ColumnType {
    Text,
    Number,
    Date,
    Boolean,   
    Select,
    Currency,
}

impl Default for ColumnType {
    fn default() -> Self {
        ColumnType::Text
    }
}

/// Spreadsheet column model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SpreadsheetColumn {
    pub id: Uuid,
    pub spreadsheet_id: Uuid,
    pub name: String,
    pub column_type: ColumnType,
    pub position: i32,
    pub is_required: Option<bool>,
    pub default_value: Option<String>,
    pub validation_rules: Option<serde_json::Value>,
    pub display_options: Option<serde_json::Value>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

/// Spreadsheet column creation request
#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct CreateColumnRequest {
    #[validate(length(min = 1))]
    pub name: String,
    pub column_type: ColumnType,
    pub position: i32,
    pub is_required: Option<bool>,
    pub default_value: Option<String>,
    pub validation_rules: Option<serde_json::Value>,
    pub display_options: Option<serde_json::Value>,
}

/// Spreadsheet model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Spreadsheet {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub owner_id: Uuid,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
    pub is_public: Option<bool>,
    pub settings: Option<serde_json::Value>,
}

/// Spreadsheet creation request
#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct CreateSpreadsheetRequest {
    #[validate(length(min = 1))]
    pub name: String,
    pub description: Option<String>,
    pub is_public: Option<bool>,
    pub settings: Option<serde_json::Value>,
    pub columns: Option<Vec<CreateColumnRequest>>,
}

/// Spreadsheet update request
#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct UpdateSpreadsheetRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub is_public: Option<bool>,
    pub settings: Option<serde_json::Value>,
}

/// Spreadsheet row model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SpreadsheetRow {
    pub id: Uuid,
    pub spreadsheet_id: Uuid,
    pub row_data: serde_json::Value,
    pub position: i32,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
}

/// Spreadsheet row creation request
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateRowRequest {
    pub row_data: serde_json::Value,
    pub position: Option<i32>,
}

/// Spreadsheet row update request
#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateRowRequest {
    pub row_data: Option<serde_json::Value>,
    pub position: Option<i32>,
}

/// Permission level enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::Type)]
#[sqlx(type_name = "varchar", rename_all = "lowercase")]
pub enum PermissionLevel {
    View,
    Edit,
    Admin,
}

/// Spreadsheet collaborator model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SpreadsheetCollaborator {
    pub id: Uuid,
    pub spreadsheet_id: Uuid,
    pub user_id: Uuid,
    pub permission_level: PermissionLevel,
    pub invited_by: Option<Uuid>,
    pub invited_at: DateTime<Utc>,
    pub accepted_at: Option<DateTime<Utc>>,
}

/// Add collaborator request
#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct AddCollaboratorRequest {
    #[validate(email)]
    pub email: String,
    pub permission_level: PermissionLevel,
}

/// Spreadsheet with full details (including columns and collaborators)
#[derive(Debug, Serialize, Deserialize)]
pub struct SpreadsheetDetails {
    pub spreadsheet: Spreadsheet,
    pub columns: Vec<SpreadsheetColumn>,
    pub rows: Vec<SpreadsheetRow>,
    pub collaborators: Vec<CollaboratorInfo>,
    pub owner: UserResponse,
}

/// Collaborator information with user details
#[derive(Debug, Serialize, Deserialize)]
pub struct CollaboratorInfo {
    pub user: UserResponse,
    pub permission_level: PermissionLevel,
    pub invited_at: DateTime<Utc>,
    pub accepted_at: Option<DateTime<Utc>>,
}

/// Audit log model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AuditLog {
    pub id: Uuid,
    pub table_name: String,
    pub record_id: Uuid,
    pub action: String,
    pub user_id: Option<Uuid>,
    pub old_values: Option<serde_json::Value>,
    pub new_values: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

/// WebSocket message types for real-time updates
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum WebSocketMessage {
    /// User joined the spreadsheet
    UserJoined {
        user_id: Uuid,
        user_name: String,
        spreadsheet_id: Uuid,
    },
    /// User left the spreadsheet
    UserLeft {
        user_id: Uuid,
        spreadsheet_id: Uuid,
    },
    /// Row was updated
    RowUpdated {
        spreadsheet_id: Uuid,
        row: SpreadsheetRow,
        updated_by: Uuid,
    },
    /// Row was created
    RowCreated {
        spreadsheet_id: Uuid,
        row: SpreadsheetRow,
        created_by: Uuid,
    },
    /// Row was deleted
    RowDeleted {
        spreadsheet_id: Uuid,
        row_id: Uuid,
        deleted_by: Uuid,
    },
    /// Column was updated
    ColumnUpdated {
        spreadsheet_id: Uuid,
        column: SpreadsheetColumn,
        updated_by: Uuid,
    },
    /// Column was created
    ColumnCreated {
        spreadsheet_id: Uuid,
        column: SpreadsheetColumn,
        created_by: Uuid,
    },
    /// Column was deleted
    ColumnDeleted {
        spreadsheet_id: Uuid,
        column_id: Uuid,
        deleted_by: Uuid,
    },
    /// Spreadsheet settings updated
    SpreadsheetUpdated {
        spreadsheet: Spreadsheet,
        updated_by: Uuid,
    },
    /// Spreadsheet was deleted
    SpreadsheetDeleted {
        spreadsheet_id: Uuid,
        deleted_by: Uuid,
    },
    /// Error message
    Error {
        message: String,
        code: Option<String>,
    },
    /// Heartbeat/ping message
    Ping,
    /// Pong response
    Pong,
}

/// API response wrapper
#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
    pub message: Option<String>,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
            message: None,
        }
    }

    pub fn success_with_message(data: T, message: String) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
            message: Some(message),
        }
    }

    pub fn error(error: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(error),
            message: None,
        }
    }
}

/// Pagination parameters
#[derive(Debug, Serialize, Deserialize)]
pub struct PaginationParams {
    pub page: Option<u32>,
    pub limit: Option<u32>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>, // "asc" or "desc"
}

impl Default for PaginationParams {
    fn default() -> Self {
        Self {
            page: Some(1),
            limit: Some(20),
            sort_by: None,
            sort_order: Some("asc".to_string()),
        }
    }
}

/// Paginated response
#[derive(Debug, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub total: u64,
    pub page: u32,
    pub limit: u32,
    pub total_pages: u32,
    pub has_next: bool,
    pub has_prev: bool,
}

/// Health check response
#[derive(Debug, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub timestamp: DateTime<Utc>,
    pub service: String,
    pub version: String,
    pub database: Option<String>,
    pub dependencies: Option<Vec<DependencyHealth>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DependencyHealth {
    pub name: String,
    pub status: String,
    pub response_time_ms: Option<u64>,
}

/// Todo priority enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::Type)]
#[sqlx(type_name = "varchar", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum TodoPriority {
    Low,
    Medium,
    High,
}

impl Default for TodoPriority {
    fn default() -> Self {
        TodoPriority::Medium
    }
}

/// Todo model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Todo {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub priority: TodoPriority,
    pub completed: bool,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
    pub due_date: Option<DateTime<Utc>>,
    pub supporting_artifact: Option<String>,
    pub spreadsheet_id: Uuid,
    pub row_id: Option<Uuid>,
    pub user_id: Uuid,
    pub assigned_to: Option<Uuid>,
}

/// Create todo request
#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct CreateTodoRequest {
    #[validate(length(min = 1, message = "Title is required"))]
    pub title: String,
    pub description: Option<String>,
    pub priority: TodoPriority,
    pub due_date: Option<DateTime<Utc>>,
    pub supporting_artifact: Option<String>,
    pub spreadsheet_id: Uuid,
    pub row_id: Option<Uuid>,
    pub assigned_to: Option<Uuid>,
}

/// Update todo request
#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct UpdateTodoRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub priority: Option<TodoPriority>,
    pub completed: Option<bool>,
    pub due_date: Option<DateTime<Utc>>,
    pub supporting_artifact: Option<String>,
    pub assigned_to: Option<Uuid>,
}

/// Todo statistics
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct TodoStats {
    pub total: Option<i64>,
    pub completed: Option<i64>,
    pub pending: Option<i64>,
    pub high_priority: Option<i64>,
    pub medium_priority: Option<i64>,
    pub low_priority: Option<i64>,
}

impl TodoStats {
    pub fn new() -> Self {
        Self {
            total: Some(0),
            completed: Some(0),
            pending: Some(0),
            high_priority: Some(0),
            medium_priority: Some(0),
            low_priority: Some(0),
        }
    }
}