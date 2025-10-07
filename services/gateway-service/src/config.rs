use serde::Deserialize;
use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub port: u16,
    pub auth_service_url: String,
    pub user_service_url: String,
    pub contrivance_service_url: String,
    pub jwt_secret: String,
    pub rate_limit_requests: usize,
    pub rate_limit_window_seconds: u64,
}

impl Config {
    pub fn from_env() -> Self {
        dotenv::dotenv().ok();

        Self {
            port: env::var("PORT")
                .unwrap_or_else(|_| "8080".to_string())
                .parse()
                .expect("PORT must be a valid number"),
            auth_service_url: env::var("AUTH_SERVICE_URL")
                .unwrap_or_else(|_| "http://localhost:8001".to_string()),
            user_service_url: env::var("USER_SERVICE_URL")
                .unwrap_or_else(|_| "http://localhost:8002".to_string()),
            contrivance_service_url: env::var("CONTRIVANCE_SERVICE_URL")
                .unwrap_or_else(|_| "http://localhost:8003".to_string()),
            jwt_secret: env::var("JWT_SECRET")
                .expect("JWT_SECRET must be set"),
            rate_limit_requests: env::var("RATE_LIMIT_REQUESTS")
                .unwrap_or_else(|_| "100".to_string())
                .parse()
                .expect("RATE_LIMIT_REQUESTS must be a valid number"),
            rate_limit_window_seconds: env::var("RATE_LIMIT_WINDOW_SECONDS")
                .unwrap_or_else(|_| "60".to_string())
                .parse()
                .expect("RATE_LIMIT_WINDOW_SECONDS must be a valid number"),
        }
    }
}