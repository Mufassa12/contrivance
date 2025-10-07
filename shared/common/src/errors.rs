use serde::{Deserialize, Serialize};
use thiserror::Error;
use actix_web::{HttpResponse, ResponseError};

/// Common error types for the Contrivance application
#[derive(Error, Debug, Clone, Serialize, Deserialize)]
pub enum ContrivanceError {
    #[error("Database error: {message}")]
    Database { message: String },

    #[error("Authentication error: {message}")]
    Authentication { message: String },

    #[error("Authorization error: {message}")]
    Authorization { message: String },

    #[error("Validation error: {message}")]
    Validation { message: String },

    #[error("Not found: {resource}")]
    NotFound { resource: String },

    #[error("Conflict: {message}")]
    Conflict { message: String },

    #[error("Internal server error: {message}")]
    Internal { message: String },

    #[error("External service error: {service}: {message}")]
    ExternalService { service: String, message: String },

    #[error("Rate limit exceeded")]
    RateLimit,

    #[error("Bad request: {message}")]
    BadRequest { message: String },

    #[error("Service unavailable: {message}")]
    ServiceUnavailable { message: String },

    #[error("WebSocket error: {message}")]
    WebSocket { message: String },

    #[error("Serialization error: {message}")]
    Serialization { message: String },
}

impl ContrivanceError {
    pub fn database(message: impl Into<String>) -> Self {
        Self::Database {
            message: message.into(),
        }
    }

    pub fn authentication(message: impl Into<String>) -> Self {
        Self::Authentication {
            message: message.into(),
        }
    }

    pub fn authorization(message: impl Into<String>) -> Self {
        Self::Authorization {
            message: message.into(),
        }
    }

    pub fn validation(message: impl Into<String>) -> Self {
        Self::Validation {
            message: message.into(),
        }
    }

    pub fn not_found(resource: impl Into<String>) -> Self {
        Self::NotFound {
            resource: resource.into(),
        }
    }

    pub fn conflict(message: impl Into<String>) -> Self {
        Self::Conflict {
            message: message.into(),
        }
    }

    pub fn internal(message: impl Into<String>) -> Self {
        Self::Internal {
            message: message.into(),
        }
    }

    pub fn external_service(service: impl Into<String>, message: impl Into<String>) -> Self {
        Self::ExternalService {
            service: service.into(),
            message: message.into(),
        }
    }

    pub fn bad_request(message: impl Into<String>) -> Self {
        Self::BadRequest {
            message: message.into(),
        }
    }

    pub fn service_unavailable(message: impl Into<String>) -> Self {
        Self::ServiceUnavailable {
            message: message.into(),
        }
    }

    pub fn websocket(message: impl Into<String>) -> Self {
        Self::WebSocket {
            message: message.into(),
        }
    }

    pub fn serialization(message: impl Into<String>) -> Self {
        Self::Serialization {
            message: message.into(),
        }
    }

    pub fn configuration(message: impl Into<String>) -> Self {
        Self::Internal {
            message: format!("Configuration error: {}", message.into()),
        }
    }

    pub fn forbidden(message: impl Into<String>) -> Self {
        Self::Authorization {
            message: message.into(),
        }
    }

    pub fn unauthorized(message: impl Into<String>) -> Self {
        Self::Authentication {
            message: message.into(),
        }
    }

    /// Get HTTP status code for the error
    pub fn status_code(&self) -> u16 {
        match self {
            ContrivanceError::Database { .. } => 500,
            ContrivanceError::Authentication { .. } => 401,
            ContrivanceError::Authorization { .. } => 403,
            ContrivanceError::Validation { .. } => 400,
            ContrivanceError::NotFound { .. } => 404,
            ContrivanceError::Conflict { .. } => 409,
            ContrivanceError::Internal { .. } => 500,
            ContrivanceError::ExternalService { .. } => 502,
            ContrivanceError::RateLimit => 429,
            ContrivanceError::BadRequest { .. } => 400,
            ContrivanceError::ServiceUnavailable { .. } => 503,
            ContrivanceError::WebSocket { .. } => 400,
            ContrivanceError::Serialization { .. } => 500,
        }
    }

