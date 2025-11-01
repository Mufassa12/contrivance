use actix_web::{web, HttpRequest, HttpResponse};
use serde_json::{json, Value};
use tracing::{error, info};

/// Proxy handler for Grok API requests
/// Forwards requests from frontend to Grok API to avoid CORS issues
pub async fn proxy_grok_chat(_req: HttpRequest, body: web::Json<Value>) -> HttpResponse {
    let grok_api_key = match std::env::var("GROK_API_KEY") {
        Ok(key) => key,
        Err(_) => {
            error!("GROK_API_KEY environment variable not set");
            return HttpResponse::BadRequest().json(json!({
                "error": "GROK_API_KEY not configured on server"
            }));
        }
    };

    info!("Proxying Grok API request");

    let client = reqwest::Client::new();
    match client
        .post("https://api.x.ai/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", grok_api_key))
        .header("Content-Type", "application/json")
        .json(&body.into_inner())
        .send()
        .await
    {
        Ok(response) => {
            let status = response.status();
            let status_code = status.as_u16();
            
            // Log the status code and try to get the response text for debugging
            info!("Grok API returned status code: {}", status_code);
            
            let response_text = match response.text().await {
                Ok(text) => text,
                Err(e) => {
                    error!("Failed to read Grok response body: {}", e);
                    return HttpResponse::BadGateway().json(json!({
                        "error": "Failed to read Grok API response"
                    }));
                }
            };
            
            info!("Grok API response body: {}", response_text);
            
            // Try to parse as JSON
            match serde_json::from_str::<Value>(&response_text) {
                Ok(data) => {
                    info!("Grok API response parsed successfully");
                    HttpResponse::build(actix_web::http::StatusCode::from_u16(status_code).unwrap())
                        .json(data)
                }
                Err(e) => {
                    error!("Failed to parse Grok response as JSON: {}. Response text: {}", e, response_text);
                    if status.is_success() {
                        HttpResponse::InternalServerError().json(json!({
                            "error": "Failed to parse Grok API response"
                        }))
                    } else {
                        HttpResponse::build(actix_web::http::StatusCode::from_u16(status_code).unwrap())
                            .json(json!({
                                "error": "Grok API error",
                                "status": status_code,
                                "details": response_text
                            }))
                    }
                }
            }
        }
        Err(e) => {
            error!("Failed to call Grok API: {}", e);
            HttpResponse::BadGateway().json(json!({
                "error": format!("Grok API error: {}", e)
            }))
        }
    }
}
