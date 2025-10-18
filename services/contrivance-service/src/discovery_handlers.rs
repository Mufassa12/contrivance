use actix_web::{web, HttpRequest, HttpResponse, HttpMessage};
use serde_json::json;
use uuid::Uuid;
use crate::discovery_models::*;
use crate::discovery_repository::DiscoveryRepository;

// Create a new discovery session
pub async fn create_discovery_session(
    req: HttpRequest,
    body: web::Json<CreateDiscoverySessionRequest>,
    repo: web::Data<DiscoveryRepository>,
) -> HttpResponse {
    // Extract user_id from request (should be set by auth middleware)
    let user_id = match req.extensions().get::<Uuid>() {
        Some(id) => *id,
        None => return HttpResponse::Unauthorized().json(json!({"error": "Unauthorized"})),
    };

    match repo
        .create_session(
            body.account_id.clone(),
            body.account_name.clone(),
            user_id,
            body.vertical.clone(),
        )
        .await
    {
        Ok(session) => HttpResponse::Created().json(session),
        Err(e) => {
            eprintln!("Error creating discovery session: {}", e);
            HttpResponse::InternalServerError()
                .json(json!({"error": "Failed to create discovery session"}))
        }
    }
}

// Get a discovery session with all responses and notes
pub async fn get_discovery_session(
    session_id: web::Path<Uuid>,
    repo: web::Data<DiscoveryRepository>,
) -> HttpResponse {
    let session_id = session_id.into_inner();

    match repo.get_session_with_responses(session_id).await {
        Ok(session_data) => HttpResponse::Ok().json(session_data),
        Err(_) => HttpResponse::NotFound().json(json!({"error": "Session not found"})),
    }
}

// Get all sessions for an account
pub async fn get_account_discovery_sessions(
    req: HttpRequest,
    path: web::Path<String>,
    repo: web::Data<DiscoveryRepository>,
) -> HttpResponse {
    let account_id = path.into_inner();

    let user_id = match req.extensions().get::<Uuid>() {
        Some(id) => *id,
        None => return HttpResponse::Unauthorized().json(json!({"error": "Unauthorized"})),
    };

    match repo.get_sessions_by_account(&account_id, user_id).await {
        Ok(sessions) => HttpResponse::Ok().json(sessions),
        Err(e) => {
            eprintln!("Error fetching sessions: {}", e);
            HttpResponse::InternalServerError()
                .json(json!({"error": "Failed to fetch sessions"}))
        }
    }
}

// Save a discovery response for a question
pub async fn save_discovery_response(
    session_id: web::Path<Uuid>,
    body: web::Json<SaveDiscoveryResponseRequest>,
    repo: web::Data<DiscoveryRepository>,
) -> HttpResponse {
    let session_id = session_id.into_inner();

    // Verify session exists
    if repo.get_session(session_id).await.is_err() {
        return HttpResponse::NotFound().json(json!({"error": "Session not found"}));
    }

    match repo.save_response(session_id, body.into_inner()).await {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(e) => {
            eprintln!("Error saving response: {}", e);
            HttpResponse::InternalServerError()
                .json(json!({"error": "Failed to save response"}))
        }
    }
}

// Get all responses for a session
pub async fn get_discovery_responses(
    session_id: web::Path<Uuid>,
    repo: web::Data<DiscoveryRepository>,
) -> HttpResponse {
    let session_id = session_id.into_inner();

    match repo.get_responses(session_id).await {
        Ok(responses) => HttpResponse::Ok().json(responses),
        Err(e) => {
            eprintln!("Error fetching responses: {}", e);
            HttpResponse::InternalServerError()
                .json(json!({"error": "Failed to fetch responses"}))
        }
    }
}

// Add a note to a discovery session
pub async fn add_discovery_note(
    req: HttpRequest,
    session_id: web::Path<Uuid>,
    body: web::Json<AddDiscoveryNoteRequest>,
    repo: web::Data<DiscoveryRepository>,
) -> HttpResponse {
    let session_id = session_id.into_inner();

    let user_id = match req.extensions().get::<Uuid>() {
        Some(id) => *id,
        None => return HttpResponse::Unauthorized().json(json!({"error": "Unauthorized"})),
    };

    // Verify session exists
    if repo.get_session(session_id).await.is_err() {
        return HttpResponse::NotFound().json(json!({"error": "Session not found"}));
    }

    match repo.add_note(session_id, user_id, body.into_inner()).await {
        Ok(note) => HttpResponse::Created().json(note),
        Err(e) => {
            eprintln!("Error adding note: {}", e);
            HttpResponse::InternalServerError().json(json!({"error": "Failed to add note"}))
        }
    }
}

// Get all notes for a session
pub async fn get_discovery_notes(
    session_id: web::Path<Uuid>,
    repo: web::Data<DiscoveryRepository>,
) -> HttpResponse {
    let session_id = session_id.into_inner();

    match repo.get_notes(session_id).await {
        Ok(notes) => HttpResponse::Ok().json(notes),
        Err(e) => {
            eprintln!("Error fetching notes: {}", e);
            HttpResponse::InternalServerError()
                .json(json!({"error": "Failed to fetch notes"}))
        }
    }
}

