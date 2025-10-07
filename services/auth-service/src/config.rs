use common::EnvUtils;

#[derive(Debug, Clone)]
pub struct Config {
    pub port: u16,
    pub database_url: String,
    pub jwt_secret: String,
    pub jwt_expiration_hours: i64,
    pub refresh_expiration_days: i64,
    pub cors_origins: Vec<String>,
}

impl Config {
    pub fn from_env() -> Self {
        // Load .env file if it exists
        let _ = EnvUtils::load_dotenv();

        Self {
            port: EnvUtils::get_var_as_int("PORT", 3001) as u16,
            database_url: EnvUtils::require_var("DATABASE_URL"),
            jwt_secret: EnvUtils::require_var("JWT_SECRET"),
            jwt_expiration_hours: EnvUtils::get_var_as_int("JWT_EXPIRATION", 1) as i64,
            refresh_expiration_days: EnvUtils::get_var_as_int("JWT_REFRESH_EXPIRATION", 7) as i64,
            cors_origins: EnvUtils::get_var("CORS_ORIGINS", "http://localhost:3000,http://localhost:80")
                .split(',')
                .map(|s| s.trim().to_string())
                .collect(),
        }
    }
}