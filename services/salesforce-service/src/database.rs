use sqlx::{PgPool, Pool, Postgres};
use anyhow::Result;

pub async fn create_pool(database_url: &str) -> Result<PgPool> {
    let pool = PgPool::connect(database_url).await?;
    
    // Run migrations or create tables if needed
    // sqlx::migrate!("./migrations").run(&pool).await?;
    
    Ok(pool)
}

pub async fn get_salesforce_connection(
    pool: &PgPool, 
    user_id: uuid::Uuid
) -> Result<Option<crate::models::SalesforceConnection>> {
    let connection = sqlx::query_as::<_, crate::models::SalesforceConnection>(
        "SELECT * FROM salesforce_connections WHERE user_id = $1"
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?;
    
    Ok(connection)
}

pub async fn save_salesforce_connection(
    pool: &PgPool,
    user_id: uuid::Uuid,
    token: &crate::models::SalesforceToken,
) -> Result<uuid::Uuid> {
    let id = uuid::Uuid::new_v4();
    let expires_at = token.expires_in.map(|exp| {
        token.created_at + chrono::Duration::seconds(exp)
    });

    sqlx::query(
        r#"
        INSERT INTO salesforce_connections 
        (id, user_id, access_token, refresh_token, instance_url, created_at, updated_at, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (user_id) DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        instance_url = EXCLUDED.instance_url,
        updated_at = EXCLUDED.updated_at,
        expires_at = EXCLUDED.expires_at
        "#
    )
    .bind(id)
    .bind(user_id)
    .bind(&token.access_token)
    .bind(&token.refresh_token)
    .bind(&token.instance_url)
    .bind(token.created_at)
    .bind(chrono::Utc::now())
    .bind(expires_at)
    .execute(pool)
    .await?;

    Ok(id)
}