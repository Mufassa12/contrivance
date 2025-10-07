use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

/// Utility functions for common operations

/// Generate a random UUID as string
pub fn generate_id() -> String {
    Uuid::new_v4().to_string()
}

/// Get current timestamp
pub fn current_timestamp() -> DateTime<Utc> {
    Utc::now()
}

/// Format timestamp for display
pub fn format_timestamp(timestamp: DateTime<Utc>, format: Option<&str>) -> String {
    let format_str = format.unwrap_or("%Y-%m-%d %H:%M:%S UTC");
    timestamp.format(format_str).to_string()
}

/// Validate email format
pub fn is_valid_email(email: &str) -> bool {
    use regex::Regex;
    let email_regex = Regex::new(r"^[^\s@]+@[^\s@]+\.[^\s@]+$").unwrap();
    email_regex.is_match(email)
}

/// Sanitize string input (remove potentially harmful characters)
pub fn sanitize_string(input: &str) -> String {
    input
        .chars()
        .filter(|c| c.is_alphanumeric() || " .-_@".contains(*c))
        .collect()
}

/// Truncate string to specified length with ellipsis
pub fn truncate_string(input: &str, max_length: usize) -> String {
    if input.len() <= max_length {
        input.to_string()
    } else {
        format!("{}...", &input[..max_length.saturating_sub(3)])
    }
}

/// Convert snake_case to Title Case
pub fn snake_to_title_case(snake_str: &str) -> String {
    snake_str
        .split('_')
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                None => String::new(),
                Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

/// Convert Title Case to snake_case
pub fn title_to_snake_case(title_str: &str) -> String {
    title_str
        .split_whitespace()
        .map(|word| word.to_lowercase())
        .collect::<Vec<_>>()
        .join("_")
}

/// Environment variable utilities
pub struct EnvUtils;

impl EnvUtils {
    /// Get environment variable with default value
    pub fn get_var(key: &str, default: &str) -> String {
        std::env::var(key).unwrap_or_else(|_| default.to_string())
    }

    /// Get environment variable as integer with default
    pub fn get_var_as_int(key: &str, default: i32) -> i32 {
        std::env::var(key)
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(default)
    }

    /// Get environment variable as boolean with default
    pub fn get_var_as_bool(key: &str, default: bool) -> bool {
        match std::env::var(key).as_deref() {
            Ok("true") | Ok("1") | Ok("yes") | Ok("on") => true,
            Ok("false") | Ok("0") | Ok("no") | Ok("off") => false,
            _ => default,
        }
    }

    /// Get required environment variable or panic
    pub fn require_var(key: &str) -> String {
        std::env::var(key).unwrap_or_else(|_| panic!("Environment variable {} is required", key))
    }

    /// Load environment variables from .env file
    pub fn load_dotenv() -> Result<(), Box<dyn std::error::Error>> {
        if std::path::Path::new(".env").exists() {
            for line in std::fs::read_to_string(".env")?.lines() {
                if let Some((key, value)) = parse_env_line(line) {
                    std::env::set_var(key, value);
                }
            }
        }
        Ok(())
    }
}

/// Parse a line from .env file
fn parse_env_line(line: &str) -> Option<(String, String)> {
    let line = line.trim();
    if line.is_empty() || line.starts_with('#') {
        return None;
    }

    if let Some((key, value)) = line.split_once('=') {
        let key = key.trim().to_string();
        let value = value.trim().trim_matches('"').to_string();
        Some((key, value))
    } else {
        None
    }
}

/// HTTP utilities
pub struct HttpUtils;

impl HttpUtils {
    /// Create a basic HTTP client with timeout
    pub fn create_client(timeout_seconds: u64) -> reqwest::Client {
        reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(timeout_seconds))
            .build()
            .expect("Failed to create HTTP client")
    }

    /// Extract bearer token from authorization header
    pub fn extract_bearer_token(auth_header: &str) -> Option<String> {
        if auth_header.starts_with("Bearer ") {
            Some(auth_header[7..].to_string())
        } else {
            None
        }
    }

    /// Create authorization header with bearer token
    pub fn create_bearer_header(token: &str) -> String {
        format!("Bearer {}", token)
    }
}

