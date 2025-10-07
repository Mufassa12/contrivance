use crate::errors::{ContrivanceError, ContrivanceResult};
use sqlx::{PgPool, Row, Column};
use uuid::Uuid;

/// Database connection utilities
pub struct DatabaseService {
    pool: PgPool,
}

impl DatabaseService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Get database pool reference
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    /// Check database connectivity
    pub async fn health_check(&self) -> ContrivanceResult<()> {
        sqlx::query("SELECT 1")
            .fetch_one(&self.pool)
            .await
            .map_err(ContrivanceError::from)?;
        Ok(())
    }

    /// Run database migrations
    pub async fn run_migrations(&self) -> ContrivanceResult<()> {
        sqlx::migrate!("./migrations")
            .run(&self.pool)
            .await
            .map_err(|e| ContrivanceError::database(format!("Migration failed: {}", e)))?;
        Ok(())
    }
}

/// Database connection builder
pub struct DatabaseBuilder {
    url: Option<String>,
    max_connections: Option<u32>,
    min_connections: Option<u32>,
    acquire_timeout: Option<std::time::Duration>,
}

impl DatabaseBuilder {
    pub fn new() -> Self {
        Self {
            url: None,
            max_connections: None,
            min_connections: None,
            acquire_timeout: None,
        }
    }

    pub fn url(mut self, url: impl Into<String>) -> Self {
        self.url = Some(url.into());
        self
    }

    pub fn max_connections(mut self, max: u32) -> Self {
        self.max_connections = Some(max);
        self
    }

    pub fn min_connections(mut self, min: u32) -> Self {
        self.min_connections = Some(min);
        self
    }

    pub fn acquire_timeout(mut self, timeout: std::time::Duration) -> Self {
        self.acquire_timeout = Some(timeout);
        self
    }

    pub async fn build(self) -> ContrivanceResult<DatabaseService> {
        let url = self.url.ok_or_else(|| {
            ContrivanceError::internal("Database URL is required")
        })?;

        let mut pool_options = sqlx::postgres::PgPoolOptions::new();

        if let Some(max) = self.max_connections {
            pool_options = pool_options.max_connections(max);
        }

        if let Some(min) = self.min_connections {
            pool_options = pool_options.min_connections(min);
        }

        if let Some(timeout) = self.acquire_timeout {
            pool_options = pool_options.acquire_timeout(timeout);
        }

        let pool = pool_options
            .connect(&url)
            .await
            .map_err(|e| ContrivanceError::database(format!("Failed to connect to database: {}", e)))?;

        Ok(DatabaseService::new(pool))
    }
}

impl Default for DatabaseBuilder {
    fn default() -> Self {
        Self::new()
    }
}

/// Pagination utilities for database queries
pub struct PaginationBuilder {
    pub page: u32,
    pub limit: u32,
    pub sort_by: Option<String>,
    pub sort_order: String,
}

impl PaginationBuilder {
    pub fn new(page: Option<u32>, limit: Option<u32>) -> Self {
        Self {
            page: page.unwrap_or(1).max(1), // Ensure page is at least 1
            limit: limit.unwrap_or(20).min(100).max(1), // Clamp between 1 and 100
            sort_by: None,
            sort_order: "ASC".to_string(),
        }
    }

    pub fn sort_by(mut self, column: impl Into<String>, order: impl Into<String>) -> Self {
        self.sort_by = Some(column.into());
        self.sort_order = order.into().to_uppercase();
        self
    }

    pub fn offset(&self) -> u32 {
        (self.page - 1) * self.limit
    }

    /// Build ORDER BY and LIMIT OFFSET clause for SQL
    pub fn build_sql_clause(&self, default_sort: Option<&str>) -> String {
        let mut clause = String::new();

        // Add ORDER BY if specified or default is provided
        if let Some(sort_by) = &self.sort_by {
            clause.push_str(&format!(" ORDER BY {} {}", sort_by, self.sort_order));
        } else if let Some(default) = default_sort {
            clause.push_str(&format!(" ORDER BY {}", default));
        }

        // Add LIMIT and OFFSET
        clause.push_str(&format!(" LIMIT {} OFFSET {}", self.limit, self.offset()));

        clause
    }
    
