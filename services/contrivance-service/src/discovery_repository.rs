use sqlx::PgPool;
use uuid::Uuid;
use crate::discovery_models::*;

pub struct DiscoveryRepository {
    pool: PgPool,
}

impl DiscoveryRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    // Discovery Sessions
    pub async fn create_session(
        &self,
        account_id: String,
        account_name: String,
        user_id: Uuid,
        vertical: String,
    ) -> Result<DiscoverySession, sqlx::Error> {
        sqlx::query_as::<_, DiscoverySession>(
            r#"
            INSERT INTO discovery_sessions 
            (account_id, account_name, user_id, vertical)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            "#,
        )
        .bind(account_id)
        .bind(account_name)
        .bind(user_id)
        .bind(vertical)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn get_session(&self, session_id: Uuid) -> Result<DiscoverySession, sqlx::Error> {
        sqlx::query_as::<_, DiscoverySession>(
            "SELECT * FROM discovery_sessions WHERE id = $1",
        )
        .bind(session_id)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn get_sessions_by_account(
        &self,
        account_id: &str,
        user_id: Uuid,
    ) -> Result<Vec<DiscoverySession>, sqlx::Error> {
        sqlx::query_as::<_, DiscoverySession>(
            "SELECT * FROM discovery_sessions WHERE account_id = $1 AND user_id = $2 ORDER BY created_at DESC",
        )
        .bind(account_id)
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn update_session_status(
        &self,
        session_id: Uuid,
        status: &str,
    ) -> Result<DiscoverySession, sqlx::Error> {
        sqlx::query_as::<_, DiscoverySession>(
            "UPDATE discovery_sessions SET status = $1, completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END WHERE id = $2 RETURNING *",
        )
        .bind(status)
        .bind(session_id)
        .fetch_one(&self.pool)
        .await
    }

    // Discovery Responses
    pub async fn save_response(
        &self,
        session_id: Uuid,
        req: SaveDiscoveryResponseRequest,
    ) -> Result<DiscoveryResponse, sqlx::Error> {
        sqlx::query_as::<_, DiscoveryResponse>(
            r#"
            INSERT INTO discovery_responses 
            (session_id, question_id, question_title, question_type, response_value, vendor_selections, sizing_selections)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (session_id, question_id) 
            DO UPDATE SET 
                response_value = $5,
                vendor_selections = $6,
                sizing_selections = $7,
                updated_at = NOW()
            RETURNING *
            "#,
        )
        .bind(session_id)
        .bind(&req.question_id)
        .bind(&req.question_title)
        .bind(&req.question_type)
        .bind(&req.response_value)
        .bind(req.vendor_selections.unwrap_or_else(|| serde_json::json!({})))
        .bind(req.sizing_selections.unwrap_or_else(|| serde_json::json!({})))
        .fetch_one(&self.pool)
        .await
    }

    pub async fn get_responses(
        &self,
        session_id: Uuid,
    ) -> Result<Vec<DiscoveryResponse>, sqlx::Error> {
        sqlx::query_as::<_, DiscoveryResponse>(
            "SELECT * FROM discovery_responses WHERE session_id = $1 ORDER BY answered_at ASC",
        )
        .bind(session_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn get_session_with_responses(
        &self,
        session_id: Uuid,
    ) -> Result<DiscoverySessionWithResponses, Box<dyn std::error::Error>> {
        let session = self.get_session(session_id).await?;
        let responses = self.get_responses(session_id).await?;
        let notes = self.get_notes(session_id).await?;
        let total_questions_answered = responses.len() as i32;

        Ok(DiscoverySessionWithResponses {
            session,
            responses,
            notes,
            total_questions_answered,
        })
    }

    // Discovery Notes
    pub async fn add_note(
        &self,
        session_id: Uuid,
        user_id: Uuid,
        req: AddDiscoveryNoteRequest,
    ) -> Result<DiscoveryNote, sqlx::Error> {
        sqlx::query_as::<_, DiscoveryNote>(
            r#"
            INSERT INTO discovery_notes 
            (session_id, user_id, note_text, note_type, related_response_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            "#,
        )
        .bind(session_id)
        .bind(user_id)
        .bind(&req.note_text)
        .bind(req.note_type.unwrap_or_else(|| "general".to_string()))
        .bind(req.related_response_id)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn get_notes(&self, session_id: Uuid) -> Result<Vec<DiscoveryNote>, sqlx::Error> {
        sqlx::query_as::<_, DiscoveryNote>(
            "SELECT * FROM discovery_notes WHERE session_id = $1 ORDER BY created_at DESC",
        )
        .bind(session_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn update_note(
        &self,
        note_id: Uuid,
        note_text: String,
    ) -> Result<DiscoveryNote, sqlx::Error> {
        sqlx::query_as::<_, DiscoveryNote>(
            "UPDATE discovery_notes SET note_text = $1 WHERE id = $2 RETURNING *",
        )
        .bind(note_text)
        .bind(note_id)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn delete_note(&self, note_id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM discovery_notes WHERE id = $1")
            .bind(note_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // Discovery Exports
    pub async fn create_export(
        &self,
        session_id: Uuid,
        user_id: Uuid,
        export_format: String,
        export_data: serde_json::Value,
    ) -> Result<DiscoveryExport, sqlx::Error> {
        sqlx::query_as::<_, DiscoveryExport>(
            r#"
            INSERT INTO discovery_exports 
            (session_id, user_id, export_format, export_data)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            "#,
        )
        .bind(session_id)
        .bind(user_id)
        .bind(export_format)
        .bind(export_data)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn update_export_status(
        &self,
        export_id: Uuid,
        status: &str,
        salesforce_record_id: Option<String>,
        error_message: Option<String>,
    ) -> Result<DiscoveryExport, sqlx::Error> {
        sqlx::query_as::<_, DiscoveryExport>(
            r#"
            UPDATE discovery_exports 
            SET status = $1, 
                salesforce_record_id = $2,
                error_message = $3,
                exported_at = CASE WHEN $1 = 'success' THEN NOW() ELSE NULL END
            WHERE id = $4
            RETURNING *
            "#,
        )
        .bind(status)
        .bind(salesforce_record_id)
        .bind(error_message)
        .bind(export_id)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn get_exports(
        &self,
        session_id: Uuid,
    ) -> Result<Vec<DiscoveryExport>, sqlx::Error> {
        sqlx::query_as::<_, DiscoveryExport>(
            "SELECT * FROM discovery_exports WHERE session_id = $1 ORDER BY created_at DESC",
        )
        .bind(session_id)
        .fetch_all(&self.pool)
        .await
    }
}
