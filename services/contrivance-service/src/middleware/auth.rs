use actix_web::{dev::ServiceRequest, Error, HttpMessage, web};
use actix_web_httpauth::extractors::bearer::BearerAuth;  
use actix_web_httpauth::middleware::HttpAuthentication;
use common::{ContrivanceError, User, JwtService, Claims};
use std::future::{ready, Ready};
use uuid::Uuid;

pub struct AuthMiddleware;

impl AuthMiddleware {
    pub fn validator(
        req: ServiceRequest,
        credentials: BearerAuth,
    ) -> Ready<Result<ServiceRequest, (Error, ServiceRequest)>> {
        let jwt_service = match req.app_data::<web::Data<JwtService>>() {
            Some(service) => service,
            None => {
                let error = ContrivanceError::configuration("JWT service not configured");
                return ready(Err((actix_web::Error::from(error), req)));
            }
        };
        
        match jwt_service.validate_token(credentials.token()) {
            Ok(claims) => {
                // Parse user ID from claims
                match Uuid::parse_str(&claims.sub) {
                    Ok(user_id) => {
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
                        
                        req.extensions_mut().insert(user);
                        req.extensions_mut().insert(claims);
                        ready(Ok(req))
                    }
                    Err(_) => {
                        let error = ContrivanceError::authentication("Invalid user ID in token");
                        ready(Err((actix_web::Error::from(error), req)))
                    }
                }
            }
            Err(e) => {
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