// Update a note
pub async fn update_discovery_note(
    path: web::Path<Uuid>,
    body: web::Json<serde_json::Value>,
    repo: web::Data<DiscoveryRepository>,
) -> HttpResponse {
    let note_id = path.into_inner();

    let note_text = match body.get("note_text").and_then(|v| v.as_str()) {
        Some(text) => text.to_string(),
        None => {
            return HttpResponse::BadRequest()
                .json(json!({"error": "Missing note_text field"}))
        }
    };

    match repo.update_note(note_id, note_text).await {
        Ok(note) => HttpResponse::Ok().json(note),
        Err(_) => HttpResponse::NotFound().json(json!({"error": "Note not found"})),
    }
}

// Delete a note
pub async fn delete_discovery_note(
    path: web::Path<Uuid>,
    repo: web::Data<DiscoveryRepository>,
) -> HttpResponse {
    let note_id = path.into_inner();

    match repo.delete_note(note_id).await {
        Ok(_) => HttpResponse::NoContent().finish(),
        Err(_) => HttpResponse::NotFound().json(json!({"error": "Note not found"})),
    }
}

// Export discovery session data
pub async fn export_discovery_session(
    req: HttpRequest,
    session_id: web::Path<Uuid>,
    body: web::Json<serde_json::Value>,
    repo: web::Data<DiscoveryRepository>,
) -> HttpResponse {
    let session_id = session_id.into_inner();

    let user_id = match req.extensions().get::<Uuid>() {
        Some(id) => *id,
        None => return HttpResponse::Unauthorized().json(json!({"error": "Unauthorized"})),
    };

    // Verify session exists
    if repo.get_session(session_id).await.is_err() {
        return HttpResponse::NotFound().json(json!({"error": "Session not found"}));
    }

    let export_format = match body.get("export_format").and_then(|v| v.as_str()) {
        Some(format) => format.to_string(),
        None => "json".to_string(),
    };

    // Get session with all responses and notes
    match repo.get_session_with_responses(session_id).await {
        Ok(session_data) => {
            // Build export data
            let export_data = json!({
                "session": session_data.session,
                "responses": session_data.responses,
                "notes": session_data.notes,
                "exported_at": chrono::Utc::now().to_rfc3339(),
                "export_format": export_format
            });

            // Create export record
            match repo
                .create_export(session_id, user_id, export_format.clone(), export_data.clone())
                .await
            {
                Ok(_export) => {
                    // Return the export with format-specific content
                    match export_format.as_str() {
                        "json" => HttpResponse::Ok()
                            .content_type("application/json")
                            .json(export_data),
                        "csv" => {
                            // Simple CSV format - can be enhanced
                            let csv_content =
                                format_export_as_csv(&session_data, &export_format);
                            HttpResponse::Ok()
                                .content_type("text/csv")
                                .body(csv_content)
                        }
                        _ => HttpResponse::Ok().json(export_data),
                    }
                }
                Err(e) => {
                    eprintln!("Error creating export: {}", e);
                    HttpResponse::InternalServerError()
                        .json(json!({"error": "Failed to create export"}))
                }
            }
        }
        Err(_) => HttpResponse::NotFound().json(json!({"error": "Session not found"})),
    }
}

// Update session status (mark as complete, in-progress, etc.)
pub async fn update_discovery_session_status(
    session_id: web::Path<Uuid>,
    body: web::Json<serde_json::Value>,
    repo: web::Data<DiscoveryRepository>,
) -> HttpResponse {
    let session_id = session_id.into_inner();

    let status = match body.get("status").and_then(|v| v.as_str()) {
        Some(s) => s,
        None => {
            return HttpResponse::BadRequest()
                .json(json!({"error": "Missing status field"}))
        }
    };

    // Validate status
    if !["in_progress", "completed", "archived"].contains(&status) {
        return HttpResponse::BadRequest()
            .json(json!({"error": "Invalid status. Must be in_progress, completed, or archived"}));
    }

    match repo.update_session_status(session_id, status).await {
        Ok(session) => HttpResponse::Ok().json(session),
        Err(_) => HttpResponse::NotFound().json(json!({"error": "Session not found"})),
    }
}

// Helper function to format export as CSV
fn format_export_as_csv(
    session_data: &DiscoverySessionWithResponses,
    _format: &str,
) -> String {
    let mut csv = String::new();

    // Header
    csv.push_str("Question ID,Question Title,Question Type,Response Value,Vendors Selected,Sizing Selected\n");

    // Rows
    for response in &session_data.responses {
        let vendors = response
            .vendor_selections
            .to_string()
            .replace("\n", " ")
            .replace(",", ";");

        let sizing = response
            .sizing_selections
            .to_string()
            .replace("\n", " ")
            .replace(",", ";");

        let response_value = response
            .response_value
            .to_string()
            .replace("\n", " ")
            .replace(",", ";");

        csv.push_str(&format!(
            "\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\"\n",
            response.question_id,
            response.question_title,
            response.question_type,
            response_value,
            vendors,
            sizing
        ));
    }

    csv
}

// Health check endpoint for discovery service
pub async fn discovery_health_check() -> HttpResponse {
    HttpResponse::Ok().json(json!({
        "status": "healthy",
        "service": "discovery",
        "version": "1.0.0"
    }))
}
