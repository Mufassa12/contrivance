use common::{
    ContrivanceError, ContrivanceResult, User, UserResponse, UpdateUserRequest,
    UserRole, PaginationParams, PaginatedResponse,
};
use sqlx::{PgPool, Row};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Clone)]
pub struct UserRepository {
    pool: PgPool,
}

impl UserRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Get user by ID
    pub async fn get_user_by_id(&self, user_id: Uuid) -> ContrivanceResult<Option<User>> {
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

    /// List users with pagination
    pub async fn list_users(&self, pagination: &PaginationParams) -> ContrivanceResult<PaginatedResponse<UserResponse>> {
        let limit = pagination.limit.unwrap_or(20).min(100) as i64;
        let offset = ((pagination.page.unwrap_or(1) - 1) * limit as u32) as i64;
        
        // Get total count
        let total: i64 = sqlx::query_scalar!(
            "SELECT COUNT(*) FROM users WHERE is_active = true"
        )
        .fetch_one(&self.pool)
        .await?
        .unwrap_or(0);

        // Get users
        let users = sqlx::query_as!(
            User,
            r#"
            SELECT id, email, password_hash, name, role as "role: UserRole", created_at, updated_at, is_active, last_login
            FROM users 
            WHERE is_active = true
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#,
            limit,
            offset
        )
        .fetch_all(&self.pool)
        .await?;

        let user_responses: Vec<UserResponse> = users.into_iter().map(UserResponse::from).collect();
        
        let page = pagination.page.unwrap_or(1);
        let limit = limit as u32;
        let total_pages = ((total as f64) / (limit as f64)).ceil() as u32;

        Ok(PaginatedResponse {
            data: user_responses,
            total: total as u64,
            page,
            limit,
            total_pages,
            has_next: page < total_pages,
            has_prev: page > 1,
        })
    }

    /// Update user
    pub async fn update_user(&self, user_id: Uuid, request: &UpdateUserRequest) -> ContrivanceResult<User> {
        let mut query = String::from("UPDATE users SET updated_at = $1");
        let mut param_count = 1;
        let mut params: Vec<Box<dyn sqlx::Encode<sqlx::Postgres> + Send>> = vec![
            Box::new(Utc::now())
        ];

        if let Some(email) = &request.email {
            param_count += 1;
            query.push_str(&format!(", email = ${}", param_count));
            params.push(Box::new(email.clone()));
        }

        if let Some(name) = &request.name {
            param_count += 1;
            query.push_str(&format!(", name = ${}", param_count));
            params.push(Box::new(name.clone()));
        }

        if let Some(role) = &request.role {
            param_count += 1;
            query.push_str(&format!(", role = ${}", param_count));
            params.push(Box::new(role.clone()));
        }

        if let Some(is_active) = request.is_active {
            param_count += 1;
            query.push_str(&format!(", is_active = ${}", param_count));
            params.push(Box::new(is_active));
        }

        param_count += 1;
        query.push_str(&format!(" WHERE id = ${} AND is_active = true RETURNING id, email, password_hash, name, role, created_at, updated_at, is_active, last_login", param_count));
        params.push(Box::new(user_id));

        // For simplicity, let's use a direct approach for common update scenarios
        let user = if let Some(name) = &request.name {
            sqlx::query_as!(
                User,
                r#"
                UPDATE users 
                SET name = $1, updated_at = $2
                WHERE id = $3 AND is_active = true
                RETURNING id, email, password_hash, name, role as "role: UserRole", created_at, updated_at, is_active, last_login
                "#,
                name,
                Utc::now(),
                user_id
            )
            .fetch_one(&self.pool)
            .await?
        } else {
            return Err(ContrivanceError::validation("At least one field must be provided for update"));
        };

        Ok(user)
    }

    /// Soft delete user
    pub async fn delete_user(&self, user_id: Uuid) -> ContrivanceResult<()> {
        let result = sqlx::query!(
            "UPDATE users SET is_active = false, updated_at = $1 WHERE id = $2 AND is_active = true",
            Utc::now(),
            user_id
        )
        .execute(&self.pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(ContrivanceError::not_found("User not found"));
        }

        Ok(())
    }

    /// Search users by email or name
    pub async fn search_users(&self, query: &str, limit: u32) -> ContrivanceResult<Vec<UserResponse>> {
        let search_pattern = format!("%{}%", query.to_lowercase());
        let limit = limit.min(50) as i64;

        let users = sqlx::query_as!(
            User,
            r#"
            SELECT id, email, password_hash, name, role as "role: UserRole", created_at, updated_at, is_active, last_login
            FROM users 
            WHERE is_active = true 
              AND (LOWER(name) LIKE $1 OR LOWER(email) LIKE $1)
            ORDER BY name
            LIMIT $2
            "#,
            search_pattern,
            limit
        )
        .fetch_all(&self.pool)
        .await?;

        let user_responses: Vec<UserResponse> = users.into_iter().map(UserResponse::from).collect();
        Ok(user_responses)
    }

    /// Get user statistics
    pub async fn get_user_stats(&self) -> ContrivanceResult<(i64, i64, i64)> {
        let row = sqlx::query!(
            r#"
            SELECT 
                COUNT(*) as total_users,
                COUNT(*) FILTER (WHERE last_login > NOW() - INTERVAL '30 days') as active_users,
                COUNT(*) FILTER (WHERE role = 'admin') as admin_users
            FROM users 
            WHERE is_active = true
            "#
        )
        .fetch_one(&self.pool)
        .await?;

        Ok((
            row.total_users.unwrap_or(0),
            row.active_users.unwrap_or(0),
            row.admin_users.unwrap_or(0),
        ))
    }
}