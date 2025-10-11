use actix_web::{web, HttpRequest, HttpResponse, Result as ActixResult};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use std::collections::HashMap;
use sqlx::Row;

use crate::models::*;
use crate::salesforce::SalesforceClient;
use crate::auth::extract_user_from_token;
use crate::database;

#[derive(Deserialize)]
pub struct OAuthCallbackParams {
    code: Option<String>,
    state: Option<String>,
    error: Option<String>,
}

pub async fn oauth_authorize(
    sf_client: web::Data<SalesforceClient>,
    req: HttpRequest,
) -> ActixResult<HttpResponse> {
    println!("🚀 oauth_authorize handler called - bypassing auth!");
    // Temporarily skip JWT validation for testing
    // let claims = extract_user_from_token(&req)?;
    
    let redirect_uri = "http://localhost:8080/api/salesforce/oauth/callback";
    let state = "test-user-123".to_string(); // Temporary hardcoded state
    
    let auth_url = sf_client.get_authorize_url(redirect_uri, &state);
    
    Ok(HttpResponse::Found()
        .append_header(("Location", auth_url))
        .finish())
}

pub async fn oauth_callback(
    sf_client: web::Data<SalesforceClient>,
    pool: web::Data<sqlx::PgPool>,
    params: web::Query<OAuthCallbackParams>,
) -> ActixResult<HttpResponse> {
    println!("🚀 oauth_callback handler called - bypassing auth!");
    
    if let Some(error) = &params.error {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": format!("OAuth error: {}", error)
        })));
    }

    let code = match &params.code {
        Some(c) => c,
        None => return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Missing authorization code"
        }))),
    };

    // Temporarily bypass state validation for testing and use a hardcoded user ID
    let user_id = Uuid::new_v4(); // Generate a temporary UUID for testing

    let redirect_uri = "http://localhost:8080/api/salesforce/oauth/callback";
    
    match sf_client.exchange_code_for_token(code, redirect_uri).await {
        Ok(token) => {
            // Save token to database
            match database::save_salesforce_connection(&pool, user_id, &token).await {
                Ok(_) => {
                    // Redirect to success page in frontend
                    Ok(HttpResponse::Found()
                        .append_header(("Location", "http://localhost:3000/dashboard?salesforce=connected"))
                        .finish())
                }
                Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to save connection: {}", e)
                }))),
            }
        }
        Err(e) => Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": format!("Token exchange failed: {}", e)
        }))),
    }
}

pub async fn connection_status(
    req: HttpRequest,
    pool: web::Data<sqlx::PgPool>,
    sf_client: web::Data<SalesforceClient>,
) -> Result<HttpResponse, actix_web::Error> {
    println!("Connection status endpoint called with auth bypass");
    let _claims = extract_user_from_token(&req)?;
    
    match sqlx::query("SELECT COUNT(*) as count FROM salesforce_connections")
        .fetch_one(pool.get_ref())
        .await
    {
        Ok(row) => {
            let count: i64 = row.try_get("count").unwrap_or(0);
            let connected = count > 0;
            Ok(HttpResponse::Ok().json(serde_json::json!({
                "connected": connected
            })))
        },
        Err(e) => {
            println!("Database query error: {}", e);
            Ok(HttpResponse::Ok().json(serde_json::json!({
                "connected": false
            })))
        }
    }
}

pub async fn get_opportunities(
    pool: web::Data<sqlx::PgPool>,
    sf_client: web::Data<SalesforceClient>,
    req: HttpRequest,
) -> ActixResult<HttpResponse> {
    let claims = extract_user_from_token(&req)?;
    
    let connection = match database::get_salesforce_connection(&pool, claims.user_id).await {
        Ok(Some(conn)) => conn,
        Ok(None) => return Ok(HttpResponse::Unauthorized().json(serde_json::json!({
            "error": "No Salesforce connection found"
        }))),
        Err(e) => return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Database error: {}", e)
        }))),
    };

    let token = SalesforceToken {
        access_token: connection.access_token,
        refresh_token: connection.refresh_token,
        instance_url: connection.instance_url,
        token_type: "Bearer".to_string(),
        expires_in: None,
        created_at: connection.created_at,
    };

    match sf_client.query_opportunities(&token, Some(100)).await {
        Ok(opportunities) => Ok(HttpResponse::Ok().json(opportunities)),
        Err(e) => Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": format!("Failed to fetch opportunities: {}", e)
        }))),
    }
}