/// JSON utilities
pub struct JsonUtils;

impl JsonUtils {
    /// Safely parse JSON string
    pub fn parse<T>(json_str: &str) -> Result<T, serde_json::Error>
    where
        T: for<'de> Deserialize<'de>,
    {
        serde_json::from_str(json_str)
    }

    /// Safely serialize to JSON string
    pub fn stringify<T>(value: &T) -> Result<String, serde_json::Error>
    where
        T: Serialize,
    {
        serde_json::to_string(value)
    }

    /// Pretty print JSON
    pub fn pretty_print<T>(value: &T) -> Result<String, serde_json::Error>
    where
        T: Serialize,
    {
        serde_json::to_string_pretty(value)
    }

    /// Merge two JSON values
    pub fn merge_json_values(
        base: &mut serde_json::Value,
        update: &serde_json::Value,
    ) -> Result<(), Box<dyn std::error::Error>> {
        match (base.as_object_mut(), update.as_object()) {
            (Some(base_map), Some(update_map)) => {
                for (key, value) in update_map {
                    if let Some(base_value) = base_map.get_mut(key) {
                        Self::merge_json_values(base_value, value)?;
                    } else {
                        base_map.insert(key.clone(), value.clone());
                    }
                }
            }
            _ => {
                *base = update.clone();
            }
        }
        Ok(())
    }
}

/// Validation utilities
pub struct ValidationUtils;

impl ValidationUtils {
    /// Validate spreadsheet name
    pub fn validate_spreadsheet_name(name: &str) -> Result<(), String> {
        if name.trim().is_empty() {
            return Err("Spreadsheet name cannot be empty".to_string());
        }
        
        if name.len() > 255 {
            return Err("Spreadsheet name cannot exceed 255 characters".to_string());
        }

        Ok(())
    }

    /// Validate column name
    pub fn validate_column_name(name: &str) -> Result<(), String> {
        if name.trim().is_empty() {
            return Err("Column name cannot be empty".to_string());
        }
        
        if name.len() > 100 {
            return Err("Column name cannot exceed 100 characters".to_string());
        }

        // Check for reserved SQL keywords
        let reserved_words = vec!["SELECT", "FROM", "WHERE", "INSERT", "UPDATE", "DELETE", "CREATE", "DROP"];
        if reserved_words.contains(&name.to_uppercase().as_str()) {
            return Err(format!("'{}' is a reserved keyword and cannot be used as column name", name));
        }

        Ok(())
    }

    /// Validate UUID string
    pub fn validate_uuid(uuid_str: &str) -> Result<Uuid, String> {
        Uuid::parse_str(uuid_str).map_err(|_| "Invalid UUID format".to_string())
    }

    /// Validate pagination parameters
    pub fn validate_pagination(page: Option<u32>, limit: Option<u32>) -> Result<(u32, u32), String> {
        let page = page.unwrap_or(1);
        let limit = limit.unwrap_or(20);

        if page < 1 {
            return Err("Page must be at least 1".to_string());
        }

        if limit < 1 || limit > 100 {
            return Err("Limit must be between 1 and 100".to_string());
        }

        Ok((page, limit))
    }
}

/// Rate limiting utilities
pub struct RateLimitUtils;

impl RateLimitUtils {
    /// Create a simple in-memory rate limiter key
    pub fn create_key(identifier: &str, action: &str) -> String {
        format!("{}:{}", identifier, action)
    }

    /// Check if rate limit should be applied based on user role
    pub fn should_apply_rate_limit(role: &crate::models::UserRole) -> bool {
        match role {
            crate::models::UserRole::Admin => false, // Admins bypass rate limiting
            crate::models::UserRole::User => true,
        }
    }
}

/// Cache utilities
#[derive(Debug, Clone)]
pub struct CacheEntry<T> {
    pub value: T,
    pub expires_at: DateTime<Utc>,
}

impl<T> CacheEntry<T> {
    pub fn new(value: T, ttl_seconds: u64) -> Self {
        Self {
            value,
            expires_at: Utc::now() + chrono::Duration::seconds(ttl_seconds as i64),
        }
    }

