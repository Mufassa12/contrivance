use actix_web::{web, App, HttpServer, middleware::Logger};
use actix_cors::Cors;
use env_logger;
use std::env;

mod handlers;
mod models;
mod salesforce;
mod auth;
mod database;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init();
    
    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://contrivance:password@postgres:5432/contrivance".to_string());
    
    let pool = database::create_pool(&database_url).await
        .expect("Failed to create database pool");
    
    let salesforce_client = salesforce::SalesforceClient::new(
        env::var("SALESFORCE_CLIENT_ID").expect("SALESFORCE_CLIENT_ID must be set"),
        env::var("SALESFORCE_CLIENT_SECRET").expect("SALESFORCE_CLIENT_SECRET must be set"),
        env::var("SALESFORCE_INSTANCE_URL").unwrap_or_else(|_| 
            "https://login.salesforce.com".to_string()
        ),
    );

    println!("Starting Salesforce Service on port 8004");
    
    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header();
            
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .app_data(web::Data::new(salesforce_client.clone()))
            .wrap(cors)
            .wrap(Logger::default())
            .service(
                web::scope("/api/salesforce")
                    .route("/oauth/authorize", web::get().to(handlers::oauth_authorize))
                    .route("/oauth/callback", web::get().to(handlers::oauth_callback))
                    .route("/opportunities", web::get().to(handlers::get_opportunities))
                    .route("/leads", web::get().to(handlers::get_leads))
                    .route("/import/opportunities", web::post().to(handlers::import_opportunities))
                    .route("/import/leads", web::post().to(handlers::import_leads))
                    .route("/sync/pipeline/{id}", web::post().to(handlers::sync_pipeline))
                    .route("/connection/status", web::get().to(handlers::connection_status))
            )
    })
    .bind("0.0.0.0:8004")?
    .run()
    .await
}