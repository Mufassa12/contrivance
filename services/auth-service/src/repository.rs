use common::{
    ContrivanceError, ContrivanceResult, User, UserSession, CreateUserRequest, LoginRequest,
    UserRole,
};
use sqlx::{PgPool, Row};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Clone)]
pub struct AuthRepository {
    pool: PgPool,
}

impl AuthRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Create a new user
    pub async fn create_user(&self, request: &CreateUserRequest, password_hash: &str) -> ContrivanceResult<User> {
        let user_id = Uuid::new_v4();
        let role = request.role.as_ref().unwrap_or(&UserRole::User);
        
        let user = sqlx::query_as!(
            User,
            r#"
            INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, email, password_hash, name, role as "role: UserRole", created_at, updated_at, is_active, last_login
            "#,
            user_id,
            request.email,
            password_hash,
            request.name,
            role as &UserRole,
            Utc::now(),
            Utc::now(),
            true
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(user)
    }

    /// Find user by email
    pub async fn find_user_by_email(&self, email: &str) -> ContrivanceResult<Option<User>> {
        let user = sqlx::query_as!(
            User,
            r#"
            SELECT id, email, password_hash, name, role as "role: UserRole", created_at, updated_at, is_active, last_login
            FROM users 
            WHERE email = $1 AND is_active = true
            "#,
            email
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(user)
    }

    /// Find user by ID
    pub async fn find_user_by_id(&self, user_id: Uuid) -> ContrivanceResult<Option<User>> {
        let user = sqlx::query_as!(
            User,
            r#"
            SELECT id, email, password_hash, name, role as "role: UserRole", created_at, updated_at, is_active, last_login
            FROM users 
            WHERE id = $1 AND is_active = true
            "#,
            user_id
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(user)
    }

    /// Update user's last login timestamp
    pub async fn update_last_login(&self, user_id: Uuid) -> ContrivanceResult<()> {
        sqlx::query!(
            "UPDATE users SET last_login = $1 WHERE id = $2",
            Utc::now(),
            user_id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Create a new user session
    pub async fn create_session(&self, user_id: Uuid, token_hash: &str, expires_at: DateTime<Utc>) -> ContrivanceResult<UserSession> {
        let session_id = Uuid::new_v4();
        
        let session = sqlx::query_as!(
            UserSession,
            r#"
            INSERT INTO user_sessions (id, user_id, token_hash, expires_at, created_at, is_revoked)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, user_id, token_hash, expires_at, created_at, is_revoked
            "#,
            session_id,
            user_id,
            token_hash,
            expires_at,
            Utc::now(),
            false
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(session)
    }

    /// Find session by token hash
    pub async fn find_session_by_token_hash(&self, token_hash: &str) -> ContrivanceResult<Option<UserSession>> {
        let session = sqlx::query_as!(
            UserSession,
            "SELECT id, user_id, token_hash, expires_at, created_at, is_revoked FROM user_sessions WHERE token_hash = $1",
            token_hash
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(session)
    }

    /// Revoke session
    pub async fn revoke_session(&self, session_id: Uuid) -> ContrivanceResult<()> {
        sqlx::query!(
            "UPDATE user_sessions SET is_revoked = true WHERE id = $1",
            session_id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Revoke all sessions for a user
    pub async fn revoke_all_user_sessions(&self, user_id: Uuid) -> ContrivanceResult<()> {
        sqlx::query!(
            "UPDATE user_sessions SET is_revoked = true WHERE user_id = $1",
            user_id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Clean up expired sessions
    pub async fn cleanup_expired_sessions(&self) -> ContrivanceResult<u64> {
        let result = sqlx::query!(
            "DELETE FROM user_sessions WHERE expires_at < $1 OR is_revoked = true",
            Utc::now()
        )
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected())
    }

    /// Check if email already exists
    pub async fn email_exists(&self, email: &str) -> ContrivanceResult<bool> {
        let count: i64 = sqlx::query_scalar!(
            "SELECT COUNT(*) FROM users WHERE email = $1",
            email
        )
        .fetch_one(&self.pool)
        .await?
        .unwrap_or(0);

        Ok(count > 0)
    }

    /// Get user statistics
    pub async fn get_user_stats(&self) -> ContrivanceResult<(i64, i64)> {
        let row = sqlx::query!(
            r#"
            SELECT 
                COUNT(*) as total_users,
                COUNT(*) FILTER (WHERE last_login > NOW() - INTERVAL '30 days') as active_users
            FROM users 
            WHERE is_active = true
            "#
        )
        .fetch_one(&self.pool)
        .await?;

        Ok((
            row.total_users.unwrap_or(0),
            row.active_users.unwrap_or(0)
        ))
    }
}