use actix_web::{dev::ServiceRequest, Error, HttpMessage, web};
use actix_web_httpauth::extractors::bearer::BearerAuth;  
use actix_web_httpauth::middleware::HttpAuthentication;
use common::{ContrivanceError, User, JwtService, Claims};
use std::future::{ready, Ready};
use uuid::Uuid;
use tracing::{info, warn, error};

pub struct AuthMiddleware;

impl AuthMiddleware {
    pub fn validator(
        req: ServiceRequest,
        credentials: BearerAuth,
    ) -> Ready<Result<ServiceRequest, (Error, ServiceRequest)>> {
        let token = credentials.token();
        info!("🔐 [AUTH] ============ VALIDATOR CALLED ============");
        info!("🔐 [AUTH] Validating token: {}...", &token[..20.min(token.len())]);
        
        let jwt_service = match req.app_data::<web::Data<JwtService>>() {
            Some(service) => service,
            None => {
                error!("❌ [AUTH] JWT service not configured");
                let error = ContrivanceError::configuration("JWT service not configured");
                return ready(Err((actix_web::Error::from(error), req)));
            }
        };
        
        match jwt_service.validate_token(token) {
            Ok(claims) => {
                info!("✅ [AUTH] Token valid, user_id: {}", claims.sub);
                // Parse user ID from claims
                match Uuid::parse_str(&claims.sub) {
                    Ok(user_id) => {
                        info!("✅ [AUTH] User ID parsed successfully: {}", user_id);
                        // Create a minimal User struct with just the ID for request context
                        let user = User {
                            id: user_id,
                            email: "".to_string(),
                            password_hash: "".to_string(),
                            name: "".to_string(),
                            role: common::UserRole::User,
                            created_at: Some(chrono::Utc::now()),
                            updated_at: Some(chrono::Utc::now()),
                            is_active: Some(true),
                            last_login: None,
                        };
                        
                        // Insert into extensions
                        info!("🔐 [AUTH] About to insert user_id {} into extensions", user_id);
                        req.extensions_mut().insert(user_id);
                        info!("🔐 [AUTH] ✅ Inserted Uuid into extensions");
                        req.extensions_mut().insert(user);
                        info!("🔐 [AUTH] ✅ Inserted User into extensions");
                        req.extensions_mut().insert(claims);
                        info!("🔐 [AUTH] ✅ Inserted Claims into extensions - returning Ok(req)");
                        info!("🔐 [AUTH] ============ VALIDATOR COMPLETE - REQUEST OK ============");
                        ready(Ok(req))
                    }
                    Err(e) => {
                        error!("❌ [AUTH] Failed to parse user ID from token: {}", e);
                        let error = ContrivanceError::authentication("Invalid user ID in token");
                        ready(Err((actix_web::Error::from(error), req)))
                    }
                }
            }
            Err(e) => {
                error!("❌ [AUTH] Token validation failed: {}", e);
                ready(Err((actix_web::Error::from(e), req)))
            }
        }
    }
}

pub fn get_user_from_request(req: &actix_web::HttpRequest) -> Result<User, ContrivanceError> {
    let extensions = req.extensions();
    let user = extensions
        .get::<User>()
        .ok_or_else(|| ContrivanceError::unauthorized("User not found in request"))?;
    Ok(user.clone())
}

pub fn auth_middleware() -> HttpAuthentication<BearerAuth, fn(ServiceRequest, BearerAuth) -> Ready<Result<ServiceRequest, (Error, ServiceRequest)>>> {
    HttpAuthentication::bearer(AuthMiddleware::validator)
}