    /// Calculate total pages from total count
    pub fn calculate_total_pages(&self, total_count: u64) -> u32 {
        ((total_count as f64) / (self.limit as f64)).ceil() as u32
    }
}

/// Transaction utilities
pub struct TransactionManager<'a> {
    tx: sqlx::Transaction<'a, sqlx::Postgres>,
}

impl<'a> TransactionManager<'a> {
    pub async fn begin(pool: &'a PgPool) -> ContrivanceResult<Self> {
        let tx = pool
            .begin()
            .await
            .map_err(ContrivanceError::from)?;
        
        Ok(Self { tx })
    }

    pub async fn commit(self) -> ContrivanceResult<()> {
        self.tx
            .commit()
            .await
            .map_err(ContrivanceError::from)?;
        Ok(())
    }

    pub async fn rollback(self) -> ContrivanceResult<()> {
        self.tx
            .rollback()
            .await
            .map_err(ContrivanceError::from)?;
        Ok(())
    }

    /// Execute a query within the transaction
    pub async fn execute(&mut self, query: &str) -> ContrivanceResult<sqlx::postgres::PgQueryResult> {
        sqlx::query(query)
            .execute(&mut *self.tx)
            .await
            .map_err(ContrivanceError::from)
    }

    /// Fetch one row within the transaction
    pub async fn fetch_one<T>(&mut self, query: &str) -> ContrivanceResult<T>
    where
        T: for<'r> sqlx::FromRow<'r, sqlx::postgres::PgRow> + Send + Unpin,
    {
        sqlx::query_as::<_, T>(query)
            .fetch_one(&mut *self.tx)
            .await
            .map_err(ContrivanceError::from)
    }

    /// Fetch all rows within the transaction
    pub async fn fetch_all<T>(&mut self, query: &str) -> ContrivanceResult<Vec<T>>
    where
        T: for<'r> sqlx::FromRow<'r, sqlx::postgres::PgRow> + Send + Unpin,
    {
        sqlx::query_as::<_, T>(query)
            .fetch_all(&mut *self.tx)
            .await
            .map_err(ContrivanceError::from)
    }
}

/// Query building utilities
pub struct QueryBuilder {
    select: Vec<String>,
    from: Option<String>,
    joins: Vec<String>,
    wheres: Vec<String>,
    params: Vec<String>,
    param_count: usize,
}

impl QueryBuilder {
    pub fn new() -> Self {
        Self {
            select: Vec::new(),
            from: None,
            joins: Vec::new(),
            wheres: Vec::new(),
            params: Vec::new(),
            param_count: 0,
        }
    }

    pub fn select(mut self, columns: &[&str]) -> Self {
        self.select.extend(columns.iter().map(|s| s.to_string()));
        self
    }

    pub fn from(mut self, table: &str) -> Self {
        self.from = Some(table.to_string());
        self
    }

    pub fn join(mut self, join_clause: &str) -> Self {
        self.joins.push(join_clause.to_string());
        self
    }

    pub fn where_clause(mut self, condition: &str) -> Self {
        self.wheres.push(condition.to_string());
        self
    }

    pub fn where_eq(mut self, column: &str, value: impl ToString) -> Self {
        self.param_count += 1;
        self.wheres.push(format!("{} = ${}", column, self.param_count));
        self.params.push(value.to_string());
        self
    }

    pub fn where_in(mut self, column: &str, values: &[impl ToString]) -> Self {
        if !values.is_empty() {
            let placeholders: Vec<String> = values.iter().enumerate().map(|(i, _)| {
                self.param_count += 1;
                format!("${}", self.param_count)
            }).collect();
            
            self.wheres.push(format!("{} IN ({})", column, placeholders.join(", ")));
            self.params.extend(values.iter().map(|v| v.to_string()));
        }
        self
    }

    pub fn build(&self) -> String {
        let mut query = String::new();

        // SELECT clause
        if self.select.is_empty() {
            query.push_str("SELECT *");
        } else {
            query.push_str(&format!("SELECT {}", self.select.join(", ")));
        }

        // FROM clause
        if let Some(from) = &self.from {
            query.push_str(&format!(" FROM {}", from));
        }

        // JOIN clauses
        if !self.joins.is_empty() {
            query.push_str(&format!(" {}", self.joins.join(" ")));
        }

        // WHERE clause
        if !self.wheres.is_empty() {
            query.push_str(&format!(" WHERE {}", self.wheres.join(" AND ")));
        }

        query
    }

