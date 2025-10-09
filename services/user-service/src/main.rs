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
    info!("Starting user-service on port {}", config.port);

    // Initialize database
    let database = DatabaseBuilder::new()
        .url(&config.database_url)
        .max_connections(10)
        .min_connections(2)
        .build()
        .await
        .expect("Failed to connect to database");

    // Initialize HTTP client
    let http_client = common::HttpUtils::create_client(30);

    // Initialize repository and service
    let repository = repository::UserRepository::new(database.pool().clone());
    let user_service = service::UserService::new(
        repository,
        http_client,
        config.auth_service_url.clone(),
    );

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
            .app_data(web::Data::new(user_service.clone()))
            .wrap(cors)
            .wrap(Logger::default())
            .route("/ping", web::get().to(handlers::ping))
            .route("/health", web::get().to(handlers::health_check))
            .route("/test", web::get().to(handlers::test_list_users))
            .service(
                web::resource("/")
                    .wrap(middleware::AuthMiddleware::bearer())
                    .route(web::get().to(handlers::list_users))
            )
            .service(
                web::resource("/{id}")
                    .wrap(middleware::AuthMiddleware::bearer())
                    .route(web::get().to(handlers::get_user))
                    .route(web::put().to(handlers::update_user))
                    .route(web::delete().to(handlers::delete_user))
            )
            .service(
                web::resource("/me")
                    .wrap(middleware::AuthMiddleware::bearer())
                    .route(web::get().to(handlers::get_current_user))
                    .route(web::put().to(handlers::update_current_user))
            )
    })
    .bind(format!("0.0.0.0:{}", config.port))?
    .run()
    .await
}