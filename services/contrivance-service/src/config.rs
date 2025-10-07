use common::EnvUtils;

#[derive(Debug, Clone)]
pub struct Config {
    pub port: u16,
    pub database_url: String,
    pub auth_service_url: String,
    pub cors_origins: Vec<String>,
    pub jwt_secret: String,
}

impl Config {
    pub fn from_env() -> Self {
        // Load .env file if it exists
        let _ = EnvUtils::load_dotenv();

        Self {
            port: EnvUtils::get_var_as_int("PORT", 3003) as u16,
            database_url: EnvUtils::require_var("DATABASE_URL"),
            auth_service_url: EnvUtils::get_var("AUTH_SERVICE_URL", "http://auth-service:3001"),
            cors_origins: EnvUtils::get_var("CORS_ORIGINS", "http://localhost:3000,http://localhost:80")
                .split(',')
                .map(|s| s.trim().to_string())
                .collect(),
            jwt_secret: EnvUtils::require_var("JWT_SECRET"),
        }
    }
}