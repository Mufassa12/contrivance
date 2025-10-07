use common::{
    ContrivanceError, ContrivanceResult, Spreadsheet, SpreadsheetColumn, SpreadsheetRow,
    SpreadsheetCollaborator, SpreadsheetDetails, CreateSpreadsheetRequest, UpdateSpreadsheetRequest,
    CreateColumnRequest, CreateRowRequest, UpdateRowRequest, AddCollaboratorRequest,
    UserResponse, PermissionLevel, PaginationParams, PaginatedResponse,
};
use sqlx::{PgPool, Row};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Clone)]
pub struct ContrivanceRepository {
    pool: PgPool,
}

impl ContrivanceRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Create a new spreadsheet
    pub async fn create_spreadsheet(
        &self, 
        request: &CreateSpreadsheetRequest, 
        owner_id: Uuid
    ) -> ContrivanceResult<Spreadsheet> {
        let spreadsheet_id = Uuid::new_v4();
        let now = Utc::now();
        
        let mut tx = self.pool.begin().await?;

        // Create spreadsheet
        let spreadsheet = sqlx::query_as!(
            Spreadsheet,
            r#"
            INSERT INTO spreadsheets (id, name, description, owner_id, created_at, updated_at, is_public, settings)
            VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, '{}'::jsonb))
            RETURNING id, name, description, owner_id, created_at, updated_at, is_public, settings
            "#,
            spreadsheet_id,
            request.name,
            request.description,
            owner_id,
            now,
            now,
            request.is_public.unwrap_or(false),
            request.settings.as_ref()
        )
        .fetch_one(&mut *tx)
        .await?;

        // Create default columns if provided
        if let Some(columns) = &request.columns {
            for column_request in columns.iter() {
                let column_id = Uuid::new_v4();
                sqlx::query!(
                    r#"
                    INSERT INTO spreadsheet_columns 
                    (id, spreadsheet_id, name, column_type, position, is_required, default_value, validation_rules, display_options, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, '{}'::jsonb), COALESCE($9, '{}'::jsonb), $10, $11)
                    "#,
                    column_id,
                    spreadsheet_id,
                    column_request.name,
                    column_request.column_type.clone() as common::ColumnType,
                    column_request.position,
                    column_request.is_required.unwrap_or(false),
                    column_request.default_value,
                    column_request.validation_rules.as_ref(),
                    column_request.display_options.as_ref(),
                    now,
                    now
                )
                .execute(&mut *tx)
                .await?;
            }
        }

        tx.commit().await?;
        Ok(spreadsheet)
    }

    /// Get spreadsheet by ID
    pub async fn get_spreadsheet(&self, spreadsheet_id: Uuid) -> ContrivanceResult<Option<Spreadsheet>> {
        let spreadsheet = sqlx::query_as!(
            Spreadsheet,
            "SELECT id, name, description, owner_id, created_at, updated_at, is_public, settings FROM spreadsheets WHERE id = $1",
            spreadsheet_id
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(spreadsheet)
    }

    /// Get spreadsheet with full details (columns, rows, collaborators)
    pub async fn get_spreadsheet_details(&self, spreadsheet_id: Uuid) -> ContrivanceResult<Option<SpreadsheetDetails>> {
        // Get spreadsheet
        let spreadsheet = match self.get_spreadsheet(spreadsheet_id).await? {
            Some(s) => s,
            None => return Ok(None),
        };

        // Get owner info
        let owner = sqlx::query_as!(
            common::User,
            r#"
            SELECT id, email, password_hash, name, role as "role: common::UserRole", created_at, updated_at, is_active, last_login
            FROM users WHERE id = $1
            "#,
            spreadsheet.owner_id
        )
        .fetch_one(&self.pool)
        .await?;

        // Get columns
        let columns = self.get_spreadsheet_columns(spreadsheet_id).await?;

        // Get rows
        let rows = self.get_spreadsheet_rows(spreadsheet_id, None).await?;

        // Get collaborators
        let collaborators = self.get_collaborators_with_user_info(spreadsheet_id).await?;

        Ok(Some(SpreadsheetDetails {
            spreadsheet,
            columns,
            rows,
            collaborators,
            owner: UserResponse::from(owner),
        }))
    }

    /// List spreadsheets for a user
    pub async fn list_spreadsheets(
        &self, 
        user_id: Uuid, 
        pagination: &PaginationParams
    ) -> ContrivanceResult<PaginatedResponse<Spreadsheet>> {
        let limit = pagination.limit.unwrap_or(20).min(100) as i64;
        let offset = ((pagination.page.unwrap_or(1) - 1) * limit as u32) as i64;

        // Get total count
        let total: i64 = sqlx::query_scalar!(
            r#"
            SELECT COUNT(DISTINCT s.id) 
            FROM spreadsheets s
            LEFT JOIN spreadsheet_collaborators sc ON s.id = sc.spreadsheet_id
            WHERE s.owner_id = $1 
               OR s.is_public = true 
               OR (sc.user_id = $1 AND sc.accepted_at IS NOT NULL)
            "#,
            user_id
        )
        .fetch_one(&self.pool)
        .await?
        .unwrap_or(0);

        // Get spreadsheets
        let spreadsheets = sqlx::query_as!(
            Spreadsheet,
            r#"
            SELECT DISTINCT s.id, s.name, s.description, s.owner_id, s.created_at, s.updated_at, s.is_public, s.settings
            FROM spreadsheets s
            LEFT JOIN spreadsheet_collaborators sc ON s.id = sc.spreadsheet_id
            WHERE s.owner_id = $1 
               OR s.is_public = true 
               OR (sc.user_id = $1 AND sc.accepted_at IS NOT NULL)
            ORDER BY s.updated_at DESC
            LIMIT $2 OFFSET $3
            "#,
            user_id,
            limit,
            offset
        )
        .fetch_all(&self.pool)
        .await?;

        let page = pagination.page.unwrap_or(1);
        let limit = limit as u32;
        let total_pages = ((total as f64) / (limit as f64)).ceil() as u32;

        Ok(PaginatedResponse {
            data: spreadsheets,
            total: total as u64,
            page,
            limit,
            total_pages,
            has_next: page < total_pages,
            has_prev: page > 1,
        })
    }

    /// Update spreadsheet
    pub async fn update_spreadsheet(
        &self, 
        spreadsheet_id: Uuid, 
        request: &UpdateSpreadsheetRequest
    ) -> ContrivanceResult<Spreadsheet> {
        let now = Utc::now();
        
        // Build dynamic update query
        let mut set_clauses = vec!["updated_at = $1".to_string()];
        let mut param_count = 1;
        let mut bind_values: Vec<Box<dyn sqlx::Encode<sqlx::Postgres> + Send>> = vec![Box::new(now)];

        if let Some(name) = &request.name {
            param_count += 1;
            set_clauses.push(format!("name = ${}", param_count));
            bind_values.push(Box::new(name.clone()));
        }

        if let Some(description) = &request.description {
            param_count += 1; 
            set_clauses.push(format!("description = ${}", param_count));
            bind_values.push(Box::new(description.clone()));
        }

        if let Some(is_public) = request.is_public {
            param_count += 1;
            set_clauses.push(format!("is_public = ${}", param_count));
            bind_values.push(Box::new(is_public));
        }

        if let Some(settings) = &request.settings {
            param_count += 1;
            set_clauses.push(format!("settings = ${}", param_count));
            bind_values.push(Box::new(settings.clone()));
        }

        param_count += 1;
        let where_clause = format!("WHERE id = ${}", param_count);
        bind_values.push(Box::new(spreadsheet_id));

        // For simplicity, handle the most common case
        if let Some(name) = &request.name {
            let spreadsheet = sqlx::query_as!(
                Spreadsheet,
                "UPDATE spreadsheets SET name = $1, updated_at = $2 WHERE id = $3 RETURNING id, name, description, owner_id, created_at, updated_at, is_public, settings",
                name,
                now,
                spreadsheet_id
            )
            .fetch_one(&self.pool)
            .await?;
            
            return Ok(spreadsheet);
        }

        Err(ContrivanceError::validation("At least one field must be provided for update"))
    }

    /// Delete spreadsheet
    pub async fn delete_spreadsheet(&self, spreadsheet_id: Uuid) -> ContrivanceResult<()> {
        let result = sqlx::query!(
            "DELETE FROM spreadsheets WHERE id = $1",
            spreadsheet_id
        )
        .execute(&self.pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(ContrivanceError::not_found("Spreadsheet not found"));
        }

        Ok(())
    }

    /// Get spreadsheet columns
    pub async fn get_spreadsheet_columns(&self, spreadsheet_id: Uuid) -> ContrivanceResult<Vec<SpreadsheetColumn>> {
        let columns = sqlx::query_as!(
            SpreadsheetColumn,
            r#"
            SELECT id, spreadsheet_id, name, column_type as "column_type: common::ColumnType", position, is_required, default_value, validation_rules, display_options, created_at, updated_at
            FROM spreadsheet_columns 
            WHERE spreadsheet_id = $1 
            ORDER BY position
            "#,
            spreadsheet_id
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(columns)
    }

    /// Get spreadsheet rows
    pub async fn get_spreadsheet_rows(
        &self, 
        spreadsheet_id: Uuid, 
        pagination: Option<&PaginationParams>
    ) -> ContrivanceResult<Vec<SpreadsheetRow>> {
        let (limit, offset) = if let Some(p) = pagination {
            let limit = p.limit.unwrap_or(1000).min(1000) as i64;
            let offset = ((p.page.unwrap_or(1) - 1) * limit as u32) as i64;
            (Some(limit), Some(offset))
        } else {
            (None, None)
        };

        let rows = if let (Some(limit), Some(offset)) = (limit, offset) {
            sqlx::query_as!(
                SpreadsheetRow,
                "SELECT id, spreadsheet_id, row_data, position, created_at, updated_at, created_by, updated_by FROM spreadsheet_rows WHERE spreadsheet_id = $1 ORDER BY position LIMIT $2 OFFSET $3",
                spreadsheet_id,
                limit,
                offset
            )
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query_as!(
                SpreadsheetRow,
                "SELECT id, spreadsheet_id, row_data, position, created_at, updated_at, created_by, updated_by FROM spreadsheet_rows WHERE spreadsheet_id = $1 ORDER BY position",
                spreadsheet_id
            )
            .fetch_all(&self.pool)
            .await?
        };

        Ok(rows)
    }

    /// Create spreadsheet row
    pub async fn create_row(
        &self, 
        spreadsheet_id: Uuid, 
        request: &CreateRowRequest, 
        user_id: Uuid
    ) -> ContrivanceResult<SpreadsheetRow> {
        let row_id = Uuid::new_v4();
        let now = Utc::now();
        
        // Get next position if not specified
        let position = if let Some(pos) = request.position {
            pos
        } else {
            let max_position: Option<i32> = sqlx::query_scalar!(
                "SELECT MAX(position) FROM spreadsheet_rows WHERE spreadsheet_id = $1",
                spreadsheet_id
            )
            .fetch_one(&self.pool)
            .await?;
            
            max_position.unwrap_or(0) + 1
        };

        let row = sqlx::query_as!(
            SpreadsheetRow,
            "INSERT INTO spreadsheet_rows (id, spreadsheet_id, row_data, position, created_at, updated_at, created_by, updated_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, spreadsheet_id, row_data, position, created_at, updated_at, created_by, updated_by",
            row_id,
            spreadsheet_id,
            request.row_data,
            position,
            now,
            now,
            user_id,
            user_id
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(row)
    }

    /// Update spreadsheet row
    pub async fn update_row(
        &self, 
        row_id: Uuid, 
        request: &UpdateRowRequest, 
        user_id: Uuid
    ) -> ContrivanceResult<SpreadsheetRow> {
        let now = Utc::now();

        if let Some(row_data) = &request.row_data {
            let row = sqlx::query_as!(
                SpreadsheetRow,
                "UPDATE spreadsheet_rows SET row_data = $1, updated_at = $2, updated_by = $3 WHERE id = $4 RETURNING id, spreadsheet_id, row_data, position, created_at, updated_at, created_by, updated_by",
                row_data,
                now,
                user_id,
                row_id
            )
            .fetch_one(&self.pool)
            .await?;
            
            return Ok(row);
        }

        Err(ContrivanceError::validation("At least one field must be provided for update"))
    }

    /// Delete spreadsheet row
    pub async fn delete_row(&self, row_id: Uuid) -> ContrivanceResult<()> {
        let result = sqlx::query!(
            "DELETE FROM spreadsheet_rows WHERE id = $1",
            row_id
        )
        .execute(&self.pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(ContrivanceError::not_found("Row not found"));
        }

        Ok(())
    }

    /// Get collaborators with user information
    pub async fn get_collaborators_with_user_info(&self, spreadsheet_id: Uuid) -> ContrivanceResult<Vec<common::CollaboratorInfo>> {
        let collaborators = sqlx::query!(
            r#"
            SELECT 
                sc.permission_level as "permission_level: PermissionLevel",
                sc.invited_at,
                sc.accepted_at,
                u.id as user_id,
                u.email,
                u.name,
                u.role as "role: common::UserRole",
                u.created_at as user_created_at,
                u.last_login,
                u.is_active
            FROM spreadsheet_collaborators sc
            JOIN users u ON sc.user_id = u.id
            WHERE sc.spreadsheet_id = $1 AND sc.accepted_at IS NOT NULL
            ORDER BY sc.invited_at
            "#,
            spreadsheet_id
        )
        .fetch_all(&self.pool)
        .await?;

        let collaborator_infos = collaborators
            .into_iter()
            .map(|row| {
                let user = UserResponse {
                    id: row.user_id,
                    email: row.email,
                    name: row.name,
                    role: row.role,
                    created_at: row.user_created_at.unwrap_or_else(Utc::now),
                    last_login: row.last_login,
                    is_active: row.is_active.unwrap_or(true),
                };

                common::CollaboratorInfo {
                    user,
                    permission_level: row.permission_level,
                    invited_at: row.invited_at.unwrap_or_else(Utc::now),
                    accepted_at: row.accepted_at,
                }
            })
            .collect();

        Ok(collaborator_infos)
    }

    /// Check if user can access spreadsheet
    pub async fn can_user_access_spreadsheet(&self, user_id: Uuid, spreadsheet_id: Uuid) -> ContrivanceResult<bool> {
        let count: i64 = sqlx::query_scalar!(
            r#"
            SELECT COUNT(*) FROM spreadsheets s
            LEFT JOIN spreadsheet_collaborators sc ON s.id = sc.spreadsheet_id
            WHERE s.id = $1 AND (
                s.owner_id = $2 
                OR s.is_public = true 
                OR (sc.user_id = $2 AND sc.accepted_at IS NOT NULL)
            )
            "#,
            spreadsheet_id,
            user_id
        )
        .fetch_one(&self.pool)
        .await?
        .unwrap_or(0);

        Ok(count > 0)
    }

    /// Check if user can edit spreadsheet
    pub async fn can_user_edit_spreadsheet(&self, user_id: Uuid, spreadsheet_id: Uuid) -> ContrivanceResult<bool> {
        let count: i64 = sqlx::query_scalar!(
            r#"
            SELECT COUNT(*) FROM spreadsheets s
            LEFT JOIN spreadsheet_collaborators sc ON s.id = sc.spreadsheet_id
            WHERE s.id = $1 AND (
                s.owner_id = $2 
                OR (sc.user_id = $2 AND sc.accepted_at IS NOT NULL AND sc.permission_level IN ('edit', 'admin'))
            )
            "#,
            spreadsheet_id,
            user_id
        )
        .fetch_one(&self.pool)
        .await?
        .unwrap_or(0);

        Ok(count > 0)
    }
}