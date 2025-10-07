use common::{
    ContrivanceError, ContrivanceResult, User, CreateUserRequest, LoginRequest,
    LoginResponse, UserResponse, JwtService,
};
use common::auth::{PasswordService, SessionService};
use crate::repository::AuthRepository;
use uuid::Uuid;
use validator::Validate;

#[derive(Clone)]
pub struct AuthService {
    repository: AuthRepository,
    jwt_service: JwtService,
}

impl AuthService {
    pub fn new(repository: AuthRepository, jwt_service: JwtService) -> Self {
        Self {
            repository,
            jwt_service,
        }
    }

    /// Register a new user
    pub async fn register(&self, request: CreateUserRequest) -> ContrivanceResult<LoginResponse> {
        // Validate request
        request.validate()?;

        // Check if email already exists
        if self.repository.email_exists(&request.email).await? {
            return Err(ContrivanceError::conflict("Email already exists"));
        }

        // Validate password strength
        PasswordService::validate_password_strength(&request.password)?;

        // Hash password
        let password_hash = PasswordService::hash_password(&request.password)?;

        // Create user
        let user = self.repository.create_user(&request, &password_hash).await?;

        // Create session and tokens
        self.create_login_response(user).await
    }

    /// Login user
    pub async fn login(&self, request: LoginRequest) -> ContrivanceResult<LoginResponse> {
        // Validate request
        request.validate()?;

        // Find user by email
        let user = self.repository
            .find_user_by_email(&request.email)
            .await?
            .ok_or_else(|| ContrivanceError::authentication("Invalid email or password"))?;

        // Verify password
        if !PasswordService::verify_password(&request.password, &user.password_hash)? {
            return Err(ContrivanceError::authentication("Invalid email or password"));
        }

        // Update last login
        self.repository.update_last_login(user.id).await?;

        // Create session and tokens
        self.create_login_response(user).await
    }

    /// Refresh access token
    pub async fn refresh_token(&self, refresh_token: &str) -> ContrivanceResult<LoginResponse> {
        // Verify refresh token
        let claims = self.jwt_service.validate_token(refresh_token)?;
        let session_id = Uuid::parse_str(&claims.jti)
            .map_err(|_| ContrivanceError::authentication("Invalid session ID in token"))?;

        // Find session
        let token_hash = SessionService::generate_session_hash(refresh_token);
        let session = self.repository
            .find_session_by_token_hash(&token_hash)
            .await?
            .ok_or_else(|| ContrivanceError::authentication("Session not found"))?;

        // Check if session is valid
        if !SessionService::is_session_valid(&session) {
            return Err(ContrivanceError::authentication("Session expired or revoked"));
        }

        // Find user
        let user = self.repository
            .find_user_by_id(session.user_id)
            .await?
            .ok_or_else(|| ContrivanceError::authentication("User not found"))?;

        // Revoke old session
        self.repository.revoke_session(session.id).await?;

        // Create new session and tokens
        self.create_login_response(user).await
    }

    /// Validate access token
    pub async fn validate_token(&self, token: &str) -> ContrivanceResult<UserResponse> {
        // Verify token
        let claims = self.jwt_service.validate_token(token)?;
        let user_id = Uuid::parse_str(&claims.sub)
            .map_err(|_| ContrivanceError::authentication("Invalid user ID in token"))?;

        // Find user
        let user = self.repository
            .find_user_by_id(user_id)
            .await?
            .ok_or_else(|| ContrivanceError::authentication("User not found"))?;

        Ok(UserResponse::from(user))
    }

    /// Logout user (revoke session)
    pub async fn logout(&self, token: &str) -> ContrivanceResult<()> {
        // Extract session ID from token
        let session_id = self.jwt_service.extract_session_id(token)?;

        // Revoke session
        self.repository.revoke_session(session_id).await?;

        Ok(())
    }

    /// Logout all sessions for user
    pub async fn logout_all(&self, token: &str) -> ContrivanceResult<()> {
        // Extract user ID from token
        let user_id = self.jwt_service.extract_user_id(token)?;

        // Revoke all sessions
        self.repository.revoke_all_user_sessions(user_id).await?;

        Ok(())
    }

    /// Get user by token
    pub async fn get_user_by_token(&self, token: &str) -> ContrivanceResult<UserResponse> {
        self.validate_token(token).await
    }

    /// Health check
    pub async fn health_check(&self) -> ContrivanceResult<common::HealthResponse> {
        // Test database connection
        let (total_users, active_users) = self.repository.get_user_stats().await?;
        
        Ok(common::HealthResponse {
            status: "healthy".to_string(),
            timestamp: chrono::Utc::now(),
            service: "auth-service".to_string(),
            version: env!("CARGO_PKG_VERSION").to_string(),
            database: Some(format!("Connected - {} total users, {} active", total_users, active_users)),
            dependencies: None,
        })
    }

    /// Cleanup expired sessions (should be called periodically)
    pub async fn cleanup_expired_sessions(&self) -> ContrivanceResult<u64> {
        self.repository.cleanup_expired_sessions().await
    }

    /// Helper method to create login response with tokens
    async fn create_login_response(&self, user: User) -> ContrivanceResult<LoginResponse> {
        let session_id = Uuid::new_v4();
        
        // Create token pair
        let (access_token, refresh_token) = self.jwt_service.create_token_pair(user.id, session_id, "user")?;

        // Create session record
        let refresh_token_hash = SessionService::generate_session_hash(&refresh_token);
        let expires_at = chrono::Utc::now() + chrono::Duration::hours(1);
        let _session = self.repository
            .create_session(user.id, &refresh_token_hash, expires_at)
            .await?;

        Ok(LoginResponse {
            access_token,
            refresh_token,
            user: UserResponse::from(user),
            expires_at,
        })
    }
}