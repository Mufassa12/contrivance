use common::{
    ContrivanceError, ContrivanceResult, User, UserResponse, UpdateUserRequest,
    PaginationParams, PaginatedResponse, HealthResponse, ApiResponse,
};
use crate::repository::UserRepository;
use uuid::Uuid;
use validator::Validate;

#[derive(Clone)]
pub struct UserService {
    repository: UserRepository,
    http_client: reqwest::Client,
    auth_service_url: String,
}

impl UserService {
    pub fn new(
        repository: UserRepository,
        http_client: reqwest::Client,
        auth_service_url: String,
    ) -> Self {
        Self {
            repository,
            http_client,
            auth_service_url,
        }
    }

    /// Get user by ID
    pub async fn get_user(&self, user_id: Uuid, requesting_user_id: Uuid) -> ContrivanceResult<UserResponse> {
        // Users can view their own profile, admins can view any profile
        let requesting_user = self.repository.get_user_by_id(requesting_user_id).await?
            .ok_or_else(|| ContrivanceError::authentication("Requesting user not found"))?;

        if user_id != requesting_user_id && requesting_user.role != common::UserRole::Admin {
            return Err(ContrivanceError::authorization("Insufficient permissions"));
        }

        let user = self.repository
            .get_user_by_id(user_id)
            .await?
            .ok_or_else(|| ContrivanceError::not_found("User not found"))?;

        Ok(UserResponse::from(user))
    }

    /// List users with pagination (for todo assignment)
    pub async fn list_users(
        &self,
        pagination: PaginationParams,
        requesting_user_id: Uuid,
    ) -> ContrivanceResult<PaginatedResponse<UserResponse>> {
        // Verify requesting user exists (basic authentication check)
        let _requesting_user = self.repository.get_user_by_id(requesting_user_id).await?
            .ok_or_else(|| ContrivanceError::authentication("Requesting user not found"))?;

        // All authenticated users can see the user list for todo assignment purposes
        self.repository.list_users(&pagination).await
    }

    /// Update user
    pub async fn update_user(
        &self,
        user_id: Uuid,
        request: UpdateUserRequest,
        requesting_user_id: Uuid,
    ) -> ContrivanceResult<UserResponse> {
        // Validate request
        request.validate()?;

        // Check permissions
        let requesting_user = self.repository.get_user_by_id(requesting_user_id).await?
            .ok_or_else(|| ContrivanceError::authentication("Requesting user not found"))?;

        // Users can update their own profile (except role), admins can update any profile
        if user_id != requesting_user_id {
            if requesting_user.role != common::UserRole::Admin {
                return Err(ContrivanceError::authorization("Insufficient permissions"));
            }
        } else {
            // Non-admins cannot change their own role
            if request.role.is_some() && requesting_user.role != common::UserRole::Admin {
                return Err(ContrivanceError::authorization("Cannot change own role"));
            }
        }

        // Check if user exists
        let _existing_user = self.repository
            .get_user_by_id(user_id)
            .await?
            .ok_or_else(|| ContrivanceError::not_found("User not found"))?;

        // Update user
        let updated_user = self.repository.update_user(user_id, &request).await?;
        Ok(UserResponse::from(updated_user))
    }

    /// Delete user (admin only)
    pub async fn delete_user(&self, user_id: Uuid, requesting_user_id: Uuid) -> ContrivanceResult<()> {
        // Check if requesting user is admin
        let requesting_user = self.repository.get_user_by_id(requesting_user_id).await?
            .ok_or_else(|| ContrivanceError::authentication("Requesting user not found"))?;

        if requesting_user.role != common::UserRole::Admin {
            return Err(ContrivanceError::authorization("Admin access required"));
        }

        // Cannot delete self
        if user_id == requesting_user_id {
            return Err(ContrivanceError::validation("Cannot delete own account"));
        }

        self.repository.delete_user(user_id).await
    }

    /// Search users
    pub async fn search_users(
        &self,
        query: &str,
        limit: u32,
        requesting_user_id: Uuid,
    ) -> ContrivanceResult<Vec<UserResponse>> {
        // Check if requesting user exists
        let _requesting_user = self.repository.get_user_by_id(requesting_user_id).await?
            .ok_or_else(|| ContrivanceError::authentication("Requesting user not found"))?;

        if query.trim().is_empty() {
            return Err(ContrivanceError::validation("Search query cannot be empty"));
        }

        self.repository.search_users(query, limit).await
    }

    /// Validate token with auth service
    pub async fn validate_token(&self, token: &str) -> ContrivanceResult<UserResponse> {
        let url = format!("{}/validate", self.auth_service_url);
        
        let response = self.http_client
            .get(&url)
            .header("Authorization", format!("Bearer {}", token))
            .send()
            .await
            .map_err(|e| ContrivanceError::external_service("auth-service", e.to_string()))?;

        if !response.status().is_success() {
            return Err(ContrivanceError::authentication("Invalid token"));
        }

        let api_response: ApiResponse<UserResponse> = response
            .json()
            .await
            .map_err(|e| ContrivanceError::serialization(e.to_string()))?;

        api_response.data
            .ok_or_else(|| ContrivanceError::authentication("Invalid token response"))
    }

    /// Health check
    pub async fn health_check(&self) -> ContrivanceResult<HealthResponse> {
        // Test database connection
        let (total_users, active_users, admin_users) = self.repository.get_user_stats().await?;
        
        // Test auth service connection
        let auth_health = self.check_auth_service_health().await;
        
        let dependencies = vec![
            common::DependencyHealth {
                name: "auth-service".to_string(),
                status: if auth_health.is_ok() { "healthy".to_string() } else { "unhealthy".to_string() },
                response_time_ms: None,
            }
        ];

        Ok(HealthResponse {
            status: "healthy".to_string(),
            timestamp: chrono::Utc::now(),
            service: "user-service".to_string(),
            version: env!("CARGO_PKG_VERSION").to_string(),
            database: Some(format!(
                "Connected - {} total, {} active, {} admin users", 
                total_users, active_users, admin_users
            )),
            dependencies: Some(dependencies),
        })
    }

    /// Check auth service health
    async fn check_auth_service_health(&self) -> ContrivanceResult<()> {
        let url = format!("{}/health", self.auth_service_url);
        
        let response = self.http_client
            .get(&url)
            .timeout(std::time::Duration::from_secs(5))
            .send()
            .await
            .map_err(|e| ContrivanceError::external_service("auth-service", e.to_string()))?;

        if response.status().is_success() {
            Ok(())
        } else {
            Err(ContrivanceError::external_service(
                "auth-service",
                format!("HTTP {}", response.status()),
            ))
        }
    }
}