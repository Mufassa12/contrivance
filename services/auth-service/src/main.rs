mod handlers;
mod middleware;
mod repository;
mod service;
mod config;

use actix_cors::Cors;
use actix_web::{web, App, HttpServer, middleware::Logger};
use common::{DatabaseBuilder, EnvUtils};
use config::Config;
use tracing::{info, error};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialize logging
    tracing_subscriber::fmt::init();

    // Load configuration
    let config = Config::from_env();
    info!("Starting auth-service on port {}", config.port);

    // Initialize database
    let database = DatabaseBuilder::new()
        .url(&config.database_url)
        .max_connections(10)
        .min_connections(2)
        .build()
        .await
        .expect("Failed to connect to database");

    // Run migrations
    if let Err(e) = database.run_migrations().await {
        error!("Failed to run migrations: {}", e);
        std::process::exit(1);
    }

    // Initialize repository and service
    let repository = repository::AuthRepository::new(database.pool().clone());
    let jwt_service = common::JwtService::new(
        &config.jwt_secret,
        Some(config.jwt_expiration_hours),
        Some(config.refresh_expiration_days),
    );
    let auth_service = service::AuthService::new(repository, jwt_service);

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
            .app_data(web::Data::new(auth_service.clone()))
            .wrap(cors)
            .wrap(Logger::default())
            .route("/register", web::post().to(handlers::register))
            .route("/login", web::post().to(handlers::login))
            .route("/refresh", web::post().to(handlers::refresh_token))
            .route("/validate", web::get().to(handlers::validate_token))
            .route("/logout", web::post().to(handlers::logout))
            .route("/health", web::get().to(handlers::health_check))
    })
    .bind(format!("0.0.0.0:{}", config.port))?
    .run()
    .await
}