    /// Get error code for client identification
    pub fn error_code(&self) -> &'static str {
        match self {
            ContrivanceError::Database { .. } => "DATABASE_ERROR",
            ContrivanceError::Authentication { .. } => "AUTHENTICATION_ERROR",
            ContrivanceError::Authorization { .. } => "AUTHORIZATION_ERROR",
            ContrivanceError::Validation { .. } => "VALIDATION_ERROR",
            ContrivanceError::NotFound { .. } => "NOT_FOUND",
            ContrivanceError::Conflict { .. } => "CONFLICT",
            ContrivanceError::Internal { .. } => "INTERNAL_ERROR",
            ContrivanceError::ExternalService { .. } => "EXTERNAL_SERVICE_ERROR",
            ContrivanceError::RateLimit => "RATE_LIMIT_EXCEEDED",
            ContrivanceError::BadRequest { .. } => "BAD_REQUEST",
            ContrivanceError::ServiceUnavailable { .. } => "SERVICE_UNAVAILABLE",
            ContrivanceError::WebSocket { .. } => "WEBSOCKET_ERROR",
            ContrivanceError::Serialization { .. } => "SERIALIZATION_ERROR",
        }
    }
}

/// Result type alias for convenience
pub type ContrivanceResult<T> = Result<T, ContrivanceError>;

/// Convert from sqlx::Error
impl From<sqlx::Error> for ContrivanceError {
    fn from(err: sqlx::Error) -> Self {
        match err {
            sqlx::Error::RowNotFound => ContrivanceError::not_found("Database record not found"),
            sqlx::Error::Database(db_err) => {
                // Check for common database constraint violations
                if let Some(code) = db_err.code() {
                    match code.as_ref() {
                        "23505" => ContrivanceError::conflict("Unique constraint violation"),
                        "23503" => ContrivanceError::conflict("Foreign key constraint violation"),
                        "23514" => ContrivanceError::validation("Check constraint violation"),
                        _ => ContrivanceError::database(format!("Database error: {}", db_err)),
                    }
                } else {
                    ContrivanceError::database(format!("Database error: {}", db_err))
                }
            }
            _ => ContrivanceError::database(format!("Database error: {}", err)),
        }
    }
}

/// Convert from serde_json::Error
impl From<serde_json::Error> for ContrivanceError {
    fn from(err: serde_json::Error) -> Self {
        ContrivanceError::serialization(format!("JSON serialization error: {}", err))
    }
}

/// Convert from validator::ValidationErrors
impl From<validator::ValidationErrors> for ContrivanceError {
    fn from(err: validator::ValidationErrors) -> Self {
        let messages: Vec<String> = err
            .field_errors()
            .iter()
            .flat_map(|(field, errors)| {
                errors.iter().map(move |error| {
                    format!(
                        "{}: {}",
                        field,
                        error.message.as_ref().unwrap_or(&"validation error".into())
                    )
                })
            })
            .collect();
        
        ContrivanceError::validation(messages.join(", "))
    }
}

/// Convert from jsonwebtoken::errors::Error
impl From<jsonwebtoken::errors::Error> for ContrivanceError {
    fn from(err: jsonwebtoken::errors::Error) -> Self {
        use jsonwebtoken::errors::ErrorKind;
        
        match err.kind() {
            ErrorKind::InvalidToken => ContrivanceError::authentication("Invalid token"),
            ErrorKind::ExpiredSignature => ContrivanceError::authentication("Token expired"),
            ErrorKind::InvalidIssuer => ContrivanceError::authentication("Invalid token issuer"),
            ErrorKind::InvalidAudience => ContrivanceError::authentication("Invalid token audience"),
            ErrorKind::InvalidSubject => ContrivanceError::authentication("Invalid token subject"),
            ErrorKind::ImmatureSignature => ContrivanceError::authentication("Token not yet valid"),
            ErrorKind::InvalidSignature => ContrivanceError::authentication("Invalid token signature"),
            _ => ContrivanceError::authentication(format!("JWT error: {}", err)),
        }
    }
}