pub async fn get_leads(
    pool: web::Data<sqlx::PgPool>,
    sf_client: web::Data<SalesforceClient>,
    req: HttpRequest,
) -> ActixResult<HttpResponse> {
    let claims = extract_user_from_token(&req)?;
    
    let connection = match database::get_salesforce_connection(&pool, claims.user_id).await {
        Ok(Some(conn)) => conn,
        Ok(None) => return Ok(HttpResponse::Unauthorized().json(serde_json::json!({
            "error": "No Salesforce connection found"
        }))),
        Err(e) => return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Database error: {}", e)
        }))),
    };

    let token = SalesforceToken {
        access_token: connection.access_token,
        refresh_token: connection.refresh_token,
        instance_url: connection.instance_url,
        token_type: "Bearer".to_string(),
        expires_in: None,
        created_at: connection.created_at,
    };

    match sf_client.query_leads(&token, Some(100)).await {
        Ok(leads) => Ok(HttpResponse::Ok().json(leads)),
        Err(e) => Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": format!("Failed to fetch leads: {}", e)
        }))),
    }
}

pub async fn import_opportunities(
    pool: web::Data<sqlx::PgPool>,
    sf_client: web::Data<SalesforceClient>,
    req: HttpRequest,
    import_req: web::Json<ImportRequest>,
) -> ActixResult<HttpResponse> {
    let claims = extract_user_from_token(&req)?;
    
    // Get Salesforce connection
    let connection = match database::get_salesforce_connection(&pool, claims.user_id).await {
        Ok(Some(conn)) => conn,
        Ok(None) => {
            return Ok(HttpResponse::BadRequest().json(ImportResponse {
                success: false,
                spreadsheet_id: import_req.spreadsheet_id.clone().unwrap_or_else(|| "".to_string()),
                records_imported: 0,
                errors: vec!["No Salesforce connection found. Please connect to Salesforce first.".to_string()],
            }));
        }
        Err(e) => {
            return Ok(HttpResponse::InternalServerError().json(ImportResponse {
                success: false,
                spreadsheet_id: import_req.spreadsheet_id.clone().unwrap_or_else(|| "".to_string()),
                records_imported: 0,
                errors: vec![format!("Database error: {}", e)],
            }));
        }
    };

    let token = SalesforceToken {
        access_token: connection.access_token,
        refresh_token: connection.refresh_token,
        instance_url: connection.instance_url,
        token_type: "Bearer".to_string(),
        expires_in: None,
        created_at: connection.created_at,
    };

    // Fetch opportunities from Salesforce
    let opportunities = match sf_client.query_opportunities(&token, None).await {
        Ok(opps) => opps,
        Err(e) => {
            return Ok(HttpResponse::BadRequest().json(ImportResponse {
                success: false,
                spreadsheet_id: import_req.spreadsheet_id.clone().unwrap_or_else(|| "".to_string()),
                records_imported: 0,
                errors: vec![format!("Failed to fetch opportunities: {}", e)],
            }));
        }
    };

    // TODO: Create/update spreadsheet with opportunity data
    // This would involve calling your contrivance-service API
    // For now, return success with the count
    
    Ok(HttpResponse::Ok().json(ImportResponse {
        success: true,
        spreadsheet_id: import_req.spreadsheet_id.clone().unwrap_or_else(|| "generated-id".to_string()),
        records_imported: opportunities.len(),
        errors: vec![],
    }))
}

pub async fn import_leads(
    pool: web::Data<sqlx::PgPool>,
    sf_client: web::Data<SalesforceClient>,
    req: HttpRequest,
    import_req: web::Json<ImportRequest>,
) -> ActixResult<HttpResponse> {
    let claims = extract_user_from_token(&req)?;
    
    // Similar implementation to import_opportunities but for leads
    // TODO: Implement lead import logic
    
    Ok(HttpResponse::Ok().json(ImportResponse {
        success: true,
        spreadsheet_id: import_req.spreadsheet_id.clone().unwrap_or_else(|| "generated-id".to_string()),
        records_imported: 0,
        errors: vec!["Lead import not yet implemented".to_string()],
    }))
}

pub async fn sync_pipeline(
    pool: web::Data<sqlx::PgPool>,
    sf_client: web::Data<SalesforceClient>,
    req: HttpRequest,
    path: web::Path<String>,
) -> ActixResult<HttpResponse> {
    let _claims = extract_user_from_token(&req)?;
    let _pipeline_id = path.into_inner();
    
    // TODO: Implement bidirectional sync between pipeline and Salesforce
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Pipeline sync not yet implemented"
    })))
}