mod config;
mod websocket;
mod repository;
mod handlers;
mod todo_handlers;
mod middleware;

use actix_cors::Cors;
use actix_web::{web, App, HttpServer, middleware::Logger, HttpResponse, HttpRequest};
use actix_web_actors::ws;
use common::{DatabaseBuilder, ApiResponse, JwtService};
use config::Config;
use tracing::{info, error};
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

use repository::ContrivanceRepository;
use handlers::ContrivanceHandlers;
use websocket::{ConnectionManager, WebSocketConnection};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialize logging
    tracing_subscriber::fmt::init();

    // Load configuration
    let config = Config::from_env();
    info!("Starting contrivance-service on port {}", config.port);

    // Initialize database
    let database = DatabaseBuilder::new()
        .url(&config.database_url)
        .max_connections(20)
        .min_connections(5)
        .build()
        .await
        .expect("Failed to connect to database");

    // Initialize WebSocket connection manager
    let connection_manager_raw = ConnectionManager::new();
    let connection_manager = Arc::new(RwLock::new(connection_manager_raw));
    let connection_manager_data = web::Data::new(ConnectionManager::new()); // Separate instance for handlers

    // Initialize JWT service
    let jwt_service = web::Data::new(JwtService::new(
        &config.jwt_secret,
        Some(1), // 1 hour token expiration 
        Some(7), // 7 days refresh expiration
    ));

    // Initialize repository and handlers
    let repository = ContrivanceRepository::new(database.pool().clone());
    let contrivance_handlers = web::Data::new(ContrivanceHandlers::new(
        repository.clone(),
        connection_manager_data.clone(),
    ));
    let todo_handlers = web::Data::new(todo_handlers::TodoHandlers::new(
        repository,
        connection_manager_data.clone(),
    ));

    // Start HTTP server
    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin_fn(|origin, _req_head| {
                origin.as_bytes().starts_with(b"http://localhost") ||
                origin.as_bytes().starts_with(b"https://")
            })
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
            .allowed_headers(vec!["Authorization", "Content-Type"])
            .max_age(3600);

        App::new()
            .app_data(contrivance_handlers.clone())
            .app_data(todo_handlers.clone())
            .app_data(web::Data::new(connection_manager.clone()))
            .app_data(jwt_service.clone())
            .app_data(web::JsonConfig::default().error_handler(|err, _req| {
                let error_message = err.to_string();
                tracing::error!("JSON deserialization error: {}", error_message);
                actix_web::error::InternalError::from_response(
                    err, 
                    HttpResponse::BadRequest().json(common::ApiResponse::<()>::error(format!("Invalid JSON: {}", error_message)))
                ).into()
            }))
            .wrap(cors)
            .wrap(Logger::default())
            .service(
                web::scope("/api")
                    .wrap(middleware::auth::auth_middleware())
                    .service(
                        web::resource("/spreadsheets")
                            .route(web::get().to(handlers::get_spreadsheets))
                            .route(web::post().to(handlers::create_spreadsheet))
                    )
                    .service(
                        web::resource("/spreadsheets/{id}")
                            .route(web::get().to(handlers::get_spreadsheet))
                            .route(web::put().to(handlers::update_spreadsheet))
                            .route(web::delete().to(handlers::delete_spreadsheet))
                    )
                    .service(
                        web::resource("/spreadsheets/{id}/columns")
                            .route(web::get().to(handlers::get_columns))
                    )
                    .service(
                        web::resource("/spreadsheets/{id}/rows")
                            .route(web::get().to(handlers::get_rows))
                            .route(web::post().to(handlers::create_row))
                    )
                    .service(
                        web::resource("/spreadsheets/{spreadsheet_id}/rows/{row_id}")
                            .route(web::put().to(handlers::update_row))
                            .route(web::delete().to(handlers::delete_row))
                    )
                    .service(
                        web::resource("/spreadsheets/{id}/collaborators")
                            .route(web::get().to(handlers::get_collaborators))
                    )
                    // Todo routes with owner assignment
                    .service(
                        web::resource("/todos")
                            .route(web::get().to(handlers::get_todos))
                            .route(web::post().to(handlers::create_todo))
                    )
                    .service(
                        web::resource("/todos/{id}")
                            .route(web::get().to(handlers::get_todo_by_id))
                            .route(web::put().to(handlers::update_todo))
                            .route(web::delete().to(handlers::delete_todo))
                    )
                    .service(
                        web::resource("/todos/{id}/complete")
                            .route(web::put().to(handlers::complete_todo))
                    )
                    .service(
                        web::resource("/todos/{id}/uncomplete")
                            .route(web::put().to(handlers::uncomplete_todo))
                    )
                    .service(
                        web::resource("/spreadsheets/{id}/todos")
                            .route(web::get().to(handlers::get_todos_by_spreadsheet))
                    )
                    .service(
                        web::resource("/spreadsheets/{id}/todos/stats")
                            .route(web::get().to(handlers::get_todo_stats))
                    )
                    .service(
                        web::resource("/spreadsheets/{spreadsheet_id}/rows/{row_id}/todos")
                            .route(web::get().to(handlers::get_todos_by_row))
                    )
                    .service(
                        web::resource("/users/for-assignment")
                            .route(web::get().to(handlers::get_users_for_assignment))
                    )
            )
            .route("/ws/spreadsheet/{id}", web::get().to(websocket_handler))
            .route("/health", web::get().to(health_check))
    })
    .bind(format!("0.0.0.0:{}", config.port))?
    .run()
    .await
}

async fn websocket_handler(
    req: HttpRequest,
    stream: web::Payload,
    path: web::Path<Uuid>,
    connection_manager: web::Data<Arc<RwLock<ConnectionManager>>>,
) -> Result<HttpResponse, actix_web::Error> {
    let spreadsheet_id = path.into_inner();
    
    // Extract user from request (should be set by auth middleware)
    let user = match crate::middleware::auth::get_user_from_request(&req) {
        Ok(user) => user,
        Err(_) => {
            // Default user for now - in production this should be properly authenticated
            common::User {
                id: uuid::Uuid::new_v4(),
                email: "anonymous@example.com".to_string(),
                password_hash: "".to_string(),
                name: "Anonymous".to_string(),
                role: common::UserRole::User,
                created_at: Some(chrono::Utc::now()),
                updated_at: Some(chrono::Utc::now()),
                is_active: Some(true),
                last_login: None,
            }
        }
    };
    
    // Create WebSocket connection
    let ws_conn = WebSocketConnection::new(
        user.id,
        spreadsheet_id,
        connection_manager.get_ref().clone()
    );
    
    ws::start(ws_conn, &req, stream)
}

async fn health_check() -> HttpResponse {
    HttpResponse::Ok().json(ApiResponse::success("Contrivance service is healthy"))
}