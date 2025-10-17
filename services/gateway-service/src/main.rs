mod config;
mod proxy;
mod middleware;

use actix_cors::Cors;
use actix_web::{web, App, HttpServer, HttpResponse, HttpRequest, middleware::Logger};
use common::ApiResponse;
use config::Config;
use tracing::{info, error};
use proxy::ProxyService;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialize logging
    tracing_subscriber::fmt::init();

    // Load configuration
    let config = Config::from_env();
    info!("Starting gateway-service on port {}", config.port);

    // Initialize HTTP client for proxying
    let http_client = common::HttpUtils::create_client(30);
    
    // Initialize JWT service
    let jwt_service = web::Data::new(common::JwtService::new(
        &config.jwt_secret,
        None,
        None,
    ));
    
    // Initialize proxy service
    let proxy_service = web::Data::new(ProxyService::new(
        http_client,
        config.auth_service_url.clone(),
        config.user_service_url.clone(),
        config.contrivance_service_url.clone(),
        config.salesforce_service_url.clone(),
    ));

    // Start HTTP server
    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin_fn(|origin, _req_head| {
                origin.as_bytes().starts_with(b"http://localhost") ||
                origin.as_bytes().starts_with(b"https://")
            })
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
            .allowed_headers(vec!["Authorization", "Content-Type", "Accept"])
            .expose_headers(vec!["X-Total-Count", "X-Page", "X-Per-Page"])
            .max_age(3600);

        App::new()
            .app_data(proxy_service.clone())
            .app_data(jwt_service.clone())
            .wrap(cors)
            .wrap(Logger::default())
            .wrap(middleware::rate_limit::RateLimitMiddleware::new())
            // Auth service routes
            .service(
                web::scope("/api/auth")
                    .route("/register", web::post().to(proxy::auth_proxy))
                    .route("/login", web::post().to(proxy::auth_proxy))
                    .route("/refresh", web::post().to(proxy::auth_proxy))
                    .route("/logout", web::post().to(proxy::auth_proxy))
                    .route("/validate", web::post().to(proxy::auth_proxy))
            )
            // User service routes  
            .service(
                web::scope("/api/users")
                    .wrap(middleware::auth::auth_middleware())
                    .route("", web::get().to(proxy::user_proxy))
                    .route("/profile", web::get().to(proxy::user_proxy))
                    .route("/profile", web::put().to(proxy::user_proxy))
                    .route("/search", web::get().to(proxy::user_proxy))
                    .route("/{id}", web::get().to(proxy::user_proxy))
                    .route("/{id}", web::put().to(proxy::user_proxy))
                    .route("/{id}", web::delete().to(proxy::user_proxy))
            )
            // Spreadsheet service routes
            .service(
                web::scope("/api/spreadsheets")
                    .wrap(middleware::auth::auth_middleware())
                    .route("", web::get().to(proxy::contrivance_proxy))
                    .route("", web::post().to(proxy::contrivance_proxy))
                    .route("/{id}", web::get().to(proxy::contrivance_proxy))
                    .route("/{id}", web::put().to(proxy::contrivance_proxy))
                    .route("/{id}", web::delete().to(proxy::contrivance_proxy))
                    .route("/{id}/columns", web::get().to(proxy::contrivance_proxy))
                    .route("/{id}/salesforce/columns", web::post().to(proxy::contrivance_proxy))
                    .route("/{id}/rows", web::get().to(proxy::contrivance_proxy))
                    .route("/{id}/rows", web::post().to(proxy::contrivance_proxy))
                    .route("/{spreadsheet_id}/rows/{row_id}", web::put().to(proxy::contrivance_proxy))
                    .route("/{spreadsheet_id}/rows/{row_id}", web::delete().to(proxy::contrivance_proxy))
                    .route("/{id}/collaborators", web::get().to(proxy::contrivance_proxy))
                    // Todo routes for spreadsheets
                    .route("/{id}/todos", web::get().to(proxy::contrivance_proxy))
                    .route("/{id}/todos/stats", web::get().to(proxy::contrivance_proxy))
                    .route("/{spreadsheet_id}/rows/{row_id}/todos", web::get().to(proxy::contrivance_proxy))
            )
            // Todo service routes
            .service(
                web::scope("/api/todos")
                    .wrap(middleware::auth::auth_middleware())
                    .route("", web::get().to(proxy::contrivance_proxy))   // Get all todos for user
                    .route("", web::post().to(proxy::contrivance_proxy))
                    .route("/{id}", web::get().to(proxy::contrivance_proxy))
                    .route("/{id}", web::put().to(proxy::contrivance_proxy))
                    .route("/{id}", web::delete().to(proxy::contrivance_proxy))
                    .route("/{id}/complete", web::put().to(proxy::contrivance_proxy))
                    .route("/{id}/uncomplete", web::put().to(proxy::contrivance_proxy))
            )
            // Temporary fix: direct routes to Salesforce service
            .service(
                web::scope("/api/salesforce")
                    .route("/oauth/authorize", web::get().to(|req: HttpRequest| async move {
                        let query_string = req.query_string();
                        let redirect_url = if query_string.is_empty() {
                            "http://localhost:8004/api/salesforce/oauth/authorize".to_string()
                        } else {
                            format!("http://localhost:8004/api/salesforce/oauth/authorize?{}", query_string)
                        };
                        HttpResponse::Found()
                            .append_header(("Location", redirect_url))
                            .finish()
                    }))
                    .route("/oauth/callback", web::get().to(|req: HttpRequest| async move {
                        let query_string = req.query_string();
                        
                        // Check if this is a repeated callback (authorization codes can only be used once)
                        if query_string.contains("code=") {
                            // First try to process the callback via Salesforce service
                            let redirect_url = format!("http://salesforce-service:8004/api/salesforce/oauth/callback?{}", query_string);
                            
                            let client = reqwest::Client::new();
                            match client.get(&redirect_url).send().await {
                                Ok(response) => {
                                    let status = response.status();
                                    if status.is_redirection() {
                                        // If Salesforce service returns a redirect, follow it
                                        if let Some(location) = response.headers().get("Location") {
                                            if let Ok(location_str) = location.to_str() {
                                                return HttpResponse::Found()
                                                    .append_header(("Location", location_str))
                                                    .finish();
                                            }
                                        }
                                    }
                                    let body = response.text().await.unwrap_or_default();
                                    HttpResponse::build(status).body(body)
                                }
                                Err(_) => {
                                    // If connection fails, assume callback was already processed and redirect to dashboard
                                    HttpResponse::Found()
                                        .append_header(("Location", "http://localhost:3000/dashboard?salesforce=connected"))
                                        .finish()
                                }
                            }
                        } else {
                            // No code parameter, redirect to dashboard
                            HttpResponse::Found()
                                .append_header(("Location", "http://localhost:3000/dashboard"))
                                .finish()
                        }
                    }))
                    .route("/connection/status", web::get().to(|req: HttpRequest| async move {
                        let client = reqwest::Client::new();
                        let mut request_builder = client.get("http://salesforce-service:8004/api/salesforce/connection/status");
                        
                        // Forward Authorization header if present
                        if let Some(auth_header) = req.headers().get("Authorization") {
                            request_builder = request_builder.header("Authorization", auth_header);
                        }
                        
                        match request_builder.send().await {
                            Ok(response) => {
                                let status = response.status();
                                let body = response.text().await.unwrap_or_default();
                                HttpResponse::build(status).body(body)
                            }
                            Err(_) => HttpResponse::InternalServerError().json(serde_json::json!({"error": "Failed to connect to Salesforce service"}))
                        }
                    }))
            )
            // Test route for Salesforce proxy function using contrivance proxy temporarily
            .route("/test-salesforce", web::get().to(proxy::contrivance_proxy))
            // WebSocket proxy - direct connection to contrivance service
            .route("/ws/spreadsheet/{id}", web::get().to(proxy::websocket_proxy))
            .route("/health", web::get().to(health_check))
    })
    .bind(format!("0.0.0.0:{}", config.port))?
    .run()
    .await
}

async fn health_check() -> HttpResponse {
    HttpResponse::Ok().json(ApiResponse::success("Gateway service is healthy"))
}