    pub fn is_expired(&self) -> bool {
        Utc::now() > self.expires_at
    }
}

pub struct InMemoryCache<T> {
    store: std::sync::RwLock<HashMap<String, CacheEntry<T>>>,
}

impl<T: Clone> InMemoryCache<T> {
    pub fn new() -> Self {
        Self {
            store: std::sync::RwLock::new(HashMap::new()),
        }
    }

    pub fn get(&self, key: &str) -> Option<T> {
        let store = self.store.read().ok()?;
        let entry = store.get(key)?;
        
        if entry.is_expired() {
            drop(store);
            self.remove(key);
            None
        } else {
            Some(entry.value.clone())
        }
    }

    pub fn set(&self, key: String, value: T, ttl_seconds: u64) {
        if let Ok(mut store) = self.store.write() {
            store.insert(key, CacheEntry::new(value, ttl_seconds));
        }
    }

    pub fn remove(&self, key: &str) {
        if let Ok(mut store) = self.store.write() {
            store.remove(key);
        }
    }

    pub fn clear(&self) {
        if let Ok(mut store) = self.store.write() {
            store.clear();
        }
    }

    pub fn cleanup_expired(&self) {
        if let Ok(mut store) = self.store.write() {
            store.retain(|_, entry| !entry.is_expired());
        }
    }
}

impl<T: Clone> Default for InMemoryCache<T> {
    fn default() -> Self {
        Self::new()
    }
}

/// File utilities
pub struct FileUtils;

impl FileUtils {
    /// Ensure directory exists
    pub async fn ensure_dir_exists(path: &std::path::Path) -> Result<(), std::io::Error> {
        if !path.exists() {
            tokio::fs::create_dir_all(path).await?;
        }
        Ok(())
    }

    /// Read file contents as string
    pub async fn read_to_string(path: &std::path::Path) -> Result<String, std::io::Error> {
        tokio::fs::read_to_string(path).await
    }

    /// Write string to file
    pub async fn write_string(path: &std::path::Path, content: &str) -> Result<(), std::io::Error> {
        if let Some(parent) = path.parent() {
            Self::ensure_dir_exists(parent).await?;
        }
        tokio::fs::write(path, content).await
    }

    /// Get file extension
    pub fn get_extension(path: &std::path::Path) -> Option<String> {
        path.extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext.to_lowercase())
    }

    /// Generate safe filename
    pub fn safe_filename(name: &str) -> String {
        name.chars()
            .map(|c| if c.is_alphanumeric() || c == '.' || c == '-' || c == '_' { c } else { '_' })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_email_validation() {
        assert!(is_valid_email("test@example.com"));
        assert!(is_valid_email("user.name+tag@domain.co.uk"));
        assert!(!is_valid_email("invalid-email"));
        assert!(!is_valid_email("@domain.com"));
        assert!(!is_valid_email("user@"));
    }

    #[test]
    fn test_string_utils() {
        assert_eq!(snake_to_title_case("hello_world"), "Hello World");
        assert_eq!(title_to_snake_case("Hello World"), "hello_world");
        assert_eq!(truncate_string("Hello, World!", 10), "Hello, W...");
        assert_eq!(truncate_string("Short", 10), "Short");
    }

    #[test]
    fn test_sanitize_string() {
        assert_eq!(sanitize_string("Hello, World!@#$%"), "Hello World@");
        assert_eq!(sanitize_string("user@domain.com"), "user@domain.com");
    }

    #[test]
    fn test_validation_utils() {
        assert!(ValidationUtils::validate_spreadsheet_name("Valid Name").is_ok());
        assert!(ValidationUtils::validate_spreadsheet_name("").is_err());
        assert!(ValidationUtils::validate_column_name("column_name").is_ok());
        assert!(ValidationUtils::validate_column_name("SELECT").is_err());
    }

    #[test]
    fn test_cache() {
        let cache = InMemoryCache::new();
        cache.set("key1".to_string(), "value1".to_string(), 60);
        
        assert_eq!(cache.get("key1"), Some("value1".to_string()));
        assert_eq!(cache.get("nonexistent"), None);
        
        cache.remove("key1");
        assert_eq!(cache.get("key1"), None);
    }
}