/// Convert from reqwest::Error
impl From<reqwest::Error> for ContrivanceError {
    fn from(err: reqwest::Error) -> Self {
        if err.is_timeout() {
            ContrivanceError::external_service("HTTP client", "Request timeout")
        } else if err.is_connect() {
            ContrivanceError::external_service("HTTP client", "Connection failed")
        } else if err.is_decode() {
            ContrivanceError::serialization(format!("Response decode error: {}", err))
        } else {
            ContrivanceError::external_service("HTTP client", format!("Request error: {}", err))
        }
    }
}

/// Error response for API endpoints
#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: String,
    pub error_code: String,
    pub message: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub details: Option<serde_json::Value>,
}

impl ErrorResponse {
    pub fn from_error(error: &ContrivanceError) -> Self {
        Self {
            error: error.to_string(),
            error_code: error.error_code().to_string(),
            message: error.to_string(),
            timestamp: chrono::Utc::now(),
            details: None,
        }
    }

    pub fn with_details(mut self, details: serde_json::Value) -> Self {
        self.details = Some(details);
        self
    }
}

/// Macro for creating validation errors
#[macro_export]
macro_rules! validation_error {
    ($msg:expr) => {
        ContrivanceError::validation($msg)
    };
    ($fmt:expr, $($arg:tt)*) => {
        ContrivanceError::validation(format!($fmt, $($arg)*))
    };
}

/// Macro for creating not found errors
#[macro_export]
macro_rules! not_found {
    ($resource:expr) => {
        ContrivanceError::not_found($resource)
    };
    ($fmt:expr, $($arg:tt)*) => {
        ContrivanceError::not_found(format!($fmt, $($arg)*))
    };
}

/// Macro for creating authentication errors
#[macro_export]
macro_rules! auth_error {
    ($msg:expr) => {
        ContrivanceError::authentication($msg)
    };
    ($fmt:expr, $($arg:tt)*) => {
        ContrivanceError::authentication(format!($fmt, $($arg)*))
    };
}

impl ResponseError for ContrivanceError {
    fn error_response(&self) -> HttpResponse {
        match self {
            ContrivanceError::Authentication { .. } => {
                HttpResponse::Unauthorized().json(serde_json::json!({
                    "error": "Unauthorized",
                    "message": self.to_string()
                }))
            }
            ContrivanceError::Authorization { .. } => {
                HttpResponse::Forbidden().json(serde_json::json!({
                    "error": "Forbidden", 
                    "message": self.to_string()
                }))
            }
            ContrivanceError::Validation { .. } => {
                HttpResponse::BadRequest().json(serde_json::json!({
                    "error": "Validation Error",
                    "message": self.to_string()
                }))
            }
            ContrivanceError::NotFound { .. } => {
                HttpResponse::NotFound().json(serde_json::json!({
                    "error": "Not Found",
                    "message": self.to_string()
                }))
            }
            ContrivanceError::Conflict { .. } => {
                HttpResponse::Conflict().json(serde_json::json!({
                    "error": "Conflict",
                    "message": self.to_string()
                }))
            }
            ContrivanceError::BadRequest { .. } => {
                HttpResponse::BadRequest().json(serde_json::json!({
                    "error": "Bad Request",
                    "message": self.to_string()
                }))
            }
            ContrivanceError::ServiceUnavailable { .. } => {
                HttpResponse::ServiceUnavailable().json(serde_json::json!({
                    "error": "Service Unavailable",
                    "message": self.to_string()
                }))
            }
            _ => {
                HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": "Internal Server Error",
                    "message": self.to_string()
                }))
            }
        }
    }

    fn status_code(&self) -> actix_web::http::StatusCode {
        match self {
            ContrivanceError::Authentication { .. } => actix_web::http::StatusCode::UNAUTHORIZED,
            ContrivanceError::Authorization { .. } => actix_web::http::StatusCode::FORBIDDEN,
            ContrivanceError::Validation { .. } => actix_web::http::StatusCode::BAD_REQUEST,
            ContrivanceError::NotFound { .. } => actix_web::http::StatusCode::NOT_FOUND,
            ContrivanceError::Conflict { .. } => actix_web::http::StatusCode::CONFLICT,
            ContrivanceError::BadRequest { .. } => actix_web::http::StatusCode::BAD_REQUEST,
            ContrivanceError::ServiceUnavailable { .. } => actix_web::http::StatusCode::SERVICE_UNAVAILABLE,
            _ => actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}