    pub fn params(&self) -> &[String] {
        &self.params
    }
}

impl Default for QueryBuilder {
    fn default() -> Self {
        Self::new()
    }
}

/// Database seeding utilities
pub struct SeederService {
    pool: PgPool,
}

impl SeederService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Check if database needs seeding (no users exist)
    pub async fn needs_seeding(&self) -> ContrivanceResult<bool> {
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users")
            .fetch_one(&self.pool)
            .await
            .map_err(ContrivanceError::from)?;
        
        Ok(count == 0)
    }

    /// Run seed data from SQL file
    pub async fn seed_from_file(&self, file_path: &str) -> ContrivanceResult<()> {
        let sql_content = tokio::fs::read_to_string(file_path)
            .await
            .map_err(|e| ContrivanceError::internal(format!("Failed to read seed file: {}", e)))?;

        // Split by semicolon and execute each statement
        for statement in sql_content.split(';') {
            let statement = statement.trim();
            if !statement.is_empty() && !statement.starts_with("--") {
                sqlx::query(statement)
                    .execute(&self.pool)
                    .await
                    .map_err(ContrivanceError::from)?;
            }
        }

        Ok(())
    }

    /// Create default admin user if none exists
    pub async fn create_default_admin(&self, email: &str, password: &str, name: &str) -> ContrivanceResult<Uuid> {
        use crate::auth::PasswordService;
        
        let password_hash = PasswordService::hash_password(password)?;
        let user_id = Uuid::new_v4();

        sqlx::query(
            "INSERT INTO users (id, email, password_hash, name, role) 
             VALUES ($1, $2, $3, $4, 'admin')"
        )
        .bind(user_id)
        .bind(email)
        .bind(password_hash)
        .bind(name)
        .execute(&self.pool)
        .await
        .map_err(ContrivanceError::from)?;

        Ok(user_id)
    }
}

/// Database backup utilities
pub struct BackupService {
    pool: PgPool,
}

impl BackupService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Create a logical backup of critical tables
    pub async fn create_backup(&self, output_path: &str) -> ContrivanceResult<()> {
        // This is a simplified backup - in production, use pg_dump
        let tables = vec![
            "users",
            "spreadsheets", 
            "spreadsheet_columns",
            "spreadsheet_rows",
            "spreadsheet_collaborators",
        ];

        let mut backup_content = String::new();
        backup_content.push_str("-- Contrivance Database Backup\n");
        backup_content.push_str(&format!("-- Generated at: {}\n\n", chrono::Utc::now()));

        for table in tables {
            backup_content.push_str(&format!("-- Table: {}\n", table));
            
            let rows = sqlx::query(&format!("SELECT * FROM {}", table))
                .fetch_all(&self.pool)
                .await
                .map_err(ContrivanceError::from)?;

            if !rows.is_empty() {
                // Get column names
                let columns: Vec<String> = rows[0].columns().iter().map(|c| c.name().to_string()).collect();
                
                backup_content.push_str(&format!(
                    "INSERT INTO {} ({}) VALUES\n",
                    table,
                    columns.join(", ")
                ));

                for (i, row) in rows.iter().enumerate() {
                    let values: Vec<String> = columns.iter().map(|col| {
                        match row.try_get::<Option<String>, _>(col.as_str()) {
                            Ok(Some(val)) => format!("'{}'", val.replace("'", "''")),
                            Ok(None) => "NULL".to_string(),
                            Err(_) => "NULL".to_string(),
                        }
                    }).collect();

                    backup_content.push_str(&format!("({})", values.join(", ")));
                    
                    if i < rows.len() - 1 {
                        backup_content.push_str(",\n");
                    } else {
                        backup_content.push_str(";\n\n");
                    }
                }
            }
        }

        tokio::fs::write(output_path, backup_content)
            .await
            .map_err(|e| ContrivanceError::internal(format!("Failed to write backup: {}", e)))?;

        Ok(())
    }
}